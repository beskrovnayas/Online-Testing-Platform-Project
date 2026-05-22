from rest_framework import serializers

from .models import Test, Question, AnswerOption


class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ['id', 'text']


class QuestionSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'options']


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
    questions = QuestionSerializer(many=True, read_only=True)
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


class SubmitAnswersSerializer(serializers.Serializer):
    test_id = serializers.IntegerField()
    answers = serializers.DictField(
        child=serializers.IntegerField(),
        help_text="Словарь {question_id: selected_option_id}"
    )