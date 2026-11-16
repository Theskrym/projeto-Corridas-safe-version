import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActionButton, Notice, Page, PageHeading, TopBar, ui } from '../../../components/ui';
import { AppText as Text } from '../../../components/AppText';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { colors } from '../../../theme';

export default function NotificationDetailScreen() {
  const { isAdmin } = useAuth();
  const { id, titulo, mensagem, lida } = useLocalSearchParams<{ id: string; titulo?: string; mensagem?: string; lida?: string }>();
  const [read, setRead] = useState(lida === 'true');
  const [error, setError] = useState('');
  async function toggleRead() {
    setError('');
    try { await api.post(`/notificacoes/${id}/marcar_como_${read ? 'nao_lida' : 'lida'}/`, {}); setRead(!read); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o aviso.'); }
  }
  return <><TopBar title="Notificação" back showSettings={isAdmin} /><Page><PageHeading eyebrow={read ? 'Lida' : 'Não lida'} title={titulo || 'Aviso'} /><Text style={[ui.body, { color: colors.ink, fontSize: 16 }]}>{mensagem || 'O conteúdo deste aviso não está disponível.'}</Text>{error ? <Notice message={error} /> : null}<ActionButton title={read ? 'Marcar como não lida' : 'Marcar como lida'} variant="secondary" onPress={() => void toggleRead()} /></Page></>;
}