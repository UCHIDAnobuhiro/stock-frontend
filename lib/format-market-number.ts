const priceFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const volumeFormatter = new Intl.NumberFormat("ja-JP");

export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

export function formatVolume(value: number): string {
  return volumeFormatter.format(Math.round(value));
}
