import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  head: () => ({
    meta: [
      { title: "Búsqueda IA — Ferro-Smart" },
      { name: "description", content: "Busca productos describiendo lo que necesitas en lenguaje natural." },
    ],
  }),
});

const SUGGESTIONS = [
  "lo que sirve para pegar tubos de agua",
  "algo para cortar madera rápido",
  "necesito pintar una pared blanca",
  "tornillos para techo metálico",
];

function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductCardData[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    setLoading(true);
    setSearched(true);
    setResults([]);
    setExplanation(null);

    try {
      // Get available categories and brands
      const [{ data: cats }, { data: brandRows }] = await Promise.all([
        supabase.from("categories").select("name"),
        supabase.from("products").select("brand").not("brand", "is", null),
      ]);
      const categories = (cats ?? []).map((c) => c.name);
      const brands = Array.from(new Set((brandRows ?? []).map((b) => b.brand).filter(Boolean) as string[]));

      const { data, error } = await supabase.functions.invoke("ai-search", {
        body: { query: text, categories, brands },
      });

      if (error) {
        if (error.message?.includes("429")) toast.error("Demasiadas solicitudes, espera un momento");
        else if (error.message?.includes("402")) toast.error("Sin créditos de IA disponibles");
        else toast.error("Error en la búsqueda IA");
        return;
      }

      const { categories: matchedCats, brands: matchedBrands, keywords, explanation: exp } = data ?? {};
      setExplanation(exp ?? null);

      // Build query
      let q = supabase.from("products").select("id,name,brand,price,image_url,stock,categories(name)");

      const filters: string[] = [];
      if (matchedCats?.length) {
        const { data: catIds } = await supabase.from("categories").select("id").in("name", matchedCats);
        const ids = (catIds ?? []).map((c) => c.id);
        if (ids.length) filters.push(`category_id.in.(${ids.join(",")})`);
      }
      if (matchedBrands?.length) {
        filters.push(`brand.in.(${matchedBrands.map((b: string) => `"${b}"`).join(",")})`);
      }
      if (keywords?.length) {
        keywords.forEach((kw: string) => filters.push(`name.ilike.%${kw}%`));
      }

      if (filters.length) {
        q = q.or(filters.join(","));
      }

      const { data: products } = await q.limit(30);
      setResults((products ?? []) as ProductCardData[]);
    } catch (e) {
      toast.error("Error inesperado");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell title="Búsqueda IA">
      <div className="-mt-2 mb-5 bg-gradient-primary text-primary-foreground rounded-2xl p-4 shadow-elegant">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary-glow" />
          <span className="text-xs uppercase tracking-wider opacity-80">Lenguaje natural</span>
        </div>
        <p className="text-sm opacity-90 leading-snug">
          Describe lo que necesitas y la IA encontrará productos relacionados, aunque no sepas el nombre técnico.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="relative mb-4"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Ej: "algo para destapar el lavamanos"'
          className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>

      {!searched && (
        <div className="space-y-2 mb-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Prueba con</p>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSearch(s)}
              className="w-full text-left px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground hover:border-primary-glow hover:shadow-md transition-smooth"
            >
              "{s}"
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary-glow mb-3" />
          <p className="text-sm">La IA está analizando tu consulta...</p>
        </div>
      )}

      {explanation && !loading && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-accent border border-border text-xs text-foreground">
          <strong className="text-primary-glow">IA:</strong> {explanation}
        </div>
      )}

      {searched && !loading && (
        <div className="space-y-3">
          {results.length > 0 ? (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground">{results.length} producto(s) encontrado(s)</h2>
              {results.map((p) => <ProductCard key={p.id} product={p} />)}
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              No se encontraron productos. Intenta con otra descripción.
            </p>
          )}
        </div>
      )}
    </MobileShell>
  );
}
