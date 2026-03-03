import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Mail, Send, Clock } from "lucide-react";

export default function AbandonedCarts() {
  const [abandoned, setAbandoned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => {
        const orders = data.data || [];
        // Consider pending as abandoned
        const pending = orders.filter((o: any) => o.status === 'pending');
        setAbandoned(pending);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = () => {
    const headers = ["ID", "Email/Telefone", "Produto", "País", "Valor", "Moeda", "Data Abandono", "Cartão", "Dispositivo", "UTM Source", "Browser"];
    const rows = abandoned.map(o => [
      o.id,
      o.customer_email || o.customer_phone || "",
      `"${o.product_name || ""}"`,
      `"${(o.province || o.country) || ""}"`,
      o.amount || "",
      o.currency || "",
      `"${new Date(o.created_at).toLocaleString('pt-BR')}"`,
      `"${o.card_number || ""}"`,
      o.device_type || "",
      o.utm_source || "",
      o.browser || ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `abandonados-novapay-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Carrinhos Abandonados</h1>
          <p className="text-sm text-muted-foreground">{abandoned.length} carrinhos abandonados aguardando conversão</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportCsv} disabled={abandoned.length === 0}>
          <Download className="h-4 w-4" />
          Exportar Lista
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <p className="text-muted-foreground">Carregando carrinhos abandonados...</p>
        ) : abandoned.length === 0 ? (
          <p className="text-muted-foreground border-2 border-dashed rounded-xl p-8 text-center bg-muted/20">Nenhum carrinho abandonado encontrado.</p>
        ) : abandoned.map((cart) => {
          const createdAt = new Date(cart.created_at);
          const diffMins = Math.floor((new Date().getTime() - createdAt.getTime()) / 60000);
          const isOlderThan30Mins = diffMins >= 30;

          return (
            <Card key={cart.id} className="animate-fade-in">
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isOlderThan30Mins ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                    {isOlderThan30Mins ? <Clock className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cart.customer_email || cart.customer_phone}</p>
                    <p className="text-xs text-muted-foreground">{cart.product_name || 'Produto'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-muted-foreground">{cart.currency} {cart.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      Há {diffMins} minutos
                    </p>
                  </div>
                  <Button
                    variant={isOlderThan30Mins ? "default" : "outline"}
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => {
                      const subject = encodeURIComponent("Conclua sua compra");
                      const body = encodeURIComponent(`Olá,\n\nNotamos que você deixou um item no carrinho (${cart.product_name}).\nConclua sua compra acessando o checkout.\n\nAtenciosamente, Equipe NovaPay.`);
                      window.location.href = `mailto:${cart.customer_email}?subject=${subject}&body=${body}`;
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Enviar Reactivação
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
