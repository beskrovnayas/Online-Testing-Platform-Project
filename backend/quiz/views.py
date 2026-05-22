from django.db.models import Count
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Test, TestAttempt, UserAnswer
from .serializers import (
    SubmitAnswersSerializer,
    TestListSerializer,
    TestDetailSerializer,
)


User = get_user_model()


class TestListView(APIView):
    """
    API для получения списка тестов.

    GET /api/tests/
    """

    def get(self, request):
        tests = (
            Test.objects
            .select_related('author')
            .annotate(questions_count=Count('questions'))
            .order_by('id')
        )

        serializer = TestListSerializer(tests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TestDetailView(APIView):
    """
    API для получения конкретного теста с вопросами и вариантами ответов.

    GET /api/tests/{id}/
    """

    def get(self, request, pk):
        try:
            test = (
                Test.objects
                .select_related('author')
                .prefetch_related('questions__options')
                .get(pk=pk)
            )
        except Test.DoesNotExist:
            return Response(
                {"error": "Тест не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TestDetailSerializer(test)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SubmitAnswersView(APIView):
    """
    API для отправки ответов пользователя и получения результата.

    POST /api/submit-answers/

    Ожидает JSON:

    {
        "test_id": 1,
        "answers": {
            "10": 5,
            "11": 2
        }
    }
    """

    def post(self, request):
        serializer = SubmitAnswersSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {
                    "error": "Неверный формат данных",
                    "details": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        test_id = data['test_id']
        answers_data = data['answers']

        try:
            test = Test.objects.get(id=test_id)
        except Test.DoesNotExist:
            return Response(
                {"error": f"Тест с id {test_id} не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            user = User.objects.get(id=1)
        except User.DoesNotExist:
            return Response(
                {"error": "Пользователь не найден. Создайте пользователя с id=1."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        attempt = TestAttempt.objects.create(
            user=user,
            test=test,
            started_at=timezone.now(),
            finished_at=timezone.now(),
            score=0.0
        )

        correct_count = 0
        total_questions = test.questions.count()

        for question_id_str, selected_option_id in answers_data.items():
            try:
                question_id = int(question_id_str)
            except ValueError:
                return Response(
                    {"error": f"Некорректный id вопроса: {question_id_str}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                question = test.questions.get(id=question_id)
            except test.questions.model.DoesNotExist:
                return Response(
                    {"error": f"Вопрос с id {question_id} не найден в этом тесте"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                selected_option = question.options.get(id=selected_option_id)
            except question.options.model.DoesNotExist:
                return Response(
                    {
                        "error": (
                            f"Вариант ответа с id {selected_option_id} "
                            f"не найден у вопроса с id {question_id}"
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            is_correct = selected_option.is_correct

            if is_correct:
                correct_count += 1

            UserAnswer.objects.create(
                attempt=attempt,
                question=question,
                selected_option=selected_option,
                selected_options=[],
                text_answer='',
                is_correct=is_correct,
                points=1 if is_correct else 0
            )

        percentage = 0

        if total_questions > 0:
            percentage = int((correct_count / total_questions) * 100)

        attempt.score = percentage
        attempt.save(update_fields=['score'])

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