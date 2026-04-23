import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, ScanLine, Sparkles, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, ReactNode } from "react";

const navItems = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/scan", icon: ScanLine, label: "Escanear" },
  { to: "/search", icon: Sparkles, label: "IA" },
  { to: "/profile", icon: User, label: "Perfil" },
] as const;

export function MobileShell({ children, title }: { children: ReactNode; title?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      {title && (
        <header className="sticky top-0 z-30 bg-gradient-primary text-primary-foreground px-5 pt-5 pb-6 shadow-md">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-display font-bold">{title}</h1>
            <button
              onClick={() => signOut()}
              className="p-2 rounded-full hover:bg-white/10 transition-smooth"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 pb-24 px-4 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border shadow-lg z-40">
        <div className="grid grid-cols-4">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center justify-center gap-1 py-3 transition-smooth relative"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-10 rounded-b-full bg-primary-glow" />
                )}
                <Icon
                  className={`h-5 w-5 transition-smooth ${
                    active ? "text-primary scale-110" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
