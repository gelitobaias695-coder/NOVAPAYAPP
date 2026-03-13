-- Migration 024: Add payment gateway routing
ALTER TABLE products ADD COLUMN payment_gateway VARCHAR(20) DEFAULT 'paystack';
