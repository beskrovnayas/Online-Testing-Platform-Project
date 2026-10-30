import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export interface LoginCredentials {
  username: string;
  password: string;
}

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};

export const logout = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const login = async ({ username, password }: LoginCredentials): Promise<void> => {
  const response = await axios.post(`${API_BASE_URL}/token/`, { username, password });
  setTokens(response.data.access, response.data.refresh);
};

export const refreshAccessToken = async (): Promise<string> => {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error('Нет refresh-токена');
  }
  const response = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh });
  localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access);
  return response.data.access;
};

export const isAuthenticated = () => Boolean(getAccessToken());
