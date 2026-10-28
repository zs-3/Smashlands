import React from 'react';
import { WeaponId } from '../game/catalog';

export const TitleLogoSvg: React.FC<{ className?: string }> = ({ className = 'h-16 w-auto' }) => (
  <svg
    viewBox="0 0 460 92"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="TurboSmash Karts"
  >
    <defs>
      <linearGradient id="ts_grad_top" x1="0" y1="0" x2="460" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="48%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#ef4444" />
      </linearGradient>
      <linearGradient id="ts_grad_sub" x1="0" y1="0" x2="260" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
    {/* Speed wing emblem */}
    <path d="M12 22L46 14L36 44L6 48L12 22Z" fill="#facc15" />
    <path d="M22 54L52 48L44 72L16 74L22 54Z" fill="#ef4444" />
    <circle cx="34" cy="45" r="8" fill="#090d16" stroke="#38bdf8" strokeWidth="3" />

    {/* Main Wordmark */}
    <text
      x="64"
      y="52"
      fill="#090d16"
      stroke="#090d16"
      strokeWidth="9"
      strokeLinejoin="round"
      fontFamily="Outfit, sans-serif"
      fontWeight="900"
      fontSize="44"
      letterSpacing="-1"
    >
      TURBOSMASH
    </text>
    <text
      x="62"
      y="50"
      fill="url(#ts_grad_top)"
      fontFamily="Outfit, sans-serif"
      fontWeight="900"
      fontSize="44"
      letterSpacing="-1"
    >
      TURBOSMASH
    </text>

    {/* Sub-lockup */}
    <rect x="64" y="61" width="174" height="22" rx="4" fill="#090d16" fillOpacity="0.88" stroke="url(#ts_grad_sub)" strokeWidth="1.5" />
    <text
      x="151"
      y="76"
      textAnchor="middle"
      fill="#f8fafc"
      fontFamily="Outfit, sans-serif"
      fontWeight="800"
      fontSize="13"
      letterSpacing="3.5"
    >
      3D KART ARENA
    </text>
  </svg>
);

export const WeaponSvgIcon: React.FC<{ weaponId: WeaponId | null; className?: string }> = ({
  weaponId,
  className = 'w-9 h-9',
}) => {
  if (!weaponId) {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className}>
        <rect x="7" y="7" width="34" height="34" rx="7" stroke="#64748b" strokeWidth="2.5" strokeDasharray="5 4" />
        <text
          x="24"
          y="31"
          textAnchor="middle"
          fill="#94a3b8"
          fontFamily="Outfit, sans-serif"
          fontWeight="900"
          fontSize="24"
        >
          ?
        </text>
      </svg>
    );
  }

  switch (weaponId) {
    case 'homing_rocket':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className}>
          <path d="M36 12L26 14L14 26L18 30L22 34L34 22L36 12Z" fill="#ef4444" stroke="#f8fafc" strokeWidth="2" />
          <path d="M14 26L8 28L12 32" fill="#f97316" />
          <path d="M22 34L20 40L16 36" fill="#f97316" />
          <circle cx="27" cy="21" r="3" fill="#fef08a" />
          <path d="M13 35L7 41" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'twin_minigun':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className}>
          <rect x="8" y="16" width="24" height="6" rx="2" fill="#f59e0b" />
          <rect x="8" y="26" width="24" height="6" rx="2" fill="#f59e0b" />
          <rect x="6" y="14" width="8" height="20" rx="2" fill="#cbd5e1" />
          <circle cx="38" cy="19" r="2.5" fill="#fef08a" />
          <circle cx="41" cy="29" r="2.5" fill="#fef08a" />
        </svg>
      );
    case 'landmine':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className}>
          <ellipse cx="24" cy="30" rx="15" ry="7" fill="#475569" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="24" cy="24" r="6" fill="#f43f5e" />
          <path d="M24 11V15M13 16L16 19M35 16L32 19" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'lob_grenuke':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="23" cy="27" r="12" fill="#a855f7" stroke="#f8fafc" strokeWidth="2" />
          <path d="M29 16L34 11" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
          <circle cx="36" cy="10" r="3.5" fill="#facc15" />
          <circle cx="19" cy="23" r="3" fill="#f0abfc" />
        </svg>
      );
    case 'triple_cannon':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="15" cy="29" r="7" fill="#334155" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="33" cy="29" r="7" fill="#334155" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="24" cy="17" r="7" fill="#475569" stroke="#f8fafc" strokeWidth="2" />
        </svg>
      );
    case 'star_shield':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className}>
          <path
            d="M24 6L29.2 17.4L41.6 18.8L32.4 27.3L34.9 39.6L24 33.4L13.1 39.6L15.6 27.3L6.4 18.8L18.8 17.4L24 6Z"
            fill="#facc15"
            stroke="#fef9c3"
            strokeWidth="2"
          />
        </svg>
      );
    case 'turbo_flame':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className}>
          <path
            d="M26 7C26 7 37 16 37 27C37 34.7 31.2 41 24 41C16.8 41 11 34.7 11 27C11 21 15 16 18 13C17.5 18 21 20 21 20C20 13 26 7 26 7Z"
            fill="#06b6d4"
            stroke="#cffafe"
            strokeWidth="2"
          />
          <path d="M24 23C24 23 29 27 29 32C29 35 26.8 37 24 37C21.2 37 19 35 19 32C19 29 24 23 24 23Z" fill="#facc15" />
        </svg>
      );
  }
};

export const CrownSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 18L5 7L10 12L12 5L14 12L19 7L21 18H3Z" fill="#facc15" stroke="#eab308" strokeWidth="1.5" />
  </svg>
);

export const CoinSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="9" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
    <circle cx="12" cy="12" r="5.5" stroke="#fef08a" strokeWidth="1.5" />
  </svg>
);
