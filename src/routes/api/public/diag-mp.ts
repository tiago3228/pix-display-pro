import { createFileRoute } from "@tanstack/react-router";

/** Diagnóstico temporário do Mercado Pago (sem expor credenciais). */
export const Route = createFileRoute("/api/public/diag-mp")({
  server: {
    handlers: {
      GET: async () => {
        const prod = process.env["MERCADOPAGO_PROD_ACCESS_TOKEN"] ?? "";
        const test = process.env["MERCADOPAGO_ACCESS_TOKEN"] ?? "";
        const info: Record<string, unknown> = {
          prodPrefix: prod.slice(0, 5),
          testPrefix: test.slice(0, 5),
          env: process.env["MERCADOPAGO_ENVIRONMENT"] ?? null,
          appBaseUrl: process.env["APP_BASE_URL"] ?? null,
        };
        if (prod) {
          const r = await fetch("https://api.mercadopago.com/users/me", {
            headers: { Authorization: `Bearer ${prod}` },
          });
          const j = (await r.json()) as Record<string, unknown>;
          info["me"] = {
            status: r.status,
            id: j["id"],
            email: j["email"],
            site: j["site_id"],
            type: j["user_type"],
            status_site: j["status"],
          };
        }
        return new Response(JSON.stringify(info), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
