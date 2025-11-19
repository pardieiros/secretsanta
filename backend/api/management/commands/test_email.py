"""
Management command to test email sending.
Usage: python manage.py test_email marcodaniel93@hotmail.com
"""
from django.core.management.base import BaseCommand
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings


class Command(BaseCommand):
    help = 'Test email sending functionality'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address to send test email to')

    def handle(self, *args, **options):
        recipient_email = options['email']
        
        self.stdout.write(f'Testing email sending to: {recipient_email}')
        self.stdout.write(f'EMAIL_BACKEND: {settings.EMAIL_BACKEND}')
        self.stdout.write(f'EMAIL_HOST: {settings.EMAIL_HOST}')
        self.stdout.write(f'EMAIL_PORT: {settings.EMAIL_PORT}')
        self.stdout.write(f'EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}')
        self.stdout.write(f'EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}')
        self.stdout.write(f'DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}')
        self.stdout.write('')
        
        subject = 'Test Email - Secret Santa'
        
        # Render HTML email
        html_message = render_to_string('emails/test_email.html', {
            'subject': subject,
            'frontend_url': settings.FRONTEND_URL,
        })
        
        # Plain text version
        text_message = """
Hello!

This is a test email from the Secret Santa application.

If you received this email, the email configuration is working correctly!

Best regards,
Secret Santa Team
"""
        
        try:
            email = EmailMultiAlternatives(
                subject,
                text_message,
                settings.DEFAULT_FROM_EMAIL,
                [recipient_email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=False)
            self.stdout.write(
                self.style.SUCCESS(f'✓ Email sent successfully to {recipient_email}!')
            )
            self.stdout.write('')
            if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
                self.stdout.write(
                    self.style.WARNING(
                        '⚠ Note: Using console backend - email was printed to console, not actually sent.'
                    )
                )
                self.stdout.write(
                    '   To send real emails, configure EMAIL_BACKEND, EMAIL_HOST, EMAIL_PORT, etc. in .env'
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to send email: {str(e)}')
            )
            self.stdout.write('')
            self.stdout.write('Please check your email configuration in .env file:')
            self.stdout.write('  - EMAIL_BACKEND (e.g., django.core.mail.backends.smtp.EmailBackend)')
            self.stdout.write('  - EMAIL_HOST (e.g., smtp.gmail.com)')
            self.stdout.write('  - EMAIL_PORT (e.g., 587)')
            self.stdout.write('  - EMAIL_USE_TLS (True/False)')
            self.stdout.write('  - EMAIL_HOST_USER (your email)')
            self.stdout.write('  - EMAIL_HOST_PASSWORD (your email password or app password)')
            self.stdout.write('  - DEFAULT_FROM_EMAIL (sender email address)')

