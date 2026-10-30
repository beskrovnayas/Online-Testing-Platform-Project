import { getAccessToken } from '../../api/auth';
import type { AttemptTiming, PassingTest } from './api';
import { normalizeResult, PassingError, type AttemptResult, type FailureKind, type SelectedAnswers } from './protocol';

export interface SavedAttempt {
  timing: AttemptTiming;
  answers: SelectedAnswers;
  closed: boolean;
  result?: AttemptResult;
  expired?: boolean;
  failure?: PassingError;
}

function storageKey(testId: number) {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const user = JSON.parse(atob(encoded));
    const id = user.user_id ?? user.sub;
    return id === undefined ? null : `test-passing:${String(id)}:${testId}`;
  } catch { return null; }
}

export function readAttempt(test: PassingTest): SavedAttempt | null {
  const key = storageKey(test.id);
  if (!key) return null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (!saved || !Number.isFinite(saved.timing?.expiresAt)
      || !['browser', 'server'].includes(saved.timing.source)
      || (saved.timing.source === 'server' && (!Number.isSafeInteger(saved.timing.attemptId) || saved.timing.attemptId <= 0))) return null;
    const answers: SelectedAnswers = {};
    for (const question of test.questions) {
      const value = saved.answers?.[question.id];
      const values = Array.isArray(value) ? value : [value];
      if (values.length && values.every((id) => question.options.some((option) => option.id === id))) {
        answers[question.id] = Array.isArray(value) ? [...new Set(value)] as number[] : value;
      }
    }
    let result: AttemptResult | undefined;
    if (saved.closed === true && saved.result) {
      try { result = normalizeResult(saved.result); } catch { result = undefined; }
    }
    const kinds: FailureKind[] = ['auth', 'unavailable', 'expired', 'network', 'validation', 'unsupported'];
    const failure = kinds.includes(saved.failure?.kind) && typeof saved.failure?.message === 'string'
      ? new PassingError(saved.failure.kind, saved.failure.message) : undefined;
    return { timing: saved.timing, answers, closed: saved.closed === true, result, expired: saved.expired === true, failure };
  } catch { return null; }
}

export function saveAttempt(testId: number, attempt: SavedAttempt) {
  const key = storageKey(testId);
  if (!key) return;
  const result = attempt.result;
  const snapshot = result ? {
    attempt_id: result.attemptId, test_id: result.testId, test_title: result.testTitle,
    correct_answers: result.correctAnswers, total_questions: result.totalQuestions, percentage: result.percentage,
    started_at: result.startedAt, finished_at: result.finishedAt,
    details: result.details.map((detail) => ({
      question_id: detail.questionId, question_text: detail.questionText,
      selected_option_texts: detail.selectedTexts, correct_option_texts: detail.correctTexts,
      is_correct: detail.isCorrect, error: detail.error,
    })),
  } : undefined;
  const failure = attempt.failure ? { kind: attempt.failure.kind, message: attempt.failure.message } : undefined;
  try { sessionStorage.setItem(key, JSON.stringify({ ...attempt, result: snapshot, failure })); } catch { return; }
}

export function clearAttempt(testId: number) {
  const key = storageKey(testId);
  if (!key) return;
  try { sessionStorage.removeItem(key); } catch { return; }
}
