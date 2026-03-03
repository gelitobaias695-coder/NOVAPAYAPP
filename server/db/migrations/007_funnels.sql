CREATE TABLE IF NOT EXISTS funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    main_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    redirect_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS funnel_order_bumps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) DEFAULT 'percentage', -- 'percentage' or 'fixed'
    discount_value DECIMAL(10, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS funnel_upsells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    is_recurring BOOLEAN DEFAULT false,
    billing_cycle VARCHAR(50), -- 'weekly', 'monthly', 'yearly'
    price_override DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS funnel_downsells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    discount DECIMAL(10, 2) DEFAULT 0 -- percentage or fixed
);
