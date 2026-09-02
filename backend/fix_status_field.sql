-- ============================================================================
-- CORREÇÃO: Remover coluna STATUS e usar apenas is_active (BIT)
-- ============================================================================

USE Elias;
GO

PRINT '====================================================';
PRINT 'REMOVENDO COLUNA STATUS - USANDO APENAS is_active';
PRINT '====================================================';
GO

-- Passo 1: Verificar valores atuais
PRINT '';
PRINT '[1/3] Analisando dados atuais...';
PRINT '';
PRINT 'Dados atuais da tabela:';
SELECT id_usuario, nome, login, status, is_active FROM ELIAS_Usuarios;
PRINT '';
GO

-- Passo 2: Remover constraint (DEFAULT) da coluna status
PRINT '[2/3] Removendo coluna STATUS...';
DECLARE @ConstraintName NVARCHAR(MAX);

-- Usar sys.default_constraints para encontrar DEFAULT constraints
SELECT @ConstraintName = name 
FROM sys.default_constraints 
WHERE parent_object_id = OBJECT_ID('ELIAS_Usuarios') 
AND col_name(parent_object_id, parent_column_id) = 'status';

IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE ELIAS_Usuarios DROP CONSTRAINT ' + @ConstraintName);
    PRINT '✓ Constraint removido: ' + @ConstraintName;
END

-- Remover a coluna status
ALTER TABLE ELIAS_Usuarios DROP COLUMN status;
PRINT '✓ Coluna STATUS removida com sucesso';
GO

-- Passo 3: Verificação final
PRINT '[3/3] Verificação final...';
PRINT '';
PRINT 'Estrutura da tabela após remoção:';
SELECT 
    id_usuario,
    nome,
    login,
    email,
    CASE is_active WHEN 1 THEN 'ATIVO ✓' WHEN 0 THEN 'INATIVO ✗' END as [Status (is_active)]
FROM ELIAS_Usuarios 
ORDER BY id_usuario;

PRINT '';
PRINT '✅ OPERAÇÃO CONCLUÍDA COM SUCESSO!';
PRINT 'Coluna STATUS removida.';
PRINT 'Use is_active (BIT): 1 = Ativo, 0 = Inativo';
PRINT '====================================================';
GO
