-- Migration 010: Add indexes to improve lookup performance for bump/upsell/downsell sync
-- This ensures that DELETE + INSERT operations are fast and consistent

-- Index on product_order_bumps.main_product_id — speeds up bump sync queries
CREATE INDEX IF NOT EXISTS idx_product_order_bumps_main_product_id
    ON product_order_bumps (main_product_id);

-- Index on funnel_order_bumps.funnel_id — speeds up funnel bump queries
CREATE INDEX IF NOT EXISTS idx_funnel_order_bumps_funnel_id
    ON funnel_order_bumps (funnel_id);

-- Index on funnel_upsells.funnel_id — speeds up upsell queries
CREATE INDEX IF NOT EXISTS idx_funnel_upsells_funnel_id
    ON funnel_upsells (funnel_id);

-- Index on funnel_downsells.funnel_id — speeds up downsell queries
CREATE INDEX IF NOT EXISTS idx_funnel_downsells_funnel_id
    ON funnel_downsells (funnel_id);

-- Index on funnels.main_product_id — speeds up checkout funnel lookup
CREATE INDEX IF NOT EXISTS idx_funnels_main_product_id
    ON funnels (main_product_id);
