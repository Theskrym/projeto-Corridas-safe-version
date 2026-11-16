import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { ActionButton, Field, Notice, Page, PageHeading, TopBar, ui } from '../../../components/ui';
import { AppText as Text } from '../../../components/AppText';
import { api, unwrapList } from '../../../lib/api';
import { dateInputToIso, formatDateInput, formatTimeInput, isoDateToInput, isValidTimeInput } from '../../../lib/dateTime';
import { colors } from '../../../theme';

type Entity = 'corridas' | 'motoristas' | 'veiculos';
type Values = Record<string, string>;
type SelectOption = { label: string; value: string };

const defaults: Record<Entity, Values> = {
  corridas: { ponto_inicio: '', ponto_chegada: '', data_inicio: '', horario_inicio: '', solicitante: '', destinos: '', servico: '', observacao: '', motorista: '', veiculo: '', status: 'pendente' },
  motoristas: { nome: '', matricula: '', email_corporativo: '', telefone: '', nivel_acesso: '3', status: 'ativo' },
  veiculos: { nome: '', placa: '', status: 'disponivel' },
};

const titles: Record<Entity, string> = { corridas: 'Corrida', motoristas: 'Motorista', veiculos: 'Veículo' };
const rideStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  recusada: 'Recusada',
};

function SelectField({ label, value, options, onSelect }: { label: string; value: string; options: SelectOption[]; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value)?.label || 'Selecione';
  return <><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 14 }}>{label}</Text><Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={[ui.spread, { minHeight: 48, backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 }]}><Text style={{ color: value ? colors.ink : colors.muted, fontSize: 16 }}>{selected}</Text><Ionicons name="chevron-down" size={18} color={colors.muted} /></Pressable><Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: '#045CA466', justifyContent: 'flex-end' }}><View style={{ maxHeight: '70%', backgroundColor: colors.paper, padding: 18, borderTopLeftRadius: 12, borderTopRightRadius: 12, gap: 10 }}><Text style={ui.cardTitle}>{label}</Text><ScrollView>{options.map(option => <Pressable key={option.value} accessibilityRole="button" onPress={() => { onSelect(option.value); setOpen(false); }} style={{ minHeight: 48, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }}><Text style={{ color: colors.ink }}>{option.label}</Text></Pressable>)}</ScrollView></View></Pressable></Modal></>;
}

export default function AdminFormScreen() {
  const params = useLocalSearchParams<{ entity: string; id?: string }>();
  const entity = (params.entity || 'corridas') as Entity;
  const id = params.id;
  const [values, setValues] = useState<Values>(defaults[entity] || defaults.corridas);
  const [motoristas, setMotoristas] = useState<SelectOption[]>([]);
  const [veiculos, setVeiculos] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (entity === 'corridas') {
          const [drivers, cars] = await Promise.all([api.get('/motoristas/'), api.get('/veiculos/')]);
          if (active) {
            setMotoristas(unwrapList<any>(drivers).map(item => ({ label: item.nome, value: String(item.id_usuario) })));
            setVeiculos(unwrapList<any>(cars).map(item => ({ label: `${item.nome} · ${item.placa}`, value: String(item.id_veiculo) })));
          }
        }
        if (id) {
          const endpoint = entity === 'corridas' ? '/corrida/' : entity === 'motoristas' ? '/motoristas/' : '/veiculos/';
          const data = await api.get<any>(`${endpoint}${id}/`);
          const source = data.data || data;
          const transformed: Values = entity === 'corridas' ? {
            ponto_inicio: source.ponto_inicio || '', ponto_chegada: source.ponto_chegada || '', data_inicio: isoDateToInput(source.data_inicio), horario_inicio: formatTimeInput(source.horario_inicio || ''),
            solicitante: source.solicitante || '', destinos: source.destinos || '', servico: source.servico || '', observacao: source.observacao || '', motorista: String(source.motorista?.id_usuario || source.motorista || ''), veiculo: String(source.veiculo?.id_veiculo || source.veiculo || ''), status: source.status || 'pendente',
          } : entity === 'motoristas' ? { nome: source.nome || '', matricula: String(source.matricula || ''), email_corporativo: source.email || '', telefone: source.telefone || '', nivel_acesso: String(source.nivel_acesso || 3), status: source.status || 'ativo' } : { nome: source.nome || '', placa: source.placa || '', status: source.status || 'disponivel' };
          if (active) setValues(transformed);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os dados.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [entity, id]);

  const set = (key: string, value: string) => setValues(current => ({ ...current, [key]: value }));

  async function fillLocation() {
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Permita o acesso à localização para preencher o ponto de embarque.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const places = await Location.reverseGeocodeAsync(current.coords);
      const place = places[0];
      const address = place ? [place.street, place.streetNumber, place.district, place.city].filter(Boolean).join(', ') : '';
      set('ponto_inicio', address || `${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`);
      setSuccess('Ponto de embarque preenchido com sua localização atual.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível obter a localização.'); }
  }

  async function openImagePicker() {
    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Permissão para acessar fotos do dispositivo negada.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      setError('Não foi possível abrir a imagem do dispositivo.');
    } finally {
      setPickerOpen(false);
    }
  }

  async function save() {
    setError('');
    setSuccess('');
    const required = entity === 'corridas' ? ['ponto_inicio', 'ponto_chegada', 'data_inicio'] : entity === 'motoristas' ? ['nome', 'matricula', 'email_corporativo'] : ['nome', 'placa'];
    if (required.some(key => !values[key]?.trim())) { setError('Preencha todos os campos obrigatórios.'); return; }
    const rideDate = entity === 'corridas' ? dateInputToIso(values.data_inicio) : null;
    if (entity === 'corridas' && !rideDate) { setError('Informe uma data válida no formato DD/MM/AAAA.'); return; }
    if (entity === 'corridas' && values.horario_inicio && !isValidTimeInput(values.horario_inicio)) { setError('Informe um horário válido no formato HH:MM.'); return; }
    if (entity === 'motoristas' && !/^\d{6}$/.test(values.matricula)) { setError('A matrícula deve conter exatamente 6 dígitos.'); return; }
    if (entity === 'motoristas' && !values.email_corporativo.toLowerCase().endsWith('@cesmac.edu.br')) { setError('Use um e-mail @cesmac.edu.br.'); return; }
    setSaving(true);
    try {
      const endpoint = entity === 'corridas'
        ? (id ? `/corrida/${id}/` : '/corrida/')
        : entity === 'motoristas'
          ? (id ? `/motoristas/${id}/` : '/motoristas/novo/')
          : `/veiculos/${id ? `${id}/` : ''}`;
      const payload = entity === 'corridas' ? {
        ponto_inicio: values.ponto_inicio.trim(), ponto_chegada: values.ponto_chegada.trim(), data_inicio: rideDate, horario_inicio: values.horario_inicio || null,
        solicitante: values.solicitante.trim() || null, destinos: values.destinos.trim() || null,
        paradas_intermediarias: values.destinos.split(',').map(name => name.trim()).filter(Boolean).map((name, ordem) => ({ nome: name, endereco: name, ordem })),
        servico: values.servico.trim() || null, observacao: values.observacao.trim() || null,
        motorista: values.motorista ? Number(values.motorista) : null, veiculo: values.veiculo ? Number(values.veiculo) : null, status: values.status,
      } : entity === 'motoristas' ? {
        nome: values.nome.trim(), matricula: values.matricula.trim(), email: values.email_corporativo.trim(), telefone: values.telefone.trim(), nivel_acesso: Number(values.nivel_acesso), status: values.status,
      } : { nome: values.nome.trim(), placa: values.placa.trim().toUpperCase(), status: values.status };
      if (id) await api.patch(endpoint, payload);
      else await api.post(endpoint, payload);
      setSuccess(`${titles[entity]} salvo com sucesso.`);
      setTimeout(() => router.back(), 700);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  }

  async function removeVehicle() {
    if (entity !== 'veiculos' || !id) return;
    setError('');
    setSaving(true);
    try {
      await api.delete(`/veiculos/${id}/`, {});
      setConfirmDelete(false);
      setSuccess('Veículo excluído com sucesso.');
      setTimeout(() => router.back(), 700);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir o veículo.');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <><TopBar title={`${id ? 'Editar' : 'Novo'} ${titles[entity] || ''}`} back /><Page><ActivityIndicator color={colors.brand} /></Page></>;
  if (!defaults[entity]) return <><TopBar title="Cadastro" back /><Page><Notice message="Tipo de cadastro não encontrado." /></Page></>;

  const isRide = entity === 'corridas';
  const statusOptions = isRide ? ['pendente', 'confirmada', 'em_andamento', 'concluida', 'cancelada', 'recusada'] : entity === 'motoristas' ? ['ativo', 'inativo'] : ['disponivel', 'indisponivel'];
  return <><TopBar title={`${id ? 'Editar' : 'Nova'} ${titles[entity]}`} back /><Page><PageHeading title={`${id ? 'Editar' : 'Cadastrar'} ${titles[entity]}`} subtitle="Campos com * são obrigatórios." />{error ? <Notice message={error} /> : null}{success ? <Notice type="success" message={success} /> : null}
    {isRide ? (
      <>
        <Field label="Ponto de embarque *" value={values.ponto_inicio} onChangeText={value => set('ponto_inicio', value)} placeholder="Endereço de origem" />
        <ActionButton title="Usar minha localização" icon="locate-outline" variant="secondary" onPress={() => void fillLocation()} />
        <Field label="Ponto de desembarque *" value={values.ponto_chegada} onChangeText={value => set('ponto_chegada', value)} placeholder="Endereço de destino" />
        <View style={ui.row}>
          <View style={{ flex: 1 }}>
            <Field label="Data de início *" value={values.data_inicio} onChangeText={value => set('data_inicio', formatDateInput(value))} placeholder="DD/MM/AAAA" keyboardType="number-pad" maxLength={10} hint="Digite os números; as barras são inseridas automaticamente." />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Horário" value={values.horario_inicio} onChangeText={value => set('horario_inicio', formatTimeInput(value))} placeholder="HH:MM" keyboardType="number-pad" maxLength={5} hint="Os dois-pontos são inseridos automaticamente." />
          </View>
        </View>
        <Field label="Solicitante" value={values.solicitante} onChangeText={value => set('solicitante', value)} />
        <Field label="Paradas" value={values.destinos} onChangeText={value => set('destinos', value)} placeholder="Separe cada parada por vírgula" />
        <Field label="Serviço" value={values.servico} onChangeText={value => set('servico', value)} />
        <SelectField label="Motorista" value={values.motorista} options={[{ label: 'Sem motorista', value: '' }, ...motoristas]} onSelect={value => set('motorista', value)} />
        <SelectField label="Veículo" value={values.veiculo} options={[{ label: 'Sem veículo', value: '' }, ...veiculos]} onSelect={value => set('veiculo', value)} />
        <Field label="Observação" value={values.observacao} onChangeText={value => set('observacao', value)} multiline numberOfLines={4} textAlignVertical="top" />
        <View style={ui.card}>
          <Text style={ui.cardTitle}>Registro visual local</Text>
          <Text style={ui.body}>A imagem fica armazenada neste dispositivo; o backend atual não recebe anexos de imagem.</Text>
          {photoUri ? <Image source={{ uri: photoUri }} style={{ width: '100%', height: 180, borderRadius: 8 }} resizeMode="cover" /> : null}
          <ActionButton title={photoUri ? 'Trocar foto' : 'Escolher da galeria'} icon="images-outline" variant="secondary" onPress={() => setPickerOpen(true)} />
        </View>
      </>
    ) : entity === 'motoristas' ? (
      <>
        <Field label="Nome *" value={values.nome} onChangeText={value => set('nome', value)} />
        <Field label="Matrícula *" value={values.matricula} onChangeText={value => set('matricula', value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" />
        <Field label="E-mail CESMAC *" value={values.email_corporativo} onChangeText={value => set('email_corporativo', value)} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Telefone" value={values.telefone} onChangeText={value => set('telefone', value)} keyboardType="phone-pad" />
        <SelectField label="Tipo de acesso" value={values.nivel_acesso} options={[{ value: '1', label: 'Administrador' }, { value: '2', label: 'Gerente' }, { value: '3', label: 'Motorista' }, { value: '4', label: 'Operador' }, { value: '5', label: 'Visualizador' }]} onSelect={value => set('nivel_acesso', value)} />
        {id ? <SelectField label="Status" value={values.status} options={[{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }]} onSelect={value => set('status', value)} /> : null}
      </>
    ) : (
      <>
        <Field label="Nome do veículo *" value={values.nome} onChangeText={value => set('nome', value)} placeholder="Modelo" />
        <Field label="Placa *" value={values.placa} onChangeText={value => set('placa', value.toUpperCase())} autoCapitalize="characters" />
        {id ? <SelectField label="Status" value={values.status} options={[{ value: 'disponivel', label: 'Disponível' }, { value: 'indisponivel', label: 'Indisponível' }]} onSelect={value => set('status', value)} /> : null}
      </>
    )}
    {isRide ? <SelectField label="Status" value={values.status} options={statusOptions.map(value => ({ value, label: rideStatusLabels[value] || value.replaceAll('_', ' ') }))} onSelect={value => set('status', value)} /> : null}<ActionButton title="Salvar cadastro" icon="checkmark" onPress={() => void save()} loading={saving} />
    {entity === 'veiculos' && id ? <ActionButton title="Excluir veículo" icon="trash-outline" variant="danger" onPress={() => { setDeletePhrase(''); setConfirmDelete(true); }} /> : null}
  </Page>
  <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#10182066' }}><View style={{ backgroundColor: colors.paper, padding: 20, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 12 }}><Text style={ui.cardTitle}>Selecionar imagem</Text><ActionButton title="Escolher da galeria" icon="images-outline" onPress={() => void openImagePicker()} /><ActionButton title="Fechar" variant="secondary" onPress={() => setPickerOpen(false)} /></View></View></Modal>
  <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}><View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#10182088' }}><View style={[ui.card, { gap: 12 }]}><Text style={ui.cardTitle}>Excluir veículo?</Text><Text style={ui.body}>Veículos associados a corridas não podem ser excluídos. Digite EXCLUIR para confirmar.</Text><Field label='Digite "EXCLUIR"' value={deletePhrase} onChangeText={setDeletePhrase} autoCapitalize="characters" /><ActionButton title="Confirmar exclusão" icon="trash-outline" variant="danger" loading={saving} disabled={deletePhrase.trim() !== 'EXCLUIR'} onPress={() => void removeVehicle()} /><ActionButton title="Cancelar" variant="secondary" onPress={() => setConfirmDelete(false)} /></View></View></Modal>
  </>;
}