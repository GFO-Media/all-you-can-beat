import type { BlobbyVolleyState } from "@ayb/blobby-volley/types";
import { useCallback, useEffect, useRef } from "react";
import { VolleyKeyboardHint } from "../../components/KeyboardHint";
import { useVolleyKeyboard } from "../../hooks/useKeyboard";
import { vibrate } from "../../hooks/useWakeLock";
import type { GameViewProps } from "../registry";
import { VolleyCourt } from "./VolleyCourt";

function PointBanner({ state }: { state: BlobbyVolleyState }) {
  if (state.phase !== "point" || state.lastPointTeam === null) return null;
  const team = state.teams[state.lastPointTeam];
  const label = team.playerNames.join(" & ") || `Team ${state.lastPointTeam + 1}`;
  return (
    <div className="volley-point-banner">
      🏐 Point for {label}!
    </div>
  );
}

function ScoreStrip({ state }: { state: BlobbyVolleyState }) {
  return (
    <div className="volley-score-strip">
      <div className="volley-score-strip__team volley-score-strip__team--left">
        <span className="volley-score-strip__pts">{state.scores[0]}</span>
        <span className="volley-score-strip__names">{state.teams[0].playerNames.join(", ")}</span>
      </div>
      <span className="volley-score-strip__goal">→ {state.pointsToWin}</span>
      <div className="volley-score-strip__team volley-score-strip__team--right">
        <span className="volley-score-strip__pts">{state.scores[1]}</span>
        <span className="volley-score-strip__names">{state.teams[1].playerNames.join(", ")}</span>
      </div>
    </div>
  );
}

function useController(sendAction: GameViewProps["sendAction"], active: boolean) {
  const ptrRef = useRef({ left: false, right: false });
  const kbRef = useRef({ left: false, right: false });
  const lastSent = useRef({ left: false, right: false });

  const flush = useCallback(() => {
    const left = ptrRef.current.left || kbRef.current.left;
    const right = ptrRef.current.right || kbRef.current.right;
    if (lastSent.current.left === left && lastSent.current.right === right) return;
    lastSent.current = { left, right };
    sendAction({ type: "input", left, right });
  }, [sendAction]);

  const sendInput = useCallback(
    (left: boolean, right: boolean) => {
      ptrRef.current = { left, right };
      flush();
    },
    [flush],
  );

  const stop = useCallback(() => sendInput(false, false), [sendInput]);

  const onKeyboardMove = useCallback(
    (left: boolean, right: boolean) => {
      kbRef.current = { left, right };
      flush();
    },
    [flush],
  );

  const jump = useCallback(() => {
    vibrate(20);
    sendAction({ type: "jump" });
  }, [sendAction]);

  useVolleyKeyboard({ active, onMove: onKeyboardMove, onJump: jump });

  useEffect(() => {
    if (!active) {
      ptrRef.current = { left: false, right: false };
      flush();
    }
    return () => {
      ptrRef.current = { left: false, right: false };
      flush();
    };
  }, [active, flush]);

  return { sendInput, stop, jump };
}

function PhoneController({
  sendAction,
  active,
  team,
}: {
  sendAction: GameViewProps["sendAction"];
  active: boolean;
  team: 0 | 1;
}) {
  const { sendInput, stop, jump } = useController(sendAction, active);

  return (
    <div className="volley-controls">
      <p className="volley-controls__label">
        Team {team === 0 ? "🩷 Pink" : "💚 Green"} — don&apos;t let the ball hit your sand!
      </p>
      <VolleyKeyboardHint />
      <div className="volley-controls__pad">
        <button
          type="button"
          className="volley-btn volley-btn--left"
          disabled={!active}
          onPointerDown={() => sendInput(true, false)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          ◀
        </button>
        <button
          type="button"
          className="volley-btn volley-btn--jump"
          disabled={!active}
          onPointerDown={jump}
        >
          ▲
          <span>JUMP</span>
        </button>
        <button
          type="button"
          className="volley-btn volley-btn--right"
          disabled={!active}
          onPointerDown={() => sendInput(false, true)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

export function BlobbyVolleyPlayerView({ state, me, sendAction }: GameViewProps) {
  const game = state as BlobbyVolleyState | null;

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
        <h1 className="title-light">🏐 Blobby Volley</h1>
        <p className="hint-text hint-text--light">Warming up the blobs…</p>
      </div>
    );
  }

  const playing = game.phase === "playing";

  return (
    <div className="screen volley-screen">
      <ScoreStrip state={game} />
      {game.ballFloating && playing && (
        <p className="volley-float-hint">Ball is up — jump to it first!</p>
      )}
      <div className="volley-court-wrap volley-court-wrap--mini">
        <VolleyCourt state={game} highlightBlobId={game.yourBlobId} />
        <PointBanner state={game} />
      </div>
      <PhoneController sendAction={sendAction} active={playing} team={game.yourTeam} />
    </div>
  );
}

function HostPlayerControls({
  sendAction,
  active,
  team,
}: {
  sendAction: GameViewProps["sendAction"];
  active: boolean;
  team: 0 | 1;
}) {
  const jump = useCallback(() => {
    vibrate(20);
    sendAction({ type: "jump" });
  }, [sendAction]);

  const onKeyboardMove = useCallback(
    (left: boolean, right: boolean) => {
      sendAction({ type: "input", left, right });
    },
    [sendAction],
  );

  useVolleyKeyboard({ active, onMove: onKeyboardMove, onJump: jump });

  return (
    <div className="volley-host-controls">
      <p className="volley-host-controls__label">
        You&apos;re playing too (team {team === 0 ? "🩷 Pink" : "💚 Green"}) — use the keyboard:
      </p>
      <VolleyKeyboardHint />
    </div>
  );
}

export function BlobbyVolleyHostView({ state, sendAction }: GameViewProps) {
  const game = state as BlobbyVolleyState | null;

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
        <h1 className="title-light">🏐 Blobby Volley</h1>
        <p className="hint-text hint-text--light">Grab your phones — first to {game.pointsToWin} wins!</p>
      </div>
    );
  }

  return (
    <div className="screen volley-screen volley-screen--host">
      <ScoreStrip state={game} />
      {game.ballFloating && game.phase === "playing" && (
        <p className="volley-float-hint">Serve — first blob to touch the ball!</p>
      )}
      <div className="volley-court-wrap">
        <VolleyCourt state={game} />
        <PointBanner state={game} />
      </div>
      {game.phase === "point" && (
        <p className="hint-text hint-text--light">Resetting the ball…</p>
      )}
      {game.yourBlobId && game.phase === "playing" && (
        <HostPlayerControls sendAction={sendAction} active team={game.yourTeam} />
      )}
    </div>
  );
}
