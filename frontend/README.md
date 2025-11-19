# KAIROS Frontend

Frontend da plataforma KAIROS para copywriters, construído com React, Vite e Tailwind CSS.

## 🚀 Características

- Interface de chat moderna inspirada no Claude App
- Design seguindo princípios Apple (simplicidade, tipografia, espaço)
- Modo escuro automático
- Autenticação JWT
- Integração completa com API backend
- Animações suaves
- Responsivo

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn

## 🛠️ Instalação

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente (opcional):
```bash
cp .env.example .env
```

Edite o `.env` se necessário:
```
VITE_API_URL=http://localhost:5001
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/      # Componentes reutilizáveis
│   │   ├── Button.jsx
│   │   └── Input.jsx
│   ├── contexts/        # Context API
│   │   └── AuthContext.jsx
│   ├── pages/          # Páginas da aplicação
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── Chat.jsx
│   ├── services/       # Serviços de API
│   │   └── api.js
│   ├── App.jsx         # Componente principal
│   ├── main.jsx        # Entry point
│   └── index.css       # Estilos globais
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🎨 Design System

O design segue as diretrizes do `design_guideline.md`:

- **Cores**: Paleta purple pastel (#a78bfa) com neutros
- **Tipografia**: SF Pro Display (fallback: system fonts)
- **Espaçamento**: Grid de 8px
- **Animações**: Transições suaves (150-300ms)
- **Modo Escuro**: Suporte completo

## 🔐 Autenticação

O sistema de autenticação usa JWT tokens armazenados no localStorage:

- Login: `/login`
- Registro: `/register`
- Chat: `/chat` (protegido)

## 📡 API

A integração com a API é feita através de `src/services/api.js`:

- Interceptors para adicionar token automaticamente
- Tratamento de erros 401 (logout automático)
- Funções para todos os endpoints do backend

## 🚀 Build para Produção

```bash
npm run build
```

Os arquivos serão gerados em `dist/`

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa ESLint

## 🔧 Configuração

### Vite

O Vite está configurado com proxy para a API:
- Frontend: `http://localhost:3000`
- API: `http://localhost:5001` (via proxy `/api`)

### Tailwind

Configuração customizada seguindo o design guideline:
- Cores personalizadas
- Tipografia SF Pro
- Espaçamento e border-radius customizados
- Modo escuro via `dark:` classes

## 🎯 Próximos Passos

- [ ] Implementar funcionalidade completa de chat com IA
- [ ] Adicionar gerenciamento de projetos
- [ ] Adicionar biblioteca de swipes
- [ ] Implementar gerenciamento de tenants
- [ ] Adicionar testes
- [ ] Melhorar acessibilidade

## 📄 Licença

Este projeto faz parte do KAIROS MVP.

