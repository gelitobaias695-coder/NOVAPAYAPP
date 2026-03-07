-- Migration 020: Add Test Keys
ALTER TABLE gateway_settings 
ADD COLUMN IF NOT EXISTS test_secret_key TEXT,
ADD COLUMN IF NOT EXISTS test_public_key TEXT;
