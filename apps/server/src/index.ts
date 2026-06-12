import http from "node:http";
import os from "node:os";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import cors from "cors";
import express from "express";
import { PartyRoom } from "./rooms/PartyRoom";

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

gameServer.define("party", PartyRoom);

void gameServer.listen(PORT).then(() => {
  console.log(`[ayb] game server ready on port ${PORT}`);
  const publicUrl = process.env.RENDER_EXTERNAL_URL;
  if (publicUrl) {
    const host = new URL(publicUrl).host;
    console.log(`[ayb] public endpoint:    wss://${host}`);
    console.log(`[ayb] health check:       ${publicUrl}/health`);
  } else {
    console.log(`[ayb] local:              ws://localhost:${PORT}`);
    const nets = os.networkInterfaces();
    for (const interfaces of Object.values(nets)) {
      for (const net of interfaces ?? []) {
        if (net.family === "IPv4" && !net.internal) {
          console.log(`[ayb] LAN:                ws://${net.address}:${PORT}`);
        }
      }
    }
  }
});
