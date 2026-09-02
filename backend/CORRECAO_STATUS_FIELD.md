# 🔧 CORREÇÃO: Campo STATUS - String para Boolean

## Problema
O campo `status` na tabela `ELIAS_Usuarios` está armazenando strings `'Ativo'/'Inativo'` no SQL Server, mas o Django espera valores booleanos `True/False` (1/0).

**Erro resultante:**
```
"Ativo" value must be either True or False.
```

---

## Solução

### Passo 1: Executar Script de Migração
Execute o arquivo [fix_status_field.sql](fix_status_field.sql) no SQL Server Management Studio:

1. Abra **SQL Server Management Studio**
2. Conecte-se ao servidor `localhost\SQLEXPRESS`
3. Selecione o banco de dados **Elias**
4. Abra o arquivo `fix_status_field.sql`
5. Execute (F5) ou **Execute > Execute Query**

**Resultado esperado:**
```
Verificação final:
id_usuario | nome                | login          | status
-----------|---------------------|----------------|-------
1          | Admin Sistema       | admin          | 1
2          | João Silva          | motorista1     | 1
3          | Maria Santos        | motorista2     | 1
4          | Carlos Oliveira     | operador1      | 1

✅ Conversão concluída com sucesso!
```

---

### Passo 2: Verificar Banco de Dados
Execute esta query para confirmar:

```sql
SELECT TOP 5 id_usuario, nome, login, status FROM ELIAS_Usuarios;
```

Todos os valores devem ser `1` (Ativo) ou `0` (Inativo), **não strings**.

---

### Passo 3: Reiniciar Django
Após a conversão, reinicie o servidor Django:

```powershell
python manage.py runserver 0.0.0.0:8003
```

---

## O Que Mudou

### Antes (Quebrado)
```sql
status VARCHAR(20) DEFAULT 'Ativo'  -- ❌ Armazena: 'Ativo', 'Inativo'
is_active BIT DEFAULT 1
is_staff BIT DEFAULT 0
is_superuser BIT DEFAULT 0
```

### Depois (Corrigido)
```sql
status BIT DEFAULT 1  -- ✅ Armazena: 1 (Ativo), 0 (Inativo)
```

---

## Modelo Django (Sem Mudanças)
```python
class Usuario(AbstractBaseUser, PermissionsMixin):
    status = models.BooleanField(default=True, db_column='status')
    
    @property
    def is_active(self):
        return self.status  # Retorna True/False baseado em status
```

---

## Teste de Login
Após a correção, teste com credenciais padrão:

```json
{
  "login": "admin",
  "password": "admin123"
}
```

**Resposta esperada:**
```json
{
  "success": true,
  "access_token": "eyJ0eXAi...",
  "user": {
    "id_usuario": 1,
    "nome": "Admin Sistema",
    "login": "admin"
  }
}
```

---

## Referências
- [Django BooleanField](https://docs.djangoproject.com/en/5.2/ref/models/fields/#booleanfield)
- [SQL Server BIT Type](https://learn.microsoft.com/en-us/sql/t-sql/data-types/bit-transact-sql)
