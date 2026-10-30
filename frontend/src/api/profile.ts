import { getAccessToken } from './auth';
import { getUserType, http, type UserType } from './http';

export interface Profile {
  id: number | null;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
}

// поля, которые пользователь может менять (роль нельзя. пока что?)
export type ProfileUpdate = Pick<Profile, 'username' | 'email' | 'firstName' | 'lastName'>;
export type ProfileErrors = Partial<Record<keyof ProfileUpdate, string>>;

// чтение профиля -- с сервера (GET /users/me/), а PATCH на бэкенде пока что нет
export const PROFILE_READ_IS_MOCK = false;
export const PROFILE_SAVE_IS_MOCK = true; // когда появится эндпоинт -- поставим false

export const PROFILE_NOTICE: string | null = PROFILE_SAVE_IS_MOCK
  ? 'Профиль загружается с сервера, но сохранение правок пока работает только в этом браузере.'
  : null;

const MOCK_BY_ROLE: Record<UserType, ProfileUpdate> = {
  student: { username: 'student', email: 'student@example.com', firstName: 'Анна', lastName: 'Смирнова' },
  teacher: { username: 'teacher', email: 'teacher@example.com', firstName: 'Пётр', lastName: 'Иванов' },
  admin: { username: 'admin', email: 'admin@example.com', firstName: 'Мария', lastName: 'Петрова' },
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function tokenUserId(): number | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.user_id === 'number' ? payload.user_id : null;
  } catch {
    return null;
  }
}

// правки сохраняются отдельно для каждого пользователя, чтобы переживать перезагрузку страницы
const mockKey = () => `mock-profile:${tokenUserId() ?? 'anon'}`;

function readMock(): ProfileUpdate | null {
  try {
    const saved = JSON.parse(localStorage.getItem(mockKey()) ?? 'null');
    const keys: (keyof ProfileUpdate)[] = ['username', 'email', 'firstName', 'lastName'];
    return saved && keys.every((key) => typeof saved[key] === 'string') ? saved : null;
  } catch {
    return null;
  }
}

function writeMock(update: ProfileUpdate) {
  try {
    localStorage.setItem(mockKey(), JSON.stringify(update));
  } catch {
    // хранилище недоступно: правка просто не переживёт перезагрузку
  }
}

// типа контракт для будущего эндпоинта
interface ProfileResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: UserType;
}

const fromApi = (d: ProfileResponse): Profile => ({
  id: d.id,
  username: d.username,
  email: d.email,
  firstName: d.first_name,
  lastName: d.last_name,
  userType: d.user_type,
});

export async function getProfile(): Promise<Profile> {
  if (PROFILE_READ_IS_MOCK) {
    const role = getUserType();
    if (!role) throw new Error('Пользователь не вошёл');
    await delay(300);
    return { id: tokenUserId(), userType: role, ...(readMock() ?? MOCK_BY_ROLE[role] ?? MOCK_BY_ROLE.student) };
  }
  const { data } = await http.get<ProfileResponse>('/users/me/');
  const profile = fromApi(data);
  const edited = PROFILE_SAVE_IS_MOCK ? readMock() : null;
  return edited ? { ...profile, ...edited } : profile;
}
// ↑ теперь локальные правки накладываются на данные с сервера и переживают перезагрузку!!!

export async function updateProfile(update: ProfileUpdate): Promise<Profile> {
  const clean: ProfileUpdate = {
    username: update.username.trim(),
    email: update.email.trim(),
    firstName: update.firstName.trim(),
    lastName: update.lastName.trim(),
  };
  if (PROFILE_SAVE_IS_MOCK) {
    const role = getUserType();
    if (!role) throw new Error('Пользователь не вошёл');
    await delay(300);
    writeMock(clean);
    return { id: tokenUserId(), userType: role, ...clean };
  }
  const { data } = await http.patch<ProfileResponse>('/users/me/', {
    username: clean.username,
    email: clean.email,
    first_name: clean.firstName,
    last_name: clean.lastName,
  });
  return fromApi(data);
}

export function validateProfile(v: ProfileUpdate): ProfileErrors {
  const errors: ProfileErrors = {};
  const username = v.username.trim();
  if (!username) errors.username = 'Введите логин';
  else if (username.length > 150) errors.username = 'Не длиннее 150 символов';
  else if (!/^[\p{L}\p{N}_.@+-]+$/u.test(username)) errors.username = 'Только буквы, цифры и символы @ . + - _';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) errors.email = 'Введите корректную почту';
  if (v.firstName.trim().length > 150) errors.firstName = 'Не длиннее 150 символов';
  if (v.lastName.trim().length > 150) errors.lastName = 'Не длиннее 150 символов';
  return errors;
}

export const displayName = (p: Pick<Profile, 'firstName' | 'lastName' | 'username'>) =>
  `${p.firstName} ${p.lastName}`.trim() || p.username;

export function initialsOf(p: Pick<Profile, 'firstName' | 'lastName' | 'username'>): string {
  const first = p.firstName.trim().charAt(0);
  const last = p.lastName.trim().charAt(0);
  return (first && last ? first + last : first || p.username.trim().charAt(0) || '?').toUpperCase();
}
