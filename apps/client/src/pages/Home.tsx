import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MascotStage } from "../components/MascotStage";
import { TopBar } from "../components/TopBar";
import { useParty } from "../party/PartyContext";

const NAME_KEY = "ayb:name";

export function Home() {
  const navigate = useNavigate();
  const { createParty, joinParty } = useParty();
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rememberName = () => {
    localStorage.setItem(NAME_KEY, name.trim());
  };

  const onCreate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    rememberName();
    try {
      const roomCode = await createParty(name.trim());
      navigate(`/host/${roomCode}`);
    } catch {
      setError("Could not reach the game server. Is it running?");
      setBusy(false);
    }
  };

  const onJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || code.trim().length < 4 || busy) return;
    setBusy(true);
    setError(null);
    rememberName();
    try {
      const roomCode = await joinParty(code.trim(), name.trim());
      navigate(`/play/${roomCode}`);
    } catch {
      setError("Party not found — double-check the code!");
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <TopBar badge="Party games" />

      <div className="lobby-stage">
        <MascotStage size={100} />
        <h1 className="hero-title">
          All You Can <span className="gradient-text">Beat</span>
        </h1>
        <p className="hero-sub">2+ phones. One room. Instant party chaos.</p>
      </div>

      <div className="stack">
        <div className="card">
          <label className="field-label" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Blobby"
            maxLength={16}
            autoComplete="off"
          />
        </div>

        <button
          className="btn btn--block btn--play"
          onClick={onCreate}
          disabled={busy || !name.trim()}
        >
          <span>PLAY! · Start party</span>
        </button>

        <div className="divider">or join</div>

        <form className="card" onSubmit={onJoin}>
          <label className="field-label" htmlFor="code">
            Room code
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              id="code"
              className="input input--code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
            />
            <button
              className="btn btn--blue"
              type="submit"
              disabled={busy || !name.trim() || code.trim().length < 4}
              style={{ minWidth: 90 }}
            >
              Join
            </button>
          </div>
        </form>

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
