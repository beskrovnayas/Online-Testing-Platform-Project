from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from django.db.models import Count, Avg, Max
from django.utils import timezone

from .models import Test, TestAttempt, UserAnswer, Question, AnswerOption, ProctorEvent
from .serializers import (
    SubmitAnswersSerializer,
    TestSerializer,
    QuestionSerializer,
    AnswerOptionSerializer,
    TestListSerializer,
    TestDetailSerializer,
    TestAttemptHistorySerializer,
    TestAttemptDetailSerializer,
    AttemptStatsSerializer,
)
from users.models import CustomUser
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
            tests = Test.objects.filter(is_published=True).exclude(hidden_for=user)

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

class StartAttemptView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        try:
            test = Test.objects.get(pk=pk)
        except Test.DoesNotExist:
            return Response(
                {"error": "Тест не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        if not test.is_published:
            return Response(
                {"error": "Тест не опубликован"},
                status=status.HTTP_403_FORBIDDEN
            )

        if test.hidden_for.filter(pk=request.user.pk).exists():
            return Response(
                {"error": "Тест недоступен"},
                status=status.HTTP_403_FORBIDDEN
            )

        now = timezone.now()

        attempt = TestAttempt.objects.create(
            user=request.user,
            test=test,
            started_at=now,
            finished_at=None,
            score=0
        )

        expires_at = now + timedelta(minutes=test.time_limit)

        return Response(
            {
                "attempt_id": attempt.id,
                "started_at": now.isoformat(),
                "expires_at": expires_at.isoformat(),
                "server_now": now.isoformat(),
            },
            status=status.HTTP_201_CREATED
        )

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
        attempt_id = data['attempt_id']
        answers_data = data['answers']

        # 2. Получаем тест
        try:
            test = Test.objects.get(id=test_id)
        except Test.DoesNotExist:
            return Response(
                {"error": f"Тест с id {test_id} не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        if not test.is_published:
            return Response(
                {"error": "Тест не опубликован"},
                status=status.HTTP_403_FORBIDDEN
            )

        if test.hidden_for.filter(pk=request.user.pk).exists():
            return Response(
                {"error": "Тест недоступен"},
                status=status.HTTP_403_FORBIDDEN
            )

        user = request.user

        # 3. Получаем уже начатую попытку
        try:
            attempt = TestAttempt.objects.get(
                id=attempt_id,
                user=user,
                test=test,
            )
        except TestAttempt.DoesNotExist:
            return Response(
                {
                    "error": "Попытка не найдена",
                    "code": "attempt_not_found",
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if attempt.finished_at is not None:
            return Response(
                {
                    "error": "Попытка уже завершена",
                    "code": "attempt_finished",
                },
                status=status.HTTP_409_CONFLICT
            )

        now = timezone.now()
        expires_at = attempt.started_at + timedelta(minutes=test.time_limit)

        if now >= expires_at:
            attempt.finished_at = now
            attempt.save(update_fields=['finished_at'])

            return Response(
                {
                    "error": "Время прохождения теста истекло",
                    "code": "time_expired",
                },
                status=status.HTTP_408_REQUEST_TIMEOUT
            )

        # 4. Обрабатываем ответы
        correct_count = 0
        total_questions = test.questions.count()
        details = []          # детальная информация по каждому вопросу

        for question_id_str, user_input in answers_data.items():
            try:
                question_id = int(question_id_str)
            except (ValueError, TypeError):
                details.append({"question_id": question_id_str, "error": "Некорректный id"})
                continue

            try:
                question = test.questions.get(id=question_id)
            except Question.DoesNotExist:
                details.append({"question_id": question_id, "error": "Вопрос не в этом тесте"})
                continue

            # ---------- SINGLE ----------
            if question.question_type == 'single':
                if not isinstance(user_input, int):
                    details.append({"question_id": question_id, "error": "Ожидался один вариант"})
                    continue
                try:
                    selected_option = question.options.get(id=user_input)
                except AnswerOption.DoesNotExist:
                    details.append({"question_id": question_id, "error": "Вариант не найден"})
                    continue

                is_correct = selected_option.is_correct
                if is_correct:
                    correct_count += 1

                UserAnswer.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_option=selected_option,
                    selected_options=[],
                    is_correct=is_correct,
                    points=1 if is_correct else 0
                )

                correct_option = question.options.filter(is_correct=True).first()
                details.append({
                    "question_id": question.id,
                    "question_text": question.text,
                    "question_type": "single",
                    "selected_option_ids": [selected_option.id],
                    "selected_option_texts": [selected_option.text],
                    "is_correct": is_correct,
                    "correct_option_ids": [correct_option.id] if correct_option else [],
                    "correct_option_texts": [correct_option.text] if correct_option else [],
                })

            # ---------- MULTIPLE ----------
            elif question.question_type == 'multiple':
                if not isinstance(user_input, list):
                    details.append({"question_id": question_id, "error": "Ожидался список вариантов"})
                    continue

                selected_ids = set(user_input)
                all_option_ids = set(question.options.values_list('id', flat=True))
                if not selected_ids.issubset(all_option_ids):
                    details.append({"question_id": question_id, "error": "Есть чужой вариант"})
                    continue

                correct_ids = set(
                    question.options.filter(is_correct=True).values_list('id', flat=True)
                )
                is_correct = selected_ids == correct_ids
                if is_correct:
                    correct_count += 1

                selected_options = list(question.options.filter(id__in=selected_ids))
                correct_options = list(question.options.filter(is_correct=True))

                UserAnswer.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_option=None,
                    selected_options=list(selected_ids),
                    is_correct=is_correct,
                    points=1 if is_correct else 0
                )

                details.append({
                    "question_id": question.id,
                    "question_text": question.text,
                    "question_type": "multiple",
                    "selected_option_ids": [o.id for o in selected_options],
                    "selected_option_texts": [o.text for o in selected_options],
                    "is_correct": is_correct,
                    "correct_option_ids": [o.id for o in correct_options],
                    "correct_option_texts": [o.text for o in correct_options],
                })

            else:
                # text — оставляем на другой спринт
                details.append({"question_id": question_id, "error": "Тип вопроса не поддержан"})
                continue

        # 5. Считаем процент
        percentage = 0
        if total_questions > 0:
            percentage = int((correct_count / total_questions) * 100)

        # 6. Обновляем score попытки
        attempt.score = percentage
        attempt.finished_at = timezone.now()
        attempt.save(update_fields=['score', 'finished_at'])

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


class AttemptStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        attempts = TestAttempt.objects.filter(user=request.user)
        aggregates = attempts.aggregate(
            attempts_total=Count('id'),
            tests_attempted=Count('test', distinct=True),
            average_score=Avg('score'),
            best_score=Max('score'),
        )
        serializer = AttemptStatsSerializer({
            'attempts_total': aggregates['attempts_total'],
            'tests_attempted': aggregates['tests_attempted'],
            'average_score': aggregates['average_score'] or 0,
            'best_score': aggregates['best_score'] or 0,
        })
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

    @action(detail=True, methods=['post'], url_path='hide-for')
    def hide_for(self, request, pk=None):
        test = self.get_object()
        try:
            target = CustomUser.objects.get(pk=request.data.get('user_id'))
        except (CustomUser.DoesNotExist, ValueError, TypeError):
            return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)
        test.hidden_for.add(target)
        return Response(TestSerializer(test).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unhide-for')
    def unhide_for(self, request, pk=None):
        test = self.get_object()
        try:
            target = CustomUser.objects.get(pk=request.data.get('user_id'))
        except (CustomUser.DoesNotExist, ValueError, TypeError):
            return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)
        test.hidden_for.remove(target)
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

class ProctorEventView(APIView):
    """
    POST /api/proctor/event/
    Принимает события прокторинга от фронтенда:
    {
        "attempt_id": 7,
        "event_type": "copy_attempt",
        "details": {"selected_text": "..."}
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        attempt_id = request.data.get('attempt_id')
        event_type = request.data.get('event_type')
        details = request.data.get('details', {})

        if not attempt_id or not event_type:
            return Response(
                {"error": "attempt_id и event_type обязательны"},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_types = [t[0] for t in ProctorEvent.EVENT_TYPES]
        if event_type not in valid_types:
            return Response(
                {"error": f"Недопустимый event_type. Доступные: {valid_types}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            attempt = TestAttempt.objects.get(id=attempt_id, user=request.user)
        except TestAttempt.DoesNotExist:
            return Response(
                {"error": "Попытка не найдена или принадлежит другому пользователю"},
                status=status.HTTP_404_NOT_FOUND
            )

        event = ProctorEvent.objects.create(
            attempt=attempt,
            event_type=event_type,
            details=details
        )

        return Response(
            {"id": event.id, "status": "ok"},
            status=status.HTTP_201_CREATED
        )