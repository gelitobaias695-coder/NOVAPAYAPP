-- Migration 013: Gateway Settings (Centralized Payment Configuration)

CREATE TABLE IF NOT EXISTS gateway_settings (
    id SERIAL PRIMARY KEY,
    gateway_name VARCHAR(50) NOT NULL DEFAULT 'paystack',
    secret_key TEXT,
    public_key TEXT,
    webhook_secret TEXT,
    is_live BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one row per gateway_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_gateway_settings_name ON gateway_settings (gateway_name);

-- Insert default row so there is always one row to UPDATE
INSERT INTO gateway_settings (gateway_name, secret_key, public_key, webhook_secret, is_live)
VALUES ('paystack', NULL, NULL, NULL, true)
ON CONFLICT (gateway_name) DO NOTHING;
