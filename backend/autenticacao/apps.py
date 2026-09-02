from django.apps import AppConfig

class AutenticacaoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'autenticacao'
    
    def ready(self):
        """Registra sinais quando a aplicação está pronta"""
        import autenticacao.signals  # noqa