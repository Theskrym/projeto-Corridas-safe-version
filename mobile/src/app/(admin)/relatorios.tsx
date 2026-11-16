import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { ActionButton, EmptyState, Field, LoadingState, Notice, Page, PageHeading, StatusBadge, TopBar, ui } from '../../components/ui';
import { AppText as Text } from '../../components/AppText';
import { api, downloadAuthenticatedFile } from '../../lib/api';
import { dateInputToIso, formatDateInput } from '../../lib/dateTime';
import { colors } from '../../theme';

type ReportRide = {
  id_corrida: number;
  ponto_inicio?: string;
  ponto_chegada?: string;
  solicitante?: string;
  destinos?: string;
  paradas_intermediarias?: { nome?: string }[] | null;
  motorista?: number | null;
  motorista_nome?: string;
  veiculo_nome?: string;
  veiculo_placa?: string;
  status?: string;
  data_solicitacao?: string;
};

type ReportSummary = {
  total_corridas: number;
  corridas_concluidas: number;
  corridas_canceladas: number;
  corridas_recusadas: number;
  corridas_pendentes: number;
  distancia_total_km: number;
};

type ReportData = {
  periodo: { data_inicio: string | null; data_fim: string | null };
  resumo: ReportSummary;
  corridas: ReportRide[];
};

type ReportFilters = { from: string; to: string; search: string; status: string };
type ReportSortKey = 'motorista' | 'solicitante' | 'status' | 'destino' | 'paradas' | 'data';
type ReportSortState = { key: ReportSortKey; direction: 'asc' | 'desc' } | null;

const EMPTY_FILTERS: ReportFilters = { from: '', to: '', search: '', status: '' };
const REPORT_COLUMNS: { key: ReportSortKey; label: string; mobileWeight: number; desktopWeight: number }[] = [
  { key: 'motorista', label: 'MOTORISTA', mobileWeight: 0.15, desktopWeight: 1.1 },
  { key: 'solicitante', label: 'SOLICITANTE', mobileWeight: 0.15, desktopWeight: 1 },
  { key: 'status', label: 'STATUS', mobileWeight: 0.2, desktopWeight: 1 },
  { key: 'destino', label: 'DESTINO', mobileWeight: 0.16, desktopWeight: 1.4 },
  { key: 'paradas', label: 'PARADAS', mobileWeight: 0.15, desktopWeight: 1 },
  { key: 'data', label: 'DATA | HORA', mobileWeight: 0.19, desktopWeight: 1.1 },
];
const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'reconfirmacao_necessaria', label: 'Reconfirmação' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'recusada', label: 'Recusada' },
];

function toQuery(filters: ReportFilters) {
  const query = new URLSearchParams();
  const from = dateInputToIso(filters.from);
  const to = dateInputToIso(filters.to);
  if (from) query.set('data_inicio', from);
  if (to) query.set('data_fim', to);
  if (filters.search) query.set('q', filters.search.trim());
  if (filters.status) query.set('status', filters.status);
  return query.toString();
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSortValue(ride: ReportRide, key: ReportSortKey) {
  if (key === 'motorista') return ride.motorista_nome || `ID: ${ride.motorista || ''}`;
  if (key === 'solicitante') return ride.solicitante || '';
  if (key === 'status') return ride.status || '';
  if (key === 'destino') return `${ride.ponto_inicio || ''} ${ride.ponto_chegada || ride.destinos || ''}`;
  if (key === 'paradas') return ride.paradas_intermediarias?.map(stop => stop.nome).join(', ') || '';
  return ride.data_solicitacao ? new Date(ride.data_solicitacao) : null;
}

function sortRides(rides: ReportRide[], sort: ReportSortState) {
  if (!sort) return rides;
  return rides
    .map((ride, index) => ({ ride, index }))
    .sort((a, b) => {
      const valueA = getSortValue(a.ride, sort.key);
      const valueB = getSortValue(b.ride, sort.key);
      let comparison = 0;
      if (valueA instanceof Date && valueB instanceof Date) comparison = valueA.getTime() - valueB.getTime();
      else comparison = String(valueA ?? '').localeCompare(String(valueB ?? ''), 'pt-BR', { sensitivity: 'base', numeric: true });
      if (comparison === 0) comparison = a.index - b.index;
      return sort.direction === 'asc' ? comparison : -comparison;
    })
    .map(({ ride }) => ride);
}

function ReportCell({ width, children }: { width: number; children: ReactNode }) {
  return <View style={[styles.tableCell, { width }]}>{children}</View>;
}

function SortHeaderCell({ width, label, sortKey, sort, onPress }: { width: number; label: string; sortKey: ReportSortKey; sort: ReportSortState; onPress: (key: ReportSortKey) => void }) {
  const indicator = sort?.key === sortKey ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ordenar por ${label}`}
      accessibilityHint="Alterna entre ordem crescente, decrescente e padrão."
      onPress={() => onPress(sortKey)}
      style={[styles.tableCell, styles.sortHeader, { width }]}
    >
      <Text style={styles.tableHeaderText}>{label}{indicator}</Text>
    </Pressable>
  );
}

export default function ReportsScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const appliedFiltersRef = useRef(EMPTY_FILTERS);
  const [report, setReport] = useState<ReportData | null>(null);
  const [sort, setSort] = useState<ReportSortState>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [actionError, setActionError] = useState('');

  const loadReport = useCallback(async (filters: ReportFilters) => {
    setLoading(true);
    setError('');
    const query = toQuery(filters);
    try {
      const data = await api.get<ReportData>(`/relatorios/${query ? `?${query}` : ''}`);
      setReport(data);
    } catch (reason) {
      setReport(null);
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o relatório.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadReport(appliedFiltersRef.current);
  }, [loadReport]));

  const applyFilters = () => {
    const from = draftFilters.from.trim();
    const to = draftFilters.to.trim();
    const fromIso = from ? dateInputToIso(from) : null;
    const toIso = to ? dateInputToIso(to) : null;
    if ((from && !fromIso) || (to && !toIso)) {
      setFilterError('Informe datas válidas no formato DD/MM/AAAA.');
      return;
    }
    if (fromIso && toIso && fromIso > toIso) {
      setFilterError('A data inicial não pode ser posterior à data final.');
      return;
    }
    setFilterError('');
    setActionError('');
    const filters = { ...draftFilters, from, to, search: draftFilters.search.trim() };
    appliedFiltersRef.current = filters;
    setAppliedFilters(filters);
    void loadReport(filters);
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilterError('');
    setActionError('');
    appliedFiltersRef.current = EMPTY_FILTERS;
    setAppliedFilters(EMPTY_FILTERS);
    void loadReport(EMPTY_FILTERS);
  };

  const handleExcelExport = async () => {
    if (!report) return;
    setExporting(true);
    setActionError('');
    try {
      const query = toQuery(appliedFilters);
      const filename = `relatorio_corridas_${dateInputToIso(appliedFilters.from) || 'todas'}_${dateInputToIso(appliedFilters.to) || 'datas'}.xlsx`;
      const file = await downloadAuthenticatedFile(`/relatorios/download/${query ? `?${query}` : ''}`, filename);
      if (file.platform === 'web') {
        const url = URL.createObjectURL(file.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        if (!await Sharing.isAvailableAsync()) throw new Error('O compartilhamento de arquivos não está disponível neste dispositivo.');
        await Sharing.shareAsync(file.uri, {
          dialogTitle: 'Exportar relatório Excel',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          UTI: 'org.openxmlformats.spreadsheetml.sheet',
        });
      }
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Não foi possível exportar o relatório.');
    } finally {
      setExporting(false);
    }
  };

  const metrics = report ? [
    ['Total de corridas', report.resumo.total_corridas],
    ['Concluídas', report.resumo.corridas_concluidas],
    ['Pendentes', report.resumo.corridas_pendentes],
    ['Canceladas', report.resumo.corridas_canceladas],
    ['Recusadas', report.resumo.corridas_recusadas],
  ] as const : [];
  const isNarrowTable = windowWidth <= 768;
  const tableWidth = isNarrowTable ? Math.max(620, (windowWidth - 32) * 1.8) : windowWidth - 32;
  const availableColumnsWidth = tableWidth - (isNarrowTable ? 80 : 90);
  const statusColumnWidth = isNarrowTable ? Math.max(125, availableColumnsWidth * 1.2 / 6.2) : 0;
  const otherMobileColumnWidth = isNarrowTable ? (availableColumnsWidth - statusColumnWidth) / 5 : 0;
  const columnWidths = REPORT_COLUMNS.map((column, index) => isNarrowTable
    ? (index === 2 ? statusColumnWidth : otherMobileColumnWidth)
    : availableColumnsWidth * column.desktopWeight / 6.6);
  const sortedRides = useMemo(() => sortRides(report?.corridas || [], sort), [report?.corridas, sort]);
  const cycleSort = (key: ReportSortKey) => setSort(current => {
    if (!current || current.key !== key) return { key, direction: 'asc' };
    if (current.direction === 'asc') return { key, direction: 'desc' };
    return null;
  });

  return (
    <View style={styles.screen}>
      <TopBar title="Relatórios" back />
      <Page>
        <PageHeading eyebrow="Análise operacional" title="Relatório de corridas" subtitle="Filtre, confira os registros e exporte o resultado." />

        <View style={[ui.card, styles.filters]}>
          <Field
            label="Buscar"
            value={draftFilters.search}
            onChangeText={search => setDraftFilters(current => ({ ...current, search }))}
            placeholder="Motorista, veículo, rota ou solicitante"
            returnKeyType="search"
            onSubmitEditing={applyFilters}
          />
          <Text style={styles.label}>Status da corrida</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Selecionar status da corrida"
            accessibilityState={{ expanded: statusMenuOpen }}
            onPress={() => setStatusMenuOpen(true)}
            style={styles.statusSelect}
          >
            <Text style={styles.statusSelectText}>
              {STATUS_OPTIONS.find(option => option.value === draftFilters.status)?.label || 'Todos'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.brand} />
          </Pressable>
          <View style={styles.dateFields}>
            <View style={styles.dateField}>
              <Field
                label="Data inicial"
                value={draftFilters.from}
                onChangeText={from => setDraftFilters(current => ({ ...current, from: formatDateInput(from) }))}
                placeholder="DD/MM/AAAA"
                keyboardType="number-pad"
                maxLength={10}
                hint="Digite os números; as barras são inseridas automaticamente."
              />
            </View>
            <View style={styles.dateField}>
              <Field
                label="Data final"
                value={draftFilters.to}
                onChangeText={to => setDraftFilters(current => ({ ...current, to: formatDateInput(to) }))}
                placeholder="DD/MM/AAAA"
                keyboardType="number-pad"
                maxLength={10}
                hint="Digite os números; as barras são inseridas automaticamente."
              />
            </View>
          </View>
          {filterError ? <Notice message={filterError} /> : null}
          <View style={styles.filterActions}>
            <ActionButton title="Aplicar filtros" icon="search-outline" onPress={applyFilters} loading={loading} buttonStyle={styles.flexButton} />
            <ActionButton title="Limpar" variant="secondary" onPress={clearFilters} disabled={loading} buttonStyle={styles.flexButton} />
          </View>
        </View>

        {error ? <Notice message={error} onRetry={() => void loadReport(appliedFilters)} /> : null}
        {actionError ? <Notice message={actionError} /> : null}

        {loading ? <LoadingState label="Carregando corridas..." /> : report ? (
          <>
            <View style={styles.metrics}>
              {metrics.map(([label, value]) => (
                <View key={label} style={[ui.card, styles.metricCard]}>
                  <Text style={styles.metricValue}>{value}</Text>
                  <Text style={styles.metricLabel}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.resultsHeading}>
              <Text style={ui.cardTitle}>Corridas encontradas</Text>
              <Text style={styles.muted}>{report.corridas.length} registro(s)</Text>
            </View>

            {report.corridas.length ? (
              <View style={[ui.card, styles.tableCard, { width: Math.min(tableWidth, windowWidth - 32) }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ width: tableWidth }}>
                    <View style={[styles.tableRow, styles.tableHeader, isNarrowTable ? styles.tableRowMobile : null, isNarrowTable ? styles.tableHeaderMobile : null]}>
                      {REPORT_COLUMNS.map((column, index) => (
                        <SortHeaderCell key={column.key} width={columnWidths[index]} label={column.label} sortKey={column.key} sort={sort} onPress={cycleSort} />
                      ))}
                    </View>
                    {sortedRides.map((ride, index) => {
                      const start = ride.ponto_inicio?.slice(0, 15) || '—';
                      const end = ride.ponto_chegada?.slice(0, 15) || '—';
                      let stops = ride.paradas_intermediarias?.map(stop => stop.nome).filter(Boolean).join(', ') || '—';
                      if (stops.length > 30) stops = `${stops.slice(0, 27)}...`;
                      return (
                        <View key={ride.id_corrida} style={[styles.tableRow, isNarrowTable ? styles.tableRowMobile : null, index % 2 ? styles.tableRowAlternate : null]}>
                          <ReportCell width={columnWidths[0]}><Text style={styles.cellText}>{ride.motorista_nome || `ID: ${ride.motorista || '—'}`}</Text></ReportCell>
                          <ReportCell width={columnWidths[1]}><Text style={styles.cellText}>{ride.solicitante || '—'}</Text></ReportCell>
                          <ReportCell width={columnWidths[2]}>
                            <View style={styles.statusCell}><StatusBadge status={ride.status} /></View>
                          </ReportCell>
                          <ReportCell width={columnWidths[3]}><Text style={styles.cellText}>{`${start}... → ${end}...`}</Text></ReportCell>
                          <ReportCell width={columnWidths[4]}><Text style={styles.cellText}>{stops}</Text></ReportCell>
                          <ReportCell width={columnWidths[5]}><Text style={styles.cellText}>{formatDate(ride.data_solicitacao)}</Text></ReportCell>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : <EmptyState title="Nenhuma corrida encontrada" detail="Altere os filtros e tente novamente." />}

            <View style={styles.exportActions}>
              <ActionButton
                title="Configurar cores do relatório"
                icon="color-palette-outline"
                variant="secondary"
                onPress={() => router.push('/status')}
                buttonStyle={styles.flexButton}
              />
              <ActionButton
                title="Exportar relatório (Excel)"
                icon="download-outline"
                onPress={() => void handleExcelExport()}
                loading={exporting}
                buttonStyle={styles.flexButton}
              />
            </View>
            <Text style={styles.exportHint}>As cores configuradas por status serão aplicadas ao arquivo Excel.</Text>
          </>
        ) : null}
      </Page>
      <Modal visible={statusMenuOpen} transparent animationType="fade" onRequestClose={() => setStatusMenuOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStatusMenuOpen(false)} accessibilityLabel="Fechar menu de status" />
          <View style={styles.statusMenu}>
            <Text style={ui.cardTitle}>Filtrar por status</Text>
            {STATUS_OPTIONS.map(option => {
              const selected = draftFilters.status === option.value;
              return (
                <Pressable
                  key={option.value || 'todos'}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setDraftFilters(current => ({ ...current, status: option.value }));
                    setStatusMenuOpen(false);
                  }}
                  style={styles.statusMenuOption}
                >
                  <Text style={[styles.statusMenuOptionText, selected && styles.statusMenuOptionTextSelected]}>{option.label}</Text>
                  {selected ? <Ionicons name="checkmark" size={18} color={colors.brand} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  filters: { gap: 14 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  statusSelect: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.paper },
  statusSelectText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#10182088' },
  statusMenu: { maxHeight: '80%', padding: 16, borderRadius: 12, backgroundColor: colors.paper, gap: 4, elevation: 8 },
  statusMenuOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 8 },
  statusMenuOptionText: { color: colors.body, fontSize: 15 },
  statusMenuOptionTextSelected: { color: colors.brand, fontWeight: '700' },
  dateFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dateField: { flex: 1, minWidth: 190 },
  filterActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  flexButton: { flexGrow: 1, flexBasis: 145 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { flexGrow: 1, flexBasis: 125, padding: 14, minHeight: 82, justifyContent: 'center' },
  metricValue: { color: colors.brand, fontSize: 22, fontWeight: '800' },
  metricLabel: { color: colors.body, fontSize: 12, lineHeight: 17 },
  resultsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  muted: { color: colors.muted, fontSize: 13 },
  tableCard: { padding: 0, borderColor: '#0072C6', borderWidth: 2, borderRadius: 8, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', minHeight: 54, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 114, 198, 0.1)', backgroundColor: colors.paper, alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  tableHeader: { minHeight: 44, backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: '#045CA4', paddingHorizontal: 20, paddingVertical: 15 },
  tableHeaderMobile: { paddingVertical: 10 },
  tableRowMobile: { paddingHorizontal: 15, paddingVertical: 10 },
  tableRowAlternate: { backgroundColor: '#D9D9D966' },
  tableCell: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 0, paddingVertical: 0 },
  sortHeader: { minHeight: 44 },
  tableHeaderText: { color: '#045CA4', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  cellText: { color: '#045CA4', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  statusCell: { alignItems: 'center' },
  exportActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exportHint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
