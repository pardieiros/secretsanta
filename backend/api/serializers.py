"""
Serializers for Secret Santa API.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from django.utils.translation import get_language
from .models import User, Group, GroupMembership, GroupPermission, SecretSantaAssignment, GiftIdea, Friendship, Message, Notification, PasswordResetToken, CookieConsent, PushSubscription
from .error_messages import get_error_message


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer to use email instead of username."""
    username_field = 'email'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Replace 'username' field with 'email' field
        if 'username' in self.fields:
            self.fields['email'] = self.fields.pop('username')
    
    def validate(self, attrs):
        # The parent class will use username_field='email' to look for attrs['email']
        # No need to map, just pass through
        return super().validate(attrs)


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'password2']
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate_email(self, value):
        """Validate email is unique."""
        if User.objects.filter(email=value).exists():
            lang = get_language()[:2] if get_language() else 'en'
            raise serializers.ValidationError(
                get_error_message('validation.email_exists', lang)
            )
        return value
    
    def validate_username(self, value):
        """Validate username is unique."""
        if User.objects.filter(username=value).exists():
            lang = get_language()[:2] if get_language() else 'en'
            raise serializers.ValidationError(
                get_error_message('validation.username_exists', lang)
            )
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            lang = get_language()[:2] if get_language() else 'en'
            raise serializers.ValidationError({
                "password": get_error_message('validation.password_mismatch', lang)
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""
    profile_complete = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'phone', 'profile_picture', 'profile_complete']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile during onboarding."""
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'profile_picture', 'profile_complete']
    
    def validate(self, attrs):
        # If profile_complete is being set to True, ensure required fields are present
        if attrs.get('profile_complete', False):
            if not attrs.get('first_name') and not self.instance.first_name:
                raise serializers.ValidationError({'first_name': 'First name is required to complete profile.'})
            if not attrs.get('last_name') and not self.instance.last_name:
                raise serializers.ValidationError({'last_name': 'Last name is required to complete profile.'})
        return attrs


class GroupSerializer(serializers.ModelSerializer):
    """Serializer for Group model."""
    owner = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    can_draw = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'owner', 'min_participants',
            'draw_datetime', 'exchange_date', 'invite_code', 'auto_draw_enabled',
            'is_drawn', 'draw_completed_at', 'is_revealed', 'reveal_datetime',
            'created_at', 'updated_at', 'member_count', 'can_draw', 'is_member', 'is_owner',
            'visibility', 'location_name', 'location_latitude', 'location_longitude'
        ]
        read_only_fields = ['invite_code', 'is_drawn', 'draw_completed_at', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.get_member_count()
    
    def get_can_draw(self, obj):
        return obj.can_draw()
    
    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return GroupMembership.objects.filter(group=obj, user=request.user).exists()
        return False
    
    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.owner == request.user
        return False
    
    def validate(self, attrs):
        """Validate that draw_datetime is before exchange_date and public groups have location."""
        draw_datetime = attrs.get('draw_datetime', self.instance.draw_datetime if self.instance else None)
        exchange_date = attrs.get('exchange_date', self.instance.exchange_date if self.instance else None)
        visibility = attrs.get('visibility', self.instance.visibility if self.instance else 'private')
        location_name = attrs.get('location_name', self.instance.location_name if self.instance else None)
        location_latitude = attrs.get('location_latitude', self.instance.location_latitude if self.instance else None)
        location_longitude = attrs.get('location_longitude', self.instance.location_longitude if self.instance else None)
        
        if draw_datetime and exchange_date:
            if draw_datetime.date() >= exchange_date:
                raise serializers.ValidationError({
                    'draw_datetime': 'Draw datetime must be before exchange date.'
                })
        
        if visibility == 'public':
            if not (location_name and location_latitude is not None and location_longitude is not None):
                raise serializers.ValidationError({
                    'location_name': 'Public groups must have a location (name, latitude, and longitude).'
                })
        
        return attrs


class GroupMembershipSerializer(serializers.ModelSerializer):
    """Serializer for GroupMembership."""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = GroupMembership
        fields = ['id', 'user', 'joined_at']


class GroupPermissionSerializer(serializers.ModelSerializer):
    """Serializer for GroupPermission."""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = GroupPermission
        fields = ['id', 'user', 'can_edit_settings', 'can_invite_members', 'can_send_messages', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class GroupPermissionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating GroupPermission."""
    
    class Meta:
        model = GroupPermission
        fields = ['can_edit_settings', 'can_invite_members', 'can_send_messages']


class SecretSantaAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for Secret Santa assignments."""
    giver = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    
    class Meta:
        model = SecretSantaAssignment
        fields = ['id', 'giver', 'receiver', 'created_at']


class GiftIdeaSerializer(serializers.ModelSerializer):
    """Serializer for Gift Ideas."""
    author = UserSerializer(read_only=True)
    
    class Meta:
        model = GiftIdea
        fields = ['id', 'group', 'author', 'title', 'description', 'created_at', 'updated_at']
        read_only_fields = ['author', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        """Validate that user doesn't exceed max ideas per group and no duplicate titles."""
        request = self.context.get('request')
        group = attrs.get('group', self.instance.group if self.instance else None)
        title = attrs.get('title')
        
        if request and request.user.is_authenticated and group:
            # Check max ideas per group
            existing_count = GiftIdea.objects.filter(
                group=group,
                author=request.user
            ).exclude(pk=self.instance.pk if self.instance else None).count()
            
            if existing_count >= GiftIdea.MAX_IDEAS_PER_USER_PER_GROUP:
                raise serializers.ValidationError({
                    'title': f'Maximum {GiftIdea.MAX_IDEAS_PER_USER_PER_GROUP} gift ideas per group allowed.'
                })
            
            # Check for duplicate title
            if title:
                existing_idea = GiftIdea.objects.filter(
                    group=group,
                    author=request.user,
                    title=title
                ).exclude(pk=self.instance.pk if self.instance else None).first()
                
                if existing_idea:
                    # Get language from request
                    language = request.META.get('HTTP_ACCEPT_LANGUAGE', 'en')[:2].lower()
                    if language not in ['pt', 'en']:
                        language = 'en'
                    
                    from .error_messages import get_error_message
                    error_msg = get_error_message('gift_ideas.duplicate_title', language)
                    raise serializers.ValidationError({
                        'title': error_msg
                    })
        
        return attrs


class DrawResponseSerializer(serializers.Serializer):
    """Serializer for draw response."""
    message = serializers.CharField()
    task_id = serializers.CharField(required=False)


class FriendshipSerializer(serializers.ModelSerializer):
    """Serializer for Friendship model."""
    requester = UserSerializer(read_only=True)
    addressee = UserSerializer(read_only=True)
    
    class Meta:
        model = Friendship
        fields = ['id', 'requester', 'addressee', 'status', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for Message model."""
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'receiver', 'content', 'is_read', 'created_at']
        read_only_fields = ['sender', 'is_read', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    related_user = UserSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'title', 'message', 'is_read', 'related_user', 'related_group', 'created_at']
        read_only_fields = ['created_at']


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Validate that email exists."""
        if not User.objects.filter(email=value).exists():
            lang = get_language()[:2] if get_language() else 'en'
            # Don't reveal if email exists for security reasons
            # Return success message either way
            pass
        return value


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset."""
    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    def validate(self, attrs):
        """Validate passwords match and token is valid."""
        if attrs['password'] != attrs['password2']:
            lang = get_language()[:2] if get_language() else 'en'
            raise serializers.ValidationError({
                'password': get_error_message('validation.password_mismatch', lang)
            })
        
        token = attrs.get('token')
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            if not reset_token.is_valid():
                lang = get_language()[:2] if get_language() else 'en'
                raise serializers.ValidationError({
                    'token': get_error_message('auth.invalid_reset_token', lang)
                })
        except PasswordResetToken.DoesNotExist:
            lang = get_language()[:2] if get_language() else 'en'
            raise serializers.ValidationError({
                'token': get_error_message('auth.invalid_reset_token', lang)
            })
        
        return attrs


class CookieConsentSerializer(serializers.ModelSerializer):
    """Serializer for CookieConsent model."""
    
    class Meta:
        model = CookieConsent
        fields = [
            'id', 'necessary', 'functional', 'analytics', 'marketing',
            'consent_version', 'timestamp'
        ]
        read_only_fields = ['id', 'consent_version', 'timestamp']


class CookieConsentCreateSerializer(serializers.Serializer):
    """Serializer for creating cookie consent."""
    necessary = serializers.BooleanField(default=True)
    functional = serializers.BooleanField(default=False)
    analytics = serializers.BooleanField(default=False)
    marketing = serializers.BooleanField(default=False)


class PushSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for PushSubscription model."""
    
    class Meta:
        model = PushSubscription
        fields = ['id', 'endpoint', 'device_type', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PushSubscriptionCreateSerializer(serializers.Serializer):
    """Serializer for creating push subscription."""
    endpoint = serializers.CharField(required=True)
    keys = serializers.DictField(required=True)
    
    def validate_keys(self, value):
        """Validate that keys contain required fields."""
        if 'p256dh' not in value or 'auth' not in value:
            raise serializers.ValidationError("Keys must contain 'p256dh' and 'auth' fields")
        return value

