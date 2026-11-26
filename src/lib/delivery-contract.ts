export type PublicDeliveryQuote = { allowed: false } | { allowed: true; fee: number };

export function projectDeliveryQuote(result: {
  allowed: boolean;
  fee?: number;
  [key: string]: unknown;
}): PublicDeliveryQuote {
  if (!result.allowed || !Number.isFinite(result.fee) || Number(result.fee) < 0) {
    return { allowed: false };
  }
  return { allowed: true, fee: Number(result.fee) };
}
