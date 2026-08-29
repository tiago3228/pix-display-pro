import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminCampaignStore = {
  id: string;
  name: string;
  slug: string;
  sellerName: string;
  whatsapp: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
};

export const listAdminCampaignStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCampaignStore[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("stores")
      .select("id, name, slug, seller_name, whatsapp, plan, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error("Não foi possível carregar as lojas.");

    return (data ?? []).map((store) => ({
      id: store.id,
      name: store.name,
      slug: store.slug,
      sellerName: store.seller_name,
      whatsapp: store.whatsapp,
      plan: store.plan,
      isActive: store.is_active,
      createdAt: store.created_at,
    }));
  });
