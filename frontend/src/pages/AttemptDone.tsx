import { useNavigate, useParams } from 'react-router-dom';

export default function AttemptDone() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 text-center max-w-md w-full">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-8 w-8"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Попытка засчитана</h1>
        <p className="text-gray-600 mb-8">Ваши ответы сохранены, а результаты уже готовы! ^^</p>

        <button
          onClick={() => navigate(`/attempt/${id}/review`)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-2xl"
        >
          Посмотреть результаты
        </button>
        <button
          onClick={() => navigate('/tests')}
          className="w-full mt-3 bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-2xl hover:bg-gray-50"
        >
          ← К списку тестов
        </button>
      </div>
    </div>
  );
}