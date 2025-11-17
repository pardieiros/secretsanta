from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Group, GroupMembership, SecretSantaAssignment, GiftIdea


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'first_name', 'last_name', 'is_staff', 'date_joined']
    list_filter = ['is_staff', 'is_superuser', 'date_joined']
    search_fields = ['email', 'username', 'first_name', 'last_name']


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'min_participants', 'draw_datetime', 'exchange_date', 'is_drawn', 'created_at']
    list_filter = ['is_drawn', 'auto_draw_enabled', 'created_at']
    search_fields = ['name', 'description', 'invite_code']
    readonly_fields = ['invite_code', 'created_at', 'updated_at', 'draw_completed_at']


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ['group', 'user', 'joined_at']
    list_filter = ['joined_at']
    search_fields = ['group__name', 'user__email']


@admin.register(SecretSantaAssignment)
class SecretSantaAssignmentAdmin(admin.ModelAdmin):
    list_display = ['group', 'giver', 'receiver', 'created_at']
    list_filter = ['created_at']
    search_fields = ['group__name', 'giver__email', 'receiver__email']


@admin.register(GiftIdea)
class GiftIdeaAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'group', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'description', 'author__email', 'group__name']

