import type { GameContext, GameDefinition, MiniGame } from "@ayb/game-sdk";
import type { GameAction } from "@ayb/shared";
import { blobbyVolleyMeta } from "./meta";
import type { BlobbyVolleyPhase, BlobbyVolleyState } from "./types";

// Court in logical units (shared with client renderer).
export const COURT_W = 1000;
export const COURT_H = 600;
const GROUND_Y = 520;
const NET_X = 500;
const NET_TOP = 300;
const NET_W = 14;
const BLOB_R = 46;
const BALL_R = 22;
const GRAVITY = 950;
const BALL_GRAVITY = 720;
const MOVE_SPEED = 500;
const JUMP_V = -680;
const FLOAT_Y = 108;
const FLOAT_BOB = 10;
const BLOB_RESTITUTION = 0.82;
const BALL_GROUND_RESTITUTION = 0.72;
const BALL_BLOB_RESTITUTION = 0.88;
const MAX_VY = 1400;
const INTRO_MS = 3000;
const POINT_PAUSE_MS = 2200;
const POINTS_TO_WIN = 5;
const WIN_POINTS = 100;
const LOSE_POINTS = 35;

interface BlobBody {
  id: string;
  sessionId: string;
  name: string;
  color: string;
  team: 0 | 1;
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

interface BallBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface PlayerInput {
  left: boolean;
  right: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

class BlobbyVolleyGame implements MiniGame {
  private ctx!: GameContext;
  private phase: BlobbyVolleyPhase = "intro";
  private timer = INTRO_MS;
  private scores: [number, number] = [0, 0];
  private lastPointTeam: 0 | 1 | null = null;
  private blobs: BlobBody[] = [];
  private ball: BallBody = { x: NET_X, y: FLOAT_Y, vx: 0, vy: 0 };
  private ballFloating = true;
  private floatPhase = 0;
  private inputs = new Map<string, PlayerInput>();
  private blobBySession = new Map<string, string>();
  private syncAccumulator = 0;

  init(ctx: GameContext): void {
    this.ctx = ctx;
    this.setupTeams();
    this.resetBall();
    this.ctx.syncState();
  }

  tick(deltaMs: number): void {
    this.timer -= deltaMs;

    if (this.phase === "intro" && this.timer <= 0) {
      this.phase = "playing";
      this.timer = 0;
      this.ctx.syncState();
    }

    if (this.phase === "playing") {
      const dt = Math.min(deltaMs / 1000, 0.05);
      this.stepPhysics(dt);
      this.syncAccumulator += deltaMs;
      if (this.syncAccumulator >= 40) {
        this.syncAccumulator = 0;
        this.ctx.syncState();
      }
    }

    if (this.phase === "point" && this.timer <= 0) {
      if (this.scores[0] >= POINTS_TO_WIN || this.scores[1] >= POINTS_TO_WIN) {
        this.finish();
      } else {
        this.phase = "playing";
        this.resetBall();
        this.resetBlobPositions();
        this.ctx.syncState();
      }
    }
  }

  onPlayerAction(sessionId: string, action: GameAction): void {
    const blobId = this.blobBySession.get(sessionId);
    if (!blobId) return;

    if (action.type === "input") {
      this.inputs.set(sessionId, {
        left: Boolean(action.left),
        right: Boolean(action.right),
      });
    } else if (action.type === "jump" && this.phase === "playing") {
      const blob = this.blobs.find((b) => b.id === blobId);
      if (blob?.onGround) {
        blob.vy = JUMP_V;
        blob.onGround = false;
      }
    }
  }

  getStateForPlayer(sessionId: string): BlobbyVolleyState {
    const blob = this.blobs.find((b) => b.sessionId === sessionId);
    const teamNames: [string[], string[]] = [[], []];
    for (const b of this.blobs) teamNames[b.team].push(b.name);

    return {
      phase: this.phase,
      court: {
        w: COURT_W,
        h: COURT_H,
        groundY: GROUND_Y,
        netX: NET_X,
        netTop: NET_TOP,
      },
      blobs: this.blobs.map((b) => ({
        id: b.id,
        sessionId: b.sessionId,
        name: b.name,
        color: b.color,
        team: b.team,
        x: b.x,
        y: b.y,
        r: BLOB_R,
      })),
      ball: { x: this.ball.x, y: this.ball.y, r: BALL_R },
      ballFloating: this.ballFloating,
      scores: [...this.scores],
      pointsToWin: POINTS_TO_WIN,
      lastPointTeam: this.lastPointTeam,
      yourTeam: blob?.team ?? 0,
      yourBlobId: blob?.id ?? null,
      teams: [
        { team: 0, score: this.scores[0], playerNames: teamNames[0] },
        { team: 1, score: this.scores[1], playerNames: teamNames[1] },
      ],
    };
  }

  private setupTeams(): void {
    const players = this.ctx.players();
    this.blobs = [];
    this.inputs.clear();
    this.blobBySession.clear();

    const count = players.length;
    const leftSlots =
      count === 2 ? [0.35] : count === 3 ? [0.28, 0.42] : [0.25, 0.4];
    const rightSlots =
      count === 2 ? [0.65] : count === 3 ? [0.72] : [0.6, 0.75];

    let leftIdx = 0;
    let rightIdx = 0;

    players.forEach((p, i) => {
      const team: 0 | 1 = i % 2 === 0 ? 0 : 1;
      const slots = team === 0 ? leftSlots : rightSlots;
      const slotIdx = team === 0 ? leftIdx++ : rightIdx++;
      const slot = slots[Math.min(slotIdx, slots.length - 1)];
      const id = `blob-${p.sessionId}`;
      this.blobs.push({
        id,
        sessionId: p.sessionId,
        name: p.name,
        color: p.color,
        team,
        x: slot * COURT_W,
        y: GROUND_Y - BLOB_R,
        vx: 0,
        vy: 0,
        onGround: true,
      });
      this.blobBySession.set(p.sessionId, id);
      this.inputs.set(p.sessionId, { left: false, right: false });
    });
  }

  private resetBlobPositions(): void {
    for (const blob of this.blobs) {
      const slots =
        blob.team === 0
          ? this.blobs.filter((b) => b.team === 0)
          : this.blobs.filter((b) => b.team === 1);
      const index = slots.findIndex((b) => b.id === blob.id);
      const count = slots.length;
      const t = count === 1 ? 0.5 : (index + 1) / (count + 1);
      const minX = blob.team === 0 ? BLOB_R + 20 : NET_X + NET_W / 2 + BLOB_R + 20;
      const maxX = blob.team === 0 ? NET_X - NET_W / 2 - BLOB_R - 20 : COURT_W - BLOB_R - 20;
      blob.x = minX + (maxX - minX) * t;
      blob.y = GROUND_Y - BLOB_R;
      blob.vx = 0;
      blob.vy = 0;
      blob.onGround = true;
    }
  }

  private resetBall(): void {
    this.ballFloating = true;
    this.floatPhase = 0;
    this.ball = { x: NET_X, y: FLOAT_Y, vx: 0, vy: 0 };
  }

  private stepPhysics(dt: number): void {
    if (this.ballFloating) {
      this.floatPhase += dt;
      this.ball.x = NET_X;
      this.ball.y = FLOAT_Y + Math.sin(this.floatPhase * 2.8) * FLOAT_BOB;
      this.ball.vx = 0;
      this.ball.vy = 0;
    }
    for (const blob of this.blobs) {
      const input = this.inputs.get(blob.sessionId);
      if (input) {
        if (input.left) blob.vx = -MOVE_SPEED;
        else if (input.right) blob.vx = MOVE_SPEED;
        else blob.vx *= 0.82;
      }

      blob.vy = clamp(blob.vy + GRAVITY * dt, -MAX_VY, MAX_VY);
      blob.x += blob.vx * dt;
      blob.y += blob.vy * dt;

      const minX = blob.team === 0 ? BLOB_R : NET_X + NET_W / 2 + BLOB_R;
      const maxX = blob.team === 0 ? NET_X - NET_W / 2 - BLOB_R : COURT_W - BLOB_R;
      blob.x = clamp(blob.x, minX, maxX);

      if (blob.y >= GROUND_Y - BLOB_R) {
        blob.y = GROUND_Y - BLOB_R;
        blob.vy = 0;
        blob.onGround = true;
      } else {
        blob.onGround = false;
      }
    }

    if (!this.ballFloating) {
      this.ball.vy = clamp(this.ball.vy + BALL_GRAVITY * dt, -MAX_VY, MAX_VY);
      this.ball.x += this.ball.vx * dt;
      this.ball.y += this.ball.vy * dt;
    }

    if (!this.ballFloating) {
      if (this.ball.x < BALL_R) {
        this.ball.x = BALL_R;
        this.ball.vx = Math.abs(this.ball.vx) * BALL_GROUND_RESTITUTION;
      }
      if (this.ball.x > COURT_W - BALL_R) {
        this.ball.x = COURT_W - BALL_R;
        this.ball.vx = -Math.abs(this.ball.vx) * BALL_GROUND_RESTITUTION;
      }
    }

    if (!this.ballFloating && this.ball.y >= GROUND_Y - BALL_R) {
      const onLeft = this.ball.x < NET_X - NET_W / 2;
      const onRight = this.ball.x > NET_X + NET_W / 2;
      if (onLeft || onRight) {
        this.awardPoint(onLeft ? 1 : 0);
        return;
      }
      this.ball.y = GROUND_Y - BALL_R;
      this.ball.vy = -Math.abs(this.ball.vy) * BALL_GROUND_RESTITUTION;
      this.ball.vx *= 0.96;
    }

    if (!this.ballFloating && this.ball.y < BALL_R) {
      this.ball.y = BALL_R;
      this.ball.vy = Math.abs(this.ball.vy) * 0.6;
    }

    if (!this.ballFloating) this.resolveNetCollision();
    for (const blob of this.blobs) this.resolveBlobBall(blob);
    this.resolveBlobBlob();
  }

  private resolveNetCollision(): void {
    const inNetX =
      this.ball.x > NET_X - NET_W / 2 - BALL_R &&
      this.ball.x < NET_X + NET_W / 2 + BALL_R;
    const belowNetTop = this.ball.y > NET_TOP - BALL_R;
    if (!inNetX || !belowNetTop) return;

    if (this.ball.y < GROUND_Y - BALL_R - 10) {
      if (this.ball.x < NET_X) {
        this.ball.x = NET_X - NET_W / 2 - BALL_R;
        this.ball.vx = -Math.abs(this.ball.vx) * 0.55;
      } else {
        this.ball.x = NET_X + NET_W / 2 + BALL_R;
        this.ball.vx = Math.abs(this.ball.vx) * 0.55;
      }
    }
  }

  private resolveBlobBall(blob: BlobBody): void {
    const d = dist(blob.x, blob.y, this.ball.x, this.ball.y);
    const minD = BLOB_R + BALL_R;
    if (d >= minD || d === 0) return;

    const nx = (this.ball.x - blob.x) / d;
    const ny = (this.ball.y - blob.y) / d;
    const overlap = minD - d;
    this.ball.x += nx * overlap;
    this.ball.y += ny * overlap;

    const relVx = this.ball.vx - blob.vx;
    const relVy = this.ball.vy - blob.vy;
    const relAlong = relVx * nx + relVy * ny;
    if (this.ballFloating) {
      this.ballFloating = false;
      this.ball.vx = blob.vx * 0.6 + nx * 180;
      this.ball.vy = blob.vy * 0.4 + ny * 180 - 120;
      return;
    }
    if (relAlong < 0) {
      const impulse = -relAlong * BALL_BLOB_RESTITUTION;
      this.ball.vx += nx * impulse;
      this.ball.vy += ny * impulse;
      this.ball.vx += blob.vx * 0.25;
      this.ball.vy += blob.vy * 0.15 - 50;
    }
  }

  private resolveBlobBlob(): void {
    for (let i = 0; i < this.blobs.length; i++) {
      for (let j = i + 1; j < this.blobs.length; j++) {
        const a = this.blobs[i];
        const b = this.blobs[j];
        const d = dist(a.x, a.y, b.x, b.y);
        const minD = BLOB_R * 2;
        if (d >= minD || d === 0) continue;
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        const overlap = (minD - d) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        const swap = BLOB_RESTITUTION * 0.5;
        const avn = a.vx * nx + a.vy * ny;
        const bvn = b.vx * nx + b.vy * ny;
        a.vx += (bvn - avn) * nx * swap;
        a.vy += (bvn - avn) * ny * swap;
        b.vx += (avn - bvn) * nx * swap;
        b.vy += (avn - bvn) * ny * swap;
      }
    }
  }

  private awardPoint(team: 0 | 1): void {
    this.scores[team] += 1;
    this.lastPointTeam = team;
    this.phase = "point";
    this.timer = POINT_PAUSE_MS;
    this.ctx.syncState();
  }

  private finish(): void {
    const winner = this.scores[0] >= POINTS_TO_WIN ? 0 : 1;
    const points: Record<string, number> = {};
    for (const blob of this.blobs) {
      points[blob.sessionId] = blob.team === winner ? WIN_POINTS : LOSE_POINTS;
    }
    this.phase = "ended";
    this.ctx.end(points);
  }
}

export const blobbyVolleyDefinition: GameDefinition = {
  meta: blobbyVolleyMeta,
  create: () => new BlobbyVolleyGame(),
};
