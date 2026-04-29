import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, ScanLine, Sparkles, User, LogOut, ShoppingCart, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useEffect, ReactNode } from "react";

const navItems = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/scan", icon: ScanLine, label: "Escanear" },
  { to: "/cart", icon: ShoppingCart, label: "Carrito" },
  { to: "/credits", icon: Receipt, label: "Fiados" },
  { to: "/profile", icon: User, label: "Perfil" },
] as const;

export function MobileShell({ children, title }: { children: ReactNode; title?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { count } = useCart();

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
        <header className="sticky top-0 z-30 bg-gradient-primary text-primary-foreground px-5 pt-5 pb-16 shadow-md">
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

      {/* Floating cart FAB cuando hay items y no estamos ya en el carrito */}
      {count > 0 && location.pathname !== "/cart" && (
        <Link
          to="/cart"
          className="fixed bottom-24 right-4 z-50 bg-primary-glow text-primary-foreground h-14 w-14 rounded-full shadow-glow flex items-center justify-center transition-smooth hover:scale-105"
          aria-label="Ver carrito"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[11px] font-bold h-6 min-w-6 px-1.5 rounded-full flex items-center justify-center border-2 border-background">
            {count}
          </span>
        </Link>
      )}

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border shadow-lg z-40">
        <div className="grid grid-cols-5">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            const isCart = to === "/cart";
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center justify-center gap-1 py-3 transition-smooth relative"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-10 rounded-b-full bg-primary-glow" />
                )}
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 transition-smooth ${
                      active ? "text-primary scale-110" : "text-muted-foreground"
                    }`}
                  />
                  {isCart && count > 0 && (
                    <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </div>
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
