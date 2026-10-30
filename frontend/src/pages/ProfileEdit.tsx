import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getProfile,
  PROFILE_NOTICE,
  updateProfile,
  validateProfile,
  type ProfileErrors,
  type ProfileUpdate,
} from '../api/profile';

const FIELDS: { key: keyof ProfileUpdate; label: string; type: string }[] = [
  { key: 'firstName', label: 'Имя', type: 'text' },
  { key: 'lastName', label: 'Фамилия', type: 'text' },
  { key: 'username', label: 'Логин', type: 'text' },
  { key: 'email', label: 'Почта', type: 'email' },
];

const inputClass =
  'w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileUpdate | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((p) =>
        setForm({ username: p.username, email: p.email, firstName: p.firstName, lastName: p.lastName }),
      )
      .catch(() => setLoadError('Не удалось загрузить профиль. Обновите страницу'));
  }, []);

  const save = async () => {
    if (!form) return;
    const problems = validateProfile(form);
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile(form);
      // ProfilePage показывает сообщение «Профиль сохранён» по состоянию
      navigate('/profile', { replace: true, state: { saved: true } });
    } catch {
      setSaveError('Не удалось сохранить профиль. Попробуйте снова');
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-3">Ошибка</h2>
          <p className="text-gray-600 mb-6">{loadError}</p>
          <button
            onClick={() => navigate('/profile')}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700"
          >
            ← В личный кабинет
          </button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Загружаем профиль...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-6">
        <button
          onClick={() => navigate('/profile')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          ← В личный кабинет
        </button>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Редактирование профиля</h1>

        {PROFILE_NOTICE && (
          <p className="mb-6 text-sm text-gray-500 bg-gray-100 rounded-2xl p-4">{PROFILE_NOTICE}</p>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-10 space-y-5">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                <input
                  type={field.type}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className={`${inputClass} mt-2 font-normal`}
                />
              </label>
              {fieldErrors[field.key] && <p className="text-sm text-red-600 mt-1">{fieldErrors[field.key]}</p>}
            </div>
          ))}

          {saveError && (
            <p role="alert" className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4">
              {saveError}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-2xl"
            >
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              disabled={saving}
              className="flex-1 bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-2xl hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}