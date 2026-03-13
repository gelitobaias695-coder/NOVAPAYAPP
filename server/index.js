import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getRates } from './services/exchangeRatesService.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import funnelsRouter from './routes/funnels.js';
import upsellRouter from './routes/upsell.js';
import paystackRouter from './routes/paystack.js';
import e2paymentsRouter from './routes/e2payments.js';
import webhooksRouter from './routes/webhooks.js';
import utmifyRouter from './routes/utmify.js';
import emailRouter from './routes/email.js';
import pixelRouter from './routes/pixelRoutes.js';
import authRouter from './routes/auth.js';
import platformRouter from './routes/platform.js';
import adminRouter from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env (works regardless of cwd)
dotenv.config({ path: path.join(__dirname, '.env') });
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('?sslmode=require', '?sslmode=verify-full');
}

const app = express();
app.use(cors());
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Product Routes ────────────────────────────────────────────────────────────
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/funnels', funnelsRouter);
app.use('/api/upsells', upsellRouter);
app.use('/api/paystack', paystackRouter);
app.use('/api/e2payments', e2paymentsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/utmify', utmifyRouter);
app.use('/api/email', emailRouter);
app.use('/api/pixel', pixelRouter);
app.use('/api/auth', authRouter);
app.use('/api/platform', platformRouter);
app.use('/api/admin', adminRouter);

const { Pool } = pg;
const pool = process.env.DATABASE_URL
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  })
  : null;

if (pool) {
  pool.query(`
    ALTER TABLE gateway_settings 
    ADD COLUMN IF NOT EXISTS test_secret_key TEXT,
    ADD COLUMN IF NOT EXISTS test_public_key TEXT;
  `).then(() => console.log('[DB] Test keys columns ensured'))
    .catch(e => console.error('[DB] Error auto-migrating test keys:', e.message));

  // Upsell order tracking columns
  pool.query(`
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS parent_order_id UUID,
    ADD COLUMN IF NOT EXISTS checkout_type TEXT DEFAULT 'physical';
  `).then(() => console.log('[DB] Upsell order columns ensured'))
    .catch(e => console.error('[DB] Error auto-migrating upsell columns:', e.message));

  // Subscriptions table (for recurring upsells)
  pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_email VARCHAR(255) NOT NULL,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        upsell_origin_id UUID REFERENCES products(id) ON DELETE SET NULL,
        plan_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        billing_interval VARCHAR(20) DEFAULT 'monthly',
        subscription_token VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).then(() => console.log('[DB] Subscriptions table ensured'))
    .catch(e => console.error('[DB] Error auto-migrating subscriptions table:', e.message));

  // Bump click logs table (for analytics)
  pool.query(`
    CREATE TABLE IF NOT EXISTS bump_click_logs (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id    UUID        REFERENCES orders(id) ON DELETE SET NULL,
        funnel_id   UUID        REFERENCES funnels(id) ON DELETE SET NULL,
        bump_id     UUID        REFERENCES funnel_order_bumps(id) ON DELETE SET NULL,
        product_id  UUID        REFERENCES products(id) ON DELETE SET NULL,
        action      VARCHAR(20) NOT NULL DEFAULT 'viewed',
        extra_revenue NUMERIC(12,2) DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).then(() => console.log('[DB] Bump logs table ensured'))
    .catch(e => console.error('[DB] Error auto-migrating bump logs table:', e.message));

  // Mode separation and missing columns
  pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS express_shipping_price DECIMAL(12,2) DEFAULT 0.00;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS standard_shipping_price DECIMAL(12,2) DEFAULT 0.00;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE funnels ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50) DEFAULT '#10B981';
  `).then(() => console.log('[DB] Base columns ensured'))
    .catch(e => console.error('[DB] Error auto-migrating base columns:', e.message));
}

app.get('/api/db-test', async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: 'error',
      message: 'DATABASE_URL not configured in .env file.',
    });
  }

  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT version()');
    return res.json({
      status: 'success',
      message: 'Connected to Neon Database successfully!',
      version: result.rows[0].version,
    });
  } catch (error) {
    console.error('Database connection error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to connect to database',
      details: error.message,
    });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/exchange-rates', async (req, res) => {
  try {
    const rates = await getRates();
    res.json({ base: 'ZAR', rates, source: 'api' });
  } catch (error) {
    console.error('Error in exchange-rates API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Global Error Handler ──────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[ERROR] ${req.method} ${req.path} → ${statusCode}: ${message}`);
  if (err.errors) console.error('[VALIDATION]', JSON.stringify(err.errors));

  res.status(statusCode).json({
    error: message,
    ...(err.errors && { errors: err.errors }),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Express API running on http://localhost:${PORT}`);
  if (process.env.DATABASE_URL) {
    console.log(`[DB] Neon is configured.`);
  } else {
    console.warn(`[DB] DATABASE_URL not set.`);
  }
});
