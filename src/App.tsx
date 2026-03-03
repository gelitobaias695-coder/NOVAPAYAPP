import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import AdminLayout from "@/components/layout/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import AbandonedCarts from "./pages/AbandonedCarts";
import Analytics from "./pages/Analytics";
import Cards from "./pages/Cards";
import Settings from "./pages/Settings";
import Checkouts from "./pages/Checkouts";
import Integrations from "./pages/Integrations";
import Checkout from "./pages/Checkout";
import CheckoutPage from "./pages/CheckoutPage";
import SuccessPage from "./pages/Success";
import NotFound from "./pages/NotFound";
import MetaPixel from "./components/MetaPixel";
import { AuthProvider } from "./contexts/AuthContext";
import { PlatformProvider, usePlatform } from "./contexts/PlatformContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

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
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* New DB-backed checkout — matches product UUID */}
                <Route path="/checkout/:id" element={<CheckoutPage />} />
                <Route path="/checkout/sucesso" element={<SuccessPage />} />
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
            </BrowserRouter>
          </AuthProvider>
        </CurrencyProvider>
      </PlatformProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
