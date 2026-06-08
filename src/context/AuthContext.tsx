import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
export type UserRole = "admin" | "employee" | "onboarding";

interface EmployeeInfo {
  id: string;
  shopOwnerId: string;
  name: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  loading: boolean;
  employeeInfo: EmployeeInfo | null;
  setRole: (role: UserRole) => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  claimInvite: (inviteCode: string) => Promise<{ success: boolean; error: Error | null }>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ROLE_STORAGE_KEY = "smartminiscankart-role";

async function syncRoleWithEmployeeMembership(
  currentUser: User | null
): Promise<{ role: UserRole; employeeInfo: EmployeeInfo | null }> {
  if (!currentUser) return { role: "onboarding", employeeInfo: null };

  try {
    // 1. Check if they are an active employee
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, status, user_id, shop_owner_id, name")
      .eq("user_id", currentUser.id)
      .eq("status", "active")
      .maybeSingle();

    if (employeeError) {
      console.error("Failed to retrieve employee membership:", employeeError);
    }

    if (employee) {
      return {
        role: "employee",
        employeeInfo: {
          id: employee.id,
          shopOwnerId: employee.shop_owner_id,
          name: employee.name,
        },
      };
    }

    // 1.5. Auto-claim invitation by email matching
    if (currentUser.email) {
      const emailLower = currentUser.email.trim().toLowerCase();
      const { data: invitedEmployee, error: inviteError } = await supabase
        .from("employees")
        .select("id, status, user_id, shop_owner_id, name, email")
        .ilike("email", emailLower)
        .eq("status", "invited")
        .is("user_id", null)
        .maybeSingle();

      if (inviteError) {
        console.error("Failed checking for matching email invitation:", inviteError);
      }

      if (invitedEmployee) {
        let claimed = false;
        // Try to auto-claim using RPC first (most robust, bypasses RLS issues)
        try {
          const { data: rpcSuccess, error: rpcError } = await supabase
            .rpc("claim_employee_invite_by_email");
          
          if (!rpcError && rpcSuccess) {
            console.log("Successfully auto-claimed employee record by email matching (RPC):", currentUser.email);
            claimed = true;
          } else if (rpcError) {
            console.warn("claim_employee_invite_by_email RPC returned error, falling back:", rpcError);
          }
        } catch (rpcErr) {
          console.error("claim_employee_invite_by_email RPC failed, trying fallback:", rpcErr);
        }

        if (!claimed) {
          // Link the employee record to this user automatically (client-side fallback)
          const { error: claimError } = await supabase
            .from("employees")
            .update({
              user_id: currentUser.id,
              status: "active",
              joined_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", invitedEmployee.id);

          if (!claimError) {
            console.log("Successfully auto-claimed employee record by email matching (client-side fallback):", currentUser.email);
            claimed = true;
          } else {
            console.error("Failed to auto-claim employee record:", claimError);
          }
        }

        if (claimed) {
          return {
            role: "employee",
            employeeInfo: {
              id: invitedEmployee.id,
              shopOwnerId: invitedEmployee.shop_owner_id,
              name: invitedEmployee.name,
            },
          };
        }
      }
    }

    // 2. Check if they are an admin (have a shop profile)
    const { data: shop, error: shopError } = await supabase
      .from("shop_profiles")
      .select("id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (shopError) {
      console.error("Failed to retrieve shop profile:", shopError);
    }

    if (shop) {
      return { role: "admin", employeeInfo: null };
    }

    // 3. Otherwise, they need to onboard (either create a store or claim invite code)
    return { role: "onboarding", employeeInfo: null };
  } catch (error) {
    console.error("Role sync failed:", error);
    return { role: "onboarding", employeeInfo: null };
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);

  const [role, setRoleState] = useState<UserRole>(() => {
    if (typeof window === "undefined") return "onboarding";
    const savedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
    return (savedRole === "employee" || savedRole === "admin" || savedRole === "onboarding")
      ? (savedRole as UserRole)
      : "onboarding";
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  }, [role]);

  const refreshRole = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      const { role: resolvedRole, employeeInfo: empInfo } =
        await syncRoleWithEmployeeMembership(currentSession.user);
      setRoleState(resolvedRole);
      setEmployeeInfo(empInfo);
    } else {
      setRoleState("onboarding");
      setEmployeeInfo(null);
    }
  };

  const claimInvite = async (inviteCode: string) => {
    try {
      const trimmedCode = inviteCode.trim().toUpperCase();
      if (!trimmedCode) {
        return { success: false, error: new Error("Invite code cannot be empty") };
      }

      const { data: success, error } = await supabase.rpc("claim_employee_invite", {
        p_invite_code: trimmedCode,
      });

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      if (!success) {
        return {
          success: false,
          error: new Error("Invalid or already claimed invite code. Please verify the code and try again."),
        };
      }

      // Refresh the role state to transition user to Employee view
      await refreshRole();
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error("An unexpected error occurred claiming the invite"),
      };
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { role: resolvedRole, employeeInfo: empInfo } =
            await syncRoleWithEmployeeMembership(session.user);
          if (mounted) {
            setRoleState(resolvedRole);
            setEmployeeInfo(empInfo);
          }
        } else {
          if (mounted) {
            setRoleState("onboarding");
            setEmployeeInfo(null);
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth session:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        setLoading(true);
        setSession(session);
        setUser(session?.user ?? null);

        try {
          if (session?.user) {
            const { role: resolvedRole, employeeInfo: empInfo } =
              await syncRoleWithEmployeeMembership(session.user);

            if (mounted) {
              setRoleState(resolvedRole);
              setEmployeeInfo(empInfo);
            }
          } else {
            if (mounted) {
              setRoleState("onboarding");
              setEmployeeInfo(null);
            }
          }
        } catch (error) {
          console.error("Error in onAuthStateChange role sync:", error);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      console.log("LOGIN RESPONSE", data);
      if (error) {
        console.error("LOGIN ERROR", error);
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err) {
      console.error("LOGIN EXCEPTION", err);
      return { error: err instanceof Error ? err : new Error("Unknown login error") };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) return { error };
      if (data?.url) window.location.href = data.url;
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      console.log("SIGNUP RESPONSE", data);
      if (error) {
        console.error("SIGNUP ERROR", error);
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err) {
      console.error("SIGNUP EXCEPTION", err);
      return { error: err instanceof Error ? err : new Error("Unknown signup error") };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoleState("onboarding");
    setEmployeeInfo(null);
    localStorage.removeItem(ROLE_STORAGE_KEY);
  };

  const setRole = (nextRole: UserRole) => {
    setRoleState(nextRole);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        loading,
        employeeInfo,
        setRole,
        signInWithEmail,
        signInWithGoogle,
        signUp,
        signOut,
        claimInvite,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
