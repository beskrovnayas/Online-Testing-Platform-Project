from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser
from .serializers import UserRegistrationSerializer, StudentSerializer
from .permissions import IsTeacherOrAdmin
from rest_framework.permissions import AllowAny, IsAuthenticated

class UserRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'user_type': user.user_type,
            },
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class StudentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    serializer_class = StudentSerializer
    queryset = CustomUser.objects.filter(user_type='student').order_by('username')