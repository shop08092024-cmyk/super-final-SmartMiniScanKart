import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/store/useStore";
import { useNavigate } from "react-router-dom";
import { IndianRupee, TrendingUp, ShoppingBag, Package, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";

const AnalyticsPage = () => {
  const { orders, products } = useStore();
  const navigate = useNavigate();

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  // Today vs Yesterday
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const todayRev = orders.filter(o => new Date(o.createdAt) >= today).reduce((s,o) => s+o.total, 0);
  const yestRev = orders.filter(o => { const d = new Date(o.createdAt); return d >= yesterday && d < today; }).reduce((s,o) => s+o.total, 0);
  const revChange = yestRev > 0 ? ((todayRev - yestRev) / yestRev * 100) : 0;

  // Last 7 days bar chart
  const dailySales = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStr = date.toLocaleDateString("en-IN", { weekday: "short" });
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = dayStart + 86400000;
    const sales = orders.filter((o) => { const t = new Date(o.createdAt).getTime(); return t >= dayStart && t < dayEnd; }).reduce((s, o) => s + o.total, 0);
    const orderCount = orders.filter((o) => { const t = new Date(o.createdAt).getTime(); return t >= dayStart && t < dayEnd; }).length;
    return { name: dayStr, sales: Math.round(sales), orders: orderCount };
  });

  // Payment breakdown - simple list
  const paymentMap: Record<string, number> = {};
  orders.forEach((o) => { paymentMap[o.paymentMethod] = (paymentMap[o.paymentMethod] || 0) + o.total; });
  const paymentTotal = Object.values(paymentMap).reduce((a, b) => a + b, 0);
  const paymentBreakdown = Object.entries(paymentMap)
    .map(([name, value]) => ({ name, value: Math.round(value), pct: paymentTotal > 0 ? Math.round(value / paymentTotal * 100) : 0 }))
    .sort((a, b) => b.value - a.value);

  const paymentColors = ["bg-primary", "bg-accent", "bg-warning", "bg-destructive", "bg-violet-500"];

  // Top products
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach((o) => o.items.forEach((i) => {
    const key = i.productId || i.productName;
    if (!productSales[key]) productSales[key] = { name: i.productName, qty: 0, revenue: 0 };
    productSales[key].qty += i.quantity;
    productSales[key].revenue += i.lineTotal;
  }));
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const maxRevenue = topProducts[0]?.revenue || 1;

  // This month vs last month
  const now = new Date();
  const thisMonthRev = orders.filter(o => { const d = new Date(o.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s,o) => s+o.total, 0);
  const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonthRev = orders.filter(o => { const d = new Date(o.createdAt); return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear(); }).reduce((s,o) => s+o.total, 0);

  const stats = [
    {
      label: "Total Revenue", value: `₹${totalRevenue.toFixed(0)}`, icon: IndianRupee,
      gradient: "from-primary to-primary/80", sub: `This month: ₹${thisMonthRev.toFixed(0)}`,
      trend: lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev * 100).toFixed(0) : null,
    },
    {
      label: "Total Orders", value: String(totalOrders), icon: ShoppingBag,
      gradient: "from-accent to-accent/80", sub: `Avg ₹${avgOrderValue.toFixed(0)} per order`,
      trend: null,
    },
    {
      label: "Today's Sales", value: `₹${todayRev.toFixed(0)}`, icon: TrendingUp,
      gradient: "from-warning to-warning/80", sub: `Yesterday: ₹${yestRev.toFixed(0)}`,
      trend: revChange !== 0 ? revChange.toFixed(0) : null,
    },
    {
      label: "Low Stock Items", value: String(lowStockCount), icon: Package,
      gradient: "from-destructive to-destructive/80", sub: `${products.length} total products`,
      trend: null, clickable: true,
    },
  ];

  return (
    <div className="page-container pb-8">
      <div className="mb-6 animate-fade-in">
        <h1 className="page-title">Analytics</h1>
        <p className="text-sm text-muted-foreground">Your business at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, gradient, sub, trend, clickable }, i) => (
          <Card
            key={label}
            className={`border-none shadow-soft transition-all duration-200 hover:shadow-medium animate-slide-up ${clickable ? "cursor-pointer active:scale-[0.97]" : ""}`}
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={clickable ? () => navigate("/products?filter=lowstock") : undefined}
          >
            <CardContent className="p-4">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}>
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{value}</p>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              {sub && (
                <div className="mt-1.5 flex items-center gap-1">
                  {trend !== null ? (
                    Number(trend) >= 0
                      ? <ArrowUpRight className="h-3 w-3 text-accent" />
                      : <ArrowDownRight className="h-3 w-3 text-destructive" />
                  ) : null}
                  <p className={`text-[10px] font-medium ${trend !== null ? (Number(trend) >= 0 ? "text-accent" : "text-destructive") : "text-muted-foreground"}`}>
                    {trend !== null ? `${Number(trend) > 0 ? "+" : ""}${trend}% vs last` : sub}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Sales Bar Chart */}
      <Card className="mb-5 border-none shadow-soft animate-slide-up" style={{ animationDelay: "200ms" }}>
        <CardContent className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Sales This Week</p>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Each bar = total ₹ collected that day</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailySales} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215,16%,47%)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px -4px rgba(0,0,0,0.12)", fontSize: 12 }}
                formatter={(v: number) => [`₹${v}`, "Sales"]}
                cursor={{ fill: "hsl(221,83%,53%,0.05)" }}
              />
              <Bar dataKey="sales" fill="hsl(221,83%,53%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Orders per day */}
      <Card className="mb-5 border-none shadow-soft animate-slide-up" style={{ animationDelay: "240ms" }}>
        <CardContent className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Orders Per Day</p>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">How many bills were made each day</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={dailySales} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215,16%,47%)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px -4px rgba(0,0,0,0.12)", fontSize: 12 }}
                formatter={(v: number) => [v, "Orders"]}
              />
              <Line dataKey="orders" stroke="hsl(160,84%,39%)" strokeWidth={2.5} dot={{ fill: "hsl(160,84%,39%)", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment Breakdown */}
      <Card className="mb-5 border-none shadow-soft animate-slide-up" style={{ animationDelay: "280ms" }}>
        <CardContent className="p-4">
          <p className="text-sm font-bold text-foreground mb-1">How Customers Pay</p>
          <p className="text-xs text-muted-foreground mb-4">Payment method breakdown by revenue</p>
          {paymentBreakdown.length > 0 ? (
            <div className="space-y-3">
              {paymentBreakdown.map(({ name, value, pct }, i) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${paymentColors[i % paymentColors.length]}`} />
                      <span className="text-sm font-medium text-foreground capitalize">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">₹{value}</span>
                      <span className="text-xs font-bold text-foreground">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${paymentColors[i % paymentColors.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No payment data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Top Selling Products */}
      <Card className="border-none shadow-soft animate-slide-up" style={{ animationDelay: "320ms" }}>
        <CardContent className="p-4">
          <p className="text-sm font-bold text-foreground mb-1">Best Selling Products</p>
          <p className="text-xs text-muted-foreground mb-4">Ranked by total revenue generated</p>
          <div className="space-y-4">
            {topProducts.map((p, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold text-white ${i === 0 ? "bg-yellow-400" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-600" : "bg-primary/60"}`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.qty} units sold</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-foreground">₹{p.revenue}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="py-8 text-center">
                <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No sales data yet</p>
                <p className="text-xs text-muted-foreground/60">Start scanning to see analytics</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
