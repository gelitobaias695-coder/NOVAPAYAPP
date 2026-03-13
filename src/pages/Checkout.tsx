import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { mockProducts } from "@/lib/mock-data";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Lock,
  ArrowLeft,
  Package,
  FileDown,
  Star,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

function Testimonials() {
  const reviews = [
    { name: "Sarah N.", rating: 5, text: "Entrega rápida e produto excelente! Super recomendo." },
    { name: "Kwame B.", rating: 5, text: "Melhor plataforma para compras na África. Pagamento fácil." },
    { name: "Fatima Z.", rating: 5, text: "Recebi meu produto digital em segundos. Incrível!" },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium flex items-center gap-1.5">
        <Star className="h-3.5 w-3.5 text-warning fill-warning" />
        4.9/5 baseado em 2,847 avaliações
      </p>
      <div className="space-y-2">
        {reviews.map((r, i) => (
          <div
            key={i}
            className="rounded-lg border border-border p-3 space-y-1"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="flex items-center gap-1">
              {Array.from({ length: r.rating }).map((_, j) => (
                <Star key={j} className="h-3 w-3 text-warning fill-warning" />
              ))}
              <span className="text-xs font-medium ml-1">{r.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Checkout() {
  const { productId } = useParams();
  const product = mockProducts.find((p) => p.id === productId) || mockProducts[0];
  const isDigital = product.productType === "digital";
  const { currency, formatPrice, convertPrice } = useCurrency();
  const price = convertPrice(product.priceBase);
  const [coupon, setCoupon] = useState("");
  const [step, setStep] = useState(1);

  const totalSteps = isDigital ? 2 : 3;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center gap-4 px-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">N</span>
          </div>
          <span className="font-semibold">NovaPay</span>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Pagamento seguro
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        {/* Steps indicator */}
        <div className="mb-6 flex items-center justify-center gap-2 animate-fade-in">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i + 1)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${step === i + 1
                  ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30"
                  : step > i + 1
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {step > i + 1 ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </button>
              {i < totalSteps - 1 && (
                <div
                  className={`h-0.5 w-12 transition-all duration-500 ${step > i + 1 ? "bg-primary" : "bg-muted"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Form */}
          <div className="lg:col-span-3 space-y-5">


            {/* Step 1: Contact */}
            <div
              className={`transition-all duration-500 ${step === 1 ? "opacity-100 translate-y-0" : "hidden"
                }`}
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-4 bg-muted/30">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      1
                    </div>
                    Informações de Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input id="name" placeholder="Seu nome" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="seu@email.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" type="tel" placeholder="+27 82 123 4567" />
                  </div>
                  <Button onClick={() => setStep(2)} className="w-full h-11 gap-2 font-semibold">
                    Continuar
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Step 2: Address (physical only) or Payment */}
            {!isDigital && (
              <div
                className={`transition-all duration-500 ${step === 2 ? "opacity-100 translate-y-0" : "hidden"
                  }`}
              >
                <Card className="overflow-hidden">
                  <CardHeader className="pb-4 bg-muted/30">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        2
                      </div>
                      Endereço de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input id="address" placeholder="Rua, número, complemento" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input id="city" placeholder="Sua cidade" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado / Província</Label>
                        <Input id="state" placeholder="Seu estado" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="postal">Código Postal</Label>
                        <Input id="postal" placeholder="0000" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">País</Label>
                        <Input id="country" value={currency.country} readOnly />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                        Voltar
                      </Button>
                      <Button onClick={() => setStep(3)} className="flex-[2] h-11 gap-2 font-semibold">
                        Continuar
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Final Step: Payment */}
            <div
              className={`transition-all duration-500 ${step === (isDigital ? 2 : 3) ? "opacity-100 translate-y-0" : "hidden"
                }`}
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-4 bg-muted/30">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {isDigital ? 2 : 3}
                    </div>
                    Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  {/* Coupon */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código do cupom"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                    />
                    <Button variant="outline">Aplicar</Button>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(price)}</span>
                    </div>
                    {!isDigital && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Envio</span>
                        <span className="text-primary font-medium">Grátis</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(price)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(isDigital ? 1 : 2)}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button className="flex-[2] h-12 text-base font-bold gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                      <Shield className="h-4 w-4" />
                      Pagar {formatPrice(price)}
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3" /> SSL 256-bit
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Paystack
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> PCI DSS
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>


          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="sticky top-20 animate-fade-in">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                    {isDigital ? (
                      <FileDown className="h-6 w-6 text-primary" />
                    ) : (
                      <Package className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {product.description}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {isDigital ? "Digital" : "Físico"}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(price)}</span>
                </div>

                <Separator />

                {/* Guarantee */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    Garantia de 7 dias
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Não ficou satisfeito? Devolvemos 100% do seu dinheiro, sem perguntas.
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted p-2.5 text-center">
                    <p className="text-lg font-bold text-primary">2.8k+</p>
                    <p className="text-[10px] text-muted-foreground">Clientes satisfeitos</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2.5 text-center">
                    <p className="text-lg font-bold text-primary">4.9</p>
                    <p className="text-[10px] text-muted-foreground">Avaliação média</p>
                  </div>
                </div>

                <Separator />

                {/* Testimonials */}
                <Testimonials />
              </CardContent>
            </Card>


          </div>
        </div>
      </div>
    </div>
  );
}
