"""
Views for Secret Santa API.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from .models import User, Group, GroupMembership, SecretSantaAssignment, GiftIdea
from .serializers import (
    UserRegistrationSerializer, UserSerializer, GroupSerializer,
    GroupMembershipSerializer, SecretSantaAssignmentSerializer,
    GiftIdeaSerializer, DrawResponseSerializer
)
from .tasks import execute_draw_task, send_invite_email_task


class RegisterView(APIView):
    """User registration endpoint."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': 'User registered successfully',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
        """Set the owner when creating a group."""
        serializer.save(owner=self.request.user)
    
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
        
        serializer = self.get_serializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get all members of a group."""
        group = self.get_object()
        memberships = GroupMembership.objects.filter(group=group)
        serializer = GroupMembershipSerializer(memberships, many=True)
        return Response(serializer.data)
    
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
        
        # Dispatch Celery task to send email
        send_invite_email_task.delay(group.id, email)
        
        return Response({
            'message': 'Invitation email sent'
        }, status=status.HTTP_200_OK)
    
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
            
            return Response(
                {'error': 'Draw conditions not met', 'details': errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Dispatch Celery task to execute draw
        task = execute_draw_task.delay(group.id)
        
        return Response({
            'message': 'Draw is being processed',
            'task_id': task.id
        }, status=status.HTTP_202_ACCEPTED)
    
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
            return Response(
                {'error': 'Assignment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def who_drew_me(self, request, pk=None):
        """Get who drew the current user (only visible after exchange_date)."""
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
        
        # Check if exchange_date has passed
        today = timezone.now().date()
        if today < group.exchange_date:
            return Response({
                'message': f'Revelation will happen on {group.exchange_date}',
                'exchange_date': group.exchange_date,
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
            return Response(
                {'error': 'Assignment not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class GiftIdeaViewSet(viewsets.ModelViewSet):
    """ViewSet for Gift Idea CRUD operations."""
    serializer_class = GiftIdeaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return gift ideas for groups where user is a member."""
        user = self.request.user
        group_id = self.request.query_params.get('group', None)
        
        queryset = GiftIdea.objects.filter(
            group__memberships__user=user
        ).distinct()
        
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the author when creating a gift idea."""
        serializer.save(author=self.request.user)
    
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

