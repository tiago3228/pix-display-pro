import { useEffect, useState, useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STORE_ID_KEY = "vitrini:active-store-id";
const ACTIVE_STORE_EVENT = "vitrini:active-store-changed";

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
  diamond_access: boolean;
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

function readActiveStoreId() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_STORE_ID_KEY);
  } catch {
    return null;
  }
}

function subscribeActiveStore(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onChange = () => listener();
  window.addEventListener(ACTIVE_STORE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ACTIVE_STORE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useActiveStoreId() {
  return useSyncExternalStore(subscribeActiveStore, readActiveStoreId, () => null);
}

export function setActiveStoreId(storeId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (storeId) window.localStorage.setItem(ACTIVE_STORE_ID_KEY, storeId);
    else window.localStorage.removeItem(ACTIVE_STORE_ID_KEY);
  } catch {
    // The active selection still changes in this tab when storage is unavailable.
  }
  window.dispatchEvent(new Event(ACTIVE_STORE_EVENT));
}

export function useMyStores() {
  const { user, loading: sessionLoading } = useSession();
  const query = useQuery({
    queryKey: ["my-stores", user?.id],
    enabled: !sessionLoading && Boolean(user?.id),
    queryFn: async (): Promise<MyStore[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MyStore[];
    },
  });
  return { ...query, isLoading: sessionLoading || query.isLoading };
}

export function useMyStore() {
  const storesQuery = useMyStores();
  const activeStoreId = useActiveStoreId();
  const stores = storesQuery.data ?? [];
  const selectedStore = stores.find((store) => store.id === activeStoreId) ?? stores[0] ?? null;
  const selectedStoreId = selectedStore?.id ?? null;
  const ownerId = selectedStore?.owner_id ?? null;

  const storeQuery = useQuery({
    queryKey: ["my-store", ownerId, selectedStoreId],
    enabled: Boolean(ownerId && selectedStoreId),
    queryFn: async (): Promise<MyStore | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !selectedStoreId || userData.user.id !== ownerId) return null;
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", selectedStoreId)
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: hasProAccess, error: accessError } = await supabase.rpc(
        "store_has_pro_access",
        {
          target_store_id: selectedStoreId,
        },
      );
      if (accessError) throw accessError;
      return { ...(data as MyStore), plan: hasProAccess ? "pro" : "basica" };
    },
  });

  return {
    ...storeQuery,
    data: storeQuery.data ?? null,
    isLoading: storesQuery.isLoading || (Boolean(selectedStoreId) && storeQuery.isLoading),
    error: storesQuery.error ?? storeQuery.error,
  };
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
