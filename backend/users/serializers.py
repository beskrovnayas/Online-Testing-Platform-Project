from rest_framework import serializers
from .models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'}, label='Подтверждение пароля')

    class Meta:
        model = CustomUser
        fields = ['email', 'username', 'password', 'password2', 'user_type']
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': True},
            'user_type': {'required': True}
        }

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует.")
        return value

    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Пользователь с таким именем уже существует.")
        return value

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Пароли не совпадают.")
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            user_type=validated_data['user_type']
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['user_type'] = user.user_type
        return token