export function formatCurrency(amount: number | string = 0, currency = "Rp"): string {
  const num = typeof amount === "string" ? parseFloat(amount) || 0 : amount || 0;
  return `${currency} ${num.toLocaleString("id-ID")}`;
}
