from django.urls import path
from .views import SubmitAnswersView

urlpatterns = [
    path('submit-answers/', SubmitAnswersView.as_view(), name='submit-answers'),
]