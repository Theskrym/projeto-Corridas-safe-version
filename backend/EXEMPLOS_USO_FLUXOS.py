"""
EXEMPLOS DE USO - Sistema de Corridas com Novos Fluxos

Este arquivo mostra como usar as funções helper para implementar
os 9 fluxos conversados.
"""

from autenticacao.corrida_helpers import (
    alterar_rota_antes_iniciar,
    alterar_rota_durante_corrida,
    cancelar_corrida_em_andamento,
    motorista_recusa,
    processar_corridas_timeout,
    validar_disponibilidade_veiculo,
    adiar_corrida
)
from autenticacao.models import Corridas, Usuario
from datetime import date, time


# ========== EXEMPLO 1: FLUXO PERFEITO ==========
"""
Admin cria corrida → Motorista aceita → Inicia → Conclui
(Não precisa de funções helper, fluxo é automático via signals)
"""

# 1. Admin cria corrida
corrida = Corridas.objects.create(
    ponto_inicio="Reitoria - CESMAC",
    ponto_chegada="Câmara Municipal",
    motorista_id=15,  # Atribui motorista
    criado_por_id=2,  # Admin
    status=Corridas.StatusChoices.PENDENTE,
    data_inicio=date(2025, 5, 14)
)
# → Signal cria Notificacao com tipo=RIDE_CREATED para motorista

# 2. Motorista aceita (frontend chama endpoint que faz):
corrida.status = Corridas.StatusChoices.CONFIRMADA
corrida.save()
# → Signal cria Notificacao com tipo=DRIVER_ACCEPT para admin

# 3. Motorista inicia (frontend chama endpoint que faz):
corrida.status = Corridas.StatusChoices.EM_ANDAMENTO
corrida.save()
# → Signal cria Notificacao com tipo=RIDE_STARTED para admin

# 4. Motorista conclui (frontend chama endpoint que faz):
corrida.status = Corridas.StatusChoices.CONCLUIDA
corrida.data_conclusao = timezone.now()
corrida.save()
# → Signal cria Notificacao com tipo=RIDE_CONCLUDED para admin


# ========== EXEMPLO 2: FLUXO COM ALTERAÇÃO DE ROTA ANTES ==========
"""
Admin cria → Motorista confirma → Admin altera rota → 
Motorista vê RECONFIRMACAO_NECESSARIA
"""

# Corrida já está em CONFIRMADA
corrida = Corridas.objects.get(id_corrida=42)

# Admin altera rota ANTES de motorista iniciar
resultado = alterar_rota_antes_iniciar(
    corrida_id=42,
    novo_ponto_chegada="Prefeitura Municipal",
    novas_paradas=[
        {"nome": "Banco Central", "endereco": "Av. Centro", "ordem": 0}
    ]
)
print(resultado)
# Output: {'sucesso': True, 'status': 'reconfirmacao_necessaria', 'alterado': True, 'reconfirmacao_necessaria': True}

# Motorista recebe notificacao RECONFIRMATION_NEEDED
# Motorista vê corrida com status "Reconfirmação Necessária" (amarelo com letra preta)
# Motorista clica "Reconfirmar"

# Motorista reconfirma (frontend faz):
corrida.status = Corridas.StatusChoices.CONFIRMADA
corrida.save()
# → Automático, volta para CONFIRMADA


# ========== EXEMPLO 3: FLUXO COM ALTERAÇÃO DURANTE CORRIDA ==========
"""
Motorista está EM_ANDAMENTO → Admin altera destino →
Motorista recebe notificação urgente
"""

# Corrida está EM_ANDAMENTO
corrida = Corridas.objects.get(id_corrida=42)

# Admin altera rota (mantém status EM_ANDAMENTO, só muda ponto_chegada)
resultado = alterar_rota_durante_corrida(
    corrida_id=42,
    novo_ponto_chegada="Aeroporto de Maceió",
    admin_usuario_id=2  # ID do admin
)
print(resultado)
# Output: {'sucesso': True, 'alteracao_feita': True, 'notificacoes_enviadas': 2}

# Motorista recebe: "⚠️ ROTA ALTERADA DURANTE CORRIDA - Novo destino: Aeroporto..."
# Admin recebe: "Rota alterada - Aguardando confirmação"


# ========== EXEMPLO 4: CANCELAMENTO DURANTE CORRIDA ==========
"""
Motorista em EM_ANDAMENTO → Admin cancela → Motorista notificado
"""

# Versão 1: Admin cancela
resultado = cancelar_corrida_em_andamento(
    corrida_id=42,
    quem_cancelou_id=2,  # Admin
    motivo="Solicitante cancelou"
)
print(resultado)
# Output: {'sucesso': True, 'cancelada': True, 'tempo_percorrido_minutos': 23.5}

# Motorista recebe: "Corrida Cancelada - Motivo: Solicitante cancelou. Retorne ao ponto de início"

# Versão 2: Motorista cancela
resultado = cancelar_corrida_em_andamento(
    corrida_id=42,
    quem_cancelou_id=15,  # Motorista
    motivo="Pneu furado"
)
print(resultado)
# Admin recebe: "Corrida Cancelada pelo Motorista - Motivo: Pneu furado"


# ========== EXEMPLO 5: MOTORISTA RECUSA ==========
"""
Admin atribui → Motorista recusa → Sistema tenta reatribuir
"""

# Corrida em CONFIRMADA
corrida = Corridas.objects.get(id_corrida=42)

# Motorista recusa
resultado = motorista_recusa(
    corrida_id=42,
    motorista_id=15
)
print(resultado)

if resultado['reassignado']:
    print(f"Corrida reassignada para: {resultado['novo_motorista']}")
    # Output: 'Corrida reassignada para: Maria Silva'
else:
    print(f"Falha na reassignação: {resultado['motivo']}")
    # Output: 'Falha na reassignação: Sem motoristas disponíveis'


# ========== EXEMPLO 6: TIMEOUT - MOTORISTA NÃO RESPONDE ==========
"""
Task que roda a cada 5 minutos para processar timeouts
"""

# No seu tasks.py (Celery)
from celery import shared_task

@shared_task
def verificar_corridas_timeout():
    """Executa a cada 5 minutos"""
    stats = processar_corridas_timeout(minutos_timeout=30)
    print(f"Timeout: {stats}")
    # Output: Timeout: {'processadas': 2, 'reassignadas': 1, 'canceladas': 1}

# No seu settings.py
CELERY_BEAT_SCHEDULE = {
    'verificar-corridas-timeout': {
        'task': 'autenticacao.tasks.verificar_corridas_timeout',
        'schedule': crontab(minute='*/5'),  # A cada 5 min
    },
}


# ========== EXEMPLO 7: VALIDAÇÃO DE CONFLITO DE VEÍCULO ==========
"""
Antes de criar/editar corrida, valida se veículo está disponível
"""

# Admin tenta criar corrida para Van-01
from datetime import datetime

validacao = validar_disponibilidade_veiculo(
    veiculo_id=7,
    data_inicio=datetime(2025, 5, 14, 14, 0),
    data_fim=datetime(2025, 5, 14, 15, 0)
)

if validacao['disponivel']:
    # Criar corrida normalmente
    corrida = Corridas.objects.create(
        ponto_inicio="Reitoria",
        ponto_chegada="Câmara",
        veiculo_id=7,
        motorista_id=15,
        criado_por_id=2,
        status=Corridas.StatusChoices.PENDENTE,
        data_inicio=date(2025, 5, 14)
    )
else:
    # Erro: veículo não disponível
    print(f"Erro: {validacao['mensagem']}")
    # Output: Erro: Veículo ocupado em outra corrida (41)


# ========== EXEMPLO 8: ADIAMENTO DE CORRIDA ==========
"""
Admin adia corrida para novo dia/hora
Se estava CONFIRMADA, volta para RECONFIRMACAO_NECESSARIA
"""

# Corrida em CONFIRMADA
corrida = Corridas.objects.get(id_corrida=42)

# Admin adia
resultado = adiar_corrida(
    corrida_id=42,
    nova_data=date(2025, 5, 15),  # Próximo dia
    nova_hora=time(10, 0)  # 10:00 da manhã
)

if resultado['sucesso']:
    print(f"Status novo: {resultado['status_novo']}")
    # Output: Status novo: reconfirmacao_necessaria
    
    # Motorista recebe: "Sua corrida foi adiada para 2025-05-15 às 10:00. Reconfirme."
    # Motorista vê corrida em "Reconfirmação Necessária" (amarela)


# ========== EXEMPLO 9: MAPEAMENTO DE STATUS COM CORES ==========
"""
Frontend usa TagStatus para mostrar status com cores corretas
"""

# No React:
import TagStatus from '../components/common/TagStatus';

// Status PENDENTE → Amarelo com letra PRETA
<TagStatus status="pendente" entityType="corrida" />

// Status CONFIRMADA → Verde/Azul
<TagStatus status="confirmada" entityType="corrida" />

// Status RECONFIRMACAO_NECESSARIA → Amarelo com letra PRETA (igual pendente)
<TagStatus status="reconfirmacao_necessaria" entityType="corrida" />

// Status EM_ANDAMENTO → Vermelho/Laranja
<TagStatus status="em_andamento" entityType="corrida" />

// Status CONCLUIDA → Verde
<TagStatus status="concluida" entityType="corrida" />

// Status CANCELADA → Vermelho
<TagStatus status="cancelada" entityType="corrida" />


# ========== FLUXO COMPLETO: Simulação End-to-End ==========
"""
Simula toda uma corrida com múltiplos eventos
"""

# 1. CRIAÇÃO
print("1. Criando corrida...")
corrida = Corridas.objects.create(
    ponto_inicio="Reitoria - CESMAC",
    ponto_chegada="Câmara Municipal",
    motorista_id=15,
    criado_por_id=2,
    status=Corridas.StatusChoices.PENDENTE,
    data_inicio=date(2025, 5, 14),
    horario_inicio=time(14, 0),
    horario_retorno=time(15, 0)
)
print(f"✓ Corrida criada: {corrida.id_corrida}")
print(f"✓ Motorista notificado com RIDE_CREATED")

# 2. CONFIRMAÇÃO
print("\n2. Motorista aceita...")
corrida.status = Corridas.StatusChoices.CONFIRMADA
corrida.save()
print(f"✓ Status: CONFIRMADA")
print(f"✓ Admin notificado com DRIVER_ACCEPT")

# 3. ALTERAÇÃO DE ROTA (motorista reconfirma)
print("\n3. Admin altera rota...")
resultado = alterar_rota_antes_iniciar(
    corrida_id=corrida.id_corrida,
    novo_ponto_chegada="Prefeitura Municipal"
)
print(f"✓ Status: {resultado['status']}")
print(f"✓ Motorista notificado para RECONFIRMAR")

corrida.refresh_from_db()
corrida.status = Corridas.StatusChoices.CONFIRMADA
corrida.save()
print(f"✓ Motorista reconfirmou, voltou para: CONFIRMADA")

# 4. INÍCIO
print("\n4. Motorista inicia corrida...")
corrida.status = Corridas.StatusChoices.EM_ANDAMENTO
corrida.save()
print(f"✓ Status: EM_ANDAMENTO")
print(f"✓ Admin notificado com RIDE_STARTED")

# 5. CONCLUSÃO
print("\n5. Motorista conclui...")
corrida.status = Corridas.StatusChoices.CONCLUIDA
corrida.data_conclusao = timezone.now()
corrida.save()
print(f"✓ Status: CONCLUIDA")
print(f"✓ Admin notificado com RIDE_CONCLUDED")

# 6. CONSULTAR NOTIFICAÇÕES GERADAS
print("\n6. Notificações geradas:")
notificacoes = corrida.notificacoes.all().order_by('data_criacao')
for notif in notificacoes:
    print(f"  - {notif.tipo}: {notif.titulo} → {notif.usuario.nome}")
