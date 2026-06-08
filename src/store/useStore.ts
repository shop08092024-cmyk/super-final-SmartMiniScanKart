import { create } from "zustand";
import { queueSupabaseAuth, supabase } from "@/lib/supabase";

const getUserId = async (): Promise<string> => {
  const { data: { user } } = await queueSupabaseAuth(() => supabase.auth.getUser());
  if (!user) throw new Error("Not authenticated");
  return user.id;
};

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  mrp: number;
  costPrice: number;
  category: string;
  stock: number;
  soldQuantity: number;
  minStock: number;
  taxPercent: number;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  tax: number;
  discount: number;
  paymentMethod: string;
  paymentStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  notes?: string;
  employeeId?: string;
  employeeName?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalSpent: number;
  orderCount: number;
  loyaltyPoints: number;
  lastVisit: string;
}

interface AppState {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  customers: Customer[];
  loading: boolean;
  orderCounter: number;

  fetchAll: (shopOwnerId?: string) => Promise<void>;

  addProduct: (p: Omit<Product, "id" | "soldQuantity">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductByBarcode: (barcode: string) => Product | undefined;
  searchProducts: (query: string) => Product[];

  addToCart: (product: Product, quantity: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  checkout: (
    paymentMethod: string,
    discount: number,
    customerName?: string,
    customerPhone?: string,
    razorpayOrderId?: string,
    razorpayPaymentId?: string,
    shopOwnerId?: string,
    employeeId?: string,
    notes?: string,
  ) => Promise<Order>;

  addCustomer: (
    c: Omit<Customer, "id" | "totalSpent" | "orderCount" | "loyaltyPoints" | "lastVisit">,
    shopOwnerId?: string,
  ) => Promise<void>;

  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProduct = (r: any): Product => ({
  id: r.id,
  name: r.name,
  barcode: r.barcode,
  price: Number(r.price ?? 0),
  mrp: Number(r.mrp ?? r.price ?? 0),
  costPrice: Number(r.cost_price ?? 0),
  category: r.category,
  stock: Number(r.stock ?? 0),
  soldQuantity: Number(r.sold_quantity ?? 0),
  minStock: Number(r.min_stock ?? 0),
  taxPercent: Number(r.tax_percent ?? 0),
  image: r.image ?? undefined,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCustomer = (r: any): Customer => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email ?? undefined,
  totalSpent: Number(r.total_spent ?? 0),
  orderCount: Number(r.order_count ?? 0),
  loyaltyPoints: Number(r.loyalty_points ?? 0),
  lastVisit: r.last_visit,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toOrderItem = (r: any): OrderItem => {
  const qty = Number(r.quantity ?? 0);
  const price = Number(r.unit_price ?? 0);
  return {
    productId: r.product_id ?? "",
    productName: r.product_name,
    quantity: qty,
    unitPrice: price,
    taxPercent: Number(r.tax_percent ?? 0),
    lineTotal: price * qty,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toOrder = (r: any): Order => {
  const items: OrderItem[] = (r.order_items ?? []).map(toOrderItem);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  return {
    id: r.id,
    orderNumber: r.order_number ?? `ORD-${r.id.slice(0, 8).toUpperCase()}`,
    items,
    subtotal,
    total: Number(r.total ?? 0),
    tax: Number(r.tax ?? 0),
    discount: Number(r.discount ?? 0),
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status ?? "paid",
    razorpayOrderId: r.razorpay_order_id ?? undefined,
    razorpayPaymentId: r.razorpay_payment_id ?? undefined,
    customerName: r.customer_name ?? undefined,
    customerPhone: r.customer_phone ?? undefined,
    createdAt: r.created_at,
    notes: r.notes ?? undefined,
    employeeId: r.employee_id ?? undefined,
    employeeName: r.employees?.name ?? undefined,
  };
};

const generateOrderNumber = (counter: number): string => {
  const year = new Date().getFullYear();
  const seq = String(counter).padStart(4, "0");
  return `ORD-${year}-${seq}`;
};

export const useStore = create<AppState>((set, get) => ({
  products: [],
  cart: [],
  orders: [],
  customers: [],
  loading: false,
  orderCounter: 1,

  fetchAll: async (shopOwnerId?: string) => {
    set({ loading: true });

    try {
      let productQuery = supabase.from("products").select("*").order("name");
      let orderQuery = supabase.from("orders").select("*, order_items(*), employees(name)").order("created_at", { ascending: false });
      let customerQuery = supabase.from("customers").select("*").order("name");

      if (shopOwnerId) {
        productQuery = productQuery.eq("user_id", shopOwnerId) as typeof productQuery;
        orderQuery = orderQuery.eq("user_id", shopOwnerId) as typeof orderQuery;
        customerQuery = customerQuery.eq("user_id", shopOwnerId) as typeof customerQuery;
      }

      const [{ data: products, error: prodErr }, { data: orders, error: ordErr }, { data: customers, error: custErr }] = await Promise.all([
        productQuery,
        orderQuery,
        customerQuery,
      ]);

      if (prodErr) console.error("Error loading products:", prodErr);
      if (ordErr) console.error("Error loading orders:", ordErr);
      if (custErr) console.error("Error loading customers:", custErr);

      const mappedOrders = (orders ?? []).map(toOrder);
      const maxCounter = mappedOrders.length > 0
        ? Math.max(...mappedOrders.map((o) => {
            const m = o.orderNumber.match(/(\d+)$/);
            return m ? parseInt(m[1]) : 0;
          }))
        : 0;

      set({
        products: (products ?? []).map(toProduct),
        orders: mappedOrders,
        customers: (customers ?? []).map(toCustomer),
        orderCounter: maxCounter + 1,
      });
    } catch (error) {
      console.error("Failed to fetch all data:", error);
    } finally {
      set({ loading: false });
    }
  },

  addProduct: async (p) => {
    const user_id = await getUserId();
    const { data, error } = await supabase
      .from("products")
      .insert({
        user_id,
        name: p.name,
        barcode: p.barcode,
        price: p.price,
        mrp: p.mrp ?? p.price,
        cost_price: p.costPrice,
        category: p.category,
        stock: p.stock,
        sold_quantity: 0,
        min_stock: p.minStock,
        tax_percent: p.taxPercent,
        image: p.image ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ products: [...s.products, toProduct(data)] }));
  },

  updateProduct: async (id, p) => {
    const patch: Record<string, unknown> = {};
    if (p.name !== undefined) patch.name = p.name;
    if (p.barcode !== undefined) patch.barcode = p.barcode;
    if (p.price !== undefined) patch.price = p.price;
    if (p.mrp !== undefined) patch.mrp = p.mrp;
    if (p.costPrice !== undefined) patch.cost_price = p.costPrice;
    if (p.category !== undefined) patch.category = p.category;
    if (p.stock !== undefined) patch.stock = p.stock;
    if (p.soldQuantity !== undefined) patch.sold_quantity = p.soldQuantity;
    if (p.minStock !== undefined) patch.min_stock = p.minStock;
    if (p.taxPercent !== undefined) patch.tax_percent = p.taxPercent;
    if (p.image !== undefined) patch.image = p.image;
    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    set((s) => ({
      products: s.products.map((pr) => (pr.id === id ? toProduct(data) : pr)),
    }));
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
  },

  getProductByBarcode: (barcode) => get().products.find((p) => p.barcode === barcode),

  searchProducts: (query: string) => {
    if (!query.trim()) return get().products;
    const q = query.toLowerCase().trim();
    return get().products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  },

  addToCart: (product, quantity) =>
    set((s) => {
      const existing = s.cart.find((c) => c.product.id === product.id);
      if (existing) {
        return {
          cart: s.cart.map((c) =>
            c.product.id === product.id ? { ...c, quantity: c.quantity + quantity } : c
          ),
        };
      }
      return { cart: [...s.cart, { product, quantity }] };
    }),

  updateCartQuantity: (productId, quantity) =>
    set((s) => ({
      cart:
        quantity <= 0
          ? s.cart.filter((c) => c.product.id !== productId)
          : s.cart.map((c) =>
              c.product.id === productId ? { ...c, quantity } : c
            ),
    })),

  removeFromCart: (productId) =>
    set((s) => ({ cart: s.cart.filter((c) => c.product.id !== productId) })),

  clearCart: () => set({ cart: [] }),

  checkout: async (paymentMethod, discount, customerName, customerPhone, razorpayOrderId, razorpayPaymentId, shopOwnerId, employeeId, notes) => {
    const current_user_id = await getUserId();
    const order_user_id = shopOwnerId ?? current_user_id;
    const s = get();

    if (s.cart.length === 0) throw new Error("Cart is empty");

    for (const c of s.cart) {
      if (c.quantity > c.product.stock) {
        throw new Error(`Insufficient stock for "${c.product.name}". Only ${c.product.stock} left.`);
      }
    }

    const tax = s.cart.reduce(
      (sum, c) => sum + (c.product.price * c.quantity * c.product.taxPercent) / 100, 0
    );
    const subtotal = s.cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
    const safeDiscount = Math.min(discount, subtotal + tax);
    const total = Math.max(0, subtotal + tax - safeDiscount);
    const orderNumber = generateOrderNumber(s.orderCounter);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: order_user_id,
        order_number: orderNumber,
        total,
        tax,
        discount: safeDiscount,
        payment_method: paymentMethod,
        payment_status: "paid",
        razorpay_order_id: razorpayOrderId ?? null,
        razorpay_payment_id: razorpayPaymentId ?? null,
        customer_name: customerName ?? null,
        customer_phone: customerPhone ?? null,
        notes: notes ?? null,
        employee_id: employeeId ?? null,
      })
      .select()
      .single();
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase.from("order_items").insert(
      s.cart.map((c) => ({
        order_id: order.id,
        product_id: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        unit_price: c.product.price,
        tax_percent: c.product.taxPercent,
      }))
    );
    if (itemsError) throw itemsError;

    await Promise.all(
      s.cart.map((c) =>
        supabase
          .from("products")
          .update({
            stock: Math.max(0, c.product.stock - c.quantity),
            sold_quantity: (c.product.soldQuantity ?? 0) + c.quantity,
          })
          .eq("id", c.product.id)
      )
    );

    const customer_user_id = shopOwnerId ?? current_user_id;
    if (customerName && customerPhone) {
      const existing = s.customers.find((c) => c.phone === customerPhone);
      if (existing) {
        await supabase.from("customers").update({
          total_spent: existing.totalSpent + total,
          order_count: existing.orderCount + 1,
          loyalty_points: existing.loyaltyPoints + Math.floor(total / 10),
          last_visit: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("customers").insert({
          user_id: customer_user_id,
          name: customerName,
          phone: customerPhone,
          total_spent: total,
          order_count: 1,
          loyalty_points: Math.floor(total / 10),
          last_visit: new Date().toISOString(),
        });
      }
    }

    if (employeeId) {
      const { data: empData } = await supabase
        .from("employees")
        .select("collected_amount, orders_today")
        .eq("id", employeeId)
        .single();

      if (empData) {
        await supabase.from("employees").update({
          collected_amount: (empData.collected_amount ?? 0) + total,
          orders_today: (empData.orders_today ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", employeeId);
      }
    }

    const builtItems: OrderItem[] = s.cart.map((c) => ({
      productId: c.product.id,
      productName: c.product.name,
      quantity: c.quantity,
      unitPrice: c.product.price,
      taxPercent: c.product.taxPercent,
      lineTotal: c.product.price * c.quantity,
    }));
    const builtOrder: Order = {
      id: order.id,
      orderNumber,
      items: builtItems,
      subtotal,
      total,
      tax,
      discount: safeDiscount,
      paymentMethod,
      paymentStatus: "paid",
      razorpayOrderId: razorpayOrderId ?? undefined,
      razorpayPaymentId: razorpayPaymentId ?? undefined,
      customerName: customerName ?? undefined,
      customerPhone: customerPhone ?? undefined,
      createdAt: order.created_at ?? new Date().toISOString(),
      notes: notes ?? undefined,
      employeeId: employeeId ?? undefined,
    };

    get().fetchAll(shopOwnerId);
    set({ cart: [], orderCounter: s.orderCounter + 1 });

    return builtOrder;
  },

  addCustomer: async (c, shopOwnerId) => {
    const current_user_id = await getUserId();
    const user_id = shopOwnerId ?? current_user_id;
    const { data, error } = await supabase
      .from("customers")
      .insert({
        user_id,
        name: c.name,
        phone: c.phone,
        email: c.email ?? null,
        total_spent: 0,
        order_count: 0,
        loyalty_points: 0,
        last_visit: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ customers: [...s.customers, toCustomer(data)] }));
  },

  updateCustomer: async (id, c) => {
    const patch: Record<string, unknown> = {};
    if (c.name !== undefined) patch.name = c.name;
    if (c.phone !== undefined) patch.phone = c.phone;
    if (c.email !== undefined) patch.email = c.email ?? null;
    const { data, error } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    set((s) => ({
      customers: s.customers.map((cu) => (cu.id === id ? toCustomer(data) : cu)),
    }));
  },

  deleteCustomer: async (id) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
  },
}));
