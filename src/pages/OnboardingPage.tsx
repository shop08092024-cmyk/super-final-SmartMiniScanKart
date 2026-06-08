import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, User, Phone, MapPin, KeyRound, ArrowRight, Loader2, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useShopProfile } from "@/context/ShopProfileContext";
import { toast } from "sonner";

const OnboardingPage = () => {
  const { claimInvite, refreshRole, signOut } = useAuth();
  const { saveProfile } = useShopProfile();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"choose" | "create_store" | "join_store">("choose");
  const [submitting, setSubmitting] = useState(false);

  // Shop setup form
  const [shopForm, setShopForm] = useState({
    shopName: "",
    ownerName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  // Invite code state
  const [inviteCode, setInviteCode] = useState("");

  const handleShopChange = (k: string, v: string) => {
    setShopForm((f) => ({ ...f, [k]: v }));
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopForm.shopName.trim()) {
      toast.error("Shop name is required");
      return;
    }
    if (!shopForm.ownerName.trim()) {
      toast.error("Owner name is required");
      return;
    }
    if (!shopForm.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!shopForm.address.trim()) {
      toast.error("Shop address is required");
      return;
    }

    setSubmitting(true);
    try {
      await saveProfile({
        shopName: shopForm.shopName.trim(),
        ownerName: shopForm.ownerName.trim(),
        phone: shopForm.phone.trim(),
        address: shopForm.address.trim(),
        city: shopForm.city.trim(),
        state: shopForm.state.trim(),
        pincode: shopForm.pincode.trim(),
        currency: "INR",
        invoicePrefix: "INV",
      });

      toast.success("Shop set up successfully! Welcome to MiniScanKart 🎉");
      await refreshRole();
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create shop profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter a valid invitation code");
      return;
    }

    setSubmitting(true);
    try {
      const res = await claimInvite(cleanCode);
      if (res.success) {
        toast.success("Joined shop successfully! Redirecting to dashboard...");
        navigate("/employee/dashboard");
      } else {
        toast.error(res.error?.message || "Failed to claim invitation");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="absolute top-6 right-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="rounded-xl gap-2 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="relative mb-8 text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow-primary">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Complete Your Setup</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Select how you want to access MiniScanKart</p>
      </div>

      <div className="w-full max-w-lg animate-slide-up relative">
        {mode === "choose" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Admin option */}
            <Card
              onClick={() => setMode("create_store")}
              className="border border-border/50 bg-card hover:border-primary/50 cursor-pointer shadow-soft transition-all duration-300 hover:shadow-elevated hover:scale-[1.02] group"
            >
              <CardContent className="p-6 flex flex-col h-full items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Store className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Create Store</h3>
                <p className="text-sm text-muted-foreground mb-6 flex-grow">
                  Set up a new store. Register inventory, customize receipts, and add cashiers to manage your business.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  Get Started <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </span>
              </CardContent>
            </Card>

            {/* Employee option */}
            <Card
              onClick={() => setMode("join_store")}
              className="border border-border/50 bg-card hover:border-primary/50 cursor-pointer shadow-soft transition-all duration-300 hover:shadow-elevated hover:scale-[1.02] group"
            >
              <CardContent className="p-6 flex flex-col h-full items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Join as Staff</h3>
                <p className="text-sm text-muted-foreground mb-6 flex-grow">
                  Enter an invitation code generated by your shop owner to link this device to their shop cashier system.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                  Claim Invite <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        {mode === "create_store" && (
          <Card className="border border-border/50 bg-card shadow-elevated">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-1">Create Your Store</h2>
              <p className="text-xs text-muted-foreground mb-5">
                Fill in the details to generate your store profile and start billing.
              </p>

              <form onSubmit={handleCreateStore} className="space-y-3.5">
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Shop / Store Name *"
                    value={shopForm.shopName}
                    onChange={(e) => handleShopChange("shopName", e.target.value)}
                    required
                    className="h-11 rounded-xl pl-10 text-sm border-border/60 bg-secondary/30 transition-colors focus:bg-card"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Owner Name *"
                    value={shopForm.ownerName}
                    onChange={(e) => handleShopChange("ownerName", e.target.value)}
                    required
                    className="h-11 rounded-xl pl-10 text-sm border-border/60 bg-secondary/30 transition-colors focus:bg-card"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Phone Number *"
                    type="tel"
                    value={shopForm.phone}
                    onChange={(e) => handleShopChange("phone", e.target.value)}
                    required
                    className="h-11 rounded-xl pl-10 text-sm border-border/60 bg-secondary/30 transition-colors focus:bg-card"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    placeholder="Shop Address *"
                    value={shopForm.address}
                    onChange={(e) => handleShopChange("address", e.target.value)}
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 h-18 rounded-xl border border-border/60 bg-secondary/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City"
                    value={shopForm.city}
                    onChange={(e) => handleShopChange("city", e.target.value)}
                    className="h-10 rounded-xl text-sm border-border/60 bg-secondary/30 focus:bg-card transition-colors"
                  />
                  <Input
                    placeholder="State"
                    value={shopForm.state}
                    onChange={(e) => handleShopChange("state", e.target.value)}
                    className="h-10 rounded-xl text-sm border-border/60 bg-secondary/30 focus:bg-card transition-colors"
                  />
                </div>
                <Input
                  placeholder="Pincode"
                  value={shopForm.pincode}
                  onChange={(e) => handleShopChange("pincode", e.target.value)}
                  className="h-10 rounded-xl text-sm border-border/60 bg-secondary/30 focus:bg-card transition-colors"
                />

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11 rounded-xl text-sm"
                    onClick={() => setMode("choose")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-11 rounded-xl gradient-primary text-sm font-semibold shadow-glow-primary"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Create Store"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === "join_store" && (
          <Card className="border border-border/50 bg-card shadow-elevated">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-1">Enter Invitation Code</h2>
              <p className="text-xs text-muted-foreground mb-5">
                Input the 8-character invite code provided by your store administrator (e.g. INV-A94D2K).
              </p>

              <form onSubmit={handleJoinStore} className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="INV-XXXXXX"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    className="h-12 rounded-xl pl-10 tracking-widest text-base font-mono border-border/60 bg-secondary/30 uppercase focus:bg-card transition-colors"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11 rounded-xl text-sm"
                    onClick={() => setMode("choose")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 text-sm font-semibold"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      "Join Shop"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
