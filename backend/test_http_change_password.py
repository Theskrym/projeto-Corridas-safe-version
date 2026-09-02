#!/usr/bin/env python
"""
Test the change password endpoint with HTTP requests
This simulates what the frontend does
"""

import requests
import json

# Start with login to get a token
print("=" * 80)
print("TESTE DE ALTERAÇÃO DE SENHA - Simulando Frontend")
print("=" * 80)

BASE_URL = "http://localhost:8003/api/auth"

# 1. Login para obter token
print("\n1. Fazendo login para obter token...")
login_response = requests.post(
    f"{BASE_URL}/login-test/",
    json={
        "login": "motorista",
        "password": "motorista123"
    },
    headers={
        "Content-Type": "application/json"
    }
)

print(f"   Status: {login_response.status_code}")
if login_response.status_code == 200:
    login_data = login_response.json()
    token = login_data.get('access_token')
    print(f"   ✓ Token obtido: {token[:50]}...")
else:
    print(f"   ✗ Erro ao fazer login: {login_response.text}")
    exit(1)

# 2. Tentar alterar senha com o token
print("\n2. Tentando alterar senha com token...")
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

change_password_data = {
    "senhaAtual": "motorista123",
    "novaSenha": "novaSenha123",
    "confirmarSenha": "novaSenha123"
}

response = requests.put(
    f"{BASE_URL}/change-password/",
    json=change_password_data,
    headers=headers
)

print(f"   Status: {response.status_code}")
print(f"   Headers enviados: {json.dumps(dict(headers), indent=2)}")
print(f"   Dados enviados: {json.dumps(change_password_data, indent=2)}")
print(f"   Resposta: {response.text}")

if response.status_code == 200:
    print(f"   ✓ Sucesso ao alterar senha!")
else:
    print(f"   ✗ Erro: {response.status_code}")

print("\n" + "=" * 80)
print("TESTE FINALIZADO")
print("=" * 80)
