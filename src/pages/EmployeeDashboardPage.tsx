import { useEffect, useState } from "react";
import { IndianRupee, ShoppingBag, TrendingUp, ScanBarcode, WalletCards, AlertCircle, Loader2, CreditCard, Smartphone, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

interface EmployeeSummaryRecord {
  id: string;
  name: string;
  status: string;
  opening_balance: number;
  closing_balance?: number;
  collected_amount: number;
  due_amount: number;
  orders_today: number;
}

const EmployeeDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employeeRecord, setEmployeeRecord] = useState<EmployeeSummaryRecord | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [openingInput, setOpeningInput] = useState<string>("0");
  const [closingInput, setClosingInput] = useState<string>("0");
  const [savingBalance, setSavingBalance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmployeeRecord = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const email = user.email?.trim().toLowerCase();
        const [userMatch, emailMatch] = await Promise.all([
          supabase
            .from("employees")
            .select("id, name, status, opening_balance, closing_balance, collected_amount, due_amount, orders_today")
            .eq("user_id", user.id)
            .maybeSingle(),
          email
            ? supabase
                .from("employees")
                .select("id, name, status, opening_balance, closing_balance, collected_amount, due_amount, orders_today")
                .ilike("email", email)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        const rec = (userMatch.data ?? emailMatch.data) as EmployeeSummaryRecord | null;

        const queryError = userMatch.error ?? (emailMatch && "error" in emailMatch ? emailMatch.error : null);
        if (queryError) {
          console.error("Error loading employee record:", queryError);
          setEmployeeRecord(null);
        } else {
          setEmployeeRecord(rec);

          if (rec) {
            const key = `employee_balance_submitted_${rec.id}_${new Date().toISOString().slice(0,10)}`;
            const already = typeof window !== "undefined" ? localStorage.getItem(key) : null;
            setOpeningInput(String(rec.opening_balance ?? 0));
            setClosingInput(String(rec.closing_balance ?? 0));
            if (!already) setShowBalanceModal(true);
          }
        }
      } catch (err) {
        console.error("Failed loading employee record:", err);
        setEmployeeRecord(null);
      } finally {
        setLoading(false);
      }
    };

    void loadEmployeeRecord();
  }, [user]);

  const handleSaveBalances = async () => {
    if (!employeeRecord) return;
    setSavingBalance(true);
    const opening = parseFloat(openingInput) || 0;
    const closing = parseFloat(closingInput) || 0;
    const { error } = await supabase.from("employees").update({ opening_balance: opening, closing_balance: closing, updated_at: new Date().toISOString() }).eq("id", employeeRecord.id);
    setSavingBalance(false);
    if (error) {
      console.error("Failed to save balances:", error);
      toast.error(`Failed to save balances: ${error.message}`);
      return;
    }
    setEmployeeRecord((s) => s ? { ...s, opening_balance: opening, closing_balance: closing } : s);
    const key = `employee_balance_submitted_${employeeRecord.id}_${new Date().toISOString().slice(0,10)}`;
    localStorage.setItem(key, "1");
    setShowBalanceModal(false);
    toast.success("Shift balances updated successfully! 🎉");
  };

  const emp = employeeRecord;
  const { orders } = useStore();

  // Compute shift payment method breakdown
  const paymentBreakdown = (() => {
    if (!emp) return { cash: 0, upi: 0, card: 0 };
    const todayStr = new Date().toDateString();
    
    // Filter orders handled by this employee today
    const myOrdersToday = orders.filter(
      (o) => o.employeeId === emp.id && new Date(o.createdAt).toDateString() === todayStr
    );

    const cash = myOrdersToday.filter((o) => o.paymentMethod === "Cash").reduce((sum, o) => sum + o.total, 0);
    const upi = myOrdersToday.filter((o) => o.paymentMethod === "UPI").reduce((sum, o) => sum + o.total, 0);
    const card = myOrdersToday.filter((o) => o.paymentMethod === "Card").reduce((sum, o) => sum + o.total, 0);

    return { cash, upi, card };
  })();

  const stats = emp
    ? [
        { label: "Opening Balance", value: `₹${Number(emp.opening_balance ?? 0).toLocaleString("en-IN")}`, icon: WalletCards, accent: "from-primary to-primary/80" },
        { label: "Collected Today", value: `₹${Number(emp.collected_amount ?? 0).toLocaleString("en-IN")}`, icon: IndianRupee, accent: "from-accent to-accent/80" },
        { label: "Pending Due", value: `₹${Number(emp.due_amount ?? 0).toLocaleString("en-IN")}`, icon: TrendingUp, accent: "from-warning to-warning/80" },
        { label: "Orders Today", value: String(emp.orders_today ?? 0), icon: ShoppingBag, accent: "from-success to-success/80" },
      ]
    : [];

  return (
    <div className="page-container pb-24">
      <div className="mb-5 animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Employee Access</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">My Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your daily balance, collected amount, and pending dues.</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/40 bg-card p-12 flex flex-col items-center justify-center space-y-4">
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <ShoppingBag className="absolute h-4.5 w-4.5 text-primary animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading your dashboard...</p>
        </div>
      ) : !emp ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card p-6 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No employee record found</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Your account ({user?.email}) has not been linked to a shop yet. Ask your shop owner to add you as a staff member.
          </p>
          <Button variant="outline" className="rounded-xl text-sm" onClick={() => navigate("/employee/scan")}>
            Go to Scanner
          </Button>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            {stats.map((item, index) => (
              <Card key={item.label} className="border-none shadow-soft animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
                <CardContent className="p-4">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-primary-foreground`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-extrabold text-foreground">{item.value}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Employee details card */}
          <Card className="border-none shadow-soft">
            <CardContent className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Shift Summary</p>
                  <p className="text-xs text-muted-foreground">Your assigned shift totals from the shop database.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 rounded-lg text-xs px-2.5 py-0 border-border/60 hover:bg-secondary/40 font-semibold" onClick={() => setShowBalanceModal(true)}>
                    Update Balances
                  </Button>
                  <Badge className="rounded-full bg-primary/10 text-primary">Live</Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-border/40 bg-secondary/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.orders_today ?? 0} orders handled today</p>
                  </div>
                  <Badge
                    variant={emp.status === "inactive" ? "destructive" : "secondary"}
                    className="rounded-full text-[10px]"
                  >
                    {emp.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-card px-2 py-2">
                    <p className="text-muted-foreground">Opening</p>
                    <p className="mt-1 font-bold text-foreground">₹{Number(emp.opening_balance ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-xl bg-card px-2 py-2">
                    <p className="text-muted-foreground">Collected</p>
                    <p className="mt-1 font-bold text-emerald-600">₹{Number(emp.collected_amount ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-xl bg-card px-2 py-2">
                    <p className="text-muted-foreground">Pending</p>
                    <p className="mt-1 font-bold text-destructive">₹{Number(emp.due_amount ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-primary/5 p-3.5">
                <div className="flex items-center justify-between mb-3.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Net Shift Balance</p>
                    <p className="mt-1 text-xl font-extrabold text-foreground">
                      ₹{(Number(emp.collected_amount ?? 0) - Number(emp.due_amount ?? 0)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-card px-2.5 py-1.5 text-xs font-semibold text-primary">
                    <ScanBarcode className="h-3.5 w-3.5" />
                    Shift balance
                  </div>
                </div>

                <div className="border-t border-border/40 pt-3 mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-card">
                    <div className="flex items-center gap-1 text-emerald-600 font-semibold mb-0.5">
                      <Banknote className="h-3 w-3" /> Cash
                    </div>
                    <span className="font-bold text-foreground">₹{paymentBreakdown.cash.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-card">
                    <div className="flex items-center gap-1 text-blue-600 font-semibold mb-0.5">
                      <Smartphone className="h-3 w-3" /> UPI
                    </div>
                    <span className="font-bold text-foreground">₹{paymentBreakdown.upi.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-card">
                    <div className="flex items-center gap-1 text-purple-600 font-semibold mb-0.5">
                      <CreditCard className="h-3 w-3" /> Card
                    </div>
                    <span className="font-bold text-foreground">₹{paymentBreakdown.card.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button className="h-12 rounded-xl gradient-primary gap-2" onClick={() => navigate("/employee/scan")}>
              <ScanBarcode className="h-4 w-4" /> Start Scanning
            </Button>
            <Button variant="outline" className="h-12 rounded-xl gap-2" onClick={() => navigate("/employee/orders")}>
              <ShoppingBag className="h-4 w-4" /> View Orders
            </Button>
          </div>
        </>
      )}
      <BalanceDialog
        open={showBalanceModal}
        onClose={() => setShowBalanceModal(false)}
        opening={openingInput}
        setOpening={setOpeningInput}
        closing={closingInput}
        setClosing={setClosingInput}
        onSave={handleSaveBalances}
        saving={savingBalance}
      />
    </div>
  );
};

interface BalanceDialogProps {
  open: boolean;
  onClose: () => void;
  opening: string;
  setOpening: (val: string) => void;
  closing: string;
  setClosing: (val: string) => void;
  onSave: () => void;
  saving: boolean;
}

// Balance entry dialog (shown to employee on sign-in)
const BalanceDialog = ({ open, onClose, opening, setOpening, closing, setClosing, onSave, saving }: BalanceDialogProps) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-sm rounded-2xl">
      <DialogHeader>
        <DialogTitle>Start Shift — Balances</DialogTitle>
        <DialogDescription>Enter your opening and expected closing balances for this shift.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Opening Balance (₹)</label>
          <Input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} className="h-10 rounded-xl" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Closing Balance (₹)</label>
          <Input type="number" value={closing} onChange={(e) => setClosing(e.target.value)} className="h-10 rounded-xl" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 h-10 rounded-xl" onClick={onClose}>Skip</Button>
          <Button className="flex-1 h-10 rounded-xl gradient-primary" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default EmployeeDashboardPage;
