import { useState } from "react";
import { Search, Plus, User, Phone, Mail, Award, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

const CustomersPage = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const { employeeInfo } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", phone: "", email: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: typeof customers[0]) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: "Name and phone required", variant: "destructive" });
      return;
    }
    // Check for duplicate phone (exclude self when editing)
    const duplicate = customers.find(
      (c) => c.phone === form.phone.trim() && c.id !== editingId
    );
    if (duplicate) {
      toast({ title: "Customer already exists", description: `${duplicate.name} has this phone number`, variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await updateCustomer(editingId, { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined });
        toast({ title: "Customer updated ✓" });
      } else {
        await addCustomer({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined }, employeeInfo?.shopOwnerId);
        toast({ title: "Customer added ✓" });
      }
      setForm({ name: "", phone: "", email: "" });
      setEditingId(null);
      setDialogOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e && typeof e === "object" && "message" in e) ? String((e as any).message) : "Unknown error";
      toast({ title: editingId ? "Failed to update" : "Failed to add customer", description: msg, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id);
      toast({ title: "Customer deleted" });
      setDeleteConfirm(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e && typeof e === "object" && "message" in e) ? String((e as any).message) : "Unknown error";
      toast({ title: "Failed to delete", description: msg, variant: "destructive" });
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const topCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 3);

  return (
    <div className="page-container">
      <div className="mb-5 flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} registered</p>
        </div>
        <Button size="sm" className="gap-1.5 rounded-xl gradient-primary shadow-glow-primary" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {/* Top Customers Highlight */}
      {topCustomers.length > 0 && !search && (
        <div className="mb-5 animate-slide-up">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Top Customers</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {topCustomers.map((c, i) => (
              <div key={c.id} className="shrink-0 rounded-2xl border border-border/40 bg-card px-4 py-3 min-w-[140px] shadow-soft">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-black text-primary">#{i + 1}</span>
                  <span className="text-sm font-bold truncate">{c.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">₹{c.totalSpent.toLocaleString("en-IN")} spent</p>
                <p className="text-xs text-accent font-semibold">{c.loyaltyPoints} pts</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-5 animate-slide-up">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, phone or email..." className="h-11 rounded-xl pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2.5">
        {filtered.map((c, i) => (
          <Card key={c.id} className="border-none shadow-soft transition-all duration-200 hover:shadow-medium animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-primary text-base font-bold text-primary-foreground shadow-sm">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{timeAgo(c.lastVisit)}</span>
                      <button
                        onClick={() => openEdit(c)}
                        className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(c.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                    {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="rounded-lg text-[10px] px-2 py-0.5 font-medium">₹{c.totalSpent.toLocaleString("en-IN")} spent</Badge>
                    <Badge variant="secondary" className="rounded-lg text-[10px] px-2 py-0.5 font-medium">{c.orderCount} orders</Badge>
                    <Badge className="rounded-lg bg-accent/15 text-accent text-[10px] px-2 py-0.5 font-semibold flex items-center gap-0.5 border-0">
                      <Award className="h-3 w-3" /> {c.loyaltyPoints} pts
                    </Badge>
                    {c.orderCount > 0 && (
                      <Badge variant="outline" className="rounded-lg text-[10px] px-2 py-0.5 font-medium">
                        avg ₹{Math.round(c.totalSpent / c.orderCount).toLocaleString("en-IN")}/order
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="border-none shadow-soft animate-scale-in">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                <User className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="mb-1 text-base font-semibold text-muted-foreground">
                {search ? "No customers found" : "No customers yet"}
              </p>
              <p className="text-sm text-muted-foreground/60">
                {search ? "Try a different search term" : "Add your first customer above"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Customer" : "Add Customer"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update customer details" : "Register a new customer for loyalty tracking"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Customer name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-11 pl-10 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-11 pl-10 rounded-xl" type="tel" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email (optional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-11 pl-10 rounded-xl" type="email" />
              </div>
            </div>
            <Button className="h-12 w-full rounded-xl gradient-primary" onClick={handleSave}>
              {editingId ? "Save Changes" : "Add Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Delete Customer
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the customer and all their data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;
