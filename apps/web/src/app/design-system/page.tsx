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
  Checkbox,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Field,
  Select,
  Skeleton,
  Snippet,
  TD,
  TH,
  THead,
  TRow,
  Table,
} from '@/shared/ui';
import type { Tone } from '@/shared/ui/badge';
import * as Icons from '@/shared/lib/icons';
import { WORKSITE_STATUS_TONE, varianceTone } from '@/features/worksites';
import { formatAmount } from '@/shared/lib/format';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { Locale } from '@/shared/i18n/config';

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
  // The confirmation is the one component on this page that has a state worth
  // showing: a dialog drawn permanently open is not the thing it documents.
  const [confirming, setConfirming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The design-system pages are internal tooling and stay in French, but the
  // components they demonstrate must be exercised with real translated data.
  const tStatus = useTranslations('worksiteStatus');
  const locale = useLocale() as Locale;

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
        <Snippet>{`import { Button } from '@/shared/ui';

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
        <Snippet>{`import { Badge } from '@/shared/ui';
import { WORKSITE_STATUS } from '@/features/worksites';

const tStatus = useTranslations('worksiteStatus');

<Badge tone={WORKSITE_STATUS_TONE[worksite.status]} dot>
  {tStatus(worksite.status)}
</Badge>

// Le ton vient de domain-display.ts, le libellé de messages/*.json.
// Une couleur est une décision de design, un mot est une traduction :
// les deux ne vivent pas au même endroit.`}</Snippet>
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
                <Badge key={status} tone={WORKSITE_STATUS_TONE[status]} dot>
                  {tStatus(status)}
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
        <Snippet>{`import { Alert } from '@/shared/ui';

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
        <Snippet>{`import { Field } from '@/shared/ui';

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
                  <Badge tone={WORKSITE_STATUS_TONE[row.status]} dot>
                    {tStatus(row.status)}
                  </Badge>
                </TD>
                <TD numeric>{formatAmount(row.budget, locale)}</TD>
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
                    {formatAmount(row.variance, locale)}
                  </span>
                </TD>
              </TRow>
            ))}
          </tbody>
        </Table>
        <Snippet>{`import { Table, THead, TH, TRow, TD } from '@/shared/ui';

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
        <TD numeric>{formatAmount(row.budget, locale)}</TD>
      </TRow>
    ))}
  </tbody>
</Table>

// « numeric » aligne à droite en chiffres tabulaires : deux montants se
// comparent d'un coup d'œil. Le tableau défile horizontalement tout seul,
// pour que la page ne le fasse jamais.`}</Snippet>
      </Section>

      <Section
        title="Icônes"
        note="Lucide, réexporté sous des noms métier dans src/lib/icons.ts. Deux icônes maison complètent ce que la bibliothèque n’a pas."
      >
        <Card>
          <CardBody className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {(Object.entries(Icons) as [string, typeof Icons.WorksiteIcon][]).map(
                ([name, Icon]) => (
                  <div
                    key={name}
                    className="flex flex-col items-center gap-1.5 rounded-control border border-border px-2 py-3"
                  >
                    <Icon className="size-5 text-fg-muted" aria-hidden />
                    <code className="text-2xs text-fg-subtle">{name.replace('Icon', '')}</code>
                  </div>
                ),
              )}
            </div>
            <Alert tone="info">
              <strong>RollerIcon</strong> et <strong>BarrierIcon</strong> sont dessinées à la
              main : ni Lucide ni Tabler n’ont de compacteur ni de barrière de chantier. Elles
              suivent les règles de Lucide — toile 24, marge 1, trait 2 centré, jonctions et
              extrémités rondes, aucun remplissage — pour qu’elles ne détonnent pas.
            </Alert>
          </CardBody>
        </Card>
        <Snippet>{`import { WorksiteIcon, RollerIcon } from '@/shared/lib/icons';

<WorksiteIcon className="size-4 text-fg-muted" aria-hidden />
<RollerIcon size={32} strokeWidth={1.5} />

// Les icônes héritent de currentColor : elles suivent les jetons et les
// deux thèmes sans rien configurer. Toujours aria-hidden quand un libellé
// visible ou un aria-label voisin dit déjà la même chose.

// Ajouter une icône : la réexporter dans lib/icons.ts sous un nom métier,
// jamais l'importer de 'lucide-react' dans un composant. Le fichier est
// l'inventaire — c'est ce qui évite trois icônes pour la même idée.`}</Snippet>
      </Section>

      <Section title="Cartes" note="Le conteneur par défaut d’un bloc de contenu.">
        <Card>
          <CardHeader>
            <CardTitle>Titre de la carte</CardTitle>
            <span className="text-2xs text-fg-subtle">méta</span>
          </CardHeader>
          <CardBody className="text-sm text-fg-muted">Le contenu vit ici.</CardBody>
        </Card>
        <Snippet>{`import { Card, CardHeader, CardTitle, CardBody } from '@/shared/ui';

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
        <Snippet>{`import { Skeleton, EmptyState } from '@/shared/ui';

// Chargement : à la hauteur finale des lignes, pour que rien ne saute
{isPending && <Skeleton className="h-12" />}

<EmptyState
  title="Aucun pointage cette semaine"
  description="Les pointages saisis sur le terrain apparaîtront ici."
  action={<Button variant="secondary">Saisir un pointage</Button>}
/>

// Toujours une action : un état vide sans issue est un cul-de-sac.`}</Snippet>
      </Section>

      <Section
        title="Listes déroulantes"
        note="Un <select> natif, étiqueté comme un champ. Sur téléphone, la roue du navigateur bat tout ce qu’on dessinerait."
      >
        <Card>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Statut"
              options={[
                { value: 'all', label: 'Tous les statuts' },
                { value: 'pending', label: 'En attente' },
                { value: 'accepted', label: 'Acceptée' },
              ]}
            />
            <Select
              label="Rôle"
              hint="L’étiquette peut être masquée dans une barre de filtres."
              options={[
                { value: 'admin', label: 'Administrateur' },
                { value: 'worker', label: 'Ouvrier' },
              ]}
            />
          </CardBody>
        </Card>
        <Snippet>{`import { Select } from '@/shared/ui';

<Select
  label="Statut"
  options={[{ value: 'pending', label: 'En attente' }]}
  value={status}
  onChange={(event) => setStatus(event.target.value)}
/>

// labelHidden garde l'étiquette pour les lecteurs d'écran sans la peindre.`}</Snippet>
      </Section>

      <Section
        title="Case à cocher"
        note="Un input natif de type case à cocher — accent-color plutôt qu'une case redessinée."
      >
        <Card>
          <CardBody className="flex flex-col gap-3">
            <Checkbox label="Actif" hint="Décochez si la personne a quitté l’entreprise — l’historique est conservé." defaultChecked />
          </CardBody>
        </Card>
        <Snippet>{`import { Checkbox } from '@/shared/ui';

<Checkbox
  label="Actif"
  checked={active}
  onChange={(event) => setActive(event.target.checked)}
/>

// L'étiquette est à droite de la case, comme sur un formulaire papier.`}</Snippet>
      </Section>

      <Section
        title="Confirmation"
        note="Pour tout ce qui détruit ou révoque. La description dit ce qui va se passer — pas « êtes-vous sûr ? »."
      >
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Supprimer l’invitation
            </Button>
            <span className="text-sm text-fg-muted">
              Annuler prend le focus : le bouton dangereux n’est jamais à un Entrée d’un clic
              accidentel.
            </span>
          </CardBody>
        </Card>
        <ConfirmDialog
          open={confirming}
          title="Supprimer cette invitation ?"
          description="Le lien envoyé cessera immédiatement de fonctionner. Le compte, lui, reste : vous pourrez renvoyer une invitation plus tard."
          confirmLabel="Supprimer l’invitation"
          cancelLabel="Annuler"
          tone="danger"
          onConfirm={() => setConfirming(false)}
          onCancel={() => setConfirming(false)}
        />
        <Snippet>{`import { ConfirmDialog } from '@/shared/ui';

<ConfirmDialog
  open={confirming}
  title="Supprimer cette invitation ?"
  description="Le lien cessera de fonctionner. Le compte, lui, reste."
  confirmLabel="Supprimer l'invitation"
  cancelLabel="Annuler"
  tone="danger"
  onConfirm={remove}
  onCancel={() => setConfirming(false)}
/>

// <dialog> natif : piège à focus, Échap et fond inerte viennent du navigateur.`}</Snippet>
      </Section>

      <Section
        title="Tiroir"
        note="Pour un formulaire : la liste reste lisible à côté, et le panneau a toute la hauteur. Vient de la droite en français, de la gauche en arabe."
      >
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              Ouvrir le tiroir
            </Button>
            <span className="text-sm text-fg-muted">
              Une question reste centrée ; un formulaire va sur le côté.
            </span>
          </CardBody>
        </Card>
        <Drawer
          open={drawerOpen}
          size="md"
          title="Inviter quelqu’un"
          closeLabel="Fermer"
          onClose={() => setDrawerOpen(false)}
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => setDrawerOpen(false)}>
                Envoyer l’invitation
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-stack">
            <Field label="Email" type="email" />
            <div className="grid gap-stack sm:grid-cols-2">
              <Field label="Prénom" />
              <Field label="Nom" />
            </div>
          </div>
        </Drawer>
        <Snippet>{`import { Drawer } from '@/shared/ui';

<Drawer
  open={open}
  size="md"
  title="Inviter quelqu'un"
  closeLabel="Fermer"
  onClose={close}
  footer={<Button variant="primary" type="submit" form="invite-form">Envoyer</Button>}
>
  <form id="invite-form" onSubmit={submit}>…</form>
</Drawer>

// Le pied est hors du <form> : \`form="invite-form"\` les relie, donc Entrée
// dans n'importe quel champ soumet.`}</Snippet>
      </Section>
    </div>
  );
}
