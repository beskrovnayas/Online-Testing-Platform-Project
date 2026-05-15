from django.db import models
from django.conf import settings
from django.utils import timezone

class Test(models.Model): # модель теста
    title = models.CharField(max_length=200, verbose_name="Название теста")
    description = models.TextField(blank=True, verbose_name="Описание")
    time_limit = models.IntegerField(default=30, verbose_name="Время на прохождение (мин)")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tests',
        verbose_name="Автор"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Тест"
        verbose_name_plural = "Тесты"


class AnswerOption(models.Model): # модель варианта ответа 
    question = models.ForeignKey(
        'Question',
        on_delete=models.CASCADE,
        related_name='options',
        verbose_name="Вопрос"
    )
    text = models.CharField(max_length=300, verbose_name="Текст варианта")
    is_correct = models.BooleanField(default=False, verbose_name="Правильный?")

    def __str__(self):
        return self.text[:50]

    class Meta:
        verbose_name = "Вариант ответа"
        verbose_name_plural = "Варианты ответов"


class Question(models.Model): # модель вопроса
    QUESTION_TYPES = (
        ('single', 'Один правильный ответ'),
        ('multiple', 'Несколько правильных ответов'),
        ('text', 'Открытый ответ'),
    )
    test = models.ForeignKey(
        Test,
        on_delete=models.CASCADE,
        related_name='questions',
        verbose_name="Тест"
    )
    text = models.TextField(verbose_name="Текст вопроса")
    question_type = models.CharField(
        max_length=10,
        choices=QUESTION_TYPES,
        default='single',
        verbose_name="Тип вопроса"
    )
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")

    def __str__(self):
        return self.text[:50]

    class Meta:
        ordering = ['order', 'id']
        verbose_name = "Вопрос"
        verbose_name_plural = "Вопросы"

    @property
    def strategy(self): # Возвращает объект стратегии для данного типа вопроса
        from .question_strategies import get_strategy
        return get_strategy(self)


class TestAttempt(models.Model): # модель попытки прохождения теста
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='test_attempts',
        verbose_name="Пользователь"
    )
    test = models.ForeignKey(
        Test,
        on_delete=models.CASCADE,
        related_name='attempts',
        verbose_name="Тест"
    )
    started_at = models.DateTimeField(default=timezone.now, verbose_name="Время начала")
    finished_at = models.DateTimeField(blank=True, null=True, verbose_name="Время завершения")
    score = models.FloatField(default=0, verbose_name="Набранные баллы (проценты)")

    def __str__(self):
        return f"{self.user.email} - {self.test.title} ({self.started_at})"

    class Meta:
        verbose_name = "Попытка прохождения"
        verbose_name_plural = "Попытки прохождения"


class UserAnswer(models.Model): # модель ответа пользователя на конкретный вопрос в рамках попытки
    attempt = models.ForeignKey(
        'TestAttempt',
        on_delete=models.CASCADE,
        related_name='user_answers',
        verbose_name="Попытка"
    )
    question = models.ForeignKey(
        'Question',
        on_delete=models.CASCADE,
        verbose_name="Вопрос"
    )
    # Для single choice (один вариант)
    selected_option = models.ForeignKey(
        'AnswerOption',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name="Выбранный вариант"
    )
    # Для multiple choice (список ID)
    selected_options = models.JSONField(default=list, blank=True, verbose_name="Выбранные варианты (ID)")
    # Для открытого вопроса
    text_answer = models.TextField(blank=True, verbose_name="Текстовый ответ")
    # Флаг правильности (для single/multiple вычисляется сразу, для text — позже)
    is_correct = models.BooleanField(default=False, verbose_name="Правильно?")
    # Баллы за вопрос (0 или 1 для начала)
    points = models.FloatField(default=0, verbose_name="Баллы за вопрос")

    def __str__(self):
        return f"Ответ на {self.question.text[:30]}"