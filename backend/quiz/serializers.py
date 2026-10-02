from rest_framework import serializers
from .models import Test, Question, AnswerOption


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