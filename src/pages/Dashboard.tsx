import { useEffect, useState } from "react";
import { IndianRupee, TrendingUp, ShoppingBag, Package, ScanBarcode, Plus, BarChart3, Users, AlertTriangle, ArrowUpRight, Crown, ArrowDownRight, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useStore } from "@/store/useStore";
import { useShopProfile } from "@/context/ShopProfileContext";
import { supabase } from "@/lib/supabase";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good Morning", emoji: "☀️" };
  if (h < 17) return { text: "Good Afternoon", emoji: "👋" };
  return { text: "Good Evening", emoji: "🌙" };
};

interface EmployeeSummaryRecord {
  id: string;
  name: string;
  status: string;
  opening_balance: number;
  collected_amount: number;
  due_amount: number;
  orders_today: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders, products, cart } = useStore();
  const { isTrialing, trialDaysLeft } = useSubscription();
  const { profile } = useShopProfile();
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeSummaryRecord[]>([]);

  useEffect(() => {
    const loadEmployeeSummaries = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, status, opening_balance, collected_amount, due_amount, orders_today")
        .eq("shop_owner_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!error) {
        setEmployeeSummaries((data ?? []) as EmployeeSummaryRecord[]);
      }
    };
    void loadEmployeeSummaries();
  }, [user]);

  const greeting = getGreeting();
  const displayName = profile?.ownerName || profile?.shopName || "there";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart);
  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  const yesterdaySales = orders.filter(o => {
    const d = new Date(o.createdAt); return d >= yesterdayStart && d < todayStart;
  }).reduce((s, o) => s + o.total, 0);

  const monthRevenue = orders.filter(o => new Date(o.createdAt) >= monthStart).reduce((s, o) => s + o.total, 0);
  const lastMonthRevenue = orders.filter(o => {
    const d = new Date(o.createdAt); return d >= lastMonthStart && d < lastMonthEnd;
  }).reduce((s, o) => s + o.total, 0);

  const revenueChange = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales * 100) : null;
  const monthChange = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : null;

  const lowStockItems = products.filter(p => p.stock <= p.minStock && p.stock > 0);
  const outOfStockItems = products.filter(p => p.stock === 0);
  const lowStock = lowStockItems.length + outOfStockItems.length;

  const stats = [
    {
      label: "Today's Sales", value: `₹${todaySales.toFixed(0)}`,
      icon: IndianRupee, change: revenueChange !== null ? `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(0)}% vs yesterday` : `${todayOrders.length} orders today`,
      up: revenueChange !== null ? revenueChange >= 0 : true,
      color: "from-primary to-primary/80", path: "/analytics",
    },
    {
      label: "This Month", value: `₹${monthRevenue.toFixed(0)}`,
      icon: TrendingUp, change: monthChange !== null ? `${monthChange >= 0 ? "+" : ""}${monthChange.toFixed(0)}% vs last month` : "All time earnings",
      up: monthChange !== null ? monthChange >= 0 : true,
      color: "from-accent to-accent/80", path: "/analytics",
    },
    {
      label: "Total Orders", value: String(orders.length),
      icon: ShoppingBag, change: `${todayOrders.length} today`,
      up: true,
      color: "from-success to-success/80", path: "/orders",
    },
    {
      label: "Products", value: String(products.length),
      icon: Package, change: lowStock > 0 ? `${lowStock} need restock` : "All well stocked",
      up: lowStock === 0,
      color: "from-warning to-warning/80", path: lowStock > 0 ? "/products?filter=lowstock" : "/products",
    },
  ];

  const quickActions = [
    { label: "Add Product", icon: Plus, path: "/products", color: "bg-primary/10 text-primary" },
    { label: "Analytics", icon: BarChart3, path: "/analytics", color: "bg-accent/10 text-accent" },
    { label: "Customers", icon: Users, path: "/customers", color: "bg-success/10 text-success" },
    { label: "Employees", icon: Users, path: "/employees", color: "bg-warning/10 text-warning" },
    { label: "Orders", icon: ShoppingBag, path: "/orders", color: "bg-destructive/10 text-destructive" },
  ];

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{greeting.text} {greeting.emoji}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {displayName !== "there" ? displayName : "MiniScanKart"}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          {cart.length > 0 && (
            <button onClick={() => navigate("/cart")} className="relative rounded-xl bg-card p-2.5 shadow-soft transition-all hover:shadow-medium">
              <ShoppingBag className="h-5 w-5 text-foreground" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full gradient-primary text-[10px] font-bold text-primary-foreground shadow-sm">{cart.length}</span>
            </button>
          )}
          {lowStock > 0 && (
            <button onClick={() => navigate("/products?filter=lowstock")}>
              <Badge variant="destructive" className="gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium shadow-soft cursor-pointer">
                <AlertTriangle className="h-3 w-3" /> {lowStock} low
              </Badge>
            </button>
          )}
        </div>
      </div>

      {/* Trial / Plan Banner */}
      {isTrialing && trialDaysLeft <= 7 && (
        <div
          className="mb-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 px-4 py-3 animate-slide-up cursor-pointer"
          onClick={() => navigate("/settings/subscription")}
        >
          <div className="flex items-center gap-2.5">
            <Crown className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs font-bold text-foreground">Trial ends in {trialDaysLeft} days</p>
              <p className="text-[11px] text-muted-foreground">Upgrade to keep all features</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary">Upgrade →</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, change, up, color, path }, i) => (
          <Card
            key={label}
            className="group border-none shadow-soft transition-all duration-300 hover:shadow-medium animate-slide-up cursor-pointer active:scale-[0.97]"
            style={{ animationDelay: `${i * 80}ms` }}
            onClick={() => navigate(path)}
          >
            <CardContent className="p-4">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-sm`}>
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{value}</p>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <div className="mt-1.5 flex items-center gap-1">
                {up ? (
                  <ArrowUpRight className="h-3 w-3 text-accent" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-destructive" />
                )}
                <p className={`text-[11px] font-medium ${up ? "text-accent" : "text-destructive"}`}>{change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock / Out of Stock Alert */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Stock Alerts
            </p>
            <button onClick={() => navigate("/products?filter=lowstock")} className="text-xs font-semibold text-primary">View all →</button>
          </div>
          <div className="space-y-2">
            {outOfStockItems.slice(0, 2).map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
              </div>
            ))}
            {lowStockItems.slice(0, 2).map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning/5 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <Badge className="text-[10px] bg-warning/20 text-warning border-0">{p.stock} left</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Scan CTA */}
      <button
        onClick={() => navigate("/scan")}
        className="mb-5 flex w-full items-center justify-between rounded-2xl gradient-primary p-4 shadow-glow-primary transition-all hover:shadow-lg active:scale-[0.98] animate-slide-up"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <ScanBarcode className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-extrabold text-white">Quick Scan & Bill</p>
            <p className="text-xs text-white/80">Scan products to add to cart</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-white/80" />
      </button>

      {/* Quick Actions */}
      <div className="mb-5 animate-slide-up">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</p>
        <div className="grid grid-cols-5 gap-2">
          {quickActions.map(({ label, icon: Icon, path, color }) => (
            <button key={label} onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 shadow-soft transition-all hover:shadow-medium active:scale-[0.95]">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Employee Summary */}
      {employeeSummaries.length > 0 && (
        <div className="mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff Today</p>
            <button onClick={() => navigate("/employees")} className="text-xs font-semibold text-primary">Manage →</button>
          </div>
          <div className="space-y-2">
            {employeeSummaries.slice(0, 3).map(emp => (
              <Card key={emp.id} className="border-none shadow-soft">
                <CardContent className="flex items-center gap-3 p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary text-sm font-bold text-primary-foreground">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.orders_today} orders · ₹{Number(emp.collected_amount ?? 0).toLocaleString("en-IN")} collected</p>
                  </div>
                  {Number(emp.due_amount) > 0 && (
                    <Badge variant="destructive" className="text-[10px] shrink-0">₹{Number(emp.due_amount)} due</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Orders</p>
            <button onClick={() => navigate("/orders")} className="text-xs font-semibold text-primary">View all →</button>
          </div>
          <div className="space-y-2">
            {recentOrders.map(o => (
              <Card key={o.id} className="border-none shadow-soft cursor-pointer hover:shadow-medium transition-all" onClick={() => navigate("/orders")}>
                <CardContent className="flex items-center gap-3 p-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {o.customerName ? ` · ${o.customerName}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold">₹{o.total.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">{o.paymentMethod}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
