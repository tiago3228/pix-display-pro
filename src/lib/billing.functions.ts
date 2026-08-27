import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Confirma manualmente o recebimento de uma parcela (Pix direto ao vendedor). */
export const markInstallmentPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ installmentId: z.string().uuid(), paid: z.boolean().default(true) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // A RLS garante que só o dono da loja alcança a parcela.
    const { data: installment, error } = await context.supabase
      .from("installments")
      .update(
        data.paid
          ? {
              status: "paid",
              paid_at: new Date().toISOString(),
              paid_by: context.userId,
              payment_method: "pix",
            }
          : { status: "pending", paid_at: null, paid_by: null, payment_method: null },
      )
      .eq("id", data.installmentId)
      .select("id, store_id, installment_number, total_installments, amount")
      .maybeSingle();

    if (error) throw new Error("Não foi possível atualizar a parcela.");
    if (!installment) throw new Error("Parcela não encontrada.");

    const { logAudit } = await import("./subscription.server");
    await logAudit({
      storeId: installment.store_id,
      userId: context.userId,
      action: data.paid ? "installment_paid" : "installment_reopened",
      resourceType: "installment",
      resourceId: installment.id,
      metadata: { amount: Number(installment.amount) },
    });

    return { ok: true };
  });

/** Registra que o vendedor acionou uma cobrança (a mensagem é enviada por ele no WhatsApp). */
export const registerReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        installmentId: z.string().uuid(),
        link: z.string().max(400),
        message: z.string().max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: installment } = await context.supabase
      .from("installments")
      .select("id, store_id, customer_id")
      .eq("id", data.installmentId)
      .maybeSingle();
    if (!installment) throw new Error("Parcela não encontrada.");

    await context.supabase.from("payment_reminders").insert({
      store_id: installment.store_id,
      installment_id: installment.id,
      customer_id: installment.customer_id,
      channel: "whatsapp",
      link: data.link,
      message: data.message,
      created_by: context.userId,
    });

    const { logAudit } = await import("./subscription.server");
    await logAudit({
      storeId: installment.store_id,
      userId: context.userId,
      action: "reminder_prepared",
      resourceType: "installment",
      resourceId: installment.id,
    });

    return { ok: true };
  });
