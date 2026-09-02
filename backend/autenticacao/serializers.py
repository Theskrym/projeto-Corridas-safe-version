from rest_framework import serializers
from .models import Usuario, Veiculo, Corridas, Notificacao

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nome', 'login', 'nivel_acesso']

class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        login = data.get('login')
        password = data.get('password')

        if not login or not password:
            raise serializers.ValidationError("Login e senha são obrigatórios")
        
        try:
            user = Usuario.objects.get(login=login)
            if not user.check_password(password):
                raise serializers.ValidationError("Credenciais inválidas")
            return user
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Usuário não encontrado")
class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nome', 'telefone', 'matricula', 'email', 'login', 'nivel_acesso']
        read_only_fields = ['id_usuario', 'email', 'login', 'matricula', 'nivel_acesso']  # Campos não editáveis
        
         
class ChangePasswordSerializer(serializers.Serializer):
    senhaAtual = serializers.CharField(required=True, write_only=True)
    novaSenha = serializers.CharField(required=True, min_length=6, write_only=True)
    confirmarSenha = serializers.CharField(required=True, write_only=True)

    def validate_senhaAtual(self, value):
        """Validar que a senha atual não é vazia"""
        if not value or not value.strip():
            raise serializers.ValidationError("Senha atual é obrigatória")
        return value
    
    def validate_novaSenha(self, value):
        """Validar que a nova senha não é vazia"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nova senha é obrigatória")
        if len(value) < 6:
            raise serializers.ValidationError("Nova senha deve ter pelo menos 6 caracteres")
        return value

    def validate(self, data):
        """Validar que as novas senhas coincidem"""
        if data.get('novaSenha') != data.get('confirmarSenha'):
            raise serializers.ValidationError({
                'confirmarSenha': 'As novas senhas não coincidem'
            })
        return data

class VeiculoSerializer(serializers.ModelSerializer):
    numero_corridas = serializers.SerializerMethodField()
    
    class Meta:
        model = Veiculo
        fields = ['id_veiculo', 'nome', 'placa', 'status', 'numero_corridas']
        read_only_fields = ['id_veiculo', 'numero_corridas']
    
    def get_numero_corridas(self, obj):
        """Contar o número de corridas do veículo"""
        return obj.corridas.count()
    
    def validate_status(self, value):
        """Validar que o status seja um valor válido"""
        valid_statuses = [choice[0] for choice in Veiculo.StatusChoices.choices]
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Status inválido. Deve ser um dos: {', '.join(valid_statuses)}"
            )
        return value

class MotoristaSerializer(serializers.ModelSerializer):
    numero_corridas = serializers.SerializerMethodField()
    
    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nome', 'email', 'telefone', 'is_active', 'matricula', 'numero_corridas', 'nivel_acesso']
        read_only_fields = ['id_usuario', 'numero_corridas']
    
    def get_numero_corridas(self, obj):
        """Contar o número de corridas do motorista"""
        return obj.corridas_motorista.count()
    
    def validate_is_active(self, value):
        """Converter múltiplos formatos para booleano"""
        # Se for boolean, retorna como está
        if isinstance(value, bool):
            return value
        
        # Se for número
        if isinstance(value, int):
            return bool(value)
        
        # Se for string
        if isinstance(value, str):
            value_lower = value.lower().strip()
            if value_lower in ['ativo', 'true', '1', 'active', 'yes']:
                return True
            elif value_lower in ['inativo', 'false', '0', 'inactive', 'no']:
                return False
        
        # Se chegou aqui, é inválido
        raise serializers.ValidationError(
            "is_active inválido. Aceita: 'ativo', 'inativo', true, false, 0, 1"
        )
        


class CorridaSerializer(serializers.ModelSerializer):
    veiculo_nome = serializers.CharField(source='veiculo.nome', read_only=True)
    veiculo_placa = serializers.CharField(source='veiculo.placa', read_only=True)
    motorista_nome = serializers.CharField(source='motorista.nome', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True)
    
    class Meta:
        model = Corridas
        fields = [
            'id_corrida', 'ponto_inicio', 'ponto_chegada', 'data_inicio',
            'solicitante', 'destinos', 'servico', 'observacao',
            'horario_inicio', 'horario_retorno', 'paradas_intermediarias',
            'motorista', 'veiculo', 'status',
            'veiculo_nome', 'veiculo_placa', 'motorista_nome', 'criado_por_nome',
            'data_solicitacao', 'ultima_atualizacao'
        ]
        read_only_fields = [
            'id_corrida', 'data_solicitacao', 'ultima_atualizacao',
            'veiculo_nome', 'veiculo_placa', 'motorista_nome', 'criado_por_nome'
        ]


class NotificacaoSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='usuario.nome', read_only=True)
    corrida_id_corrida = serializers.IntegerField(source='corrida.id_corrida', read_only=True, allow_null=True)
    
    class Meta:
        model = Notificacao
        fields = ['id_notificacao', 'usuario', 'usuario_nome', 'corrida', 'corrida_id_corrida', 'titulo', 'mensagem', 'tipo', 'lida', 'data_criacao', 'data_leitura']
        read_only_fields = ['id_notificacao', 'usuario', 'data_criacao', 'data_leitura']