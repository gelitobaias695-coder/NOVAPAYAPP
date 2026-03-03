import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useProducts, type DBProduct } from "@/hooks/useProducts";
import AddProductDialog from "@/components/products/AddProductDialog";
import { Search, Package, AlertCircle, RefreshCw, MoreHorizontal, Edit, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import EditProductDialog from "@/components/products/EditProductDialog";

function ProductCard({ product, onEdit, onDelete }: { product: DBProduct; onEdit: (p: DBProduct) => void; onDelete: (id: string) => void }) {
  const { formatPrice, convertPrice } = useCurrency();
  const { toast } = useToast();
  const priceZAR = product.currency === "ZAR"
    ? parseFloat(product.price)
    : parseFloat(product.price); // price is already stored in the product's own currency

  return (
    <Card className="animate-fade-in overflow-hidden">
      <div className="h-28 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
        {product.product_image_url ? (
          <img src={product.product_image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="h-10 w-10 text-primary/50" />
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{product.name}</h3>
            {product.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {product.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={product.status === "active" ? "default" : "secondary"}>
              {product.status === "active" ? "Ativo" : "Inativo"}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar Produto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/checkout/${product.id}`);
                  toast({ title: "Link copiado!", description: "Link do checkout copiado para a área de transferência." });
                }}>
                  <Link2 className="mr-2 h-4 w-4" /> Copiar Link de Checkout
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => {
                  if (confirm("Tem certeza que deseja excluir esse produto?")) {
                    onDelete(product.id);
                  }
                }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir Produto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">
              {formatPrice(convertPrice(priceZAR))}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Original: {product.currency} {product.price}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-28 w-full rounded-none" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-6 w-1/3" />
      </CardContent>
    </Card>
  );
}

export default function Products() {
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<DBProduct | null>(null);
  const { products, isLoading, error, addProduct, updateProduct, deleteProduct, refetch } = useProducts();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      toast({ title: "Produto excluído", description: "O produto foi excluído com sucesso." });
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o produto." });
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${products.length} produto${products.length !== 1 ? "s" : ""} cadastrado${products.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={refetch} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <AddProductDialog onProductAdded={addProduct} />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Erro ao carregar produtos: {error}</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={refetch}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Skeleton loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            {search ? `Nenhum produto encontrado para "${search}"` : "Nenhum produto cadastrado ainda."}
          </p>
          {!search && (
            <p className="text-xs text-muted-foreground mt-1">
              Clique em "Novo Produto" para adicionar o primeiro.
            </p>
          )}
        </div>
      )}

      {/* Product grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onEdit={setEditingProduct} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <EditProductDialog
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        onSave={updateProduct}
      />
    </div>
  );
}
