import { useParams, Link } from "react-router-dom";
import { useCheckoutInit, useProduct } from "@/hooks/useProducts";
import { lazy, Suspense, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import MetaPixel from "@/components/MetaPixel";

const CheckoutPhysical = lazy(() => import("@/components/checkout/CheckoutPhysical"));
const CheckoutDigital = lazy(() => import("@/components/checkout/CheckoutDigital"));


export default function CheckoutPage() {
    const { id: rawId } = useParams<{ id: string }>();
    const id = rawId?.trim();
    const queryClient = useQueryClient();
    
    const { data: initData, isLoading: isLoadingInit, error: initError } = useCheckoutInit(id);
    
    // Fallback to old behavior if checkout-init is 404 (not deployed yet)
    const shouldFallback = !isLoadingInit && !initData;
    const { product: fallbackProduct, isLoading: isLoadingFallback, error: fallbackError } = useProduct(shouldFallback ? id : undefined);
    
    const product = initData?.product || fallbackProduct;
    const isLoading = isLoadingInit || (shouldFallback && isLoadingFallback);
    const error = initError || (shouldFallback ? fallbackError : null);

    // Seed other queries to avoid waterfalls in child components
    useEffect(() => {
        if (initData && id) {
            if (initData.product) queryClient.setQueryData(['product', id], initData.product);
            if (initData.funnel) queryClient.setQueryData(['funnel', id], initData.funnel);
            if (initData.bumps) queryClient.setQueryData(['bumps', id], initData.bumps);
            
            // Background prefetch the components
            import("@/components/checkout/CheckoutPhysical");
            import("@/components/checkout/CheckoutDigital");
        }
    }, [initData, id, queryClient]);

    const errorMsg = error ? (error as Error).message : null;

    if (isLoading) return null;

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4 max-w-sm">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <h1 className="text-xl font-bold">Checkout não encontrado</h1>
                    <p className="text-muted-foreground text-sm">
                        {errorMsg && errorMsg !== "Checkout não encontrado." ? errorMsg : "O link que você acessou está incorreto ou o produto foi removido."}
                    </p>
                    <Button asChild variant="default" className="w-full h-11">
                        <Link to="/admin/products">Voltar para Meus Produtos</Link>
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
            
            <Suspense fallback={null}>
                {product.type === "digital"
                    ? <CheckoutDigital product={product} />
                    : <CheckoutPhysical product={product} />}
            </Suspense>
        </>
    );
}
