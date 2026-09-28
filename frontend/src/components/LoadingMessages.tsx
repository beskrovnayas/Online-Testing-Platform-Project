export const loadingMessages = [
  "Загружаем список тестов...",
  "Соединение с сервером...",
  "Почти загрузилось...",
  "Еще немного...",
  "Подготавливаем данные...",
  "Почти готово...",
  "Раз, два, три... Сервер тесты принеси!"
];

export const errorMessages = {
  fetchTests: "Не удалось загрузить список тестов. Попробуйте снова",
  fetchTestDetail: "Не удалось загрузить тест",
  testNotFound: "Тест не найден",
  noId: "ID теста не найден",
  general: "Что-то пошло не так. Попробуйте позже",
} as const;

export const emptyStateMessages = {
  title: "Тестов пока что нет",
  description: "Сейчас нет доступных тестов",
  button: "Обновить",
} as const;

// Дополнительно для страницы конкреного теста
export const testDetailMessages = {
  loading: "Загружаем информацию о тесте...",
  backToList: "<— Вернуться к списку тестов",
  startTest: "Начать тест",
  duration: "мин",
} as const;