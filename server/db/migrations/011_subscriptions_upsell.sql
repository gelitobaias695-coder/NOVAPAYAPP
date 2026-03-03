-- Migration 011: Subscriptions and Upsell
-- Add subscriptions table to track recurring upsells

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID, -- Usually we'd relate this to a users table, but keeping it flexible
    customer_email VARCHAR(255) NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    upsell_origin_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Identifies which product triggered this upsell
    plan_id VARCHAR(255), -- ID of the plan in the gateway
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid')),
    billing_interval VARCHAR(20) DEFAULT 'monthly' CHECK (billing_interval IN ('weekly', 'monthly', 'yearly')),
    subscription_token VARCHAR(255), -- Token from gateway (e.g. customer_vault_id)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions (customer_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_order ON subscriptions (order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

-- Update funnel_upsells to support trial_days and the new interval types
ALTER TABLE funnel_upsells ADD COLUMN IF NOT EXISTS trial_days INT DEFAULT 0;
ALTER TABLE funnel_upsells DROP CONSTRAINT IF EXISTS funnel_upsells_billing_cycle_check;
