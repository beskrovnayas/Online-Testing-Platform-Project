import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyAttempts, type TestAttemptItem } from '../api/testAPI';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBg(score: number | null) {
  if (score === null) return 'bg-gray-100';
  if (score >= 80) return 'bg-green-50';
  if (score >= 50) return 'bg-yellow-50';
  return 'bg-red-50';
}

export default function MyAttempts() {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [attempts, setAttempts] = useState<TestAttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyAttempts();
      setAttempts(data);
    } catch {
      setError('Не удалось загрузить историю прохождений');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(360, el.clientWidth * 0.8);
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-6" />
          <p className="text-gray-600 text-lg">Загружаем историю...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Ошибка</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={load}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-6">
        <button
          onClick={() => navigate('/tests')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          ← К списку тестов
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Мои прохождения
            </h1>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl shadow text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-3">
              Вы пока не прошли ни одного теста.. Выполните первый тест чтобы Ваша попытка отобразилась в истории
            </h2>
            <p className="text-gray-500 mb-6">
              Пройдите любой тест
            </p>
            <button
              onClick={() => navigate('/tests')}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700"
            >
              К тестам
            </button>
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'thin' }}
          >
            {attempts.map((a) => (
              <div
                key={a.id}
                className={`snap-start shrink-0 w-[280px] sm:w-[300px] rounded-3xl border border-gray-100 shadow-sm p-6 ${scoreBg(a.score)}`}
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4 leading-snug min-h-[3.5rem]">
                  {a.testTitle}
                </h3>

                <div className={`text-4xl font-bold mb-1 ${scoreColor(a.score)}`}>
                  {a.score !== null ? `${a.score}%` : '—'}
                </div>
                <div className="text-sm text-gray-500 mb-6">
                  {a.finishedAt ? 'Завершён' : 'Не завершён'}
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <p>Начат: {formatDate(a.startedAt)}</p>
                  <p>
                    {a.finishedAt
                      ? `Закончен: ${formatDate(a.finishedAt)}`
                      : 'Ещё в процессе'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {attempts.length > 0 && (
          <p className="text-center text-sm text-gray-400 mt-6">
            На телефоне можно листать свайпом
          </p>
        )}
      </div>
    </div>
  );
}