import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import QuestionReview from '../components/QuestionReview';
import { getAttemptReview, type AttemptReview } from '../api/review';

const LEGEND = [
  { label: 'Верно', dot: 'bg-emerald-500' },
  { label: 'Частично верно', dot: 'bg-amber-400' },
  { label: 'Неверно', dot: 'bg-red-500' },
  { label: 'Без ответа', dot: 'bg-gray-300' },
];

const percentTone = (p: number) =>
  p < 50 ? 'text-red-600' : p < 80 ? 'text-amber-600' : 'text-emerald-600';

export default function AttemptReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const attemptId = Number(id);
  const invalid = !Number.isSafeInteger(attemptId) || attemptId <= 0;

  const [review, setReview] = useState<AttemptReview | null>(null);
  const [loading, setLoading] = useState(!invalid);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invalid) return;
    getAttemptReview(attemptId)
      .then(setReview)
      .catch((e: unknown) =>
        setError(
          axios.isAxiosError(e) && e.response?.status === 404
            ? 'Попытка не найдена'
            : 'Не удалось загрузить результаты. Обновите страницу',
        ),
      )
      .finally(() => setLoading(false));
  }, [attemptId, invalid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Загружаем результаты...</p>
      </div>
    );
  }

  if (invalid || error || !review) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-3">Ошибка</h2>
          <p className="text-gray-600 mb-6">{invalid ? 'Некорректный номер попытки' : error}</p>
          <button
            onClick={() => navigate('/stats')}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700"
          >
            ← К моей статистике
          </button>
        </div>
      </div>
    );
  }

  const percent = Math.round(review.percentage);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-6">
        <button
          onClick={() => navigate('/stats')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          ← К моей статистике
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <p className="text-sm font-semibold text-blue-600 mb-2">Результаты теста</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{review.testTitle}</h1>
          <p className={`text-4xl font-bold ${percentTone(percent)}`}>
            {review.correctAnswers} из {review.totalQuestions} · {percent}%
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Попытка №{review.attemptId}
            {review.finishedAt && `, завершена ${new Date(review.finishedAt).toLocaleString('ru-RU')}`}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm text-gray-600">
            {LEGEND.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${item.dot}`} aria-hidden />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          {review.questions.map((question, index) => (
            <QuestionReview key={question.id} question={question} index={index} />
          ))}
        </div>

        <button
          onClick={() => navigate('/tests')}
          className="mt-8 w-full bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-2xl hover:bg-gray-50"
        >
          ← К списку тестов
        </button>
      </div>
    </div>
  );
}