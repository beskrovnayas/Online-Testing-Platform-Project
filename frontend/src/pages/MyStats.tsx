import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAttemptHistory,
  getAttemptStats,
  type AttemptHistoryItem,
  type AttemptStats,
} from '../api/stats';

const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU');
// локал.дата в формате YYYY-MM-DD
const localDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA');

// диапазоны результата: 0–10%, 11–20%, ..., 91–100%
const BUCKETS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i),
  label: i === 0 ? '0–10%' : `${i * 10 + 1}–${(i + 1) * 10}%`,
}));
const bucketOf = (score: number) => Math.max(0, Math.ceil(Math.round(score) / 10) - 1);

// дата без секунд для карточек: 23.10.2026, 00:19
const formatShort = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// до 49% красный, 50–79% жёлтый, от 80% зелёный
const cardTone = (item: AttemptHistoryItem) => {
  if (!item.finishedAt) return { box: 'bg-gray-100', text: 'text-gray-500' };
  const s = Math.round(item.score);
  if (s < 50) return { box: 'bg-red-50', text: 'text-red-600' };
  if (s < 80) return { box: 'bg-amber-50', text: 'text-amber-600' };
  return { box: 'bg-emerald-50', text: 'text-emerald-600' };
};

const fieldClass =
  'w-full border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function MyStats() {
  const [stats, setStats] = useState<AttemptStats | null>(null);
  const [history, setHistory] = useState<AttemptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [testId, setTestId] = useState('');
  const [day, setDay] = useState('');
  const [bucket, setBucket] = useState('');

  useEffect(() => {
    Promise.all([getAttemptStats(), getAttemptHistory()])
      .then(([s, h]) => {
        setStats(s);
        setHistory(h);
      })
      .catch(() => setError('Не удалось загрузить статистику. Обновите страницу'))
      .finally(() => setLoading(false));
  }, []);

  // уникальные тесты из истории для выпадающего списка
  const testOptions = useMemo(() => {
    const map = new Map<number, string>();
    history.forEach((item) => map.set(item.testId, item.testTitle));
    return [...map.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }, [history]);

  const filtered = useMemo(
    () =>
      history.filter((item) => {
        if (testId && String(item.testId) !== testId) return false;
        if (day && localDay(item.startedAt) !== day) return false;
        if (bucket !== '') {
          // результата у незавершённой попытки нет, под диапазон она не попадает
          if (!item.finishedAt || bucketOf(item.score) !== Number(bucket)) return false;
        }
        return true;
      }),
    [history, testId, day, bucket],
  );

  const hasFilters = testId !== '' || day !== '' || bucket !== '';
  const resetFilters = () => {
    setTestId('');
    setDay('');
    setBucket('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Загружаем статистику...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-3">Ошибка</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Попыток всего', value: stats.attemptsTotal },
    { label: 'Тестов пройдено', value: stats.testsAttempted },
    { label: 'Средний результат', value: `${Math.round(stats.averageScore)}%` },
    { label: 'Лучший результат', value: `${Math.round(stats.bestScore)}%` },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-6">
        <Link to="/tests" className="text-blue-600 hover:text-blue-700 font-medium">
          К списку тестов
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mt-6 mb-8">Моя статистика</h1>

        {history.length > 0 && (
          <section className="mb-10" aria-label="Мои прохождения">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3">
              {history.map((item) => {
                const tone = cardTone(item);
                return (
                  <div key={item.id} className={`snap-start shrink-0 w-64 rounded-3xl p-6 ${tone.box}`}>
                    <p className="text-lg font-semibold text-gray-900 truncate">{item.testTitle}</p>
                    <p className={`text-4xl font-bold mt-6 ${tone.text}`}>
                      {item.finishedAt ? `${Math.round(item.score)}%` : '—'}
                    </p>
                    <p className="text-sm text-gray-500 mb-5">
                      {item.finishedAt ? 'Завершён' : 'Не завершена'}
                    </p>
                    <p className="text-xs text-gray-600">Начат: {formatShort(item.startedAt)}</p>
                    {item.finishedAt && (
                      <p className="text-xs text-gray-600 mt-1">Закончен: {formatShort(item.finishedAt)}</p>
                    )}
                    {item.finishedAt && (
                      <Link
                        to={`/attempt/${item.id}/review`}
                        className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Смотреть ответы
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-gray-400">Листайте вбок, чтобы увидеть остальные попытки!</p>
          </section>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-3xl shadow-md p-5">
              <p className="text-gray-500 text-sm mb-1">{card.label}</p>
              <p className="text-3xl font-semibold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">История попыток</h2>

        {history.length > 0 && (
          <div className="bg-white rounded-3xl shadow-md p-5 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block text-sm text-gray-600">
                Тест
                <select value={testId} onChange={(e) => setTestId(e.target.value)} className={`${fieldClass} mt-1`}>
                  <option value="">Все тесты</option>
                  {testOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-gray-600">
                Дата прохождения
                <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={`${fieldClass} mt-1`} />
              </label>
              <label className="block text-sm text-gray-600">
                Результат
                <select value={bucket} onChange={(e) => setBucket(e.target.value)} className={`${fieldClass} mt-1`}>
                  <option value="">Любой</option>
                  {BUCKETS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>
                Показано {filtered.length} из {history.length}
              </span>
              {hasFilters && (
                <button onClick={resetFilters} className="text-blue-600 hover:text-blue-700 font-medium">
                  Сбросить фильтры
                </button>
              )}
            </div>
          </div>
        )}

        {history.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-md p-8 text-center text-gray-600">
            Попыток пока нет. Пройдите первый тест, а его результат появится здесь ^^
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-md p-8 text-center text-gray-600">
            По выбранным фильтрам попыток нет. Измените условия или сбросьте фильтры.
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-md overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-gray-500 text-sm border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Тест</th>
                  <th className="px-6 py-4 font-medium">Начат</th>
                  <th className="px-6 py-4 font-medium">Результат</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4 text-gray-900">{item.testTitle}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(item.startedAt)}</td>
                    <td className="px-6 py-4">
                      {item.finishedAt ? (
                        <span className="font-semibold text-gray-900">{Math.round(item.score)}%</span>
                      ) : (
                        <span className="text-gray-400">не завершен</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.finishedAt && (
                        <Link
                          to={`/attempt/${item.id}/review`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          Смотреть ответы
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}