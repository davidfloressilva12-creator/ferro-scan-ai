import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Mail, Shield } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Perfil — Ferro-Smart" }] }),
});

function ProfilePage() {
  const { user, signOut } = useAuth();

  return (
    <MobileShell title="Perfil">
      <div className="-mt-2 bg-gradient-primary text-primary-foreground rounded-3xl p-6 shadow-elegant mb-6">
        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-display font-bold mb-3">
          {user?.email?.[0].toUpperCase() ?? "U"}
        </div>
        <p className="text-xs uppercase tracking-wider opacity-70">Administrador</p>
        <p className="text-lg font-display font-semibold">{user?.email}</p>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border">
          <Mail className="h-5 w-5 text-primary-glow" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium text-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border">
          <Shield className="h-5 w-5 text-primary-glow" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Rol</p>
            <p className="text-sm font-medium text-foreground">Admin (acceso completo)</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => signOut()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-destructive text-destructive-foreground font-semibold shadow-md"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </MobileShell>
  );
}
