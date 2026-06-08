import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store, User, CreditCard, Bell, HelpCircle, LogOut, ChevronRight, Shield, Crown, Star, Zap,
  Phone, MapPin, Building, FileText, Save, ExternalLink, CheckCircle, AlertCircle,
  Moon, Sun, Users, Loader2, Camera, Mail, Lock, Eye, EyeOff, Pencil, RefreshCw,
  MessageSquare, Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useShopProfile } from "@/context/ShopProfileContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

const planIcons: Record<string, React.ElementType> = { free: Zap, starter: Star, pro: Crown };
const planColors: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  starter: "bg-primary/10 text-primary",
  pro: "bg-violet-100 text-violet-600",
};

// ─── Shop Profile Form ───────────────────────────────────────────────────────
function ShopProfileForm({ onClose }: { onClose: () => void }) {
  const { profile, saveProfile, loading } = useShopProfile();
  const [form, setForm] = useState({ ...profile });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm({ ...profile });
    }
  }, [profile, loading]);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.shopName.trim()) { toast({ title: "Shop name is required", variant: "destructive" }); return; }
    if (!form.ownerName.trim()) { toast({ title: "Owner name is required", variant: "destructive" }); return; }
    if (!form.phone.trim()) { toast({ title: "Phone number is required", variant: "destructive" }); return; }
    if (!form.address.trim()) { toast({ title: "Address is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await saveProfile(form);
      toast({ title: "Shop profile saved!", description: "Your details will appear on invoices." });
      onClose();
    } catch (e) {
      toast({ title: "Failed to save", description: String(e), variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading shop profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Required Information</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Shop / Store Name *</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="e.g., Sharma General Store" value={form.shopName} onChange={e => set("shopName", e.target.value)} className="pl-10 h-11 rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Owner Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="e.g., Ramesh Sharma" value={form.ownerName} onChange={e => set("ownerName", e.target.value)} className="pl-10 h-11 rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone Number *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="e.g., +91 98765 43210" value={form.phone} onChange={e => set("phone", e.target.value)} className="pl-10 h-11 rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Shop Address *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea placeholder="Shop address, street, landmark..."
                value={form.address} onChange={e => set("address", e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 h-20 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">City</label>
              <Input placeholder="e.g., Mumbai" value={form.city} onChange={e => set("city", e.target.value)} className="h-10 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">State</label>
              <Input placeholder="e.g., Maharashtra" value={form.state} onChange={e => set("state", e.target.value)} className="h-10 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Pincode</label>
            <Input placeholder="e.g., 400001" value={form.pincode} onChange={e => set("pincode", e.target.value)} className="h-10 rounded-xl text-sm" />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Optional Information</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Alternate Phone</label>
            <Input placeholder="+91 ..." value={form.alternatePhone ?? ""} onChange={e => set("alternatePhone", e.target.value)} className="h-10 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email</label>
            <Input placeholder="shop@email.com" value={form.email ?? ""} onChange={e => set("email", e.target.value)} className="h-10 rounded-xl text-sm" type="email" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">GSTIN</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="22AAAAA0000A1Z5" value={form.gstin ?? ""} onChange={e => set("gstin", e.target.value.toUpperCase())} className="pl-10 h-10 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">FSSAI License No.</label>
            <Input placeholder="12345678901234" value={form.fssaiNumber ?? ""} onChange={e => set("fssaiNumber", e.target.value)} className="h-10 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">UPI ID (shown on invoice QR)</label>
            <Input placeholder="shopname@upi" value={form.upiId ?? ""} onChange={e => set("upiId", e.target.value)} className="h-10 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Invoice Prefix</label>
            <Input placeholder="INV" value={form.invoicePrefix} onChange={e => set("invoicePrefix", e.target.value.toUpperCase())} className="h-10 rounded-xl text-sm" maxLength={6} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Thank You Message (on invoice)</label>
            <Input placeholder="Thank you for shopping with us!" value={form.thankYouMessage ?? ""} onChange={e => set("thankYouMessage", e.target.value)} className="h-10 rounded-xl text-sm" />
          </div>
        </div>
      </div>

      <Button className="h-12 w-full rounded-xl gradient-primary font-semibold gap-2" onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Shop Profile"}
      </Button>
    </div>
  );
}

// ─── Account / Profile Settings ──────────────────────────────────────────────
function AccountSettings({ onClose, employeeView }: { onClose: () => void; employeeView: boolean }) {
  const { user } = useAuth();
  const { profile } = useShopProfile();
  const [displayName, setDisplayName] = useState(profile.ownerName || "");
  const [savingName, setSavingName] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    if (profile.ownerName) {
      setDisplayName(profile.ownerName);
    }
  }, [profile.ownerName]);

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      toast({ title: "Name cannot be empty", variant: "destructive" });
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
      if (error) throw error;
      toast({ title: "Display name updated!" });
    } catch (e) {
      toast({ title: "Failed to update name", description: String(e), variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Avatar */}
      <div className="flex flex-col items-center py-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-extrabold text-3xl">
              {(displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </span>
          </div>
          <button
            className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow border-2 border-background"
            onClick={() => toast({ title: "Photo upload coming soon", description: "This feature will be available in the next update." })}
          >
            <Camera className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
        <p className="mt-3 font-bold text-foreground">{displayName || "Set your name"}</p>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
      </div>

      {/* Display name */}
      <div className="rounded-2xl bg-secondary/40 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Display Name</p>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Your name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Button className="w-full h-10 rounded-xl gradient-primary gap-2 text-sm" onClick={handleSaveDisplayName} disabled={savingName}>
          <Save className="h-3.5 w-3.5" /> {savingName ? "Saving..." : "Save Name"}
        </Button>
      </div>

      {/* Account Info */}
      <div className="rounded-2xl bg-secondary/40 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Info</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-semibold">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Account created</p>
              <p className="text-sm font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-semibold capitalize">{employeeView ? "Employee" : "Shop Admin"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password toggle */}
      <button
        className="w-full flex items-center justify-between rounded-2xl border border-border/60 bg-background px-4 py-3.5 hover:bg-secondary/40 transition-colors"
        onClick={() => setShowPasswordSection(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Change Password</span>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showPasswordSection ? "rotate-90" : ""}`} />
      </button>

      {showPasswordSection && <PasswordChangeForm />}
    </div>
  );
}

// ─── Password Change Form ─────────────────────────────────────────────────────
function PasswordChangeForm() {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (newPw.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast({ title: "Password updated successfully!", description: "Your new password is active." });
      setNewPw("");
      setConfirmPw("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Failed to update password", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-secondary/40 p-4 space-y-3 animate-slide-up">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</p>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type={showNew ? "text" : "password"}
          placeholder="New password (min 6 chars)"
          value={newPw}
          onChange={e => setNewPw(e.target.value)}
          className="pl-10 pr-10 h-11 rounded-xl"
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowNew(v => !v)}>
          {showNew ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type={showConfirm ? "text" : "password"}
          placeholder="Confirm new password"
          value={confirmPw}
          onChange={e => setConfirmPw(e.target.value)}
          className="pl-10 pr-10 h-11 rounded-xl"
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowConfirm(v => !v)}>
          {showConfirm ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>
      {/* Strength indicator */}
      {newPw.length > 0 && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                newPw.length >= i * 3
                  ? newPw.length >= 10 ? "bg-emerald-500" : newPw.length >= 6 ? "bg-amber-500" : "bg-red-500"
                  : "bg-secondary"
              }`} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {newPw.length < 6 ? "Too short" : newPw.length < 10 ? "Fair — try a longer password" : "Strong password"}
          </p>
        </div>
      )}
      <Button className="w-full h-11 rounded-xl gradient-primary gap-2" onClick={handleChange} disabled={saving || !newPw || !confirmPw}>
        <Lock className="h-4 w-4" /> {saving ? "Updating..." : "Update Password"}
      </Button>
    </div>
  );
}

// ─── Notification Settings ────────────────────────────────────────────────────
function NotificationSettings({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [lowStock, setLowStock] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [paymentAlert, setPaymentAlert] = useState(true);
  const [newOrder, setNewOrder] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      
      let preferences = null;
      try {
        const { data } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        preferences = data;
      } catch (err) {
        console.error("Failed to load notification preferences from Supabase:", err);
      }

      if (!preferences) {
        const localData = localStorage.getItem(`notif_prefs_${user.id}`);
        if (localData) {
          try {
            preferences = JSON.parse(localData);
          } catch (e) {
            console.error("Failed to parse local notification preferences:", e);
          }
        }
      }

      if (preferences) {
        setLowStock(preferences.low_stock ?? true);
        setDailySummary(preferences.daily_summary ?? false);
        setPaymentAlert(preferences.payment_alert ?? true);
        setNewOrder(preferences.new_order ?? true);
      }
      setLoading(false);
    };
    void load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      low_stock: lowStock,
      daily_summary: dailySummary,
      payment_alert: paymentAlert,
      new_order: newOrder,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      // Table may not exist — save locally and show success anyway
      localStorage.setItem(`notif_prefs_${user.id}`, JSON.stringify(payload));
    }
    toast({ title: "Notification preferences saved!" });
    onClose();
  };

  const Toggle = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-3.5 border-b border-border/40 last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors duration-300 shrink-0 ${checked ? "bg-primary" : "bg-secondary"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-1">
      <Toggle label="Low Stock Alerts" desc="Notify when products fall below minimum stock" checked={lowStock} onChange={setLowStock} />
      <Toggle label="New Order Notifications" desc="Alert when a new order is placed" checked={newOrder} onChange={setNewOrder} />
      <Toggle label="Daily Sales Summary" desc="Get a summary of daily sales at end of day" checked={dailySummary} onChange={setDailySummary} />
      <Toggle label="Payment Confirmations" desc="Alert when payment is confirmed" checked={paymentAlert} onChange={setPaymentAlert} />
      <div className="pt-3">
        <Button className="w-full h-11 rounded-xl gradient-primary font-semibold gap-2" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}

// ─── Security Settings ────────────────────────────────────────────────────────
function SecuritySettings({ onClose }: { onClose: () => void }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOutAllDevices = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
      navigate("/login");
      toast({ title: "Signed out from all devices" });
    } catch {
      await signOut();
      navigate("/login");
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      toast({ title: "Failed to send reset email", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reset email sent!", description: `Check ${user.email} for a password reset link.` });
      onClose();
    }
  };

  return (
    <div className="space-y-4">
      <PasswordChangeForm />

      <div className="rounded-2xl bg-secondary/40 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password Reset</p>
        <p className="text-xs text-muted-foreground">Prefer to reset via email? We'll send a secure link to your inbox.</p>
        <Button variant="outline" className="w-full h-10 rounded-xl gap-2 text-sm" onClick={handleSendPasswordReset}>
          <Mail className="h-4 w-4" /> Send Reset Link to Email
        </Button>
      </div>

      <div className="rounded-2xl border border-destructive/20 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-destructive">Danger Zone</p>
        <p className="text-xs text-muted-foreground">This will sign you out from all devices including this one.</p>
        <Button variant="destructive" className="w-full h-10 rounded-xl gap-2 text-sm" onClick={handleSignOutAllDevices}>
          <LogOut className="h-4 w-4" /> Sign Out of All Devices
        </Button>
      </div>
    </div>
  );
}

// ─── Help & FAQ ───────────────────────────────────────────────────────────────
function HelpSection({ onClose }: { onClose: () => void }) {
  const faqs = [
    { q: "How do I add products?", a: "Go to Products page and tap the + button. You can add name, price, barcode, stock, and GST." },
    { q: "How do I scan barcodes?", a: "Go to Cart or Scan page and tap the Scan button. Allow camera access when prompted." },
    { q: "How do I download an invoice?", a: "After checkout, tap 'Download Invoice' on the order complete screen. Or go to Orders and tap any order." },
    { q: "How do I set up UPI?", a: "Go to Settings → Shop Profile and enter your UPI ID. It will appear as a QR code on invoices." },
    { q: "How do staff invites work?", a: "Go to Employees page, add a staff member's name and email. They sign up with that email and automatically get employee access." },
    { q: "How does Razorpay work?", a: "Select Razorpay at checkout for digital payments. Customers can pay via card, UPI, net banking, or wallets." },
    { q: "How do I upgrade my plan?", a: "Go to Settings → Subscription to view plans and upgrade. Plans start at ₹199/month." },
  ];

  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
      {faqs.map((f, i) => (
        <button key={i} onClick={() => setExpanded(expanded === i ? null : i)}
          className="w-full text-left rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{f.q}</p>
            <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded === i ? "rotate-90" : ""}`} />
          </div>
          {expanded === i && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-2 border-t border-border/40 pt-2">{f.a}</p>
          )}
        </button>
      ))}
      <div className="pt-2 rounded-xl bg-primary/5 p-4 text-center">
        <p className="text-sm font-semibold text-foreground mb-1">Need more help?</p>
        <p className="text-xs text-muted-foreground mb-3">Contact us at support@shopscan.app</p>
        <Button variant="outline" className="w-full h-10 rounded-xl gap-2 text-sm"
          onClick={() => { navigator.clipboard.writeText("support@shopscan.app"); toast({ title: "Email copied!" }); }}>
          <ExternalLink className="h-4 w-4" /> Copy Support Email
        </Button>
      </div>
    </div>
  );
}

// ─── Main SettingsPage ────────────────────────────────────────────────────────
const SettingsPage = ({ employeeView = false }: { employeeView?: boolean }) => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { subscription, currentPlan, isTrialing, trialDaysLeft } = useSubscription();
  const { profile, isProfileComplete } = useShopProfile();
  const { theme, toggleTheme } = useTheme();
  const [activeModal, setActiveModal] = useState<null | "shop" | "account" | "notifications" | "security" | "help" | "shift_stats" | "shop_details">(null);

  const [employeeRecord, setEmployeeRecord] = useState<Record<string, unknown> | null>(null);
  const [shopRecord, setShopRecord] = useState<Record<string, unknown> | null>(null);
  const [empLoading, setEmpLoading] = useState(false);

  useEffect(() => {
    if (!employeeView || !user) return;
    const load = async () => {
      setEmpLoading(true);
      try {
        const { data: emp } = await supabase.from("employees").select("*").eq("user_id", user.id).maybeSingle();
        if (emp) {
          setEmployeeRecord(emp as Record<string, unknown>);
          const { data: shop } = await supabase.from("shop_profiles").select("*").eq("user_id", (emp as Record<string, unknown>).shop_owner_id).maybeSingle();
          if (shop) setShopRecord(shop as Record<string, unknown>);
        }
      } finally {
        setEmpLoading(false);
      }
    };
    void load();
  }, [employeeView, user]);

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const PlanIcon = planIcons[subscription?.plan_id ?? "free"] ?? Zap;
  const planBadgeClass = planColors[subscription?.plan_id ?? "free"];

  const adminMenuItems = [
    {
      label: "Shop Profile",
      description: isProfileComplete ? `${profile.shopName} · ${profile.phone}` : "⚠ Complete your shop details for invoices",
      icon: Store,
      onClick: () => setActiveModal("shop"),
      badge: !isProfileComplete
        ? <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600"><AlertCircle className="h-3 w-3" /> Incomplete</span>
        : <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><CheckCircle className="h-3 w-3" /> Set up</span>,
    },
    {
      label: "Account & Profile",
      description: user?.email ?? "Name, avatar, email",
      icon: User,
      onClick: () => setActiveModal("account"),
    },
    {
      label: "Staff & Employees",
      description: "Invite staff members, manage access and balances",
      icon: Users,
      onClick: () => navigate("/employees"),
    },
    {
      label: "Subscription",
      description: isTrialing ? `Free trial · ${trialDaysLeft} days left` : `${currentPlan?.name ?? "Free"} plan · ${subscription?.status ?? ""}`,
      icon: CreditCard,
      onClick: () => navigate("/settings/subscription"),
      badge: <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${planBadgeClass}`}>
        <PlanIcon className="h-3 w-3" />{currentPlan?.name ?? "Free"}
      </span>,
    },
    {
      label: "Notifications",
      description: "Low stock alerts, daily summary, payment alerts",
      icon: Bell,
      onClick: () => setActiveModal("notifications"),
    },
    {
      label: "Security",
      description: "Change password, active sessions",
      icon: Shield,
      onClick: () => setActiveModal("security"),
    },
    {
      label: "Help & Support",
      description: "FAQs, contact us",
      icon: HelpCircle,
      onClick: () => setActiveModal("help"),
    },
  ];

  const employeeMenuItems = [
    {
      label: "My Profile",
      description: user?.email ?? "Employee credentials",
      icon: User,
      onClick: () => setActiveModal("account"),
    },
    {
      label: "Shift Summary",
      description: employeeRecord
        ? `Collected: ₹${Number(employeeRecord.collected_amount ?? 0).toLocaleString("en-IN")} · Orders: ${employeeRecord.orders_today ?? 0}`
        : "View your shift balances and stats",
      icon: CreditCard,
      onClick: () => setActiveModal("shift_stats"),
    },
    {
      label: "Shop Details",
      description: shopRecord
        ? `${shopRecord.shop_name} · ${shopRecord.phone}`
        : "View store profile details",
      icon: Store,
      onClick: () => setActiveModal("shop_details"),
    },
    {
      label: "Security Settings",
      description: "Change password, active sessions",
      icon: Shield,
      onClick: () => setActiveModal("security"),
    },
    {
      label: "Help & FAQ",
      description: "Cashier guides, FAQs",
      icon: HelpCircle,
      onClick: () => setActiveModal("help"),
    },
  ];

  const menuItems = employeeView ? employeeMenuItems : adminMenuItems;

  const modalTitles: Record<string, string> = {
    shop: "Shop Profile",
    account: employeeView ? "My Profile" : "Account & Profile",
    notifications: "Notifications",
    security: "Security",
    help: "Help & Support",
    shift_stats: "Shift Summary",
    shop_details: "Shop Profile Details",
  };

  const displayName = profile.ownerName || user?.user_metadata?.display_name || "";

  return (
    <div className="page-container">
      <div className="mb-6 animate-fade-in">
        <h1 className="page-title">{employeeView ? "My Profile" : "Settings"}</h1>
        <p className="text-sm text-muted-foreground">
          {employeeView ? "Manage your employee profile" : "Manage your store preferences"}
        </p>
      </div>

      {/* Banners */}
      {!employeeView && !isProfileComplete && (
        <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 animate-slide-up">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">📋 Complete your shop profile</p>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Add shop name, owner name, and contact info. This appears on all invoices.</p>
          <button onClick={() => setActiveModal("shop")} className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-400 hover:underline">Set up now →</button>
        </div>
      )}
      {!employeeView && isTrialing && trialDaysLeft <= 5 && (
        <div className="mb-4 rounded-2xl bg-warning/10 border border-warning/20 p-4 animate-slide-up">
          <p className="text-sm font-semibold">⏰ Trial ending soon</p>
          <p className="text-xs text-muted-foreground mt-0.5">{trialDaysLeft} days left. Upgrade to keep your data.</p>
          <button onClick={() => navigate("/settings/subscription")} className="mt-2 text-xs font-semibold text-primary hover:underline">View plans →</button>
        </div>
      )}

      {/* Profile Card */}
      {user && (
        <Card className="mb-5 border-none shadow-soft animate-slide-up overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-primary/20 to-violet-500/20" />
          <CardContent className="px-4 pb-4 pt-0">
            <div className="flex items-end gap-3 -mt-8">
              <button
                className="relative shrink-0"
                onClick={() => setActiveModal("account")}
              >
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg border-2 border-background">
                  <span className="text-white font-extrabold text-2xl">
                    {((displayName || user.email || "U")[0]).toUpperCase()}
                  </span>
                </div>
                <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  <Pencil className="h-2.5 w-2.5 text-white" />
                </div>
              </button>
              <div className="flex-1 min-w-0 pb-1">
                <p className="font-bold text-foreground truncate">
                  {employeeView ? (employeeRecord?.name as string || "Employee") : (displayName || "Shop Owner")}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              {employeeView ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 text-[10px] font-semibold mb-1">
                  <Users className="h-3 w-3" />Employee
                </span>
              ) : (
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${planBadgeClass} mb-1`}>
                  <PlanIcon className="h-3 w-3" />{currentPlan?.name ?? "Free"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-5 border-none shadow-soft animate-slide-up">
        <CardContent className="p-0">
          {menuItems.map(({ label, description, icon: Icon, onClick, badge }, i) => (
            <button key={label} onClick={onClick}
              className={`flex w-full items-center gap-3.5 px-5 py-4 text-left transition-all duration-200 hover:bg-secondary/50 active:scale-[0.99] ${i < menuItems.length - 1 ? "border-b border-border/40" : ""}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground truncate">{description}</p>
              </div>
              {badge ?? <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
            </button>
          ))}
          {/* Dark Mode Toggle */}
          <div className="flex w-full items-center gap-3.5 px-5 py-4 border-t border-border/40">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8">
              {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Dark Mode</p>
              <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark theme is on" : "Light theme is on"}</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${theme === "dark" ? "bg-primary" : "bg-secondary"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${theme === "dark" ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      <button onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-destructive/20 py-3.5 text-sm font-semibold text-destructive transition-all duration-200 hover:bg-destructive/5 active:scale-[0.98]">
        <LogOut className="h-4 w-4" /> Sign Out
      </button>

      <p className="mt-8 text-center text-xs text-muted-foreground/50">SmartMiniScanKart v2.0.0</p>

      {/* Modals */}
      <Dialog open={!!activeModal} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeModal ? modalTitles[activeModal] : ""}</DialogTitle>
            <DialogDescription>Manage your {activeModal ? modalTitles[activeModal].toLowerCase() : "settings"}</DialogDescription>
          </DialogHeader>
          {activeModal === "shop" && <ShopProfileForm onClose={() => setActiveModal(null)} />}
          {activeModal === "account" && <AccountSettings onClose={() => setActiveModal(null)} employeeView={employeeView} />}
          {activeModal === "notifications" && <NotificationSettings onClose={() => setActiveModal(null)} />}
          {activeModal === "security" && <SecuritySettings onClose={() => setActiveModal(null)} />}
          {activeModal === "help" && <HelpSection onClose={() => setActiveModal(null)} />}

          {activeModal === "shift_stats" && employeeRecord && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/40 bg-secondary/30 p-4">
                <p className="text-sm font-bold mb-3">Shift Statistics</p>
                <div className="space-y-2.5 text-sm">
                  {[
                    { label: "Cashier Name", value: employeeRecord.name as string },
                    { label: "Status", value: <Badge className="bg-emerald-500 text-white rounded-lg text-[10px] px-2 py-0.5">{String(employeeRecord.status)}</Badge> },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-border/40 pt-2 space-y-2">
                    {[
                      { label: "Opening Balance", value: `₹${Number(employeeRecord.opening_balance ?? 0).toLocaleString("en-IN")}`, cls: "" },
                      { label: "Collected", value: `+₹${Number(employeeRecord.collected_amount ?? 0).toLocaleString("en-IN")}`, cls: "text-emerald-600" },
                      { label: "Pending Dues", value: `-₹${Number(employeeRecord.due_amount ?? 0).toLocaleString("en-IN")}`, cls: "text-destructive" },
                      { label: "Orders Processed", value: `${employeeRecord.orders_today ?? 0} orders`, cls: "" },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-bold ${cls}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-primary/5 p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Net Balance</p>
                  <p className="mt-1 text-xl font-extrabold">
                    ₹{(Number(employeeRecord.collected_amount ?? 0) - Number(employeeRecord.due_amount ?? 0)).toLocaleString("en-IN")}
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full">Shift Balance</Badge>
              </div>
              <Button className="w-full h-11 rounded-xl" onClick={() => setActiveModal(null)}>Close</Button>
            </div>
          )}

          {activeModal === "shop_details" && shopRecord && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/40 bg-secondary/30 p-4">
                <p className="text-sm font-bold mb-3">{String(shopRecord.shop_name)}</p>
                <div className="space-y-2.5 text-sm">
                  {[
                    { label: "Owner", value: shopRecord.owner_name },
                    { label: "Phone", value: shopRecord.phone },
                    shopRecord.email ? { label: "Email", value: shopRecord.email } : null,
                    { label: "Address", value: shopRecord.address },
                    shopRecord.gstin ? { label: "GSTIN", value: shopRecord.gstin } : null,
                  ].filter(Boolean).map(item => (
                    <div key={String(item!.label)} className="flex justify-between gap-3">
                      <span className="text-muted-foreground shrink-0">{String(item!.label)}</span>
                      <span className="font-semibold text-right">{String(item!.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="w-full h-11 rounded-xl" onClick={() => setActiveModal(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
