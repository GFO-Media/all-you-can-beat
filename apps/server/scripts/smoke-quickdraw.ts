/**
 * Headless smoke test for Quick Draw: two clients, each draws once.
 * The drawer leaks the word in-process so the other bot can guess it.
 *
 * Usage: start the server, then `tsx scripts/smoke-quickdraw.ts`.
 */
import type { QuickDrawState } from "@ayb/quick-draw/types";
import { MSG, type RoomSnapshot } from "@ayb/shared";
import { Client, type Room } from "colyseus.js";

const ENDPOINT = process.env.AYB_ENDPOINT ?? "ws://localhost:2567";

function fail(message: string): never {
  console.error(`SMOKE FAIL: ${message}`);
  process.exit(1);
}

// Shared between both bots (same process) to simulate "seeing" the drawing.
const knownWord = { round: 0, word: "" };

function wireDrawBot(room: Room, label: string): void {
  let guessedRound = -1;
  let strokedRound = -1;

  room.onMessage(MSG.GameState, (state: QuickDrawState) => {
    if (state.phase !== "drawing") return;

    if (state.isDrawer) {
      knownWord.round = state.round;
      knownWord.word = state.word;
      if (strokedRound !== state.round) {
        strokedRound = state.round;
        room.send(MSG.GameAction, {
          type: "stroke",
          id: `s${state.round}`,
          color: "#2B2350",
          size: 6,
          pts: [
            [0.2, 0.2],
            [0.8, 0.8],
          ],
        });
      }
    } else if (guessedRound !== state.round) {
      guessedRound = state.round;
      // Wrong guess first, then the right one once the drawer "drew" it.
      room.send(MSG.GameAction, { type: "guess", text: "definitely wrong" });
      const tryCorrect = () => {
        if (knownWord.round === state.round && knownWord.word) {
          room.send(MSG.GameAction, { type: "guess", text: knownWord.word });
        } else {
          setTimeout(tryCorrect, 200);
        }
      };
      setTimeout(tryCorrect, 400);
    }
  });
  room.onMessage(MSG.GameEvent, (event: { type: string }) => {
    if (event.type === "chat") console.log(`[${label}] chat:`, JSON.stringify(event));
  });
  room.onMessage(MSG.RoomState, () => {});
}

async function main(): Promise<void> {
  const hostClient = new Client(ENDPOINT);
  const guestClient = new Client(ENDPOINT);

  const hostRoom = await hostClient.create("party", { name: "Hosty" });
  console.log(`created party ${hostRoom.roomId}`);
  wireDrawBot(hostRoom, "host");
  hostRoom.send(MSG.ClientReady);

  const guestRoom = await guestClient.joinById(hostRoom.roomId, { name: "Guest" });
  wireDrawBot(guestRoom, "guest");
  guestRoom.send(MSG.ClientReady);

  const results = new Promise<RoomSnapshot>((resolve) => {
    hostRoom.onMessage(MSG.RoomState, (snap: RoomSnapshot) => {
      if (snap.phase === "results") resolve(snap);
    });
  });

  await new Promise((r) => setTimeout(r, 500));
  hostRoom.send(MSG.SelectGame, { gameId: "quick-draw" });
  hostRoom.send(MSG.StartGame);
  console.log("started quick-draw, 2 rounds (each player draws once)...");

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timed out waiting for results")), 90_000),
  );
  const snap = await Promise.race([results, timeout]).catch((e) => fail(String(e)));

  if (!snap.lastResults || snap.lastResults.length !== 2) {
    fail(`expected 2 result entries, got ${JSON.stringify(snap.lastResults)}`);
  }
  // Both players guessed correctly once and drew once: 100 + 50 each.
  for (const r of snap.lastResults) {
    if (r.points !== 150) fail(`expected 150 points for ${r.name}, got ${r.points}`);
  }

  console.log("results:", snap.lastResults.map((r) => `${r.name}=${r.points}`).join(", "));
  console.log("SMOKE PASS");

  await hostRoom.leave();
  await guestRoom.leave();
  process.exit(0);
}

main().catch((e) => fail(String(e)));
