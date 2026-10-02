import TestCard from '../components/TestCard';
import { useState, useEffect } from 'react';
import { getTests, type Test } from '../api/testAPI';
import { useNavigate } from 'react-router-dom';
import { loadingMessages, errorMessages, emptyStateMessages } from '../components/LoadingMessages';



export default function TestsList() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const navigate = useNavigate();

  // Загружаем тесты
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        setError(null);
        setMessageIndex(0);

        const data = await getTests();
        setTests(data);
      } catch (err: any) {
        setError(errorMessages.fetchTests);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [loading]);

  const handleStartTest = (testId: number) => {
    navigate(`/tests/${testId}`);
  };


  
  // Экран загрузки
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-6"></div>

          <h2 className="text-2xl font-semibold text-gray-700 mb-3 min-h-[3.5rem]">
            {loadingMessages[messageIndex]}
          </h2>

          <p className="text-gray-500">Идет загрузка...</p>
        </div>
      </div>
    );
  }

  // Неудачная загрузка
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md">
          {/* <img
            src = {ErrorImage}
            alt = "Ошибка"
            className = "mx-auto mb-8 w-64 opacity-90"
          /> */}
          <h2 className="text-2xl font-bold text-red-600 mb-4">Ошибка загрузки</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Тестов для прохождения нет
  if (tests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md">
          {/* <img
            src = {NoTestsImage}
            alt = "Нет тестов для прохождения"
            className="mx-auto mb-8 w-72 opacity-90"
          /> */}

          <h2 className="text-2xl font-bold text-gray-700 mb-4">
            {emptyStateMessages.title}
          </h2>
          <p className="text-gray-600 mb-6">
            {emptyStateMessages.description}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700"
          >
            {emptyStateMessages.button}
          </button>
        </div>
      </div>
    );
  }

  // Основная загрузка
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className = "mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Доступные тесты
          </h1>
          <p className="text-gray-600 mb-10 text-lg">
            Выберите тест для прохождения
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 xl:gap-10">
        {tests.map((test) => (
          <TestCard
            key={test.id}
            test={test}
            onStartTest={handleStartTest}
          />
          ))}
        </div>
      </div>
    </div>
  );
}