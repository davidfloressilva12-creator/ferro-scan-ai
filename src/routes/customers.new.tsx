import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/customers/new")({
  component: NewCustomerPage,
  head: () => ({ meta: [{ title: "Nuevo cliente — Ferro-Smart" }] }),
});

function NewCustomerPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    document_type: "DNI",
    document_number: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nombre obligatorio");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("customers").insert({
      ...form,
      document_number: form.document_number.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente creado");
    navigate({ to: "/customers" });
  };

  return (
    <MobileShell title="Nuevo cliente">
      <button onClick={() => navigate({ to: "/customers" })} className="-mt-10 mb-4 text-primary-foreground/90 text-sm flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <form onSubmit={submit} className="space-y-3">
        <Field label="Nombre / razón social *">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Tipo doc.">
            <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className={inputCls}>
              <option>DNI</option>
              <option>RUC</option>
              <option>CE</option>
              <option>OTRO</option>
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Número documento">
              <input inputMode="numeric" value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </div>

        <Field label="Teléfono">
          <input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+51 9..." className={inputCls} />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Dirección">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Notas">
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
        </Field>

        <button disabled={saving} className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-bold disabled:opacity-60">
          Guardar cliente
        </button>
      </form>
    </MobileShell>
  );
}

const inputCls = "w-full px-4 py-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">{label}</span>
      {children}
    </label>
  );
}
