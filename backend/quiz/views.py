from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Test, TestAttempt, UserAnswer
from .serializers import SubmitAnswersSerializer

User = get_user_model()

class SubmitAnswersView(APIView):
    # Эндпоинт для отправки ответов пользователя и получения результата.
    # Ожидает POST-запрос с JSON:
    # {
    #     "test_id": 1,
    #     "answers": {
    #         "10": 5,
    #         "11": 2,
    #         ...
    #     }
    # }

    def post(self, request):
        # 1. Валидация входных данных
        serializer = SubmitAnswersSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Неверный формат данных", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        test_id = data['test_id']
        answers_data = data['answers']

        # 2. Получаем тест или возвращаем 404
        try:
            test = Test.objects.get(id=test_id)
        except Test.DoesNotExist:
            return Response(
                {"error": f"Тест с id {test_id} не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        # 3. Временно берём фиксированного пользователя (потом заменим на request.user)
        try:
            user = User.objects.get(id=1)
        except User.DoesNotExist:
            return Response(
                {"error": "Пользователь не найден. Создайте пользователя с id=1."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 4. Создаём запись о попытке прохождения теста
        attempt = TestAttempt.objects.create(
            user=user,
            test=test,
            started_at=timezone.now(),          # можно также брать из request, но пока так
            finished_at=timezone.now(),         # завершаем сразу после отправки
            score=0.0
        )

        # 5. Обрабатываем каждый ответ
        correct_count = 0
        total_questions = test.questions.count()

        for question_id_str, selected_option_id in answers_data.items():
            try:
                question_id = int(question_id_str)
            except ValueError:
                # Если ключ не число — пропускаем с логированием (можно вернуть ошибку)
                continue

            # Проверяем, существует ли вопрос и принадлежит ли он этому тесту
            try:
                question = test.questions.get(id=question_id)
            except Test.questions.model.DoesNotExist:
                # Вопрос не найден в этом тесте — можно пропустить или вернуть ошибку
                continue

            # Проверяем, существует ли вариант ответа и принадлежит ли он этому вопросу
            try:
                selected_option = question.options.get(id=selected_option_id)
            except question.options.model.DoesNotExist:
                # Неверный вариант — пропускаем вопрос (или можно вернуть ошибку)
                continue

            # Определяем правильность ответа
            is_correct = selected_option.is_correct
            if is_correct:
                correct_count += 1

            # Сохраняем ответ пользователя
            UserAnswer.objects.create(
                attempt=attempt,
                question=question,
                selected_option=selected_option,
                selected_options=[],      # для multiple choice не используется
                text_answer='',           # для открытых вопросов не используется
                is_correct=is_correct,
                points=1 if is_correct else 0
            )

        # 6. Рассчитываем процент выполнения
        percentage = 0
        if total_questions > 0:
            percentage = int((correct_count / total_questions) * 100)

        # 7. Обновляем score попытки (процент) для истории
        attempt.score = percentage
        attempt.save(update_fields=['score'])

        # 8. Возвращаем результат
        return Response(
            {
                "attempt_id": attempt.id,
                "correct_answers": correct_count,
                "total_questions": total_questions,
                "percentage": percentage,
                "message": "Тест успешно завершён"
            },
            status=status.HTTP_200_OK
        )