import { useState, useEffect, useMemo } from "react";
import {
  Search, Plus, CreditCard, Clock, CheckCircle2, AlertCircle,
  Pencil, Trash2, IndianRupee, Phone, User, CalendarDays,
  FileText, TrendingUp, ChevronDown, ChevronUp, X, Download,
  History, BadgeCheck, MoreVertical, MessageCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useCreditStore, CreditRecord, PaymentStatus, PaymentLog } from "@/store/useCreditStore";
import { useShopProfile } from "@/context/ShopProfileContext";

// ── Types ──────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "unpaid" | "partial" | "paid";

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; icon: React.ElementType }> = {
  unpaid: { label: "Unpaid", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const isOverdue = (c: CreditRecord) => {
  if (c.status === "paid" || !c.dueDate) return false;
  return new Date(c.dueDate) < new Date();
};

// ── Empty form ─────────────────────────────────────────────────────────────────

const emptyForm = () => ({
  customerName: "", mobileNumber: "", totalAmount: "", paidAmount: "", dueDate: "", notes: "",
});

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <Card className="border-none shadow-soft">
      <CardContent className="p-3.5 flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground font-medium leading-none mb-1">{label}</p>
          <p className="text-sm font-bold text-foreground truncate">₹{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, overdue }: { status: PaymentStatus; overdue: boolean }) {
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertCircle className="h-3 w-3" /> Overdue
      </span>
    );
  }
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
      <cfg.icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

// ── Payment History Modal ──────────────────────────────────────────────────────

function PaymentHistoryModal({ credit, onClose, onAddBill, onPay }: { credit: CreditRecord; onClose: () => void; onAddBill: (customerName: string, mobileNumber: string) => void; onPay: (credit: CreditRecord) => void; }) {
  const { fetchPaymentLogs, paymentLogs } = useCreditStore();
  const [logs, setLogs] = useState(paymentLogs.filter((l) => l.creditId === credit.id));
  const [loading, setLoading] = useState(false);
  const { profile } = useShopProfile();

  useEffect(() => {
    setLoading(true);
    fetchPaymentLogs(credit.id)
      .then((l) => setLogs(l))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credit.id]);

  const dueAmount = credit.remainingBalance;
  const paidAmount = credit.paidAmount;

  const openWhatsAppReminder = () => {
    const phone = credit.mobileNumber.replace(/\D/g, "");
    let formattedPhone = phone;
    if (phone.length === 10) formattedPhone = `91${phone}`;
    else if (phone.length === 11 && phone.startsWith("0")) formattedPhone = `91${phone.slice(1)}`;
    const dueText = credit.dueDate ? `\nDue Date: ${fmtDate(credit.dueDate)}` : "";
    const storeName = profile.shopName || "Your shop";
    const message = `Hi ${credit.customerName},\n\nThis is ${storeName}. You have an outstanding due of ₹${dueAmount.toFixed(2)}.${dueText}\n\nPlease pay by the due date if possible.\n\nThank you,\n${storeName}`;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" /> Customer Profile
          </DialogTitle>
          <DialogDescription className="text-xs">{credit.customerName} · {credit.mobileNumber}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-2xl border border-muted/50 bg-muted/50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total Paid</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">₹{fmt(paidAmount)}</p>
          </div>
          <div className="rounded-2xl border border-muted/50 bg-muted/50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total Due</p>
            <p className="mt-1 text-sm font-semibold text-red-700">₹{fmt(dueAmount)}</p>
          </div>
        </div>

        <div className="grid gap-3 mb-4">
          {dueAmount > 0 && (
            <Button className="h-11 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={openWhatsAppReminder}>
              <MessageCircle className="h-4 w-4" /> Send WhatsApp Reminder
            </Button>
          )}
          <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => onPay(credit)}>
            <IndianRupee className="h-4 w-4" /> Record Payment
          </Button>
          <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => onAddBill(credit.customerName, credit.mobileNumber)}>
            <Plus className="h-4 w-4" /> Add Another Bill
          </Button>
        </div>

        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {logs.length === 0 && dueAmount > 0 ? (
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground">Bill 1</p>
                <p className="mt-1 text-sm font-semibold">Due ₹{fmt(dueAmount)}</p>
                {credit.dueDate && <p className="text-[10px] text-muted-foreground mt-1">Due by {fmtDate(credit.dueDate)}</p>}
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-xl bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">Payment</p>
                    <span className="text-[10px] text-muted-foreground">{fmtDate(log.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">₹{fmt(log.amountPaid)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{log.note || "Payment received"}</p>
                </div>
              ))
            )}

            {dueAmount > 0 && logs.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-[11px] font-semibold text-red-700">Outstanding</p>
                <p className="mt-1 text-sm font-semibold text-red-900">₹{fmt(dueAmount)}</p>
                {credit.dueDate && <p className="text-[10px] text-red-600 mt-1">Due by {fmtDate(credit.dueDate)}</p>}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Customer History Modal (combined for all bills of a customer) ─────────────────

function CustomerHistoryModal({ group, onClose, onAddBill, onPay }: { group: { customerName: string; mobile: string; bills: CreditRecord[] }; onClose: () => void; onAddBill: (customerName: string, mobileNumber: string) => void; onPay: () => void; }) {
  const { fetchPaymentLogs } = useCreditStore();
  const { profile } = useShopProfile();
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all(group.bills.map((b) => fetchPaymentLogs(b.id))).then((results) => {
      const combined = results.flat();
      combined.sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0));
      if (mounted) setLogs(combined);
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.bills.map(b => b.id).join(",")]);

  const total = group.bills.reduce((s, b) => s + b.totalAmount, 0);
  const paid = group.bills.reduce((s, b) => s + b.paidAmount, 0);
  const remaining = group.bills.reduce((s, b) => s + b.remainingBalance, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full rounded-2xl p-4 max-h-[calc(100vh-4rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" /> {group.customerName}
          </DialogTitle>
          <DialogDescription className="text-xs">{group.mobile}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1 pt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
          <div className="rounded-2xl border border-muted/50 bg-muted/50 p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Amount Received</p>
            <p className="mt-2 text-lg font-semibold text-emerald-700">₹{fmt(paid)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">From all bills</p>
          </div>
          <div className="rounded-2xl border border-muted/50 bg-muted/50 p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Remaining Balance</p>
            <p className="mt-2 text-lg font-semibold text-red-700">₹{fmt(remaining)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Outstanding amount</p>
          </div>
        </div>

        <div className="grid gap-3 mb-5">
          <Button className="h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold" onClick={onPay}>
            <IndianRupee className="h-4 w-4 mr-2" /> Record Payment
          </Button>
          <Button variant="outline" className="h-12 w-full rounded-2xl border-muted/50 text-sm font-semibold" onClick={() => onAddBill(group.customerName, group.mobile)}>
            <Plus className="h-4 w-4 mr-2" /> Add Another Bill
          </Button>
          {remaining > 0 && (
            <Button className="h-12 w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold" onClick={() => {
              const phone = group.mobile.replace(/\D/g, "");
              let formattedPhone = phone;
              if (phone.length === 10) formattedPhone = `91${phone}`;
              else if (phone.length === 11 && phone.startsWith("0")) formattedPhone = `91${phone.slice(1)}`;
              const nextDueDate = group.bills
                .map((bill) => bill.dueDate)
                .filter(Boolean)
                .sort()
                .shift();
              const dueDateText = nextDueDate ? `\nDue Date: ${fmtDate(nextDueDate)}` : "";
              const shopName = profile.shopName || "Your Shop";
              const message = `Hi ${group.customerName},\n\nThis is ${shopName}. You have an outstanding balance of ₹${remaining.toFixed(2)}.${dueDateText}\n\nPlease pay the due amount at your earliest convenience.\n\nThank you,\n${shopName}`;
              const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
              window.open(whatsappUrl, "_blank");
            }}>
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp Reminder
            </Button>
          )}
        </div>

        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Ledger Summary</p>
          <div className="space-y-3">
            {group.bills.map((bill) => (
              <div key={bill.id} className="rounded-2xl border border-muted/50 bg-white/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Bill: ₹{fmt(bill.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Received ₹{fmt(bill.paidAmount)} · Due ₹{fmt(bill.remainingBalance)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : bill.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {bill.status.toUpperCase()}
                  </span>
                </div>
                {bill.dueDate && <p className="text-[11px] text-muted-foreground mt-3">Due by {fmtDate(bill.dueDate)}</p>}
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <div className="rounded-2xl border border-muted/50 bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                No payment records yet for this customer.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Payment</p>
                      <p className="mt-1 text-base font-semibold">₹{fmt(log.amountPaid)}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{log.note || "Payment received"}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(log.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
            {remaining > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-red-700">Outstanding</p>
                <p className="mt-1 text-base font-semibold text-red-900">₹{fmt(remaining)}</p>
                <p className="text-[11px] text-red-700 mt-1">Due by {group.bills.reduce((date, bill) => bill.dueDate || date, group.bills[0].dueDate || null) ? fmtDate(group.bills.reduce((date, bill) => bill.dueDate || date, group.bills[0].dueDate || null)) : "—"}</p>
              </div>
            )}
          </div>
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Payment Modal ──────────────────────────────────────────────────────────

function AddPaymentModal({ credit, onClose }: { credit: CreditRecord; onClose: () => void }) {
  const { addPayment } = useCreditStore();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePay = async () => {
    const a = parseFloat(amount);
    if (isNaN(a) || a <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (a > credit.remainingBalance) { toast({ title: "Amount exceeds remaining balance", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await addPayment(credit.id, a, note);
      toast({ title: "Payment recorded ✓" });
      onClose();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Record Payment</DialogTitle>
          <DialogDescription className="text-xs">
            {credit.customerName} · Remaining: ₹{fmt(credit.remainingBalance)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Amount paid" type="number" className="h-11 rounded-xl pl-10"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Input placeholder="Note (optional)" className="h-11 rounded-xl"
            value={note} onChange={(e) => setNote(e.target.value)} />
          <Button className="h-12 w-full rounded-xl gradient-primary shadow-glow-primary" onClick={handlePay} disabled={saving}>
            {saving ? "Saving…" : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupPaymentModal({ group, onClose }: { group: { customerName: string; mobile: string; bills: CreditRecord[] }; onClose: () => void; }) {
  const { addGroupPayment } = useCreditStore();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const totalDue = group.bills.reduce((s, b) => s + b.remainingBalance, 0);

  const handleSave = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (value > totalDue) {
      toast({ title: "Amount exceeds outstanding balance", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await addGroupPayment(group.bills.map((bill) => bill.id), value, note);
      toast({ title: "Payment recorded ✓" });
      onClose();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full rounded-2xl p-4 max-h-[calc(100vh-4rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base">Record Payment</DialogTitle>
          <DialogDescription className="text-xs">
            {group.customerName} · Total Outstanding ₹{fmt(totalDue)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1 pt-2">
          <div className="space-y-3">
            <div className="relative">
              <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Amount received" type="number" className="h-12 rounded-2xl pl-11"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Input placeholder="Note (optional)" className="h-12 rounded-2xl"
              value={note} onChange={(e) => setNote(e.target.value)} />
            <Button className="h-12 w-full rounded-2xl gradient-primary shadow-glow-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Credit Form Modal ──────────────────────────────────────────────────────────

function CreditFormModal({
  initial, prefill, onClose,
}: {
  initial?: CreditRecord;
  prefill?: { customerName: string; mobileNumber: string };
  onClose: () => void;
}) {
  const { credits, addCredit, updateCredit } = useCreditStore();
  const [form, setForm] = useState(() => {
    if (initial) {
      return {
        customerName: initial.customerName,
        mobileNumber: initial.mobileNumber,
        totalAmount: String(initial.totalAmount),
        paidAmount: String(initial.paidAmount),
        dueDate: initial.dueDate ? initial.dueDate.slice(0, 10) : "",
        notes: initial.notes,
      };
    }
    if (prefill) {
      return {
        customerName: prefill.customerName,
        mobileNumber: prefill.mobileNumber,
        totalAmount: "",
        paidAmount: "",
        dueDate: "",
        notes: "",
      };
    }
    return emptyForm();
  });
  const [saving, setSaving] = useState(false);

  const total = parseFloat(form.totalAmount) || 0;
  const paid = parseFloat(form.paidAmount) || 0;
  const remaining = Math.max(0, total - paid);

  const handleSave = async () => {
    const name = form.customerName.trim();
    const mobile = form.mobileNumber.trim();
    if (!name) { toast({ title: "Customer name required", variant: "destructive" }); return; }
    if (!mobile) { toast({ title: "Mobile number required", variant: "destructive" }); return; }
    if (total <= 0) { toast({ title: "Total amount must be > 0", variant: "destructive" }); return; }
    if (paid > total) { toast({ title: "Paid amount cannot exceed total", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const payload = {
        customerName: name,
        mobileNumber: mobile,
        totalAmount: total,
        paidAmount: paid,
        dueDate: form.dueDate || null,
        notes: form.notes.trim(),
      };
      if (initial) {
        await updateCredit(initial.id, payload);
        toast({ title: "Updated ✓" });
      } else {
        await addCredit(payload);
        toast({ title: "Credit added ✓" });
      }
      onClose();
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{initial ? "Edit Credit" : "Add Credit Entry"}</DialogTitle>
          <DialogDescription className="text-xs">Track a pending payment from a customer</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {/* Customer name */}
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Customer name *" className="h-11 rounded-xl pl-10"
              value={form.customerName} onChange={(e) => set("customerName", e.target.value)} />
          </div>
          {/* Mobile */}
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Mobile number *" type="tel" className="h-11 rounded-xl pl-10"
              value={form.mobileNumber} onChange={(e) => set("mobileNumber", e.target.value)} />
          </div>
          {/* Total amount */}
          <div className="relative">
            <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Total amount *" type="number" className="h-11 rounded-xl pl-10"
              value={form.totalAmount} onChange={(e) => set("totalAmount", e.target.value)} />
          </div>
          {/* Paid amount */}
          <div className="relative">
            <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Paid amount (0 if none)" type="number" className="h-11 rounded-xl pl-10"
              value={form.paidAmount} onChange={(e) => set("paidAmount", e.target.value)} />
          </div>
          {/* Auto remaining */}
          {total > 0 && (
            <div className="rounded-xl bg-muted/50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Remaining Balance</span>
              <span className={`text-sm font-bold ${remaining > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                ₹{fmt(remaining)}
              </span>
            </div>
          )}
          {/* Due date */}
          <div className="relative">
            <CalendarDays className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" className="h-11 rounded-xl pl-10"
              value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </div>
          {/* Notes */}
          <Textarea placeholder="Notes / details (optional)" className="rounded-xl resize-none min-h-[70px]"
            value={form.notes} onChange={(e) => set("notes", e.target.value)} />

          <Button className="h-12 w-full rounded-xl gradient-primary shadow-glow-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : initial ? "Update" : "Add Credit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Credit Card Item ───────────────────────────────────────────────────────────

function CreditCard2({
  credit, index, onEdit, onDelete, onPay, onHistory,
}: {
  credit: CreditRecord;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onPay: () => void;
  onHistory: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const overdue = isOverdue(credit);
  const pct = credit.totalAmount > 0 ? Math.min(100, (credit.paidAmount / credit.totalAmount) * 100) : 0;

  return (
    <Card
      className={`border-none shadow-soft transition-all duration-200 hover:shadow-medium animate-slide-up ${overdue ? "ring-1 ring-red-400/40" : ""}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm ${overdue ? "bg-red-500" : "gradient-primary"}`}>
            {credit.customerName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground truncate">{credit.customerName}</p>
              <StatusBadge status={credit.status} overdue={overdue} />
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{credit.mobileNumber}</span>
              {credit.dueDate && (
                <>
                  <span>·</span>
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  <span className={overdue ? "text-red-500 font-medium" : ""}>{fmtDate(credit.dueDate)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Amounts */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-xl bg-muted/50 p-2">
            <p className="text-[9px] text-muted-foreground mb-0.5">Total</p>
            <p className="text-xs font-bold">₹{fmt(credit.totalAmount)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-2">
            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mb-0.5">Paid</p>
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">₹{fmt(credit.paidAmount)}</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-2">
            <p className="text-[9px] text-red-600 dark:text-red-400 mb-0.5">Due</p>
            <p className="text-xs font-bold text-red-700 dark:text-red-300">₹{fmt(credit.remainingBalance)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? "hsl(var(--accent))" : "hsl(var(--primary))",
            }}
          />
        </div>

        {/* Expand toggle */}
        {credit.notes && (
          <button
            className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded((x) => !x)}
          >
            <FileText className="h-3 w-3" />
            {expanded ? "Hide note" : "Show note"}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        {expanded && credit.notes && (
          <p className="mt-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">{credit.notes}</p>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex items-center gap-2">
          {credit.status !== "paid" && (
            <Button size="sm" className="h-8 flex-1 rounded-xl text-xs gradient-primary shadow-glow-primary" onClick={onPay}>
              <IndianRupee className="h-3 w-3 mr-1" /> Pay
            </Button>
          )}
          {credit.status === "paid" && (
            <div className="flex h-8 flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <BadgeCheck className="h-3.5 w-3.5" /> Fully Paid
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 rounded-xl px-2.5 text-xs">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onHistory} className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                View History
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEdit} className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-muted-foreground" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onDelete} className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Export helpers ─────────────────────────────────────────────────────────────

const exportCSV = (credits: CreditRecord[]) => {
  const header = "Customer,Mobile,Total,Paid,Remaining,Status,Due Date,Notes";
  const rows = credits.map((c) =>
    `"${c.customerName}","${c.mobileNumber}",${c.totalAmount},${c.paidAmount},${c.remainingBalance},${c.status},"${c.dueDate ?? ""}","${c.notes}"`
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "credits.csv"; a.click();
  URL.revokeObjectURL(url);
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const CreditsPage = () => {
  const { credits, fetchCredits, deleteCredit } = useCreditStore();
  const { profile } = useShopProfile();
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CreditRecord | null>(null);
  const [payTarget, setPayTarget] = useState<CreditRecord | null>(null);
  const [groupPayTarget, setGroupPayTarget] = useState<{ customerName: string; mobile: string; bills: CreditRecord[] } | null>(null);
  const [historyTarget, setHistoryTarget] = useState<CreditRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CreditRecord | null>(null);
  const [prefillCustomer, setPrefillCustomer] = useState<{ customerName: string; mobileNumber: string } | null>(null);
  const [historyGroupTarget, setHistoryGroupTarget] = useState<{ customerName: string; mobile: string; bills: CreditRecord[] } | null>(null);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  // Stats
  const stats = useMemo(() => {
    const totalCredit = credits.reduce((s, c) => s + c.totalAmount, 0);
    const totalOutstanding = credits.reduce((s, c) => s + c.remainingBalance, 0);
    const fullyPaid = credits.filter((c) => c.status === "paid").length;
    const overdue = credits.filter((c) => isOverdue(c)).length;
    return { totalCredit, totalOutstanding, fullyPaid, overdue };
  }, [credits]);

  // Filtered
  const filtered = useMemo(() => {
    let list = credits;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.customerName.toLowerCase().includes(q) || c.mobileNumber.includes(q)
      );
    }
    if (filterTab !== "all") list = list.filter((c) => c.status === filterTab);
    return list;
  }, [credits, search, filterTab]);

  // Group by mobile number so same-customer bills render under one customer
  const grouped = useMemo(() => {
    const map = new Map<string, CreditRecord[]>();
    filtered.forEach((c) => {
      const key = c.mobileNumber.trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.values()).map((arr) => {
      // sort newest first
      arr.sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0));
      const total = arr.reduce((s, x) => s + x.totalAmount, 0);
      const paid = arr.reduce((s, x) => s + x.paidAmount, 0);
      const remaining = arr.reduce((s, x) => s + x.remainingBalance, 0);
      return {
        mobile: arr[0].mobileNumber,
        customerName: arr[0].customerName,
        bills: arr,
        total,
        paid,
        remaining,
      };
    });
  }, [filtered]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCredit(deleteTarget.id);
      toast({ title: "Deleted" });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unpaid", label: "Unpaid" },
    { key: "partial", label: "Partial" },
    { key: "paid", label: "Paid" },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title">Credits</h1>
          <p className="text-sm text-muted-foreground">{credits.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-xl border-muted/50" onClick={() => exportCSV(credits)} disabled={credits.length === 0}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="h-9 gap-1.5 rounded-xl gradient-primary shadow-glow-primary" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-5 animate-slide-up">
        <StatCard icon={TrendingUp} label="Total Credit Given" value={fmt(stats.totalCredit)} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={CreditCard} label="Outstanding Amount" value={fmt(stats.totalOutstanding)} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
        <div className="rounded-2xl border-none shadow-soft bg-card p-3.5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium leading-none mb-1">Fully Paid</p>
            <p className="text-sm font-bold text-foreground">{stats.fullyPaid} customers</p>
          </div>
        </div>
        <div className="rounded-2xl border-none shadow-soft bg-card p-3.5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium leading-none mb-1">Overdue</p>
            <p className="text-sm font-bold text-foreground">{stats.overdue} payments</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 animate-slide-up">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or phone…" className="h-11 rounded-xl pl-10 pr-10"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && (
          <button className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearch("")}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-none pb-1 animate-slide-up">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`shrink-0 rounded-xl px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${filterTab === tab.key
              ? "gradient-primary text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${filterTab === tab.key ? "bg-white/20" : "bg-background"}`}>
                {credits.filter((c) => c.status === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {grouped.map((g, gi) => (
          <div key={g.mobile} className="rounded-2xl border-none shadow-soft bg-card p-3">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm gradient-primary`}>{g.customerName.charAt(0).toUpperCase()}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div onClick={() => setHistoryGroupTarget(g)} className="cursor-pointer">
                    <p className="text-sm font-semibold text-foreground">{g.customerName}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> <span>{g.mobile}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Total</p>
                    <p className="text-sm font-bold">₹{fmt(g.total)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Paid ₹{fmt(g.paid)}</p>
                    <p className="text-[10px] text-red-600 mt-1">Due ₹{fmt(g.remaining)}</p>
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-muted-foreground">Click the name to open the customer profile for full actions.</div>
              </div>
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <div className="py-20 text-center animate-fade-in">
            <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "No results found" : "No credit entries yet"}
            </p>
            {!search && (
              <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add First Entry
              </Button>
            )}
          </div>
        )}
      </div>

      {historyGroupTarget && (
        <CustomerHistoryModal
          group={historyGroupTarget}
          onClose={() => setHistoryGroupTarget(null)}
          onAddBill={(name, mobile) => setPrefillCustomer({ customerName: name, mobileNumber: mobile })}
          onPay={() => setGroupPayTarget(historyGroupTarget)}
        />
      )}

      {/* Modals */}
      {addOpen && <CreditFormModal onClose={() => setAddOpen(false)} />}
      {editTarget && <CreditFormModal initial={editTarget} onClose={() => setEditTarget(null)} />}
      {prefillCustomer && <CreditFormModal prefill={prefillCustomer} onClose={() => setPrefillCustomer(null)} />}
      {payTarget && <AddPaymentModal credit={payTarget} onClose={() => setPayTarget(null)} />}
      {groupPayTarget && <GroupPaymentModal group={groupPayTarget} onClose={() => setGroupPayTarget(null)} />}
      {historyTarget && <PaymentHistoryModal credit={historyTarget} onClose={() => setHistoryTarget(null)} onAddBill={(name, mobile) => {
        setHistoryTarget(null);
        setPrefillCustomer({ customerName: name, mobileNumber: mobile });
      }} onPay={(credit) => {
        setHistoryTarget(null);
        setPayTarget(credit);
      }} />}

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Delete Credit Entry?</DialogTitle>
            <DialogDescription className="text-xs">
              This will permanently delete the credit record for <strong>{deleteTarget?.customerName}</strong> and all payment history.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditsPage;
