import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Confirma manualmente o recebimento de uma parcela (Pix direto ao vendedor).
 *
 * Regras aplicadas no SERVIDOR:
 * - só `pending` ou `overdue` podem virar `paid`;
 * - `paid` e `canceled` são estados finais (nada de reabrir ou sobrescrever);
 * - a loja precisa ter direito ao recurso PRO de verdade.
 */
export const markInstallmentPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        installmentId: z.string().uuid(),
        paymentReference: z.string().max(120).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // A RLS garante que só o dono da loja alcança a parcela.
    const { data: current, error: readError } = await context.supabase
      .from("installments")
      .select("id, store_id, status, installment_number, total_installments, amount")
      .eq("id", data.installmentId)
      .maybeSingle();

    if (readError) throw new Error("Não foi possível ler a parcela.");
    if (!current) throw new Error("Parcela não encontrada.");

    if (current.status === "paid") throw new Error("Esta parcela já está marcada como paga.");
    if (current.status === "canceled") throw new Error("Esta parcela foi cancelada.");
    if (current.status !== "pending" && current.status !== "overdue") {
      throw new Error("Esta parcela não pode receber baixa.");
    }

    const { storeHasPro, logAudit } = await import("./subscription.server");
    if (!(await storeHasPro(current.store_id))) {
      throw new Error("A confirmação de parcelas é um recurso do plano PRO.");
    }

    // A transição só acontece quando o status ainda é o mesmo lido acima.
    const { data: updated, error } = await context.supabase
      .from("installments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_by: context.userId,
        payment_method: "pix",
        payment_reference: data.paymentReference ?? null,
      })
      .eq("id", current.id)
      .in("status", ["pending", "overdue"])
      .select("id, store_id, amount")
      .maybeSingle();

    if (error) throw new Error("Não foi possível atualizar a parcela.");
    if (!updated) throw new Error("Esta parcela já foi atualizada por outra ação.");

    await logAudit({
      storeId: updated.store_id,
      userId: context.userId,
      action: "installment_paid",
      resourceType: "installment",
      resourceId: updated.id,
      metadata: {
        amount: Number(updated.amount),
        previous_status: current.status,
        reference: data.paymentReference ?? null,
      },
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
