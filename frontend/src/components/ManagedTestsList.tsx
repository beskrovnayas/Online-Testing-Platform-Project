import { useEffect, useState } from 'react';
import { getUserType } from '../api/http';
import {
  getManagedTests,
  getStudents,
  setHiddenFor,
  setPublished,
  type ManagedTest,
  type Student,
} from '../api/manage';

export default function ManagedTestsList() {
  const allowed = ['teacher', 'admin'].includes(getUserType() ?? '');
  const [tests, setTests] = useState<ManagedTest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (!allowed) return;
    Promise.all([getManagedTests(), getStudents()])
      .then(([t, s]) => {
        setTests(t);
        setStudents(s);
      })
      .catch(() => setError('Не удалось загрузить тесты. Обновите страницу'))
      .finally(() => setLoading(false));
  }, [allowed]);

  const apply = async (action: () => Promise<ManagedTest>) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      setTests((current) => current.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      setError('Не удалось сохранить изменение. Попробуйте снова');
    } finally {
      setBusy(false);
    }
  };

  const hiddenCount = (test: ManagedTest) =>
    test.hiddenFor.filter((id) => students.some((s) => s.id === id)).length;

  if (!allowed) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center text-gray-600">
        Управлять тестами могут только учителя и администраторы.
      </div>
    );
  }

  if (loading) {
    return <p className="text-center text-gray-500 py-10">Загружаем тесты...</p>;
  }

  return (
    <div>
      <p className="text-gray-600 mb-6">
        Ученики видят только опубликованные тесты, от которых вы их не скрыли.
      </p>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4">{error}</div>
      )}

      {tests.length === 0 && !error && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
          У вас пока нет тестов. Нажмите «Создать тест», чтобы добавить первый.
        </div>
      )}

      <div className="space-y-4">
        {tests.map((test) => (
          <section
            key={test.id}
            className={`bg-white rounded-3xl shadow-sm border border-gray-100 border-l-4 p-6 ${
              test.isPublished ? 'border-l-emerald-400' : 'border-l-gray-300'
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{test.title}</h2>
                <p className="text-gray-600 mt-1">{test.description}</p>
                {test.isPublished ? (
                  <p className="text-sm mt-2 text-emerald-700">
                    Опубликован. Виден {students.length - hiddenCount(test)} из {students.length} учеников
                  </p>
                ) : (
                  <p className="text-sm mt-2 text-gray-500">Черновик. Ученики его не видят</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  disabled={busy}
                  onClick={() => apply(() => setPublished(test.id, !test.isPublished))}
                  className="bg-blue-600 text-white px-4 py-2 rounded-2xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {test.isPublished ? 'Снять с публикации' : 'Опубликовать'}
                </button>
                <button
                  onClick={() => setOpenId(openId === test.id ? null : test.id)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-2xl hover:bg-gray-50"
                >
                  Ученики
                </button>
              </div>
            </div>

            {openId === test.id && (
              <ul className="mt-5 border-t border-gray-100 pt-4 space-y-2">
                {!test.isPublished && (
                  <li className="text-sm text-gray-500 bg-gray-50 rounded-2xl p-3">
                    Тест не опубликован, поэтому его не видит никто. Настройки ниже начнут
                    действовать после публикации.
                  </li>
                )}
                {students.length === 0 && <li className="text-gray-500">Учеников пока нет.</li>}
                {students.map((student) => {
                  const hidden = test.hiddenFor.includes(student.id);
                  return (
                    <li key={student.id} className="flex items-center justify-between gap-4">
                      <span className="text-gray-800">
                        {student.username}
                        <span className="text-gray-400 text-sm"> {student.email}</span>
                      </span>
                      <button
                        disabled={busy}
                        onClick={() => apply(() => setHiddenFor(test.id, student.id, !hidden))}
                        className={`px-4 py-1.5 rounded-2xl text-sm disabled:opacity-50 ${
                          test.isPublished ? '' : 'opacity-60'
                        } ${
                          hidden
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {hidden ? 'Скрыт. Нажмите, чтобы показать' : 'Виден. Нажмите, чтобы скрыть'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}