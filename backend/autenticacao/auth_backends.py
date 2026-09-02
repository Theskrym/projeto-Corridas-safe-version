"""
Classe customizada para autenticação usando tokens do sistema de teste.
Aceita tanto tokens TEST_ quanto tokens JWT válidos.
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from autenticacao.models import Usuario, RefreshTokenLocal
import jwt
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class TestTokenAuthentication(BaseAuthentication):
    """
    Autenticação usando tokens do sistema de teste.
    Aceita tanto tokens TEST_ quanto tokens JWT válidos.
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]  # Remove "Bearer "
        
        # Tenta autenticar como JWT primeiro (tokens válidos do get_jwt_token())
        try:
            # Decodificar JWT sem verificar expiração para testes
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            login = payload.get('login')
            
            if login:
                usuario = Usuario.objects.get(login=login)
                logger.info(f"Autenticado via JWT: {login}")
                return (usuario, token)
        except jwt.InvalidTokenError:
            # Token não é JWT válido, tentar outro método
            pass
        except Usuario.DoesNotExist:
            raise AuthenticationFailed('Usuário não encontrado')
        
        # Fallback: tentar autenticar como token TEST_
        if token.startswith('TEST_ACCESS_'):
            try:
                parts = token.split('_')
                if len(parts) < 4:
                    raise AuthenticationFailed('Token inválido')
                
                login = parts[2]
                
                # Buscar usuário
                usuario = Usuario.objects.get(login=login)
                
                # Usuário encontrado - válido!
                return (usuario, token)
            
            except Usuario.DoesNotExist:
                raise AuthenticationFailed('Usuário não encontrado')
            except Exception as e:
                raise AuthenticationFailed(f'Erro na autenticação: {str(e)}')
        
        # Se chegou aqui, o token não é válido
        return None
