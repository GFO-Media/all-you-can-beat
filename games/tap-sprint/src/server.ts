import type { GameContext, GameDefinition, MiniGame } from "@ayb/game-sdk";
import type { GameAction } from "@ayb/shared";
import { tapSprintMeta } from "./meta";
import type { TapSprintPhase, TapSprintState } from "./types";

const TOTAL_ROUNDS = 3;
const INTRO_MS = 3000;
const GO_WINDOW_MS = 2500;
const ROUND_RESULTS_MS = 3500;
const MIN_WAIT_MS = 1500;
const EXTRA_WAIT_MS = 2500;
const ROUND_POINTS = [100, 60, 40];
const PARTICIPATION_POINTS = 20;

interface RoundEntry {
  reaction: number | null;
  falseStart: boolean;
  points: number;
}

class TapSprintGame implements MiniGame {
  private ctx!: GameContext;
  private phase: TapSprintPhase = "intro";
  private timer = INTRO_MS;
  private round = 0;
  private goAt = 0;
  private current = new Map<string, RoundEntry>();
  private totals = new Map<string, number>();

  init(ctx: GameContext): void {
    this.ctx = ctx;
    for (const p of ctx.players()) this.totals.set(p.sessionId, 0);
    this.ctx.syncState();
  }

  tick(deltaMs: number): void {
    this.timer -= deltaMs;
    if (this.timer > 0) return;

    switch (this.phase) {
      case "intro":
        this.startRound();
        break;
      case "ready":
        this.phase = "go";
        this.goAt = Date.now();
        this.timer = GO_WINDOW_MS;
        this.ctx.syncState();
        break;
      case "go":
        this.endRound();
        break;
      case "round-results":
        if (this.round >= TOTAL_ROUNDS) this.finish();
        else this.startRound();
        break;
    }
  }

  onPlayerAction(sessionId: string, action: GameAction): void {
    if (action.type !== "tap") return;
    const entry = this.current.get(sessionId);
    if (!entry) return;

    if (this.phase === "ready" && !entry.falseStart) {
      entry.falseStart = true;
      this.ctx.syncState();
    } else if (this.phase === "go" && !entry.falseStart && entry.reaction === null) {
      entry.reaction = Date.now() - this.goAt;
      const everyoneDone = [...this.current.values()].every(
        (e) => e.falseStart || e.reaction !== null,
      );
      if (everyoneDone) this.endRound();
      else this.ctx.syncState();
    }
  }

  getStateForPlayer(sessionId: string): TapSprintState {
    const players = this.ctx.players().map((p) => {
      const e = this.current.get(p.sessionId);
      return {
        sessionId: p.sessionId,
        name: p.name,
        color: p.color,
        avatar: p.avatar,
        reaction: e?.reaction ?? null,
        falseStart: e?.falseStart ?? false,
        roundPoints: e?.points ?? 0,
        totalPoints: this.totals.get(p.sessionId) ?? 0,
      };
    });
    const mine = this.current.get(sessionId);
    return {
      phase: this.phase,
      round: this.round,
      totalRounds: TOTAL_ROUNDS,
      players,
      you: {
        tapped: (mine?.reaction ?? null) !== null,
        falseStart: mine?.falseStart ?? false,
        reaction: mine?.reaction ?? null,
      },
    };
  }

  private startRound(): void {
    this.round += 1;
    this.current = new Map();
    for (const p of this.ctx.players()) {
      this.current.set(p.sessionId, { reaction: null, falseStart: false, points: 0 });
      if (!this.totals.has(p.sessionId)) this.totals.set(p.sessionId, 0);
    }
    this.phase = "ready";
    this.timer = MIN_WAIT_MS + Math.random() * EXTRA_WAIT_MS;
    this.ctx.syncState();
  }

  private endRound(): void {
    if (this.phase !== "go") return;
    this.phase = "round-results";
    this.timer = ROUND_RESULTS_MS;

    const ranked = [...this.current.entries()]
      .filter(([, e]) => e.reaction !== null)
      .sort((a, b) => a[1].reaction! - b[1].reaction!);
    ranked.forEach(([sessionId, entry], index) => {
      entry.points = ROUND_POINTS[index] ?? PARTICIPATION_POINTS;
      this.totals.set(sessionId, (this.totals.get(sessionId) ?? 0) + entry.points);
    });
    this.ctx.syncState();
  }

  private finish(): void {
    this.ctx.end(Object.fromEntries(this.totals));
  }
}

export const tapSprintDefinition: GameDefinition = {
  meta: tapSprintMeta,
  create: () => new TapSprintGame(),
};
