import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useShopProfile } from "@/context/ShopProfileContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import {
  UserPlus, Pencil, Trash2, Mail, Phone, User, IndianRupee, ShoppingBag,
  CheckCircle, Clock, Copy, Users, Loader2, Search, X, RefreshCw,
  MessageCircle, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";

interface EmployeeRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  role: string;
  opening_balance: number;
  closing_balance?: number;
  collected_amount: number;
  due_amount: number;
  orders_today: number;
  invite_code: string | null;
  joined_at: string | null;
  created_at: string;
  user_id: string | null;
}

const emptyForm = { name: "", email: "", phone: "" };

const EmployeesPage = () => {
  const { user } = useAuth();
  const { profile } = useShopProfile();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "invited" | "inactive">("all");

  // Edit dialog
  const [editEmployee, setEditEmployee] = useState<EmployeeRecord | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    opening_balance: "",
    closing_balance: "",
    collected_amount: "",
    due_amount: "",
    orders_today: "",
    status: "invited" as string,
  });

  // Delete dialog
  const [deleteConfirm, setDeleteConfirm] = useState<EmployeeRecord | null>(null);

  // Expanded cards
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadEmployees = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("shop_owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load employees", description: error.message, variant: "destructive" });
    } else {
      setEmployees((data ?? []) as EmployeeRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCopyInvite = (employee: EmployeeRecord) => {
    if (!employee.invite_code) {
      toast({ title: "No invite code", variant: "destructive" });
      return;
    }
    const shopName = profile?.shopName || "our shop";
    const appUrl = window.location.origin;
    const message = `Hi ${employee.name}! 👋\n\nYou've been invited as a staff member at *${shopName}*.\n\n📱 Register/Login at: ${appUrl}\n🔑 Invitation Code: *${employee.invite_code}*\n\nEnter this code during onboarding to get started.`;
    navigator.clipboard.writeText(message)
      .then(() => toast({ title: "Invite message copied!", description: "Share this with your employee via WhatsApp or SMS." }))
      .catch(() => toast({ title: "Failed to copy", description: "Please copy it manually.", variant: "destructive" }));
  };

  const handleWhatsAppInvite = (employee: EmployeeRecord) => {
    if (!employee.invite_code) {
      toast({ title: "No invite code", variant: "destructive" });
      return;
    }
    const shopName = profile?.shopName || "our shop";
    const appUrl = window.location.origin;
    const message = encodeURIComponent(
      `Hi ${employee.name}! 👋\n\nYou've been invited as a staff member at *${shopName}*.\n\n📱 Register/Login at: ${appUrl}\n🔑 Invitation Code: *${employee.invite_code}*\n\nEnter this code during onboarding to get started.`
    );
    const phone = employee.phone ? employee.phone.replace(/\D/g, "") : "";
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const generateInviteCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return `INV-${code}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    const existing = employees.find(emp => emp.email.toLowerCase() === email);
    if (existing) {
      toast({ title: "Employee already exists", description: `${email} is already in your shop.`, variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("employees").insert({
      shop_owner_id: user.id,
      name,
      email,
      phone: form.phone.trim() || null,
      role: "employee",
      status: "invited",
      opening_balance: 0,
      closing_balance: 0,
      collected_amount: 0,
      due_amount: 0,
      orders_today: 0,
      invite_code: generateInviteCode(),
      joined_at: null,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Failed to add employee", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Employee invited!", description: `${name} has been added. Copy their invite code to share.` });
    setForm(emptyForm);
    setShowInviteForm(false);
    await loadEmployees();
  };

  const handleEditOpen = (employee: EmployeeRecord) => {
    setEditEmployee(employee);
    setEditForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || "",
      opening_balance: String(employee.opening_balance ?? 0),
      closing_balance: String(employee.closing_balance ?? 0),
      collected_amount: String(employee.collected_amount ?? 0),
      due_amount: String(employee.due_amount ?? 0),
      orders_today: String(employee.orders_today ?? 0),
      status: employee.status,
    });
  };

  const handleEditSave = async () => {
    if (!editEmployee) return;
    if (!editForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("employees").update({
      name: editForm.name.trim(),
      phone: editForm.phone.trim() || null,
      opening_balance: parseFloat(editForm.opening_balance) || 0,
      closing_balance: parseFloat(editForm.closing_balance) || 0,
      collected_amount: parseFloat(editForm.collected_amount) || 0,
      due_amount: parseFloat(editForm.due_amount) || 0,
      orders_today: parseInt(editForm.orders_today) || 0,
      status: editForm.status,
      updated_at: new Date().toISOString(),
    }).eq("id", editEmployee.id);
    setSaving(false);

    if (error) {
      toast({ title: "Failed to update employee", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Employee updated successfully!" });
    setEditEmployee(null);
    await loadEmployees();
  };

  const handleDelete = async (employee: EmployeeRecord) => {
    const { error } = await supabase.from("employees").delete().eq("id", employee.id);
    if (error) {
      toast({ title: "Failed to remove employee", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Employee removed", description: `${employee.name} has been removed.` });
    setDeleteConfirm(null);
    await loadEmployees();
  };

  const handleResetBalances = async (employee: EmployeeRecord) => {
    const { error } = await supabase.from("employees").update({
      opening_balance: 0,
      closing_balance: 0,
      collected_amount: 0,
      due_amount: 0,
      orders_today: 0,
      updated_at: new Date().toISOString(),
    }).eq("id", employee.id);
    if (error) {
      toast({ title: "Failed to reset balances", variant: "destructive" });
    } else {
      toast({ title: "Balances reset", description: `${employee.name}'s shift data has been cleared.` });
      await loadEmployees();
    }
  };

  const statusColor: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    invited: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    inactive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !search ||
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      (emp.phone || "").includes(search);
    const matchesFilter = filterStatus === "all" || emp.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: employees.length,
    active: employees.filter(e => e.status === "active").length,
    invited: employees.filter(e => e.status === "invited").length,
    inactive: employees.filter(e => e.status === "inactive").length,
  };

  return (
    <div className="page-container pb-24">
      {/* Header */}
      <div className="mb-5">
        <p className="text-sm font-medium text-muted-foreground">Shop staff</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Manage Employees</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite staff members. Once they sign up with the invited email, they get employee access automatically.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {[
          { label: "Total Staff", value: counts.all, color: "bg-primary/10 text-primary" },
          { label: "Active", value: counts.active, color: "bg-emerald-100 text-emerald-700" },
          { label: "Pending", value: counts.invited, color: "bg-amber-100 text-amber-700" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-none shadow-soft">
            <CardContent className={`p-3 rounded-2xl ${color}`}>
              <p className="text-xl font-extrabold">{value}</p>
              <p className="text-[11px] font-semibold mt-0.5 opacity-80">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-foreground mb-2">How Staff Invite Works</p>
        <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Add their name and email below to generate an Invitation Code.</li>
          <li>Share the Invite Code via WhatsApp or by copying the message.</li>
          <li>Employee registers on the app and enters the code on their onboarding page.</li>
          <li>Status changes from <span className="font-semibold text-amber-600">Invited</span> to <span className="font-semibold text-emerald-600">Active</span> automatically.</li>
        </ol>
      </div>

      {/* Invite button / form */}
      {!showInviteForm ? (
        <Button
          className="w-full h-12 rounded-2xl gradient-primary gap-2 font-semibold mb-5"
          onClick={() => setShowInviteForm(true)}
        >
          <UserPlus className="h-4 w-4" /> Invite New Employee
        </Button>
      ) : (
        <Card className="border-none shadow-soft mb-5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">Invite a New Employee</h2>
              </div>
              <button onClick={() => setShowInviteForm(false)} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-secondary text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Employee name *" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="pl-10 h-11 rounded-xl" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Email address * (they use this to sign up)" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="pl-10 h-11 rounded-xl" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Phone number (optional, for WhatsApp invite)" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="pl-10 h-11 rounded-xl" />
              </div>
              <p className="text-[11px] text-muted-foreground px-1">
                💡 Adding their phone number allows you to send the invite via WhatsApp directly.
              </p>
              <Button type="submit" disabled={saving} className="w-full h-11 rounded-xl gradient-primary gap-2">
                <UserPlus className="h-4 w-4" />
                {saving ? "Adding..." : "Generate Invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      {employees.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
            {search && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "active", "invited", "inactive"] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterStatus === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({counts[status]})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Employee list */}
      <div className="space-y-3">
        {loading ? (
          <Card className="border-none shadow-soft">
            <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading employees...</p>
            </CardContent>
          </Card>
        ) : filteredEmployees.length === 0 ? (
          <Card className="border-none shadow-soft">
            <CardContent className="p-8 text-center">
              {employees.length === 0 ? (
                <>
                  <UserPlus className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">No employees yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the button above to add your first team member.</p>
                </>
              ) : (
                <>
                  <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search or filter.</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map((employee) => {
            const isExpanded = expandedId === employee.id;
            return (
              <Card key={employee.id} className="border-none shadow-soft overflow-hidden">
                <CardContent className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-foreground">{employee.name}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[employee.status] ?? "bg-secondary text-secondary-foreground"}`}>
                          {employee.status === "active" ? <CheckCircle className="h-3 w-3" /> : employee.status === "invited" ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {employee.email}
                      </p>
                      {employee.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {employee.phone}
                        </p>
                      )}
                      {employee.joined_at && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Joined {new Date(employee.joined_at).toLocaleDateString("en-IN")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className="rounded-xl h-8 px-2.5" onClick={() => handleEditOpen(employee)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-xl h-8 px-2.5 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(employee)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Invite code banner */}
                  {!employee.user_id && employee.status === "invited" && employee.invite_code && (
                    <div className="mb-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wide">Invitation Pending</p>
                        <span className="font-mono text-sm font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-lg border border-amber-200/50">
                          {employee.invite_code}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl h-8 text-xs gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
                          onClick={() => handleCopyInvite(employee)}
                        >
                          <Copy className="h-3 w-3" /> Copy Invite
                        </Button>
                        {employee.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-xl h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleWhatsAppInvite(employee)}
                          >
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Balance summary (collapsed) */}
                  <button
                    className="w-full flex items-center justify-between rounded-xl bg-secondary/40 hover:bg-secondary/60 px-3 py-2.5 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : employee.id)}
                  >
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <IndianRupee className="h-3 w-3" />
                        <span>Collected: </span>
                        <span className="font-bold text-emerald-600">₹{Number(employee.collected_amount ?? 0).toLocaleString("en-IN")}</span>
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <ShoppingBag className="h-3 w-3" />
                        <span className="font-bold text-foreground">{employee.orders_today ?? 0} orders</span>
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {/* Expanded balance details */}
                  {isExpanded && (
                    <div className="mt-3 animate-slide-up">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { label: "Opening Balance", value: `₹${Number(employee.opening_balance ?? 0).toLocaleString("en-IN")}`, cls: "" },
                          { label: "Closing Balance", value: `₹${Number(employee.closing_balance ?? 0).toLocaleString("en-IN")}`, cls: "" },
                          { label: "Collected Amount", value: `₹${Number(employee.collected_amount ?? 0).toLocaleString("en-IN")}`, cls: "text-emerald-600" },
                          { label: "Pending Due", value: `₹${Number(employee.due_amount ?? 0).toLocaleString("en-IN")}`, cls: "text-destructive" },
                        ].map(({ label, value, cls }) => (
                          <div key={label} className="rounded-xl bg-secondary/40 p-2.5">
                            <p className="text-muted-foreground">{label}</p>
                            <p className={`mt-1 font-bold ${cls || "text-foreground"}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 h-8 rounded-xl text-xs gap-1.5 text-muted-foreground"
                        onClick={() => handleResetBalances(employee)}
                      >
                        <RefreshCw className="h-3 w-3" /> Reset Shift Balances
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editEmployee} onOpenChange={() => setEditEmployee(null)}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update details, balances, and status for {editEmployee?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            {/* Personal Info */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Personal Info</p>
              <div className="space-y-2.5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="pl-10 h-10 rounded-xl" placeholder="Employee name" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="pl-10 h-10 rounded-xl" placeholder="Phone number" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="invited">Invited</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Shift Balances */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Shift Balances</p>
              <div className="space-y-2">
                {[
                  { key: "opening_balance", label: "Opening Balance (₹)" },
                  { key: "closing_balance", label: "Closing Balance (₹)" },
                  { key: "collected_amount", label: "Collected Amount (₹)" },
                  { key: "due_amount", label: "Due Amount (₹)" },
                  { key: "orders_today", label: "Orders Today" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">{label}</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={editForm[key as keyof typeof editForm]}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => setEditEmployee(null)}>Cancel</Button>
              <Button className="flex-1 h-10 rounded-xl gradient-primary" onClick={handleEditSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Remove Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deleteConfirm?.name}</strong>?
              This will revoke their shop access. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 h-10 rounded-xl" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Remove Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesPage;
