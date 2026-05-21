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

    class Meta:
        model = Test
        fields = [
            'id',
            'title',
            'description',
            'time_limit_minutes',
            'questions_count',
        ]


class TestDetailSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Test
        fields = [
            'id',
            'title',
            'description',
            'time_limit_minutes',
            'questions',
        ]