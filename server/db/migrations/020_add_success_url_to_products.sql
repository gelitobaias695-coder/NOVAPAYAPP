-- Migration 020: Add success_url to products table

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS success_url VARCHAR(500);
