import { Redirect, Stack, useSegments } from 'expo-router';
import { LoadingState, Page } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { colors } from '../../theme';

export default function AdminLayout() {
  const { user, isAdmin, isLoading, needsPrivacyConsent } = useAuth();
  const segments = useSegments();
  if (isLoading) return <Page><LoadingState /></Page>;
  if (!user) return <Redirect href="/login" />;
  if (needsPrivacyConsent) return <Redirect href="/privacy-consent" />;
  const sharedRoute = segments.some(segment => ['perfil', 'senha', 'notificacoes'].includes(segment));
  if (!isAdmin && !sharedRoute) return <Redirect href="/agendamento" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}