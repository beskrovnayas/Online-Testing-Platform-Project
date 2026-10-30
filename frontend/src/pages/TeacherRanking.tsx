import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GroupsPanel from '../components/GroupsPanel';
import RankingTable, { type RankingScope } from '../components/RankingTable';
import { getManagedTests, type ManagedTest } from '../api/manage';
import {
  getGlobalRanking,
  getGroupRanking,
  getGroups,
  getTestRanking,
  type RankingRow,
  type TestGroup,
} from '../api/ranking';

const TABS: { mode: RankingScope; label: string }[] = [
  { mode: 'test', label: 'По тесту' },
  { mode: 'group', label: 'По группе тестов' },
  { mode: 'all', label: 'По всем тестам' },
];

const selectClass =
  'w-full sm:max-w-md rounded-2xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500';

// ключ запроса вида "test:5#0" ("group:3#1" или "all#0"), число после # меняется кнопкой "Обновить"
function loadFor(key: string): Promise<RankingRow[]> {
  const [kind, rawId] = key.split('#')[0].split(':');
  const id = Number(rawId);
  if (kind === 'test') return getTestRanking(id);
  if (kind === 'group') return getGroupRanking(id);
  return getGlobalRanking();
}

function describeError(error: unknown, key: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 403) return 'Рейтинг доступен только преподавателям и администраторам.';
    if (status === 404 && key.startsWith('all')) {
      return 'Сервер не нашёл адрес общего рейтинга. Проверьте GLOBAL_RANKING_PATH в api/ranking.ts.';
    }
  }
  return 'Не удалось загрузить рейтинг. Попробуйте снова.';
}

export default function TeacherRanking() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<RankingScope>('test');
  const [tests, setTests] = useState<ManagedTest[] | null>(null);
  const [groups, setGroups] = useState<TestGroup[] | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [chosenTest, setChosenTest] = useState<number | null>(null);
  const [chosenGroup, setChosenGroup] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; rows: RankingRow[] | null; error: string | null } | null>(null);

  useEffect(() => {
    Promise.all([getManagedTests(), getGroups()])
      .then(([t, g]) => {
        setTests(t);
        setGroups(g);
      })
      .catch(() => setInitError('Не удалось загрузить тесты и группы. Обновите страницу.'));
  }, []);

  // по умолчанию выбран первый элемент; если выбранную группу удалили, тоже откатываемся к первой
  const testId = tests?.find((t) => t.id === chosenTest)?.id ?? tests?.[0]?.id ?? null;
  const groupId = groups?.find((g) => g.id === chosenGroup)?.id ?? groups?.[0]?.id ?? null;

  const base = mode === 'test' ? (testId !== null ? `test:${testId}` : null) : mode === 'group' ? (groupId !== null ? `group:${groupId}` : null) : 'all';
  const key = base === null ? null : `${base}#${reload}`;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    loadFor(key)
      .then((rows) => {
        if (!cancelled) setResult({ key, rows, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setResult({ key, rows: null, error: describeError(error, key) });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // результат относится к текущему выбору, только если ключи совпали, иначе ещё грузим
  const current = key !== null && result?.key === key ? result : null;
  const loading = key !== null && current === null;

  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-3">Ошибка</h2>
          <p className="text-gray-600">{initError}</p>
        </div>
      </div>
    );
  }

  if (tests === null || groups === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Загружаем рейтинг...</p>
      </div>
    );
  }

  const emptyHint =
    mode === 'test' && testId === null
      ? 'У вас пока нет тестов, поэтому рейтинг строить не из чего.'
      : mode === 'group' && groupId === null
        ? 'Групп пока нет. Создайте первую ниже, и по ней появится рейтинг.'
        : null;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-6">
        <button onClick={() => navigate('/profile')} className="text-blue-600 hover:text-blue-700 font-medium mb-8">
          ← В личный кабинет
        </button>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Рейтинг учеников</h1>
        <p className="text-gray-600 text-lg mb-8">Результаты всех учеников по тесту, группе тестов или по всем тестам.</p>

        <div role="tablist" aria-label="Режим рейтинга" className="flex flex-wrap gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.mode}
              role="tab"
              aria-selected={mode === tab.mode}
              onClick={() => setMode(tab.mode)}
              className={`px-5 py-2.5 rounded-2xl font-medium transition-colors ${
                mode === tab.mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === 'test' && tests.length > 0 && (
          <label className="block text-sm text-gray-600 mb-6">
            Тест
            <select
              aria-label="Тест"
              value={testId ?? ''}
              onChange={(e) => setChosenTest(Number(e.target.value))}
              className={`${selectClass} mt-1`}
            >
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        )}

        {mode === 'group' && groups.length > 0 && (
          <label className="block text-sm text-gray-600 mb-6">
            Группа тестов
            <select
              aria-label="Группа тестов"
              value={groupId ?? ''}
              onChange={(e) => setChosenGroup(Number(e.target.value))}
              className={`${selectClass} mt-1`}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {emptyHint ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
            {emptyHint}
          </div>
        ) : loading ? (
          <p className="text-gray-500 py-8 text-center">Загружаем рейтинг...</p>
        ) : current?.error ? (
          <div role="alert" className="bg-red-50 border border-red-100 text-red-700 rounded-3xl p-6">
            <p>{current.error}</p>
            <button onClick={() => setReload((n) => n + 1)} className="mt-3 text-sm font-medium underline">
              Попробовать снова
            </button>
          </div>
        ) : (
          current?.rows && (
            <div>
              <RankingTable rows={current.rows} scope={mode} />
              <button
                onClick={() => setReload((n) => n + 1)}
                className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Обновить
              </button>
            </div>
          )
        )}

        {mode === 'group' && (
          <GroupsPanel
            groups={groups}
            tests={tests}
            onChange={(next, createdId) => {
              setGroups(next);
              if (createdId !== undefined) setChosenGroup(createdId);
            }}
          />
        )}
      </div>
    </div>
  );
}