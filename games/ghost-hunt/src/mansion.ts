import type { WallRect } from "./types";

export const MANSION_W = 1000;
export const MANSION_H = 720;

/** Simple Luigi's Mansion–style floor plan (axis-aligned walls). */
export const MANSION_WALLS: WallRect[] = [
  // Outer bounds (rooms carved from negative space via inner walls)
  { x: 0, y: 0, w: MANSION_W, h: 24 },
  { x: 0, y: MANSION_H - 24, w: MANSION_W, h: 24 },
  { x: 0, y: 0, w: 24, h: MANSION_H },
  { x: MANSION_W - 24, y: 0, w: 24, h: MANSION_H },

  // Central cross hallway
  { x: 380, y: 120, w: 40, h: 200 },
  { x: 580, y: 120, w: 40, h: 200 },
  { x: 200, y: 300, w: 600, h: 40 },
  { x: 380, y: 400, w: 40, h: 200 },
  { x: 580, y: 400, w: 40, h: 200 },

  // Side rooms
  { x: 120, y: 120, w: 200, h: 40 },
  { x: 120, y: 500, w: 200, h: 40 },
  { x: 680, y: 120, w: 200, h: 40 },
  { x: 680, y: 500, w: 200, h: 40 },

  // Furniture blocks
  { x: 80, y: 200, w: 60, h: 60 },
  { x: 860, y: 200, w: 60, h: 60 },
  { x: 80, y: 460, w: 80, h: 50 },
  { x: 840, y: 460, w: 80, h: 50 },
  { x: 460, y: 80, w: 80, h: 50 },
  { x: 460, y: 590, w: 80, h: 50 },
];

export const HUNTER_SPAWN: [number, number][] = [
  [120, 620],
  [880, 620],
  [120, 100],
  [880, 100],
  [500, 620],
  [500, 100],
  [200, 380],
  [800, 380],
];

export const GHOST_SPAWN: [number, number] = [500, 360];
