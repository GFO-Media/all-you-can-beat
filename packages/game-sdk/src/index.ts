import type { GameAction, GameMeta, PlayerInfo } from "@ayb/shared";

/**
 * Everything a running mini-game may do to talk to the room.
 * The room owns the transport; games never touch sockets directly.
 */
export interface GameContext {
  /** Currently connected players (the host device counts as a player). */
  players(): PlayerInfo[];
  /** Fire-and-forget event to every client (strokes, chat, timers, ...). */
  broadcastEvent(event: Record<string, unknown>): void;
  /** Fire-and-forget event to a single client. */
  sendEventTo(sessionId: string, event: Record<string, unknown>): void;
  /**
   * Push `getStateForPlayer(sessionId)` to every connected client.
   * Call after every meaningful state transition.
   */
  syncState(): void;
  /** Finish the game. Points are added to each player's session total. */
  end(pointsBySession: Record<string, number>): void;
}

/**
 * The contract every mini-game implements. Server-authoritative:
 * clients only ever send actions, the game decides what they mean.
 */
export interface MiniGame {
  init(ctx: GameContext): void;
  onPlayerAction(sessionId: string, action: GameAction): void;
  /** Driven by the room's simulation interval (~50ms). */
  tick(deltaMs: number): void;
  /** Per-player view of the state; hide secret info (roles, words) here. */
  getStateForPlayer(sessionId: string): unknown;
  dispose?(): void;
}

export interface GameDefinition {
  meta: GameMeta;
  create(): MiniGame;
}

export class GameRegistry {
  private games = new Map<string, GameDefinition>();

  register(def: GameDefinition): void {
    this.games.set(def.meta.id, def);
  }

  get(id: string): GameDefinition | undefined {
    return this.games.get(id);
  }

  list(): GameDefinition[] {
    return [...this.games.values()];
  }
}
