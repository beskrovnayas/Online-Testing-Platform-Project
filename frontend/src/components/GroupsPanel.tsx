import { useState } from 'react';
import { createGroup, deleteGroup, type TestGroup } from '../api/ranking';
import type { ManagedTest } from '../api/manage';

interface Props {
  groups: TestGroup[];
  tests: ManagedTest[];
  // тут createdId передаётся, когда группа только что создана, чтобы страница могла её выбрать
  onChange: (groups: TestGroup[], createdId?: number) => void;
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function GroupsPanel({ groups, tests, onChange }: Props) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const toggle = (id: number) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Введите название группы');
      return;
    }
    if (trimmed.length > 255) {
      setError('Название не длиннее 255 символов');
      return;
    }
    if (selected.length === 0) {
      setError('Выберите хотя бы один тест');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createGroup(trimmed, selected);
      setName('');
      setSelected([]);
      onChange([created, ...groups], created.id);
    } catch {
      setError('Не удалось создать группу. Попробуйте снова');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (group: TestGroup) => {
    setConfirmId(null);
    setBusy(true);
    setError(null);
    try {
      await deleteGroup(group.id);
      onChange(groups.filter((g) => g.id !== group.id));
    } catch {
      setError('Не удалось удалить группу. Попробуйте снова');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Группы тестов" className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Группы тестов</h2>

      {groups.length === 0 ? (
        <p className="text-gray-500 mb-6">Групп пока нет. Создайте первую ниже.</p>
      ) : (
        <ul className="divide-y divide-gray-100 mb-6">
          {groups.map((group) => (
            <li key={group.id} className="flex items-center justify-between gap-4 py-3">
              <span className="text-gray-900">
                {group.name}
                <span className="text-gray-400 text-sm"> тестов: {group.tests.length}</span>
              </span>
              {confirmId === group.id ? (
                  <span className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">Удалить? Тесты и результаты не пострадают.</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(group)}
                      className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="font-medium text-gray-600 hover:text-gray-800"
                    >
                      Нет
                    </button>
                  </span>
                ) : (
                <button
                  type="button"
                  aria-label={`Удалить группу ${group.name}`}
                  disabled={busy}
                  onClick={() => setConfirmId(group.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Удалить
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gray-100 pt-6 space-y-4">
        <h3 className="font-medium text-gray-900">Новая группа</h3>
        <input
          type="text"
          aria-label="Название группы"
          value={name}
          maxLength={255}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название группы"
          className={inputClass}
        />
        {tests.length === 0 ? (
          <p className="text-sm text-gray-500">Сначала создайте тесты, чтобы собрать из них группу.</p>
        ) : (
          <ul className="space-y-2">
            {tests.map((test) => (
              <li key={test.id}>
                <label className="flex items-center gap-3 text-gray-800">
                  <input
                    type="checkbox"
                    aria-label={`Тест ${test.title} в группе`}
                    checked={selected.includes(test.id)}
                    onChange={() => toggle(test.id)}
                    className="h-5 w-5 accent-blue-600"
                  />
                  {test.title}
                </label>
              </li>
            ))}
          </ul>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={create}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-3 rounded-2xl"
        >
          Создать группу
        </button>
      </div>
    </section>
  );
}