import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ActionButton, LoadingState, Notice, Page, PageHeading, TopBar, ui } from '../../components/ui';
import { AppText as Text } from '../../components/AppText';
import { StatusColorPicker } from '../../components/StatusColorPicker';
import { api } from '../../lib/api';
import { colors } from '../../theme';

type StatusColor = { status: string; label: string; color: string | null };

const DEFAULT_COLORS: StatusColor[] = [
  { status: 'pendente', label: 'Pendente', color: '#F8C400' },
  { status: 'confirmada', label: 'Confirmada', color: '#34C759' },
  { status: 'reconfirmacao_necessaria', label: 'Reconfirmação', color: '#F8C400' },
  { status: 'em_andamento', label: 'Em andamento', color: '#1D4ED8' },
  { status: 'concluida', label: 'Concluída', color: '#007AFF' },
  { status: 'cancelada', label: 'Cancelada', color: '#FF3B30' },
  { status: 'recusada', label: 'Recusada', color: '#FF3B30' },
];

function isValidColor(value: string) {
  return /^#[\da-f]{6}$/i.test(value);
}

export default function StatusColorsScreen() {
  const [items, setItems] = useState(DEFAULT_COLORS);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ colors?: StatusColor[] }>('/status-colors/');
      if (Array.isArray(data.colors)) {
        const savedColors = data.colors;
        const knownStatuses = new Set(DEFAULT_COLORS.map(item => item.status));
        setItems([
          ...DEFAULT_COLORS.map(item => savedColors.find(saved => saved.status === item.status) || item),
          ...savedColors.filter(item => !knownStatuses.has(item.status)),
        ]);
      }
      setError('');
    } catch (reason) {
      setError(reason instanceof Error
        ? `Não foi possível carregar as cores salvas. Os padrões estão em uso. ${reason.message}`
        : 'Não foi possível carregar as cores salvas. Os padrões estão em uso.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const selectedColor = items.find(item => item.status === selectedStatus);
  const update = (status: string, color: string | null) => {
    setItems(current => current.map(item => item.status === status ? { ...item, color } : item));
    setMessage('');
  };

  async function save() {
    if (items.some(item => item.color !== null && !isValidColor(item.color))) {
      setError('Use cores no formato #RRGGBB ou escolha “Sem preenchimento”.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.post('/status-colors/', { colors: items });
      setMessage('Configurações do Excel salvas com sucesso.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  }

  function restoreDefaults() {
    setItems(DEFAULT_COLORS);
    setError('');
    setMessage('');
  }

  return (
    <View style={styles.screen}>
      <TopBar title="Configurações do relatório" back />
      <Page>
        <PageHeading
          title="Cores do Excel"
          subtitle="Personalize o preenchimento das linhas de acordo com o status da corrida."
        />
        <View style={[ui.card, styles.infoCard]}>
          <Ionicons name="information-circle-outline" size={22} color={colors.brand} />
          <Text style={[ui.body, styles.infoText]}>As alterações são aplicadas às linhas da planilha quando você exporta o relatório.</Text>
        </View>
        {loading ? <LoadingState label="Carregando configurações..." /> : null}
        {error ? <Notice message={error} type="info" /> : null}
        {message ? <Notice message={message} type="success" /> : null}
        {items.map(item => (
          <Pressable
            key={item.status}
            accessibilityRole="button"
            accessibilityLabel={`Configurar cor: ${item.label}`}
            onPress={() => setSelectedStatus(item.status)}
            style={[ui.card, ui.spread, styles.statusCard]}
          >
            <View style={styles.statusInfo}>
              <View style={[styles.colorPreview, { backgroundColor: item.color || colors.paper, borderColor: item.color || colors.line }]} />
              <View style={styles.statusLabels}>
                <Text style={ui.cardTitle}>{item.label}</Text>
                <Text style={ui.body}>{item.color || 'Sem preenchimento'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        ))}
        <ActionButton title="Restaurar cores padrão" variant="secondary" onPress={restoreDefaults} disabled={loading || saving} />
        <ActionButton title="Salvar configurações" icon="checkmark" loading={saving} disabled={loading} onPress={() => void save()} />
      </Page>

      {selectedColor ? (
        <StatusColorPicker
          key={selectedColor.status}
          label={selectedColor.label}
          color={selectedColor.color}
          onChange={color => update(selectedColor.status, color)}
          onClose={() => setSelectedStatus(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { flex: 1 },
  statusCard: { minHeight: 72 },
  statusInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  statusLabels: { flex: 1, gap: 4 },
  colorPreview: { width: 40, height: 40, borderWidth: 1, borderRadius: 8 },
});
