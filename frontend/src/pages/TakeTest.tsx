import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getTestById,
  submitTestAnswers,
  type FullTest,
  type TestResult,
} from '../api/testAPI';
import { errorMessages, loadingMessages, testDetailMessages } from '../components/LoadingMessages';

type SelectedAnswers = Record<number, number>;

export default function TakeTest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<FullTest | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswers>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  const answeredCount = useMemo(() => Object.keys(selectedAnswers).length, [selectedAnswers]);
  const totalQuestions = test?.questions.length ?? 0;
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  useEffect(() => {
    const fetchTest = async () => {
      if (!id) {
        setError(errorMessages.noId);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getTestById(Number(id));
        setTest(data);
      } catch (err) {
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

  const handleSelectAnswer = (questionId: number, optionId: number) => {
    setValidationError(null);
    setSubmitError(null);
    setSelectedAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async () => {
    if (!test || !id) return;

    const unansweredQuestion = test.questions.find((question) => !selectedAnswers[question.id]);

    if (unansweredQuestion) {
      setValidationError('Ответьте на все вопросы перед завершением теста');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const answers = test.questions.map((question) => ({
        questionId: question.id,
        optionId: selectedAnswers[question.id],
      }));

      const data = await submitTestAnswers(Number(id), answers);
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setSubmitError('Не удалось отправить ответы. Попробуйте снова');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Ошибка</h2>
          <p className="text-gray-600 mb-6">{error || errorMessages.testNotFound}</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button
          onClick={() => navigate(`/tests/${id}`)}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8 flex items-center gap-2"
        >
          {testDetailMessages.backToList.replace('списку тестов', 'описанию теста')}
        </button>

        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 mb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-3">Прохождение теста</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {test.title}
              </h1>
              <p className="text-gray-700 leading-relaxed">{test.description}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 min-w-full md:min-w-52">
              <p className="text-gray-500 text-sm">Время</p>
              <p className="text-2xl font-semibold text-gray-900 mb-4">{test.duration} мин</p>
              <p className="text-gray-500 text-sm">Прогресс</p>
              <p className="text-2xl font-semibold text-gray-900">
                {answeredCount} из {totalQuestions}
              </p>
            </div>
          </div>

          <div className="mt-8 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {result && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 sm:p-8 mb-8">
            <p className="text-sm font-semibold text-emerald-700 mb-2">Результат сохранен</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Ваш результат: {result.correctAnswers} из {result.totalQuestions}
            </h2>
            <p className="text-xl text-emerald-700 font-semibold">Процент: {result.percentage}%</p>
          </div>
        )}

        <div className="space-y-6">
          {test.questions.map((question, questionIndex) => (
            <section
              key={question.id}
              className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 sm:p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                  {questionIndex + 1}
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-snug">
                  {question.text}
                </h2>
              </div>

              <div className="space-y-3">
                {question.options.map((option) => {
                  const isSelected = selectedAnswers[question.id] === option.id;

                  return (
                    <label
                      key={option.id}
                      className={`flex items-start gap-4 rounded-2xl border p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => handleSelectAnswer(question.id, option.id)}
                        disabled={Boolean(result) || submitting}
                        className="mt-1 h-5 w-5 accent-blue-600"
                      />
                      <span className="text-gray-800 leading-relaxed">{option.text}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {validationError && (
          <div className="mt-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4">
            {validationError}
          </div>
        )}

        {submitError && (
          <div className="mt-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4">
            {submitError}
          </div>
        )}

        {!result && (
          <div className="sticky bottom-0 mt-8 bg-gray-50/95 backdrop-blur py-5">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 rounded-2xl text-lg transition-all active:scale-95"
            >
              {submitting ? 'Отправляем ответы...' : 'Завершить тест'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
