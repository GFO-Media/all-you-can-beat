import type { BlobbyVolleyState } from "@ayb/blobby-volley/types";

interface VolleyCourtProps {
  state: BlobbyVolleyState;
  highlightBlobId?: string | null;
}

/** SVG arena rendered from authoritative server state. */
export function VolleyCourt({ state, highlightBlobId }: VolleyCourtProps) {
  const { court, blobs, ball, scores } = state;
  const viewW = 1000;
  const viewH = 600;

  return (
    <svg
      className="volley-court"
      viewBox={`0 0 ${viewW} ${viewH}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Volleyball court"
    >
      <defs>
        <linearGradient id="volleySky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7AD7FF" />
          <stop offset="100%" stopColor="#46B5FF" />
        </linearGradient>
        <linearGradient id="volleySand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE08A" />
          <stop offset="100%" stopColor="#FFC93C" />
        </linearGradient>
      </defs>

      <rect width={viewW} height={viewH} fill="url(#volleySky)" />
      <rect
        x={0}
        y={court.groundY}
        width={viewW}
        height={viewH - court.groundY}
        fill="url(#volleySand)"
      />
      <line
        x1={0}
        y1={court.groundY}
        x2={viewW}
        y2={court.groundY}
        stroke="#2B2350"
        strokeWidth={6}
      />

      {/* Net */}
      <rect
        x={court.netX - 7}
        y={court.netTop}
        width={14}
        height={court.groundY - court.netTop}
        fill="#fff"
        stroke="#2B2350"
        strokeWidth={4}
        rx={4}
      />
      {Array.from({ length: 8 }).map((_, i) => {
        const y = court.netTop + ((court.groundY - court.netTop) / 8) * (i + 0.5);
        return (
          <line
            key={i}
            x1={court.netX - 30}
            y1={y}
            x2={court.netX + 30}
            y2={y}
            stroke="#2B2350"
            strokeWidth={2}
            opacity={0.35}
          />
        );
      })}

      {/* Score badges */}
      <g fontFamily="Fredoka, sans-serif" fontWeight={700}>
        <rect x={24} y={20} width={120} height={52} rx={14} fill="#FF5BA6" stroke="#2B2350" strokeWidth={4} />
        <text x={84} y={54} textAnchor="middle" fill="#fff" fontSize={28}>
          {scores[0]}
        </text>
        <rect x={856} y={20} width={120} height={52} rx={14} fill="#3DDC84" stroke="#2B2350" strokeWidth={4} />
        <text x={916} y={54} textAnchor="middle" fill="#fff" fontSize={28}>
          {scores[1]}
        </text>
      </g>

      {/* Blobs */}
      {blobs.map((blob) => {
        const isYou = blob.id === highlightBlobId;
        return (
          <g key={blob.id}>
            <ellipse
              cx={blob.x}
              cy={blob.y + blob.r * 0.15}
              rx={blob.r * 0.9}
              ry={blob.r * 0.25}
              fill="rgba(43,35,80,0.2)"
            />
            <circle
              cx={blob.x}
              cy={blob.y}
              r={blob.r}
              fill={blob.color}
              stroke={isYou ? "#FFC93C" : "#2B2350"}
              strokeWidth={isYou ? 8 : 5}
            />
            <circle cx={blob.x - 14} cy={blob.y - 8} r={5} fill="#2B2350" />
            <circle cx={blob.x + 14} cy={blob.y - 8} r={5} fill="#2B2350" />
            <path
              d={`M${blob.x - 16} ${blob.y + 10} Q${blob.x} ${blob.y + 22} ${blob.x + 16} ${blob.y + 10}`}
              fill="none"
              stroke="#2B2350"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <text
              x={blob.x}
              y={blob.y - blob.r - 12}
              textAnchor="middle"
              fontFamily="Nunito, sans-serif"
              fontWeight={800}
              fontSize={18}
              fill="#2B2350"
            >
              {blob.name}
            </text>
          </g>
        );
      })}

      {/* Ball */}
      {state.ballFloating && (
        <circle
          cx={ball.x}
          cy={ball.y}
          r={ball.r + 14}
          fill="none"
          stroke="#FFC93C"
          strokeWidth={3}
          strokeDasharray="8 6"
          opacity={0.85}
        />
      )}
      <circle
        cx={ball.x}
        cy={ball.y}
        r={ball.r}
        fill="#fff"
        stroke="#2B2350"
        strokeWidth={4}
      />
      <path
        d={`M${ball.x - 8} ${ball.y - 6} Q${ball.x} ${ball.y + 10} ${ball.x + 10} ${ball.y - 4}`}
        fill="none"
        stroke="#FF5BA6"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}
