import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  CreditCard,
  Eye,
  EyeOff,
  Facebook,
  Link2,
  Mail,
  CheckCircle,
  Globe,
} from "lucide-react";

interface PaystackAccount {
  country: string;
  flag: string;
  currency: string;
  publicKey: string;
  secretKey: string;
  webhookUrl: string;
  active: boolean;
}

function PaystackSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [settings, setSettings] = useState({
    public_key: "",
    secret_key: "",
    test_public_key: "",
    test_secret_key: "",
    webhook_secret: "",
    is_live: true,
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/paystack/settings");
      const data = await res.json();
      if (data.data) {
        setSettings({
          public_key: data.data.public_key || "",
          secret_key: data.data.secret_key || "",
          test_public_key: data.data.test_public_key || "",
          test_secret_key: data.data.test_secret_key || "",
          webhook_secret: data.data.webhook_secret || "",
          is_live: data.data.is_live ?? true,
        });
      }
    } catch (err) {
      console.error("Error fetching Paystack settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchSettings();
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/paystack/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Configurações salvas com sucesso!");
        fetchSettings(); // Refresh to get masked values back
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch (err) {
      alert("Erro ao salvar configurações Paystack");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <Card>
      <CardContent className="p-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          💳 Paystack — Centralizado
          <Badge variant="outline" className="ml-auto text-xs">Pagamentos</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure as chaves da sua conta Paystack que serão usadas em todos os checkouts (vários países/moedas).
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Modo Live (Produção)</Label>
              <p className="text-xs text-muted-foreground">Desative para usar chaves de teste (test_...)</p>
            </div>
            <Switch
              checked={settings.is_live}
              onCheckedChange={(v) => setSettings(s => ({ ...s, is_live: v }))}
            />
          </div>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Live Public Key</Label>
              <Input
                placeholder="pk_live_..."
                value={settings.public_key}
                onChange={(e) => setSettings(s => ({ ...s, public_key: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Live Secret Key</Label>
              <div className="flex gap-1.5">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder="sk_live_..."
                  value={settings.secret_key}
                  onChange={(e) => setSettings(s => ({ ...s, secret_key: e.target.value }))}
                  className="text-xs flex-1"
                />
                <AnimatedButton
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </AnimatedButton>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Test Public Key</Label>
              <Input
                placeholder="pk_test_..."
                value={settings.test_public_key}
                onChange={(e) => setSettings(s => ({ ...s, test_public_key: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Test Secret Key</Label>
              <div className="flex gap-1.5">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder="sk_test_..."
                  value={settings.test_secret_key}
                  onChange={(e) => setSettings(s => ({ ...s, test_secret_key: e.target.value }))}
                  className="text-xs flex-1"
                />
                <AnimatedButton
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </AnimatedButton>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg bg-muted p-3">
            <Label className="text-xs flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> URL de Webhook para Paystack
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={`${window.location.origin}/api/webhooks/paystack`}
                readOnly
                className="text-[10px] font-mono bg-background h-8"
              />
              <AnimatedButton variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/paystack`);
              }}>Copiar</AnimatedButton>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Cole esta URL nas configurações de Webhook do seu Dashboard Paystack.
            </p>
          </div>
        </div>

        <AnimatedButton
          gradient
          className="w-full h-11"
          onAction={handleSave}
          disabled={saving}
          loadingText="Salvando..."
        >
          Salvar Configurações Paystack
        </AnimatedButton>
      </CardContent>
    </Card>
  );
}

function MetaPixelSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [settings, setSettings] = useState({
    pixel_id: "",
    access_token: "",
    server_side: true,
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/pixel/settings");
      const data = await res.json();
      if (data.data) {
        setSettings({
          pixel_id: data.data.pixel_id || "",
          access_token: data.data.access_token || "",
          server_side: data.data.server_side ?? true,
        });
      }
    } catch (err) {
      console.error("Erro ao carregar configurações do Pixel:", err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchSettings();
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/pixel/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert("Configurações do Meta Pixel salvas com sucesso!");
        fetchSettings();
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch (err) {
      alert("Erro ao salvar Meta Pixel.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Facebook className="h-4 w-4 text-primary" />
          📈 Meta Pixel & CAPI
          <Badge variant="outline" className="ml-auto text-xs">Meta Platforms</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure o Meta Pixel e a Conversion API para rastrear eventos de conversão.
        </p>
        <div className="space-y-2">
          <Label>Pixel ID</Label>
          <Input
            placeholder="123456789012345"
            value={settings.pixel_id}
            onChange={(e) => setSettings(s => ({ ...s, pixel_id: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Access Token (CAPI)</Label>
          <div className="flex gap-2">
            <Input
              type={showToken ? "text" : "password"}
              placeholder="EAAxxxxxxx..."
              className="flex-1"
              value={settings.access_token}
              onChange={(e) => setSettings(s => ({ ...s, access_token: e.target.value }))}
            />
            <AnimatedButton
              variant="outline"
              size="icon"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </AnimatedButton>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Eventos Server-Side (CAPI)</Label>
            <p className="text-xs text-muted-foreground">Enviar eventos via API</p>
          </div>
          <Switch
            checked={settings.server_side}
            onCheckedChange={(v) => setSettings(s => ({ ...s, server_side: v }))}
          />
        </div>
        <Separator />
        <div className="rounded-lg bg-muted p-3 space-y-2">
          <p className="text-xs font-medium">Eventos configurados (Client-Side e Server-Side se ativado):</p>
          <div className="space-y-1">
            {[
              { event: "ViewContent", desc: "Visualização do checkout" },
              { event: "InitiateCheckout", desc: "Início do checkout" },
              { event: "Purchase", desc: "Compra confirmada" },
            ].map((e) => (
              <div key={e.event} className="flex items-center gap-2 text-xs">
                <CheckCircle className="h-3 w-3 text-primary" />
                <span className="font-medium">{e.event}</span>
                <span className="text-muted-foreground">— {e.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <AnimatedButton
          gradient
          className="w-full"
          onAction={handleSave}
          disabled={saving}
          loadingText="Salvando..."
        >
          Salvar Pixel
        </AnimatedButton>
      </CardContent>
    </Card>
  );
}

function UTMifySection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [settings, setSettings] = useState({
    utmify_api_token: "",
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/utmify/settings");
      const data = await res.json();
      if (data.data) {
        setSettings({
          utmify_api_token: data.data.utmify_api_token || "",
        });
      }
    } catch (err) {
      console.error("Erro ao carregar UTMify:", err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchSettings();
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/utmify/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert("Token da UTMify salvo no Banco de Dados com sucesso!");
        fetchSettings();
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch (err) {
      alert("Erro ao salvar UTMify.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          📊 UTMify
          <Badge variant="outline" className="ml-auto text-xs">UTM Tracking</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Conecte o UTMify para rastrear a origem de cada venda com precisão. Envio automático de Postbacks server-side.
        </p>
        <div className="space-y-2">
          <Label>API Token (x-api-token)</Label>
          <div className="flex gap-2">
            <Input
              type={showToken ? "text" : "password"}
              placeholder="Sua chave API UTMify"
              value={settings.utmify_api_token}
              onChange={(e) => setSettings(s => ({ ...s, utmify_api_token: e.target.value }))}
              className="flex-1"
            />
            <AnimatedButton
              variant="outline" size="icon" className="shrink-0"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </AnimatedButton>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Rastreamento Automático Postback</Label>
            <p className="text-xs text-muted-foreground">O Evento é disparado quando a Paystack processa a venda.</p>
          </div>
          <Switch checked={true} disabled />
        </div>
        <Separator />
        <div className="rounded-lg bg-muted p-3 space-y-1">
          <p className="text-xs font-medium">Parâmetros capturados e enviados via API:</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src"].map((p) => (
              <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
            ))}
          </div>
        </div>
        <AnimatedButton
          gradient
          className="w-full"
          onAction={handleSave}
          disabled={saving}
          loadingText="Salvando..."
        >
          Salvar Token UTMify
        </AnimatedButton>
      </CardContent>
    </Card>
  );
}

function EmailSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [settings, setSettings] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_pass: "",
    sender_name: "NovaPay",
    sender_email: "noreply@novapay.co",
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/email/settings");
      const data = await res.json();
      if (data.data) {
        setSettings({
          smtp_host: data.data.smtp_host || "",
          smtp_port: data.data.smtp_port || 587,
          smtp_user: data.data.smtp_user || "",
          smtp_pass: data.data.smtp_pass_masked || "", // Display masked securely
          sender_name: data.data.sender_name || "NovaPay",
          sender_email: data.data.sender_email || "noreply@novapay.co",
        });
      }
    } catch (err) {
      console.error("Erro ao carregar SMTP:", err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchSettings();
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...settings };
      // If user hasn't touched the masked password, don't send the bullet points to backend
      if (payload.smtp_pass.includes('••••')) {
        delete payload.smtp_pass;
      }

      const res = await fetch("/api/email/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Configurações SMTP salvas no Banco de Dados com sucesso!");
        fetchSettings(); // Refresh UI
      } else {
        throw new Error();
      }
    } catch (err) {
      alert("Erro ao salvar opções de SMTP.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const testEmail = prompt("Para qual e-mail deseja enviar o teste?");
      if (!testEmail) return;

      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });

      const json = await res.json();
      if (res.ok) alert("🎉 " + json.message);
      else alert("❌ Falha: " + (json.error || "Erro ao conectar SMTP."));
    } catch (err) {
      console.error(err);
      alert("Erro de rede ao conectar à API.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          📧 Email SMTP
          <Badge variant="outline" className="ml-auto text-xs">Transacional</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure o SMTP para envio automatizado de recibos de pagamento para os clientes.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Host SMTP</Label>
            <Input
              placeholder="smtp.hostinger.com"
              value={settings.smtp_host}
              onChange={e => setSettings(s => ({ ...s, smtp_host: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Porta</Label>
            <Input
              placeholder="465 ou 587" type="number"
              value={settings.smtp_port}
              onChange={e => setSettings(s => ({ ...s, smtp_port: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Email/Usuário</Label>
            <Input
              placeholder="contato@seudominio.com"
              value={settings.smtp_user}
              onChange={e => setSettings(s => ({ ...s, smtp_user: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Senha do E-mail</Label>
            <div className="flex gap-1.5">
              <Input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={settings.smtp_pass}
                onChange={e => setSettings(s => ({ ...s, smtp_pass: e.target.value }))}
                className="flex-1"
              />
              <AnimatedButton
                variant="outline" size="icon" className="shrink-0"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </AnimatedButton>
            </div>
          </div>
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome do Remetente (Aparece Caixa de Entrada)</Label>
            <Input
              placeholder="Sua Marca Oficial"
              value={settings.sender_name}
              onChange={e => setSettings(s => ({ ...s, sender_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Email Remetente Oficial</Label>
            <Input
              placeholder="noreply@novapay.co" type="email"
              value={settings.sender_email}
              onChange={e => setSettings(s => ({ ...s, sender_email: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <AnimatedButton
            variant="outline"
            className="flex-1"
            onAction={handleTest}
            disabled={testing}
            loadingText="Enviando..."
          >
            🧪 Testar SMTP
          </AnimatedButton>
          <AnimatedButton
            gradient
            className="flex-1"
            onAction={handleSave}
            disabled={saving}
            loadingText="Salvando..."
          >
            Salvar no Banco (Neon)
          </AnimatedButton>
        </div>
      </CardContent>
    </Card>
  );
}

function ShopifySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          🛍️ Shopify → UTMify
          <Badge variant="outline" className="ml-auto text-xs">Shopify Webhook</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use a NovaPay como ponte para enviar suas vendas da Shopify para a UTMify automaticamente.
        </p>

        <div className="space-y-1.5 rounded-lg bg-muted p-3">
          <Label className="text-xs flex items-center gap-1.5">
            <Link2 className="h-3 w-3" /> URL de Webhook para Shopify
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={`${window.location.origin}/api/webhooks/shopify`}
              readOnly
              className="text-[10px] font-mono bg-background h-8"
            />
            <AnimatedButton variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/shopify`);
            }}>Copiar</AnimatedButton>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            No Admin Shopify → Configurações → Notificações → Webhooks: <br />
            Crie webhooks para <b>Criação de pedido</b> e <b>Pagamento de pedido</b> (JSON) usando esta URL.
          </p>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3" /> Como Funciona
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            A NovaPay receberá os dados da Shopify, formatará no padrão da UTMify (incluindo UTMs) e enviará o postback instantaneamente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Conecte gateways de pagamento, tracking e email
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <ShopifySection />
          <PaystackSection />
          <EmailSection />
        </div>
        <div className="space-y-6">
          <MetaPixelSection />
          <UTMifySection />
        </div>
      </div>
    </div>
  );
}

