"""
GUIA DE AUTENTICAÇÃO - Sistema com Integração à API Externa

==============================================================================
                        ESTRUTURA IMPLEMENTADA
==============================================================================

Arquivos criados/modificados:
1. autenticacao/models.py
   - Adicionado: RefreshTokenLocal (armazena tokens e hashes locais)

2. autenticacao/auth_service.py (NOVO)
   - AuthenticationService: Serviço principal de autenticação
   - Integração com API externa
   - Gerenciamento de hash de senha local
   - Fluxo: validar local → comparar hash → chamar API se necessário

3. autenticacao/test_login_temp.py (NOVO - APENAS PARA TESTES)
   - TestAuthService: Simulação de login sem API externa
   - Usuários pré-configurados: admin, motorista, gerente
   - USE APENAS EM DESENVOLVIMENTO!

4. autenticacao/auth_serializers.py (NOVO)
   - Serializers para requisições/respostas de autenticação

5. autenticacao/views.py
   - Adicionado: LoginV2View (login com API externa)
   - Adicionado: LoginTestView (login de teste, sem API)
   - Adicionado: RefreshTokenView (renovar access token)

6. autenticacao/urls.py
   - Adicionado: /api/login-v2/ (login com API)
   - Adicionado: /api/login-test/ (login de teste)
   - Adicionado: /api/refresh-token/ (renovar token)

==============================================================================
                          FLUXO DE LOGIN
==============================================================================

FLUXO 1: Primeiro Login (usuário não existe localmente)
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. POST /api/login-v2/                                                  │
│    Body: {"login": "usuario", "password": "senha"}                      │
│                                                                           │
│ 2. AuthenticationService.login() verificar se usuário existe             │
│    → NÃO EXISTE → validar na API                                        │
│                                                                           │
│ 3. API retorna: {access_token, refresh_token}                           │
│                                                                           │
│ 4. Sistema local salva:                                                  │
│    - Usuario (novo registro)                                             │
│    - RefreshTokenLocal com:                                              │
│      * refresh_token (da API)                                            │
│      * access_token (da API)                                             │
│      * password_hash (SHA256 da senha local)                             │
│      * access_token_expires_at (300s depois)                            │
│                                                                           │
│ 5. Retorna para cliente: {access_token, refresh_token, user_data}       │
└─────────────────────────────────────────────────────────────────────────┘

FLUXO 2: Login com Usuário Existente (hash coincide)
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. POST /api/login-v2/                                                  │
│    Body: {"login": "usuario", "password": "senha"}                      │
│                                                                           │
│ 2. AuthenticationService.login() verificar se usuário existe             │
│    → EXISTE → buscar RefreshTokenLocal                                  │
│                                                                           │
│ 3. Comparar hash SHA256 da senha com hash armazenado                     │
│    → COINCIDE → usar tokens locais (NÃO chama API)                      │
│                                                                           │
│ 4. Retorna para cliente: {access_token, refresh_token, user_data}       │
│                                                                           │
│ VANTAGEM: Rápido! Não precisa chamar API se hash coincide               │
└─────────────────────────────────────────────────────────────────────────┘

FLUXO 3: Login com Hash Diferente (senha mudou)
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. POST /api/login-v2/                                                  │
│    Body: {"login": "usuario", "password": "nova_senha"}                 │
│                                                                           │
│ 2. AuthenticationService.login() verificar se usuário existe             │
│    → EXISTE → buscar RefreshTokenLocal                                  │
│                                                                           │
│ 3. Comparar hash SHA256 da senha nova com hash armazenado               │
│    → NÃO COINCIDE → validar na API com nova senha                      │
│                                                                           │
│ 4. API retorna: {access_token, refresh_token}                           │
│                                                                           │
│ 5. Sistema local ATUALIZA RefreshTokenLocal:                             │
│    * refresh_token (novo da API)                                        │
│    * access_token (novo da API)                                         │
│    * password_hash (SHA256 da nova senha)                               │
│                                                                           │
│ 6. Retorna para cliente: {access_token, refresh_token, user_data}       │
└─────────────────────────────────────────────────────────────────────────┘

FLUXO 4: Renovar Access Token (Access Token expirado)
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. POST /api/refresh-token/                                             │
│    Body: {"refresh_token": "token_aqui"}                                │
│                                                                           │
│ 2. Buscar RefreshTokenLocal com o refresh_token fornecido               │
│    → ENCONTRADO → gerar novo access_token                               │
│                                                                           │
│ 3. Atualizar RefreshTokenLocal:                                         │
│    * access_token (novo)                                                │
│    * access_token_expires_at (agora + 300s)                             │
│                                                                           │
│ 4. Retorna para cliente: {access_token, access_token_expires_in: 300}   │
└─────────────────────────────────────────────────────────────────────────┘

==============================================================================
                        COMO USAR (EXEMPLOS)
==============================================================================

### 1. LOGIN COM API EXTERNA (Production)
URL: POST http://localhost:8000/api/login-v2/
Body:
{
    "login": "usuario_real",
    "password": "senha_real"
}

Response (200 OK):
{
    "success": true,
    "access_token": "TOKEN_AQUI",
    "refresh_token": "REFRESH_TOKEN_AQUI",
    "access_token_expires_in": 300,
    "user": {
        "id_usuario": 1,
        "login": "usuario_real",
        "nome": "Nome do Usuário",
        "email": "usuario@cesmac.edu.br",
        "nivel_acesso": 3,
        "matricula": "MAT001",
        "telefone": "(85) 9999-9999"
    }
}

Response (401 Unauthorized):
{
    "success": false,
    "error": "Credenciais inválidas"
}


### 2. LOGIN DE TESTE (Development only!)
URL: POST http://localhost:8000/api/login-test/
Body:
{
    "login": "admin",
    "password": "admin123"
}

Usuários de teste disponíveis:
- login: "admin", password: "admin123" (nível 1)
- login: "motorista", password: "motorista123" (nível 3)
- login: "gerente", password: "gerente123" (nível 2)

Response (200 OK):
{
    "success": true,
    "access_token": "TEST_ACCESS_admin_1234567890",
    "refresh_token": "TEST_REFRESH_admin_1234567890",
    "access_token_expires_in": 300,
    "user": {
        "id_usuario": 1,
        "login": "admin",
        "nome": "Administrador",
        "email": "admin@cesmac.edu.br",
        "nivel_acesso": 1,
        "matricula": "ADM001",
        "telefone": "(85) 9999-9999"
    },
    "test_mode": true,
    "message": "✓ LOGIN DE TESTE BEM-SUCEDIDO - NÃO USA API EXTERNA"
}


### 3. LISTAR USUÁRIOS DE TESTE
URL: GET http://localhost:8000/api/login-test/

Response (200 OK):
{
    "test_mode": true,
    "message": "Usuários de teste disponíveis para uso em desenvolvimento",
    "users": [
        {
            "login": "admin",
            "senha": "admin123",
            "nome": "Administrador",
            "nivel_acesso": 1,
            "email": "admin@cesmac.edu.br"
        },
        {
            "login": "motorista",
            "senha": "motorista123",
            "nome": "João da Silva",
            "nivel_acesso": 3,
            "email": "joao.silva@cesmac.edu.br"
        },
        {
            "login": "gerente",
            "senha": "gerente123",
            "nome": "Maria Oliveira",
            "nivel_acesso": 2,
            "email": "maria.oliveira@cesmac.edu.br"
        }
    ]
}


### 4. RENOVAR ACCESS TOKEN
URL: POST http://localhost:8000/api/refresh-token/
Body:
{
    "refresh_token": "REFRESH_TOKEN_AQUI"
}

Response (200 OK):
{
    "success": true,
    "access_token": "NOVO_ACCESS_TOKEN_AQUI",
    "access_token_expires_in": 300
}

Response (401 Unauthorized):
{
    "success": false,
    "error": "Refresh token inválido"
}

==============================================================================
                    EXEMPLOS USANDO PYTHON/REQUESTS
==============================================================================

# Login de teste
import requests

response = requests.post(
    'http://localhost:8000/api/login-test/',
    json={'login': 'admin', 'password': 'admin123'}
)

data = response.json()
if data['success']:
    access_token = data['access_token']
    refresh_token = data['refresh_token']
    print(f"✓ Login bem-sucedido!")
    print(f"  Access Token: {access_token}")
    print(f"  Refresh Token: {refresh_token}")
    print(f"  Usuário: {data['user']['nome']}")
else:
    print(f"✗ Erro: {data['error']}")


# Renovar token
response = requests.post(
    'http://localhost:8000/api/refresh-token/',
    json={'refresh_token': refresh_token}
)

data = response.json()
if data['success']:
    new_access_token = data['access_token']
    print(f"✓ Token renovado!")
    print(f"  Novo Access Token: {new_access_token}")
else:
    print(f"✗ Erro: {data['error']}")

==============================================================================
                    EXEMPLOS USANDO CURL
==============================================================================

# Login de teste
curl -X POST http://localhost:8000/api/login-test/ \\
  -H "Content-Type: application/json" \\
  -d '{"login": "admin", "password": "admin123"}'


# Login com API (production)
curl -X POST http://localhost:8000/api/login-v2/ \\
  -H "Content-Type: application/json" \\
  -d '{"login": "usuario", "password": "senha"}'


# Renovar token
curl -X POST http://localhost:8000/api/refresh-token/ \\
  -H "Content-Type: application/json" \\
  -d '{"refresh_token": "TOKEN_AQUI"}'


# Listar usuários de teste
curl -X GET http://localhost:8000/api/login-test/

==============================================================================
                    CONFIGURAÇÃO DA API EXTERNA
==============================================================================

Para usar com API real, configure em settings.py:

EXTERNAL_AUTH_API_URL = 'http://xx.x.xxx.xx:8051/api/connect/token'
EXTERNAL_AUTH_TIMEOUT = 10  # segundos

Esperado na resposta da API:
{
    "access_token": "token_string",
    "refresh_token": "refresh_token_string",
    "user_data": {
        "email": "usuario@cesmac.edu.br",
        "nome": "Nome do Usuário",
        "matricula": "MAT001",
        "telefone": "(85) 9999-9999",
        "nivel_acesso": 3
    }
}

==============================================================================
                        FLUXO NO FRONTEND
==============================================================================

1. Usuário digita login e senha
2. Frontend faz POST /api/login-v2/ (ou /api/login-test/ para testes)
3. Recebe access_token e refresh_token
4. Armazena tokens no localStorage/sessionStorage
5. Usa access_token em headers de requisições subsequentes:
   - Authorization: Bearer {access_token}
6. Quando access_token expirar (300s):
   - POST /api/refresh-token/ com o refresh_token
   - Recebe novo access_token
   - Continua operações normalmente

==============================================================================
                        ESTRUTURA DE DADOS
==============================================================================

Modelo: RefreshTokenLocal
├── id (PK)
├── user (FK para Usuario) - OneToOne
├── refresh_token (TextField) - Token de atualização
├── password_hash (CharField[255]) - SHA256 da senha
├── access_token (TextField, null) - Token de acesso atual
├── access_token_expires_at (DateTimeField, null) - Quando expira
├── last_validated_at (DateTimeField, auto_now) - Última validação
├── created_at (DateTimeField, auto_now_add) - Data de criação
└── updated_at (DateTimeField, auto_now) - Data de atualização

==============================================================================
                        MIGRAÇÃO NECESSÁRIA
==============================================================================

Execute para criar as tabelas no banco:

cd backend
python manage.py makemigrations
python manage.py migrate

Depois teste com:
python manage.py shell

>>> from autenticacao.test_login_temp import TestAuthService
>>> result = TestAuthService.login('admin', 'admin123')
>>> print(result)

==============================================================================
"""

print(__doc__)
