import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getTestById, type Test } from '../api/testAPI';
import { 
  loadingMessages, 
  errorMessages, 
  testDetailMessages 
} from '../components/LoadingMessages';



export default function TestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const fetchTest = async () => {
      if (!id) {
        setError(errorMessages.noId);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getTestById(parseInt(id));
        setTest(data);
      } catch (err: any) {
        console.error(err);
        setError(errorMessages.fetchTestDetail);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id]);

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1600);

    return () => clearInterval(interval);
  }, [loading]);

  const handleStartTest = () => {
    if (!test) return;

    navigate(`/take-test/${id}`);
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

  if (error || !test) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Ошибка</h2>
          <p className="text-gray-600 mb-6">
            {error || errorMessages.testNotFound}
          </p>
          <button 
            onClick={() => navigate('/tests')}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700"
          >
            Вернуться к списку тестов
          </button>
        </div>
      </div>
    );
  }

  // Основная загрузка
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-6">
        
        {/*Кнопка "назад к списку тестов"*/}
        <button
          onClick={() => navigate('/tests')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8 flex items-center gap-2"
        >
          {testDetailMessages.backToList}
        </button>

        <div className="bg-white rounded-3xl shadow-xl p-10">
          {/* Категория */}
          {test.category && (
            <div className="mb-6">
              <span className="inline-block px-5 py-2 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
                {test.category}
              </span>
            </div>
          )}

          {/* Название теста */}
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {test.title}
          </h1>

          {/* Описание */}
          <p className="text-lg text-gray-700 leading-relaxed mb-10">
            {test.description}
          </p>
          
          {/* Информация о тесте */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 bg-gray-50 rounded-2xl p-6">
            <div>
              <p className="text-gray-500 text-sm">Время на прохождение</p>
              <p className="text-2xl font-semibold text-gray-900">{test.duration} мин</p>
            </div>

            {test.questionCount && (
              <div>
                <p className="text-gray-500 text-sm">Количество вопросов</p>
                <p className="text-2xl font-semibold text-gray-900">{test.questionCount}</p>
              </div>
            )}

            {test.succes && (
              <div>
                <p className="text-gray-500 text-sm">Минимум для сдачи</p>
                <p className="text-2xl font-semibold text-emerald-600">{test.succes}%</p>
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

          {/*Кнопка "Начать тест"*/}
          <div className="flex gap-4">
            <button
              onClick={handleStartTest}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl text-lg transition-all active:scale-95"
            >
              {testDetailMessages.startTest}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
