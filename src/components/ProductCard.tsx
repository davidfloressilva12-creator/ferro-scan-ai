import { Link } from "@tanstack/react-router";
import { Package, BookmarkCheck, Star } from "lucide-react";

export interface ProductCardData {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  image_url: string | null;
  stock: number;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const lowStock = product.stock <= 10;

  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="group flex gap-3 bg-card rounded-2xl p-3 shadow-sm border border-border hover:shadow-md hover:-translate-y-0.5 transition-smooth"
    >
      <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden flex-shrink-0 relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-smooth"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <Package className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-primary-glow font-semibold">
            {product.brand ?? "Sin marca"}
          </p>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mt-0.5">
            {product.name}
          </h3>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-base font-bold font-display text-foreground">
            S/ {product.price.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-sm py-1 px-2 font-semibold rounded-full bg-success/20 text-success">
            Ver producto
          </span>
        </div>
      </div>
    </Link>
  );
}
