import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAttemptResult } from './api';
import { PassingError, type AttemptResult } from './protocol';
import TestResultDetails from './TestResultDetails';

export default function AttemptDetails({ attemptId }: { attemptId: string }) {
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<PassingError | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const id = Number(attemptId);
        if (!Number.isSafeInteger(id) || id <= 0) throw new PassingError('validation', 'Некорректный номер попытки.');
        const data = await getAttemptResult(id);
        if (active) setResult(data);
      } catch (reason) {
        if (active) setError(reason instanceof PassingError ? reason : new PassingError('network', 'Не удалось загрузить результат.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [attemptId, revision]);

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/tests" className="inline-block text-blue-600 mb-8">Вернуться к списку тестов</Link>
        {loading ? <p role="status">Загружаем результат попытки...</p> : error ? (
          <div role="alert" className="bg-white rounded-3xl p-8 shadow-md">
            <h1 className="text-2xl font-bold mb-4">Не удалось открыть результат</h1>
            <p>{error.message}</p>
            {error.kind === 'auth' && <Link to="/login" className="inline-block text-blue-600 mt-4">Войти</Link>}
            {error.kind === 'network' && <button onClick={() => setRevision((value) => value + 1)} className="text-blue-600 mt-4">Попробовать снова</button>}
          </div>
        ) : result && <TestResultDetails result={result} />}
      </div>
    </main>
  );
}
