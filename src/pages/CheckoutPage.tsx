import { useParams, Link } from "react-router-dom";
import { useCheckoutInit } from "@/hooks/useProducts";
import { lazy, Suspense, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import MetaPixel from "@/components/MetaPixel";

const CheckoutPhysical = lazy(() => import("@/components/checkout/CheckoutPhysical"));
const CheckoutDigital = lazy(() => import("@/components/checkout/CheckoutDigital"));

function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
            <div className="relative mb-8">
                {/* Outer glowing ring */}
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                {/* The "bola a girar" (Spinning Ball) */}
                <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
            </div>
            
            <div className="text-center space-y-2 animate-pulse">
                <h2 className="text-xl font-semibold text-gray-900">Iniciando Checkout Seguro</h2>
                <p className="text-sm text-muted-foreground">Preparando sua experiência de compra...</p>
            </div>

            {/* Subtle skeleton structure in the background to maintain layout stability */}
            <div className="mt-12 w-full max-w-4xl opacity-20 pointer-events-none hidden md:block">
                <div className="grid grid-cols-5 gap-8">
                    <div className="col-span-3 space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-40 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                    <div className="col-span-2">
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { data: initData, isLoading, error: initError } = useCheckoutInit(id);
    
    // Seed other queries to avoid waterfalls in child components
    useEffect(() => {
        if (initData) {
            if (initData.product) queryClient.setQueryData(['product', id], initData.product);
            if (initData.funnel) queryClient.setQueryData(['funnel', id], initData.funnel);
            if (initData.bumps) queryClient.setQueryData(['bumps', id], initData.bumps);
            
            // Background prefetch the components
            import("@/components/checkout/CheckoutPhysical");
            import("@/components/checkout/CheckoutDigital");
        }
    }, [initData, id, queryClient]);

    const product = initData?.product;
    const errorMsg = initError ? (initError as Error).message : null;

    if (isLoading) return <LoadingSkeleton />;

    if (initError || !product) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4 max-w-sm">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <h1 className="text-xl font-bold">Produto não encontrado</h1>
                    <p className="text-muted-foreground text-sm">
                        {errorMsg ?? "Este link de checkout não existe ou foi removido."}
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

    return (
        <>
            {/* Direct injection of Pixel ID skipped 1 API roundtrip */}
            <MetaPixel directId={initData?.pixel?.pixel_id} />
            
            <Suspense fallback={<LoadingSkeleton />}>
                {product.type === "digital"
                    ? <CheckoutDigital product={product} />
                    : <CheckoutPhysical product={product} />}
            </Suspense>
        </>
    );
}
