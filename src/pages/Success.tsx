import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Package, ArrowRight, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCheckoutFunnel } from "@/hooks/useFunnels";
import { UpsellBanner } from "@/components/checkout/OrderBumps";
import { useTranslation, type Language } from "@/components/checkout/translations";

export default function SuccessPage() {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("order_id") || searchParams.get("orderId") || searchParams.get("reference");
    const isE2P = searchParams.get("e2p") === "1";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const lang: Language = order?.checkout_language || 'pt';
    const t = useTranslation(lang, 'success');

    // Fetch funnel for potential upsells
    const { funnel } = useCheckoutFunnel(order?.product_id);

    useEffect(() => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        const fetchOrder = async () => {
            try {
                // Wait a bit for the webhook to potentially process
                await new Promise(r => setTimeout(r, 1500));

                const res = await fetch(`/api/orders/${orderId}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrder(data.data);
                }
            } catch (err) {
                console.error("Error fetching order:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    useEffect(() => {
        if (order && (order.status === 'success' || order.status === 'paid')) {
            const win = window as unknown as { fbq?: (...args: unknown[]) => void };
            if (win.fbq) {
                // Normalize currency for Meta Pixel (MUST be ISO 4217)
                let currency = (order.currency || 'ZAR').toUpperCase().trim();
                if (currency === 'KSH') currency = 'KES';
                if (currency === 'MT') currency = 'MZN';

                win.fbq('track', 'Purchase', {
                    content_name: order.product_name || "Produto",
                    content_ids: [order.product_id],
                    content_type: 'product',
                    value: parseFloat(order.total_amount || order.price || '0'),
                    currency: currency
                }, { eventID: order.id });
            }

            /*
            // Removed: Do not automatically redirect so the user sees the Success Page receipt.
            if (order.product_success_url) {
                setTimeout(() => {
                    window.location.href = order.product_success_url;
                }, 800); 
            }
            */
        }
    }, [order]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h1 className="text-xl font-bold">{t.processing || "Processando seu pedido..."}</h1>
                <p className="text-muted-foreground text-center max-w-xs">
                    {t.confirmingPayment || "Estamos confirmando seu pagamento. Por favor, não feche esta página."}
                </p>
            </div>
        );
    }

    if (!order && !loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <CheckCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900">{t.orderNotFound || "Pedido não encontrado"}</h2>
                    <p className="text-muted-foreground">{t.cannotLocate || "Não conseguimos localizar os detalhes da sua compra."}</p>
                    <Button asChild className="w-full h-12 rounded-xl">
                        <Link to="/">{t.backToHome || "Voltar ao Início"}</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Check for upsells in the funnel
    const hasUpsell = funnel && funnel.upsells && funnel.upsells.length > 0;
    const upsell = hasUpsell ? funnel.upsells[0] : (funnel?.upsell || null);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6 animate-fade-in">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-bounce-subtle">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                        {order.status === 'pending' && isE2P ? "Aguardando Pagamento!" : t.thankYou || "Obrigado!"}
                    </h1>
                    <p className="text-zinc-500 font-medium">
                        {order.status === 'pending' && isE2P 
                            ? "Por favor, verifique o seu telemóvel as instruções do M-Pesa / e-Mola e insira o seu PIN para concluir a compra." 
                            : (t.orderConfirmed?.replace('{id}', order.id?.slice(0, 8)) || `Seu pedido #${order.id?.slice(0, 8)} foi confirmado.`)}
                    </p>
                </div>

                <div className="bg-zinc-50 rounded-xl p-4 text-left space-y-3 border border-zinc-100">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-200/60">
                        <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">{t.summary || "Resumo"}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {order.status === 'pending' ? "PENDENTE" : (t.paid || "PAGO")}
                        </span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-700 font-medium">{order.product_name || "Produto"}</span>
                            <span className="font-bold text-zinc-900">{order.price ? `${order.currency} ${order.price}` : "--"}</span>
                        </div>
                        {order.bump_products && order.bump_products.length > 0 && (
                            <div className="text-xs text-zinc-500 italic pb-1">
                                {t.additionalItems?.replace('{count}', order.bump_products.length.toString()) || `+ ${order.bump_products.length} item(s) adicionais`}
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60">
                            <span className="font-bold text-zinc-900 text-lg">{t.total || "Total"}</span>
                            <span className="font-extrabold text-primary text-xl" style={{ color: order.primary_color || '#10B981' }}>
                                {order.currency} {order.total_amount || order.price}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-zinc-500">
                        {t.emailSentTo || "Enviamos os detalhes da sua compra para"} <span className="font-bold text-zinc-700">{order.customer_email}</span>.
                    </p>

                    <div className="pt-2 flex flex-col gap-3">
                        <Button asChild className="w-full h-13 rounded-xl font-bold gap-2 text-base transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: order.primary_color || '#10B981' }}>
                            {order.product_success_url ? (
                                <a href={order.product_success_url}><Package className="h-5 w-5" /> {t.accessProduct || "Acessar Meu Produto"}</a>
                            ) : (
                                <span><Package className="h-5 w-5" /> {t.accessProduct || "Acessar Meu Produto"}</span>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-400 font-medium uppercase tracking-widest pt-4">
                    <span className="flex items-center gap-1">🔒 {t.secure || "Seguro"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">✅ {t.authentic || "Autêntico"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">💳 NovaPay</span>
                </div>
            </div>

            {/* If there's an upsell and the order is successful, show the Upsell Banner */}
            {order.status === 'success' && upsell && (
                <UpsellBanner
                    upsell={upsell}
                    orderId={order.id}
                    funnelId={funnel?.id}
                    primaryColor={order.primary_color || '#10B981'}
                    mainProductCurrency={order.currency || 'ZAR'}
                    downsell={funnel?.downsells?.[0] || funnel?.downsell}
                    lang={lang}
                />
            )}
        </div>
    );
}
