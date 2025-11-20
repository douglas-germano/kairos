CREATE TABLE IF NOT EXISTS password_resets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índice para busca rápida por email e código
CREATE INDEX IF NOT EXISTS idx_password_resets_email_code ON password_resets(email, code);

-- Opcional: Limpar códigos expirados automaticamente (se tiver pg_cron ou similar, ou via aplicação)
