# 📚 Documentação da API - KAIROS

## 🔗 Base URL

```
http://localhost:5001/api/v1
```

---

## 📑 Índice

1. [Autenticação](#autenticação)
2. [Chat](#chat)
3. [Custom AIs](#custom-ais)
4. [Images](#images)
5. [Projects](#projects)
6. [Swipes](#swipes)
7. [Tenants](#tenants)
8. [Vision](#vision)
9. [Voice](#voice)
10. [Web](#web)

---

## 🔐 Autenticação

### Registro de Usuário

```http
POST /api/v1/auth/register
```

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "email": "user@example.com",
  "nome": "João Silva",
  "password": "senha123"
}
```

**Validações:**
- Email: válido e único
- Nome: 1-100 caracteres, sem caracteres especiais
- Password: mínimo 6 caracteres

**Response (201):**
```json
{
  "message": "Usuário criado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "nome": "João Silva",
    "created_at": "2025-11-14T10:30:00Z"
  }
}
```

**Rate Limit:** 5 requisições por minuto

---

### Login

```http
POST /api/v1/auth/login
```

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "nome": "João Silva",
    "created_at": "2025-11-14T10:30:00Z"
  }
}
```

**Rate Limit:** 5 requisições por minuto

---

### Obter Usuário

```http
GET /api/v1/auth/user/{user_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "nome": "João Silva",
  "created_at": "2025-11-14T10:30:00Z"
}
```

---

## 💬 Chat

### Enviar Mensagem

```http
POST /api/v1/chat/message
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "message": "Olá, como você está?",
  "conversation_id": "uuid-optional",
  "tenant_id": "uuid-optional",
  "messages": []
}
```

**Validações:**
- Message: 1-10000 caracteres

**Response (200):**
```json
{
  "message": "Olá! Estou bem, obrigado por perguntar...",
  "conversation_id": "uuid-here",
  "tenant_id": "uuid-here",
  "messages": [
    {
      "role": "user",
      "content": "Olá, como você está?"
    },
    {
      "role": "assistant",
      "content": "Olá! Estou bem..."
    }
  ]
}
```

**Quota:** Consome 1 `api_calls_per_day`

---

### Listar Conversas

```http
GET /api/v1/chat/conversations?offset=0&limit=50
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Query Parameters:**
- `offset` (opcional): início da paginação (default: 0)
- `limit` (opcional): itens por página (default: 50, max: 100)

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "uuid-here",
      "titulo": "Conversa sobre IA",
      "created_at": "2025-11-14T10:30:00Z",
      "updated_at": "2025-11-14T11:00:00Z"
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 50,
    "total": 123,
    "has_more": true
  }
}
```

---

### Obter Conversa

```http
GET /api/v1/chat/conversation/{conversation_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
{
  "conversation": {
    "id": "uuid-here",
    "tenant_id": "uuid-here",
    "user_id": "uuid-here",
    "titulo": "Conversa sobre IA",
    "created_at": "2025-11-14T10:30:00Z",
    "updated_at": "2025-11-14T11:00:00Z"
  },
  "messages": [
    {
      "id": "uuid-here",
      "role": "user",
      "content": "Olá",
      "image_url": null,
      "created_at": "2025-11-14T10:30:00Z"
    },
    {
      "id": "uuid-here",
      "role": "assistant",
      "content": "Olá! Como posso ajudar?",
      "image_url": null,
      "created_at": "2025-11-14T10:30:05Z"
    }
  ]
}
```

---

### Deletar Conversa

```http
DELETE /api/v1/chat/conversation/{conversation_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
{
  "message": "Conversa deletada"
}
```

---

## 🤖 Custom AIs

### Criar Custom AI

```http
POST /api/v1/custom-ais/create
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "tenant_id": "uuid-here",
  "nome": "Assistente de Marketing",
  "descricao": "IA especializada em marketing digital",
  "sistema_prompt": "Você é um especialista em marketing digital...",
  "modelo": "claude-opus-4-1",
  "temperatura": 0.7,
  "max_tokens": 2048
}
```

**Validações:**
- Nome: 1-100 caracteres
- Descrição: 0-500 caracteres
- Sistema_prompt: 10-5000 caracteres
- Modelo: `claude-opus-4-1`, `claude-sonnet-4-5`, `claude-haiku-4-5`
- Temperatura: 0-2.0
- Max_tokens: 256-4096

**Response (201):**
```json
{
  "message": "IA personalizada criada com sucesso",
  "custom_ai": {
    "id": "uuid-here",
    "tenant_id": "uuid-here",
    "user_id": "uuid-here",
    "nome": "Assistente de Marketing",
    "descricao": "IA especializada em marketing digital",
    "sistema_prompt": "Você é um especialista...",
    "modelo": "claude-opus-4-1",
    "temperatura": 0.7,
    "max_tokens": 2048,
    "ativo": true,
    "created_at": "2025-11-14T10:30:00Z"
  }
}
```

**Quota:** Consome 1 `custom_ais`

---

### Obter Custom AI

```http
GET /api/v1/custom-ais/{custom_ai_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
{
  "id": "uuid-here",
  "tenant_id": "uuid-here",
  "nome": "Assistente de Marketing",
  "descricao": "IA especializada em marketing digital",
  "sistema_prompt": "Você é um especialista...",
  "modelo": "claude-opus-4-1",
  "temperatura": 0.7,
  "max_tokens": 2048,
  "ativo": true
}
```

---

### Listar Custom AIs do Tenant

```http
GET /api/v1/custom-ais/tenant/{tenant_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "nome": "Assistente de Marketing",
    "descricao": "IA especializada em marketing digital",
    "modelo": "claude-opus-4-1",
    "created_at": "2025-11-14T10:30:00Z"
  }
]
```

---

### Criar Conversa com Custom AI

```http
POST /api/v1/custom-ais/{custom_ai_id}/conversations/create
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "tenant_id": "uuid-here",
  "titulo": "Campanha de Lançamento"
}
```

**Response (201):**
```json
{
  "message": "Conversa criada com sucesso",
  "conversation": {
    "id": "uuid-here",
    "custom_ai_id": "uuid-here",
    "user_id": "uuid-here",
    "tenant_id": "uuid-here",
    "titulo": "Campanha de Lançamento",
    "created_at": "2025-11-14T10:30:00Z"
  }
}
```

---

### Enviar Mensagem para Custom AI

```http
POST /api/v1/custom-ais/conversations/{conversation_id}/send
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "message": "Como criar uma campanha de email?",
  "custom_ai_id": "uuid-here",
  "stream": false
}
```

**Response (200):**
```json
{
  "user_message": "Como criar uma campanha de email?",
  "assistant_message": "Para criar uma campanha de email eficaz..."
}
```

**Quota:** Consome 1 `api_calls_per_day`

---

### Obter Histórico de Custom AI

```http
GET /api/v1/custom-ais/conversations/{conversation_id}/history
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "conversation_id": "uuid-here",
    "role": "user",
    "conteudo": "Como criar uma campanha?",
    "created_at": "2025-11-14T10:30:00Z"
  },
  {
    "id": "uuid-here",
    "conversation_id": "uuid-here",
    "role": "assistant",
    "conteudo": "Para criar uma campanha eficaz...",
    "created_at": "2025-11-14T10:30:05Z"
  }
]
```

---

### Deletar Conversa de Custom AI

```http
DELETE /api/v1/custom-ais/conversations/{conversation_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
{
  "message": "Conversa deletada"
}
```

---

## 🖼️ Images

### Criar Imagem

```http
POST /api/v1/images/create
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "prompt": "Um gato fofo em um jardim",
  "image_prompt": null,
  "width": 1024,
  "height": 1024
}
```

**Validações:**
- Prompt: 1-1000 caracteres
- Width: 256-1024
- Height: 256-1024

**Response (200):**
```json
{
  "image_url": "https://replicate.delivery/...",
  "prompt": "Um gato fofo em um jardim",
  "width": 1024,
  "height": 1024
}
```

---

## 📁 Projects

### Criar Projeto

```http
POST /api/v1/projects/create
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "tenant_id": "uuid-here",
  "nome": "Projeto Website",
  "descricao": "Desenvolvimento de website corporativo"
}
```

**Validações:**
- Nome: 1-255 caracteres
- Descrição: 0-5000 caracteres

**Response (201):**
```json
{
  "message": "Projeto criado com sucesso",
  "project": {
    "id": "uuid-here",
    "tenant_id": "uuid-here",
    "user_id": "uuid-here",
    "nome": "Projeto Website",
    "descricao": "Desenvolvimento de website corporativo",
    "created_at": "2025-11-14T10:30:00Z"
  }
}
```

**Quota:** Consome 1 `projects`

---

### Obter Projeto

```http
GET /api/v1/projects/{project_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
{
  "id": "uuid-here",
  "tenant_id": "uuid-here",
  "user_id": "uuid-here",
  "nome": "Projeto Website",
  "descricao": "Desenvolvimento de website corporativo",
  "created_at": "2025-11-14T10:30:00Z"
}
```

---

### Listar Projetos do Tenant

```http
GET /api/v1/projects/tenant/{tenant_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "nome": "Projeto Website",
    "descricao": "Desenvolvimento de website corporativo",
    "created_at": "2025-11-14T10:30:00Z"
  }
]
```

---

### Atualizar Projeto

```http
PUT /api/v1/projects/{project_id}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "nome": "Projeto Website 2.0",
  "descricao": "Nova versão do website"
}
```

**Response (200):**
```json
{
  "message": "Projeto atualizado",
  "project": {...}
}
```

---

### Deletar Projeto

```http
DELETE /api/v1/projects/{project_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
{
  "message": "Projeto deletado"
}
```

---

### Criar Arquivo em Projeto

```http
POST /api/v1/projects/{project_id}/files/create
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "titulo": "Documento de Requisitos",
  "conteudo": "# Requisitos do Projeto\n\n...",
  "tipo": "documento"
}
```

**Validações:**
- Titulo: 1-255 caracteres
- Tipo: `documento`, `planilha`, `apresentacao`, `imagem`, `video`

**Response (201):**
```json
{
  "message": "Arquivo criado",
  "file": {
    "id": "uuid-here",
    "project_id": "uuid-here",
    "titulo": "Documento de Requisitos",
    "conteudo": "# Requisitos...",
    "tipo": "documento",
    "created_at": "2025-11-14T10:30:00Z"
  }
}
```

---

### Listar Arquivos do Projeto

```http
GET /api/v1/projects/{project_id}/files
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "titulo": "Documento de Requisitos",
    "tipo": "documento",
    "created_at": "2025-11-14T10:30:00Z"
  }
]
```

---

## 📝 Swipes

### Criar Swipe do Tenant

```http
POST /api/v1/swipes/tenant/create
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "tenant_id": "uuid-here",
  "titulo": "Copy para Instagram",
  "conteudo": "🎉 Novidade incrível chegando...",
  "categoria": "Social Media",
  "tipo_rede": "Instagram",
  "url_referencia": "https://instagram.com/post/123"
}
```

**Validações:**
- Titulo: 1-255 caracteres
- Conteudo: 10-50000 caracteres
- Categoria: 0-100 caracteres
- Tipo_rede: 0-50 caracteres
- URL_referencia: 0-2000 caracteres

**Response (201):**
```json
{
  "message": "Swipe criado",
  "swipe": {
    "id": "uuid-here",
    "tenant_id": "uuid-here",
    "titulo": "Copy para Instagram",
    "conteudo": "🎉 Novidade...",
    "categoria": "Social Media",
    "created_at": "2025-11-14T10:30:00Z"
  }
}
```

**Quota:** Consome 1 `swipes`

---

### Listar Swipes Globais

```http
GET /api/v1/swipes/global
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "titulo": "Copy para Instagram",
    "conteudo": "🎉 Novidade...",
    "categoria": "Social Media",
    "likes": 42,
    "created_at": "2025-11-14T10:30:00Z"
  }
]
```

---

### Listar Swipes do Tenant

```http
GET /api/v1/swipes/tenant/{tenant_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "titulo": "Copy para Instagram",
    "conteudo": "🎉 Novidade...",
    "categoria": "Social Media",
    "created_at": "2025-11-14T10:30:00Z"
  }
]
```

---

### Deletar Swipe

```http
DELETE /api/v1/swipes/tenant/{swipe_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
{
  "message": "Swipe deletado"
}
```

---

## 🏢 Tenants

### Criar Tenant

```http
POST /api/v1/tenants/create
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "nome": "Minha Empresa"
}
```

**Validações:**
- Nome: 3-100 caracteres

**Response (201):**
```json
{
  "message": "Tenant criado com sucesso",
  "tenant": {
    "id": "uuid-here",
    "nome": "Minha Empresa",
    "plano": "free",
    "created_at": "2025-11-14T10:30:00Z"
  },
  "tenant_user": {
    "id": "uuid-here",
    "tenant_id": "uuid-here",
    "user_id": "uuid-here",
    "role": "owner"
  }
}
```

---

### Obter Tenant

```http
GET /api/v1/tenants/{tenant_id}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
{
  "id": "uuid-here",
  "nome": "Minha Empresa",
  "plano": "free",
  "created_at": "2025-11-14T10:30:00Z",
  "updated_at": "2025-11-14T10:30:00Z"
}
```

---

### Listar Meus Tenants

```http
GET /api/v1/tenants/mine
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "nome": "Minha Empresa",
    "plano": "free",
    "role": "owner",
    "created_at": "2025-11-14T10:30:00Z"
  }
]
```

---

### Adicionar Usuário ao Tenant

```http
POST /api/v1/tenants/{tenant_id}/add-user
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "user_id": "uuid-here",
  "role": "member"
}
```

**Validações:**
- Role: `owner`, `admin`, `member`

**Response (201):**
```json
{
  "message": "Usuário adicionado ao tenant",
  "tenant_user": {
    "id": "uuid-here",
    "tenant_id": "uuid-here",
    "user_id": "uuid-here",
    "role": "member"
  }
}
```

---

### Adicionar Usuário por Email

```http
POST /api/v1/tenants/{tenant_id}/add-user-by-email
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "email": "user@example.com",
  "role": "member"
}
```

**Response (201):**
```json
{
  "message": "Usuário adicionado ao tenant",
  "tenant_user": {...}
}
```

---

### Listar Usuários do Tenant

```http
GET /api/v1/tenants/{tenant_id}/users
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "user_id": "uuid-here",
    "email": "user@example.com",
    "nome": "João Silva",
    "role": "owner",
    "created_at": "2025-11-14T10:30:00Z"
  }
]
```

---

## 👁️ Vision

### Analisar Imagem

```http
POST /api/v1/vision/analyze
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "image_url": "https://example.com/image.jpg",
  "prompt": "Descreva esta imagem detalhadamente",
  "persist": true,
  "tenant_id": "uuid-optional"
}
```

**Validações:**
- Image_url: 10-2048 caracteres, URL válida (SSRF protected)
- Prompt: 0-1000 caracteres

**SSRF Protection:**
- ❌ Bloqueado: localhost, 127.0.0.1, IPs privados, AWS metadata
- ✅ Permitido: URLs públicas HTTP/HTTPS

**Response (200):**
```json
{
  "answer": "A imagem mostra um gato laranja sentado em um jardim...",
  "conversation_id": "uuid-here"
}
```

**Quota:** Consome 1 `api_calls_per_day`

---

## 🎤 Voice

### Transcrever Áudio

```http
POST /api/v1/voice/transcribe
```

**Headers:**
```json
{
  "Content-Type": "multipart/form-data",
  "Authorization": "Bearer {token}"
}
```

**Form Data:**
- `file`: arquivo de áudio (max 25MB)
- `model`: modelo Whisper (default: `whisper-large-v3-turbo`)
- `language`: idioma (opcional, ex: `pt`)

**Response (200):**
```json
{
  "text": "Transcrição do áudio aqui..."
}
```

---

## 🌐 Web

### Buscar na Web

```http
POST /api/v1/web/search
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "query": "melhores práticas de SEO 2025",
  "max_uses": 5,
  "allowed_domains": ["example.com"],
  "blocked_domains": ["spam.com"],
  "persist": true,
  "tenant_id": "uuid-optional"
}
```

**Validações:**
- Query: 1-4000 caracteres
- Max_uses: 1-10

**Response (200):**
```json
{
  "results": [
    {
      "title": "SEO em 2025",
      "url": "https://example.com/seo-2025",
      "snippet": "As melhores práticas..."
    }
  ],
  "conversation_id": "uuid-here"
}
```

**Quota:** Consome 1 `api_calls_per_day`

---

### Visitar Website

```http
POST /api/v1/web/visit
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "url": "https://example.com/article",
  "instruction": "Resuma o conteúdo principal",
  "max_uses": 3,
  "persist": true,
  "tenant_id": "uuid-optional"
}
```

**Validações:**
- URL: 10-2048 caracteres, URL válida (SSRF protected)
- Instruction: 0-1000 caracteres
- Max_uses: 1-10

**Response (200):**
```json
{
  "content": "O artigo fala sobre...",
  "conversation_id": "uuid-here"
}
```

**Quota:** Consome 1 `api_calls_per_day`

---

## 🔧 Utilitários

### Health Check

```http
GET /health
```

**Response (200):**
```json
{
  "status": "ok"
}
```

---

### API Info

```http
GET /api/v1
```

**Response (200):**
```json
{
  "name": "KAIROS API",
  "version": "1.0.0",
  "status": "running"
}
```

---

## 📊 Códigos de Erro

### Erros Comuns

| Código | Tipo | Descrição |
|--------|------|-----------|
| `VALIDATION_ERROR` | 400 | Erro de validação de entrada |
| `AUTHENTICATION_ERROR` | 401 | Não autenticado ou token inválido |
| `AUTHORIZATION_ERROR` | 403 | Não autorizado para esta ação |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `CONFLICT` | 409 | Conflito (ex: email duplicado) |
| `QUOTA_EXCEEDED` | 429 | Limite de quota diária excedido |
| `RATE_LIMIT` | 429 | Rate limit excedido |
| `SSRF_BLOCKED` | 400 | URL bloqueada por segurança |
| `INTERNAL_ERROR` | 500 | Erro interno do servidor |

### Formato de Erro

```json
{
  "error": "Mensagem de erro em português",
  "code": "VALIDATION_ERROR",
  "details": {
    "campo": "descrição do erro"
  }
}
```

---

## 🔑 Autenticação JWT

Todos os endpoints (exceto `/auth/register`, `/auth/login`, `/health`, `/api/v1`) requerem autenticação via JWT.

**Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token expira em:** 7 dias

---

## 📈 Sistema de Quotas

### Limites por Plano

| Ação | Free | Pro | Enterprise |
|------|------|-----|------------|
| API Calls/Day | 100 | 10,000 | Unlimited |
| Conversations | 10 | 1,000 | Unlimited |
| Custom AIs | 2 | 50 | Unlimited |
| Projects | 5 | 100 | Unlimited |
| Swipes | 50 | 5,000 | Unlimited |
| Messages/Conv | 50 | 5,000 | Unlimited |

### Ações que Consomem Quota

- ✅ `/api/v1/chat/message` - `api_calls_per_day`
- ✅ `/api/v1/custom-ais/create` - `custom_ais`
- ✅ `/api/v1/custom-ais/conversations/{id}/send` - `api_calls_per_day`
- ✅ `/api/v1/projects/create` - `projects`
- ✅ `/api/v1/swipes/tenant/create` - `swipes`
- ✅ `/api/v1/vision/analyze` - `api_calls_per_day`
- ✅ `/api/v1/web/search` - `api_calls_per_day`
- ✅ `/api/v1/web/visit` - `api_calls_per_day`

---

## 🚦 Rate Limiting

### Limites Globais

- **Global:** 1000 requisições por hora por IP
- **Auth endpoints:** 5 requisições por minuto por IP

### Headers de Rate Limit

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699999999
```

---

## 📝 Exemplos com cURL

### Registro
```bash
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","nome":"Test User","password":"senha123"}'
```

### Login
```bash
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"senha123"}'
```

### Enviar Mensagem
```bash
curl -X POST http://localhost:5001/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"Olá!"}'
```

### Criar Tenant
```bash
curl -X POST http://localhost:5001/api/v1/tenants/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"nome":"Minha Empresa"}'
```

---

**Documentação gerada em:** 2025-11-14
**Versão da API:** v1
**Base URL:** http://localhost:5001/api/v1
