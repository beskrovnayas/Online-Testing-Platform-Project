export type SelectedAnswers = Record<number, number | number[]>;

export interface AnswerDetail {
  questionId: number;
  questionText: string;
  selectedTexts: string[];
  correctTexts: string[];
  isCorrect: boolean | null;
  error?: string;
}

export interface AttemptResult {
  attemptId?: number;
  testId?: number;
  testTitle?: string;
  correctAnswers?: number;
  totalQuestions?: number;
  percentage: number;
  startedAt?: string;
  finishedAt?: string;
  details: AnswerDetail[];
}

export type FailureKind = 'auth' | 'unavailable' | 'expired' | 'network' | 'validation' | 'unsupported';

export class PassingError extends Error {
  kind: FailureKind;

  constructor(kind: FailureKind, message: string) {
    super(message);
    this.name = 'PassingError';
    this.kind = kind;
  }
}

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const number = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const string = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function normalizeResult(value: unknown): AttemptResult {
  const data = record(value);
  const correctAnswers = number(data.correct_answers ?? data.correctAnswers);
  const totalQuestions = number(data.total_questions ?? data.totalQuestions);
  const percentage = number(data.percentage ?? data.percent ?? data.score);
  if (percentage === undefined || percentage < 0 || percentage > 100) {
    throw new PassingError('validation', 'Сервер вернул некорректный результат теста.');
  }
  return {
    attemptId: number(data.attempt_id ?? data.id),
    testId: number(data.test_id),
    testTitle: string(data.test_title),
    correctAnswers,
    totalQuestions,
    percentage,
    startedAt: string(data.started_at),
    finishedAt: string(data.finished_at),
    details: (Array.isArray(data.details) ? data.details : []).map((item) => {
      const detail = record(item);
      return {
        questionId: number(detail.question_id) ?? 0,
        questionText: string(detail.question_text) ?? 'Вопрос',
        selectedTexts: detail.selected_option_text != null
          ? [String(detail.selected_option_text)] : strings(detail.selected_option_texts),
        correctTexts: detail.correct_option_text != null
          ? [String(detail.correct_option_text)] : strings(detail.correct_option_texts),
        isCorrect: typeof detail.is_correct === 'boolean' ? detail.is_correct : null,
        error: string(detail.error),
      };
    }),
  };
}

export function buildAnswersPayload(testId: number, answers: SelectedAnswers, attemptId?: number) {
  if (!Number.isSafeInteger(testId) || testId <= 0) {
    throw new PassingError('validation', 'Некорректный номер теста.');
  }
  if (attemptId !== undefined && (!Number.isSafeInteger(attemptId) || attemptId <= 0)) {
    throw new PassingError('validation', 'Некорректный номер попытки.');
  }
  const values: SelectedAnswers = {};
  for (const [questionId, selected] of Object.entries(answers)) {
    if (!Number.isSafeInteger(Number(questionId)) || Number(questionId) <= 0) {
      throw new PassingError('validation', 'Некорректный номер вопроса.');
    }
    const options = Array.isArray(selected) ? [...new Set(selected)] : [selected];
    if (options.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      throw new PassingError('validation', 'Некорректный вариант ответа.');
    }
    if (options.length === 0) continue;
    values[Number(questionId)] = Array.isArray(selected) ? options : selected;
  }
  return {
    test_id: testId,
    answers: values,
    ...(attemptId === undefined ? {} : { attempt_id: attemptId }),
  };
}

export function classifyFailure(status?: number, body?: unknown): PassingError {
  const data = record(body);
  const code = data.code;
  if (status === 401) return new PassingError('auth', 'Войдите в аккаунт, чтобы продолжить.');
  if (code === 'time_expired' || code === 'attempt_expired' || status === 408) {
    return new PassingError('expired', 'Время прохождения теста истекло.');
  }
  if (status === 403 || status === 404 || status === 410 || code === 'test_unavailable') {
    return new PassingError('unavailable', 'Тест или попытка недоступны. Возможно, тест скрыт или у вас нет доступа.');
  }
  if (status === 400 || status === 422) {
    return new PassingError('validation', 'Сервер не принял ответы. Проверьте выбранные варианты и попробуйте снова.');
  }
  return new PassingError('network', 'Не удалось получить ответ сервера. Проверьте соединение и попробуйте снова.');
}

export function remainingMilliseconds(expiresAt: number, now = Date.now()) {
  return Math.max(0, expiresAt - now);
}

export function serverDeadline(expiresAt: string, serverNow?: string, now = Date.now()) {
  const deadline = Date.parse(expiresAt);
  const serverTime = serverNow === undefined ? now : Date.parse(serverNow);
  if (!Number.isFinite(deadline) || !Number.isFinite(serverTime)) {
    throw new PassingError('validation', 'Сервер вернул некорректное время завершения теста.');
  }
  return now + (deadline - serverTime);
}
