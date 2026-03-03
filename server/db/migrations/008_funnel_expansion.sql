-- Migration 008: Funnel Expansion
-- Multi-Bumps, Upsell/Downsell URLs, Recurrence, Bump Click Logs

-- 1. Products: add billing_type, upsell_url, downsell_url
ALTER TABLE products ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20) NOT NULL DEFAULT 'one_time'
    CHECK (billing_type IN ('one_time', 'subscription'));

ALTER TABLE products ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20)
    CHECK (billing_cycle IN ('weekly', 'monthly', 'yearly'));

ALTER TABLE products ADD COLUMN IF NOT EXISTS upsell_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS downsell_url TEXT;

-- 2. funnel_order_bumps: allow multiple bumps, add display_order, enabled flag
ALTER TABLE funnel_order_bumps ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;
ALTER TABLE funnel_order_bumps ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;

-- 3. funnel_upsells: add URL overrides and multi-level support
ALTER TABLE funnel_upsells ADD COLUMN IF NOT EXISTS upsell_page_url TEXT;
ALTER TABLE funnel_upsells ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

-- 4. funnel_downsells: add URL overrides and multi-level support  
ALTER TABLE funnel_downsells ADD COLUMN IF NOT EXISTS downsell_page_url TEXT;
ALTER TABLE funnel_downsells ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

-- 5. Bump click log (analytics)
CREATE TABLE IF NOT EXISTS bump_click_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID        REFERENCES orders(id) ON DELETE SET NULL,
    funnel_id   UUID        REFERENCES funnels(id) ON DELETE SET NULL,
    bump_id     UUID        REFERENCES funnel_order_bumps(id) ON DELETE SET NULL,
    product_id  UUID        REFERENCES products(id) ON DELETE SET NULL,
    action      VARCHAR(20) NOT NULL DEFAULT 'viewed'  -- 'viewed', 'clicked', 'accepted', 'declined'
                CHECK (action IN ('viewed', 'clicked', 'accepted', 'declined')),
    extra_revenue NUMERIC(12,2) DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bump_log_funnel   ON bump_click_logs (funnel_id);
CREATE INDEX IF NOT EXISTS idx_bump_log_product  ON bump_click_logs (product_id);
CREATE INDEX IF NOT EXISTS idx_bump_log_order    ON bump_click_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_bump_log_action   ON bump_click_logs (action);
CREATE INDEX IF NOT EXISTS idx_bump_log_created  ON bump_click_logs (created_at DESC);
