"""
Serviço de Autenticação com integração à API externa.

Fluxo:
1. Usuário fornece login e senha
2. Se usuário existe localmente:
   - Compara hash de senha com o armazenado
   - Se igual: usa dados locais (não chama API)
   - Se diferente: valida na API e atualiza localmente
3. Se usuário não existe localmente:
   - Valida na API
   - Armazena localmente (hash de senha, refresh token)
4. Retorna Access Token (TTL 300s) e Refresh Token

API Externa esperada em: http://xx.x.xxx.xx:8051/api/connect/token
"""

import logging
import hashlib
import requests
from datetime import datetime, timedelta
from django.contrib.auth.hashers import make_password
from django.conf import settings
from .models import Usuario, RefreshTokenLocal

logger = logging.getLogger(__name__)


class AuthenticationService:
    """Serviço de autenticação integrado com API externa."""
    
    # URL da API externa (será configurada via settings)
    API_URL = getattr(settings, 'EXTERNAL_AUTH_API_URL', 'http://xx.x.xxx.xx:8051/api/connect/token')
    API_TIMEOUT = getattr(settings, 'EXTERNAL_AUTH_TIMEOUT', 10)  # segundos
    
    # Configuração de TTL para tokens
    ACCESS_TOKEN_TTL = 300  # 5 minutos em segundos
    REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60  # 7 dias em segundos
    
    @classmethod
    def hash_password(cls, password: str) -> str:
        """Hash da senha para comparação local."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @classmethod
    def validate_with_external_api(cls, login: str, password: str) -> dict:
        """
        Valida credenciais na API externa.
        
        Returns:
            {
                'success': bool,
                'access_token': str,
                'refresh_token': str,
                'error': str (se success=False)
            }
        """
        try:
            payload = {
                'login': login,
                'password': password
            }
            
            logger.info(f"Chamando API externa para validar usuário: {login}")
            
            response = requests.post(
                cls.API_URL,
                json=payload,
                timeout=cls.API_TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"API retornou sucesso para usuário: {login}")
                return {
                    'success': True,
                    'access_token': data.get('access_token'),
                    'refresh_token': data.get('refresh_token'),
                    'user_data': data.get('user_data', {})  # Pode vir dados adicionais do usuário
                }
            else:
                error_msg = f"API retornou status {response.status_code}"
                logger.warning(f"{error_msg} para usuário: {login}")
                return {
                    'success': False,
                    'error': 'Credenciais inválidas'
                }
                
        except requests.exceptions.Timeout:
            logger.error(f"Timeout ao conectar à API externa (timeout: {cls.API_TIMEOUT}s)")
            return {
                'success': False,
                'error': 'Serviço de autenticação indisponível (timeout)'
            }
        except requests.exceptions.ConnectionError:
            logger.error(f"Erro de conexão com API externa: {cls.API_URL}")
            return {
                'success': False,
                'error': 'Serviço de autenticação indisponível'
            }
        except Exception as e:
            logger.error(f"Erro ao validar com API externa: {str(e)}")
            return {
                'success': False,
                'error': 'Erro ao processar autenticação'
            }
    
    @classmethod
    def login(cls, login: str, password: str, use_api: bool = True, fcm_token: str = None) -> dict:
        """
        Login com validação local ou externa.
        
        Args:
            login: Login do usuário
            password: Senha em texto plano
            use_api: Se True, valida na API quando necessário
            fcm_token: Token FCM do dispositivo (opcional)
            
        Returns:
            {
                'success': bool,
                'access_token': str,
                'refresh_token': str,
                'user': {
                    'id_usuario': int,
                    'login': str,
                    'nome': str,
                    'email': str,
                    'nivel_acesso': int
                },
                'error': str (se success=False)
            }
        """
        try:
            # Passo 1: Verificar se usuário existe localmente
            user = Usuario.objects.get(login=login)
            
            # Salvar FCM token se fornecido
            if fcm_token:
                user.fcm_token = fcm_token
                user.save(update_fields=['fcm_token'])
            
            password_hash = cls.hash_password(password)
            
            # Passo 2: Verificar se há RefreshToken armazenado
            try:
                token_obj = RefreshTokenLocal.objects.get(user=user)
                local_hash = token_obj.password_hash
                
                # Comparar hash
                if local_hash == password_hash:
                    # Hash coincide - usar dados locais
                    logger.info(f"Hash da senha coincide para usuário: {login} - usando dados locais")
                    return cls._prepare_response(user, token_obj)
                else:
                    # Hash diferente - validar na API
                    logger.info(f"Hash da senha diferente para usuário: {login} - validando na API")
                    if use_api:
                        return cls._validate_and_update_local(user, login, password, password_hash)
                    else:
                        return {
                            'success': False,
                            'error': 'Credenciais inválidas'
                        }
                        
            except RefreshTokenLocal.DoesNotExist:
                # Usuário existe mas não tem token local - validar na API
                logger.info(f"Usuário {login} encontrado mas sem token local - validando na API")
                if use_api:
                    return cls._validate_and_update_local(user, login, password, password_hash)
                else:
                    return {
                        'success': False,
                        'error': 'Credenciais inválidas'
                    }
            
        except Usuario.DoesNotExist:
            # Usuário não existe localmente - criar e validar na API
            logger.info(f"Usuário {login} não encontrado localmente - validando na API")
            if use_api:
                return cls._validate_and_create_user(login, password)
            else:
                return {
                    'success': False,
                    'error': 'Usuário não encontrado'
                }
    
    @classmethod
    def _validate_and_update_local(cls, user: Usuario, login: str, password: str, password_hash: str) -> dict:
        """Valida na API e atualiza dados locais."""
        api_result = cls.validate_with_external_api(login, password)
        
        if not api_result['success']:
            return api_result
        
        # Atualizar ou criar RefreshToken local
        token_obj, created = RefreshTokenLocal.objects.update_or_create(
            user=user,
            defaults={
                'refresh_token': api_result['refresh_token'],
                'access_token': api_result['access_token'],
                'password_hash': password_hash,
                'access_token_expires_at': datetime.now() + timedelta(seconds=cls.ACCESS_TOKEN_TTL)
            }
        )
        
        action = "criado" if created else "atualizado"
        logger.info(f"Token local {action} para usuário: {login}")
        
        return cls._prepare_response(user, token_obj)
    
    @classmethod
    def _validate_and_create_user(cls, login: str, password: str) -> dict:
        """Valida na API e cria novo usuário localmente."""
        api_result = cls.validate_with_external_api(login, password)
        
        if not api_result['success']:
            return api_result
        
        try:
            # Extrair dados do usuário da resposta da API (se disponível)
            user_data = api_result.get('user_data', {})
            
            # Criar novo usuário
            user = Usuario.objects.create_user(
                login=login,
                password=password,
                email=user_data.get('email', f'{login}@cesmac.edu.br'),
                nome=user_data.get('nome', login),
                matricula=user_data.get('matricula'),
                telefone=user_data.get('telefone'),
                nivel_acesso=user_data.get('nivel_acesso', 5)
            )
            
            logger.info(f"Novo usuário criado: {login}")
            
            # Criar RefreshToken local
            password_hash = cls.hash_password(password)
            token_obj = RefreshTokenLocal.objects.create(
                user=user,
                refresh_token=api_result['refresh_token'],
                access_token=api_result['access_token'],
                password_hash=password_hash,
                access_token_expires_at=datetime.now() + timedelta(seconds=cls.ACCESS_TOKEN_TTL)
            )
            
            logger.info(f"Token local criado para novo usuário: {login}")
            
            return cls._prepare_response(user, token_obj)
            
        except Exception as e:
            logger.error(f"Erro ao criar usuário: {str(e)}")
            return {
                'success': False,
                'error': 'Erro ao criar usuário'
            }
    
    @classmethod
    def _prepare_response(cls, user: Usuario, token_obj: RefreshTokenLocal) -> dict:
        """Prepara resposta de login bem-sucedido."""
        return {
            'success': True,
            'access_token': token_obj.access_token,
            'refresh_token': token_obj.refresh_token,
            'access_token_expires_in': cls.ACCESS_TOKEN_TTL,
            'user': {
                'id_usuario': user.id_usuario,
                'login': user.login,
                'nome': user.nome,
                'email': user.email,
                'nivel_acesso': user.nivel_acesso,
                'matricula': user.matricula,
                'telefone': user.telefone
            }
        }
    
    @classmethod
    def refresh_access_token(cls, refresh_token: str, use_api: bool = True) -> dict:
        """
        Renovar Access Token usando Refresh Token.
        
        Returns:
            {
                'success': bool,
                'access_token': str,
                'access_token_expires_in': int,
                'error': str (se success=False)
            }
        """
        try:
            # Buscar o RefreshToken local
            token_obj = RefreshTokenLocal.objects.get(refresh_token=refresh_token)
            
            if use_api:
                # Chamar API para obter novo access token
                logger.info(f"Renovando access token para usuário: {token_obj.user.login}")
                # Aqui você chamaria o endpoint de refresh da API externa
                # Por enquanto, apenas geramos um novo token localmente
                
                token_obj.access_token = f"new_access_token_{datetime.now().timestamp()}"
                token_obj.access_token_expires_at = datetime.now() + timedelta(seconds=cls.ACCESS_TOKEN_TTL)
                token_obj.save()
            
            return {
                'success': True,
                'access_token': token_obj.access_token,
                'access_token_expires_in': cls.ACCESS_TOKEN_TTL
            }
            
        except RefreshTokenLocal.DoesNotExist:
            logger.warning(f"Refresh token inválido: {refresh_token}")
            return {
                'success': False,
                'error': 'Refresh token inválido'
            }
        except Exception as e:
            logger.error(f"Erro ao renovar access token: {str(e)}")
            return {
                'success': False,
                'error': 'Erro ao renovar token'
            }
