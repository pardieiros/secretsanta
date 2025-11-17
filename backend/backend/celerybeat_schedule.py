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
    # Run daily at 9 AM to check for exchange reminders
    'send-exchange-reminders': {
        'task': 'api.tasks.send_exchange_reminder_task',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
    },
    # Run every 30 minutes to check for auto-draw
    'auto-draw-check': {
        'task': 'api.tasks.auto_draw_task',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
    },
}

