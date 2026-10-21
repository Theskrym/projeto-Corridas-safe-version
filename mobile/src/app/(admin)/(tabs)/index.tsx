import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ActionButton, LoadingState, Notice, Page, PageHeading, TopBar, ui } from '../../../components/ui';
import { AppText as Text } from '../../../components/AppText';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { colors } from '../../../theme';

interface Stats { corridas?: { hoje?: number; pendentes_hoje?: number; em_andamento?: number }; motoristas?: { ativos?: number }; veiculos?: { disponiveis?: number } }

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setStats(await api.get<Stats>('/home/stats/')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o resumo.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const metrics = [
    { label: 'Corridas de Hoje', value: stats?.corridas?.hoje ?? 0 },
    { label: 'Em Andamento', value: stats?.corridas?.em_andamento ?? 0 },
    { label: 'Motoristas Ativos', value: stats?.motoristas?.ativos ?? 0 },
    { label: 'Veículos Disponíveis', value: stats?.veiculos?.disponiveis ?? 0 },
  ];
  return <View style={{ flex: 1, backgroundColor: colors.canvas }}><TopBar title="Início" /><Page><View style={styles.dashboard}>{error ? <Notice message={error} onRetry={() => void load()} /> : null}<View style={styles.metricsGrid}>{metrics.map(metric => <View key={metric.label} style={styles.metricCard}><Text style={styles.metricValue}>{loading ? '...' : metric.value}</Text><Text style={styles.metricLabel}>{metric.label}</Text><View style={styles.metricDivider} /></View>)}</View><View style={styles.reportSection}><ActionButton title="Gerar Relatório" buttonStyle={styles.reportButton} onPress={() => router.push('/relatorios')} /></View></View></Page></View>;
}

const styles = {
  dashboard: { width: '100%' as const, maxWidth: 1200, alignSelf: 'center' as const, paddingHorizontal: 16, paddingTop: 8 },
  metricsGrid: { gap: 16 },
  metricCard: { minHeight: 120, padding: 16, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.paper, borderRadius: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, gap: 6 },
  metricValue: { color: colors.brand, fontSize: 35, fontWeight: '700' as const },
  metricLabel: { color: '#333333', fontSize: 16, fontWeight: '500' as const, textAlign: 'center' as const },
  metricDivider: { width: '50%' as const, height: 2, marginTop: 6, backgroundColor: colors.brandLight },
  reportSection: { marginTop: 18, alignItems: 'center' as const },
  reportButton: { width: 190, paddingHorizontal: 24, borderRadius: 8 },
};