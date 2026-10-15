import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import AttemptDetails from '../features/test-passing/AttemptDetails';
import TestResultDetails from '../features/test-passing/TestResultDetails';
import usePassingAttempt from '../features/test-passing/usePassingAttempt';
import { clearAttempt } from '../features/test-passing/session';


function formatRemaining(totalSeconds: number, showHours: boolean): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (showHours) {
    return `${String(hours).padStart(2, '0')}:${mm}:${ss}`;
  }
  // для тестов < 60 мин
  const totalMin = Math.floor(s / 60);
  return `${String(totalMin).padStart(2, '0')}:${ss}`;
}

export default function TakeTest() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const attemptId = params.get('attempt');
  if (attemptId !== null) return <AttemptDetails key={attemptId} attemptId={attemptId} />;
  return <TestPassing key={id} testId={Number(id)} />;
}

function TestPassing({ testId }: { testId: number }) {
  const {
    test, answers, result, loading, submitting, error, submitError, validationError, expired, closed,
    expiresAt,
    selectAnswer, submit, retryLoad,
  } = usePassingAttempt(testId);

  const showHours = (test?.duration ?? 0) >= 60;
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!expiresAt || result || closed) return;

    const tick = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, result, closed]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <p role="status" className="text-xl text-gray-700">Загружаем тест...</p>
      </main>
    );
  }

  if (error || !test) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div role="alert" className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error?.kind === 'unavailable' ? 'Тест недоступен' : 'Не удалось открыть тест'}
          </h1>
          <p className="text-gray-600 mb-6">{error?.message ?? 'Тест не найден.'}</p>
          {error?.kind === 'network' && (
            <button onClick={retryLoad} className="block text-blue-600 mx-auto mb-4">
              Попробовать снова
            </button>
          )}
          {error?.kind === 'auth' && (
            <Link to="/login" className="block text-blue-600 mb-4">Войти</Link>
          )}
          <Link to="/tests" className="text-blue-600">Вернуться к списку тестов</Link>
        </div>
      </main>
    );
  }

  const answeredCount = test.questions.filter((question) => {
    const value = answers[question.id];
    return Array.isArray(value) ? value.length > 0 : value !== undefined;
  }).length;

  const progress = test.questions.length ? Math.round(answeredCount / test.questions.length * 100) : 0;
  const unsupportedQuestions = test.questions.some((question) => question.questionType === 'text');
  const disabled = closed || expired || submitting || Boolean(result) || submitError?.kind === 'auth';

  return (
    <main className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link to={closed || expired ? '/tests' : `/tests/${testId}`} className="inline-block text-blue-600 font-medium mb-8">
          {closed || expired ? 'Вернуться к списку тестов' : 'Вернуться к описанию теста'}
        </Link>
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 mb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-3">Прохождение теста</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{test.title}</h1>
              <p className="text-gray-700 leading-relaxed">{test.description}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-5 min-w-full md:min-w-52">
              <p className="text-gray-500 text-sm">
                {expired ? 'Время истекло' : 'Осталось времени'}
              </p>

              <p
                className={`text-2xl font-semibold mb-4 tabular-nums ${
                  expired || remainingSeconds <= 60 ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {expired
                  ? (showHours ? '00:00:00' : '00:00')
                  : formatRemaining(remainingSeconds, showHours)}
              </p>
              <p className="text-gray-500 text-sm">Прогресс</p>
              <p className="text-2xl font-semibold text-gray-900">{answeredCount} из {test.questions.length}</p>
            </div>
          </div>
          <div className="mt-8 h-3 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-label="Ответы на вопросы" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {expired && <div role="status" className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-amber-900">Время прохождения истекло</h2>
          <p className="text-amber-900 mt-2">
            {submitting ? 'Отправляем выбранные ответы...' : result ? 'Результат показан ниже.' : 'Изменение ответов завершено.'}
          </p>
        </div>}

        {closed && !result && !expired && !submitError && <p role="status" className="bg-white rounded-2xl p-5 mb-6">
          Эта попытка уже завершена. Её результат можно открыть из истории прохождений.
        </p>}

        {result && <TestResultDetails result={result} />}

        {unsupportedQuestions && !closed && <div role="status" className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          В этом тесте есть вопросы, для которых выбор ответов пока недоступен. Завершение теста вручную будет доступно после обновления интерфейса.
        </div>}

        <div className="space-y-6">

          {test.questions.map((question, index) => {
          const isMultiple = question.questionType === 'multiple';
          const isSingle = question.questionType === 'single';
          const isUnsupported = question.questionType === 'text';

          const raw = answers[question.id];
          const selectedIds: number[] = Array.isArray(raw)
            ? raw
            : raw !== undefined
              ? [raw]
              : [];

          const handleToggle = (optionId: number) => {
            if (isMultiple) {
              const next = selectedIds.includes(optionId)
                ? selectedIds.filter((id) => id !== optionId)
                : [...selectedIds, optionId];
              selectAnswer(question.id, next);
              return;
            }
            // один ответ
            selectAnswer(question.id, optionId);
          };

          return (
            <fieldset
              key={question.id}
              disabled={disabled || isUnsupported}
              className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 sm:p-8"
            >
              <legend className="text-xl font-semibold text-gray-900 px-2">
                {index + 1}. {question.text}
                {isMultiple && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    (можно выбрать несколько)
                  </span>
                )}
              </legend>

              {isUnsupported ? (
                <p className="text-gray-600">
                  Выбор ответов для этого типа вопроса пока что недоступен.
                </p>
              ) : (
                <div className="space-y-3">
                  {question.options.map((option) => {
                    const selected = selectedIds.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-4 rounded-2xl border p-4 ${
                          selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                        } ${disabled ? '' : 'cursor-pointer hover:bg-gray-50'}`}
                      >
                        <input
                          type={isMultiple ? 'checkbox' : 'radio'}
                          name={`question-${question.id}`}
                          value={option.id}
                          checked={selected}
                          onChange={() => handleToggle(option.id)}
                          className="peer sr-only"
                        />
                        
                        <span
                          className={`mt-0.5 h-5 w-5 shrink-0 border-2 ${
                            isMultiple ? 'rounded-md' : 'rounded-full'
                          } ${
                            selected
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300 bg-white'
                          }`}
                          aria-hidden
                        />
                        <span className="text-gray-800">{option.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          );
        })}
        </div>

        {validationError && <p role="alert" className="mt-6 bg-red-50 text-red-700 rounded-2xl p-4">{validationError}</p>}
        {submitError && <div role="alert" className="mt-6 bg-red-50 text-red-700 rounded-2xl p-4">
          <p>{submitError.message}</p>
          {submitError.kind === 'auth' && <Link to="/login" className="inline-block text-blue-600 mt-3">Войти</Link>}
        </div>}

        {!closed && !result && <div className="sticky bottom-0 mt-8 bg-gray-50/95 backdrop-blur py-5">
          <button onClick={() => void submit(expired)} disabled={submitting || submitError?.kind === 'auth' || (!expired && unsupportedQuestions)} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 rounded-2xl text-lg">
            {submitting ? 'Отправляем ответы...' : expired ? 'Повторить отправку выбранных ответов' : 'Завершить тест'}
          </button>
        </div>}
        {closed && <div className="mt-6 flex flex-wrap gap-4">
          <Link to="/tests" className="text-blue-600">Вернуться к списку тестов</Link>
          <button onClick={() => { clearAttempt(testId); window.location.reload(); }} className="text-blue-600">Начать новую попытку</button>
        </div>}
      </div>
    </main>
  );
}
