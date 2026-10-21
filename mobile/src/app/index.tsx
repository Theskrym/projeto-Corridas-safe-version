import { Redirect } from 'expo-router';
import { LoadingState, Page } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function Index() {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return <Page><LoadingState /></Page>;
  if (!user || !isAdmin) return <Redirect href="/login" />;
  return <Redirect href="/(admin)/(tabs)" />;
}