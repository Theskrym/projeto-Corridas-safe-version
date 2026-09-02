# 🎯 Configuração Expo Completa - E.L.I.A.S

## ✅ O que foi feito

### 1. **Instalação de Dependências**
```bash
✓ expo
✓ expo-cli  
✓ expo-splash-screen
✓ expo-font
✓ babel-preset-expo
✓ @babel/preset-typescript
```

### 2. **Arquivos de Configuração Criados**

#### **app.json**
- Configuração do Expo com nome, versão e ícone
- Suporte para iOS, Android e Web
- Splash screen customizado com logo do CESMAC
- Bundler webpack para web

#### **babel.config.js**
- Preset expo para transpilação correta
- Suporte a TypeScript

#### **package.json**
- Adicionado script `npm run expo`
- Adicionado script `npm run expo:web`
- Adicionado script `npm run expo:android`
- Adicionado script `npm run expo:ios`

### 3. **Documentação**
- Criado `README-EXPO.md` com instruções passo a passo

---

## 🚀 Como Usar Agora

### **Passo 1: Baixar Expo Go**

No seu **telefone** (Android ou iOS), baixe o app **Expo Go** pela loja:
- Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- iOS: [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)

### **Passo 2: Conectar à Rede**

Certifique-se de que seu **PC e telefone estão na mesma rede WiFi**.

### **Passo 3: Rodar o Servidor**

```bash
cd frontend
npm run expo
```

### **Passo 4: Escanear QR Code**

Quando o servidor iniciar, um **código QR** aparecerá no terminal:

- **Android**: Abra **Expo Go** → Escaneie o QR code
- **iOS**: Abra a **Câmera** → Escaneie → Toque na notificação → **Expo Go**

---

## 📱 Resultado

O app E.L.I.A.S abrirá no seu telefone em tempo real! Qualquer mudança no código será atualizada automaticamente.

---

## ⌨️ Atalhos no Terminal

Enquanto o servidor Expo rodar, você pode pressionar:

| Tecla | Ação |
|-------|------|
| `w` | Abrir no navegador web |
| `a` | Abrir no emulador Android |
| `i` | Abrir no simulador iOS |
| `r` | Recarregar o app |
| `m` | Mostrar menu de opcões |
| `q` | Sair |

---

## 📝 Estrutura Final

```
frontend/
├── app.json              ← Configuração do Expo
├── babel.config.js       ← Config do Babel
├── package.json          ← Scripts do Expo adicionados
├── README-EXPO.md        ← Instruções detalhadas
├── README-CONFIG.md      ← Este arquivo
├── src/
│   ├── main.tsx          ← Entry point do React
│   ├── pages/
│   │   └── Agendamento/
│   │       └── Agendamento.tsx ← Sua página principal
│   └── ...
└── ...
```

---

## 🔍 Verificação

Para confirmar que tudo foi instalado corretamente:

```bash
npm list expo
npm list babel-preset-expo
```

Ambos devem aparecer como installed.

---

## ❌ Se Algo Der Errado

### QR Code não aparece?
```bash
npx expo-cli start --clear
```

### Conexão recusada?
- Verifique se está na mesma rede WiFi
- Tente com `--tunnel`: `npx expo start --tunnel`

### Erro de dependência?
```bash
npm install --legacy-peer-deps
```

---

## 🎉 Pronto!

Agora você pode visualizar o E.L.I.A.S no seu telefone em tempo real! 📱✨
