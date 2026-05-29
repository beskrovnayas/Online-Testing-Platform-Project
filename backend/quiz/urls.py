from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TestViewSet, QuestionViewSet, AnswerOptionViewSet, SubmitAnswersView

router = DefaultRouter()
router.register(r'tests', TestViewSet, basename='test')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'answer-options', AnswerOptionViewSet, basename='answer-option')

urlpatterns = [
    path('', include(router.urls)),
    path('submit-answers/', SubmitAnswersView.as_view(), name='submit-answers'),
]