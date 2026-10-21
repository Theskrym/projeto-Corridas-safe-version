import { Redirect, Stack } from 'expo-router';
import { LoadingState, Page } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { colors } from '../../theme';

export default function AdminLayout() {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return <Page><LoadingState /></Page>;
  if (!user || !isAdmin) return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}