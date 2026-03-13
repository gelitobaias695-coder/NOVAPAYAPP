import pool from '../db/pool.js';
import { getIsLiveMode } from '../services/gatewaySettingsService.js';

const COLUMNS = `
  id, name, description, price, currency, status,
  type, logo_url, product_image_url, primary_color, require_whatsapp,
  checkout_language, is_bump, success_url, email_sender_name, email_sender_email, is_live,
  express_shipping_price, standard_shipping_price, created_at, updated_at
`;

/**
 * Fetch all products ordered by newest first.
 */
export async function findAll() {
    const isLive = await getIsLiveMode();
    const result = await pool.query(
        `SELECT ${COLUMNS} FROM products WHERE is_live = $1 ORDER BY created_at DESC`,
        [isLive]
    );
    return result.rows;
}

/**
 * Fetch a single product by UUID. Returns null if not found.
 * @param {string} id
 */
export async function findById(id) {
    const result = await pool.query(
        `SELECT ${COLUMNS} FROM products WHERE id = $1`,
        [id]
    );
    return result.rows[0] ?? null;
}

/**
 * Insert a new product and return the created record.
 * @param {object} data
 */
export async function create(data) {
    const {
        name, description, price, currency, status,
        type, logo_url, product_image_url, primary_color, require_whatsapp,
        checkout_language, success_url, email_sender_name, email_sender_email,
        is_live, express_shipping_price, standard_shipping_price
    } = data;

    const result = await pool.query(
        `INSERT INTO products
       (name, description, price, currency, status, type, logo_url, product_image_url, primary_color, require_whatsapp, checkout_language, success_url, email_sender_name, email_sender_email, is_live, express_shipping_price, standard_shipping_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING ${COLUMNS}`,
        [
            name,
            description ?? null,
            price,
            currency,
            status,
            type ?? 'physical',
            logo_url ?? null,
            product_image_url ?? null,
            primary_color ?? '#10B981',
            require_whatsapp ?? false,
            checkout_language ?? 'pt',
            success_url ?? null,
            email_sender_name ?? null,
            email_sender_email ?? null,
            is_live ?? true,
            express_shipping_price ?? 0.00,
            standard_shipping_price ?? 0.00
        ]
    );
    return result.rows[0];
}

/**
 * Update an existing product and return the updated record.
 * @param {string} id
 * @param {object} data
 */
export async function update(id, data) {
    const {
        name, description, price, currency, status,
        type, logo_url, product_image_url, primary_color, require_whatsapp,
        checkout_language, success_url, email_sender_name, email_sender_email,
        express_shipping_price, standard_shipping_price
    } = data;

    // Build dynamic update query to handle optional image fields
    let query = `
        UPDATE products SET
        name = $1,
        description = $2,
        price = $3,
        currency = $4,
        status = $5,
        type = $6,
        primary_color = $7,
        require_whatsapp = $8,
        checkout_language = $9,
        success_url = $10,
        email_sender_name = $11,
        email_sender_email = $12,
        express_shipping_price = $13,
        standard_shipping_price = $14,
        updated_at = NOW()
    `;
    const params = [
        name, description ?? null, price, currency, status,
        type ?? 'physical', primary_color ?? '#10B981', require_whatsapp ?? false, checkout_language ?? 'pt', success_url ?? null, email_sender_name ?? null, email_sender_email ?? null,
        express_shipping_price ?? 0.00, standard_shipping_price ?? 0.00
    ];
    let paramCount = params.length;

    if (logo_url !== undefined) {
        paramCount++;
        query += `, logo_url = $${paramCount}`;
        params.push(logo_url);
    }
    if (product_image_url !== undefined) {
        paramCount++;
        query += `, product_image_url = $${paramCount}`;
        params.push(product_image_url);
    }

    paramCount++;
    query += ` WHERE id = $${paramCount} RETURNING ${COLUMNS}`;
    params.push(id);

    const result = await pool.query(query, params);
    return result.rows[0];
}

/**
 * Remove an existing product by ID.
 * @param {string} id 
 */
export async function remove(id) {
    const result = await pool.query(
        `DELETE FROM products WHERE id = $1 RETURNING id`,
        [id]
    );
    return result.rows[0] ?? null;
}

// ─── Product Order Bumps (direct relationship) ────────────────────────────────

/**
 * Fetch all bumps linked to a given main product.
 * Returns full bump product data with relationship metadata.
 * @param {string} mainProductId
 */
export async function findBumpsByProductId(mainProductId) {
    const result = await pool.query(
        `SELECT
            pob.id              AS bump_link_id,
            pob.main_product_id,
            pob.bump_product_id AS product_id,
            pob.title,
            pob.description     AS bump_description,
            pob.discount_type,
            pob.discount_value,
            pob.display_order,
            pob.enabled,
            p.name              AS product_name,
            p.price             AS product_price,
            p.currency          AS product_currency,
            p.product_image_url,
            p.description       AS product_description
         FROM product_order_bumps pob
         JOIN products p ON pob.bump_product_id = p.id
         WHERE pob.main_product_id = $1
           AND pob.enabled = true
           AND p.status = 'active'
         ORDER BY pob.display_order ASC`,
        [mainProductId]
    );
    console.log('[BUMPS] Bumps encontrados para produto', mainProductId, ':', result.rows);
    return result.rows;
}

/**
 * Link a bump product to a main product.
 */
export async function addBumpToProduct(mainProductId, bumpProductId, options = {}) {
    const { title = 'Oferta Exclusiva', description = '', discount_type = 'percentage',
        discount_value = 0, display_order = 0 } = options;
    const result = await pool.query(
        `INSERT INTO product_order_bumps
            (main_product_id, bump_product_id, title, description, discount_type, discount_value, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (main_product_id, bump_product_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            discount_type = EXCLUDED.discount_type,
            discount_value = EXCLUDED.discount_value,
            display_order = EXCLUDED.display_order,
            enabled = true
         RETURNING *`,
        [mainProductId, bumpProductId, title, description, discount_type, discount_value, display_order]
    );
    return result.rows[0];
}

/**
 * Remove a bump link from a main product.
 */
export async function removeBumpFromProduct(mainProductId, bumpProductId) {
    const result = await pool.query(
        `DELETE FROM product_order_bumps
         WHERE main_product_id = $1 AND bump_product_id = $2
         RETURNING id`,
        [mainProductId, bumpProductId]
    );
    return result.rows[0] ?? null;
}

/**
 * SYNC: Atomically replaces ALL bumps for a product.
 * Deletes old bump relations and inserts the new list in a transaction.
 * This prevents duplicates and stale data.
 * @param {string} mainProductId
 * @param {Array} bumps - Array of { bump_product_id, title, description, discount_type, discount_value, display_order }
 */
export async function syncBumpsForProduct(mainProductId, bumps = []) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Remover TODOS os vínculos antigos deste produto (Clear)
        console.log(`[SYNC BUMPS] Removendo bumps antigos para o produto ${mainProductId}...`);
        const deleteResult = await client.query(
            `DELETE FROM product_order_bumps WHERE main_product_id = $1 RETURNING id`,
            [mainProductId]
        );
        console.log(`[SYNC BUMPS] ${deleteResult.rowCount} bump(s) removido(s) do Neon para produto ${mainProductId}`);

        // 2. Inserir apenas os novos bumps (Insert)
        const validBumps = bumps.filter(b => b?.bump_product_id);
        console.log(`[SYNC BUMPS] Inserindo ${validBumps.length} novo(s) bump(s) para produto ${mainProductId}:`, validBumps.map(b => b.bump_product_id));

        for (let i = 0; i < validBumps.length; i++) {
            const b = validBumps[i];
            await client.query(
                `INSERT INTO product_order_bumps
                    (main_product_id, bump_product_id, title, description, discount_type, discount_value, display_order, enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
                [
                    mainProductId,
                    b.bump_product_id,
                    b.title || 'Oferta Exclusiva',
                    b.description || '',
                    b.discount_type || 'percentage',
                    parseFloat(b.discount_value) || 0,
                    i,
                ]
            );
        }

        await client.query('COMMIT');
        console.log(`[SYNC BUMPS] Transação concluída. Produto ${mainProductId}: ${validBumps.length} bump(s) sincronizado(s) no Neon.`);

        // Retornar a lista atualizada do banco para confirmar o estado real
        const result = await findBumpsByProductId(mainProductId);
        console.log(`[SYNC BUMPS] Bumps atuais no banco para produto ${mainProductId}:`, result.map(r => ({ id: r.bump_link_id, name: r.product_name })));
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[SYNC BUMPS] ERRO — rollback executado para produto ${mainProductId}:`, err.message);
        throw err;
    } finally {
        client.release();
    }
}

