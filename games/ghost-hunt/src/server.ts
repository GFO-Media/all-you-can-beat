import type { GameContext, GameDefinition, MiniGame } from "@ayb/game-sdk";
import type { GameAction } from "@ayb/shared";
import {
  BATTERY_DRAIN_PER_SEC,
  BATTERY_MAX,
  BATTERY_REGEN_PER_SEC,
  ghostProximity,
  pointInBeam,
} from "./flashlight";
import {
  GHOST_SPAWN,
  HUNTER_SPAWN,
  MANSION_H,
  MANSION_W,
  MANSION_WALLS,
} from "./mansion";
import { ghostHuntMeta } from "./meta";
import { moveWithWalls } from "./physics";
import type { GhostHuntPhase, GhostHuntState, PlayerRole } from "./types";

const INTRO_MS = 3500;
const ROUND_SECONDS = 300;
const GHOST_MAX_HP = 100;
const HUNTER_R = 22;
const GHOST_R = 26;
const HUNTER_SPEED = 200;
const GHOST_SPEED = 250;
const HP_DRAIN_PER_SEC = 22;
const REVIVE_PER_SEC = 40;
const GHOST_CAPTURE_R = 48;
const CAPTURE_MS = 1400;
const LIGHTNING_INTERVAL_MS = 35_000;
const LIGHTNING_MS = 2200;
const BATTERY_PICKUP_R = 28;
const BATTERY_RESPAWN_MS = 28_000;
const WIN_POINTS = 120;
const LOSE_POINTS = 40;

interface MoveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

interface HunterBody {
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
  capturingUntil: number;
}

interface BatteryPickup {
  id: string;
  x: number;
  y: number;
  gold: boolean;
  respawnAt: number;
}

interface GhostBody {
  sessionId: string;
  name: string;
  x: number;
  y: number;
}

const BATTERY_SPAWNS: [number, number, boolean][] = [
  [200, 380, false],
  [800, 380, false],
  [500, 180, true],
  [500, 560, false],
];

class GhostHuntGame implements MiniGame {
  private ctx!: GameContext;
  private phase: GhostHuntPhase = "intro";
  private timer = INTRO_MS;
  private timeLeft = ROUND_SECONDS;
  private ghostHp = GHOST_MAX_HP;
  private ghost!: GhostBody;
  private hunters: HunterBody[] = [];
  private batteries: BatteryPickup[] = [];
  private roles = new Map<string, PlayerRole>();
  private moveInputs = new Map<string, MoveInput>();
  private flashlightOn = new Set<string>();
  private winner: "ghost" | "hunters" | null = null;
  private syncAccumulator = 0;
  private lit = false;
  private lightningUntil = 0;
  private nextLightningAt = LIGHTNING_INTERVAL_MS;
  private rumbleCooldown = new Map<string, number>();

  init(ctx: GameContext): void {
    this.ctx = ctx;
    this.assignRoles();
    this.spawnBatteries();
    this.ctx.syncState();
  }

  tick(deltaMs: number): void {
    this.timer -= deltaMs;

    if (this.phase === "intro" && this.timer <= 0) {
      this.phase = "playing";
      this.timer = 0;
      this.nextLightningAt = LIGHTNING_INTERVAL_MS;
      this.ctx.syncState();
    }

    if (this.phase === "playing") {
      const dt = Math.min(deltaMs / 1000, 0.05);
      this.stepLightning(deltaMs);
      this.stepMovement(dt);
      this.stepBatteries(dt);
      this.stepFlashlights(dt);
      this.stepExposure(dt);
      this.stepCapture(dt);
      this.stepRevive(dt);
      this.stepProximityRumble();
      this.timeLeft = Math.max(0, this.timeLeft - dt);

      this.syncAccumulator += deltaMs;
      if (this.syncAccumulator >= 80) {
        this.syncAccumulator = 0;
        this.ctx.syncState();
      }

      if (this.ghostHp <= 0) {
        this.winner = "hunters";
        this.finish();
      } else if (this.allHuntersDown()) {
        this.winner = "ghost";
        this.finish();
      } else if (this.timeLeft <= 0) {
        this.winner = "hunters";
        this.finish();
      }
    }
  }

  onPlayerAction(sessionId: string, action: GameAction): void {
    if (this.phase !== "playing") return;
    const role = this.roles.get(sessionId);
    if (!role || role === "spectator") return;

    if (action.type === "move") {
      this.moveInputs.set(sessionId, {
        up: Boolean(action.up),
        down: Boolean(action.down),
        left: Boolean(action.left),
        right: Boolean(action.right),
      });
    } else if (action.type === "flashlight" && role === "hunter") {
      if (action.on) this.flashlightOn.add(sessionId);
      else this.flashlightOn.delete(sessionId);
    }
  }

  getStateForPlayer(sessionId: string): GhostHuntState {
    const role = this.roles.get(sessionId) ?? "spectator";
    const now = Date.now();
    const lightning = now < this.lightningUntil;

    const hunterViews = this.hunters.map((h) => ({
      sessionId: h.sessionId,
      name: h.name,
      color: h.color,
      avatar: h.avatar,
      x: h.x,
      y: h.y,
      facing: h.facing,
      flashlightOn: h.flashlightOn && !h.fainted && !h.eliminated,
      battery: Math.round(h.battery),
      lives: h.lives,
      fainted: h.fainted,
      reviveProgress: Math.round(h.reviveProgress),
      eliminated: h.eliminated,
      proximity: ghostProximity(h.x, h.y, this.ghost.x, this.ghost.y),
    }));

    const youHunter = this.hunters.find((h) => h.sessionId === sessionId);
    const you = youHunter
      ? {
          x: youHunter.x,
          y: youHunter.y,
          facing: youHunter.facing,
          flashlightOn: youHunter.flashlightOn && !youHunter.fainted && !youHunter.eliminated,
          battery: Math.round(youHunter.battery),
          lives: youHunter.lives,
          fainted: youHunter.fainted,
          reviveProgress: Math.round(youHunter.reviveProgress),
          eliminated: youHunter.eliminated,
          proximity: ghostProximity(youHunter.x, youHunter.y, this.ghost.x, this.ghost.y),
        }
      : role === "ghost"
        ? {
            x: this.ghost.x,
            y: this.ghost.y,
            facing: 0,
            flashlightOn: false,
            battery: BATTERY_MAX,
            lives: 0,
            fainted: false,
            reviveProgress: 0,
            eliminated: false,
            proximity: "none" as const,
          }
        : {
            x: MANSION_W / 2,
            y: MANSION_H / 2,
            facing: 0,
            flashlightOn: false,
            battery: BATTERY_MAX,
            lives: 0,
            fainted: false,
            reviveProgress: 0,
            eliminated: false,
            proximity: "none" as const,
          };

    const ghostLitByBeam = this.hunters.some((h) => this.beamHitsGhost(h));
    const ghostVisible =
      role === "ghost" ||
      lightning ||
      (role === "spectator" && (ghostLitByBeam || lightning)) ||
      (role === "hunter" && this.hunterSeesGhost(sessionId));

    const showGhostPos =
      role === "ghost" || role === "spectator" || this.hunterSeesGhost(sessionId) || lightning;

    return {
      phase: this.phase,
      mansion: { w: MANSION_W, h: MANSION_H },
      walls: MANSION_WALLS,
      role,
      ghostHp: Math.max(0, Math.round(this.ghostHp)),
      ghostMaxHp: GHOST_MAX_HP,
      ghostVisible,
      ghostX: showGhostPos ? this.ghost.x : null,
      ghostY: showGhostPos ? this.ghost.y : null,
      hunters:
        role === "ghost" || role === "spectator"
          ? hunterViews
          : hunterViews.filter((h) => h.sessionId === sessionId),
      batteries: this.batteries
        .filter((b) => b.respawnAt <= now)
        .map((b) => ({ id: b.id, x: b.x, y: b.y, gold: b.gold })),
      timeLeft: Math.ceil(this.timeLeft),
      roundSeconds: ROUND_SECONDS,
      ghostName: this.ghost.name,
      winner: this.winner,
      lightning,
      you,
    };
  }

  private spawnBatteries(): void {
    this.batteries = BATTERY_SPAWNS.map(([x, y, gold], i) => ({
      id: `bat-${i}`,
      x,
      y,
      gold,
      respawnAt: 0,
    }));
  }

  private assignRoles(): void {
    const players = this.ctx.players();
    const field = players.filter((p) => !p.isHost);
    const pool = field.length >= 2 ? field : players;
    const ghostPlayer = pool[Math.floor(Math.random() * pool.length)];

    this.ghost = {
      sessionId: ghostPlayer.sessionId,
      name: ghostPlayer.name,
      x: GHOST_SPAWN[0],
      y: GHOST_SPAWN[1],
    };

    this.hunters = [];
    this.roles.clear();
    this.moveInputs.clear();
    this.flashlightOn.clear();

    const hunterCount = players.filter(
      (p) => !p.isHost && p.sessionId !== ghostPlayer.sessionId,
    ).length;
    const livesPerHunter = hunterCount <= 1 ? 3 : hunterCount === 2 ? 2 : 1;

    for (const p of players) {
      if (p.isHost) {
        this.roles.set(p.sessionId, "spectator");
        continue;
      }
      if (p.sessionId === ghostPlayer.sessionId) {
        this.roles.set(p.sessionId, "ghost");
        continue;
      }
      const idx = this.hunters.length;
      const spawn = HUNTER_SPAWN[idx % HUNTER_SPAWN.length];
      this.hunters.push({
        sessionId: p.sessionId,
        name: p.name,
        color: p.color,
        avatar: p.avatar,
        x: spawn[0],
        y: spawn[1],
        facing: Math.PI / 2,
        flashlightOn: false,
        battery: BATTERY_MAX,
        lives: livesPerHunter,
        fainted: false,
        reviveProgress: 0,
        eliminated: false,
        capturingUntil: 0,
      });
      this.roles.set(p.sessionId, "hunter");
      this.moveInputs.set(p.sessionId, { up: false, down: false, left: false, right: false });
    }

    this.moveInputs.set(ghostPlayer.sessionId, { up: false, down: false, left: false, right: false });
  }

  private stepLightning(deltaMs: number): void {
    this.nextLightningAt -= deltaMs;
    if (this.nextLightningAt <= 0) {
      this.lightningUntil = Date.now() + LIGHTNING_MS;
      this.nextLightningAt = LIGHTNING_INTERVAL_MS + Math.random() * 10_000;
      this.ctx.broadcastEvent({ type: "lightning" });
    }
  }

  private stepMovement(dt: number): void {
    for (const hunter of this.hunters) {
      if (hunter.fainted || hunter.eliminated || hunter.capturingUntil > Date.now()) continue;
      const input = this.moveInputs.get(hunter.sessionId);
      if (!input) continue;
      const [dx, dy] = this.dirVector(input, HUNTER_SPEED * dt);
      if (dx !== 0 || dy !== 0) {
        hunter.facing = Math.atan2(dy, dx);
        [hunter.x, hunter.y] = moveWithWalls(
          hunter.x,
          hunter.y,
          dx,
          dy,
          HUNTER_R,
          MANSION_WALLS,
          MANSION_W,
          MANSION_H,
        );
      }
    }

    const ghostInput = this.moveInputs.get(this.ghost.sessionId);
    if (ghostInput) {
      const [dx, dy] = this.dirVector(ghostInput, GHOST_SPEED * dt);
      if (dx !== 0 || dy !== 0) {
        [this.ghost.x, this.ghost.y] = moveWithWalls(
          this.ghost.x,
          this.ghost.y,
          dx,
          dy,
          GHOST_R,
          MANSION_WALLS,
          MANSION_W,
          MANSION_H,
        );
      }
    }
  }

  private stepBatteries(dt: number): void {
    const now = Date.now();
    for (const hunter of this.hunters) {
      if (hunter.fainted || hunter.eliminated) continue;
      for (const bat of this.batteries) {
        if (bat.respawnAt > now) continue;
        const d = Math.hypot(hunter.x - bat.x, hunter.y - bat.y);
        if (d > BATTERY_PICKUP_R + HUNTER_R) continue;
        hunter.battery = BATTERY_MAX;
        bat.respawnAt = now + BATTERY_RESPAWN_MS;
        this.ctx.sendEventTo(hunter.sessionId, { type: "battery" });
        break;
      }
    }
  }

  private stepFlashlights(dt: number): void {
    for (const hunter of this.hunters) {
      const wantsOn = this.flashlightOn.has(hunter.sessionId);
      hunter.flashlightOn = wantsOn && !hunter.fainted && !hunter.eliminated && hunter.battery > 0;

      if (hunter.flashlightOn) {
        hunter.battery = Math.max(0, hunter.battery - BATTERY_DRAIN_PER_SEC * dt);
        if (hunter.battery <= 0) {
          hunter.flashlightOn = false;
          this.flashlightOn.delete(hunter.sessionId);
        }
      } else if (!hunter.fainted && !hunter.eliminated) {
        hunter.battery = Math.min(BATTERY_MAX, hunter.battery + BATTERY_REGEN_PER_SEC * dt);
      }
    }
  }

  private stepExposure(dt: number): void {
    this.lit = this.hunters.some((h) => this.beamHitsGhost(h));
    if (this.lit) {
      this.ghostHp -= HP_DRAIN_PER_SEC * dt;
    }
  }

  private stepCapture(dt: number): void {
    const now = Date.now();
    for (const hunter of this.hunters) {
      if (hunter.fainted || hunter.eliminated) continue;

      const d = Math.hypot(hunter.x - this.ghost.x, hunter.y - this.ghost.y);
      if (d >= GHOST_CAPTURE_R + HUNTER_R) {
        hunter.capturingUntil = 0;
        continue;
      }

      if (this.lit) {
        hunter.capturingUntil = 0;
        continue;
      }

      if (hunter.capturingUntil === 0) {
        hunter.capturingUntil = now + CAPTURE_MS;
        this.ctx.sendEventTo(hunter.sessionId, { type: "capture" });
      } else if (now >= hunter.capturingUntil) {
        this.faintHunter(hunter);
      }
    }
  }

  private faintHunter(hunter: HunterBody): void {
    hunter.capturingUntil = 0;
    if (hunter.lives > 1) {
      hunter.lives -= 1;
      const idx = this.hunters.indexOf(hunter);
      const spawn = HUNTER_SPAWN[idx % HUNTER_SPAWN.length];
      hunter.x = spawn[0];
      hunter.y = spawn[1];
      hunter.flashlightOn = false;
      this.flashlightOn.delete(hunter.sessionId);
      this.ctx.sendEventTo(hunter.sessionId, { type: "respawn" });
      return;
    }

    hunter.lives = 0;
    hunter.fainted = true;
    hunter.reviveProgress = 0;
    hunter.flashlightOn = false;
    this.flashlightOn.delete(hunter.sessionId);
    this.ctx.sendEventTo(hunter.sessionId, { type: "faint" });
  }

  private stepRevive(dt: number): void {
    for (const hunter of this.hunters) {
      if (!hunter.fainted) continue;
      const litByAlly = this.hunters.some(
        (ally) =>
          ally.sessionId !== hunter.sessionId &&
          !ally.fainted &&
          !ally.eliminated &&
          pointInBeam(ally.x, ally.y, ally.facing, ally.flashlightOn, ally.battery, hunter.x, hunter.y),
      );
      if (!litByAlly) continue;
      hunter.reviveProgress = Math.min(100, hunter.reviveProgress + REVIVE_PER_SEC * dt);
      if (hunter.reviveProgress >= 100) {
        hunter.fainted = false;
        hunter.reviveProgress = 0;
        hunter.lives = 1;
        hunter.battery = Math.min(BATTERY_MAX, hunter.battery + 40);
        this.ctx.sendEventTo(hunter.sessionId, { type: "revived" });
      }
    }
  }

  private stepProximityRumble(): void {
    const now = Date.now();
    for (const hunter of this.hunters) {
      if (hunter.fainted || hunter.eliminated) continue;
      const level = ghostProximity(hunter.x, hunter.y, this.ghost.x, this.ghost.y);
      if (level === "none") continue;
      const last = this.rumbleCooldown.get(hunter.sessionId) ?? 0;
      const interval = level === "danger" ? 350 : level === "near" ? 600 : 900;
      if (now - last < interval) continue;
      this.rumbleCooldown.set(hunter.sessionId, now);
      this.ctx.sendEventTo(hunter.sessionId, { type: "rumble", level });
    }
  }

  private beamHitsGhost(hunter: HunterBody): boolean {
    if (hunter.fainted || hunter.eliminated) return false;
    return pointInBeam(
      hunter.x,
      hunter.y,
      hunter.facing,
      hunter.flashlightOn,
      hunter.battery,
      this.ghost.x,
      this.ghost.y,
    );
  }

  private hunterSeesGhost(sessionId: string): boolean {
    const hunter = this.hunters.find((h) => h.sessionId === sessionId);
    if (!hunter || hunter.fainted || hunter.eliminated) return false;
    return this.beamHitsGhost(hunter);
  }

  private allHuntersDown(): boolean {
    const active = this.hunters.filter((h) => !h.eliminated);
    if (active.length === 0) return false;
    return active.every((h) => h.fainted);
  }

  private dirVector(input: MoveInput, len: number): [number, number] {
    let vx = 0;
    let vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (vx === 0 && vy === 0) return [0, 0];
    const mag = Math.hypot(vx, vy);
    return [(vx / mag) * len, (vy / mag) * len];
  }

  private finish(): void {
    this.phase = "ended";
    const points: Record<string, number> = {};
    for (const p of this.ctx.players()) {
      const role = this.roles.get(p.sessionId);
      if (role === "ghost") {
        points[p.sessionId] = this.winner === "ghost" ? WIN_POINTS : LOSE_POINTS;
      } else if (role === "hunter") {
        points[p.sessionId] = this.winner === "hunters" ? WIN_POINTS : LOSE_POINTS;
      } else {
        points[p.sessionId] = 0;
      }
    }
    this.ctx.syncState();
    this.ctx.end(points);
  }
}

export const ghostHuntDefinition: GameDefinition = {
  meta: ghostHuntMeta,
  create: () => new GhostHuntGame(),
};
