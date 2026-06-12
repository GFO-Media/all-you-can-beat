import { z } from "zod";

// ---------------------------------------------------------------------------
// Game metadata
// ---------------------------------------------------------------------------

export type GameMode = "host-display" | "symmetric" | "hybrid";

export interface GameMeta {
  id: string;
  displayName: string;
  tagline: string;
  emoji: string;
  mode: GameMode;
  minPlayers: number;
  maxPlayers: number;
  howToPlay: string;
  available: boolean;
}

// ---------------------------------------------------------------------------
// Room / lobby model
// ---------------------------------------------------------------------------

export type RoomPhase = "lobby" | "playing" | "results";

export interface PlayerInfo {
  sessionId: string;
  name: string;
  color: string;
  avatar: number;
  isHost: boolean;
  connected: boolean;
  /** Cumulative score across all mini-games this session ("party marathon"). */
  score: number;
}

export interface ResultEntry {
  sessionId: string;
  name: string;
  color: string;
  avatar: number;
  /** Points earned in the game that just ended. */
  points: number;
  /** Session total after applying `points`. */
  total: number;
}

export interface RoomSnapshot {
  code: string;
  phase: RoomPhase;
  selectedGameId: string;
  players: PlayerInfo[];
  lastResults: ResultEntry[] | null;
  lastGameId: string | null;
}

/** Every party needs at least this many connected phones. */
export const MIN_PHONES = 2;
export const MAX_PLAYERS = 12;

export const PLAYER_COLORS = [
  "#FF5BA6",
  "#46B5FF",
  "#FFC93C",
  "#3DDC84",
  "#9B5BFF",
  "#FF7A45",
  "#2BD9D9",
  "#F8567B",
  "#7AC70C",
  "#5B8DEF",
  "#FFB02E",
  "#B26BFF",
] as const;

export const AVATAR_VARIANTS = 4;

// ---------------------------------------------------------------------------
// Network protocol (message names + payload schemas)
// ---------------------------------------------------------------------------

export const MSG = {
  /** server -> clients: full lobby snapshot */
  RoomState: "room:state",
  /** server -> one client: per-player game state */
  GameState: "game:state",
  /** server -> clients: transient game event (strokes, chat, timers, ...) */
  GameEvent: "game:event",
  /** client -> server: handlers attached, please (re)send state */
  ClientReady: "client:ready",
  /** host -> server */
  SelectGame: "lobby:selectGame",
  StartGame: "lobby:start",
  ReturnToLobby: "lobby:return",
  /** player -> server: forwarded to the running mini-game */
  GameAction: "game:action",
} as const;

export const nameSchema = z.string().trim().min(1).max(16);

export const selectGameSchema = z.object({
  gameId: z.string().min(1).max(40),
});

export const gameActionSchema = z
  .object({ type: z.string().min(1).max(40) })
  .passthrough();

export type GameAction = z.infer<typeof gameActionSchema>;
