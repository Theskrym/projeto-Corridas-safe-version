#!/usr/bin/env python
"""
Test script for change password endpoint
Run: python manage.py shell < test_change_password.py
Or: python manage.py shell -c "exec(open('test_change_password.py').read())"
"""

from autenticacao.models import Usuario
from autenticacao.serializers import ChangePasswordSerializer
from rest_framework.test import APIRequestFactory
from django.contrib.auth.models import AnonymousUser
from autenticacao.views import ChangePasswordView
import json

print("=" * 80)
print("TESTANDO ENDPOINT DE ALTERAÇÃO DE SENHA")
print("=" * 80)

# 1. Criar um usuário de teste
print("\n1. Procurando usuário de teste...")
try:
    user = Usuario.objects.get(login='motorista')
    print(f"   ✓ Usuário encontrado: {user.nome} (login: {user.login})")
except Usuario.DoesNotExist:
    print("   ✗ Usuário 'motorista' não encontrado")
    print("   Criando usuário de teste...")
    user = Usuario.objects.create_user(
        login='motorista_test',
        email='motorista_test@cesmac.edu.br',
        password='motorista123',
        nome='Motorista Teste',
        nivel_acesso=3
    )
    print(f"   ✓ Usuário criado: {user.nome}")

# 2. Testar o serializer
print("\n2. Testando ChangePasswordSerializer...")
test_data = {
    'senhaAtual': 'motorista123',
    'novaSenha': 'novaSenha123',
    'confirmarSenha': 'novaSenha123'
}
serializer = ChangePasswordSerializer(data=test_data)
if serializer.is_valid():
    print(f"   ✓ Serializer válido")
    print(f"   Dados: {serializer.validated_data}")
else:
    print(f"   ✗ Erros de validação: {serializer.errors}")

# 3. Testar com dados inválidos
print("\n3. Testando ChangePasswordSerializer com senhas não coincidentes...")
invalid_data = {
    'senhaAtual': 'motorista123',
    'novaSenha': 'novaSenha123',
    'confirmarSenha': 'senhadiferente123'
}
serializer = ChangePasswordSerializer(data=invalid_data)
if serializer.is_valid():
    print(f"   ✗ Deveria ter falhado, mas validou!")
else:
    print(f"   ✓ Validação correta. Erros: {serializer.errors}")

# 4. Testar check_password
print("\n4. Testando check_password()...")
user.set_password('motorista123')
user.save()
if user.check_password('motorista123'):
    print(f"   ✓ Senha correta validada")
else:
    print(f"   ✗ Falha ao validar senha correta")

# 5. Testar a view via APIRequestFactory
print("\n5. Testando ChangePasswordView...")
factory = APIRequestFactory()
view = ChangePasswordView.as_view()

request = factory.put(
    '/api/auth/change-password/',
    test_data,
    format='json'
)
request.user = user

response = view(request)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    print(f"   ✓ Sucesso: {response.data}")
else:
    print(f"   ✗ Erro: {response.data}")

print("\n" + "=" * 80)
print("TESTE FINALIZADO")
print("=" * 80)
