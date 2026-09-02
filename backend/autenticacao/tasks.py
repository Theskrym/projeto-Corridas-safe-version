"""
Celery tasks for handling asynchronous operations in the ELIAS system
Implements periodic tasks for ride timeout processing and other async operations
"""

from celery import shared_task
from django.utils import timezone
from .corrida_helpers import processar_corridas_timeout
import logging

logger = logging.getLogger(__name__)


@shared_task
def verificar_corridas_timeout():
    """
    Celery task to check for rides that have timed out
    Runs periodically every 5 minutes (configured in settings.py)
    
    A ride times out if:
    - Status is PENDENTE or CONFIRMADA
    - More than 30 minutes have passed since creation/confirmation
    
    When timeout is detected:
    - Ride status changes to TIMEOUT_SEM_CONFIRMACAO
    - Motorista is notified
    - Creator is notified
    - New motoristas are searched for reassignment
    """
    try:
        logger.info("[CELERY] Starting timeout check task...")
        
        resultado = processar_corridas_timeout(minutos_timeout=30)
        
        if resultado.get('sucesso'):
            corridas_timeout = resultado.get('corridas_timeout_processadas', 0)
            corridas_reassignadas = resultado.get('corridas_reassignadas', 0)
            
            logger.info(
                f"[CELERY] Timeout check completed. "
                f"Processed: {corridas_timeout}, "
                f"Reassigned: {corridas_reassignadas}"
            )
            
            return {
                'sucesso': True,
                'corridas_timeout_processadas': corridas_timeout,
                'corridas_reassignadas': corridas_reassignadas
            }
        else:
            erro = resultado.get('erro', 'Unknown error')
            logger.error(f"[CELERY] Timeout check failed: {erro}")
            return {
                'sucesso': False,
                'erro': erro
            }
    
    except Exception as e:
        logger.error(f"[CELERY] Error in verificar_corridas_timeout task: {str(e)}", exc_info=True)
        return {
            'sucesso': False,
            'erro': str(e)
        }


# Additional async tasks can be added here:
# - Enviar notificações em lote
# - Gerar relatórios
# - Sincronizar dados com sistemas externos
# - Processar pagamentos
# etc.
