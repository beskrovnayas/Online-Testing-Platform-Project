from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from django.db.models import Count
from django.utils import timezone

from .models import Test, TestAttempt, UserAnswer, Question, AnswerOption
from .serializers import (
    SubmitAnswersSerializer,
    TestSerializer,
    QuestionSerializer,
    AnswerOptionSerializer,
    TestListSerializer,
    TestDetailSerializer,
    TestAttemptHistorySerializer,
    TestAttemptDetailSerializer,
)
from users.permissions import IsStudent, IsTeacherOrAdmin

class TestListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.user_type == 'teacher':
            tests = Test.objects.filter(author=user)
        elif user.user_type == 'admin':
            tests = Test.objects.all()
        else:  # student
            tests = Test.objects.filter(is_published=True)

        tests = (
            tests
            .select_related('author')
            .annotate(questions_count=Count('questions'))
            .order_by('id')
        )

        serializer = TestListSerializer(tests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    permission_classes = [IsAuthenticated]

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

        # 2. Получаем тест
        try:
            test = Test.objects.get(id=test_id)
        except Test.DoesNotExist:
            return Response(
                {"error": f"Тест с id {test_id} не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user

        # 3. Создаём попытку прохождения
        attempt = TestAttempt.objects.create(
            user=user,
            test=test,
            started_at=timezone.now(),
            finished_at=timezone.now(),
            score=0.0
        )

        # 4. Обрабатываем ответы
        correct_count = 0
        total_questions = test.questions.count()
        details = []          # детальная информация по каждому вопросу

        for question_id_str, selected_value in answers_data.items():
            # Приводим ключ к int
            try:
                question_id = int(question_id_str)
            except (ValueError, TypeError):
                details.append({
                    "question_id": question_id_str,
                    "error": "Некорректный id вопроса"
                })
                continue

            # Ищем вопрос в рамках теста
            try:
                question = test.questions.get(id=question_id)
            except Question.DoesNotExist:
                details.append({
                    "question_id": question_id,
                    "error": "Вопрос не найден в этом тесте"
                })
                continue

            if question.question_type == 'multiple':
                # Для вопросов с несколькими ответами ждём список id вариантов
                selected_ids = selected_value if isinstance(selected_value, list) else [selected_value]
                try:
                    selected_ids = [int(option_id) for option_id in selected_ids]
                except (ValueError, TypeError):
                    details.append({
                        "question_id": question_id,
                        "error": "Некорректный вариант ответа"
                    })
                    continue

                selected_options = list(question.options.filter(id__in=selected_ids))
                if len(selected_options) != len(set(selected_ids)):
                    details.append({
                        "question_id": question_id,
                        "selected_option_ids": selected_ids,
                        "error": "Вариант не найден у этого вопроса"
                    })
                    continue

                correct_options = list(question.options.filter(is_correct=True))
                is_correct = set(selected_ids) == {option.id for option in correct_options}
                if is_correct:
                    correct_count += 1

                # Сохраняем ответ пользователя
                UserAnswer.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_option=None,
                    selected_options=selected_ids,
                    text_answer='',
                    is_correct=is_correct,
                    points=1 if is_correct else 0
                )

                details.append({
                    "question_id": question.id,
                    "question_text": question.text,
                    "selected_option_ids": [option.id for option in selected_options],
                    "selected_option_texts": [option.text for option in selected_options],
                    "is_correct": is_correct,
                    "correct_option_ids": [option.id for option in correct_options],
                    "correct_option_texts": [option.text for option in correct_options],
                })
                continue

            # Вопрос с одним правильным ответом (как было раньше)
            if isinstance(selected_value, list):
                details.append({
                    "question_id": question_id,
                    "error": "Для этого вопроса можно выбрать только один вариант"
                })
                continue

            try:
                selected_option_id = int(selected_value)
            except (ValueError, TypeError):
                details.append({
                    "question_id": question_id,
                    "error": "Некорректный вариант ответа"
                })
                continue

            # Ищем вариант ответа в рамках вопроса
            try:
                selected_option = question.options.get(id=selected_option_id)
            except AnswerOption.DoesNotExist:
                details.append({
                    "question_id": question_id,
                    "selected_option_id": selected_option_id,
                    "error": "Вариант не найден у этого вопроса"
                })
                continue

            is_correct = selected_option.is_correct
            if is_correct:
                correct_count += 1

            # Сохраняем ответ пользователя
            UserAnswer.objects.create(
                attempt=attempt,
                question=question,
                selected_option=selected_option,
                selected_options=[],
                text_answer='',
                is_correct=is_correct,
                points=1 if is_correct else 0
            )

            # Ищем правильный вариант для отображения в результате
            correct_option = question.options.filter(is_correct=True).first()

            details.append({
                "question_id": question.id,
                "question_text": question.text,
                "selected_option_id": selected_option.id,
                "selected_option_text": selected_option.text,
                "is_correct": is_correct,
                "correct_option_id": correct_option.id if correct_option else None,
                "correct_option_text": correct_option.text if correct_option else None,
            })

        # 5. Считаем процент
        percentage = 0
        if total_questions > 0:
            percentage = int((correct_count / total_questions) * 100)

        # 6. Обновляем score попытки
        attempt.score = percentage
        attempt.save(update_fields=['score'])

        # 7. Возвращаем результат
        return Response(
            {
                "attempt_id": attempt.id,
                "test_id": test.id,
                "test_title": test.title,
                "correct_answers": correct_count,
                "total_questions": total_questions,
                "percentage": percentage,
                "message": "Тест успешно завершён",
                "details": details,
            },
            status=status.HTTP_200_OK
        )


class TestAttemptListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        attempts = (
            TestAttempt.objects
            .filter(user=request.user)
            .select_related('test')
            .order_by('-started_at')
        )
        serializer = TestAttemptHistorySerializer(attempts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TestAttemptDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            attempt = (
                TestAttempt.objects
                .select_related('test')
                .prefetch_related('user_answers__question__options', 'user_answers__selected_option')
                .get(pk=pk, user=request.user)
            )
        except TestAttempt.DoesNotExist:
            return Response(
                {"error": "Попытка не найдена"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TestAttemptDetailSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TestViewSet(ModelViewSet):
    serializer_class = TestSerializer
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'admin':
            return Test.objects.all()
        return Test.objects.filter(author=user)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        test = self.get_object()
        test.is_published = True
        test.save(update_fields=['is_published'])
        return Response(TestSerializer(test).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        test = self.get_object()
        test.is_published = False
        test.save(update_fields=['is_published'])
        return Response(TestSerializer(test).data, status=status.HTTP_200_OK)


class QuestionViewSet(ModelViewSet):
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
