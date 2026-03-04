export function toScore100(raw: number | null | undefined) {
  const n = Number(raw ?? 0);

  if (!Number.isFinite(n)) return 0;

  // If already 0–100, return as is
  if (n > 10) return Math.round(n);

  // Convert 0–10 → 0–100
  return Math.round(n * 10);
}
