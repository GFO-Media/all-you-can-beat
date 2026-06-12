import { blobbyVolleyMeta } from "@ayb/blobby-volley/meta";
import { ghostHuntMeta } from "@ayb/ghost-hunt/meta";
import { quickDrawMeta } from "@ayb/quick-draw/meta";
import type { GameMeta } from "@ayb/shared";
import { tapSprintMeta } from "@ayb/tap-sprint/meta";

const COMING_SOON: GameMeta[] = [
  {
    id: "chess",
    displayName: "Chess",
    tagline: "Brains over thumbs",
    emoji: "♟️",
    mode: "symmetric",
    minPlayers: 2,
    maxPlayers: 2,
    howToPlay: "Classic chess, one board per phone.",
    available: false,
  },
];

export const ALL_GAMES: GameMeta[] = [
  tapSprintMeta,
  quickDrawMeta,
  blobbyVolleyMeta,
  ghostHuntMeta,
  ...COMING_SOON,
];

export function gameMetaById(id: string): GameMeta | undefined {
  return ALL_GAMES.find((g) => g.id === id);
}
