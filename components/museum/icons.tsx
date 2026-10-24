export function PlayIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
    </svg>
  );
}

export function VolumeIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h4l5-4v12l-5-4H4zM16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function MuteIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h4l5-4v12l-5-4H4z" fill="currentColor" />
      <path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  const rotation = direction === "left" ? "rotate(180 12 12)" : undefined;
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" transform={rotation} />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg className="phone_svg" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="18" y="8" width="28" height="48" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M26 14h12" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
