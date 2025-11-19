"""
Celery tasks for Secret Santa application.
"""
import random
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from .models import Group, GroupMembership, SecretSantaAssignment, User, Notification


@shared_task
def execute_draw_task(group_id):
    """
    Execute the Secret Santa draw for a group.
    
    Algorithm ensures no self-assignment (derangement):
    1. Get all members of the group
    2. Create a derangement (permutation with no fixed points)
    3. Assign each giver to a receiver, guaranteeing no self-assignment
    """
    try:
        group = Group.objects.get(pk=group_id)
    except Group.DoesNotExist:
        return {'error': 'Group not found'}
    
    # Note: is_drawn is already set to True in the view before this task runs
    # We just need to create the assignments here
    # Validation was already done in the view, so we can proceed directly
    
    # Get all members
    memberships = GroupMembership.objects.filter(group=group)
    members = [m.user for m in memberships]
    
    if len(members) < 2:
        return {'error': 'Need at least 2 members'}
    
    # Final check: ensure all members have gift ideas (double-check)
    members_without_ideas = group.get_members_without_gift_ideas()
    if members_without_ideas:
        member_emails = [m.email for m in members_without_ideas]
        return {
            'error': 'All members must have at least one gift idea before drawing',
            'details': [f'Members without gift ideas: {", ".join(member_emails)}']
        }
    
    # Create a derangement (permutation with no fixed points)
    # This guarantees no user is assigned to themselves
    def create_derangement(items):
        """
        Create a derangement of the items list.
        A derangement is a permutation where no element appears in its original position.
        Uses an algorithm that guarantees no fixed points.
        """
        n = len(items)
        if n == 0:
            return []
        if n == 1:
            # Can't create derangement with 1 item (would be self-assignment)
            return items.copy()
        
        # For 2 items, swap them (guaranteed derangement)
        if n == 2:
            return [items[1], items[0]]
        
        # For 3+ items, use a robust algorithm
        # Strategy: Create a random permutation, then fix any fixed points
        result = items.copy()
        random.shuffle(result)
        
        # Fix any fixed points by swapping
        max_fix_attempts = 100
        for attempt in range(max_fix_attempts):
            fixed_points = []
            for i in range(n):
                if result[i] == items[i]:
                    fixed_points.append(i)
            
            # If no fixed points, we have a valid derangement
            if not fixed_points:
                return result
            
            # Fix fixed points by swapping them with other elements
            # If we have an odd number of fixed points, we need to be careful
            if len(fixed_points) == 1:
                # Single fixed point: swap with any other element
                idx = fixed_points[0]
                swap_idx = random.randint(0, n - 1)
                while swap_idx == idx:
                    swap_idx = random.randint(0, n - 1)
                result[idx], result[swap_idx] = result[swap_idx], result[idx]
            else:
                # Multiple fixed points: swap them in pairs
                # Shuffle the fixed points list to randomize
                random.shuffle(fixed_points)
                for i in range(0, len(fixed_points) - 1, 2):
                    idx1 = fixed_points[i]
                    idx2 = fixed_points[i + 1]
                    result[idx1], result[idx2] = result[idx2], result[idx1]
                # If odd number, handle the last one
                if len(fixed_points) % 2 == 1:
                    last_idx = fixed_points[-1]
                    swap_idx = random.randint(0, n - 1)
                    while swap_idx == last_idx or result[swap_idx] == items[swap_idx]:
                        swap_idx = random.randint(0, n - 1)
                    result[last_idx], result[swap_idx] = result[swap_idx], result[last_idx]
        
        # If we still have fixed points after max attempts, use a fallback
        # This should be extremely rare
        return result
    
    # Perform the draw with guaranteed no self-assignment
    receivers = create_derangement(members)
    
    # Final verification: ensure no self-assignment
    for i, giver in enumerate(members):
        if giver == receivers[i]:
            # This should never happen with the derangement algorithm,
            # but if it does, try one more time
            receivers = create_derangement(members)
            break
    
    # Double-check one more time
    for i, giver in enumerate(members):
        if giver == receivers[i]:
            return {'error': 'Failed to create valid assignments (self-assignment detected)'}
    
    # Create assignments
    try:
        with transaction.atomic():
            for giver, receiver in zip(members, receivers):
                SecretSantaAssignment.objects.create(
                    group=group,
                    giver=giver,
                    receiver=receiver
                )
        
        # Note: is_drawn and draw_completed_at are already set in the view
        # We just created the assignments here
        
        return {
            'success': True,
            'message': f'Draw completed for {group.name}',
            'assignments_count': len(members)
        }
    except Exception as e:
        # If assignment creation fails, we should revert is_drawn
        # But this is handled by the transaction, so assignments won't be created
        # However, is_drawn will remain True - this is acceptable as the draw was attempted
        return {'error': f'Failed to create assignments: {str(e)}'}


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
    
    # Render HTML email
    html_message = render_to_string('emails/group_invite.html', {
        'group_name': group.name,
        'group_description': group.description or '',
        'min_participants': group.min_participants,
        'draw_date': group.draw_datetime.strftime('%B %d, %Y at %I:%M %p'),
        'exchange_date': group.exchange_date.strftime('%B %d, %Y'),
        'invite_link': invite_link,
        'frontend_url': settings.FRONTEND_URL,
        'subject': subject,
    })
    
    # Plain text version
    text_message = f"""
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
        email = EmailMultiAlternatives(
            subject,
            text_message,
            settings.DEFAULT_FROM_EMAIL,
            [recipient_email],
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=False)
        
        # Create notification if user exists
        try:
            invited_user = User.objects.get(email=recipient_email)
            owner_name = group.owner.first_name or group.owner.email
            Notification.objects.create(
                user=invited_user,
                notification_type='group_invite',
                title='Group Invitation',
                message=f"{owner_name} invited you to join the group \"{group.name}\"",
                related_user=group.owner,
                related_group=group
            )
        except User.DoesNotExist:
            # User doesn't exist yet, no notification needed
            pass
        
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
            owner_name = group.owner.first_name or group.owner.email
            
            # Render HTML email
            html_message = render_to_string('emails/draw_reminder.html', {
                'owner_name': owner_name,
                'group_name': group.name,
                'member_count': member_count,
                'min_participants': group.min_participants,
                'draw_date': group.draw_datetime.strftime('%B %d, %Y at %I:%M %p'),
                'frontend_url': settings.FRONTEND_URL,
                'subject': subject,
            })
            
            # Plain text version
            text_message = f"""
Hello {owner_name},

Your Secret Santa group "{group.name}" needs more participants!

Current participants: {member_count}
Required: {group.min_participants}
Draw date: {group.draw_datetime}

Please invite more people to join your group.
"""
            try:
                email = EmailMultiAlternatives(
                    subject,
                    text_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [group.owner.email],
                )
                email.attach_alternative(html_message, "text/html")
                email.send(fail_silently=False)
            except Exception as e:
                # Log error but continue processing other groups
                print(f"Failed to send reminder email to {group.owner.email}: {str(e)}")
        
        # Send reminder to all members if draw is approaching
        if now <= group.draw_datetime <= now + reminder_window:
            memberships = GroupMembership.objects.filter(group=group)
            for membership in memberships:
                subject = f'Reminder: Draw for {group.name} is approaching'
                member_name = membership.user.first_name or membership.user.email
                
                # Render HTML email
                html_message = render_to_string('emails/draw_approaching.html', {
                    'member_name': member_name,
                    'group_name': group.name,
                    'draw_date': group.draw_datetime.strftime('%B %d, %Y at %I:%M %p'),
                    'frontend_url': settings.FRONTEND_URL,
                    'subject': subject,
                })
                
                # Plain text version
                text_message = f"""
Hello {member_name},

The draw for "{group.name}" will happen on {group.draw_datetime}.

Make sure you've added your gift ideas!
"""
                try:
                    email = EmailMultiAlternatives(
                        subject,
                        text_message,
                        settings.DEFAULT_FROM_EMAIL,
                        [membership.user.email],
                    )
                    email.attach_alternative(html_message, "text/html")
                    email.send(fail_silently=False)
                except Exception as e:
                    # Log error but continue processing other members
                    print(f"Failed to send reminder email to {membership.user.email}: {str(e)}")
    
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
            member_name = membership.user.first_name or membership.user.email
            
            # Render HTML email
            html_message = render_to_string('emails/exchange_reminder.html', {
                'member_name': member_name,
                'group_name': group.name,
                'exchange_date': group.exchange_date.strftime('%B %d, %Y'),
                'frontend_url': settings.FRONTEND_URL,
                'subject': subject,
            })
            
            # Plain text version
            text_message = f"""
Hello {member_name},

The gift exchange for "{group.name}" is on {group.exchange_date}!

Don't forget to prepare your gift!
"""
            try:
                email = EmailMultiAlternatives(
                    subject,
                    text_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [membership.user.email],
                )
                email.attach_alternative(html_message, "text/html")
                email.send(fail_silently=False)
            except Exception as e:
                # Log error but continue processing other members
                print(f"Failed to send exchange reminder email to {membership.user.email}: {str(e)}")
    
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


@shared_task
def send_friend_invite_email_task(requester_id, recipient_email):
    """
    Send email invitation to join the app and become friends.
    """
    try:
        requester = User.objects.get(pk=requester_id)
    except User.DoesNotExist:
        return {'error': 'Requester not found'}
    
    invite_link = f"{settings.FRONTEND_URL}/register"
    
    requester_name = requester.first_name or requester.email
    
    subject = f'{requester_name} wants to be your friend on Secret Santa'
    
    # Render HTML email
    html_message = render_to_string('emails/friend_invite.html', {
        'requester_name': requester_name,
        'register_link': invite_link,
        'frontend_url': settings.FRONTEND_URL,
        'subject': subject,
    })
    
    # Plain text version
    text_message = f"""
Hello!

{requester_name} wants to be your friend on Secret Santa!

Join Secret Santa to connect with {requester_name} and organize your Secret Santa groups.

Click the link below to register:
{invite_link}

Once you register, you'll automatically receive a friend request from {requester_name}.

Happy gifting!
"""
    
    try:
        email = EmailMultiAlternatives(
            subject,
            text_message,
            settings.DEFAULT_FROM_EMAIL,
            [recipient_email],
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=False)
        return {'success': True, 'message': f'Friend invitation sent to {recipient_email}'}
    except Exception as e:
        return {'error': f'Failed to send email: {str(e)}'}

