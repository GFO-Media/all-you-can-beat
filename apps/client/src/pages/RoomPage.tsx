import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useParams } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { GAME_VIEWS } from "../games/registry";
import { useWakeLock } from "../hooks/useWakeLock";
import { useParty } from "../party/PartyContext";
import { Lobby } from "./Lobby";
import { ResultsScreen } from "./ResultsScreen";

const NAME_KEY = "ayb:name";

/**
 * Shared page for /host/:code and /play/:code.
 * The route only decides which *view* of a running game this device renders:
 * /host is the big shared screen, /play is a personal phone screen.
 */
export function RoomPage({ isHostView }: { isHostView: boolean }) {
  const { code: rawCode } = useParams();
  const code = (rawCode ?? "").toUpperCase();
  const party = useParty();
  const [reconnecting, setReconnecting] = useState(!party.room);

  useEffect(() => {
    if (party.room || !code) return;
    let cancelled = false;
    setReconnecting(true);
    void party.tryReconnect(code).finally(() => {
      if (!cancelled) setReconnecting(false);
    });
    return () => {
      cancelled = true;
    };
    // Only attempt once per mount/code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useWakeLock(party.snapshot?.phase === "playing");

  if (!code) return <Navigate to="/" replace />;

  if (!party.room) {
    if (reconnecting) {
      return (
        <div className="screen screen--center">
          <div className="spinner" />
        </div>
      );
    }
    return <JoinForm code={code} />;
  }

  const { snapshot, gameState, me } = party;
  if (!snapshot || !me) {
    return (
      <div className="screen screen--center">
        <div className="spinner" />
      </div>
    );
  }

  if (snapshot.phase === "results") {
    return <ResultsScreen snapshot={snapshot} />;
  }

  if (snapshot.phase === "playing") {
    const views = GAME_VIEWS[snapshot.selectedGameId];
    if (!views) {
      return (
        <div className="screen screen--center">
          <p className="error-text">Unknown game: {snapshot.selectedGameId}</p>
        </div>
      );
    }
    const View = isHostView && views.Host ? views.Host : views.Player;
    return (
      <View
        snapshot={snapshot}
        state={gameState}
        me={me}
        sendAction={party.sendAction}
        subscribeToEvents={party.subscribeToEvents}
        isHostView={isHostView}
      />
    );
  }

  return <Lobby snapshot={snapshot} isHostView={isHostView} />;
}

function JoinForm({ code }: { code: string }) {
  const party = useParty();
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    localStorage.setItem(NAME_KEY, name.trim());
    try {
      await party.joinParty(code, name.trim());
    } catch {
      setError("Couldn't join — the party may be full, mid-game, or over.");
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <TopBar badge="Join party" />
      <div className="lobby-stage">
        <span className="lobby-stage__label">Room code</span>
        <div className="code-badge">{code}</div>
      </div>
      <form className="stack" onSubmit={submit}>
        <div className="card">
          <label className="field-label" htmlFor="join-name">
            Your name
          </label>
          <input
            id="join-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Blobby"
            maxLength={16}
            autoComplete="off"
            autoFocus
          />
        </div>
        <button className="btn btn--green btn--block btn--play" type="submit" disabled={busy || !name.trim()}>
          <span>PLAY! · Join</span>
        </button>
        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  );
}
