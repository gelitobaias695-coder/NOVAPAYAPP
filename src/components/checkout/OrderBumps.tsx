import { useState, useEffect } from "react";
import { CheckCircle, Tag, Zap, TrendingDown } from "lucide-react";
import { type FunnelOrderBump, logBumpAction } from "@/hooks/useFunnels";
import { formatPriceValue } from "@/lib/currency";

interface OrderBumpItemProps {
    bump: FunnelOrderBump;
    selectedBumpIds: Set<string>;
    onToggle: (bump: FunnelOrderBump, checked: boolean) => void;
    primaryColor: string;
    orderId?: string | null;
    funnelId?: string | null;
    mainProductCurrency: string;
}

function OrderBumpItem({ bump, selectedBumpIds, onToggle, primaryColor, orderId, funnelId, mainProductCurrency }: OrderBumpItemProps) {
    const isSelected = selectedBumpIds.has(bump.id ?? bump.product_id ?? '');
    const originalPrice = parseFloat(bump.product_price ?? '0');

    // Calculate discounted price
    let finalPrice = originalPrice;
    if (bump.discount_type === 'percentage' && bump.discount_value) {
        finalPrice = originalPrice * (1 - bump.discount_value / 100);
    } else if (bump.discount_type === 'fixed' && bump.discount_value) {
        finalPrice = Math.max(0, originalPrice - bump.discount_value);
    }

    // Log "viewed" on mount
    useEffect(() => {
        logBumpAction({
            order_id: orderId,
            funnel_id: funnelId,
            bump_id: bump.id,
            product_id: bump.product_id,
            action: 'viewed',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToggle = (checked: boolean) => {
        onToggle(bump, checked);
        logBumpAction({
            order_id: orderId,
            funnel_id: funnelId,
            bump_id: bump.id,
            product_id: bump.product_id,
            action: checked ? 'accepted' : 'declined',
            extra_revenue: checked ? finalPrice : 0,
        });
    };

    return (
        <label
            htmlFor={`bump-${bump.id ?? bump.product_id}`}
            className={`relative flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 select-none
                ${isSelected
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/20'
                    : 'border-border bg-white hover:border-primary/40 hover:bg-primary/[0.02]'
                }`}
            style={{ borderColor: isSelected ? primaryColor : undefined }}
        >
            {/* Pulse animation when not selected */}
            {!isSelected && (
                <span
                    className="absolute inset-0 rounded-xl animate-ping opacity-[0.04] pointer-events-none"
                    style={{ backgroundColor: primaryColor }}
                />
            )}

            {/* Checkbox */}
            <div className="relative mt-0.5 flex-shrink-0">
                <input
                    id={`bump-${bump.id ?? bump.product_id}`}
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    onChange={e => handleToggle(e.target.checked)}
                />
                <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 ${isSelected ? 'border-transparent text-white' : 'border-border bg-white'
                        }`}
                    style={{ backgroundColor: isSelected ? primaryColor : undefined }}
                >
                    {isSelected && <CheckCircle className="h-4 w-4" />}
                </div>
            </div>

            {/* Product image */}
            {bump.product_image_url && (
                <div className="flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border border-border">
                    <img src={bump.product_image_url} alt={bump.product_name} className="h-full w-full object-cover" />
                </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                        {bump.title && (
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                                style={{ color: primaryColor }}>
                                <Tag className="inline h-3 w-3 mr-1" />
                                {bump.title}
                            </p>
                        )}
                        <p className="font-semibold text-sm text-zinc-900 leading-tight">
                            {bump.product_name}
                        </p>
                        {bump.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bump.description}</p>
                        )}
                    </div>
                    <div className="text-right flex-shrink-0">
                        {bump.discount_value && bump.discount_value > 0 ? (
                            <>
                                <p className="text-xs text-muted-foreground line-through">
                                    {formatPriceValue(originalPrice, mainProductCurrency)}
                                </p>
                                <p className="font-bold text-sm" style={{ color: primaryColor }}>
                                    {formatPriceValue(finalPrice, mainProductCurrency)}
                                </p>
                                <span className="inline-block text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">
                                    -{bump.discount_value}{bump.discount_type === 'percentage' ? '%' : ''}
                                </span>
                            </>
                        ) : (
                            <p className="font-bold text-sm" style={{ color: primaryColor }}>
                                {formatPriceValue(finalPrice, mainProductCurrency)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </label>
    );
}

// ─── Main OrderBumps component ────────────────────────────────────────────────

interface OrderBumpsProps {
    bumps: FunnelOrderBump[];
    primaryColor: string;
    onTotalChange: (extraTotal: number, selectedBumps: FunnelOrderBump[]) => void;
    orderId?: string | null;
    funnelId?: string | null;
    mainProductCurrency: string;
}

export default function OrderBumps({ bumps, primaryColor, onTotalChange, orderId, funnelId, mainProductCurrency }: OrderBumpsProps) {
    const [selectedBumpIds, setSelectedBumpIds] = useState<Set<string>>(new Set());

    const activeBumps = bumps.filter(b => b.enabled !== false && b.product_id);

    const handleToggle = (bump: FunnelOrderBump, checked: boolean) => {
        const bumpKey = bump.id ?? bump.product_id ?? '';
        setSelectedBumpIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(bumpKey);
            else next.delete(bumpKey);

            // Compute new extra total
            const selectedBumps = activeBumps.filter(b => next.has(b.id ?? b.product_id ?? ''));
            const extra = selectedBumps.reduce((sum, b) => {
                const orig = parseFloat(b.product_price ?? '0');
                if (b.discount_type === 'percentage' && b.discount_value) return sum + orig * (1 - b.discount_value / 100);
                if (b.discount_type === 'fixed' && b.discount_value) return sum + Math.max(0, orig - b.discount_value);
                return sum + orig;
            }, 0);
            onTotalChange(extra, selectedBumps);

            return next;
        });
    };

    if (activeBumps.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: primaryColor }} />
                <p className="text-sm font-semibold text-zinc-800">
                    Adicione ao seu pedido com desconto exclusivo!
                </p>
            </div>
            <div className="space-y-2">
                {activeBumps.map(bump => (
                    <OrderBumpItem
                        key={bump.id ?? bump.product_id}
                        bump={bump}
                        selectedBumpIds={selectedBumpIds}
                        onToggle={handleToggle}
                        primaryColor={primaryColor}
                        orderId={orderId}
                        funnelId={funnelId}
                        mainProductCurrency={mainProductCurrency}
                    />
                ))}
            </div>
            {selectedBumpIds.size > 0 && (
                <p className="text-xs text-center font-medium" style={{ color: primaryColor }}>
                    ✅ {selectedBumpIds.size} item{selectedBumpIds.size > 1 ? 's' : ''} adicionado{selectedBumpIds.size > 1 ? 's' : ''} ao pedido!
                </p>
            )}
        </div>
    );
}

// ─── UpsellBanner — shown after payment ──────────────────────────────────────

export interface UpsellBannerProps {
    upsell: {
        product_id?: string | null;
        product_name?: string;
        product_price?: string;
        product_currency?: string;
        price_override?: number | null;
        is_recurring?: boolean;
        billing_cycle?: string | null;
        product_billing_cycle?: string | null;
        upsell_page_url?: string | null;
        trial_days?: number | null;
    };
    downsell?: {
        product_name?: string;
        discount?: number;
        downsell_page_url?: string | null;
    } | null;
    orderId: string;
    funnelId?: string;
    primaryColor: string;
    mainProductCurrency: string;
}

export function UpsellBanner({ upsell, downsell, orderId, funnelId, primaryColor, mainProductCurrency }: UpsellBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const price = upsell.price_override ?? parseFloat(upsell.product_price ?? '0');
    const cycle = upsell.billing_cycle ?? upsell.product_billing_cycle;
    const cycleLabel: Record<string, string> = { weekly: '/semana', monthly: '/mês', yearly: '/ano' };
    const [isSubscribing, setIsSubscribing] = useState(false);

    const handleAccept = async () => {
        setIsSubscribing(true); // Reusing this for loading state
        try {
            if (upsell.is_recurring) {
                const res = await fetch('/api/upsells/subscribe', {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        order_id: orderId,
                        upsell_product_id: upsell.product_id,
                        billing_interval: cycle,
                        trial_days: upsell.trial_days || 0
                    })
                });

                if (!res.ok) throw new Error('Falha na assinatura');
                logBumpAction({ order_id: orderId, funnel_id: funnelId, action: 'accepted', extra_revenue: price });
            } else {
                // Flow for One-Click One-Off Upsell
                const res = await fetch('/api/paystack/upsell-charge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        order_id: orderId,
                        upsell_product_id: upsell.product_id
                    })
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || 'Falha ao processar cobrança do One-Click Upsell.');
                }
                logBumpAction({ order_id: orderId, funnel_id: funnelId, action: 'accepted', extra_revenue: price });
            }

            // Success redirection
            if (upsell.upsell_page_url) {
                window.location.href = `${upsell.upsell_page_url}?order_id=${orderId}&product=${upsell.product_name ?? ''}&status=success`;
            } else {
                setDismissed(true);
                alert("Adicionado com sucesso!");
            }
        } catch (err) {
            console.error(err);
            if (downsell?.downsell_page_url) {
                window.location.href = `${downsell.downsell_page_url}?order_id=${orderId}&error=upsell_failed`;
            } else {
                alert(err instanceof Error ? err.message : 'Houve um erro ao processar. Tente novamente.');
                setIsSubscribing(false);
            }
        }
    };

    const handleDecline = () => {
        logBumpAction({ order_id: orderId, funnel_id: funnelId, action: 'declined' });
        if (downsell?.downsell_page_url) {
            window.location.href = `${downsell.downsell_page_url}?order_id=${orderId}`;
        } else {
            setDismissed(true);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            {isSubscribing && (
                <div className="absolute inset-0 z-[110] bg-white/50 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl">
                    <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-zinc-900 font-bold text-lg">Processando assinatura...</p>
                    <p className="text-sm text-zinc-600">Por favor, não feche esta janela.</p>
                </div>
            )}
            <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 relative ${isSubscribing ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold text-white shadow-lg"
                        style={{ backgroundColor: primaryColor }}>
                        <Zap className="h-4 w-4" />
                        Oferta Especial — Apenas Agora!
                    </span>
                </div>

                <div className="text-center pt-3 space-y-2">
                    <h2 className="text-xl font-bold text-zinc-900">{upsell.product_name}</h2>
                    <p className="text-3xl font-bold" style={{ color: primaryColor }}>
                        {formatPriceValue(price, mainProductCurrency)}
                        {upsell.is_recurring && cycle && (
                            <span className="text-base font-normal text-muted-foreground ml-1">{cycleLabel[cycle]}</span>
                        )}
                    </p>
                    {upsell.is_recurring && (
                        <div className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary font-semibold px-3 py-1 rounded-full">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Assinatura {cycle === 'monthly' ? 'Mensal' : cycle === 'yearly' ? 'Anual' : 'Semanal'}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleAccept}
                    disabled={isSubscribing}
                    className="w-full h-13 rounded-xl font-bold text-white text-base py-3.5 transition-transform active:scale-95 shadow-lg disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                >
                    {upsell.is_recurring ? "✅ Sim! Adicionar assinatura ao meu plano atual com 1 clique" : "✅ Sim! Quero Adicionar ao Meu Pedido"}
                </button>

                <button
                    onClick={handleDecline}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                    {downsell
                        ? `Não obrigado. Ver oferta de ${downsell.discount}% de desconto.`
                        : 'Não, obrigado. Pular esta oferta.'}
                </button>

                {downsell && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 rounded-lg p-2 justify-center">
                        <TrendingDown className="h-3.5 w-3.5" />
                        Alternativa: {downsell.product_name} com {downsell.discount}% off
                    </div>
                )}
            </div>
        </div>
    );
}
