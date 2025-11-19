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
from .models import Group, GroupMembership, SecretSantaAssignment, User, Notification, PasswordResetToken


@shared_task
def execute_draw_task(group_id):
    """
    Execute the Secret Santa draw for a group.
    
    Algorithm ensures no self-assignment (derangement):
    1. Create a list of all participants
    2. Shuffle and check for self-assignments
    3. If self-assignment found, reshuffle until valid
    """
    try:
        group = Group.objects.get(pk=group_id)
    except Group.DoesNotExist:
        return {'error': 'Group not found'}
    
    if group.is_drawn:
        return {'error': 'Draw has already been completed for this group'}
    
    # Get all members
    memberships = GroupMembership.objects.filter(group=group).select_related('user')
    members = [m.user for m in memberships]
    
    if len(members) < group.min_participants:
        return {'error': f'Not enough members. Need at least {group.min_participants}, have {len(members)}'}
    
    # Check if all members have gift ideas
    from .models import GiftIdea
    for member in members:
        if not GiftIdea.objects.filter(group=group, author=member).exists():
            return {'error': f'Member {member.email} does not have any gift ideas'}
    
    # Algorithm to ensure no self-assignment (derangement)
    max_attempts = 100
    attempt = 0
    assignments_created = []
    
    while attempt < max_attempts:
        # Shuffle members for receivers
        receivers = members.copy()
        random.shuffle(receivers)
        
        # Create assignments
        assignments = []
        valid = True
        
        for i, giver in enumerate(members):
            receiver = receivers[i]
            
            # Check for self-assignment
            if giver == receiver:
                valid = False
                break
            
            # Check if assignment already exists
            if SecretSantaAssignment.objects.filter(group=group, giver=giver).exists():
                valid = False
                break
            
            assignments.append((giver, receiver))
        
        if valid:
            # Create all assignments in a transaction
            try:
                with transaction.atomic():
                    for giver, receiver in assignments:
                        assignment = SecretSantaAssignment.objects.create(
                            group=group,
                            giver=giver,
                            receiver=receiver
                        )
                        assignments_created.append({
                            'giver_id': giver.id,
                            'receiver_id': receiver.id,
                            'assignment_id': assignment.id
                        })
                
                # Mark group as drawn
                group.is_drawn = True
                group.draw_completed_at = timezone.now()
                group.save()
                
                # Trigger notification task
                send_draw_completed_notifications.delay(group_id)
                
                # Send push notifications to all members
                # Uncomment to enable push notifications when draw is completed
                # from .push_notifications import send_draw_completed_notification
                # for member in members:
                #     send_draw_completed_notification(
                #         user=member,
                #         group_name=group.name
                #     )
                
                return {
                    'success': True,
                    'message': f'Draw completed successfully for {len(assignments_created)} participants',
                    'assignments': assignments_created
                }
            except Exception as e:
                return {'error': f'Failed to create assignments: {str(e)}'}
        
        attempt += 1
    
    return {'error': f'Failed to create assignments: {str(e)}'}


@shared_task
def send_draw_completed_notifications(group_id):
    """
    Send notifications and emails to all group members when draw is completed.
    """
    try:
        group = Group.objects.get(pk=group_id)
    except Group.DoesNotExist:
        return {'error': 'Group not found'}
    
    if not group.is_drawn:
        return {'error': 'Draw has not been completed for this group'}
    
    # Get all members
    memberships = GroupMembership.objects.filter(group=group).select_related('user')
    
    group_link = f"{settings.FRONTEND_URL}/groups/{group.id}"
    draw_date = group.draw_completed_at.strftime('%B %d, %Y at %I:%M %p') if group.draw_completed_at else 'now'
    exchange_date = group.exchange_date.strftime('%B %d, %Y')
    
    subject = f'🎉 Secret Santa Draw Completed for {group.name}!'
    
    notifications_created = 0
    emails_sent = 0
    errors = []
    
    for membership in memberships:
        member = membership.user
        member_name = member.first_name or member.email
        
        # Create notification
        try:
            Notification.objects.create(
                user=member,
                notification_type='group_draw',
                title='Secret Santa Draw Completed',
                message=f'The draw for "{group.name}" has been completed! Check out your Secret Santa\'s gift ideas.',
                related_group=group
            )
            notifications_created += 1
        except Exception as e:
            errors.append(f'Failed to create notification for {member.email}: {str(e)}')
        
        # Send push notification
        # Uncomment to enable push notifications when draw is completed
        # from .push_notifications import send_draw_completed_notification
        # try:
        #     send_draw_completed_notification(
        #         user=member,
        #         group_name=group.name
        #     )
        # except Exception as e:
        #     errors.append(f'Failed to send push notification for {member.email}: {str(e)}')
        
        # Send email
        try:
            # Render HTML email
            html_message = render_to_string('emails/draw_completed.html', {
                'member_name': member_name,
                'group_name': group.name,
                'draw_date': draw_date,
                'exchange_date': exchange_date,
                'group_link': group_link,
                'frontend_url': settings.FRONTEND_URL,
                'subject': subject,
            })
            
            # Plain text version
            text_message = f"""
Hello {member_name}!

The Secret Santa draw for "{group.name}" has been completed! 🎊

Your Secret Santa is ready! Check out the gift ideas from your Secret Santa and start preparing the perfect gift!

Group Information:
- Group Name: {group.name}
- Exchange Date: {exchange_date}
- Draw Completed: {draw_date}

Visit the group to see your Secret Santa's gift ideas:
{group_link}

Remember: You can see your Secret Santa's gift ideas, but you won't know who it is until the reveal date! The mystery makes it more fun! 🎭

Happy gifting! 🎄✨
"""
            
            email = EmailMultiAlternatives(
                subject,
                text_message,
                settings.DEFAULT_FROM_EMAIL,
                [member.email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=False)
            emails_sent += 1
        except Exception as e:
            errors.append(f'Failed to send email to {member.email}: {str(e)}')
    
    return {
        'success': True,
        'notifications_created': notifications_created,
        'emails_sent': emails_sent,
        'total_members': len(memberships),
        'errors': errors if errors else None
    }


@shared_task
def send_reveal_notifications(group_id):
    """
    Send notifications and emails to all group members when secret santas are revealed.
    """
    try:
        group = Group.objects.get(pk=group_id)
    except Group.DoesNotExist:
        return {'error': 'Group not found'}
    
    if not group.is_revealed:
        return {'error': 'Group has not been revealed yet'}
    
    # Get all members with their assignments
    memberships = GroupMembership.objects.filter(group=group).select_related('user')
    
    group_link = f"{settings.FRONTEND_URL}/groups/{group.id}"
    reveal_date = group.reveal_datetime.strftime('%B %d, %Y at %I:%M %p') if group.reveal_datetime else 'now'
    
    subject = f'🎁 Your Secret Santa has been revealed for {group.name}!'
    
    notifications_created = 0
    emails_sent = 0
    errors = []
    
    for membership in memberships:
        member = membership.user
        member_name = member.first_name or member.email
        
        # Get who drew this member
        try:
            assignment = SecretSantaAssignment.objects.get(
                group=group,
                receiver=member
            )
            giver = assignment.giver
            giver_name = f"{giver.first_name} {giver.last_name}".strip() or giver.email
        except SecretSantaAssignment.DoesNotExist:
            giver = None
            giver_name = None
            errors.append(f'Assignment not found for {member.email}')
        
        # Create notification
        try:
            Notification.objects.create(
                user=member,
                notification_type='group_draw',
                title='Secret Santa Revealed!',
                message=f'Your Secret Santa for "{group.name}" has been revealed! Click to see who it is! 🎁',
                related_group=group
            )
            notifications_created += 1
        except Exception as e:
            errors.append(f'Failed to create notification for {member.email}: {str(e)}')
        
        # Send email
        try:
            # Render HTML email
            html_message = render_to_string('emails/reveal_completed.html', {
                'member_name': member_name,
                'group_name': group.name,
                'reveal_date': reveal_date,
                'group_link': group_link,
                'frontend_url': settings.FRONTEND_URL,
                'subject': subject,
                'giver_name': giver_name,
            })
            
            # Plain text version
            text_message = f"""
Hello {member_name}!

The moment you've been waiting for is here! 🎉

Your Secret Santa for "{group.name}" has been revealed!

Come to the app to discover who your Secret Santa is and see their profile!

Visit the group to reveal your Secret Santa:
{group_link}

Happy gifting! 🎄✨
"""
            
            email = EmailMultiAlternatives(
                subject,
                text_message,
                settings.DEFAULT_FROM_EMAIL,
                [member.email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=False)
            emails_sent += 1
        except Exception as e:
            errors.append(f'Failed to send email to {member.email}: {str(e)}')
    
    return {
        'success': True,
        'notifications_created': notifications_created,
        'emails_sent': emails_sent,
        'total_members': len(memberships),
        'errors': errors if errors else None
    }


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
    Send reminders to group owners and members about upcoming draws.
    Runs daily via Celery Beat.
    """
    now = timezone.now()
    
    # Groups that need reminders (draw date within 24-48 hours)
    upcoming_draw_groups = Group.objects.filter(
        is_drawn=False,
        draw_datetime__gte=now,
        draw_datetime__lte=now + timezone.timedelta(hours=48)
    )
    
    for group in upcoming_draw_groups:
        memberships = GroupMembership.objects.filter(group=group).select_related('user')
        member_count = memberships.count()
        
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
        if group.draw_datetime <= now + timezone.timedelta(hours=24):
            subject = f'Reminder: Secret Santa draw for {group.name} is approaching!'
            
            for membership in memberships:
                member = membership.user
                member_name = member.first_name or member.email
                
                # Render HTML email
                html_message = render_to_string('emails/draw_approaching.html', {
                    'member_name': member_name,
                    'group_name': group.name,
                    'draw_date': group.draw_datetime.strftime('%B %d, %Y at %I:%M %p'),
                    'exchange_date': group.exchange_date.strftime('%B %d, %Y'),
                    'frontend_url': settings.FRONTEND_URL,
                    'subject': subject,
                })
                
                # Plain text version
                text_message = f"""
Hello {member_name},

The Secret Santa draw for "{group.name}" is approaching!

Draw Date: {group.draw_datetime}
Exchange Date: {group.exchange_date}

Make sure you've added your gift ideas before the draw date!

Visit the group to add your gift ideas.
"""
                try:
                    email = EmailMultiAlternatives(
                        subject,
                        text_message,
                        settings.DEFAULT_FROM_EMAIL,
                        [member.email],
                    )
                    email.attach_alternative(html_message, "text/html")
                    email.send(fail_silently=False)
                except Exception as e:
                    print(f"Failed to send reminder email to {member.email}: {str(e)}")
    
    return {'processed': upcoming_draw_groups.count()}


@shared_task
def auto_draw_task():
    """
    Automatically execute draws for groups that have auto_draw_enabled
    and meet all conditions. Runs daily via Celery Beat.
    """
    now = timezone.now()
    
    # Groups ready for auto-draw
    groups = Group.objects.filter(
        auto_draw_enabled=True,
        is_drawn=False,
        draw_datetime__lte=now
    )
    
    for group in groups:
        if group.can_draw():
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


@shared_task
def auto_reveal_task():
    """
    Automatically reveal secret santas for groups where reveal_datetime has passed.
    Runs periodically via Celery Beat.
    """
    now = timezone.now()
    
    # Groups ready for auto-reveal
    groups = Group.objects.filter(
        is_drawn=True,
        is_revealed=False,
        reveal_datetime__lte=now
    )
    
    for group in groups:
        group.is_revealed = True
        group.save()
        
        # Send notifications and emails
        send_reveal_notifications.delay(group.id)
    
    return {'processed': groups.count()}


@shared_task
def send_password_reset_email_task(user_id, token):
    """
    Send password reset email to user.
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return {'error': 'User not found'}
    
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    user_name = user.first_name or user.email
    
    subject = 'Reset Your Password - Secret Santa'
    
    # Render HTML email
    html_message = render_to_string('emails/password_reset.html', {
        'user_name': user_name,
        'reset_link': reset_link,
        'frontend_url': settings.FRONTEND_URL,
        'subject': subject,
        'token': token,
    })
    
    # Plain text version
    text_message = f"""
Hello {user_name}!

You requested to reset your password for your Secret Santa account.

Click the link below to reset your password:
{reset_link}

This link will expire in 24 hours.

If you didn't request this password reset, please ignore this email.

Happy gifting!
"""
    
    try:
        email = EmailMultiAlternatives(
            subject,
            text_message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=False)
        return {'success': True, 'message': f'Password reset email sent to {user.email}'}
    except Exception as e:
        return {'error': f'Failed to send email: {str(e)}'}
