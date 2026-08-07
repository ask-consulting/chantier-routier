/**
 * Three candidate marks for Chantia.
 *
 * Constraints they all have to meet — a logo for this product is not a picture:
 *
 *   - **Legible at 16 px.** It ends up in a browser tab. Nothing thinner than
 *     ~1.5 px at 48 viewBox units survives that.
 *   - **Works in one colour.** Invoices, a stamp, a fax to a subcontractor.
 *     Hence the `mono` prop rather than a second file.
 *   - **Works on both themes.** Everything is drawn with `currentColor`, so the
 *     mark takes the colour of the text around it unless told otherwise.
 *
 * Geometry only: no gradient, no shadow, no text inside the SVG. A `<text>`
 * element would depend on a font being installed wherever the file is opened —
 * the wordmark is HTML, next to the mark, in `logo.tsx`.
 */

export interface LogoMarkProps {
  size?: number;
  /** Draws the whole mark in `currentColor` — one-colour printing, stamps, faxes. */
  mono?: boolean;
  /** What the road markings are punched out of. Must match what sits behind. */
  background?: string;
  className?: string;
  title?: string;
}

const PRIMARY = 'var(--primary, #1d4ed8)';
const SIGNAL = 'var(--signal, #ea580c)';
const SURFACE = 'var(--surface-raised, #ffffff)';

/**
 * Piste 1 — the C of Chantia drawn as a curve of road, centre line included.
 *
 * The letter and the object are the same shape, which is the strongest thing a
 * mark can do: it reads as a C at a glance and as a road on second look.
 * Weakness: at 16 px the dashes merge into a continuous line and it becomes a
 * plain C.
 */
export function LogoRoadC({
  size = 32,
  mono = false,
  background = SURFACE,
  className,
  title = 'Chantia',
}: LogoMarkProps) {
  // An arc of 260°, open to the right. Drawn once as tarmac, once as marking.
  const arc = 'M33.6 12.5A15 15 0 1 0 33.6 35.5';
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      <path
        d={arc}
        fill="none"
        stroke={mono ? 'currentColor' : PRIMARY}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d={arc}
        fill="none"
        stroke={background}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="3 4.5"
      />
    </svg>
  );
}

/**
 * Piste 2 — stacked signage chevrons, narrowing as they rise.
 *
 * Straight from road furniture, and the narrowing reads as distance. The top
 * chevron in orange gives the eye a destination and uses the brand pair for
 * something rather than for decoration.
 * Weakness: chevrons are common in software marks; it is the least distinctive
 * of the three.
 */
export function LogoChevrons({ size = 32, mono = false, className, title = 'Chantia' }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      <g fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39 24 27 39 39" stroke={mono ? 'currentColor' : PRIMARY} opacity={mono ? 0.45 : 1} />
        <path d="M12 30 24 20 36 30" stroke={mono ? 'currentColor' : PRIMARY} opacity={mono ? 0.72 : 1} />
        <path d="M15 21 24 13 33 21" stroke={mono ? 'currentColor' : SIGNAL} />
      </g>
    </svg>
  );
}

/**
 * Piste 3 — road markings standing up as a measure.
 *
 * Says both halves of the product in one shape: the dashes are road markings,
 * their rising heights are the cost tracking. The dashed baseline is the road
 * they came from.
 * Weakness: at very small sizes it reads as a plain bar chart, which is the most
 * generic thing a SaaS logo can be.
 */
export function LogoRoadChart({ size = 32, mono = false, className, title = 'Chantia' }: LogoMarkProps) {
  const bars = [
    { x: 8, height: 9 },
    { x: 18, height: 15 },
    { x: 28, height: 21 },
    { x: 38, height: 28 },
  ];
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      {bars.map((bar, index) => {
        const last = index === bars.length - 1;
        return (
          <rect
            key={bar.x}
            x={bar.x - 3}
            y={36 - bar.height}
            width="6"
            height={bar.height}
            // Fully rounded ends: the proportions of a road centre marking, not
            // of a chart column.
            rx="3"
            fill={mono ? 'currentColor' : last ? SIGNAL : PRIMARY}
            opacity={mono && !last ? 0.55 + index * 0.15 : 1}
          />
        );
      })}
      <path
        d="M5 41h38"
        stroke={mono ? 'currentColor' : PRIMARY}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 5"
        opacity="0.45"
      />
    </svg>
  );
}

export const LOGO_MARKS = [
  {
    id: 'road-c',
    name: 'Piste 1 — le C de route',
    Mark: LogoRoadC,
    strength: 'La lettre et l’objet sont la même forme. C’est ce qu’un logo peut faire de plus fort.',
    weakness: 'À 16 px les pointillés se rejoignent : il ne reste qu’un C.',
  },
  {
    id: 'chevrons',
    name: 'Piste 2 — chevrons de signalisation',
    Mark: LogoChevrons,
    strength: 'Directement issu du mobilier routier. Le rétrécissement donne la distance.',
    weakness: 'Le chevron est très courant en logiciel : la moins distinctive des trois.',
  },
  {
    id: 'road-chart',
    name: 'Piste 3 — marquage dressé en mesure',
    Mark: LogoRoadChart,
    strength: 'Dit les deux moitiés du produit : le chantier et son coût.',
    weakness: 'En très petit, ça redevient un histogramme — le plus générique des symboles SaaS.',
  },
] as const;
