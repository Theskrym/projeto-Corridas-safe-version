# E.L.I.A.S Mobile

Aplicativo nativo em React Native com Expo Router, com áreas administrativas e fluxo de corridas para motoristas. O frontend web em `../frontend` e o backend Django continuam separados; o app mobile consome a mesma API em `/api/auth/`.

## Executar

```powershell
npm install
npm run typecheck
npm run start
```

Para usar o backend local no Expo Web (neste computador), defina `EXPO_PUBLIC_API_URL` no `.env` deste diretório:

```text
EXPO_PUBLIC_API_URL=http://127.0.0.1:8003/api/auth
```

Em um telefone físico, use o IP da máquina na rede local no lugar de `127.0.0.1` e inicie o Django com `python manage.py runserver 0.0.0.0:8003`. Reinicie o Expo depois de alterar o `.env`, para carregar a variável.

Sem essa variável, o app usa o backend hospedado `https://projeto-e-l-i-a-s.onrender.com/api/auth`. O `.env` local não deve ser enviado ao repositório.

## Telas administrativas

- Login e recuperação de senha
- Painel e indicadores
- Lista, cadastro e edição de corridas
- Lista, cadastro e edição de motoristas
- Lista, cadastro e edição de veículos
- Notificações, filtros e detalhe
- Relatórios com filtros por período em DD/MM/AAAA, tabela de seis colunas como no Vite, ordenação e exportação Excel
- Datas e horários de corridas usam máscara automática (DD/MM/AAAA e HH:MM); os valores enviados à API continuam em ISO e HH:MM
- Seletor de cor por status com roda, tonalidade, paleta rápida e código HEX para o Excel
- Dados pessoais e troca de senha

## Fluxo do motorista

- Corridas atribuídas, aceite/recusa, início e conclusão
- Histórico, notificações, dados pessoais e troca de senha
- Exclusão da própria conta após confirmar a senha

As listas de corridas, motoristas, veículos, notificações e relatório usam `FlatList`. A navegação combina tabs e stack. A sessão fica em `expo-secure-store`.
No primeiro acesso, o aplicativo apresenta o aviso de privacidade e registra a versão aceita no backend. A exclusão da conta remove o cadastro e notificações; registros e textos de corridas podem permanecer sem vínculo com a conta.

Antes de liberar o aplicativo, aplique as migrações no ambiente de backend (`python manage.py migrate`) e confirme com a instituição a região de armazenamento e a política de retenção mencionadas no aviso. A região e o prazo de retenção não estão definidos neste repositório, portanto o aviso não substitui a validação jurídica/institucional.

Links de autenticação podem abrir `eliasadmin://auto-login?token=...&force_change=true`.

O formulário de corrida pode usar GPS para preencher o ponto de embarque e abrir a câmera para uma foto local. O backend atual não tem campo/endpoints para anexar a foto; por isso, ela não é sincronizada com o servidor. Veículos com corridas vinculadas não podem ser excluídos; podem ser marcados como indisponíveis.

## EAS Update

O `eas.json`, `expo-updates` e a política de `runtimeVersion` estão preparados. Para associar o projeto à conta Expo e gerar o `projectId`/URL de updates, execute na pasta `mobile` após entrar na sua conta:

```powershell
npx eas-cli@latest login
npx eas-cli@latest update:configure
npx eas-cli@latest build --profile preview --platform android
```

Depois que o APK preview estiver instalado e o projeto configurado no EAS, publique uma atualização com:

```powershell
npx eas-cli@latest update --channel preview --message "Atualização administrativa" --environment preview
```

Não publique uma atualização antes de criar e instalar um build compatível. Mudanças nativas, como permissões/módulos, exigem novo build.

## UX e avaliação

Consulte [`UX_TESTE_USABILIDADE.md`](./UX_TESTE_USABILIDADE.md). O arquivo define tarefas, checklist heurístico e matriz para registrar achados e correções. Os campos de participantes e resultados precisam ser preenchidos após a avaliação real; nenhum teste com pessoas foi simulado.