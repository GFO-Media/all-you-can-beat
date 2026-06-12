import type { TapSprintState } from "@ayb/tap-sprint/types";
import { useCallback, useEffect } from "react";
import { TapSprintKeyboardHint } from "../../components/KeyboardHint";
import { useTapKeyboard } from "../../hooks/useKeyboard";
import { vibrate } from "../../hooks/useWakeLock";
import type { GameViewProps } from "../registry";

export function TapSprintView({ state, sendAction }: GameViewProps) {
  const game = state as TapSprintState | null;

  const tap = useCallback(() => {
    if (game?.phase === "ready" || game?.phase === "go") {
      vibrate(15);
      sendAction({ type: "tap" });
    }
  }, [game?.phase, sendAction]);

  useTapKeyboard({
    active: game?.phase === "ready" || game?.phase === "go",
    onTap: tap,
  });

  useEffect(() => {
    if (game?.phase === "go") vibrate(40);
  }, [game?.phase]);

  if (!game) {
    return (
      <div className="screen screen--center">
        <div className="spinner" />
      </div>
    );
  }

  let zoneClass = "tap-zone--intro";
  let big = "Get ready…";
  let sub = `Round ${Math.max(1, game.round)} of ${game.totalRounds}`;

  if (game.phase === "ready") {
    if (game.you.falseStart) {
      zoneClass = "tap-zone--done";
      big = "Too soon! 😵";
      sub = "You're out for this round";
    } else {
      zoneClass = "tap-zone--ready";
      big = "Wait for it…";
      sub = "Tap when the screen turns GREEN";
    }
  } else if (game.phase === "go") {
    if (game.you.falseStart) {
      zoneClass = "tap-zone--done";
      big = "Too soon! 😵";
      sub = "Better luck next round";
    } else if (game.you.tapped) {
      zoneClass = "tap-zone--done";
      big = `${game.you.reaction} ms`;
      sub = "Waiting for the others…";
    } else {
      zoneClass = "tap-zone--go";
      big = "TAP!!!";
      sub = "";
    }
  }

  if (game.phase === "round-results") {
    const ranked = [...game.players].sort((a, b) => {
      if (a.reaction === null && b.reaction === null) return 0;
      if (a.reaction === null) return 1;
      if (b.reaction === null) return -1;
      return a.reaction - b.reaction;
    });
    return (
      <div className="screen">
        <h2 className="title-light">
          Round {game.round} of {game.totalRounds}
        </h2>
        <div className="stack">
          <div className="card">
            <div className="stack">
              {ranked.map((p, i) => (
                <div className="result-row" key={p.sessionId}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: p.color,
                      flexShrink: 0,
                    }}
                  />
                  <span className="result-row__name">
                    {i === 0 && p.reaction !== null ? "🏆 " : ""}
                    {p.name}
                  </span>
                  <span className="result-row__value">
                    {p.falseStart
                      ? "❌ too soon"
                      : p.reaction === null
                        ? "💤"
                        : `${p.reaction} ms`}
                  </span>
                  <span style={{ color: "var(--purple)", fontWeight: 800 }}>
                    +{p.roundPoints}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="hint-text hint-text--light">Next round coming up…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" onPointerDown={tap}>
      <div className={`tap-zone ${zoneClass}`}>
        <div className="tap-zone__big">{big}</div>
        {sub && <div className="tap-zone__sub">{sub}</div>}
        {(game.phase === "ready" || game.phase === "go") && (
          <div className="tap-zone__keyboard">
            <TapSprintKeyboardHint />
          </div>
        )}
      </div>
    </div>
  );
}
