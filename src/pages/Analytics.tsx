import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Smartphone, Monitor, Globe, Target } from "lucide-react";

const COLORS = ["hsl(160, 84%, 39%)", "hsl(200, 80%, 50%)", "hsl(45, 93%, 58%)", "hsl(280, 65%, 60%)", "hsl(340, 75%, 55%)"];

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders/analytics')
      .then(r => r.json())
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground flex items-center justify-center">Carregando métricas avançadas...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Análise detalhada de performance</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Globe className="w-5 h-5" /> Aprovação por Estado / País</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="pb-2">Localidade</th>
                    <th className="pb-2 text-right">Checkouts</th>
                    <th className="pb-2 text-right">Aprovados</th>
                    <th className="pb-2 text-right">% Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {data.geoData?.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Sem dados suficientes</td></tr>}
                  {data.geoData?.map((g: any, i: number) => {
                    const conv = g.checkouts > 0 ? ((g.approved / g.checkouts) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="py-3 font-medium">{g.province || g.country || 'Desconhecido'}</td>
                        <td className="py-3 text-right">{g.checkouts}</td>
                        <td className="py-3 text-right text-emerald-500 font-semibold">{g.approved}</td>
                        <td className="py-3 text-right font-mono text-xs">{conv}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Smartphone className="w-5 h-5" /> Dispositivos e Navegadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.browserData?.length > 0 ? data.browserData : [{ name: "Vazio", value: 1 }]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.browserData?.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Target className="w-5 h-5" /> Performance de Anúncios (UTM & Pixels)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="pb-2">UTM Source / Medium / Campaign</th>
                    <th className="pb-2 text-right">Iniciados (Checkouts)</th>
                    <th className="pb-2 text-right">Pagos (Aprovados)</th>
                    <th className="pb-2 text-right">Taxa de Sucesso</th>
                  </tr>
                </thead>
                <tbody>
                  {data.utmData?.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Nenhuma UTM capturada até o momento.</td></tr>}
                  {data.utmData?.map((u: any, i: number) => {
                    const conv = u.checkouts > 0 ? ((u.approved / u.checkouts) * 100).toFixed(1) : '0.0';
                    const label = [u.utm_source, u.utm_medium, u.utm_campaign].filter(Boolean).join(' / ') || 'Tráfego Direto';
                    return (
                      <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="py-4 font-medium">{label}</td>
                        <td className="py-4 text-right">{u.checkouts}</td>
                        <td className="py-4 text-right text-emerald-500 font-semibold">{u.approved}</td>
                        <td className="py-4 text-right font-mono text-xs font-bold">{conv}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
