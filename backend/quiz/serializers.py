from rest_framework import serializers
from .models import Test, Question, AnswerOption, TestAttempt


class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ['id', 'question', 'text', 'is_correct']


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'test', 'text', 'question_type', 'order']


class TestSerializer(serializers.ModelSerializer):
    hidden_for = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Test
        fields = ['id', 'title', 'description', 'time_limit', 'author', 'is_published', 'hidden_for']
        read_only_fields = ['author', 'is_published', 'hidden_for']


class TestListSerializer(serializers.ModelSerializer):
    questions_count = serializers.IntegerField(read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Test
        fields = [
            'id',
            'title',
            'description',
            'time_limit',
            'questions_count',
            'author_username',
        ]


class TestDetailSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField()
    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Test
        fields = [
            'id',
            'title',
            'description',
            'time_limit',
            'author_username',
            'questions',
        ]

    def get_questions(self, obj):
        result = []
        for question in obj.questions.all().order_by('order', 'id'):
            options = [
                {'id': opt.id, 'text': opt.text}
                for opt in question.options.all()
            ]
            result.append({
                'id': question.id,
                'text': question.text,
                'question_type': question.question_type,
                'order': question.order,
                'options': options,
            })
        return result

class TestAttemptHistorySerializer(serializers.ModelSerializer):
    test_id = serializers.IntegerField(source='test.id', read_only=True)
    test_title = serializers.CharField(source='test.title', read_only=True)

    class Meta:
        model = TestAttempt
        fields = [
            'id',
            'test_id',
            'test_title',
            'score',
            'started_at',
            'finished_at',
        ]

class TestAttemptDetailSerializer(serializers.ModelSerializer):
    attempt_id = serializers.IntegerField(source='id', read_only=True)
    test_id = serializers.IntegerField(source='test.id', read_only=True)
    test_title = serializers.CharField(source='test.title', read_only=True)
    percentage = serializers.FloatField(source='score', read_only=True)
    total_questions = serializers.SerializerMethodField()
    correct_answers = serializers.SerializerMethodField()
    details = serializers.SerializerMethodField()

    class Meta:
        model = TestAttempt
        fields = [
            'attempt_id',
            'test_id',
            'test_title',
            'correct_answers',
            'total_questions',
            'percentage',
            'started_at',
            'finished_at',
            'details',
        ]

    def get_total_questions(self, obj):
        return obj.test.questions.count()

    def get_correct_answers(self, obj):
        return obj.user_answers.filter(is_correct=True).count()

    def get_details(self, obj):
        result = []
        for answer in obj.user_answers.select_related('question', 'selected_option').all():
            options = {opt.id: opt for opt in answer.question.options.all()}

            if answer.question.question_type == 'multiple':
                selected_ids = list(answer.selected_options)
                correct_ids = [opt.id for opt in options.values() if opt.is_correct]
                result.append({
                    'question_id': answer.question.id,
                    'question_text': answer.question.text,
                    'selected_option_ids': selected_ids,
                    'selected_option_texts': [options[i].text for i in selected_ids if i in options],
                    'correct_option_ids': correct_ids,
                    'correct_option_texts': [options[i].text for i in correct_ids],
                    'is_correct': answer.is_correct,
                })
            else:
                correct_option = next((opt for opt in options.values() if opt.is_correct), None)
                result.append({
                    'question_id': answer.question.id,
                    'question_text': answer.question.text,
                    'selected_option_id': answer.selected_option.id if answer.selected_option else None,
                    'selected_option_text': answer.selected_option.text if answer.selected_option else None,
                    'correct_option_id': correct_option.id if correct_option else None,
                    'correct_option_text': correct_option.text if correct_option else None,
                    'is_correct': answer.is_correct,
                })
        return result


class AttemptStatsSerializer(serializers.Serializer):
    attempts_total = serializers.IntegerField()
    tests_attempted = serializers.IntegerField()
    average_score = serializers.FloatField()
    best_score = serializers.FloatField()


class SubmitAnswersSerializer(serializers.Serializer):
    test_id = serializers.IntegerField()
    attempt_id = serializers.IntegerField()
    answers = serializers.DictField(help_text="Словарь {question_id: id | [id, ...]}")

    def validate_answers(self, value):
        if not value:
            raise serializers.ValidationError("Список ответов не может быть пустым.")
        for qid, ans in value.items():
            if isinstance(ans, int):
                continue
            if isinstance(ans, list) and all(isinstance(x, int) for x in ans):
                continue
            raise serializers.ValidationError(
                f"Ответ для вопроса {qid} должен быть int или list[int]"
            )
        return value
