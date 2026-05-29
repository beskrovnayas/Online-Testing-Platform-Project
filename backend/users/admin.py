from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'user_type', 'is_staff', 'is_active')
    list_filter = ('user_type', 'is_staff', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Роль', {'fields': ('user_type',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Роль', {'fields': ('user_type',)}),
    )