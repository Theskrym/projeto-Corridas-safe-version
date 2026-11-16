import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, LoadingState, Notice, TopBar, ui } from '../../../components/ui';
import { AppText as Text } from '../../../components/AppText';
import { api, unwrapList } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { colors } from '../../../theme';

type NotificationItem = { id_notificacao: number; titulo: string; mensagem: string; data_criacao: string; lida: boolean; tipo?: string };

export default function NotificationsScreen() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'todas' | 'nao-lidas' | 'lidas'>('todas');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    try { setItems(unwrapList<NotificationItem>(await api.get('/notificacoes/'))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao buscar notificações.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    const interval = setInterval(() => { void load(true); }, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = useMemo(() => items.filter(item => filter === 'todas' || (filter === 'lidas' ? item.lida : !item.lida)), [items, filter]);

  return <View style={{ flex: 1, backgroundColor: colors.canvas }}><TopBar title="Notificações" back showSettings={isAdmin} /><FlatList
    data={filtered}
    keyExtractor={item => String(item.id_notificacao)}
    contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 10 }}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}
    ListHeaderComponent={<View style={{ gap: 12, paddingBottom: 8 }}><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 26 }}>Central de avisos</Text><View style={{ flexDirection: 'row', gap: 8 }}>{(['todas', 'nao-lidas', 'lidas'] as const).map(value => <Pressable key={value} onPress={() => setFilter(value)} accessibilityRole="button" accessibilityState={{ selected: filter === value }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 7, backgroundColor: filter === value ? colors.brand : colors.paper }}><Text style={{ color: filter === value ? colors.paper : colors.ink, fontWeight: '700' }}>{value === 'todas' ? 'Todas' : value === 'lidas' ? 'Lidas' : 'Não lidas'}</Text></Pressable>)}</View>{error ? <Notice message={error} onRetry={() => void load()} /> : null}{loading ? <LoadingState label="Carregando avisos..." /> : null}</View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/notificacoes/[id]', params: { id: String(item.id_notificacao), titulo: item.titulo, mensagem: item.mensagem, lida: String(item.lida) } } as any)} style={({ pressed }) => [ui.card, ui.row, { opacity: pressed ? 0.75 : 1 }]}><Ionicons name={item.lida ? 'mail-open-outline' : 'mail-unread-outline'} size={21} color={item.lida ? colors.muted : colors.brand} /><View style={{ flex: 1, gap: 4 }}><Text style={ui.cardTitle}>{item.titulo}</Text><Text numberOfLines={2} style={ui.body}>{item.mensagem}</Text></View><Ionicons name="chevron-forward" size={17} color={colors.muted} /></Pressable>}
    ListEmptyComponent={!loading && !error ? <EmptyState title="Sem notificações" detail="Os novos avisos aparecem aqui." /> : undefined}
  /></View>;
}