import { useNavigate } from 'react-router-dom';

const teacherName = 'Преподаватель';
const teacherInitials = 'П';

export default function TeacherHome() {
  const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="max-w-2xl mx-auto px-6">
            <button
                onClick={() => navigate('/tests')}
                className="text-blue-600 hover:text-blue-700 font-medium mb-8"
            >
                ← К тестам
            </button>

            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
                Личный кабинет
            </h1>

            {/* Карточка профиля */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-10">
                <div className="flex items-start justify-between gap-4 mb-10">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div
                    className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-md"
                    aria-hidden
                    >
                    {teacherInitials}
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-xl font-semibold text-gray-900">{teacherName}</p>
                        <p className="text-gray-500 mt-1">
                            описание
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        alert('Настройки профиля позже: имя, аватар, смена пароля.')
                    }
                    className="shrink-0 h-11 w-11 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center"
                    aria-label="Настройки профиля"
                    title="Настройки"
                >
                    {/* svg шестерёнки */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-5 w-5"
                    >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    </svg>
                </button>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/teacher/tests/create')}
                    className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 text-lg transition-colors"
                >
                    Создать тест
                </button>
            </div>
            </div>
        </div>
    );
}