import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ActionButton, Field, LoadingState, Notice, Page, PageHeading, TopBar, ui } from '../../components/ui';
import { AppText as Text } from '../../components/AppText';
import { api, unwrapList } from '../../lib/api';
import { colors } from '../../theme';

type ReportData = { total_corridas?: number; corridas_concluidas?: number; corridas_canceladas?: number; corridas_pendentes?: number; motoristas?: Array<Record<string, any>> };

export default function ReportsScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [drivers, setDrivers] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (from) query.set('data_inicio', from);
      if (to) query.set('data_fim', to);
      const data = await api.get<any>(`/relatorios/${query.size ? `?${query.toString()}` : ''}`);
      setReport(data);
      setDrivers(unwrapList(data.motoristas));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível gerar o relatório.'); }
    finally { setLoading(false); }
  }, [from, to]);

  useFocusEffect(useCallback(() => { void load(); }, []));
  const metrics = [
    ['Total de corridas', report?.total_corridas ?? 0],
    ['Concluídas', report?.corridas_concluidas ?? 0],
    ['Pendentes', report?.corridas_pendentes ?? 0],
    ['Canceladas', report?.corridas_canceladas ?? 0],
  ] as const;

  return <View style={{ flex: 1, backgroundColor: colors.canvas }}><TopBar title="Relatórios" back /><FlatList
    data={drivers}
    keyExtractor={(item, index) => String(item.id_usuario ?? index)}
    contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 10, paddingBottom: 28 }}
    ListHeaderComponent={<View style={{ gap: 14, paddingBottom: 10 }}><PageHeading eyebrow="Análise operacional" title="Relatório de corridas" subtitle="Filtre por período para acompanhar os resultados." /><View style={[ui.card, ui.fieldStack]}><Field label="Data inicial" value={from} onChangeText={setFrom} placeholder="AAAA-MM-DD" /><Field label="Data final" value={to} onChangeText={setTo} placeholder="AAAA-MM-DD" /><ActionButton title="Atualizar relatório" icon="refresh-outline" onPress={() => void load()} loading={loading} /></View>{error ? <Notice message={error} onRetry={() => void load()} /> : null}{loading ? <LoadingState label="Calculando indicadores..." /> : <View style={{ gap: 8 }}>{metrics.map(([label, value]) => <View key={label} style={[ui.card, ui.spread]}><Text style={ui.body}>{label}</Text><Text style={{ color: colors.ink, fontSize: 22, fontWeight: '800' }}>{value}</Text></View>)}</View>}<Text style={ui.cardTitle}>Resumo por motorista</Text></View>}
    renderItem={({ item }) => <View style={ui.card}><Text style={ui.cardTitle}>{item.nome || 'Motorista'}</Text><Text style={ui.body}>{item.corridas_count || 0} corridas · {item.corridas_concluidas || 0} concluídas</Text></View>}
    ListEmptyComponent={!loading && !error ? <View style={ui.card}><Text style={ui.body}>Sem dados de motoristas para este período.</Text></View> : undefined}
  /></View>;
}