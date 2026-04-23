import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScanLine } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Acceso — Ferro-Smart" },
      { name: "description", content: "Inicia sesión en Ferro-Smart para gestionar tu inventario." },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada! Ya puedes ingresar.");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido a Ferro-Smart");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col px-6 py-10 text-primary-foreground">
      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <ScanLine className="h-6 w-6" />
          </div>
          <span className="text-sm uppercase tracking-[0.25em] opacity-70">Ferretería Inteligente</span>
        </div>
        <h1 className="text-5xl font-display font-bold mb-3 leading-tight">
          Ferro<span className="text-primary-glow">·</span>Smart
        </h1>
        <p className="text-base opacity-80 mb-10">
          Escanea, busca con IA y controla tu inventario desde el bolsillo.
        </p>

        <form onSubmit={handleSubmit} className="bg-card text-foreground rounded-3xl p-6 shadow-elegant space-y-4">
          <div className="flex bg-muted rounded-full p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-smooth ${
                mode === "login" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground"
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-smooth ${
                mode === "signup" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ferreteria.com"
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-md hover:shadow-glow disabled:opacity-50 transition-smooth"
          >
            {loading ? "Procesando..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
