import type { LogoMarkProps } from './logo-marks';

/**
 * Three marks redrawn from the Recraft exploration.
 *
 * Not traced: redrawn from geometry. An auto-traced logo carries hundreds of
 * nodes, circles that are not circles and a symmetry that is only approximate —
 * invisible at full size, obvious at 16 px and in print. These are built from
 * arcs, rectangles and straight lines, so every edge is exact.
 *
 * Each one is also *simplified* against its reference. The generated versions
 * lose their detail below about 24 px: stripes merge, legs vanish, tracks turn
 * into a bar. What survives is what is drawn here — fewer parts, heavier.
 *
 * (A human redrawing is also what makes the mark protectable: a raw generator
 * output carries no copyright.)
 */

const PRIMARY = 'var(--primary, #1d4ed8)';
const SIGNAL = 'var(--signal, #ea580c)';
const SURFACE = 'var(--surface-raised, #ffffff)';

/**
 * Piste 9 — the beacon.
 *
 * The best balance of the nine generated: specific to road works, far less used
 * than a cone, and built from two masses that cannot merge. The rays are the
 * only fragile part, which is why there are four of them and not seven.
 */
export function LogoBeacon({
  size = 32,
  mono = false,
  className,
  title = 'Chantia',
}: LogoMarkProps) {
  const dark = mono ? 'currentColor' : PRIMARY;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      {/* Four rays, thick and short. The reference had seven thin ones — they
        * become a grey halo below 24 px. */}
      <g
        stroke={mono ? 'currentColor' : SIGNAL}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={mono ? 0.55 : 1}
      >
        <path d="M24 10V4" />
        <path d="M13.4 14.4 9.2 10.2" />
        <path d="M34.6 14.4l4.2-4.2" />
      </g>
      {/* Dome: a straight skirt topped by a true half-circle. */}
      <path d="M15 35v-6a9 9 0 0 1 18 0v6z" fill={mono ? 'currentColor' : SIGNAL} />
      <rect x="11" y="35" width="26" height="8" rx="2.5" fill={dark} />
    </svg>
  );
}

/**
 * Piste 10 — the barrier, recomposed square.
 *
 * The generated one was markedly wider than tall, which is awkward everywhere
 * the frame is square: favicon, avatar, app tile. Here the panel is shorter and
 * the legs splay further, so the mark sits in a square.
 *
 * Three stripes instead of five, at nearly double the width: five merge into a
 * flat orange block by 16 px.
 */
export function LogoBarrier({
  size = 32,
  mono = false,
  background = SURFACE,
  className,
  title = 'Chantia',
}: LogoMarkProps) {
  const dark = mono ? 'currentColor' : PRIMARY;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      {/* Legs and crossbar first, so the panel sits on top of the joins. */}
      <g stroke={dark} strokeWidth="3.4" strokeLinecap="round">
        <path d="M15 26 10 43" />
        <path d="M33 26l5 17" />
        <path d="M15.5 37h17" />
      </g>
      <rect x="5" y="10" width="38" height="17" rx="2.5" fill={dark} />
      <rect x="8.5" y="13.5" width="31" height="10" fill={mono ? background : SIGNAL} />
      {/* Stripes clipped to the panel: drawn as a group so the diagonals cannot
        * spill past the frame at any size. */}
      <g clipPath="url(#barrier-panel)">
        <g stroke={background} strokeWidth="4.4">
          <path d="M9 27 20 11" />
          <path d="M20 27 31 11" />
          <path d="M31 27 42 11" />
        </g>
      </g>
      <defs>
        <clipPath id="barrier-panel">
          <rect x="8.5" y="13.5" width="31" height="10" />
        </clipPath>
      </defs>
    </svg>
  );
}

/**
 * Piste 11 — the roller, redrawn.
 *
 * Closest to its reference of the three, because that one was already sound. The
 * cab is a solid mass rather than an open frame: a 2 px frame is a grey smudge
 * at 16 px, and the machine is recognised by its drum, never by its cab.
 */
export function LogoRollerRedrawn({
  size = 32,
  mono = false,
  background = SURFACE,
  className,
  title = 'Chantia',
}: LogoMarkProps) {
  const dark = mono ? 'currentColor' : PRIMARY;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      {/* Cab. */}
      <path d="M19 20h9a2 2 0 0 1 2 2v3H19z" fill={dark} />
      {/* Body, one shape from cab to rear. */}
      <path d="M14 25h24a3 3 0 0 1 3 3v6H14z" fill={mono ? 'currentColor' : SIGNAL} />
      {/* Rear wheel. */}
      <circle cx="36" cy="36" r="6" fill={dark} />
      <circle cx="36" cy="36" r="2" fill={background} />
      {/* The drum: oversized, and the whole recognition of the machine. */}
      <circle cx="16" cy="32" r="11" fill={dark} />
      <circle cx="16" cy="32" r="4" fill={background} />
    </svg>
  );
}

export const REDRAWN_MARKS = [
  {
    id: 'beacon',
    name: 'Piste 9 — le gyrophare',
    Mark: LogoBeacon,
    strength:
      'Deux masses qui ne peuvent pas fusionner, spécifique à la route, bien moins vu que le cône.',
    weakness: 'Les rayons sont la partie fragile — j’en ai gardé trois sur sept.',
  },
  {
    id: 'barrier',
    name: 'Piste 10 — la barrière recomposée',
    Mark: LogoBarrier,
    strength: 'La plus franche, comprise instantanément. Recadrée pour tenir dans un carré.',
    weakness: 'Très proche de l’icône standard de barricade : distinctivité faible.',
  },
  {
    id: 'roller-redrawn',
    name: 'Piste 11 — le compacteur redessiné',
    Mark: LogoRollerRedrawn,
    strength: 'Une pelleteuse dit « BTP », un compacteur dit « route ». Le tambour porte tout.',
    weakness: 'Reste la plus chargée des trois : cab, corps, deux roues.',
  },
] as const;
