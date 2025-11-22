"""
Helper functions for sending Web Push notifications.
Uses pywebpush library with VAPID authentication.
"""
import json
import logging
from typing import Dict, List, Optional
from django.conf import settings
from django.utils import timezone
from .models import PushSubscription, User

logger = logging.getLogger(__name__)

try:
    from pywebpush import webpush, WebPushException
    PYWEBPUSH_AVAILABLE = True
except ImportError:
    PYWEBPUSH_AVAILABLE = False
    logger.warning("pywebpush not installed. Push notifications will not work. Install with: pip install pywebpush")


def send_web_push_to_user(
    user: User,
    payload: Dict,
    ttl: int = 86400  # 24 hours default TTL
) -> List[Dict]:
    """
    Send a web push notification to all subscriptions of a user.
    
    Args:
        user: The user to send notifications to
        payload: Dictionary with notification data:
            - title (required): Notification title
            - body (required): Notification body
            - icon (optional): URL to icon
            - badge (optional): URL to badge
            - url (optional): URL to open when clicked
            - tag (optional): Notification tag
        ttl: Time to live in seconds (default: 86400 = 24 hours)
    
    Returns:
        List of results for each subscription attempt:
        [
            {'subscription_id': 1, 'success': True, 'error': None},
            {'subscription_id': 2, 'success': False, 'error': '410 Gone'},
            ...
        ]
    """
    if not PYWEBPUSH_AVAILABLE:
        logger.error("pywebpush not available. Cannot send push notifications.")
        return []
    
    # Get all active subscriptions for the user
    subscriptions = PushSubscription.objects.filter(user=user)
    
    if not subscriptions.exists():
        logger.info(f"No push subscriptions found for user {user.email}")
        return []
    
    results = []
    vapid_private_key = getattr(settings, 'WEBPUSH_VAPID_PRIVATE_KEY', None)
    vapid_claims = getattr(settings, 'WEBPUSH_VAPID_CLAIMS', {})
    
    if not vapid_private_key:
        logger.error("WEBPUSH_VAPID_PRIVATE_KEY not configured in settings")
        return []
    
    # Prepare notification payload
    notification_payload = {
        'title': payload.get('title', 'Secret Santa'),
        'body': payload.get('body', 'Nova notificação'),
        'icon': payload.get('icon', '/src/assets/img/logo_128.png'),
        'badge': payload.get('badge', '/src/assets/img/logo_64.png'),
        'tag': payload.get('tag', 'secretsanta-notification'),
        'data': {
            'url': payload.get('url', '/'),
            **payload.get('data', {}),
        },
    }
    
    # Send to each subscription
    for subscription in subscriptions:
        try:
            # Prepare subscription info
            subscription_info = {
                'endpoint': subscription.endpoint,
                'keys': {
                    'p256dh': subscription.p256dh,
                    'auth': subscription.auth,
                },
            }
            
            # Send push notification
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(notification_payload),
                vapid_private_key=vapid_private_key,
                vapid_claims=vapid_claims,
                ttl=ttl,
            )
            
            results.append({
                'subscription_id': subscription.id,
                'success': True,
                'error': None,
            })
            logger.info(f"Push notification sent successfully to subscription {subscription.id}")
            
        except WebPushException as e:
            # Handle specific error codes
            error_code = getattr(e, 'response', {}).get('status_code', None)
            
            # 410 Gone or 404 Not Found - subscription is invalid, delete it
            if error_code in [410, 404]:
                logger.warning(f"Subscription {subscription.id} is invalid (status {error_code}), deleting...")
                subscription.delete()
                results.append({
                    'subscription_id': subscription.id,
                    'success': False,
                    'error': f'{error_code} - Subscription invalid, deleted',
                })
            else:
                # Other errors (e.g., 429 Too Many Requests, 413 Payload Too Large)
                logger.error(f"Error sending push to subscription {subscription.id}: {str(e)}")
                results.append({
                    'subscription_id': subscription.id,
                    'success': False,
                    'error': str(e),
                })
                
        except Exception as e:
            logger.error(f"Unexpected error sending push to subscription {subscription.id}: {str(e)}")
            results.append({
                'subscription_id': subscription.id,
                'success': False,
                'error': str(e),
            })
    
    return results


def send_group_invite_notification(user: User, group_name: str, inviter_name: str):
    """
    Send a push notification when a user is added to a group.
    
    Args:
        user: The user being invited
        group_name: Name of the group
        inviter_name: Name of the user who invited them
    """
    payload = {
        'title': 'Novo Grupo de Amigo Secreto',
        'body': f'{inviter_name} adicionou-o ao grupo "{group_name}"',
        'url': '/groups',
        'tag': 'group-invite',
    }
    return send_web_push_to_user(user, payload)


def send_message_notification(user: User, sender_name: str, message_preview: str):
    """
    Send a push notification when a user receives a new message.
    
    Args:
        user: The user receiving the message
        sender_name: Name of the sender
        message_preview: Preview of the message (first few words)
    """
    payload = {
        'title': f'Nova mensagem de {sender_name}',
        'body': message_preview,
        'url': '/messages',
        'tag': 'message',
    }
    return send_web_push_to_user(user, payload)


def send_draw_completed_notification(user: User, group_name: str):
    """
    Send a push notification when a group draw is completed.
    
    Args:
        user: The user to notify
        group_name: Name of the group
    """
    payload = {
        'title': 'Sorteio Concluído!',
        'body': f'O sorteio do grupo "{group_name}" foi concluído. Veja quem sorteou!',
        'url': '/groups',
        'tag': 'draw-completed',
    }
    return send_web_push_to_user(user, payload)


def send_notification_push(notification):
    """
    Send a push notification when a Notification object is created.
    This function should be called after creating a Notification.
    Sends both Web Push notifications and WebSocket events via Pusher/Soketi.
    
    Args:
        notification: Notification model instance
    """
    from .models import Notification
    
    if not isinstance(notification, Notification):
        logger.error(f"Invalid notification object: {notification}")
        return []
    
    # Determine URL based on notification type
    url_map = {
        'friend_request': '/social',
        'friend_accepted': '/social',
        'message': '/messages',
        'group_invite': '/notifications',
        'group_draw': '/notifications',
        'system': '/notifications',
    }
    
    # Determine tag based on notification type
    tag_map = {
        'friend_request': 'friend-request',
        'friend_accepted': 'friend-accepted',
        'message': 'message',
        'group_invite': 'group-invite',
        'group_draw': 'group-draw',
        'system': 'system',
    }
    
    url = url_map.get(notification.notification_type, '/notifications')
    tag = tag_map.get(notification.notification_type, 'notification')
    
    # Build payload
    payload = {
        'title': notification.title,
        'body': notification.message,
        'url': url,
        'tag': tag,
    }
    
    # Add group ID to data if related_group exists
    if notification.related_group:
        payload['data'] = {
            'group_id': notification.related_group.id,
        }
    
    # Add user ID to data if related_user exists
    if notification.related_user:
        if 'data' not in payload:
            payload['data'] = {}
        payload['data']['user_id'] = notification.related_user.id
    
    # Send Web Push notification
    web_push_results = []
    try:
        web_push_results = send_web_push_to_user(notification.user, payload)
    except Exception as e:
        logger.error(f"Error sending web push notification for notification {notification.id}: {str(e)}")
    
    # Send WebSocket event via Pusher/Soketi
    try:
        from .utils.pusher_client import pusher_client
        
        if pusher_client:
            # Prepare WebSocket event data
            ws_data = {
                'id': notification.id,
                'type': notification.notification_type,
                'title': notification.title,
                'message': notification.message,
                'is_read': notification.is_read,
                'created_at': notification.created_at.isoformat(),
                'url': url,
            }
            
            # Add related data
            if notification.related_group:
                ws_data['related_group_id'] = notification.related_group.id
            if notification.related_user:
                ws_data['related_user_id'] = notification.related_user.id
            
            # Determine event name based on notification type
            event_map = {
                'friend_request': 'new-friend-request',
                'friend_accepted': 'friend-accepted',
                'message': 'new-message',
                'group_invite': 'new-group-invite',
                'group_draw': 'group-draw-update',
                'system': 'new-notification',
            }
            event_name = event_map.get(notification.notification_type, 'new-notification')
            
            # Send to user's private channel
            channel_name = f"private-user-{notification.user.id}"
            pusher_client.trigger(channel_name, event_name, ws_data)
            logger.info(f"Sent WebSocket event {event_name} to channel {channel_name} for notification {notification.id}")
        else:
            logger.debug(
                f"Pusher client not available, skipping WebSocket notification for notification {notification.id}. "
                "Check SOCKET_APP_ID, SOCKET_APP_KEY, SOCKET_APP_SECRET, and SOCKET_HOST environment variables."
            )
    except Exception as e:
        logger.error(f"Error sending WebSocket notification for notification {notification.id}: {str(e)}", exc_info=True)
    
    return web_push_results

