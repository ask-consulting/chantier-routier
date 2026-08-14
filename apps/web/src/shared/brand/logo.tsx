import { cn } from '@/shared/lib/cn';

/**
 * The Chantia mark: a gear ring around a hard hat with a cursor.
 *
 * The ring is generated — twelve identical teeth, exact arcs — and softened at
 * the corners. The helmet comes from the original drawing, kept as it was.
 *
 * Everything is geometry and two flat colours: no gradient, no shadow, no text
 * inside the SVG. A `<text>` element would depend on a font being installed
 * wherever the file is opened, so the wordmark is HTML, next to the mark.
 *
 * See docs/11-design-system.md §11 for when to use which piece.
 */

export interface LogoProps {
  /** Rendered size in pixels, square. */
  size?: number;
  /** Draws the whole mark in `currentColor` — one-colour print, stamps, faxes. */
  mono?: boolean;
  className?: string;
  /** Accessible name. Set to `''` when a visible label already says "Chantia". */
  title?: string;
}

/* The logo's own colours, not the interface's: a mark keeps its colours when the
 * UI changes its mind, and in both themes. Defined in globals.css. */
const RING = 'var(--brand-ring, #2c3e50)';
const SHELL = 'var(--brand-shell, #ffc627)';
const SURFACE = 'var(--surface-raised, #ffffff)';

/* Measured on the original drawing, so the rebuilt ring keeps its proportions. */
const CX = 509.3;
const CY = 447.1;
const R_TIP = 332.8;
const R_ROOT = 282;
const R_HOLE = 213;
const TEETH = 12;

/**
 * The ring, computed once at module load.
 *
 * Generated rather than traced: an auto-trace follows a contour pixel by pixel,
 * so the twelve teeth each came out slightly different and the root circle was
 * not a circle — invisible at 400 px, plainly visible in a header.
 */
const GEAR = (() => {
  const step = 360 / TEETH;
  const at = (r: number, deg: number): string => {
    const a = (deg * Math.PI) / 180;
    return `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY + r * Math.sin(a)).toFixed(2)}`;
  };
  let d = '';
  for (let i = 0; i < TEETH; i += 1) {
    const a = i * step;
    // Tooth and gap take 40% of the pitch each, the two flanks 10% each.
    d += `${i === 0 ? 'M' : 'L'}${at(R_ROOT, a)}`;
    d += `A${R_ROOT} ${R_ROOT} 0 0 1 ${at(R_ROOT, a + step * 0.2)}`;
    d += `L${at(R_TIP, a + step * 0.3)}`;
    d += `A${R_TIP} ${R_TIP} 0 0 1 ${at(R_TIP, a + step * 0.7)}`;
    d += `L${at(R_ROOT, a + step * 0.8)}`;
  }
  return `${d}Z`;
})();

/** The symbol on its own. Favicon, collapsed sidebar, avatar. */
export function LogoMark({ size = 32, mono = false, className, title = 'Chantia' }: LogoProps) {
  const fill = mono ? 'currentColor' : RING;
  return (
    <svg
      viewBox="168 105 683 685"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {/* Corners rounded by stroking the shape in its own colour: one line
        * instead of forty computed fillets, and the stroke thickens the teeth a
        * little, which helps them hold at small sizes. */}
      <path d={GEAR} fill={fill} stroke={fill} strokeWidth="14" strokeLinejoin="round" />
      <circle cx={CX} cy={CY} r={R_HOLE} fill={SURFACE} />

      {/* The helmet, in potrace's flipped tenth-scale space so its paths need no
        * rewriting; the transform places and scales it in the opening. */}
      <g transform="translate(0,1024) scale(0.1,-0.1)">
        <g transform="translate(5093 5769) scale(1.7) translate(-5270 -6785)">
          {/* A trace describes the ink, not the object: painting the path itself
            * would colour the outlines and leave the shell hollow. The body
            * comes from the outer subpath, the linework goes back on top. */}
          <path fill={mono ? 'currentColor' : SHELL} d="M5169 7509c-101 -10 -149 -30 -149 -62c0 -19 -9 -26 -52 -42c-99 -34 -150 -65 -145 -85c3 -13 -9 -28 -49 -55c-105 -72 -217 -211 -267 -330c-47 -112 -61 -182 -61 -312c-1 -89 -4 -123 -13 -123c-25 0 -60 -23 -76 -50c-22 -36 -21 -99 1 -126c39 -49 35 -49 585 -52c435 -3 517 -5 517 -17c0 -8 5 -37 11 -65c8 -35 15 -50 27 -50c9 0 42 27 72 61l56 61l63 -96c35 -52 69 -101 77 -107c11 -9 28 -2 78 31c94 60 93 60 52 122c-20 29 -36 56 -36 60c0 5 56 8 124 8l124 0l31 35c54 62 34 148 -42 180l-29 12l-3 124c-3 147 -24 230 -90 359c-52 100 -136 197 -234 269c-45 34 -68 57 -65 66c8 19 -38 46 -126 76c-58 19 -70 27 -70 45c0 29 -15 39 -75 52c-77 16 -152 20 -236 11z" />
          <path fillRule="evenodd" fill={fill} d="M5169 7509c-101 -10 -149 -30 -149 -62c0 -19 -9 -26 -52 -42c-99 -34 -150 -65 -145 -85c3 -13 -9 -28 -49 -55c-105 -72 -217 -211 -267 -330c-47 -112 -61 -182 -61 -312c-1 -89 -4 -123 -13 -123c-25 0 -60 -23 -76 -50c-22 -36 -21 -99 1 -126c39 -49 35 -49 585 -52c435 -3 517 -5 517 -17c0 -8 5 -37 11 -65c8 -35 15 -50 27 -50c9 0 42 27 72 61l56 61l63 -96c35 -52 69 -101 77 -107c11 -9 28 -2 78 31c94 60 93 60 52 122c-20 29 -36 56 -36 60c0 5 56 8 124 8l124 0l31 35c54 62 34 148 -42 180l-29 12l-3 124c-3 147 -24 230 -90 359c-52 100 -136 197 -234 269c-45 34 -68 57 -65 66c8 19 -38 46 -126 76c-58 19 -70 27 -70 45c0 29 -15 39 -75 52c-77 16 -152 20 -236 11zM5337 7459c43 -6 82 -14 87 -19c5 -5 1 -111 -10 -252c-10 -134 -15 -252 -11 -262c4 -10 15 -16 24 -14c16 3 20 30 35 227c9 123 19 226 22 229c9 8 128 -41 133 -55c3 -6 -2 -46 -11 -88c-22 -108 -21 -127 7 -123c19 3 24 13 36 73c8 39 16 72 17 74c7 8 106 -73 153 -125c139 -152 207 -350 199 -576l-3 -81l47 -14c51 -14 66 -39 54 -86c-9 -37 -46 -47 -173 -47c-99 0 -118 3 -129 18c-23 30 -16 39 49 62c69 26 98 46 91 64c-3 7 -42 35 -87 62c-45 27 -131 80 -192 118c-277 174 -306 189 -319 167c-4 -7 30 -208 49 -288l5 -23l-334 0c-222 0 -337 -4 -341 -10c-4 -6 -1 -17 5 -25c11 -13 66 -15 345 -15l333 0l11 -50c6 -28 11 -58 11 -65c0 -13 -70 -15 -505 -15l-506 0l-25 26c-20 19 -24 31 -19 52c9 38 28 54 72 61l38 6l-3 115c-8 266 86 469 292 632c27 21 50 37 52 36c2 -3 54 -244 54 -254c0 -7 39 -4 43 4c6 8 -38 242 -52 284c-9 24 -7 30 12 42c28 18 125 52 131 46c2 -3 12 -93 22 -200c17 -196 29 -239 56 -212c11 11 1 182 -23 391c-6 53 -6 88 -1 93c10 10 91 24 149 27c17 0 67 -4 110 -10zM5678 6586c106 -66 192 -122 192 -126c0 -4 -26 -17 -59 -29c-93 -34 -93 -34 -12 -155c39 -58 71 -108 71 -110c0 -7 -72 -56 -82 -56c-4 0 -39 47 -78 105c-39 58 -76 105 -83 105c-6 0 -35 -25 -62 -56l-51 -56l-23 123c-13 68 -36 189 -52 269c-16 80 -29 146 -29 148c0 4 22 -9 268 -162z" />
        </g>
      </g>
    </svg>
  );
}

export interface LogoLockupProps extends LogoProps {
  /** Hides the wordmark — same as using `LogoMark` directly, but reads better in a layout. */
  markOnly?: boolean;
}

/**
 * Mark plus wordmark. The default for a header.
 *
 * The wordmark is HTML, not `<text>`: it renders in the interface font, stays
 * selectable, and follows the theme.
 */
export function Logo({ size = 30, markOnly = false, className, ...props }: LogoLockupProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} title={markOnly ? 'Chantia' : ''} {...props} />
      {!markOnly && (
        <span className="text-lg font-semibold tracking-tight text-fg">Chantia</span>
      )}
    </span>
  );
}
