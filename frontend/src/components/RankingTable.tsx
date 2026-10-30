import type { RankingRow } from '../api/ranking';

export type RankingScope = 'test' | 'group' | 'all';

const formatPercent = (value: number) => `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;

const MEDAL: Record<number, string> = {
  1: 'bg-amber-400 text-white',
  2: 'bg-gray-300 text-gray-800',
  3: 'bg-orange-300 text-white',
};

const box = 'bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center text-gray-500';

export default function RankingTable({ rows, scope }: { rows: RankingRow[]; scope: RankingScope }) {
  if (rows.length === 0) return <div className={box}>Учеников пока нет.</div>;

  if (rows.every((r) => r.testsTotal === 0)) {
    return (
      <div className={box}>
        {scope === 'group' ? 'В этой группе пока нет тестов.' : 'Пока нет тестов, по которым можно строить рейтинг.'}
      </div>
    );
  }

  const ranked = rows.filter((r) => r.rank !== null).length;
  const single = scope === 'test';

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        С результатом: {ranked} из {rows.length} учеников
      </p>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-gray-500 text-sm border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-medium">Место</th>
              <th className="px-6 py-4 font-medium">Ученик</th>
              <th className="px-6 py-4 font-medium">{single ? 'Результат' : 'Средний результат'}</th>
              <th className="px-6 py-4 font-medium">{single ? 'Пройден' : 'Пройдено тестов'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.userId}
                className={`border-b border-gray-50 last:border-0 ${row.rank === null ? 'text-gray-400' : 'text-gray-900'}`}
              >
                <td className="px-6 py-4">
                  {row.rank === null ? (
                    '—'
                  ) : (
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        MEDAL[row.rank] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {row.rank}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 font-medium">{row.username}</td>
                <td className="px-6 py-4 font-semibold">
                  {row.averageScore === null ? '—' : formatPercent(row.averageScore)}
                </td>
                <td className="px-6 py-4">
                  {single ? (row.testsCompleted > 0 ? 'Да' : 'Нет') : `${row.testsCompleted} из ${row.testsTotal}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Рейтинг считается как средний из лучших результатов по каждому тесту. При равных результатах ученики
        упорядочены по имени.
      </p>
    </div>
  );
}