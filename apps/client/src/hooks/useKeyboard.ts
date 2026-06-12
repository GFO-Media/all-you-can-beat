import { useEffect } from "react";

/** Don't steal keys while the user is typing in a form field. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

const LEFT_CODES = new Set(["ArrowLeft", "KeyA"]);
const RIGHT_CODES = new Set(["ArrowRight", "KeyD"]);
const JUMP_CODES = new Set(["Space", "ArrowUp", "KeyW"]);
const TAP_CODES = new Set(["Space", "Enter"]);

interface VolleyKeyboardOptions {
  active: boolean;
  onMove(left: boolean, right: boolean): void;
  onJump(): void;
}

/** Hold-to-move + tap-to-jump for Blobby Volley on PC. */
export function useVolleyKeyboard({
  active,
  onMove,
  onJump,
}: VolleyKeyboardOptions): void {
  useEffect(() => {
    if (!active) {
      onMove(false, false);
      return;
    }

    const held = { left: false, right: false };

    const flush = () => onMove(held.left, held.right);

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (LEFT_CODES.has(e.code)) {
        e.preventDefault();
        if (!held.left) {
          held.left = true;
          flush();
        }
      } else if (RIGHT_CODES.has(e.code)) {
        e.preventDefault();
        if (!held.right) {
          held.right = true;
          flush();
        }
      } else if (JUMP_CODES.has(e.code) && !e.repeat) {
        e.preventDefault();
        onJump();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (LEFT_CODES.has(e.code)) {
        e.preventDefault();
        held.left = false;
        flush();
      } else if (RIGHT_CODES.has(e.code)) {
        e.preventDefault();
        held.right = false;
        flush();
      }
    };

    const releaseAll = () => {
      held.left = false;
      held.right = false;
      flush();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [active, onMove, onJump]);
}

interface TapKeyboardOptions {
  active: boolean;
  onTap(): void;
}

const UP_CODES = new Set(["ArrowUp", "KeyW"]);
const DOWN_CODES = new Set(["ArrowDown", "KeyS"]);

interface MoveKeyboardOptions {
  active: boolean;
  onMove(dirs: { up: boolean; down: boolean; left: boolean; right: boolean }): void;
}

/** Hold-to-move for top-down games (Ghost Host). */
export function useMoveKeyboard({ active, onMove }: MoveKeyboardOptions): void {
  useEffect(() => {
    if (!active) {
      onMove({ up: false, down: false, left: false, right: false });
      return;
    }

    const held = { up: false, down: false, left: false, right: false };
    const flush = () => onMove({ ...held });

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      let changed = false;
      if (UP_CODES.has(e.code)) {
        e.preventDefault();
        if (!held.up) {
          held.up = true;
          changed = true;
        }
      } else if (DOWN_CODES.has(e.code)) {
        e.preventDefault();
        if (!held.down) {
          held.down = true;
          changed = true;
        }
      } else if (LEFT_CODES.has(e.code)) {
        e.preventDefault();
        if (!held.left) {
          held.left = true;
          changed = true;
        }
      } else if (RIGHT_CODES.has(e.code)) {
        e.preventDefault();
        if (!held.right) {
          held.right = true;
          changed = true;
        }
      }
      if (changed) flush();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      let changed = false;
      if (UP_CODES.has(e.code)) {
        e.preventDefault();
        held.up = false;
        changed = true;
      } else if (DOWN_CODES.has(e.code)) {
        e.preventDefault();
        held.down = false;
        changed = true;
      } else if (LEFT_CODES.has(e.code)) {
        e.preventDefault();
        held.left = false;
        changed = true;
      } else if (RIGHT_CODES.has(e.code)) {
        e.preventDefault();
        held.right = false;
        changed = true;
      }
      if (changed) flush();
    };

    const releaseAll = () => {
      held.up = false;
      held.down = false;
      held.left = false;
      held.right = false;
      flush();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [active, onMove]);
}

const FLASHLIGHT_CODES = new Set(["Space", "KeyF"]);

interface FlashlightKeyboardOptions {
  active: boolean;
  onFlashlight(on: boolean): void;
}

/** Hold Space / F to shine flashlight in Ghost Host. */
export function useFlashlightKeyboard({
  active,
  onFlashlight,
}: FlashlightKeyboardOptions): void {
  useEffect(() => {
    if (!active) {
      onFlashlight(false);
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (!FLASHLIGHT_CODES.has(e.code)) return;
      e.preventDefault();
      onFlashlight(true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!FLASHLIGHT_CODES.has(e.code)) return;
      e.preventDefault();
      onFlashlight(false);
    };

    const release = () => onFlashlight(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      release();
    };
  }, [active, onFlashlight]);
}

/** Space / Enter to tap in Tap Sprint. */
export function useTapKeyboard({ active, onTap }: TapKeyboardOptions): void {
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target)) return;
      if (!TAP_CODES.has(e.code)) return;
      e.preventDefault();
      onTap();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onTap]);
}
