/** Shared flashlight tuning (server hit tests + client rendering). */

export const FLASHLIGHT_RANGE = 240;
/** Total cone width in radians (~70°). */
export const FLASHLIGHT_SPREAD = (70 * Math.PI) / 180;
export const BATTERY_MAX = 100;
export const BATTERY_DRAIN_PER_SEC = 28;
export const BATTERY_REGEN_PER_SEC = 10;

function normalizeAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

/** Effective beam reach shrinks as the battery drains. */
export function effectiveRange(battery: number): number {
  const t = Math.max(0, Math.min(1, battery / BATTERY_MAX));
  return FLASHLIGHT_RANGE * (0.35 + 0.65 * t);
}

export function conePath(
  cx: number,
  cy: number,
  facing: number,
  range: number,
  spread = FLASHLIGHT_SPREAD,
): string {
  const half = spread / 2;
  const x1 = cx + Math.cos(facing - half) * range;
  const y1 = cy + Math.sin(facing - half) * range;
  const x2 = cx + Math.cos(facing + half) * range;
  const y2 = cy + Math.sin(facing + half) * range;
  const large = spread > Math.PI ? 1 : 0;
  return `M${cx} ${cy} L${x1} ${y1} A${range} ${range} 0 ${large} 1 ${x2} ${y2} Z`;
}

/** True when a point is inside an active flashlight cone. */
export function pointInBeam(
  hx: number,
  hy: number,
  facing: number,
  on: boolean,
  battery: number,
  tx: number,
  ty: number,
): boolean {
  if (!on || battery <= 0) return false;
  const range = effectiveRange(battery);
  const dx = tx - hx;
  const dy = ty - hy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  const angleTo = Math.atan2(dy, dx);
  return Math.abs(normalizeAngle(angleTo - facing)) <= FLASHLIGHT_SPREAD / 2;
}

export type ProximityLevel = "none" | "far" | "near" | "danger";

export function ghostProximity(
  hx: number,
  hy: number,
  gx: number,
  gy: number,
): ProximityLevel {
  const d = Math.hypot(gx - hx, gy - hy);
  if (d > 220) return "none";
  if (d > 140) return "far";
  if (d > 80) return "near";
  return "danger";
}
