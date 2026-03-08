/**
 * One-time migration script: uploads all existing local /uploads images to Cloudinary
 * and updates the product URLs in the database.
 * 
 * Run with: node migrate_to_cloudinary.js
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in server/.env
 */
import { uploadFile } from './services/cloudinaryService.js';
import pool from './db/pool.js';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, 'uploads');

async function migrate() {
    console.log('🚀 Starting Cloudinary migration...\n');

    // Get all products with local /uploads/ URLs
    const products = await pool.query(
        `SELECT id, name, logo_url, product_image_url FROM products 
         WHERE logo_url LIKE '/uploads/%' OR product_image_url LIKE '/uploads/%'`
    );

    console.log(`Found ${products.rowCount} products with local upload URLs\n`);

    for (const p of products.rows) {
        console.log(`\nProcessing: ${p.name}`);

        let newLogoUrl = p.logo_url;
        let newProductImageUrl = p.product_image_url;

        // Upload logo
        if (p.logo_url?.startsWith('/uploads/')) {
            const filename = p.logo_url.replace('/uploads/', '');
            const localPath = join(uploadsDir, filename);
            try {
                newLogoUrl = await uploadFile(localPath, 'novapay/products');
                console.log(`  ✅ Logo uploaded: ${newLogoUrl}`);
            } catch (err) {
                console.error(`  ❌ Logo upload failed: ${err.message}`);
            }
        }

        // Upload product image
        if (p.product_image_url?.startsWith('/uploads/')) {
            const filename = p.product_image_url.replace('/uploads/', '');
            const localPath = join(uploadsDir, filename);
            try {
                newProductImageUrl = await uploadFile(localPath, 'novapay/products');
                console.log(`  ✅ Product image uploaded: ${newProductImageUrl}`);
            } catch (err) {
                console.error(`  ❌ Product image upload failed: ${err.message}`);
            }
        }

        // Update DB
        await pool.query(
            `UPDATE products SET logo_url = $1, product_image_url = $2, updated_at = NOW() WHERE id = $3`,
            [newLogoUrl, newProductImageUrl, p.id]
        );
        console.log(`  💾 DB updated for product ${p.id}`);
    }

    console.log('\n🎉 Migration complete!');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
