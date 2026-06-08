import { useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import { QrCode, ScanBarcode, Printer, Copy, RefreshCw, Plus, Trash2, Package, Search, Download, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface StickerItem {
  id: string;
  code: string;
  name: string;
  price?: number;
  quantity: number;
  type: "code128" | "qr";
}

const STICKERS_PER_ROW = 3;
const ROWS_PER_PAGE = 5;
const STICKERS_PER_PAGE = STICKERS_PER_ROW * ROWS_PER_PAGE; // 15 per A4 page

// Generates a barcodeUrl for a given code and type
const getBarcodeUrl = (code: string, type: "code128" | "qr") => {
  if (type === "qr") {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=000000&qzone=1`;
  }
  return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(code)}&scale=2&rotate=N&includeText=true&backgroundcolor=ffffff`;
};

const generateInStoreCode = () => {
  return "200" + Math.floor(1000000000 + Math.random() * 9000000000).toString().slice(0, 9);
};

export default function BarcodePrintPage() {
  const { products } = useStore();
  const [items, setItems] = useState<StickerItem[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [qtyInput, setQtyInput] = useState(1);
  const [barcodeType, setBarcodeType] = useState<"code128" | "qr">("code128");
  const [productSearch, setProductSearch] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"code128" | "qr">("code128");
  const [selectedQty, setSelectedQty] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  // Total stickers to print
  const totalStickers = items.reduce((s, i) => s + i.quantity, 0);
  const totalPages = Math.ceil(totalStickers / STICKERS_PER_PAGE);

  // Expand items into flat sticker list
  const flatStickers = items.flatMap(item =>
    Array(item.quantity).fill(null).map((_, i) => ({ ...item, _key: `${item.id}-${i}` }))
  );

  const addItem = (overrideCode?: string, overrideName?: string, overridePrice?: number) => {
    const code = (overrideCode ?? codeInput.trim()) || generateInStoreCode();
    const name = overrideName ?? nameInput.trim();
    const price = overridePrice ?? (priceInput ? parseFloat(priceInput) : undefined);

    const newItem: StickerItem = {
      id: `${Date.now()}-${Math.random()}`,
      code,
      name,
      price,
      quantity: overrideCode ? selectedQty : qtyInput,
      type: overrideCode ? selectedType : barcodeType,
    };
    setItems(prev => [...prev, newItem]);
    if (!overrideCode) {
      setCodeInput("");
      setNameInput("");
      setPriceInput("");
      setQtyInput(1);
    }
    toast({ title: "Sticker added", description: `${name || code} × ${newItem.quantity}` });
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const handlePrint = () => {
    if (items.length === 0) {
      toast({ title: "No stickers to print", variant: "destructive" });
      return;
    }

    // Build sticker HTML
    const stickerHtmlList = flatStickers.map(sticker => {
      const imgUrl = getBarcodeUrl(sticker.code, sticker.type);
      return `
        <div class="sticker">
          ${sticker.name ? `<div class="sticker-name">${sticker.name}</div>` : ""}
          <img src="${imgUrl}" alt="${sticker.code}" onload="this.style.opacity=1" style="opacity:0;transition:opacity 0.3s"/>
          <div class="sticker-code">${sticker.code}</div>
          ${sticker.price != null ? `<div class="sticker-price">₹${sticker.price.toFixed(2)}</div>` : ""}
        </div>
      `;
    }).join("");

    const totalStickerCount = flatStickers.length;

    const win = window.open("", "_blank");
    if (!win) { toast({ title: "Popup blocked", description: "Allow popups for printing", variant: "destructive" }); return; }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Sticker Sheet — ${totalStickerCount} stickers (${totalPages} page${totalPages !== 1 ? "s" : ""})</title>
  <style>
    @page { size: A4; margin: 10mm 8mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; background: #fff; }
    .page-info {
      text-align: center; font-size: 10px; color: #666; margin-bottom: 4mm;
      padding-bottom: 2mm; border-bottom: 1px dashed #ccc;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(${STICKERS_PER_ROW}, 1fr);
      gap: 3mm;
    }
    .sticker {
      border: 1px dashed #bbb;
      border-radius: 4px;
      padding: 4mm 2mm 3mm;
      text-align: center;
      background: #fff;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 30mm;
    }
    .sticker-name {
      font-size: 9px;
      font-weight: bold;
      color: #111;
      margin-bottom: 2mm;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sticker img {
      max-width: 100%;
      max-height: 18mm;
      object-fit: contain;
      display: block;
    }
    .sticker-code {
      font-size: 7px;
      font-family: monospace;
      color: #444;
      margin-top: 1mm;
    }
    .sticker-price {
      font-size: 10px;
      font-weight: bold;
      color: #000;
      margin-top: 1mm;
    }
    @media print {
      .page-info { display: none; }
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page-info">
    SmartMiniScanKart · ${totalStickerCount} sticker${totalStickerCount !== 1 ? "s" : ""} · ${totalPages} page${totalPages !== 1 ? "s" : ""} · ${STICKERS_PER_PAGE} per page
  </div>
  <div class="grid">
    ${stickerHtmlList}
  </div>
  <script>
    // Wait for images then print
    const imgs = document.querySelectorAll('img');
    let loaded = 0;
    const total = imgs.length;
    if (total === 0) { window.print(); return; }
    imgs.forEach(img => {
      img.addEventListener('load', () => { loaded++; if (loaded === total) { img.style.opacity = 1; window.print(); } });
      img.addEventListener('error', () => { loaded++; if (loaded === total) window.print(); });
    });
    // Fallback after 4s
    setTimeout(() => window.print(), 4000);
  </script>
</body>
</html>`);
    win.document.close();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.barcode.includes(productSearch)
  );

  return (
    <div className="page-container">
      <div className="mb-5 flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title flex items-center gap-2"><Tag className="h-6 w-6 text-primary" /> Sticker Printer</h1>
          <p className="text-sm text-muted-foreground">
            Generate & print barcode / QR sticker sheets
            {totalStickers > 0 && (
              <span className="ml-1 text-primary font-semibold">
                · {totalStickers} sticker{totalStickers !== 1 ? "s" : ""} · {totalPages} page{totalPages !== 1 ? "s" : ""} ({STICKERS_PER_PAGE}/page)
              </span>
            )}
          </p>
        </div>
        <Button
          className="gap-1.5 rounded-xl gradient-primary shadow-glow-primary"
          onClick={handlePrint}
          disabled={items.length === 0}
        >
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>

      {/* Summary banner */}
      {totalStickers > 0 && (
        <div className="mb-4 rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Printer className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{totalStickers} sticker{totalStickers !== 1 ? "s" : ""} ready to print</p>
              <p className="text-xs text-muted-foreground">
                {totalPages} A4 page{totalPages !== 1 ? "s" : ""} · {STICKERS_PER_PAGE} stickers per page ({STICKERS_PER_ROW} columns × {ROWS_PER_PAGE} rows)
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-bold">{totalPages}×A4</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left: Add stickers */}
        <div className="space-y-4">
          {/* Add from product inventory */}
          <Card className="border-none shadow-soft">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> From Inventory
              </p>
              <Button
                variant="outline"
                className="w-full rounded-xl h-11 gap-2 justify-start text-sm"
                onClick={() => setProductDialogOpen(true)}
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Search & add products...</span>
              </Button>
            </CardContent>
          </Card>

          {/* Manual entry */}
          <Card className="border-none shadow-soft">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ScanBarcode className="h-3.5 w-3.5" /> Custom / Manual Entry
              </p>
              <Input
                placeholder="Product name (optional)"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="h-10 rounded-xl"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Barcode / code (blank = auto-generate)"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  className="h-10 rounded-xl flex-1"
                />
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => setCodeInput(generateInStoreCode())} title="Auto-generate code">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="Price ₹ (optional)"
                type="number"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
                className="h-10 rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Type</label>
                  <Select value={barcodeType} onValueChange={v => setBarcodeType(v as "code128" | "qr")}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="code128">Code-128 Barcode</SelectItem>
                      <SelectItem value="qr">QR Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={qtyInput}
                    onChange={e => setQtyInput(Math.max(1, +e.target.value))}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
              <Button className="w-full h-10 rounded-xl gap-1.5 gradient-primary" onClick={() => addItem()}>
                <Plus className="h-4 w-4" /> Add to Print Queue
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Print queue */}
        <div>
          <Card className="border-none shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Print Queue ({items.length} item{items.length !== 1 ? "s" : ""})</p>
                {items.length > 0 && (
                  <button className="text-xs text-destructive hover:underline" onClick={() => { setItems([]); }}>Clear all</button>
                )}
              </div>
              {items.length === 0 ? (
                <div className="py-10 text-center">
                  <Tag className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No stickers added yet</p>
                  <p className="text-xs text-muted-foreground/70">Add from inventory or create custom</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        {item.type === "qr" ? <QrCode className="h-4 w-4 text-primary" /> : <ScanBarcode className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{item.name || item.code}</p>
                        {item.name && <p className="text-[10px] font-mono text-muted-foreground">{item.code}</p>}
                        {item.price != null && <p className="text-[10px] text-muted-foreground">₹{item.price}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground hover:text-foreground"
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                        >-</button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground hover:text-foreground"
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                        >+</button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="ml-1 text-destructive hover:bg-destructive/10 rounded-lg p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {items.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>Total stickers</span>
                    <span className="font-bold text-foreground">{totalStickers}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>Pages required (A4, {STICKERS_PER_PAGE}/page)</span>
                    <span className="font-bold text-foreground">{totalPages}</span>
                  </div>

                  {/* Sticker layout preview */}
                  <div className="mb-4 rounded-xl border border-border/50 p-3 bg-muted/30">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Layout Preview (Page 1)</p>
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${STICKERS_PER_ROW}, 1fr)` }}>
                      {Array(Math.min(STICKERS_PER_PAGE, totalStickers)).fill(null).map((_, i) => {
                        const sticker = flatStickers[i];
                        return (
                          <div key={i} className="aspect-square border border-dashed border-border/60 rounded flex flex-col items-center justify-center p-1 bg-white/50">
                            <div className="w-full h-3 bg-primary/15 rounded-sm mb-0.5" />
                            <p className="text-[6px] text-center text-muted-foreground truncate w-full text-center leading-tight">
                              {sticker?.name || sticker?.code || ""}
                            </p>
                          </div>
                        );
                      })}
                      {totalStickers > STICKERS_PER_PAGE && (
                        <div className="border border-dashed border-border/40 rounded flex items-center justify-center p-1">
                          <span className="text-[8px] text-muted-foreground">+{totalStickers - STICKERS_PER_PAGE} more</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button className="w-full h-11 rounded-xl gap-2 gradient-primary shadow-glow-primary" onClick={handlePrint}>
                    <Printer className="h-4 w-4" />
                    Print {totalStickers} Sticker{totalStickers !== 1 ? "s" : ""} ({totalPages} page{totalPages !== 1 ? "s" : ""})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product search dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add from Inventory</DialogTitle>
            <DialogDescription>Select products and choose print options</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Type</label>
                <Select value={selectedType} onValueChange={v => setSelectedType(v as "code128" | "qr")}>
                  <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code128">Code-128</SelectItem>
                    <SelectItem value="qr">QR Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Qty each</label>
                <Input type="number" min={1} max={500} value={selectedQty} onChange={e => setSelectedQty(Math.max(1, +e.target.value))} className="h-9 rounded-xl text-xs" />
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="h-10 rounded-xl pl-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 mt-2">
            {filteredProducts.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No products found</div>
            )}
            {filteredProducts.map(p => (
              <button
                key={p.id}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 bg-secondary/40 hover:bg-secondary transition-colors text-left"
                onClick={() => {
                  addItem(p.barcode, p.name, p.price);
                  setProductDialogOpen(false);
                  setProductSearch("");
                }}
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.barcode} · ₹{p.price} · {p.stock} in stock</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">+{selectedQty}</Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
