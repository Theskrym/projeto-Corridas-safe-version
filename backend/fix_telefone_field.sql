USE Elias;
GO

PRINT 'Aumentando tamanho do campo telefone...';

ALTER TABLE ELIAS_Usuarios
ALTER COLUMN telefone VARCHAR(25);

ALTER TABLE ELIAS_Usuarios
ALTER COLUMN matricula VARCHAR(25);

PRINT '✅ Campos aumentados com sucesso!';
GO
