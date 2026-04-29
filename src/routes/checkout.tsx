import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, AlertTriangle, UserPlus, Search, X, Receipt, CreditCard, Banknote, Smartphone, Send, Download } from "lucide-react";
import { ThermalTicket, type TicketSale } from "@/components/ThermalTicket";
import { shareTicketPdf } from "@/lib/share-ticket";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Cobrar — Ferro-Smart" }] }),
});

type CustomerLite = { id: string; name: string; document_number: string | null; phone: string | null };

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, tax, total, docType, setDocType, paymentMethod, setPaymentMethod, customer, setCustomer, clear } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerLite[]>([]);
  const [debt, setDebt] = useState<{ balance: number; count: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<TicketSale | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const ticketRef = useRef<HTMLDivElement>(null);

  // Búsqueda de clientes
  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(async () => {
      const q = query.trim();
      const { data } = q
        ? await supabase.from("customers").select("id,name,document_number,phone").or(`name.ilike.%${q}%,document_number.ilike.%${q}%`).limit(20)
        : await supabase.from("customers").select("id,name,document_number,phone").order("created_at", { ascending: false }).limit(20);
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, searchOpen]);

  // Verificar deuda al seleccionar cliente
  useEffect(() => {
    if (!customer) {
      setDebt(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("customer_balances" as any)
        .select("balance,pending_count")
        .eq("customer_id", customer.id)
        .maybeSingle();
      if (data && Number((data as any).balance) > 0) {
        setDebt({ balance: Number((data as any).balance), count: Number((data as any).pending_count) });
      } else {
        setDebt(null);
      }
      // traer teléfono
      const { data: c } = await supabase.from("customers").select("phone").eq("id", customer.id).maybeSingle();
      setCustomerPhone(c?.phone ?? "");
    })();
  }, [customer]);

  if (items.length === 0 && !completedSale) {
    return (
      <MobileShell title="Cobrar">
        <p className="text-center text-muted-foreground py-12">El carrito está vacío.</p>
        <Link to="/cart" className="block text-center text-primary-glow font-semibold">Volver al carrito</Link>
      </MobileShell>
    );
  }

  const fmt = (n: number) => n.toFixed(2);

  const handleSubmit = async (asCredit: boolean) => {
    if (asCredit && !customer) {
      toast.error("Selecciona un cliente para fiar");
      return;
    }
    if (docType === "factura" && !customer?.document) {
      toast.error("Una factura requiere RUC del cliente");
      return;
    }
    setSubmitting(true);
    const method = asCredit ? "fiado" : paymentMethod;
    const status = asCredit ? "pending" : "paid";

    const itemsPayload = items.map((it) => ({
      product_id: it.product.id,
      product_name: it.product.name,
      product_barcode: it.product.barcode ?? "",
      quantity: it.quantity,
      unit_price: it.product.price,
      line_total: +(it.product.price * it.quantity).toFixed(2),
    }));

    const { data, error } = await supabase.rpc("create_sale" as any, {
      p_doc_type: docType,
      p_customer_id: customer?.id ?? null,
      p_customer_name: customer?.name ?? null,
      p_customer_document: customer?.document ?? null,
      p_subtotal: subtotal,
      p_tax: tax,
      p_total: total,
      p_payment_method: method,
      p_status: status,
      p_items: itemsPayload,
    } as any);

    setSubmitting(false);
    if (error) {
      console.error(error);
      toast.error(error.message);
      return;
    }
    const sale: any = data;
    const ticket: TicketSale = {
      doc_type: sale.doc_type,
      doc_full: sale.doc_full,
      customer_name: sale.customer_name,
      customer_document: sale.customer_document,
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax),
      total: Number(sale.total),
      payment_method: sale.payment_method,
      status: sale.status,
      created_at: sale.created_at,
      items: itemsPayload,
    };
    setCompletedSale(ticket);
    clear();
    toast.success(asCredit ? "Venta fiada registrada" : "Venta registrada");
  };

  const handleShare = async () => {
    if (!ticketRef.current || !completedSale) return;
    try {
      await shareTicketPdf(ticketRef.current, completedSale, customerPhone);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo compartir");
    }
  };

  // Pantalla de éxito + ticket
  if (completedSale) {
    return (
      <MobileShell title="Venta completada">
        <div className="-mt-8 mb-4 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-success/20 text-success mb-3">
            <Receipt className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">{completedSale.doc_full}</h2>
          <p className="text-muted-foreground text-sm">
            {completedSale.status === "pending" ? "Fiado registrado" : "Pago confirmado"} • S/ {fmt(completedSale.total)}
          </p>
        </div>

        <div className="bg-muted rounded-2xl p-3 mb-4 overflow-x-auto">
          <ThermalTicket ref={ticketRef} sale={completedSale} />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button onClick={handleShare} className="py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
            <Send className="h-4 w-4" /> Compartir
          </button>
          <button onClick={handleShare} className="py-3 rounded-2xl bg-card border border-border text-foreground font-semibold flex items-center justify-center gap-2">
            <Download className="h-4 w-4" /> PDF
          </button>
        </div>
        <button onClick={() => navigate({ to: "/" })} className="w-full py-3 rounded-2xl bg-card border border-border text-foreground font-semibold mt-2">
          Nueva venta
        </button>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Cobrar">
      <button onClick={() => navigate({ to: "/cart" })} className="-mt-10 mb-4 text-primary-foreground/90 text-sm flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Volver al carrito
      </button>

      {/* Tipo de documento */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-elegant mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Documento</p>
            <p className="font-display font-bold text-lg text-foreground">{docType === "factura" ? "Factura" : "Boleta"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${docType === "boleta" ? "font-bold text-foreground" : "text-muted-foreground"}`}>Boleta</span>
            <Switch
              checked={docType === "factura"}
              onCheckedChange={(v) => setDocType(v ? "factura" : "boleta")}
            />
            <span className={`text-xs ${docType === "factura" ? "font-bold text-foreground" : "text-muted-foreground"}`}>Factura</span>
          </div>
        </div>
        {docType === "factura" && (
          <p className="text-xs text-muted-foreground mt-2">⚠ Una factura requiere cliente con RUC</p>
        )}
      </div>

      {/* Cliente */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-elegant mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cliente</p>
          {customer && (
            <button onClick={() => setCustomer(null)} className="text-xs text-destructive flex items-center gap-1">
              <X className="h-3 w-3" /> Quitar
            </button>
          )}
        </div>
        {customer ? (
          <>
            <p className="font-semibold text-foreground">{customer.name}</p>
            {customer.document && <p className="text-xs text-muted-foreground">{customer.document}</p>}
          </>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full py-2.5 rounded-xl bg-muted text-foreground text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" /> Buscar / añadir cliente
          </button>
        )}

        {debt && (
          <div className="mt-3 bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-destructive">Saldo pendiente: S/ {fmt(debt.balance)}</p>
              <p className="text-xs text-destructive/80">{debt.count} {debt.count === 1 ? "boleta" : "boletas"} sin pagar</p>
            </div>
          </div>
        )}
      </div>

      {/* Método de pago */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-elegant mb-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Método de pago</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: "efectivo", l: "Efectivo", icon: Banknote },
            { v: "tarjeta", l: "Tarjeta", icon: CreditCard },
            { v: "yape", l: "Yape", icon: Smartphone },
            { v: "plin", l: "Plin", icon: Smartphone },
            { v: "transferencia", l: "Transf.", icon: CreditCard },
          ] as const).map(({ v, l, icon: Icon }) => (
            <button
              key={v}
              onClick={() => setPaymentMethod(v)}
              className={`py-3 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-smooth ${
                paymentMethod === v
                  ? "bg-gradient-primary text-primary-foreground shadow-md"
                  : "bg-muted text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Totales */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-elegant mb-4">
        <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span className="text-foreground">S/ {fmt(subtotal)}</span></div>
        <div className="flex justify-between text-sm text-muted-foreground"><span>IGV</span><span className="text-foreground">S/ {fmt(tax)}</span></div>
        <div className="border-t border-border my-2" />
        <div className="flex justify-between font-bold text-lg text-foreground"><span>Total</span><span>S/ {fmt(total)}</span></div>
      </div>

      <button
        disabled={submitting}
        onClick={() => handleSubmit(false)}
        className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-bold shadow-glow disabled:opacity-60 mb-2"
      >
        Confirmar pago — S/ {fmt(total)}
      </button>
      <button
        disabled={submitting}
        onClick={() => handleSubmit(true)}
        className="w-full py-4 rounded-2xl bg-warning/90 text-foreground font-bold disabled:opacity-60"
      >
        Dejar a cuenta (Fiado)
      </button>

      {/* Modal cliente */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={() => setSearchOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card w-full max-w-md mx-auto rounded-t-3xl p-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display font-bold text-foreground">Seleccionar cliente</h3>
              <button onClick={() => setSearchOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-glow"
            />
            <Link to="/customers/new" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-glow/10 text-primary-glow font-semibold text-sm mb-2">
              <UserPlus className="h-4 w-4" /> Crear nuevo cliente
            </Link>
            <div className="flex-1 overflow-y-auto space-y-1">
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCustomer({ id: c.id, name: c.name, document: c.document_number });
                    setSearchOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-muted transition-smooth"
                >
                  <p className="font-semibold text-foreground text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.document_number ?? "Sin documento"} {c.phone && `• ${c.phone}`}</p>
                </button>
              ))}
              {results.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">Sin resultados</p>
              )}
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
