import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ActionButton, Field, LoadingState, Notice, Page, PageHeading, TopBar } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../theme';

export default function ProfileScreen() {
  const { isAdmin } = useAuth();
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const user = await api.get<any>('/user_personal_data/'); setNome(user.nome || ''); setTelefone(user.telefone || ''); setEmail(user.email || ''); setMatricula(user.matricula || ''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o perfil.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try { await api.put('/user_personal_data/', { nome, telefone }); setSuccess('Dados atualizados com sucesso.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  }
  return <View style={{ flex: 1, backgroundColor: colors.canvas }}><TopBar title="Dados pessoais" back showSettings={isAdmin} /><Page><PageHeading title="Seu perfil" subtitle="Atualize seus dados de contato." />{loading ? <LoadingState /> : null}{error ? <Notice message={error} onRetry={() => void load()} /> : null}{success ? <Notice type="success" message={success} /> : null}<Field label="Nome" value={nome} onChangeText={setNome} /><Field label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" /><Field label="E-mail" value={email} editable={false} /><Field label="Matrícula" value={String(matricula)} editable={false} /><ActionButton title="Salvar alterações" icon="checkmark" loading={saving} onPress={() => void save()} /><ActionButton title="Excluir minha conta" icon="trash-outline" variant="danger" onPress={() => router.push('/excluir-conta')} /></Page></View>;
}