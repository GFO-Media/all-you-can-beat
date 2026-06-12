/**
 * Headless smoke test: boots two clients against a running server,
 * creates a party, plays a full game of Tap Sprint, and checks results.
 *
 * Usage: start the server, then `npm run smoke -w apps/server`.
 */
import { MSG, type RoomSnapshot } from "@ayb/shared";
import type { TapSprintState } from "@ayb/tap-sprint/types";
import { Client, type Room } from "colyseus.js";

const ENDPOINT = process.env.AYB_ENDPOINT ?? "ws://localhost:2567";

function fail(message: string): never {
  console.error(`SMOKE FAIL: ${message}`);
  process.exit(1);
}

function wireTapBot(room: Room, label: string): void {
  let tappedForRound = -1;
  room.onMessage(MSG.GameState, (state: TapSprintState) => {
    if (state.phase === "go" && tappedForRound !== state.round && !state.you.tapped) {
      tappedForRound = state.round;
      setTimeout(() => room.send(MSG.GameAction, { type: "tap" }), 30 + Math.random() * 120);
    }
  });
  room.onMessage(MSG.GameEvent, () => {});
  room.onMessage(MSG.RoomState, (snap: RoomSnapshot) => {
    console.log(`[${label}] phase=${snap.phase} players=${snap.players.length}`);
  });
}

async function main(): Promise<void> {
  const hostClient = new Client(ENDPOINT);
  const playerClient = new Client(ENDPOINT);

  const hostRoom = await hostClient.create("party", { name: "Hosty" });
  console.log(`created party ${hostRoom.roomId}`);
  if (!/^[A-Z0-9]{6}$/.test(hostRoom.roomId)) fail(`unexpected room code: ${hostRoom.roomId}`);

  wireTapBot(hostRoom, "host");
  hostRoom.send(MSG.ClientReady);

  const playerRoom = await playerClient.joinById(hostRoom.roomId, { name: "Guest" });
  wireTapBot(playerRoom, "guest");
  playerRoom.send(MSG.ClientReady);

  const results = new Promise<RoomSnapshot>((resolve) => {
    hostRoom.onMessage(MSG.RoomState, (snap: RoomSnapshot) => {
      if (snap.phase === "results") resolve(snap);
    });
  });

  // Give the join broadcast a moment, then start Tap Sprint.
  await new Promise((r) => setTimeout(r, 500));
  hostRoom.send(MSG.SelectGame, { gameId: "tap-sprint" });
  hostRoom.send(MSG.StartGame);
  console.log("started tap-sprint, playing 3 rounds...");

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timed out waiting for results")), 60_000),
  );
  const snap = await Promise.race([results, timeout]).catch((e) => fail(String(e)));

  if (!snap.lastResults || snap.lastResults.length !== 2) {
    fail(`expected 2 result entries, got ${JSON.stringify(snap.lastResults)}`);
  }
  const totalPoints = snap.lastResults.reduce((sum, r) => sum + r.points, 0);
  if (totalPoints <= 0) fail("no points were scored");

  console.log("results:", snap.lastResults.map((r) => `${r.name}=${r.points}`).join(", "));
  console.log("SMOKE PASS");

  await hostRoom.leave();
  await playerRoom.leave();
  process.exit(0);
}

main().catch((e) => fail(String(e)));
