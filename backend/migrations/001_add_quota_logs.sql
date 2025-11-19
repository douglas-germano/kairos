-- =====================================================
-- MIGRATION 001: Quota System and Database Improvements
-- Date: 2025-11-14
-- Description: Add quota tracking system and improve existing tables
-- =====================================================

-- =====================================================
-- 1. ADD PLANO COLUMN TO TENANTS TABLE
-- =====================================================

-- Add plano column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenants' AND column_name = 'plano'
    ) THEN
        ALTER TABLE tenants ADD COLUMN plano TEXT DEFAULT 'free';
    END IF;
END $$;

-- Add constraint for valid plan values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_plano_valid'
    ) THEN
        ALTER TABLE tenants
        ADD CONSTRAINT check_plano_valid
        CHECK (plano IN ('free', 'pro', 'enterprise'));
    END IF;
END $$;

-- Update existing tenants to free plan if null
UPDATE tenants SET plano = 'free' WHERE plano IS NULL;

-- Add comment
COMMENT ON COLUMN tenants.plano IS 'Plano do tenant: free, pro ou enterprise';

-- =====================================================
-- 2. CREATE QUOTA_LOGS TABLE
-- =====================================================

-- Create quota_logs table
CREATE TABLE IF NOT EXISTS quota_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for quota checking (most common query)
CREATE INDEX IF NOT EXISTS idx_quota_logs_tenant_action_date
ON quota_logs(tenant_id, action, created_at DESC);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_quota_logs_created_at
ON quota_logs(created_at DESC);

-- Index for user analytics
CREATE INDEX IF NOT EXISTS idx_quota_logs_user_id
ON quota_logs(user_id, created_at DESC);

-- Composite index for tenant analytics
CREATE INDEX IF NOT EXISTS idx_quota_logs_tenant_created
ON quota_logs(tenant_id, created_at DESC);

-- =====================================================
-- 4. ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE quota_logs IS 'Logs de uso de quotas por tenant e usuário para controle de limites de plano';
COMMENT ON COLUMN quota_logs.id IS 'Identificador único do log';
COMMENT ON COLUMN quota_logs.tenant_id IS 'ID do tenant que realizou a ação';
COMMENT ON COLUMN quota_logs.user_id IS 'ID do usuário que realizou a ação';
COMMENT ON COLUMN quota_logs.action IS 'Tipo de ação rastreada (api_calls_per_day, custom_ais, projects, conversations, swipes, messages_per_conversation)';
COMMENT ON COLUMN quota_logs.created_at IS 'Data e hora da ação';

-- =====================================================
-- 5. IMPROVE EXISTING TABLES (Optional enhancements)
-- =====================================================

-- Add updated_at to tenants if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenants' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE tenants ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- 6. CREATE FUNCTION TO AUTO-UPDATE updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Trigger for tenants
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. CREATE USEFUL VIEWS FOR ANALYTICS
-- =====================================================

-- View: Daily quota usage by tenant
CREATE OR REPLACE VIEW v_daily_quota_usage AS
SELECT
    t.id as tenant_id,
    t.nome as tenant_name,
    t.plano,
    ql.action,
    DATE(ql.created_at) as date,
    COUNT(*) as usage_count
FROM quota_logs ql
JOIN tenants t ON t.id = ql.tenant_id
GROUP BY t.id, t.nome, t.plano, ql.action, DATE(ql.created_at)
ORDER BY DATE(ql.created_at) DESC, t.nome, ql.action;

COMMENT ON VIEW v_daily_quota_usage IS 'Uso diário de quota por tenant e tipo de ação';

-- View: Current day quota usage (for quick checking)
CREATE OR REPLACE VIEW v_today_quota_usage AS
SELECT
    t.id as tenant_id,
    t.nome as tenant_name,
    t.plano,
    ql.action,
    COUNT(*) as usage_count,
    CASE t.plano
        WHEN 'free' THEN
            CASE ql.action
                WHEN 'api_calls_per_day' THEN 100
                WHEN 'conversations' THEN 10
                WHEN 'custom_ais' THEN 2
                WHEN 'projects' THEN 5
                WHEN 'swipes' THEN 50
                ELSE 100
            END
        WHEN 'pro' THEN
            CASE ql.action
                WHEN 'api_calls_per_day' THEN 10000
                WHEN 'conversations' THEN 1000
                WHEN 'custom_ais' THEN 50
                WHEN 'projects' THEN 100
                WHEN 'swipes' THEN 5000
                ELSE 10000
            END
        ELSE 999999
    END as quota_limit,
    ROUND(
        (COUNT(*)::NUMERIC /
        CASE t.plano
            WHEN 'free' THEN
                CASE ql.action
                    WHEN 'api_calls_per_day' THEN 100
                    WHEN 'conversations' THEN 10
                    WHEN 'custom_ais' THEN 2
                    WHEN 'projects' THEN 5
                    WHEN 'swipes' THEN 50
                    ELSE 100
                END
            WHEN 'pro' THEN
                CASE ql.action
                    WHEN 'api_calls_per_day' THEN 10000
                    WHEN 'conversations' THEN 1000
                    WHEN 'custom_ais' THEN 50
                    WHEN 'projects' THEN 100
                    WHEN 'swipes' THEN 5000
                    ELSE 10000
                END
            ELSE 999999
        END::NUMERIC) * 100, 2
    ) as usage_percentage
FROM quota_logs ql
JOIN tenants t ON t.id = ql.tenant_id
WHERE DATE(ql.created_at) = CURRENT_DATE
GROUP BY t.id, t.nome, t.plano, ql.action
ORDER BY usage_percentage DESC;

COMMENT ON VIEW v_today_quota_usage IS 'Uso de quota do dia atual com percentual de utilização';

-- =====================================================
-- 9. CREATE FUNCTION TO CLEANUP OLD QUOTA LOGS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_quota_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM quota_logs
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_quota_logs IS 'Remove logs de quota mais antigos que X dias (padrão: 90 dias)';

-- =====================================================
-- 10. CREATE FUNCTION TO CHECK QUOTA
-- =====================================================

CREATE OR REPLACE FUNCTION check_tenant_quota(
    p_tenant_id UUID,
    p_action TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_plano TEXT;
    v_limit INTEGER;
    v_usage INTEGER;
    v_result JSONB;
BEGIN
    -- Get tenant plan
    SELECT plano INTO v_plano
    FROM tenants
    WHERE id = p_tenant_id;

    IF v_plano IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'error', 'Tenant not found'
        );
    END IF;

    -- Get quota limit based on plan and action
    v_limit := CASE v_plano
        WHEN 'free' THEN
            CASE p_action
                WHEN 'api_calls_per_day' THEN 100
                WHEN 'conversations' THEN 10
                WHEN 'custom_ais' THEN 2
                WHEN 'projects' THEN 5
                WHEN 'swipes' THEN 50
                WHEN 'messages_per_conversation' THEN 50
                ELSE 100
            END
        WHEN 'pro' THEN
            CASE p_action
                WHEN 'api_calls_per_day' THEN 10000
                WHEN 'conversations' THEN 1000
                WHEN 'custom_ais' THEN 50
                WHEN 'projects' THEN 100
                WHEN 'swipes' THEN 5000
                WHEN 'messages_per_conversation' THEN 5000
                ELSE 10000
            END
        ELSE 999999 -- enterprise
    END;

    -- Count today's usage
    SELECT COUNT(*) INTO v_usage
    FROM quota_logs
    WHERE tenant_id = p_tenant_id
        AND action = p_action
        AND created_at >= CURRENT_DATE;

    -- Build result
    v_result := jsonb_build_object(
        'allowed', v_usage < v_limit,
        'plan', v_plano,
        'action', p_action,
        'limit', v_limit,
        'usage', v_usage,
        'remaining', GREATEST(0, v_limit - v_usage),
        'percentage', ROUND((v_usage::NUMERIC / v_limit::NUMERIC) * 100, 2)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_tenant_quota IS 'Verifica se tenant pode realizar ação baseado em sua quota';

-- =====================================================
-- 11. CREATE RLS POLICIES (Row Level Security)
-- =====================================================

-- Enable RLS on quota_logs
ALTER TABLE quota_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own quota logs
CREATE POLICY quota_logs_user_select ON quota_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own quota logs
CREATE POLICY quota_logs_user_insert ON quota_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Tenant admins can see all logs from their tenant
CREATE POLICY quota_logs_tenant_admin_select ON quota_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tenant_users tu
            WHERE tu.tenant_id = quota_logs.tenant_id
                AND tu.user_id = auth.uid()
                AND tu.role IN ('admin', 'owner')
        )
    );

-- =====================================================
-- 12. GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT ON quota_logs TO authenticated;
GRANT SELECT ON v_daily_quota_usage TO authenticated;
GRANT SELECT ON v_today_quota_usage TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION check_tenant_quota TO authenticated;

-- =====================================================
-- 13. INSERT SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment to insert sample quota logs for testing
/*
INSERT INTO quota_logs (tenant_id, user_id, action, created_at)
SELECT
    t.id,
    tu.user_id,
    'api_calls_per_day',
    NOW() - (random() * INTERVAL '24 hours')
FROM tenants t
JOIN tenant_users tu ON tu.tenant_id = t.id
LIMIT 10;
*/

-- =====================================================
-- 14. VERIFICATION QUERIES
-- =====================================================

-- Verify quota_logs table was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quota_logs') THEN
        RAISE NOTICE 'SUCCESS: quota_logs table created';
    ELSE
        RAISE EXCEPTION 'FAILED: quota_logs table not created';
    END IF;
END $$;

-- Verify plano column was added to tenants
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenants' AND column_name = 'plano'
    ) THEN
        RAISE NOTICE 'SUCCESS: plano column added to tenants';
    ELSE
        RAISE EXCEPTION 'FAILED: plano column not added to tenants';
    END IF;
END $$;

-- Verify indexes were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quota_logs_tenant_action_date') THEN
        RAISE NOTICE 'SUCCESS: Indexes created';
    ELSE
        RAISE EXCEPTION 'FAILED: Indexes not created';
    END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- =====================================================

-- Show summary
SELECT
    'Migration 001 completed!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'quota_logs') as quota_logs_table_created,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'plano') as plano_column_added,
    (SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_quota_logs%') as indexes_created,
    (SELECT COUNT(*) FROM pg_views WHERE viewname LIKE 'v_%quota%') as views_created;
