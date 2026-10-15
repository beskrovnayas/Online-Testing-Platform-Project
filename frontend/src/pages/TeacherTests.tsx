import { useNavigate } from 'react-router-dom';

export default function TeacherTests() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-6">
        <button
          onClick={() => navigate('/tests')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          ← К списку тестов
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Управление тестами
            </h1>
            <p className="text-gray-600 text-lg">
              Создание и статус тестов преподавателя
            </p>
          </div>

          <button
            onClick={() => navigate('/teacher/tests/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-3 rounded-2xl"
          >
            Создать тест
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
          Позже: писок тестов и публикация (переключатель)
        </div>
      </div>
    </div>
  );
}