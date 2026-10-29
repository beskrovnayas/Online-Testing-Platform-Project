import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0004_proctorevent_alter_answeroption_options_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TestGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Название')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создана')),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='test_groups', to=settings.AUTH_USER_MODEL, verbose_name='Автор')),
                ('tests', models.ManyToManyField(blank=True, related_name='groups', to='quiz.test', verbose_name='Тесты')),
            ],
            options={
                'verbose_name': 'Группа тестов',
                'verbose_name_plural': 'Группы тестов',
                'ordering': ['-created_at'],
            },
        ),
    ]
