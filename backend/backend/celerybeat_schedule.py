"""
Celery Beat schedule configuration.
"""
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Run every hour to check for draw reminders
    'send-draw-reminders': {
        'task': 'api.tasks.send_draw_reminder_task',
        'schedule': crontab(minute=0),  # Every hour at minute 0
    },
    # Run every 30 minutes to check for auto-draw
    'auto-draw-check': {
        'task': 'api.tasks.auto_draw_task',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
    },
    # Run every 30 minutes to check for auto-reveal
    'auto-reveal-check': {
        'task': 'api.tasks.auto_reveal_task',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
    },
}

