import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { api, clearSession, restoreSession, saveSession, signIn, type Session, type SessionUser } from './api';
import { getDevicePushToken } from './notifications';

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (login: string, password: string) => Promise<Session>;
  acceptSession: (session: Session) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession()
      .then(async (storedSession) => {
        setSession(storedSession);

        if (!storedSession?.token) return;

        try {
          const pushToken = await getDevicePushToken();
          if (pushToken) {
            await api.patch('/user_personal_data/', { fcm_token: pushToken });
          }
        } catch {
          // Ignora falha de sincronização do token do dispositivo.
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const acceptSession = useCallback(async (nextSession: Session) => {
    await saveSession(nextSession);
    setSession(nextSession);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const roleValue = Number(session?.user.nivel_acesso);
    const isAdmin = Boolean(session?.user.is_staff || session?.user.is_superuser || roleValue === 1 || roleValue === 2 || roleValue === 4 || session?.user.nivel_acesso === 'admin');
    return {
      user: session?.user || null,
      isLoading,
      isAdmin,
      login: async (username, password) => {
        const pushToken = await getDevicePushToken();
        const nextSession = await signIn(username, password, pushToken);
        setSession(nextSession);
        return nextSession;
      },
      acceptSession,
      logout: async () => {
        await clearSession();
        setSession(null);
      },
    };
  }, [session, isLoading, acceptSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}