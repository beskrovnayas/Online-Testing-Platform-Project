from django.urls import path
from .views import TestListView, TestDetailView

urlpatterns = [
    path('tests/', TestListView.as_view(), name='test-list'),
    path('tests/<int:pk>/', TestDetailView.as_view(), name='test-detail'),
]