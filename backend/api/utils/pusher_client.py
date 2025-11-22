"""
Pusher/Soketi client configuration for WebSocket support.
Uses HTTP requests directly for Soketi compatibility since Pusher Python library
has strict validation on app_id format.
"""
import os
import logging
import requests
import hmac
import hashlib
import json
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

# Check required environment variables
SOCKET_APP_ID = os.environ.get("SOCKET_APP_ID")
SOCKET_APP_KEY = os.environ.get("SOCKET_APP_KEY")
SOCKET_APP_SECRET = os.environ.get("SOCKET_APP_SECRET")
SOCKET_HOST = os.environ.get("SOCKET_HOST")
SOCKET_PORT = os.environ.get("SOCKET_PORT", "6001")
SOCKET_USE_TLS_STR = os.environ.get("SOCKET_USE_TLS", "false").lower().strip()
# Handle "falses" typo and normalize to boolean
SOCKET_USE_TLS = SOCKET_USE_TLS_STR in ("true", "1", "yes")

# Validate required variables
required_vars = {
    "SOCKET_APP_ID": SOCKET_APP_ID,
    "SOCKET_APP_KEY": SOCKET_APP_KEY,
    "SOCKET_APP_SECRET": SOCKET_APP_SECRET,
    "SOCKET_HOST": SOCKET_HOST,
}
missing_vars = [var for var, value in required_vars.items() if not value]

if missing_vars:
    logger.warning(
        f"Pusher/Soketi client not initialized. Missing environment variables: {', '.join(missing_vars)}"
    )
    pusher_client = None
else:
    # Create a custom Pusher client wrapper for Soketi
    # Since Pusher Python library validates app_id strictly (expects numeric),
    # we'll use HTTP requests directly for Soketi compatibility
    
    class SoketiClient:
        """Custom client for Soketi that uses HTTP requests directly."""
        
        def __init__(self, app_id, key, secret, host, port, ssl=False):
            self.app_id = app_id
            self.key = key
            self.secret = secret
            self.host = host
            self.port = port
            self.ssl = ssl
            protocol = "https" if ssl else "http"
            self.base_url = f"{protocol}://{host}:{port}/apps/{app_id}"
        
        def trigger(self, channel, event, data):
            """Trigger an event on a channel using Soketi HTTP API."""
            try:
                import time
                
                # Soketi uses the same API format as Pusher
                # Endpoint: POST /apps/{app_id}/events
                url = f"{self.base_url}/events"
                
                # Prepare the event data
                # Soketi expects data to be JSON stringified
                event_data = {
                    "name": event,
                    "channel": channel,
                    "data": json.dumps(data) if isinstance(data, (dict, list)) else str(data)
                }
                
                # Create the body JSON string (exactly as it will be sent)
                body_string = json.dumps(event_data, separators=(',', ':'))  # Compact JSON, no spaces
                
                # Calculate MD5 of the body (required by Pusher/Soketi protocol)
                body_md5 = hashlib.md5(body_string.encode('utf-8')).hexdigest()
                
                # Create authentication signature (Pusher/Soketi compatible)
                timestamp = str(int(time.time()))
                method = "POST"
                path = f"/apps/{self.app_id}/events"
                
                # Build query params for signature (must include body_md5, but NOT auth_signature)
                query_params = {
                    "auth_key": self.key,
                    "auth_timestamp": timestamp,
                    "auth_version": "1.0",
                    "body_md5": body_md5,
                }
                
                # Create query string from sorted params (for signature calculation)
                query_string = "&".join(f"{k}={query_params[k]}" for k in sorted(query_params.keys()))
                
                # The string to sign format for Pusher/Soketi HTTP API:
                # METHOD\nPATH\nQUERY_STRING
                # Note: The body is NOT included in the string to sign, only body_md5 is in the query string
                string_to_sign = f"{method}\n{path}\n{query_string}"
                
                logger.debug(f"String to sign: {repr(string_to_sign)}")
                logger.debug(f"Body MD5: {body_md5}")
                
                # Calculate HMAC SHA256 signature
                signature = hmac.new(
                    self.secret.encode('utf-8'),
                    string_to_sign.encode('utf-8'),
                    hashlib.sha256
                ).hexdigest()
                
                logger.debug(f"Calculated signature: {signature}")
                
                # Add signature to query params (for the actual request)
                query_params["auth_signature"] = signature
                
                headers = {
                    "Content-Type": "application/json",
                }
                
                logger.debug(f"Sending event to Soketi: Event={event}, Channel={channel}")
                
                # Send the request with params in query string and body in POST data
                response = requests.post(
                    url,
                    params=query_params,  # Query params including auth_signature
                    data=body_string,  # Body as raw JSON string
                    headers=headers,
                    timeout=5
                )
                
                logger.debug(f"Response status: {response.status_code}, Response: {response.text}")
                
                # Check if response is successful
                if response.status_code in [200, 202]:
                    # Parse response to check for errors
                    try:
                        response_data = response.json()
                        if 'error' in response_data:
                            error_msg = response_data.get('error')
                            error_code = response_data.get('code')
                            logger.error(
                                f"Soketi returned error: {error_msg} (code: {error_code})"
                            )
                            return False
                    except (ValueError, json.JSONDecodeError):
                        # Response is not JSON, assume success
                        pass
                    
                    logger.info(f"Event '{event}' triggered successfully on channel '{channel}'")
                    return True
                else:
                    logger.error(
                        f"Failed to trigger event '{event}' on channel '{channel}'. "
                        f"Status: {response.status_code}, Response: {response.text}"
                    )
                    return False
                    
            except Exception as e:
                logger.error(f"Error triggering event '{event}' on channel '{channel}': {str(e)}", exc_info=True)
                return False
        
        def authenticate(self, channel, socket_id):
            """Authenticate a private channel subscription."""
            try:
                string_to_sign = f"{socket_id}:{channel}"
                signature = hmac.new(
                    self.secret.encode('utf-8'),
                    string_to_sign.encode('utf-8'),
                    hashlib.sha256
                ).hexdigest()
                
                return {
                    "auth": f"{self.key}:{signature}"
                }
            except Exception as e:
                logger.error(f"Error authenticating channel '{channel}': {str(e)}", exc_info=True)
                raise
    
    try:
        pusher_client = SoketiClient(
            app_id=str(SOCKET_APP_ID).strip(),
            key=str(SOCKET_APP_KEY).strip(),
            secret=str(SOCKET_APP_SECRET).strip(),
            host=str(SOCKET_HOST).strip(),
            port=int(SOCKET_PORT),
            ssl=SOCKET_USE_TLS,
        )
        logger.info(
            f"Soketi client initialized successfully. Host: {SOCKET_HOST}:{SOCKET_PORT}, TLS: {SOCKET_USE_TLS}"
        )
    except Exception as e:
        logger.error(f"Failed to initialize Soketi client: {str(e)}", exc_info=True)
        pusher_client = None


