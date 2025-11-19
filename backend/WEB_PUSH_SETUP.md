# Web Push Notifications Setup Guide

## 1. Generate VAPID Keys

VAPID keys are required for Web Push notifications. Generate them using one of these methods:

### Method 1: Using Python (Recommended)

```bash
python -c "from pywebpush import WebPusher; import json; keys = WebPusher.generate_keys(); print(json.dumps({'public': keys['publicKey'], 'private': keys['privateKey']}, indent=2))"
```

### Method 2: Using Online Tool

Visit: https://web-push-codelab.glitch.me/

### Method 3: Using Node.js

```bash
npx web-push generate-vapid-keys
```

## 2. Configure Environment Variables

Add the generated keys to your `.env` file:

```env
WEBPUSH_VAPID_PUBLIC_KEY=your_public_key_here
WEBPUSH_VAPID_PRIVATE_KEY=your_private_key_here
WEBPUSH_VAPID_SUB=mailto:support@secretsanta.example
```

**Important:** 
- The `WEBPUSH_VAPID_SUB` should be a `mailto:` URL or a URL to your website
- Keep the private key secure and never commit it to version control
- The public key is safe to expose to clients

## 3. Install Dependencies

```bash
pip install pywebpush
```

Or add to `requirements.txt` (already added):
```
pywebpush>=1.14.0
```

## 4. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

## 5. Integration Examples

### Send notification when user is added to a group

In your view or signal handler:

```python
from api.push_notifications import send_group_invite_notification

# When adding a member to a group
send_group_invite_notification(
    user=member_user,
    group_name=group.name,
    inviter_name=request.user.get_full_name() or request.user.email
)
```

### Send notification when user receives a message

```python
from api.push_notifications import send_message_notification

# When creating a new message
send_message_notification(
    user=receiver,
    sender_name=sender.get_full_name() or sender.email,
    message_preview=message.content[:100]  # First 100 characters
)
```

### Send notification when draw is completed

```python
from api.push_notifications import send_draw_completed_notification

# After completing a group draw
for member in group.get_members():
    send_draw_completed_notification(
        user=member,
        group_name=group.name
    )
```

### Custom notification

```python
from api.push_notifications import send_web_push_to_user

send_web_push_to_user(
    user=user,
    payload={
        'title': 'Título da Notificação',
        'body': 'Corpo da mensagem',
        'icon': '/src/assets/img/logo_128.png',
        'badge': '/src/assets/img/logo_64.png',
        'url': '/groups/123',  # URL to open when clicked
        'tag': 'custom-notification',
    }
)
```

## 6. Testing

1. Start the Django server
2. Log in to the frontend
3. Go to Settings page
4. Click "Ativar Notificações" (Enable Notifications)
5. Grant permission when prompted
6. Click "Testar Notificação" (Test Notification)
7. You should receive a test notification

## 7. Production Considerations

- **HTTPS Required**: Web Push only works over HTTPS (or localhost for development)
- **Service Worker**: Ensure the service worker is properly registered and accessible
- **Error Handling**: Invalid subscriptions (410 Gone, 404 Not Found) are automatically cleaned up
- **Rate Limiting**: Consider implementing rate limiting for push notifications
- **Async Processing**: For high-volume scenarios, consider sending push notifications via Celery tasks

## 8. Troubleshooting

### Notifications not working?

1. Check browser console for errors
2. Verify VAPID keys are correctly set in environment variables
3. Ensure service worker is registered (check Application tab in DevTools)
4. Check browser notification permissions
5. Verify HTTPS is enabled in production

### Subscription errors?

- Check that the VAPID public key matches the private key
- Ensure the `sub` claim in VAPID_CLAIMS is a valid mailto: or https: URL
- Verify the service worker is accessible at `/sw.js`

## 9. Browser Support

- ✅ Chrome/Edge (Desktop & Android)
- ✅ Firefox (Desktop & Android)
- ✅ Safari (macOS & iOS 16.4+) - Limited support
- ❌ Safari (iOS < 16.4) - Not supported

## 10. Integration Points in Code

The following locations in the codebase have commented integration examples:

1. **Group Join** (`api/views.py` - `GroupViewSet.join` method, after line 452)
2. **New Message** (`api/views.py` - `MessageViewSet.perform_create` method, after line 1369)
3. **Draw Completed** (`api/tasks.py` - `send_draw_completed_notifications` function, after line 160)

Uncomment the relevant code blocks to enable push notifications for these events.

