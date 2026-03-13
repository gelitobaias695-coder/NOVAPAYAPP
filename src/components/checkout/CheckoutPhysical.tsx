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
    ArrowRight, ChevronDown, ShoppingCart, Loader2, Zap,
    Truck, CreditCard, AlertCircle
} from "lucide-react";
import { useTranslation, type Language } from "./translations";
import { AdaptiveImage } from "@/components/ui/adaptive-image";
import { toast } from "sonner";

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

const ChevronRight = ({ className }: { className?: string }) => (
    <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M1 9L5 5L1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

function Breadcrumbs({ step, t }: { step: number; t: any }) {
    const s = (id: number) => {
        if (step === id) return "text-gray-900 font-bold";
        if (step > id) return "text-blue-600 cursor-pointer hover:text-blue-800 transition-colors";
        return "text-gray-500";
    };

    return (
        <nav className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-400 py-4 mb-4">
            <span className="text-blue-600 cursor-pointer hover:text-blue-800 transition-colors">Cart</span>
            <ChevronRight className="h-2 w-2 text-gray-400" />
            <span className={s(1)}>{t.information}</span>
            <ChevronRight className="h-2 w-2 text-gray-400" />
            <span className={s(2)}>{t.shipping}</span>
            <ChevronRight className="h-2 w-2 text-gray-400" />
            <span className={s(3)}>{t.payment}</span>
        </nav>
    );
}

function ShopifyField({ label, value, onChange, type = "text", ...props }: any) {
    const [focused, setFocused] = useState(false);
    const showLabel = focused || value;
    return (
        <div className={`relative border border-gray-300 rounded-md transition-all h-[54px] flex flex-col justify-center px-3 ${focused ? 'ring-2 ring-blue-600 border-blue-600' : 'hover:border-gray-400'}`}>
            <label className={`absolute left-3 transition-all pointer-events-none text-gray-500 ${showLabel ? 'top-1.5 text-[10px] font-medium' : 'top-1/2 -translate-y-1/2 text-sm'}`}>
                {label}
            </label>
            <input 
                {...props}
                type={type}
                value={value}
                onChange={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className={`w-full bg-transparent border-none p-0 outline-none text-sm text-gray-900 placeholder-transparent ${showLabel ? 'mt-3.5' : ''}`}
                placeholder={label}
            />
        </div>
    );
}

function ShopifySelect({ label, value, children, onChange }: any) {
    return (
        <div className="relative border border-gray-300 rounded-md h-[54px] flex flex-col justify-center px-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 transition-all">
            <label className="absolute left-3 top-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                {label}
            </label>
            <div className="relative mt-3.5">
                <select 
                    value={value}
                    onChange={onChange}
                    className="w-full bg-transparent border-none p-0 outline-none text-sm text-gray-900 appearance-none cursor-pointer"
                >
                    {children}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
        </div>
    );
}

function SummaryRow({ label, value, onAction, actionLabel }: { label: string; value: string; onAction?: () => void; actionLabel?: string }) {
    return (
        <div className="grid grid-cols-[80px_1fr_auto] gap-4 py-3.5 first:pt-0 last:pb-0 border-b last:border-0 border-gray-100 items-center">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm text-gray-900 break-words">{value}</span>
            {onAction && (
                <button 
                    onClick={onAction}
                    className="text-[11px] text-blue-600 font-medium hover:underline"
                >
                    {actionLabel}
                </button>
            )}
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

    // State
    const [step, setStep] = useState(1);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [form, setForm] = useState({
        email: "", phone: "", phoneCode: "+27", firstName: "", lastName: "",
        address: "", address2: "", city: "", province: "Gauteng", postal: "", country: "South Africa",
    });
    const [card, setCard] = useState({ number: "", exp: "", cvv: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [showUpsell, setShowUpsell] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<Record<string, string | undefined>>({});
    const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
    const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('express');
    const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
    const shippingPrice = shippingMethod === 'standard' ? 67 : 0;
    const totalPrice = basePrice + bumpExtraTotal + shippingPrice;

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem(`checkout_form_${product.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setForm(f => ({ ...f, ...parsed }));
            } catch (e) { console.error(e); }
        }
    }, [product.id]);

    useEffect(() => {
        localStorage.setItem(`checkout_form_${product.id}`, JSON.stringify(form));
    }, [form, product.id]);



    // CEP Lookup
    const handleCEPLookup = async (cep: string) => {
        const cleanCEP = cep.replace(/\D/g, '');
        if (cleanCEP.length !== 8) return;

        setLoadingInfo(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setForm(prev => ({
                    ...prev,
                    address: `${data.logradouro}, ${data.bairro}`,
                    city: data.localidade,
                    postal: cleanCEP
                }));
                toast.success("Endereço preenchido automaticamente!");
            }
        } catch (e) {
            console.error("CEP error", e);
        } finally {
            setLoadingInfo(false);
        }
    };

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
            const searchParams = typeof window !== 'undefined' ? window.location.search : '';
            const resPaystack = await fetch('/api/paystack/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: currentOrderId,
                    email: form.email,
                    currency: product.currency, // Dinâmico pelo produto!
                    // Redireciona de volta com o success flow para exibir o Upsell Banner (se tiver) ou Página de Obrigado
                    callback_url: `${window.location.origin}/checkout/sucesso${searchParams}${searchParams ? '&' : '?'}order_id=${currentOrderId}`
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
            toast.error(err instanceof Error ? err.message : 'Erro ao processar pagamento. Tente novamente.');
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

    const [saveInfo, setSaveInfo] = useState(false);

    return (
        <div className="checkout-shopify-mode min-h-screen bg-white text-zinc-900 font-sans">
             {/* Header with Logo - Centered on Mobile */}
             <header className="border-b border-gray-100 py-6 lg:hidden">
                <div className="flex justify-center">
                    {product.logo_url ? (
                        <img src={product.logo_url} alt="Logo" className="h-8 object-contain" />
                    ) : (
                        <div className="flex items-center gap-1">
                            <span className="font-black text-2xl tracking-tighter text-blue-600 italic">takealot</span>
                            <div className="bg-blue-600 rounded-full p-1">
                                <ShoppingCart className="h-3 w-3 text-white fill-white" />
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <div className="max-w-[1100px] mx-auto min-h-screen flex flex-col lg:flex-row">
                
                {/* Mobile Order Summary Accordion */}
                <div className="lg:hidden bg-[#fafafa] border-b border-gray-200 sticky top-0 z-50">
                    <button
                        onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                        className="w-full flex items-center justify-between p-4 px-6 md:px-10"
                    >
                        <div className="flex items-center gap-2 text-[14px] text-blue-600 font-medium">
                            <span>Order summary</span>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isSummaryOpen ? 'rotate-180' : ''}`} />
                        </div>
                        <span className="font-bold text-xl text-gray-900">{format(totalPrice)}</span>
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSummaryOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-4 space-y-4 bg-white border-t border-gray-200">
                             {/* Mini Order Summary for Mobile */}
                             <div className="flex gap-4 items-center">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-md border border-gray-200 overflow-hidden bg-white">
                                        <AdaptiveImage src={product.product_image_url} alt={product.name} />
                                    </div>
                                    <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">1</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{product.name}</p>
                                    <p className="text-xs text-gray-500">Default</p>
                                </div>
                                <p className="text-sm font-medium">{format(basePrice)}</p>
                            </div>
                            
                            {selectedBumps.map(b => (
                                <div key={b.product_id} className="flex gap-4 items-center pl-4">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-md border border-gray-200 overflow-hidden bg-white">
                                            {/* Bump image placeholder or actual image if available */}
                                            <Package className="w-full h-full p-2 text-gray-400" />
                                        </div>
                                        <span className="absolute -top-1.5 -right-1.5 bg-gray-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">1</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-medium">{b.product_name}</p>
                                    </div>
                                    <p className="text-xs font-medium">{format(parseFloat(b.product_price ?? '0'))}</p>
                                </div>
                            ))}

                            <div className="space-y-2 border-t border-gray-100 pt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">{t.subtotal}</span>
                                    <span className="font-medium">{format(basePrice + bumpExtraTotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">{t.shipping}</span>
                                    <span className="text-gray-500">{shippingPrice === 0 ? (step === 1 ? t.calculatedAtNextStep : t.free) : format(shippingPrice)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                    <span className="text-lg font-bold">{t.total}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs text-gray-500">ZAR</span>
                                        <span className="text-xl font-bold">{format(totalPrice)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Left Side: Form & Info */}
                <div className="flex-1 bg-white p-6 sm:p-10 lg:p-12 lg:pr-8 xl:pr-16 order-1 lg:order-1 lg:border-r lg:border-gray-100">
                    <div className="max-w-[580px] lg:ml-auto">
                        <header className="hidden lg:block mb-8">
                             {product.logo_url ? (
                                <img src={product.logo_url} alt="Logo" className="h-9 mb-6 object-contain" />
                            ) : (
                                <div className="flex items-center gap-1.5 mb-6">
                                    <span className="font-black text-2xl tracking-tighter text-blue-600 italic">takealot</span>
                                    <div className="bg-blue-600 rounded-full p-1">
                                        <ShoppingCart className="h-3 w-3 text-white fill-white" />
                                    </div>
                                </div>
                            )}
                        </header>
                        <Breadcrumbs step={step} t={t} />
                    </div>

                    <div className="max-w-[580px] lg:ml-auto">
                        <main className="space-y-8">
                            {/* Information Summary (Shown in Step 2 and 3) */}
                            {step > 1 && (
                                <div className="border border-gray-200 rounded-lg p-5 space-y-0 bg-white transition-all duration-300">
                                    <SummaryRow 
                                        label="Contact" 
                                        value={form.email || form.phone} 
                                        onAction={() => setStep(1)} 
                                        actionLabel="Change" 
                                    />
                                    <SummaryRow 
                                        label="Ship to" 
                                        value={`${form.address}, ${form.city}, ${form.postal}, ${form.country}`} 
                                        onAction={() => setStep(1)} 
                                        actionLabel="Change" 
                                    />
                                    {step > 2 && (
                                        <SummaryRow 
                                            label="Method" 
                                            value={`${shippingMethod === 'express' ? t.expressShipping : t.standardShipping} · ${shippingPrice === 0 ? t.free : format(shippingPrice)}`} 
                                            onAction={() => setStep(2)} 
                                            actionLabel="Change" 
                                        />
                                    )}
                                </div>
                            )}

                            {/* Step 1: Information */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Contact</h2>
                                            <button className="text-xs text-blue-600 font-medium hover:underline">Sign in</button>
                                        </div>
                                        <ShopifyField 
                                            label="Email or mobile phone number" 
                                            value={form.email}
                                            onChange={set("email")}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Shipping address</h2>
                                        <div className="grid grid-cols-1 gap-3.5">
                                            <ShopifySelect 
                                                label="Country/Region"
                                                value={form.country} 
                                                onChange={set("country")}
                                            >
                                                {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                            </ShopifySelect>
                                            
                                            <div className="grid grid-cols-2 gap-3.5">
                                                <ShopifyField 
                                                    label="First name (optional)" 
                                                    value={form.firstName}
                                                    onChange={set("firstName")}
                                                />
                                                <ShopifyField 
                                                    label="Last name" 
                                                    value={form.lastName}
                                                    onChange={set("lastName")}
                                                />
                                            </div>
                                            <ShopifyField 
                                                label="Address" 
                                                value={form.address}
                                                onChange={set("address")}
                                            />
                                            <ShopifyField 
                                                label="Apartment, suite, etc. (optional)" 
                                                value={form.address2}
                                                onChange={set("address2")}
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                                <ShopifyField 
                                                    label="City" 
                                                    value={form.city}
                                                    onChange={set("city")}
                                                />
                                                <ShopifySelect 
                                                    label="Province"
                                                    value={form.province}
                                                    onChange={set("province")}
                                                >
                                                    <option value="Gauteng">Gauteng</option>
                                                    <option value="Western Cape">Western Cape</option>
                                                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                                                    <option value="Eastern Cape">Eastern Cape</option>
                                                    <option value="Free State">Free State</option>
                                                    <option value="Limpopo">Limpopo</option>
                                                    <option value="Mpumalanga">Mpumalanga</option>
                                                    <option value="Northern Cape">Northern Cape</option>
                                                    <option value="North West">North West</option>
                                                </ShopifySelect>
                                                <ShopifyField 
                                                    label="Postal code" 
                                                    value={form.postal}
                                                    onChange={set("postal")}
                                                    onBlur={(e: any) => handleCEPLookup(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <input 
                                                    type="checkbox" 
                                                    id="saveInfo" 
                                                    checked={saveInfo}
                                                    onChange={(e) => setSaveInfo(e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" 
                                                />
                                                <label htmlFor="saveInfo" className="text-sm text-gray-700 cursor-pointer select-none">Save this information for next time</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                                        <button className="text-sm font-medium text-blue-600 flex items-center gap-1.5 order-2 sm:order-1 transition-colors hover:text-blue-800">
                                            <ChevronRight className="h-2.5 w-2.5 rotate-180" />
                                            Return to cart
                                        </button>
                                        <Button 
                                            onClick={() => setStep(2)}
                                            className="w-full sm:w-auto h-16 px-10 bg-[#0058e4] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xl shadow-blue-600/10 order-1 sm:order-2 transition-all transform active:scale-95"
                                        >
                                            Continue to shipping
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Shipping */}
                            {step === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-4">
                                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Shipping method</h2>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                            <label 
                                                className={`flex items-center justify-between p-5 cursor-pointer transition-all border-2 ${shippingMethod === 'express' ? 'border-blue-600 bg-blue-50/20' : 'border-transparent hover:bg-gray-50'}`}
                                                onClick={() => setShippingMethod('express')}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${shippingMethod === 'express' ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                                        {shippingMethod === 'express' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                    <span className="text-[15px] font-medium text-gray-900">{t.expressShipping}</span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-900 uppercase">FREE</span>
                                            </label>
                                            <label 
                                                className={`flex items-center justify-between p-5 cursor-pointer transition-all border-2 border-t border-t-gray-100 ${shippingMethod === 'standard' ? 'border-blue-600 bg-blue-50/20' : 'border-transparent hover:bg-gray-50'}`}
                                                onClick={() => setShippingMethod('standard')}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${shippingMethod === 'standard' ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                                        {shippingMethod === 'standard' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                    <span className="text-[15px] font-medium text-gray-900">{t.standardShipping}</span>
                                                </div>
                                                <span className="text-[15px] font-bold text-gray-900">R 67,00</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                                        <button className="text-sm font-medium text-blue-600 flex items-center gap-1.5 order-2 sm:order-1 transition-colors hover:text-blue-800" onClick={() => setStep(1)}>
                                            <ChevronRight className="h-2.5 w-2.5 rotate-180" />
                                            Return to information
                                        </button>
                                        <Button 
                                            onClick={() => setStep(3)}
                                            className="w-full sm:w-auto h-16 px-10 bg-[#0058e4] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xl shadow-blue-600/10 order-1 sm:order-2 transition-all transform active:scale-95"
                                        >
                                            Continue to payment
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Payment */}
                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-4">
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
                                            <p className="text-xs text-gray-500">All transactions are secure and encrypted.</p>
                                        </div>
                                        
                                        <div className="border border-blue-600 bg-blue-50/30 rounded-lg overflow-hidden shadow-sm">
                                            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-gray-900">Paystack</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <CreditCard className="h-4 w-4 text-gray-400" />
                                                    <span className="text-[10px] font-medium text-gray-400">Secure Payment</span>
                                                </div>
                                            </div>
                                            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                                                <div className="w-20 h-16 bg-gray-100 rounded-md flex items-center justify-center relative">
                                                    <div className="w-12 h-8 border-2 border-gray-300 rounded"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-20 rotate-12">
                                                        <Icons.Paystack className="w-12 h-12" />
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-600 max-w-[280px]">
                                                    You'll be redirected to Paystack to complete your purchase.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-lg font-semibold text-gray-900">Billing address</h2>
                                        <p className="text-xs text-gray-500">Select the address that matches your card or payment method.</p>
                                        
                                        <div className="border border-gray-200 rounded-lg divide-y overflow-hidden shadow-sm">
                                            <label 
                                                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${billingSameAsShipping ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                                onClick={() => setBillingSameAsShipping(true)}
                                            >
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${billingSameAsShipping ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                                    {billingSameAsShipping && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{t.sameAsShipping}</span>
                                            </label>
                                            <label 
                                                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${!billingSameAsShipping ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                                onClick={() => setBillingSameAsShipping(false)}
                                            >
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!billingSameAsShipping ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                                    {!billingSameAsShipping && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{t.useDifferentBilling}</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                                        <button className="text-sm text-blue-600 flex items-center gap-1.5 order-2 sm:order-1 transition-colors hover:text-blue-800" onClick={() => setStep(2)}>
                                            <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotate-180">
                                                <path d="M1 9L5 5L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            Return to shipping
                                        </button>
                                        <Button 
                                            onClick={handleCheckout}
                                            disabled={isSubmitting}
                                            className="w-full sm:w-auto h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xl shadow-blue-600/20 order-1 sm:order-2 transition-all transform hover:scale-[1.02]"
                                        >
                                            {isSubmitting ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    Processing...
                                                </div>
                                            ) : 'Pay now'}
                                        </Button>
                                    </div>
                                </div>
                            )}



                            <footer className="pt-12 border-t border-gray-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                                <nav className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-[10px] text-gray-400 font-medium">
                                    <button className="hover:text-blue-600 transition-colors uppercase tracking-widest">Refund policy</button>
                                    <button className="hover:text-blue-600 transition-colors uppercase tracking-widest">Shipping policy</button>
                                    <button className="hover:text-blue-600 transition-colors uppercase tracking-widest">Privacy policy</button>
                                    <button className="hover:text-blue-600 transition-colors uppercase tracking-widest">Terms of service</button>
                                </nav>
                            </footer>
                        </main>
                    </div>
                </div>

                {/* Right Side: Order Summary (Desktop) */}
                <div className="hidden lg:block w-[420px] bg-[#f5f5f5] border-l border-gray-200 p-8 pt-12 min-h-screen sticky top-0 overflow-y-auto order-2 lg:order-2">
                    <div className="max-w-[400px] space-y-6">
                        {/* Product List */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 group">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm ring-1 ring-black/5">
                                        <AdaptiveImage src={product.product_image_url} alt={product.name} />
                                    </div>
                                    <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-[10px] border border-white/20 w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-md">1</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Default</p>
                                </div>
                                <p className="text-sm font-medium text-gray-900">{format(basePrice)}</p>
                            </div>

                            {selectedBumps.map(b => (
                                <div key={b.product_id} className="flex items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="relative pl-2">
                                        <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm flex items-center justify-center">
                                            <Package className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <span className="absolute -top-1.5 -right-1.5 bg-gray-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-sm">1</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-gray-900">{b.product_name}</p>
                                    </div>
                                    <p className="text-xs font-medium text-gray-900">{format(parseFloat(b.product_price ?? '0'))}</p>
                                </div>
                            ))}
                        </div>

                        {/* Order Bumps Suggestion (if in step 1 or 2) */}
                        {step < 3 && mergedBumps.length > 0 && selectedBumps.length === 0 && (
                             <div className="pt-4 animate-in fade-in duration-700 delay-300">
                                <OrderBumps
                                    bumps={mergedBumps}
                                    primaryColor="#2563eb"
                                    onTotalChange={handleBumpChange}
                                    orderId={orderId}
                                    funnelId={funnel?.id}
                                    mainProductCurrency={product.currency || 'ZAR'}
                                    lang={(product.checkout_language as Language) || 'pt'}
                                />
                            </div>
                        )}

                        {/* Calculation */}
                        <div className="space-y-2 pt-6 border-t border-gray-200">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t.subtotal}</span>
                                <span className="font-medium text-gray-900">{format(basePrice + bumpExtraTotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t.shipping}</span>
                                <span className="text-gray-500 italic">{shippingPrice === 0 ? (step === 1 ? t.calculatedAtNextStep : t.free) : format(shippingPrice)}</span>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                            <span className="text-lg font-bold text-gray-900">{t.total}</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xs text-gray-500 font-medium">ZAR</span>
                                <span className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">{format(totalPrice)}</span>
                            </div>
                        </div>

                        <div className="pt-8 text-center">
                             <div className="inline-flex items-center gap-2 text-[10px] text-gray-400 font-medium tracking-tight uppercase">
                                <Lock className="h-3 w-3" />
                                100% Secure Checkout
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const Icons = {
    Paystack: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
    )
};
