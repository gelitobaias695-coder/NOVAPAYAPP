import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import funnelsRouter from './routes/funnels.js';
import upsellRouter from './routes/upsell.js';
import paystackRouter from './routes/paystack.js';
import webhooksRouter from './routes/webhooks.js';
import utmifyRouter from './routes/utmify.js';
import emailRouter from './routes/email.js';
import pixelRouter from './routes/pixelRoutes.js';
import authRouter from './routes/auth.js';
import platformRouter from './routes/platform.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env (works regardless of cwd)
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Product Routes ────────────────────────────────────────────────────────────
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/funnels', funnelsRouter);
app.use('/api/upsells', upsellRouter);
app.use('/api/paystack', paystackRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/utmify', utmifyRouter);
app.use('/api/email', emailRouter);
app.use('/api/pixel', pixelRouter);
app.use('/api/auth', authRouter);
app.use('/api/platform', platformRouter);

// ── Legacy: DB healthcheck + exchange-rates ───────────────────────────────────
const { Pool } = pg;
const pool = process.env.DATABASE_URL
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  })
  : null;

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

// ── Exchange Rates ────────────────────────────────────────────────────────────
const MOCK_API_URL = "https://api.exchangerate-api.com/v4/latest/ZAR";
let cachedRates = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1000 * 60 * 60;

const FALLBACK_RATES = { ZAR: 1, KES: 7.07, TZS: 141.52, NGN: 83.15, GHS: 0.81 };

app.get('/api/exchange-rates', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedRates && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
      return res.json({ base: 'ZAR', rates: cachedRates, source: 'cache' });
    }
    let fetchedRates = FALLBACK_RATES;
    try {
      const response = await fetch(MOCK_API_URL);
      if (response.ok) {
        const data = await response.json();
        if (data?.rates) {
          fetchedRates = {
            ZAR: data.rates.ZAR || 1,
            KES: data.rates.KES || FALLBACK_RATES.KES,
            TZS: data.rates.TZS || FALLBACK_RATES.TZS,
            NGN: data.rates.NGN || FALLBACK_RATES.NGN,
            GHS: data.rates.GHS || FALLBACK_RATES.GHS,
          };
        }
      }
    } catch (e) {
      console.warn("Failed to fetch fresh rates, using fallback.");
    }
    cachedRates = fetchedRates;
    cacheTimestamp = now;
    res.json({ base: 'ZAR', rates: cachedRates, source: 'api' });
  } catch (error) {
    console.error('Error in exchange-rates API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
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
