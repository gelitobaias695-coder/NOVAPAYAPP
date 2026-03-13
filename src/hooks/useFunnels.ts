import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// ... (existing types FunnelOrderBump, FunnelUpsell, FunnelDownsell, Funnel)
export interface FunnelOrderBump {
    id?: string;
    funnel_id?: string;
    product_id?: string | null;
    product_name?: string;
    product_price?: string;
    product_image_url?: string | null;
    product_currency?: string;
    title?: string;
    description?: string;
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    enabled?: boolean;
    display_order?: number;
}

export interface FunnelUpsell {
    id?: string;
    product_id?: string | null;
    product_name?: string;
    product_price?: string;
    product_currency?: string;
    billing_type?: string;
    product_billing_cycle?: string | null;
    is_recurring?: boolean;
    billing_cycle?: 'weekly' | 'monthly' | 'yearly' | null;
    price_override?: number | null;
    upsell_page_url?: string | null;
    trial_days?: number;
    display_order?: number;
}

export interface FunnelDownsell {
    id?: string;
    product_id?: string | null;
    product_name?: string;
    product_price?: string;
    product_currency?: string;
    discount?: number;
    downsell_page_url?: string | null;
    display_order?: number;
}

export interface Funnel {
    id: string;
    name: string;
    main_product_id: string;
    main_product_name?: string;
    main_product_price?: string;
    main_product_currency?: string;
    redirect_url?: string | null;
    order_bumps?: FunnelOrderBump[];
    upsells?: FunnelUpsell[];
    downsells?: FunnelDownsell[];
    order_bump?: FunnelOrderBump | null;
    upsell?: FunnelUpsell | null;
    downsell?: FunnelDownsell | null;
    created_at: string;
    updated_at: string;
}

// ... useFunnels (admin version, keep as is)
export function useFunnels() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFunnels = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/funnels');
            const json = await res.json();
            setFunnels(json.data ?? []);
        } catch {
            setError('Erro ao carregar funis');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createFunnel = async (data: Omit<Funnel, 'id' | 'created_at' | 'updated_at'>) => {
        const res = await fetch('/api/funnels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const json = await res.json();
        setFunnels(prev => [json.data, ...prev]);
        return json.data as Funnel;
    };

    const updateFunnel = async (id: string, data: Partial<Funnel>) => {
        const res = await fetch(`/api/funnels/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const json = await res.json();
        setFunnels(prev => prev.map(f => (f.id === id ? json.data : f)));
        return json.data as Funnel;
    };

    const deleteFunnel = async (id: string) => {
        await fetch(`/api/funnels/${id}`, { method: 'DELETE' });
        setFunnels(prev => prev.filter(f => f.id !== id));
    };

    return { funnels, isLoading, error, fetchFunnels, createFunnel, updateFunnel, deleteFunnel };
}

export function useCheckoutFunnel(productId: string | undefined) {
    const query = useQuery({
        queryKey: ['funnel', productId],
        queryFn: async () => {
            if (!productId) return null;
            const res = await fetch(`/api/funnels/product/${productId}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
            });
            const json = await res.json();
            return json.data as Funnel;
        },
        enabled: !!productId,
        staleTime: 60 * 1000,
    });

    return { funnel: query.data, isLoading: query.isLoading, refetch: query.refetch };
}

export async function logBumpAction(params: {
    order_id?: string | null;
    funnel_id?: string | null;
    bump_id?: string | null;
    product_id?: string | null;
    action: 'viewed' | 'clicked' | 'accepted' | 'declined';
    extra_revenue?: number;
}) {
    try {
        await fetch('/api/funnels/bump-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
    } catch { /* fail silently */ }
}

export function useProductBumps(productId: string | undefined) {
    const query = useQuery({
        queryKey: ['bumps', productId],
        queryFn: async () => {
            if (!productId) return [];
            const res = await fetch(`/api/products/${productId}/bumps`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
            });
            const json = await res.json();
            const rawBumps = json.data ?? [];
            return rawBumps.map((b: any) => ({
                id: b.bump_link_id as string,
                product_id: b.product_id as string,
                product_name: b.product_name as string,
                product_price: String(b.product_price ?? '0'),
                product_image_url: (b.product_image_url as string) ?? null,
                product_currency: (b.product_currency as string) ?? 'ZAR',
                title: (b.title as string) ?? 'Oferta Exclusiva',
                description: (b.bump_description as string) ?? '',
                discount_type: (b.discount_type as 'percentage' | 'fixed') ?? 'percentage',
                discount_value: parseFloat(String(b.discount_value ?? 0)),
                display_order: (b.display_order as number) ?? 0,
                enabled: (b.enabled as boolean) !== false,
            })) as FunnelOrderBump[];
        },
        enabled: !!productId,
        staleTime: 60 * 1000,
    });

    return { bumps: query.data ?? [], isLoading: query.isLoading, refetch: query.refetch };
}
