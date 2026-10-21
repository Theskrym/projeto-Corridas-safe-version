import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewProps, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppText as Text } from './AppText';
import { CesmacLogo } from './BrandAssets';
import type { SvgProps } from 'react-native-svg';
import { colors, space } from '../theme';

export function Page({ children, scroll = true, ...props }: ViewProps & { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" {...props}>{children}</ScrollView> : <View style={[styles.page, styles.fill]} {...props}>{children}</View>}
    </SafeAreaView>
  );
}

export function BrandHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.logoRow}><View style={styles.headerSpacer} /><CesmacLogo width={196.5} height={40.5} /><View style={styles.headerSpacer} /></View>
      <View style={styles.titleBand}><Text style={styles.titleBandText}>{title}</Text></View>
    </View>
  );
}

export function TopBar({ title, back = false, action, onAction }: { title: string; back?: boolean; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        {back ? <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} hitSlop={8} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={colors.brand} /></Pressable> : <View style={styles.iconButton} />}
        <CesmacLogo width={196.5} height={40.5} />
        {action ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.topAction}><Text style={styles.topActionText}>{action}</Text></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="Mais opções" onPress={() => router.push('/(admin)/(tabs)/mais')} style={styles.iconButton}><Ionicons name="settings-outline" size={24} color={colors.brand} /></Pressable>}
      </View>
      <View style={styles.titleBand}><Text style={styles.titleBandText}>{title}</Text></View>
    </View>
  );
}

export function PageHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return <View style={styles.heading}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text accessibilityRole="header" style={styles.headingTitle}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}

export function ActionButton({ title, onPress, icon, variant = 'primary', disabled = false, loading = false, buttonStyle }: { title: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; loading?: boolean; buttonStyle?: StyleProp<ViewStyle> }) {
  const background = variant === 'primary' ? colors.brandLight : variant === 'danger' ? colors.redSoft : colors.paper;
  const foreground = variant === 'primary' ? colors.paper : variant === 'danger' ? colors.red : colors.brandDeep;
  const border = variant !== 'primary' ? { borderWidth: 1, borderColor: colors.line } : {};
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.action, buttonStyle, { backgroundColor: background, opacity: pressed || disabled ? 0.72 : 1 }, border]}>
      {loading ? <ActivityIndicator color={foreground} /> : icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}
      <Text style={[styles.actionText, { color: foreground }]}>{loading ? 'Aguarde...' : title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, error, icon: Icon, labelStyle, inputStyle, style: nativeInputStyle, ...props }: TextInputProps & { label: string; hint?: string; error?: string; icon?: React.ComponentType<SvgProps>; labelStyle?: TextStyle; inputStyle?: TextStyle }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <View style={Icon ? styles.inputWithIcon : undefined}>
        {Icon ? <Icon width={18} height={18} style={styles.fieldIcon} /> : null}
        <TextInput accessibilityLabel={label} placeholderTextColor="#777777" style={[styles.input, Icon ? styles.inputPadded : null, error ? styles.inputError : null, inputStyle, nativeInputStyle]} {...props} />
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Notice({ message, type = 'error', onRetry }: { message: string; type?: 'error' | 'success' | 'info'; onRetry?: () => void }) {
  const style = type === 'error' ? styles.noticeError : type === 'success' ? styles.noticeSuccess : styles.noticeInfo;
  return <View accessibilityRole={type === 'error' ? 'alert' : undefined} style={[styles.notice, style]}><Text style={styles.noticeText}>{message}</Text>{onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}><Text style={styles.retry}>Tentar novamente</Text></Pressable> : null}</View>;
}

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return <View style={styles.loading}><ActivityIndicator color={colors.brand} /><Text style={styles.muted}>{label}</Text></View>;
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return <View style={styles.empty}><Ionicons name="file-tray-outline" size={30} color={colors.muted} /><Text style={styles.emptyTitle}>{title}</Text>{detail ? <Text style={styles.muted}>{detail}</Text> : null}</View>;
}

export function StatusBadge({ status }: { status?: string }) {
  const normalized = (status || 'indefinido').toLowerCase();
  const palette: Record<string, { backgroundColor: string; color: string }> = {
    concluida: { backgroundColor: '#34C759', color: '#FFFFFF' },
    disponivel: { backgroundColor: '#34C759', color: '#FFFFFF' },
    ativo: { backgroundColor: '#34C759', color: '#FFFFFF' },
    cancelada: { backgroundColor: '#FF3B30', color: '#FFFFFF' },
    recusada: { backgroundColor: '#FF3B30', color: '#FFFFFF' },
    indisponivel: { backgroundColor: '#FF3B30', color: '#FFFFFF' },
    inativo: { backgroundColor: '#FF3B30', color: '#FFFFFF' },
    confirmada: { backgroundColor: '#2196F3', color: '#FFFFFF' },
    pendente: { backgroundColor: '#FFC107', color: '#000000' },
    em_andamento: { backgroundColor: '#1D4ED8', color: '#FFFFFF' },
    reconfirmacao_necessaria: { backgroundColor: '#FF9800', color: '#FFFFFF' },
    manutencao: { backgroundColor: '#FF9800', color: '#FFFFFF' },
  };
  const label = normalized.replaceAll('_', ' ');
  const statusColors = palette[normalized] || { backgroundColor: '#999999', color: '#FFFFFF' };
  return <View style={[styles.badge, { backgroundColor: statusColors.backgroundColor }]}><Text style={[styles.badgeText, { color: statusColors.color }]}>{label}</Text></View>;
}

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  card: { backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: 8, padding: 18, gap: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  body: { color: colors.body, fontSize: 14, lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.line },
  fieldStack: { gap: 14 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  page: { flexGrow: 1, paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: 28, gap: space.md, backgroundColor: colors.canvas },
  fill: { flex: 1 },
  header: { width: '100%', flexShrink: 0, backgroundColor: colors.paper },
  logoRow: { width: '100%', height: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 44, height: 44 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleBand: { minHeight: 26, paddingHorizontal: 10, paddingVertical: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandLight },
  titleBandText: { color: colors.paper, fontWeight: '700', fontSize: 15.7, lineHeight: 18, textAlign: 'center' },
  topAction: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  topActionText: { color: colors.brand, fontWeight: '700' },
  topTrailing: { width: 12 },
  heading: { gap: 4, paddingTop: 4 },
  eyebrow: { color: colors.brand, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  headingTitle: { color: colors.ink, fontSize: 27, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  action: { minHeight: 46, borderRadius: 4, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionText: { fontSize: 15, fontWeight: '700' },
  field: { gap: 6 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 4, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, color: '#111111', fontSize: 14 },
  inputWithIcon: { position: 'relative', justifyContent: 'center' },
  inputPadded: { paddingLeft: 36 },
  fieldIcon: { position: 'absolute', left: 10, zIndex: 1 },
  inputError: { borderColor: colors.red },
  error: { color: colors.red, fontSize: 13, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 12 },
  notice: { borderRadius: 8, padding: 12, gap: 8, borderWidth: 1 },
  noticeError: { backgroundColor: '#FCE8E8', borderColor: '#F1B3B3' },
  noticeSuccess: { backgroundColor: '#EAF7EE', borderColor: '#C9EAD3' },
  noticeInfo: { backgroundColor: '#EEF5FF', borderColor: '#CFE0F7' },
  noticeText: { color: colors.body, fontSize: 14, lineHeight: 20 },
  retry: { minHeight: 44, textAlignVertical: 'center', color: colors.brandDeep, fontWeight: '700' },
  loading: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  empty: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 8, padding: space.md },
  emptyTitle: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  badge: { alignSelf: 'flex-start', minWidth: 75, alignItems: 'center', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});