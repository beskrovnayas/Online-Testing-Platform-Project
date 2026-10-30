import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ManagedTestsList from '../components/ManagedTestsList';

export default function TeacherTests() {
  const navigate = useNavigate();
  const location = useLocation();
  // название только что созданного теста приходит со страницы конструктора
  const [created] = useState(() => (location.state as { created?: string } | null)?.created ?? null);

  useEffect(() => {
    if (created) navigate('/teacher/tests', { replace: true, state: null });
  }, [created, navigate]);

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
            onClick={() => navigate('/teacher/tests/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-3 rounded-2xl"
          >
            Создать тест
          </button>
        </div>

        {created && (
          <p role="status" className="mb-6 text-sm text-emerald-700 bg-emerald-50 rounded-2xl p-4">
            Тест «{created}» создан как черновик. Опубликуйте его, когда он будет готов ^^
          </p>
        )}

        <ManagedTestsList />
      </div>
    </div>
  );
}