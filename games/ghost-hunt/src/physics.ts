import type { WallRect } from "./types";

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function circleRectOverlap(
  cx: number,
  cy: number,
  cr: number,
  rect: WallRect,
): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  return dist(cx, cy, closestX, closestY) < cr;
}

export function canPlace(
  x: number,
  y: number,
  r: number,
  walls: WallRect[],
  mansionW: number,
  mansionH: number,
): boolean {
  if (x - r < 0 || x + r > mansionW || y - r < 0 || y + r > mansionH) return false;
  return !walls.some((w) => circleRectOverlap(x, y, r, w));
}

/** Slide along walls by trying axis separately. */
export function moveWithWalls(
  x: number,
  y: number,
  dx: number,
  dy: number,
  r: number,
  walls: WallRect[],
  mansionW: number,
  mansionH: number,
): [number, number] {
  let nx = x + dx;
  let ny = y;
  if (!canPlace(nx, ny, r, walls, mansionW, mansionH)) nx = x;

  ny = y + dy;
  if (!canPlace(nx, ny, r, walls, mansionW, mansionH)) ny = y;

  return [nx, ny];
}
