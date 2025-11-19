-- Migração: Adicionar coluna password_hash à tabela users
-- Execute este script no SQL Editor do Supabase após criar o schema base

-- Adicionar coluna password_hash (texto, nullable para permitir usuários existentes)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Comentário na coluna (se suportado)
-- COMMENT ON COLUMN users.password_hash IS 'Hash da senha do usuário gerado com werkzeug.security';

-- Nota: Esta coluna é nullable para permitir usuários existentes sem senha.
-- Novos usuários devem sempre ter password_hash preenchido.

