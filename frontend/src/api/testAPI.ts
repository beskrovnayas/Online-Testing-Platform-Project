import axios from 'axios';
import USE_MOCK from '../config';
import { getAccessToken, refreshAccessToken, logout } from './auth';

const API_BASE_URL = 'http://localhost:8000/api';

// #region Интерфейсы
export interface Test {
  id: number;
  title: string;
  description: string;
  duration: number;
  // difficulty/category/succes: бэкенд их не отдаёт, остаются только для моков и вёрстки
  difficulty?: 'easy' | 'medium' | 'hard' | 'Лёгкий' | 'Средний' | 'Сложный' ;
  category?: string;
  questionCount?: number;
  succes?: number;
}

interface BackendTest {
  id: number;
  title: string;
  description: string;
  time_limit: number;
  questions_count?: number;
  author_username?: string;
}

export interface FullTest extends Test {
  questions: Question[];
}

export interface Question {
  id: number;
  text: string;
  options: Option[];
}

interface BackendQuestion {
  id: number;
  text: string;
  question_type: string;
  order: number;
  options: Option[];
}

export interface Option {
  id: number;
  text: string;
}

export interface SubmitAnswer {
  questionId: number;
  optionId: number;
}

export interface TestResult {
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
}

interface TestResultResponse {
  correctAnswers?: number;
  correct_answers?: number;
  totalQuestions?: number;
  total_questions?: number;
  percentage?: number;
  percent?: number;
}
// #endregion

// функции для API
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        logout();
      }
    }
    return Promise.reject(error);
  }
);

const normalizeTestResult = (result: TestResultResponse): TestResult => ({
  correctAnswers: result.correctAnswers ?? result.correct_answers ?? 0,
  totalQuestions: result.totalQuestions ?? result.total_questions ?? 0,
  percentage: result.percentage ?? result.percent ?? 0,
});

const normalizeTest = (test: BackendTest): Test => ({
  id: test.id,
  title: test.title,
  description: test.description,
  duration: test.time_limit,
  questionCount: test.questions_count,
});

export const getTests = async (): Promise<Test[]> => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 1800));
    return mockTests;
  }

  const response = await api.get<BackendTest[]>('/tests/');
  return response.data.map(normalizeTest);
};

export const getTestById = async (id: number): Promise<FullTest> => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 1600));

    const baseTest = mockTests.find(t => t.id === id) || mockTests[0];

    return {
      ...baseTest,
      questions: [
        {
          id: 101,
          text: "вопрос 1",
          options: [
            { id: 1, text: "ответ 1" },
            { id: 2, text: "ответ 2" },
            { id: 3, text: "ответ 3" },
            { id: 4, text: "ответ 4" },
          ]
        },
        {
          id: 102,
          text: "вопрос 2",
          options: [
            { id: 5, text: "ответ 1" },
            { id: 6, text: "ответ 2" },
            { id: 7, text: "ответ 3" },
          ]
        }
      ]
    };
  }

  const response = await api.get<BackendTest & { questions: BackendQuestion[] }>(`/tests/${id}/`);
  return {
    ...normalizeTest(response.data),
    questions: response.data.questions.map(({ id, text, options }) => ({ id, text, options })),
  };
};

export const submitTestAnswers = async (
  testId: number,
  answers: SubmitAnswer[],
): Promise<TestResult> => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const correctOptionsByQuestion: Record<number, number> = {
      101: 2,
      102: 6,
    };

    const correctAnswers = answers.reduce((score, answer) => {
      return correctOptionsByQuestion[answer.questionId] === answer.optionId
        ? score + 1
        : score;
    }, 0);

    const totalQuestions = Object.keys(correctOptionsByQuestion).length;

    return {
      correctAnswers,
      totalQuestions,
      percentage: Math.round((correctAnswers / totalQuestions) * 100),
    };
  }

  const answersDict: Record<number, number> = {};
  answers.forEach((answer) => {
    answersDict[answer.questionId] = answer.optionId;
  });

  const response = await api.post('/submit-answers/', {
    test_id: testId,
    answers: answersDict,
  });

  return normalizeTestResult(response.data);
};

// mock для тестирования списков прохождений
//#region 
export interface TestAttemptItem {
  id: number;
  testId: number;
  testTitle: string;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
}

const mockAttempts: TestAttemptItem[] = [
  {
    id: 1,
    testId: 1,
    testTitle: "Тест по Python",
    startedAt: "2026-10-08T14:30:00Z",
    finishedAt: "2026-10-08T14:45:00Z",
    score: 80,
  },
  {
    id: 2,
    testId: 1,
    testTitle: "Тест по Python",
    startedAt: "2026-10-07T10:00:00Z",
    finishedAt: "2026-10-07T10:18:00Z",
    score: 50,
  },
  {
    id: 3,
    testId: 2,
    testTitle: "Тест по Django",
    startedAt: "2026-10-05T18:20:00Z",
    finishedAt: "2026-10-05T18:40:00Z",
    score: 100,
  },
  {
    id: 4,
    testId: 3,
    testTitle: "Основы алгоритмов",
    startedAt: "2026-10-04T09:15:00Z",
    finishedAt: "2026-10-04T09:40:00Z",
    score: 65,
  },
  {
    id: 5,
    testId: 1,
    testTitle: "Тест по Python",
    startedAt: "2026-10-03T16:00:00Z",
    finishedAt: "2026-10-03T16:12:00Z",
    score: 90,
  },
  {
    id: 6,
    testId: 4,
    testTitle: "SQL и базы данных",
    startedAt: "2026-10-02T11:30:00Z",
    finishedAt: "2026-10-02T12:05:00Z",
    score: 40,
  },
  {
    id: 7,
    testId: 2,
    testTitle: "Тест по Django",
    startedAt: "2026-10-01T20:10:00Z",
    finishedAt: null,
    score: null,
  },
  {
    id: 8,
    testId: 5,
    testTitle: "Git для начинающих",
    startedAt: "2026-09-28T13:00:00Z",
    finishedAt: "2026-09-28T13:25:00Z",
    score: 75,
  },
];
//#endregion

export const getMyAttempts = async (): Promise<TestAttemptItem[]> => {
  const response = await api.get('/attempts/');

  const rows = Array.isArray(response.data)
    ? response.data
    : response.data?.results ?? [];

  return rows
    .map((item: any) => ({
      id: item.id,
      testId: item.test?.id ?? item.test_id,
      testTitle: item.test?.title ?? item.test_title ?? 'Тест',
      startedAt: item.started_at,
      finishedAt: item.finished_at,
      score: item.score ?? item.percentage ?? null,
    })).filter((a: TestAttemptItem) => a.finishedAt !== null);
};
