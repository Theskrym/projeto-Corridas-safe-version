import jwt
import bcrypt
import random
import string
import logging

from requests import request
from .models import Usuario
from django.views import View
from django.urls import reverse
from django.conf import settings
from rest_framework import status, viewsets
from django.core.mail import send_mail
from rest_framework.views import APIView
from datetime import datetime, timedelta
from django.http import HttpResponseRedirect
from rest_framework.response import Response
from .serializers import UserDetailSerializer, ChangePasswordSerializer
from .models import Veiculo, Usuario, Corridas, Notificacao  # Corrida deve existir no seu models
from django.shortcuts import get_object_or_404
from rest_framework.authtoken.models import Token  # Import Token model
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes, action
from .serializers import VeiculoSerializer, MotoristaSerializer, CorridaSerializer, NotificacaoSerializer  # Crie CorridaSerializer
from .corrida_helpers import (
    alterar_rota_antes_iniciar,
    alterar_rota_durante_corrida,
    cancelar_corrida_em_andamento,
    adiar_corrida,
)



logger = logging.getLogger(__name__)

class LoginView(APIView):
    permission_classes = [AllowAny]
    
    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    
    def post(self, request):
        login = request.data.get('login')
        password = request.data.get('password')
        
        logger.info(f"Login attempt for user: {login}")
        logger.debug(f"Request data: {request.data}")

        if not login or not password:
            return Response(
                {'error': 'Login e senha são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Use o novo sistema de autenticação que funciona
            from .test_login_temp import TestAuthService
            
            result = TestAuthService.login(login, password)
            
            if result['success']:
                logger.info(f"Login bem-sucedido para usuário: {login}")
                return Response(result, status=status.HTTP_200_OK)
            else:
                logger.warning(f"Login falhou para usuário: {login}")
                return Response(
                    result,
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
        except Exception as e:
            logger.error(f"Login error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Erro ao processar solicitação'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    
    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    
    def post(self, request):
        email = request.data.get('email')
        logger.info(f"Password reset requested for email: {email}")

        if not email or not email.endswith('@cesmac.edu.br'):
            logger.warning(f"Invalid email format: {email}")
            return Response(
                {'error': 'Por favor, use seu email corporativo (@cesmac.edu.br)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            logger.info("Querying database for user")
            user = Usuario.objects.get(email=email.lower())
            
            # Gera token JWT com tempo de expiração
            expiration_time = datetime.utcnow() + timedelta(hours=1)
            payload = {
                'user_id': user.id_usuario,  # Campo correto do modelo
                'login': user.login,
                'email': user.email,
                'nome': user.nome,
                'nivel_acesso': user.nivel_acesso,
                'exp': expiration_time,
                'force_password_change': True
            }
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            
            # Construir URL para o frontend
            reset_url = f"{settings.FRONTEND_URL}/auto-login?token={token}&force_change=true"
            logger.info(f"Generated reset URL: {reset_url}")

            logger.info("Attempting to send email")
            try:
                # Mensagem de email formatada corretamente
                message = f"""
                    Olá {user.nome},

                    Recebemos uma solicitação para redefinir sua senha no sistema ELIAS.
                    
                    Clique no link abaixo para acessar o sistema:
                    {reset_url}
                    
                    Você será solicitado a criar uma nova senha ao entrar.
                    
                    Se você não solicitou esta alteração, por favor ignore este email.
                    
                    Atenciosamente,
                    Equipe ELIAS
                """
                
                send_mail(
                    subject='Recuperação de Senha - ELIAS',
                    message=message,
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[email],
                    fail_silently=False,
                )
                logger.info(f"Email sent successfully to {email}")
                return Response(
                    {'message': 'Email enviado com sucesso'},
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                logger.error(f"Email sending failed: {str(e)}")
                return Response(
                    {'error': 'Erro ao enviar email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Usuario.DoesNotExist:
            logger.warning(f"User not found: {email}")
            return Response(
                {'error': 'Email não encontrado em nosso sistema'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Password reset error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Erro interno ao processar solicitação'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
class AutoLoginView(APIView):
    permission_classes = [AllowAny]
    
    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    
    def post(self, request):
        token = request.data.get('token')
        
        try:
            # Decode and verify the token
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user = Usuario.objects.get(id_usuario=payload['user_id'])
            
            # Generate new session token
            refresh = RefreshToken.for_user(user)
            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user_id': user.id_usuario,
                'login': user.login,
                'nome': user.nome,
                'email': user.email,
                'nivel_acesso': user.nivel_acesso,
                'force_password_change': payload.get('force_password_change', False)
            })
            
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Usuario.DoesNotExist) as e:
            logger.error(f"AutoLogin failed: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Link inválido ou expirado'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"AutoLogin error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Erro ao processar solicitação'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
                               
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user
        logger.info(f"ChangePassword PUT request from user: {user.login if hasattr(user, 'login') else user}")
        logger.debug(f"Request data type: {type(request.data)}")
        logger.debug(f"Request data: {request.data}")
        logger.debug(f"User authenticated: {user.is_authenticated}")
        
        # Verificar se request.data tem os campos obrigatórios
        if not request.data:
            logger.error("Request body is empty!")
            return Response(
                {'error': 'Corpo da requisição vazio'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ChangePasswordSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.warning(f"Serializer validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        logger.debug(f"Serializer validated data: {list(data.keys())}")
        
        # Verificar senha atual usando o método do Django (suporta múltiplos algoritmos)
        if not user.check_password(data['senhaAtual']):
            logger.warning(f"Incorrect current password for user: {user.login}")
            return Response(
                {'error': 'Senha atual incorreta'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Atualizar senha usando set_password do Django
        user.set_password(data['novaSenha'])
        user.save()
        
        logger.info(f"Password changed successfully for user: {user.login}")
        return Response({'message': 'Senha alterada com sucesso'})
    
    def patch(self, request):
        """Alias for PUT to support both methods"""
        logger.debug(f"ChangePassword PATCH request from user: {request.user.login if hasattr(request.user, 'login') else request.user}")
        return self.put(request)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_personal_data(request):
    user = request.user
    
    if request.method == 'GET':
        serializer = UserDetailSerializer(user)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Permitir apenas campos editáveis
        allowed_fields = ['nome', 'telefone']
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        serializer = UserDetailSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
# --- VEÍCULO ---
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def listar_veiculos(request):
    if request.method == 'GET':
        veiculos = Veiculo.objects.all()
        serializer = VeiculoSerializer(veiculos, many=True)
        return Response({'data': serializer.data})
    elif request.method == 'POST':
        serializer = VeiculoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- VEÍCULO ---
@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([AllowAny])
def veiculo_detail(request, id):
    veiculo = get_object_or_404(Veiculo, id_veiculo=id)
    if request.method == 'GET':
        serializer = VeiculoSerializer(veiculo)
        return Response(serializer.data)
    elif request.method == 'PUT' or request.method == 'PATCH':
        serializer = VeiculoSerializer(veiculo, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def veiculo_conflitos(request, id):
    """
    Verifica se um veículo tem corridas conflitantes em um período específico.
    
    Query params:
    - data_inicio: data da corrida (YYYY-MM-DD)
    - horario_inicio: horário de início (HH:MM)
    - horario_retorno: horário de retorno (HH:MM)
    
    Retorna:
    {
        "conflito": bool,
        "id_corrida": int ou null,
        "data_inicio": str,
        "horario_inicio": str,
        "horario_retorno": str
    }
    """
    veiculo = get_object_or_404(Veiculo, id_veiculo=id)
    
    data_inicio = request.query_params.get('data_inicio')
    horario_inicio = request.query_params.get('horario_inicio')
    horario_retorno = request.query_params.get('horario_retorno')
    
    if not data_inicio or not horario_inicio:
        return Response(
            {'error': 'data_inicio e horario_inicio são obrigatórios'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    from datetime import datetime, time
    
    try:
        # Converter strings em objetos de data/hora
        data = datetime.strptime(data_inicio, '%Y-%m-%d').date()
        hora_inicio = datetime.strptime(horario_inicio, '%H:%M').time()
        
        # Se não houver horario_retorno, usar 23:59
        if horario_retorno:
            hora_retorno = datetime.strptime(horario_retorno, '%H:%M').time()
        else:
            hora_retorno = time(23, 59)
        
        # Buscar corridas do veículo naquele dia com status ativo
        corridas = Corridas.objects.filter(
            veiculo=veiculo,
            data_inicio=data,
            status__in=[
                Corridas.StatusChoices.CONFIRMADA,
                Corridas.StatusChoices.EM_ANDAMENTO,
                Corridas.StatusChoices.PENDENTE
            ]
        )
        
        # Verificar conflito de horário
        conflito = None
        for corrida in corridas:
            corrida_inicio = corrida.horario_inicio or time(0, 0)
            corrida_fim = corrida.horario_retorno or time(23, 59)
            
            # Verificar se há sobreposição
            if (hora_inicio < corrida_fim and hora_retorno > corrida_inicio):
                conflito = corrida
                break
        
        if conflito:
            return Response({
                'conflito': True,
                'id_corrida': conflito.id_corrida,
                'data_inicio': conflito.data_inicio.isoformat(),
                'horario_inicio': str(conflito.horario_inicio) if conflito.horario_inicio else None,
                'horario_retorno': str(conflito.horario_retorno) if conflito.horario_retorno else None
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'conflito': False
            }, status=status.HTTP_200_OK)
    
    except ValueError as e:
        return Response(
            {'error': f'Formato de data/hora inválido: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def listar_motoristas(request):
    motoristas = Usuario.objects.filter(nivel_acesso=3)
    serializer = MotoristaSerializer(motoristas, many=True)
    return Response({'data': serializer.data})

# --- MOTORISTA ---
@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([AllowAny])
def motorista_detail(request, id):
    motorista = get_object_or_404(Usuario, id_usuario=id)
    if request.method == 'GET':
        serializer = MotoristaSerializer(motorista)
        return Response(serializer.data)
    elif request.method == 'PUT' or request.method == 'PATCH':
        import logging
        logger = logging.getLogger(__name__)
        
        logger.debug(f"Dados recebidos no PATCH: {request.data}")
        
        serializer = MotoristaSerializer(motorista, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        logger.warning(f"Erros de validação: {serializer.errors}")
        return Response({
            'detail': 'Erro de validação',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

# --- CRIAR MOTORISTA ---
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_motorista(request):
    """
    Criar novo motorista via formulário de admin.
    Payload esperado:
    {
        "nome": "string",
        "email": "usuario@cesmac.edu.br",
        "telefone": "string (opcional)",
        "matricula": "string (opcional)",
        "login": "string (opcional - gerado automaticamente se vazio)"
    }
    Senha sempre = 'cesmac@2026'
    """
    try:
        nome = request.data.get('nome', '').strip()
        email = request.data.get('email', '').strip().lower()
        telefone = request.data.get('telefone', '').strip()
        matricula = request.data.get('matricula', '').strip()
        login = request.data.get('login', '').strip()
        nivel_acesso_raw = request.data.get('nivel_acesso', 3)
        
        # Validações obrigatórias
        if not nome:
            return Response(
                {'error': 'Nome é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not email:
            return Response(
                {'error': 'Email é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar email corporativo
        if not email.endswith('@cesmac.edu.br'):
            return Response(
                {'error': 'Email deve ser corporativo (@cesmac.edu.br)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se email já existe
        if Usuario.objects.filter(email=email).exists():
            return Response(
                {'error': 'Email já cadastrado no sistema'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Gerar login se não fornecido (usar prefixo do email)
        if not login:
            login = email.split('@')[0]
            # Garantir uniqueness
            base_login = login
            counter = 1
            while Usuario.objects.filter(login=login).exists():
                login = f"{base_login}{counter}"
                counter += 1
        else:
            # Validar se login já existe
            if Usuario.objects.filter(login=login).exists():
                return Response(
                    {'error': 'Login já cadastrado no sistema'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            nivel_acesso = int(nivel_acesso_raw)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Nível de acesso inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.nivel_acesso == 4:
            nivel_acesso = 3
        elif request.user.nivel_acesso == 2 and nivel_acesso == 1:
            return Response(
                {'error': 'Gerentes não podem criar usuários Administradores'},
                status=status.HTTP_403_FORBIDDEN
            )

        if nivel_acesso not in [1, 2, 3, 4, 5]:
            return Response(
                {'error': 'Nível de acesso deve ser um dos valores permitidos: 1, 2, 3, 4 ou 5'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Criar usuário com senha padrão
        senha_padrao = 'cesmac@2026'
        usuario = Usuario.objects.create_user(
            login=login,
            email=email,
            password=senha_padrao,
            nome=nome,
            telefone=telefone if telefone else None,
            matricula=matricula if matricula else None,
            nivel_acesso=nivel_acesso
        )
        
        logger.info(f"Novo motorista criado: {login} ({email})")
        
        return Response({
            'success': True,
            'message': 'Motorista criado com sucesso',
            'usuario': {
                'id_usuario': usuario.id_usuario,
                'login': usuario.login,
                'nome': usuario.nome,
                'email': usuario.email,
                'telefone': usuario.telefone,
                'matricula': usuario.matricula,
                'nivel_acesso': usuario.nivel_acesso,
                'senha_temporaria': senha_padrao,
                'nota': 'Usuário deve alterar a senha no primeiro login'
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Erro ao criar motorista: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Erro ao criar motorista: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marcar_multiplas(request):
    ids = request.data.get('ids', [])
    lida = request.data.get('lida', True)

    if not ids:
        return Response({'detail': 'Nenhum ID fornecido.'}, status=400)

    queryset = Notificacao.objects.filter(
        id_notificacao__in=ids,
        usuario=request.user
    )
    atualizadas = queryset.update(lida=lida)

    return Response({'atualizadas': atualizadas}, status=200)
# ==================== NOVO SISTEMA DE AUTENTICAÇÃO ====================
# Views integradas com API externa (auth_service.py)
# ===========================================================================

from .auth_service import AuthenticationService
from .auth_serializers import LoginSerializer, RefreshTokenSerializer


class LoginV2View(APIView):
    """
    View de login integrada com API externa.
    
    Fluxo:
    1. Se usuário existe localmente e hash coincide: usa dados locais
    2. Se hash diferente ou usuário novo: valida na API externa
    3. Retorna Access Token (TTL: 300s) e Refresh Token
    
    Endpoint: POST /api/login/
    """
    
    def post(self, request):
        """
        Login com validação via API externa (se necessário).
        
        Body:
        {
            "login": "usuario",
            "password": "senha"
        }
        """
        serializer = LoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.warning(f"Dados de login inválidos: {serializer.errors}")
            return Response(
                {'error': 'Login e senha são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        login = serializer.validated_data['login']
        password = serializer.validated_data['password']
        fcm_token = serializer.validated_data.get('fcm_token', None)
        
        # Usar API externa para validação (use_api=True por padrão)
        result = AuthenticationService.login(login, password, use_api=True, fcm_token=fcm_token)
        
        if result['success']:
            logger.info(f"Login bem-sucedido para usuário: {login}")
            return Response(result, status=status.HTTP_200_OK)
        else:
            logger.warning(f"Login falhou para usuário: {login} - {result.get('error')}")
            return Response(
                result,
                status=status.HTTP_401_UNAUTHORIZED
            )


class LoginTestView(APIView):
    """
    View de login TEMPORÁRIA para TESTES - não usa API externa.
    
    USE APENAS PARA DESENVOLVIMENTO!
    Usuários de teste disponíveis em autenticacao/test_login_temp.py
    
    Endpoint: POST /api/login/test/
    """
    
    def post(self, request):
        """
        Login de teste sem validação na API externa.
        
        Body:
        {
            "login": "admin|motorista|gerente",
            "password": "admin123|motorista123|gerente123"
        }
        """
        from .test_login_temp import TestAuthService
        
        serializer = LoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Login e senha são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        login = serializer.validated_data['login']
        password = serializer.validated_data['password']
        fcm_token = serializer.validated_data.get('fcm_token', None)
        
        result = TestAuthService.login(login, password, fcm_token=fcm_token)
        
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(
                result,
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    def get(self, request):
        """Lista usuários de teste disponíveis."""
        from .test_login_temp import TestAuthService
        return Response(
            TestAuthService.list_test_users(),
            status=status.HTTP_200_OK
        )


class RefreshTokenView(APIView):
    """
    View para renovar Access Token usando Refresh Token.
    
    Endpoint: POST /api/refresh-token/
    """
    
    def post(self, request):
        """
        Renovar Access Token.
        
        Body:
        {
            "refresh_token": "token_aqui"
        }
        """
        serializer = RefreshTokenSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Refresh token é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        refresh_token = serializer.validated_data['refresh_token']
        
        result = AuthenticationService.refresh_access_token(refresh_token)
        
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(
                result,
                status=status.HTTP_401_UNAUTHORIZED
            )


class NotificacaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar notificações do usuário.
    Apenas mostra as notificações do próprio usuário ou de admin.
    """
    serializer_class = NotificacaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Todos os usuários veem apenas suas próprias notificações
        # Excluir notificações ocultas
        return Notificacao.objects.filter(usuario=user, oculta=False).select_related('usuario', 'corrida')

    @action(detail=True, methods=['post'])
    def marcar_como_lida(self, request, pk=None):
        """Mark notification as read"""
        notificacao = self.get_object()
        notificacao.marcar_como_lida()
        serializer = self.get_serializer(notificacao)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def marcar_como_nao_lida(self, request, pk=None):
        """Mark notification as unread"""
        notificacao = self.get_object()
        notificacao.marcar_como_nao_lida()
        serializer = self.get_serializer(notificacao)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def ocultar_multiplas(self, request):
        """Ocultar múltiplas notificações (soft delete)"""
        ids = request.data.get('ids', [])
        if not ids:
            return Response(
                {'error': 'Nenhuma notificação selecionada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Apenas ocultar notificações do usuário
        queryset = self.get_queryset().filter(id_notificacao__in=ids)
        count = queryset.update(oculta=True)
        
        return Response({
            'message': f'{count} notificação(ões) oculta(s)',
            'deleted_count': count
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def nao_lidas(self, request):
        """Get only unread notifications"""
        queryset = self.get_queryset().filter(lida=False)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def contagem(self, request):
        """Get count of unread notifications"""
        total_nao_lidas = self.get_queryset().filter(lida=False).count()
        return Response({
            'total_nao_lidas': total_nao_lidas
        })
        
class CorridaViewSet(viewsets.ModelViewSet):
    queryset = Corridas.objects.all().select_related('veiculo', 'motorista', 'criado_por')
    serializer_class = CorridaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # IMPORTANTE: Não usar self.queryset pois está cacheado. Sempre criar nova query com .all()
        base_queryset = Corridas.objects.all().select_related('veiculo', 'motorista', 'criado_por')
        
        if getattr(user, 'nivel_acesso', None) in [1, 2, 4]:
            return base_queryset
        
        # Mostrar corridas criadas pelo usuário OU onde ele é o motorista
        from django.db.models import Q
        return base_queryset.filter(Q(criado_por=user) | Q(motorista=user))

    def perform_create(self, serializer):
        # Atribuir automaticamente o usuário logado como criador
        serializer.save(criado_por=self.request.user)
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        
        # ================================================================
        # 1. GUARDAR INFORMAÇÕES ANTES DA ALTERAÇÃO
        # ================================================================
        motorista_antes = instance.motorista
        motorista_id_antes = motorista_antes.id_usuario if motorista_antes else None
        
        # Guardar dados antigos para comparar (opcional)
        dados_antes = {
            'ponto_inicio': instance.ponto_inicio,
            'ponto_chegada': instance.ponto_chegada,
            'data_inicio': instance.data_inicio,
            'horario_inicio': instance.horario_inicio,
            'horario_retorno': instance.horario_retorno,
            'status': instance.status,
            'solicitante': instance.solicitante,
            'destinos': instance.destinos,
            'servico': instance.servico,
            'observacao': instance.observacao,
            'paradas_intermediarias': instance.paradas_intermediarias,
            'veiculo_id': instance.veiculo.id_veiculo if instance.veiculo else None,
        }
        
        # ================================================================
        # 2. VALIDAÇÕES DE PERMISSÃO
        # ================================================================
        if instance.motorista and instance.motorista != user and getattr(user, 'nivel_acesso', None) not in [1, 2, 4]:
            return Response({'detail': 'Acesso negado.'}, status=status.HTTP_403_FORBIDDEN)

        status_value = request.data.get('status')
        if status_value and status_value not in [
            Corridas.StatusChoices.PENDENTE,
            Corridas.StatusChoices.CONFIRMADA,
            Corridas.StatusChoices.EM_ANDAMENTO,
            Corridas.StatusChoices.CONCLUIDA,
            Corridas.StatusChoices.CANCELADA,
            Corridas.StatusChoices.RECUSADA,
        ]:
            return Response({'detail': 'Status inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-preencher datas baseado na mudança de status
        from django.utils import timezone
        
        if hasattr(request.data, '_mutable'):
            data = dict(request.data)
        else:
            data = dict(request.data) if not isinstance(request.data, dict) else request.data
        
        if status_value:
            if status_value == Corridas.StatusChoices.EM_ANDAMENTO and instance.status != Corridas.StatusChoices.EM_ANDAMENTO:
                data['data_inicio'] = timezone.now().date()
            elif status_value == Corridas.StatusChoices.CONCLUIDA and instance.status != Corridas.StatusChoices.CONCLUIDA:
                data['data_conclusao'] = timezone.now()
            elif status_value == Corridas.StatusChoices.CANCELADA and instance.status != Corridas.StatusChoices.CANCELADA:
                data['data_cancelamento'] = timezone.now()
        
        request._full_data = data
        
        # ================================================================
        # 3. EXECUTAR A ATUALIZAÇÃO
        # ================================================================
        response = super().partial_update(request, *args, **kwargs)
        
        # ================================================================
        # 4. NOTIFICAR O MOTORISTA (QUALQUER MUDANÇA)
        # ================================================================
        if response.status_code == 200:
            # Buscar a instância atualizada
            instance.refresh_from_db()
            
            # Determinar quem é o motorista atual (pode ter mudado)
            motorista_depois = instance.motorista
            motorista_id_depois = motorista_depois.id_usuario if motorista_depois else None
            
            # Verificar se houve alteração (comparar dados)
            dados_depois = {
                'ponto_inicio': instance.ponto_inicio,
                'ponto_chegada': instance.ponto_chegada,
                'data_inicio': instance.data_inicio,
                'horario_inicio': instance.horario_inicio,
                'horario_retorno': instance.horario_retorno,
                'status': instance.status,
                'solicitante': instance.solicitante,
                'destinos': instance.destinos,
                'servico': instance.servico,
                'observacao': instance.observacao,
                'paradas_intermediarias': instance.paradas_intermediarias,
                'veiculo_id': instance.veiculo.id_veiculo if instance.veiculo else None,
            }
            
            # Verificar se algo mudou
            houve_mudanca = False
            campos_alterados = []
            
            for campo in dados_antes:
                if dados_antes[campo] != dados_depois[campo]:
                    houve_mudanca = True
                    campos_alterados.append(campo)
            
            # Se houve mudança e existe um motorista para notificar
            if houve_mudanca and motorista_id_depois is not None:
                try:
                    from .models import Notificacao
                    
                    # Verificar se o motorista mudou
                    if motorista_id_antes != motorista_id_depois:
                        # Motorista novo - notificação diferente
                        titulo = 'Nova Corrida Atribuída'
                        mensagem = f'Você foi designado como motorista para a corrida do dia {instance.data_inicio.strftime("%d/%m/%Y")}'
                        if instance.horario_inicio:
                            mensagem += f' às {instance.horario_inicio.strftime("%H:%M")}'
                        tipo = 'driver_assigned'
                    else:
                        # Mesmo motorista - notificação de alteração
                        titulo = 'Corrida Atualizada'
                        
                        # Gerar mensagem descritiva
                        if len(campos_alterados) == 1:
                            campo = campos_alterados[0]
                            nomes_campos = {
                                'ponto_inicio': 'ponto de partida',
                                'ponto_chegada': 'ponto de chegada',
                                'data_inicio': 'data',
                                'horario_inicio': 'horário de início',
                                'horario_retorno': 'horário de retorno',
                                'status': 'status',
                                'solicitante': 'solicitante',
                                'destinos': 'destinos',
                                'servico': 'serviço',
                                'observacao': 'observação',
                                'veiculo_id': 'veículo',
                            }
                            nome_campo = nomes_campos.get(campo, campo)
                            mensagem = f'O campo "{nome_campo}" foi alterado na corrida do dia {instance.data_inicio.strftime("%d/%m/%Y")}'
                        else:
                            mensagem = f'A corrida do dia {instance.data_inicio.strftime("%d/%m/%Y")} foi atualizada'
                            if instance.horario_inicio:
                                mensagem += f' (horário: {instance.horario_inicio.strftime("%H:%M")})'
                        tipo = 'ride_modified'
                    
                    # Criar a notificação
                    Notificacao.objects.create(
                        usuario_id=motorista_id_depois,
                        corrida_id=instance.id_corrida,
                        titulo=titulo,
                        mensagem=mensagem,
                        tipo=tipo,
                        lida=False,
                        oculta=False
                    )
                    logger.info(f"Notificação enviada para motorista {motorista_id_depois} - Corrida {instance.id_corrida} - Campos alterados: {campos_alterados}")
                    
                except Exception as e:
                    logger.error(f"Erro ao criar notificação: {str(e)}")
        
        return response


    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def complete_ride(self, request, pk=None):
        """
        Mark a ride as completed (motorista endpoint)
        Only the assigned motorista or admin can complete a ride
        """
        corrida = self.get_object()
        user = request.user
        
        # Check permission - only motorista or admin can complete their own ride
        if corrida.motorista != user and getattr(user, 'nivel_acesso', None) not in [1, 2, 4]:
            return Response(
                {'detail': 'Você não tem permissão para completar esta corrida.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Ride must be in progress to be completed
        if corrida.status != Corridas.StatusChoices.EM_ANDAMENTO:
            return Response(
                {'detail': f'Apenas corridas em andamento podem ser concluídas. Status atual: {corrida.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone
        corrida.status = Corridas.StatusChoices.CONCLUIDA
        corrida.data_conclusao = timezone.now()
        corrida.save()
        
        serializer = self.get_serializer(corrida)
        return Response(
            {'message': 'Corrida marcada como concluída com sucesso!', 'data': serializer.data},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def recusar(self, request, pk=None):
        """
        Mark a ride as refused (motorista endpoint)
        Only the assigned motorista can refuse a ride, and only if it's pending or confirmed
        Notifies the creator that the ride was refused
        """
        corrida = self.get_object()
        user = request.user
        
        # Check permission - only assigned motorista can refuse
        if corrida.motorista != user:
            return Response(
                {'detail': 'Apenas o motorista atribuído pode recusar esta corrida.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Can only refuse pending or confirmed rides
        if corrida.status not in [Corridas.StatusChoices.PENDENTE, Corridas.StatusChoices.CONFIRMADA]:
            return Response(
                {'detail': f'Não é possível recusar uma corrida com status {corrida.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get optional motivo from request
        motivo = request.data.get('motivo', '').strip()
        
        # Update corrida status
        corrida.status = Corridas.StatusChoices.RECUSADA
        if motivo:
            corrida.observacao = f"Recusada pelo motorista: {motivo}"
        else:
            corrida.observacao = "Recusada pelo motorista"
        corrida.save()
        
        serializer = self.get_serializer(corrida)
        return Response(
            {'message': 'Corrida recusada com sucesso!', 'data': serializer.data},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def alterar_rota_antes(self, request, pk=None):
        """
        Alter ride route before it starts
        Only for confirmed rides - will require re-confirmation
        """
        try:
            novo_ponto_chegada = request.data.get('novo_ponto_chegada')
            novas_paradas = request.data.get('novas_paradas')
            
            if not novo_ponto_chegada:
                return Response(
                    {'detail': 'novo_ponto_chegada é obrigatório'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            resultado = alterar_rota_antes_iniciar(
                corrida_id=pk,
                novo_ponto_chegada=novo_ponto_chegada,
                novas_paradas=novas_paradas,
                usuario_id=request.user.id_usuario
            )
            
            if not resultado.get('sucesso'):
                return Response(
                    {'detail': resultado.get('erro', 'Erro ao alterar rota')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            corrida = self.get_object()
            serializer = self.get_serializer(corrida)
            return Response(
                {'message': 'Rota alterada com sucesso!', 'data': serializer.data, 'resultado': resultado},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'detail': f'Erro ao alterar rota: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def alterar_rota_durante(self, request, pk=None):
        """
        Alter route during ride execution (admin only)
        Motorista will receive urgent notification
        """
        # Check if user is admin
        if getattr(request.user, 'nivel_acesso', None) not in [1, 2, 4]:
            return Response(
                {'detail': 'Apenas administradores, gerentes ou operadores podem alterar rota durante corrida'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            novo_ponto_chegada = request.data.get('novo_ponto_chegada')
            
            if not novo_ponto_chegada:
                return Response(
                    {'detail': 'novo_ponto_chegada é obrigatório'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            resultado = alterar_rota_durante_corrida(
                corrida_id=pk,
                novo_ponto_chegada=novo_ponto_chegada,
                usuario_id=request.user.id_usuario
            )
            
            if not resultado.get('sucesso'):
                return Response(
                    {'detail': resultado.get('erro', 'Erro ao alterar rota')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            corrida = self.get_object()
            serializer = self.get_serializer(corrida)
            return Response(
                {'message': 'Rota alterada e motorista notificado!', 'data': serializer.data, 'resultado': resultado},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'detail': f'Erro ao alterar rota: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """
        Cancel a ride in progress
        Admin or motorista can cancel
        """
        try:
            corrida = self.get_object()
            motivo = request.data.get('motivo', 'Cancelamento solicitado')
            
            resultado = cancelar_corrida_em_andamento(
                corrida_id=pk,
                quem_cancelou_id=request.user.id_usuario,
                motivo=motivo
            )
            
            if not resultado.get('sucesso'):
                return Response(
                    {'detail': resultado.get('erro', 'Erro ao cancelar corrida')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            corrida = self.get_object()
            serializer = self.get_serializer(corrida)
            return Response(
                {'message': 'Corrida cancelada com sucesso!', 'data': serializer.data, 'resultado': resultado},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'detail': f'Erro ao cancelar corrida: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def adiar(self, request, pk=None):
        """
        Postpone a ride to a new date/time
        If already confirmed, will require re-confirmation
        """
        try:
            nova_data_str = request.data.get('nova_data')  # format: YYYY-MM-DD
            nova_hora_str = request.data.get('nova_hora')  # format: HH:MM:SS
            
            if not nova_data_str or not nova_hora_str:
                return Response(
                    {'detail': 'nova_data e nova_hora são obrigatórios (formato: YYYY-MM-DD e HH:MM:SS)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from datetime import datetime, time
            try:
                nova_data = datetime.strptime(nova_data_str, '%Y-%m-%d').date()
                nova_hora = datetime.strptime(nova_hora_str, '%H:%M:%S').time()
            except ValueError:
                return Response(
                    {'detail': 'Formato de data/hora inválido. Use YYYY-MM-DD para data e HH:MM:SS para hora'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            resultado = adiar_corrida(
                corrida_id=pk,
                nova_data=nova_data,
                nova_hora=nova_hora,
                usuario_id=request.user.id_usuario
            )
            
            if not resultado.get('sucesso'):
                return Response(
                    {'detail': resultado.get('erro', 'Erro ao adiar corrida')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            corrida = self.get_object()
            serializer = self.get_serializer(corrida)
            return Response(
                {'message': 'Corrida adiada com sucesso!', 'data': serializer.data, 'resultado': resultado},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'detail': f'Erro ao adiar corrida: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
