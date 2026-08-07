import type { LogoMarkProps } from './logo-marks';

/**
 * Three figurative marks: the road works themselves, rather than an abstraction.
 *
 * A different family from the first three, and a different bet. An abstract mark
 * has to be *learnt* — nobody reads a curve as "road works" until they are told.
 * A figurative one is understood immediately by a foreman who has never seen the
 * product, which for a trade tool is worth a lot.
 *
 * The price is paid at small sizes: a machine has parts, and parts merge. The
 * comparison page shows all three at 16 px first, deliberately — that is where
 * this family either survives or does not.
 *
 * Drawn, not photographed: a photograph is not a logo. It cannot be printed in
 * one colour, embroidered on a polo shirt, or read in a browser tab.
 */

const PRIMARY = 'var(--primary, #1d4ed8)';
const SIGNAL = 'var(--signal, #ea580c)';
const SURFACE = 'var(--surface-raised, #ffffff)';

/**
 * Piste 4 — the roller.
 *
 * The machine most specific to road building: an excavator says "construction",
 * a roller says "road". The silhouette is carried by one big drum, which is what
 * lets it hold together when everything else has merged.
 */
export function LogoRoller({
  size = 32,
  mono = false,
  background = SURFACE,
  className,
  title = 'Chantia',
}: LogoMarkProps) {
  const body = mono ? 'currentColor' : PRIMARY;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      {/* Chassis and cab, one shape so nothing can separate at small sizes. */}
      <path
        d="M17 21h10a3 3 0 0 1 3 3v4h8a3 3 0 0 1 3 3v5H17z"
        fill={body}
      />
      {/* Rear wheel. */}
      <circle cx="36" cy="37" r="6" fill={body} />
      <circle cx="36" cy="37" r="2.2" fill={background} />
      {/* The drum: oversized on purpose — it is the whole recognition. */}
      <circle cx="15" cy="33" r="10" fill={mono ? 'currentColor' : SIGNAL} />
      <circle cx="15" cy="33" r="3.6" fill={background} />
    </svg>
  );
}

/**
 * Piste 5 — the traffic cone.
 *
 * The most instantly readable object of the three, and the one that survives
 * smallest: two shapes and two bands. Its problem is not legibility but
 * ownership — a cone is the single most used symbol in the trade, so the mark
 * would say "road works" without ever saying "Chantia".
 */
export function LogoCone({
  size = 32,
  mono = false,
  background = SURFACE,
  className,
  title = 'Chantia',
}: LogoMarkProps) {
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
        d="M21.5 8.5a2.8 2.8 0 0 1 5 0L33 36H15z"
        fill={mono ? 'currentColor' : SIGNAL}
      />
      {/* Reflective bands, punched out rather than drawn on top: they stay
        * correct whatever the cone is filled with. */}
      <path d="M18.6 24.5h10.8l1 4.5H17.6z" fill={background} />
      <rect x="8" y="36" width="32" height="5.5" rx="2.75" fill={mono ? 'currentColor' : PRIMARY} />
    </svg>
  );
}

/**
 * Piste 6 — the works sign.
 *
 * The triangle is read as "road works" across all of Europe before anything
 * inside it is even seen, which does the work of a logo for free.
 *
 * The pictogram inside is deliberately *not* the standard digging figure: that
 * one is a public traffic sign, so it belongs to nobody and cannot be
 * registered. A road curve takes its place — it is what makes the mark ours
 * rather than a photograph of a sign.
 */
export function LogoWorksSign({
  size = 32,
  mono = false,
  background = SURFACE,
  className,
  title = 'Chantia',
}: LogoMarkProps) {
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
        d="M20.5 8.6a4 4 0 0 1 7 0l14.2 26.2a4 4 0 0 1-3.5 5.9H9.8a4 4 0 0 1-3.5-5.9z"
        fill={mono ? 'currentColor' : SIGNAL}
      />
      {/* The road, narrowing with distance, its centre line dashed. */}
      <path d="M18 36 22.6 20h2.8L30 36z" fill={background} />
      <path
        d="M24 21v13"
        stroke={mono ? 'currentColor' : PRIMARY}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2.5 3"
      />
    </svg>
  );
}


/** The figure, drawn once and reused at two scales. */
function ShovelFigure({ fill, mound }: { fill: string; mound: string }) {
  return (
    <g>
      {/* The heap first, so the blade sinks into it rather than sitting on top. */}
      <path d="M3 41q4-13 9.5-13T22 41z" fill={mound} />
      {/* Shovel: handle and blade in one stroke, blade squared off by the cap. */}
      <path d="M31 15 16.5 30" stroke={fill} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17.5 27.5 12 33l4.5 4.5 5.5-5.5z" fill={fill} />
      {/* Head, torso and legs as filled masses: strokes of this weight break up
        * before the fills do when the mark is scaled down. */}
      <circle cx="30.5" cy="10.5" r="4.3" fill={fill} />
      <path d="M28.6 15.4a3 3 0 0 1 4.6 1.6l1.8 7.4-4 3.2-4.4-6.6z" fill={fill} />
      <path
        d="M26.6 21.6 34 24.4l-1.4 6.2 3.2 9.4-4.2 1.4-3.6-9.6-5 6.4-3.6-2.6 5.4-8z"
        fill={fill}
      />
    </g>
  );
}

/**
 * Piste 7 — the man with the shovel.
 *
 * The image of road works in France. Nobody has to be told what it means.
 *
 * Not traced from the AK5 sign: that pictogram is a regulatory traffic sign, so
 * it belongs to nobody and cannot be registered. This is our own figure, in the
 * same pose — same instant reading, ours to own.
 */
export function LogoShovelMan({
  size = 32,
  mono = false,
  className,
  title = 'Chantia',
}: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      <ShovelFigure
        fill={mono ? 'currentColor' : PRIMARY}
        mound={mono ? 'currentColor' : SIGNAL}
      />
    </svg>
  );
}

/**
 * Piste 8 — the same figure inside the works triangle.
 *
 * The composition everyone pictures when they hear "road works". It may well
 * read *better* small than the figure alone: the triangle carries the meaning by
 * itself, so the figure inside only has to be a dark shape.
 */
export function LogoShovelSign({
  size = 32,
  mono = false,
  background = SURFACE,
  className,
  title = 'Chantia',
}: LogoMarkProps) {
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
        d="M20.5 6.6a4 4 0 0 1 7 0l16.2 30.2a4 4 0 0 1-3.5 5.9H7.8a4 4 0 0 1-3.5-5.9z"
        fill={mono ? 'currentColor' : SIGNAL}
      />
      {/* Inner field, as on the real sign — it is what makes the border read. */}
      <path
        d="M22.3 12.4a2 2 0 0 1 3.4 0L38.4 36a2 2 0 0 1-1.7 3H11.3a2 2 0 0 1-1.7-3z"
        fill={background}
      />
      {/* Figure scaled into the lower half of the triangle, where the room is. */}
      <g transform="translate(11.5 12.5) scale(0.53)">
        <ShovelFigure
          fill={mono ? 'currentColor' : PRIMARY}
          mound={mono ? 'currentColor' : PRIMARY}
        />
      </g>
    </svg>
  );
}

export const EQUIPMENT_MARKS = [
  {
    id: 'roller',
    name: 'Piste 4 — le compacteur',
    Mark: LogoRoller,
    strength:
      'La machine la plus spécifique à la route. Une pelleteuse dit « BTP », un compacteur dit « route ».',
    weakness: 'Trois masses distinctes : c’est la plus fragile en petit.',
  },
  {
    id: 'cone',
    name: 'Piste 5 — le cône',
    Mark: LogoCone,
    strength: 'Lisible instantanément, et la plus solide des trois en petit.',
    weakness:
      'Le symbole le plus utilisé du métier : elle dira « chantier » sans jamais dire « Chantia ».',
  },
  {
    id: 'shovel-man',
    name: 'Piste 7 — l’homme à la pelle',
    Mark: LogoShovelMan,
    strength: 'L’image des travaux en France. Personne n’a besoin qu’on la lui explique.',
    weakness: 'La plus détaillée des huit : tête, bras, pelle, tas. En petit, tout se rejoint.',
  },
  {
    id: 'shovel-sign',
    name: 'Piste 8 — l’homme dans le panneau',
    Mark: LogoShovelSign,
    strength:
      'La composition que tout le monde a en tête. Le triangle porte le sens, la silhouette n’a plus qu’à être une tache.',
    weakness: 'Deux symboles empilés : risque de ressembler à un panneau plutôt qu’à une marque.',
  },
  {
    id: 'works-sign',
    name: 'Piste 6 — le panneau de travaux',
    Mark: LogoWorksSign,
    strength:
      'Le triangle est compris dans toute l’Europe avant même qu’on regarde ce qu’il y a dedans.',
    weakness:
      'Sans le pictogramme réglementaire il perd en évidence — mais ce pictogramme n’appartient à personne.',
  },
] as const;
