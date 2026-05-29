from rest_framework import serializers
from .models import Test, Question, AnswerOption

class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ['id', 'text']
    
    # def validate(self, data):
    #     question = data.get('question')
    #     is_correct = data.get('is_correct')

    #     if is_correct and question.question_type == 'single':
    #         if AnswerOption.objects.filter(question=question, is_correct=True).exists():
    #             instance = self.instance
    #             if instance and instance.id:
    #                 existing = AnswerOption.objects.filter(question=question, is_correct=True).exclude(id=instance.id).exists()
    #             else:
    #                 existing = True
    #             if existing:
    #                 raise serializers.ValidationError("Для вопроса с типом 'single' уже есть правильный вариант.")
    #     return data

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