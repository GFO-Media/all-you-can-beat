import type { ProximityLevel } from "./flashlight";

export type GhostHuntPhase = "intro" | "playing" | "ended";

export type PlayerRole = "ghost" | "hunter" | "spectator";

export interface MansionSize {
  w: number;
  h: number;
}

export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BatteryPickupView {
  id: string;
  x: number;
  y: number;
  gold: boolean;
}

export interface HunterView {
  sessionId: string;
  name: string;
  color: string;
  avatar: number;
  x: number;
  y: number;
  facing: number;
  flashlightOn: boolean;
  battery: number;
  lives: number;
  fainted: boolean;
  reviveProgress: number;
  eliminated: boolean;
  proximity: ProximityLevel;
}

export interface YouView {
  x: number;
  y: number;
  facing: number;
  flashlightOn: boolean;
  battery: number;
  lives: number;
  fainted: boolean;
  reviveProgress: number;
  eliminated: boolean;
  proximity: ProximityLevel;
}

export interface GhostHuntState {
  phase: GhostHuntPhase;
  mansion: MansionSize;
  walls: WallRect[];
  role: PlayerRole;
  ghostHp: number;
  ghostMaxHp: number;
  ghostVisible: boolean;
  ghostX: number | null;
  ghostY: number | null;
  hunters: HunterView[];
  batteries: BatteryPickupView[];
  timeLeft: number;
  roundSeconds: number;
  ghostName: string;
  winner: "ghost" | "hunters" | null;
  /** Lightning flash — briefly reveals the ghost on the TV. */
  lightning: boolean;
  you: YouView;
}
