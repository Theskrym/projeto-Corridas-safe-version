import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { Link, router } from 'expo-router';
import { ActionButton, BrandHeader, Field, Notice } from '../components/ui';
import { AppText as Text } from '../components/AppText';
import { LoginIcon, PasswordIcon } from '../components/BrandAssets';
import { useAuth } from '../lib/auth';
import { colors } from '../theme';

export default function LoginScreen() {
  const { login, logout, privacyNoticeError } = useAuth();
  const { height } = useWindowDimensions();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    if (!username.trim() || !password) {
      setError('Preencha o login e a senha para continuar.');
      return;
    }
    setLoading(true);
    try {
      const { session, needsPrivacyConsent } = await login(username, password);
      const role = Number(session.user.nivel_acesso);
      const isAdmin = Boolean(session.user.is_staff || session.user.is_superuser || [1, 2, 4].includes(role) || session.user.nivel_acesso === 'admin');
      if (!isAdmin && role !== 3) {
        await logout();
        setError('Este perfil não tem acesso ao aplicativo.');
        return;
      }
      if (needsPrivacyConsent) router.replace('/privacy-consent');
      else if (session.user.force_password_change) router.replace('/(admin)/senha');
      else if (isAdmin) router.replace('/(admin)/(tabs)');
      else router.replace('/agendamento');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar. Confira seus dados.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BrandHeader title="Sistema de Gerenciamento de Motoristas" />
      <ScrollView contentContainerStyle={[styles.loginBody, { paddingTop: Math.max(24, height * 0.107) }]} keyboardShouldPersistTaps="handled">
        <View style={styles.loginCard}>
          <Text accessibilityRole="header" style={styles.loginTitle}>Login</Text>
          {error || privacyNoticeError ? <Notice message={error || privacyNoticeError} /> : null}
          <Field label="Login" labelStyle={styles.loginFieldLabel} inputStyle={styles.loginFieldInput} icon={LoginIcon} value={username} onChangeText={setUsername} placeholder="Digite seu login" autoCapitalize="none" returnKeyType="next" />
          <Field label="Senha" labelStyle={styles.loginFieldLabel} inputStyle={styles.loginFieldInput} icon={PasswordIcon} value={password} onChangeText={setPassword} placeholder="Digite sua senha" secureTextEntry returnKeyType="done" onSubmitEditing={submit} />
          <View style={styles.forgotRow}><Link href="/forgot-password" style={styles.forgotLink}>Esqueceu sua senha?</Link></View>
          <ActionButton title="Entrar" onPress={submit} loading={loading} />
        </View>
        <Text style={styles.loginFooter}>
          Não possui uma conta? Entre em contato com:{'\n'}
          <Text style={styles.loginFooterStrong}>Suporte CTI – (82) 3215–5133</Text>{'\n\n'}
          © 2026 CESMAC – Todos os direitos reservados
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  loginBody: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'flex-start' as const, backgroundColor: colors.paper },
  loginCard: { width: '100%' as const, maxWidth: 300, alignSelf: 'center' as const, marginTop: 32, marginBottom: 28, padding: 20, gap: 16, borderRadius: 8, backgroundColor: colors.card, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  loginTitle: { color: colors.brand, fontSize: 19, fontWeight: '700' as const, marginBottom: 2 },
  loginFieldLabel: { fontSize: 12 },
  loginFieldInput: { fontSize: 12 },
  forgotRow: { alignItems: 'flex-end' as const, minHeight: 30, justifyContent: 'center' as const },
  forgotLink: { color: colors.brand, fontSize: 13, fontWeight: '700' as const },
  loginFooter: { marginTop: 'auto' as const, paddingTop: 24, paddingBottom: 22, textAlign: 'center' as const, color: colors.brand, fontSize: 12, lineHeight: 19 },
  loginFooterStrong: { color: colors.brand, fontWeight: '700' as const },
};