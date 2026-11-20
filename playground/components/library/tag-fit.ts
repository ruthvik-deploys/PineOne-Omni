/**
 * Pure: how many chips fit on one line. `widths` are in display order; when they don't all fit,
 * room is kept for the More button at the end.
 */
export function fitCount(widths: number[], available: number, moreWidth: number, gap: number) {
  const total = widths.reduce((sum, w, i) => sum + w + (i ? gap : 0), 0);
  if (total <= available) return widths.length;
  let used = moreWidth;
  let n = 0;
  for (const w of widths) {
    if (used + gap + w > available) break;
    used += gap + w;
    n += 1;
  }
  return n;
}
