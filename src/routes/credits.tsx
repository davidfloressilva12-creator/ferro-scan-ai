import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, Phone, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/credits")({
  component: CreditsPage,
  head: () => ({ meta: [{ title: "Boletas por cobrar — Ferro-Smart" }] }),
});

type PendingSale = {
  id: string;
  doc_full: string;
  doc_type: string;
  total: number;
  created_at: string;
  customer_id: string | null;
  customer_name: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
};

function CreditsPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sales")
      .select("id,doc_full,doc_type,total,created_at,customer_id,customer_name, customer:customers(id,name,phone)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setSales((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fmt = (n: number) => n.toFixed(2);

  const totalDeuda = sales.reduce((s, x) => s + Number(x.total), 0);

  const markPaid = async (sale: PendingSale) => {
    if (!confirm(`¿Marcar ${sale.doc_full} como PAGADA?`)) return;
    const { error: payErr } = await supabase.from("payments").insert({
      sale_id: sale.id,
      amount: sale.total,
      method: "efectivo",
      note: "Pago de fiado",
    });
    if (payErr) { toast.error(payErr.message); return; }
    const { error } = await supabase
      .from("sales")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", sale.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marcada como pagada");
    load();
  };

  const sendWhatsapp = (sale: PendingSale) => {
    const phone = sale.customer?.phone?.replace(/\D/g, "");
    if (!phone) { toast.error("Cliente sin teléfono"); return; }
    const msg = `Hola ${sale.customer_name ?? sale.customer?.name ?? ""}, le recordamos su pendiente: ${sale.doc_full} por S/ ${fmt(sale.total)}. Gracias.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Agrupar por cliente
  const grouped = sales.reduce<Record<string, PendingSale[]>>((acc, s) => {
    const key = s.customer_id ?? "sin-cliente";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <MobileShell title="Boletas por cobrar">
      <div className="-mt-12 mb-4 bg-card rounded-2xl p-4 shadow-elegant border border-border">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total pendiente</p>
        <p className="text-3xl font-display font-bold text-destructive">S/ {fmt(totalDeuda)}</p>
        <p className="text-xs text-muted-foreground">{sales.length} {sales.length === 1 ? "deuda activa" : "deudas activas"}</p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground text-sm py-8">Cargando…</p>
      ) : sales.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="h-16 w-16 text-success/60 mx-auto mb-3" />
          <p className="font-semibold text-foreground">¡Sin deudas!</p>
          <p className="text-sm text-muted-foreground">Todas las boletas están pagadas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, list]) => {
            const subTotal = list.reduce((s, x) => s + Number(x.total), 0);
            const customerName = list[0].customer_name ?? list[0].customer?.name ?? "Sin cliente";
            return (
              <section key={key}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-display font-bold text-foreground">{customerName}</h3>
                  <span className="text-sm font-bold text-destructive">S/ {fmt(subTotal)}</span>
                </div>
                <div className="space-y-2">
                  {list.map((s) => (
                    <div key={s.id} className="bg-card rounded-2xl p-3 border border-border shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-primary-glow font-semibold">{s.doc_type}</p>
                          <p className="font-mono font-bold text-foreground">{s.doc_full}</p>
                          <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("es-PE")}</p>
                        </div>
                        <p className="text-lg font-bold text-destructive">S/ {fmt(s.total)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => markPaid(s)}
                          className="py-2 rounded-xl bg-success text-white font-semibold text-xs flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Marcar pagada
                        </button>
                        <button
                          onClick={() => sendWhatsapp(s)}
                          className="py-2 rounded-xl bg-card border border-border text-foreground font-semibold text-xs flex items-center justify-center gap-1"
                        >
                          <Phone className="h-4 w-4" /> Recordar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </MobileShell>
  );
}
