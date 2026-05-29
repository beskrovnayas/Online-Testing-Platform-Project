from rest_framework import serializers
from .models import Test, Question, AnswerOption


class SubmitAnswersSerializer(serializers.Serializer):
    test_id = serializers.IntegerField()
    answers = serializers.DictField(
        child=serializers.IntegerField(),
        help_text="Словарь {question_id: selected_option_id}"
    )


class TestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Test
        fields = ['id', 'title', 'description', 'time_limit', 'author']
        read_only_fields = ['author']

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'test', 'text', 'question_type', 'order']

class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ['id', 'question', 'text', 'is_correct']