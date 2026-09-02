# Especificação Técnica: Sistema E.L.I.A.S. - Gerenciamento de Corridas

**Data:** 20 de maio de 2026  
**Autor:** Enzo Machado  
**Projeto:** E.L.I.A.S. - Esquema de Locomoção Interno de Associados  
**Versão:** 2.0  
**Status:** Em Produção / QA & QC

---

## 1. Objetivo da Arquitetura

Implementar um sistema completo de gerenciamento de corridas com autenticação segura baseada em JWT (JSON Web Tokens), permitindo que:

- **Administradores** gerenciem motoristas, veículos, corridas e visualizem dashboards analíticos
- **Motoristas** visualizem corridas disponíveis, as aceitem/recusem e gerenciem seus dados pessoais
- **Sistema de Autenticação** utilize tokens com rotação automática para eliminar tráfego de senhas em texto plano
- **Sistema de Notificações** mantenha usuários informados sobre status de corridas em tempo real
- **Gestão de Dados** permita CRUD completo com validação de conflitos horários

A solução utiliza **Django REST Framework** no backend com autenticação JWT personalizada e **React + TypeScript** no frontend com proteção de rotas baseada em roles.

---

## 2. Estrutura de Autenticação

### 2.1 Tipo de Autenticação

**Sistema Híbrido:** JWT + Refresh Token Local

**Base URL (observada no código):** `http://localhost:8003/api/auth/`

**Headers Padrão:**
- Content-Type: application/json
- Accept: application/json
- Authorization: Bearer {access_token}

### 2.2 Tokens

**Access Token (JWT):**
- Algoritmo: HS256
- Contém: user_id, login, email, nome, nivel_acesso, data de expiração

Observação: Existem inconsistências no código sobre a validade do access token:
- Em `backend/backend/settings.py` (SIMPLE_JWT) o `ACCESS_TOKEN_LIFETIME` está configurado como 8 horas por padrão.
- Já o método `Usuario.get_jwt_token()` em `backend/autenticacao/models.py` gera um token com validade de 24 horas.

Recomendação: padronizar para um único valor (ex.: 8h ou 24h) e documentar no arquivo de ambiente.

**Refresh Token:**
- Tipo: String aleatória criptografada
- Armazenamento: Hash SHA256 no banco de dados local
- Validade: 7 dias (renovável)

Observação: o `AuthenticationService` utiliza `ACCESS_TOKEN_TTL = 300` segundos (5 minutos) para tokens recebidos da API externa quando presente. Verificar alinhamento entre serviços.

### 2.3 Níveis de Acesso

| Nível | Tipo | Permissões |
|-------|------|-----------|
| `1` | ADMIN | Acesso total: dashboards, CRUD de usuários/veículos/corridas, relatórios |
| `3` | MOTORISTA | Visualizar corridas, aceitar/recusar, editar dados pessoais |
| `5` | DEFAULT | Editar dados pessoais, alterar senha |

---

## 3. Modelos de Dados Principais

### 3.1 Modelo Usuario

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id_usuario | Auto | Identificador único |
| login | String | Usuário único para autenticação |
| email | Email | Email único |
| nome | String | Nome completo do usuário |
| numero_matricula | String | Matrícula única |
| telefone | String | Contato do usuário |
| nivel_acesso | Integer | Define permissões (1, 3 ou 5) |
| status | String | Ativo/Inativo/Bloqueado |
| password | Hash | Senha criptografada (nunca em texto plano) |
| data_criacao | DateTime | Quando a conta foi criada |

### 3.2 Modelo Corrida

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id_corrida | Auto | Identificador único |
| criado_por | FK Usuario | Admin que criou a corrida |
| motorista | FK Usuario | Motorista que aceita a corrida |
| data_inicio | Date | Data da corrida |
| horario_inicio | Time | Horário de saída |
| horario_retorno | Time | Horário de retorno esperado |
| destinos | JSON | Lista de pontos de parada |
| status | String | Estado atual (pendente, agendada, em_progresso, concluida, cancelada, recusada) |
| veiculo | FK Veiculo | Veículo associado |
| criado_em | DateTime | Timestamp de criação |
| atualizado_em | DateTime | Última atualização |

**Fluxo de Status:**
```
pendente → agendada → em_progresso → concluida
         ↘ recusada (motorista recusa)
         ↘ cancelada (admin cancela)
         ↘ pendente_retorno (aguardando retorno)
```

### 3.3 Modelo Veiculo

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id_veiculo | Auto | Identificador único |
| placa | String | Placa do veículo (única) |
| modelo | String | Modelo do veículo |
| marca | String | Marca do veículo |
| ano | Integer | Ano de fabricação |
| motorista_associado | FK Usuario | Motorista responsável |
| status | String | Disponível/Em Uso/Manutenção |
| criado_em | DateTime | Timestamp de criação |

### 3.4 Modelo RefreshTokenLocal

| Campo | Tipo | Descrição |
|-------|------|-----------|
| usuario | FK Usuario | Referência ao usuário |
| refresh_token_hash | String | Hash SHA256 do refresh token |
| senha_hash | String | Hash SHA256 da senha |
| expira_em | DateTime | Data de expiração (7 dias) |
| criado_em | DateTime | Quando foi criado |
| atualizado_em | DateTime | Última renovação |

### 3.5 Modelo Notificacao

| Campo | Tipo | Descrição |
|-------|------|-----------|
| usuario | FK Usuario | Destinatário da notificação |
| corrida | FK Corrida | Corrida relacionada |
| tipo | String | Tipo de evento (nova_corrida, cancelada, status_alterado, alerta, confirmacao) |
| mensagem | Text | Conteúdo da notificação |
| lida | Boolean | Se foi visualizada |
| criada_em | DateTime | Timestamp |

---

## 4. Detalhamento dos Fluxos de Operação

### FLUXO 1: Autenticação Inicial (Primeiro Acesso / Login)

#### Objetivo
Validar credenciais do usuário e emitir tokens JWT + Refresh Token para início de sessão.

#### Pré-requisitos
- Usuário já existe no banco de dados
- Credenciais (login + senha) estão corretas

#### Passos

**Passo 1 - Captura de Credenciais**
- Usuário acessa a interface de login
- Insere seu login/email e senha
- Sistema valida se os campos estão preenchidos

**Passo 2 - Requisição de Autenticação**
- Frontend envia POST para `/api/auth/login/`
- Corpo contém: username e password
- Headers incluem Content-Type: application/json

**Passo 3 - Busca no Banco de Dados**
- Backend busca o usuário pelo login fornecido
- Se não encontrar: retorna erro 401 (credenciais inválidas)
- Se encontrar: passa para próximo passo

**Passo 4 - Validação de Senha**
- Backend compara a senha fornecida com a senha criptografada no banco
- Se não coincidir: retorna erro 401 (credenciais inválidas)
- Se coincidir: passa para próximo passo

**Passo 5 - Validação de Status**
- Sistema verifica se o usuário está ativo
- Se inativo ou bloqueado: retorna erro 403 (acesso negado)
- Se ativo: passa para próximo passo

**Passo 6 - Geração de Tokens**
- Backend gera JWT Access Token com validade de 24 horas
- Backend gera Refresh Token (string aleatória)
- Calcula hash SHA256 do Refresh Token
- Calcula hash SHA256 da senha
- Armazena os hashes na tabela RefreshTokenLocal
- Define expiração do refresh token para 7 dias

**Passo 7 - Resposta de Sucesso (Status 200 OK)**
- Backend retorna:
  - Access Token (JWT)
  - Refresh Token
  - Dados do usuário (id, nome, email, nivel_acesso, etc)

**Passo 8 - Armazenamento no Frontend**
- Frontend recebe os dados
- Armazena Access Token em localStorage
- Armazena Refresh Token em localStorage
- Armazena dados do usuário em localStorage (JSON)

**Passo 9 - Redirecionamento Baseado em Perfil**
- Se nivel_acesso === 1 (Admin): redireciona para `/home` (dashboard)
- Se nivel_acesso === 3 (Motorista): redireciona para `/agendamento`
- Se nivel_acesso === 5 (Default): redireciona para `/dados-pessoais`

**Fluxo Visual:**
```
Usuário acessa Login
    ↓
Insere credenciais
    ↓
Frontend envia POST /api/auth/login/
    ↓
Backend busca usuário
├─ Não encontrado → Erro 401
└─ Encontrado ↓
    Backend valida senha
    ├─ Incorreta → Erro 401
    └─ Correta ↓
        Backend verifica status
        ├─ Inativo/Bloqueado → Erro 403
        └─ Ativo ↓
            Backend gera JWT + Refresh Token
            ├─ Armazena hashes no banco
            └─ Retorna tokens + user data
                ↓
        Frontend armazena em localStorage
                ↓
        Detecta nivel_acesso
        ├─ (1) → Redireciona /home
        ├─ (3) → Redireciona /agendamento
        └─ (5) → Redireciona /dados-pessoais
```

---

### FLUXO 2: Renovação de Token (Refresh Token - Sem Senha)

#### Objetivo
Renovar Access Token expirado usando Refresh Token, sem solicitar senha novamente.

#### Pré-requisitos
- Usuário possui Refresh Token válido em localStorage
- Refresh Token não expirou (válido por 7 dias)

#### Passos

**Passo 1 - Requisição HTTP Expirada**
- Frontend tenta fazer uma requisição autenticada
- Backend retorna Status 401 (Unauthorized)
- Frontend reconhece que o Access Token expirou

**Passo 2 - Interceptação Automática**
- Frontend (via Axios Interceptor) detecta Status 401
- Recupera o Refresh Token do localStorage
- Prepara requisição de renovação

**Passo 3 - Envio de Refresh**
- Frontend envia POST para `/api/auth/refresh/`
- Corpo contém: refresh token

**Passo 4 - Validação Backend**
- Backend decodifica o Refresh Token JWT
- Extrai o user_id do token
- Busca o usuário no banco de dados
- Se não encontrar: retorna erro 401

**Passo 5 - Busca do RefreshTokenLocal**
- Backend busca o registro RefreshTokenLocal do usuário
- Se não encontrar: retorna erro 401 (token expirado ou revogado)
- Se encontrar: passa para próximo passo

**Passo 6 - Validação de Expiração**
- Backend verifica se a data de expiração já passou
- Se expirou: retorna erro 401
- Se válido: passa para próximo passo

**Passo 7 - Validação de Hash**
- Backend calcula hash SHA256 do Refresh Token recebido
- Compara com o hash armazenado no banco
- Se não coincidirem: retorna erro 401 (token tampado)
- Se coincidirem: passa para próximo passo

**Passo 8 - Geração de Novo Access Token**
- Backend gera novo Access Token (24 horas)
- Retorna o novo token

**Passo 9 - Frontend Atualiza Token**
- Frontend recebe o novo Access Token
- Sobrescreve o token antigo em localStorage

**Passo 10 - Retentativa da Requisição Original**
- Frontend retenta a requisição original com o novo token
- Requisição é processada com sucesso

**Fluxo Visual:**
```
Frontend faz requisição autenticada
    ↓
Backend retorna 401 (Token Expirado)
    ↓
Axios Interceptor detecta
    ↓
Frontend envia POST /api/auth/refresh/
    ↓
Backend decodifica Refresh Token
    ↓
Backend busca usuário
├─ Não encontrado → Erro 401
└─ Encontrado ↓
    Backend busca RefreshTokenLocal
    ├─ Não encontrado → Erro 401
    └─ Encontrado ↓
        Backend valida expiração
        ├─ Expirado → Erro 401
        └─ Válido ↓
            Backend valida hash
            ├─ Hash diferente → Erro 401
            └─ Hash igual ↓
                Backend gera novo Access Token
                ↓
        Frontend recebe novo token
                ↓
        Frontend armazena em localStorage
                ↓
        Frontend retenta requisição original
                ↓
        Sucesso! Requisição processada
```

---

### FLUXO 3: Logout (Encerramento de Sessão)

#### Objetivo
Invalidar sessão do usuário, limpando tokens e dados locais.

#### Pré-requisitos
- Usuário está autenticado

#### Passos

**Passo 1 - Usuário Inicia Logout**
- Usuário clica em "Sair" ou similar na interface
- Frontend dispara ação de logout

**Passo 2 - Limpeza de Dados Locais**
- Frontend remove Access Token do localStorage
- Frontend remove Refresh Token do localStorage
- Frontend remove dados do usuário do localStorage

**Passo 3 - Requisição de Logout (Opcional)**
- Frontend pode enviar POST para `/api/auth/logout/` (opcional)
- Backend invalida o RefreshTokenLocal do usuário
- Backend registra o evento de logout em logs

**Passo 4 - Redirecionamento**
- Frontend redireciona para página de login (`/`)
- URL é substituída (não mantém histórico)

**Passo 5 - Verificação de Proteção**
- Se usuário tentar acessar rota protegida
- Sistema verifica presença de token em localStorage
- Como não há token, redireciona para login novamente

---

### FLUXO 4: Agendamento de Corrida (Motorista Aceita/Recusa)

#### Objetivo
Permitir que motorista visualize corridas pendentes e as aceite ou recuse.

#### Pré-requisitos
- Usuário autenticado com nivel_acesso === 3 (motorista)
- Corridas existem no banco com status = 'pendente'

#### Passos

**Passo 1 - Acesso à Página de Agendamento**
- Motorista acessa `/agendamento`
- Sistema valida se usuário está autenticado
- Sistema valida se nivel_acesso === 3
- Se não autorizado: redireciona para login

**Passo 2 - Requisição de Lista de Corridas**
- Frontend envia GET para `/api/auth/corrida/`
- Parâmetros: status=pendente
- Header inclui Authorization com Access Token

**Passo 3 - Backend Busca Corridas**
- Backend busca todas as corridas com status='pendente'
- Retorna lista com dados de cada corrida:
  - ID, data, horário, destinos, veículo, etc.

**Passo 4 - Frontend Exibe Lista**
- Frontend renderiza cada corrida como um card
- Cada card mostra:
  - Data e horários
  - Lista de destinos
  - Veículo associado
  - Dois botões: "Aceitar" e "Recusar"

**Passo 5a - Motorista Clica em "Aceitar"**
- Motorista seleciona uma corrida e clica em "Aceitar"
- Frontend envia PUT para `/api/auth/corrida/{id_corrida}/`
- Corpo contém: motorista_id e status='agendada'

**Passo 6a - Backend Processa Aceitação**
- Backend valida se requisição vem de um motorista (nivel_acesso === 3)
- Backend valida se corrida ainda está em status 'pendente'
- Backend atualiza corrida:
  - Define motorista como o usuário atual
  - Altera status para 'agendada'
  - Registra timestamp de atualização

**Passo 7a - Criação de Notificação**
- Sistema cria notificação para o admin (criador da corrida)
- Notificação contém: "Corrida aceita por [nome do motorista]"

**Passo 8a - Resposta de Sucesso**
- Backend retorna Status 200 OK
- Frontend remove a corrida da lista exibida

**Passo 5b - Motorista Clica em "Recusar"**
- Motorista seleciona uma corrida e clica em "Recusar"
- Frontend envia POST para `/api/auth/corrida/{id_corrida}/recusar/`

**Passo 6b - Backend Processa Recusa**
- Backend valida se corrida está em status 'pendente'
- Backend atualiza status para 'recusada'
- Registra quem recusou e quando

**Passo 7b - Criação de Notificação**
- Sistema cria notificação para o admin
- Notificação contém: "Corrida recusada"

**Passo 8b - Resposta de Sucesso**
- Backend retorna Status 200 OK
- Frontend remove a corrida da lista exibida

---

### FLUXO 5: Edição de Dados Pessoais

#### Objetivo
Permitir que usuário atualize seus dados pessoais (nome, telefone).

#### Pré-requisitos
- Usuário autenticado
- Dados fornecidos são válidos

#### Passos

**Passo 1 - Acesso à Página de Dados Pessoais**
- Usuário acessa `/dados-pessoais`
- Sistema valida autenticação
- Se não autenticado: redireciona para login

**Passo 2 - Requisição de Dados Atuais**
- Frontend envia GET para `/api/auth/user_personal_data/`
- Header inclui Authorization

**Passo 3 - Backend Retorna Dados**
- Backend busca dados do usuário autenticado
- Retorna: nome, email, telefone, numero_matricula, nivel_acesso

**Passo 4 - Frontend Exibe Formulário**
- Frontend renderiza formulário com campos preenchidos
- Campos: Nome, Email (apenas leitura), Telefone
- Dois botões: "Editar" e "Voltar"

**Passo 5 - Usuário Clica em "Editar"**
- Interface muda para modo de edição
- Campos ficam editáveis
- Botões mudam para "Confirmar" e "Cancelar"

**Passo 6 - Usuário Modifica Dados**
- Usuário altera nome e/ou telefone
- Sistema valida em tempo real:
  - Nome: mínimo 3 caracteres
  - Telefone: apenas dígitos
  - Email: não pode ser alterado

**Passo 7 - Usuário Clica em "Confirmar"**
- Frontend envia PATCH para `/api/auth/user_personal_data/`
- Corpo contém: nome e telefone atualizados

**Passo 8 - Backend Valida**
- Backend revalida formato dos dados
- Se inválido: retorna erro 400 com descrição
- Se válido: passa para próximo passo

**Passo 9 - Backend Atualiza Banco**
- Backend atualiza registro do usuário
- Altera nome e telefone
- Registra timestamp de atualização

**Passo 10 - Frontend Atualiza Dados Locais**
- Frontend recebe resposta de sucesso
- Atualiza dados do usuário em localStorage
- Exibe mensagem de sucesso

**Passo 11 - Retorno ao Modo Visualização**
- Interface retorna ao modo de apenas leitura
- Dados exibem valores atualizados

---

## 5. Códigos de Resposta HTTP

### Respostas de Sucesso (2xx)
- **200 OK** - Requisição processada com sucesso
- **201 CREATED** - Recurso criado com sucesso
- **204 NO CONTENT** - Sucesso sem conteúdo de retorno

### Erros de Requisição (4xx)
- **400 BAD REQUEST** - Dados inválidos ou faltando
- **401 UNAUTHORIZED** - Não autenticado ou token expirado
- **403 FORBIDDEN** - Não autorizado (sem permissão)
- **404 NOT FOUND** - Recurso não encontrado

### Erros do Servidor (5xx)
- **500 INTERNAL SERVER ERROR** - Erro no processamento
- **503 SERVICE UNAVAILABLE** - Serviço temporariamente indisponível

---

## 6. Casos de Uso para QA & QC

### CASO DE USO 1: Fluxo Completo de Login e Agendamento

**Cenário:** Motorista faz login e aceita uma corrida

**Passos:**
1. Motorista acessa página de login
2. Insere login e senha corretos
3. Backend valida e retorna tokens
4. Frontend armazena tokens em localStorage
5. Sistema redireciona para /agendamento
6. Lista de corridas pendentes é exibida
7. Motorista clica "Aceitar" em uma corrida
8. Backend atualiza status para 'agendada'
9. Notificação é criada para o admin
10. Corrida desaparece da lista do motorista

**Validações QA:**
- [ ] Tokens aparecem em localStorage
- [ ] User data está armazenado
- [ ] Redirecionamento é automático
- [ ] Status da corrida mudou no banco de dados
- [ ] Notificação foi criada corretamente

---

### CASO DE USO 2: Renovação Automática de Token

**Cenário:** Access Token expira e é renovado automaticamente

**Passos:**
1. Usuário está autenticado normalmente
2. Decorre tempo (24 horas ou simular expiração)
3. Usuário tenta fazer uma requisição
4. Backend retorna 401 (token expirado)
5. Frontend detecta o erro 401
6. Frontend envia Refresh Token para renovação
7. Backend valida e gera novo Access Token
8. Frontend armazena novo token
9. Requisição original é retentada
10. Sucesso! Usuário não percebe a troca

**Validações QA:**
- [ ] Status 401 é interceptado corretamente
- [ ] Novo token é armazenado
- [ ] Requisição original é retentada
- [ ] Usuário continua logado

---

### CASO DE USO 3: Logout e Limpeza

**Cenário:** Usuário faz logout

**Passos:**
1. Usuário clica em "Sair"
2. Frontend limpa localStorage (remove todos os tokens)
3. Frontend redireciona para página de login
4. Usuário tenta acessar rota protegida
5. Sistema verifica presença de token
6. Token não existe, redireciona para login

**Validações QA:**
- [ ] localStorage está vazio
- [ ] Tokens foram removidos
- [ ] Redirecionamento funciona
- [ ] Proteção de rotas está ativa

---

### CASO DE USO 4: Erro de Autenticação

**Cenário:** Usuário insere credenciais incorretas

**Passos:**
1. Usuário insere login e senha incorreta
2. Frontend envia dados para login
3. Backend valida e rejeita (401)
4. Frontend exibe mensagem de erro
5. Usuário permanece na página de login
6. Nenhum token é armazenado

**Validações QA:**
- [ ] Mensagem de erro é exibida
- [ ] localStorage permanece vazio
- [ ] Usuário não é redirecionado
- [ ] Pode tentar novamente

---

### CASO DE USO 5: Alteração de Dados Pessoais

**Cenário:** Motorista altera seu nome e telefone

**Passos:**
1. Motorista acessa /dados-pessoais
2. Dados atuais são carregados
3. Motorista clica "Editar"
4. Formulário fica editável
5. Motorista altera nome e telefone
6. Clica em "Confirmar"
7. Backend valida dados
8. Backend atualiza registro
9. Frontend atualiza localStorage
10. Sucesso exibido

**Validações QA:**
- [ ] Dados carregam corretamente
- [ ] Validações funcionam (campo vazio, telefone inválido)
- [ ] Banco de dados foi atualizado
- [ ] localStorage foi atualizado
- [ ] Mensagem de sucesso aparece

---

### CASO DE USO 6: Proteção de Rotas por Perfil

**Cenário:** Motorista tenta acessar dashboard administrativo

**Passos:**
1. Motorista está autenticado (nivel_acesso = 3)
2. Motorista tenta acessar /home (admin dashboard)
3. Sistema verifica nivel_acesso
4. Sistema redireciona para /agendamento
5. Admin dashboard nunca é carregado

**Validações QA:**
- [ ] Redirecionamento automático
- [ ] Dashboard não carrega para motorista
- [ ] Admin pode acessar sem problema

---

### CASO DE USO 7: Refresh Token Expirado

**Cenário:** Refresh Token expirou (> 7 dias)

**Passos:**
1. Usuário tenta fazer requisição
2. Access Token está expirado (401)
3. Frontend tenta renovar com Refresh Token
4. Backend valida e rejeita (token expirado)
5. Frontend limpa todo o localStorage
6. Frontend redireciona para /login
7. Usuário precisa fazer login novamente

**Validações QA:**
- [ ] localStorage é completamente limpo
- [ ] Usuário redireciona para login
- [ ] Nenhum token permanece armazenado

---

### CASO DE USO 8: Recusa de Corrida

**Cenário:** Motorista recusa uma corrida

**Passos:**
1. Motorista visualiza corridas pendentes
2. Motorista clica "Recusar" em uma corrida
3. Frontend envia requisição para recusa
4. Backend atualiza status para 'recusada'
5. Backend cria notificação para admin
6. Frontend remove corrida da lista
7. Corrida fica indisponível para outros motoristas

**Validações QA:**
- [ ] Status muda para 'recusada' no banco
- [ ] Notificação é criada
- [ ] Corrida desaparece da lista
- [ ] Admin é informado da recusa

---

## 7. Tabela de Endpoints

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/auth/login/` | Não | Login com credenciais |
| POST | `/api/auth/refresh/` | Não | Renovar access token |
| POST | `/api/auth/logout/` | Sim | Logout do sistema |
| GET | `/api/auth/user_personal_data/` | Sim | Obter dados pessoais |
| PATCH | `/api/auth/user_personal_data/` | Sim | Atualizar dados pessoais |
| GET | `/api/auth/corrida/` | Sim | Listar corridas |
| GET | `/api/auth/corrida/{id}/` | Sim | Detalhar corrida |
| PUT | `/api/auth/corrida/{id}/` | Sim | Atualizar corrida |
| POST | `/api/auth/corrida/{id}/recusar/` | Sim | Recusar corrida |
| GET | `/api/auth/veiculo/` | Sim | Listar veículos |
| POST | `/api/auth/veiculo/` | Sim | Criar veículo |
| GET | `/api/auth/home/stats/` | Sim | Dashboard (admin) |
| GET | `/api/auth/notificacao/` | Sim | Listar notificações |
| PATCH | `/api/auth/notificacao/{id}/` | Sim | Marcar como lida |

---

## 8. Fluxo de Dados - Visão Geral

```
Autenticação
    ├─ Primeira Vez: Credenciais → JWT + Refresh
    ├─ Subsequentes: Refresh Token → Novo JWT (sem senha)
    └─ Logout: Limpa tokens localmente

Agendamento
    ├─ Listar corridas pendentes
    ├─ Motorista escolhe aceitar ou recusar
    └─ Status atualiza e notificação é criada

Dados Pessoais
    ├─ Carrega dados atuais
    ├─ Edita nome e/ou telefone
    └─ Salva no banco e atualiza localStorage

Proteção
    ├─ Rotas protegidas verificam token
    ├─ Rotas administrativas verificam nivel_acesso
    └─ Sem permissão: redireciona para login ou página autorizada
```

---

## 9. Decisões de Design

1. **Access Token vs Refresh Token:**
   - Access Token (24h): Para requisições do dia-a-dia
   - Refresh Token (7d): Para renovação sem senha
   - Evita tráfego de senha em texto plano

2. **Hash Local:**
   - Senha criptografada em hash SHA256 no banco
   - Permite validação rápida sem chamar API externa
   - Aumenta segurança com segregação de responsabilidade

3. **Níveis de Acesso Numéricos:**
   - 1 = Admin
   - 3 = Motorista
   - 5 = Default
   - Permite lógica simples de validação

4. **localStorage vs sessionStorage:**
   - localStorage: Permanece após fechar navegador
   - Permite "lembrar" do usuário
   - Logout limpa explicitamente

5. **Notificações:**
   - Criadas automaticamente em eventos importantes
   - Informam mudanças de status
   - Admin sempre é notificado de ações de motoristas

---

## 10. Segurança

- Senhas nunca trafegam em texto plano após login inicial
- Tokens possuem expiração
- Refresh Token é validado contra hash no banco
- Rotas são protegidas por autenticação e autorização
- CORS e validação de origem em produção
- HTTPS obrigatório em ambiente de produção

---

**Documento Versão:** 2.0  
**Última Atualização:** 20 de maio de 2026  
**Próximas Revisões:** Conforme evolução do sistema
