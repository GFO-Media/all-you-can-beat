# All You Can Beat

Multi-phone party games — every session needs **2 or more phones**. One device
creates a party, friends scan a QR code, and the group plays mini-games
together. Browser-first (PWA), no app store needed.

## How it works

- **Symmetric games** (e.g. Tap Sprint): every phone is its own game screen.
- **Host-display games** (e.g. Quick Draw): the host device (phone, laptop, or
  TV browser) shows the shared arena while the other phones act as controllers.
- The server is fully authoritative: phones only send actions, the
  [Colyseus](https://colyseus.io/) room decides what they mean.

## Quick start

```bash
npm install
npm run dev
```

This starts:

- the game server on `ws://localhost:2567`
- the web client on `http://localhost:5173` (also exposed on your LAN)

Open the printed **Network** URL (e.g. `http://192.168.1.23:5173`) on two or
more phones connected to the same Wi-Fi, create a party on one, and join with
the QR code or 6-letter code on the others.

> Windows note: the first run may trigger a firewall prompt for Node — allow
> access on private networks so phones can reach ports 5173 and 2567.

## Project structure

```
apps/
  client/          # React + Vite PWA (lobby, host + player routes, game views)
  server/          # Colyseus server with the PartyRoom
packages/
  shared/          # Types, constants, Zod message schemas
  game-sdk/        # MiniGame contract + GameRegistry every game implements
games/
  tap-sprint/      # Symmetric reflex game (server logic + metadata)
  quick-draw/      # Host-display drawing game (server logic + metadata)
```

## Adding a mini-game

1. Create `games/<id>/` with `meta.ts` (a `GameMeta`) and `server.ts`
   implementing the `MiniGame` interface from `@ayb/game-sdk`.
2. Register the definition in `apps/server/src/registry.ts`.
3. Add React views in `apps/client/src/games/<id>/` and register them in
   `apps/client/src/games/registry.tsx` (a `Player` view, plus an optional
   `Host` view for host-display games).
4. Add the meta to `apps/client/src/games/catalog.ts`.

## Useful scripts

| Command                          | What it does                          |
| -------------------------------- | ------------------------------------- |
| `npm run dev`                    | Server + client in watch mode         |
| `npm run dev:server`             | Server only (port 2567)               |
| `npm run dev:client`             | Client only (port 5173)               |
| `npm run build`                  | Production client build               |
| `npm run typecheck`              | Typecheck every workspace             |
| `npm run smoke -w apps/server`   | Headless 2-player game simulation     |

## Configuration

- `VITE_SERVER_URL` — override the WebSocket endpoint the client connects to
  (defaults to `ws://<page-hostname>:2567`).
- `PORT` — server port (defaults to `2567`).
