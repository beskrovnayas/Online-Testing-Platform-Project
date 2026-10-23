import { http } from './http';

export type QuestionType = 'single' | 'multiple' | 'text';

export interface ReviewOption {
  id: number;
  text: string;
}

export interface ReviewQuestion {
  id: number;
  text: string;
  type: QuestionType;
  options: ReviewOption[];
  selectedIds: number[];
  correctIds: number[];
  answered: boolean;
  // false, если бэкенд не отдал данные для разбора
  known: boolean;
}

export interface AttemptReview {
  attemptId: number;
  testTitle: string;
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  finishedAt: string | null;
  questions: ReviewQuestion[];
}

export type Verdict = 'correct' | 'partial' | 'wrong' | 'unanswered' | 'unknown';

// верно: выбраны ровно правильные. частично: среди выбранных есть правильные, но ответ не точный.
export function verdictOf(q: ReviewQuestion): Verdict {
  if (!q.answered) return 'unanswered';
  if (!q.known) return 'unknown';
  const selected = new Set(q.selectedIds);
  const correct = new Set(q.correctIds);
  const exact = selected.size === correct.size && [...selected].every((id) => correct.has(id));
  if (exact) return 'correct';
  return [...selected].some((id) => correct.has(id)) ? 'partial' : 'wrong';
}

interface DetailResponse {
  question_id: number;
  options?: ReviewOption[];
  answered?: boolean;
  // вопросы с одним и несколькими ответами
  selected_option_ids?: number[];
  correct_option_ids?: number[];
  // только один ответ
  selected_option_id?: number | null;
  correct_option_id?: number | null;
}

interface AttemptResponse {
  attempt_id: number;
  test_id: number;
  test_title: string;
  correct_answers: number;
  total_questions: number;
  percentage: number;
  finished_at: string | null;
  details: DetailResponse[];
}

interface TestResponse {
  questions: { id: number; text: string; question_type: QuestionType; options: ReviewOption[] }[];
}

export async function getAttemptReview(attemptId: number): Promise<AttemptReview> {
  const { data: attempt } = await http.get<AttemptResponse>(`/attempts/${attemptId}/`);
  const { data: test } = await http.get<TestResponse>(`/tests/${attempt.test_id}/`);
  const details = new Map(attempt.details.map((d) => [d.question_id, d]));

  const questions = test.questions.map((q): ReviewQuestion => {
    const d = details.get(q.id);
    const selectedIds =
      d?.selected_option_ids ?? (d?.selected_option_id != null ? [d.selected_option_id] : []);
    const correctIds =
      d?.correct_option_ids ?? (d?.correct_option_id != null ? [d.correct_option_id] : []);
    const known = q.question_type === 'multiple' ? d?.selected_option_ids !== undefined : d !== undefined;
    return {
      id: q.id,
      text: q.text,
      type: q.question_type,
      options: d?.options ?? q.options,
      selectedIds,
      correctIds,
      answered: d ? (d.answered ?? true) : false,
      known,
    };
  });

  return {
    attemptId: attempt.attempt_id,
    testTitle: attempt.test_title,
    correctAnswers: attempt.correct_answers,
    totalQuestions: attempt.total_questions,
    percentage: attempt.percentage,
    finishedAt: attempt.finished_at,
    questions,
  };
}