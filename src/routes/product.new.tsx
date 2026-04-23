import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  barcode: z.string().optional(),
});

export const Route = createFileRoute("/product/new")({
  component: NewProduct,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Nuevo producto — Ferro-Smart" }] }),
});

function NewProduct() {
  const navigate = useNavigate();
  const { barcode: presetBarcode } = Route.useSearch();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    barcode: presetBarcode ?? "",
    price: "",
    stock: "0",
    brand: "",
    category_id: "",
    image_url: "",
    description: "",
  });

  useEffect(() => {
    supabase.from("categories").select("id,name").order("name").then(({ data }) => {
      setCategories(data ?? []);
      if (data?.[0] && !form.category_id) setForm((f) => ({ ...f, category_id: data[0].id }));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: form.name,
        barcode: form.barcode || null,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        brand: form.brand || null,
        category_id: form.category_id || null,
        image_url: form.image_url || null,
        description: form.description || null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Ese código ya existe" : "Error al crear");
      return;
    }
    toast.success("Producto creado");
    navigate({ to: "/product/$id", params: { id: data.id } });
  };

  return (
    <MobileShell>
      <div className="flex items-center justify-between mb-5">
        <Link to="/" className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
        <h1 className="text-lg font-display font-bold text-foreground">Nuevo producto</h1>
        <div className="w-10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nombre" required>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Martillo de Carpintero 16oz"
            className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </Field>

        <Field label="Código de barras">
          <input
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            placeholder="7501234500011"
            inputMode="numeric"
            className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio" required>
            <input
              required
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="12500"
              className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </Field>
          <Field label="Stock">
            <input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </Field>
        </div>

        <Field label="Marca">
          <input
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            placeholder="Stanley"
            className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </Field>

        <Field label="Categoría">
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        <Field label="URL de imagen">
          <input
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </Field>

        <Field label="Descripción">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
          />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold shadow-md hover:shadow-glow transition-smooth disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {saving ? "Creando..." : "Crear producto"}
        </button>
      </form>
    </MobileShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
