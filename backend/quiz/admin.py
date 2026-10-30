from django.contrib import admin
from .models import Test, Question, AnswerOption, TestAttempt, UserAnswer, ProctorEvent


admin.site.register(Test)
admin.site.register(Question)
admin.site.register(AnswerOption)


class ProctorEventInline(admin.TabularInline):
    model = ProctorEvent
    extra = 0
    readonly_fields = ['event_type', 'timestamp', 'details']
    can_delete = False


@admin.register(TestAttempt)
class TestAttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'test', 'started_at', 'finished_at', 'score')
    list_filter = ('test',)
    search_fields = ('user__username', 'test__title')
    inlines = [ProctorEventInline]


@admin.register(ProctorEvent)
class ProctorEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'attempt', 'event_type', 'timestamp')
    list_filter = ('event_type',)
    search_fields = ('attempt__user__username',)


admin.site.register(UserAnswer)