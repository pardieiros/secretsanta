"""
URL configuration for API app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, GoogleOAuthView, PasswordResetRequestView, PasswordResetView,
    UserViewSet, GroupViewSet, GiftIdeaViewSet,
    FriendshipViewSet, MessageViewSet, NotificationViewSet, CookieConsentView,
    PushVapidPublicKeyView, PushSubscribeView, PushUnsubscribeView, PushTestView,
    PusherAuthView
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'groups', GroupViewSet, basename='group')
router.register(r'gift-ideas', GiftIdeaViewSet, basename='giftidea')
router.register(r'friendships', FriendshipViewSet, basename='friendship')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('auth/google/', GoogleOAuthView.as_view(), name='google_oauth'),
    path('auth/password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/password-reset/', PasswordResetView.as_view(), name='password_reset'),
    path('cookies/consent/', CookieConsentView.as_view(), name='cookie_consent'),
    path('push/vapid-public-key/', PushVapidPublicKeyView.as_view(), name='push_vapid_public_key'),
    path('push/subscribe/', PushSubscribeView.as_view(), name='push_subscribe'),
    path('push/unsubscribe/', PushUnsubscribeView.as_view(), name='push_unsubscribe'),
    path('push/test/', PushTestView.as_view(), name='push_test'),
    path('pusher/auth/', PusherAuthView.as_view(), name='pusher_auth'),
    path('', include(router.urls)),
]

