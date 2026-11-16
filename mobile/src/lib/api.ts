import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://projeto-e-l-i-a-s.onrender.com/api/auth').replace(/\/+$/, '');
const TOKEN_KEY = 'elias.access-token';
const USER_KEY = 'elias.user';

async function getStoredItem(key: string) {
  if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function setStoredItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredItem(key: string) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export interface SessionUser {
  id?: number;
  id_usuario?: number;
  login?: string;
  nome: string;
  email?: string;
  nivel_acesso?: string | number;
  is_staff?: boolean;
  is_superuser?: boolean;
  force_password_change?: boolean;
}

export interface Session {
  token: string;
  user: SessionUser;
}

export interface PrivacyNotice {
  version: string;
  accepted: boolean;
  title: string;
  controller: string;
  purposes: string[];
  data_categories: string[];
  storage: string;
  retention: string;
  account_deletion: string;
  support: string;
}

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type AuthenticatedDownload =
  | { platform: 'web'; blob: Blob }
  | { platform: 'native'; uri: string };

export async function downloadAuthenticatedFile(path: string, filename: string): Promise<AuthenticatedDownload> {
  const token = await getStoredItem(TOKEN_KEY);
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(body.error || body.detail || body.message || 'Não foi possível gerar o arquivo Excel.', response.status);
    }
    return { platform: 'web', blob: await response.blob() };
  }

  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new ApiError('O armazenamento temporário não está disponível neste dispositivo.');
  const result = await FileSystem.downloadAsync(url, `${directory}${filename}`, { headers });
  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new ApiError(`Não foi possível gerar o arquivo Excel (HTTP ${result.status}).`, result.status);
  }
  return { platform: 'native', uri: result.uri };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body.error || body.detail || body.message || 'Não foi possível concluir a solicitação.', response.status);
  }
  return body as T;
}

export async function signIn(login: string, password: string, fcmToken?: string | null): Promise<Session> {
  const data = await request<Record<string, any>>('/login/', {
    method: 'POST',
    body: JSON.stringify({
      login: login.trim(),
      password,
      ...(fcmToken ? { fcm_token: fcmToken } : {}),
    }),
  });
  const token = data.access_token || data.token;
  const rawUser = data.user || {
    id_usuario: data.user_id,
    login: data.login,
    nome: data.nome,
    email: data.email,
    nivel_acesso: data.nivel_acesso,
  };
  if (!token || !rawUser) throw new ApiError('Resposta de autenticação inválida.');

  const user: SessionUser = { ...rawUser, id: rawUser.id || rawUser.id_usuario };
  const session = { token: String(token), user };
  await saveSession(session);
  return session;
}

export async function saveSession(session: Session) {
  await Promise.all([
    setStoredItem(TOKEN_KEY, session.token),
    setStoredItem(USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function restoreSession(): Promise<Session | null> {
  const [token, storedUser] = await Promise.all([
    getStoredItem(TOKEN_KEY),
    getStoredItem(USER_KEY),
  ]);
  if (!token || !storedUser) return null;
  try {
    return { token, user: JSON.parse(storedUser) as SessionUser };
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await Promise.all([
    deleteStoredItem(TOKEN_KEY),
    deleteStoredItem(USER_KEY),
  ]);
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T,>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T,>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T,>(path: string, body: unknown) => request<T>(path, { method: 'DELETE', body: JSON.stringify(body) }),
};

export function unwrapList<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}