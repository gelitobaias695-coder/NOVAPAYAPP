-- Migration: 001_create_products
-- Neon PostgreSQL (pgcrypto is available by default)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS products (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  description TEXT,
  price       NUMERIC(12, 2) NOT NULL,
  currency    VARCHAR(10)  NOT NULL DEFAULT 'ZAR',
  status      VARCHAR(20)  NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_status     ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);
