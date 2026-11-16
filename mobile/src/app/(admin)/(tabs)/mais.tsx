import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Notice, Page, PageHeading, TopBar, ui } from '../../../components/ui';
import { AppText as Text } from '../../../components/AppText';
import { useAuth } from '../../../lib/auth';
import { colors } from '../../../theme';

const sections = [
  { title: 'Notificações', detail: 'Avisos e atualizações do sistema', icon: 'notifications-outline' as const, path: '/notificacoes' },
  { title: 'Relatórios', detail: 'Indicadores e resumo operacional', icon: 'bar-chart-outline' as const, path: '/relatorios' },
  { title: 'Configurações do relatório', detail: 'Cores dos status no Excel', icon: 'color-palette-outline' as const, path: '/status' },
  { title: 'Dados pessoais', detail: 'Informações da conta', icon: 'person-outline' as const, path: '/perfil' },
  { title: 'Alterar senha', detail: 'Atualize sua credencial', icon: 'key-outline' as const, path: '/senha' },
  { title: 'Aviso de privacidade', detail: 'Consulte seus dados e consentimento', icon: 'shield-checkmark-outline' as const, path: '/privacy-consent' },
  { title: 'Excluir conta', detail: 'Remova seu cadastro do sistema', icon: 'trash-outline' as const, path: '/excluir-conta' },
];

export default function MoreScreen() {
  const { logout, notificationSyncWarning } = useAuth();
  return <View style={{ flex: 1, backgroundColor: colors.canvas }}><TopBar title="Mais opções" showSettings={false} /><Page><PageHeading title="Administração" subtitle="Configurações e ferramentas de gestão." />{notificationSyncWarning ? <Notice type="info" message={notificationSyncWarning} /> : null}{sections.map(item => <Pressable key={item.path} accessibilityRole="button" onPress={() => router.push(item.path as any)} style={({ pressed }) => [ui.card, ui.spread, { opacity: pressed ? 0.75 : 1 }]}><View style={[ui.row, { flex: 1 }]}><Ionicons name={item.icon} size={21} color={colors.brand} /><View style={{ flex: 1, gap: 3 }}><Text style={ui.cardTitle}>{item.title}</Text><Text style={ui.body}>{item.detail}</Text></View></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>)}<Pressable accessibilityRole="button" onPress={() => void logout().then(() => router.replace('/login'))} style={[ui.card, ui.row, { minHeight: 52 }]}><Ionicons name="log-out-outline" size={20} color={colors.red} /><Text style={{ color: colors.red, fontWeight: '700', fontSize: 15 }}>Encerrar sessão</Text></Pressable></Page></View>;
}