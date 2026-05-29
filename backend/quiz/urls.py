from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TestViewSet, QuestionViewSet, AnswerOptionViewSet, SubmitAnswersView, TestListView, TestDetailView

router = DefaultRouter()
router.register(r'new_tests', TestViewSet, basename='test')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'answer-options', AnswerOptionViewSet, basename='answer-option')

urlpatterns = [
    path('', include(router.urls)),
    path('tests/', TestListView.as_view(), name='test-list'),
    path('tests/<int:pk>/', TestDetailView.as_view(), name='test-detail'),
    path('submit-answers/', SubmitAnswersView.as_view(), name='submit-answers'),
]