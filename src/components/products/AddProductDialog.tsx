import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2, Plus, Copy, CheckCheck, Package, Zap, ExternalLink,
} from "lucide-react";
import { type CreateProductInput, type DBProduct } from "@/hooks/useProducts";

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

interface AddProductDialogProps {
    onProductAdded: (input: CreateProductInput) => Promise<DBProduct>;
}

export default function AddProductDialog({ onProductAdded }: AddProductDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdProduct, setCreatedProduct] = useState<DBProduct | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [productImageFile, setProductImageFile] = useState<File | null>(null);
    const [copied, setCopied] = useState(false);
    const [isRedirectEnabled, setIsRedirectEnabled] = useState(false);
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            currency: "ZAR",
            status: "active",
            type: "physical",
            primary_color: "#10B981",
            require_whatsapp: false,
            checkout_language: "pt",
        },
    });

    const currency = watch("currency");
    const status = watch("status");
    const type = watch("type");
    const primaryColor = watch("primary_color");
    const requireWhatsapp = watch("require_whatsapp");
    const checkoutLanguage = watch("checkout_language");

    const checkoutUrl = createdProduct
        ? `${window.location.origin}/checkout/${createdProduct.id}`
        : null;

    const copyUrl = () => {
        if (!checkoutUrl) return;
        navigator.clipboard.writeText(checkoutUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const onSubmit = async (values: ProductFormValues) => {
        setIsSubmitting(true);
        try {
            const product = await onProductAdded({
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
            setCreatedProduct(product);
            toast({ title: "Produto criado!", description: `"${values.name}" foi salvo com sucesso.` });
        } catch (err: unknown) {
            toast({
                title: "Erro ao salvar produto",
                description: err instanceof Error ? err.message : "Erro desconhecido",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setCreatedProduct(null);
        setLogoFile(null);
        setProductImageFile(null);
        reset();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Novo Produto
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Adicionar Produto</DialogTitle>
                </DialogHeader>

                {/* Success state: show checkout URL */}
                {createdProduct && checkoutUrl && (
                    <div className="space-y-4 py-4">
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center space-y-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto">
                                {createdProduct.type === "digital" ? <Zap className="h-6 w-6 text-primary" /> : <Package className="h-6 w-6 text-primary" />}
                            </div>
                            <div>
                                <p className="font-semibold">{createdProduct.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Checkout {createdProduct.type === "digital" ? "Digital" : "Físico"} criado!
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

                {/* Creation form */}
                {!createdProduct && (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                        {/* Type selector */}
                        <div className="grid grid-cols-2 gap-2">
                            {(["physical", "digital"] as const).map((t) => (
                                <button
                                    type="button"
                                    key={t}
                                    onClick={() => setValue("type", t)}
                                    className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all ${type === t
                                        ? "border-primary bg-primary/5 text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/40"
                                        }`}
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

                            {/* Primary color */}
                            <div className="space-y-1">
                                <Label>Cor Principal</Label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={(e) => setValue("primary_color", e.target.value)}
                                        className="h-10 w-10 rounded-md border border-border cursor-pointer bg-transparent"
                                    />
                                    <Input
                                        {...register("primary_color")}
                                        placeholder="#10B981"
                                        className="font-mono"
                                        maxLength={7}
                                    />
                                </div>
                            </div>

                            {/* Logo File */}
                            <div className="space-y-1">
                                <Label>Logotipo do Produto</Label>
                                <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                            </div>

                            {/* Product Image File */}
                            <div className="space-y-1">
                                <Label>Imagem da Capa do Produto</Label>
                                <Input type="file" accept="image/*" onChange={(e) => setProductImageFile(e.target.files?.[0] || null)} />
                            </div>
                        </div>

                        {/* Email Settings */}
                        <div className="rounded-lg border border-border p-4 space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">✉️ Identidade do E-mail</p>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Nome do Remetente <span className="text-xs font-normal text-muted-foreground">(Caixa de entrada)</span></Label>
                                    <Input placeholder="Qualquer Nome (Ex: Sua Loja)" {...register("email_sender_name")} />
                                </div>
                                <div className="space-y-1">
                                    <Label>E-mail do Remetente</Label>
                                    <Input type="email" placeholder="contato@suabrand.com" {...register("email_sender_email")} />
                                    {errors.email_sender_email && <p className="text-xs text-destructive">{errors.email_sender_email.message}</p>}
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp toggle (digital only) */}
                        {type === "digital" && (
                            <div className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div>
                                    <p className="text-sm font-medium">Exigir WhatsApp</p>
                                    <p className="text-xs text-muted-foreground">Mostrar campo de WhatsApp no checkout digital</p>
                                </div>
                                <Switch
                                    checked={requireWhatsapp}
                                    onCheckedChange={(v) => setValue("require_whatsapp", v)}
                                />
                            </div>
                        )}

                        {/* Custom Redirect URL Toggle */}
                        <div className="space-y-3 rounded-lg border border-border p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Redirecionar para URL personalizada após a compra?</p>
                                    <p className="text-xs text-muted-foreground">O cliente será enviado para este link ao invés da página padrão de sucesso.</p>
                                </div>
                                <Switch
                                    checked={isRedirectEnabled}
                                    onCheckedChange={setIsRedirectEnabled}
                                />
                            </div>

                            {isRedirectEnabled && (
                                <div className="space-y-1 animate-fade-in mt-3 pt-3 border-t border-border">
                                    <Label>URL de Sucesso / Área de Membros</Label>
                                    <Input
                                        placeholder="https://sua-area-de-membros.com/acesso"
                                        type="url"
                                        {...register("success_url")}
                                    />
                                    {errors.success_url && <p className="text-xs text-destructive">{errors.success_url.message}</p>}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="gap-2">
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isSubmitting ? "Salvando..." : "Criar Produto"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
