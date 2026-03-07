import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPriceValue } from "@/lib/currency";
import { type DBProduct } from "@/hooks/useProducts";
import { useCheckoutFunnel, type FunnelOrderBump, useProductBumps } from "@/hooks/useFunnels";
import OrderBumps, { UpsellBanner } from "./OrderBumps";
import {
    Shield, Lock, CheckCircle, Star, Package,
    ArrowRight, ChevronDown, ShoppingCart, Loader2, Zap
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

interface Props { product: DBProduct }

export default function CheckoutPhysical({ product }: Props) {
    const format = (p: number) => formatPriceValue(p, product.currency);
    const basePrice = parseFloat(product.price);
    const t = useTranslation((product.checkout_language as Language) || 'pt');
    const primaryColor = product.primary_color || '#10B981';

    // Funnel (Order Bumps via funnel system)
    const { funnel } = useCheckoutFunnel(product.id);
    // Direct product bumps (product_order_bumps table) — always fetched
    const { bumps: directBumps } = useProductBumps(product.id);
    const [bumpExtraTotal, setBumpExtraTotal] = useState(0);
    const [selectedBumps, setSelectedBumps] = useState<FunnelOrderBump[]>([]);
    const totalPrice = basePrice + bumpExtraTotal;

    // State
    const [step, setStep] = useState(1);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [form, setForm] = useState({
        email: "", phone: "", phoneCode: "+27", firstName: "", lastName: "",
        address: "", city: "", postal: "", country: "South Africa",
    });
    const [card, setCard] = useState({ number: "", exp: "", cvv: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [showUpsell, setShowUpsell] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<Record<string, string | null>>({});
    const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);

    useEffect(() => {
        fetch('/api/exchange-rates').then(res => res.json()).then(data => {
            if (data?.rates) setExchangeRates(data.rates);
        }).catch(() => { });
    }, []);

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
            browser, device_type, user_agent: ua,
            utm_source: params.get("utm_source"),
            utm_medium: params.get("utm_medium"),
            utm_campaign: params.get("utm_campaign"),
            utm_content: params.get("utm_content") || null,
            utm_term: params.get("utm_term") || null,
            src: params.get("src") || params.get("sck") || params.get("ref") || null,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).fbq) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).fbq('track', 'ViewContent', {
                content_name: product.name,
                content_ids: [product.id],
                content_type: 'product',
                value: basePrice,
                currency: product.currency || 'ZAR'
            });
        }
    }, [product, basePrice]);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.value;
        setForm(f => {
            const next = { ...f, [k]: val };
            if (k === "country") {
                const c = COUNTRIES.find(x => x.name === val);
                if (c) next.phoneCode = c.code;
            }
            return next;
        });
    };

    const handleBumpChange = useCallback((extra: number, bumps: FunnelOrderBump[]) => {
        setBumpExtraTotal(extra);
        setSelectedBumps(bumps);
    }, []);

    const setCardVal = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setCard(c => ({ ...c, [k]: e.target.value }));

    const handleCheckout = async () => {
        if (!form.email || !form.phone || !form.firstName || !form.lastName) return;
        setIsSubmitting(true);
        try {
            // 1. Criar pedido no Banco de Dados
            const url = orderId ? `/api/orders/${orderId}` : '/api/orders';
            const method = orderId ? 'PUT' : 'POST';

            const resOrder = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: product.id,
                    customer_name: `${form.firstName} ${form.lastName}`.trim(),
                    customer_email: form.email,
                    customer_phone: `${form.phoneCode}${form.phone}`,
                    country: form.country,
                    address: form.address,
                    city: form.city,
                    postal_code: form.postal,
                    checkout_type: 'physical',
                    status: 'pending', // Fica pending ate a Paystack confirmar
                    province: form.city || form.country,
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
                    email: form.email,
                    currency: product.currency, // Dinâmico pelo produto!
                    // Redireciona de volta com o success flow para exibir o Upsell Banner (se tiver) ou Página de Obrigado
                    callback_url: `${window.location.origin}/checkout/sucesso?order_id=${currentOrderId}`
                })
            });

            if (!resPaystack.ok) {
                const errData = await resPaystack.json();
                throw new Error(errData.error || 'Falha ao conectar com o banco de processamento (Gateway).');
            }

            const paystackData = await resPaystack.json();

            if (paystackData?.data?.authorization_url) {
                // Redirecionamento da UI de Checkout da Paystack onde o cliente digita o Cartão!
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

    // ─── Success / Upsell flow ────────────────────────────────────────────────

    if (showUpsell && funnel) {
        const upsellData = funnel.upsells?.[0] ?? funnel.upsell;
        const downsellData = funnel.downsells?.[0] ?? funnel.downsell;
        if (upsellData?.product_id) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold">Compra Confirmada!</h2>
                        <p className="text-muted-foreground">Aguarde sua oferta exclusiva...</p>
                    </div>
                    <UpsellBanner
                        upsell={upsellData}
                        downsell={downsellData ?? null}
                        orderId={orderId ?? ''}
                        funnelId={funnel.id}
                        primaryColor={primaryColor}
                        mainProductCurrency={product.currency || 'ZAR'}
                    />
                </div>
            );
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold">Compra Confirmada!</h2>
                    <p className="text-muted-foreground">Obrigado pela sua compra. Enviamos os detalhes para o seu email.</p>
                </div>
            </div>
        );
    }

    // Order bumps: merge funnel bumps + direct product bumps (deduplicate by product_id)
    const funnelBumps: FunnelOrderBump[] = (funnel?.order_bumps && funnel.order_bumps.length > 0)
        ? funnel.order_bumps
        : (funnel?.order_bump && funnel.order_bump.product_id) ? [funnel.order_bump] : [];

    const seenIds = new Set(funnelBumps.map(b => b.product_id));
    const mergedBumps = [
        ...funnelBumps,
        ...directBumps.filter(b => !seenIds.has(b.product_id)),
    ];
    // Garantir que não mostramos bumps inativos/desabilitados
    const orderBumps = mergedBumps.filter(b => b.enabled !== false && b.product_id);

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
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: primaryColor }}>
                        <ShoppingCart className="h-4 w-4" />
                        {isSummaryOpen ? 'Esconder resumo' : t.orderSummary}
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isSummaryOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <span className="font-bold">{format(totalPrice)}</span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSummaryOpen ? 'max-h-[700px] border-t border-border opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 space-y-4">
                        <AdaptiveImage src={product.product_image_url} alt={product.name} />
                        <div>
                            <p className="font-semibold">{product.name}</p>
                            {product.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>}
                        </div>
                        {selectedBumps.length > 0 && (
                            <div className="space-y-1 border-t border-border pt-3">
                                {selectedBumps.map(b => (
                                    <div key={b.product_id} className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">+ {b.product_name}</span>
                                        <span className="font-medium">{format(parseFloat(b.product_price ?? '0'))}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between font-bold border-t border-border pt-3">
                            <span>{t.total}</span>
                            <span style={{ color: primaryColor }}>{format(totalPrice)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left — Form */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Steps */}
                    <div className="flex items-center gap-4">
                        <Step n={1} label={t.contactInfo} active={step === 1} done={step > 1} />
                        <div className="h-px flex-1 bg-border" />
                        <Step n={2} label={t.shippingAddress} active={step === 2} done={step > 2} />
                        <div className="h-px flex-1 bg-border" />
                        <Step n={3} label={t.payment} active={step === 3} done={false} />
                    </div>

                    {/* Step 1: Contact */}
                    {step === 1 && (
                        <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-4 animate-fade-in">
                            <h2 className="font-semibold text-lg">{t.contactInfo}</h2>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label>{t.email}</Label>
                                    <Input placeholder={t.emailPlaceholder} type="email" value={form.email} onChange={set("email")} />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t.phone}</Label>
                                    <div className="flex gap-2">
                                        <select value={form.phoneCode} onChange={set("phoneCode")}
                                            className="flex h-10 w-24 rounded-md border border-gray-300 bg-white text-black px-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                                            {COUNTRIES.map(c => <option key={c.code + c.name} value={c.code}>{c.code}</option>)}
                                        </select>
                                        <Input placeholder="82 123 4567" value={form.phone} onChange={set("phone")} />
                                    </div>
                                </div>
                            </div>

                            {/* Order Bumps Section — shown at Step 1 to maximize visibility */}
                            {orderBumps.length > 0 && (
                                <div className="rounded-xl border-2 border-dashed p-4 space-y-3"
                                    style={{ borderColor: primaryColor + '40', backgroundColor: primaryColor + '05' }}>
                                    <OrderBumps
                                        bumps={orderBumps}
                                        primaryColor={primaryColor}
                                        onTotalChange={handleBumpChange}
                                        orderId={orderId}
                                        funnelId={funnel?.id}
                                        mainProductCurrency={product.currency || 'ZAR'}
                                    />
                                </div>
                            )}

                            <Button
                                disabled={loadingInfo}
                                className="w-full gap-2 h-12 text-base font-semibold transition-transform active:scale-[0.98]"
                                onClick={async () => {
                                    if (!form.email) return setStep(2);
                                    setLoadingInfo(true);
                                    try {
                                        const res = await fetch('/api/orders', {
                                            method: 'POST',
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                product_id: product.id,
                                                customer_name: 'Pendente',
                                                customer_email: form.email,
                                                customer_phone: `${form.phoneCode}${form.phone}`,
                                                country: form.country,
                                                checkout_type: "physical",
                                                status: "pending",
                                                province: form.country,
                                                ...analyticsData
                                            })
                                        });
                                        const data = await res.json();
                                        if (data.data?.id) setOrderId(data.data.id);
                                    } catch (e) { console.error(e); }
                                    setLoadingInfo(false);
                                    setStep(2);
                                }}
                                style={{ backgroundColor: primaryColor }}
                            >
                                {loadingInfo ? "Salvando..." : t.continueToShipping} <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Shipping */}
                    {step === 2 && (
                        <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-4 animate-fade-in">
                            <h2 className="font-semibold text-lg">{t.shippingAddress}</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>{t.firstName}</Label>
                                    <Input placeholder={t.firstNameObj} value={form.firstName} onChange={set("firstName")} />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t.lastName}</Label>
                                    <Input placeholder={t.lastNameObj} value={form.lastName} onChange={set("lastName")} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>{t.countryRegion}</Label>
                                <div className="relative">
                                    <select value={form.country} onChange={set("country")}
                                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white text-black px-3 text-sm appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer">
                                        <option value="" disabled>Select Country</option>
                                        {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>{t.address}</Label>
                                <Input placeholder={t.addressPlaceholder} value={form.address} onChange={set("address")} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>{t.city}</Label>
                                    <Input placeholder="Johannesburg" value={form.city} onChange={set("city")} />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t.postalCode}</Label>
                                    <Input placeholder="2000" value={form.postal} onChange={set("postal")} />
                                </div>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 bg-muted/50">{t.goBack}</Button>
                                <Button className="flex-[2] gap-2 h-12 text-base font-semibold transition-transform active:scale-[0.98]"
                                    onClick={() => {
                                        setStep(3);
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        if ((window as any).fbq) {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            (window as any).fbq('track', 'InitiateCheckout', {
                                                content_name: product.name,
                                                content_ids: [product.id],
                                                content_type: 'product',
                                                value: totalPrice,
                                                currency: product.currency || 'ZAR'
                                            }, { eventID: orderId });
                                        }
                                    }} style={{ backgroundColor: primaryColor }}>
                                    {t.continueToPayment} <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Payment */}
                    {step === 3 && (
                        <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-4 animate-fade-in">
                            <div className="mb-2">
                                <h2 className="font-bold text-xl">{t.payment}</h2>
                                <p className="text-gray-500 text-sm mt-0.5">All transactions are secure and encrypted.</p>
                            </div>

                            <div className="border-2 border-primary rounded-lg overflow-hidden bg-white shadow-sm ring-4 flex flex-col ring-primary/10 mb-4 transition-all" style={{ borderColor: product.primary_color }}>
                                <div className="flex items-center justify-between p-3.5 bg-gray-50/50">
                                    <span className="font-semibold text-zinc-900 hidden sm:block">{t.payment}</span>
                                    <div className="flex flex-wrap items-center justify-center gap-1.5 w-full sm:w-auto">
                                        <div className="bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center w-[36px] h-[24px]">
                                            <svg viewBox="0 0 24 15" width="22" height="14" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7.5" r="7" fill="#EA001B" /><circle cx="17" cy="7.5" r="7" fill="#FFA200" fillOpacity="0.8" /></svg>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center w-[36px] h-[24px]">
                                            <svg viewBox="0 0 32 10" width="26" height="10" xmlns="http://www.w3.org/2000/svg"><path fill="#1434CB" d="M12.6,0l-1.3,8.7h2.7l1.3-8.7H12.6z M20.3,0.2c-0.6-0.2-1.5-0.4-2.6-0.4c-2.9,0-4.9,1.5-4.9,3.6 c0,1.6,1.4,2.4,2.5,3c1.1,0.5,1.5,0.9,1.5,1.4c0,0.7-0.9,1.1-1.7,1.1c-1.1,0-1.8-0.2-2.7-0.5l-0.4-1.8c0,0,0,0,0,0 c0,0-1,4.7-1,4.7h2.8c0.8,0,1.4-0.1,2.8-0.4c3.1-0.6,5.1-2.1,5.1-4.2c0-1.2-0.8-2.2-2.5-3c-1-0.5-1.6-0.8-1.6-1.3 c0-0.4,0.5-0.9,1.6-0.9c0.9,0,1.6,0.2,2.2,0.4L20.3,0.2z M25.8,0l-2.2,6l-0.8-4.2c-0.2-0.8-0.8-1.4-1.6-1.6l-3-0.2L18,1.4 c0.6,0.1,1.2,0.4,1.8,0.7c0.3,0.2,0.4,0.4,0.5,0.8l1.6,5.8h2.9L28.7,0H25.8z M8,0l-2,6.1L4.8,1.2C4.6,0.5,4-0.1,3.3-0.1L0,0l0,0 c0.7,0.2,1.5,0.4,2,0.7c0.3,0.2,0.4,0.6,0.6,1.2l1.6,6.8h2.8L10.9,0H8z" /></svg>
                                        </div>
                                        <div className="bg-[#0070CE] border border-[#0070CE] rounded shadow-sm flex items-center justify-center w-[36px] h-[24px]" title="American Express">
                                            <svg viewBox="0 0 24 16" width="20" height="14" xmlns="http://www.w3.org/2000/svg"><text x="12" y="7" fontSize="5.5" fontWeight="bold" fill="#fff" textAnchor="middle" fontFamily="Arial, sans-serif">AM</text><text x="12" y="13" fontSize="5.5" fontWeight="bold" fill="#fff" textAnchor="middle" fontFamily="Arial, sans-serif">EX</text></svg>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center w-[36px] h-[24px]" title="MTN Mobile Money">
                                            <div className="bg-[#ffcc00] w-full h-full rounded-[2px] flex items-center justify-center text-[7px] font-bold text-[#004e6e] leading-[1] text-center">MTN<br />MoMo</div>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded shadow-sm flex flex-col items-center justify-center w-[36px] h-[24px]" title="AirtelTigo">
                                            <div className="flex items-center text-[5.5px] tracking-tight font-black"><span className="text-[#FF0000]">airtel</span><span className="text-[#003180]">tigo</span></div>
                                            <span className="text-[4px] text-[#003180] font-bold mt-[1px]">Money</span>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center w-[36px] h-[24px]" title="Airtel Money">
                                            <svg viewBox="0 0 100 100" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path fill="#FF0000" d="M79.4,32C71.3,16,56.5,5.6,39,4.2C15.4,2.3-1.6,24,0.1,47.7c1.3,17.4,13.2,33,30.3,38c14,4.1,28.8,0,39.6-9.6 c2.7-2.4,1.4-7-2.1-7.8c-1.8-0.4-3.8,0-5.3,1.1c-8.4,6.5-20.1,9.4-30.8,6.2c-12.8-3.9-22-16-22.9-29.4 c-1.2-16.7,11.5-31.5,28.1-32.9c12.3-1.1,23.3,6.2,29,17.1c3.1,6,3.6,13,1.4,19.3c-2.9,8.4-10.4,14-19.3,14H46 c-4.2,0-7.6-3.4-7.6-7.6v-2.1c0-4.2,3.4-7.6,7.6-7.6h8.7c2.1,0,3.8-1.7,3.8-3.8s-1.7-3.8-3.8-3.8H46c-8.4,0-15.2,6.8-15.2,15.2 v2.1c0,8.4,6.8,15.2,15.2,15.2h2.5c12.4,0,23.1-7.8,27.1-19.6C78.4,47.8,77.9,39.2,79.4,32z" /></svg>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center w-[36px] h-[24px]" title="M-Pesa">
                                            <div className="bg-[#41b549] w-full h-full rounded-[2px] flex items-center justify-center text-[7px] font-bold text-white tracking-tighter">M-PESA</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-5 flex flex-col items-center justify-center text-center border-t border-gray-200">
                                    <svg className="h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    <div className="w-full">
                                        {product.currency !== 'ZAR' ? (
                                            <div className="flex flex-col items-center w-full">
                                                <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 shadow-sm p-4 rounded-lg w-full max-w-sm mb-4 text-center">
                                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                    {((t as any).zarConversionInfo || "Para garantir segurança e proteção antifraude, o pagamento será processado em ZAR (Rand Sul-Africano).\nO valor será automaticamente convertido pelo seu banco na cobrança.\nVocê verá o valor final em ZAR na próxima etapa antes de confirmar.").split('\n').map((line: string, idx: number) => (
                                                        <p key={idx} className="mb-1 leading-relaxed">{line}</p>
                                                    ))}
                                                </div>
                                                {exchangeRates && exchangeRates[product.currency] && (
                                                    <div className="border border-green-200 rounded-lg p-3 inline-block bg-green-50 shadow-sm w-full max-w-[280px]">
                                                        <p className="text-gray-900 font-bold mb-1 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide">
                                                            <svg className="h-3.5 w-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                            {(t as any).currentConversion || "Conversão atual"}:
                                                        </p>
                                                        <span className="text-primary font-bold text-base" style={{ color: product.primary_color }}>
                                                            {product.currency} {totalPrice.toFixed(2)} = ZAR {(totalPrice / exchangeRates[product.currency]).toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-600 font-medium max-w-sm mx-auto">
                                                {t.checkoutSecurityMsg}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary in payment step — Light Mode */}
                            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2 text-sm text-gray-800">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.orderSummary}</p>
                                <div className="flex justify-between">
                                    <span className="text-gray-700">{product.name}</span>
                                    <span className="font-semibold text-gray-900">{format(basePrice)}</span>
                                </div>
                                {selectedBumps.map(b => (
                                    <div key={b.product_id} className="flex justify-between">
                                        <span className="text-gray-600 flex items-center gap-1">
                                            <Zap className="h-3 w-3 text-amber-500" /> {b.product_name}
                                        </span>
                                        <span className="font-medium text-gray-900">{format(parseFloat(b.product_price ?? '0'))}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t.shipping}</span>
                                    <span className="font-semibold text-green-600">{t.freeShipping}</span>
                                </div>
                                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-3 mt-2">
                                    <span className="text-gray-900">{t.total}</span>
                                    <span style={{ color: primaryColor }}>{format(totalPrice)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 bg-muted/50">{t.goBack}</Button>
                                <Button onClick={handleCheckout} disabled={isSubmitting}
                                    className="flex-[2] h-12 text-base font-bold gap-2 transition-transform active:scale-[0.98] shadow-lg shadow-primary/20"
                                    style={{ backgroundColor: primaryColor }}>
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

                {/* Right — Order Summary (Desktop) */}
                <div className="hidden lg:block lg:col-span-2">
                    <div className="bg-white rounded-xl border border-border p-5 sticky top-20 shadow-sm space-y-5">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t.orderSummary}</h3>
                        <AdaptiveImage src={product.product_image_url} alt={product.name} />
                        <div>
                            <p className="font-semibold">{product.name}</p>
                            {product.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>}
                        </div>

                        {/* Bump summary */}
                        {selectedBumps.length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adicionais</p>
                                {selectedBumps.map(b => (
                                    <div key={b.product_id} className="flex justify-between text-xs">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Zap className="h-3 w-3" style={{ color: primaryColor }} />
                                            {b.product_name}
                                        </span>
                                        <span className="font-semibold">{format(parseFloat(b.product_price ?? '0'))}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between font-bold border-t border-border pt-4 text-lg">
                            <span>{t.total}</span>
                            <span style={{ color: primaryColor }}>{format(totalPrice)}</span>
                        </div>
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
        </div>
    );
}
