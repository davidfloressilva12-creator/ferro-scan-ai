import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, AlertTriangle, Package2, ScanLine, Sparkles, Users, Receipt, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Inicio — Ferro-Smart" },
      { name: "description", content: "Panel de control con stock crítico y acceso rápido a herramientas." },
    ],
  }),
});

interface Product {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  image_url: string | null;
  stock: number;
}

function Index() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: latest }, { data: low }, { count }] = await Promise.all([
        supabase.from("products").select("id,name,brand,price,image_url,stock").order("created_at", { ascending: false }).limit(8),
        supabase.from("products").select("id,name,brand,price,image_url,stock").lte("stock", 10).order("stock").limit(20),
        supabase.from("products").select("id", { count: "exact", head: true }),
      ]);
      setProducts(latest ?? []);
      setLowStock(low ?? []);
      setStats({ total: count ?? 0, lowStock: low?.length ?? 0 });
    };
    load();
  }, [user]);

  const filtered = search
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : products;

  return (
    <MobileShell title="Ferro·Smart">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 -mt-12 mb-6">
        <div className="bg-card rounded-2xl p-4 shadow-elegant border border-border">
          <Package2 className="h-5 w-5 text-primary-glow mb-2" />
          <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Productos</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-elegant border border-border">
          <AlertTriangle className="h-5 w-5 text-destructive mb-2" />
          <p className="text-2xl font-display font-bold text-foreground">{stats.lowStock}</p>
          <p className="text-xs text-muted-foreground">Stock crítico</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o marca..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm shadow-sm"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Link to="/scan" className="flex flex-col items-center gap-2 bg-gradient-primary text-primary-foreground rounded-2xl p-4 shadow-md hover:shadow-glow transition-smooth">
          <ScanLine className="h-6 w-6" />
          <span className="text-xs font-semibold">Vender</span>
        </Link>
        <Link to="/search" className="flex flex-col items-center gap-2 bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-smooth">
          <Sparkles className="h-6 w-6 text-primary-glow" />
          <span className="text-xs font-semibold text-foreground">Buscar IA</span>
        </Link>
        <Link to="/product/new" className="flex flex-col items-center gap-2 bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-smooth">
          <Plus className="h-6 w-6 text-primary-glow" />
          <span className="text-xs font-semibold text-foreground">Agregar</span>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/customers" className="flex items-center gap-2 bg-card border border-border rounded-2xl p-3 shadow-sm hover:shadow-md transition-smooth">
          <Users className="h-5 w-5 text-primary-glow" />
          <span className="text-xs font-semibold text-foreground">Clientes</span>
        </Link>
        <Link to="/credits" className="flex items-center gap-2 bg-card border border-border rounded-2xl p-3 shadow-sm hover:shadow-md transition-smooth">
          <Receipt className="h-5 w-5 text-destructive" />
          <span className="text-xs font-semibold text-foreground">Por cobrar</span>
        </Link>
      </div>

      {lowStock.length > 0 && !search && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Stock crítico
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
            {lowStock.map((p) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{ id: p.id }}
                className="flex-shrink-0 w-40 snap-start bg-card rounded-2xl border border-border p-3 shadow-sm"
              >
                <div className="h-24 w-full rounded-xl bg-muted overflow-hidden mb-2">
                  {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-primary-glow font-semibold">{p.brand}</p>
                <p className="text-xs font-semibold text-foreground line-clamp-2">{p.name}</p>
                <p className="text-xs text-destructive font-bold mt-1">Solo {p.stock} und</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-display font-bold text-foreground">
            {search ? `Resultados (${filtered.length})` : "Recientes"}
          </h2>
        </div>
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Sin resultados</p>
          )}
        </div>
      </section>
    </MobileShell>
  );
}
