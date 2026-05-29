from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Test, TestAttempt, UserAnswer, Question, AnswerOption
from .serializers import SubmitAnswersSerializer, TestSerializer, QuestionSerializer, AnswerOptionSerializer, TestListSerializer, TestDetailSerializer
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsStudent, IsTeacherOrAdmin
from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import ValidationError

User = get_user_model()


class TestListView(APIView):
    # API для получения списка тестов.
    # GET /api/tests/

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.user_type == 'teacher':
            tests = Test.objects.filter(author=user)
        elif user.user_type == 'admin':
            tests = Test.objects.all()
        else:  # student
            tests = Test.objects.all()  # пока все тесты, позже добавим is_published

        tests = (
            tests
            .select_related('author')
            .annotate(questions_count=Count('questions'))
            .order_by('id')
        )

        serializer = TestListSerializer(tests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class TestDetailView(APIView):
    # API для получения конкретного теста с вопросами и вариантами ответов.
    # GET /api/tests/{id}/

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
    permission_classes = [IsAuthenticated, IsStudent]

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

        user = request.user

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


class TestViewSet(ModelViewSet):
    # CRUD для тестов (доступен учителям и админам)
    serializer_class = TestSerializer
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'admin':
            return Test.objects.all()
        return Test.objects.filter(author=user)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class QuestionViewSet(ModelViewSet):
    # CRUD для вопросов (только для своих тестов)
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'admin':
            return Question.objects.all()
        return Question.objects.filter(test__author=user)

    def perform_create(self, serializer):
        test = serializer.validated_data['test']
        if self.request.user.user_type != 'admin' and test.author != self.request.user:
            raise ValidationError("Можно добавлять вопросы только к своим тестам.")
        serializer.save()


class AnswerOptionViewSet(ModelViewSet):
    # CRUD для вариантов ответа (только для своих вопросов)
    serializer_class = AnswerOptionSerializer
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'admin':
            return AnswerOption.objects.all()
        return AnswerOption.objects.filter(question__test__author=user)

    def perform_create(self, serializer):
        question = serializer.validated_data['question']
        if self.request.user.user_type != 'admin' and question.test.author != self.request.user:
            raise ValidationError("Можно добавлять варианты только к своим вопросам.")
        serializer.save()