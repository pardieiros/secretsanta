"""
Views for Secret Santa API.
"""
import re
import requests
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from django.db import IntegrityError
from django.conf import settings
from django.utils.translation import get_language, activate
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Group, GroupMembership, GroupPermission, SecretSantaAssignment, GiftIdea, Friendship, FriendInvite, Message, Notification, PasswordResetToken, CookieConsent, PushSubscription
from .serializers import (
    UserRegistrationSerializer, UserSerializer, UserProfileUpdateSerializer,
    GroupSerializer, GroupMembershipSerializer, GroupPermissionSerializer, GroupPermissionUpdateSerializer,
    SecretSantaAssignmentSerializer, GiftIdeaSerializer, DrawResponseSerializer, FriendshipSerializer,
    MessageSerializer, NotificationSerializer, PasswordResetRequestSerializer, PasswordResetSerializer,
    CookieConsentSerializer, CookieConsentCreateSerializer,
    PushSubscriptionSerializer, PushSubscriptionCreateSerializer
)
from .tasks import execute_draw_task, send_invite_email_task, send_friend_invite_email_task, send_reveal_notifications, send_password_reset_email_task
from .error_messages import get_error_message


class RegisterView(APIView):
    """User registration endpoint."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        # Get language from request header or default to 'en'
        lang = request.headers.get('Accept-Language', 'en')[:2] or 'en'
        if lang not in ['en', 'pt']:
            lang = 'en'
        activate(lang)
        
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                
                # Check for pending friend invites
                pending_invites = FriendInvite.objects.filter(
                    email=user.email,
                    is_accepted=False
                )
                
                for invite in pending_invites:
                    # Create friend request
                    Friendship.objects.create(
                        requester=invite.requester,
                        addressee=user,
                        status='pending'
                    )
                    
                    # Mark invite as accepted
                    invite.is_accepted = True
                    invite.save()
                    
                    # Create notification
                    notification = Notification.objects.create(
                        user=user,
                        notification_type='friend_request',
                        title='New Friend Request',
                        message=f"{invite.requester.first_name or invite.requester.email} sent you a friend request",
                        related_user=invite.requester
                    )
                    # Send push notification
                    from .push_notifications import send_notification_push
                    send_notification_push(notification)
                
                return Response({
                    'message': 'User registered successfully',
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    'error': get_error_message('auth.registration_failed', lang),
                    'detail': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        # Format errors in a more user-friendly way
        formatted_errors = {}
        for field, error_list in serializer.errors.items():
            if isinstance(error_list, list):
                # Get first error message, or use default
                error_msg = error_list[0] if error_list else get_error_message('validation.validation_failed', lang)
                # If it's a dict, extract the message
                if isinstance(error_msg, dict):
                    error_msg = list(error_msg.values())[0] if error_msg else get_error_message('validation.validation_failed', lang)
                formatted_errors[field] = str(error_msg)
            else:
                formatted_errors[field] = str(error_list)
        
        return Response({
            'error': get_error_message('validation.validation_failed', lang),
            'errors': formatted_errors,
            'message': get_error_message('validation.validation_failed', lang)
        }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class GoogleOAuthView(APIView):
    """Google OAuth authentication endpoint."""
    permission_classes = [AllowAny]
    authentication_classes = []  # Disable authentication for this endpoint
    
    def post(self, request):
        """Exchange Google authorization code for JWT tokens."""
        code = request.data.get('code')
        if not code:
            return Response(
                {'error': 'Authorization code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Exchange code for access token
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'code': code,
            'client_id': settings.GOOGLE_OAUTH2_CLIENT_ID,
            'client_secret': settings.GOOGLE_OAUTH2_CLIENT_SECRET,
            'redirect_uri': settings.GOOGLE_OAUTH2_REDIRECT_URI,
            'grant_type': 'authorization_code',
        }
        
        try:
            token_response = requests.post(token_url, data=token_data)
            token_response.raise_for_status()
            token_json = token_response.json()
            access_token = token_json.get('access_token')
            
            if not access_token:
                return Response(
                    {'error': 'Failed to obtain access token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get user info from Google
            user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
            headers = {'Authorization': f'Bearer {access_token}'}
            user_info_response = requests.get(user_info_url, headers=headers)
            user_info_response.raise_for_status()
            user_info = user_info_response.json()
            
            # Extract user data
            email = user_info.get('email')
            first_name = user_info.get('given_name', '')
            last_name = user_info.get('family_name', '')
            picture = user_info.get('picture', '')
            
            if not email:
                return Response(
                    {'error': 'Email not provided by Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user exists - if they do, just login (allow Google OAuth even if they have password)
            try:
                existing_user = User.objects.get(email=email)
                # User exists - allow login via Google OAuth even if they have a password
                # This allows users to use either method to login
                user = existing_user
                created = False
            except User.DoesNotExist:
                # Create new user
                user = User.objects.create_user(
                    email=email,
                    username=email.split('@')[0],
                    first_name=first_name or '',
                    last_name=last_name or '',
                    profile_picture=picture or '',
                    profile_complete=False,
                    password=None  # No password for Google OAuth users
                )
                created = True
            
            # Update user info if not new (but don't override if user already has data)
            if not created:
                updated = False
                if first_name and not user.first_name:
                    user.first_name = first_name
                    updated = True
                if last_name and not user.last_name:
                    user.last_name = last_name
                    updated = True
                if picture and not user.profile_picture:
                    user.profile_picture = picture
                    updated = True
                if updated:
                    user.save()
            
            # Refresh from DB to get latest state
            user.refresh_from_db()
            
            # Check for pending friend invites
            pending_invites = FriendInvite.objects.filter(
                email=email,
                is_accepted=False
            )
            
            for invite in pending_invites:
                # Create friend request
                friendship = Friendship.objects.create(
                    requester=invite.requester,
                    addressee=user,
                    status='pending'
                )
                
                # Mark invite as accepted
                invite.is_accepted = True
                invite.save()
                
                # Create notification
                notification = Notification.objects.create(
                    user=user,
                    notification_type='friend_request',
                    title='New Friend Request',
                    message=f"{invite.requester.first_name or invite.requester.email} sent you a friend request",
                    related_user=invite.requester
                )
                # Send push notification
                from .push_notifications import send_notification_push
                send_notification_push(notification)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Check profile completeness
            # Profile is complete only if user explicitly completed onboarding
            profile_complete = user.check_profile_complete()
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
                'profile_complete': profile_complete,
            }, status=status.HTTP_200_OK)
            
        except requests.exceptions.RequestException as e:
            return Response(
                {'error': f'OAuth error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Unexpected error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetRequestView(APIView):
    """Request password reset endpoint."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Send password reset email."""
        # Get language from request header
        lang = request.headers.get('Accept-Language', 'en')[:2] or 'en'
        if lang not in ['en', 'pt']:
            lang = 'en'
        activate(lang)
        
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            # Don't reveal if email exists for security reasons
            # Always return success message
            try:
                user = User.objects.get(email=email)
                # Create password reset token
                import secrets
                token = secrets.token_urlsafe(32)
                expires_at = timezone.now() + timezone.timedelta(hours=24)
                
                # Invalidate old tokens for this user
                PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
                
                # Create new token
                reset_token = PasswordResetToken.objects.create(
                    user=user,
                    token=token,
                    expires_at=expires_at
                )
                
                # Send email via Celery task
                send_password_reset_email_task.delay(user.id, token)
                
            except User.DoesNotExist:
                # User doesn't exist, but don't reveal this
                pass
            
            # Always return success message (security best practice)
            return Response({
                'message': 'If an account exists with this email, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'error': get_error_message('validation.validation_failed', lang),
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetView(APIView):
    """Password reset endpoint."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Reset password with token."""
        # Get language from request header
        lang = request.headers.get('Accept-Language', 'en')[:2] or 'en'
        if lang not in ['en', 'pt']:
            lang = 'en'
        activate(lang)
        
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            password = serializer.validated_data['password']
            
            try:
                reset_token = PasswordResetToken.objects.get(token=token)
                
                if not reset_token.is_valid():
                    return Response({
                        'error': get_error_message('auth.invalid_reset_token', lang)
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Update user password
                user = reset_token.user
                user.set_password(password)
                user.save()
                
                # Mark token as used
                reset_token.used = True
                reset_token.save()
                
                # Invalidate all other tokens for this user
                PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
                
                return Response({
                    'message': 'Password reset successfully. You can now login with your new password.'
                }, status=status.HTTP_200_OK)
                
            except PasswordResetToken.DoesNotExist:
                return Response({
                    'error': get_error_message('auth.invalid_reset_token', lang)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'error': get_error_message('validation.validation_failed', lang),
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user details."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user details."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch', 'put'])
    def update_profile(self, request):
        """Update user profile during onboarding."""
        from .serializers import UserProfileUpdateSerializer
        
        lang = request.headers.get('Accept-Language', 'en')[:2] or 'en'
        if lang not in ['en', 'pt']:
            lang = 'en'
        activate(lang)
        
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'user': UserSerializer(request.user).data,
                'profile_complete': request.user.check_profile_complete(),
            }, status=status.HTTP_200_OK)
        return Response({
            'error': get_error_message('validation.validation_failed', lang),
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['patch'])
    def update_push_notification_preference(self, request):
        """Update push notification preference (mark as asked)."""
        from .serializers import PushNotificationPreferenceSerializer
        
        lang = request.headers.get('Accept-Language', 'en')[:2] or 'en'
        if lang not in ['en', 'pt']:
            lang = 'en'
        activate(lang)
        
        serializer = PushNotificationPreferenceSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'user': UserSerializer(request.user).data,
            }, status=status.HTTP_200_OK)
        return Response({
            'error': get_error_message('validation.validation_failed', lang),
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class GroupViewSet(viewsets.ModelViewSet):
    """ViewSet for Group CRUD operations."""
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return groups where user is a member or owner."""
        user = self.request.user
        return Group.objects.filter(
            Q(owner=user) | Q(memberships__user=user)
        ).distinct()
    
    def perform_create(self, serializer):
        """Set the owner when creating a group and add owner as a member."""
        group = serializer.save(owner=self.request.user)
        # Add owner as a member automatically
        GroupMembership.objects.get_or_create(group=group, user=self.request.user)
    
    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=False, methods=['post'])
    def join(self, request):
        """Join a group using invite code."""
        invite_code = request.data.get('invite_code')
        if not invite_code:
            return Response(
                {'error': 'invite_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            group = Group.objects.get(invite_code=invite_code)
        except Group.DoesNotExist:
            return Response(
                {'error': 'Invalid invite code'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already a member
        if GroupMembership.objects.filter(group=group, user=request.user).exists():
            return Response(
                {'error': 'Already a member of this group'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create membership
        GroupMembership.objects.create(group=group, user=request.user)
        
        # Send push notification to the user who joined
        # Uncomment to enable push notifications when joining a group
        # from .push_notifications import send_group_invite_notification
        # send_group_invite_notification(
        #     user=request.user,
        #     group_name=group.name,
        #     inviter_name=group.owner.get_full_name() or group.owner.email
        # )
        
        serializer = self.get_serializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get all members of a group (only for members/owners)."""
        group = self.get_object()
        memberships = GroupMembership.objects.filter(group=group)
        serializer = GroupMembershipSerializer(memberships, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def invite_details(self, request, pk=None):
        """Get public group details for pending invites (only if user has pending invite)."""
        user = request.user
        
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response(
                {'error': 'Group not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is already a member
        is_member = GroupMembership.objects.filter(group=group, user=user).exists()
        if is_member:
            return Response(
                {'error': 'You are already a member of this group'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user has a pending invite for this group
        # Check by related_group first (new notifications)
        has_pending_invite = Notification.objects.filter(
            user=user,
            notification_type='group_invite',
            related_group_id=pk
        ).exists()
        
        # If not found, check by group name in message (old notifications)
        if not has_pending_invite:
            group_name_quoted = f'"{group.name}"'
            has_pending_invite = Notification.objects.filter(
                user=user,
                notification_type='group_invite',
                message__icontains=group_name_quoted
            ).exists()
        
        if not has_pending_invite:
            return Response(
                {'error': 'You do not have a pending invite for this group'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get members
        memberships = GroupMembership.objects.filter(group=group).select_related('user')
        members = [membership.user for membership in memberships]
        
        # Return public details
        return Response({
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'min_participants': group.min_participants,
            'member_count': group.get_member_count(),
            'draw_datetime': group.draw_datetime,
            'exchange_date': group.exchange_date,
            'owner': {
                'id': group.owner.id,
                'email': group.owner.email,
                'first_name': group.owner.first_name,
                'last_name': group.owner.last_name,
                'profile_picture': group.owner.profile_picture,
            },
            'members': [
                {
                    'id': member.id,
                    'email': member.email,
                    'first_name': member.first_name,
                    'last_name': member.last_name,
                    'profile_picture': member.profile_picture,
                }
                for member in members
            ],
        })
    
    @action(detail=True, methods=['post'])
    def invite_email(self, request, pk=None):
        """Send email invitation to join group."""
        group = self.get_object()
        
        # Check if user is owner
        if group.owner != request.user:
            return Response(
                {'error': 'Only the group owner can send invitations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        email = request.data.get('email')
        if not email:
            return Response(
                {'error': 'email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Execute task synchronously to ensure email is sent and notification is created
        result = send_invite_email_task(group.id, email)
        
        if result.get('error'):
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'message': 'Invitation email sent'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def pending_invites(self, request):
        """Get pending group invitations for the current user."""
        user = request.user
        # Get all notifications of type group_invite where user is the recipient
        notifications = Notification.objects.filter(
            user=user,
            notification_type='group_invite'
        ).select_related('related_group', 'related_user', 'related_group__owner').order_by('-created_at')
        
        # Filter out groups where user is already a member
        pending_invites = []
        for notification in notifications:
            group = notification.related_group
            
            # If no related_group, try to find group by name in message
            if not group:
                # Try to extract group name from message
                # Message format: "{owner_name} invited you to join the group \"{group.name}\""
                match = re.search(r'group "([^"]+)"', notification.message)
                if match:
                    group_name = match.group(1)
                    try:
                        # Try to find group by name where related_user is owner
                        if notification.related_user:
                            group = Group.objects.filter(
                                name=group_name,
                                owner=notification.related_user
                            ).first()
                    except:
                        pass
            
            # Only include if group exists and user is not a member
            if group and not GroupMembership.objects.filter(group=group, user=user).exists():
                pending_invites.append({
                    'id': notification.id,
                    'notification_id': notification.id,
                    'group': GroupSerializer(group, context={'request': request}).data,
                    'inviter': UserSerializer(notification.related_user).data if notification.related_user else None,
                    'created_at': notification.created_at,
                    'message': notification.message,
                })
        
        return Response(pending_invites)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for groups by name (excluding groups where user is already a member)."""
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query parameter "q" is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        # Get groups that match the query and user is not a member
        groups = Group.objects.filter(
            name__icontains=query
        ).exclude(
            Q(owner=user) | Q(memberships__user=user)
        ).distinct()[:20]
        
        serializer = GroupSerializer(groups, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def sent_invites(self, request):
        """Get groups where user is owner and has sent invitations."""
        user = request.user
        # Get notifications of type group_invite where user is the inviter (related_user)
        # and related_group is owned by user
        notifications = Notification.objects.filter(
            notification_type='group_invite',
            related_user=user,
            related_group__owner=user
        ).select_related('related_group', 'user', 'related_group__owner').order_by('-created_at')
        
        sent_invites = []
        for notification in notifications:
            # Check if the invited user is still not a member
            invited_user = notification.user
            is_pending = not GroupMembership.objects.filter(
                group=notification.related_group,
                user=invited_user
            ).exists()
            
            sent_invites.append({
                'id': notification.id,
                'notification_id': notification.id,
                'group': GroupSerializer(notification.related_group, context={'request': request}).data,
                'invited_user': UserSerializer(invited_user).data,
                'created_at': notification.created_at,
                'is_pending': is_pending,
                'message': notification.message,
            })
        
        return Response(sent_invites)
    
    @action(detail=True, methods=['post'])
    def draw(self, request, pk=None):
        """Trigger the Secret Santa draw."""
        group = self.get_object()
        
        # Check if user is owner
        if group.owner != request.user:
            return Response(
                {'error': 'Only the group owner can trigger the draw'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate draw conditions
        if group.is_drawn:
            return Response(
                {'error': 'Draw has already been completed for this group'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not group.can_draw():
            member_count = group.get_member_count()
            now = timezone.now()
            errors = []
            
            if now < group.draw_datetime:
                errors.append(f'Draw can only happen after {group.draw_datetime}')
            if member_count < group.min_participants:
                errors.append(
                    f'Need at least {group.min_participants} participants, '
                    f'currently have {member_count}'
                )
            if not group.all_members_have_gift_ideas():
                members_without_ideas = group.get_members_without_gift_ideas()
                member_emails = [m.email for m in members_without_ideas]
                errors.append(
                    f'All members must have at least one gift idea. '
                    f'Members without gift ideas: {", ".join(member_emails)}'
                )
            
            return Response(
                {'error': 'Draw conditions not met', 'details': errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Execute draw synchronously to ensure assignments are created
        # This ensures assignments are created immediately
        from .tasks import execute_draw_task
        result = execute_draw_task(group.id)
        
        if result.get('error'):
            # If error occurred, revert is_drawn flag
            group.is_drawn = False
            group.draw_completed_at = None
            group.save()
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Refresh group to get updated data
        group.refresh_from_db()
        
        return Response({
            'message': result.get('message', 'Draw completed successfully'),
            'is_drawn': group.is_drawn,
            'draw_completed_at': group.draw_completed_at
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def members_without_gift_ideas(self, request, pk=None):
        """Get list of members who don't have gift ideas for this group."""
        group = self.get_object()
        
        # Check if user is owner or member
        if group.owner != request.user and not GroupMembership.objects.filter(group=group, user=request.user).exists():
            return Response(
                {'error': 'You are not a member of this group'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        members_without_ideas = group.get_members_without_gift_ideas()
        from .serializers import UserSerializer
        serializer = UserSerializer(members_without_ideas, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def my_assignment(self, request, pk=None):
        """Get current user's assignment (who they need to give to)."""
        group = self.get_object()
        
        # Check if user is a member
        if not GroupMembership.objects.filter(group=group, user=request.user).exists():
            return Response(
                {'error': 'You are not a member of this group'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not group.is_drawn:
            return Response({
                'message': 'Draw has not been completed yet',
                'receiver': None
            }, status=status.HTTP_200_OK)
        
        try:
            assignment = SecretSantaAssignment.objects.get(
                group=group,
                giver=request.user
            )
            serializer = SecretSantaAssignmentSerializer(assignment)
            return Response(serializer.data)
        except SecretSantaAssignment.DoesNotExist:
            # Assignment might still be being created by Celery task
            return Response({
                'message': 'Assignment is being processed',
                'receiver': None
            }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def who_drew_me(self, request, pk=None):
        """Get who drew the current user (only visible after reveal)."""
        group = self.get_object()
        
        # Check if user is a member
        if not GroupMembership.objects.filter(group=group, user=request.user).exists():
            return Response(
                {'error': 'You are not a member of this group'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not group.is_drawn:
            return Response({
                'message': 'Draw has not been completed yet',
                'giver': None
            }, status=status.HTTP_200_OK)
        
        # Check if revealed (manual or automatic)
        now = timezone.now()
        is_revealed = group.is_revealed or (group.reveal_datetime and now >= group.reveal_datetime)
        
        if not is_revealed:
            # Check if exchange_date has passed (fallback)
            today = timezone.now().date()
            if today >= group.exchange_date:
                is_revealed = True
            else:
                from datetime import date
                reveal_date = group.reveal_datetime.date() if group.reveal_datetime else group.exchange_date
                return Response({
                    'message': f'Revelation will happen on {reveal_date}',
                    'reveal_date': reveal_date.isoformat() if isinstance(reveal_date, date) else str(reveal_date),
                    'giver': None
                }, status=status.HTTP_200_OK)
        
        try:
            assignment = SecretSantaAssignment.objects.get(
                group=group,
                receiver=request.user
            )
            serializer = SecretSantaAssignmentSerializer(assignment)
            return Response(serializer.data)
        except SecretSantaAssignment.DoesNotExist:
            # Assignment might still be being created by Celery task
            return Response({
                'message': 'Assignment is being processed',
                'giver': None
            }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def secret_santa_gift_ideas(self, request, pk=None):
        """Get gift ideas of the user's Secret Santa (who drew me).
        Can be accessed before reveal, but user won't know who it is until reveal."""
        group = self.get_object()
        
        # Check if user is a member
        if not GroupMembership.objects.filter(group=group, user=request.user).exists():
            return Response(
                {'error': 'You are not a member of this group'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not group.is_drawn:
            return Response({
                'message': 'Draw has not been completed yet',
                'ideas': []
            }, status=status.HTTP_200_OK)
        
        try:
            # Get who drew me (my Secret Santa)
            assignment = SecretSantaAssignment.objects.get(
                group=group,
                receiver=request.user
            )
            # Get gift ideas of my Secret Santa (the giver)
            # User can see the ideas even before reveal, but won't know who it is
            from .models import GiftIdea
            ideas = GiftIdea.objects.filter(
                group=group,
                author=assignment.giver
            )
            from .serializers import GiftIdeaSerializer
            serializer = GiftIdeaSerializer(ideas, many=True)
            return Response(serializer.data)
        except SecretSantaAssignment.DoesNotExist:
            # Assignment might still be being created by Celery task
            return Response(
                [],
                status=status.HTTP_200_OK
            )
    
    @action(detail=True, methods=['post'])
    def reveal(self, request, pk=None):
        """Reveal secret santas (owner only). Can be immediate or scheduled."""
        group = self.get_object()
        
        # Check if user is owner
        if group.owner != request.user:
            return Response(
                {'error': 'Only the group owner can reveal secret santas'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not group.is_drawn:
            return Response(
                {'error': 'Draw has not been completed yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reveal_datetime = request.data.get('reveal_datetime', None)
        
        if reveal_datetime:
            # Scheduled reveal
            try:
                from django.utils.dateparse import parse_datetime
                parsed_datetime = parse_datetime(reveal_datetime)
                if not parsed_datetime:
                    return Response(
                        {'error': 'Invalid datetime format'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                group.reveal_datetime = parsed_datetime
                group.is_revealed = False
                group.save()
                return Response({
                    'message': f'Secret santas will be revealed on {parsed_datetime}',
                    'reveal_datetime': parsed_datetime
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response(
                    {'error': f'Invalid datetime: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Immediate reveal
            group.is_revealed = True
            group.reveal_datetime = timezone.now()
            group.save()
            
            # Send notifications and emails
            from .tasks import send_reveal_notifications
            send_reveal_notifications.delay(group.id)
            
            return Response({
                'message': 'Secret santas have been revealed',
                'reveal_datetime': group.reveal_datetime
            }, status=status.HTTP_200_OK)
    
    def destroy(self, request, pk=None):
        """Delete a group (only owner can delete)."""
        group = self.get_object()
        
        # Check if user is owner
        if group.owner != request.user:
            return Response(
                {'error': 'Only the group owner can delete the group'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        group.delete()
        return Response({'message': 'Group deleted successfully'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        """Get all permissions for a group (only owner can view)."""
        group = self.get_object()
        
        # Check if user is owner
        if group.owner != request.user:
            return Response(
                {'error': 'Only the group owner can view permissions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        permissions = GroupPermission.objects.filter(group=group)
        serializer = GroupPermissionSerializer(permissions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post', 'patch', 'put'])
    def update_permission(self, request, pk=None):
        """Create or update a member's permission (only owner can modify)."""
        group = self.get_object()
        
        # Check if user is owner
        if group.owner != request.user:
            return Response(
                {'error': 'Only the group owner can modify permissions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is a member
        try:
            member = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not GroupMembership.objects.filter(group=group, user=member).exists():
            return Response(
                {'error': 'User is not a member of this group'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cannot modify owner's permissions
        if member == group.owner:
            return Response(
                {'error': 'Cannot modify owner permissions'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create permission
        permission, created = GroupPermission.objects.get_or_create(
            group=group,
            user=member,
            defaults={
                'can_edit_settings': False,
                'can_invite_members': False,
                'can_send_messages': False
            }
        )
        
        # Update permission
        serializer = GroupPermissionUpdateSerializer(permission, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            response_serializer = GroupPermissionSerializer(permission)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GiftIdeaViewSet(viewsets.ModelViewSet):
    """ViewSet for Gift Idea CRUD operations."""
    serializer_class = GiftIdeaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return gift ideas for the current user in groups where they are a member."""
        user = self.request.user
        group_id = self.request.query_params.get('group', None)
        
        # Filter by author (current user) and groups where user is a member
        queryset = GiftIdea.objects.filter(
            author=user,
            group__memberships__user=user
        ).distinct()
        
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the author when creating a gift idea."""
        try:
            serializer.save(author=self.request.user)
        except IntegrityError as e:
            # Check if it's a duplicate title error
            if 'api_giftidea_group_id_author_id_title' in str(e) or 'unique constraint' in str(e).lower():
                # Get language from request
                language = self.request.META.get('HTTP_ACCEPT_LANGUAGE', 'en')[:2].lower()
                if language not in ['pt', 'en']:
                    language = 'en'
                
                from .error_messages import get_error_message
                error_msg = get_error_message('gift_ideas.duplicate_title', language)
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'title': error_msg
                })
            # Re-raise if it's a different integrity error
            raise
    
    def get_object(self):
        """Get object and ensure it belongs to the current user."""
        obj = super().get_object()
        # Additional check: ensure the gift idea belongs to the current user
        if obj.author != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only modify your own gift ideas.')
        return obj
    
    def perform_update(self, serializer):
        """Handle update with duplicate title check."""
        # get_object() already ensures the gift idea belongs to the current user
        try:
            serializer.save()
        except IntegrityError as e:
            # Check if it's a duplicate title error
            if 'api_giftidea_group_id_author_id_title' in str(e) or 'unique constraint' in str(e).lower():
                # Get language from request
                language = self.request.META.get('HTTP_ACCEPT_LANGUAGE', 'en')[:2].lower()
                if language not in ['pt', 'en']:
                    language = 'en'
                
                from .error_messages import get_error_message
                error_msg = get_error_message('gift_ideas.duplicate_title', language)
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'title': error_msg
                })
            # Re-raise if it's a different integrity error
            raise
    
    @action(detail=True, methods=['get'])
    def receiver_ideas(self, request, pk=None):
        """Get gift ideas of the user's receiver in a group."""
        group = get_object_or_404(Group, pk=pk)
        
        # Check if user is a member
        if not GroupMembership.objects.filter(group=group, user=request.user).exists():
            return Response(
                {'error': 'You are not a member of this group'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not group.is_drawn:
            return Response({
                'message': 'Draw has not been completed yet',
                'ideas': []
            }, status=status.HTTP_200_OK)
        
        try:
            assignment = SecretSantaAssignment.objects.get(
                group=group,
                giver=request.user
            )
            ideas = GiftIdea.objects.filter(
                group=group,
                author=assignment.receiver
            )
            serializer = self.get_serializer(ideas, many=True)
            return Response(serializer.data)
        except SecretSantaAssignment.DoesNotExist:
            return Response(
                {'error': 'Assignment not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class FriendshipViewSet(viewsets.ModelViewSet):
    """ViewSet for Friendship operations."""
    serializer_class = FriendshipSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return friendships where user is requester or addressee."""
        user = self.request.user
        return Friendship.objects.filter(
            Q(requester=user) | Q(addressee=user)
        )
    
    def perform_create(self, serializer):
        """Create friend request."""
        addressee_id = self.request.data.get('addressee')
        if not addressee_id:
            raise serializers.ValidationError({'addressee': 'This field is required.'})
        
        addressee = get_object_or_404(User, pk=addressee_id)
        if addressee == self.request.user:
            raise serializers.ValidationError({'addressee': 'Cannot send friend request to yourself.'})
        
        # Check if friendship already exists
        existing = Friendship.objects.filter(
            Q(requester=self.request.user, addressee=addressee) |
            Q(requester=addressee, addressee=self.request.user)
        ).first()
        
        if existing:
            raise serializers.ValidationError({'addressee': 'Friendship already exists.'})
        
        serializer.save(requester=self.request.user, addressee=addressee, status='pending')
        
        # Create notification
        notification = Notification.objects.create(
            user=addressee,
            notification_type='friend_request',
            title='New Friend Request',
            message=f"{self.request.user.first_name or self.request.user.email} sent you a friend request",
            related_user=self.request.user
        )
        # Send push notification
        from .push_notifications import send_notification_push
        send_notification_push(notification)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a friend request."""
        friendship = self.get_object()
        if friendship.addressee != request.user:
            return Response(
                {'error': 'You can only accept requests sent to you'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        friendship.status = 'accepted'
        friendship.save()
        
        # Create notification
        notification = Notification.objects.create(
            user=friendship.requester,
            notification_type='friend_accepted',
            title='Friend Request Accepted',
            message=f"{request.user.first_name or request.user.email} accepted your friend request",
            related_user=request.user
        )
        # Send push notification
        from .push_notifications import send_notification_push
        send_notification_push(notification)
        
        serializer = self.get_serializer(friendship)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def friends(self, request):
        """Get list of accepted friends."""
        user = request.user
        friendships = Friendship.objects.filter(
            Q(requester=user) | Q(addressee=user),
            status='accepted'
        )
        
        friends = []
        for friendship in friendships:
            friend = friendship.addressee if friendship.requester == user else friendship.requester
            friends.append(friend)
        
        serializer = UserSerializer(friends, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for users to add as friends."""
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query parameter "q" is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Exclude current user and existing friends/requests
        user = request.user
        existing_friendships = Friendship.objects.filter(
            Q(requester=user) | Q(addressee=user)
        ).values_list('requester_id', 'addressee_id')
        
        excluded_ids = {user.id}
        for req_id, addr_id in existing_friendships:
            excluded_ids.add(req_id)
            excluded_ids.add(addr_id)
        
        users = User.objects.filter(
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(username__icontains=query)
        ).exclude(id__in=excluded_ids)[:20]
        
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def invite_by_email(self, request):
        """Send friend invitation by email to a non-registered user."""
        email = request.data.get('email')
        if not email:
            return Response(
                {'error': 'email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user exists
        try:
            existing_user = User.objects.get(email=email)
            # If user exists, send friend request directly
            if existing_user == request.user:
                return Response(
                    {'error': 'Cannot send friend request to yourself'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if friendship already exists
            existing_friendship = Friendship.objects.filter(
                Q(requester=request.user, addressee=existing_user) |
                Q(requester=existing_user, addressee=request.user)
            ).first()
            
            if existing_friendship:
                return Response(
                    {'error': 'Friendship already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create friend request
            friendship = Friendship.objects.create(
                requester=request.user,
                addressee=existing_user,
                status='pending'
            )
            
            # Create notification
            notification = Notification.objects.create(
                user=existing_user,
                notification_type='friend_request',
                title='New Friend Request',
                message=f"{request.user.first_name or request.user.email} sent you a friend request",
                related_user=request.user
            )
            # Send push notification
            from .push_notifications import send_notification_push
            send_notification_push(notification)
            
            return Response({
                'message': 'Friend request sent',
                'friendship_id': friendship.id
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            # User doesn't exist, create invite and send email
            # Check if invite already exists
            invite, created = FriendInvite.objects.get_or_create(
                requester=request.user,
                email=email,
                defaults={'is_accepted': False}
            )
            
            if not created:
                return Response(
                    {'error': 'Invitation already sent to this email'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Execute task synchronously to ensure email is sent
            result = send_friend_invite_email_task(request.user.id, email)
            
            if result.get('error'):
                return Response(
                    {'error': result['error']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'message': 'Invitation email sent'
            }, status=status.HTTP_200_OK)


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for Message operations."""
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        OPTIMIZED: Return messages where user is sender or receiver, ordered by most recent first.
        Uses select_related to avoid N+1 queries and only() to limit selected fields.
        """
        user = self.request.user
        other_user_id = self.request.query_params.get('user')
        
        if other_user_id:
            other_user = get_object_or_404(User, pk=other_user_id)
            # OPTIMIZATION: Use select_related to preload sender and receiver
            # OPTIMIZATION: Use only() to limit fields to what's needed
            return Message.objects.filter(
                Q(sender=user, receiver=other_user) | Q(sender=other_user, receiver=user)
            ).select_related(
                'sender',
                'receiver'
            ).only(
                'id',
                'content',
                'is_read',
                'created_at',
                'sender__id',
                'sender__email',
                'sender__first_name',
                'sender__last_name',
                'sender__profile_picture',
                'receiver__id',
                'receiver__email',
                'receiver__first_name',
                'receiver__last_name',
                'receiver__profile_picture'
            ).order_by('-created_at')
        
        # OPTIMIZATION: Apply same optimizations for general queryset
        return Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).select_related(
            'sender',
            'receiver'
        ).only(
            'id',
            'content',
            'is_read',
            'created_at',
            'sender__id',
            'sender__email',
            'sender__first_name',
            'sender__last_name',
            'sender__profile_picture',
            'receiver__id',
            'receiver__email',
            'receiver__first_name',
            'receiver__last_name',
            'receiver__profile_picture'
        ).order_by('-created_at')
    
    def perform_create(self, serializer):
        """
        OPTIMIZED: Create a message with efficient friend check and WebSocket push.
        """
        receiver_id = self.request.data.get('receiver')
        if not receiver_id:
            raise serializers.ValidationError({'receiver': 'This field is required.'})
        
        receiver = get_object_or_404(User, pk=receiver_id)
        
        # OPTIMIZATION: Efficient friend check with exists() - stops after first match
        friendship = Friendship.objects.filter(
            Q(requester=self.request.user, addressee=receiver) |
            Q(requester=receiver, addressee=self.request.user),
            status='accepted'
        ).exists()
        
        if not friendship:
            raise serializers.ValidationError({'receiver': 'You can only message your friends.'})
        
        # Save message efficiently
        message = serializer.save(sender=self.request.user, receiver=receiver)
        
        # OPTIMIZATION: Send WebSocket event with minimal data - only what client needs
        try:
            from .utils.pusher_client import pusher_client
            import logging
            logger = logging.getLogger(__name__)
            
            if pusher_client:
                # OPTIMIZATION: Send only essential fields in WebSocket event
                message_data = {
                    'id': message.id,
                    'sender_id': message.sender.id,
                    'receiver_id': message.receiver.id,
                    'content': message.content,
                    'created_at': message.created_at.isoformat(),
                    'sender_name': self.request.user.first_name or self.request.user.email,
                    'is_read': message.is_read,  # Include is_read status
                }
                # Send to receiver's channel
                channel_name = f"private-user-{receiver.id}"
                pusher_client.trigger(channel_name, "new-message", message_data)
                logger.info(f"Sent WebSocket event 'new-message' to channel {channel_name} for message {message.id}")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send WebSocket event for message {message.id}: {str(e)}", exc_info=True)
        
        # Create notification for the message
        try:
            sender_name = self.request.user.first_name or self.request.user.email
            notification = Notification.objects.create(
                user=receiver,
                notification_type='message',
                title=f'New message from {sender_name}',
                message=message.content[:200],  # First 200 characters
                related_user=self.request.user
            )
            # Send push notification (this will also send WebSocket event)
            from .push_notifications import send_notification_push
            send_notification_push(notification)
        except Exception as e:
            # Log error but don't fail message creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create notification for message: {str(e)}")
    
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """
        OPTIMIZED: Get list of conversations with efficient queries.
        Uses select_related, only(), and annotate for better performance.
        """
        from django.db.models import Count
        
        user = request.user
        
        # OPTIMIZATION: Get unique user IDs efficiently
        sent_user_ids = Message.objects.filter(sender=user).values_list('receiver_id', flat=True).distinct()
        received_user_ids = Message.objects.filter(receiver=user).values_list('sender_id', flat=True).distinct()
        user_ids = set(list(sent_user_ids) + list(received_user_ids))
        
        if not user_ids:
            return Response([])
        
        # OPTIMIZATION: Annotate unread count directly in queryset with only() to limit fields
        users = User.objects.filter(id__in=user_ids).only(
            'id',
            'email',
            'first_name',
            'last_name',
            'profile_picture'
        ).annotate(
            unread_count=Count(
                'sent_messages',
                filter=Q(sent_messages__receiver=user, sent_messages__is_read=False)
            )
        )
        
        conversations = []
        for other_user in users:
            # OPTIMIZATION: Get last message efficiently with select_related and only()
            last_message = Message.objects.filter(
                Q(sender=user, receiver=other_user) | Q(sender=other_user, receiver=user)
            ).select_related('sender', 'receiver').only(
                'id',
                'content',
                'created_at',
                'sender__id',
                'sender__email',
                'sender__first_name',
                'sender__last_name',
                'sender__profile_picture',
                'receiver__id',
                'receiver__email'
            ).order_by('-created_at').first()
            
            conversations.append({
                'user': UserSerializer(other_user).data,
                'last_message': MessageSerializer(last_message).data if last_message else None,
                'unread_count': other_user.unread_count
            })
        
        return Response(conversations)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark message as read."""
        message = self.get_object()
        if message.receiver != request.user:
            return Response(
                {'error': 'You can only mark your own received messages as read'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.is_read = True
        message.save()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """
        OPTIMIZED: Mark all messages from a user as read using bulk update.
        Already optimized with .update() - single query execution.
        """
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        other_user = get_object_or_404(User, pk=user_id)
        
        # OPTIMIZATION: Already using .update() which is efficient (single SQL UPDATE)
        # Count affected rows for response
        updated_count = Message.objects.filter(
            sender=other_user,
            receiver=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({
            'message': 'All messages marked as read',
            'updated_count': updated_count
        })
    
    @action(detail=False, methods=['post'])
    def typing_indicator(self, request):
        """
        OPTIMIZED: Send typing indicator to receiver - lightweight endpoint.
        No DB writes, only friend check and WebSocket push.
        """
        receiver_id = request.data.get('receiver_id')
        is_typing = request.data.get('is_typing', True)
        
        if not receiver_id:
            return Response({'error': 'receiver_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # OPTIMIZATION: Only fetch receiver if needed, use minimal fields
        receiver = User.objects.only('id').filter(pk=receiver_id).first()
        if not receiver:
            return Response({'error': 'Receiver not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # OPTIMIZATION: Efficient friend check with exists() - stops after first match
        friendship = Friendship.objects.filter(
            Q(requester=request.user, addressee=receiver) |
            Q(requester=receiver, addressee=request.user),
            status='accepted'
        ).exists()
        
        if not friendship:
            return Response({'error': 'You can only send typing indicators to your friends.'}, status=status.HTTP_403_FORBIDDEN)
        
        # OPTIMIZATION: Lightweight - only send WebSocket event, no DB writes
        try:
            from .utils.pusher_client import pusher_client
            import logging
            logger = logging.getLogger(__name__)
            
            if pusher_client:
                # OPTIMIZATION: Send only essential data
                typing_data = {
                    'sender_id': request.user.id,
                    'receiver_id': receiver.id,
                    'is_typing': is_typing,
                    'sender_name': request.user.first_name or request.user.email,
                }
                # Send to receiver's channel
                channel_name = f"private-user-{receiver.id}"
                pusher_client.trigger(channel_name, "user-typing", typing_data)
                logger.debug(f"Sent typing indicator to channel {channel_name}")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send typing indicator: {str(e)}", exc_info=True)
        
        return Response({'message': 'Typing indicator sent'})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Notification operations."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return notifications for current user."""
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read."""
        notification = self.get_object()
        if notification.user != request.user:
            return Response(
                {'error': 'You can only mark your own notifications as read'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        notification.is_read = True
        notification.save()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read'})
    
    @action(detail=True, methods=['delete', 'post'])
    def reject_group_invite(self, request, pk=None):
        """Reject a group invite by deleting the notification."""
        notification = self.get_object()
        
        if notification.user != request.user:
            return Response(
                {'error': 'You can only reject your own invitations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if notification.notification_type != 'group_invite':
            return Response(
                {'error': 'This notification is not a group invite'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete the notification
        notification.delete()
        
        return Response({'message': 'Group invite rejected'}, status=status.HTTP_200_OK)


class CookieConsentView(APIView):
    """
    View for managing cookie consent.
    GET: Returns the latest consent for authenticated user (if logged in)
    POST: Creates a new consent record
    """
    permission_classes = [AllowAny]  # Allow anonymous users
    
    def get(self, request):
        """Get the latest consent for the authenticated user."""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required to retrieve consent'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        consent = CookieConsent.objects.filter(user=request.user).order_by('-timestamp').first()
        
        if not consent:
            return Response({'consent': None})
        
        serializer = CookieConsentSerializer(consent)
        return Response({'consent': serializer.data})
    
    def post(self, request):
        """Create a new consent record."""
        serializer = CookieConsentCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get client IP and user agent
        ip_address = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]  # Limit length
        
        # Generate anonymous ID if user is not authenticated
        anonymous_id = None
        if not request.user.is_authenticated:
            import secrets
            anonymous_id = secrets.token_urlsafe(32)
        
        # Create consent record
        consent = CookieConsent.objects.create(
            user=request.user if request.user.is_authenticated else None,
            anonymous_id=anonymous_id,
            necessary=serializer.validated_data.get('necessary', True),
            functional=serializer.validated_data.get('functional', False),
            analytics=serializer.validated_data.get('analytics', False),
            marketing=serializer.validated_data.get('marketing', False),
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        response_serializer = CookieConsentSerializer(consent)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def _get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PushVapidPublicKeyView(APIView):
    """
    View to return VAPID public key for frontend.
    Public key is safe to expose to clients.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Return VAPID public key."""
        from django.conf import settings
        public_key = getattr(settings, 'WEBPUSH_VAPID_PUBLIC_KEY', None)
        
        if not public_key:
            return Response(
                {'error': 'VAPID public key not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({'public_key': public_key})


class PushSubscribeView(APIView):
    """
    View to subscribe user to push notifications.
    Stores push subscription linked to authenticated user.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create or update push subscription."""
        serializer = PushSubscriptionCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        endpoint = serializer.validated_data['endpoint']
        keys = serializer.validated_data['keys']
        
        # Detect device type from user agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        device_type = self._detect_device_type(user_agent)
        
        # Create or update subscription
        subscription, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                'user': request.user,
                'p256dh': keys['p256dh'],
                'auth': keys['auth'],
                'user_agent': user_agent[:500],  # Limit length
                'device_type': device_type,
            }
        )
        
        response_serializer = PushSubscriptionSerializer(subscription)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    def _detect_device_type(self, user_agent):
        """Detect device type from user agent string."""
        if not user_agent:
            return 'unknown'
        
        user_agent_lower = user_agent.lower()
        
        if any(mobile in user_agent_lower for mobile in ['mobile', 'android', 'iphone', 'ipod']):
            return 'mobile'
        elif any(tablet in user_agent_lower for tablet in ['tablet', 'ipad']):
            return 'tablet'
        else:
            return 'desktop'


class PushUnsubscribeView(APIView):
    """
    View to unsubscribe user from push notifications.
    Deletes push subscription for the given endpoint.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Delete push subscription."""
        endpoint = request.data.get('endpoint')
        
        if not endpoint:
            return Response(
                {'error': 'endpoint is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Only delete subscriptions belonging to the current user
        deleted_count, _ = PushSubscription.objects.filter(
            user=request.user,
            endpoint=endpoint
        ).delete()
        
        if deleted_count == 0:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({'message': 'Unsubscribed successfully'})


class PushTestView(APIView):
    """
    View to send a test push notification to the current user.
    Useful for testing push notification setup.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Send test notification to all user's subscriptions."""
        from .push_notifications import send_web_push_to_user
        
        payload = {
            'title': 'Notificação de teste',
            'body': 'As notificações do Amigo Secreto estão a funcionar ✅',
            'icon': '/src/assets/img/logo_128.png',
            'badge': '/src/assets/img/logo_64.png',
            'url': '/dashboard',
            'tag': 'test-notification',
        }
        
        try:
            results = send_web_push_to_user(request.user, payload)
            return Response({
                'message': 'Test notification sent',
                'results': results,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class PusherAuthView(APIView):
    """
    View to authenticate Pusher/Soketi private channels.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Authenticate Pusher channel subscription."""
        from .utils.pusher_client import pusher_client
        import json
        import logging
        
        logger = logging.getLogger(__name__)
        
        # Log authentication attempt
        logger.debug(f"Pusher auth request from user {request.user.id if hasattr(request, 'user') else 'anonymous'}")
        
        if not pusher_client:
            logger.error("Pusher client not configured")
            return Response(
                {'error': 'Pusher client not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            # Pusher JS sends data as form data (application/x-www-form-urlencoded)
            # Try to get from request.data first (DRF handles both JSON and form data)
            body = {}
            
            if hasattr(request, 'data') and request.data:
                body = dict(request.data)
            elif hasattr(request, 'POST') and request.POST:
                body = dict(request.POST)
            elif hasattr(request, 'body') and request.body:
                body_str = request.body.decode('utf-8') if isinstance(request.body, bytes) else request.body
                # Try to parse as JSON
                try:
                    if body_str:
                        body = json.loads(body_str)
                except (json.JSONDecodeError, UnicodeDecodeError):
                    # Try to parse as form data
                    try:
                        from urllib.parse import parse_qs
                        body = {k: v[0] if len(v) == 1 else v for k, v in parse_qs(body_str).items()}
                    except:
                        body = {}
            
            # Extract values, handling both single values and lists (form data can return lists)
            socket_id_raw = body.get("socket_id") or body.get("socketId")
            channel_raw = body.get("channel_name") or body.get("channelName")
            
            # If it's a list, get the first element
            socket_id = socket_id_raw[0] if isinstance(socket_id_raw, list) else socket_id_raw
            channel = channel_raw[0] if isinstance(channel_raw, list) else channel_raw
            
            logger.debug(f"Pusher auth request - socket_id: {socket_id}, channel: {channel}, user: {request.user.id}")
            
            if not socket_id or not channel:
                logger.warning(f"Missing required fields - socket_id: {socket_id}, channel: {channel}")
                return Response(
                    {'error': 'socket_id and channel_name are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Only allow private channels for the authenticated user
            if channel.startswith("private-user-"):
                user_id = channel.replace("private-user-", "")
                if str(request.user.id) != user_id:
                    logger.warning(f"Unauthorized channel access attempt - user {request.user.id} tried to access channel for user {user_id}")
                    return Response(
                        {'error': 'Unauthorized channel access'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            auth = pusher_client.authenticate(
                channel=channel,
                socket_id=socket_id
            )
            logger.debug(f"Pusher auth successful for channel {channel}, user {request.user.id}")
            return Response(auth)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in Pusher auth request: {str(e)}")
            return Response(
                {'error': 'Invalid JSON'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Pusher auth error: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

