import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { Search, TrendingUp, Receipt, Calendar } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Analíticas — Ferro-Smart" },
      { name: "description", content: "Panel de control de ventas con gráficos e historial." },
    ],
  }),
});

interface Sale {
  id: string;
  doc_full: string | null;
  doc_type: string;
  doc_series: string;
  doc_number: number;
  customer_name: string | null;
  customer_document: string | null;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  paid_at: string | null;
}

type RangeKey = "today" | "yesterday" | "week" | "month" | "all";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

function getRange(key: RangeKey): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (key === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (key === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  if (key === "week") {
    const f = new Date(now); f.setDate(f.getDate() - 6);
    return { from: startOfDay(f), to: endOfDay(now) };
  }
  if (key === "month") {
    const f = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfDay(f), to: endOfDay(now) };
  }
  return { from: null, to: null };
}

const fmt = (n: number) => `S/ ${n.toFixed(2)}`;

function AnalyticsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("week");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Cargar últimas 500 ventas (suficiente para dashboard móvil)
      const { data } = await supabase
        .from("sales")
        .select("id,doc_full,doc_type,doc_series,doc_number,customer_name,customer_document,total,payment_method,status,created_at,paid_at")
        .order("created_at", { ascending: false })
        .limit(500);
      setSales((data ?? []) as Sale[]);
      setLoading(false);
    };
    load();
  }, []);

  // Filtrado por rango + cliente
  const filtered = useMemo(() => {
    const { from, to } = getRange(range);
    const q = query.trim().toLowerCase();
    return sales.filter((s) => {
      const d = new Date(s.created_at);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (q) {
        const blob = `${s.customer_name ?? ""} ${s.customer_document ?? ""} ${s.doc_full ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [sales, range, query]);

  const totals = useMemo(() => {
    const ingresos = filtered.reduce((acc, s) => acc + Number(s.total || 0), 0);
    const ticketProm = filtered.length ? ingresos / filtered.length : 0;
    return { ingresos, ticketProm, count: filtered.length };
  }, [filtered]);

  // Gráfico: ingresos últimos 7 días
  const last7 = useMemo(() => {
    const days: { label: string; key: string; total: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("es-PE", { weekday: "short" }).replace(".", "");
      days.push({ key, label, total: 0 });
    }
    sales.forEach((s) => {
      const k = new Date(s.created_at).toISOString().slice(0, 10);
      const d = days.find((x) => x.key === k);
      if (d) d.total += Number(s.total || 0);
    });
    return days;
  }, [sales]);

  // Gráfico: comparativo por mes (últimos 6 meses)
  const months6 = useMemo(() => {
    const arr: { label: string; key: string; total: number; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("es-PE", { month: "short" }).replace(".", "");
      arr.push({ key, label, total: 0, count: 0 });
    }
    sales.forEach((s) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = arr.find((x) => x.key === key);
      if (m) { m.total += Number(s.total || 0); m.count += 1; }
    });
    return arr;
  }, [sales]);

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "today", label: "Hoy" },
    { key: "yesterday", label: "Ayer" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mes" },
    { key: "all", label: "Todo" },
  ];

  return (
    <MobileShell title="Analíticas">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 -mt-12 mb-4">
        <div className="bg-card rounded-2xl p-4 shadow-elegant border border-border">
          <TrendingUp className="h-5 w-5 text-primary-glow mb-2" />
          <p className="text-xl font-display font-bold text-foreground">{fmt(totals.ingresos)}</p>
          <p className="text-xs text-muted-foreground">Ingresos</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-elegant border border-border">
          <Receipt className="h-5 w-5 text-primary-glow mb-2" />
          <p className="text-xl font-display font-bold text-foreground">{totals.count}</p>
          <p className="text-xs text-muted-foreground">Ventas · Ticket prom. {fmt(totals.ticketProm)}</p>
        </div>
      </div>

      {/* Gráfico 7 días */}
      <section className="bg-card rounded-2xl p-4 shadow-sm border border-border mb-4">
        <h2 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary-glow" />
          Ingresos últimos 7 días
        </h2>
        <div className="h-48 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={40} />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Gráfico mensual */}
      <section className="bg-card rounded-2xl p-4 shadow-sm border border-border mb-4">
        <h2 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary-glow" />
          Comparativo mensual (6 meses)
        </h2>
        <div className="h-48 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={months6}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={40} />
              <Tooltip
                formatter={(v: number, n: string) => n === "total" ? fmt(v) : v}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" name="Ingresos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="count" name="N° ventas" stroke="hsl(var(--primary-glow))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Filtros */}
      <section className="mb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-xs font-semibold transition-smooth border ${
                range === r.key
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-foreground border-border"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, DNI o boleta..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm shadow-sm"
          />
        </div>
      </section>

      {/* Historial */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-display font-bold text-foreground">
            Historial ({filtered.length})
          </h2>
          <span className="text-xs text-muted-foreground">{fmt(totals.ingresos)}</span>
        </div>

        {loading && (
          <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Sin ventas en este filtro</p>
        )}

        <div className="space-y-2">
          {filtered.map((s) => {
            const isPaid = s.status === "paid";
            const date = new Date(s.created_at);
            return (
              <div key={s.id} className="bg-card rounded-2xl border border-border p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary-glow">
                        {s.doc_full ?? `${s.doc_series}-${String(s.doc_number).padStart(5, "0")}`}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        isPaid ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      }`}>
                        {isPaid ? "Pagado" : "Fiado"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                      {s.customer_name || "Cliente varios"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {date.toLocaleDateString("es-PE")} · {date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} · {s.payment_method}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-display font-bold text-foreground">{fmt(Number(s.total))}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Link to="/" className="block text-center text-xs text-muted-foreground mt-6 underline">
          Volver al inicio
        </Link>
      </section>
    </MobileShell>
  );
}
