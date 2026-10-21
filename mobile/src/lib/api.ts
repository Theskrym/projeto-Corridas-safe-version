import * as SecureStore from 'expo-secure-store';
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
}

export interface Session {
  token: string;
  user: SessionUser;
}

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
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
};

export function unwrapList<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}