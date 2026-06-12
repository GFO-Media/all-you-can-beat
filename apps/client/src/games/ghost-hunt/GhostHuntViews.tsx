import { BATTERY_MAX } from "@ayb/ghost-hunt/flashlight";
import type { GhostHuntState } from "@ayb/ghost-hunt/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFlashlightKeyboard, useMoveKeyboard } from "../../hooks/useKeyboard";
import { vibrate } from "../../hooks/useWakeLock";
import type { GameViewProps } from "../registry";
import { MansionMap } from "./MansionMap";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function HudBar({ state }: { state: GhostHuntState }) {
  const pct = (state.ghostHp / state.ghostMaxHp) * 100;
  return (
    <div className="ghost-hud">
      <div className="ghost-hud__hp">
        <span className="ghost-hud__icon">👻</span>
        <div className="ghost-hud__bar">
          <div className="ghost-hud__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="ghost-hud__num">{state.ghostHp}</span>
      </div>
      <div className="ghost-hud__timer">{formatTime(state.timeLeft)}</div>
    </div>
  );
}

function BatteryBar({ battery, lives }: { battery: number; lives: number }) {
  const pct = (battery / BATTERY_MAX) * 100;
  return (
    <div className="ghost-battery">
      <span className="ghost-battery__label">🔦</span>
      <div className="ghost-battery__track">
        <div
          className={`ghost-battery__fill${pct < 20 ? " ghost-battery__fill--low" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="ghost-battery__lives">{"❤️".repeat(Math.max(0, lives))}</span>
    </div>
  );
}

function useMoveController(sendAction: GameViewProps["sendAction"], active: boolean) {
  const ptrRef = useRef({ up: false, down: false, left: false, right: false });
  const kbRef = useRef({ up: false, down: false, left: false, right: false });
  const lastSent = useRef({ up: false, down: false, left: false, right: false });

  const flush = useCallback(() => {
    const next = {
      up: ptrRef.current.up || kbRef.current.up,
      down: ptrRef.current.down || kbRef.current.down,
      left: ptrRef.current.left || kbRef.current.left,
      right: ptrRef.current.right || kbRef.current.right,
    };
    const prev = lastSent.current;
    if (
      prev.up === next.up &&
      prev.down === next.down &&
      prev.left === next.left &&
      prev.right === next.right
    ) {
      return;
    }
    lastSent.current = next;
    sendAction({ type: "move", ...next });
  }, [sendAction]);

  const setPtr = useCallback(
    (dir: Partial<typeof ptrRef.current>) => {
      ptrRef.current = { ...ptrRef.current, ...dir };
      flush();
    },
    [flush],
  );

  const stopPtr = useCallback(() => {
    ptrRef.current = { up: false, down: false, left: false, right: false };
    flush();
  }, [flush]);

  const onKeyboardMove = useCallback(
    (dirs: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
      kbRef.current = dirs;
      flush();
    },
    [flush],
  );

  useMoveKeyboard({ active, onMove: onKeyboardMove });

  useEffect(() => {
    if (!active) {
      ptrRef.current = { up: false, down: false, left: false, right: false };
      flush();
    }
    return () => {
      ptrRef.current = { up: false, down: false, left: false, right: false };
      flush();
    };
  }, [active, flush]);

  return { setPtr, stopPtr };
}

function useFlashlightController(sendAction: GameViewProps["sendAction"], active: boolean) {
  const ptrOn = useRef(false);
  const kbOn = useRef(false);
  const lastSent = useRef(false);

  const flush = useCallback(() => {
    const on = ptrOn.current || kbOn.current;
    if (lastSent.current === on) return;
    lastSent.current = on;
    sendAction({ type: "flashlight", on });
  }, [sendAction]);

  const setPtr = useCallback(
    (on: boolean) => {
      ptrOn.current = on;
      flush();
    },
    [flush],
  );

  const onKeyboard = useCallback(
    (on: boolean) => {
      kbOn.current = on;
      flush();
    },
    [flush],
  );

  useFlashlightKeyboard({ active, onFlashlight: onKeyboard });

  useEffect(() => {
    if (!active) {
      ptrOn.current = false;
      flush();
    }
    return () => {
      ptrOn.current = false;
      flush();
    };
  }, [active, flush]);

  return { setPtr };
}

function HunterControls({
  sendAction,
  active,
  game,
}: {
  sendAction: GameViewProps["sendAction"];
  active: boolean;
  game: GhostHuntState;
}) {
  const { setPtr, stopPtr } = useMoveController(sendAction, active);
  const { setPtr: setLight } = useFlashlightController(sendAction, active);

  const bind = (up: boolean, down: boolean, left: boolean, right: boolean) => ({
    onPointerDown: () => setPtr({ up, down, left, right }),
    onPointerUp: stopPtr,
    onPointerLeave: stopPtr,
    onPointerCancel: stopPtr,
  });

  const lightBind = {
    onPointerDown: () => setLight(true),
    onPointerUp: () => setLight(false),
    onPointerLeave: () => setLight(false),
    onPointerCancel: () => setLight(false),
  };

  let hint = "Hold 🔦 to shine — move to aim the beam!";
  if (game.you.fainted) hint = "You fainted — teammates must shine light on you!";
  else if (game.ghostVisible) hint = "👻 Caught in your beam — keep the light on it!";
  else if (game.you.proximity === "danger") hint = "❗ Controller rumble — ghost is RIGHT HERE!";
  else if (game.you.proximity === "near") hint = "❓ Something feels close…";

  return (
    <div className="ghost-controls">
      <BatteryBar battery={game.you.battery} lives={game.you.lives} />
      <p className="ghost-controls__label">{hint}</p>
      <div className="ghost-hunter-pad">
        <div className="ghost-dpad">
          <button type="button" className="ghost-dpad__btn ghost-dpad__btn--up" disabled={!active} {...bind(true, false, false, false)}>
            ▲
          </button>
          <button type="button" className="ghost-dpad__btn ghost-dpad__btn--left" disabled={!active} {...bind(false, false, true, false)}>
            ◀
          </button>
          <button type="button" className="ghost-dpad__btn ghost-dpad__btn--down" disabled={!active} {...bind(false, true, false, false)}>
            ▼
          </button>
          <button type="button" className="ghost-dpad__btn ghost-dpad__btn--right" disabled={!active} {...bind(false, false, false, true)}>
            ▶
          </button>
        </div>
        <button
          type="button"
          className={`ghost-flashlight-btn${game.you.flashlightOn ? " ghost-flashlight-btn--on" : ""}`}
          disabled={!active || game.you.battery <= 0}
          {...lightBind}
        >
          <span>🔦</span>
          <span>LIGHT</span>
        </button>
      </div>
      <p className="ghost-controls__hint">Move = WASD · Light = hold Space</p>
    </div>
  );
}

function GhostDpad({
  sendAction,
  active,
  label,
}: {
  sendAction: GameViewProps["sendAction"];
  active: boolean;
  label: string;
}) {
  const { setPtr, stopPtr } = useMoveController(sendAction, active);
  const bind = (up: boolean, down: boolean, left: boolean, right: boolean) => ({
    onPointerDown: () => setPtr({ up, down, left, right }),
    onPointerUp: stopPtr,
    onPointerLeave: stopPtr,
    onPointerCancel: stopPtr,
  });

  return (
    <div className="ghost-controls">
      <p className="ghost-controls__label">{label}</p>
      <div className="ghost-dpad">
        <button type="button" className="ghost-dpad__btn ghost-dpad__btn--up" disabled={!active} {...bind(true, false, false, false)}>▲</button>
        <button type="button" className="ghost-dpad__btn ghost-dpad__btn--left" disabled={!active} {...bind(false, false, true, false)}>◀</button>
        <button type="button" className="ghost-dpad__btn ghost-dpad__btn--down" disabled={!active} {...bind(false, true, false, false)}>▼</button>
        <button type="button" className="ghost-dpad__btn ghost-dpad__btn--right" disabled={!active} {...bind(false, false, false, true)}>▶</button>
      </div>
    </div>
  );
}

function IntroScreen({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="screen screen--center ghost-intro">
      <h1 className="title-light">{title}</h1>
      <p className="hint-text hint-text--light">{hint}</p>
    </div>
  );
}

const RUMBLE: Record<string, number | number[]> = {
  far: 30,
  near: [40, 30, 40],
  danger: [80, 40, 100, 40, 120],
};

export function GhostHuntPlayerView({
  state,
  sendAction,
  subscribeToEvents,
}: GameViewProps) {
  const game = state as GhostHuntState | null;
  const [sweep, setSweep] = useState(0);

  useEffect(() => {
    if (!game || game.role !== "ghost" || game.phase !== "playing") return;
    let raf = 0;
    const tick = () => {
      setSweep((a) => a + 0.04);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game?.role, game?.phase]);

  useEffect(() => {
    return subscribeToEvents((ev) => {
      if (ev.type === "rumble" && typeof ev.level === "string") {
        vibrate(RUMBLE[ev.level] ?? 30);
      }
      if (ev.type === "capture") vibrate([50, 30, 80]);
      if (ev.type === "faint") vibrate([120, 60, 120]);
      if (ev.type === "revived") vibrate(50);
      if (ev.type === "lightning") vibrate(20);
      if (ev.type === "battery") vibrate(25);
    });
  }, [subscribeToEvents]);

  if (!game) {
    return (
      <div className="screen screen--center">
        <div className="spinner" />
      </div>
    );
  }

  if (game.phase === "intro") {
    if (game.role === "ghost") {
      return (
        <IntroScreen
          title="👻 You are the Ghost!"
          hint="Full radar on your phone. Sneak up and catch hunters — but dodge their flashlight beams!"
        />
      );
    }
    if (game.role === "hunter") {
      return (
        <IntroScreen
          title="🔦 You are a Hunter!"
          hint="Hold the LIGHT button to shine. Aim with movement. Drain the ghost's HP — or revive fallen teammates!"
        />
      );
    }
    return <IntroScreen title="👻 Ghost Host" hint="Watch the TV — hunters use flashlights on their phones!" />;
  }

  if (game.phase === "ended") {
    const won =
      (game.role === "ghost" && game.winner === "ghost") ||
      (game.role === "hunter" && game.winner === "hunters");
    return (
      <div className="screen screen--center ghost-intro">
        <h1 className="title-light">{won ? "🎉 You won!" : "Busted!"}</h1>
        <p className="hint-text hint-text--light">
          {game.winner === "ghost" ? `${game.ghostName} haunted the mansion!` : "Hunters caught the ghost!"}
        </p>
      </div>
    );
  }

  const playing = game.phase === "playing";

  if (game.role === "ghost") {
    return (
      <div className="screen ghost-screen ghost-screen--radar">
        <HudBar state={game} />
        <div className="ghost-map-wrap">
          <MansionMap state={game} variant="radar" sweepAngle={sweep} />
        </div>
        <GhostDpad sendAction={sendAction} active={playing} label="Hunt from the shadows — avoid active beams!" />
      </div>
    );
  }

  if (game.role === "hunter") {
    const canPlay = playing && !game.you.fainted && !game.you.eliminated;
    return (
      <div className="screen ghost-screen ghost-screen--hunter">
        <HudBar state={game} />
        <div className="ghost-map-wrap ghost-map-wrap--dark">
          <MansionMap state={game} variant="hunter" />
          {game.you.fainted && (
            <div className="ghost-stun-overlay">
              Fainted — wait for a teammate&apos;s flashlight!
              <div className="ghost-revive-bar">
                <div className="ghost-revive-bar__fill" style={{ width: `${game.you.reviveProgress}%` }} />
              </div>
            </div>
          )}
          {game.lightning && <div className="ghost-lightning-flash">⚡ Lightning!</div>}
        </div>
        <HunterControls sendAction={sendAction} active={canPlay} game={game} />
      </div>
    );
  }

  return (
    <div className="screen screen--center">
      <p className="hint-text hint-text--light">Watch the big screen!</p>
    </div>
  );
}

export function GhostHuntHostView({ state }: GameViewProps) {
  const game = state as GhostHuntState | null;

  if (!game) {
    return (
      <div className="screen screen--center">
        <div className="spinner" />
      </div>
    );
  }

  if (game.phase === "intro") {
    return (
      <IntroScreen
        title="👻 Ghost Host"
        hint="Like Luigi's Ghost Mansion — hunters hold 🔦 to shine cones of light. Ghost is invisible until lit!"
      />
    );
  }

  if (game.phase === "ended") {
    return (
      <div className="screen screen--center ghost-intro">
        <h1 className="title-light">
          {game.winner === "ghost" ? "👻 Ghost wins!" : "🔦 Hunters win!"}
        </h1>
      </div>
    );
  }

  return (
    <div className="screen ghost-screen ghost-screen--tv">
      <HudBar state={game} />
      <p className="ghost-tv-tag">
        Ghost: <strong>{game.ghostName}</strong> — invisible until a flashlight beam hits!
        {game.lightning && " ⚡ Lightning reveals all!"}
      </p>
      <div className="ghost-map-wrap ghost-map-wrap--tv">
        <MansionMap state={game} variant="tv" />
      </div>
    </div>
  );
}
