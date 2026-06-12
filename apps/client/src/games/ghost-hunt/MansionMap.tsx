import {
  conePath,
  effectiveRange,
  FLASHLIGHT_SPREAD,
} from "@ayb/ghost-hunt/flashlight";
import type { GhostHuntState, HunterView } from "@ayb/ghost-hunt/types";

const VIEW_W = 1000;
const VIEW_H = 720;

interface MansionMapProps {
  state: GhostHuntState;
  variant: "radar" | "hunter" | "tv";
  sweepAngle?: number;
}

function FlashlightCone({
  hunter,
  id,
  lit,
}: {
  hunter: HunterView;
  id: string;
  lit: boolean;
}) {
  if (!hunter.flashlightOn || hunter.fainted || hunter.eliminated) return null;
  const range = effectiveRange(hunter.battery);
  const d = conePath(hunter.x, hunter.y, hunter.facing, range, FLASHLIGHT_SPREAD);

  return (
    <g>
      <defs>
        <radialGradient id={`beamGrad-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={lit ? "rgba(160,255,140,0.7)" : "rgba(120,255,120,0.55)"} />
          <stop offset="70%" stopColor="rgba(80,220,80,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <path d={d} fill={`url(#beamGrad-${id})`} opacity={0.95} />
      <path
        d={d}
        fill="none"
        stroke="rgba(180,255,160,0.35)"
        strokeWidth={2}
        strokeDasharray="4 6"
      />
    </g>
  );
}

function ProximityMark({ hunter }: { hunter: HunterView }) {
  if (hunter.proximity === "none" || hunter.fainted) return null;
  const icon = hunter.proximity === "danger" ? "❗" : hunter.proximity === "near" ? "❓" : "·";
  return (
    <text x={hunter.x} y={hunter.y - 36} textAnchor="middle" fontSize={18} aria-hidden>
      {icon}
    </text>
  );
}

export function MansionMap({ state, variant, sweepAngle = 0 }: MansionMapProps) {
  const { mansion, walls, hunters, ghostX, ghostY, ghostVisible, batteries, lightning } = state;
  const dark = variant !== "radar";
  const you = hunters[0];
  const beamHunters =
    variant === "tv" || variant === "radar" ? hunters : you ? [you] : [];

  const maskCone =
    variant === "hunter" && you?.flashlightOn && !you.fainted
      ? conePath(you.x, you.y, you.facing, effectiveRange(you.battery), FLASHLIGHT_SPREAD)
      : null;

  return (
    <svg
      className={`mansion-map mansion-map--${variant}${lightning ? " mansion-map--lightning" : ""}`}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Mansion floor"
    >
      <defs>
        {maskCone && (
          <mask id="hunterConeMask">
            <rect width={VIEW_W} height={VIEW_H} fill="white" />
            <path d={maskCone} fill="black" />
          </mask>
        )}
        <filter id="ghostGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        width={VIEW_W}
        height={VIEW_H}
        fill={variant === "radar" ? "#0a1f0a" : lightning ? "#2a3548" : "#0a0812"}
      />

      {Array.from({ length: Math.ceil(mansion.w / 80) }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={i * 80}
          y1={0}
          x2={i * 80}
          y2={mansion.h}
          stroke={variant === "radar" ? "#1a4a1a" : "#1e1a30"}
          strokeWidth={1}
          opacity={0.45}
        />
      ))}
      {Array.from({ length: Math.ceil(mansion.h / 80) }).map((_, i) => (
        <line
          key={`h${i}`}
          x1={0}
          y1={i * 80}
          x2={mansion.w}
          y2={i * 80}
          stroke={variant === "radar" ? "#1a4a1a" : "#1e1a30"}
          strokeWidth={1}
          opacity={0.45}
        />
      ))}

      {walls.map((w, i) => (
        <rect
          key={i}
          x={w.x}
          y={w.y}
          width={w.w}
          height={w.h}
          fill={variant === "radar" ? "#2d6b2d" : "#3d3858"}
          stroke={variant === "radar" ? "#5cff5c" : "#2B2350"}
          strokeWidth={variant === "radar" ? 2 : 4}
          rx={4}
        />
      ))}

      {variant === "radar" && (
        <g transform={`rotate(${(sweepAngle * 180) / Math.PI} ${mansion.w / 2} ${mansion.h / 2})`}>
          <path
            d={`M${mansion.w / 2} ${mansion.h / 2} L${mansion.w / 2 + 520} ${mansion.h / 2 - 80} A520 520 0 0 1 ${mansion.w / 2 + 520} ${mansion.h / 2 + 80} Z`}
            fill="rgba(90,255,90,0.12)"
          />
          <line
            x1={mansion.w / 2}
            y1={mansion.h / 2}
            x2={mansion.w / 2 + 500}
            y2={mansion.h / 2}
            stroke="#7fff7f"
            strokeWidth={3}
            opacity={0.7}
          />
        </g>
      )}

      {batteries.map((b) => (
        <g key={b.id}>
          <rect
            x={b.x - 12}
            y={b.y - 18}
            width={24}
            height={36}
            rx={4}
            fill={b.gold ? "#FFD54A" : "#7AD7FF"}
            stroke="#2B2350"
            strokeWidth={3}
          />
          <rect x={b.x - 6} y={b.y - 24} width={12} height={6} rx={2} fill={b.gold ? "#FFC93C" : "#46B5FF"} />
        </g>
      ))}

      {dark &&
        beamHunters.map((h) => (
          <FlashlightCone
            key={h.sessionId}
            id={`${variant}-${h.sessionId}`}
            hunter={h}
            lit={ghostVisible && ghostX !== null && ghostY !== null}
          />
        ))}

      {hunters.map((h) => (
        <g key={h.sessionId} opacity={h.eliminated ? 0.25 : 1}>
          {h.fainted ? (
            <>
              <circle cx={h.x} cy={h.y} r={26} fill="rgba(80,60,120,0.5)" stroke="#9B5BFF" strokeWidth={4} />
              <text x={h.x} y={h.y - 34} textAnchor="middle" fontSize={16}>
                💜
              </text>
              {h.reviveProgress > 0 && (
                <rect
                  x={h.x - 20}
                  y={h.y - 52}
                  width={40 * (h.reviveProgress / 100)}
                  height={6}
                  rx={3}
                  fill="#FF5BA6"
                />
              )}
            </>
          ) : (
            <>
              <circle
                cx={h.x}
                cy={h.y}
                r={22}
                fill={variant === "radar" ? "none" : h.color}
                stroke={variant === "radar" ? "#7fff7f" : "#2B2350"}
                strokeWidth={variant === "radar" ? 3 : 5}
              />
              <line
                x1={h.x}
                y1={h.y}
                x2={h.x + Math.cos(h.facing) * 28}
                y2={h.y + Math.sin(h.facing) * 28}
                stroke={variant === "radar" ? "#7fff7f" : "#fff"}
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.8}
              />
              <ProximityMark hunter={h} />
            </>
          )}
          {variant === "radar" && (
            <text
              x={h.x}
              y={h.y - 30}
              textAnchor="middle"
              fill="#9fff9f"
              fontFamily="Nunito, sans-serif"
              fontWeight={800}
              fontSize={14}
            >
              {h.name}
            </text>
          )}
        </g>
      ))}

      {ghostX !== null && ghostY !== null && (variant === "radar" || ghostVisible) && (
        <g filter={ghostVisible ? "url(#ghostGlow)" : undefined}>
          <circle
            cx={ghostX}
            cy={ghostY}
            r={26}
            fill={variant === "radar" ? "rgba(180,255,180,0.35)" : "rgba(200,220,255,0.9)"}
            stroke={variant === "radar" ? "#b0ffb0" : "#fff"}
            strokeWidth={4}
            strokeDasharray={variant === "radar" ? "6 4" : undefined}
          />
          <text x={ghostX} y={ghostY + 6} textAnchor="middle" fontSize={22} aria-hidden>
            👻
          </text>
        </g>
      )}

      {variant === "hunter" && (
        <rect
          width={VIEW_W}
          height={VIEW_H}
          fill="rgba(0,0,0,0.93)"
          mask={maskCone ? "url(#hunterConeMask)" : undefined}
        />
      )}

      {lightning && variant !== "radar" && (
        <rect width={VIEW_W} height={VIEW_H} fill="rgba(220,230,255,0.18)" pointerEvents="none" />
      )}
    </svg>
  );
}
