import React from 'react'

export function SnackIcon({ name, size=80 }) {
  const w = size, h = size
  const common = { width: w, height: h, viewBox: '0 0 100 100' }
  const label = (name||'Snack').toLowerCase()

  if (label.includes('popcorn')) {
    return (
      <svg {...common} aria-label="Popcorn icon">
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd166"/>
            <stop offset="100%" stopColor="#ffb703"/>
          </linearGradient>
        </defs>
        {/* bucket */}
        <rect x="25" y="40" width="50" height="45" rx="6" fill="#ef233c" />
        <rect x="28" y="40" width="6" height="45" fill="#ffffffaa"/>
        <rect x="40" y="40" width="6" height="45" fill="#ffffffaa"/>
        <rect x="52" y="40" width="6" height="45" fill="#ffffffaa"/>
        <rect x="64" y="40" width="6" height="45" fill="#ffffffaa"/>
        {/* corn */}
        <g fill="url(#pg)">
          <circle cx="35" cy="38" r="9"/>
          <circle cx="47" cy="35" r="10"/>
          <circle cx="60" cy="38" r="9"/>
          <circle cx="53" cy="28" r="7"/>
        </g>
      </svg>
    )
  }

  if (label.includes('coke') || label.includes('cola')) {
    return (
      <svg {...common} aria-label="Coke can icon">
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444"/>
            <stop offset="100%" stopColor="#991b1b"/>
          </linearGradient>
        </defs>
        {/* can */}
        <rect x="35" y="18" width="30" height="64" rx="6" fill="url(#cg)" stroke="#ffffff66"/>
        <rect x="34" y="18" width="32" height="10" rx="4" fill="#ddd" />
        <path d="M40,50 C45,55 55,45 60,50" stroke="#fff" strokeWidth="4" fill="none"/>
      </svg>
    )
  }

  if (label.includes('nacho')) {
    return (
      <svg {...common} aria-label="Nachos icon">
        {/* plate */}
        <ellipse cx="50" cy="78" rx="30" ry="8" fill="#94a3b8"/>
        {/* chips */}
        <polygon points="35,65 50,35 65,65" fill="#fbbf24" stroke="#d97706"/>
        <polygon points="25,70 38,45 51,70" fill="#f59e0b" stroke="#b45309"/>
        <polygon points="49,72 62,50 75,72" fill="#f59e0b" stroke="#b45309"/>
      </svg>
    )
  }

  if (label.includes('samosa')) {
    return (
      <svg {...common} aria-label="Samosa icon">
        <polygon points="50,25 80,75 20,75" fill="#d97706" stroke="#92400e"/>
        <circle cx="50" cy="55" r="3" fill="#b45309"/>
        <ellipse cx="50" cy="78" rx="28" ry="5" fill="#94a3b8"/>
      </svg>
    )
  }

  // generic fallback
  return (
    <svg {...common} aria-label="Snack icon">
      <circle cx="50" cy="50" r="40" fill="#64748b" />
    </svg>
  )
}

export default SnackIcon
