from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.contrib.auth.hashers import make_password, check_password
import jwt
import bcrypt
from django.conf import settings
from datetime import datetime, timedelta, timezone

class UsuarioManager(BaseUserManager):
    def create_user(self, login, email, password=None, **extra_fields):
        if not login:
            raise ValueError('O login é obrigatório')
        if not email:
            raise ValueError('O email é obrigatório')
        
        # Validar email corporativo
        if not email.endswith('@cesmac.edu.br') or email.startswith('@'):
            raise ValueError('O email deve ser um email corporativo válido (@cesmac.edu.br)')
        
        user = self.model(
            login=login,
            email=email.lower(),
            **extra_fields
        )
        user.password = make_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, login, email, password=None, **extra_fields):
        extra_fields.setdefault('nivel_acesso', 1)
        extra_fields.setdefault('is_active', True)
        return self.create_user(login, email, password, **extra_fields)

class Usuario(AbstractBaseUser):
    id_usuario = models.AutoField(primary_key=True, db_column='id_usuario')
    nome = models.CharField(max_length=100, db_column='nome')
    telefone = models.CharField(max_length=25, null=True, blank=True, db_column='telefone')
    matricula = models.CharField(max_length=25, null=True, blank=True, db_column='matricula')
    email = models.EmailField(max_length=100, unique=True, db_column='email')
    login = models.CharField(max_length=50, unique=True, db_column='login')
    password = models.CharField(max_length=255, db_column='senha')
    nivel_acesso = models.IntegerField(default=3, db_column='nivel_acesso')
    fcm_token = models.CharField(max_length=255, null=True, blank=True, db_column='fcm_token')
    data_criacao = models.DateTimeField(auto_now_add=True, db_column='data_criacao')
    last_login = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_column='is_active')  # 1 = Ativo, 0 = Inativo

    objects = UsuarioManager()

    USERNAME_FIELD = 'login'
    REQUIRED_FIELDS = ['nome', 'email']

    def check_password(self, raw_password):
        """
        Verifica se a senha fornecida é correta.
        Usa a função padrão do Django que suporta múltiplos algoritmos de hash.
        """
        return check_password(raw_password, self.password)

    def has_perm(self, perm, obj=None):
        """Verifica se o usuário tem permissão para algo baseado no nivel_acesso"""
        return self.nivel_acesso <= 2

    def has_module_perms(self, app_label):
        """Verifica se o usuário tem permissão para acessar um módulo"""
        return True

    @property
    def is_staff(self):
        """Django admin requer is_staff. Usuários com nível 1 ou 2 são staff"""
        return self.nivel_acesso <= 2

    @property
    def is_superuser(self):
        """Apenas nível 1 é superuser"""
        return self.nivel_acesso == 1

    def get_username(self):
        return self.login
    
    class Meta:
        db_table = 'ELIAS_Usuarios'
        managed = True  # Allow Django to manage the table

    def get_jwt_token(self):
        token_expiry = datetime.utcnow() + timedelta(hours=24)
        
        token_payload = {
            'user_id': self.id_usuario,
            'login': self.login,
            'email': self.email,
            'nome': self.nome,
            'nivel_acesso': self.nivel_acesso,
            'exp': token_expiry
        }

        token = jwt.encode(
            token_payload,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )

        return token


class AuthRouter:
    route_app_labels = {'auth', 'contenttypes', 'sessions', 'admin'}

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return 'default'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return 'default'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label in self.route_app_labels:
            return db == 'default'
        return None


class Corridas(models.Model):
    # Status choices
    class StatusChoices(models.TextChoices):
        PENDENTE = 'pendente', 'Pendente'
        CONFIRMADA = 'confirmada', 'Confirmada'
        RECONFIRMACAO_NECESSARIA = 'reconfirmacao_necessaria', 'Reconfirmação Necessária'
        EM_ANDAMENTO = 'em_andamento', 'Em Andamento'
        CONCLUIDA = 'concluida', 'Concluída'
        CANCELADA = 'cancelada', 'Cancelada'
        RECUSADA = 'recusada', 'Recusada'

    # Campos principais
    id_corrida = models.AutoField(primary_key=True, db_column='id_corrida')
    ponto_inicio = models.CharField(max_length=255, db_column='ponto_inicio', verbose_name="Ponto de Início")
    solicitante = models.CharField(max_length=255, null=True, blank=True, db_column='solicitante', verbose_name="Solicitante")
    destinos = models.TextField(null=True, blank=True, db_column='destinos', verbose_name="Destinos")
    servico = models.TextField(null=True, blank=True, db_column='servico', verbose_name="Serviço")
    ponto_chegada = models.CharField(max_length=255, db_column='ponto_chegada', verbose_name="Ponto de Chegada")
    horario_inicio = models.TimeField(null=True, blank=True, db_column='horario_inicio', verbose_name="Horário de Início")
    horario_retorno = models.TimeField(null=True, blank=True, db_column='horario_retorno', verbose_name="Horário de Retorno")
    
    # Paradas intermediárias (serializadas em JSON)
    paradas_intermediarias = models.JSONField(
        default=list,
        blank=True,
        db_column='paradas_intermediarias',
        verbose_name="Paradas Intermediárias",
        help_text="Lista de pontos de parada no formato: [{'nome': 'Local X', 'endereco': 'Rua Y'}, ...]"
    )
    
    # Relacionamentos
    motorista = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        related_name='corridas_motorista',
        db_column='motorista_id',
        verbose_name="Motorista"
    )
    
    veiculo = models.ForeignKey(
        'Veiculo',
        on_delete=models.SET_NULL,
        null=True,
        related_name='corridas',
        db_column='veiculo_id',
        verbose_name="Veículo"
    )
    
    criado_por = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        related_name='corridas_criadas',
        db_column='criado_por_id',
        verbose_name="Criado por"
    )
    
    # Status
    status = models.CharField(
        max_length=30,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDENTE,
        db_column='status'
    )
    
    # Datas e timestamps
    data_solicitacao = models.DateTimeField(auto_now_add=True, db_column='data_solicitacao')
    data_inicio = models.DateField(null=False, blank=False, db_column='data_inicio', verbose_name="Data de Início")
    data_conclusao = models.DateTimeField(null=True, blank=True, db_column='data_conclusao')
    data_cancelamento = models.DateTimeField(null=True, blank=True, db_column='data_cancelamento')
    ultima_atualizacao = models.DateTimeField(auto_now=True, db_column='ultima_atualizacao')
    
    # Campos adicionais úteis
    observacao = models.TextField(blank=True, null=True, db_column='observacao')

    class Meta:
        db_table = 'ELIAS_Corridas'
        verbose_name = 'Corrida'
        verbose_name_plural = 'Corridas'
        ordering = ['-data_solicitacao']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['motorista']),
            models.Index(fields=['veiculo']),
            models.Index(fields=['data_solicitacao']),
        ]

    def __str__(self):
        return f"Corrida {self.id_corrida} - {self.status}"

    # Métodos utilitários para gerenciar paradas
    def adicionar_parada(self, nome_parada, endereco=None, ordem=None):
        """
        Adiciona uma parada intermediária.
        
        Args:
            nome_parada (str): Nome/identificação da parada
            endereco (str, optional): Endereço completo da parada
            ordem (int, optional): Ordem da parada (se None, adiciona ao final)
        """
        paradas = list(self.paradas_intermediarias)
        
        nova_parada = {
            'nome': nome_parada,
            'endereco': endereco or nome_parada,
            'ordem': ordem if ordem is not None else len(paradas)
        }
        
        if ordem is not None and 0 <= ordem < len(paradas):
            paradas.insert(ordem, nova_parada)
        else:
            paradas.append(nova_parada)
        
        # Reordenar
        for i, parada in enumerate(paradas):
            parada['ordem'] = i
        
        self.paradas_intermediarias = paradas
        self.save(update_fields=['paradas_intermediarias'])
        return self.paradas_intermediarias

    def remover_parada(self, indice):
        """Remove uma parada pelo índice"""
        paradas = list(self.paradas_intermediarias)
        if 0 <= indice < len(paradas):
            paradas.pop(indice)
            # Reordenar
            for i, parada in enumerate(paradas):
                parada['ordem'] = i
            self.paradas_intermediarias = paradas
            self.save(update_fields=['paradas_intermediarias'])
        return self.paradas_intermediarias

    def obter_todos_pontos(self):
        """Retorna todos os pontos da rota: início, paradas, chegada"""
        pontos = [self.ponto_inicio]
        for parada in self.paradas_intermediarias:
            pontos.append(parada.get('endereco', parada.get('nome')))
        pontos.append(self.ponto_chegada)
        return pontos

    def get_paradas(self):
        """Retorna lista de paradas com seus detalhes"""
        return self.paradas_intermediarias

    # Métodos para mudança de status com validação
    def confirmar(self):
        """Muda status para confirmada"""
        if self.status == self.StatusChoices.PENDENTE:
            self.status = self.StatusChoices.CONFIRMADA
            self.save(update_fields=['status', 'ultima_atualizacao'])
        else:
            raise ValueError(f"Não é possível confirmar uma corrida com status {self.status}")

    def iniciar(self):
        """Muda status para em andamento"""
        if self.status == self.StatusChoices.CONFIRMADA:
            self.status = self.StatusChoices.EM_ANDAMENTO
            self.data_inicio = timezone.now()
            self.save(update_fields=['status', 'data_inicio', 'ultima_atualizacao'])
        else:
            raise ValueError(f"Não é possível iniciar uma corrida com status {self.status}")

    def concluir(self):
        """Muda status para concluída"""
        if self.status == self.StatusChoices.EM_ANDAMENTO:
            self.status = self.StatusChoices.CONCLUIDA
            self.data_conclusao = timezone.now()
            self.save(update_fields=['status', 'data_conclusao', 'ultima_atualizacao'])
        else:
            raise ValueError(f"Não é possível concluir uma corrida com status {self.status}")

    def cancelar(self, motivo=None):
        """Cancela a corrida"""
        if self.status not in [self.StatusChoices.CONCLUIDA, self.StatusChoices.CANCELADA]:
            self.status = self.StatusChoices.CANCELADA
            self.data_cancelamento = timezone.now()
            if motivo:
                self.observacao = f"Cancelada: {motivo}"
            self.save(update_fields=['status', 'data_cancelamento', 'observacao', 'ultima_atualizacao'])
        else:
            raise ValueError(f"Não é possível cancelar uma corrida com status {self.status}")


class UserToken(models.Model):
    fcm_key = models.CharField(max_length=40, primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        related_name='user_auth_token',
        on_delete=models.CASCADE,
        verbose_name="User"
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ELIAS_user_auth_token'
        verbose_name = "User Token"
        verbose_name_plural = "User Tokens"


class RefreshTokenLocal(models.Model):
    """
    Modelo para armazenar Refresh Tokens localmente.
    Integração com API externa para autenticação.
    """
    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name='refresh_token_local',
        on_delete=models.CASCADE,
        verbose_name="Usuário"
    )
    refresh_token = models.TextField(
        verbose_name="Refresh Token",
        help_text="Token de atualização fornecido pela API externa"
    )
    password_hash = models.CharField(
        max_length=255,
        verbose_name="Hash da Senha",
        help_text="Hash da senha armazenado localmente para comparação"
    )
    access_token = models.TextField(
        null=True,
        blank=True,
        verbose_name="Access Token",
        help_text="Token de acesso atual (TTL: 300s)"
    )
    access_token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Expiração do Access Token"
    )
    last_validated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última validação"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Data de criação"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Data de atualização"
    )

    class Meta:
        db_table = 'ELIAS_refresh_token_local'
        verbose_name = "Refresh Token Local"
        verbose_name_plural = "Refresh Tokens Locais"
        ordering = ['-created_at']

    def __str__(self):
        return f"RefreshToken para {self.user.login}"


class Veiculo(models.Model):
    class StatusChoices(models.TextChoices):
        DISPONIVEL = 'disponivel', 'Disponível'
        INDISPONIVEL = 'indisponivel', 'Indisponível'
        MANUTENCAO = 'manutencao', 'Em Manutenção'
    
    id_veiculo = models.AutoField(primary_key=True, db_column='id_veiculo')
    nome = models.CharField(max_length=50)
    placa = models.CharField(max_length=30, unique=True)
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.DISPONIVEL
    )

    class Meta:
        db_table = 'ELIAS_Veiculos'


class Notificacao(models.Model):
    """
    Modelo para gerenciar notificações de usuários
    Tipos: 'driver_accept', 'driver_refuse', 'ride_created', 'ride_modified', 'ride_2hours_warning'
    """
    class TipoChoices(models.TextChoices):
        DRIVER_ACCEPT = 'driver_accept', 'Motorista Aceitou'
        DRIVER_REFUSE = 'driver_refuse', 'Motorista Recusou'
        RIDE_CREATED = 'ride_created', 'Corrida Criada'
        RIDE_MODIFIED = 'ride_modified', 'Corrida Modificada'
        RIDE_2HOURS = 'ride_2hours_warning', 'Corrida em 2 Horas'
        RIDE_STARTED = 'ride_started', 'Corrida Iniciada'
        RIDE_CONCLUDED = 'ride_concluded', 'Corrida Concluída'
        RIDE_CANCELLED = 'ride_cancelled', 'Corrida Cancelada'
        ROUTE_CHANGED_DURING_RIDE = 'route_changed_during_ride', 'Rota Alterada Durante Corrida'
        RECONFIRMATION_NEEDED = 'reconfirmation_needed', 'Reconfirmação Necessária'
        NO_DRIVERS_AVAILABLE = 'no_drivers_available', 'Sem Motoristas Disponíveis'
        RIDE_TIMEOUT = 'ride_timeout', 'Timeout - Motorista Não Respondeu'
        RIDE_POSTPONED = 'ride_postponed', 'Corrida Adiada'

    id_notificacao = models.AutoField(primary_key=True, db_column='id_notificacao')
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='notificacoes',
        db_column='usuario_id',
        verbose_name="Usuário"
    )
    corrida = models.ForeignKey(
        Corridas,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notificacoes',
        db_column='corrida_id',
        verbose_name="Corrida"
    )
    titulo = models.CharField(max_length=255, db_column='titulo', verbose_name="Título")
    mensagem = models.TextField(db_column='mensagem', verbose_name="Mensagem")
    tipo = models.CharField(
        max_length=25,
        choices=TipoChoices.choices,
        default=TipoChoices.RIDE_CREATED,
        db_column='tipo'
    )
    lida = models.BooleanField(default=False, db_column='lida', verbose_name="Lida")
    oculta = models.BooleanField(default=False, db_column='oculta', verbose_name="Oculta")
    data_criacao = models.DateTimeField(auto_now_add=True, db_column='data_criacao')
    data_leitura = models.DateTimeField(null=True, blank=True, db_column='data_leitura')

    class Meta:
        db_table = 'ELIAS_Notificacoes'
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
        ordering = ['-data_criacao']
        indexes = [
            models.Index(fields=['usuario', '-data_criacao']),
            models.Index(fields=['lida']),
        ]

    def __str__(self):
        return f"{self.titulo} - {self.usuario.login}"

    def marcar_como_lida(self):
        """Marca a notificação como lida"""
        from django.utils import timezone
        self.lida = True
        self.data_leitura = timezone.now()
        self.save(update_fields=['lida', 'data_leitura'])
    
    def marcar_como_nao_lida(self):
        """Marca a notificação como não lida"""
        self.lida = False
        self.data_leitura = None
        self.save(update_fields=['lida', 'data_leitura'])
    
    def ocultar(self):
        """Oculta a notificação (soft delete)"""
        self.oculta = True
        self.save(update_fields=['oculta'])