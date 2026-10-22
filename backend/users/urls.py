from django.urls import path
from .views import UserRegistrationView, StudentListView

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('students/', StudentListView.as_view(), name='student-list'),
]