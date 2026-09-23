// Basis points and integer cents keep the application fee deterministic.
export const HIDN_FEE_BPS = 500;
export function hidnFee(amountCents: number) {
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents < 50 ||
    amountCents > 100000
  )
    throw new Error('Invalid drop amount');
  return Math.floor((amountCents * HIDN_FEE_BPS + 5000) / 10000);
}
export function earningsEstimate(amountCents: number) {
  const platformFee = hidnFee(amountCents);
  // Estimate only. Stripe determines and deducts its actual processing fee.
  const processingFee = Math.floor((amountCents * 290 + 5000) / 10000) + 30;
  return {
    platformFee,
    processingFee,
    net: amountCents - platformFee - processingFee,
  };
}
