# 📱 Usando Expo para Visualizar no Telefone

## ✅ Preparação Concluída

O projeto foi configurado para funcionar com **Expo**! Agora você pode visualizar o app E.L.I.A.S no seu telefone.

## 🚀 Como Usar

### 1️⃣ Pré-requisitos

- **Telefone Android ou iOS**
- **Aplicativo Expo Go** instalado no telefone
  - [Android: Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [iOS: Apple App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Computador e telefone na mesma rede WiFi**

### 2️⃣ Iniciar o Servidor Expo

Execute no terminal (na pasta `frontend`):

```bash
npm run expo
```

Ou para especificar a plataforma:

```bash
npm run expo:android    # Android
npm run expo:ios        # iOS
npm run expo:web        # Navegador web
```

### 3️⃣ Conectar o Telefone

Após rodar `npm run expo`, você verá algo como:

```
Expo Go ready at: http://192.168.x.x:19000
Scan this QR code with Expo Go (Android) or the Camera app (iOS):

████████████████████
████████████████████
████████████████████
████████████████████
```

**No seu telefone:**

- **Android**: Abra o app **Expo Go** e escaneie o código QR
- **iOS**: Abra o app **Camera** (câmera padrão) e escaneie o código QR, depois abra no Expo Go

### 4️⃣ Ver Alterações em Tempo Real

Qualquer mudança no código será atualizada automaticamente no telefone! 🔥

## 📂 Estrutura Configurada

```
✅ app.json          - Configuração do Expo (nome, versão, ícone)
✅ babel.config.js   - Configuração do Babel para Expo
✅ package.json      - Scripts do Expo adicionados
```

## 🔗 URLs de Acesso

Quando o servidor rodar, você terá acesso via:

- **Expo Go (no telefone)**: Escaneie o QR code
- **Navegador**: `http://localhost:19000` (abrir no navegador do PC)
- **Expo CLI**: Pressione opções como:
  - `w` - Abrir no navegador web
  - `a` - Abrir no emulador Android
  - `i` - Abrir no simulador iOS
  - `r` - Recarregar

## 🎨 Verificar Responsive

O app foi construído como **web responsivo**, então funcionará em qualquer tamanho de tela (desktop, tablet, smartphone).

## ⚠️ Troubleshooting

### "QR Code não aparece"
```bash
# Limpe o cache
npx expo-cli start --clear
```

### "Conexão recusada"
- Certifique-se que PC e telefone estão na **mesma rede WiFi**
- Desabilite VPN/Proxy se estiver ativo
- Tente rodar com `--tunnel`:
```bash
npx expo start --tunnel
```

### "Aplicativo Expo Go não encontrado"
- Instale o **Expo Go** pela loja de apps do seu telefone

## 📝 Próximos Passos

Depois de testar no telefone, você pode:
1. Construir APK/IPA para distribuição
2. Publicar na Expo Publish
3. Usar EAS Build para CI/CD

## 🆘 Dúvidas?

Para mais informações, acesse: [https://docs.expo.dev/](https://docs.expo.dev/)
