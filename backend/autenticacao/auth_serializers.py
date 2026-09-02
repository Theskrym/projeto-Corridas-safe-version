"""
Serializers para autenticação com API externa.
"""

from rest_framework import serializers
from .models import Usuario, RefreshTokenLocal


class LoginSerializer(serializers.Serializer):
    """Serializer para requisição de login."""
    login = serializers.CharField(max_length=50, required=True)
    password = serializers.CharField(max_length=255, required=True, write_only=True)
    fcm_token = serializers.CharField(max_length=255, required=False, allow_blank=True)


class LoginResponseSerializer(serializers.Serializer):
    """Serializer para resposta de login bem-sucedida."""
    success = serializers.BooleanField()
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    access_token_expires_in = serializers.IntegerField()
    user = serializers.DictField()


class RefreshTokenSerializer(serializers.Serializer):
    """Serializer para renovação de Access Token."""
    refresh_token = serializers.CharField(max_length=255, required=True)


class RefreshTokenLocalSerializer(serializers.ModelSerializer):
    """Serializer para RefreshTokenLocal."""
    class Meta:
        model = RefreshTokenLocal
        fields = ['id', 'refresh_token', 'access_token', 'last_validated_at', 'created_at']
        read_only_fields = ['id', 'last_validated_at', 'created_at']
