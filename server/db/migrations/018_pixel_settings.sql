-- Migration 018: Pixel Settings

CREATE TABLE IF NOT EXISTS pixel_settings (
    id SERIAL PRIMARY KEY,
    pixel_id VARCHAR(100),
    access_token TEXT,
    server_side BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure there is only one settings row (id = 1)
INSERT INTO pixel_settings (id, pixel_id, access_token, server_side) 
VALUES (1, '', '', true)
ON CONFLICT (id) DO NOTHING;
