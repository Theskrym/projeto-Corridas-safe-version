# 🔧 Resolução do Problema: ELIAS_refresh_token_local

## ❌ Problema
```
Erro ao processar login: 
Invalid object name 'ELIAS_refresh_token_local'. (208)
```

## ✅ Solução Rápida (Recomendada)

### Passo 1: Execute o Script de Setup Completo
1. Abra **SQL Server Management Studio**
2. Conecte ao servidor `localhost\SQLEXPRESS`
3. Selecione o banco **Elias**
4. Abra e execute: **[FULL_DATABASE_SETUP.sql](FULL_DATABASE_SETUP.sql)**

Este script faz tudo:
- ✅ Remove tabelas antigas
- ✅ Cria todas as tabelas no banco (incluindo `ELIAS_refresh_token_local`)
- ✅ Insere dados de teste
- ✅ Sem conflitos de colunas

### Passo 2: Reinicie o Django
```powershell
cd backend
python manage.py runserver 0.0.0.0:8003
```

### Passo 3: Teste o Login
```bash
Login: admin
Senha: admin123
```

---

## ℹ️ O Que Foi Corrigido

| Problema | Solução |
|----------|---------|
| Tabela `ELIAS_refresh_token_local` não existia | Criada com todas as colunas necessárias |
| Coluna `status` conflitava com `is_active` | Removida, usando apenas `is_active` |
| Colunas `is_staff` e `is_superuser` conflitavam | Removidas do modelo Django |
| PLANO E.sql desatualizado | Corrigido e sincronizado |

---

## 📁 Arquivos Modificados

### Backend Python
- ✅ [autenticacao/models.py](autenticacao/models.py) - Removido `status`, usando `is_active`
- ✅ [autenticacao/serializers.py](autenticacao/serializers.py) - Atualizado para `is_active`
- ✅ [autenticacao/admin.py](autenticacao/admin.py) - Admin interface atualizado

### SQL
- ✅ [PLANO E.sql](PLANO%20E.sql) - Corrigido e sincronizado
- ✅ [FULL_DATABASE_SETUP.sql](FULL_DATABASE_SETUP.sql) - Script completo (novo)
- ✅ [create_missing_tables.sql](create_missing_tables.sql) - Alternativa (cria apenas tabelas faltantes)

---

## 🚀 Próximas Ações

1. **Executar FULL_DATABASE_SETUP.sql** no SQL Server
2. **Reiniciar Django**: `python manage.py runserver 0.0.0.0:8003`
3. **Testar login**: `admin` / `admin123`
4. **Verificar frontend**: `npm run dev` em outro terminal

---

## 📊 Estrutura Final do Banco

```
ELIAS_Usuarios (id_usuario INT PRIMARY KEY, ..., is_active BIT)
    ├── ELIAS_Veiculos (id_veiculo INT PRIMARY KEY, status VARCHAR)
    ├── ELIAS_Corridas (id_corrida INT PRIMARY KEY, motorista_id FK, veiculo_id FK)
    ├── ELIAS_Notificacoes (id_notificacao INT PRIMARY KEY, usuario_id FK)
    ├── ELIAS_user_auth_token (fcm_key VARCHAR PRIMARY KEY, user_id FK)
    └── ELIAS_refresh_token_local (id INT PRIMARY KEY, user_id FK) ✅ CRIADA
```

---

## ❓ Se Tiver Dúvidas

- **Tabela ainda não existe?** → Execute [FULL_DATABASE_SETUP.sql](FULL_DATABASE_SETUP.sql) novamente
- **Login ainda não funciona?** → Verifique os logs do Django em `debug.log`
- **Dados não aparecem?** → Verifique se a inserção de dados foi bem-sucedida na última linha do script SQL
