import { GameRegistry } from "@ayb/game-sdk";
import { blobbyVolleyDefinition } from "@ayb/blobby-volley";
import { ghostHuntDefinition } from "@ayb/ghost-hunt";
import { quickDrawDefinition } from "@ayb/quick-draw";
import { tapSprintDefinition } from "@ayb/tap-sprint";

export const registry = new GameRegistry();

registry.register(tapSprintDefinition);
registry.register(quickDrawDefinition);
registry.register(blobbyVolleyDefinition);
registry.register(ghostHuntDefinition);
