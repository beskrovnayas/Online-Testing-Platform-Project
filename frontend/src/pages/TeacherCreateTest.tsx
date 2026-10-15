import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TeacherCreateTest() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);

  const canSave = title.trim().length > 0 && duration > 0;

  const handleSave = () => {
    if (!canSave) return;
    // POST на бэкенд, каркас для Никиты
    // и его задачи "Реализовать на frontend добавление вопросов и вариантов ответов,
    // выбор правильного ответа и отправку заполненного теста на backend"
    console.log('Draft test:', { title, description, duration, questions: [] });
    alert('Это каркас сохранения. Отправку на backend сделает Никита.');
  };

  const handleAddQuestion = () => {
    alert('Добавление вопросов на Никите');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-6">
        <button
          onClick={() => navigate('/teacher/tests')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          ← К управлению тестами
        </button>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Создание теста
        </h1>
        <p className="text-gray-600 text-lg mb-10">
          Заполните основные данные. Добавление позже (Никита).
          Может добавить возможность прикреплять к вопросам картинки?
        </p>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название теста *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание"
              rows={4}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Время на прохождение (минуты) *
            </label>
            <input
              type="number"
              min={1}
              max={600}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 0)}
              className="w-full max-w-xs rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Вопросы</h2>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="text-sm font-medium px-4 py-2 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                + Добавить вопрос
              </button>
            </div>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-2xl p-4">
              Пока список вопросов пуст. Добавление позже (Никита).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-2xl"
            >
              Сохранить тест
            </button>
            <button
              type="button"
              onClick={() => navigate('/teacher/tests')}
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