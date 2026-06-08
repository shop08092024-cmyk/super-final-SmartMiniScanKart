import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ScanBarcode, ShoppingCart, CreditCard, Settings, Users, ClipboardList, UserCircle, Package, Tag } from "lucide-react";
import { useCreditStore } from "@/store/useCreditStore";
import { useAuth } from "@/context/AuthContext";

const adminNavItems = [
  { path: "/dashboard", label: "Home", icon: LayoutDashboard },
  { path: "/scan", label: "Scan", icon: ScanBarcode },
  { path: "/cart", label: "Cart", icon: ShoppingCart },
  { path: "/sticker-print", label: "Stickers", icon: Tag },
  { path: "/credits", label: "Credits", icon: CreditCard },
  { path: "/settings", label: "Settings", icon: Settings },
];

const employeeNavItems = [
  { path: "/employee/dashboard", label: "Home", icon: LayoutDashboard },
  { path: "/employee/scan", label: "Scan", icon: ScanBarcode },
  { path: "/employee/products", label: "Products", icon: Package },
  { path: "/employee/cart", label: "Cart", icon: ShoppingCart },
  { path: "/employee/orders", label: "Orders", icon: ClipboardList },
  { path: "/employee/settings", label: "Profile", icon: UserCircle },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const credits = useCreditStore((s) => s.credits);
  const navItems = role === "employee" ? employeeNavItems : adminNavItems;
  const overdueCount = role === "employee" ? 0 : credits.filter((c) => {
    if (c.status === "paid" || !c.dueDate) return false;
    return new Date(c.dueDate) < new Date();
  }).length;

  const isPathActive = (path: string) => {
    // Exact match first
    if (location.pathname === path) return true;
    // For non-root paths, allow sub-route matching but only if path is longer than base
    if (path !== "/" && location.pathname.startsWith(path + "/")) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-card/95 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = isPathActive(path);
          const showBadge = path === "/credits" && overdueCount > 0;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-all duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                isActive ? "bg-primary/10" : ""
              }`}>
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                {showBadge && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {overdueCount > 9 ? "9+" : overdueCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
