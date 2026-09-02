# Sistema de Corridas E.L.I.A.S - Documentação de Fluxos

## ✅ O que foi implementado

### 1. **Novo Status: RECONFIRMACAO_NECESSARIA**
- **Cor**: Amarelo (`#F8C400`)
- **Letra**: Preta (`#000000`)
- **Quando usar**: Quando admin altera rota e motorista já tinha confirmado
- **DB**: Campo `status` em `Corridas` agora aceita este valor

### 2. **Novos Tipos de Notificação**
```python
RIDE_STARTED = 'ride_started'                           # Corrida iniciada
RIDE_CONCLUDED = 'ride_concluded'                       # Corrida concluída
RIDE_CANCELLED = 'ride_cancelled'                       # Corrida cancelada
ROUTE_CHANGED_DURING_RIDE = 'route_changed_during_ride' # Rota alterada durante corrida
RECONFIRMATION_NEEDED = 'reconfirmation_needed'         # Reconfirmação necessária
NO_DRIVERS_AVAILABLE = 'no_drivers_available'           # Sem motoristas disponíveis
RIDE_TIMEOUT = 'ride_timeout'                           # Timeout - motorista não respondeu
RIDE_POSTPONED = 'ride_postponed'                       # Corrida adiada
```

### 3. **Signals Automáticos**
Quando status muda, notificações são criadas automaticamente:
- `PENDENTE → CONFIRMADA` → Notifica admin com `DRIVER_ACCEPT`
- `CONFIRMADA → RECONFIRMACAO_NECESSARIA` → Notifica motorista para reconfirmar
- `CONFIRMADA → EM_ANDAMENTO` → Notifica admin com `RIDE_STARTED`
- `EM_ANDAMENTO → CONCLUIDA` → Notifica admin com `RIDE_CONCLUDED`
- `* → CANCELADA` → Notifica ambos com `RIDE_CANCELLED`

### 4. **Funções Helper (novo arquivo: `corrida_helpers.py`)**

#### Fluxo 2: Alterar Rota ANTES de Iniciar
```python
from autenticacao.corrida_helpers import alterar_rota_antes_iniciar

resultado = alterar_rota_antes_iniciar(
    corrida_id=42,
    novo_ponto_chegada="Prefeitura Municipal",
    novas_paradas=[{"nome": "Banco", "endereco": "Av X", "ordem": 0}]
)
```

#### Fluxo 3: Alterar Rota DURANTE Corrida
```python
from autenticacao.corrida_helpers import alterar_rota_durante_corrida

resultado = alterar_rota_durante_corrida(
    corrida_id=42,
    novo_ponto_chegada="Aeroporto",
    admin_usuario_id=2
)
# Motorista recebe notificação urgente: "⚠️ ROTA ALTERADA DURANTE CORRIDA"
```

#### Fluxo 4: Cancelamento Durante Corrida
```python
from autenticacao.corrida_helpers import cancelar_corrida_em_andamento

resultado = cancelar_corrida_em_andamento(
    corrida_id=42,
    quem_cancelou_id=2,  # Admin ou Motorista
    motivo="Solicitante cancelou"
)
```

#### Fluxo 5: Motorista Recusa (com Reassignação)
```python
from autenticacao.corrida_helpers import motorista_recusa

resultado = motorista_recusa(corrida_id=42, motorista_id=15)
# Se reassignado: {'sucesso': True, 'reassignado': True, 'novo_motorista': 'João'}
```

#### Fluxo 6: Timeout Automático
```python
from autenticacao.corrida_helpers import processar_corridas_timeout

# Task que deve rodar a cada 5 minutos (Celery)
@shared_task
def verificar_corridas_timeout():
    stats = processar_corridas_timeout(minutos_timeout=30)
    # Cancela corridas PENDENTES há >30min sem resposta do motorista
```

#### Fluxo 7: Validar Conflito de Veículo
```python
from autenticacao.corrida_helpers import validar_disponibilidade_veiculo
from datetime import datetime

validacao = validar_disponibilidade_veiculo(
    veiculo_id=7,
    data_inicio=datetime(2025, 5, 14, 14, 0),
    data_fim=datetime(2025, 5, 14, 15, 0)
)

if not validacao['disponivel']:
    print(f"Erro: {validacao['mensagem']}")
    # "Veículo ocupado em outra corrida (41)"
```

#### Fluxo 8: Adiar Corrida
```python
from autenticacao.corrida_helpers import adiar_corrida
from datetime import date, time

resultado = adiar_corrida(
    corrida_id=42,
    nova_data=date(2025, 5, 15),
    nova_hora=time(10, 0)
)
# Se estava CONFIRMADA, volta para RECONFIRMACAO_NECESSARIA
```

---

## 📊 Máquina de Estados

```
[*] → PENDENTE

PENDENTE → CONFIRMADA (motorista aceita)
PENDENTE → RECUSADA (motorista recusa)
PENDENTE → CANCELADA (timeout 30min ou admin cancela)

RECUSADA → PENDENTE (sistema reassigna a outro motorista)

CONFIRMADA → RECONFIRMACAO_NECESSARIA (admin altera rota)
CONFIRMADA → EM_ANDAMENTO (motorista inicia)
CONFIRMADA → CANCELADA (admin ou motorista cancela)

RECONFIRMACAO_NECESSARIA → CONFIRMADA (motorista reconfirma)
RECONFIRMACAO_NECESSARIA → RECUSADA (motorista recusa nova rota)

EM_ANDAMENTO → CONCLUIDA (motorista conclui)
EM_ANDAMENTO → CANCELADA (admin ou motorista cancela)
EM_ANDAMENTO → EM_ANDAMENTO (admin altera rota - só avisa, não muda status)

CONCLUIDA → [*]
CANCELADA → [*]
```

---

## 🎯 Fluxos Implementados

### ✅ Fluxo 1: Perfeito
**Automático via signals** - Sem funções helper necessárias
```
PENDENTE → CONFIRMADA → EM_ANDAMENTO → CONCLUIDA
```

### ✅ Fluxo 2: Alteração de Rota ANTES
**Use**: `alterar_rota_antes_iniciar()`
```
CONFIRMADA → RECONFIRMACAO_NECESSARIA → CONFIRMADA (reconfirma)
```

### ✅ Fluxo 3: Alteração de Rota DURANTE
**Use**: `alterar_rota_durante_corrida()`
```
EM_ANDAMENTO → EM_ANDAMENTO (notifica urgente)
```

### ✅ Fluxo 4: Cancelamento
**Use**: `cancelar_corrida_em_andamento()`
```
EM_ANDAMENTO → CANCELADA (notifica ambos)
```

### ✅ Fluxo 5: Recusa com Reassignação
**Use**: `motorista_recusa()`
```
CONFIRMADA/PENDENTE → RECUSADA → PENDENTE (novo motorista)
                                  ou CANCELADA (sem motorista)
```

### ✅ Fluxo 6: Timeout
**Use**: `processar_corridas_timeout()` (task Celery)
```
PENDENTE (>30min) → CANCELADA ou PENDENTE (novo motorista)
```

### ✅ Fluxo 7: Conflito de Veículo
**Use**: `validar_disponibilidade_veiculo()` (antes de criar/editar)
```
Retorna erro se veículo já está em outra corrida no mesmo horário
```

### ✅ Fluxo 8: Adiamento
**Use**: `adiar_corrida()`
```
CONFIRMADA → RECONFIRMACAO_NECESSARIA (se era confirmada)
PENDENTE → PENDENTE (se era só pendente)
```

### ⚠️ Fluxo 9: Motorista Offline
**Não implementado ainda** - Requer integração com dispositivo GPS/localização

---

## 🔧 Configuração Necessária

### 1. Adicionar funções ao `views.py` (endpoints)
```python
from autenticacao.corrida_helpers import *

class CorridaViewSet(viewsets.ModelViewSet):
    
    @action(detail=True, methods=['post'])
    def alterar_rota(self, request, pk=None):
        resultado = alterar_rota_antes_iniciar(
            corrida_id=pk,
            novo_ponto_chegada=request.data['novo_ponto_chegada'],
            novas_paradas=request.data.get('novas_paradas')
        )
        return Response(resultado)
    
    @action(detail=True, methods=['post'])
    def cancelar_durante_corrida(self, request, pk=None):
        resultado = cancelar_corrida_em_andamento(
            corrida_id=pk,
            quem_cancelou_id=request.user.id_usuario,
            motivo=request.data['motivo']
        )
        return Response(resultado)
    
    # ... outros endpoints
```

### 2. Setup Celery (para Fluxo 6: Timeout)
```python
# tasks.py
from celery import shared_task
from autenticacao.corrida_helpers import processar_corridas_timeout

@shared_task
def verificar_corridas_timeout():
    return processar_corridas_timeout(minutos_timeout=30)

# settings.py
CELERY_BEAT_SCHEDULE = {
    'verificar-corridas-timeout': {
        'task': 'autenticacao.tasks.verificar_corridas_timeout',
        'schedule': crontab(minute='*/5'),  # A cada 5 minutos
    },
}
```

### 3. Frontend - TagStatus já reconhece novo status
```tsx
// Automaticamente mapeia:
'reconfirmacao_necessaria' → cor: amarela, letra: preta (igual 'pendente')

<TagStatus status="reconfirmacao_necessaria" entityType="corrida" />
```

---

## 📋 Checklist de Testes

- [ ] Status `RECONFIRMACAO_NECESSARIA` aparece com cor amarela/letra preta
- [ ] Criar corrida → motorista recebe notificação `RIDE_CREATED`
- [ ] Motorista confirma → admin recebe `DRIVER_ACCEPT`
- [ ] Admin altera rota (CONFIRMADA) → corrida vai para `RECONFIRMACAO_NECESSARIA`
- [ ] Motorista reconfirma → volta para `CONFIRMADA`
- [ ] Motorista inicia → admin recebe `RIDE_STARTED`
- [ ] Motorista conclui → admin recebe `RIDE_CONCLUDED`
- [ ] Admin cancela EM_ANDAMENTO → motorista recebe `RIDE_CANCELLED`
- [ ] Motorista recusa → sistema tenta reassignar ou cancela
- [ ] Corrida PENDENTE >30min → cancela automaticamente (Celery)
- [ ] Validação conflito veículo funciona

---

## 📁 Arquivos Modificados

### Backend
- ✅ `models.py` - Novo status + tipos notificação
- ✅ `signals.py` - Notificações automáticas para transições
- ✅ `corrida_helpers.py` - NOVO: Funções dos 9 fluxos
- 📝 `views.py` - PRECISA ADICIONAR endpoints (ver section Configuração)
- 📝 `tasks.py` - PRECISA ADICIONAR task Celery (ver section Configuração)

### Frontend
- ✅ `TagStatus.tsx` - Novo mapeamento `reconfirmacao_necessaria`
- ✅ `Agendamento.css` - Novas cores (amarela/preta)

---

## 🚀 Próximos Passos

1. **Implementar endpoints** que chamam funções helper
2. **Adicionar testes unitários** para cada fluxo
3. **Setup Celery** para task de timeout
4. **Testes E2E** - Simular todos os fluxos na prática
5. **Fluxo 9** - Integração com GPS/localização do motorista

---

## 📞 Referências

- Documento de casos de uso: `SESSION_MEMORY/casos_uso_corridas.md`
- Exemplos de uso: `EXEMPLOS_USO_FLUXOS.py`
- Funções helper: `autenticacao/corrida_helpers.py`

