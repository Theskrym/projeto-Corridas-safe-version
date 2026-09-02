# 📋 MAPEAMENTO COMPLETO PROJETO E.L.I.A.S

**Data:** 20 de Maio de 2026  
**Versão:** 1.0  
**Scope:** Backend Django + Frontend React (Autenticação, Modelos, Fluxos de Negócio)

---

## 🎯 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Backend Django - Autenticação](#backend-django---autenticação)
3. [Backend Django - Modelos de Dados](#backend-django---modelos-de-dados)
4. [Frontend React - Arquitetura](#frontend-react---arquitetura)
5. [Permissões e Controle de Acesso](#permissões-e-controle-de-acesso)
6. [Fluxos de Negócio](#fluxos-de-negócio)
7. [Mapa de Dados End-to-End](#mapa-de-dados-end-to-end)

---

## 📌 VISÃO GERAL

### Stack Tecnológico

**Backend:**
- Django (REST Framework)
- JWT + Hybrid Authentication
- API Externa para validação de credenciais
- SQLite (desenvolvimento) / SQL Server (produção)

**Frontend:**
- React + TypeScript
- React Router (proteção de rotas)
- Axios (requisições HTTP)
- Context API (gerenciamento de estado)
- Tailwind CSS (estilos)

### Arquitetura de Autenticação

```
FRONTEND                    BACKEND                     API EXTERNA
┌─────────────┐         ┌──────────────┐          ┌────────────────┐
│ LoginPage   │────────>│ LoginView    │─────────>│ Sistema Auth   │
│ (credentials)│         │ /login-v2/   │         │ http://xx.x.   │
└─────────────┘         └──────────────┘         │    xx:8051     │
      │                        │                  └────────────────┘
      │ token +               │ ReturnS:
      │ user data             │ - access_token
      │ localStorage          │ - refresh_token
      ↓                        │ - user_data
   AuthContext              RefreshTokenLocal
   (manage state)           (local storage)
```
Observação sobre rotas: em `backend/autenticacao/urls.py` existe uma rota registrada antes do router para
`/notificacoes/marcar_multiplas/` a fim de evitar conflito com o `NotificacaoViewSet` (detalhes nas linhas do arquivo).
Além disso, o prefixo usado no projeto é `/api/auth/` (veja `backend/backend/urls.py`).

---

## 🔐 BACKEND DJANGO - AUTENTICAÇÃO

### Arquivos de Autenticação

```
backend/autenticacao/
├── models.py                    # Modelos de usuário e tokens
├── views.py                     # Views/endpoints de autenticação
├── urls.py                      # Rotas de autenticação
├── serializers.py               # Serializers de dados
├── auth_serializers.py          # Serializers específicos de auth
├── auth_service.py              # Lógica de autenticação
├── authentication.py            # Classe HybridAuthentication
├── auth_backends.py             # TestTokenAuthentication
├── backends.py                  # SQLServerAuthBackend
├── admin.py                     # Admin Django
└── migrations/                  # Migrações de BD
```

### 📊 Modelo: Usuario

**Localização:** [backend/autenticacao/models.py](backend/autenticacao/models.py#L35-L120)

```python
class Usuario(AbstractBaseUser, PermissionsMixin):
    # Campos de identificação
    id_usuario              # PK Auto-increment
    nome                    # CharField(100)
    email                   # EmailField (unique, deve ser @cesmac.edu.br)
    login                   # CharField(50, unique) - username
    password                # CharField(255) - hash da senha
    
    # Metadata
    telefone                # CharField(15, nullable)
    matricula               # CharField(15, nullable)
    fcm_token              # CharField(255, nullable) - Firebase Cloud Messaging
    
    # Controle de Acesso
    nivel_acesso           # IntegerField (default=5)
                           # 1 = Admin, 3 = Motorista, 5 = Default
    status                 # CharField (choices: 'Ativo', 'Inativo')
    
    # Timestamps
    data_criacao           # DateTimeField (auto_now_add)
    last_login             # DateTimeField (nullable)
    
    # Manager customizado
    objects                # UsuarioManager
    
    # USERNAME_FIELD
    USERNAME_FIELD = 'login'
    REQUIRED_FIELDS = ['nome', 'email']
```

**Validações:**
- Email corporativo obrigatório (@cesmac.edu.br)
- Login único
- Email único

**Métodos Importantes:**
```python
check_password(raw_password)        # Verifica senha com Django hasher
get_jwt_token()                     # Gera JWT com TTL 24h
has_perm(perm, obj=None)           # Verifica permissão (nivel_acesso <= 2)
is_superuser                        # True se nivel_acesso == 1
is_staff                            # True se nivel_acesso <= 5
```

### 📊 Modelo: RefreshTokenLocal

**Localização:** [backend/autenticacao/models.py](backend/autenticacao/models.py#L350-L400)

```python
class RefreshTokenLocal(models.Model):
    # FK
    id                      # PK Auto-increment
    user                    # OneToOneField(Usuario, CASCADE)
    
    # Tokens da API Externa
    refresh_token           # TextField - token da API externa
    access_token            # TextField - token de acesso atual
    access_token_expires_at # DateTimeField (TTL 300s = 5min)
    
    # Segurança Local
    password_hash           # CharField(255) - SHA256 da senha
    
    # Timestamps
    last_validated_at       # DateTimeField (auto_now)
    created_at              # DateTimeField (auto_now_add)
    updated_at              # DateTimeField (auto_now)
    
    class Meta:
        db_table = 'refresh_token_local'
        ordering = ['-created_at']
```

### 📊 Modelo: UserToken

**Localização:** [backend/autenticacao/models.py](backend/autenticacao/models.py#L333-L340)

```python
class UserToken(models.Model):
    fcm_key                 # CharField(40, PK)
    user                    # OneToOneField(Usuario, CASCADE)
    created                 # DateTimeField (auto_now_add)
    
    class Meta:
        db_table = 'user_auth_token'
```

### 🔑 Estrutura JWT

**Token Type:** HS256 (HMAC SHA256)  
**Expiração:** 24 horas (configurável via settings.ALGORITHM)

```javascript
{
  user_id: number,        // ID do usuário
  login: string,          // Login do usuário
  email: string,          // Email corporativo
  nome: string,           // Nome completo
  nivel_acesso: number,   // 1=Admin, 3=Motorista, 5=Default
  exp: timestamp,         // Unix timestamp (24h no futuro)
}
```

### 🔄 Fluxo de Autenticação (AuthenticationService)

**Localização:** [backend/autenticacao/auth_service.py](backend/autenticacao/auth_service.py)

```
1. USUÁRIO FORNECE (login, password)
   ↓
2. VERIFICAR LOCALMENTE
   ├─ Usuário existe? SIM ──> Próximo passo
   │                    NÃO ──> Validar API Externa
   │
3. SE EXISTE LOCALMENTE
   ├─ Comparar hash(password) com password_hash armazenado
   │   ├─ IGUAL? ──> Usar dados locais (RefreshTokenLocal)
   │   │            Retornar access_token + user_data
   │   │
   │   └─ DIFERENTE? ──> Validar na API Externa
   │                     ├─ Sucesso ──> Atualizar RefreshTokenLocal
   │                     │              Retornar tokens
   │                     └─ Falha ──> Erro
   │
4. SE NÃO EXISTE LOCALMENTE
   ├─ Validar na API Externa (http://xx.x.xxx.xx:8051/api/connect/token)
   │   ├─ Sucesso ──> Criar Usuario + RefreshTokenLocal
   │   │              Retornar tokens
   │   └─ Falha ──> Erro

5. RETORNA
   {
     success: boolean,
     access_token: string,      # TTL: 300s (5 min)
     refresh_token: string,     # TTL: 7 dias
     user: {
       id_usuario, login, nome, email, nivel_acesso
     }
   }
```

**Classe Principal:**
```python
class AuthenticationService:
    API_URL = 'http://xx.x.xxx.xx:8051/api/connect/token'
    API_TIMEOUT = 10  # segundos
    ACCESS_TOKEN_TTL = 300  # 5 minutos
    REFRESH_TOKEN_TTL = 604800  # 7 dias
    
    @classmethod
    def login(login: str, password: str) -> dict
    
    @classmethod
    def hash_password(password: str) -> str  # SHA256
    
    @classmethod
    def validate_with_external_api(login: str, password: str) -> dict
```

### 🔐 Backends de Autenticação

#### 1. HybridAuthentication
**Arquivo:** [backend/autenticacao/authentication.py](backend/autenticacao/authentication.py)

Suporta múltiplos métodos em cascata:
```python
class HybridAuthentication(JWTAuthentication, TokenAuthentication):
    def authenticate(self, request):
        1. Tenta JWT (JWTAuthentication)
        2. Se falhar, tenta Token tradicional (TokenAuthentication)
        3. Se falhar, retorna None
```

#### 2. TestTokenAuthentication
**Arquivo:** [backend/autenticacao/auth_backends.py](backend/autenticacao/auth_backends.py)

Aceita tokens TEST_ para testes:
```python
class TestTokenAuthentication(BaseAuthentication):
    # Aceita: TEST_ACCESS_token_<login>_<extra>
    # Aceita: JWT válido
    # Aceita: Bearer token
```

#### 3. SQLServerAuthBackend
**Arquivo:** [backend/autenticacao/backends.py](backend/autenticacao/backends.py)

```python
class SQLServerAuthBackend(BaseBackend):
    def authenticate(self, request, login=None, password=None):
        # Busca por login
        # Valida password
        # Retorna usuario
```

### 📡 Views/Endpoints de Autenticação

**Base URL:** `http://localhost:8003/api/auth/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/login/` | POST | ❌ | Login legado (usa TestAuthService) |
| `/login-v2/` | POST | ❌ | Login com API externa (usa AuthenticationService) |
| `/login-test/` | POST | ❌ | Login de teste (sem API externa) |
| `/refresh-token/` | POST | ❌ | Renovar access token |
| `/forgot-password/` | POST | ❌ | Solicitação de reset de senha |
| `/auto-login/` | POST | ❌ | Login via token JWT (email recovery) |
| `/change-password/` | PUT | ✅ | Alterar senha (requer autenticação) |
| `/user_personal_data/` | GET/PUT | ✅ | Dados pessoais do usuário |

### 🔑 LoginView Antigo

**Arquivo:** [backend/autenticacao/views.py](backend/autenticacao/views.py#L24-L50)

```python
class LoginView(APIView):
    permission_classes = [AllowAny]
    
    POST: {login, password}
    
    Response: {
        success: boolean,
        access_token: string,
        refresh_token: string,
        user: {id_usuario, login, nome, email, nivel_acesso}
    }
```

Usa `TestAuthService.login()` que é um wrapper simplificado.

### 📡 Serializers de Autenticação

**Arquivo:** [backend/autenticacao/auth_serializers.py](backend/autenticacao/auth_serializers.py)

```python
class LoginSerializer(Serializer):
    login: CharField(max_length=50)
    password: CharField(max_length=255, write_only=True)

class LoginResponseSerializer(Serializer):
    success: BooleanField
    access_token: CharField
    refresh_token: CharField
    access_token_expires_in: IntegerField
    user: DictField

class RefreshTokenSerializer(Serializer):
    refresh_token: CharField(max_length=255)

class RefreshTokenLocalSerializer(ModelSerializer):
    Meta:
        model = RefreshTokenLocal
        fields = ['id', 'refresh_token', 'access_token', 'last_validated_at', 'created_at']
        read_only_fields = ['id', 'last_validated_at', 'created_at']
```

---

## 📊 BACKEND DJANGO - MODELOS DE DADOS

### Modelo: Corridas

**Localização:** [backend/autenticacao/models.py](backend/autenticacao/models.py#L148-L250)

```python
class Corridas(models.Model):
    # PK
    id_corrida              # AutoField (PK)
    
    # Rota
    ponto_inicio            # CharField(255) - ponto de partida
    ponto_chegada           # CharField(255) - destino final
    paradas_intermediarias  # JSONField (lista de paradas)
                            # [{"nome": "Local X", "endereco": "Rua Y", "ordem": 0}]
    
    # Pessoas
    solicitante             # CharField(255, nullable)
    motorista              # ForeignKey(Usuario, SET_NULL) - motorista responsável
    criado_por             # ForeignKey(Usuario, SET_NULL) - quem solicitou
    
    # Veículo
    veiculo                # ForeignKey(Veiculo, SET_NULL) - veículo alocado
    
    # Horários
    horario_saida          # TimeField (HH:MM)
    horario_retorno        # TimeField (HH:MM, nullable)
    horario_inicio         # TimeField (HH:MM, nullable)
    
    # Informações de Serviço
    servico                # TextField(nullable) - tipo de serviço
    destinos               # TextField(nullable) - destinos detalhados
    observacao             # TextField(nullable) - observações
    
    # Status
    status                 # CharField (choices abaixo)
    
    # Timestamps
    data_solicitacao       # DateTimeField (auto_now_add)
    data_inicio            # DateField (data da corrida)
    data_conclusao         # DateTimeField (nullable)
    data_cancelamento      # DateTimeField (nullable)
    ultima_atualizacao     # DateTimeField (auto_now)
    
    class Meta:
        db_table = 'Corridas'
        indexes = [
            Index(fields=['status']),
            Index(fields=['motorista']),
            Index(fields=['veiculo']),
            Index(fields=['data_solicitacao']),
        ]
```

**Status Choices:**
```python
StatusChoices:
  'pendente'                    # Aguardando confirmação
  'confirmada'                  # Confirmada pelo admin
  'reconfirmacao_necessaria'    # Requer confirmação do motorista
  'em_andamento'                # Corrida em progresso
  'concluida'                   # Corrida finalizada
  'cancelada'                   # Cancelada
  'recusada'                    # Recusada pelo motorista
```

**Métodos Importantes:**
```python
adicionar_parada(nome, endereco, ordem)   # Adiciona parada intermediária
remover_parada(indice)                    # Remove parada
obter_todos_pontos()                      # Retorna [inicio, paradas..., chegada]
get_paradas()                             # Retorna paradas_intermediarias
confirmar()                               # Muda status para confirmada
```

### Modelo: Veiculo

**Localização:** [backend/autenticacao/models.py](backend/autenticacao/models.py)

```python
class Veiculo(models.Model):
    id_veiculo              # AutoField (PK)
    nome                    # CharField(50)
    placa                   # CharField(8, unique) - placa do veículo
    status                  # CharField (choices: 'DISPONIVEL', etc)
    
    class Meta:
        db_table = 'Veiculos'
```

### Modelo: Notificacao

```python
class Notificacao(models.Model):
    id_notificacao          # AutoField (PK)
    usuario                 # ForeignKey(Usuario)
    corrida                 # ForeignKey(Corridas, nullable)
    titulo                  # CharField
    mensagem                # TextField
    tipo                    # CharField (choices)
    lida                    # BooleanField (default=False)
    data_criacao            # DateTimeField (auto_now_add)
    data_leitura            # DateTimeField (nullable)
    
    class Meta:
        db_table = 'Notificacoes'
```

### 📡 Serializers de Modelos

**Arquivo:** [backend/autenticacao/serializers.py](backend/autenticacao/serializers.py)

```python
class UsuarioSerializer(ModelSerializer):
    fields = ['id_usuario', 'nome', 'login', 'nivel_acesso']

class UserDetailSerializer(ModelSerializer):
    fields = ['id_usuario', 'nome', 'telefone', 'matricula', 'email', 'login', 'nivel_acesso']
    read_only_fields = ['id_usuario', 'email', 'login', 'matricula', 'nivel_acesso']

class ChangePasswordSerializer(Serializer):
    senhaAtual: CharField
    novaSenha: CharField(min_length=6)
    confirmarSenha: CharField

class VeiculoSerializer(ModelSerializer):
    fields = ['id_veiculo', 'nome', 'placa', 'status']

class MotoristaSerializer(ModelSerializer):
    fields = ['id_usuario', 'nome', 'email', 'telefone', 'status']

class CorridaSerializer(ModelSerializer):
    veiculo_nome = CharField(source='veiculo.nome', read_only=True)
    veiculo_placa = CharField(source='veiculo.placa', read_only=True)
    motorista_nome = CharField(source='motorista.nome', read_only=True)
    criado_por_nome = CharField(source='criado_por.nome', read_only=True)
    fields = '__all__'

class NotificacaoSerializer(ModelSerializer):
    usuario_nome = CharField(source='usuario.nome', read_only=True)
    corrida_id_corrida = IntegerField(source='corrida.id_corrida', read_only=True, allow_null=True)
    fields = ['id_notificacao', 'usuario', 'usuario_nome', 'corrida', 'titulo', 'mensagem', 'tipo', 'lida', 'data_criacao', 'data_leitura']
    read_only_fields = ['id_notificacao', 'usuario', 'data_criacao', 'data_leitura']
```

---

## 🎨 FRONTEND REACT - ARQUITETURA

### Estrutura de Diretórios

```
frontend/src/
├── api/
│   ├── axios.ts                 # Configuração do axios com interceptores
│   └── api.test.tsx
├── assets/                      # Imagens, ícones, logos
├── components/
│   ├── common/
│   │   ├── Navigation.tsx       # Menu de navegação
│   │   ├── HeaderFULL.tsx       # Header principal
│   │   ├── SideBarMenu.tsx      # Menu lateral (admin)
│   │   ├── BottomMenu.tsx       # Menu inferior (motorista)
│   │   ├── NotificationBell.tsx # Sino de notificações
│   │   ├── StatusDropdown.tsx   # Dropdown de status
│   │   ├── TagStatus.tsx        # Tag visual de status
│   │   └── SettingsMenu.tsx     # Menu de configurações
│   ├── corridas/                # Componentes de corridas
│   ├── dados/                   # Componentes de dados pessoais
│   ├── form/                    # Componentes de formulário
│   ├── geral/                   # Componentes gerais
│   ├── home/                    # Componentes de home
│   ├── login/                   # Componentes de login
│   ├── motoristas/              # Componentes de motoristas
│   ├── notificações/            # Componentes de notificações
│   └── veiculos/                # Componentes de veículos
├── contexts/
│   └── AuthContext.tsx          # Context de autenticação global
├── hooks/
│   └── useCRUD.ts               # Hook customizado para CRUD
├── pages/
│   ├── HomePage.tsx             # Home admin (dashboard)
│   ├── LoginPage.tsx            # Página de login
│   ├── AutoLoginPage.tsx        # Auto-login via token
│   ├── EsqueceuPage.tsx         # Recuperação de senha
│   ├── AlterarSenhaPage.tsx     # Alterar senha
│   ├── DadosPessoaisPage.tsx    # Editar dados pessoais
│   ├── CorridasPage.tsx         # Gestão de corridas (admin)
│   ├── MotoristasPage.tsx       # Gestão de motoristas (admin)
│   ├── VeiculosPage.tsx         # Gestão de veículos (admin)
│   ├── NotificacoesPage.tsx     # Notificações (admin)
│   ├── GerarRelatorioPage.tsx   # Gerar relatório (admin)
│   ├── Agendamento/
│   │   └── Agendamento.tsx      # Agendamento de corridas (motorista)
│   ├── Admin/                   # Páginas de admin
│   └── FormPage.tsx             # Formulário genérico
├── routes/
│   ├── AppRoutes.tsx            # Definição de rotas principais
│   ├── RequireAuth.tsx          # Wrapper para autenticação
│   └── RequireAdminAuth.tsx     # Wrapper para autenticação admin
├── services/                    # Serviços auxiliares
├── types/                       # Tipos TypeScript
├── config/
│   └── formConfigs.ts           # Configurações de formulários
├── App.tsx                      # Componente raiz
├── main.tsx                     # Entry point
└── index.tsx                    # Bootstrap

config/
├── tailwind.config.ts           # Configuração Tailwind
├── vite.config.ts               # Configuração Vite
├── tsconfig.json                # Configuração TypeScript
└── jest.config.js               # Configuração Jest
```

### 🔐 AuthContext

**Arquivo:** [frontend/src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx)

```typescript
export interface User {
  id: number;
  login: string;
  nome: string;
  email: string;
  nivel_acesso?: string | number;  // 1=admin, 3=motorista, 5=default
  groups?: Array<{id: number, name: string}>;
  is_staff?: boolean;
  is_superuser?: boolean;
}

interface AuthContextType {
  user: User | null;              // Usuário atual
  isAuthenticated: boolean;       // Usuário logado?
  isLoading: boolean;             // Carregando?
  userRole: UserRole;            // 'admin' | 'motorista' | 'unknown'
  logout: () => void;            // Função logout
  setUser: (user: User) => void; // Atualizar usuário
}

export const AuthProvider: React.FC<{children}> = ({children}) => {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Determina role
  const getUserRole = (userData: User | null): UserRole => {
    if (!userData) return 'unknown';
    
    // Admin: nivel_acesso == 'admin' || 1 || is_superuser || is_staff
    // Motorista: nivel_acesso == 'motorista' || 3 || groups.includes('motorista')
    // Unknown: outros
    
    // Implementação: ver código-fonte
  };
  
  // Carrega usuário do localStorage ao montar
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        logout();
      }
    }
    setIsLoading(false);
  }, []);
  
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{user, isAuthenticated, isLoading, userRole, logout, setUser}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};
```

### 🌐 Configuração Axios

**Arquivo:** [frontend/src/api/axios.ts](frontend/src/api/axios.ts)

```typescript
const baseURLs = [
  'http://localhost:8003/api/auth',
];

const api = axios.create({
  baseURL: baseURLs[0],
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor: adiciona token de autenticação automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

export default api;
```

**Fluxo de Requisição:**
```
Componente
    ↓
  api.get/post/put/delete(...) 
    ↓
Interceptor Request
  (adiciona token ao header)
    ↓
  Requisição HTTP
    ↓
Backend API
    ↓
Resposta
    ↓
Componente
```

### 📱 Rotas Principais

**Arquivo:** [frontend/src/routes/AppRoutes.tsx](frontend/src/routes/AppRoutes.tsx)

| Rota | Componente | Auth Requerida | Papel |
|------|-----------|----------------|-------|
| `/` | LoginPage | ❌ | Público |
| `/auto-login?token=X` | AutoLoginPage | ❌ | Recuperação senha |
| `/esqueceu-senha` | EsqueceuPage | ❌ | Público |
| `/home` | HomePage | ✅ | **Admin** |
| `/agendamento` | Agendamento | ✅ | **Motorista** |
| `/corridas` | CorridasPage | ✅ | **Admin** |
| `/corridas/novo` | FormPage | ✅ | **Admin** |
| `/corridas/editar/:id` | FormPage | ✅ | **Admin** |
| `/motoristas` | MotoristasPage | ✅ | **Admin** |
| `/motoristas/novo` | FormPage | ✅ | **Admin** |
| `/motoristas/editar/:id` | FormPage | ✅ | **Admin** |
| `/veiculos` | VeiculosPage | ✅ | **Admin** |
| `/veiculos/novo` | FormPage | ✅ | **Admin** |
| `/veiculos/editar/:id` | FormPage | ✅ | **Admin** |
| `/notificacoes` | NotificacoesPage | ✅ | **Admin** |
| `/motorista/notificacoes` | MotoristaNotificacoesPage | ✅ | **Motorista** |
| `/dados-pessoais` | DadosPessoaisPage | ✅ | **Autenticado** |
| `/alterar-senha` | AlterarSenhaPage | ✅ | **Autenticado** |
| `/not-found` | NotFoundPage | ❌ | Público |
| `*` (fallback) | NotFoundPage | ❌ | Público |

### 🔒 Proteção de Rotas

#### RequireAuth (Autenticado)
**Arquivo:** [frontend/src/routes/RequireAuth.tsx](frontend/src/routes/RequireAuth.tsx)

```typescript
const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  const user = localStorage.getItem('user');

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

// Uso: <Route path="/dados-pessoais" element={<RequireAuth><DadosPessoaisPage /></RequireAuth>} />
```

#### RequireAdminAuth (Admin apenas)
**Arquivo:** [frontend/src/routes/RequireAdminAuth.tsx](frontend/src/routes/RequireAdminAuth.tsx)

```typescript
const determineUserRole = (userData: any): 'admin' | 'motorista' | 'unknown' => {
  if (!userData) return 'unknown';
  
  if (userData.nivel_acesso === 'admin' || userData.nivel_acesso === 1 || 
      userData.is_superuser || userData.is_staff) {
    return 'admin';
  }
  
  if (userData.groups?.length > 0) {
    const groupNames = userData.groups.map((g: any) => g.name.toLowerCase());
    if (groupNames.includes('admin') || groupNames.includes('operador')) {
      return 'admin';
    }
  }
  
  return 'unknown';
};

const RequireAdminAuth = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  const user = localStorage.getItem('user');

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  try {
    const parsedUser = JSON.parse(user);
    const role = determineUserRole(parsedUser);
    
    if (role !== 'admin') {
      return <Navigate to="/not-found" replace />;
    }

    return children;
  } catch {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
};
```

### 📄 Página: LoginPage

**Arquivo:** [frontend/src/pages/LoginPage.tsx](frontend/src/pages/LoginPage.tsx#L1-L150)

```typescript
const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({login: '', password: ''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const determineUserRole = (userData: any): 'admin' | 'motorista' => {
    // Lógica idêntica ao RequireAdminAuth
    // Retorna 'admin' ou 'motorista'
  };

  const getNavigationPath = (userData: any): string => {
    const role = determineUserRole(userData);
    return role === 'admin' ? '/home' : '/agendamento';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // DEV: acesso rápido com login=1 && password=1
      if (formData.login === '1' && formData.password === '1') {
        localStorage.setItem('token', 'mock-token-for-dev');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          login: 'dev',
          nome: 'Usuário de Desenvolvimento',
          email: 'dev@example.com',
          nivel_acesso: 'admin'
        }));
        navigate(getNavigationPath({nivel_acesso: 'admin'}), {replace: true});
        return;
      }

      // Login normal via API
      const response = await api.post('/login/', formData);
      const data = response.data;

      // Suporta dois formatos: antigo e novo
      const token = data.access_token || data.token;
      const user = data.user || {
        id_usuario: data.user_id,
        login: data.login,
        nome: data.nome,
        email: data.email,
        nivel_acesso: data.nivel_acesso
      };

      if (token && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('refresh_token', data.refresh_token || '');
        localStorage.setItem('user', JSON.stringify({
          id: user.id || user.id_usuario,
          login: user.login,
          nome: user.nome,
          email: user.email,
          nivel_acesso: user.nivel_acesso
        }));

        navigate(getNavigationPath(user), {replace: true});
      } else {
        setError('Resposta inválida do servidor');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Usuário ou senha inválidos';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* JSX: header, inputs, button, error message */}
    </form>
  );
};
```

**Fluxo no LoginPage:**
```
Usuário Insere Credenciais
         ↓
Clica em "Entrar"
         ↓
handleSubmit() chamado
         ↓
Se login=1 && password=1: ✓ Rota rápida (DEV)
         ↓
Caso contrário: api.post('/login/', {login, password})
         ↓
API retorna: {access_token, refresh_token, user: {...}}
         ↓
Salva em localStorage:
  - token (access_token)
  - refresh_token
  - user (JSON)
         ↓
Determina role (admin vs motorista)
         ↓
Navega para:
  - /home se admin
  - /agendamento se motorista
```

### 📄 Página: HomePage

**Arquivo:** [frontend/src/pages/HomePage.tsx](frontend/src/pages/HomePage.tsx)

```typescript
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  interface Stats {
    motoristas: {total, ativos, inativos};
    veiculos: {total, disponiveis, indisponiveis};
    corridas: {hoje, pendentes_hoje, em_andamento};
    ultima_atualizacao: string;
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await api.get('/home/stats/', {
          headers: {'Authorization': `Bearer ${token}`}
        });
        setStats(response.data);
      } catch (err) {
        console.error('Erro ao carregar estatísticas:', err);
      }
    };

    fetchStats();
  }, [navigate]);

  return (
    <div>
      <Header title="Início" />
      <SideBarMenu />
      <main>
        <div className="dashboard-cards">
          <MetricCard value={stats?.corridas.hoje} label="Corridas de Hoje" />
          <MetricCard value={stats?.corridas.em_andamento} label="Em Andamento" />
          <MetricCard value={stats?.motoristas.ativos} label="Motoristas Ativos" />
          <MetricCard value={stats?.veiculos.disponiveis} label="Veículos Disponíveis" />
        </div>
        <div onClick={() => navigate("/gerar-relatorio")}>
          Gerar Relatório
        </div>
      </main>
    </div>
  );
};
```

### 📄 Página: Agendamento (Motorista)

**Arquivo:** [frontend/src/pages/Agendamento/Agendamento.tsx](frontend/src/pages/Agendamento/Agendamento.tsx#L1-L150)

```typescript
interface Corridas {
  id_corrida?: number;
  ponto_inicio: string;
  ponto_chegada: string;
  data_solicitacao: string;
  horario_saida: string;       // "HH:MM"
  horario_retorno?: string;    // "HH:MM" (opcional)
  status: 'pendente' | 'confirmada' | 'reconfirmacao_necessaria' | 
          'em_andamento' | 'concluida' | 'cancelada' | 'recusada';
  motorista?: number;
  veiculo?: number;
  motorista_nome?: string;
}

const Agendamento: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'motorista' | 'unknown'>('unknown');
  const [rides, setRides] = useState<Corridas[]>([]);
  const [historico, setHistorico] = useState<Corridas[]>([]);

  // Autenticação
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!storedUser || !token) {
      navigate('/', {replace: true});
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      const role = determineUserRole(parsedUser);
      
      if (role !== 'motorista') {
        setError('Acesso negado: esta página é destinada a motoristas.');
        navigate('/', {replace: true});
        return;
      }
      
      setUser(parsedUser);
      setUserRole(role);
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/', {replace: true});
    }
  }, [navigate]);

  // Carrega corridas
  useEffect(() => {
    const loadRides = async () => {
      if (!user || userRole !== 'motorista') return;

      try {
        const response = await api.get('/corrida/');
        let ridesData = response.data;

        if (ridesData && typeof ridesData === 'object' && !Array.isArray(ridesData) && 'data' in ridesData) {
          ridesData = ridesData.data;
        }

        if (!Array.isArray(ridesData)) {
          ridesData = [];
        }

        // Filtra corridas do motorista logado
        const myRides = ridesData.filter((r: Corridas) => {
          const rideMotoristaId = r.motorista || r.motorista_id;
          const rideMotoristaName = r.motorista_nome?.toLowerCase() || '';
          const currentUserName = user.nome?.toLowerCase() || '';
          const currentUserId = user.id_usuario;

          return (
            rideMotoristaId === currentUserId ||
            rideMotoristaName === currentUserName
          );
        });

        // Ordena corridas
        const sorted = myRides.sort(sortRides);
        
        // Separa em: corridas ativas vs histórico
        const active = sorted.filter(r => 
          ['pendente', 'confirmada', 'reconfirmacao_necessaria', 'em_andamento'].includes(r.status)
        );
        const history = sorted.filter(r =>
          ['concluida', 'cancelada', 'recusada'].includes(r.status)
        );

        setRides(active);
        setHistorico(history);
      } catch (err) {
        console.error('Erro ao carregar corridas:', err);
        setError('Erro ao carregar corridas');
      }
    };

    loadRides();
  }, [user, userRole]);

  // Métodos de ação
  const handleAceitar = async (id_corrida: number) => {
    try {
      const response = await api.patch(`/corrida/${id_corrida}/`, {
        status: 'confirmada'
      });
      
      // Atualiza estado local
      setRides(rides.map(r => 
        r.id_corrida === id_corrida ? {... r, status: 'confirmada'} : r
      ));
    } catch (err) {
      console.error('Erro ao aceitar corrida:', err);
    }
  };

  const handleRecusar = async (id_corrida: number) => {
    try {
      const response = await api.post(`/corrida/${id_corrida}/recusar/`, {});
      
      // Move para histórico
      const ride = rides.find(r => r.id_corrida === id_corrida);
      if (ride) {
        setRides(rides.filter(r => r.id_corrida !== id_corrida));
        setHistorico([...historico, {... ride, status: 'recusada'}]);
      }
    } catch (err) {
      console.error('Erro ao recusar corrida:', err);
    }
  };

  return (
    <div className="agendamento-container">
      <Header title="Minhas Corridas" />
      <SettingsMenu />
      
      <main>
        {/* Minhas Corridas (ativas) */}
        <section className="rides-section">
          {rides.map(ride => (
            <RideCard key={ride.id_corrida} ride={ride} 
              onAceitar={() => handleAceitar(ride.id_corrida!)}
              onRecusar={() => handleRecusar(ride.id_corrida!)}
            />
          ))}
        </section>

        {/* Histórico de Corridas (concluídas/canceladas) */}
        <section className="history-section">
          {historico.map(ride => (
            <RideCard key={ride.id_corrida} ride={ride} />
          ))}
        </section>
      </main>
    </div>
  );
};
```

---

## 🔐 PERMISSÕES E CONTROLE DE ACESSO

### Sistema de Níveis de Acesso

```
nivel_acesso
├── 1 = ADMIN (Superadmin)
│   ├── Acesso a: /home
│   ├── Acesso a: /corridas
│   ├── Acesso a: /motoristas
│   ├── Acesso a: /veiculos
│   ├── Acesso a: /notificacoes
│   ├── Acesso a: /gerar-relatorio
│   └── Permissions: todas
│
├── 3 = MOTORISTA (Driver)
│   ├── Acesso a: /agendamento
│   ├── Acesso a: /dados-pessoais
│   ├── Acesso a: /alterar-senha
│   ├── Acesso a: /motorista/notificacoes
│   └── Permissions: limitadas
│
└── 5 = DEFAULT (Usuário comum)
    ├── Acesso a: /dados-pessoais
    ├── Acesso a: /alterar-senha
    └── Permissions: mínimas
```

### Detecção de Role

**Backend:**
```python
# models.py - Usuario
is_superuser    # True se nivel_acesso == 1
is_staff        # True se nivel_acesso <= 5
is_active       # True sempre (baseado em status)
has_perm()      # True se nivel_acesso <= 2

def has_perm(self, perm, obj=None):
    return self.nivel_acesso <= 2  # Apenas admin e acima
```

**Frontend:**
```typescript
// AuthContext.tsx / LoginPage.tsx / RequireAdminAuth.tsx
const determineUserRole = (userData: User | null): UserRole => {
  if (!userData) return 'unknown';

  // Admin
  if (userData.nivel_acesso === 'admin' ||  // String
      userData.nivel_acesso === 1 ||         // Number
      userData.is_superuser ||
      userData.is_staff) {
    return 'admin';
  }

  // Check groups
  if (userData.groups?.length > 0) {
    const groupNames = userData.groups.map(g => g.name.toLowerCase());
    if (groupNames.includes('motorista') || 
        groupNames.includes('driver')) {
      return 'motorista';
    }
  }

  // Motorista
  if (userData.nivel_acesso === 'motorista' ||
      userData.nivel_acesso === 'driver' ||
      userData.nivel_acesso === 3) {
    return 'motorista';
  }

  return 'unknown';
};
```

### Endpoint Permissions

| Endpoint | Admin | Motorista | Anônimo |
|----------|-------|-----------|---------|
| POST `/login/` | ✅ | ✅ | ✅ |
| POST `/forgot-password/` | ✅ | ✅ | ✅ |
| POST `/auto-login/` | ✅ | ✅ | ✅ |
| PUT `/change-password/` | ✅ | ✅ | ❌ |
| GET/PUT `/user_personal_data/` | ✅ | ✅ | ❌ |
| GET `/corrida/` | ✅ | ✅ | ❌ |
| POST `/corrida/` | ✅ | ❌ | ❌ |
| PATCH `/corrida/<id>/` | ✅ | ✅ | ❌ |
| POST `/corrida/<id>/recusar/` | ✅ | ✅ | ❌ |
| GET `/veiculos/` | ✅ | ✅ | ✅ |
| POST `/veiculos/` | ✅ | ❌ | ❌ |
| GET `/motoristas/` | ✅ | ❌ | ❌ |
| POST `/motoristas/novo/` | ✅ | ❌ | ❌ |
| GET `/home/stats/` | ✅ | ❌ | ❌ |
| GET `/notificacoes/` | ✅ | ✅ | ❌ |

---

## 🔄 FLUXOS DE NEGÓCIO

### 1️⃣ FLUXO DE LOGIN

```
┌─ USUÁRIO ACESSA http://localhost:5173
│
├─ Renderiza LoginPage
│   ├─ Input: login
│   ├─ Input: password
│   └─ Botão: Entrar
│
├─ Usuário clica Entrar
│   ├─ handleSubmit() chamado
│   │
│   ├─ Dev quick access?
│   │   └─ login=1 && password=1
│   │       ├─ localStorage.setItem('token', 'mock-token-for-dev')
│   │       ├─ localStorage.setItem('user', {id:1, nivel_acesso:'admin'})
│   │       └─ navigate('/home')
│   │
│   └─ Caso contrário:
│       ├─ api.post('/login/', {login, password})
│       │
│       ├─ BACKEND:
│       │   ├─ LoginView.post()
│       │   ├─ TestAuthService.login(login, password)
│       │   ├─ Retorna: {success, access_token, refresh_token, user}
│       │   └─ API Status: 200 OK
│       │
│       ├─ FRONTEND recebe response
│       │   ├─ token = response.data.access_token
│       │   ├─ user = response.data.user
│       │   └─ response.data.refresh_token
│       │
│       ├─ Salva em localStorage
│       │   ├─ localStorage['token'] = access_token
│       │   ├─ localStorage['refresh_token'] = refresh_token
│       │   └─ localStorage['user'] = JSON.stringify(user)
│       │
│       ├─ Determina role
│       │   └─ nivel_acesso == 1 ? 'admin' : 'motorista'
│       │
│       └─ navigate()
│           ├─ Admin: /home (HomePage)
│           └─ Motorista: /agendamento (Agendamento)
│
└─ ✅ Usuário autenticado
```

**Request/Response:**

```bash
# REQUEST
POST http://localhost:8003/api/auth/login/
Content-Type: application/json

{
  "login": "admin_user",
  "password": "senha123"
}

# RESPONSE 200 OK
{
  "success": true,
  "access_token": "eyJhbGc...",
  "refresh_token": "abc123...",
  "user": {
    "id_usuario": 1,
    "login": "admin_user",
    "nome": "Administrador",
    "email": "admin@cesmac.edu.br",
    "nivel_acesso": 1
  }
}
```

### 2️⃣ FLUXO DE AGENDAMENTO DE CORRIDA

```
┌─ MOTORISTA ACESSA /agendamento
│
├─ Carrega Agendamento.tsx
│   ├─ useEffect: Verifica autenticação
│   │   ├─ localStorage.getItem('user')
│   │   ├─ localStorage.getItem('token')
│   │   └─ Confirma role === 'motorista'
│   │
│   └─ useEffect: Carrega corridas
│       ├─ api.get('/corrida/')
│       │
│       ├─ BACKEND:
│       │   ├─ CorridaViewSet.list()
│       │   ├─ Retorna todas as corridas
│       │   └─ API Status: 200 OK
│       │
│       ├─ FRONTEND filtra
│       │   ├─ Corridas do motorista logado
│       │   │   └─ r.motorista_id === user.id_usuario
│       │   │
│       │   ├─ Separa em:
│       │   │   ├─ Corridas ativas (pendente, confirmada, reconfirmacao_necessaria, em_andamento)
│       │   │   └─ Histórico (concluida, cancelada, recusada)
│       │   │
│       │   └─ Ordena:
│       │       ├─ Prioridade: em_andamento > reconfirmacao > pendente > confirmada
│       │       ├─ Depois por data (mais recente primeiro)
│       │       └─ Depois por horário (mais cedo primeiro)
│       │
│       └─ setState(rides, historico)
│
├─ Renderiza UI
│   ├─ Minhas Corridas (seção ativa)
│   │   ├─ RideCard com status visual (TagStatus)
│   │   ├─ Informações: ponto_inicio, ponto_chegada, horario_saida
│   │   ├─ Botões: [Aceitar] [Recusar]
│   │   └─ Status cor-codificado
│   │
│   └─ Histórico de Corridas (seção encerrada)
│       ├─ Corridas concluídas, canceladas, recusadas
│       └─ Visualização apenas (sem ações)
│
├─ MOTORISTA CLICA [Aceitar]
│   ├─ handleAceitar(id_corrida)
│   ├─ api.patch(`/corrida/${id_corrida}/`, {status: 'confirmada'})
│   │
│   ├─ BACKEND:
│   │   ├─ CorridaViewSet.partial_update()
│   │   ├─ corrida.status = 'confirmada'
│   │   ├─ corrida.save()
│   │   └─ Retorna corrida atualizada
│   │
│   └─ FRONTEND
│       ├─ Atualiza estado local
│       ├─ Corrida agora mostra status 'confirmada'
│       └─ UI atualiza visualmente
│
└─ FLUXO ALTERNATIVO: MOTORISTA CLICA [Recusar]
    ├─ handleRecusar(id_corrida)
    ├─ api.post(`/corrida/${id_corrida}/recusar/`, {})
    │
    ├─ BACKEND:
    │   ├─ CorridaViewSet.recusar()
    │   ├─ corrida.status = 'recusada'
    │   ├─ corrida.data_cancelamento = now()
    │   ├─ corrida.save()
    │   └─ Cria notificação para admin
    │
    └─ FRONTEND
        ├─ Remove da seção "Minhas Corridas"
        ├─ Move para "Histórico"
        └─ Status = 'recusada' (cor vermelha)
```

### 3️⃣ FLUXO DE RECUPERAÇÃO DE SENHA

```
┌─ USUÁRIO ACESSA /esqueceu-senha
│
├─ Carrega EsqueceuPage
│   └─ Input: email corporativo
│
├─ Usuário insere email e clica "Recuperar"
│   ├─ api.post('/forgot-password/', {email})
│   │
│   ├─ BACKEND:
│   │   ├─ ForgotPasswordView.post()
│   │   ├─ Valida: email.endswith('@cesmac.edu.br')
│   │   ├─ Usuario.objects.get(email=email)
│   │   │
│   │   ├─ Gera JWT com exp=1h
│   │   │   └─ payload: {user_id, login, email, nome, nivel_acesso, force_password_change: True}
│   │   │
│   │   ├─ Monta URL
│   │   │   └─ reset_url = "{FRONTEND_URL}/auto-login?token={jwt}&force_change=true"
│   │   │
│   │   ├─ send_mail()
│   │   │   └─ Envia email com link de recuperação
│   │   │
│   │   └─ Retorna: {message: "Email enviado com sucesso"}
│   │
│   └─ FRONTEND mostra mensagem de sucesso
│
├─ USUÁRIO CLICA NO LINK NO EMAIL
│   ├─ Navega para: /auto-login?token=<jwt>
│   ├─ Renderiza AutoLoginPage
│   │
│   ├─ useEffect: Extrai token da URL
│   │   ├─ const token = new URLSearchParams(location.search).get('token')
│   │   ├─ api.post('/auto-login/', {token})
│   │   │
│   │   ├─ BACKEND:
│   │   │   ├─ AutoLoginView.post()
│   │   │   ├─ jwt.decode(token, SECRET_KEY)
│   │   │   ├─ Usuario.objects.get(id_usuario=payload['user_id'])
│   │   │   ├─ Gera novo RefreshToken (SimpleJWT)
│   │   │   └─ Retorna: {token, refresh, user_id, login, nome, email, nivel_acesso, force_password_change: true}
│   │   │
│   │   └─ FRONTEND
│   │       ├─ localStorage['token'] = novo token
│   │       ├─ localStorage['user'] = user_data
│   │       ├─ Se force_password_change == true:
│   │       │   └─ navigate('/alterar-senha')
│   │       └─ Senão:
│   │           └─ navigate('/home' ou '/agendamento')
│   │
│   └─ ✅ Usuário pode alterar senha sem entrar
│
└─ FLUXO FINAL: Usuário em AlterarSenhaPage
    ├─ PUT /change-password/
    │   ├─ senhaAtual (obrigatória)
    │   ├─ novaSenha (min 6 caracteres)
    │   └─ confirmarSenha (deve coincidir)
    │
    ├─ BACKEND:
    │   ├─ ChangePasswordView.put()
    │   ├─ Valida senhaAtual com user.check_password()
    │   ├─ user.set_password(novaSenha)
    │   ├─ user.save()
    │   └─ Retorna: {message: "Senha alterada com sucesso"}
    │
    └─ FRONTEND
        ├─ Mostra mensagem de sucesso
        └─ navigate('/home' ou '/agendamento')
```

### 4️⃣ FLUXO DE EDIÇÃO DE DADOS PESSOAIS

```
┌─ USUÁRIO AUTENTICADO ACESSA /dados-pessoais
│
├─ Carrega DadosPessoaisPage
│   ├─ useEffect: Carrega dados atuais
│   │   ├─ api.get('/user_personal_data/')
│   │   │
│   │   ├─ BACKEND:
│   │   │   ├─ user_personal_data() - GET
│   │   │   ├─ UserDetailSerializer(user)
│   │   │   └─ Retorna: {id_usuario, nome, telefone, matricula, email, login, nivel_acesso}
│   │   │
│   │   └─ FRONTEND popula formulário
│   │       ├─ nome (editável)
│   │       ├─ telefone (editável)
│   │       ├─ matricula (read-only)
│   │       ├─ email (read-only)
│   │       ├─ login (read-only)
│   │       └─ nivel_acesso (read-only)
│   │
│   └─ Renderiza Form
│       ├─ Input: nome
│       ├─ Input: telefone
│       └─ Botões: [Salvar] [Cancelar]
│
├─ Usuário edita dados e clica [Salvar]
│   ├─ api.put('/user_personal_data/', {nome, telefone})
│   │
│   ├─ BACKEND:
│   │   ├─ user_personal_data() - PUT
│   │   ├─ Apenas campos permitidos: ['nome', 'telefone']
│   │   ├─ UserDetailSerializer(user, data=data, partial=True)
│   │   ├─ serializer.save()
│   │   └─ Retorna usuário atualizado
│   │
│   └─ FRONTEND
│       ├─ Atualiza localStorage['user']
│       ├─ Mostra mensagem de sucesso
│       └─ Dados são atualizados na UI
│
└─ ✅ Dados pessoais atualizados
```

### 5️⃣ FLUXO DE GESTÃO DE VEÍCULOS (ADMIN)

```
┌─ ADMIN ACESSA /veiculos
│
├─ Carrega VeiculosPage
│   ├─ useEffect: Carrega lista de veículos
│   │   ├─ api.get('/veiculos/')
│   │   │
│   │   ├─ BACKEND:
│   │   │   ├─ listar_veiculos() - GET
│   │   │   ├─ Veiculo.objects.all()
│   │   │   ├─ VeiculoSerializer(veiculos, many=True)
│   │   │   └─ Retorna: {data: [{id_veiculo, nome, placa, status}, ...]}
│   │   │
│   │   └─ FRONTEND
│   │       ├─ setState(veiculos)
│   │       └─ Renderiza tabela
│   │
│   ├─ Tabela com colunas:
│   │   ├─ Placa
│   │   ├─ Nome
│   │   ├─ Status (DISPONIVEL/INDISPONIVEL)
│   │   ├─ Ações [Editar] [Deletar]
│   │   └─ Botão: [Novo Veículo]
│   │
│   └─ Botão: [Novo Veículo]
│
├─ Admin clica [Novo Veículo]
│   └─ navigate('/veiculos/novo')
│
├─ Carrega FormPage (modo create)
│   ├─ Inputs:
│   │   ├─ nome
│   │   ├─ placa
│   │   └─ status
│   │
│   └─ Clica [Salvar]
│       ├─ api.post('/veiculos/', {nome, placa, status})
│       │
│       ├─ BACKEND:
│       │   ├─ listar_veiculos() - POST
│       │   ├─ VeiculoSerializer(data=request.data)
│       │   ├─ serializer.save()
│       │   └─ Retorna novo veículo com id_veiculo
│       │
│       └─ FRONTEND
│           ├─ navigate('/veiculos')
│           └─ Recarrega lista
│
├─ Admin clica [Editar] em um veículo
│   └─ navigate('/veiculos/editar/:id')
│
├─ Carrega FormPage (modo edit)
│   ├─ useEffect: api.get(`/veiculos/${id}/`)
│   │
│   ├─ BACKEND:
│   │   ├─ veiculo_detail() - GET
│   │   └─ Retorna: {id_veiculo, nome, placa, status}
│   │
│   ├─ Popula formulário
│   └─ Permite editar: nome, status (placa é imutável)
│
└─ Admin clica [Salvar]
    ├─ api.put(`/veiculos/${id}/`, {nome, status})
    │
    ├─ BACKEND:
    │   ├─ veiculo_detail() - PUT
    │   ├─ VeiculoSerializer(veiculo, data=data, partial=True)
    │   ├─ serializer.save()
    │   └─ Retorna veículo atualizado
    │
    └─ FRONTEND
        ├─ navigate('/veiculos')
        └─ Recarrega lista com dados atualizados
```

---

## 📊 MAPA DE DADOS END-TO-END

### Fluxo Completo: Login até Visualizar Corridas (Motorista)

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: AUTENTICAÇÃO                                            │
└─────────────────────────────────────────────────────────────────┘

FRONTEND: LoginPage.tsx                 BACKEND: LoginView
┌──────────────────────┐                ┌───────────────────┐
│ Input: login         │                │                   │
│ Input: password      │──POST──────────>│ /login/           │
│ Click: [Entrar]      │                │ TestAuthService   │
└──────────────────────┘                │   .login()        │
                                        │                   │
                                        │ Valida            │
                                        │ Cria RefreshToken │
                                        └─────────┬─────────┘
                                                  │
                              ┌───────────────────┘
                              │
                              ↓
                        <─────────────
                        Response JSON:
                        {
                          access_token,
                          refresh_token,
                          user: {
                            id_usuario,
                            login,
                            nome,
                            email,
                            nivel_acesso
                          }
                        }
                              │
                              ↓
FRONTEND: localStorage        ↓
├─ token                      │ Salva
├─ refresh_token              │ em
└─ user (JSON)   <────────────┘ localStorage


┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: ROTEAMENTO                                              │
└─────────────────────────────────────────────────────────────────┘

FRONTEND: App.tsx
    ↓
AppRoutes.tsx
    ↓
Verifica: localStorage.getItem('user')
    ├─ nivel_acesso == 1? ──→ navigate('/home') [Admin]
    └─ nivel_acesso == 3? ──→ navigate('/agendamento') [Motorista]


┌─────────────────────────────────────────────────────────────────┐
│ FASE 3: CARREGAMENTO DE DADOS                                   │
└─────────────────────────────────────────────────────────────────┘

FRONTEND: Agendamento.tsx              BACKEND: CorridaViewSet
┌─────────────────────────┐            ┌──────────────────┐
│ useEffect               │            │                  │
│ ├─ Verifica auth       │            │                  │
│ └─ Carrega corridas    │──GET───────>│ /corrida/        │
│    api.get('/corrida/')│            │ list()           │
└────────────┬────────────┘            │                  │
             │                         │ Retorna todas as │
             │                         │ Corridas (array) │
             │                         └────────┬─────────┘
             │                                  │
             │                    <─────────────┘
             │                    Response JSON:
             │                    [
             │                      {
             │                        id_corrida,
             │                        ponto_inicio,
             │                        ponto_chegada,
             │                        motorista_id,
             │                        status,
             │                        ...
             │                      },
             │                      ...
             │                    ]
             │
             ↓
FRONTEND: Filtra & Ordena
├─ Filtra: motorista_id === user.id_usuario
├─ Separa: ativas vs histórico
└─ Ordena: por status + data + horário
    ↓
setState(rides, historico)
    ↓
Renderiza UI


┌─────────────────────────────────────────────────────────────────┐
│ FASE 4: INTERAÇÃO DO USUÁRIO                                    │
└─────────────────────────────────────────────────────────────────┘

MOTORISTA CLICA [Aceitar] EM UMA CORRIDA

FRONTEND: handleAceitar()              BACKEND: CorridaViewSet
┌─────────────────────────┐            ┌──────────────────┐
│ api.patch(                          │                  │
│  `/corrida/${id}/`,                 │                  │
│  {status: 'confirmada'}│──PATCH────>│ partial_update() │
│ )                      │            │                  │
└────────────┬────────────┘            │ corrida.status = │
             │                         │ 'confirmada'     │
             │                         │ corrida.save()   │
             │                         └────────┬─────────┘
             │                                  │
             │                    <─────────────┘
             │                    Response:
             │                    {
             │                      id_corrida,
             │                      status: 'confirmada',
             │                      ...
             │                    }
             │
             ↓
FRONTEND: Estado Local
├─ setRides(
│   rides.map(r =>
│     r.id === id
│     ? {...r, status: 'confirmada'}
│     : r
│   )
│ )
└─ Renderiza com novo status


┌─────────────────────────────────────────────────────────────────┐
│ FASE 5: PERSISTÊNCIA DE AUTENTICAÇÃO                            │
└─────────────────────────────────────────────────────────────────┘

AuthContext.tsx
    ↓
useEffect: ao montar
    ├─ const storedUser = localStorage.getItem('user')
    ├─ setUser(JSON.parse(storedUser))
    └─ Define userRole baseado em nivel_acesso
        ↓
    Componentes consumem via useAuth()
        ├─ user
        ├─ isAuthenticated
        ├─ userRole
        └─ logout()

axios interceptor
    ↓
Toda requisição HTTP
    ├─ const token = localStorage.getItem('token')
    ├─ config.headers.Authorization = `Bearer ${token}`
    └─ Envia automaticamente no header
```

### Estrutura Armazenada no localStorage

```javascript
// localStorage keys no browser

localStorage['token']           // JWT access token (24h)
localStorage['refresh_token']   // Refresh token (7 dias)
localStorage['user']            // User data (JSON stringificado)

// localStorage['user'] exemplo:
{
  id: 5,
  login: "joao_motorista",
  nome: "João da Silva",
  email: "joao@cesmac.edu.br",
  nivel_acesso: 3   // 1=admin, 3=motorista, 5=default
}
```

### API Response vs Frontend Storage

```
API Response                           localStorage
┌──────────────────────────┐          ┌─────────────────────────┐
│ access_token             │──────→   │ token                   │
│ refresh_token            │──────→   │ refresh_token           │
│ user: {                  │          │ user: {                 │
│   id_usuario             │──────→   │   id                    │
│   login                  │──────→   │   login                 │
│   nome                   │──────→   │   nome                  │
│   email                  │──────→   │   email                 │
│   nivel_acesso           │──────→   │   nivel_acesso          │
│ }                        │          │ }                       │
└──────────────────────────┘          └─────────────────────────┘
```

---

## 📌 RESUMO EXECUTIVO

### Tecnologias Principais
- **Backend:** Django REST Framework, SimpleJWT, Hybrid Authentication
- **Frontend:** React 18, TypeScript, React Router, Axios, Context API
- **Banco:** SQLite (dev) / SQL Server (prod)
- **Autenticação:** JWT + Hybrid (JWT + Token tradicional)

### Fluxo de Autenticação
1. User faz login com credentials
2. Backend valida localmente ou na API externa
3. Retorna JWT (24h) + Refresh Token (7d)
4. Frontend armazena em localStorage
5. Axios interceptor adiciona token em toda requisição

### Controle de Acesso
- **Admin (1):** Acesso a dashboard, gestão de corridas/motoristas/veículos
- **Motorista (3):** Acesso a agendamento de corridas
- **Default (5):** Acesso básico

### Principais Endpoints
| Rota | Auth | Descrição |
|------|------|-----------|
| `POST /login/` | ❌ | Autenticação |
| `GET /corrida/` | ✅ | Listar corridas |
| `PATCH /corrida/<id>/` | ✅ | Aceitar corrida |
| `POST /corrida/<id>/recusar/` | ✅ | Recusar corrida |
| `GET /user_personal_data/` | ✅ | Dados do usuário |
| `GET /home/stats/` | ✅ Admin | Dashboard stats |

### Artefatos Chave
- **Modelos:** Usuario, Corridas, Veiculo, Notificacao, RefreshTokenLocal
- **Serializers:** UsuarioSerializer, CorridaSerializer, VeiculoSerializer, etc.
- **Views:** LoginView, CorridaViewSet, NotificacaoViewSet, etc.
- **Páginas React:** LoginPage, HomePage, Agendamento, DadosPessoaisPage, etc.
- **Componentes:** AuthContext, RequireAuth, RequireAdminAuth, TagStatus, etc.

---

**Documento gerado:** 20 de Maio de 2026
**Versão:** 1.0 - Mapeamento Completo ELIAS
