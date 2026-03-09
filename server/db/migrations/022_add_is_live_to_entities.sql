-- Migration 022: Add is_live column to main entities
ALTER TABLE products ADD COLUMN is_live BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE orders ADD COLUMN is_live BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE funnels ADD COLUMN is_live BOOLEAN NOT NULL DEFAULT true;

-- Update existing records to reflect current mode if needed, 
-- but defaulting to true is a safe start.
