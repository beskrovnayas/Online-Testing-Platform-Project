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
    class Meta:
        model = Test
        fields = ['id', 'title', 'description', 'time_limit', 'author']
        read_only_fields = ['author']


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
            correct_option = answer.question.options.filter(is_correct=True).first()
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


class SubmitAnswersSerializer(serializers.Serializer):
    test_id = serializers.IntegerField()
    answers = serializers.DictField(
        child=serializers.IntegerField(),
        help_text="Словарь {question_id: selected_option_id}"
    )

    def validate_answers(self, value):
        if not value:
            raise serializers.ValidationError("Список ответов не может быть пустым.")
        return value
