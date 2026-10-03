import json
import logging
import os
import sys
from pathlib import Path
from wsgiref.simple_server import make_server

frontend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(frontend / 'test-results.local' / 'python'))
sys.path.insert(0, str(frontend.parent / 'backend'))
os.environ['DJANGO_SETTINGS_MODULE'] = 'test_platform.settings'
logging.disable(logging.CRITICAL)

from django.conf import settings

settings.DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
settings.ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']
settings.SECRET_KEY = 'local-integration-check-only-key-01234567890123456789'

import django

django.setup()

from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.core.wsgi import get_wsgi_application
from rest_framework.test import APIClient
from quiz.models import TestAttempt, UserAnswer

call_command('migrate', verbosity=0, interactive=False)
call_command('loaddata', 'mvp_integration', verbosity=0)
student = get_user_model().objects.get(username='test')
student.set_password('Local-check-2026!')
student.save(update_fields=['password'])

checks = []

def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)
    print('PASS:', name, flush=True)

client = APIClient()
check('unauthenticated test detail returns 401', client.get('/api/tests/1/').status_code == 401)
login = client.post('/api/token/', {'username': 'test', 'password': 'Local-check-2026!'}, format='json')
check('JWT login returns access and refresh tokens', login.status_code == 200 and 'access' in login.data and 'refresh' in login.data)
client.credentials(HTTP_AUTHORIZATION='Bearer ' + login.data['access'])
detail = client.get('/api/tests/1/')
check('real detail exposes question types without correct-answer flags', detail.status_code == 200
      and all(q['question_type'] == 'single' for q in detail.data['questions'])
      and all('is_correct' not in o for q in detail.data['questions'] for o in q['options']))
submission = client.post('/api/submit-answers/', {'test_id': 1, 'answers': {'1': 1, '2': 8, '3': 10}}, format='json')
check('real submit returns 3/3 and 100 percent', submission.status_code == 200
      and submission.data['correct_answers'] == 3 and submission.data['total_questions'] == 3
      and submission.data['percentage'] == 100)
check('attempt and three student answers are persisted', TestAttempt.objects.count() == 1 and UserAnswer.objects.count() == 3)
empty = client.post('/api/submit-answers/', {'test_id': 1, 'answers': {}}, format='json')
check('empty answers are rejected', empty.status_code == 400)
multiple = client.post('/api/submit-answers/', {'test_id': 1, 'answers': {'1': [1, 2]}}, format='json')
check('current backend rejects multiple-choice arrays', multiple.status_code == 400)
check('history detail route is absent', client.get('/api/attempts/1/').status_code == 404)
check('server start route is absent', client.post('/api/tests/1/start/', {}, format='json').status_code == 404)
preflight = client.options('/api/submit-answers/', HTTP_ORIGIN='http://127.0.0.1:5173',
                           HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
                           HTTP_ACCESS_CONTROL_REQUEST_HEADERS='authorization,content-type')
check('CORS permits local frontend and authorization header', preflight.status_code == 200
      and preflight.headers.get('Access-Control-Allow-Origin') == 'http://127.0.0.1:5173'
      and 'authorization' in preflight.headers.get('Access-Control-Allow-Headers', ''))
print(f'BACKEND CHECKS: {len(checks)} passed', flush=True)

if '--serve' in sys.argv:
    TestAttempt.objects.all().delete()
    application = get_wsgi_application()

    def local_application(environ, start_response):
        if environ['PATH_INFO'] == '/__test_state__/':
            body = json.dumps({'attempts': TestAttempt.objects.count(), 'answers': UserAnswer.objects.count()}).encode()
            start_response('200 OK', [('Content-Type', 'application/json'), ('Content-Length', str(len(body)))])
            return [body]
        return application(environ, start_response)

    with make_server('127.0.0.1', 8000, local_application) as server:
        print('LOCAL BACKEND READY: http://127.0.0.1:8000', flush=True)
        server.serve_forever()
