'use client';

import { WorksiteStatus } from '@chantia/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Skeleton,
  Snippet,
  TD,
  TH,
  THead,
  TRow,
  Table,
} from '@/components/ui';
import type { Tone } from '@/components/ui/badge';
import { WORKSITE_STATUS, formatAmount, varianceTone } from '@/lib/domain-display';

/**
 * The living reference for the design system.
 *
 * Kept as a real page rather than a written catalogue: a token that stops
 * working, or a contrast that breaks in dark mode, shows up here immediately.
 * Switch themes with the toggle in the header and read this page in both.
 */

/* Written out in full, never built with a template literal: Tailwind scans the
 * source for whole class names, so `bg-${name}` produces no CSS at all. */
const SURFACES = [
  { name: 'surface-sunken', swatch: 'bg-surface-sunken' },
  { name: 'surface', swatch: 'bg-surface' },
  { name: 'surface-raised', swatch: 'bg-surface-raised' },
  { name: 'surface-muted', swatch: 'bg-surface-muted' },
];

const SEMANTIC = [
  { name: 'primary', solid: 'bg-primary', subtle: 'bg-primary-subtle', on: 'text-primary-on-subtle' },
  { name: 'signal', solid: 'bg-signal', subtle: 'bg-signal-subtle', on: 'text-signal-on-subtle' },
  { name: 'success', solid: 'bg-success', subtle: 'bg-success-subtle', on: 'text-success-on-subtle' },
  { name: 'danger', solid: 'bg-danger', subtle: 'bg-danger-subtle', on: 'text-danger-on-subtle' },
];
const TONES: Tone[] = ['neutral', 'info', 'signal', 'success', 'danger'];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-stack">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {note && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Design system</h1>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          Les jetons et les composants de Chantia. Basculez le thème dans l’en-tête : tout ce qui
          est sur cette page doit rester lisible des deux côtés.
        </p>
      </header>

      <Section
        title="Surfaces"
        note="Du fond de page vers le premier plan. Une carte se pose sur « surface », un menu sur « surface-raised »."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SURFACES.map((surface) => (
            <div key={surface.name} className="rounded-surface border border-border p-3">
              <div
                className={`mb-2 h-12 rounded-control border border-border ${surface.swatch}`}
              />
              <code className="text-2xs text-fg-muted">{surface.name}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Couleurs sémantiques"
        note="Un composant demande un rôle, jamais une teinte. L’ambre reste rare : c’est ce qui lui garde sa force de signal."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SEMANTIC.map((color) => (
            <div key={color.name} className="overflow-hidden rounded-surface border border-border">
              <div className={`h-14 ${color.solid}`} />
              <div className={`${color.subtle} px-3 py-2`}>
                <code className={`text-2xs ${color.on}`}>{color.name}</code>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Texte">
        <Card>
          <CardBody className="flex flex-col gap-2">
            <p className="text-2xl font-semibold tracking-tight">Titre de page — 24px</p>
            <p className="text-lg font-semibold tracking-tight">Titre de section — 18px</p>
            <p className="text-sm text-fg">Corps de texte — 14px, la taille par défaut</p>
            <p className="text-sm text-fg-muted">Texte secondaire — client, dates, totaux</p>
            <p className="text-xs text-fg-subtle">Mention — unités, aides de saisie</p>
            <p className="text-2xs uppercase tracking-wide text-fg-muted">En-tête de tableau — 11px</p>
          </CardBody>
        </Card>
      </Section>

      <Section
        title="Espacement"
        note="Les pas nommés sont pour la mise en page. Le reste de l’échelle Tailwind (4px) reste disponible à l’intérieur d’un composant."
      >
        <Card>
          <CardBody className="flex flex-col gap-3">
            {[
              ['gutter', '24px', 'marges latérales de page'],
              ['gutter-lg', '32px', 'idem, au-delà de 1024px'],
              ['section', '32px', 'entre deux blocs d’une page'],
              ['stack', '16px', 'entre frères dans un bloc'],
            ].map(([name, size, usage]) => (
              <div key={name} className="flex items-center gap-4">
                <code className="w-24 shrink-0 text-2xs text-fg-muted">{name}</code>
                <div className="h-3 bg-primary" style={{ width: size }} />
                <span className="text-xs text-fg-subtle">
                  {size} — {usage}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      </Section>

      <Section title="Boutons" note="Un seul bouton primaire par vue : c’est ainsi que l’œil trouve l’action principale.">
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Enregistrer</Button>
            <Button variant="secondary">Annuler</Button>
            <Button variant="ghost">Filtrer</Button>
            <Button variant="danger">Supprimer</Button>
            <Button variant="primary" disabled>
              Désactivé
            </Button>
            <Button variant="secondary" size="sm">
              Petit
            </Button>
          </CardBody>
        </Card>
        <Snippet>{`import { Button } from '@/components/ui';

<Button variant="primary">Enregistrer</Button>   // un seul par vue
<Button variant="secondary">Annuler</Button>     // le défaut
<Button variant="ghost">Filtrer</Button>         // action discrète
<Button variant="danger">Supprimer</Button>      // irréversible
<Button size="sm" />                             // 32 px au lieu de 40
<Button type="submit" />                         // sinon type="button" par défaut`}</Snippet>
      </Section>

      <Section
        title="Tons"
        note="Cinq significations, jamais plus. La pastille double la couleur pour qui ne distingue pas les teintes."
      >
        <Card>
          <CardBody className="flex flex-wrap gap-2">
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} dot>
                {tone}
              </Badge>
            ))}
          </CardBody>
        </Card>
        <Snippet>{`import { Badge } from '@/components/ui';
import { WORKSITE_STATUS } from '@/lib/domain-display';

const status = WORKSITE_STATUS[worksite.status];
<Badge tone={status.tone} dot>{status.label}</Badge>

// Le ton vient toujours d'une table du domaine, jamais écrit en dur :
// une couleur de statut se change à un seul endroit.`}</Snippet>
      </Section>

      <Section
        title="Le domaine"
        note="Statuts et rôles sont traduits en un seul endroit — src/lib/domain-display.ts."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Statuts de chantier</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-wrap gap-2">
              {Object.values(WorksiteStatus).map((status) => (
                <Badge key={status} tone={WORKSITE_STATUS[status].tone} dot>
                  {WORKSITE_STATUS[status].label}
                </Badge>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Rôles</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-fg-muted">
                Les rôles arrivent avec l’authentification : <code>UserRole</code> vit dans{' '}
                <code>@chantia/shared</code> sur la ligne <code>release/auth</code>. Leur table de
                tons rejoindra <code>domain-display.ts</code> à la fusion des deux.
              </p>
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section title="Messages">
        <div className="flex flex-col gap-2">
          <Alert tone="info">Les données sont mises à jour toutes les 30 secondes.</Alert>
          <Alert tone="signal">Ce chantier dépasse 90 % de son budget.</Alert>
          <Alert tone="success">Chantier créé.</Alert>
          <Alert tone="danger">Impossible de charger les chantiers : le serveur est injoignable.</Alert>
        </div>
        <Snippet>{`import { Alert } from '@/components/ui';

<Alert tone="danger">Impossible de charger les chantiers.</Alert>
<Alert tone="signal">Ce chantier dépasse 90 % de son budget.</Alert>

// « danger » et « signal » portent role="alert" : annoncés sans attendre le
// focus. Les autres sont role="status". C'est un message de la vue, pas un
// toast — il reste tant que la situation dure.`}</Snippet>
      </Section>

      <Section
        title="Champs de formulaire"
        note="L’erreur remplace l’aide, porte aria-invalid et est annoncée. L’API renvoie toutes les violations d’un coup."
      >
        <Card>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Code chantier" placeholder="RN7-2026" hint="Unique dans l’organisation." />
            <Field
              label="Mot de passe"
              type="password"
              error="Doit contenir un caractère spécial"
            />
          </CardBody>
        </Card>
        <Snippet>{`import { Field } from '@/components/ui';

<Field label="Code chantier" placeholder="RN7-2026" hint="Unique dans l'organisation." />
<Field label="Mot de passe" type="password" error={errors.password} />

// L'étiquette, aria-invalid et aria-describedby sont câblés par le composant.
// L'erreur remplace l'aide. L'API renvoie toutes les violations d'un coup :
// {errors.map((e) => <Field key={e.code} error={e.message} … />)}`}</Snippet>
      </Section>

      <Section title="Tableau" note="Les montants sont alignés à droite en chiffres tabulaires, pour être comparés d’un coup d’œil.">
        <Table>
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Nom</TH>
              <TH>Statut</TH>
              <TH numeric>Budget</TH>
              <TH numeric>Écart</TH>
            </tr>
          </THead>
          <tbody>
            {[
              { code: 'RN7-2026', name: 'Réfection RN7 — section nord', status: WorksiteStatus.IN_PROGRESS, budget: 250000, variance: 42000 },
              { code: 'A61-2025', name: 'Élargissement A61', status: WorksiteStatus.SUSPENDED, budget: 1800000, variance: -95000 },
              { code: 'D12-2024', name: 'Voirie communale D12', status: WorksiteStatus.COMPLETED, budget: 74000, variance: 0 },
            ].map((row) => (
              <TRow key={row.code}>
                <TD className="font-mono text-xs text-fg-muted">{row.code}</TD>
                <TD className="font-medium">{row.name}</TD>
                <TD>
                  <Badge tone={WORKSITE_STATUS[row.status].tone} dot>
                    {WORKSITE_STATUS[row.status].label}
                  </Badge>
                </TD>
                <TD numeric>{formatAmount(row.budget)}</TD>
                <TD numeric>
                  <span
                    className={
                      varianceTone(row.variance) === 'danger'
                        ? 'text-danger'
                        : varianceTone(row.variance) === 'success'
                          ? 'text-success'
                          : 'text-fg-muted'
                    }
                  >
                    {formatAmount(row.variance)}
                  </span>
                </TD>
              </TRow>
            ))}
          </tbody>
        </Table>
        <Snippet>{`import { Table, THead, TH, TRow, TD } from '@/components/ui';

<Table>
  <THead>
    <tr>
      <TH>Nom</TH>
      <TH numeric>Budget</TH>
    </tr>
  </THead>
  <tbody>
    {rows.map((row) => (
      <TRow key={row.id}>
        <TD className="font-medium">{row.name}</TD>
        <TD numeric>{formatAmount(row.budget)}</TD>
      </TRow>
    ))}
  </tbody>
</Table>

// « numeric » aligne à droite en chiffres tabulaires : deux montants se
// comparent d'un coup d'œil. Le tableau défile horizontalement tout seul,
// pour que la page ne le fasse jamais.`}</Snippet>
      </Section>

      <Section title="Cartes" note="Le conteneur par défaut d’un bloc de contenu.">
        <Card>
          <CardHeader>
            <CardTitle>Titre de la carte</CardTitle>
            <span className="text-2xs text-fg-subtle">méta</span>
          </CardHeader>
          <CardBody className="text-sm text-fg-muted">Le contenu vit ici.</CardBody>
        </Card>
        <Snippet>{`import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Coûts du chantier</CardTitle>
    <Button variant="ghost" size="sm">Exporter</Button>
  </CardHeader>
  <CardBody>…</CardBody>
</Card>

// CardHeader met son contenu aux deux extrémités : titre à gauche,
// action à droite, sans classe supplémentaire.`}</Snippet>
      </Section>

      <Section title="États">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Chargement</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </CardBody>
          </Card>
          <EmptyState
            title="Aucun pointage cette semaine"
            description="Les pointages saisis sur le terrain apparaîtront ici."
            action={<Button variant="secondary">Saisir un pointage</Button>}
          />
        </div>
        <Snippet>{`import { Skeleton, EmptyState } from '@/components/ui';

// Chargement : à la hauteur finale des lignes, pour que rien ne saute
{isPending && <Skeleton className="h-12" />}

<EmptyState
  title="Aucun pointage cette semaine"
  description="Les pointages saisis sur le terrain apparaîtront ici."
  action={<Button variant="secondary">Saisir un pointage</Button>}
/>

// Toujours une action : un état vide sans issue est un cul-de-sac.`}</Snippet>
      </Section>
    </div>
  );
}
