import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, ScanLine, Camera, X, RefreshCw, Trash2 } from "lucide-react";
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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
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
        {/* Foto del producto */}
        <Field label="Foto del producto">
          {form.image_url ? (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted aspect-video">
              <img src={form.image_url} alt="Producto" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="h-9 w-9 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center"
                  aria-label="Volver a tomar"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_url: "" })}
                  className="h-9 w-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  aria-label="Quitar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="w-full aspect-video rounded-2xl border-2 border-dashed border-border bg-card hover:bg-muted transition-smooth flex flex-col items-center justify-center gap-2 text-muted-foreground"
            >
              <Camera className="h-7 w-7" />
              <span className="text-sm font-semibold">Tomar foto</span>
            </button>
          )}
        </Field>

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
          <div className="flex gap-2">
            <input
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="7501234500011"
              inputMode="numeric"
              className="flex-1 px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="px-4 rounded-xl bg-gradient-primary text-primary-foreground shadow-md hover:shadow-glow transition-smooth flex items-center gap-2 font-semibold text-sm"
              aria-label="Escanear código"
            >
              <ScanLine className="h-5 w-5" />
            </button>
          </div>
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

      {scannerOpen && (
        <BarcodeScannerModal
          onClose={() => setScannerOpen(false)}
          onDetected={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            setScannerOpen(false);
            toast.success(`Código capturado: ${code}`);
          }}
        />
      )}

      {cameraOpen && (
        <CameraCaptureModal
          onClose={() => setCameraOpen(false)}
          onCapture={(dataUrl) => {
            setForm((f) => ({ ...f, image_url: dataUrl }));
            setCameraOpen(false);
            toast.success("Foto guardada");
          }}
        />
      )}
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

function BarcodeScannerModal({ onClose, onDetected }: { onClose: () => void; onDetected: (code: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted || !containerRef.current) return;
        const scanner = new Html5Qrcode("scanner-region-modal");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 180 }, aspectRatio: 1.5 },
          (decoded) => {
            if (navigator.vibrate) navigator.vibrate(80);
            onDetected(decoded);
          },
          () => {},
        );
      } catch (e) {
        console.error(e);
        setError("No se pudo acceder a la cámara. Revisa los permisos.");
      }
    };
    start();
    return () => {
      mounted = false;
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <h2 className="font-display font-bold">Escanear código</h2>
        <button onClick={onClose} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <div id="scanner-region-modal" ref={containerRef} className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[84%] h-[35%] scanner-frame">
            <div className="absolute left-3 right-3 top-2 h-0.5 bg-primary-glow shadow-glow animate-scan" />
          </div>
        </div>
        {error && (
          <div className="absolute inset-x-4 top-4 bg-destructive text-destructive-foreground rounded-xl p-3 text-sm">
            {error}
          </div>
        )}
        <p className="absolute bottom-6 left-0 right-0 text-center text-white text-sm bg-black/50 backdrop-blur mx-auto w-fit px-4 py-2 rounded-full">
          Centra el código en el recuadro
        </p>
      </div>
    </div>
  );
}

function CameraCaptureModal({ onClose, onCapture }: { onClose: () => void; onCapture: (dataUrl: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e) {
        console.error(e);
        setError("No se pudo acceder a la cámara. Revisa los permisos.");
      }
    };
    start();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    // Resize to max 1024px on the long side to keep it light
    const max = 1024;
    const scale = Math.min(1, max / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onCapture(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <h2 className="font-display font-bold">Tomar foto del producto</h2>
        <button onClick={onClose} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        {error && (
          <div className="absolute inset-x-4 top-4 bg-destructive text-destructive-foreground rounded-xl p-3 text-sm">
            {error}
          </div>
        )}
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center">
          <button
            onClick={capture}
            disabled={!ready}
            className="h-20 w-20 rounded-full bg-white border-4 border-primary-glow shadow-2xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-smooth"
            aria-label="Capturar"
          >
            <span className="h-14 w-14 rounded-full bg-primary-glow" />
          </button>
        </div>
      </div>
    </div>
  );
}
