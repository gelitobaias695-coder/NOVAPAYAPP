import pool from '../db/pool.js';

// ─── Funnels ──────────────────────────────────────────────────────────────────

export async function findAll() {
    const result = await pool.query(`
        SELECT f.*, p.name AS main_product_name, p.price AS main_product_price, p.currency AS main_product_currency
        FROM funnels f
        LEFT JOIN products p ON f.main_product_id = p.id
        ORDER BY f.created_at DESC
    `);
    return result.rows;
}

async function fetchSubData(client, funnelId) {
    const [bumpsRes, upsellsRes, downsellsRes] = await Promise.all([
        client.query(`
            SELECT ob.*, p.name AS product_name, p.price AS product_price, p.product_image_url, p.currency AS product_currency
            FROM funnel_order_bumps ob
            LEFT JOIN products p ON ob.product_id = p.id
            WHERE ob.funnel_id = $1
            ORDER BY ob.display_order ASC
        `, [funnelId]),
        client.query(`
            SELECT u.*, p.name AS product_name, p.price AS product_price, p.currency AS product_currency,
                   p.billing_type, p.billing_cycle AS product_billing_cycle
            FROM funnel_upsells u
            LEFT JOIN products p ON u.product_id = p.id
            WHERE u.funnel_id = $1
            ORDER BY u.display_order ASC
        `, [funnelId]),
        client.query(`
            SELECT d.*, p.name AS product_name, p.price AS product_price, p.currency AS product_currency
            FROM funnel_downsells d
            LEFT JOIN products p ON d.product_id = p.id
            WHERE d.funnel_id = $1
            ORDER BY d.display_order ASC
        `, [funnelId]),
    ]);
    return {
        order_bumps: bumpsRes.rows,
        // Keep legacy single-item fields for backward compat
        order_bump: bumpsRes.rows[0] ?? null,
        upsells: upsellsRes.rows,
        upsell: upsellsRes.rows[0] ?? null,
        downsells: downsellsRes.rows,
        downsell: downsellsRes.rows[0] ?? null,
    };
}

export async function findById(id) {
    const client = await pool.connect();
    try {
        const funnelRes = await client.query(
            `SELECT f.*, p.name AS main_product_name, p.price AS main_product_price, p.currency AS main_product_currency
             FROM funnels f
             LEFT JOIN products p ON f.main_product_id = p.id
             WHERE f.id = $1`, [id]
        );
        if (!funnelRes.rows[0]) return null;
        const sub = await fetchSubData(client, id);
        return { ...funnelRes.rows[0], ...sub };
    } finally {
        client.release();
    }
}

// Find funnel by main_product_id (for checkout page)
export async function findByProductId(productId) {
    const result = await pool.query(
        `SELECT id FROM funnels WHERE main_product_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [productId]
    );
    if (!result.rows[0]) return null;
    return findById(result.rows[0].id);
}

export async function create(data) {
    const { name, main_product_id, redirect_url, order_bumps, upsells, downsells,
        // legacy single-item support
        order_bump, upsell, downsell } = data;

    const bumps = order_bumps ?? (order_bump ? [order_bump] : []);
    const ups = upsells ?? (upsell ? [upsell] : []);
    const downs = downsells ?? (downsell ? [downsell] : []);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const funnelRes = await client.query(
            `INSERT INTO funnels (name, main_product_id, redirect_url) VALUES ($1, $2, $3) RETURNING *`,
            [name, main_product_id, redirect_url || null]
        );
        const funnel = funnelRes.rows[0];

        for (let i = 0; i < bumps.length; i++) {
            const b = bumps[i];
            if (!b?.product_id) continue;
            await client.query(
                `INSERT INTO funnel_order_bumps (funnel_id, product_id, title, description, discount_type, discount_value, display_order, enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [funnel.id, b.product_id, b.title ?? 'Oferta Especial', b.description ?? '',
                b.discount_type ?? 'percentage', b.discount_value ?? 0, i, b.enabled !== false]
            );
        }

        for (let i = 0; i < ups.length; i++) {
            const u = ups[i];
            if (!u?.product_id) continue;
            await client.query(
                `INSERT INTO funnel_upsells (funnel_id, product_id, is_recurring, billing_cycle, price_override, upsell_page_url, display_order, trial_days)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [funnel.id, u.product_id, u.is_recurring ?? false, u.billing_cycle ?? null,
                u.price_override ?? null, u.upsell_page_url ?? null, i, u.trial_days ?? 0]
            );
        }

        for (let i = 0; i < downs.length; i++) {
            const d = downs[i];
            if (!d?.product_id) continue;
            await client.query(
                `INSERT INTO funnel_downsells (funnel_id, product_id, discount, downsell_page_url, display_order)
                 VALUES ($1, $2, $3, $4, $5)`,
                [funnel.id, d.product_id, d.discount ?? 0, d.downsell_page_url ?? null, i]
            );
        }

        await client.query('COMMIT');
        return findById(funnel.id);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function update(id, data) {
    const { name, main_product_id, redirect_url, order_bumps, upsells, downsells,
        order_bump, upsell, downsell } = data;

    const bumps = order_bumps ?? (order_bump ? [order_bump] : []);
    const ups = upsells ?? (upsell ? [upsell] : []);
    const downs = downsells ?? (downsell ? [downsell] : []);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE funnels SET name=$1, main_product_id=$2, redirect_url=$3, updated_at=NOW() WHERE id=$4`,
            [name, main_product_id, redirect_url || null, id]
        );

        // Clear e re-insert bumps do funil
        console.log(`[FUNNEL UPDATE] Removendo bumps antigos para o funil ${id}...`);
        const deletedBumps = await client.query(`DELETE FROM funnel_order_bumps WHERE funnel_id=$1 RETURNING id`, [id]);
        console.log(`[FUNNEL UPDATE] ${deletedBumps.rowCount} bump(s) removido(s) do funil ${id}`);
        const validBumps = bumps.filter(b => b?.product_id);
        console.log(`[FUNNEL UPDATE] Inserindo ${validBumps.length} novo(s) bump(s) no funil ${id}`);
        for (let i = 0; i < validBumps.length; i++) {
            const b = validBumps[i];
            await client.query(
                `INSERT INTO funnel_order_bumps (funnel_id, product_id, title, description, discount_type, discount_value, display_order, enabled)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [id, b.product_id, b.title ?? 'Oferta Especial', b.description ?? '',
                    b.discount_type ?? 'percentage', b.discount_value ?? 0, i, b.enabled !== false]
            );
        }

        // Clear e re-insert upsells
        console.log(`[FUNNEL UPDATE] Removendo upsells antigos para o funil ${id}...`);
        const deletedUpsells = await client.query(`DELETE FROM funnel_upsells WHERE funnel_id=$1 RETURNING id`, [id]);
        console.log(`[FUNNEL UPDATE] ${deletedUpsells.rowCount} upsell(s) removido(s) do funil ${id}`);
        const validUps = ups.filter(u => u?.product_id);
        console.log(`[FUNNEL UPDATE] Inserindo ${validUps.length} novo(s) upsell(s) no funil ${id}`);
        for (let i = 0; i < validUps.length; i++) {
            const u = validUps[i];
            await client.query(
                `INSERT INTO funnel_upsells (funnel_id, product_id, is_recurring, billing_cycle, price_override, upsell_page_url, display_order, trial_days)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [id, u.product_id, u.is_recurring ?? false, u.billing_cycle ?? null,
                    u.price_override ?? null, u.upsell_page_url ?? null, i, u.trial_days ?? 0]
            );
        }

        // Clear e re-insert downsells
        console.log(`[FUNNEL UPDATE] Removendo downsells antigos para o funil ${id}...`);
        const deletedDownsells = await client.query(`DELETE FROM funnel_downsells WHERE funnel_id=$1 RETURNING id`, [id]);
        console.log(`[FUNNEL UPDATE] ${deletedDownsells.rowCount} downsell(s) removido(s) do funil ${id}`);
        const validDowns = downs.filter(d => d?.product_id);
        console.log(`[FUNNEL UPDATE] Inserindo ${validDowns.length} novo(s) downsell(s) no funil ${id}`);
        for (let i = 0; i < validDowns.length; i++) {
            const d = validDowns[i];
            await client.query(
                `INSERT INTO funnel_downsells (funnel_id, product_id, discount, downsell_page_url, display_order)
                 VALUES ($1,$2,$3,$4,$5)`,
                [id, d.product_id, d.discount ?? 0, d.downsell_page_url ?? null, i]
            );
        }

        await client.query('COMMIT');
        console.log(`[FUNNEL UPDATE] Funil ${id} atualizado: ${validBumps.length} bump(s), ${validUps.length} upsell(s), ${validDowns.length} downsell(s)`);
        return findById(id);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[FUNNEL UPDATE] ERRO — rollback para funil ${id}:`, err.message);
        throw err;
    } finally {
        client.release();
    }
}

export async function remove(id) {
    await pool.query(`DELETE FROM funnels WHERE id=$1`, [id]);
}

// ─── Bump Click Logging ───────────────────────────────────────────────────────

export async function logBumpAction({ order_id, funnel_id, bump_id, product_id, action, extra_revenue }) {
    const result = await pool.query(
        `INSERT INTO bump_click_logs (order_id, funnel_id, bump_id, product_id, action, extra_revenue)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [order_id ?? null, funnel_id ?? null, bump_id ?? null, product_id ?? null, action ?? 'clicked', extra_revenue ?? 0]
    );
    return result.rows[0];
}

export async function getBumpAnalytics(funnelId) {
    const result = await pool.query(`
        SELECT
            bcl.product_id,
            p.name AS product_name,
            COUNT(*) FILTER (WHERE bcl.action = 'viewed')   AS views,
            COUNT(*) FILTER (WHERE bcl.action = 'accepted') AS accepted,
            COUNT(*) FILTER (WHERE bcl.action = 'declined') AS declined,
            SUM(bcl.extra_revenue) FILTER (WHERE bcl.action = 'accepted') AS total_revenue
        FROM bump_click_logs bcl
        LEFT JOIN products p ON bcl.product_id = p.id
        WHERE bcl.funnel_id = $1
        GROUP BY bcl.product_id, p.name
        ORDER BY accepted DESC
    `, [funnelId]);
    return result.rows;
}
