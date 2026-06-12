import { MIN_PHONES, MSG, type RoomSnapshot } from "@ayb/shared";
import { QRCodeSVG } from "qrcode.react";
import { BlobAvatar } from "../components/BlobAvatar";
import { MascotStage } from "../components/MascotStage";
import { TopBar } from "../components/TopBar";
import { ALL_GAMES, gameMetaById } from "../games/catalog";
import { useParty } from "../party/PartyContext";

interface LobbyProps {
  snapshot: RoomSnapshot;
  isHostView: boolean;
}

export function Lobby({ snapshot, isHostView }: LobbyProps) {
  const { me, send } = useParty();
  const isHost = me?.isHost ?? false;
  const selected = gameMetaById(snapshot.selectedGameId);
  const connected = snapshot.players.filter((p) => p.connected);
  const joinUrl = `${location.origin}/play/${snapshot.code}`;

  const needed = Math.max(MIN_PHONES, selected?.minPlayers ?? MIN_PHONES);
  const missing = Math.max(0, needed - connected.length);
  const tooMany = selected ? connected.length > selected.maxPlayers : false;
  const canStart = isHost && missing === 0 && !tooMany && !!selected?.available;
  const hostName = snapshot.players.find((p) => p.isHost)?.name ?? "the host";
  const hostPlayer = snapshot.players.find((p) => p.isHost);

  return (
    <div className="screen">
      <TopBar badge="Party room" />

      <div className="lobby-stage">
        <MascotStage
          color={hostPlayer?.color ?? me?.color ?? "#FF5BA6"}
          variant={hostPlayer?.avatar ?? me?.avatar ?? 0}
          size={88}
        />
        <span className="lobby-stage__label">Room code</span>
        <div className="code-badge">{snapshot.code}</div>
      </div>

      {isHostView && (
        <div className="qr-panel stack--wide">
          <div className="qr-frame">
            <QRCodeSVG value={joinUrl} size={140} marginSize={1} level="M" />
          </div>
          <p className="qr-caption">
            Scan to join on <strong>{location.host}</strong>
            <br />
            or type the code on another phone
          </p>
        </div>
      )}

      <div className="stack stack--wide">
        <div className="card">
          <div className="section-head">
            <h3>Players</h3>
            <span className="section-head__meta">
              {connected.length} / {selected?.maxPlayers ?? 12}
            </span>
          </div>
          <div className="player-grid">
            {snapshot.players.map((p) => (
              <div
                key={p.sessionId}
                className={`player-chip${p.connected ? "" : " player-chip--away"}`}
              >
                <div className="player-chip__avatar">
                  <BlobAvatar color={p.color} variant={p.avatar} size={40} />
                </div>
                <div className="player-chip__info">
                  <span className="player-chip__name">
                    {p.isHost && <span className="crown">👑 </span>}
                    {p.name}
                    {p.sessionId === me?.sessionId ? " · you" : ""}
                  </span>
                  {p.isHost && <span className="player-chip__tag">Host</span>}
                </div>
                {p.score > 0 && <span className="player-chip__score">{p.score}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Pick a game</h3>
          </div>
          <div className="game-grid">
            {ALL_GAMES.map((game) => {
              const isSelected = game.id === snapshot.selectedGameId;
              const locked = !game.available;
              return (
                <button
                  key={game.id}
                  type="button"
                  className={[
                    "game-card",
                    isSelected ? "game-card--selected" : "",
                    locked ? "game-card--locked" : "",
                  ].join(" ")}
                  disabled={locked || !isHost}
                  onClick={() => send(MSG.SelectGame, { gameId: game.id })}
                  style={{ font: "inherit", color: "inherit" }}
                >
                  {locked && <span className="game-card__soon">Soon</span>}
                  <span className="game-card__emoji">{game.emoji}</span>
                  <span className="game-card__name">{game.displayName}</span>
                  <span className="game-card__tag">{game.tagline}</span>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="game-detail">
              <span className="mode-pill">
                {selected.mode === "host-display"
                  ? "📺 Host + phones"
                  : selected.mode === "symmetric"
                    ? "📱 All phones"
                    : "🔀 Hybrid"}
              </span>
              <p className="game-detail__text">{selected.howToPlay}</p>
            </div>
          )}
        </div>
      </div>

      <div className="lobby-footer">
        {isHost ? (
          <>
            <button
              className="btn btn--green btn--block btn--play"
              disabled={!canStart}
              onClick={() => send(MSG.StartGame)}
            >
              <span>PLAY! · {selected?.displayName ?? "game"}</span>
            </button>
            {missing > 0 && (
              <p className="hint-text">
                Need {missing} more device{missing > 1 ? "s" : ""} to start!
              </p>
            )}
            {tooMany && (
              <p className="hint-text">Too many players (max {selected?.maxPlayers}).</p>
            )}
          </>
        ) : (
          <p className="hint-text">Waiting for {hostName} to hit PLAY!…</p>
        )}
      </div>
    </div>
  );
}
