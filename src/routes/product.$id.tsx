import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Edit3, Save, Trash2, Package, Barcode, Tag, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
  head: () => ({ meta: [{ title: "Producto — Ferro-Smart" }] }),
});

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  brand: string | null;
  stock: number;
  description: string | null;
  categories?: { name: string } | null;
}

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [alternatives, setAlternatives] = useState<ProductCardData[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<Product>>({});

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        toast.error("Producto no encontrado");
        navigate({ to: "/" });
        return;
      }
      setProduct(data as Product);
      setDraft(data);

      if (data.category_id) {
        const { data: alts } = await supabase
          .from("products")
          .select("id,name,brand,price,image_url,stock")
          .eq("category_id", data.category_id)
          .neq("id", data.id)
          .neq("brand", data.brand ?? "")
          .limit(6);
        setAlternatives((alts ?? []) as ProductCardData[]);
      }
    };
    load();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: draft.name,
        price: Number(draft.price),
        stock: Number(draft.stock),
        brand: draft.brand,
        description: draft.description,
      })
      .eq("id", product.id);
    setSaving(false);
    if (error) {
      toast.error("Error al guardar");
      return;
    }
    toast.success("Producto actualizado");
    setProduct({ ...product, ...draft } as Product);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!product || !confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) return toast.error("Error al eliminar");
    toast.success("Producto eliminado");
    navigate({ to: "/" });
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const lowStock = product.stock <= 10;

  return (
    <MobileShell>
      <div className="-mx-4 -mt-4 relative">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Package className="h-20 w-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <Link to="/" className="absolute top-4 left-4 h-10 w-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="h-10 w-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md"
            >
              <Edit3 className="h-5 w-5 text-foreground" />
            </button>
          </div>
        </div>

        <div className="px-4 -mt-6 relative z-10">
          <div className="bg-card rounded-3xl p-5 shadow-elegant border border-border">
            {!editing ? (
              <>
                <p className="text-xs uppercase tracking-wider text-primary-glow font-semibold mb-1">
                  {product.brand} {product.categories?.name && ` · ${product.categories.name}`}
                </p>
                <h1 className="text-xl font-display font-bold text-foreground leading-tight">
                  {product.name}
                </h1>
                <div className="flex items-end justify-between mt-4">
                  <div>
                    <p className="text-3xl font-display font-bold text-foreground">
                      ${product.price.toLocaleString("es-CO")}
                    </p>
                    <p className="text-xs text-muted-foreground">Precio unitario</p>
                  </div>
                  <span
                    className={`text-sm font-bold px-3 py-1.5 rounded-full ${
                      lowStock ? "bg-destructive/10 text-destructive" : "bg-success/10"
                    }`}
                    style={{ color: lowStock ? undefined : "oklch(0.4 0.13 150)" }}
                  >
                    {product.stock} unidades
                  </span>
                </div>

                {product.description && (
                  <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{product.description}</p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Barcode className="h-4 w-4" />
                    <span className="font-mono">{product.barcode ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{product.brand ?? "—"}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Nombre</label>
                  <input
                    value={draft.name ?? ""}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Precio</label>
                    <input
                      type="number"
                      value={draft.price ?? 0}
                      onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Stock</label>
                    <input
                      type="number"
                      value={draft.stock ?? 0}
                      onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Marca</label>
                  <input
                    value={draft.brand ?? ""}
                    onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Descripción</label>
                  <textarea
                    value={draft.description ?? ""}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    rows={3}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-semibold disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 rounded-xl bg-destructive/10 text-destructive font-semibold"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {alternatives.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-primary-glow" />
            <h2 className="text-base font-display font-bold text-foreground">
              Alternativas de otras marcas
            </h2>
          </div>
          <div className="space-y-3">
            {alternatives.map((alt) => (
              <ProductCard key={alt.id} product={alt} />
            ))}
          </div>
        </section>
      )}
    </MobileShell>
  );
}
