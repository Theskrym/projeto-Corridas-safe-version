# backend/autenticacao/authentication.py
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import exceptions
import jwt
from django.conf import settings
from .models import Usuario
import logging

logger = logging.getLogger(__name__)

class HybridAuthentication(JWTAuthentication, TokenAuthentication):
    def authenticate(self, request):
        # Tenta autenticar com JWT
        try:
            jwt_auth = JWTAuthentication.authenticate(self, request)
            if jwt_auth:
                user, token = jwt_auth
                logger.info(f"Autenticado via JWT: {user.email}")
                return user, token
        except Exception as e:
            logger.warning(f"Falha na autenticação JWT: {str(e)}")
        
        # Tenta autenticar com Token tradicional
        try:
            token_auth = TokenAuthentication.authenticate(self, request)
            if token_auth:
                user, token = token_auth
                logger.info(f"Autenticado via Token: {user.email}")
                return user, token
        except Exception as e:
            logger.warning(f"Falha na autenticação Token: {str(e)}")
        
        logger.error("Nenhum método de autenticação funcionou")
        return None