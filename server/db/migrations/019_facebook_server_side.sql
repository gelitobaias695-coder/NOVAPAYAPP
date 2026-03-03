-- Migration 019: Facebook CAPI Events & Orders IP Address

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS client_ip_address VARCHAR(45);

ALTER TABLE pixel_settings
ADD COLUMN IF NOT EXISTS app_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS app_secret VARCHAR(255);

CREATE TABLE IF NOT EXISTS facebook_events_log (
    id SERIAL PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    event_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update default app secret / app id from instructions
UPDATE pixel_settings 
SET app_id = '868577789560345', app_secret = '4d558c5593ec701f7a72cf501785e777' 
WHERE id = 1;
