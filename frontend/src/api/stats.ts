import { http } from './http';

export interface AttemptStats {
  attemptsTotal: number;
  testsAttempted: number;
  averageScore: number;
  bestScore: number;
}

export interface AttemptHistoryItem {
  id: number;
  testId: number;
  testTitle: string;
  score: number;
  startedAt: string;
  finishedAt: string | null;
}

interface StatsResponse {
  attempts_total: number;
  tests_attempted: number;
  average_score: number;
  best_score: number;
}

interface HistoryResponse {
  id: number;
  test_id: number;
  test_title: string;
  score: number;
  started_at: string;
  finished_at: string | null;
}

export async function getAttemptStats(): Promise<AttemptStats> {
  const { data } = await http.get<StatsResponse>('/attempts/stats/');
  return {
    attemptsTotal: data.attempts_total,
    testsAttempted: data.tests_attempted,
    averageScore: data.average_score,
    bestScore: data.best_score,
  };
}

export async function getAttemptHistory(): Promise<AttemptHistoryItem[]> {
  const { data } = await http.get<HistoryResponse[]>('/attempts/');
  return data.map((item) => ({
    id: item.id,
    testId: item.test_id,
    testTitle: item.test_title,
    score: item.score,
    startedAt: item.started_at,
    finishedAt: item.finished_at,
  }));
}