# Guia de Execução de Migrations - KAIROS

## 📋 Migrações Disponíveis

### Migration 001: Sistema de Quotas e Melhorias no Banco
**Arquivo:** `001_add_quota_logs.sql`
**Status:** ✅ Pronta para produção
**Data:** 2025-11-14

Esta migration adiciona o sistema completo de tracking de quotas ao banco de dados Supabase.

---

## 🚀 Como Executar a Migration

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Navegue até **SQL Editor**
3. Clique em **New Query**
4. Copie todo o conteúdo do arquivo `001_add_quota_logs.sql`
5. Cole no editor SQL
6. Clique em **Run** (ou pressione `Ctrl/Cmd + Enter`)
7. Aguarde a execução (pode levar alguns segundos)
8. Verifique os resultados na aba de output

### Opção 2: Via CLI do Supabase

```bash
# Se você tem o Supabase CLI instalado
supabase db push

# Ou execute o SQL diretamente
psql $DATABASE_URL < migrations/001_add_quota_logs.sql
```

---

## ✅ O Que Esta Migration Faz

### 1. Tabela `quota_logs`
Cria tabela para rastrear uso de quotas:
- `id` - UUID único
- `tenant_id` - Referência ao tenant
- `user_id` - Referência ao usuário
- `action` - Tipo de ação rastreada
- `created_at` - Timestamp da ação

### 2. Coluna `plano` em `tenants`
Adiciona coluna para controlar plano do tenant:
- Valores: `'free'`, `'pro'`, `'enterprise'`
- Default: `'free'`
- Constraint de validação

### 3. Índices de Performance
Cria 4 índices para otimizar queries:
- `idx_quota_logs_tenant_action_date` - Query principal de quota
- `idx_quota_logs_created_at` - Queries por data
- `idx_quota_logs_user_id` - Analytics por usuário
- `idx_quota_logs_tenant_created` - Analytics por tenant

### 4. Colunas `updated_at`
Adiciona colunas `updated_at` em:
- `tenants`
- `users`

Com triggers automáticos para atualização.

### 5. Views Analíticas
Cria 2 views para consultas rápidas:
- `v_daily_quota_usage` - Uso diário de quotas
- `v_today_quota_usage` - Uso do dia atual com percentuais

### 6. Funções SQL
Cria 3 funções úteis:
- `update_updated_at_column()` - Auto-atualiza timestamp
- `cleanup_old_quota_logs(days)` - Limpa logs antigos
- `check_tenant_quota(tenant_id, action)` - Verifica quota

### 7. Row Level Security (RLS)
Configura políticas de segurança:
- Usuários veem apenas seus próprios logs
- Admins de tenant veem todos logs do tenant
- Apenas inserts autorizados

---

## 🔍 Verificação Pós-Migration

### 1. Verificar Tabelas

```sql
-- Verificar se quota_logs existe
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'quota_logs';
```

### 2. Verificar Coluna Plano

```sql
-- Ver planos dos tenants
SELECT id, nome, plano FROM tenants;
```

### 3. Testar Função de Quota

```sql
-- Testar função de verificação de quota
SELECT check_tenant_quota(
    'your-tenant-id-here'::UUID,
    'api_calls_per_day'
);
```

---

## 📊 Exemplos de Uso

### Consultar Uso de Quota de Hoje

```sql
SELECT * FROM v_today_quota_usage
ORDER BY usage_percentage DESC;
```

### Atualizar Plano de um Tenant

```sql
-- Atualizar para plano Pro
UPDATE tenants
SET plano = 'pro'
WHERE nome = 'Seu Tenant';
```

---

## ✅ Checklist de Validação Final

Após executar a migration, verifique:

- [ ] Tabela `quota_logs` criada
- [ ] Coluna `plano` adicionada em `tenants`
- [ ] Colunas `updated_at` adicionadas
- [ ] 4 índices criados em `quota_logs`
- [ ] 2 views criadas
- [ ] 3 funções criadas
- [ ] RLS habilitado
- [ ] Permissões concedidas

---

## Notas Importantes

- ✅ Migration é **idempotente** (seguro executar múltiplas vezes)
- ✅ Usa `IF NOT EXISTS` para evitar conflitos
- ✅ Não apaga dados existentes
- ✅ Inclui verificações automáticas de sucesso
- ⚠️ Faça backup do banco antes de aplicar em produção
- ⚠️ Teste em ambiente de desenvolvimento primeiro

