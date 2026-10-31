import type { Test } from '../api/testAPI';

interface TestCardProps {
  test: Test & { questionCount?: number };
  onStartTest: (testId: number) => void;
}

export default function TestCard({ test, onStartTest }: TestCardProps) {
  return (
    <div className="bg-white rounded-3xl shadow-md p-6 flex flex-col h-full">
      {test.category && (
        <span className="text-sm text-blue-600 font-medium mb-2">{test.category}</span>
      )}

      <h3 className="text-xl font-bold text-gray-900 mb-2">{test.title}</h3>
      <p className="text-gray-600 mb-4 flex-grow">{test.description}</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-500">Время на прохождение</div>
          <div className="font-semibold text-gray-800">{test.duration} мин</div>
        </div>

        {test.questionCount && (
          <div>
            <div className="text-sm text-gray-500">Количество вопросов</div>
            <div className="font-semibold text-gray-800">{test.questionCount}</div>
          </div>
        )}

        {test.succes && (
          <div>
            <div className="text-sm text-gray-500">Минимум для сдачи</div>
            <div className="font-semibold text-gray-800">{test.succes}%</div>
          </div>
        )}

        {test.difficulty && (
          <div>
            <div className="text-sm text-gray-500">Сложность</div>
            <div className="font-semibold text-gray-800">
              {test.difficulty === 'easy' && 'Лёгкий'}
              {test.difficulty === 'medium' && 'Средний'}
              {test.difficulty === 'hard' && 'Сложный'}
            </div>
          </div>
        )}
      </div>

      {/* Среднее время */}
      {test.averageDurationSeconds != null && (
        <div className="mb-4 text-sm text-gray-500">
          В среднем проходят за: <span className="font-semibold text-gray-800">{Math.round(test.averageDurationSeconds / 60)} мин</span>
        </div>
      )}

      <button
        onClick={() => onStartTest(test.id)}
        className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-2xl transition-colors text-lg active:scale-95"
      >
        Перейти к тесту
      </button>
    </div>
  );
}