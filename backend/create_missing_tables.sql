-- ============================================================================
-- CRIAR TABELAS FALTANTES: ELIAS_refresh_token_local
-- ============================================================================

USE Elias;
GO

PRINT '====================================================';
PRINT 'CRIANDO TABELAS FALTANTES';
PRINT '====================================================';
GO

-- Verificar e criar tabela de Refresh Tokens Locais se não existir
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ELIAS_refresh_token_local')
BEGIN
    PRINT '[1/1] Criando tabela ELIAS_refresh_token_local...';
    
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
    
    PRINT '✓ Tabela ELIAS_refresh_token_local criada com sucesso';
END
ELSE
BEGIN
    PRINT '[1/1] Tabela ELIAS_refresh_token_local já existe';
END
GO

-- Verificação final
PRINT '';
PRINT 'Tabelas verificadas:';
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('ELIAS_Usuarios', 'ELIAS_Veiculos', 'ELIAS_Corridas', 
                      'ELIAS_Notificacoes', 'ELIAS_user_auth_token', 'ELIAS_refresh_token_local')
ORDER BY TABLE_NAME;

PRINT '';
PRINT '✅ VERIFICAÇÃO CONCLUÍDA!';
PRINT '====================================================';
GO
