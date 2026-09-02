import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProPricing } from "@/lib/pricing.functions";
import { PRO_PLAN_PRICE } from "@/lib/format";

/** Preço vigente do PRO (com promoção relâmpago quando ativa). */
export function useProPricing() {
  const fetchPricing = useServerFn(getProPricing);
  const query = useQuery({
    queryKey: ["pro-pricing"],
    queryFn: () => fetchPricing(),
    staleTime: 60_000,
  });
  return {
    ...query,
    price: query.data?.price ?? PRO_PLAN_PRICE,
    basePrice: query.data?.basePrice ?? PRO_PLAN_PRICE,
    promoActive: query.data?.promoActive ?? false,
    promoLabel: query.data?.promoLabel ?? null,
    promoEndsAt: query.data?.promoEndsAt ?? null,
  };
}
