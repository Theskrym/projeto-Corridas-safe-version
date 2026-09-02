"""
Arquivo TEMPORÁRIO para testes de autenticação - IGNORA API EXTERNA

Este arquivo permite testar o fluxo de login SEM a API externa.
Salva dados localmente em modo teste.

USE APENAS PARA DESENVOLVIMENTO E TESTES!

Para usar:
    from autenticacao.test_login_temp import TestAuthService
    
    result = TestAuthService.login('usuario_teste', 'senha123')
    print(result)
"""

import logging
import hashlib
from datetime import datetime, timedelta
from django.contrib.auth.hashers import make_password
from .models import Usuario, RefreshTokenLocal

logger = logging.getLogger(__name__)


class TestAuthService:
    """
    Serviço de autenticação para TESTES - não usa API externa.
    Simula o fluxo completo de login com dados locais.
    """
    
    # Configuração de TTL para tokens (TESTE)
    ACCESS_TOKEN_TTL = 300  # 5 minutos
    REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60  # 7 dias
    
    # Usuários de teste pré-definidos (simula base de dados)
    TEST_USERS = {
        'admin': {
            'senha': 'admin123',
            'nome': 'Administrador',
            'email': 'admin@cesmac.edu.br',
            'nivel_acesso': 1,
            'matricula': 'ADM001',
            'telefone': '(85) 9999-9999'
        },
        'motorista': {
            'senha': 'motorista123',
            'nome': 'João da Silva',
            'email': 'joao.silva@cesmac.edu.br',
            'nivel_acesso': 3,
            'matricula': 'MOT001',
            'telefone': '(85) 9888-8888'
        },
        'gerente': {
            'senha': 'gerente123',
            'nome': 'Maria Oliveira',
            'email': 'maria.oliveira@cesmac.edu.br',
            'nivel_acesso': 2,
            'matricula': 'GER001',
            'telefone': '(85) 9777-7777'
        }
    }
    
    @classmethod
    def hash_password(cls, password: str) -> str:
        """Hash da senha para comparação local."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @classmethod
    def generate_test_token(cls, login: str, is_refresh: bool = False) -> str:
        """
        Gera um token de teste (não é JWT real, apenas para testes).
        
        Args:
            login: Login do usuário
            is_refresh: True para Refresh Token, False para Access Token
        """
        token_type = "REFRESH" if is_refresh else "ACCESS"
        timestamp = int(datetime.now().timestamp())
        token = f"TEST_{token_type}_{login}_{timestamp}"
        return token
    
    @classmethod
    def login(cls, login: str, password: str, fcm_token: str = None) -> dict:
        """
        Login para TESTES - salva localmente, não chama API.
        Suporta usuários de teste pré-definidos E usuários criados via formulário.
        
        IMPORTANTE: Verifica PRIMEIRO o banco de dados para não sobrescrever usuários 
        criados com o mesmo login que os usuários de teste pré-definidos.
        
        Args:
            login: Login do usuário
            password: Senha em texto plano
            fcm_token: Token FCM do dispositivo (opcional)
            
        Returns:
            {
                'success': bool,
                'access_token': str,
                'refresh_token': str,
                'access_token_expires_in': int,
                'user': {
                    'id_usuario': int,
                    'login': str,
                    'nome': str,
                    'email': str,
                    'nivel_acesso': int,
                    'matricula': str,
                    'telefone': str
                },
                'error': str (se success=False),
                'test_mode': True
            }
        """
        test_user_data = None
        user = None
        
        # 1. PRIMEIRO: Procurar no banco de dados (usuários criados via formulário)
        try:
            user = Usuario.objects.get(login=login)
            
            # Validar senha usando check_password do Django
            if not user.check_password(password):
                logger.warning(f"Senha inválida para usuário do banco: {login}")
                return {
                    'success': False,
                    'error': 'Usuário ou senha inválidos',
                    'test_mode': True
                }
            # Usuário encontrado no banco e senha válida - usar este usuário
            logger.info(f"Autenticando usuário do banco: {login}")
            
        except Usuario.DoesNotExist:
            # 2. SEGUNDO: Se não encontrou no banco, verificar se é um usuário de teste pré-definido
            if login in cls.TEST_USERS:
                test_user_data = cls.TEST_USERS[login]
                
                # Validar senha do usuário de teste
                if password != test_user_data['senha']:
                    logger.warning(f"Senha inválida para usuário de teste: {login}")
                    return {
                        'success': False,
                        'error': 'Usuário ou senha inválidos',
                        'test_mode': True
                    }
                logger.info(f"Autenticando usuário de teste: {login}")
            else:
                logger.warning(f"Usuário não encontrado: {login}")
                return {
                    'success': False,
                    'error': f'Usuário "{login}" não encontrado',
                    'test_mode': True
                }
        
        try:
            # Se é usuário de teste, criar/atualizar no banco com senha corretamente hashada
            if test_user_data and not user:
                user, user_created = Usuario.objects.get_or_create(
                    login=login,
                    defaults={
                        'nome': test_user_data['nome'],
                        'email': test_user_data['email'],
                        'nivel_acesso': test_user_data['nivel_acesso'],
                        'matricula': test_user_data.get('matricula'),
                        'telefone': test_user_data.get('telefone'),
                        'password': make_password(password)  # Usar make_password do Django
                    }
                )
                
                # Garantir que o usuário está salvo com a senha correta usando make_password
                if not user.check_password(password):
                    user.password = make_password(password)
                    user.save()
                logger.info(f"Usuário de teste '{login}' criado/atualizado no banco de dados")
            
            # Salvar FCM token se fornecido
            if fcm_token:
                user.fcm_token = fcm_token
                user.save(update_fields=['fcm_token'])
            
            # Gerar tokens JWT válidos usando o método get_jwt_token() do modelo Usuario
            access_token = user.get_jwt_token()
            refresh_token = cls.generate_test_token(login, is_refresh=True)
            password_hash = cls.hash_password(password)
            
            # Salvar ou atualizar RefreshToken no banco
            token_obj, token_created = RefreshTokenLocal.objects.update_or_create(
                user=user,
                defaults={
                    'refresh_token': refresh_token,
                    'access_token': access_token,
                    'password_hash': password_hash,
                    'access_token_expires_at': datetime.now() + timedelta(seconds=cls.ACCESS_TOKEN_TTL)
                }
            )
            
            logger.info(f"Login bem-sucedido para {login} (ID: {user.id_usuario})")
            
            return {
                'success': True,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'access_token_expires_in': cls.ACCESS_TOKEN_TTL,
                'user': {
                    'id_usuario': user.id_usuario,
                    'login': user.login,
                    'nome': user.nome,
                    'email': user.email,
                    'nivel_acesso': user.nivel_acesso,
                    'matricula': user.matricula,
                    'telefone': user.telefone
                },
                'test_mode': True,
                'message': '✓ LOGIN DE TESTE BEM-SUCEDIDO - NÃO USA API EXTERNA'
            }
            
        except Exception as e:
            logger.error(f"[TESTE] Erro ao processar login: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f'Erro ao processar login: {str(e)}',
                'test_mode': True
            }
    
    @classmethod
    def list_test_users(cls) -> dict:
        """Lista usuários de teste disponíveis."""
        users = []
        for login, data in cls.TEST_USERS.items():
            users.append({
                'login': login,
                'senha': data['senha'],
                'nome': data['nome'],
                'nivel_acesso': data['nivel_acesso'],
                'email': data['email']
            })
        return {
            'test_mode': True,
            'message': 'Usuários de teste disponíveis para uso em desenvolvimento',
            'users': users
        }
    
    @classmethod
    def simulate_full_flow(cls, login: str, password: str, verbose: bool = True) -> dict:
        """
        Simula o fluxo completo de login com detalhes (para DEBUG).
        
        Args:
            login: Login do usuário
            password: Senha
            verbose: Se True, mostra detalhes de cada passo
        """
        steps = []
        
        if verbose:
            print("\n" + "="*70)
            print("🧪 SIMULAÇÃO DE FLUXO DE LOGIN (MODO TESTE)")
            print("="*70)
        
        # Passo 1: Validar entrada
        step_1 = "✓ Validação de entrada"
        steps.append(step_1)
        if verbose:
            print(f"\n{step_1}")
            print(f"   Login: {login}")
            print(f"   Senha: {'*' * len(password)}")
        
        # Passo 2: Verificar se usuário de teste existe
        step_2 = f"{'✓' if login in cls.TEST_USERS else '✗'} Verificar usuário de teste"
        steps.append(step_2)
        if verbose:
            print(f"\n{step_2}")
            if login in cls.TEST_USERS:
                print(f"   ✓ Usuário encontrado nos dados de teste")
            else:
                print(f"   ✗ Usuário NÃO encontrado. Disponíveis: {list(cls.TEST_USERS.keys())}")
        
        # Passo 3: Validar senha
        if login in cls.TEST_USERS:
            password_valid = password == cls.TEST_USERS[login]['senha']
            step_3 = f"{'✓' if password_valid else '✗'} Validar senha"
            steps.append(step_3)
            if verbose:
                print(f"\n{step_3}")
                if password_valid:
                    print(f"   ✓ Senha válida")
                else:
                    print(f"   ✗ Senha INCORRETA")
        
        # Passo 4: Executar login
        step_4 = "⏳ Executar login"
        steps.append(step_4)
        if verbose:
            print(f"\n{step_4}")
        
        result = cls.login(login, password)
        
        if verbose:
            if result['success']:
                print(f"   ✓ Login bem-sucedido!")
                print(f"\n   Tokens gerados:")
                print(f"   - Access Token: {result['access_token'][:30]}...")
                print(f"   - Refresh Token: {result['refresh_token'][:30]}...")
                print(f"   - Expira em: {result['access_token_expires_in']}s")
                print(f"\n   Dados do usuário:")
                user = result['user']
                print(f"   - ID: {user['id_usuario']}")
                print(f"   - Nome: {user['nome']}")
                print(f"   - Email: {user['email']}")
                print(f"   - Nível de Acesso: {user['nivel_acesso']}")
            else:
                print(f"   ✗ Login falhou!")
                print(f"   Erro: {result['error']}")
            
            print("\n" + "="*70 + "\n")
        
        result['flow_steps'] = steps
        return result
