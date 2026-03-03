-- Migration 012: Paystack Integration Fields

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paystack_reference VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS authorization_code VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_orders_paystack_ref ON orders(paystack_reference);
