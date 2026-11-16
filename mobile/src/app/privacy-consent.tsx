import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActionButton, LoadingState, Notice, Page, PageHeading, TopBar, ui } from '../components/ui';
import { AppText as Text } from '../components/AppText';
import { useAuth } from '../lib/auth';
import type { SessionUser } from '../lib/api';
import { colors } from '../theme';

export default function PrivacyConsentScreen() {
  const {
    user,
    isAdmin,
    isLoading,
    needsPrivacyConsent,
    privacyNotice,
    privacyNoticeError,
    notificationSyncWarning,
    refreshPrivacyNotice,
    acceptPrivacyConsent,
    logout,
  } = useAuth();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentUser = user;

  useEffect(() => {
    if (user && !privacyNotice && !privacyNoticeError) void refreshPrivacyNotice().catch(() => undefined);
  }, [user, privacyNotice, privacyNoticeError, refreshPrivacyNotice]);

  if (isLoading) return <Page><LoadingState /></Page>;
  if (!currentUser) return <Redirect href="/login" />;

  async function continueToApp(currentUser: SessionUser) {
    if (!privacyNotice || !checked) return;
    setSaving(true);
    setError('');
    try {
      if (needsPrivacyConsent) await acceptPrivacyConsent();
      if (currentUser.force_password_change) router.replace('/(admin)/senha');
      else if (isAdmin) router.replace('/(admin)/(tabs)');
      else if (Number(currentUser.nivel_acesso) === 3) router.replace('/agendamento');
      else router.replace('/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível registrar seu aceite.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Privacidade e dados" showSettings={false} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 18, gap: 16 }}>
        <PageHeading title={privacyNotice?.title || 'Aviso de privacidade'} subtitle="Leia como os dados são usados antes de continuar." />
        {privacyNoticeError ? <Notice message={privacyNoticeError} onRetry={() => void refreshPrivacyNotice().catch(() => undefined)} /> : null}
        {notificationSyncWarning ? <Notice type="info" message={notificationSyncWarning} /> : null}
        {error ? <Notice message={error} /> : null}
        {!privacyNotice && !privacyNoticeError ? <LoadingState label="Carregando o aviso..." /> : null}
        {privacyNotice ? <>
          <View style={ui.card}>
            <Text style={ui.cardTitle}>Responsável pelo tratamento</Text>
            <Text style={ui.body}>{privacyNotice.controller}</Text>
          </View>
          <View style={ui.card}>
            <Text style={ui.cardTitle}>Para que usamos seus dados</Text>
            {privacyNotice.purposes.map(item => <Text key={item} style={ui.body}>• {item}</Text>)}
          </View>
          <View style={ui.card}>
            <Text style={ui.cardTitle}>Dados tratados</Text>
            {privacyNotice.data_categories.map(item => <Text key={item} style={ui.body}>• {item}</Text>)}
          </View>
          <View style={ui.card}>
            <Text style={ui.cardTitle}>Onde ficam armazenados</Text>
            <Text style={ui.body}>{privacyNotice.storage}</Text>
          </View>
          <View style={ui.card}>
            <Text style={ui.cardTitle}>Retenção e exclusão</Text>
            <Text style={ui.body}>{privacyNotice.retention}</Text>
            <Text style={ui.body}>{privacyNotice.account_deletion}</Text>
          </View>
          <View style={ui.card}>
            <Text style={ui.cardTitle}>Dúvidas</Text>
            <Text style={ui.body}>{privacyNotice.support}</Text>
          </View>
          {needsPrivacyConsent ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() => setChecked(value => !value)}
              style={[ui.card, ui.row, { minHeight: 54 }]}
            >
              <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={23} color={checked ? colors.brand : colors.muted} />
              <Text style={[ui.body, { flex: 1 }]}>Li e aceito o aviso de privacidade, versão {privacyNotice.version}.</Text>
            </Pressable>
          ) : <Notice type="success" message={`Seu aceite da versão ${privacyNotice.version} já está registrado.`} />}
          <ActionButton
            title={needsPrivacyConsent ? 'Aceitar e continuar' : 'Voltar ao aplicativo'}
            icon="checkmark"
            disabled={!checked && needsPrivacyConsent}
            loading={saving}
            onPress={() => { if (user) void continueToApp(user); }}
          />
        </> : null}
        <ActionButton
          title="Sair sem aceitar"
          variant="secondary"
          onPress={() => void logout().then(() => router.replace('/login'))}
        />
      </ScrollView>
    </View>
  );
}
