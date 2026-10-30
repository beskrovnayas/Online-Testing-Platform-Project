import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createFullTest,
  describeBuilderError,
  hasErrors,
  MAX_OPTIONS,
  MIN_OPTIONS,
  newOption,
  newQuestion,
  OPTION_MAX,
  TITLE_MAX,
  validateDraft,
  type DraftQuestion,
  type DraftTest,
  type QuestionKind,
} from '../api/builder';

// пока на странице прохождения нельзя выбрать несколько вариантов (ридми в features/test-passing),
// показываем предупреждение. Когда это появится, удалим константу и блок, где она используется
const MULTIPLE_NOTE =
  'Ученики пока не смогут отметить несколько вариантов на странице теста: этот режим заработает после доработки страницы прохождения.';

const inputClass =
  'w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500';
const smallBtn =
  'text-sm font-medium px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40';

export default function TeacherCreateTest() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState('30');
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [newQuestion()]);

  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const draft: DraftTest = { title, description, timeLimit: Number(timeLimit), questions };
  // после первой попытки сохранения ошибки пересчитываются по мере исправления
  const errors = attempted ? validateDraft(draft) : null;

  const updateQuestion = (key: string, change: (q: DraftQuestion) => DraftQuestion) =>
    setQuestions((current) => current.map((q) => (q.key === key ? change(q) : q)));

  const removeQuestion = (key: string) => setQuestions((current) => current.filter((q) => q.key !== key));

  const move = (index: number, delta: number) =>
    setQuestions((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const setKind = (key: string, kind: QuestionKind) =>
    updateQuestion(key, (q) => {
      if (kind === 'multiple') return { ...q, kind };
      
      let kept = false;
      return {
        ...q,
        kind,
        options: q.options.map((o) => {
          if (o.correct && !kept) {
            kept = true;
            return o;
          }
          return { ...o, correct: false };
        }),
      };
    });

  const setCorrect = (qKey: string, oKey: string, checked: boolean) =>
    updateQuestion(qKey, (q) => ({
      ...q,
      options: q.options.map((o) => {
        if (q.kind === 'single') return { ...o, correct: o.key === oKey };
        return o.key === oKey ? { ...o, correct: checked } : o;
      }),
    }));

  const setOptionText = (qKey: string, oKey: string, text: string) =>
    updateQuestion(qKey, (q) => ({ ...q, options: q.options.map((o) => (o.key === oKey ? { ...o, text } : o)) }));

  const addOption = (qKey: string) =>
    updateQuestion(qKey, (q) => (q.options.length >= MAX_OPTIONS ? q : { ...q, options: [...q.options, newOption()] }));

  const removeOption = (qKey: string, oKey: string) =>
    updateQuestion(qKey, (q) =>
      q.options.length <= MIN_OPTIONS ? q : { ...q, options: q.options.filter((o) => o.key !== oKey) },
    );

  const save = async () => {
    setAttempted(true);
    if (hasErrors(validateDraft(draft))) return;
    setSaving(true);
    setSaveError(null);
    setProgress(null);
    try {
      await createFullTest(draft, (done, total) => setProgress(`Сохраняем: ${done} из ${total}`));
      navigate('/teacher/tests', { state: { created: title.trim() } });
    } catch (error) {
      setSaveError(describeBuilderError(error));
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-6">
        <button
          onClick={() => navigate('/teacher/tests')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          ← К управлению тестами
        </button>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Создание теста</h1>
        <p className="text-gray-600 text-lg mb-10">
          Заполните данные и вопросы. Тест сохранится как черновик, опубликовать его можно в «Управлении тестами».
        </p>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название теста *
              <input
                type="text"
                aria-label="Название теста"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название"
                className={`${inputClass} mt-2 font-normal`}
              />
            </label>
            {errors?.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
              <textarea
                aria-label="Описание теста"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание"
                rows={3}
                className={`${inputClass} mt-2 font-normal resize-y`}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Время на прохождение (мин)
              <input
                type="number"
                aria-label="Время на прохождение, минут"
                min={1}
                max={600}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                className={`${inputClass} mt-2 max-w-xs font-normal`}
              />
            </label>
            {errors?.timeLimit && <p className="text-sm text-red-600 mt-1">{errors.timeLimit}</p>}
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Вопросы ({questions.length})</h2>

            {questions.map((q, qi) => (
              <section
                key={q.key}
                aria-label={`Вопрос ${qi + 1}`}
                className="border border-gray-200 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">Вопрос {qi + 1}</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Поднять вопрос ${qi + 1}`}
                      disabled={qi === 0 || saving}
                      onClick={() => move(qi, -1)}
                      className={smallBtn}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Опустить вопрос ${qi + 1}`}
                      disabled={qi === questions.length - 1 || saving}
                      onClick={() => move(qi, 1)}
                      className={smallBtn}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`Удалить вопрос ${qi + 1}`}
                      disabled={saving}
                      onClick={() => removeQuestion(q.key)}
                      className={`${smallBtn} text-red-600`}
                    >
                      Удалить
                    </button>
                  </div>
                </div>

                <textarea
                  aria-label={`Текст вопроса ${qi + 1}`}
                  value={q.text}
                  onChange={(e) => updateQuestion(q.key, (cur) => ({ ...cur, text: e.target.value }))}
                  placeholder="Текст вопроса"
                  rows={2}
                  className={`${inputClass} resize-y`}
                />

                <div>
                  <label className="block text-sm text-gray-600">
                    Тип вопроса
                    <select
                      aria-label={`Тип вопроса ${qi + 1}`}
                      value={q.kind}
                      onChange={(e) => setKind(q.key, e.target.value as QuestionKind)}
                      className={`${inputClass} mt-1`}
                    >
                      <option value="single">Один правильный ответ</option>
                      <option value="multiple">Несколько правильных ответов</option>
                    </select>
                  </label>
                  {q.kind === 'multiple' && <p className="text-xs text-amber-700 mt-2">{MULTIPLE_NOTE}</p>}
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Отметьте {q.kind === 'single' ? 'правильный вариант' : 'правильные варианты'} слева от текста.
                  </p>
                  <ul className="space-y-2">
                    {q.options.map((o, oi) => (
                      <li key={o.key} className="flex items-center gap-3">
                        <input
                          type={q.kind === 'single' ? 'radio' : 'checkbox'}
                          name={`correct-${q.key}`}
                          aria-label={`Правильный вариант ${oi + 1} вопроса ${qi + 1}`}
                          checked={o.correct}
                          onChange={(e) => setCorrect(q.key, o.key, e.target.checked)}
                          className="h-5 w-5 shrink-0 accent-emerald-600"
                        />
                        <input
                          type="text"
                          aria-label={`Вариант ${oi + 1} вопроса ${qi + 1}`}
                          value={o.text}
                          maxLength={OPTION_MAX}
                          onChange={(e) => setOptionText(q.key, o.key, e.target.value)}
                          placeholder={`Вариант ${oi + 1}`}
                          className={inputClass}
                        />
                        <button
                          type="button"
                          aria-label={`Удалить вариант ${oi + 1} вопроса ${qi + 1}`}
                          disabled={q.options.length <= MIN_OPTIONS || saving}
                          onClick={() => removeOption(q.key, o.key)}
                          className={smallBtn}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={q.options.length >= MAX_OPTIONS || saving}
                    onClick={() => addOption(q.key)}
                    className={`${smallBtn} mt-3`}
                  >
                    + Добавить вариант
                  </button>
                </div>

                {errors?.questions[q.key] && <p className="text-sm text-red-600">{errors.questions[q.key]}</p>}
              </section>
            ))}

            {errors?.general && <p className="text-sm text-red-600">{errors.general}</p>}

            <button
              type="button"
              disabled={saving}
              onClick={() => setQuestions((current) => [...current, newQuestion()])}
              className="text-sm font-medium px-4 py-2 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
            >
              + Добавить вопрос
            </button>
          </div>

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
              {saving ? (progress ?? 'Сохраняем...') : 'Сохранить тест'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/teacher/tests')}
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