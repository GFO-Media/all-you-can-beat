interface BlobAvatarProps {
  color: string;
  variant?: number;
  size?: number;
}

/** Bean-shaped party blob, Fall Guys style. Variants change the face. */
export function BlobAvatar({ color, variant = 0, size = 40 }: BlobAvatarProps) {
  const v = ((variant % 4) + 4) % 4;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path
        d="M32 6c-12 0-19 9.5-19 24 0 15.5 8 28 19 28s19-12.5 19-28C51 15.5 44 6 32 6z"
        fill={color}
        stroke="#1a1432"
        strokeWidth="4.5"
      />
      {v === 0 && (
        <>
          <circle cx="26" cy="28" r="3.2" fill="#2B2350" />
          <circle cx="38" cy="28" r="3.2" fill="#2B2350" />
          <path d="M26 38q6 5 12 0" fill="none" stroke="#2B2350" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {v === 1 && (
        <>
          <path d="M22 27l7 3M42 27l-7 3" stroke="#2B2350" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="39" r="4" fill="#2B2350" />
        </>
      )}
      {v === 2 && (
        <>
          <circle cx="26" cy="28" r="3.2" fill="#2B2350" />
          <circle cx="38" cy="28" r="3.2" fill="#2B2350" />
          <ellipse cx="32" cy="39" rx="4.5" ry="5.5" fill="#2B2350" />
        </>
      )}
      {v === 3 && (
        <>
          <path d="M23 29q3-4 6 0M35 29q3-4 6 0" fill="none" stroke="#2B2350" strokeWidth="3" strokeLinecap="round" />
          <path d="M25 38q7 7 14 0" fill="none" stroke="#2B2350" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
