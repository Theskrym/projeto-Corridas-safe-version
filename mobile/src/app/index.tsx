import { Redirect } from 'expo-router';
import { LoadingState, Page } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function Index() {
  const { user, isAdmin, isLoading, needsPrivacyConsent } = useAuth();
  if (isLoading) return <Page><LoadingState /></Page>;
  if (!user) return <Redirect href="/login" />;
  if (needsPrivacyConsent) return <Redirect href="/privacy-consent" />;
  if (user.force_password_change) return <Redirect href="/(admin)/senha" />;
  if (isAdmin) return <Redirect href="/(admin)/(tabs)" />;
  if (Number(user.nivel_acesso) === 3) return <Redirect href="/agendamento" />;
  return <Redirect href="/login" />;
}