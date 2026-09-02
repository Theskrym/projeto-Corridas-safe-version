-- ============================================================================
-- CORREÇÃO COMPLETA: Banco de Dados ELIAS
-- Executa todas as correções necessárias
-- ============================================================================

USE Elias;
GO

PRINT '====================================================';
PRINT 'INICIANDO CORREÇÃO COMPLETA DO BANCO ELIAS';
PRINT '====================================================';
GO

-- ============================================================================
-- PASSO 1: Remover tabelas antigas (na ordem correta para evitar FKs)
-- ============================================================================
PRINT '';
PRINT '[1/5] Removendo tabelas antigas...';
DROP TABLE IF EXISTS ELIAS_Notificacoes;
DROP TABLE IF EXISTS ELIAS_refresh_token_local;
DROP TABLE IF EXISTS ELIAS_user_auth_token;
DROP TABLE IF EXISTS ELIAS_Corridas;
DROP TABLE IF EXISTS ELIAS_Veiculos;
DROP TABLE IF EXISTS ELIAS_Usuarios;
PRINT '✓ Tabelas antigas removidas';
GO

-- ============================================================================
-- PASSO 2: Criar tabela de Usuários (SEM status, COM is_active)
-- ============================================================================
PRINT '';
PRINT '[2/5] Criando tabela ELIAS_Usuarios...';
CREATE TABLE ELIAS_Usuarios (
    id_usuario INT PRIMARY KEY IDENTITY(1,1),
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(15),
    matricula VARCHAR(15),
    email VARCHAR(100) NOT NULL UNIQUE,
    login VARCHAR(50) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    nivel_acesso INT DEFAULT 3,
    fcm_token VARCHAR(255),
    data_criacao DATETIME2 NOT NULL DEFAULT GETDATE(),
    last_login DATETIME2,
    is_active BIT NOT NULL DEFAULT 1
);

CREATE INDEX idx_login ON ELIAS_Usuarios(login);
CREATE INDEX idx_email ON ELIAS_Usuarios(email);
CREATE INDEX idx_nivel_acesso ON ELIAS_Usuarios(nivel_acesso);
PRINT '✓ Tabela ELIAS_Usuarios criada';
GO

-- ============================================================================
-- PASSO 3: Criar outras tabelas
-- ============================================================================
PRINT '';
PRINT '[3/5] Criando tabelas de Veículos, Corridas e Notificações...';

-- Tabela de Veículos
CREATE TABLE ELIAS_Veiculos (
    id_veiculo INT PRIMARY KEY IDENTITY(1,1),
    nome VARCHAR(50) NOT NULL,
    placa VARCHAR(30) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'disponivel'
);

CREATE INDEX idx_placa ON ELIAS_Veiculos(placa);
CREATE INDEX idx_status ON ELIAS_Veiculos(status);

-- Tabela de Corridas
CREATE TABLE ELIAS_Corridas (
    id_corrida INT PRIMARY KEY IDENTITY(1,1),
    ponto_inicio VARCHAR(255) NOT NULL,
    solicitante VARCHAR(255),
    destinos VARCHAR(MAX),
    servico VARCHAR(MAX),
    ponto_chegada VARCHAR(255) NOT NULL,
    horario_inicio TIME,
    horario_retorno TIME,
    paradas_intermediarias NVARCHAR(MAX),
    motorista_id INT,
    veiculo_id INT,
    criado_por_id INT,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    data_solicitacao DATETIME2 NOT NULL DEFAULT GETDATE(),
    data_inicio DATE NOT NULL,
    data_conclusao DATETIME2,
    data_cancelamento DATETIME2,
    ultima_atualizacao DATETIME2 NOT NULL DEFAULT GETDATE(),
    observacao VARCHAR(MAX),
    CONSTRAINT fk_corrida_motorista FOREIGN KEY (motorista_id) REFERENCES ELIAS_Usuarios(id_usuario) ON DELETE NO ACTION,
    CONSTRAINT fk_corrida_veiculo FOREIGN KEY (veiculo_id) REFERENCES ELIAS_Veiculos(id_veiculo) ON DELETE NO ACTION,
    CONSTRAINT fk_corrida_criado_por FOREIGN KEY (criado_por_id) REFERENCES ELIAS_Usuarios(id_usuario) ON DELETE NO ACTION
);

CREATE INDEX idx_status ON ELIAS_Corridas(status);
CREATE INDEX idx_motorista ON ELIAS_Corridas(motorista_id);
CREATE INDEX idx_veiculo ON ELIAS_Corridas(veiculo_id);
CREATE INDEX idx_data_solicitacao ON ELIAS_Corridas(data_solicitacao);
CREATE INDEX idx_criado_por ON ELIAS_Corridas(criado_por_id);

-- Tabela de Notificações
CREATE TABLE ELIAS_Notificacoes (
    id_notificacao INT PRIMARY KEY IDENTITY(1,1),
    usuario_id INT NOT NULL,
    corrida_id INT,
    titulo VARCHAR(255) NOT NULL,
    mensagem VARCHAR(MAX) NOT NULL,
    tipo VARCHAR(25) NOT NULL DEFAULT 'ride_created',
    lida BIT DEFAULT 0,
    oculta BIT DEFAULT 0,
    data_criacao DATETIME2 NOT NULL DEFAULT GETDATE(),
    data_leitura DATETIME2,
    FOREIGN KEY (usuario_id) REFERENCES ELIAS_Usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (corrida_id) REFERENCES ELIAS_Corridas(id_corrida) ON DELETE CASCADE
);

CREATE INDEX idx_usuario_data ON ELIAS_Notificacoes(usuario_id, data_criacao DESC);
CREATE INDEX idx_lida ON ELIAS_Notificacoes(lida);
CREATE INDEX idx_tipo ON ELIAS_Notificacoes(tipo);

PRINT '✓ Tabelas de Veículos, Corridas e Notificações criadas';
GO

-- ============================================================================
-- PASSO 4: Criar tabelas de Token (AUTH e REFRESH)
-- ============================================================================
PRINT '';
PRINT '[4/5] Criando tabelas de Tokens...';

-- Tabela de Tokens de Autenticação
CREATE TABLE ELIAS_user_auth_token (
    fcm_key VARCHAR(40) PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    created DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES ELIAS_Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE INDEX idx_user ON ELIAS_user_auth_token(user_id);

-- Tabela de Refresh Tokens Locais
CREATE TABLE ELIAS_refresh_token_local (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL UNIQUE,
    refresh_token NVARCHAR(MAX) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    access_token NVARCHAR(MAX),
    access_token_expires_at DATETIME2,
    last_validated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES ELIAS_Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE INDEX idx_user ON ELIAS_refresh_token_local(user_id);
CREATE INDEX idx_created_at ON ELIAS_refresh_token_local(created_at DESC);

PRINT '✓ Tabelas de Tokens criadas';
GO

-- ============================================================================
-- PASSO 5: Inserir dados de teste
-- ============================================================================
PRINT '';
PRINT '[5/5] Inserindo dados de teste...';

-- Inserir Usuários
INSERT INTO ELIAS_Usuarios (nome, telefone, matricula, email, login, senha, nivel_acesso, is_active)
VALUES 
    ('Admin Sistema', '85987654321', 'ADM001', 'admin@cesmac.edu.br', 'admin', 'pbkdf2_sha256$870000$UZF7VF6qDXuKL2q5f5J6LF$8Hf/xLv9Xvnk9dZX8vL7vZ9dZX8vL7vZ9dZX8vL7vZ8=', 1, 1),
    ('João Silva', '85988776655', 'MOT001', 'motorista1@cesmac.edu.br', 'motorista1', 'pbkdf2_sha256$870000$UZF7VF6qDXuKL2q5f5J6LF$8Hf/xLv9Xvnk9dZX8vL7vZ9dZX8vL7vZ9dZX8vL7vZ8=', 3, 1),
    ('Maria Santos', '85988665544', 'MOT002', 'motorista2@cesmac.edu.br', 'motorista2', 'pbkdf2_sha256$870000$UZF7VF6qDXuKL2q5f5J6LF$8Hf/xLv9Xvnk9dZX8vL7vZ9dZX8vL7vZ9dZX8vL7vZ8=', 3, 1),
    ('Carlos Oliveira', '85988554433', 'OP001', 'operador1@cesmac.edu.br', 'operador1', 'pbkdf2_sha256$870000$UZF7VF6qDXuKL2q5f5J6LF$8Hf/xLv9Xvnk9dZX8vL7vZ9dZX8vL7vZ9dZX8vL7vZ8=', 4, 1);

PRINT CAST(@@ROWCOUNT AS VARCHAR) + ' usuários inseridos';

-- Inserir Veículos
INSERT INTO ELIAS_Veiculos (nome, placa, status)
VALUES 
    ('Van Branca 01', 'ABC-1234', 'disponivel'),
    ('Van Branca 02', 'ABC-1235', 'disponivel'),
    ('Microônibus 01', 'DEF-5678', 'disponivel'),
    ('Microônibus 02', 'GHI-9101', 'manutencao'),
    ('Van Executiva', 'JKL-1121', 'disponivel');

PRINT CAST(@@ROWCOUNT AS VARCHAR) + ' veículos inseridos';

-- Inserir Corridas
INSERT INTO ELIAS_Corridas 
(ponto_inicio, solicitante, destinos, servico, ponto_chegada, horario_inicio, horario_retorno, 
 motorista_id, veiculo_id, criado_por_id, status, data_solicitacao, data_inicio, ultima_atualizacao)
VALUES 
    ('Campus CESMAC Fortaleza', 'Direção', 'Campus CESMAC Maracanau', 'Transporte de Professores', 'Campus CESMAC Maracanau', 
     '08:00:00', '12:00:00', 2, 1, 1, 'confirmada', GETDATE(), CAST(GETDATE() AS DATE), GETDATE()),
    ('Dormitório Universitário', 'Alunos', 'Campus CESMAC Fortaleza', 'Transporte de Alunos', 'Campus CESMAC Fortaleza', 
     '07:30:00', '08:30:00', 3, 2, 1, 'pendente', GETDATE(), CAST(GETDATE() AS DATE), GETDATE()),
    ('Campus CESMAC Fortaleza', 'Eventos', 'Centro de Fortaleza', 'Transporte para Evento', 'Centro de Fortaleza', 
     '18:00:00', '23:00:00', 2, 3, 1, 'confirmada', DATEADD(DAY, 1, GETDATE()), CAST(DATEADD(DAY, 1, GETDATE()) AS DATE), GETDATE()),
    ('Zona Leste', 'Administrativo', 'Campus CESMAC Fortaleza', 'Transporte Interno', 'Campus CESMAC Fortaleza', 
     '14:00:00', '17:00:00', 3, 1, 1, 'em_andamento', GETDATE(), CAST(GETDATE() AS DATE), GETDATE());

PRINT CAST(@@ROWCOUNT AS VARCHAR) + ' corridas inseridas';

PRINT '✓ Dados de teste inseridos';
GO

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================
PRINT '';
PRINT '====================================================';
PRINT 'VERIFICAÇÃO FINAL';
PRINT '====================================================';
PRINT '';

PRINT 'Tabelas criadas:';
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME LIKE 'ELIAS_%'
ORDER BY TABLE_NAME;

PRINT '';
PRINT 'Total de registros por tabela:';
PRINT 'Usuários: ';
SELECT COUNT(*) as [Total] FROM ELIAS_Usuarios;
PRINT 'Veículos: ';
SELECT COUNT(*) as [Total] FROM ELIAS_Veiculos;
PRINT 'Corridas: ';
SELECT COUNT(*) as [Total] FROM ELIAS_Corridas;

PRINT '';
PRINT 'Usuários cadastrados:';
SELECT id_usuario, login, nome, nivel_acesso, is_active FROM ELIAS_Usuarios ORDER BY id_usuario;

PRINT '';
PRINT '✅ CORREÇÃO CONCLUÍDA COM SUCESSO!';
PRINT '====================================================';
GO
