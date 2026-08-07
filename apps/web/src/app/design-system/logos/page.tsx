'use client';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { LOGO_MARKS } from '@/components/brand/logo-marks';
import { EQUIPMENT_MARKS } from '@/components/brand/logo-marks-equipment';
import { REDRAWN_MARKS } from '@/components/brand/logo-marks-redrawn';

/**
 * Side-by-side comparison of the three candidate marks.
 *
 * Deliberately shows each one at 16 px and in one colour: those are the two
 * conditions that eliminate a logo, and they are exactly the two nobody looks at
 * while choosing. Switch the theme in the header and read the page again.
 */

const SIZES = [16, 24, 32, 48, 72] as const;

const FAMILIES = [
  {
    heading: 'Redessinées depuis Recraft',
    note: 'Reconstruites en géométrie, pas vectorisées — et simplifiées : les versions générées perdent leur détail sous 24 px.',
    marks: REDRAWN_MARKS,
  },
  {
    heading: 'Abstraites',
    note: 'Une marque abstraite doit s’apprendre : personne ne lit une courbe comme « travaux routiers » avant qu’on le lui dise. En échange elle est unique, et elle rétrécit bien.',
    marks: LOGO_MARKS,
  },
  {
    heading: 'Figuratives',
    note: 'Comprises immédiatement par un chef de chantier qui n’a jamais vu le produit. Le prix se paie en petit : une machine a des pièces, et les pièces se rejoignent.',
    marks: EQUIPMENT_MARKS,
  },
] as const;

export default function LogosPage() {
  return (
    <div className="flex flex-col gap-section">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pistes de logo</h1>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          Trois directions. Jugez-les à <strong>16 px</strong> (la taille d’un onglet) et en
          <strong> une seule couleur</strong> avant de les juger en grand : c’est là qu’un logo
          meurt.
        </p>
      </header>

      <h2 className="text-lg font-semibold tracking-tight">Abstraites</h2>
      <p className="-mt-3 max-w-2xl text-sm text-fg-muted">
        Une marque abstraite doit s’<em>apprendre</em> : personne ne lit une courbe comme
        « travaux routiers » avant qu’on le lui dise. En échange elle est unique, et elle
        rétrécit bien.
      </p>

      {FAMILIES.map(({ heading, note, marks }) => (
        <div key={heading} className="flex flex-col gap-stack">
          <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
          <p className="-mt-2 max-w-2xl text-sm text-fg-muted">{note}</p>

          {marks.map(({ id, name, Mark, strength, weakness }) => (
            <Card key={id}>
              <CardHeader>
                <CardTitle>{name}</CardTitle>
                <code className="text-2xs text-fg-subtle">{id}</code>
              </CardHeader>

              <CardBody className="flex flex-col gap-6">
                <div className="flex flex-wrap items-end gap-8">
                  {SIZES.map((size) => (
                    <div key={size} className="flex flex-col items-center gap-2">
                      <Mark size={size} />
                      <span className="text-2xs text-fg-subtle">{size} px</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-6 border-t border-border pt-6">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-fg">
                      <Mark size={40} mono />
                    </span>
                    <span className="text-2xs text-fg-subtle">une couleur</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-16 items-center justify-center rounded-surface bg-primary text-fg-on-accent">
                      <Mark size={40} mono background="var(--primary, #1d4ed8)" />
                    </div>
                    <span className="text-2xs text-fg-subtle">sur aplat</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 rounded-surface border border-border bg-surface-raised px-3 py-2">
                      <Mark size={24} />
                      <span className="text-lg font-semibold tracking-tight">Chantia</span>
                    </div>
                    <span className="text-2xs text-fg-subtle">verrouillage</span>
                  </div>
                </div>

                <dl className="grid gap-3 border-t border-border pt-6 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-success">Ce qu’elle a pour elle</dt>
                    <dd className="mt-1 text-fg-muted">{strength}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-signal">Ce qui lui manque</dt>
                    <dd className="mt-1 text-fg-muted">{weakness}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
