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
  attemptTimeSeconds?: number;
  timeComparison?: 'faster' | 'slower' | 'equal' | 'unknown';
}

export const getAttemptStats = async (): Promise<AttemptStats> => {
  const response = await http.get('/attempts/stats/'); 
  const data = response.data;
  
  return {
    attemptsTotal: data.attempts_total ?? data.attemptsTotal ?? 0,
    testsAttempted: data.tests_attempted ?? data.testsAttempted ?? 0,
    averageScore: data.average_score ?? data.averageScore ?? 0,
    bestScore: data.best_score ?? data.bestScore ?? 0,
  };
};

export const getAttemptHistory = async (): Promise<AttemptHistoryItem[]> => {
  const response = await http.get('/attempts/');
  
  return response.data.map((item: any) => ({
    id: item.id,
    testId: item.test_id ?? item.testId,
    testTitle: item.test_title ?? item.testTitle,
    score: item.score,
    startedAt: item.started_at ?? item.startedAt,
    finishedAt: item.finished_at ?? item.finishedAt,
    
    attemptTimeSeconds: item.attempt_time_seconds ?? item.attemptTimeSeconds,
    timeComparison: item.time_comparison ?? item.timeComparison,
  }));
};