interface TopBarProps {
  title?: string;
  badge?: string;
}

export function TopBar({ title = "All You Can Beat", badge }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <span className="top-bar__logo" aria-hidden>
          🏆
        </span>
        <span className="top-bar__title">{title}</span>
      </div>
      {badge && <span className="top-bar__badge">{badge}</span>}
    </header>
  );
}
