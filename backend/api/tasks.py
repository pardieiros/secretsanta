"""
Celery tasks for Secret Santa application.
"""
import random
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from .models import Group, GroupMembership, SecretSantaAssignment


@shared_task
def execute_draw_task(group_id):
    """
    Execute the Secret Santa draw for a group.
    
    Algorithm:
    1. Get all members of the group
    2. Create a list of receivers (shuffled)
    3. Assign each giver to a receiver, ensuring no self-assignment
    4. If last person would be assigned to themselves, reshuffle
    """
    try:
        group = Group.objects.get(pk=group_id)
    except Group.DoesNotExist:
        return {'error': 'Group not found'}
    
    # Check if already drawn
    if group.is_drawn:
        return {'error': 'Draw already completed'}
    
    # Validate conditions
    if not group.can_draw():
        return {'error': 'Draw conditions not met'}
    
    # Get all members
    memberships = GroupMembership.objects.filter(group=group)
    members = [m.user for m in memberships]
    
    if len(members) < 2:
        return {'error': 'Need at least 2 members'}
    
    # Perform the draw
    max_attempts = 100
    for attempt in range(max_attempts):
        # Shuffle receivers
        receivers = members.copy()
        random.shuffle(receivers)
        
        # Check if any self-assignment would occur
        valid = True
        for i, giver in enumerate(members):
            if giver == receivers[i]:
                valid = False
                break
        
        if valid:
            # Create assignments
            with transaction.atomic():
                for giver, receiver in zip(members, receivers):
                    SecretSantaAssignment.objects.create(
                        group=group,
                        giver=giver,
                        receiver=receiver
                    )
                
                # Mark group as drawn
                group.is_drawn = True
                group.draw_completed_at = timezone.now()
                group.save()
            
            return {
                'success': True,
                'message': f'Draw completed for {group.name}',
                'assignments_count': len(members)
            }
    
    return {'error': 'Failed to create valid assignments after multiple attempts'}


@shared_task
def send_invite_email_task(group_id, recipient_email):
    """
    Send email invitation to join a group.
    """
    try:
        group = Group.objects.get(pk=group_id)
    except Group.DoesNotExist:
        return {'error': 'Group not found'}
    
    invite_link = f"{settings.FRONTEND_URL}/join/{group.invite_code}"
    
    subject = f'Invitation to join {group.name} - Secret Santa'
    message = f"""
Hello!

You have been invited to join the Secret Santa group "{group.name}".

Click the link below to join:
{invite_link}

Group Details:
- Name: {group.name}
- Description: {group.description or 'No description'}
- Minimum Participants: {group.min_participants}
- Draw Date: {group.draw_datetime}
- Exchange Date: {group.exchange_date}

Happy gifting!
"""
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [recipient_email],
            fail_silently=False,
        )
        return {'success': True, 'message': f'Invitation sent to {recipient_email}'}
    except Exception as e:
        return {'error': f'Failed to send email: {str(e)}'}


@shared_task
def send_draw_reminder_task():
    """
    Periodic task to send reminders before draw datetime.
    Checks groups where:
    - current_datetime is close to draw_datetime (within next 24 hours), or
    - current_datetime >= draw_datetime and participants < min_participants
    """
    now = timezone.now()
    reminder_window = timezone.timedelta(hours=24)
    
    # Find groups that need reminders
    groups_to_remind = Group.objects.filter(
        is_drawn=False
    ).filter(
        Q(draw_datetime__lte=now + reminder_window) & Q(draw_datetime__gte=now)
    ) | Group.objects.filter(
        is_drawn=False,
        draw_datetime__lte=now
    )
    
    for group in groups_to_remind:
        member_count = group.get_member_count()
        
        # Check if needs more participants
        if member_count < group.min_participants:
            # Send reminder to owner
            subject = f'Reminder: {group.name} needs more participants'
            message = f"""
Hello {group.owner.first_name or group.owner.email},

Your Secret Santa group "{group.name}" needs more participants!

Current participants: {member_count}
Required: {group.min_participants}
Draw date: {group.draw_datetime}

Please invite more people to join your group.
"""
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [group.owner.email],
                    fail_silently=True,
                )
            except Exception:
                pass
        
        # Send reminder to all members if draw is approaching
        if now <= group.draw_datetime <= now + reminder_window:
            memberships = GroupMembership.objects.filter(group=group)
            for membership in memberships:
                subject = f'Reminder: Draw for {group.name} is approaching'
                message = f"""
Hello {membership.user.first_name or membership.user.email},

The draw for "{group.name}" will happen on {group.draw_datetime}.

Make sure you've added your gift ideas!
"""
                try:
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [membership.user.email],
                        fail_silently=True,
                    )
                except Exception:
                    pass
    
    return {'processed': groups_to_remind.count()}


@shared_task
def send_exchange_reminder_task():
    """
    Periodic task to remind participants about upcoming exchange date.
    """
    now = timezone.now()
    reminder_window = timezone.timedelta(days=3)
    
    # Find groups with exchange date approaching
    groups = Group.objects.filter(
        is_drawn=True,
        exchange_date__lte=now.date() + reminder_window,
        exchange_date__gte=now.date()
    )
    
    for group in groups:
        memberships = GroupMembership.objects.filter(group=group)
        for membership in memberships:
            subject = f'Reminder: Exchange for {group.name} is approaching'
            message = f"""
Hello {membership.user.first_name or membership.user.email},

The gift exchange for "{group.name}" is on {group.exchange_date}!

Don't forget to prepare your gift!
"""
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [membership.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass
    
    return {'processed': groups.count()}


@shared_task
def auto_draw_task():
    """
    Periodic task to automatically trigger draws for groups with auto_draw_enabled.
    """
    now = timezone.now()
    
    # Find groups ready for auto-draw
    groups = Group.objects.filter(
        auto_draw_enabled=True,
        is_drawn=False,
        draw_datetime__lte=now
    )
    
    for group in groups:
        if group.can_draw():
            # Trigger the draw task
            execute_draw_task.delay(group.id)
    
    return {'processed': groups.count()}

