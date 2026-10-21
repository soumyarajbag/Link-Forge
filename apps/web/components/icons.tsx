type IconName =
  | 'arrow'
  | 'arrowUp'
  | 'barChart'
  | 'check'
  | 'chevron'
  | 'click'
  | 'copy'
  | 'external'
  | 'globe'
  | 'link'
  | 'menu'
  | 'pause'
  | 'plus'
  | 'qr'
  | 'search'
  | 'settings'
  | 'spark'
  | 'shield'
  | 'slash'
  | 'users'
  | 'x';

export function Icon({ name, size = 18, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    arrowUp: (
      <>
        <path d="M12 19V5" />
        <path d="m6 11 6-6 6 6" />
      </>
    ),
    barChart: (
      <>
        <path d="M4 19V5" />
        <path d="M9 19v-7" />
        <path d="M14 19V8" />
        <path d="M19 19V3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    click: (
      <>
        <path d="m7 7 10 10" />
        <path d="M7 17V7h10" />
        <path d="M13 17h4v-4" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="10" height="10" rx="2" />
        <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      </>
    ),
    external: (
      <>
        <path d="M14 5h5v5" />
        <path d="m19 5-8 8" />
        <path d="M18 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.1.1l1.7-1.7a5 5 0 0 0-7.1-7.1L10.7 5.3" />
        <path d="M14 11a5 5 0 0 0-7.1-.1l-1.7 1.7a5 5 0 0 0 7.1 7.1l1-1" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    qr: (
      <>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2M20 14v6h-4M14 18h2" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path
          d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.3a2 2 0 1 1-4 0v-.2A2 2 0 0 0 5.8 18l-.1.1a2 2 0 1 1-2.8-2.8L3 15.2a2 2 0 0 0-1.4-3.4h-.2a2 2 0 1 1 0-4h.2A2 2 0 0 0 3 4.4l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a2 2 0 0 0 3.4-1.4V0a2 2 0 1 1 4 0v.2A2 2 0 0 0 16.6 2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a2 2 0 0 0 1.4 3.4h.2a2 2 0 1 1 0 4h-.2a2 2 0 0 0-1.4 3.4Z"
          transform="translate(1 1) scale(.92)"
        />
      </>
    ),
    shield: (
      <>
        <path d="M12 21s8-3.5 8-10V5l-8-3-8 3v6c0 6.5 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    slash: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m5.6 5.6 12.8 12.8" />
      </>
    ),
    spark: (
      <path d="m12 3-1.6 5.4L5 10l5.4 1.6L12 17l1.6-5.4L19 10l-5.4-1.6L12 3ZM19 16l-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7L19 16Z" />
    ),
    users: (
      <>
        <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
        <circle cx="10" cy="8" r="3" />
        <path d="M16 4.5a3 3 0 0 1 0 5.8M20 20v-1.4a3.4 3.4 0 0 0-2.5-3.3" />
      </>
    ),
    x: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
  };
  return <svg {...common}>{paths[name]}</svg>;
}
