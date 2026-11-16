import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { ActionButton, EmptyState, LoadingState, Notice, StatusBadge, TopBar, ui } from '../components/ui';
import { AppText as Text } from '../components/AppText';
import { api, unwrapList } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../theme';

type Ride = {
  id_corrida: number;
  ponto_inicio?: string;
  ponto_chegada?: string;
  data_inicio?: string;
  horario_inicio?: string;
  servico?: string;
  status?: string;
  motorista?: number | null;
  veiculo?: number | null;
  veiculo_nome?: string;
  veiculo_placa?: string;
};

const activeStatuses = new Set(['pendente', 'reconfirmacao_necessaria', 'confirmada', 'em_andamento']);

function canStart(ride: Ride) {
  if (!ride.data_inicio) return false;
  const time = ride.horario_inicio?.slice(0, 5) || '00:00';
  const start = new Date(`${ride.data_inicio}T${time}:00`).getTime();
  return Number.isFinite(start) && start <= Date.now() + 30 * 60 * 1000;
}

export default function DriverScheduleScreen() {
  const { user, isAdmin, isLoading: authLoading, needsPrivacyConsent, notificationSyncWarning, logout } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [history, setHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [rejectingRide, setRejectingRide] = useState<Ride | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const assignedRides = unwrapList<Ride>(await api.get('/corrida/'))
        .filter(ride => Number(ride.motorista) === Number(user?.id ?? user?.id_usuario));
      setRides(assignedRides);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar suas corridas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.id_usuario]);

  useFocusEffect(useCallback(() => {
    if (user && !isAdmin && !needsPrivacyConsent) void load();
  }, [isAdmin, load, needsPrivacyConsent, user]));

  const visibleRides = useMemo(
    () => rides.filter(ride => history ? !activeStatuses.has(ride.status || '') : activeStatuses.has(ride.status || '')),
    [history, rides],
  );

  if (authLoading) return <View style={{ flex: 1, backgroundColor: colors.canvas }}><LoadingState /></View>;
  if (!user) return <Redirect href="/login" />;
  if (needsPrivacyConsent) return <Redirect href="/privacy-consent" />;
  if (isAdmin) return <Redirect href="/(admin)/(tabs)" />;
  if (Number(user.nivel_acesso) !== 3) return <Redirect href="/login" />;

  async function updateRide(ride: Ride, action: 'accept' | 'reconfirm' | 'reject' | 'start' | 'complete') {
    setError('');
    setWorkingId(ride.id_corrida);
    try {
      if (action === 'accept') await api.patch(`/corrida/${ride.id_corrida}/`, { status: 'confirmada' });
      if (action === 'reconfirm') await api.patch(`/corrida/${ride.id_corrida}/`, { status: 'confirmada' });
      if (action === 'reject') await api.post(`/corrida/${ride.id_corrida}/recusar/`, {});
      if (action === 'start') await api.patch(`/corrida/${ride.id_corrida}/`, { status: 'em_andamento' });
      if (action === 'complete') await api.post(`/corrida/${ride.id_corrida}/complete_ride/`, {});
      setRejectingRide(null);
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar a corrida.');
    } finally {
      setWorkingId(null);
    }
  }

  function renderRide({ item }: { item: Ride }) {
    const vehicle = [item.veiculo_nome, item.veiculo_placa].filter(Boolean).join(' · ');
    return <View style={ui.card}>
      <View style={ui.spread}>
        <Text style={ui.cardTitle}>Corrida #{item.id_corrida}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={ui.body}>Embarque: {item.ponto_inicio || 'Não informado'}</Text>
      <Text style={ui.body}>Destino: {item.ponto_chegada || 'Não informado'}</Text>
      <Text style={ui.body}>Data e horário: {item.data_inicio || 'Não informado'}{item.horario_inicio ? ` · ${item.horario_inicio.slice(0, 5)}` : ''}</Text>
      {item.servico ? <Text style={ui.body}>Serviço: {item.servico}</Text> : null}
      {vehicle ? <Text style={ui.body}>Veículo: {vehicle}</Text> : null}
      {!history && item.status === 'pendente' ? <View style={{ gap: 8, marginTop: 6 }}>
        <ActionButton title="Aceitar corrida" icon="checkmark" loading={workingId === item.id_corrida} onPress={() => void updateRide(item, 'accept')} />
        <ActionButton title="Recusar corrida" icon="close" variant="danger" disabled={workingId !== null} onPress={() => setRejectingRide(item)} />
      </View> : null}
      {!history && item.status === 'reconfirmacao_necessaria' ? <View style={{ gap: 8, marginTop: 6 }}>
        <ActionButton title="Confirmar novamente" icon="checkmark" loading={workingId === item.id_corrida} onPress={() => void updateRide(item, 'reconfirm')} />
        <ActionButton title="Recusar corrida" icon="close" variant="danger" disabled={workingId !== null} onPress={() => setRejectingRide(item)} />
      </View> : null}
      {!history && item.status === 'confirmada' && canStart(item) ? <ActionButton title="Iniciar corrida" icon="play" loading={workingId === item.id_corrida} onPress={() => void updateRide(item, 'start')} /> : null}
      {!history && item.status === 'em_andamento' ? <ActionButton title="Concluir corrida" icon="checkmark-done" loading={workingId === item.id_corrida} onPress={() => void updateRide(item, 'complete')} /> : null}
    </View>;
  }

  return <View style={{ flex: 1, backgroundColor: colors.canvas }}>
    <TopBar title="Minhas corridas" action="Avisos" onAction={() => router.push('/notificacoes')} />
    <FlatList
      data={visibleRides}
      keyExtractor={item => String(item.id_corrida)}
      renderItem={renderRide}
      contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}
      ListHeaderComponent={<View style={{ gap: 12, paddingBottom: 8 }}>
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 26 }}>Olá, {user.nome}</Text>
        <Text style={ui.body}>Acompanhe suas viagens e atualize cada etapa por aqui.</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: !history }} onPress={() => setHistory(false)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 7, backgroundColor: !history ? colors.brand : colors.paper }}>
            <Text style={{ color: !history ? colors.paper : colors.ink, fontWeight: '700' }}>Ativas</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: history }} onPress={() => setHistory(true)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 7, backgroundColor: history ? colors.brand : colors.paper }}>
            <Text style={{ color: history ? colors.paper : colors.ink, fontWeight: '700' }}>Histórico</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(admin)/perfil')} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 7, backgroundColor: colors.paper }}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>Meu perfil</Text>
          </Pressable>
        </View>
        {error ? <Notice message={error} onRetry={() => void load()} /> : null}
        {notificationSyncWarning ? <Notice type="info" message={notificationSyncWarning} /> : null}
        {loading ? <LoadingState label="Carregando corridas..." /> : null}
      </View>}
      ListEmptyComponent={!loading && !error ? <EmptyState title={history ? 'Nenhuma corrida no histórico' : 'Nenhuma corrida ativa'} detail="Novas corridas atribuídas a você aparecerão aqui." /> : undefined}
      ListFooterComponent={<ActionButton title="Encerrar sessão" icon="log-out-outline" variant="secondary" onPress={() => void logout().then(() => router.replace('/login'))} />}
    />
    <Modal visible={Boolean(rejectingRide)} transparent animationType="fade" onRequestClose={() => setRejectingRide(null)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#10182088' }}>
        <View style={[ui.card, { gap: 14 }]}>
          <Text style={ui.cardTitle}>Recusar esta corrida?</Text>
          <Text style={ui.body}>A equipe será avisada e poderá fazer uma nova atribuição.</Text>
          <ActionButton title="Confirmar recusa" variant="danger" loading={workingId !== null} onPress={() => rejectingRide && void updateRide(rejectingRide, 'reject')} />
          <ActionButton title="Voltar" variant="secondary" onPress={() => setRejectingRide(null)} />
        </View>
      </View>
    </Modal>
  </View>;
}
