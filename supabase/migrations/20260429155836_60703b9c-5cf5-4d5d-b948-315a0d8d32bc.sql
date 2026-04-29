-- Tabla de clientes
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('DNI','RUC','CE','OTRO')),
  document_number TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_document ON public.customers(document_number);
CREATE INDEX idx_customers_name_trgm ON public.customers USING gin (name gin_trgm_ops);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update customers" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete customers" ON public.customers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Secuencias para correlativos
CREATE SEQUENCE IF NOT EXISTS public.boleta_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.factura_seq START 1;

-- Tabla de ventas
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('boleta','factura')),
  doc_series TEXT NOT NULL,
  doc_number INTEGER NOT NULL,
  doc_full TEXT GENERATED ALWAYS AS (doc_series || '-' || lpad(doc_number::text, 5, '0')) STORED,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_document TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo','tarjeta','yape','plin','transferencia','fiado')),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','cancelled')),
  paid_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doc_type, doc_series, doc_number)
);
CREATE INDEX idx_sales_customer ON public.sales(customer_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_created ON public.sales(created_at DESC);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update sales" ON public.sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete sales" ON public.sales FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Items de venta
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_barcode TEXT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view sale_items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update sale_items" ON public.sale_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete sale_items" ON public.sale_items FOR DELETE TO authenticated USING (true);

-- Pagos (para fiados parciales)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'efectivo',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_sale ON public.payments(sale_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth delete payments" ON public.payments FOR DELETE TO authenticated USING (true);

-- Función para obtener correlativo y crear venta atómicamente
CREATE OR REPLACE FUNCTION public.create_sale(
  p_doc_type TEXT,
  p_customer_id UUID,
  p_customer_name TEXT,
  p_customer_document TEXT,
  p_subtotal NUMERIC,
  p_tax NUMERIC,
  p_total NUMERIC,
  p_payment_method TEXT,
  p_status TEXT,
  p_items JSONB
) RETURNS public.sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series TEXT;
  v_number INT;
  v_sale public.sales;
  v_item JSONB;
BEGIN
  IF p_doc_type = 'boleta' THEN
    v_series := 'B001';
    v_number := nextval('public.boleta_seq');
  ELSIF p_doc_type = 'factura' THEN
    v_series := 'F001';
    v_number := nextval('public.factura_seq');
  ELSE
    RAISE EXCEPTION 'doc_type inválido';
  END IF;

  INSERT INTO public.sales (
    doc_type, doc_series, doc_number, customer_id, customer_name, customer_document,
    subtotal, tax, total, payment_method, status,
    paid_at
  ) VALUES (
    p_doc_type, v_series, v_number, p_customer_id, p_customer_name, p_customer_document,
    p_subtotal, p_tax, p_total, p_payment_method, p_status,
    CASE WHEN p_status = 'paid' THEN now() ELSE NULL END
  ) RETURNING * INTO v_sale;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.sale_items (
      sale_id, product_id, product_name, product_barcode,
      quantity, unit_price, line_total
    ) VALUES (
      v_sale.id,
      NULLIF(v_item->>'product_id','')::UUID,
      v_item->>'product_name',
      v_item->>'product_barcode',
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'line_total')::NUMERIC
    );

    -- descontar stock si product_id existe
    IF NULLIF(v_item->>'product_id','') IS NOT NULL THEN
      UPDATE public.products
        SET stock = GREATEST(0, stock - (v_item->>'quantity')::INT)
        WHERE id = (v_item->>'product_id')::UUID;
    END IF;
  END LOOP;

  RETURN v_sale;
END;
$$;

-- Vista de saldo por cliente
CREATE OR REPLACE VIEW public.customer_balances AS
SELECT
  c.id AS customer_id,
  c.name,
  COALESCE(SUM(s.total) FILTER (WHERE s.status = 'pending'), 0)
    - COALESCE((
        SELECT SUM(p.amount)
        FROM public.payments p
        JOIN public.sales s2 ON s2.id = p.sale_id
        WHERE s2.customer_id = c.id AND s2.status = 'pending'
      ), 0) AS balance,
  COUNT(s.id) FILTER (WHERE s.status = 'pending') AS pending_count
FROM public.customers c
LEFT JOIN public.sales s ON s.customer_id = c.id
GROUP BY c.id, c.name;