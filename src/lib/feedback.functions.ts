import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard.server";

const categorySchema = z.enum(["bug", "sugestao", "melhoria"]);
const statusSchema = z.enum(["novo", "em_analise", "resolvido", "descartado"]);

export const submitOwnerFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        storeId: z.string().uuid(),
        category: categorySchema,
        subject: z.string().trim().min(3).max(120),
        message: z.string().trim().min(10).max(5000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store) throw new Error("Loja não encontrada.");

    const { error } = await context.supabase.from("owner_feedback").insert({
      store_id: store.id,
      owner_id: context.userId,
      category: data.category,
      subject: data.subject,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("owner_feedback")
      .select("id, store_id, owner_id, category, subject, message, status, admin_note, created_at, updated_at, stores(name, slug)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateAdminFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: statusSchema, adminNote: z.string().max(2000).default("") }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("owner_feedback")
      .update({ status: data.status, admin_note: data.adminNote })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
