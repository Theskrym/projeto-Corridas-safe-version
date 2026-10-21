import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ActionButton, Field, LoadingState, Notice, Page, PageHeading, TopBar, ui } from '../../components/ui';
import { api, unwrapList } from '../../lib/api';
import { colors } from '../../theme';

type StatusColor = { status: string; label: string; color: string | null };
const defaults: StatusColor[] = [
  { status: 'pendente', label: 'Pendente', color: '#F8C400' },
  { status: 'confirmada', label: 'Confirmada', color: '#34C759' },
  { status: 'em_andamento', label: 'Em andamento', color: '#1D4ED8' },
  { status: 'concluida', label: 'Concluída', color: '#007AFF' },
  { status: 'cancelada', label: 'Cancelada', color: '#FF3B30' },
  { status: 'recusada', label: 'Recusada', color: '#FF3B30' },
];

export default function StatusColorsScreen() {
  const [items, setItems] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any>('/status-colors/');
      if (Array.isArray(data.colors)) setItems(data.colors);
      setError('');
    } catch { setError('Usando as cores padrão.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const update = (status: string, color: string) => setItems(current => current.map(item => item.status === status ? { ...item, color } : item));
  async function save() {
    setSaving(true); setError(''); setMessage('');
    try { await api.post('/status-colors/', { colors: items }); setMessage('Cores salvas com sucesso.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  }
  return <View style={{ flex: 1, backgroundColor: colors.canvas }}><TopBar title="Cores de status" back /><Page><PageHeading title="Cores de status" subtitle="Personalize a identificação visual das corridas." />{loading ? <LoadingState /> : null}{error ? <Notice message={error} type="info" /> : null}{message ? <Notice message={message} type="success" /> : null}{items.map(item => <View key={item.status} style={[ui.card, ui.spread]}><View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: item.color || colors.line, borderWidth: 1, borderColor: colors.line }} /><View style={{ flex: 1 }}><Field label={item.label} value={item.color || ''} onChangeText={value => update(item.status, value)} autoCapitalize="characters" maxLength={7} placeholder="#RRGGBB" /></View></View>)}<ActionButton title="Restaurar padrão" variant="secondary" onPress={() => setItems(defaults)} /><ActionButton title="Salvar cores" icon="checkmark" loading={saving} onPress={() => void save()} /></Page></View>;
}