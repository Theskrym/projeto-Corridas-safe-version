import { useState } from 'react';
import { ActionButton, Field, Notice, Page, PageHeading, TopBar } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function ChangePasswordScreen() {
  const { isAdmin } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  async function save() {
    setError(''); setSuccess('');
    if (!current || !next || !confirm) { setError('Preencha todos os campos.'); return; }
    if (next.length < 6) { setError('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (next !== confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try { await api.put('/change-password/', { senhaAtual: current, novaSenha: next, confirmarSenha: confirm }); setSuccess('Senha alterada com sucesso.'); setCurrent(''); setNext(''); setConfirm(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível alterar a senha.'); }
    finally { setLoading(false); }
  }
  return <><TopBar title="Alterar senha" back showSettings={isAdmin} /><Page><PageHeading title="Atualize sua senha" subtitle="Use uma senha segura com pelo menos 6 caracteres." />{error ? <Notice message={error} /> : null}{success ? <Notice type="success" message={success} /> : null}<Field label="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry /><Field label="Nova senha" value={next} onChangeText={setNext} secureTextEntry /><Field label="Confirmar nova senha" value={confirm} onChangeText={setConfirm} secureTextEntry /><ActionButton title="Atualizar senha" icon="key-outline" loading={loading} onPress={() => void save()} /></Page></>;
}