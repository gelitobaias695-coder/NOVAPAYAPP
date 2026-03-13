import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { AuthProvider } from "./contexts/AuthContext";
import { PlatformProvider, usePlatform } from "./contexts/PlatformContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import MetaPixel from "./components/MetaPixel";
import { Loader2 } from "lucide-react";

// Lazy load components
const AdminLayout = lazy(() => import("@/components/layout/AdminLayout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Orders = lazy(() => import("./pages/Orders"));
const AbandonedCarts = lazy(() => import("./pages/AbandonedCarts"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Cards = lazy(() => import("./pages/Cards"));
const Settings = lazy(() => import("./pages/Settings"));
const Checkouts = lazy(() => import("./pages/Checkouts"));
const Integrations = lazy(() => import("./pages/Integrations"));
import Checkout from "./pages/Checkout";
import CheckoutPage from "./pages/CheckoutPage";
import SuccessPage from "./pages/Success";
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const DynamicFavicon = () => {
  const { settings } = usePlatform();

  useEffect(() => {
    if (settings?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings?.favicon_url]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PlatformProvider>
        <CurrencyProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <DynamicFavicon />
              <MetaPixel />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Auth Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* New DB-backed checkout — matches product UUID */}
                  <Route path="/checkout/sucesso" element={<SuccessPage />} />
                  <Route path="/checkout/:id" element={<CheckoutPage />} />
                  {/* Legacy mock checkout kept for backward-compat */}
                  <Route path="/checkout/t/:slug" element={<Checkout />} />
                  <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

                  {/* Protected Admin Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route
                      path="/admin/*"
                      element={
                        <AdminLayout>
                          <Routes>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/products" element={<Products />} />
                            <Route path="/orders" element={<Orders />} />
                            <Route path="/abandoned" element={<AbandonedCarts />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/cards" element={<Cards />} />
                            <Route path="/checkouts" element={<Checkouts />} />
                            <Route path="/integrations" element={<Integrations />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </AdminLayout>
                      }
                    />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </CurrencyProvider>
      </PlatformProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
