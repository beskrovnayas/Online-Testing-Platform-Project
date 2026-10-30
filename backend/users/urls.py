from django.urls import path
from .views import UserRegistrationView, StudentListView, ProfileView

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('students/', StudentListView.as_view(), name='student-list'),
    path('me/', ProfileView.as_view(), name='user-profile'),
]