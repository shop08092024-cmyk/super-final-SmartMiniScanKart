import { create } from "zustand";
import { queueSupabaseAuth, supabase } from "@/lib/supabase";

const getUserId = async (): Promise<string> => {
  const { data: { user } } = await queueSupabaseAuth(() => supabase.auth.getUser());
  if (!user) throw new Error("Not authenticated");
  return user.id;
};

export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface CreditRecord {
  id: string;
  customerName: string;
  mobileNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  dueDate: string | null;
  notes: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentLog {
  id: string;
  creditId: string;
  amountPaid: number;
  note: string;
  createdAt: string;
}

interface CreditState {
  credits: CreditRecord[];
  paymentLogs: PaymentLog[];
  loading: boolean;

  fetchCredits: () => Promise<void>;
  addCredit: (c: Omit<CreditRecord, "id" | "remainingBalance" | "status" | "createdAt" | "updatedAt">) => Promise<void>;
  updateCredit: (id: string, c: Partial<Omit<CreditRecord, "id" | "createdAt">>) => Promise<void>;
  deleteCredit: (id: string) => Promise<void>;
  addPayment: (creditId: string, amount: number, note?: string) => Promise<void>;
  addGroupPayment: (creditIds: string[], amount: number, note?: string) => Promise<void>;
  fetchPaymentLogs: (creditId: string) => Promise<PaymentLog[]>;
}

const computeStatus = (remaining: number, total: number): PaymentStatus => {
  if (remaining <= 0) return "paid";
  if (remaining < total) return "partial";
  return "unpaid";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCredit = (r: any): CreditRecord => {
  const paid = Number(r.paid_amount ?? 0);
  const total = Number(r.total_amount ?? 0);
  const remaining = Math.max(0, total - paid);
  return {
    id: r.id,
    customerName: r.customer_name,
    mobileNumber: r.mobile_number,
    totalAmount: total,
    paidAmount: paid,
    remainingBalance: remaining,
    dueDate: r.due_date ?? null,
    notes: r.notes ?? "",
    status: computeStatus(remaining, total),
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPaymentLog = (r: any): PaymentLog => ({
  id: r.id,
  creditId: r.credit_id,
  amountPaid: Number(r.amount_paid),
  note: r.note ?? "",
  createdAt: r.created_at,
});

export const useCreditStore = create<CreditState>((set, get) => ({
  credits: [],
  paymentLogs: [],
  loading: false,

  fetchCredits: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("credits")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      set({ credits: (data ?? []).map(toCredit) });
    } catch (error) {
      console.error("Failed to fetch credits:", error);
    } finally {
      set({ loading: false });
    }
  },

  addCredit: async (c) => {
    const user_id = await getUserId();
    const remaining = Math.max(0, c.totalAmount - c.paidAmount);
    const { data, error } = await supabase
      .from("credits")
      .insert({
        user_id,
        customer_name: c.customerName,
        mobile_number: c.mobileNumber,
        total_amount: c.totalAmount,
        paid_amount: c.paidAmount,
        due_date: c.dueDate ?? null,
        notes: c.notes ?? "",
        status: computeStatus(remaining, c.totalAmount),
      })
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ credits: [toCredit(data), ...s.credits] }));
    // Log initial payment if any
    if (c.paidAmount > 0) {
      await supabase.from("credit_payment_logs").insert({
        credit_id: data.id,
        user_id,
        amount_paid: c.paidAmount,
        note: "Initial payment",
      });
    }
  },

  updateCredit: async (id, c) => {
    const existing = get().credits.find((cr) => cr.id === id);
    if (!existing) throw new Error("Credit record not found.");

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (c.customerName !== undefined) patch.customer_name = c.customerName;
    if (c.mobileNumber !== undefined) patch.mobile_number = c.mobileNumber;
    if (c.totalAmount !== undefined) patch.total_amount = c.totalAmount;
    if (c.paidAmount !== undefined) patch.paid_amount = c.paidAmount;
    if (c.dueDate !== undefined) patch.due_date = c.dueDate;
    if (c.notes !== undefined) patch.notes = c.notes;

    // Recompute status from updated values
    const total = c.totalAmount ?? existing.totalAmount;
    const paid = c.paidAmount ?? existing.paidAmount;
    const remaining = Math.max(0, total - paid);
    patch.status = computeStatus(remaining, total);

    const { data, error } = await supabase
      .from("credits")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    set((s) => ({
      credits: s.credits.map((cr) => (cr.id === id ? toCredit(data) : cr)),
    }));
  },

  deleteCredit: async (id) => {
    const { error } = await supabase.from("credits").delete().eq("id", id);
    if (error) throw error;
    set((s) => ({ credits: s.credits.filter((c) => c.id !== id) }));
  },

  addPayment: async (creditId, amount, note = "") => {
    const user_id = await getUserId();
    const existing = get().credits.find((c) => c.id === creditId);
    if (!existing) throw new Error("Credit record not found");

    const newPaid = existing.paidAmount + amount;
    const newRemaining = Math.max(0, existing.totalAmount - newPaid);
    const newStatus = computeStatus(newRemaining, existing.totalAmount);

    // Update credit record
    const { data, error } = await supabase
      .from("credits")
      .update({
        paid_amount: newPaid,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creditId)
      .select()
      .single();
    if (error) throw error;

    // Insert payment log
    const { data: logData, error: logErr } = await supabase
      .from("credit_payment_logs")
      .insert({ credit_id: creditId, user_id, amount_paid: amount, note })
      .select()
      .single();
    if (logErr) throw logErr;

    set((s) => ({
      credits: s.credits.map((c) => (c.id === creditId ? toCredit(data) : c)),
      paymentLogs: [toPaymentLog(logData), ...s.paymentLogs],
    }));
  },

  addGroupPayment: async (creditIds, amount, note = "") => {
    const user_id = await getUserId();
    const credits = creditIds
      .map((id) => get().credits.find((c) => c.id === id))
      .filter((c): c is CreditRecord => !!c)
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      });

    const totalRemaining = credits.reduce((sum, c) => sum + c.remainingBalance, 0);
    if (amount > totalRemaining) throw new Error("Payment exceeds remaining balance");

    let remainingAmount = amount;
    const logsToInsert: Array<Record<string, unknown>> = [];

    for (const credit of credits) {
      if (remainingAmount <= 0) break;
      const payable = Math.min(remainingAmount, credit.remainingBalance);
      if (payable <= 0) continue;

      const newPaid = credit.paidAmount + payable;
      const newRemaining = Math.max(0, credit.totalAmount - newPaid);
      const newStatus = computeStatus(newRemaining, credit.totalAmount);

      const { error } = await supabase
        .from("credits")
        .update({
          paid_amount: newPaid,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", credit.id);
      if (error) throw error;

      logsToInsert.push({
        credit_id: credit.id,
        user_id,
        amount_paid: payable,
        note,
      });

      remainingAmount -= payable;
    }

    if (logsToInsert.length > 0) {
      const { error: logErr } = await supabase
        .from("credit_payment_logs")
        .insert(logsToInsert);
      if (logErr) throw logErr;
    }

    await get().fetchCredits();
  },

  fetchPaymentLogs: async (creditId) => {
    const { data, error } = await supabase
      .from("credit_payment_logs")
      .select("*")
      .eq("credit_id", creditId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const logs = (data ?? []).map(toPaymentLog);
    set((s) => ({
      paymentLogs: [
        ...s.paymentLogs.filter((l) => l.creditId !== creditId),
        ...logs,
      ],
    }));
    return logs;
  },
}));
