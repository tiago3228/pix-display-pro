import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export type MyStore = {
  id: string;
  owner_id: string | null;
  slug: string;
  name: string;
  seller_name: string;
  description: string;
  category: string;
  whatsapp: string;
  instagram: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  welcome_message: string;
  share_message: string | null;
  pix_key_type: string;
  pix_key: string;
  plan: string;
  pro_trial_ends_at: string | null;
  pro_trial_used: boolean;
  is_active: boolean;
  onboarding_done: boolean;
  accept_pix: boolean;
  allow_installments: boolean;
  max_installments: number;
  min_installment_amount: number;
};

export function useMyStore() {
  return useQuery({
    queryKey: ["my-store"],
    queryFn: async (): Promise<MyStore | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as MyStore;
      const trialActive = Boolean(
        row.pro_trial_ends_at && new Date(row.pro_trial_ends_at).getTime() > Date.now(),
      );
      return { ...row, plan: row.plan === "pro" || trialActive ? "pro" : "basica" };
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
}
