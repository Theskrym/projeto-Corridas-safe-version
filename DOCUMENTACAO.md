# ELIAS - Documentação Técnica e Funcional

## Projeto: Gestão de corridas internas

### Versão: 2.0
### Data: 30/07/2026
### Responsável: Equipe de desenvolvimento

### Resumo

Este documento apresenta uma revisão atualizada da documentação técnica do projeto ELIAS, com base na análise do código-fonte e da estrutura atual do sistema em 2026-07-30. O objetivo é consolidar uma visão consistente sobre arquitetura, funcionalidades, fluxos principais, endpoints da API e configuração do ambiente, em um formato mais próximo de uma documentação técnica formal.

### Palavras-chave

ELIAS; Django; React; TypeScript; API REST; autenticação; notificações; corridas internas.

## 1. Introdução

O ELIAS é um sistema voltado ao gerenciamento de deslocamentos internos de associados, com foco em solicitação, acompanhamento e confirmação de corridas. O projeto possui uma arquitetura dividida em backend Django e frontend React/Vite, com integração a serviços de autenticação, notificações e relatórios.

### 1.1 Objetivo

Documentar de forma organizada os principais componentes, fluxos de negócio e pontos de configuração do sistema, de modo a facilitar manutenção, entendimento técnico e futuras alterações.

### 1.2 Escopo

Este documento abrange:
- arquitetura geral do sistema;
- estrutura de diretórios do backend e do frontend;
- modelos principais e regras de negócio;
- principais endpoints da API;
- fluxo de autenticação e notificações;
- configuração local e execução do projeto.

---

## 2. Visão Geral do Projeto

### 2.1 Descrição funcional

O sistema permite:
- cadastrar e gerenciar usuários, motoristas, veículos e corridas;
- criar corridas com ponto de início, destino, paradas intermediárias e observações;
- acompanhar mudanças de status das corridas;
- emitir notificações para usuários envolvidos;
- gerar relatórios e estatísticas administrativas.

### 2.2 Stack tecnológico

- Backend: Django + Django REST Framework
- Frontend: React + TypeScript + Vite
- Banco de dados: SQLite para desenvolvimento local; suporte a SQL Server/PostgreSQL via configuração de ambiente
- Autenticação: fluxo customizado com integração a API externa e tokens locais
- Comunicação assíncrona: Celery + Redis
- Estilização e interface: React Router, Axios e componentes React

### 2.3 Status atual do projeto

O projeto está funcionalmente estruturado para:
- autenticação e recuperação de senha;
- cadastro e listagem de motoristas e veículos;
- criação, atualização e acompanhamento de corridas;
- relatórios administrativos;
- notificação de eventos via backend.

Algumas funções ainda dependem de refinamento de interface, validações adicionais ou integração com ambientes externos.

---

## 3. Arquitetura do Sistema

### 3.1 Arquitetura geral

A aplicação está organizada em duas camadas principais:

1. Backend
   - responsável pela regra de negócio, autenticação, persistência e API REST;
   - implementado em Django com app principal em backend/autenticacao.

2. Frontend
   - responsável pela interface de usuário e navegação;
   - implementado em React com roteamento protegido por autenticação.

### 3.2 Backend

O backend é estruturado em torno do app autenticacao, que concentra:
- modelos de domínio;
- views e serializers;
- rotas da API;
- lógica de autenticação;
- helpers de corridas;
- tarefas assíncronas.

### 3.3 Frontend

O frontend é composto por páginas, componentes reutilizáveis, serviços de API, contexto de autenticação e rotas protegidas. A navegação é organizada principalmente em páginas como login, home administrativa, corridas, motoristas, veículos, notificações e dados pessoais.

---

## 4. Estrutura de Pastas

### 4.1 Backend

- backend/autenticacao/: lógica principal da aplicação
- backend/backend/: configuração do projeto Django
- backend/manage.py: ponto de entrada para comandos Django
- backend/db.sqlite3: banco local de desenvolvimento

### 4.2 Frontend

- frontend/src/pages/: páginas da aplicação
- frontend/src/components/: componentes reutilizáveis
- frontend/src/routes/: definição das rotas e proteção de acesso
- frontend/src/services/: integração com a API
- frontend/src/contexts/: contexto de autenticação

---

## 5. Modelos e Regras de Negócio Principais

### 5.1 Usuario

Representa os usuários do sistema e armazena dados como nome, login, email, telefone, matrícula, nível de acesso e token FCM.

Características importantes:
- login e email são identificadores únicos;
- o email deve seguir o padrão corporativo @cesmac.edu.br;
- o sistema utiliza um modelo customizado de usuário baseado em AbstractBaseUser;
- o nível de acesso influencia permissões e acessos administrativos.

### 5.2 Corridas

O modelo Corridas centraliza as informações das corridas solicitadas.

Campos principais:
- ponto de início;
- ponto de chegada;
- destinos;
- observações;
- status da corrida;
- motorista e veículo associados;
- data de solicitação e data de início.

Status suportados:
- pendente;
- confirmada;
- reconfirmacao_necessaria;
- em_andamento;
- concluida;
- cancelada;
- recusada.

### 5.3 Veiculo

Representa os veículos da frota e é utilizado para controlar associação e disponibilidade em corridas.

### 5.4 Notificacao

Armazena eventos importantes para os usuários, como criação de corrida, alteração de status, cancelamento, conclusão, entre outros.

### 5.5 RefreshTokenLocal

Responsável por manter o controle de tokens locais de autenticação e renovação de sessão.

---

## 6. Fluxos Principais

### 6.1 Fluxo de autenticação

O fluxo de login é implementado com uma lógica customizada que pode:
- validar credenciais localmente;
- recorrer a uma API externa para autenticação;
- criar ou atualizar usuários locais com base no resultado da validação.

Os principais endpoints relacionados são:
- /api/auth/login-v2/
- /api/auth/refresh-token/
- /api/auth/change-password/
- /api/auth/auto-login/

### 6.2 Fluxo de criação e acompanhamento de corridas

A criação de corrida envolve:
- entrada de dados no frontend;
- envio para a API;
- validação no backend;
- persistência da corrida com status inicial;
- geração de notificações para os interessados.

### 6.3 Fluxo de notificações

As notificações são geradas automaticamente a partir de eventos do domínio, principalmente mudanças de status de corridas. Isso permite informar motoristas, administradores e solicitantes sobre alterações relevantes.

---

## 7. API REST

A API principal está concentrada sob o prefixo /api/auth/.

### 7.1 Endpoints principais

- GET /api/auth/corrida/: lista corridas
- POST /api/auth/corrida/: cria uma corrida
- GET /api/auth/corrida/<id>/: detalha uma corrida
- PATCH /api/auth/corrida/<id>/: atualiza parcialmente uma corrida
- POST /api/auth/corrida/<id>/complete_ride/: marca corrida como concluída
- POST /api/auth/corrida/<id>/recusar/: registra recusa da corrida

- GET /api/auth/veiculos/: lista veículos
- POST /api/auth/veiculos/: cria veículo
- GET /api/auth/motoristas/: lista motoristas
- POST /api/auth/motoristas/novo/: cria motorista

- GET /api/auth/notificacoes/: lista notificações do usuário
- GET /api/auth/notificacoes/contagem/: retorna quantidade de notificações não lidas
- POST /api/auth/notificacoes/marcar_multiplas/: marca múltiplas notificações como lidas

### 7.2 Observações técnicas

A estrutura atual define rotas explícitas para recursos de corrida, veículos, motoristas e notificações. O backend usa viewsets e views específicas, com rotas organizadas no arquivo backend/autenticacao/urls.py.

---

## 8. Frontend

### 8.1 Estrutura de navegação

As rotas principais incluem:
- /: tela de login
- /home: área administrativa
- /corridas: gestão de corridas
- /motoristas: gestão de motoristas
- /veiculos: gestão de veículos
- /notificacoes: visualização de notificações
- /dados-pessoais: dados do usuário
- /alterar-senha: alteração de senha

### 8.2 Componentes principais

O frontend utiliza:
- páginas específicas para cada domínio;
- componentes reutilizáveis para forms e menus;
- contexto de autenticação para persistência de sessão;
- rotas protegidas para restringir acesso conforme perfil do usuário.

---

## 9. Configuração e Execução

### 9.1 Backend

Requisitos básicos:
- Python 3.10 ou superior
- dependências listadas no arquivo requirements.txt

Comandos típicos:
- pip install -r requirements.txt
- python manage.py migrate
- python manage.py runserver

### 9.2 Frontend

Requisitos básicos:
- Node.js
- npm ou yarn

Comandos típicos:
- npm install
- npm run dev

### 9.3 Configurações de ambiente

O projeto usa variáveis de ambiente para configurar:
- chave secreta do Django;
- URL da API externa de autenticação;
- conexão com banco de dados;
- URLs de frontend e Redis.

---

## 10. Considerações de Manutenção

Esta documentação deve ser atualizada sempre que houver mudanças relevantes em:
- estrutura de rotas;
- modelos e campos do banco;
- lógica de autenticação;
- fluxos de corrida e notificações;
- estrutura do frontend.

A versão anterior deste documento estava desatualizada em relação ao código atual, especialmente com relação à organização do frontend, à autenticação e aos endpoints implementados.

---

## 11. Conclusão

O ELIAS é uma aplicação modular, com backend Django e frontend React, voltada ao gerenciamento de corridas e usuários em contexto institucional. O código atual apresenta uma estrutura coerente para autenticação, administração, rastreamento de corridas e notificações, com boa base para evolução e manutenção.
