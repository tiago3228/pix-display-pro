import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  QrCode,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useMyStore } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { to: "/cobrancas", label: "Cobranças", icon: Wallet },

  { to: "/minha-loja", label: "Minha Loja", icon: Store },
  { to: "/qrcodes", label: "QR Codes", icon: QrCode },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/assinatura", label: "Assinatura", icon: CreditCard },
] as const;

const MOBILE_NAV = NAV.slice(0, 4);
const MOBILE_MORE = NAV.slice(4);

export function AppShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: store, isLoading: storeLoading } = useMyStore();

  useEffect(() => {
    if (adminLoading || storeLoading) return;
    if (isAdmin) return;
    if (!store || !store.onboarding_done) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [store, storeLoading, isAdmin, adminLoading, navigate]);


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar px-3 py-4 lg:flex">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-4" />
          </span>
          <span className="font-[family-name:var(--font-display)]">Vitrini</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                pathname === item.to
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                pathname === "/admin"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60",
              )}
            >
              <ShieldCheck className="size-4" /> Administração
            </Link>
          ) : null}
        </nav>
        <Button variant="ghost" className="justify-start" onClick={signOut}>
          <LogOut className="mr-2 size-4" /> Sair
        </Button>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              {pathname === "/dashboard" ? null : (
                <BackButton fallbackTo="/dashboard" iconOnly className="-ml-1 shrink-0" />
              )}
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold">{title}</h1>
                {description ? (
                  <p className="truncate text-xs text-muted-foreground">{description}</p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {action}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Sair"
                onClick={signOut}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-5 pb-24 lg:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                pathname === item.to ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon = BarChart3,
}: {
  label: string;
  value: string;
  icon?: typeof BarChart3;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
