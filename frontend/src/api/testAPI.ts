import axios from 'axios';
import USE_MOCK from '../config';

const API_BASE_URL = 'http://localhost:8000/api';

// #region Интерфейсы
export interface Test {
  id: number;
  title: string;
  description: string;
  duration: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'Лёгкий' | 'Средний' | 'Сложный' ;
  category?: string;
  questionCount?: number;
  succes?: number;
}

export interface FullTest extends Test {
  questions: Question[];
}

export interface Question {
  id: number;
  text: string;
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

// При подружайстве бэка и фронта -- убрать
//#region MOCKи
const mockTests: Test[] = [
  {
    id: 1,
    title: "тест 1",
    description: "описание теста 1",
    duration: 2,
    difficulty: "easy",
    category: "Химия",
    questionCount: 2,
    succes: 100,
  },
  {
    id: 2,
    title: "тест 2",
    description: "описание теста 2",
    duration: 4,
    difficulty: "medium",
    category: "Программирование",
    questionCount: 4,
    succes: 70,
  },
  {
    id: 3,
    title: "тест 3",
    description: "описание теста 3",
    duration: 8,
    difficulty: "hard",
    category: "История",
    questionCount: 8,
    succes: 50,
  },
  {
    id: 4,
    title: "тест 4",
    description: "описание теста 4",
    duration: 16,
    difficulty: "easy",
    category: "Программирование",
    questionCount: 16,
    succes: 60,
  },
  {
    id: 5,
    title: "тест 5",
    description: "описание теста 5",
    duration: 32,
    difficulty: "medium",
    category: "История",
    questionCount: 32,
    succes: 78,
  },
  {
    id: 6,
    title: "тест 6",
    description: "описание теста 6",
    duration: 64,
    difficulty: "hard",
    category: "Программирование",
    questionCount: 64,
    succes: 60,
  },
]
//#endregion



// функции для API
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const normalizeTestResult = (result: TestResultResponse): TestResult => ({
  correctAnswers: result.correctAnswers ?? result.correct_answers ?? 0,
  totalQuestions: result.totalQuestions ?? result.total_questions ?? 0,
  percentage: result.percentage ?? result.percent ?? 0,
});

export const getTests = async (): Promise<Test[]> => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 1800));
    return mockTests;
  }

  const response = await api.get('/tests/');
  return response.data;
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

  const response = await api.get(`/tests/${id}/`);
  return response.data;
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

  const response = await api.post(`/tests/${testId}/submit/`, {
    answers: answers.map((answer) => ({
      question_id: answer.questionId,
      option_id: answer.optionId,
    })),
  });

  return normalizeTestResult(response.data);
};
