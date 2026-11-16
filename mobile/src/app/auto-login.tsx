import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { LoadingState, Notice, Page, TopBar } from '../components/ui';
import { AppText as Text } from '../components/AppText';
import { api, type Session } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../theme';

export default function AutoLoginScreen() {
  const { token, force_change: forceChangeParam } = useLocalSearchParams<{ token?: string; force_change?: string }>();
  const { acceptSession } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function authenticate() {
      if (!token) { setError('O link não contém um token válido.'); return; }
      try {
        const data = await api.post<any>('/auto-login/', { token });
        const user = {
          id: data.user_id,
          login: data.login,
          nome: data.nome,
          email: data.email,
          nivel_acesso: data.nivel_acesso,
          force_password_change: Boolean(data.force_password_change || forceChangeParam === 'true'),
        };
        const session: Session = { token: data.token, user };
        const needsPrivacyConsent = await acceptSession(session);
        if (!active) return;
        if (needsPrivacyConsent) router.replace('/privacy-consent');
        else if (user.force_password_change) router.replace('/(admin)/senha');
        else if (Number(user.nivel_acesso) === 3) router.replace('/agendamento');
        else router.replace('/(admin)/(tabs)');
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Link inválido ou expirado.');
      }
    }
    void authenticate();
    return () => { active = false; };
  }, [token, forceChangeParam, acceptSession]);

  return <><TopBar title="Acesso seguro" showSettings={false} /><Page><LoadingState label="Validando link de acesso..." />{error ? <Notice message={error} /> : <Text style={{ color: colors.muted, textAlign: 'center' }}>A autenticação é feita com o servidor institucional.</Text>}</Page></>;
}