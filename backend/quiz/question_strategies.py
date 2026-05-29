from abc import ABC, abstractmethod
from typing import Union, List, Optional
from .models import UserAnswer


class QuestionStrategy(ABC): # Абстрактная стратегия для всех типов вопросов
    def __init__(self, question):
        self.question = question

    @abstractmethod
    def check_answer(self, user_input: Union[int, List[int], str]) -> Optional[bool]:
        # Проверяет, правильный ли ответ.
        # Для single/multiple возвращает bool.
        # Для text возвращает None (требуется ручная проверка).
        pass

    @abstractmethod
    def get_result_structure(self) -> dict:
        # Возвращает структуру для фронтенда (тип, текст, варианты)
        pass

    @abstractmethod
    def validate_user_input(self, user_input) -> bool:
        # Проверяет формат входящих данных
        pass

    @abstractmethod
    def save_answer(self, attempt, user_input) -> UserAnswer:
        # Создаёт и сохраняет объект UserAnswer для данной попытки.
        # Использует check_answer для заполнения is_correct и points.
        pass


class SingleChoiceStrategy(QuestionStrategy): # один правильный ответ

    def check_answer(self, user_input: int) -> bool:
        return self.question.options.filter(id=user_input, is_correct=True).exists()

    def get_result_structure(self) -> dict:
        return {
            'type': 'single',
            'text': self.question.text,
            'options': [{'id': opt.id, 'text': opt.text} for opt in self.question.options.all()]
        }

    def validate_user_input(self, user_input) -> bool:
        if not isinstance(user_input, int):
            return False
        return self.question.options.filter(id=user_input).exists()

    def save_answer(self, attempt, user_input: int) -> UserAnswer:
        is_correct = self.check_answer(user_input)
        points = 1 if is_correct else 0
        return UserAnswer.objects.create(
            attempt=attempt,
            question=self.question,
            selected_option_id=user_input,
            selected_options=[],
            text_answer='',
            is_correct=is_correct,
            points=points
        )

class MultipleChoiceStrategy(QuestionStrategy): # несколько правильных ответов

    def check_answer(self, user_input: List[int]) -> bool:
        if not isinstance(user_input, list):
            return False
        correct_ids = set(self.question.options.filter(is_correct=True).values_list('id', flat=True))
        return set(user_input) == correct_ids

    def get_result_structure(self) -> dict:
        return {
            'type': 'multiple',
            'text': self.question.text,
            'options': [{'id': opt.id, 'text': opt.text} for opt in self.question.options.all()]
        }

    def validate_user_input(self, user_input) -> bool:
        if not isinstance(user_input, list):
            return False
        all_option_ids = set(self.question.options.values_list('id', flat=True))
        return all(opt_id in all_option_ids for opt_id in user_input)

    def save_answer(self, attempt, user_input: List[int]) -> UserAnswer:
        is_correct = self.check_answer(user_input)
        points = 1 if is_correct else 0
        return UserAnswer.objects.create(
            attempt=attempt,
            question=self.question,
            selected_option=None,
            selected_options=user_input,
            text_answer='',
            is_correct=is_correct,
            points=points
        )


class TextStrategy(QuestionStrategy): # открытый вопрос (ручная проверка)

    def check_answer(self, user_input: str) -> None:
        return None  # автоматическая проверка не производится

    def get_result_structure(self) -> dict:
        return {
            'type': 'text',
            'text': self.question.text,
        }

    def validate_user_input(self, user_input) -> bool:
        return isinstance(user_input, str) and len(user_input.strip()) > 0

    def save_answer(self, attempt, user_input: str) -> UserAnswer:
        return UserAnswer.objects.create(
            attempt=attempt,
            question=self.question,
            selected_option=None,
            selected_options=[],
            text_answer=user_input,
            is_correct=False,   # требует проверки учителем
            points=0
        )

# Фабрика стратегий
def get_strategy(question) -> QuestionStrategy:
    mapping = {
        'single': SingleChoiceStrategy,
    }
    strategy_class = mapping.get(question.question_type)
    if not strategy_class:
        raise ValueError(f"Unknown question type: {question.question_type}")
    return strategy_class(question)