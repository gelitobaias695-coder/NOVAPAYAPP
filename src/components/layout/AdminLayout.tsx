import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  ShoppingBag,
  Menu,
  X,
  Globe,
  ChevronDown,
  CreditCard,
  Plug,
  LogOut,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { currencies } from "@/lib/currency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import RevenueProgress from "@/components/dashboard/RevenueProgress";

const navItems = [
  { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/products", icon: Package, label: "Produtos" },
  { path: "/admin/orders", icon: ShoppingCart, label: "Pedidos" },
  { path: "/admin/abandoned", icon: ShoppingBag, label: "Abandonados" },
  { path: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/admin/cards", icon: CreditCard, label: "Cartões / Dados" },
  { path: "/admin/checkouts", icon: Globe, label: "Checkouts" },
  { path: "/admin/integrations", icon: Plug, label: "Integrações" },
  { path: "/admin/settings", icon: Settings, label: "Configurações" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { currency, setCurrency } = useCurrency();
  const { user, logout } = useAuth();
  const { settings } = usePlatform();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="NovaPay Logo" className="h-10 w-auto object-contain" />
            ) : (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shrink-0">
                  <span className="text-sm font-bold text-white">N</span>
                </div>
                <span className="text-lg font-bold text-sidebar-accent-foreground">
                  NovaPay
                </span>
              </>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm shadow-primary/10"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary shrink-0">
                <span className="text-xs font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-sidebar-foreground truncate">
                  {user?.email || "admin@novapay.co"}
                </p>
              </div>
              <button
                onClick={logout}
                className="text-sidebar-foreground hover:text-destructive transition-colors shrink-0 p-1"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 btn-interactive">
                <Globe className="h-4 w-4" />
                <span>{currency.flag} {currency.code}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              {currencies.map((c) => (
                <DropdownMenuItem
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className="gap-2"
                >
                  <span>{c.flag}</span>
                  <span>{c.code}</span>
                  <span className="text-muted-foreground text-xs">- {c.country}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <RevenueProgress />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
