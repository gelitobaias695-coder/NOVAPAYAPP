-- Migration 025: E2Payments Gateway Fields
ALTER TABLE gateway_settings
ADD COLUMN IF NOT EXISTS e2p_wallet_mpesa TEXT,
ADD COLUMN IF NOT EXISTS e2p_wallet_emola TEXT;

INSERT INTO gateway_settings (gateway_name, is_live)
VALUES ('e2payments', true)
ON CONFLICT (gateway_name) DO NOTHING;
