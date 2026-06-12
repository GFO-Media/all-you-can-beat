import type { GameContext, GameDefinition, MiniGame } from "@ayb/game-sdk";
import type { GameAction } from "@ayb/shared";
import { quickDrawMeta } from "./meta";
import type { QuickDrawPhase, QuickDrawState } from "./types";
import { WORDS } from "./words";

const INTRO_MS = 3000;
const DRAW_MS = 60_000;
const REVEAL_MS = 4000;
const GUESSER_POINTS = 100;
const DRAWER_POINTS = 50;
const MAX_STROKE_POINTS = 64;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

class QuickDrawGame implements MiniGame {
  private ctx!: GameContext;
  private phase: QuickDrawPhase = "intro";
  private timer = INTRO_MS;
  private round = 0;
  private totalRounds = 0;
  private drawOrder: string[] = [];
  private words: string[] = [];
  private word = "";
  private points = new Map<string, number>();
  private solvedBy: string | null = null;
  private lastBroadcastSecond = -1;

  init(ctx: GameContext): void {
    this.ctx = ctx;
    const players = ctx.players();
    this.drawOrder = shuffle(players.map((p) => p.sessionId));
    this.totalRounds = this.drawOrder.length;
    this.words = shuffle(WORDS);
    for (const p of players) this.points.set(p.sessionId, 0);
    this.ctx.syncState();
  }

  tick(deltaMs: number): void {
    this.timer -= deltaMs;

    if (this.phase === "drawing") {
      const second = Math.max(0, Math.ceil(this.timer / 1000));
      if (second !== this.lastBroadcastSecond) {
        this.lastBroadcastSecond = second;
        this.ctx.broadcastEvent({ type: "timer", timeLeft: second });
      }
    }

    if (this.timer > 0) return;

    if (this.phase === "intro") {
      this.startRound();
    } else if (this.phase === "drawing") {
      this.reveal(null);
    } else if (this.phase === "reveal") {
      if (this.round >= this.totalRounds) this.finish();
      else this.startRound();
    }
  }

  onPlayerAction(sessionId: string, action: GameAction): void {
    if (this.phase !== "drawing") return;

    if (action.type === "stroke" && sessionId === this.drawerId()) {
      const pts = this.sanitizePoints(action.pts);
      if (pts.length === 0) return;
      this.ctx.broadcastEvent({
        type: "stroke",
        id: String(action.id ?? ""),
        color: String(action.color ?? "#2B2350"),
        size: Math.min(24, Math.max(2, Number(action.size) || 6)),
        pts,
      });
    } else if (action.type === "clear" && sessionId === this.drawerId()) {
      this.ctx.broadcastEvent({ type: "clear" });
    } else if (action.type === "guess" && sessionId !== this.drawerId()) {
      this.handleGuess(sessionId, String(action.text ?? ""));
    }
  }

  getStateForPlayer(sessionId: string): QuickDrawState {
    const drawerId = this.drawerId();
    const isDrawer = sessionId === drawerId;
    const showWord = isDrawer || this.phase === "reveal";
    const players = this.ctx.players();
    const drawer = players.find((p) => p.sessionId === drawerId);
    const solver = this.solvedBy
      ? players.find((p) => p.sessionId === this.solvedBy)
      : null;

    return {
      phase: this.phase,
      round: this.round,
      totalRounds: this.totalRounds,
      drawerId,
      drawerName: drawer?.name ?? "???",
      word: showWord ? this.word : this.maskedWord(),
      isDrawer,
      timeLeft: Math.max(0, Math.ceil(this.timer / 1000)),
      scores: players
        .map((p) => ({
          sessionId: p.sessionId,
          name: p.name,
          color: p.color,
          avatar: p.avatar,
          points: this.points.get(p.sessionId) ?? 0,
        }))
        .sort((a, b) => b.points - a.points),
      solvedByName: solver?.name ?? null,
    };
  }

  private drawerId(): string {
    return this.drawOrder[this.round - 1] ?? this.drawOrder[0] ?? "";
  }

  private startRound(): void {
    this.round += 1;
    // Skip players who left since the order was drawn.
    while (
      this.round <= this.totalRounds &&
      !this.ctx.players().some((p) => p.sessionId === this.drawOrder[this.round - 1])
    ) {
      this.round += 1;
    }
    if (this.round > this.totalRounds) {
      this.finish();
      return;
    }

    this.word = this.words[(this.round - 1) % this.words.length];
    this.solvedBy = null;
    this.phase = "drawing";
    this.timer = DRAW_MS;
    this.lastBroadcastSecond = -1;
    this.ctx.broadcastEvent({ type: "clear" });
    this.ctx.syncState();
  }

  private handleGuess(sessionId: string, rawText: string): void {
    const text = rawText.trim().slice(0, 60);
    if (!text) return;
    const player = this.ctx.players().find((p) => p.sessionId === sessionId);
    if (!player) return;

    if (normalize(text) === normalize(this.word)) {
      this.points.set(sessionId, (this.points.get(sessionId) ?? 0) + GUESSER_POINTS);
      const drawerId = this.drawerId();
      this.points.set(drawerId, (this.points.get(drawerId) ?? 0) + DRAWER_POINTS);
      this.ctx.broadcastEvent({
        type: "chat",
        name: player.name,
        color: player.color,
        text: "guessed the word! 🎉",
        correct: true,
      });
      this.reveal(sessionId);
    } else {
      this.ctx.broadcastEvent({
        type: "chat",
        name: player.name,
        color: player.color,
        text,
        correct: false,
      });
    }
  }

  private reveal(solverId: string | null): void {
    this.phase = "reveal";
    this.timer = REVEAL_MS;
    this.solvedBy = solverId;
    this.ctx.syncState();
  }

  private finish(): void {
    this.ctx.end(Object.fromEntries(this.points));
  }

  private maskedWord(): string {
    return this.word
      .split("")
      .map((ch) => (ch === " " ? "\u00A0" : "_"))
      .join(" ");
  }

  private sanitizePoints(raw: unknown): [number, number][] {
    if (!Array.isArray(raw)) return [];
    const pts: [number, number][] = [];
    for (const item of raw.slice(0, MAX_STROKE_POINTS)) {
      if (!Array.isArray(item) || item.length < 2) continue;
      const x = Number(item[0]);
      const y = Number(item[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      pts.push([Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]);
    }
    return pts;
  }
}

export const quickDrawDefinition: GameDefinition = {
  meta: quickDrawMeta,
  create: () => new QuickDrawGame(),
};
