import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Minus, Plus, Sparkles, ShoppingCart, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Carrito — Ferro-Smart" }] }),
});

type Suggestion = { id: string; name: string; price: number; brand?: string | null; reason: string };

function CartPage() {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, clear, subtotal, tax, total, count } = useCart();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [lastSignature, setLastSignature] = useState("");

  const fmt = (n: number) => n.toFixed(2);

  // IA: cargar sugerencias cuando cambia el carrito (debounced por signature)
  useEffect(() => {
    if (items.length === 0) {
      setSuggestions([]);
      return;
    }
    const sig = items.map((i) => i.product.id).sort().join(",");
    if (sig === lastSignature) return;
    const t = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const { data: catalog } = await supabase
          .from("products")
          .select("id,name,brand,price,category_id, categories(name)")
          .gt("stock", 0)
          .limit(80);

        const inCart = new Set(items.map((i) => i.product.id));
        const available = (catalog ?? [])
          .filter((p) => !inCart.has(p.id))
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            category: p.categories?.name,
          }));

        const cartPayload = items.map((i) => ({
          name: i.product.name,
          brand: i.product.brand,
        }));

        const { data, error } = await supabase.functions.invoke("upsell-suggest", {
          body: { items: cartPayload, availableProducts: available },
        });
        if (error) throw error;
        const ids: Array<{ product_id: string; reason: string }> = data?.suggestions ?? [];
        const byId = new Map((catalog ?? []).map((p: any) => [p.id, p]));
        const enriched: Suggestion[] = ids
          .map((s) => {
            const p: any = byId.get(s.product_id);
            if (!p) return null;
            return { id: p.id, name: p.name, price: Number(p.price), brand: p.brand, reason: s.reason };
          })
          .filter(Boolean) as Suggestion[];
        setSuggestions(enriched);
        setLastSignature(sig);
      } catch (e) {
        console.error("upsell error", e);
      } finally {
        setSuggestLoading(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [items, lastSignature]);

  const addSuggestion = async (s: Suggestion) => {
    const { data } = await supabase
      .from("products")
      .select("id,name,barcode,price,brand,category_id,image_url,stock")
      .eq("id", s.id)
      .maybeSingle();
    if (!data) return;
    const { addItem } = useCartFromHook();
    addItem({
      id: data.id, name: data.name, barcode: data.barcode, price: Number(data.price),
      brand: data.brand, category_id: data.category_id, image_url: data.image_url, stock: data.stock,
    });
    toast.success(`${data.name} agregado`);
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  };

  if (items.length === 0) {
    return (
      <MobileShell title="Carrito">
        <div className="-mt-8 flex flex-col items-center justify-center text-center py-20">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <p className="text-foreground font-semibold mb-1">Tu carrito está vacío</p>
          <p className="text-sm text-muted-foreground mb-6">Escanea productos para agregarlos</p>
          <Link to="/scan" className="bg-gradient-primary text-primary-foreground px-6 py-3 rounded-2xl font-semibold shadow-md">
            Ir a escanear
          </Link>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Carrito">
      <div className="-mt-12 mb-4 bg-card rounded-2xl p-3 shadow-elegant border border-border flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{count} {count === 1 ? "ítem" : "ítems"}</span>
        <button onClick={clear} className="text-xs text-destructive font-semibold flex items-center gap-1">
          <Trash2 className="h-3.5 w-3.5" /> Vaciar
        </button>
      </div>

      {/* Lista de items */}
      <div className="space-y-2 mb-4">
        {items.map((it) => (
          <div key={it.product.id} className="bg-card rounded-2xl p-3 border border-border shadow-sm flex gap-3">
            <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
              {it.product.image_url && (
                <img src={it.product.image_url} alt={it.product.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-primary-glow font-semibold">{it.product.brand}</p>
              <p className="text-sm font-semibold text-foreground line-clamp-1">{it.product.name}</p>
              <p className="text-xs text-muted-foreground">S/ {fmt(it.product.price)} c/u</p>
            </div>
            <div className="flex flex-col items-end justify-between">
              <p className="text-sm font-bold text-foreground">S/ {fmt(it.product.price * it.quantity)}</p>
              <div className="flex items-center gap-1 bg-muted rounded-full">
                <button
                  onClick={() => updateQty(it.product.id, it.quantity - 1)}
                  className="h-7 w-7 flex items-center justify-center text-foreground"
                  aria-label="Restar"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setEditing(it.product.id); setEditValue(String(it.quantity)); }}
                  className="min-w-7 text-sm font-semibold text-foreground px-1"
                >
                  {it.quantity}
                </button>
                <button
                  onClick={() => updateQty(it.product.id, it.quantity + 1)}
                  className="h-7 w-7 flex items-center justify-center text-foreground"
                  aria-label="Sumar"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sugerencias IA */}
      {(suggestions.length > 0 || suggestLoading) && (
        <section className="mb-4">
          <h3 className="text-sm font-display font-bold flex items-center gap-2 mb-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary-glow" />
            Te sugerimos también
          </h3>
          {suggestLoading && (
            <p className="text-xs text-muted-foreground">Buscando complementos…</p>
          )}
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 snap-x">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => addSuggestion(s)}
                className="flex-shrink-0 w-44 snap-start text-left bg-card border border-primary-glow/30 rounded-2xl p-3 shadow-sm hover:shadow-md transition-smooth"
              >
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary-glow font-semibold mb-1">
                  <AlertCircle className="h-3 w-3" /> Sugerido
                </div>
                <p className="text-xs font-semibold text-foreground line-clamp-2">{s.name}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{s.reason}</p>
                <p className="text-sm font-bold text-foreground mt-1">S/ {fmt(s.price)}</p>
                <p className="text-[10px] text-primary-glow font-semibold mt-1">+ Agregar</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Totales */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-elegant mb-4 space-y-1.5">
        <Row label="Subtotal" value={`S/ ${fmt(subtotal)}`} />
        <Row label="IGV (18%)" value={`S/ ${fmt(tax)}`} />
        <div className="border-t border-border my-2" />
        <Row label="Total" value={`S/ ${fmt(total)}`} bold />
      </div>

      <button
        onClick={() => navigate({ to: "/checkout" })}
        className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-bold shadow-glow flex items-center justify-center gap-2"
      >
        Cobrar S/ {fmt(total)} <ArrowRight className="h-5 w-5" />
      </button>

      {/* Modal cantidad */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cantidad</DialogTitle>
            <DialogDescription>Ingresa la cantidad exacta</DialogDescription>
          </DialogHeader>
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-center text-3xl font-bold py-4 rounded-2xl bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary-glow"
          />
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9","0",".","⌫"].map((k) => (
              <button
                key={k}
                onClick={() => {
                  if (k === "⌫") setEditValue((v) => v.slice(0, -1));
                  else setEditValue((v) => (v === "0" ? k : v + k));
                }}
                className="py-3 rounded-xl bg-muted text-foreground font-bold text-lg active:bg-accent"
              >
                {k}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const n = Number(editValue);
              if (!isNaN(n) && editing) {
                if (n <= 0) removeItem(editing);
                else updateQty(editing, n);
              }
              setEditing(null);
            }}
            className="w-full py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-bold"
          >
            Confirmar
          </button>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold text-foreground" : "text-sm text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "" : "text-foreground"}>{value}</span>
    </div>
  );
}

// helper para usar el hook fuera del componente principal de manera segura
import { useCart as useCartFromHook } from "@/hooks/use-cart";
