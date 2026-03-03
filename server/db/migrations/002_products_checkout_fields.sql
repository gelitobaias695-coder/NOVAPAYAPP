-- Migration 002: Add checkout configuration columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'physical'
  CHECK (type IN ('physical','digital'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#10B981';
ALTER TABLE products ADD COLUMN IF NOT EXISTS require_whatsapp BOOLEAN DEFAULT FALSE;
