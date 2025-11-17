"""
Serializers for Secret Santa API.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import User, Group, GroupMembership, SecretSantaAssignment, GiftIdea


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer to use email instead of username."""
    username_field = 'email'
    
    def validate(self, attrs):
        # Map 'email' to 'username' for the parent class
        if 'email' in attrs:
            attrs['username'] = attrs.pop('email')
        return super().validate(attrs)


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'password2']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name']


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
            'is_drawn', 'draw_completed_at', 'created_at', 'updated_at',
            'member_count', 'can_draw', 'is_member', 'is_owner'
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
        """Validate that draw_datetime is before exchange_date."""
        draw_datetime = attrs.get('draw_datetime', self.instance.draw_datetime if self.instance else None)
        exchange_date = attrs.get('exchange_date', self.instance.exchange_date if self.instance else None)
        
        if draw_datetime and exchange_date:
            if draw_datetime.date() >= exchange_date:
                raise serializers.ValidationError({
                    'draw_datetime': 'Draw datetime must be before exchange date.'
                })
        
        return attrs


class GroupMembershipSerializer(serializers.ModelSerializer):
    """Serializer for GroupMembership."""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = GroupMembership
        fields = ['id', 'user', 'joined_at']


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
        """Validate that user doesn't exceed max ideas per group."""
        request = self.context.get('request')
        group = attrs.get('group', self.instance.group if self.instance else None)
        
        if request and request.user.is_authenticated and group:
            existing_count = GiftIdea.objects.filter(
                group=group,
                author=request.user
            ).exclude(pk=self.instance.pk if self.instance else None).count()
            
            if existing_count >= GiftIdea.MAX_IDEAS_PER_USER_PER_GROUP:
                raise serializers.ValidationError({
                    'title': f'Maximum {GiftIdea.MAX_IDEAS_PER_USER_PER_GROUP} gift ideas per group allowed.'
                })
        
        return attrs


class DrawResponseSerializer(serializers.Serializer):
    """Serializer for draw response."""
    message = serializers.CharField()
    task_id = serializers.CharField(required=False)

