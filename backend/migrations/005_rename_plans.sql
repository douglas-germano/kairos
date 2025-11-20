-- Rename 'pro' to 'light'
UPDATE tenants SET plano = 'light' WHERE plano = 'pro';

-- Rename 'enterprise' to 'pro'
UPDATE tenants SET plano = 'pro' WHERE plano = 'enterprise';
