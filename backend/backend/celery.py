"""
Celery configuration for ELIAS project
Initializes Celery app and configures it to work with Django
"""

import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Create Celery app instance
app = Celery('backend')

# Load configuration from Django settings, using CELERY namespace
# All Celery settings in settings.py should be prefixed with CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    """
    Debug task to verify Celery is working correctly
    Can be called with: python manage.py shell
    >>> from backend.celery import debug_task
    >>> debug_task.delay()
    """
    print(f'Request: {self.request!r}')
