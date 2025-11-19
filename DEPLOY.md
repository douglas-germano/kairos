# KAIROS - Configuração de Variáveis de Ambiente para Deploy

Após criar o serviço no Render, você precisará configurar as seguintes variáveis de ambiente no painel do Render:

## Variáveis Obrigatórias

### Supabase
- `SUPABASE_URL`: URL do seu projeto Supabase
- `SUPABASE_KEY`: Chave anônima (anon key) do Supabase

### API Keys de IA
- `ANTHROPIC_API_KEY`: Chave da API do Claude (Anthropic)
- `GROQ_API_KEY`: Chave da API do Groq (para Llama)
- `GOOGLE_API_KEY`: Chave da API do Google AI (Gemini)

### Opcional
- `REPLICATE_API_TOKEN`: Chave da API do Replicate (para geração de imagens alternativa)

### Segurança
- `JWT_SECRET_KEY`: Será gerado automaticamente pelo Render

## Como Configurar no Render

1. Acesse o dashboard do serviço `kairos-backend` no Render
2. Vá em **Environment** → **Environment Variables**
3. Adicione cada variável acima com seus respectivos valores
4. Clique em **Save Changes**
5. O serviço será reiniciado automaticamente

## Referência

Veja o arquivo `.env.example` para um template completo.
