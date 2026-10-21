import { useState } from 'react';
import { router } from 'expo-router';
import { ActionButton, Field, Notice, Page, PageHeading, TopBar } from '../components/ui';
import { api } from '../lib/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    if (!email.toLowerCase().endsWith('@cesmac.edu.br')) {
      setError('Use seu e-mail institucional @cesmac.edu.br.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/forgot-password/', { email: email.toLowerCase() });
      setSuccess(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível processar a solicitação.');
    } finally {
      setLoading(false);
    }
  }

  return <><TopBar title="Recuperar senha" back /><Page><PageHeading title="Redefina seu acesso" subtitle="Enviaremos as instruções para seu e-mail CESMAC." />{success ? <Notice type="success" message="Solicitação recebida. Verifique seu e-mail institucional." /> : null}{error ? <Notice message={error} /> : null}<Field label="E-mail institucional" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="nome@cesmac.edu.br" /><ActionButton title="Enviar instruções" onPress={submit} loading={loading} /></Page></>;
}