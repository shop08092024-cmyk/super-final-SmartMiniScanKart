import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ScanBarcode } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ShopProfileProvider } from "@/context/ShopProfileContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import EmployeeDashboardPage from "@/pages/EmployeeDashboardPage";
import ScanPage from "@/pages/ScanPage";
import CartPage from "@/pages/CartPage";
import OrdersPage from "@/pages/OrdersPage";
import SettingsPage from "@/pages/SettingsPage";
import ProductsPage from "@/pages/ProductsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import CustomersPage from "@/pages/CustomersPage";
import CreditsPage from "@/pages/CreditsPage";
import EmployeesPage from "@/pages/EmployeesPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import OnboardingPage from "@/pages/OnboardingPage";
import NotFound from "@/pages/NotFound";
import BarcodePrintPage from "@/pages/BarcodePrintPage";
import { useStore } from "@/store/useStore";
import { useCreditStore } from "@/store/useCreditStore";

const queryClient = new QueryClient();

function DataLoader({ children }: { children: React.ReactNode }) {
  const { session, role, employeeInfo } = useAuth();
  const fetchAll = useStore((s) => s.fetchAll);
  const fetchCredits = useCreditStore((s) => s.fetchCredits);

  useEffect(() => {
    if (session && role !== "onboarding") {
      // If employee, wait until employeeInfo is loaded to get shopOwnerId
      if (role === "employee" && !employeeInfo) return;

      // If employee, load shop owner's data; if admin, load own data
      const shopOwnerId = employeeInfo?.shopOwnerId ?? undefined;
      fetchAll(shopOwnerId).catch((err) => console.error("Initial data fetch failed:", err));
      // Credits only relevant for admin
      if (!employeeInfo) {
        fetchCredits().catch((err) => console.error("Credits fetch failed:", err));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, employeeInfo, role]);

  return <>{children}</>;
}

const AppRoutes = () => {
  const { session, role, loading } = useAuth();
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowTroubleshoot(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowTroubleshoot(true);
    }, 40000);
    return () => clearTimeout(timer);
  }, [loading]);

  const capturedErrors = (window as any).__capturedErrors || [];

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-6 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center animate-fade-in text-center max-w-md w-full">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary relative">
            <div className="absolute inset-0 rounded-3xl border border-primary/30 animate-ping opacity-75" />
            <div className="absolute inset-0 rounded-3xl border-4 border-primary/20 border-t-primary animate-spin" />
            <ScanBarcode className="h-10 w-10 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">MiniScanKart</h2>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground animate-pulse">Loading workspace...</p>

          {showTroubleshoot && (
            <div className="mt-8 p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-md text-left animate-slide-up space-y-3 w-full shadow-lg">
              <h3 className="text-sm font-bold text-foreground">Trouble connecting?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If the workspace doesn't load shortly, it might be due to a connection drop or a database schema mismatch.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>To manually reset a stuck session:</strong> Open your browser's Developer Tools (press F12), go to the **Console** tab, paste the following command, and press Enter:
                <code className="block mt-1.5 p-2 bg-secondary/80 rounded font-mono text-[10px] select-all break-all">
                  localStorage.clear(); sessionStorage.clear(); location.reload();
                </code>
              </p>
              
              {capturedErrors.length > 0 && (
                <div className="max-h-28 overflow-y-auto rounded-xl bg-destructive/5 border border-destructive/10 p-3 text-[11px] font-mono text-destructive">
                  <div className="font-semibold mb-1">Captured Errors:</div>
                  {capturedErrors.map((err: string, i: number) => (
                    <div key={i} className="border-b border-destructive/5 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0 leading-normal">{err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? (role === "employee" ? "/employee/dashboard" : role === "admin" ? "/dashboard" : "/onboarding") : "/login"} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleProtectedRoute allowedRoles={["onboarding"]} />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
        <Route element={<AppShell />}>
          <Route element={<RoleProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/subscription" element={<SubscriptionPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/new" element={<ProductsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/credits" element={<CreditsPage />} />
            <Route path="/sticker-print" element={<BarcodePrintPage />} />
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={["employee"]} />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
            <Route path="/employee/scan" element={<ScanPage />} />
            <Route path="/employee/cart" element={<CartPage />} />
            <Route path="/employee/products" element={<ProductsPage employeeView />} />
            <Route path="/employee/orders" element={<OrdersPage />} />
            <Route path="/employee/customers" element={<CustomersPage />} />
            <Route path="/employee/settings" element={<SettingsPage employeeView />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <ShopProfileProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <DataLoader>
                <AppRoutes />
              </DataLoader>
            </BrowserRouter>
          </TooltipProvider>
        </ShopProfileProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
