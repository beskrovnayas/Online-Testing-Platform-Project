import axios from 'axios';
import { http } from './http';

export type QuestionKind = 'single' | 'multiple';

export interface DraftOption {
  key: string;
  text: string;
  correct: boolean;
}

export interface DraftQuestion {
  key: string;
  text: string;
  kind: QuestionKind;
  options: DraftOption[];
}

export interface DraftTest {
  title: string;
  description: string;
  timeLimit: number;
  questions: DraftQuestion[];
}

export interface DraftErrors {
  title?: string;
  timeLimit?: string;
  general?: string;
  questions: Record<string, string>; // по ключу вопроса
}

// пределы из моделей бэкенда брались
export const TITLE_MAX = 200;
export const OPTION_MAX = 300;
export const TIME_MAX = 600;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;

let sequence = 0;
const nextKey = () => String(++sequence);

export const newOption = (): DraftOption => ({ key: nextKey(), text: '', correct: false });

export const newQuestion = (): DraftQuestion => ({
  key: nextKey(),
  text: '',
  kind: 'single',
  options: [newOption(), newOption()],
});

function questionProblem(q: DraftQuestion): string | null {
  if (!q.text.trim()) return 'Введите текст вопроса';
  if (q.options.length < MIN_OPTIONS) return `Нужно хотя бы ${MIN_OPTIONS} варианта ответа`;
  const texts = q.options.map((o) => o.text.trim());
  if (texts.some((t) => !t)) return 'Заполните все варианты ответа или удалите пустые';
  if (texts.some((t) => t.length > OPTION_MAX)) return `Вариант ответа не длиннее ${OPTION_MAX} символов`;
  if (new Set(texts.map((t) => t.toLowerCase())).size !== texts.length) return 'Варианты ответа не должны повторяться';
  const correct = q.options.filter((o) => o.correct).length;
  if (correct === 0) return 'Отметьте правильный ответ';
  if (q.kind === 'single' && correct !== 1) return 'У вопроса с одним ответом должен быть ровно один правильный вариант';
  return null;
}

export function validateDraft(d: DraftTest): DraftErrors {
  const errors: DraftErrors = { questions: {} };
  const title = d.title.trim();
  if (!title) errors.title = 'Введите название теста';
  else if (title.length > TITLE_MAX) errors.title = `Не длиннее ${TITLE_MAX} символов`;
  if (!Number.isInteger(d.timeLimit) || d.timeLimit < 1 || d.timeLimit > TIME_MAX) {
    errors.timeLimit = `Укажите целое число минут от 1 до ${TIME_MAX}`;
  }
  if (d.questions.length === 0) errors.general = 'Добавьте хотя бы один вопрос';
  for (const q of d.questions) {
    const problem = questionProblem(q);
    if (problem) errors.questions[q.key] = problem;
  }
  return errors;
}

export const hasErrors = (e: DraftErrors) =>
  Boolean(e.title || e.timeLimit || e.general || Object.keys(e.questions).length > 0);

export class BuilderError extends Error {
  rolledBack: boolean;
  testId: number | null;
  detail: string | null;

  constructor(rolledBack: boolean, testId: number | null, detail: string | null) {
    super('Не удалось создать тест');
    this.name = 'BuilderError';
    this.rolledBack = rolledBack;
    this.testId = testId;
    this.detail = detail;
  }
}

// Первое сообщение из ответа DRF вида {"title": ["Обязательное поле."]} или {"detail": "..."}
function serverDetail(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  const data: unknown = error.response?.data;
  if (typeof data === 'string') return null;
  if (data && typeof data === 'object') {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    }
  }
  return null;
}

// создаем тест цепочкой запросов: тест -> вопросы -> варианты
// запросы идут по очереди: порядок вариантов хранится по id, а параллельные записи в SQLite конфликтуют
// если вдргу что-то упало -- созданный тест удаляется (вопросы и варианты уходят каскадом)
// когда на бэкенде появится один эндпоинт "создать тест целиком", заменить нужно только тут!!!
export async function createFullTest(
  d: DraftTest,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const total = 1 + d.questions.length + d.questions.reduce((n, q) => n + q.options.length, 0);
  let done = 0;
  const tick = () => onProgress?.(++done, total);
  let testId: number | null = null;

  try {
    const { data: test } = await http.post<{ id: number }>('/new_tests/', {
      title: d.title.trim(),
      description: d.description.trim(),
      time_limit: d.timeLimit,
    });
    testId = test.id;
    tick();

    for (const [index, q] of d.questions.entries()) {
      // order должен быть уникальным в пределах теста (ограничение по unique_order_per_test)
      const { data: question } = await http.post<{ id: number }>('/questions/', {
        test: test.id,
        text: q.text.trim(),
        question_type: q.kind,
        order: index + 1,
      });
      tick();
      for (const option of q.options) {
        await http.post('/answer-options/', {
          question: question.id,
          text: option.text.trim(),
          is_correct: option.correct,
        });
        tick();
      }
    }
    return test.id;
  } catch (error) {
    let rolledBack = testId === null; // если сам тест не создался, откатывать так-то нечего
    if (testId !== null) {
      try {
        await http.delete(`/new_tests/${testId}/`);
        rolledBack = true;
      } catch {
        rolledBack = false;
      }
    }
    throw new BuilderError(rolledBack, testId, serverDetail(error));
  }
}

export function describeBuilderError(error: unknown): string {
  if (!(error instanceof BuilderError)) return 'Не удалось сохранить тест. Попробуйте снова';
  const base = error.rolledBack
    ? 'Не удалось сохранить тест: ничего не создано. Попробуйте снова.'
    : 'Не удалось сохранить тест полностью. Черновик остался в «Управлении тестами»: удалите его и попробуйте снова.';
  return error.detail ? `${base} Сервер ответил: ${error.detail}` : base;
}