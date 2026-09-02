from django.contrib import admin
from .models import Usuario, Veiculo, RefreshTokenLocal, UserToken, Corridas, Notificacao

@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('login', 'nome', 'email', 'nivel_acesso', 'is_active', 'data_criacao')
    list_filter = ('nivel_acesso', 'is_active', 'data_criacao')
    search_fields = ('login', 'nome', 'email')
    ordering = ('-data_criacao',)
    readonly_fields = ('id_usuario', 'data_criacao', 'last_login')
    
    fieldsets = (
        ('Informações Pessoais', {
            'fields': ('id_usuario', 'login', 'nome', 'email', 'telefone', 'matricula')
        }),
        ('Segurança', {
            'fields': ('password',),
            'classes': ('collapse',)
        }),
        ('Acesso e Status', {
            'fields': ('nivel_acesso', 'is_active', 'fcm_token')
        }),
        ('Datas', {
            'fields': ('data_criacao', 'last_login'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Veiculo)
class VeiculoAdmin(admin.ModelAdmin):
    list_display = ('id_veiculo', 'nome', 'placa', 'status')
    list_filter = ('status',)
    search_fields = ('placa', 'nome')
    ordering = ('placa',)


@admin.register(Corridas)
class CorridasAdmin(admin.ModelAdmin):
    list_display = ('data_solicitacao', 'ponto_inicio', 'solicitante', 'destinos', 'servico', 'veiculo', 'horario_inicio', 'motorista', 'horario_retorno', 'status')
    list_filter = ('status', 'data_solicitacao', 'motorista', 'veiculo')
    search_fields = ('solicitante', 'destinos', 'servico', 'ponto_inicio', 'ponto_chegada')
    ordering = ('-data_solicitacao',)
    readonly_fields = ('id_corrida', 'data_solicitacao', 'ultima_atualizacao')


@admin.register(Notificacao)
class NotificacaoAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'titulo', 'tipo', 'lida', 'data_criacao')
    list_filter = ('tipo', 'lida', 'data_criacao')
    search_fields = ('usuario__login', 'titulo', 'mensagem')
    ordering = ('-data_criacao',)
    readonly_fields = ('id_notificacao', 'data_criacao')


@admin.register(RefreshTokenLocal)
class RefreshTokenLocalAdmin(admin.ModelAdmin):
    list_display = ('user', 'access_token_expires_at', 'created_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__login', 'user__nome')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(UserToken)
class UserTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'created')
    list_filter = ('created',)
    search_fields = ('user__login',)
    ordering = ('-created',)
    readonly_fields = ('fcm_key', 'created')

