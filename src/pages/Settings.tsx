import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Bell, Globe, Shield, User, CreditCard,
  Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Lock, Webhook, Monitor, ImagePlus
} from "lucide-react";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";

// ─── Paystack Settings Section ─────────────────────────────────────────────────
function PaystackSettings() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    secret_key: "",
    public_key: "",
    webhook_secret: "",
    is_live: true,
  });
  const [saved, setSaved] = useState<{ secret_key?: string; public_key?: string; webhook_secret?: string; is_live?: boolean; updated_at?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);

  useEffect(() => {
    fetch("/api/paystack/settings", { cache: "no-store" })
      .then(r => r.json())
      .then(j => { if (j.data) setSaved(j.data); })
      .catch(() => { })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/paystack/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar");
      setSaved(json.data);
      setForm(f => ({ ...f, secret_key: "", public_key: "", webhook_secret: "" }));
      toast({
        title: "✅ Chaves Paystack salvas!",
        description: "Configurações de pagamento atualizadas no Neon com sucesso.",
      });
    } catch (err: unknown) {
      toast({
        title: "❌ Erro ao salvar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg shadow-primary/5">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          Configurações de Pagamento — Paystack
          <Badge className={`ml-auto text-xs ${saved?.is_live ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"}`} variant="outline">
            {saved?.is_live ? "🟢 Produção (Live)" : "🟡 Sandbox"}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Configure uma única vez para toda a plataforma. As chaves são armazenadas de forma segura no banco Neon.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">

        {/* Status atual */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando configurações do Neon...
          </div>
        ) : saved?.secret_key ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 dark:bg-green-950/30 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Gateway configurado e ativo</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div><span className="font-medium">Secret Key:</span> {saved.secret_key}</div>
              {saved.public_key && <div><span className="font-medium">Public Key:</span> {saved.public_key.slice(0, 8)}…{saved.public_key.slice(-4)}</div>}
              {saved.webhook_secret && <div><span className="font-medium">Webhook Secret:</span> {saved.webhook_secret}</div>}
              <div><span className="font-medium">Última atualização:</span> {saved.updated_at ? new Date(saved.updated_at).toLocaleString('pt-BR') : '—'}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 dark:bg-amber-950/30 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Nenhuma chave configurada ainda.</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
              Adicione as chaves abaixo para ativar os pagamentos.
            </p>
          </div>
        )}

        <Separator />

        {/* Formulário */}
        <div className="space-y-1">
          <Label className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-primary" /> Secret Key (sk_live_…)
          </Label>
          <div className="relative">
            <Input
              id="paystack-secret"
              type={showSecret ? "text" : "password"}
              placeholder={saved?.secret_key ? `Atual: ${saved.secret_key} — Deixe em branco para manter` : "sk_live_xxxxxxxxxxxxxxxxxx"}
              value={form.secret_key}
              onChange={e => setForm(f => ({ ...f, secret_key: e.target.value }))}
              className="pr-10"
            />
            <button onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Public Key (pk_live_…)</Label>
          <Input
            id="paystack-public"
            placeholder={saved?.public_key ? `Atual: ${saved.public_key.slice(0, 10)}… — Deixe em branco para manter` : "pk_live_xxxxxxxxxxxxxxxxxx"}
            value={form.public_key}
            onChange={e => setForm(f => ({ ...f, public_key: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <Label className="flex items-center gap-1.5">
            <Webhook className="h-3.5 w-3.5 text-primary" /> Webhook Secret
          </Label>
          <div className="relative">
            <Input
              id="paystack-webhook"
              type={showWebhook ? "text" : "password"}
              placeholder={saved?.webhook_secret ? `Atual: ${saved.webhook_secret} — Deixe em branco para manter` : "Opcional — use para validar webhooks"}
              value={form.webhook_secret}
              onChange={e => setForm(f => ({ ...f, webhook_secret: e.target.value }))}
              className="pr-10"
            />
            <button onClick={() => setShowWebhook(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <Label className="text-sm font-medium">Modo de Produção (Live)</Label>
            <p className="text-xs text-muted-foreground">Desative para usar ambiente de testes (Sandbox)</p>
          </div>
          <Switch checked={form.is_live} onCheckedChange={v => setForm(f => ({ ...f, is_live: v }))} />
        </div>

        {/* Webhook URL info */}
        <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL do Webhook (configurar no Paystack Dashboard)</p>
          <code className="text-xs text-primary break-all">{window.location.origin}/api/webhooks/paystack</code>
          <p className="text-[10px] text-muted-foreground">Cole este endereço em: Paystack Dashboard → Settings → Webhooks</p>
        </div>

        {/* Multi-currency info */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 p-3">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">🌍 Multi-Moeda Automático</p>
          <p className="text-[11px] text-blue-600 dark:text-blue-500">
            O sistema detecta automaticamente a moeda de cada produto (ZAR, NGN, GHS, KES, USD) e envia para a Paystack sem nenhuma configuração extra.
            A Paystack converte o saldo para ZAR no painel sul-africano automaticamente.
          </p>
        </div>

        <Button
          className="w-full gap-2 h-11 font-semibold"
          onClick={handleSave}
          disabled={isSaving || (!form.secret_key && !form.public_key && !form.webhook_secret)}
        >
          {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando no Neon...</> : <><CheckCircle className="h-4 w-4" /> Salvar Chaves Paystack</>}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Platform Favicon Settings ────────────────────────────────────────────────
function FaviconSettings() {
  const { toast } = useToast();
  const { refreshSettings } = usePlatform();
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetch('/api/platform/settings')
      .then(r => r.json())
      .then(res => {
        if (res?.data?.favicon_url) {
          setFaviconUrl(res.data.favicon_url);
        }
      })
      .catch(() => { });
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const fd = new FormData();
    fd.append("favicon", file);

    try {
      const res = await fetch("/api/platform/favicon", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar favicon");
      setFaviconUrl(json.data.favicon_url);
      setFile(null);
      // reload favicon manually
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) link.href = json.data.favicon_url;
      refreshSettings(); // update context globally
      toast({ title: "Favicon atualizado com sucesso!" });
    } catch (e: unknown) {
      toast({ title: "Falha no Upload", description: e instanceof Error ? e.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          Favicon Global (NovaPay)
        </CardTitle>
        <p className="text-xs text-muted-foreground">O ícone que aparece na aba do navegador.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {faviconUrl && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <img src={faviconUrl} alt="favicon" className="h-8 w-8 object-contain rounded" />
            <p className="text-xs text-muted-foreground">Favicon atual salvo no banco</p>
          </div>
        )}
        <div className="space-y-2">
          <Label>Escolher nova imagem</Label>
          <Input type="file" accept="image/png, image/jpeg, image/x-icon, image/svg+xml" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <AnimatedButton
          gradient
          className="w-full gap-2"
          disabled={!file || isUploading}
          onAction={handleUpload}
        >
          {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : "Atualizar Favicon"}
        </AnimatedButton>
      </CardContent>
    </Card>
  );
}

// ─── Platform Logo Settings ────────────────────────────────────────────────
function LogoSettings() {
  const { toast } = useToast();
  const { settings, refreshSettings } = usePlatform();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const fd = new FormData();
    fd.append("logo", file);

    try {
      const res = await fetch("/api/platform/logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar logotipo");

      refreshSettings(); // update context globally
      setFile(null);

      toast({ title: "Logotipo atualizado com sucesso!" });
    } catch (e: unknown) {
      toast({ title: "Falha no Upload", description: e instanceof Error ? e.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-primary" />
          Logotipo Global (NovaPay)
        </CardTitle>
        <p className="text-xs text-muted-foreground">O logotipo principal exibido no painel de administrador e login.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings?.logo_url && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg overflow-hidden">
            <div className="bg-white p-2 rounded w-full flex justify-center border border-border">
              <img src={settings.logo_url} alt="Logotipo Atual" className="h-10 w-auto object-contain" />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Escolher nova imagem</Label>
          <Input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <AnimatedButton
          gradient
          className="w-full gap-2"
          disabled={!file || isUploading}
          onAction={handleUpload}
        >
          {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : "Atualizar Logotipo"}
        </AnimatedButton>
      </CardContent>
    </Card>
  );
}

// ─── Notification Settings ──────────────────────────────────────────────────
function NotificationSettings() {
  const { toast } = useToast();
  const [notifySale, setNotifySale] = useState(true);
  const [notifyAbandoned, setNotifyAbandoned] = useState(true);
  const [notifyDailyReport, setNotifyDailyReport] = useState(false);

  useEffect(() => {
    fetch('/api/platform/settings')
      .then(r => r.json())
      .then(res => {
        if (res?.data) {
          setNotifySale(res.data.notify_sale ?? true);
          setNotifyAbandoned(res.data.notify_abandoned ?? true);
          setNotifyDailyReport(res.data.notify_daily_report ?? false);
        }
      })
      .catch(() => { });
  }, []);

  const updateSetting = async (key: string, value: boolean) => {
    try {
      if (key === 'notify_sale') setNotifySale(value);
      if (key === 'notify_abandoned') setNotifyAbandoned(value);
      if (key === 'notify_daily_report') setNotifyDailyReport(value);

      const res = await fetch('/api/platform/settings', {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
      if (!res.ok) throw new Error("Erro ao salvar configuração.");

      toast({ title: "Configuração atualizada salva!" });
    } catch {
      toast({ title: "Erro", variant: "destructive", description: "Falha ao sincronizar com banco de dados." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Notificações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Email de Venda</Label>
            <p className="text-xs text-muted-foreground">Receber email a cada venda</p>
          </div>
          <Switch checked={notifySale} onCheckedChange={(v) => updateSetting('notify_sale', v)} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label>Carrinho Abandonado</Label>
            <p className="text-xs text-muted-foreground">Alertas de abandono</p>
          </div>
          <Switch checked={notifyAbandoned} onCheckedChange={(v) => updateSetting('notify_abandoned', v)} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label>Relatório Diário</Label>
            <p className="text-xs text-muted-foreground">Resumo diário por email</p>
          </div>
          <Switch checked={notifyDailyReport} onCheckedChange={(v) => updateSetting('notify_daily_report', v)} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── General Settings ────────────────────────────────────────────────────────
function GeneralSettings() {
  const { toast } = useToast();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [ipDetect, setIpDetect] = useState(true);
  const [platformFee, setPlatformFee] = useState<number>(0);

  useEffect(() => {
    fetch('/api/platform/settings')
      .then(r => r.json())
      .then(res => {
        if (res?.data) {
          setMaintenanceMode(res.data.maintenance_mode ?? false);
          setIpDetect(res.data.ip_country_detect ?? true);
          setPlatformFee(res.data.platform_fee ? Number(res.data.platform_fee) : 0);
        }
      })
      .catch(() => { });
  }, []);

  const updateSetting = async (key: string, value: number | boolean) => {
    try {
      if (key === 'maintenance_mode') setMaintenanceMode(value);
      if (key === 'ip_country_detect') setIpDetect(value);
      if (key === 'platform_fee') setPlatformFee(value);

      const res = await fetch('/api/platform/settings', {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
      if (!res.ok) throw new Error("Erro ao salvar configuração.");

      toast({ title: "Configuração atualizada salva!" });
    } catch {
      toast({ title: "Erro", variant: "destructive", description: "Falha ao sincronizar com banco de dados." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Geral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Modo Manutenção</Label>
            <p className="text-xs text-muted-foreground">Desativar checkout temporariamente</p>
          </div>
          <Switch checked={maintenanceMode} onCheckedChange={(v) => updateSetting('maintenance_mode', v)} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label>Detecção de País por IP</Label>
            <p className="text-xs text-muted-foreground">Auto-detectar moeda do visitante</p>
          </div>
          <Switch checked={ipDetect} onCheckedChange={(v) => updateSetting('ip_country_detect', v)} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label>Taxa da Plataforma (%)</Label>
            <p className="text-xs text-muted-foreground">Utilizada para calcular o ticket médio líquido no dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={platformFee}
              onChange={(e) => setPlatformFee(Number(e.target.value))}
              onBlur={() => updateSetting('platform_fee', platformFee)}
              className="w-24 text-right"
              min="0"
              max="100"
              step="0.1"
            />
            <span className="text-sm font-medium">%</span>
          </div>
        </div>
        <Separator />
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ambiente Atual</Label>
          <div className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Backend API: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">http://localhost:3001</code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Security Settings ────────────────────────────────────────────────────────
function SecuritySettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Atenção", description: "Preencha ambas as senhas.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: user?.id, currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao mudar senha");
      toast({ title: "Sucesso!", description: data.message });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      toast({ title: "Erro na Segurança", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
      throw err;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Segurança
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Senha Atual</Label>
          <Input type="password" placeholder="••••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Nova Senha</Label>
          <Input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </div>
        <AnimatedButton
          variant="outline"
          className="w-full"
          onAction={handleChangePassword}
        >
          Alterar Senha
        </AnimatedButton>
      </CardContent>
    </Card>
  );
}

// ─── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações gerais da plataforma NovaPay</p>
      </div>

      {/* Paystack — first and most important */}
      <PaystackSettings />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <LogoSettings />
          <FaviconSettings />
        </div>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Loja</Label>
              <Input defaultValue="NovaPay Store" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input defaultValue="admin@novapay.co" type="email" />
            </div>
            <div className="space-y-2">
              <Label>URL da Loja</Label>
              <Input defaultValue="novapay.co" />
            </div>
            <AnimatedButton
              gradient
              className="w-full"
              onAction={() => new Promise((r) => setTimeout(r, 1000))}
            >
              Salvar Perfil
            </AnimatedButton>
          </CardContent>
        </Card>

        {/* Notifications and Settings grouped */}
        <div className="space-y-6">
          <NotificationSettings />
          <GeneralSettings />
        </div>

        {/* Security Group */}
        <div className="space-y-6">
          <SecuritySettings />
        </div>
      </div>
    </div>
  );
}
