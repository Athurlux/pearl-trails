/** Demo currency formatting. Uganda showcase uses UGX. */
export function formatUgx(amount: number): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactUgx(amount: number): string {
  // "UGX 850,000" reads better than a compact form at these magnitudes.
  return formatUgx(amount);
}
