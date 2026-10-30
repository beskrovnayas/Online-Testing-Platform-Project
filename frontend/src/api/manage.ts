import { http } from './http';

export interface ManagedTest {
  id: number;
  title: string;
  description: string;
  duration: number;
  isPublished: boolean;
  hiddenFor: number[]; // тут id учеников, от которых тест скрыт
}

export interface Student {
  id: number;
  username: string;
  email: string;
}

interface ManagedTestResponse {
  id: number;
  title: string;
  description: string;
  time_limit: number;
  is_published: boolean;
  hidden_for: number[];
}

const mapTest = (t: ManagedTestResponse): ManagedTest => ({
  id: t.id,
  title: t.title,
  description: t.description,
  duration: t.time_limit,
  isPublished: t.is_published,
  hiddenFor: t.hidden_for ?? [],
});

export async function getManagedTests(): Promise<ManagedTest[]> {
  const { data } = await http.get<ManagedTestResponse[]>('/new_tests/');
  return data.map(mapTest);
}

export async function getStudents(): Promise<Student[]> {
  const { data } = await http.get<Student[]>('/users/students/');
  return data;
}

export async function setPublished(testId: number, published: boolean): Promise<ManagedTest> {
  const action = published ? 'publish' : 'unpublish';
  const { data } = await http.post<ManagedTestResponse>(`/new_tests/${testId}/${action}/`);
  return mapTest(data);
}

export async function setHiddenFor(
  testId: number,
  userId: number,
  hidden: boolean,
): Promise<ManagedTest> {
  const action = hidden ? 'hide-for' : 'unhide-for';
  const { data } = await http.post<ManagedTestResponse>(`/new_tests/${testId}/${action}/`, {
    user_id: userId,
  });
  return mapTest(data);
}