from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TestViewSet,
    QuestionViewSet,
    AnswerOptionViewSet,
    SubmitAnswersView,
    StartAttemptView,
    TestListView,
    TestDetailView,
    TestAttemptListView,
    TestAttemptDetailView,
    AttemptStatsView,
    ProctorEventView,
    TestGroupViewSet,
    GlobalRankingView,
)

router = DefaultRouter()
router.register(r'new_tests', TestViewSet, basename='test')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'answer-options', AnswerOptionViewSet, basename='answer-option')
router.register(r'test-groups', TestGroupViewSet, basename='test-group')

urlpatterns = [
    path('', include(router.urls)),
    path('tests/', TestListView.as_view(), name='test-list'),
    path('tests/<int:pk>/', TestDetailView.as_view(), name='test-detail'),
    path('tests/<int:pk>/start/', StartAttemptView.as_view(), name='test-start'),
    path('submit-answers/', SubmitAnswersView.as_view(), name='submit-answers'),
    path('attempts/', TestAttemptListView.as_view(), name='attempt-list'),
    path('attempts/stats/', AttemptStatsView.as_view(), name='attempt-stats'),
    path('attempts/<int:pk>/', TestAttemptDetailView.as_view(), name='attempt-detail'),
    path('proctor/event/', ProctorEventView.as_view(), name='proctor-event'),
    path('stats/ranking/', GlobalRankingView.as_view(), name='global-ranking'),
]