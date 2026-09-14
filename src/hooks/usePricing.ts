import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlansPricing, getProPricing } from "@/lib/pricing.functions";
import { BASIC_PLAN_PRICE, PRO_PLAN_PRICE } from "@/lib/format";

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

/** Preço vigente dos planos Básica e PRO. */
export function usePlansPricing() {
  const fetchPlans = useServerFn(getPlansPricing);
  const query = useQuery({
    queryKey: ["plans-pricing"],
    queryFn: () => fetchPlans(),
    staleTime: 60_000,
  });
  return {
    ...query,
    basicPrice: query.data?.basica.price ?? BASIC_PLAN_PRICE,
    proPrice: query.data?.pro.price ?? PRO_PLAN_PRICE,
    basic: query.data?.basica ?? null,
    pro: query.data?.pro ?? null,
  };
}
