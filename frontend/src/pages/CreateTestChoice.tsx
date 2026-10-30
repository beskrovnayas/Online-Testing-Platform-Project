import { useNavigate } from 'react-router-dom';

const cardClass =
  'text-left bg-white rounded-3xl border border-gray-100 shadow-sm p-8 hover:border-blue-300 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function CreateTestChoice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-6">
        <button
          onClick={() => navigate('/profile')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          ← В личный кабинет
        </button>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Создать тест</h1>
        <p className="text-gray-600 text-lg mb-10">Выберите: как вы хотите создать тест?</p>

        <div className="grid sm:grid-cols-2 gap-6">
          <button type="button" onClick={() => navigate('/teacher/tests/create')} className={cardClass}>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Создать свой тест</h2>
            <p className="text-gray-600">
              Откроется конструктор: вы сами впишете вопросы и варианты ответов ^^
            </p>
          </button>

          <button type="button" onClick={() => navigate('/teacher/tests/create-from-pdf')} className={cardClass}>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Создать тест из PDF</h2>
            <p className="text-gray-600">Загрузите PDF-файлы с материалами.</p>
          </button>
        </div>
      </div>
    </div>
  );
}