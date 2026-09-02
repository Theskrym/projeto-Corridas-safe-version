"""
Funções helper para gerenciar fluxos de corridas
Implementa os 9 fluxos conversados: alteração de rota, cancelamento, timeout, etc.
"""

from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from .models import Corridas, Notificacao, Usuario
import logging

logger = logging.getLogger(__name__)


# ===== FLUXO 2: Alterar Rota ANTES de Iniciar (CONFIRMADA → RECONFIRMACAO_NECESSARIA) =====

@transaction.atomic
def alterar_rota_antes_iniciar(corrida_id, novo_ponto_chegada, novas_paradas=None, usuario_id=None):
    """
    Altera rota de uma corrida que ainda não iniciou.
    Se já está CONFIRMADA, muda para RECONFIRMACAO_NECESSARIA
    
    Args:
        corrida_id: ID da corrida
        novo_ponto_chegada: Novo ponto de chegada
        novas_paradas: Lista de paradas intermediárias (opcional)
        usuario_id: ID do usuário que está fazendo a alteração (para evitar auto-notificação)
    
    Returns:
        dict com status da alteração
    """
    try:
        corrida = Corridas.objects.get(id_corrida=corrida_id)
        
        # Validações
        if corrida.status == 'em_andamento':
            raise ValueError("Não é possível alterar rota de corrida em andamento")
        if corrida.status == 'concluida':
            raise ValueError("Não é possível alterar rota de corrida concluída")
        if corrida.status == 'cancelada':
            raise ValueError("Não é possível alterar rota de corrida cancelada")
        
        ponto_chegada_anterior = corrida.ponto_chegada
        
        # Se está CONFIRMADA, volta para RECONFIRMACAO_NECESSARIA
        se_estava_confirmada = corrida.status == 'confirmada'
        
        # Altera rota
        corrida.ponto_chegada = novo_ponto_chegada
        if novas_paradas:
            corrida.paradas_intermediarias = novas_paradas
        
        # Se estava confirmada, pedir reconfirmação
        if se_estava_confirmada:
            corrida.status = 'reconfirmacao_necessaria'
            motorista_anterior = corrida.motorista
            motorista_nome = motorista_anterior.nome if motorista_anterior else 'Desconhecido'
            # Não notificar se o usuário que faz a alteração é o próprio motorista
            notificar_motorista = motorista_anterior and (usuario_id is None or motorista_anterior.id_usuario != usuario_id)
        else:
            notificar_motorista = False
        
        corrida.observacao = (corrida.observacao or '') + f"\n[ALTERACAO ROTA] {ponto_chegada_anterior} → {novo_ponto_chegada}"
        corrida.save()
        
        # Log
        logger.info(f"Rota alterada: Corrida {corrida_id} - {ponto_chegada_anterior} → {novo_ponto_chegada}")
        
        return {
            'sucesso': True,
            'status': corrida.status,
            'alterado': True,
            'reconfirmacao_necessaria': se_estava_confirmada
        }
    
    except Corridas.DoesNotExist:
        return {'sucesso': False, 'erro': 'Corrida não encontrada'}
    except ValueError as e:
        return {'sucesso': False, 'erro': str(e)}


# ===== FLUXO 3: Alterar Rota DURANTE Corrida (EM_ANDAMENTO) =====

@transaction.atomic
def alterar_rota_durante_corrida(corrida_id, novo_ponto_chegada, usuario_id):
    """
    Altera rota durante execução com notificação urgente ao motorista
    
    Args:
        corrida_id: ID da corrida
        novo_ponto_chegada: Novo destino
        usuario_id: ID do usuário que faz a alteração
    
    Returns:
        dict com resultado da operação
    """
    try:
        corrida = Corridas.objects.get(id_corrida=corrida_id)
        usuario = Usuario.objects.get(id_usuario=usuario_id)
        
        if corrida.status != 'em_andamento':
            raise ValueError("Corrida não está em andamento")
        
        ponto_anterior = corrida.ponto_chegada
        
        # Validação: distância não pode aumentar mais de 50%
        # (aqui você integraria com Google Maps API para calcular)
        
        # Altera
        corrida.ponto_chegada = novo_ponto_chegada
        corrida.observacao = (corrida.observacao or '') + f"\n[ALTERACAO DURANTE CORRIDA] {ponto_anterior} → {novo_ponto_chegada}"
        corrida.ultima_atualizacao = timezone.now()
        corrida.save()
        
        # Notifica motorista com URGÊNCIA (apenas se não for o próprio motorista fazendo a alteração)
        if corrida.motorista and corrida.motorista.id_usuario != usuario_id:
            Notificacao.objects.create(
                usuario=corrida.motorista,
                corrida=corrida,
                titulo="⚠️ ROTA ALTERADA DURANTE CORRIDA",
                mensagem=f"Novo destino: {novo_ponto_chegada}. Confirme se aceita a mudança.",
                tipo=Notificacao.TipoChoices.ROUTE_CHANGED_DURING_RIDE
            )
        
        logger.info(f"Rota alterada durante corrida {corrida_id}: {ponto_anterior} → {novo_ponto_chegada}")
        
        return {
            'sucesso': True,
            'alteracao_feita': True,
            'notificacoes_enviadas': 1
        }
    
    except Corridas.DoesNotExist:
        return {'sucesso': False, 'erro': 'Corrida não encontrada'}
    except Usuario.DoesNotExist:
        return {'sucesso': False, 'erro': 'Usuário não encontrado'}
    except ValueError as e:
        return {'sucesso': False, 'erro': str(e)}


# ===== FLUXO 4: Cancelamento Durante Corrida =====

@transaction.atomic
def cancelar_corrida_em_andamento(corrida_id, quem_cancelou_id, motivo):
    """
    Cancela uma corrida que está em andamento
    
    Args:
        corrida_id: ID da corrida
        quem_cancelou_id: ID do usuário que cancela (admin ou motorista)
        motivo: Motivo do cancelamento
    
    Returns:
        dict com resultado
    """
    try:
        corrida = Corridas.objects.get(id_corrida=corrida_id)
        quem_cancelou = Usuario.objects.get(id_usuario=quem_cancelou_id)
        
        if corrida.status != 'em_andamento':
            raise ValueError(f"Corrida não está em andamento (status atual: {corrida.status})")
        
        # Calcula tempo percorrido
        tempo_percorrido = (timezone.now() - corrida.data_inicio).total_seconds() / 60  # minutos
        
        # Cancela
        corrida.status = 'cancelada'
        corrida.data_cancelamento = timezone.now()
        
        # Armazena motorista e criado_por antes de limpar para notificações
        motorista_cancelado = corrida.motorista
        criado_por_corrida = corrida.criado_por
        
        # Limpar motorista/veiculo antes de salvar para signal funcionar corretamente
        corrida.motorista = None
        corrida.veiculo = None
        
        corrida.observacao = f"""[CANCELAMENTO]
Quem: {quem_cancelou.nome}
Motivo: {motivo}
Tempo percorrido: {tempo_percorrido:.1f} minutos
Data: {corrida.data_cancelamento.strftime('%Y-%m-%d %H:%M:%S')}"""
        corrida.save()
        
        # Notificações - apenas para quem precisa
        if quem_cancelou.nivel_acesso == 3:  # Motorista cancelou
            # Notifica criador sobre cancelamento pelo motorista (apenas se for diferente do motorista)
            if criado_por_corrida and criado_por_corrida.id_usuario != quem_cancelou_id:
                Notificacao.objects.get_or_create(
                    usuario=criado_por_corrida,
                    corrida=corrida,
                    tipo=Notificacao.TipoChoices.RIDE_CANCELLED,
                    defaults={
                        'titulo': "Corrida Cancelada pelo Motorista",
                        'mensagem': f"Motivo: {motivo}",
                    }
                )
        else:  # Admin cancelou - notifica motorista (apenas se não for o próprio admin cancelando sua própria corrida)
            if motorista_cancelado and motorista_cancelado.id_usuario != quem_cancelou_id:
                Notificacao.objects.get_or_create(
                    usuario=motorista_cancelado,
                    corrida=corrida,
                    tipo=Notificacao.TipoChoices.RIDE_CANCELLED,
                    defaults={
                        'titulo': "Corrida Cancelada",
                        'mensagem': f"Motivo: {motivo}. Retorne ao ponto de início.",
                    }
                )
        
        logger.warning(f"Corrida {corrida_id} cancelada por {quem_cancelou.nome}: {motivo}")
        
        return {
            'sucesso': True,
            'cancelada': True,
            'tempo_percorrido_minutos': tempo_percorrido
        }
    
    except Corridas.DoesNotExist:
        return {'sucesso': False, 'erro': 'Corrida não encontrada'}
    except Usuario.DoesNotExist:
        return {'sucesso': False, 'erro': 'Usuário não encontrado'}
    except ValueError as e:
        return {'sucesso': False, 'erro': str(e)}


# ===== FLUXO 5: Motorista Recusa (com Reassignação Automática) =====

def encontrar_motoristas_disponiveis(data_inicio, horario_inicio, horario_retorno=None, excluir_motorista_id=None):
    """
    Encontra motoristas disponíveis para um horário
    
    Args:
        data_inicio: Data da corrida
        horario_inicio: Hora de início
        horario_retorno: Hora de retorno (opcional)
        excluir_motorista_id: ID do motorista a excluir (ex: que recusou)
    
    Returns:
        QuerySet de motoristas disponíveis
    """
    from django.db.models import Q
    from datetime import datetime, time
    
    # Motoristas ativos
    motoristas_ativos = Usuario.objects.filter(
        nivel_acesso=3,  # Motorista
        status='Ativo'
    )
    
    if excluir_motorista_id:
        motoristas_ativos = motoristas_ativos.exclude(id_usuario=excluir_motorista_id)
    
    # Sem corridas confirmadas ou em andamento nesse horário
    conflitos = Corridas.objects.filter(
        motorista__in=motoristas_ativos,
        status__in=['confirmada', 'em_andamento'],
        data_inicio=data_inicio
    )
    
    motoristas_com_conflito = [c.motorista_id for c in conflitos]
    
    return motoristas_ativos.exclude(id_usuario__in=motoristas_com_conflito)


@transaction.atomic
def motorista_recusa(corrida_id, motorista_id):
    """
    Motorista recusa corrida, sistema tenta reatribuir
    
    Args:
        corrida_id: ID da corrida
        motorista_id: ID do motorista que recusa
    
    Returns:
        dict com status e novo motorista se reassignado
    """
    try:
        corrida = Corridas.objects.get(id_corrida=corrida_id)
        motorista = Usuario.objects.get(id_usuario=motorista_id)
        
        if corrida.motorista != motorista:
            raise ValueError("Este motorista não foi designado para esta corrida")
        
        if corrida.status not in ['pendente', 'confirmada']:
            raise ValueError("Não pode recusar corrida neste status")
        
        # Marca como recusada
        corrida.status = 'recusada'
        corrida.observacao = f"Recusado por {motorista.nome}"
        motorista_anterior = corrida.motorista
        corrida.motorista = None
        corrida.veiculo = None
        corrida.save()
        
        # Notificação será enviada pelo signal quando o status muda para RECUSADA
        
        # Tenta reatribuir
        proximos_motoristas = encontrar_motoristas_disponiveis(
            corrida.data_inicio,
            corrida.horario_inicio,
            corrida.horario_retorno,
            excluir_motorista_id=motorista_id
        )
        
        if proximos_motoristas.exists():
            novo_motorista = proximos_motoristas.first()
            corrida.motorista = novo_motorista
            corrida.status = 'pendente'
            corrida.save()
            
            # Notifica novo motorista
            Notificacao.objects.create(
                usuario=novo_motorista,
                corrida=corrida,
                titulo="Nova Corrida",
                mensagem=f"Rota: {corrida.ponto_inicio} → {corrida.ponto_chegada}",
                tipo=Notificacao.TipoChoices.RIDE_CREATED
            )
            
            logger.info(f"Corrida {corrida_id} reassignada para {novo_motorista.nome}")
            
            return {
                'sucesso': True,
                'reassignado': True,
                'novo_motorista': novo_motorista.nome,
                'novo_motorista_id': novo_motorista.id_usuario
            }
        else:
            # Nenhum motorista disponível
            corrida.status = 'pendente'
            corrida.motorista = None
            corrida.save()
            
            # Notifica criador (apenas se não for o próprio motorista que recusou)
            if corrida.criado_por and corrida.criado_por.id_usuario != motorista_id:
                Notificacao.objects.create(
                    usuario=corrida.criado_por,
                    corrida=corrida,
                titulo="Sem Motorista Disponível",
                mensagem="Nenhum motorista disponível. Tente novamente depois.",
                tipo=Notificacao.TipoChoices.NO_DRIVERS_AVAILABLE
            )
            
            logger.warning(f"Corrida {corrida_id} sem motorista disponível para reassignação")
            
            return {
                'sucesso': True,
                'reassignado': False,
                'motivo': 'Sem motoristas disponíveis'
            }
    
    except Corridas.DoesNotExist:
        return {'sucesso': False, 'erro': 'Corrida não encontrada'}
    except Usuario.DoesNotExist:
        return {'sucesso': False, 'erro': 'Motorista não encontrado'}
    except ValueError as e:
        return {'sucesso': False, 'erro': str(e)}


# ===== FLUXO 6: Timeout - Motorista não Responde =====

def processar_corridas_timeout(minutos_timeout=30):
    """
    Processa corridas que ficaram PENDENTES por mais de X minutos
    Cancela automaticamente se nenhum motorista aceitar
    
    Args:
        minutos_timeout: Minutos para considerar timeout (default 30)
    
    Returns:
        dict com estatísticas
    """
    timeout_limit = timezone.now() - timedelta(minutes=minutos_timeout)
    
    corridas_timeout = Corridas.objects.filter(
        status='pendente',
        data_solicitacao__lt=timeout_limit,
        motorista__isnull=False
    )
    
    stats = {
        'processadas': 0,
        'reassignadas': 0,
        'canceladas': 0
    }
    
    for corrida in corridas_timeout:
        corrida.observacao = (corrida.observacao or '') + f"\n[TIMEOUT] Motorista não respondeu em {minutos_timeout} min"
        motorista_anterior = corrida.motorista
        corrida.motorista = None
        corrida.veiculo = None
        corrida.save()
        
        # Tenta reatribuir
        novo_motorista = encontrar_motoristas_disponiveis(
            corrida.data_inicio,
            corrida.horario_inicio,
            corrida.horario_retorno,
            excluir_motorista_id=motorista_anterior.id_usuario
        ).first()
        
        if novo_motorista:
            corrida.motorista = novo_motorista
            corrida.save()
            
            Notificacao.objects.create(
                usuario=novo_motorista,
                corrida=corrida,
                titulo="Nova Corrida (Prioritária)",
                mensagem=f"Corrida prioritária: {corrida.ponto_inicio} → {corrida.ponto_chegada}",
                tipo=Notificacao.TipoChoices.RIDE_CREATED
            )
            
            stats['reassignadas'] += 1
        else:
            # Cancela por timeout
            corrida.status = 'cancelada'
            corrida.data_cancelamento = timezone.now()
            corrida.save()
            
            # Notifica criador do cancelamento por timeout (apenas se criado_por não for nulo)
            if corrida.criado_por:
                Notificacao.objects.get_or_create(
                    usuario=corrida.criado_por,
                    corrida=corrida,
                    tipo=Notificacao.TipoChoices.RIDE_TIMEOUT,
                    defaults={
                        'titulo': "Timeout - Corrida Cancelada",
                        'mensagem': "Corrida foi cancelada por timeout. Tente novamente.",
                    }
                )
            
            stats['canceladas'] += 1
        
        stats['processadas'] += 1
    
    logger.info(f"Timeout processado: {stats}")
    return stats


# ===== FLUXO 7: Validação de Conflito de Veículo =====

def validar_disponibilidade_veiculo(veiculo_id, data_inicio, data_fim=None, excluir_corrida_id=None):
    """
    Verifica se um veículo está disponível em um período
    
    Args:
        veiculo_id: ID do veículo
        data_inicio: Início do período (datetime)
        data_fim: Fim do período (datetime, opcional)
        excluir_corrida_id: ID da corrida a excluir (para edições)
    
    Returns:
        dict com disponibilidade e detalhes
    """
    conflitos = Corridas.objects.filter(
        veiculo_id=veiculo_id,
        status__in=['confirmada', 'em_andamento'],
    ).exclude(
        id_corrida=excluir_corrida_id
    )
    
    if not data_fim:
        data_fim = data_inicio + timedelta(hours=3)
    
    for corrida in conflitos:
        corrida_inicio = corrida.data_inicio
        corrida_fim = corrida.data_conclusao or (corrida.data_inicio + timedelta(hours=3))
        
        # Se períodos se sobrepõem
        if not (data_fim <= corrida_inicio or data_inicio >= corrida_fim):
            return {
                'disponivel': False,
                'conflito_com_corrida_id': corrida.id_corrida,
                'periodo_conflitante': f"{corrida_inicio} a {corrida_fim}",
                'mensagem': f'Veículo ocupado em outra corrida ({corrida.id_corrida})'
            }
    
    return {'disponivel': True}


# ===== FLUXO 8: Adiamento de Corrida =====

@transaction.atomic
def adiar_corrida(corrida_id, nova_data, nova_hora, usuario_id=None):
    """
    Adia uma corrida para nova data/hora
    Se já estava confirmada, volta para RECONFIRMACAO_NECESSARIA
    
    Args:
        corrida_id: ID da corrida
        nova_data: Nova data (date)
        nova_hora: Nova hora (time)
        usuario_id: ID do usuário que está fazendo o adiamento (para evitar auto-notificação)
    
    Returns:
        dict com resultado
    """
    from datetime import datetime as dt
    
    try:
        corrida = Corridas.objects.get(id_corrida=corrida_id)
        
        if corrida.status == 'em_andamento':
            raise ValueError("Não pode adiar corrida em andamento")
        if corrida.status in ['concluida', 'cancelada']:
            raise ValueError(f"Não pode adiar corrida {corrida.status}")
        
        # Valida nova data
        if nova_data < timezone.now().date():
            raise ValueError("Data não pode ser no passado")
        
        data_anterior = corrida.data_inicio
        se_tinha_confirmacao = corrida.status == 'confirmada' and corrida.motorista
        
        # Muda data
        corrida.data_inicio = dt.combine(nova_data, nova_hora)
        
        if se_tinha_confirmacao:
            # Guardar referência ao motorista ANTES de limpar
            motorista_anterior = corrida.motorista
            corrida.status = 'reconfirmacao_necessaria'
            corrida.motorista = None
            corrida.veiculo = None
            # Não notificar se o usuário que adia é o próprio motorista
            notificar_motorista = usuario_id is None or motorista_anterior.id_usuario != usuario_id
        else:
            motorista_anterior = None
            notificar_motorista = False
        
        corrida.observacao = (corrida.observacao or '') + f"\n[ADIAMENTO] {data_anterior} → {nova_data} às {nova_hora}"
        corrida.save()
        
        # Notificar motorista se estava confirmada e não é o mesmo usuário fazendo a alteração
        if se_tinha_confirmacao and notificar_motorista:
            Notificacao.objects.create(
                usuario=motorista_anterior,
                corrida=corrida,
                titulo="Corrida Adiada",
                mensagem=f"Sua corrida foi adiada para {nova_data} às {nova_hora}. Reconfirme.",
                tipo=Notificacao.TipoChoices.RIDE_POSTPONED
            )
        
        logger.info(f"Corrida {corrida_id} adiada: {data_anterior} → {nova_data}")
        
        return {
            'sucesso': True,
            'adiada': True,
            'status_novo': corrida.status
        }
    
    except Corridas.DoesNotExist:
        return {'sucesso': False, 'erro': 'Corrida não encontrada'}
    except ValueError as e:
        return {'sucesso': False, 'erro': str(e)}
