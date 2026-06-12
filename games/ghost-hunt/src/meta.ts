import type { GameMeta } from "@ayb/shared";

export const ghostHuntMeta: GameMeta = {
  id: "ghost-hunt",
  displayName: "Ghost Host",
  tagline: "Haunt the mansion!",
  emoji: "👻",
  mode: "hybrid",
  minPlayers: 3,
  maxPlayers: 8,
  howToPlay:
    "Ghost sees the full radar on their phone. Hunters hold 🔦 to shine a directional beam — aim by moving! Light drains the ghost's HP and revives fallen teammates. Batteries recharge your lamp. Survive 5 minutes or bust the ghost!",
  available: true,
};
