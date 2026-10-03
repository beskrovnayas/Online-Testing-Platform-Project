import axios from 'axios';
import { getAccessToken, refreshAccessToken, logout } from '../../api/auth';
import {
  PassingError, buildAnswersPayload, classifyFailure, normalizeResult, serverDeadline,
  type SelectedAnswers,
} from './protocol';

export interface PassingQuestion {
  id: number;
  text: string;
  questionType: 'single' | 'multiple' | 'text';
  options: { id: number; text: string }[];
}

export interface PassingTest {
  id: number;
  title: string;
  description: string;
  duration: number;
  questions: PassingQuestion[];
}

export interface AttemptTiming {
  attemptId?: number;
  expiresAt: number;
  source: 'server' | 'browser';
}

const client = axios.create({ baseURL: 'http://localhost:8000/api', timeout: 10000 });
let refreshing: Promise<string> | null = null;

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use((response) => response, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error;
  const config = error.config as typeof error.config & { _authRetry?: boolean };
  if (error.response?.status === 401 && config && !config._authRetry) {
    try {
      refreshing ??= refreshAccessToken().finally(() => { refreshing = null; });
      const token = await refreshing;
      config.headers.Authorization = `Bearer ${token}`;
      config._authRetry = true;
      return client(config);
    } catch (reason) {
      if (axios.isAxiosError(reason) && ![400, 401, 403].includes(reason.response?.status ?? 0)) {
        throw classifyFailure(reason.response?.status, reason.response?.data);
      }
      logout();
      throw classifyFailure(401);
    }
  }
  throw classifyFailure(error.response?.status, error.response?.data);
});

export async function getPassingTest(id: number): Promise<PassingTest> {
  const { data } = await client.get(`/tests/${id}/`);
  if (data.is_published === false) throw classifyFailure(403);
  if (!data || data.id !== id || typeof data.title !== 'string' || typeof data.description !== 'string'
    || !Array.isArray(data.questions) || data.questions.length === 0
    || !Number.isFinite(data.time_limit) || data.time_limit <= 0) {
    throw new PassingError('validation', 'Сервер вернул некорректные данные теста.');
  }
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    duration: data.time_limit,
    questions: data.questions.map((question: {
      id: number; text: string; question_type: string; options: { id: number; text: string }[];
    }) => {
      if (!question || !Number.isSafeInteger(question.id) || question.id <= 0 || typeof question.text !== 'string'
        || !['single', 'multiple', 'text'].includes(question.question_type) || !Array.isArray(question.options)
        || (question.question_type !== 'text' && question.options.length === 0)
        || question.options.some((option) => !option || !Number.isSafeInteger(option.id) || option.id <= 0 || typeof option.text !== 'string')) {
        throw new PassingError('validation', 'Сервер вернул неизвестный тип вопроса.');
      }
      return { id: question.id, text: question.text, questionType: question.question_type, options: question.options };
    }),
  };
}

export async function startAttempt(test: PassingTest): Promise<AttemptTiming> {
  const path = import.meta.env.VITE_TEST_START_PATH as string | undefined;
  if (!path) return { expiresAt: Date.now() + test.duration * 60000, source: 'browser' };
  const { data } = await client.post(path.replace('{id}', String(test.id)), {});
  if (!Number.isSafeInteger(data.attempt_id) || data.attempt_id <= 0 || typeof data.expires_at !== 'string') {
    throw new PassingError('validation', 'Сервер не вернул номер попытки и время её завершения.');
  }
  return {
    attemptId: data.attempt_id,
    expiresAt: serverDeadline(data.expires_at, data.server_now),
    source: 'server',
  };
}

export async function submitPassingAnswers(testId: number, answers: SelectedAnswers, attemptId?: number) {
  const { data } = await client.post('/submit-answers/', buildAnswersPayload(testId, answers, attemptId));
  return normalizeResult(data);
}

export async function getAttemptResult(attemptId: number) {
  const path = import.meta.env.VITE_ATTEMPT_DETAIL_PATH as string | undefined;
  if (!path) throw new PassingError('unsupported', 'Просмотр прошлых попыток пока недоступен.');
  const { data } = await client.get(path.replace('{id}', String(attemptId)));
  return normalizeResult(data);
}
