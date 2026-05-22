from django.urls import path

from .views import TestListView, TestDetailView, SubmitAnswersView


urlpatterns = [
    path('tests/', TestListView.as_view(), name='test-list'),
    path('tests/<int:pk>/', TestDetailView.as_view(), name='test-detail'),
    path('submit-answers/', SubmitAnswersView.as_view(), name='submit-answers'),
]