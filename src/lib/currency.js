/** Keep recorded dollars at cent precision, including derived balances. */
export function roundCurrency(value) {
  const n = Number(value) || 0;
  return Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value) {
  const n = roundCurrency(value);
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
