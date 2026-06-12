import type { PlayerInfo, RoomSnapshot } from "@ayb/shared";
import type { ComponentType } from "react";
import type { GameEvent } from "../party/PartyContext";
import { BlobbyVolleyHostView, BlobbyVolleyPlayerView } from "./blobby-volley/BlobbyVolleyViews";
import { GhostHuntHostView, GhostHuntPlayerView } from "./ghost-hunt/GhostHuntViews";
import { QuickDrawHostView, QuickDrawPlayerView } from "./quick-draw/QuickDrawViews";
import { TapSprintView } from "./tap-sprint/TapSprintView";

export interface GameViewProps {
  snapshot: RoomSnapshot;
  state: unknown;
  me: PlayerInfo;
  sendAction(action: Record<string, unknown>): void;
  subscribeToEvents(listener: (event: GameEvent) => void): () => void;
  /** True when rendered on the /host route (the big shared screen). */
  isHostView: boolean;
}

interface GameViews {
  Player: ComponentType<GameViewProps>;
  /** Big-screen variant for host-display games; falls back to Player. */
  Host?: ComponentType<GameViewProps>;
}

export const GAME_VIEWS: Record<string, GameViews> = {
  "tap-sprint": { Player: TapSprintView },
  "quick-draw": { Player: QuickDrawPlayerView, Host: QuickDrawHostView },
  "blobby-volley": { Player: BlobbyVolleyPlayerView, Host: BlobbyVolleyHostView },
  "ghost-hunt": { Player: GhostHuntPlayerView, Host: GhostHuntHostView },
};
