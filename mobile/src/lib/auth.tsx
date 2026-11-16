import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { api, clearSession, restoreSession, saveSession, signIn, type PrivacyNotice, type Session, type SessionUser } from './api';
import { getDevicePushToken } from './notifications';

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  needsPrivacyConsent: boolean;
  privacyNotice: PrivacyNotice | null;
  privacyNoticeError: string;
  notificationSyncWarning: string;
  refreshPrivacyNotice: () => Promise<PrivacyNotice>;
  acceptPrivacyConsent: () => Promise<void>;
  deleteOwnAccount: (password: string) => Promise<void>;
  login: (login: string, password: string) => Promise<{ session: Session; needsPrivacyConsent: boolean }>;
  acceptSession: (session: Session) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsPrivacyConsent, setNeedsPrivacyConsent] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState<PrivacyNotice | null>(null);
  const [privacyNoticeError, setPrivacyNoticeError] = useState('');
  const [notificationSyncWarning, setNotificationSyncWarning] = useState('');

  const refreshPrivacyNotice = useCallback(async () => {
    setPrivacyNoticeError('');
    try {
      const notice = await api.get<PrivacyNotice>('/privacy-notice/');
      setPrivacyNotice(notice);
      setNeedsPrivacyConsent(!notice.accepted);
      return notice;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Não foi possível carregar o aviso de privacidade.';
      setPrivacyNoticeError(message);
      setNeedsPrivacyConsent(true);
      throw reason;
    }
  }, []);

  const syncPushToken = useCallback(async () => {
    setNotificationSyncWarning('');
    try {
      const pushToken = await getDevicePushToken();
      if (pushToken) await api.patch('/user_personal_data/', { fcm_token: pushToken });
    } catch (reason) {
      setNotificationSyncWarning(
        reason instanceof Error ? `Notificações não foram ativadas: ${reason.message}` : 'Não foi possível ativar as notificações neste dispositivo.',
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const storedSession = await restoreSession();
        if (!active) return;
        setSession(storedSession);
        if (storedSession) {
          try {
            const notice = await refreshPrivacyNotice();
            if (active && notice.accepted) await syncPushToken();
          } catch {
            // A tela do aviso permite tentar carregar novamente.
          }
        }
      } catch (reason) {
        if (active) {
          setPrivacyNoticeError(reason instanceof Error ? reason.message : 'Não foi possível restaurar a sessão.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void restore();
    return () => { active = false; };
  }, [refreshPrivacyNotice, syncPushToken]);

  const acceptSession = useCallback(async (nextSession: Session) => {
    await saveSession(nextSession);
    setSession(nextSession);
    const notice = await refreshPrivacyNotice();
    if (notice.accepted) await syncPushToken();
    return !notice.accepted;
  }, [refreshPrivacyNotice, syncPushToken]);

  const value = useMemo<AuthContextValue>(() => {
    const roleValue = Number(session?.user.nivel_acesso);
    const isAdmin = Boolean(session?.user.is_staff || session?.user.is_superuser || roleValue === 1 || roleValue === 2 || roleValue === 4 || session?.user.nivel_acesso === 'admin');
    return {
      user: session?.user || null,
      isLoading,
      isAdmin,
      needsPrivacyConsent,
      privacyNotice,
      privacyNoticeError,
      notificationSyncWarning,
      refreshPrivacyNotice,
      acceptPrivacyConsent: async () => {
        if (!privacyNotice) throw new Error('Carregue o aviso de privacidade antes de aceitá-lo.');
        await api.post('/privacy-consent/', { version: privacyNotice.version });
        setPrivacyNotice({ ...privacyNotice, accepted: true });
        setNeedsPrivacyConsent(false);
        await syncPushToken();
      },
      deleteOwnAccount: async (password) => {
        await api.delete('/account/delete/', { current_password: password });
        await clearSession();
        setSession(null);
        setPrivacyNotice(null);
        setNeedsPrivacyConsent(false);
      },
      login: async (username, password) => {
        const nextSession = await signIn(username, password);
        setSession(nextSession);
        try {
          const notice = await refreshPrivacyNotice();
          if (notice.accepted) await syncPushToken();
          return { session: nextSession, needsPrivacyConsent: !notice.accepted };
        } catch (reason) {
          await clearSession();
          setSession(null);
          throw reason;
        }
      },
      acceptSession,
      logout: async () => {
        await clearSession();
        setSession(null);
        setPrivacyNotice(null);
        setNeedsPrivacyConsent(false);
        setPrivacyNoticeError('');
        setNotificationSyncWarning('');
      },
    };
  }, [
    session,
    isLoading,
    needsPrivacyConsent,
    privacyNotice,
    privacyNoticeError,
    notificationSyncWarning,
    refreshPrivacyNotice,
    syncPushToken,
    acceptSession,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}