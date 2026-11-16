import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActionButton, Field, Notice, Page, PageHeading, TopBar } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function DeleteAccountScreen() {
  const { user, isLoading, deleteOwnAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoading) return <Page><PageHeading title="Carregando..." /></Page>;
  if (!user) return <Redirect href="/login" />;

  async function removeAccount() {
    setError('');
    setLoading(true);
    try {
      await deleteOwnAccount(password);
      router.replace('/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir a conta.');
    } finally {
      setLoading(false);
    }
  }

  return <>
    <TopBar title="Excluir conta" back showSettings={false} />
    <Page>
      <PageHeading title="Excluir minha conta" subtitle="Esta ação não pode ser desfeita." />
      <Notice
        type="info"
        message="Seu cadastro e suas notificações serão removidos. Registros de corridas e textos digitados neles podem ser mantidos sem o vínculo da conta, conforme a política institucional."
      />
      {error ? <Notice message={error} /> : null}
      <Field label="Senha atual" value={password} onChangeText={setPassword} secureTextEntry />
      <Field label='Digite "EXCLUIR" para confirmar' value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" />
      <ActionButton
        title="Excluir conta definitivamente"
        icon="trash-outline"
        variant="danger"
        loading={loading}
        disabled={!password || confirmation.trim() !== 'EXCLUIR'}
        onPress={() => void removeAccount()}
      />
      <ActionButton title="Cancelar" variant="secondary" onPress={() => router.back()} />
    </Page>
  </>;
}
