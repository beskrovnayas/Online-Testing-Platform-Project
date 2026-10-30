import axios from 'axios';
import { getAccessToken, refreshAccessToken, logout } from './auth';

export const API_BASE_URL = 'http://localhost:8000/api';

export const http = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

let refreshing: Promise<string> | null = null;

// подстановка access-токена в каждый запрос
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// если 401 -- один раз пробуем обновить токен и повторить запрос
http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw error;
    const config = error.config as (typeof error.config & { _authRetry?: boolean }) | undefined;
    if (error.response?.status === 401 && config && !config._authRetry) {
      try {
        refreshing ??= refreshAccessToken().finally(() => {
          refreshing = null;
        });
        const token = await refreshing;
        config._authRetry = true;
        config.headers.Authorization = `Bearer ${token}`;
        return http(config);
      } catch {
        logout();
      }
    }
    throw error;
  },
);

export type UserType = 'student' | 'teacher' | 'admin';

export function getUserType(): UserType | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.user_type ?? null;
  } catch {
    return null;
  }
}