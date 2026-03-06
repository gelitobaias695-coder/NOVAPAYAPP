import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useProducts, type CreateProductInput, type DBProduct } from "@/hooks/useProducts";
import {
    Loader2, Copy, CheckCheck, Package, Zap, ExternalLink,
    Tag, X, Plus, CheckCircle2, AlertCircle, RefreshCw,
} from "lucide-react";

// ─── Schema ───────────────────────────────────────────────────────────────────
const productSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório").max(255),
    description: z.string().max(2000).optional(),
    price: z.coerce.number().positive("Preço deve ser maior que zero"),
    currency: z.enum(["ZAR", "KES", "TZS", "NGN", "GHS"]),
    status: z.enum(["active", "inactive"]),
    type: z.enum(["physical", "digital"]),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#10B981"),
    require_whatsapp: z.boolean().default(false),
    checkout_language: z.enum(["pt", "en", "fr", "es"]).default("pt"),
    success_url: z.string().url("URL inválida").optional().or(z.literal('')),
    email_sender_name: z.string().max(255).optional().or(z.literal('')),
    email_sender_email: z.string().email("E-mail inválido").optional().or(z.literal('')),
});
type ProductFormValues = z.infer<typeof productSchema>;

// ─── Bump Types ───────────────────────────────────────────────────────────────
interface BumpItem {
    bump_product_id: string;
    title: string;
    description: string;
    discount_type: "percentage" | "fixed" | "none";
    discount_value: number;
    // read-only metadata from Neon JOIN
    product_name?: string;
    product_price?: string;
    product_currency?: string;
}

// ─── Bump Selector Row ────────────────────────────────────────────────────────
function BumpRow({
    bump, index, allProducts, onUpdate, onRemove,
}: {
    bump: BumpItem;
    index: number;
    allProducts: DBProduct[];
    onUpdate: (patch: Partial<BumpItem>) => void;
    onRemove: () => void;
}) {
    const selected = allProducts.find(p => p.id === bump.bump_product_id);
    return (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20 animate-fade-in">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Bump #{index + 1}
                </span>
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-destructive hover:bg-destructive/10 rounded p-1 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Product selector */}
            <div className="space-y-1">
                <Label className="text-xs">Produto Bump *</Label>
                <select
                    value={bump.bump_product_id}
                    onChange={e => onUpdate({ bump_product_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                    <option value="">— Selecionar produto —</option>
                    {allProducts.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name} ({p.currency} {p.price})
                        </option>
                    ))}
                </select>
                {selected && (
                    <p className="text-[10px] text-primary flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {selected.currency} {selected.price} — {selected.name}
                    </p>
                )}
            </div>

            {/* Title */}
            <Input
                placeholder="Título (Ex: ⚡ Adicione e economize!)"
                value={bump.title}
                onChange={e => onUpdate({ title: e.target.value })}
            />

            {/* Description */}
            <Input
                placeholder="Descrição curta..."
                value={bump.description}
                onChange={e => onUpdate({ description: e.target.value })}
            />

            {/* Discount */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label className="text-xs">Tipo Desconto</Label>
                    <select
                        value={bump.discount_type}
                        onChange={e => onUpdate({ discount_type: e.target.value as BumpItem["discount_type"] })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                        <option value="percentage">% Percentual</option>
                        <option value="fixed">Valor Fixo</option>
                        <option value="none">Sem Desconto</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">
                        {bump.discount_type === "percentage" ? "Desconto (%)" : bump.discount_type === "fixed" ? "Desconto (R$)" : "—"}
                    </Label>
                    <Input
                        type="number"
                        min={0}
                        disabled={bump.discount_type === "none"}
                        value={bump.discount_value}
                        onChange={e => onUpdate({ discount_value: parseFloat(e.target.value) || 0 })}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface EditProductDialogProps {
    open: boolean;
    onClose: () => void;
    product: DBProduct | null;
    onSave: (id: string, input: CreateProductInput) => Promise<DBProduct>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EditProductDialog({ open, onClose, product, onSave }: EditProductDialogProps) {
    const { products: allProducts } = useProducts();
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedProduct, setSavedProduct] = useState<DBProduct | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [productImageFile, setProductImageFile] = useState<File | null>(null);
    const [copied, setCopied] = useState(false);
    const [isRedirectEnabled, setIsRedirectEnabled] = useState(false);

    // ── Order Bumps state ──
    const [bumps, setBumps] = useState<BumpItem[]>([]);
    const [bumpsLoading, setBumpsLoading] = useState(false);
    const [bumpsError, setBumpsError] = useState<string | null>(null);
    const [bumpsDirty, setBumpsDirty] = useState(false);

    const {
        register, handleSubmit, setValue, watch, reset,
        formState: { errors },
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "", description: "", price: 0,
            currency: "ZAR", status: "active", type: "physical",
            primary_color: "#10B981", require_whatsapp: false,
            checkout_language: "pt", success_url: "",
            email_sender_name: "", email_sender_email: "",
        },
    });

    // ── Reset form fields when product changes ──
    useEffect(() => {
        if (product && open) {
            reset({
                name: product.name,
                description: product.description || "",
                price: parseFloat(product.price),
                currency: product.currency as ProductFormValues["currency"],
                status: product.status as ProductFormValues["status"],
                type: product.type as ProductFormValues["type"],
                primary_color: product.primary_color || "#10B981",
                require_whatsapp: product.require_whatsapp,
                checkout_language: product.checkout_language as ProductFormValues["checkout_language"],
                success_url: product.success_url || "",
                email_sender_name: product.email_sender_name || "",
                email_sender_email: product.email_sender_email || "",
            });
            setIsRedirectEnabled(!!product.success_url);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id, open, reset]);

    // ── FETCH bumps from Neon when dialog opens ──
    const fetchBumps = useCallback(async () => {
        if (!product?.id) return;
        setBumpsLoading(true);
        setBumpsError(null);
        try {
            // Sempre busca sem cache para refletir deleções imediatas no Neon
            const res = await fetch(`/api/products/${product.id}/bumps`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const rawBumps = json.data ?? [];
            console.log(`[EditProduct] Bumps recebidos do Neon para produto ${product.id}:`, rawBumps);

            if (rawBumps.length === 0) {
                console.log(`[EditProduct] Nenhum bump no Neon para produto ${product.id} — exibindo lista vazia.`);
            }

            const loaded: BumpItem[] = rawBumps.map((b: Record<string, unknown>) => ({
                bump_product_id: (b.product_id as string) ?? "",
                title: (b.title as string) ?? "Oferta Exclusiva",
                description: (b.bump_description as string) ?? "",
                discount_type: (b.discount_type as BumpItem["discount_type"]) ?? "percentage",
                discount_value: parseFloat(String(b.discount_value ?? 0)),
                product_name: (b.product_name as string) ?? "",
                product_price: String(b.product_price ?? "0"),
                product_currency: (b.product_currency as string) ?? "",
            }));
            setBumps(loaded);
            setBumpsDirty(false);
            console.log(`[EditProduct] ✅ Bumps atuais no banco para produto ${product.id}:`, loaded.map(b => b.bump_product_id));
        } catch (err) {
            setBumpsError("Não foi possível carregar os Order Bumps.");
            console.error("[EditProduct] ❌ Erro ao buscar bumps:", err);
        } finally {
            setBumpsLoading(false);
        }
    }, [product?.id]);

    // ── Trigger fetch + clear state when dialog opens/closes ──
    useEffect(() => {
        if (open && product?.id) {
            fetchBumps();
        } else if (!open) {
            // Clean up bumps state when dialog is closed
            setBumps([]);
            setBumpsDirty(false);
            setBumpsError(null);
        }
    }, [open, product?.id, fetchBumps]);

    const [removingBumpIndex, setRemovingBumpIndex] = useState<number | null>(null);

    const updateBump = (index: number, patch: Partial<BumpItem>) => {
        setBumps(bs => bs.map((b, i) => i === index ? { ...b, ...patch } : b));
        setBumpsDirty(true);
    };

    const addBump = () => {
        setBumps(bs => [...bs, {
            bump_product_id: "",
            title: "⚡ Oferta Exclusiva!",
            description: "",
            discount_type: "percentage",
            discount_value: 10,
        }]);
        setBumpsDirty(true);
    };

    const removeBump = (index: number) => {
        // Confirmação antes de remover o bump
        if (!confirm(`⚠️ Remover este Order Bump? Ao salvar, ele será deletado permanentemente da tabela product_order_bumps no Neon.`)) return;
        // Animação de fade-out antes de remover
        setRemovingBumpIndex(index);
        setTimeout(() => {
            setBumps(bs => bs.filter((_, i) => i !== index));
            setRemovingBumpIndex(null);
            setBumpsDirty(true);
        }, 300);
    };

    // ── Save product + sync bumps ──
    const onSubmit = async (values: ProductFormValues) => {
        if (!product) return;
        setIsSubmitting(true);
        try {
            // 1. Save main product fields
            const updatedProduct = await onSave(product.id, {
                name: values.name,
                description: values.description,
                price: values.price,
                currency: values.currency,
                status: values.status,
                type: values.type,
                logo_image: logoFile || undefined,
                product_image: productImageFile || undefined,
                primary_color: values.primary_color,
                require_whatsapp: values.require_whatsapp,
                checkout_language: values.checkout_language,
                success_url: isRedirectEnabled ? values.success_url : undefined,
                email_sender_name: values.email_sender_name || undefined,
                email_sender_email: values.email_sender_email || undefined,
            });

            // 2. Sync Order Bumps atomically via PUT /api/products/:id/bumps/sync
            const validBumps = bumps.filter(b => b.bump_product_id);
            const syncRes = await fetch(`/api/products/${product.id}/bumps/sync`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bumps: validBumps.map((b, i) => ({
                        bump_product_id: b.bump_product_id,
                        title: b.title || "Oferta Exclusiva",
                        description: b.description || "",
                        discount_type: b.discount_type || "percentage",
                        discount_value: b.discount_value || 0,
                        display_order: i,
                    })),
                }),
            });

            if (!syncRes.ok) {
                const err = await syncRes.json().catch(() => ({}));
                throw new Error(err.message || "Erro ao sincronizar Order Bumps");
            }

            const syncData = await syncRes.json();
            setBumpsDirty(false);

            setSavedProduct(updatedProduct);
            toast({
                title: "✅ Configurações de funil atualizadas!",
                description: `"${values.name}" salvo com sucesso. ${syncData.total} Order Bump(s) sincronizados no banco de dados Neon.`,
            });
        } catch (err: unknown) {
            toast({
                title: "❌ Erro ao salvar produto",
                description: err instanceof Error ? err.message : "Erro desconhecido",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setSavedProduct(null);
            setLogoFile(null);
            setProductImageFile(null);
            setBumps([]);
            setBumpsDirty(false);
            setBumpsError(null);
            reset();
        }, 300);
    };

    const currency = watch("currency");
    const status = watch("status");
    const type = watch("type");
    const primaryColor = watch("primary_color");
    const requireWhatsapp = watch("require_whatsapp");
    const checkoutLanguage = watch("checkout_language");

    const checkoutUrl = savedProduct
        ? `${window.location.origin}/checkout/${savedProduct.id}`
        : product
            ? `${window.location.origin}/checkout/${product.id}`
            : null;

    const copyUrl = () => {
        if (!checkoutUrl) return;
        navigator.clipboard.writeText(checkoutUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Exclude the current product from bump candidates to prevent self-reference
    const bumpCandidates = allProducts.filter(p => p.id !== product?.id && p.status === "active");

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Editar Produto
                        {product && (
                            <Badge variant="outline" className="text-xs font-mono">
                                {product.id.slice(0, 8)}…
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {/* ── Success state ── */}
                {savedProduct && checkoutUrl && (
                    <div className="space-y-4 py-4">
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center space-y-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto">
                                {savedProduct.type === "digital" ? <Zap className="h-6 w-6 text-primary" /> : <Package className="h-6 w-6 text-primary" />}
                            </div>
                            <div>
                                <p className="font-semibold">{savedProduct.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Checkout {savedProduct.type === "digital" ? "Digital" : "Físico"} atualizado!
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Link de Checkout</Label>
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
                                    <span className="text-xs text-muted-foreground truncate flex-1">{checkoutUrl}</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyUrl}>
                                        {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                                <Button asChild variant="outline" size="sm" className="w-full gap-2">
                                    <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" /> Abrir Checkout
                                    </a>
                                </Button>
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleClose}>Fechar</Button>
                    </div>
                )}

                {/* ── Edit form ── */}
                {!savedProduct && product && (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">

                        {/* Type selector */}
                        <div className="grid grid-cols-2 gap-2">
                            {(["physical", "digital"] as const).map((t) => (
                                <button type="button" key={t} onClick={() => setValue("type", t)}
                                    className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all ${type === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                                >
                                    {t === "physical" ? <Package className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                                    {t === "physical" ? "📦 Físico" : "⚡ Digital"}
                                </button>
                            ))}
                        </div>

                        {/* Name */}
                        <div className="space-y-1">
                            <Label>Nome *</Label>
                            <Input placeholder="Ex: E-commerce Mastery Course" {...register("name")} />
                            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <Label>Descrição</Label>
                            <Textarea placeholder="Descrição do produto..." rows={2} {...register("description")} />
                        </div>

                        {/* Price + Currency */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Preço *</Label>
                                <Input type="number" step="0.01" min="0" placeholder="0.00" {...register("price")} />
                                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label>Moeda *</Label>
                                <Select value={currency} onValueChange={(v) => setValue("currency", v as ProductFormValues["currency"])}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ZAR">🇿🇦 ZAR</SelectItem>
                                        <SelectItem value="NGN">🇳🇬 NGN</SelectItem>
                                        <SelectItem value="KES">🇰🇪 KES</SelectItem>
                                        <SelectItem value="GHS">🇬🇭 GHS</SelectItem>
                                        <SelectItem value="TZS">🇹🇿 TZS</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-1">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v) => setValue("status", v as ProductFormValues["status"])}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">✅ Ativo</SelectItem>
                                    <SelectItem value="inactive">⏸ Inativo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Language */}
                        <div className="space-y-1">
                            <Label>Idioma do Checkout</Label>
                            <Select value={checkoutLanguage} onValueChange={(v) => setValue("checkout_language", v as ProductFormValues["checkout_language"])}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pt">🇧🇷 Português</SelectItem>
                                    <SelectItem value="en">🇬🇧 English</SelectItem>
                                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Visual section */}
                        <div className="rounded-lg border border-border p-4 space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">🎨 Visual do Checkout</p>
                            <div className="space-y-1">
                                <Label>Cor Principal</Label>
                                <div className="flex items-center gap-3">
                                    <input type="color" value={primaryColor}
                                        onChange={(e) => setValue("primary_color", e.target.value)}
                                        className="h-10 w-10 rounded-md border border-border cursor-pointer bg-transparent"
                                    />
                                    <Input {...register("primary_color")} placeholder="#10B981" className="font-mono" maxLength={7} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>Logotipo</Label>
                                {product.logo_url && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <img src={product.logo_url} alt="logo atual" className="h-8 w-8 object-contain rounded border" />
                                        <span className="text-xs text-muted-foreground">Logo atual</span>
                                    </div>
                                )}
                                <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Imagem da Capa</Label>
                                {product.product_image_url && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <img src={product.product_image_url} alt="imagem atual" className="h-8 w-8 object-contain rounded border" />
                                        <span className="text-xs text-muted-foreground">Imagem atual</span>
                                    </div>
                                )}
                                <Input type="file" accept="image/*" onChange={(e) => setProductImageFile(e.target.files?.[0] || null)} />
                            </div>
                        </div>

                        {/* Email Settings */}
                        <div className="rounded-lg border border-border p-4 space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">✉️ Identidade do E-mail</p>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Nome do Remetente <span className="text-xs font-normal text-muted-foreground">(Caixa de entrada)</span></Label>
                                    <Input placeholder="Qualquer Nome (Ex: Sua Marca)" {...register("email_sender_name")} />
                                </div>
                                <div className="space-y-1">
                                    <Label>E-mail do Remetente</Label>
                                    <Input type="email" placeholder="contato@suabrand.com" {...register("email_sender_email")} />
                                    {errors.email_sender_email && <p className="text-xs text-destructive">{errors.email_sender_email.message}</p>}
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp toggle */}
                        {type === "digital" && (
                            <div className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div>
                                    <p className="text-sm font-medium">Exigir WhatsApp</p>
                                    <p className="text-xs text-muted-foreground">Mostrar campo WhatsApp no checkout digital</p>
                                </div>
                                <Switch checked={requireWhatsapp} onCheckedChange={(v) => setValue("require_whatsapp", v)} />
                            </div>
                        )}

                        {/* Custom Redirect URL Toggle */}
                        <div className="space-y-3 rounded-lg border border-border p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Configurar botão "Acessar Meu Produto"?</p>
                                    <p className="text-xs text-muted-foreground">Adiciona um link (URL) para o cliente no botão central da página de Sucesso.</p>
                                </div>
                                <Switch
                                    checked={isRedirectEnabled}
                                    onCheckedChange={setIsRedirectEnabled}
                                />
                            </div>

                            {isRedirectEnabled && (
                                <div className="space-y-1 animate-fade-in mt-3 pt-3 border-t border-border">
                                    <Label>Link do Produto (URL de Sucesso / Área de Membros)</Label>
                                    <Input
                                        placeholder="https://sua-area-de-membros.com/acesso"
                                        type="url"
                                        {...register("success_url")}
                                    />
                                    {errors.success_url && <p className="text-xs text-destructive">{errors.success_url.message}</p>}
                                </div>
                            )}
                        </div>

                        {/* ─── Order Bumps Section ───────────────────────────── */}
                        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                        <Tag className="h-4 w-4" />
                                        Order Bumps
                                        {bumps.length > 0 && (
                                            <Badge className="bg-amber-500 text-white text-[10px] px-1.5">
                                                {bumps.length}
                                            </Badge>
                                        )}
                                        {bumpsDirty && (
                                            <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600 px-1.5">
                                                ● não salvo
                                            </Badge>
                                        )}
                                    </h3>
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                                        Sincronizados com o banco Neon — limpa e re-insere ao salvar
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-amber-600 hover:bg-amber-100"
                                    onClick={fetchBumps}
                                    disabled={bumpsLoading}
                                    title="Recarregar bumps do banco"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${bumpsLoading ? "animate-spin" : ""}`} />
                                </Button>
                            </div>

                            {/* Loading state */}
                            {bumpsLoading && (
                                <div className="flex items-center justify-center gap-2 py-6 text-amber-600">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="text-sm">Buscando Order Bumps no Neon...</span>
                                </div>
                            )}

                            {/* Error state */}
                            {!bumpsLoading && bumpsError && (
                                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {bumpsError}
                                    <Button type="button" variant="ghost" size="sm" onClick={fetchBumps} className="ml-auto h-6 text-xs">
                                        Tentar novamente
                                    </Button>
                                </div>
                            )}

                            {/* Bump rows */}
                            {!bumpsLoading && !bumpsError && (
                                <div className="space-y-3">
                                    {bumps.length === 0 ? (
                                        <div className="text-center py-4 border border-dashed border-amber-300 rounded-lg">
                                            <Tag className="h-6 w-6 text-amber-300 mx-auto mb-1" />
                                            <p className="text-xs text-amber-600">
                                                Nenhum Order Bump vinculado a este produto no Neon.
                                            </p>
                                            <p className="text-[10px] text-amber-500 mt-0.5">
                                                Clique em "Adicionar Bump" para configurar.
                                            </p>
                                        </div>
                                    ) : (
                                        bumps.map((bump, i) => (
                                            <div
                                                key={i}
                                                className={`transition-all duration-300 ${removingBumpIndex === i
                                                    ? 'opacity-0 scale-95 pointer-events-none'
                                                    : 'opacity-100 scale-100'
                                                    }`}
                                            >
                                                <BumpRow
                                                    bump={bump}
                                                    index={i}
                                                    allProducts={bumpCandidates}
                                                    onUpdate={(patch) => updateBump(i, patch)}
                                                    onRemove={() => removeBump(i)}
                                                />
                                            </div>
                                        ))
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addBump}
                                        className="w-full gap-2 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                                    >
                                        <Plus className="h-4 w-4" /> Adicionar Bump
                                    </Button>
                                </div>
                            )}

                            {/* Sync info footer */}
                            <div className="rounded-lg bg-amber-100/60 dark:bg-amber-900/30 p-2.5 flex items-start gap-2 text-[10px] text-amber-700 dark:text-amber-400">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>
                                    Ao salvar, o sistema <strong>limpa todas as relações antigas</strong> e re-insere
                                    apenas as listadas acima na tabela <code className="font-mono">product_order_bumps</code> do Neon.
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="pt-2 gap-2">
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting || bumpsLoading} className="gap-2">
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isSubmitting ? "Salvando no Neon..." : "Salvar Alterações"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
