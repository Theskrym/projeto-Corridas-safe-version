from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth.models import Group
from .models import Usuario, Corridas, Notificacao

@receiver(post_save, sender=Usuario)
def assign_grupo_to_usuario(sender, instance, created, **kwargs):
    """
    Quando um usuário é criado, define o nivel_acesso baseado no login
    ou mantém o que já foi definido
    """
    # Se for um novo usuário, define o nivel_acesso automaticamente se não foi definido
    if created and instance.nivel_acesso is None:
        login_lower = instance.login.lower()
        
        if 'admin' in login_lower:
            instance.nivel_acesso = 1
        elif 'gerente' in login_lower or 'gestor' in login_lower:
            instance.nivel_acesso = 2
        elif 'motorista' in login_lower:
            instance.nivel_acesso = 3
        elif 'operador' in login_lower:
            instance.nivel_acesso = 4
        else:
            instance.nivel_acesso = 3  # Default: motorista
        
        # Salva apenas o campo nivel_acesso
        instance.save(update_fields=['nivel_acesso'])

# Track previous status to detect changes
_corrida_status_cache = {}

@receiver(pre_save, sender=Corridas)
def track_corrida_status_before_save(sender, instance, **kwargs):
    """Track the status before it changes"""
    try:
        old_instance = Corridas.objects.get(pk=instance.pk)
        _corrida_status_cache[instance.pk] = old_instance.status
    except Corridas.DoesNotExist:
        _corrida_status_cache[instance.pk] = None


@receiver(post_save, sender=Corridas)
def handle_corrida_status_change(sender, instance, created, **kwargs):
    """
    Criar notificações quando:
    1. Motorista recusa corrida (status=recusada) → notifica criador
    2. Motorista aceita corrida (status=confirmada) → notifica admin
    3. Corrida criada → notifica motorista (se atribuído)
    4. Corrida modificada → notifica motorista (se atribuído)
    """
    if created:
        # Nova corrida foi criada → notificar motorista se atribuído
        if instance.motorista and instance.criado_por:
            Notificacao.objects.create(
                usuario=instance.motorista,
                corrida=instance,
                titulo='Nova Corrida Atribuída',
                mensagem=f'Uma nova corrida foi criada para você. Saída: {instance.ponto_inicio} → {instance.ponto_chegada}',
                tipo=Notificacao.TipoChoices.RIDE_CREATED
            )
    else:
        # Corrida foi modificada
        old_status = _corrida_status_cache.get(instance.pk)
        new_status = instance.status
        
        # IMPORTANTE: Verificar restauração de cancelada PRIMEIRO para evitar conflito com outras transições
        # Se status mudou DE CANCELADA para qualquer outro status → notificar motorista
        if old_status == Corridas.StatusChoices.CANCELADA and new_status != Corridas.StatusChoices.CANCELADA:
            # Corrida foi restaurada de cancelada para outro status (ex: pendente, confirmada, etc)
            # Notificar motorista sobre a restauração
            if instance.motorista and instance.criado_por and instance.motorista.id_usuario != instance.criado_por.id_usuario:
                mensagem_status = {
                    Corridas.StatusChoices.PENDENTE: f'Sua corrida foi restaurada. Rota: {instance.ponto_inicio} → {instance.ponto_chegada}',
                    Corridas.StatusChoices.CONFIRMADA: f'Sua corrida foi confirmada novamente. Rota: {instance.ponto_inicio} → {instance.ponto_chegada}',
                    Corridas.StatusChoices.RECONFIRMACAO_NECESSARIA: f'Sua corrida requer reconfirmação. Rota: {instance.ponto_inicio} → {instance.ponto_chegada}',
                }
                mensagem = mensagem_status.get(new_status, f'Sua corrida foi atualizada para status: {new_status}')
                
                Notificacao.objects.create(
                    usuario=instance.motorista,
                    corrida=instance,
                    titulo='Corrida Restaurada',
                    mensagem=mensagem,
                    tipo=Notificacao.TipoChoices.RIDE_CREATED
                )
        
        # Se status mudou para RECUSADA → notificar criador (apenas se for diferente do motorista que recusou)
        elif old_status != new_status and new_status == Corridas.StatusChoices.RECUSADA:
            if instance.criado_por and instance.motorista and instance.criado_por.id_usuario != instance.motorista.id_usuario:
                Notificacao.objects.create(
                    usuario=instance.criado_por,
                    corrida=instance,
                    titulo='Corrida Recusada pelo Motorista',
                    mensagem=f'{instance.motorista.nome} recusou a corrida ({instance.ponto_inicio} → {instance.ponto_chegada}). Selecione outro motorista.',
                    tipo=Notificacao.TipoChoices.DRIVER_REFUSE
                )
        
        # Se status mudou para CONFIRMADA → notificar criador (apenas se for diferente do motorista que confirmou)
        elif old_status != new_status and new_status == Corridas.StatusChoices.CONFIRMADA:
            if instance.criado_por and instance.motorista and instance.criado_por.id_usuario != instance.motorista.id_usuario:
                Notificacao.objects.create(
                    usuario=instance.criado_por,
                    corrida=instance,
                    titulo='Corrida Aceita pelo Motorista',
                    mensagem=f'{instance.motorista.nome} aceitou a corrida ({instance.ponto_inicio} → {instance.ponto_chegada}).',
                    tipo=Notificacao.TipoChoices.DRIVER_ACCEPT
                )
        
        # Se status mudou para CONCLUIDA → notificar criador (apenas se for diferente do motorista que concluiu)
        elif old_status != new_status and new_status == Corridas.StatusChoices.CONCLUIDA:
            if instance.criado_por and instance.motorista and instance.criado_por.id_usuario != instance.motorista.id_usuario:
                Notificacao.objects.create(
                    usuario=instance.criado_por,
                    corrida=instance,
                    titulo='Corrida Concluída',
                    mensagem=f'{instance.motorista.nome} concluiu a corrida ({instance.ponto_inicio} → {instance.ponto_chegada}).',
                    tipo=Notificacao.TipoChoices.RIDE_CONCLUDED
                )
        
        # Se status mudou para RECONFIRMACAO_NECESSARIA → notificar apenas motorista (e que não é nulo)
        elif old_status != new_status and new_status == Corridas.StatusChoices.RECONFIRMACAO_NECESSARIA:
            if instance.motorista and instance.criado_por and instance.motorista.id_usuario != instance.criado_por.id_usuario:
                Notificacao.objects.create(
                    usuario=instance.motorista,
                    corrida=instance,
                    titulo='Rota Alterada - Reconfirmação Necessária',
                    mensagem=f'A rota da corrida foi alterada. Por favor, reconfirme a nova rota.',
                    tipo=Notificacao.TipoChoices.RECONFIRMATION_NEEDED
                )
        
        # Se status mudou para CANCELADA → notificações tratadas nas funções de cancelamento
        # Cada função (cancelar_corrida_em_andamento, processar_corridas_timeout) cuida das notificações
        
        # Se status mudou para EM_ANDAMENTO (primeira vez) → notificar admin
        elif old_status != new_status and new_status == Corridas.StatusChoices.EM_ANDAMENTO and old_status != Corridas.StatusChoices.CANCELADA:
            if instance.criado_por and instance.motorista:
                Notificacao.objects.create(
                    usuario=instance.criado_por,
                    corrida=instance,
                    titulo='Corrida Iniciada',
                    mensagem=f'{instance.motorista.nome} iniciou a corrida ({instance.ponto_inicio} → {instance.ponto_chegada}).',
                    tipo=Notificacao.TipoChoices.RIDE_STARTED
                )
        
        # Clean up cache
        if instance.pk in _corrida_status_cache:
            del _corrida_status_cache[instance.pk]
