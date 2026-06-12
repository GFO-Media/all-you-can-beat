import type { GameContext, GameDefinition, MiniGame } from "@ayb/game-sdk";
import {
  MAX_PLAYERS,
  MIN_PHONES,
  MSG,
  PLAYER_COLORS,
  AVATAR_VARIANTS,
  gameActionSchema,
  nameSchema,
  selectGameSchema,
  type PlayerInfo,
  type ResultEntry,
  type RoomPhase,
  type RoomSnapshot,
} from "@ayb/shared";
import { Room, type Client } from "colyseus";
import { registry } from "../registry";

const ROOM_CODES_CHANNEL = "$ayb:roomcodes";
// No 0/O/1/I/L to keep codes easy to type from a friend's screen.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const RECONNECT_GRACE_SECONDS = 120;

export class PartyRoom extends Room {
  maxClients = MAX_PLAYERS;

  private players = new Map<string, PlayerInfo>();
  private phase: RoomPhase = "lobby";
  private selectedGameId = "tap-sprint";
  private lastResults: ResultEntry[] | null = null;
  private lastGameId: string | null = null;
  private game: MiniGame | null = null;
  private gameDef: GameDefinition | null = null;

  async onCreate(): Promise<void> {
    this.roomId = await this.generateRoomCode();
    this.setSimulationInterval((deltaMs) => this.game?.tick(deltaMs), 50);

    this.onMessage(MSG.ClientReady, (client) => {
      client.send(MSG.RoomState, this.snapshot());
      if (this.phase === "playing" && this.game) {
        client.send(MSG.GameState, this.game.getStateForPlayer(client.sessionId));
      }
    });

    this.onMessage(MSG.SelectGame, (client, payload) => {
      if (!this.isHost(client) || this.phase !== "lobby") return;
      const parsed = selectGameSchema.safeParse(payload);
      if (!parsed.success) return;
      const def = registry.get(parsed.data.gameId);
      if (!def || !def.meta.available) return;
      this.selectedGameId = def.meta.id;
      this.broadcastRoomState();
    });

    this.onMessage(MSG.StartGame, (client) => {
      if (!this.isHost(client) || this.phase !== "lobby") return;
      this.startGame();
    });

    this.onMessage(MSG.ReturnToLobby, (client) => {
      if (!this.isHost(client) || this.phase !== "results") return;
      this.phase = "lobby";
      this.unlock();
      this.broadcastRoomState();
    });

    this.onMessage(MSG.GameAction, (client, payload) => {
      if (this.phase !== "playing" || !this.game) return;
      const parsed = gameActionSchema.safeParse(payload);
      if (!parsed.success) return;
      this.game.onPlayerAction(client.sessionId, parsed.data);
    });
  }

  onJoin(client: Client, options: { name?: unknown } = {}): void {
    const parsedName = nameSchema.safeParse(options.name);
    const name = parsedName.success ? parsedName.data : `Player ${this.players.size + 1}`;
    const usedColors = new Set([...this.players.values()].map((p) => p.color));
    const color =
      PLAYER_COLORS.find((c) => !usedColors.has(c)) ??
      PLAYER_COLORS[this.players.size % PLAYER_COLORS.length];

    this.players.set(client.sessionId, {
      sessionId: client.sessionId,
      name,
      color,
      avatar: this.players.size % AVATAR_VARIANTS,
      isHost: this.players.size === 0,
      connected: true,
      score: 0,
    });
    this.broadcastRoomState();
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const player = this.players.get(client.sessionId);
    if (!player) return;

    player.connected = false;
    this.broadcastRoomState();

    if (!consented) {
      try {
        await this.allowReconnection(client, RECONNECT_GRACE_SECONDS);
        player.connected = true;
        this.broadcastRoomState();
        client.send(MSG.RoomState, this.snapshot());
        if (this.phase === "playing" && this.game) {
          client.send(MSG.GameState, this.game.getStateForPlayer(client.sessionId));
        }
        return;
      } catch {
        // Player never came back; fall through and remove them.
      }
    }

    this.players.delete(client.sessionId);
    if (player.isHost) {
      const next = this.players.values().next().value as PlayerInfo | undefined;
      if (next) next.isHost = true;
    }
    this.broadcastRoomState();
  }

  async onDispose(): Promise<void> {
    await this.presence.srem(ROOM_CODES_CHANNEL, this.roomId);
  }

  // -------------------------------------------------------------------------

  private startGame(): void {
    const def = registry.get(this.selectedGameId);
    if (!def) return;

    const connectedCount = this.connectedPlayers().length;
    if (connectedCount < Math.max(MIN_PHONES, def.meta.minPlayers)) return;
    if (connectedCount > def.meta.maxPlayers) return;

    const ctx: GameContext = {
      players: () => this.connectedPlayers(),
      broadcastEvent: (event) => this.broadcast(MSG.GameEvent, event),
      sendEventTo: (sessionId, event) =>
        this.clientBySession(sessionId)?.send(MSG.GameEvent, event),
      syncState: () => {
        if (!this.game) return;
        for (const client of this.clients) {
          client.send(MSG.GameState, this.game.getStateForPlayer(client.sessionId));
        }
      },
      end: (pointsBySession) => this.endGame(pointsBySession),
    };

    this.gameDef = def;
    this.game = def.create();
    this.phase = "playing";
    this.lock();
    this.broadcastRoomState();
    this.game.init(ctx);
  }

  private endGame(pointsBySession: Record<string, number>): void {
    const results: ResultEntry[] = [];
    for (const player of this.players.values()) {
      const points = pointsBySession[player.sessionId] ?? 0;
      player.score += points;
      results.push({
        sessionId: player.sessionId,
        name: player.name,
        color: player.color,
        avatar: player.avatar,
        points,
        total: player.score,
      });
    }
    results.sort((a, b) => b.points - a.points);

    this.lastResults = results;
    this.lastGameId = this.gameDef?.meta.id ?? null;
    this.game?.dispose?.();
    this.game = null;
    this.gameDef = null;
    this.phase = "results";
    this.broadcastRoomState();
  }

  private isHost(client: Client): boolean {
    return this.players.get(client.sessionId)?.isHost === true;
  }

  private connectedPlayers(): PlayerInfo[] {
    return [...this.players.values()].filter((p) => p.connected);
  }

  private clientBySession(sessionId: string): Client | undefined {
    return this.clients.find((c) => c.sessionId === sessionId);
  }

  private broadcastRoomState(): void {
    this.broadcast(MSG.RoomState, this.snapshot());
  }

  private snapshot(): RoomSnapshot {
    return {
      code: this.roomId,
      phase: this.phase,
      selectedGameId: this.selectedGameId,
      players: [...this.players.values()],
      lastResults: this.lastResults,
      lastGameId: this.lastGameId,
    };
  }

  private async generateRoomCode(): Promise<string> {
    const existing = await this.presence.smembers(ROOM_CODES_CHANNEL);
    let code: string;
    do {
      code = Array.from(
        { length: CODE_LENGTH },
        () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
      ).join("");
    } while (existing.includes(code));
    await this.presence.sadd(ROOM_CODES_CHANNEL, code);
    return code;
  }
}
