import { useState, useEffect } from "react";
import { useFunnels, type Funnel, type FunnelOrderBump, type FunnelUpsell, type FunnelDownsell } from "@/hooks/useFunnels";
import { useProducts, type DBProduct } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart, PlusCircle, Zap, TrendingDown, ExternalLink,
  ArrowRight, ChevronDown, ChevronRight, Trash2, Edit, RefreshCw,
  CheckCircle, Tag, Globe, Package, Loader2, Plus, X, BarChart2,
  RepeatIcon, Save, Pencil, AlertCircle, Eye, ArrowLeft
} from "lucide-react";

// ─── Flow node ────────────────────────────────────────────────────────────────
function FlowStep({ icon, label, active, last }: { icon: React.ReactNode; label: string; active: boolean; last?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${active ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-muted text-muted-foreground'}`}>
        <span className="h-3.5 w-3.5">{icon}</span>
        {label}
      </div>
      {!last && <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/50'}`} />}
    </div>
  );
}

// ─── Product selector ─────────────────────────────────────────────────────────
function ProductSelect({ products, value, onChange, placeholder }: { products: DBProduct[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <option value="">{placeholder ?? '— Selecionar produto —'}</option>
      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.currency} {p.price})</option>)}
    </select>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function Section({ title, icon, badge, badgeColor, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; badge?: string; badgeColor?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={`transition-all duration-200 ${badge && badgeColor ? 'border-primary/30' : ''}`}>
      <CardHeader className="pb-0">
        <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-2 w-full text-left">
          <CardTitle className="text-sm flex items-center gap-2 flex-1">
            <span className="text-primary">{icon}</span>
            {title}
          </CardTitle>
          {badge && (
            <Badge variant="outline" className="text-[10px]" style={badgeColor ? { borderColor: badgeColor, color: badgeColor } : {}}>
              {badge}
            </Badge>
          )}
          <span>{open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}</span>
        </button>
      </CardHeader>
      {open && <CardContent className="pt-4 space-y-3">{children}</CardContent>}
    </Card>
  );
}

// ─── Multi-Bump Editor ────────────────────────────────────────────────────────
function BumpEditor({ bumps, products, onChange }: {
  bumps: FunnelOrderBump[]; products: DBProduct[]; onChange: (bumps: FunnelOrderBump[]) => void;
}) {
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

  const addBump = () => onChange([...bumps, {
    product_id: '', title: 'Oferta Especial', description: '',
    discount_type: 'percentage', discount_value: 10, enabled: true, display_order: bumps.length
  }]);

  const removeBump = (i: number) => {
    // Mostrar confirmação antes de remover
    if (!confirm(`⚠️ Remover este Order Bump? Esta ação irá deletar o vínculo no banco Neon ao salvar.`)) return;
    // Atualização visual imediata
    setRemovingIndex(i);
    setTimeout(() => {
      onChange(bumps.filter((_, idx) => idx !== i));
      setRemovingIndex(null);
    }, 300);
  };

  const updateBump = (i: number, patch: Partial<FunnelOrderBump>) =>
    onChange(bumps.map((b, idx) => idx === i ? { ...b, ...patch } : b));

  return (
    <div className="space-y-3">
      {bumps.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
          Nenhum Order Bump. Clique em "Adicionar Bump" abaixo.
        </p>
      )}
      {bumps.map((bump, i) => (
        <div
          key={i}
          className={`border border-border rounded-xl p-4 space-y-3 transition-all duration-300 ${removingIndex === i
            ? 'opacity-0 scale-95 bg-destructive/10 border-destructive/30'
            : 'bg-muted/20 opacity-100 scale-100'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-amber-500" /> Bump #{i + 1}
            </span>
            <div className="flex items-center gap-2">
              <Switch checked={bump.enabled !== false} onCheckedChange={v => updateBump(i, { enabled: v })} />
              <button
                onClick={() => removeBump(i)}
                title="Remover este bump"
                className="text-destructive hover:text-red-700 transition-colors p-1 rounded hover:bg-destructive/10 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                <span className="text-[10px] font-semibold hidden sm:inline">Remover</span>
              </button>
            </div>
          </div>
          <ProductSelect products={products} value={bump.product_id ?? ''} onChange={v => updateBump(i, { product_id: v })} />
          <Input placeholder="Título (Ex: Adicione e economize!)" value={bump.title ?? ''} onChange={e => updateBump(i, { title: e.target.value })} />
          <Input placeholder="Descrição curta do bundle..." value={bump.description ?? ''} onChange={e => updateBump(i, { description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo Desconto</Label>
              <select value={bump.discount_type ?? 'percentage'}
                onChange={e => updateBump(i, { discount_type: e.target.value as 'percentage' | 'fixed' })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor Fixo</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desconto</Label>
              <Input type="number" min={0} value={bump.discount_value ?? 0}
                onChange={e => updateBump(i, { discount_value: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addBump} className="w-full gap-2 border-dashed">
        <Plus className="h-4 w-4" /> Adicionar Bump
      </Button>
    </div>
  );
}

// ─── Upsell Editor ────────────────────────────────────────────────────────────
function UpsellEditor({ upsells, products, onChange }: {
  upsells: FunnelUpsell[]; products: DBProduct[]; onChange: (upsells: FunnelUpsell[]) => void;
}) {
  const add = () => onChange([...upsells, {
    product_id: '', is_recurring: false, billing_cycle: null,
    price_override: null, upsell_page_url: '', trial_days: 0, display_order: upsells.length
  }]);
  const remove = (i: number) => onChange(upsells.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<FunnelUpsell>) =>
    onChange(upsells.map((u, idx) => idx === i ? { ...u, ...patch } : u));

  return (
    <div className="space-y-3">
      {upsells.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">Nenhum Upsell configurado.</p>
      )}
      {upsells.map((u, i) => (
        <div key={i} className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-purple-500" /> Upsell Nível {i + 1}
            </span>
            <button onClick={() => remove(i)} className="text-destructive hover:text-red-700 p-1 rounded hover:bg-destructive/10">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ProductSelect products={products} value={u.product_id ?? ''} onChange={v => update(i, { product_id: v })} />
          <div className="space-y-1">
            <Label className="text-xs">URL da Página de Upsell</Label>
            <Input placeholder="https://seusite.com/upsell-oferta"
              value={u.upsell_page_url ?? ''} onChange={e => update(i, { upsell_page_url: e.target.value })} />
            <p className="text-[10px] text-muted-foreground">Deixe vazio para usar o modal nativo</p>
          </div>
          <Input type="number" min={0} placeholder="Preço customizado (em branco = preço do produto)"
            value={u.price_override ?? ''} onChange={e => update(i, { price_override: e.target.value ? parseFloat(e.target.value) : null })} />
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-sm flex items-center gap-1.5"><RepeatIcon className="h-3.5 w-3.5" /> Recorrente (Assinatura)</Label>
              <p className="text-xs text-muted-foreground">Cobrança periódica via gateway</p>
            </div>
            <Switch checked={u.is_recurring ?? false} onCheckedChange={v => update(i, { is_recurring: v })} />
          </div>
          {u.is_recurring && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Frequência de Cobrança</Label>
                <select value={u.billing_cycle ?? 'monthly'} onChange={e => update(i, { billing_cycle: e.target.value as 'weekly' | 'monthly' | 'yearly' })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dias de Trial (Opcional)</Label>
                <Input type="number" min={0} placeholder="Ex: 7"
                  value={u.trial_days ?? ''} onChange={e => update(i, { trial_days: e.target.value ? parseInt(e.target.value, 10) : 0 })} />
              </div>
            </>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full gap-2 border-dashed">
        <Plus className="h-4 w-4" /> Adicionar Nível de Upsell
      </Button>
    </div>
  );
}

// ─── Downsell Editor ──────────────────────────────────────────────────────────
function DownsellEditor({ downsells, products, onChange }: {
  downsells: FunnelDownsell[]; products: DBProduct[]; onChange: (downsells: FunnelDownsell[]) => void;
}) {
  const add = () => onChange([...downsells, { product_id: '', discount: 20, downsell_page_url: '', display_order: downsells.length }]);
  const remove = (i: number) => onChange(downsells.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<FunnelDownsell>) =>
    onChange(downsells.map((d, idx) => idx === i ? { ...d, ...patch } : d));

  return (
    <div className="space-y-3">
      {downsells.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">Nenhum Downsell configurado.</p>
      )}
      {downsells.map((d, i) => (
        <div key={i} className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3 text-red-500" /> Downsell Nível {i + 1}
            </span>
            <button onClick={() => remove(i)} className="text-destructive hover:text-red-700 p-1 rounded hover:bg-destructive/10">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ProductSelect products={products} value={d.product_id ?? ''} onChange={v => update(i, { product_id: v })} />
          <div className="space-y-1">
            <Label className="text-xs">URL da Página de Downsell</Label>
            <Input placeholder="https://seusite.com/downsell-oferta"
              value={d.downsell_page_url ?? ''} onChange={e => update(i, { downsell_page_url: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Desconto (%)</Label>
            <Input type="number" min={0} max={100} value={d.discount ?? 0}
              onChange={e => update(i, { discount: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full gap-2 border-dashed">
        <Plus className="h-4 w-4" /> Adicionar Nível de Downsell
      </Button>
    </div>
  );
}

// ─── Funnel Card ──────────────────────────────────────────────────────────────
function FunnelCard({ funnel, onEdit, onDelete }: { funnel: Funnel; onEdit: (f: Funnel) => void; onDelete: (id: string) => void }) {
  const bumpCount = funnel.order_bumps?.length ?? (funnel.order_bump?.product_id ? 1 : 0);
  const upsellCount = funnel.upsells?.length ?? (funnel.upsell?.product_id ? 1 : 0);
  const downsellCount = funnel.downsells?.length ?? (funnel.downsell?.product_id ? 1 : 0);
  const steps = [
    { label: "Produto", active: !!funnel.main_product_id, icon: "📦" },
    { label: `${bumpCount} Bump(s)`, active: bumpCount > 0, icon: "🏷️" },
    { label: `${upsellCount} Upsell(s)`, active: upsellCount > 0, icon: "⚡" },
    { label: `${downsellCount} Downsell(s)`, active: downsellCount > 0, icon: "📉" },
    { label: "Redirect", active: !!funnel.redirect_url, icon: "🌐" },
  ];
  const activeCount = steps.filter(s => s.active).length;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:border-primary/30 animate-fade-in group">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm truncate">{funnel.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Package className="h-3 w-3" /> {funnel.main_product_name ?? 'Sem produto'}
            </p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors"
              onClick={() => onEdit(funnel)}
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => { if (confirm(`Excluir o funil "${funnel.name}"?`)) onDelete(funnel.id); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{activeCount} de {steps.length} etapas ativas</span>
            <span className="text-primary font-semibold">{Math.round((activeCount / steps.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${(activeCount / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step badges */}
        <div className="flex flex-wrap gap-1.5">
          {steps.map(s => (
            <span key={s.label}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${s.active ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground'}`}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>

        {/* Highlights */}
        <div className="flex gap-2 flex-wrap">
          {bumpCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-amber-700 font-semibold">
              <Tag className="h-3 w-3" /> {bumpCount} Order Bump{bumpCount > 1 ? 's' : ''}
            </div>
          )}
          {upsellCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 text-purple-700 font-semibold">
              <Zap className="h-3 w-3" /> {upsellCount} Upsell{upsellCount > 1 ? 's' : ''}
            </div>
          )}
          {downsellCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] bg-red-50 border border-red-200 rounded-lg px-2 py-1 text-red-700 font-semibold">
              <TrendingDown className="h-3 w-3" /> {downsellCount} Downsell{downsellCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-2">
          <span>ID: {funnel.id.slice(0, 8)}…</span>
          {funnel.redirect_url && (
            <a href={funnel.redirect_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Globe className="h-3 w-3" /> Redirect ativo
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Builder Form ─────────────────────────────────────────────────────────────
interface BuilderForm {
  name: string;
  main_product_id: string;
  redirect_url: string;
  order_bumps: FunnelOrderBump[];
  upsells: FunnelUpsell[];
  downsells: FunnelDownsell[];
}

const emptyForm = (): BuilderForm => ({
  name: '', main_product_id: '', redirect_url: '',
  order_bumps: [], upsells: [], downsells: [],
});

function funnelToForm(f: Funnel): BuilderForm {
  return {
    name: f.name ?? '',
    main_product_id: f.main_product_id ?? '',
    redirect_url: f.redirect_url ?? '',
    order_bumps: f.order_bumps?.length ? f.order_bumps : f.order_bump?.product_id ? [{ ...f.order_bump, enabled: true }] : [],
    upsells: f.upsells?.length ? f.upsells : f.upsell?.product_id ? [f.upsell] : [],
    downsells: f.downsells?.length ? f.downsells : f.downsell?.product_id ? [f.downsell] : [],
  };
}

function FunnelBuilder({ products, initial, onSave, onCancel, isSaving }: {
  products: DBProduct[];
  initial?: Funnel;
  onSave: (data: BuilderForm) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const isEditing = !!initial;
  const [form, setForm] = useState<BuilderForm>(initial ? funnelToForm(initial) : emptyForm());
  const [hasChanges, setHasChanges] = useState(false);

  const set = <K extends keyof BuilderForm>(key: K, value: BuilderForm[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setHasChanges(true);
  };

  const stepCount = [
    form.main_product_id,
    form.order_bumps.some(b => b.product_id),
    form.upsells.some(u => u.product_id),
    form.downsells.some(d => d.product_id),
    form.redirect_url,
  ].filter(Boolean).length;

  const mainProduct = products.find(p => p.id === form.main_product_id);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ─── Edit Mode Header ─────────────────────────────────────────────── */}
      <div className={`rounded-xl border-2 p-4 ${isEditing ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20' : 'border-primary/30 bg-primary/5'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isEditing ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
              {isEditing ? <Pencil className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base">
                  {isEditing ? `Editando: ${initial?.name}` : 'Novo Funil de Vendas'}
                </h2>
                {isEditing && (
                  <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5 animate-pulse">
                    EDITANDO
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? `ID: ${initial?.id.slice(0, 16)}… — alterações salvas diretamente no Neon`
                  : 'Configure o fluxo completo e salve no banco Neon'}
              </p>
            </div>
          </div>
          {isEditing && hasChanges && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200">
              <AlertCircle className="h-3.5 w-3.5" />
              Alterações não salvas
            </div>
          )}
        </div>

        {/* Current funnel summary when editing */}
        {isEditing && (
          <div className="mt-3 pt-3 border-t border-amber-200/60 grid grid-cols-3 gap-2 text-[11px]">
            <div className="text-center">
              <p className="font-bold text-amber-800">{(initial?.order_bumps?.length ?? 0)}</p>
              <p className="text-amber-600">Bumps anteriores</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-amber-800">{(initial?.upsells?.length ?? 0)}</p>
              <p className="text-amber-600">Upsells anteriores</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-amber-800">{(initial?.downsells?.length ?? 0)}</p>
              <p className="text-amber-600">Downsells anteriores</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Flow Indicator ───────────────────────────────────────────────── */}
      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Fluxo do Funil</p>
        <div className="flex flex-wrap items-center gap-1">
          <FlowStep icon={<Package className="h-3 w-3" />} label="Produto" active={!!form.main_product_id} />
          <FlowStep icon={<Tag className="h-3 w-3" />} label={`${form.order_bumps.length} Bump(s)`} active={form.order_bumps.some(b => b.product_id)} />
          <FlowStep icon={<Zap className="h-3 w-3" />} label={`${form.upsells.length} Upsell(s)`} active={form.upsells.some(u => u.product_id)} />
          <FlowStep icon={<TrendingDown className="h-3 w-3" />} label={`${form.downsells.length} Downsell(s)`} active={form.downsells.some(d => d.product_id)} />
          <FlowStep icon={<Globe className="h-3 w-3" />} label="Redirect" active={!!form.redirect_url} last />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-primary font-medium">{stepCount} de 5 etapas ativas</p>
          {mainProduct && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> {mainProduct.name} · {mainProduct.currency} {mainProduct.price}
            </p>
          )}
        </div>
      </div>

      {/* ─── 1. Configurações Gerais ──────────────────────────────────────── */}
      <Section title="Configurações do Funil" icon={<ShoppingCart className="h-4 w-4" />} defaultOpen>
        <div className="space-y-1">
          <Label>Nome do Funil *</Label>
          <Input placeholder="Ex: Funil Premium Maio" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Produto Principal *</Label>
          <ProductSelect products={products} value={form.main_product_id} onChange={v => set('main_product_id', v)} placeholder="— Selecionar produto principal —" />
        </div>
      </Section>

      {/* ─── 2. Order Bumps ───────────────────────────────────────────────── */}
      <Section
        title="Order Bumps"
        icon={<Tag className="h-4 w-4" />}
        badge={form.order_bumps.length > 0 ? `${form.order_bumps.length} bump(s)` : 'NENHUM'}
        badgeColor={form.order_bumps.length > 0 ? '#f59e0b' : undefined}
        defaultOpen={form.order_bumps.length > 0}
      >
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 flex items-start gap-2">
          <BarChart2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <span>Múltiplos bumps aparecem no checkout como checkboxes. Cada clique é registrado no Neon para analytics.</span>
        </div>
        <BumpEditor bumps={form.order_bumps} products={products} onChange={v => set('order_bumps', v)} />
      </Section>

      {/* ─── 3. Upsells ───────────────────────────────────────────────────── */}
      <Section
        title="Upsell One Click (Multi-Nível)"
        icon={<Zap className="h-4 w-4" />}
        badge={form.upsells.length > 0 ? `${form.upsells.length} nível(is)` : 'INATIVO'}
        badgeColor={form.upsells.length > 0 ? '#8b5cf6' : undefined}
        defaultOpen={form.upsells.length > 0}
      >
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 flex items-start gap-2">
          <RepeatIcon className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <span>Após o pagamento, o cliente é redirecionado para a URL de Upsell. Configure múltiplos níveis para funis encadeados.</span>
        </div>
        <UpsellEditor upsells={form.upsells} products={products} onChange={v => set('upsells', v)} />
      </Section>

      {/* ─── 4. Downsells ─────────────────────────────────────────────────── */}
      <Section
        title="Downsell"
        icon={<TrendingDown className="h-4 w-4" />}
        badge={form.downsells.length > 0 ? `${form.downsells.length} nível(is)` : 'INATIVO'}
        badgeColor={form.downsells.length > 0 ? '#ef4444' : undefined}
        defaultOpen={form.downsells.length > 0}
      >
        <DownsellEditor downsells={form.downsells} products={products} onChange={v => set('downsells', v)} />
      </Section>

      {/* ─── 5. Redirect ──────────────────────────────────────────────────── */}
      <Section title="Página de Agradecimento (Redirect)" icon={<Globe className="h-4 w-4" />} defaultOpen={!!form.redirect_url}>
        <Input placeholder="https://seusite.com/obrigado" value={form.redirect_url}
          onChange={e => set('redirect_url', e.target.value)} />
        {form.redirect_url && (
          <a href={form.redirect_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
            <ExternalLink className="h-3 w-3" /> Testar link
          </a>
        )}
      </Section>

      {/* ─── Action Buttons ───────────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border pt-4 pb-2 -mx-1 px-1">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 gap-2">
            <ArrowLeft className="h-4 w-4" /> Cancelar
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={isSaving || !form.name || !form.main_product_id}
            className={`flex-[2] gap-2 ${isEditing ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
          >
            {isSaving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando no Neon...</>
              : isEditing
                ? <><Save className="h-4 w-4" /> Salvar Alterações</>
                : <><CheckCircle className="h-4 w-4" /> Criar Funil</>
            }
          </Button>
        </div>
        {!form.name && <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Nome do funil é obrigatório</p>}
        {!form.main_product_id && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Selecione um produto principal</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CheckoutsPage() {
  const { funnels, isLoading, error, fetchFunnels, createFunnel, updateFunnel, deleteFunnel } = useFunnels();
  const { products, isLoading: loadingProducts } = useProducts();
  const { toast } = useToast();

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);

  const handleSave = async (data: BuilderForm) => {
    setIsSaving(true);
    try {
      if (editingFunnel) {
        await updateFunnel(editingFunnel.id, data as unknown as Partial<Funnel>);
        toast({
          title: "✅ Configurações de funil atualizadas!",
          description: `"${data.name}" — ${data.order_bumps.length} bump(s), ${data.upsells.length} upsell(s) sincronizados com sucesso no banco de dados Neon.`,
        });
      } else {
        await createFunnel(data as unknown as Omit<Funnel, 'id' | 'created_at' | 'updated_at'>);
        toast({
          title: "🚀 Funil criado!",
          description: `"${data.name}" salvo no Neon com ${data.order_bumps.length} bump(s) e ${data.upsells.length} upsell(s).`,
        });
      }
      setShowBuilder(false);
      setEditingFunnel(null);
      fetchFunnels();
    } catch (err: unknown) {
      toast({
        title: "❌ Erro ao salvar",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (f: Funnel) => {
    setEditingFunnel(f);
    setShowBuilder(true);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowBuilder(false);
    setEditingFunnel(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFunnel(id);
      toast({ title: "Funil excluído." });
    } catch {
      toast({ title: "Erro ao excluir", variant: 'destructive' });
    }
  };

  const handleNewFunnel = () => {
    setEditingFunnel(null);
    setShowBuilder(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Page Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Funis de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-Bumps · Upsell/Downsell com Recorrência · Analytics de Cliques
          </p>
        </div>

        <div className="flex gap-2">
          {showBuilder ? (
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar à Lista
            </Button>
          ) : (
            <>
              <Button variant="outline" size="icon" onClick={fetchFunnels} disabled={isLoading} title="Atualizar lista">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button className="gap-2" onClick={handleNewFunnel}>
                <PlusCircle className="h-4 w-4" /> Novo Funil
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── Breadcrumb when editing ────────────────────────────────────── */}
      {showBuilder && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={handleCancel} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ShoppingCart className="h-3.5 w-3.5" /> Funis
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={editingFunnel ? 'text-amber-600 font-semibold' : 'text-foreground font-semibold'}>
            {editingFunnel ? `✏️ Editando "${editingFunnel.name}"` : '+ Novo Funil'}
          </span>
        </div>
      )}

      {/* ─── Builder or List ─────────────────────────────────────────────── */}
      {showBuilder ? (
        <FunnelBuilder
          products={products}
          initial={editingFunnel ?? undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Loading skeletons */}
          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-52 bg-muted rounded-xl animate-pulse" />)}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && funnels.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <ArrowRight className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="font-semibold text-muted-foreground">Nenhum funil criado ainda</p>
              <p className="text-xs text-muted-foreground/70 mt-1 mb-4">Crie seu primeiro funil para maximizar conversões</p>
              <Button onClick={handleNewFunnel} className="gap-2">
                <PlusCircle className="h-4 w-4" /> Criar Primeiro Funil
              </Button>
            </div>
          )}

          {/* Funnels grid */}
          {!isLoading && funnels.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{funnels.length} funil(is) configurado(s)</span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-primary" /> Sincronizados com Neon
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {funnels.map(f => (
                  <FunnelCard key={f.id} funnel={f} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
