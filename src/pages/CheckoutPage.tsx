import { useParams, Link } from "react-router-dom";
import { useProduct } from "@/hooks/useProducts";
import CheckoutPhysical from "@/components/checkout/CheckoutPhysical";
import CheckoutDigital from "@/components/checkout/CheckoutDigital";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-background p-8 space-y-6 max-w-5xl mx-auto">
            <Skeleton className="h-14 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-12 w-full" />
                </div>
                <div className="lg:col-span-2">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    const { id } = useParams<{ id: string }>();
    const { product, isLoading, error } = useProduct(id);

    if (isLoading) return <LoadingSkeleton />;

    if (error || !product) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4 max-w-sm">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <h1 className="text-xl font-bold">Produto não encontrado</h1>
                    <p className="text-muted-foreground text-sm">
                        {error ?? "Este link de checkout não existe ou foi removido."}
                    </p>
                    <Button asChild variant="outline" className="gap-2">
                        <Link to="/"><ArrowLeft className="h-4 w-4" /> Voltar ao início</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (product.status === 'inactive') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4 max-w-sm">
                    <h1 className="text-xl font-bold">Produto indisponível</h1>
                    <p className="text-muted-foreground text-sm">Este produto não está disponível para compra no momento.</p>
                </div>
            </div>
        );
    }

    return product.type === "digital"
        ? <CheckoutDigital product={product} />
        : <CheckoutPhysical product={product} />;
}
