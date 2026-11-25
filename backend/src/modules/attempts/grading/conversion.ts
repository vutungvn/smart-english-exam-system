import type { ConversionPoint } from '../../../infra/settings/settings.schema.js';

/** Nội suy tuyến tính giữa hai mốc, làm tròn tới bội số của step; x ngoài khoảng thì ép về hai đầu */
export function convert(points: readonly ConversionPoint[], x: number, step: number): number {
  const clamped = Math.min(Math.max(x, points[0].raw), points[points.length - 1].raw);
  const upper = points.findIndex((point) => point.raw >= clamped);
  const to = points[upper];
  const from = upper > 0 ? points[upper - 1] : to;
  const value =
    to.raw === from.raw
      ? to.score
      : from.score + ((to.score - from.score) * (clamped - from.raw)) / (to.raw - from.raw);
  return Math.round(value / step) * step;
}
