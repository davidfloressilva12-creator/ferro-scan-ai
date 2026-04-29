import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Search, Phone, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/customers/")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Clientes — Ferro-Smart" }] }),
});

type CustomerWithBalance = {
  id: string;
  name: string;
  document_number: string | null;
  phone: string | null;
  balance?: number;
};

function CustomersPage() {
  const [list, setList] = useState<CustomerWithBalance[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: customers }, { data: balances }] = await Promise.all([
        supabase.from("customers").select("id,name,document_number,phone").order("name"),
        supabase.from("customer_balances" as any).select("customer_id,balance"),
      ]);
      const map = new Map<string, number>();
      (balances as any[] | null)?.forEach((b) => map.set(b.customer_id, Number(b.balance) || 0));
      const merged = (customers ?? []).map((c) => ({ ...c, balance: map.get(c.id) ?? 0 }));
      setList(merged);
    })();
  }, []);

  const filtered = q
    ? list.filter((c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        (c.document_number ?? "").includes(q),
      )
    : list;

  return (
    <MobileShell title="Clientes">
      <Link to="/customers/new" className="-mt-10 mb-4 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold shadow-md">
        <UserPlus className="h-4 w-4" /> Nuevo cliente
      </Link>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o documento..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((c) => (
          <div key={c.id} className="bg-card rounded-2xl p-3 border border-border shadow-sm">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground line-clamp-1">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.document_number ?? "Sin doc."}</p>
                {c.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </p>
                )}
              </div>
              {(c.balance ?? 0) > 0 && (
                <div className="bg-destructive/10 text-destructive text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> S/ {(c.balance ?? 0).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Sin clientes registrados</p>
        )}
      </div>
    </MobileShell>
  );
}
