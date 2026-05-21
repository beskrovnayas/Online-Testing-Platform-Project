from django.db.models import Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Test
from .serializers import TestListSerializer, TestDetailSerializer


class TestListView(APIView):
    def get(self, request):
        tests = (
            Test.objects
            .filter(is_published=True)
            .annotate(questions_count=Count('questions'))
            .order_by('id')
        )

        serializer = TestListSerializer(tests, many=True)
        return Response(serializer.data)


class TestDetailView(APIView):
    def get(self, request, pk):
        try:
            test = (
                Test.objects
                .prefetch_related('questions__options')
                .get(pk=pk, is_published=True)
            )
        except Test.DoesNotExist:
            return Response(
                {'detail': 'Тест не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TestDetailSerializer(test)
        return Response(serializer.data)