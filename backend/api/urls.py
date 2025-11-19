"""
URL configuration for API app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, GoogleOAuthView, UserViewSet, GroupViewSet, GiftIdeaViewSet,
    FriendshipViewSet, MessageViewSet, NotificationViewSet
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
    path('', include(router.urls)),
]

