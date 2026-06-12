interface KeyboardHintProps {
  label?: string;
  keys: { label: string; wide?: boolean; key?: boolean }[];
}

/** Small on-screen reminder for desktop players. */
export function KeyboardHint({ label, keys }: KeyboardHintProps) {
  return (
    <div className="keyboard-hint">
      {label && <span className="keyboard-hint__label">{label}</span>}
      <div className="keyboard-hint__keys">
        {keys.map((item, i) =>
          item.key === false ? (
            <span key={`${item.label}-${i}`} className="keyboard-hint__sep">
              {item.label}
            </span>
          ) : (
            <kbd
              key={`${item.label}-${i}`}
              className={item.wide ? "keyboard-hint__key--wide" : undefined}
            >
              {item.label}
            </kbd>
          ),
        )}
      </div>
    </div>
  );
}

export function VolleyKeyboardHint() {
  return (
    <KeyboardHint
      keys={[
        { label: "←" },
        { label: "A" },
        { label: "move", key: false },
        { label: "D" },
        { label: "→" },
        { label: "·", key: false },
        { label: "Space", wide: true },
        { label: "jump", key: false },
      ]}
    />
  );
}

export function TapSprintKeyboardHint() {
  return (
    <KeyboardHint
      keys={[
        { label: "Space", wide: true },
        { label: "or", key: false },
        { label: "Enter", wide: true },
        { label: "to tap", key: false },
      ]}
    />
  );
}
