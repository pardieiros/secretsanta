"""
Pusher/Soketi client configuration for WebSocket support.
"""
import pusher
import os
import logging

logger = logging.getLogger(__name__)

try:
    pusher_client = pusher.Pusher(
        app_id=os.environ.get("SOCKET_APP_ID"),
        key=os.environ.get("SOCKET_APP_KEY"),
        secret=os.environ.get("SOCKET_APP_SECRET"),
        host=os.environ.get("SOCKET_HOST"),
        port=int(os.environ.get("SOCKET_PORT", "6001")),
        ssl=os.environ.get("SOCKET_USE_TLS", "false") == "true",
    )
except Exception as e:
    logger.error(f"Failed to initialize Pusher client: {str(e)}")
    pusher_client = None


