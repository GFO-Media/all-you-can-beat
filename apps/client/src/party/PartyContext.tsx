import { MSG, type PlayerInfo, type RoomSnapshot } from "@ayb/shared";
import { Client, type Room } from "colyseus.js";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { serverEndpoint } from "../net/endpoint";

export type GameEvent = { type: string } & Record<string, unknown>;
type EventListener = (event: GameEvent) => void;

interface PartyContextValue {
  room: Room | null;
  snapshot: RoomSnapshot | null;
  gameState: unknown;
  me: PlayerInfo | null;
  createParty(name: string): Promise<string>;
  joinParty(code: string, name: string): Promise<string>;
  tryReconnect(code: string): Promise<boolean>;
  leave(): void;
  send(type: string, payload?: unknown): void;
  sendAction(action: Record<string, unknown>): void;
  subscribeToEvents(listener: EventListener): () => void;
}

const PartyContext = createContext<PartyContextValue | null>(null);

const client = new Client(serverEndpoint());

function tokenKey(code: string): string {
  return `ayb:token:${code.toUpperCase()}`;
}

export function PartyProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [gameState, setGameState] = useState<unknown>(null);
  const listenersRef = useRef(new Set<EventListener>());
  const roomRef = useRef<Room | null>(null);

  const attach = useCallback((nextRoom: Room) => {
    roomRef.current = nextRoom;

    nextRoom.onMessage(MSG.RoomState, (state: RoomSnapshot) => {
      setSnapshot(state);
      if (state.phase !== "playing") setGameState(null);
    });
    nextRoom.onMessage(MSG.GameState, (state: unknown) => {
      setGameState(state);
    });
    nextRoom.onMessage(MSG.GameEvent, (event: GameEvent) => {
      for (const listener of listenersRef.current) listener(event);
    });
    nextRoom.onLeave(() => {
      if (roomRef.current === nextRoom) {
        roomRef.current = null;
        setRoom(null);
        setSnapshot(null);
        setGameState(null);
      }
    });

    sessionStorage.setItem(tokenKey(nextRoom.roomId), nextRoom.reconnectionToken);
    setRoom(nextRoom);
    setSnapshot(null);
    setGameState(null);
    // Handlers are attached now; ask the server for the current state.
    nextRoom.send(MSG.ClientReady);
  }, []);

  const createParty = useCallback(
    async (name: string) => {
      const nextRoom = await client.create("party", { name });
      attach(nextRoom);
      return nextRoom.roomId;
    },
    [attach],
  );

  const joinParty = useCallback(
    async (code: string, name: string) => {
      const nextRoom = await client.joinById(code.toUpperCase(), { name });
      attach(nextRoom);
      return nextRoom.roomId;
    },
    [attach],
  );

  const tryReconnect = useCallback(
    async (code: string) => {
      const token = sessionStorage.getItem(tokenKey(code));
      if (!token) return false;
      try {
        const nextRoom = await client.reconnect(token);
        attach(nextRoom);
        return true;
      } catch {
        sessionStorage.removeItem(tokenKey(code));
        return false;
      }
    },
    [attach],
  );

  const leave = useCallback(() => {
    void roomRef.current?.leave(true);
  }, []);

  const send = useCallback((type: string, payload?: unknown) => {
    roomRef.current?.send(type, payload);
  }, []);

  const sendAction = useCallback((action: Record<string, unknown>) => {
    roomRef.current?.send(MSG.GameAction, action);
  }, []);

  const subscribeToEvents = useCallback((listener: EventListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const me = useMemo(() => {
    if (!room || !snapshot) return null;
    return snapshot.players.find((p) => p.sessionId === room.sessionId) ?? null;
  }, [room, snapshot]);

  const value = useMemo(
    () => ({
      room,
      snapshot,
      gameState,
      me,
      createParty,
      joinParty,
      tryReconnect,
      leave,
      send,
      sendAction,
      subscribeToEvents,
    }),
    [
      room,
      snapshot,
      gameState,
      me,
      createParty,
      joinParty,
      tryReconnect,
      leave,
      send,
      sendAction,
      subscribeToEvents,
    ],
  );

  return <PartyContext.Provider value={value}>{children}</PartyContext.Provider>;
}

export function useParty(): PartyContextValue {
  const ctx = useContext(PartyContext);
  if (!ctx) throw new Error("useParty must be used inside <PartyProvider>");
  return ctx;
}
