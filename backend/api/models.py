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
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email


class Group(models.Model):
    """Secret Santa group model."""
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
    
    def get_member_count(self):
        """Get the number of members in this group."""
        return self.members.count()
    
    def can_draw(self):
        """Check if draw conditions are met."""
        now = timezone.now()
        return (
            now >= self.draw_datetime and
            self.get_member_count() >= self.min_participants and
            not self.is_drawn
        )
    
    def get_members(self):
        """Get all members of this group."""
        return User.objects.filter(groupmembership__group=self)


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

