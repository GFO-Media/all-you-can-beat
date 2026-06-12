import type { GameMeta } from "@ayb/shared";

export const quickDrawMeta: GameMeta = {
  id: "quick-draw",
  displayName: "Quick Draw",
  tagline: "Doodle it before the clock runs out",
  emoji: "🎨",
  mode: "host-display",
  minPlayers: 2,
  maxPlayers: 12,
  howToPlay:
    "One player gets a secret word and draws it on their phone. Everyone else races to guess it in the chat. The host screen shows the masterpiece live. Everyone draws once!",
  available: true,
};
