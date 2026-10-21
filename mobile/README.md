# E.L.I.A.S Admin Mobile

Aplicativo administrativo nativo em React Native com Expo Router. O frontend web em `../frontend` e o backend Django continuam separados; o app mobile consome a mesma API em `/api/auth/`.

## Executar

```powershell
npm install
npm run typecheck
npm run start
```

Para apontar o app para um backend local, crie um `.env` neste diretório e defina `EXPO_PUBLIC_API_URL`. Em um telefone físico, use o IP da máquina na rede local, não `localhost`:

```text
EXPO_PUBLIC_API_URL=http://192.168.0.10:8003/api/auth
```

Sem essa variável, o app usa o backend hospedado `https://projeto-e-l-i-a-s.onrender.com/api/auth`.

## Telas administrativas

- Login e recuperação de senha
- Painel e indicadores
- Lista, cadastro e edição de corridas
- Lista, cadastro e edição de motoristas
- Lista, cadastro e edição de veículos
- Notificações, filtros e detalhe
- Relatórios por período
- Dados pessoais, troca de senha e cores de status

As listas de corridas, motoristas, veículos, notificações e relatório usam `FlatList`. A navegação combina tabs e stack. A sessão fica em `expo-secure-store`.

Links de autenticação podem abrir `eliasadmin://auto-login?token=...&force_change=true`.

O formulário de corrida pode usar GPS para preencher o ponto de embarque e abrir a câmera para uma foto local. O backend atual não tem campo/endpoints para anexar a foto; por isso, ela não é sincronizada com o servidor.

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