/**
 * Headless smoke test: two clients play Blobby Volley until someone scores 5 points.
 */
import type { BlobbyVolleyState } from "@ayb/blobby-volley/types";
import { MSG, type RoomSnapshot } from "@ayb/shared";
import { Client, type Room } from "colyseus.js";

const ENDPOINT = process.env.AYB_ENDPOINT ?? "ws://localhost:2567";

function fail(message: string): never {
  console.error(`SMOKE FAIL: ${message}`);
  process.exit(1);
}

function wireVolleyBot(room: Room, label: string, bias: "left" | "right"): void {
  let jumpTimer = 0;
  room.onMessage(MSG.GameState, (state: BlobbyVolleyState) => {
    if (state.phase !== "playing") return;
    jumpTimer += 1;
    room.send(MSG.GameAction, {
      type: "input",
      left: bias === "left",
      right: bias === "right",
    });
    if (jumpTimer % 8 === 0) {
      room.send(MSG.GameAction, { type: "jump" });
    }
  });
  room.onMessage(MSG.RoomState, (snap: RoomSnapshot) => {
    if (snap.phase === "playing") {
      console.log(`[${label}] playing scores=${JSON.stringify(snap)}`);
    }
  });
}

async function main(): Promise<void> {
  const hostClient = new Client(ENDPOINT);
  const guestClient = new Client(ENDPOINT);

  const hostRoom = await hostClient.create("party", { name: "Pink" });
  console.log(`created party ${hostRoom.roomId}`);
  wireVolleyBot(hostRoom, "pink", "left");
  hostRoom.send(MSG.ClientReady);

  const guestRoom = await guestClient.joinById(hostRoom.roomId, { name: "Green" });
  wireVolleyBot(guestRoom, "green", "right");
  guestRoom.send(MSG.ClientReady);

  const results = new Promise<RoomSnapshot>((resolve) => {
    hostRoom.onMessage(MSG.RoomState, (snap: RoomSnapshot) => {
      if (snap.phase === "results") resolve(snap);
    });
  });

  await new Promise((r) => setTimeout(r, 500));
  hostRoom.send(MSG.SelectGame, { gameId: "blobby-volley" });
  hostRoom.send(MSG.StartGame);
  console.log("started blobby-volley…");

  const snap = await Promise.race([
    results,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timed out")), 120_000),
    ),
  ]).catch((e) => fail(String(e)));

  if (!snap.lastResults || snap.lastResults.length !== 2) {
    fail(`expected 2 results, got ${JSON.stringify(snap.lastResults)}`);
  }
  const winner = snap.lastResults.find((r) => r.points === 100);
  const loser = snap.lastResults.find((r) => r.points === 35);
  if (!winner || !loser) {
    fail(`unexpected points: ${JSON.stringify(snap.lastResults)}`);
  }

  console.log("results:", snap.lastResults.map((r) => `${r.name}=${r.points}`).join(", "));
  console.log("SMOKE PASS");

  await hostRoom.leave();
  await guestRoom.leave();
  process.exit(0);
}

main().catch((e) => fail(String(e)));
