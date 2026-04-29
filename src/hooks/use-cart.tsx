import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";

export type CartProduct = {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  brand?: string | null;
  category_id?: string | null;
  image_url?: string | null;
  stock?: number;
};

export type CartItem = {
  product: CartProduct;
  quantity: number;
};

export type DocType = "boleta" | "factura";
export type PaymentMethod = "efectivo" | "tarjeta" | "yape" | "plin" | "transferencia" | "fiado";

type CartCtx = {
  items: CartItem[];
  docType: DocType;
  paymentMethod: PaymentMethod;
  customer: { id: string; name: string; document?: string | null } | null;
  setDocType: (t: DocType) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  setCustomer: (c: CartCtx["customer"]) => void;
  addItem: (p: CartProduct, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  tax: number;
  total: number;
};

const CartContext = createContext<CartCtx | null>(null);

const STORAGE_KEY = "ferro-cart-v1";
const TAX_RATE = 0.18; // IGV Perú; ajustable

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [docType, setDocType] = useState<DocType>("boleta");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [customer, setCustomer] = useState<CartCtx["customer"]>(null);

  // hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setItems(parsed.items ?? []);
        setDocType(parsed.docType ?? "boleta");
        setPaymentMethod(parsed.paymentMethod ?? "efectivo");
        setCustomer(parsed.customer ?? null);
      }
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ items, docType, paymentMethod, customer }),
      );
    } catch {}
  }, [items, docType, paymentMethod, customer]);

  const addItem = useCallback((p: CartProduct, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((it) => it.product.id === p.id);
      if (found) {
        return prev.map((it) =>
          it.product.id === p.id ? { ...it, quantity: it.quantity + qty } : it,
        );
      }
      return [...prev, { product: p, quantity: qty }];
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((it) => it.product.id !== productId)
        : prev.map((it) =>
            it.product.id === productId ? { ...it, quantity: qty } : it,
          ),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setCustomer(null);
    setDocType("boleta");
    setPaymentMethod("efectivo");
  }, []);

  const { subtotal, tax, total, count } = useMemo(() => {
    const totalGross = items.reduce((s, it) => s + it.product.price * it.quantity, 0);
    // Asumimos precios incluyen IGV; desglosamos
    const sub = totalGross / (1 + TAX_RATE);
    const t = totalGross - sub;
    return {
      subtotal: +sub.toFixed(2),
      tax: +t.toFixed(2),
      total: +totalGross.toFixed(2),
      count: items.reduce((s, it) => s + it.quantity, 0),
    };
  }, [items]);

  const value: CartCtx = {
    items,
    docType,
    paymentMethod,
    customer,
    setDocType,
    setPaymentMethod,
    setCustomer,
    addItem,
    updateQty,
    removeItem,
    clear,
    count,
    subtotal,
    tax,
    total,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
