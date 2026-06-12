import { MSG, type RoomSnapshot } from "@ayb/shared";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { BlobAvatar } from "../components/BlobAvatar";
import { TopBar } from "../components/TopBar";
import { gameMetaById } from "../games/catalog";
import { useParty } from "../party/PartyContext";

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

export function ResultsScreen({ snapshot }: { snapshot: RoomSnapshot }) {
  const { me, send } = useParty();
  const results = snapshot.lastResults ?? [];
  const game = snapshot.lastGameId ? gameMetaById(snapshot.lastGameId) : undefined;
  const iWon = results.length > 0 && results[0].sessionId === me?.sessionId;

  useEffect(() => {
    confetti({
      particleCount: iWon ? 160 : 80,
      spread: 70,
      origin: { y: 0.3 },
      colors: ["#ff5ba6", "#46b5ff", "#ffc93c", "#3ddc84", "#9b5bff"],
    });
  }, [iWon]);

  return (
    <div className="screen">
      <TopBar badge="Results" />
      <div className="results-hero">
        {game && <span className="results-hero__emoji">{game.emoji}</span>}
        <h1 className="title-light">{game?.displayName ?? "Results"}</h1>
        <p className="hint-text">{iWon ? "You absolutely crushed it! 🏆" : "Nice round — who's next?"}</p>
      </div>

      <div className="stack">
        <div className="card">
          <div className="stack" style={{ gap: 8 }}>
            {results.map((r, i) => (
              <div
                key={r.sessionId}
                className={`podium-row${i === 0 ? " podium-row--first" : ""}`}
              >
                <span className="podium-row__rank">{RANK_EMOJI[i] ?? i + 1}</span>
                <BlobAvatar color={r.color} variant={r.avatar} size={34} />
                <span className="podium-row__name">
                  {r.name}
                  {r.sessionId === me?.sessionId ? " · you" : ""}
                </span>
                <span>
                  <span className="podium-row__pts">+{r.points}</span>{" "}
                  <span className="podium-row__total">{r.total} total</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {me?.isHost ? (
          <button className="btn btn--block" onClick={() => send(MSG.ReturnToLobby)}>
            Back to lobby
          </button>
        ) : (
          <p className="hint-text">Waiting for the host to return to the lobby…</p>
        )}
      </div>
    </div>
  );
}
