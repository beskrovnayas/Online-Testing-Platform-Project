import type { AttemptResult } from './protocol';

const formatDate = (value?: string) => {
  if (!value) return 'Не указано';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Не указано' : date.toLocaleString('ru-RU');
};

const formatDuration = (seconds?: number | null) => {
  if (seconds === undefined || seconds === null) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} сек`;
  return `${mins} мин ${secs} сек`;
};

const comparisonBadge = (comparison?: string) => {
  if (comparison === 'faster') {
    return <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Быстрее среднего</span>;
  }
  if (comparison === 'slower') {
    return <span className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">Медленнее среднего</span>;
  }
  if (comparison === 'equal') {
    return <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">Среднее время</span>;
  }
  return null;
};

export default function TestResultDetails({ result }: { result: AttemptResult }) {
  return (
    <section aria-label="Результат прохождения" className="bg-white rounded-3xl shadow-md p-6 sm:p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Результат теста</h2>
      {result.testTitle && <p className="text-lg text-gray-700 mb-4">{result.testTitle}</p>}

      <p className="text-2xl font-semibold text-emerald-700">
        {result.correctAnswers !== undefined && result.totalQuestions !== undefined
          ? `${result.correctAnswers} из ${result.totalQuestions} · ` : ''}
        {result.percentage}%
      </p>

      {result.attemptId !== undefined && <p className="text-gray-500 mt-3">Попытка №{result.attemptId}</p>}

      {/* Блок времени и сравнения */}
      <div className="mt-5 p-4 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-100">
        <div>
          <p className="text-gray-700">
            Ваше время: <span className="font-semibold">{formatDuration(result.attemptTimeSeconds)}</span>
          </p>
          {result.averageTestTimeSeconds !== undefined && result.averageTestTimeSeconds !== null && (
            <p className="text-sm text-gray-500 mt-1">
              Среднее время по тесту: {formatDuration(result.averageTestTimeSeconds)}
            </p>
          )}
        </div>
        <div>{comparisonBadge(result.timeComparison)}</div>
      </div>

      {(result.startedAt || result.finishedAt) && (
        <dl className="grid sm:grid-cols-2 gap-4 mt-5 text-gray-700">
          <div><dt className="text-gray-500">Начало</dt><dd>{formatDate(result.startedAt)}</dd></div>
          <div><dt className="text-gray-500">Завершение</dt><dd>{formatDate(result.finishedAt)}</dd></div>
        </dl>
      )}

      {result.details.length > 0 ? (
        <div className="space-y-4 mt-6">
          {result.details.map((detail, index) => (
            <div key={`${detail.questionId}-${index}`} className="border border-gray-200 rounded-2xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{index + 1}. {detail.questionText}</h3>
              <p className="text-gray-700">Ваш ответ: {detail.selectedTexts.join(', ') || 'Ответ не указан'}</p>
              {detail.correctTexts.length > 0 && <p className="text-gray-700">Правильный ответ: {detail.correctTexts.join(', ')}</p>}
              <p className={`mt-2 font-medium ${detail.isCorrect ? 'text-emerald-700' : 'text-gray-700'}`}>
                {detail.error || (detail.isCorrect === null ? 'Ожидает проверки' : detail.isCorrect ? 'Верно' : 'Неверно')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 mt-5">Подробные ответы для этой попытки не предоставлены.</p>
      )}
    </section>
  );
}