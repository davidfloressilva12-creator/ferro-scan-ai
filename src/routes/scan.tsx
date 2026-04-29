import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Keyboard, X, ScanLine, ShoppingCart, Pause, Play } from "lucide-react";
import { useCart, type CartProduct } from "@/hooks/use-cart";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
  head: () => ({
    meta: [
      { title: "Escáner — Ferro-Smart" },
      { name: "description", content: "Escanea códigos de barras en ráfaga para agregar al carrito de venta." },
    ],
  }),
});

function ScanPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const lastCodeRef = useRef<{ code: string; t: number }>({ code: "", t: 0 });
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [flash, setFlash] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState<"continuous" | "lookup">("continuous");
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const { addItem, count } = useCart();

  const beep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1200;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  const lookup = useCallback(async (code: string) => {
    // Anti-rebote: ignorar mismo código si llegó hace <1.8s
    const now = Date.now();
    if (lastCodeRef.current.code === code && now - lastCodeRef.current.t < 1800) return;
    lastCodeRef.current = { code, t: now };

    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    beep();
    if (navigator.vibrate) navigator.vibrate(60);

    const { data, error } = await supabase
      .from("products")
      .select("id,name,barcode,price,brand,category_id,image_url,stock")
      .eq("barcode", code)
      .maybeSingle();

    if (error) {
      toast.error("Error al buscar el producto");
      return;
    }

    if (!data) {
      toast.error(`Código ${code} no registrado`, {
        action: {
          label: "Crear",
          onClick: () => navigate({ to: "/product/new", search: { barcode: code } }),
        },
      });
      return;
    }

    if (mode === "lookup") {
      navigate({ to: "/product/$id", params: { id: data.id } });
      return;
    }

    // Modo continuo: agregar al carrito
    const product: CartProduct = {
      id: data.id,
      name: data.name,
      barcode: data.barcode,
      price: Number(data.price),
      brand: data.brand,
      category_id: data.category_id,
      image_url: data.image_url,
      stock: data.stock,
    };
    addItem(product, 1);
    setLastAdded(`${data.name} +1`);
    setTimeout(() => setLastAdded(null), 1600);
  }, [addItem, beep, mode, navigate]);

  useEffect(() => {
    if (manualMode || paused) return;

    let mounted = true;
    const start = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted || !containerRef.current) return;
        const scanner = new Html5Qrcode("scanner-region");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 180 }, aspectRatio: 1.5 },
          (decoded) => { lookup(decoded); },
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
        scannerRef.current = null;
      }
    };
  }, [manualMode, paused, lookup]);

  return (
    <MobileShell title="Escáner">
      {/* Toggle modo */}
      <div className="-mt-12 mb-3 flex gap-2 bg-card rounded-2xl p-1 shadow-elegant border border-border">
        <button
          onClick={() => setMode("continuous")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-smooth ${
            mode === "continuous" ? "bg-gradient-primary text-primary-foreground shadow-md" : "text-muted-foreground"
          }`}
        >
          🛒 Ráfaga al carrito
        </button>
        <button
          onClick={() => setMode("lookup")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-smooth ${
            mode === "lookup" ? "bg-gradient-primary text-primary-foreground shadow-md" : "text-muted-foreground"
          }`}
        >
          🔍 Consulta
        </button>
      </div>

      <div className="relative -mx-4">
        {!manualMode ? (
          <div className="relative bg-black aspect-[3/4] overflow-hidden">
            <div id="scanner-region" ref={containerRef} className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/40" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 8% 30%, 8% 70%, 92% 70%, 92% 30%, 8% 30%)" }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[84%] h-[40%] scanner-frame">
                <span />
                {!paused && <div className="absolute left-3 right-3 top-2 h-0.5 bg-primary-glow shadow-glow animate-scan" />}
              </div>
              <div className={`absolute inset-0 ${flash ? "flash-success" : ""}`} />
            </div>

            {error && (
              <div className="absolute inset-x-4 top-4 bg-destructive text-destructive-foreground rounded-xl p-3 text-sm">
                {error}
              </div>
            )}

            {/* Toast inline último agregado */}
            {lastAdded && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-success/95 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur animate-in fade-in slide-in-from-top-2">
                ✓ {lastAdded}
              </div>
            )}

            {paused && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-white text-center">
                  <Pause className="h-12 w-12 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold">Cámara pausada</p>
                </div>
              </div>
            )}

            {/* Controles inferiores */}
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 px-4">
              {mode === "continuous" && (
                <p className="text-white text-xs bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
                  Sigue escaneando — productos se agregan al carrito
                </p>
              )}

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/95 text-foreground px-3 py-3 rounded-2xl text-sm font-semibold shadow-lg"
                >
                  {paused ? <><Play className="h-4 w-4" /> Reanudar</> : <><Pause className="h-4 w-4" /> Pausa</>}
                </button>
                <button
                  onClick={() => setManualMode(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/95 text-foreground px-3 py-3 rounded-2xl text-sm font-semibold shadow-lg"
                >
                  <Keyboard className="h-4 w-4" /> Manual
                </button>
                {mode === "continuous" && count > 0 && (
                  <button
                    onClick={() => navigate({ to: "/cart" })}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary-glow text-primary-foreground px-3 py-3 rounded-2xl text-sm font-bold shadow-lg"
                  >
                    <ShoppingCart className="h-4 w-4" /> Ver ({count})
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-8 bg-gradient-hero text-primary-foreground min-h-[70vh] flex flex-col">
            <button
              onClick={() => setManualMode(false)}
              className="self-start flex items-center gap-2 text-sm opacity-80 mb-6"
            >
              <X className="h-4 w-4" /> Volver al escáner
            </button>

            <div className="flex-1 flex flex-col justify-center">
              <ScanLine className="h-12 w-12 mb-4 opacity-80" />
              <h2 className="text-2xl font-display font-bold mb-2">Ingresar código</h2>
              <p className="opacity-70 mb-6 text-sm">Escribe el código de barras del producto.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualCode.trim()) {
                    lookup(manualCode.trim());
                    setManualCode("");
                  }
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="7501234500011"
                  className="w-full px-5 py-4 rounded-2xl bg-white text-foreground text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-glow"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="w-full py-4 rounded-2xl bg-primary-glow text-primary-foreground font-semibold disabled:opacity-50"
                >
                  {mode === "continuous" ? "Agregar al carrito" : "Buscar producto"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
