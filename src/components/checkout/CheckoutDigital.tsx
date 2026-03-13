import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPriceValue } from "@/lib/currency";
import { type DBProduct } from "@/hooks/useProducts";
import { useCheckoutFunnel, useProductBumps, type FunnelOrderBump, type Funnel } from "@/hooks/useFunnels";
import OrderBumps from "./OrderBumps";
import {
    Shield, Lock, CheckCircle, Star, Package,
    ArrowRight, ChevronDown, MessageCircle, ShoppingCart, Loader2, Zap
} from "lucide-react";
import { useTranslation, type Language } from "./translations";
import { AdaptiveImage } from "@/components/ui/adaptive-image";

const COUNTRIES = [
    { name: "South Africa", code: "+27" },
    { name: "Nigeria", code: "+234" },
    { name: "Kenya", code: "+254" },
    { name: "Ghana", code: "+233" },
    { name: "Tanzania", code: "+255" },
    { name: "Egypt", code: "+20" },
    { name: "Ethiopia", code: "+251" },
    { name: "Uganda", code: "+256" },
    { name: "Zimbabwe", code: "+263" },
    { name: "Zambia", code: "+260" },
    { name: "Angola", code: "+244" },
    { name: "Mozambique", code: "+258" },
    { name: "Brazil", code: "+55" }
];

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
    return (
        <div className={`flex items-center gap-2 text-sm ${active ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors ${done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-muted-foreground/40"}`}>
                {done ? <CheckCircle className="h-3.5 w-3.5" /> : n}
            </span>
            <span className="hidden sm:inline">{label}</span>
        </div>
    );
}

interface Props { 
    product: DBProduct;
    initFunnel?: Funnel | null;
    initBumps?: FunnelOrderBump[] | null;
    initRates?: Record<string, number> | null;
}

export default function CheckoutDigital({ product, initFunnel, initBumps, initRates }: Props) {
    const format = (p: number) => formatPriceValue(p, product.currency);
    const price = parseFloat(product.price);
    const t = useTranslation((product.checkout_language as Language) || 'pt');
    const primaryColor = product.primary_color || '#10B981';

    // Bumps: funnel + direct
    const { funnel } = useCheckoutFunnel(product.id, initFunnel);
    const { bumps: directBumps } = useProductBumps(product.id, initBumps);
    const [bumpExtraTotal, setBumpExtraTotal] = useState(0);
    const [selectedBumps, setSelectedBumps] = useState<FunnelOrderBump[]>([]);
    const totalPrice = price + bumpExtraTotal;

    const handleBumpChange = useCallback((extra: number, bumps: FunnelOrderBump[]) => {
        setBumpExtraTotal(extra);
        setSelectedBumps(bumps);
    }, []);

    const [step, setStep] = useState(1);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", whatsapp: "", phoneCode: "+27" });
    const [card, setCard] = useState({ number: "", exp: "", cvv: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [analyticsData, setAnalyticsData] = useState<any>({});
    const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(initRates || null);

    useEffect(() => {
        if (exchangeRates) return;
        fetch('/api/exchange-rates').then(res => res.json()).then(data => {
            if (data?.rates) setExchangeRates(data.rates);
        }).catch(() => { });
    }, [exchangeRates]);

    useEffect(() => {
        const ua = navigator.userAgent;
        let browser = "Unknown";
        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("SamsungBrowser")) browser = "Samsung Internet";
        else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
        else if (ua.includes("Trident")) browser = "Internet Explorer";
        else if (ua.includes("Edge")) browser = "Edge";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari")) browser = "Safari";

        let device_type = "Desktop";
        if (/Mobi|Android/i.test(ua)) device_type = "Mobile";
        else if (/Tablet|iPad/i.test(ua)) device_type = "Tablet";

        const params = new URLSearchParams(window.location.search);

        setAnalyticsData({
            browser,
            device_type,
            user_agent: ua,
            utm_source: params.get("utm_source") || undefined,
            utm_medium: params.get("utm_medium") || undefined,
            utm_campaign: params.get("utm_campaign") || undefined,
            utm_content: params.get("utm_content") || undefined,
            utm_term: params.get("utm_term") || undefined,
            src: params.get("src") || params.get("sck") || params.get("ref") || undefined,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).fbq) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).fbq('track', 'ViewContent', {
                content_name: product.name,
                content_ids: [product.id],
                content_type: 'product',
                value: price,
                currency: product.currency || 'ZAR'
            });
        }
    }, [product, price]);


    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    const setCardVal = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setCard((c) => ({ ...c, [k]: e.target.value }));

    const handleCheckout = async () => {
        if (!form.name || (!form.email && !product.require_whatsapp)) return;
        setIsSubmitting(true);
        try {
            // 1. Criar pedido no Banco de Dados com status 'pending'
            const url = orderId ? `/api/orders/${orderId}` : '/api/orders';
            const method = orderId ? 'PUT' : 'POST';

            const resOrder = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    product_id: product.id,
                    customer_name: form.name || 'Pendente',
                    customer_email: form.email,
                    customer_phone: `${form.phoneCode}${form.whatsapp}`,
                    checkout_type: "digital",
                    status: "pending", // Status inicial, atualizado no webhook da Paystack
                    bump_products: selectedBumps.map(b => b.product_id).filter(Boolean),
                    ...analyticsData
                })
            });

            if (!resOrder.ok) {
                const errData = await resOrder.json().catch(() => ({}));
                throw new Error(`Erro Pedido DB: ${JSON.stringify(errData.errors || errData.error || errData)}`);
            }

            const dataOrder = await resOrder.json();
            const currentOrderId = dataOrder.data?.id || orderId;
            if (currentOrderId && !orderId) setOrderId(currentOrderId);

            // 2. Comunicar com a API Paystack para renderizar a página de pagamento
            const resPaystack = await fetch('/api/paystack/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: currentOrderId,
                    email: form.email || `whatsapp-${form.whatsapp}@novapay.co`, // Email fallback for digital non-email checkouts
                    currency: product.currency, // Dinâmico pelo produto!
                    // Redireciona de volta com o success flow
                    callback_url: `${window.location.origin}/checkout/sucesso?order_id=${currentOrderId}`
                })
            });

            if (!resPaystack.ok) {
                const errData = await resPaystack.json();
                throw new Error(errData.error || 'Falha ao conectar com o banco de processamento (Gateway).');
            }

            const paystackData = await resPaystack.json();

            if (paystackData?.data?.authorization_url) {
                // Redirecionamento para a página segura da Paystack
                window.location.href = paystackData.data.authorization_url;
            } else {
                throw new Error('Não foi possível gerar a URL de autorização.');
            }

        } catch (err) {
            console.error('Error in checkout execution', err);
            alert(err instanceof Error ? err.message : 'Erro ao processar pagamento. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold">Compra Confirmada!</h2>
                    <p className="text-muted-foreground">Obrigado pela sua compra. Seu acesso será enviado para o seu WhatsApp/Email.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-light-mode min-h-screen bg-gray-50 text-zinc-900">
            {/* Header */}
            <header className="bg-white border-b border-border shadow-sm sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                    {product.logo_url
                        ? <img src={product.logo_url} alt="logo" className="h-8 object-contain" />
                        : <span className="font-bold text-primary text-lg">NovaPay</span>
                    }
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3 text-green-500" />
                        {t.securePayment}
                    </div>
                </div>
            </header>

            {/* Mobile Order Summary Accordion */}
            <div className="lg:hidden bg-white border-b border-border">
                <button
                    onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                    className="w-full flex items-center justify-between p-4 bg-muted/30 transition-colors active:bg-muted/50"
                >
                    <div className="flex items-center gap-2 text-sm text-primary font-medium" style={{ color: product.primary_color }}>
                        <ShoppingCart className="h-4 w-4" />
                        {isSummaryOpen ? 'Esconder resumo' : t.orderSummary}
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isSummaryOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <span className="font-bold">{format(price)}</span>
                </button>
                <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isSummaryOpen ? 'max-h-[600px] border-t border-border opacity-100' : 'max-h-0 opacity-0'}`}
                >
                    <div className="p-4 space-y-4">
                        <AdaptiveImage src={product.product_image_url} alt={product.name} priority={true} />
                        <div>
                            <p className="font-semibold">{product.name}</p>
                            {product.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>}
                        </div>
                        <div className="flex justify-between font-bold border-t border-border pt-3">
                            <span>{t.total}</span>
                            <span style={{ color: product.primary_color }}>{format(price)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left — Form */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Steps (Shortened for Digital) */}
                    <div className="flex items-center gap-4">
                        <Step n={1} label={t.contactInfo} active={step === 1} done={step > 1} />
                        <div className="h-px flex-1 bg-border" />
                        <Step n={2} label={t.payment} active={step === 2} done={false} />
                    </div>

                    {/* Step 1: Contact */}
                    {step === 1 && (
                        <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-4 animate-fade-in">
                            <h2 className="font-semibold text-lg">{t.contactInfo}</h2>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label>{t.fullName}</Label>
                                    <Input placeholder={t.namePlaceholder} value={form.name} onChange={set("name")} />
                                </div>
                                <div className="space-y-1">
                                    <Label>{product.require_whatsapp ? t.emailOptional : t.email}</Label>
                                    <Input placeholder={t.emailPlaceholder} type="email" value={form.email} onChange={set("email")} />
                                </div>
                                {product.require_whatsapp && (
                                    <div className="space-y-1">
                                        <Label className="flex items-center gap-1.5 text-green-600">
                                            <MessageCircle className="h-4 w-4" />
                                            {t.whatsapp}
                                        </Label>
                                        <div className="flex gap-2">
                                            <select
                                                value={form.phoneCode}
                                                onChange={set("phoneCode")}
                                                className="flex h-10 w-24 rounded-md border border-gray-300 bg-white text-black px-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            >
                                                {COUNTRIES.map(c => <option key={c.code + c.name} value={c.code}>{c.code}</option>)}
                                            </select>
                                            <Input placeholder="82 123 4567" value={form.whatsapp} onChange={set("whatsapp")} />
                                        </div>
                                        <p className="text-[10px] text-green-600 flex items-center gap-1 mt-1">
                                            <CheckCircle className="h-3 w-3" /> {t.whatsappNote}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* ─── Order Bumps ─────────────────────────────────── */}
                            {(() => {
                                const funnelBumps = (funnel?.order_bumps && funnel.order_bumps.length > 0)
                                    ? funnel.order_bumps
                                    : (funnel?.order_bump && funnel.order_bump.product_id) ? [funnel.order_bump] : [];
                                const seen = new Set(funnelBumps.map(b => b.product_id));
                                const allBumps = [...funnelBumps, ...directBumps.filter(b => !seen.has(b.product_id))]
                                    .filter(b => b.enabled !== false && b.product_id);
                                return allBumps.length > 0 ? (
                                    <div className="rounded-xl border-2 border-dashed p-4 space-y-3"
                                        style={{ borderColor: primaryColor + '60', backgroundColor: primaryColor + '08' }}>
                                        <OrderBumps
                                            bumps={allBumps}
                                            primaryColor={primaryColor}
                                            onTotalChange={handleBumpChange}
                                            orderId={orderId}
                                            funnelId={funnel?.id}
                                            mainProductCurrency={product.currency}
                                        />
                                    </div>
                                ) : null;
                            })()}
                            <Button
                                disabled={loadingInfo}
                                className="w-full gap-2 h-12 text-base font-semibold transition-transform active:scale-[0.98]"
                                onClick={async () => {
                                    if (!form.name || !form.email) return setStep(2); // allow bypass if skipped but ideally needed
                                    setLoadingInfo(true);
                                    try {
                                        const res = await fetch('/api/orders', {
                                            method: 'POST',
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                product_id: product.id,
                                                customer_name: form.name,
                                                customer_email: form.email,
                                                customer_phone: `${form.phoneCode}${form.whatsapp}`,
                                                checkout_type: "digital",
                                                status: "pending",
                                                ...analyticsData
                                            })
                                        });
                                        const data = await res.json();
                                        let currOrderId = orderId;
                                        if (data.data?.id) {
                                            setOrderId(data.data.id);
                                            currOrderId = data.data.id;
                                        }

                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        if ((window as any).fbq && currOrderId) {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            (window as any).fbq('track', 'InitiateCheckout', {
                                                content_name: product.name,
                                                content_ids: [product.id],
                                                content_type: 'product',
                                                value: totalPrice,
                                                currency: product.currency || 'ZAR'
                                            }, { eventID: currOrderId });
                                        }

                                    } catch (e) { console.error(e) }
                                    setLoadingInfo(false);
                                    setStep(2);
                                }}
                                style={{ backgroundColor: product.primary_color }}
                            >
                                {loadingInfo ? "Salvando..." : t.continueToPayment} <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Payment */}
                    {step === 2 && (
                        <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-4 animate-fade-in">
                            <div className="mb-2">
                                <h2 className="font-bold text-xl">{t.payment}</h2>
                                <p className="text-gray-500 text-sm mt-0.5">All transactions are secure and encrypted.</p>
                            </div>

                            <div className="border border-[#1773B0] rounded-xl overflow-hidden shadow-sm flex flex-col mb-4">
                                <div className="bg-white p-4 border-b border-[#1773B0] flex items-center justify-between">
                                    <span className="text-[15px] font-medium text-gray-900">Paystack</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="flex items-center justify-center w-[38px] h-[24px] border border-gray-200 rounded text-[10px] shadow-sm">
                                            <svg className="w-[22px]" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="8" cy="8" r="6" fill="#EB001B"/>
                                                <circle cx="16" cy="8" r="6" fill="#F79E1B"/>
                                                <path d="M12 4.47055C10.999 5.30232 10.3529 6.57398 10.3529 8C10.3529 9.42602 10.999 10.6977 12 11.5294C13.001 10.6977 13.6471 9.42602 13.6471 8C13.6471 6.57398 13.001 5.30232 12 4.47055Z" fill="#FF5F00"/>
                                            </svg>
                                        </span>
                                        <span className="flex items-center justify-center w-[38px] h-[24px] border border-gray-200 rounded text-[10px] shadow-sm font-bold text-[#1434CB] bg-white">
                                            VISA
                                        </span>
                                        <span className="flex items-center justify-center w-[38px] h-[24px] border border-gray-200 rounded text-[10px] shadow-sm bg-[#ffcc00]">
                                            <span className="text-[#000] font-bold text-[8px]">MTN</span>
                                        </span>
                                        <span className="flex items-center justify-center w-[28px] h-[24px] border border-gray-200 rounded text-xs font-medium text-gray-600 bg-white shadow-sm">+5</span>
                                    </div>
                                </div>
                                <div className="bg-[#f5f5f5] p-6 lg:p-8 flex flex-col items-center justify-center text-center">
                                    <div className="w-full">
                                        {product.currency !== 'ZAR' ? (
                                            <div className="flex flex-col items-center w-full space-y-4">
                                                <div className="text-sm text-gray-700 bg-white border border-gray-200 shadow-sm p-4 rounded-lg w-full max-w-sm text-center font-medium">
                                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                    {((t as any).zarConversionInfo || "Para garantir segurança e proteção antifraude, o pagamento será processado em ZAR (Rand Sul-Africano).\nO valor será automaticamente convertido pelo seu banco na cobrança.\nVocê verá o valor final em ZAR na próxima etapa antes de confirmar.").split('\n').map((line: string, idx: number) => (
                                                        <p key={idx} className="mb-1 leading-relaxed">{line}</p>
                                                    ))}
                                                    
                                                    {exchangeRates && exchangeRates[product.currency] && (
                                                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col items-center">
                                                            <span className="text-gray-500 text-xs uppercase tracking-wide mb-1 flex items-center gap-1">
                                                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                {(t as any).currentConversion || "Conversão atual"}
                                                            </span>
                                                            <span className="text-[#1773B0] font-bold text-base">
                                                                {product.currency} {totalPrice.toFixed(2)} = ZAR {(totalPrice / exchangeRates[product.currency]).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-[15px] text-gray-900 font-medium max-w-sm mx-auto">
                                                You'll be redirected to Paystack to complete your purchase.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary — Light Mode */}
                            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2 text-sm text-gray-800">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.orderSummary}</p>
                                <div className="flex justify-between">
                                    <span className="text-gray-700">{t.subtotal}</span>
                                    <span className="font-semibold text-gray-900">{format(price)}</span>
                                </div>
                                {selectedBumps.map(b => (
                                    <div key={b.product_id} className="flex justify-between">
                                        <span className="text-gray-600 flex items-center gap-1">
                                            <Zap className="h-3 w-3 text-amber-500" /> {b.product_name}
                                        </span>
                                        <span className="font-medium text-gray-900">{format(parseFloat(b.product_price ?? '0'))}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-3 mt-2">
                                    <span className="text-gray-900">{t.totalToPay}</span>
                                    <span style={{ color: primaryColor }}>{format(totalPrice)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 bg-muted/50">{t.goBack}</Button>
                                <Button
                                    onClick={handleCheckout}
                                    disabled={isSubmitting}
                                    className="flex-[2] h-12 text-base font-bold gap-2 transition-transform active:scale-[0.98] shadow-lg shadow-primary/20"
                                    style={{ backgroundColor: product.primary_color }}
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                                    {isSubmitting ? "Processando..." : t.confirmAndPay}
                                </Button>
                            </div>
                            <div className="flex justify-center gap-4 text-[10px] text-muted-foreground mt-4">
                                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> SSL 256-bit</span>
                                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> PCI DSS</span>
                                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Secure Checkout</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right — Order Summary (Desktop only, sticky) */}
                <div className="hidden lg:block lg:col-span-2">
                    <div className="bg-white rounded-xl border border-border p-5 sticky top-20 shadow-sm space-y-5">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t.orderSummary}</h3>
                        <AdaptiveImage src={product.product_image_url} alt={product.name} priority={true} />
                        <div>
                            <p className="font-semibold">{product.name}</p>
                            {product.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>}
                        </div>
                        <div className="flex justify-between font-bold border-t border-border pt-4 text-lg">
                            <span>{t.total}</span>
                            <span style={{ color: product.primary_color }}>{format(totalPrice)}</span>
                        </div>
                        {/* Trust */}
                        <div className="rounded-lg bg-green-50 border border-green-200 p-3 mt-4">
                            <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                                <Shield className="h-4 w-4" /> {t.guarantee}
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium text-foreground">4.9</span> · 2,847 {t.reviews}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
