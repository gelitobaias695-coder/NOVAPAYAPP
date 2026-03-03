import { useState, useEffect, useCallback } from 'react';

export interface DBProduct {
    id: string;
    name: string;
    description: string | null;
    price: string;
    currency: string;
    status: 'active' | 'inactive';
    type: 'physical' | 'digital';
    logo_url: string | null;
    product_image_url: string | null;
    primary_color: string;
    require_whatsapp: boolean;
    checkout_language: string;
    success_url: string | null;
    email_sender_name: string | null;
    email_sender_email: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateProductInput {
    name: string;
    description?: string;
    price: number;
    currency: string;
    status: 'active' | 'inactive';
    type: 'physical' | 'digital';
    logo_image?: File;
    product_image?: File;
    primary_color?: string;
    require_whatsapp?: boolean;
    checkout_language?: string;
    success_url?: string;
    email_sender_name?: string;
    email_sender_email?: string;
}

interface UseProductsReturn {
    products: DBProduct[];
    isLoading: boolean;
    error: string | null;
    addProduct: (input: CreateProductInput) => Promise<DBProduct>;
    updateProduct: (id: string, input: CreateProductInput) => Promise<DBProduct>;
    deleteProduct: (id: string) => Promise<void>;
    refetch: () => void;
}

export function useProducts(): UseProductsReturn {
    const [products, setProducts] = useState<DBProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setProducts(json.data ?? []);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const addProduct = useCallback(async (input: CreateProductInput): Promise<DBProduct> => {
        const formData = new FormData();
        formData.append('name', input.name);
        if (input.description) formData.append('description', input.description);
        formData.append('price', input.price.toString());
        formData.append('currency', input.currency);
        formData.append('status', input.status);
        formData.append('type', input.type);
        if (input.primary_color) formData.append('primary_color', input.primary_color);
        if (input.require_whatsapp !== undefined) formData.append('require_whatsapp', input.require_whatsapp.toString());
        if (input.checkout_language) formData.append('checkout_language', input.checkout_language);
        if (input.logo_image) formData.append('logo_image', input.logo_image);
        if (input.product_image) formData.append('product_image', input.product_image);
        if (input.success_url) formData.append('success_url', input.success_url);
        if (input.email_sender_name) formData.append('email_sender_name', input.email_sender_name);
        if (input.email_sender_email) formData.append('email_sender_email', input.email_sender_email);

        const res = await fetch('/api/products', {
            method: 'POST',
            body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
            const err = new Error(json.error ?? 'Failed to create product') as Error & { errors?: Record<string, string[]> };
            err.errors = json.errors;
            throw err;
        }
        await fetchProducts();
        return json.data;
    }, [fetchProducts]);

    const updateProduct = useCallback(async (id: string, input: CreateProductInput): Promise<DBProduct> => {
        const formData = new FormData();
        formData.append('name', input.name);
        // Always append description (even empty string) to avoid losing the value on update
        formData.append('description', input.description ?? '');
        formData.append('price', input.price.toString());
        formData.append('currency', input.currency);
        formData.append('status', input.status);
        formData.append('type', input.type);
        formData.append('primary_color', input.primary_color ?? '#10B981');
        // Always send require_whatsapp as explicit boolean string
        formData.append('require_whatsapp', String(input.require_whatsapp ?? false));
        formData.append('checkout_language', input.checkout_language ?? 'pt');
        if (input.logo_image) formData.append('logo_image', input.logo_image);
        if (input.product_image) formData.append('product_image', input.product_image);
        if (input.success_url) formData.append('success_url', input.success_url);
        if (input.email_sender_name) formData.append('email_sender_name', input.email_sender_name);
        if (input.email_sender_email) formData.append('email_sender_email', input.email_sender_email);

        const res = await fetch(`/api/products/${id}`, {
            method: 'PUT',
            body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
            const err = new Error(json.error ?? 'Failed to update product') as Error & { errors?: Record<string, string[]> };
            err.errors = json.errors;
            throw err;
        }
        await fetchProducts();
        return json.data;
    }, [fetchProducts]);

    const deleteProduct = useCallback(async (id: string): Promise<void> => {
        const res = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error ?? 'Failed to delete product');
        }
        await fetchProducts();
    }, [fetchProducts]);

    return { products, isLoading, error, addProduct, updateProduct, deleteProduct, refetch: fetchProducts };
}

export function useProduct(id: string | undefined) {
    const [product, setProduct] = useState<DBProduct | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        setError(null);
        fetch(`/api/products/${id}`)
            .then(async (res) => {
                if (!res.ok) throw new Error(res.status === 404 ? 'Produto não encontrado.' : `HTTP ${res.status}`);
                const json = await res.json();
                setProduct(json.data);
            })
            .catch((err) => setError(err.message))
            .finally(() => setIsLoading(false));
    }, [id]);

    return { product, isLoading, error };
}
