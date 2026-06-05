import type {Test} from '../api/testAPI';

interface TestCardProps {
  test: Test & {questionCount?: number};
  onStartTest: (testId: number) => void;
}

export default function TestCard({ test, onStartTest }: TestCardProps) {
  return (
    <div className = "bg-white rounded-3xl shadow-md p-8 hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
      
      {/*Категория*/}
      {test.category && (
        <div className = "mb-4">
          <span className = "inline-block px-4 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            {test.category}
          </span>
        </div>
      )}

      {/*Название теста*/}
      <h3 className = "text-4xl font-semibold text-gray-900 mb-3 leading-tight">
        {test.title}
      </h3>

      {/*Описание теста*/}
      <p className = "text-gray-600 mb-6 flex-grow line-clamp-4">
        {test.description}
      </p>

      {/*Инфа: время, кол-во вопросов, лвл сложности, мин % для успеха, сложность*/}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 bg-gray-50 rounded-2xl p-6">
        
        <div>
          <p className="text-gray-500 text-sm">Время на прохождение</p>
          <p className="font-semibold text-gray-900">{test.duration} мин</p>
        </div>

        {test.questionCount && (
          <div>
            <p className="text-gray-500 text-sm">Количество вопросов</p>
            <p className="font-semibold text-gray-900">{test.questionCount}</p>
          </div>
        )}

        {test.succes && (
          <div>
            <p className="text-gray-500 text-sm">Минимум для сдачи</p>
            <p className="font-semibold text-emerald-600">{test.succes}%</p>
          </div>
        )}

        {test.difficulty && (
          <div>
            <p className="text-gray-500 text-sm">Сложность</p>
            <span className={`inline-block px-4 py-1.5 text-sm font-medium rounded-full 
              ${test.difficulty === 'easy' ? 'bg-green-100 text-green-700' : ''}
              ${test.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
              ${test.difficulty === 'hard' ? 'bg-red-100 text-red-700' : ''}`}>
              {test.difficulty === 'easy' && 'Лёгкий'}
              {test.difficulty === 'medium' && 'Средний'}
              {test.difficulty === 'hard' && 'Сложный'}
            </span>
          </div>
        )}
      </div>

      {/*Кнопка "Перейти к тесту"*/}
      <button 
        onClick = {() => onStartTest(test.id)}
        className = "mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-2xl transition-colors text-lg active:scale-95"
      >
        Перейти к тесту
      </button>
    </div>
  );
}