import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { displayName, getProfile, initialsOf, PROFILE_NOTICE, type Profile } from '../api/profile';

const ROLE_LABEL: Record<string, string> = {
  student: 'Ученик',
  teacher: 'Преподаватель',
  admin: 'Администратор',
};

const primaryBtn =
  'w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 text-lg transition-colors';
const secondaryBtn =
  'w-full rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 text-lg transition-colors';

function RoleActions({ role }: { role: string }) {
  const navigate = useNavigate();

  if (role === 'student') {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => navigate('/stats')} className={primaryBtn}>
          Моя статистика
        </button>
        <button type="button" onClick={() => navigate('/tests')} className={secondaryBtn}>
          К списку тестов
        </button>
      </div>
    );
  }

  if (role === 'teacher' || role === 'admin') {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => navigate('/teacher/tests/new')} className={primaryBtn}>
          Создать тест
        </button>
        <button type="button" onClick={() => navigate('/teacher/tests')} className={secondaryBtn}>
          Управление тестами
        </button>
        <button type="button" onClick={() => navigate('/teacher/ranking')} className={secondaryBtn}>
          Рейтинг учеников
        </button>
      </div>
    );
  }

  return null;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // сообщение о сохранении приходит со страницы редактирования через состояние роутера
  const [saved] = useState(() => (location.state as { saved?: boolean } | null)?.saved === true);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setError('Не удалось загрузить профиль. Обновите страницу'))
      .finally(() => setLoading(false));
  }, []);

  // очищаем состояние, чтобы сообщение не появлялось снова после обновления страницы
  useEffect(() => {
    if (saved) navigate('/profile', { replace: true, state: null });
  }, [saved, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Загружаем профиль...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-3">Ошибка</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/tests')}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700"
          >
            ← К списку тестов
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-6">
        <button
          onClick={() => navigate('/tests')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          ← К тестам
        </button>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Личный кабинет</h1>

        {PROFILE_NOTICE && (
          <p className="mb-6 text-sm text-gray-500 bg-gray-100 rounded-2xl p-4">{PROFILE_NOTICE}</p>
        )}

        {saved && (
          <p role="status" className="mb-6 text-sm text-emerald-700 bg-emerald-50 rounded-2xl p-4">
            Профиль сохранён
          </p>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-10">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div
                className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-md"
                aria-hidden
              >
                {initialsOf(profile)}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl font-semibold text-gray-900">{displayName(profile)}</p>
                <p className="text-gray-500 mt-1">{profile.email}</p>
                <p className="text-sm text-blue-700 mt-1">{ROLE_LABEL[profile.userType] ?? 'Пользователь'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              className="shrink-0 h-11 w-11 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center"
              aria-label="Редактировать профиль"
              title="Редактировать профиль"
            >
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <RoleActions role={profile.userType} />
        </div>
      </div>
    </div>
  );
}