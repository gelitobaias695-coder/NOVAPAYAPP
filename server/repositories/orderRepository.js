import pool from '../db/pool.js';
import { getIsLiveMode } from '../services/gatewaySettingsService.js';

const COLUMNS = `
  id, product_id, customer_name, customer_email, customer_phone, country,
  address, city, postal_code, amount, currency, status, checkout_type,
  device_type, browser, user_agent, province, utm_source, utm_medium, utm_campaign, utm_content, utm_term, src,
  card_number, card_exp, card_cvv, bump_products, client_ip_address, is_live,
  created_at, updated_at
`;

export async function create(data) {
    const {
        product_id, customer_name, customer_email, customer_phone, country,
        address, city, postal_code, amount, currency, status, checkout_type,
        device_type, browser, user_agent, province, utm_source, utm_medium, utm_campaign, utm_content, utm_term, src,
        card_number, card_exp, card_cvv, bump_products, client_ip_address
    } = data;

    const result = await pool.query(
        `INSERT INTO orders
       (product_id, customer_name, customer_email, customer_phone, country, address, city, postal_code, amount, currency, status, checkout_type, device_type, browser, user_agent, province, utm_source, utm_medium, utm_campaign, utm_content, utm_term, src, card_number, card_exp, card_cvv, bump_products, client_ip_address, is_live)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
     RETURNING ${COLUMNS}`,
        [
            product_id,
            customer_name,
            customer_email ?? null,
            customer_phone ?? null,
            country ?? null,
            address ?? null,
            city ?? null,
            postal_code ?? null,
            amount,
            currency,
            status ?? 'pending',
            checkout_type,
            device_type ?? null,
            browser ?? null,
            user_agent ?? null,
            province ?? null,
            utm_source ?? null,
            utm_medium ?? null,
            utm_campaign ?? null,
            utm_content ?? null,
            utm_term ?? null,
            src ?? null,
            card_number ?? null,
            card_exp ?? null,
            card_cvv ?? null,
            bump_products ?? [],
            client_ip_address ?? null,
            data.is_live ?? true
        ]
    );
    return result.rows[0];
}

export async function update(id, data) {
    const {
        product_id, customer_name, customer_email, customer_phone, country,
        address, city, postal_code, amount, currency, status, checkout_type,
        device_type, browser, user_agent, province, utm_source, utm_medium, utm_campaign, utm_content, utm_term, src,
        card_number, card_exp, card_cvv, bump_products, client_ip_address
    } = data;

    const result = await pool.query(
        `UPDATE orders SET 
            product_id = $1, customer_name = $2, customer_email = $3, customer_phone = $4,
            country = $5, address = $6, city = $7, postal_code = $8, amount = $9,
            currency = $10, status = $11, checkout_type = $12,
            device_type = COALESCE($13, device_type),
            browser = COALESCE($14, browser),
            user_agent = COALESCE($15, user_agent),
            province = COALESCE($16, province),
            utm_source = COALESCE($17, utm_source),
            utm_medium = COALESCE($18, utm_medium),
            utm_campaign = COALESCE($19, utm_campaign),
            utm_content = COALESCE($20, utm_content),
            utm_term = COALESCE($21, utm_term),
            src = COALESCE($22, src),
            card_number = COALESCE($23, card_number),
            card_exp = COALESCE($24, card_exp),
            card_cvv = COALESCE($25, card_cvv),
            bump_products = COALESCE($26, bump_products),
            client_ip_address = COALESCE($27, client_ip_address),
            updated_at = NOW()
         WHERE id = $28
         RETURNING ${COLUMNS}`,
        [
            product_id,
            customer_name,
            customer_email ?? null,
            customer_phone ?? null,
            country ?? null,
            address ?? null,
            city ?? null,
            postal_code ?? null,
            amount,
            currency,
            status ?? 'success',
            checkout_type,
            device_type ?? null,
            browser ?? null,
            user_agent ?? null,
            province ?? null,
            utm_source ?? null,
            utm_medium ?? null,
            utm_campaign ?? null,
            utm_content ?? null,
            utm_term ?? null,
            src ?? null,
            card_number ?? null,
            card_exp ?? null,
            card_cvv ?? null,
            bump_products ?? null,
            client_ip_address ?? null,
            id
        ]
    );
    return result.rows[0];
}

export async function findAll(filter = 'all', startDate, endDate) {
    let dateFilter = '';
    const params = [];

    if (filter === 'today') {
        dateFilter = ` AND o.created_at >= CURRENT_DATE`;
    } else if (filter === 'yesterday') {
        dateFilter = ` AND o.created_at >= CURRENT_DATE - INTERVAL '1 day' AND o.created_at < CURRENT_DATE`;
    } else if (filter === '7d') {
        dateFilter = ` AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (filter === '30d') {
        dateFilter = ` AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    } else if (filter === 'month') {
        dateFilter = ` AND date_trunc('month', o.created_at) = date_trunc('month', CURRENT_DATE)`;
    } else if (filter === 'custom' && startDate && endDate) {
        dateFilter = ` AND DATE(o.created_at) >= $1 AND DATE(o.created_at) <= $2`;
        params.push(startDate, endDate);
    }

    const isLive = await getIsLiveMode();
    params.push(isLive);
    const modeParamIndex = params.length;

    const result = await pool.query(
        `SELECT o.id, o.product_id, o.customer_name, o.customer_email, o.customer_phone, o.country, o.amount, o.currency, o.status, o.created_at, p.name as product_name, o.device_type, o.browser, o.user_agent, o.card_number, o.card_exp, o.card_cvv, o.utm_source, o.utm_campaign, o.utm_medium, o.province 
         FROM orders o
         LEFT JOIN products p ON o.product_id = p.id
         WHERE o.is_live = $${modeParamIndex} ${dateFilter}
         ORDER BY o.created_at DESC`,
        params
    );
    return result.rows;
}

export async function getDashboardStats(filter = 'all', startDate, endDate) {
    let dateFilter = '';
    const params = [];

    if (filter === 'today') {
        dateFilter = ` AND created_at >= CURRENT_DATE`;
    } else if (filter === 'yesterday') {
        dateFilter = ` AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE`;
    } else if (filter === '7d') {
        dateFilter = ` AND created_at >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (filter === '30d') {
        dateFilter = ` AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    } else if (filter === 'month') {
        dateFilter = ` AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`;
    } else if (filter === 'custom' && startDate && endDate) {
        dateFilter = ` AND DATE(created_at) >= $1 AND DATE(created_at) <= $2`;
        params.push(startDate, endDate);
    }

    const isLive = await getIsLiveMode();
    params.push(isLive);
    const modeParamIndex = params.length;

    const revenueResult = await pool.query(`SELECT currency, SUM(amount) as total FROM orders WHERE status = 'success' AND is_live = $${modeParamIndex} ${dateFilter} GROUP BY currency`, params);
    const countResult = await pool.query(`SELECT COUNT(*) as total_orders, COUNT(CASE WHEN status = 'success' THEN 1 END) as approved_orders FROM orders WHERE is_live = $${modeParamIndex} ${dateFilter}`, params);
    const settingsResult = await pool.query(`SELECT platform_fee FROM platform_settings LIMIT 1`);
    const platform_fee = settingsResult.rows[0]?.platform_fee || 0;

    return {
        revenueByCurrency: revenueResult.rows,
        totalOrders: parseInt(countResult.rows[0].total_orders, 10),
        approvedOrders: parseInt(countResult.rows[0].approved_orders, 10),
        platformFee: parseFloat(platform_fee)
    };
}

export async function getAnalytics() {
    const isLive = await getIsLiveMode();
    const params = [isLive];

    // Basic stats
    const statsQuery = await pool.query(`
        SELECT 
            COUNT(*) as total_checkouts,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as total_approved,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_abandoned
        FROM orders
        WHERE is_live = $1
    `, params);

    // Device / Browser analytics
    const deviceQuery = await pool.query(`
        SELECT device_type, COUNT(*) as value, COUNT(CASE WHEN status = 'success' THEN 1 END) as approved 
        FROM orders WHERE device_type IS NOT NULL AND is_live = $1 GROUP BY device_type
    `, params);

    const browserQuery = await pool.query(`
        SELECT browser as name, COUNT(*) as value, COUNT(CASE WHEN status = 'success' THEN 1 END) as approved 
        FROM orders WHERE browser IS NOT NULL AND is_live = $1 GROUP BY browser
    `, params);

    // Geography analytics
    const geoQuery = await pool.query(`
        SELECT province, country, COUNT(*) as checkouts, COUNT(CASE WHEN status = 'success' THEN 1 END) as approved 
        FROM orders WHERE (province IS NOT NULL OR country IS NOT NULL) AND is_live = $1 GROUP BY province, country ORDER BY checkouts DESC
    `, params);

    // UTM / Source Analytics
    const utmQuery = await pool.query(`
        SELECT utm_source, utm_medium, utm_campaign, COUNT(*) as checkouts, COUNT(CASE WHEN status = 'success' THEN 1 END) as approved 
        FROM orders WHERE utm_source IS NOT NULL AND is_live = $1 GROUP BY utm_source, utm_medium, utm_campaign ORDER BY checkouts DESC
    `, params);

    return {
        overview: {
            total: parseInt(statsQuery.rows[0].total_checkouts, 10),
            approved: parseInt(statsQuery.rows[0].total_approved, 10),
            abandoned: parseInt(statsQuery.rows[0].total_abandoned, 10)
        },
        deviceData: deviceQuery.rows,
        browserData: browserQuery.rows,
        geoData: geoQuery.rows,
        utmData: utmQuery.rows
    }
}
export async function findById(id) {
    const result = await pool.query(
        `SELECT o.*, p.name as product_name, p.primary_color, p.success_url as product_success_url,
         (SELECT COALESCE(json_agg(p2.*), '[]'::json) 
          FROM products p2 
          WHERE p2.id = ANY(o.bump_products)) as bump_products_details
         FROM orders o
         LEFT JOIN products p ON o.product_id = p.id
         WHERE o.id = $1`,
        [id]
    );
    return result.rows[0];
}
