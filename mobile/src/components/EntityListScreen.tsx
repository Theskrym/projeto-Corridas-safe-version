import { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, unwrapList } from '../lib/api';
import { EmptyState, LoadingState, Notice, StatusBadge, TopBar, ui } from './ui';
import { AppText as Text } from './AppText';
import { colors } from '../theme';

type Entity = 'corridas' | 'motoristas' | 'veiculos';
type Item = Record<string, any>;

const config: Record<Entity, { title: string; endpoint: string; idKey: string; search: (item: Item) => string; status: (item: Item) => string; route: string }> = {
  corridas: { title: 'Corridas', endpoint: '/corrida/', idKey: 'id_corrida', search: item => `${item.ponto_inicio} ${item.ponto_chegada} ${item.solicitante} ${item.motorista_nome} ${item.veiculo_placa} ${item.id_corrida}`, status: item => item.status, route: '/cadastro/corridas' },
  motoristas: { title: 'Motoristas', endpoint: '/motoristas/', idKey: 'id_usuario', search: item => `${item.nome} ${item.email} ${item.matricula}`, status: item => item.is_active ? 'ativo' : (item.status || 'inativo'), route: '/cadastro/motoristas' },
  veiculos: { title: 'Veículos', endpoint: '/veiculos/', idKey: 'id_veiculo', search: item => `${item.nome} ${item.placa}`, status: item => item.status, route: '/cadastro/veiculos' },
};

export function EntityListScreen({ entity }: { entity: Entity }) {
  const meta = config[entity];
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setItems(unwrapList<Item>(await api.get(meta.endpoint)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [meta.endpoint]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const visible = items.filter(item => {
    const matchesSearch = meta.search(item).toLowerCase().includes(search.toLowerCase());
    const status = meta.status(item).toLowerCase();
    const matchesFilter = filter === 'Todos' || (entity === 'motoristas'
      ? status === filter.toLowerCase()
      : status === filter);
    return matchesSearch && matchesFilter;
  });
  const filterOptions = entity === 'corridas'
    ? ['Todos', 'pendente', 'confirmada', 'reconfirmacao_necessaria', 'em_andamento', 'concluida', 'cancelada', 'recusada']
    : entity === 'motoristas' ? ['Todos', 'ativo', 'inativo'] : ['Todos', 'disponivel', 'manutencao', 'indisponivel'];
  const labelForFilter = (value: string) => ({
    pendente: 'Pendente', confirmada: 'Confirmada', reconfirmacao_necessaria: 'Reconfirmação Necessária',
    em_andamento: 'Em Andamento', concluida: 'Concluída', cancelada: 'Cancelada', recusada: 'Recusada',
    disponivel: 'Disponível', indisponivel: 'Indisponível',
  }[value] || value);

  function open(item?: Item) {
    router.push({ pathname: meta.route as any, params: item ? { id: String(item[meta.idKey]) } : {} });
  }

  function renderItem({ item, index }: { item: Item; index: number }) {
    const status = meta.status(item);
    const title = entity === 'corridas' ? `${item.ponto_inicio || 'Origem'} → ${item.ponto_chegada || 'Destino'}` : item.nome || item.title || 'Sem nome';
    const date = item.data_solicitacao ? new Date(item.data_solicitacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : item.data_inicio || 'Data não informada';
    const vehicle = item.veiculo_nome && item.veiculo_placa ? `${item.veiculo_nome} | ${item.veiculo_placa}` : item.veiculo_placa || item.veiculo_nome || (item.veiculo ? `Veículo ID: ${item.veiculo}` : '—');
    const driver = item.motorista_nome || (item.motorista ? `Motorista ID: ${item.motorista}` : '—');
    const detail = entity === 'corridas' ? `${date} · ${vehicle} · ${driver}`
      : entity === 'motoristas' ? `${item.numero_corridas || 0} corridas · ${item.email || item.matricula || 'Cadastro de motorista'}` : `${item.placa || 'Sem placa'} · ${item.numero_corridas || 0} corridas`;
    return <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${meta.title.slice(0, -1)}`} onPress={() => open(item)} style={({ pressed }) => [styles.dataRow, index % 2 === 1 && styles.alternateRow, { opacity: pressed ? 0.78 : 1 }]}><View style={styles.rowContent}><Text numberOfLines={1} style={styles.rowDate}>{entity === 'corridas' ? date : title}</Text><Text numberOfLines={2} style={styles.rowTitle}>{entity === 'corridas' ? title : detail}</Text>{entity === 'corridas' ? <Text numberOfLines={1} style={styles.rowDetail}>{`Veículo: ${vehicle} · Motorista: ${driver}`}</Text> : null}</View><StatusBadge status={status} /><View pointerEvents="none" style={styles.editButton}><Ionicons name="create-outline" size={17} color={colors.brand} /></View></Pressable>;
  }

  return <View style={{ flex: 1, backgroundColor: colors.canvas }}><TopBar title={meta.title} /><View style={styles.pageContent}><View style={styles.listControls}><View style={styles.controlsRow}><View style={{ flex: 1, gap: 6 }}><Text style={styles.controlLabel}>Status</Text><Pressable accessibilityRole="button" accessibilityLabel="Filtrar por status" onPress={() => setFilterOpen(true)} style={styles.statusSelect}><Text numberOfLines={1} style={styles.statusSelectText}>{labelForFilter(filter)}</Text><Ionicons name="chevron-down" size={16} color={colors.brand} /></Pressable></View><Pressable accessibilityRole="button" accessibilityLabel={`Adicionar ${meta.title.slice(0, -1)}`} onPress={() => open()} style={styles.addButton}><Ionicons name="add" size={24} color={colors.paper} /></Pressable></View><View style={{ gap: 6 }}><Text style={styles.controlLabel}>{`Buscar ${entity === 'corridas' ? 'Corrida' : entity === 'motoristas' ? 'Motorista' : 'Veículo'}`}</Text><View style={styles.searchWrap}><TextInput accessibilityLabel={`Buscar ${meta.title.toLowerCase()}`} value={search} onChangeText={setSearch} placeholder={entity === 'corridas' ? 'Digite o ponto de início, chegada ou veículo' : entity === 'motoristas' ? 'Digite o nome' : 'Digite o nome ou placa'} placeholderTextColor="#777777" style={styles.searchInput} /><Ionicons name="search-outline" size={19} color={colors.brand} style={styles.searchIcon} /></View></View>{error ? <Notice message={error} onRetry={() => void load()} /> : null}{loading ? <LoadingState label={`Carregando ${meta.title.toLowerCase()}...`} /> : null}</View><FlatList
    data={visible}
    keyExtractor={(item, index) => String(item[meta.idKey] ?? index)}
    renderItem={renderItem}
    style={styles.listFrame}
    contentContainerStyle={{ flexGrow: 1 }}
    keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}
    ListEmptyComponent={!loading && !error ? <EmptyState title="Nenhum registro encontrado" detail="Tente alterar o filtro ou a busca." /> : undefined}
    ListFooterComponent={!loading ? <View style={{ height: 2 }} /> : undefined}
  /></View><Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}><Pressable onPress={() => setFilterOpen(false)} style={styles.modalBackdrop}><View style={styles.filterMenu}>{filterOptions.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: filter === option }} onPress={() => { setFilter(option); setFilterOpen(false); }} style={styles.filterOption}><Text style={styles.filterOptionText}>{labelForFilter(option)}</Text></Pressable>)}</View></Pressable></Modal></View>;
}

const styles = {
  pageContent: { flex: 1, padding: 15, gap: 17, backgroundColor: colors.canvas },
  listControls: { gap: 17 },
  controlsRow: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, gap: 12 },
  controlLabel: { color: colors.brand, fontSize: 12, fontWeight: '700' as const },
  statusSelect: { minHeight: 44, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 10, paddingHorizontal: 12, borderWidth: 2, borderColor: colors.brandLight, borderRadius: 8, backgroundColor: colors.paper },
  statusSelectText: { flex: 1, color: colors.brand, fontSize: 14, fontWeight: '700' as const, textTransform: 'capitalize' as const },
  addButton: { width: 45, height: 45, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 6, backgroundColor: colors.brandLight },
  searchWrap: { minHeight: 44, flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 2, borderColor: colors.brandLight, borderRadius: 8, backgroundColor: colors.paper },
  searchInput: { flex: 1, minWidth: 0, minHeight: 40, paddingHorizontal: 12, color: colors.brand, fontSize: 14 },
  searchIcon: { marginHorizontal: 12 },
  listFrame: { flex: 1, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.brandLight, borderRadius: 8, overflow: 'hidden' as const },
  dataRow: { minHeight: 68, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.line },
  alternateRow: { backgroundColor: '#D9D9D966' },
  rowContent: { flex: 1, minWidth: 0, gap: 3 },
  rowDate: { color: colors.brand, fontSize: 11, textAlign: 'center' as const },
  rowTitle: { color: colors.brand, fontSize: 12, fontWeight: '700' as const, textAlign: 'center' as const },
  rowDetail: { color: colors.brand, fontSize: 10, textAlign: 'center' as const },
  editButton: { width: 36, height: 36, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 4, backgroundColor: '#F0F0F0', elevation: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'center' as const, padding: 30, backgroundColor: '#00000066' },
  filterMenu: { maxHeight: '75%' as const, paddingVertical: 5, borderWidth: 2, borderColor: colors.brandLight, borderRadius: 8, backgroundColor: colors.paper },
  filterOption: { minHeight: 44, justifyContent: 'center' as const, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  filterOptionText: { color: colors.brand, fontSize: 14, textTransform: 'capitalize' as const },
};