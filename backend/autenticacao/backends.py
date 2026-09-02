from django.contrib.auth.backends import BaseBackend
from .models import Usuario

class SQLServerAuthBackend(BaseBackend):
    def authenticate(self, request, login=None, password=None, **kwargs):
        try:
            user = Usuario.objects.get(login=login)
            if user.check_password(password):
                # Não tente atualizar last_login
                return user
            return None
        except Usuario.DoesNotExist:
            return None

    def get_user(self, user_id):
        try:
            return Usuario.objects.get(id_usuario=user_id)
        except Usuario.DoesNotExist:
            return None