from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    USER_TYPE_CHOICES = (
        ('student', 'Студент'),
        ('teacher', 'Учитель'),
        ('admin', 'Администратор'),
    )
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='student')
    email = models.EmailField(unique=True)

    def __str__(self):
        return self.email
    
    def is_teacher(self):
        return self.user_type == 'teacher'
        
    def is_student(self):
        return self.user_type == 'student'
        
    def is_admin_user(self):
        return self.user_type == 'admin' or self.is_superuser