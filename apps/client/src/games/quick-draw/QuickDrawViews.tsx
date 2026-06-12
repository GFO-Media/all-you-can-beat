import type { QuickDrawState } from "@ayb/quick-draw/types";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BlobAvatar } from "../../components/BlobAvatar";
import type { GameEvent } from "../../party/PartyContext";
import type { GameViewProps } from "../registry";
import { DrawBoard } from "./DrawBoard";

const BRUSH_COLORS = ["#2B2350", "#FF5BA6", "#46B5FF", "#3DDC84", "#FF7A45"];

interface ChatLine {
  key: number;
  name: string;
  color: string;
  text: string;
  correct: boolean;
}

function useQuickDraw(props: GameViewProps) {
  const game = props.state as QuickDrawState | null;
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const keyRef = useRef(0);

  useEffect(() => {
    return props.subscribeToEvents((event: GameEvent) => {
      if (event.type === "timer") {
        setTimeLeft(Number(event.timeLeft));
      } else if (event.type === "chat") {
        keyRef.current += 1;
        setChat((prev) => [
          ...prev.slice(-40),
          {
            key: keyRef.current,
            name: String(event.name),
            color: String(event.color),
            text: String(event.text),
            correct: Boolean(event.correct),
          },
        ]);
      } else if (event.type === "clear") {
        setChat([]);
      }
    });
  }, [props.subscribeToEvents]);

  return { game, timeLeft: timeLeft ?? game?.timeLeft ?? 0, chat };
}

function ChatFeed({ chat }: { chat: ChatLine[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);
  return (
    <div className="chat-feed">
      {chat.length === 0 && <p className="hint-text">Guesses show up here…</p>}
      {chat.map((line) => (
        <div
          key={line.key}
          className={`chat-line${line.correct ? " chat-line--correct" : ""}`}
        >
          <span style={{ color: line.color }}>{line.name}</span> {line.text}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

function GuessForm({ sendAction }: { sendAction: GameViewProps["sendAction"] }) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const guess = text.trim();
    if (!guess) return;
    sendAction({ type: "guess", text: guess });
    setText("");
  };
  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8 }}>
      <input
        className="input"
        style={{ minHeight: 48 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your guess…"
        maxLength={60}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        enterKeyHint="send"
      />
      <button className="btn btn--green" type="submit" style={{ minHeight: 48 }}>
        Go
      </button>
    </form>
  );
}

function RevealBanner({ game }: { game: QuickDrawState }) {
  return (
    <div className="word-banner">
      The word was “{game.word}” —{" "}
      {game.solvedByName ? `${game.solvedByName} got it! 🎉` : "nobody guessed it 😅"}
    </div>
  );
}

function Scoreboard({ game }: { game: QuickDrawState }) {
  return (
    <div className="card card--dim" style={{ padding: 12 }}>
      <div className="stack" style={{ gap: 6 }}>
        {game.scores.map((s) => (
          <div key={s.sessionId} className="result-row" style={{ padding: "4px 10px" }}>
            <BlobAvatar color={s.color} variant={s.avatar} size={26} />
            <span className="result-row__name">{s.name}</span>
            <span className="result-row__value">{s.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player phone view
// ---------------------------------------------------------------------------

export function QuickDrawPlayerView(props: GameViewProps) {
  const { game, timeLeft, chat } = useQuickDraw(props);
  const [brushColor, setBrushColor] = useState(BRUSH_COLORS[0]);

  if (!game) {
    return (
      <div className="screen screen--center">
        <div className="spinner" />
      </div>
    );
  }

  if (game.phase === "intro") {
    return (
      <div className="screen screen--center">
        <h1 className="title-light">🎨 Quick Draw</h1>
        <p className="hint-text hint-text--light">Shuffling the doodle order…</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="draw-layout">
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span className="mode-pill">
            Round {game.round}/{game.totalRounds}
          </span>
          <span className={`timer-pill${timeLeft <= 10 ? " timer-pill--low" : ""}`}>
            {game.phase === "drawing" ? `${timeLeft}s` : "⏸"}
          </span>
        </div>

        {game.phase === "reveal" ? (
          <RevealBanner game={game} />
        ) : (
          <div className="word-banner">
            {game.isDrawer ? `Draw: ${game.word}` : game.word}
          </div>
        )}

        {!game.isDrawer && game.phase === "drawing" && (
          <p className="hint-text hint-text--light">
            {game.drawerName} is drawing — guess away!
          </p>
        )}

        <div className="draw-board-wrap">
          <DrawBoard
            drawable={game.isDrawer && game.phase === "drawing"}
            brushColor={brushColor}
            brushSize={6}
            sendAction={props.sendAction}
            subscribeToEvents={props.subscribeToEvents}
          />
        </div>

        {game.isDrawer && game.phase === "drawing" ? (
          <div className="brush-row">
            {BRUSH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`brush-swatch${c === brushColor ? " brush-swatch--active" : ""}`}
                style={{ background: c }}
                onClick={() => setBrushColor(c)}
                aria-label={`Brush color ${c}`}
              />
            ))}
            <button
              type="button"
              className="btn btn--yellow"
              style={{ minHeight: 44, padding: "6px 16px" }}
              onClick={() => props.sendAction({ type: "clear" })}
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 12 }}>
            <div className="stack" style={{ gap: 8 }}>
              <ChatFeed chat={chat} />
              {game.phase === "drawing" && <GuessForm sendAction={props.sendAction} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Host display ("arena") view
// ---------------------------------------------------------------------------

export function QuickDrawHostView(props: GameViewProps) {
  const { game, timeLeft, chat } = useQuickDraw(props);

  if (!game) {
    return (
      <div className="screen screen--center">
        <div className="spinner" />
      </div>
    );
  }

  if (game.phase === "intro") {
    return (
      <div className="screen screen--center">
        <h1 className="title-light">🎨 Quick Draw</h1>
        <p className="hint-text hint-text--light">Shuffling the doodle order…</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="draw-layout draw-layout--host">
        <div className="draw-board-wrap" style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 4px 8px",
              gap: 10,
            }}
          >
            <strong style={{ fontFamily: "var(--font-display)" }}>
              ✏️ {game.drawerName} is drawing
            </strong>
            <span className={`timer-pill${timeLeft <= 10 ? " timer-pill--low" : ""}`}>
              {game.phase === "drawing" ? `${timeLeft}s` : "⏸"}
            </span>
          </div>
          <DrawBoard
            drawable={false}
            brushColor="#2B2350"
            brushSize={6}
            sendAction={props.sendAction}
            subscribeToEvents={props.subscribeToEvents}
          />
          <div style={{ paddingTop: 8 }}>
            {game.phase === "reveal" ? (
              <RevealBanner game={game} />
            ) : (
              <div className="word-banner">{game.word}</div>
            )}
          </div>
        </div>

        <div className="draw-side">
          <div className="card" style={{ padding: 12, flex: 1 }}>
            <div className="stack" style={{ gap: 8 }}>
              <ChatFeed chat={chat} />
              {game.phase === "drawing" && !game.isDrawer && (
                <GuessForm sendAction={props.sendAction} />
              )}
            </div>
          </div>
          <Scoreboard game={game} />
        </div>
      </div>
    </div>
  );
}