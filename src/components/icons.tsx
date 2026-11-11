type IconProps = { size?: number; className?: string }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
})

export function IconPawn({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path
        d="M12 4.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M9.2 10.2h5.6c.2 1.7-.6 2.9-1.6 3.9h-2.4c-1-1-1.8-2.2-1.6-3.9Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M7.4 17.6h9.2l1 2.6H6.4l1-2.6Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconBook({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M12 6.2C10.2 4.9 7.9 4.2 5 4.2v13.4c2.9 0 5.2.7 7 2 1.8-1.3 4.1-2 7-2V4.2c-2.9 0-5.2.7-7 2Z" />
      <path d="M12 6.2v13.4" />
    </svg>
  )
}

export function IconTrophy({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5v1.5A3.5 3.5 0 0 0 8.5 10M16 5h3v1.5a3.5 3.5 0 0 1-3.5 3.5" />
      <path d="M12 13v3.2M9 20h6M10 20l.6-3.8h2.8l.6 3.8" />
    </svg>
  )
}

export function IconChevron({ size = 20, className, up }: IconProps & { up?: boolean }) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <polyline points={up ? "6 14.5 12 8.5 18 14.5" : "6 9.5 12 15.5 18 9.5"} />
    </svg>
  )
}

export function IconDiamond({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSearch({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15.2 15.2 4.3 4.3" />
    </svg>
  )
}

export function IconUsers({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="9" cy="8.2" r="3" />
      <path d="M3.8 18.5c.4-3 2.4-4.8 5.2-4.8s4.8 1.8 5.2 4.8" />
      <circle cx="16.8" cy="9.4" r="2.3" />
      <path d="M16 13.8c2.3.1 3.9 1.6 4.3 4.2" />
    </svg>
  )
}

export function IconMail({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.6" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  )
}

export function IconBell({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M6.2 16.2c.8-.8 1.2-2 1.2-3.6 0-2.9 1.7-4.8 4.6-4.8s4.6 1.9 4.6 4.8c0 1.6.4 2.8 1.2 3.6H6.2Z" />
      <path d="M10.4 18.6a1.7 1.7 0 0 0 3.2 0" />
    </svg>
  )
}

export function IconSliders({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3" />
      <circle cx="15" cy="7" r="1.8" />
      <circle cx="9" cy="12" r="1.8" />
      <circle cx="15" cy="17" r="1.8" />
    </svg>
  )
}

export function IconTarget({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.6" />
      <path d="m10.6 9.8 4 2.2-4 2.2v-4.4Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconPlusSquare({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M12 8.4v7.2M8.4 12h7.2" />
    </svg>
  )
}

export function IconBoard({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="1.6" />
      <path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" strokeWidth="1.1" />
      <rect x="9.3" y="9.3" width="5.4" height="5.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconFlag({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M6.5 20V4.5" />
      <path d="M6.5 4.8h9.8l-2.2 3.6 2.2 3.6H6.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconClock({ size = 15, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.4V12l3 2.2" />
    </svg>
  )
}

export function IconInfo({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 11.2v4.6" />
      <circle cx="12" cy="8.3" r="0.4" fill="currentColor" />
    </svg>
  )
}

export function IconSwap({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M7 4.5v13M7 17.5l-2.8-2.8M7 17.5l2.8-2.8" />
      <path d="M17 19.5v-13M17 6.5l-2.8 2.8M17 6.5l2.8 2.8" />
    </svg>
  )
}

export function IconFirst({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M6.5 5v14" />
      <path d="M18.5 6 10 12l8.5 6V6Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconPrev({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M15.5 6 7 12l8.5 6V6Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconPlay({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M8.5 6 17 12l-8.5 6V6Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconLast({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M17.5 5v14" />
      <path d="M5.5 6 14 12l-8.5 6V6Z" fill="currentColor" stroke="none" />
    </svg>
  )
}
