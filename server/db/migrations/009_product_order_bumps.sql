-- Migration 009: Product Order Bumps Direct Relationship
-- Allows bumps to be linked directly to products (independent of funnels)

-- 1. Add is_bump flag to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bump BOOLEAN NOT NULL DEFAULT false;

-- 2. Create the product_order_bumps pivot table
CREATE TABLE IF NOT EXISTS product_order_bumps (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    main_product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    bump_product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title           TEXT        NOT NULL DEFAULT 'Oferta Exclusiva',
    description     TEXT,
    discount_type   VARCHAR(20) NOT NULL DEFAULT 'percentage'
                    CHECK (discount_type IN ('percentage', 'fixed', 'none')),
    discount_value  NUMERIC(10,2) NOT NULL DEFAULT 0,
    display_order   INT         NOT NULL DEFAULT 0,
    enabled         BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (main_product_id, bump_product_id)
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_pob_main_product ON product_order_bumps (main_product_id);
CREATE INDEX IF NOT EXISTS idx_pob_bump_product ON product_order_bumps (bump_product_id);
CREATE INDEX IF NOT EXISTS idx_pob_enabled       ON product_order_bumps (enabled);
CREATE INDEX IF NOT EXISTS idx_pob_order         ON product_order_bumps (display_order ASC);
