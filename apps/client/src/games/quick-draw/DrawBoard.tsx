import { useEffect, useRef } from "react";
import type { GameEvent } from "../../party/PartyContext";

const BOARD_W = 800;
const BOARD_H = 600;
const FLUSH_MS = 40;

interface DrawBoardProps {
  drawable: boolean;
  brushColor: string;
  brushSize: number;
  sendAction(action: Record<string, unknown>): void;
  subscribeToEvents(listener: (event: GameEvent) => void): () => void;
}

/**
 * Shared canvas. The drawer paints locally and streams normalized point
 * batches to the server; every other client replays the same batches.
 */
export function DrawBoard({
  drawable,
  brushColor,
  brushSize,
  sendAction,
  subscribeToEvents,
}: DrawBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointsRef = useRef(new Map<string, [number, number]>());
  const localStrokesRef = useRef(new Set<string>());

  const drawSegments = (
    strokeId: string,
    color: string,
    size: number,
    pts: [number, number][],
  ) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || pts.length === 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const last = lastPointsRef.current.get(strokeId);
    const start = last ?? pts[0];
    ctx.moveTo(start[0] * BOARD_W, start[1] * BOARD_H);
    for (const [x, y] of pts) ctx.lineTo(x * BOARD_W, y * BOARD_H);
    ctx.stroke();
    lastPointsRef.current.set(strokeId, pts[pts.length - 1]);
  };

  const clearBoard = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, BOARD_W, BOARD_H);
    lastPointsRef.current.clear();
  };

  useEffect(() => {
    return subscribeToEvents((event) => {
      if (event.type === "stroke") {
        const id = String(event.id);
        // The drawer already painted their own stroke locally.
        if (localStrokesRef.current.has(id)) return;
        drawSegments(
          id,
          String(event.color),
          Number(event.size),
          event.pts as [number, number][],
        );
      } else if (event.type === "clear") {
        clearBoard();
      }
    });
  }, [subscribeToEvents]);

  useEffect(() => {
    if (!drawable) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let strokeId: string | null = null;
    let buffer: [number, number][] = [];
    let flushTimer: number | null = null;

    const toNormalized = (e: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [
        Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
        Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
      ];
    };

    const flush = () => {
      flushTimer = null;
      if (!strokeId || buffer.length === 0) return;
      sendAction({
        type: "stroke",
        id: strokeId,
        color: brushColor,
        size: brushSize,
        pts: buffer,
      });
      buffer = [];
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      strokeId = Math.random().toString(36).slice(2, 10);
      localStrokesRef.current.add(strokeId);
      const pt = toNormalized(e);
      buffer = [pt];
      drawSegments(strokeId, brushColor, brushSize, [pt]);
      flushTimer = window.setTimeout(flush, FLUSH_MS);
    };

    const onMove = (e: PointerEvent) => {
      if (!strokeId) return;
      const pt = toNormalized(e);
      buffer.push(pt);
      drawSegments(strokeId, brushColor, brushSize, [pt]);
      if (flushTimer === null) flushTimer = window.setTimeout(flush, FLUSH_MS);
    };

    const onUp = () => {
      if (!strokeId) return;
      flush();
      strokeId = null;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      if (flushTimer !== null) window.clearTimeout(flushTimer);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [drawable, brushColor, brushSize, sendAction]);

  return (
    <canvas
      ref={canvasRef}
      className="draw-board"
      width={BOARD_W}
      height={BOARD_H}
      style={drawable ? { cursor: "crosshair", borderStyle: "solid" } : undefined}
    />
  );
}
