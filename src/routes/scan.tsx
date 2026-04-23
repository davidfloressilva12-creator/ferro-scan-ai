import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Keyboard, X, ScanLine } from "lucide-react";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
  head: () => ({
    meta: [
      { title: "Escáner — Ferro-Smart" },
      { name: "description", content: "Escanea códigos de barras con la cámara para encontrar productos." },
    ],
  }),
});

function ScanPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);

  const lookup = async (code: string) => {
    if (busy) return;
    setBusy(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);

    // beep
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

    if (navigator.vibrate) navigator.vibrate(80);

    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("barcode", code)
      .maybeSingle();

    if (error) {
      toast.error("Error al buscar el producto");
      setBusy(false);
      return;
    }
    if (data) {
      navigate({ to: "/product/$id", params: { id: data.id } });
    } else {
      toast.error(`Código ${code} no encontrado`, {
        action: {
          label: "Crear",
          onClick: () => navigate({ to: "/product/new", search: { barcode: code } }),
        },
      });
      setTimeout(() => setBusy(false), 1500);
    }
  };

  useEffect(() => {
    if (manualMode) return;

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
          (decoded) => {
            lookup(decoded);
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
  }, [manualMode]);

  return (
    <MobileShell title="Escáner">
      <div className="relative -mx-4 -mt-4">
        {!manualMode ? (
          <div className="relative bg-black aspect-[3/4] overflow-hidden">
            <div id="scanner-region" ref={containerRef} className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

            {/* Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/40" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 8% 30%, 8% 70%, 92% 70%, 92% 30%, 8% 30%)" }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[84%] h-[40%] scanner-frame">
                <span />
                <div className="absolute left-3 right-3 top-2 h-0.5 bg-primary-glow shadow-glow animate-scan" />
              </div>
              <div className={`absolute inset-0 ${flash ? "flash-success" : ""}`} />
            </div>

            {error && (
              <div className="absolute inset-x-4 top-4 bg-destructive text-destructive-foreground rounded-xl p-3 text-sm">
                {error}
              </div>
            )}

            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 px-6">
              <p className="text-white text-sm font-medium text-center bg-black/50 backdrop-blur px-4 py-2 rounded-full">
                Centra el código de barras en el recuadro
              </p>
              <button
                onClick={() => setManualMode(true)}
                className="flex items-center gap-2 bg-white text-foreground px-5 py-3 rounded-full font-semibold shadow-lg"
              >
                <Keyboard className="h-4 w-4" />
                Ingresar código manualmente
              </button>
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
              <p className="opacity-70 mb-6 text-sm">
                Escribe el código de barras del producto.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualCode.trim()) lookup(manualCode.trim());
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
                  disabled={!manualCode.trim() || busy}
                  className="w-full py-4 rounded-2xl bg-primary-glow text-primary-foreground font-semibold disabled:opacity-50"
                >
                  Buscar producto
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
