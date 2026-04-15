import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus, Search, Edit2, Trash2, ScanBarcode, Package, AlertTriangle,
  TrendingUp, ArrowRight, Upload, Download, CheckCircle2, XCircle, AlertCircle, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, Product } from "@/store/useStore";
import { useSubscription } from "@/context/SubscriptionContext";
import BarcodeScanner from "@/components/BarcodeScanner";
import { toast } from "@/hooks/use-toast";

const categories = ["Snacks", "Dairy", "Grocery", "Beverages", "Household", "Bakery", "Personal Care", "Other"];

const emptyForm = {
  name: "", barcode: "", price: 0, mrp: 0, costPrice: 0, category: "Other",
  stock: 0, minStock: 5, taxPercent: 5,
};

const playBeep = (success = true) => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = success ? 1200 : 400;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
};

// ─── CSV Parsing ─────────────────────────────────────────────────────────────

interface CsvRow {
  name: string;
  barcode: string;
  price: number;
  mrp: number;
  costPrice: number;
  category: string;
  stock: number;
  minStock: number;
  taxPercent: number;
}

interface ParseResult {
  valid: CsvRow[];
  errors: { row: number; reason: string; raw: string }[];
}

const downloadTemplate = () => {
  const header = "name,barcode,price,mrp,costPrice,category,stock,minStock,taxPercent";
  const example = "Sample Product,1234567890,100,120,80,Grocery,50,5,5";
  const blob = new Blob([header + "\n" + example], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products_template.csv";
  a.click();
  URL.revokeObjectURL(url);
};

const parseCsv = (text: string, existingBarcodes: Set<string>): ParseResult => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    return {
      valid: [],
      errors: [{ row: 0, reason: "File is empty or has no data rows. Download the template to get started.", raw: "" }],
    };
  }

  // Normalise header names (lowercase, strip spaces/quotes)
  const rawHeaders = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());

  // Build a map: canonical field → column index
  const headerAliases: Record<string, string> = {
    name: "name", "product name": "name", "item name": "name",
    barcode: "barcode", "barcode no": "barcode", ean: "barcode", sku: "barcode",
    price: "price", "selling price": "price", "sale price": "price",
    mrp: "mrp", "max retail price": "mrp",
    costprice: "costPrice", "cost price": "costPrice", "purchase price": "costPrice", cost: "costPrice",
    category: "category", cat: "category", type: "category",
    stock: "stock", qty: "stock", quantity: "stock", "opening stock": "stock",
    minstock: "minStock", "min stock": "minStock", "minimum stock": "minStock", reorder: "minStock",
    taxpercent: "taxPercent", "tax %": "taxPercent", gst: "taxPercent", "gst %": "taxPercent",
  };

  const colIndex: Partial<Record<string, number>> = {};
  rawHeaders.forEach((h, i) => {
    const canonical = headerAliases[h];
    if (canonical) colIndex[canonical] = i;
  });

  const missing = (["name", "barcode", "price"] as const).filter(f => colIndex[f] === undefined);
  if (missing.length) {
    return { valid: [], errors: [{ row: 0, reason: `Missing required columns: ${missing.join(", ")}. Check that your CSV header matches the template.`, raw: lines[0] }] };
  }

  const valid: CsvRow[] = [];
  const errors: ParseResult["errors"] = [];

  lines.slice(1).forEach((line, idx) => {
    const rowNum = idx + 2; // 1-based, accounting for header
    // Handle quoted fields with commas inside them
    const cells = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g)?.map(c => c.replace(/^"|"$/g, "").trim()) ?? line.split(",").map(c => c.trim());

    const get = (field: string, fallback = "") => {
      const i = colIndex[field];
      return i !== undefined && i < cells.length ? cells[i] : fallback;
    };
    const getNum = (field: string, fallback = 0) => {
      const v = parseFloat(get(field, String(fallback)));
      return isNaN(v) ? fallback : v;
    };

    const name = get("name").trim();
    const barcode = get("barcode").trim();
    const price = getNum("price");

    if (!name) { errors.push({ row: rowNum, reason: "Name is empty", raw: line }); return; }
    if (!barcode) { errors.push({ row: rowNum, reason: "Barcode is empty", raw: line }); return; }
    if (price <= 0) { errors.push({ row: rowNum, reason: `Price must be > 0 (got "${get("price")}")`, raw: line }); return; }
    if (existingBarcodes.has(barcode)) { errors.push({ row: rowNum, reason: `Barcode "${barcode}" already exists in your inventory`, raw: line }); return; }

    const mrp = getNum("mrp") || price;
    const category = get("category", "Other").trim();
    const validCategory = categories.includes(category) ? category : "Other";

    valid.push({
      name,
      barcode,
      price,
      mrp,
      costPrice: getNum("costPrice"),
      category: validCategory,
      stock: Math.max(0, Math.round(getNum("stock"))),
      minStock: Math.max(0, Math.round(getNum("minStock", 5))),
      taxPercent: Math.max(0, getNum("taxPercent", 5)),
    });
  });

  return { valid, errors };
};

// ─── Component ───────────────────────────────────────────────────────────────

const ProductsPage = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const { canAddProduct, currentPlan, subscription } = useSubscription();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerForDialog, setScannerForDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newStockInput, setNewStockInput] = useState<number>(0);
  const [existingProductBarcode, setExistingProductBarcode] = useState<Product | null>(null);

  // CSV import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvParsed, setCsvParsed] = useState<ParseResult | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvDone, setCsvDone] = useState(false);
  const [csvImportedCount, setCsvImportedCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("filter") === "lowstock") {
      setLowStockOnly(true);
    }
  }, [location.search]);

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
    const matchesCat = catFilter === "All" || p.category === catFilter;
    const matchesLowStock = !lowStockOnly || p.stock <= p.minStock;
    return matchesSearch && matchesCat && matchesLowStock;
  });

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setNewStockInput(0); setDialogOpen(true); };
  const openEdit = (p: Product) => {
    setForm({ name: p.name, barcode: p.barcode, price: p.price, mrp: p.mrp ?? p.price, costPrice: p.costPrice, category: p.category, stock: p.stock, minStock: p.minStock, taxPercent: p.taxPercent });
    setEditingId(p.id);
    setNewStockInput(0);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.barcode.trim()) {
      toast({ title: "Missing fields", description: "Name and barcode are required", variant: "destructive" });
      return;
    }
    if (form.price <= 0) {
      toast({ title: "Invalid price", description: "Price must be greater than 0", variant: "destructive" });
      return;
    }
    if (!editingId) {
      if (!canAddProduct(products.length)) {
        const limit = currentPlan?.product_limit ?? 0;
        toast({
          title: `Product limit reached (${limit})`,
          description: `Your ${currentPlan?.name ?? "current"} plan allows up to ${limit} products. Upgrade to add more.`,
          variant: "destructive",
        });
        return;
      }
      const duplicate = products.find((p) => p.barcode === form.barcode.trim());
      if (duplicate) {
        toast({ title: "Barcode already exists", description: `"${duplicate.name}" uses this barcode.`, variant: "destructive" });
        return;
      }
    }
    try {
      if (editingId) {
        const finalStock = newStockInput > 0 ? form.stock + newStockInput : form.stock;
        await updateProduct(editingId, { ...form, stock: finalStock });
        toast({ title: "Product updated ✓", description: newStockInput > 0 ? `Stock: ${form.stock} + ${newStockInput} = ${finalStock}` : undefined });
      } else {
        await addProduct({ ...form, mrp: form.mrp || form.price });
        toast({ title: "Product added ✓" });
      }
      setDialogOpen(false);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to save product", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    toast({ title: "Product deleted" });
    setDeleteConfirm(null);
  };

  const handleBarcodeScan = (barcode: string) => {
    setScannerOpen(false);
    setScannerForDialog(false);
    playBeep(true);
    const existing = products.find((p) => p.barcode === barcode);
    if (existing) { setExistingProductBarcode(existing); return; }
    setForm((prev) => ({ ...prev, barcode }));
    setEditingId(null);
    setNewStockInput(0);
    setDialogOpen(true);
    toast({ title: "Barcode scanned", description: barcode });
  };

  // ── CSV import handlers ──────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.name.endsWith(".csv")) {
      toast({ title: "Wrong file type", description: "Please upload a .csv file", variant: "destructive" });
      return;
    }

    setCsvFileName(file.name);
    setCsvDone(false);
    setCsvImportedCount(0);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const existingBarcodes = new Set(products.map(p => p.barcode));
      const result = parseCsv(text, existingBarcodes);
      setCsvParsed(result);
      setCsvDialogOpen(true);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvParsed?.valid.length) return;
    setCsvImporting(true);
    let imported = 0;
    const failed: string[] = [];

    for (const row of csvParsed.valid) {
      if (!canAddProduct(products.length + imported)) {
        const limit = currentPlan?.product_limit ?? 0;
        toast({
          title: `Product limit reached (${limit})`,
          description: `Imported ${imported} product${imported !== 1 ? "s" : ""} before hitting the ${currentPlan?.name ?? ""} plan limit. Upgrade to import more.`,
          variant: "destructive",
        });
        break;
      }
      try {
        await addProduct({ ...row, mrp: row.mrp || row.price });
        imported++;
      } catch (e) {
        failed.push(row.name);
        console.error("Failed to import row:", row.name, e);
      }
    }

    setCsvImporting(false);
    setCsvImportedCount(imported);
    setCsvDone(true);

    if (failed.length === 0) {
      toast({ title: `✅ Imported ${imported} product${imported !== 1 ? "s" : ""}` });
    } else {
      toast({
        title: `Imported ${imported} product${imported !== 1 ? "s" : ""} with ${failed.length} failure${failed.length !== 1 ? "s" : ""}`,
        description: `Failed: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? ` +${failed.length - 3} more` : ""}`,
        variant: "destructive",
      });
    }
  };

  const closeCsvDialog = () => {
    setCsvDialogOpen(false);
    setCsvParsed(null);
    setCsvFileName("");
    setCsvDone(false);
    setCsvImportedCount(0);
  };

  const uniqueCategories: string[] = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div className="page-container">
      <div className="mb-5 flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} items
            {lowStockCount > 0 && <span className="ml-1 text-warning font-medium">· {lowStockCount} low stock</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Import</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setScannerOpen(true)}>
            <ScanBarcode className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="gap-1.5 rounded-xl gradient-primary shadow-glow-primary"
            onClick={openAdd}
            disabled={!canAddProduct(products.length)}
            title={!canAddProduct(products.length) ? `Product limit reached on ${currentPlan?.name} plan` : undefined}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* Plan usage banner */}
      {currentPlan?.product_limit != null && (() => {
        const limit = currentPlan.product_limit!;
        const pct = products.length / limit;
        const atLimit = products.length >= limit;
        const nearLimit = pct >= 0.8 && !atLimit;
        if (!atLimit && !nearLimit) return null;
        return (
          <div className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 animate-fade-in ${atLimit ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold">
                {atLimit ? `Product limit reached — ${products.length}/${limit}` : `${products.length}/${limit} products used`}
              </p>
              <p className="text-[11px] opacity-80">
                {atLimit ? `Upgrade from ${currentPlan.name} to add more products.` : `${limit - products.length} slots remaining on ${currentPlan.name} plan.`}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Low Stock Filter Banner */}
      {lowStockOnly && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm font-semibold text-destructive">Showing low stock items only ({filtered.length})</p>
          </div>
          <button onClick={() => setLowStockOnly(false)} className="text-xs font-semibold text-destructive hover:underline">
            Show all
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-3 animate-slide-up">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name or barcode..." className="h-11 rounded-xl pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Category Filters */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 animate-slide-up" style={{ animationDelay: "50ms" }}>
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${lowStockOnly ? "bg-destructive text-white shadow-sm" : "bg-card text-muted-foreground shadow-soft hover:shadow-medium"}`}>
          <AlertTriangle className="h-3 w-3" /> Low Stock
        </button>
        {uniqueCategories.map((c) => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${catFilter === c ? "gradient-primary text-primary-foreground shadow-glow-primary" : "bg-card text-muted-foreground shadow-soft hover:shadow-medium"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="space-y-2.5">
        {filtered.map((p, i) => (
          <Card key={p.id} className="border-none shadow-soft transition-all duration-200 hover:shadow-medium animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/8">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                  {p.stock <= p.minStock && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />}
                </div>
                <p className="text-xs text-muted-foreground">{p.barcode} · {p.category}</p>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">₹{p.price}</span>
                  {p.mrp > p.price && <span className="text-xs text-muted-foreground line-through">MRP ₹{p.mrp}</span>}
                  <Badge variant={p.stock <= p.minStock ? "destructive" : "secondary"} className="rounded-lg text-[10px] px-2 py-0.5 font-medium">
                    {p.stock} in stock
                  </Badge>
                  {p.soldQuantity > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <TrendingUp className="h-3 w-3" /> {p.soldQuantity} sold
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteConfirm(p.id)} className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No products found</p>
          </div>
        )}
      </div>

      {/* ── CSV Import Dialog ─────────────────────────────────────────────── */}
      <Dialog open={csvDialogOpen} onOpenChange={closeCsvDialog}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-primary" />
              Import Products
            </DialogTitle>
            <DialogDescription className="text-xs truncate">{csvFileName}</DialogDescription>
          </DialogHeader>

          {csvParsed && !csvDone && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3 text-center">
                  <p className="text-xl font-extrabold text-emerald-600">{csvParsed.valid.length}</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Ready to import</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${csvParsed.errors.length > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-secondary/60"}`}>
                  <p className={`text-xl font-extrabold ${csvParsed.errors.length > 0 ? "text-destructive" : "text-muted-foreground"}`}>{csvParsed.errors.length}</p>
                  <p className={`text-[11px] font-medium ${csvParsed.errors.length > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>Skipped rows</p>
                </div>
              </div>

              {csvParsed.valid.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {csvParsed.valid.slice(0, 8).map((row, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{row.name}</p>
                          <p className="text-[10px] text-muted-foreground">{row.barcode} · ₹{row.price} · {row.stock} units</p>
                        </div>
                      </div>
                    ))}
                    {csvParsed.valid.length > 8 && (
                      <p className="text-center text-[11px] text-muted-foreground py-1">
                        +{csvParsed.valid.length - 8} more products
                      </p>
                    )}
                  </div>
                </div>
              )}

              {csvParsed.errors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">
                    Skipped rows ({csvParsed.errors.length})
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {csvParsed.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/15 px-3 py-2">
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-destructive">Row {err.row}: {err.reason}</p>
                          {err.raw && <p className="truncate text-[10px] text-muted-foreground mt-0.5">{err.raw}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={downloadTemplate}
                className="flex w-full items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
              >
                <Download className="h-3 w-3" /> Download CSV template
              </button>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl h-11 text-sm" onClick={closeCsvDialog}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl h-11 text-sm gradient-primary shadow-glow-primary"
                  disabled={csvParsed.valid.length === 0 || csvImporting}
                  onClick={handleCsvImport}
                >
                  {csvImporting ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Importing...
                    </span>
                  ) : (
                    `Import ${csvParsed.valid.length} Product${csvParsed.valid.length !== 1 ? "s" : ""}`
                  )}
                </Button>
              </div>
            </div>
          )}

          {csvDone && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{csvImportedCount} Product{csvImportedCount !== 1 ? "s" : ""} Imported!</p>
                <p className="text-sm text-muted-foreground mt-0.5">Your inventory has been updated.</p>
              </div>
              <Button className="w-full rounded-xl h-11 gradient-primary" onClick={closeCsvDialog}>
                Done
              </Button>
            </div>
          )}

          {csvParsed && csvParsed.valid.length === 0 && csvParsed.errors.length === 1 && csvParsed.errors[0].row === 0 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <AlertCircle className="h-10 w-10 text-warning" />
              <p className="text-sm font-semibold">{csvParsed.errors[0].reason}</p>
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs text-primary underline underline-offset-2">
                <Download className="h-3.5 w-3.5" /> Download template to get started
              </button>
              <Button variant="outline" className="w-full rounded-xl" onClick={closeCsvDialog}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Existing product found via barcode scan */}
      <Dialog open={!!existingProductBarcode} onOpenChange={() => { setExistingProductBarcode(null); setNewStockInput(0); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Product Found
            </DialogTitle>
            <DialogDescription>Add stock to this existing product or edit its details</DialogDescription>
          </DialogHeader>
          {existingProductBarcode && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-secondary/60 p-4">
                <p className="font-bold text-foreground">{existingProductBarcode.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{existingProductBarcode.barcode} · {existingProductBarcode.category}</p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className="font-bold text-foreground">₹{existingProductBarcode.price}</span>
                  <Badge variant={existingProductBarcode.stock <= existingProductBarcode.minStock ? "destructive" : "secondary"} className="rounded-lg text-[10px]">
                    Current stock: {existingProductBarcode.stock}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add New Stock</label>
                <Input type="number" min={0} value={newStockInput || ""} placeholder="Enter qty to add..." onChange={(e) => setNewStockInput(Math.max(0, +e.target.value))} className="h-11 rounded-xl text-center text-lg font-bold" />
              </div>
              {newStockInput > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-muted-foreground">{existingProductBarcode.stock}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-foreground">{existingProductBarcode.stock} + {newStockInput}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="text-lg font-extrabold text-primary">{existingProductBarcode.stock + newStockInput}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setExistingProductBarcode(null); setNewStockInput(0); }}>Cancel</Button>
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setExistingProductBarcode(null); openEdit(existingProductBarcode); }}>Edit Product</Button>
                <Button className="flex-1 rounded-xl gradient-primary shadow-glow-primary" disabled={newStockInput <= 0} onClick={handleAddStockToExisting}>Add Stock</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
            <DialogDescription>This action cannot be undone and will permanently delete this product.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>{editingId ? "Update product details" : "Add a new product to your inventory"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Product name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl" />
            <div className="flex gap-2">
              <Input placeholder="Barcode *" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="h-11 flex-1 rounded-xl" />
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => { setScannerForDialog(true); setScannerOpen(true); }}>
                <ScanBarcode className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Selling Price (₹) *</label>
                <Input type="number" value={form.price || ""} placeholder="0.00" onChange={(e) => setForm({ ...form, price: +e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">MRP (₹)</label>
                <Input type="number" value={form.mrp || ""} placeholder="0.00" onChange={(e) => setForm({ ...form, mrp: +e.target.value })} className="h-11 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Cost / Purchase Price (₹)</label>
              <Input type="number" value={form.costPrice || ""} placeholder="0.00" onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} className="h-11 rounded-xl" />
            </div>
            {form.price > 0 && form.costPrice > 0 && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3.5 py-2.5 text-xs">
                <span className="text-muted-foreground">Margin: </span>
                <span className="font-bold text-emerald-600">
                  ₹{(form.price - form.costPrice).toFixed(2)} ({((form.price - form.costPrice) / form.price * 100).toFixed(1)}%)
                </span>
              </div>
            )}
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Stock</label>
                <Input type="number" value={form.stock || ""} placeholder="0" onChange={(e) => setForm({ ...form, stock: +e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Min Stock</label>
                <Input type="number" value={form.minStock || ""} placeholder="5" onChange={(e) => setForm({ ...form, minStock: +e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">GST %</label>
                <Input type="number" value={form.taxPercent || ""} placeholder="5" onChange={(e) => setForm({ ...form, taxPercent: +e.target.value })} className="h-11 rounded-xl" />
              </div>
            </div>
            {editingId && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Add More Stock (current: {form.stock})</label>
                <Input type="number" min={0} value={newStockInput || ""} placeholder="Enter qty to add..." onChange={(e) => setNewStockInput(Math.max(0, +e.target.value))} className="h-11 rounded-xl" />
                {newStockInput > 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    New total stock: <span className="font-bold text-primary">{form.stock + newStockInput}</span>
                  </p>
                )}
              </div>
            )}
            <Button className="h-12 w-full rounded-xl gradient-primary shadow-glow-primary" onClick={handleSave}>
              {editingId ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {scannerOpen && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => {
            setScannerOpen(false);
            setScannerForDialog(false);
            if (scannerForDialog) setDialogOpen(true);
          }}
          overlayDialog={scannerForDialog}
        />
      )}
    </div>
  );
};

export default ProductsPage;
