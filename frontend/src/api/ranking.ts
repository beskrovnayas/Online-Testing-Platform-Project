import { http } from './http';

export interface RankingRow {
  userId: number;
  username: string;
  averageScore: number | null; // null: у ученика нет завершённых попыток
  testsCompleted: number;
  testsTotal: number;
  rank: number | null; // null: места в рейтинге нет
}

export interface TestGroup {
  id: number;
  name: string;
  tests: number[]; // id тестов группы
}

export const GLOBAL_RANKING_PATH = '/stats/ranking/';
interface RankingResponse {
  user_id: number;
  username: string;
  average_score: number | null;
  tests_completed: number;
  tests_total: number;
  rank: number | null;
}

interface GroupResponse {
  id: number;
  name: string;
  tests: number[];
}

const mapRow = (r: RankingResponse): RankingRow => ({
  userId: r.user_id,
  username: r.username,
  averageScore: r.average_score,
  testsCompleted: r.tests_completed,
  testsTotal: r.tests_total,
  rank: r.rank,
});

const mapGroup = ({ id, name, tests }: GroupResponse): TestGroup => ({ id, name, tests });

async function loadRanking(path: string): Promise<RankingRow[]> {
  const { data } = await http.get<RankingResponse[]>(path);
  return data.map(mapRow);
}

export const getTestRanking = (testId: number) => loadRanking(`/new_tests/${testId}/ranking/`);
export const getGroupRanking = (groupId: number) => loadRanking(`/test-groups/${groupId}/ranking/`);
export const getGlobalRanking = () => loadRanking(GLOBAL_RANKING_PATH);

export async function getGroups(): Promise<TestGroup[]> {
  const { data } = await http.get<GroupResponse[]>('/test-groups/');
  return data.map(mapGroup);
}

export async function createGroup(name: string, tests: number[]): Promise<TestGroup> {
  const { data } = await http.post<GroupResponse>('/test-groups/', { name, tests });
  return mapGroup(data);
}

export async function deleteGroup(id: number): Promise<void> {
  await http.delete(`/test-groups/${id}/`);
}