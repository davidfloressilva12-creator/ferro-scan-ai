import { forwardRef } from "react";

export type TicketSale = {
  doc_type: "boleta" | "factura";
  doc_full: string;
  customer_name?: string | null;
  customer_document?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

const fmt = (n: number) => n.toFixed(2);

/**
 * Ticket optimizado para impresoras térmicas 58mm (~32 caracteres) / 80mm (~48).
 * Usa fuente monospace, una sola columna y alineación tabular.
 */
export const ThermalTicket = forwardRef<HTMLDivElement, { sale: TicketSale; storeName?: string }>(
  ({ sale, storeName = "FERRO-SMART" }, ref) => {
    const date = new Date(sale.created_at).toLocaleString("es-PE");

    return (
      <div
        ref={ref}
        className="bg-white text-black mx-auto"
        style={{
          width: "302px", // ~80mm @ 96dpi
          padding: "12px",
          fontFamily: "ui-monospace, 'Courier New', monospace",
          fontSize: "12px",
          lineHeight: "1.35",
        }}
      >
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: "14px" }}>{storeName}</div>
        <div style={{ textAlign: "center" }}>Ferretería • R.U.C. 00000000000</div>
        <div style={{ textAlign: "center" }}>Av. Principal 123 - Lima</div>
        <Divider />

        <div style={{ textAlign: "center", fontWeight: 700, textTransform: "uppercase" }}>
          {sale.doc_type === "factura" ? "FACTURA" : "BOLETA"} {sale.doc_full}
        </div>
        <div>Fecha: {date}</div>
        {sale.customer_name && <div>Cliente: {sale.customer_name}</div>}
        {sale.customer_document && <div>Doc: {sale.customer_document}</div>}
        <Divider />

        <Row left="CANT  DESCRIPCION" right="IMPORTE" bold />
        {sale.items.map((it, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            <Row
              left={`${String(it.quantity).padStart(3)} ${truncate(it.product_name, 22)}`}
              right={fmt(it.line_total)}
            />
            <div style={{ paddingLeft: 4, color: "#555" }}>
              x {fmt(it.unit_price)}
            </div>
          </div>
        ))}

        <Divider />
        <Row left="SUBTOTAL" right={fmt(sale.subtotal)} />
        <Row left="IGV (18%)" right={fmt(sale.tax)} />
        <Row left="TOTAL" right={`S/ ${fmt(sale.total)}`} bold />
        <Divider />

        <Row left="MÉTODO" right={sale.payment_method.toUpperCase()} />
        <Row
          left="ESTADO"
          right={sale.status === "pending" ? "FIADO" : "PAGADO"}
          bold
        />
        <Divider />

        <div style={{ textAlign: "center", marginTop: 6 }}>¡Gracias por su compra!</div>
        <div style={{ textAlign: "center", fontSize: "10px", color: "#666" }}>
          Generado por Ferro-Smart
        </div>
      </div>
    );
  },
);
ThermalTicket.displayName = "ThermalTicket";

function Divider() {
  return <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />;
}

function Row({ left, right, bold }: { left: string; right: string; bold?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        fontWeight: bold ? 700 : 400,
      }}
    >
      <span style={{ whiteSpace: "pre" }}>{left}</span>
      <span style={{ whiteSpace: "pre" }}>{right}</span>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
