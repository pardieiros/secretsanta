"""
Models for Secret Santa application.
"""
import secrets
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.utils import timezone


class User(AbstractUser):
    """Custom User model with email as unique identifier."""
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    profile_picture = models.URLField(blank=True, null=True)
    profile_complete = models.BooleanField(default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email
    
    def check_profile_complete(self):
        """Check if user profile is complete."""
        # Profile is complete only if:
        # 1. User has explicitly set profile_complete=True
        # 2. AND has first_name and last_name
        return bool(
            self.profile_complete and
            self.first_name and 
            self.last_name
        )


class Group(models.Model):
    """Secret Santa group model."""
    VISIBILITY_CHOICES = [
        ('private', 'Private'),
        ('public', 'Public'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_groups')
    min_participants = models.IntegerField(validators=[MinValueValidator(2)], default=2)
    draw_datetime = models.DateTimeField()
    exchange_date = models.DateField()
    invite_code = models.CharField(max_length=32, unique=True, db_index=True)
    auto_draw_enabled = models.BooleanField(default=False)
    is_drawn = models.BooleanField(default=False)
    draw_completed_at = models.DateTimeField(null=True, blank=True)
    is_revealed = models.BooleanField(default=False)
    reveal_datetime = models.DateTimeField(null=True, blank=True)
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default='private')
    location_name = models.CharField(max_length=200, blank=True, null=True)
    location_latitude = models.DecimalField(max_digits=18, decimal_places=15, blank=True, null=True)
    location_longitude = models.DecimalField(max_digits=18, decimal_places=15, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        """Generate unique invite code if not set."""
        if not self.invite_code:
            self.invite_code = secrets.token_urlsafe(16)
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validate that public groups have location."""
        from django.core.exceptions import ValidationError
        if self.visibility == 'public' and not (self.location_name and self.location_latitude and self.location_longitude):
            raise ValidationError('Public groups must have a location (name, latitude, and longitude).')
    
    def get_member_count(self):
        """Get the number of members in this group."""
        return self.memberships.count()
    
    def all_members_have_gift_ideas(self):
        """Check if all members have at least one gift idea for this group."""
        # Import here to avoid circular import
        from django.apps import apps
        GiftIdea = apps.get_model('api', 'GiftIdea')
        members = self.get_members()
        for member in members:
            if not GiftIdea.objects.filter(group=self, author=member).exists():
                return False
        return True
    
    def get_members_without_gift_ideas(self):
        """Get list of members who don't have gift ideas for this group."""
        # Import here to avoid circular import
        from django.apps import apps
        GiftIdea = apps.get_model('api', 'GiftIdea')
        members = self.get_members()
        members_without_ideas = []
        for member in members:
            if not GiftIdea.objects.filter(group=self, author=member).exists():
                members_without_ideas.append(member)
        return members_without_ideas
    
    def can_draw(self):
        """Check if draw conditions are met."""
        now = timezone.now()
        return (
            now >= self.draw_datetime and
            self.get_member_count() >= self.min_participants and
            not self.is_drawn and
            self.all_members_have_gift_ideas()
        )
    
    def get_members(self):
        """Get all members of this group."""
        return User.objects.filter(group_memberships__group=self).distinct()


class GroupMembership(models.Model):
    """Model to track group memberships."""
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_memberships')
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['group', 'user']]
        ordering = ['joined_at']
    
    def __str__(self):
        return f"{self.user.email} in {self.group.name}"


class GroupPermission(models.Model):
    """Model to track member permissions within a group."""
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='permissions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_permissions')
    can_edit_settings = models.BooleanField(default=False)
    can_invite_members = models.BooleanField(default=False)
    can_send_messages = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['group', 'user']]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} permissions in {self.group.name}"


class SecretSantaAssignment(models.Model):
    """Model to store Secret Santa assignments after draw."""
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='assignments')
    giver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='giver_assignments')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='receiver_assignments')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['group', 'giver'], ['group', 'receiver']]
    
    def __str__(self):
        return f"{self.giver.email} -> {self.receiver.email} in {self.group.name}"


class GiftIdea(models.Model):
    """Model for gift ideas/wishlist items."""
    MAX_IDEAS_PER_USER_PER_GROUP = 5
    
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='gift_ideas')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gift_ideas')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = [['group', 'author', 'title']]
    
    def __str__(self):
        return f"{self.title} by {self.author.email} in {self.group.name}"


class Friendship(models.Model):
    """Model for user friendships."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('blocked', 'Blocked'),
    ]
    
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_friend_requests')
    addressee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_friend_requests')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['requester', 'addressee']]
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.requester.email} -> {self.addressee.email} ({self.status})"


class FriendInvite(models.Model):
    """Model for friend invitations sent by email to non-registered users."""
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_friend_invites')
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_accepted = models.BooleanField(default=False)
    
    class Meta:
        unique_together = [['requester', 'email']]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.requester.email} -> {self.email}"


class Message(models.Model):
    """Model for direct messages between users."""
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['sender', 'receiver', '-created_at']),
            models.Index(fields=['receiver', 'is_read', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.sender.email} -> {self.receiver.email}: {self.content[:50]}"


class Notification(models.Model):
    """Model for user notifications."""
    NOTIFICATION_TYPES = [
        ('friend_request', 'Friend Request'),
        ('friend_accepted', 'Friend Accepted'),
        ('message', 'Message'),
        ('group_invite', 'Group Invite'),
        ('group_draw', 'Group Draw'),
        ('system', 'System'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='related_notifications')
    related_group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email}: {self.title}"


class PasswordResetToken(models.Model):
    """Model for password reset tokens."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token', 'used']),
            models.Index(fields=['user', 'used', '-created_at']),
        ]
    
    def __str__(self):
        return f"Password reset token for {self.user.email}"
    
    def is_valid(self):
        """Check if token is valid (not used and not expired)."""
        from django.utils import timezone
        return not self.used and timezone.now() < self.expires_at


class PushSubscription(models.Model):
    """
    Model to store Web Push notification subscriptions.
    Supports multiple devices per user (e.g., desktop + mobile).
    GDPR compliant: stores minimal data (endpoint + keys, no personal data in keys).
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='push_subscriptions',
        null=True,
        blank=True
    )
    
    # Push subscription data (required for Web Push API)
    endpoint = models.TextField(unique=True, db_index=True)  # Unique per browser/device
    p256dh = models.TextField()  # Public key for encryption
    auth = models.TextField()  # Authentication secret
    
    # Optional metadata for better management
    user_agent = models.TextField(blank=True, null=True)
    device_type = models.CharField(
        max_length=20,
        choices=[
            ('desktop', 'Desktop'),
            ('mobile', 'Mobile'),
            ('tablet', 'Tablet'),
            ('unknown', 'Unknown'),
        ],
        default='unknown'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['endpoint']),
        ]
    
    def __str__(self):
        device_info = f"{self.device_type}" if self.device_type != 'unknown' else "device"
        user_info = self.user.email if self.user else "anonymous"
        return f"Push subscription for {user_info} ({device_info})"


class CookieConsent(models.Model):
    """
    Model to store cookie consent records for audit purposes.
    Complies with GDPR requirements for consent tracking.
    """
    # User can be null for anonymous users (we'll use a pseudonymous ID)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='cookie_consents',
        null=True,
        blank=True
    )
    
    # Pseudonymous ID for anonymous users (random string, not personal data)
    anonymous_id = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    
    # Consent preferences
    necessary = models.BooleanField(default=True)
    functional = models.BooleanField(default=False)
    analytics = models.BooleanField(default=False)
    marketing = models.BooleanField(default=False)
    
    # Metadata
    consent_version = models.IntegerField(default=1)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Audit fields (data minimization: truncated IP, optional user agent)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    ip_truncated = models.CharField(max_length=20, blank=True, null=True)  # e.g., "192.168.1.0"
    user_agent = models.TextField(blank=True, null=True)  # Optional, for debugging
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['anonymous_id', '-timestamp']),
        ]
    
    def __str__(self):
        identifier = self.user.email if self.user else (self.anonymous_id or 'Anonymous')
        return f"Cookie consent for {identifier} at {self.timestamp}"
    
    def save(self, *args, **kwargs):
        """Truncate IP address for privacy (last octet set to 0)."""
        if self.ip_address and not self.ip_truncated:
            ip_str = str(self.ip_address)
            if '.' in ip_str:  # IPv4
                parts = ip_str.split('.')
                if len(parts) == 4:
                    self.ip_truncated = '.'.join(parts[:3]) + '.0'
            elif ':' in ip_str:  # IPv6 - truncate last segment
                parts = ip_str.split(':')
                if len(parts) > 1:
                    parts[-1] = '0'
                    self.ip_truncated = ':'.join(parts)
        super().save(*args, **kwargs)

