'use client';

import { BrandIllustration, Logo, LogoMark } from '@/components/brand';
import { Alert, Button, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';

/**
 * How to use the mark. The living half of docs/11-design-system.md §11.
 *
 * Every size and every variant is rendered here, so a broken contrast or a mark
 * that stops holding together shows up on this page rather than in review.
 */

const SIZES = [16, 20, 24, 32, 48, 96] as const;

function Snippet({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-control bg-surface-muted px-3 py-2 text-2xs leading-relaxed text-fg-muted">
      <code>{children}</code>
    </pre>
  );
}

export default function BrandPage() {
  return (
    <div className="flex flex-col gap-section">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Marque</h1>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          Le logo, l’illustration, et quand utiliser lequel. Basculez le thème dans l’en-tête :
          la marque garde ses couleurs des deux côtés, contrairement au reste de l’interface.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Verrouillage — l’usage par défaut</CardTitle>
          <code className="text-2xs text-fg-subtle">Logo</code>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-8">
            <Logo />
            <Logo size={40} className="text-2xl" />
          </div>
          <Snippet>{`import { Logo } from '@/components/brand';

<Logo />                 // en-tête : symbole + « Chantia »
<Logo size={40} />       // plus grand
<Logo markOnly />        // symbole seul (barre latérale repliée)`}</Snippet>
          <p className="text-sm text-fg-muted">
            Le mot « Chantia » est du HTML, pas du <code>&lt;text&gt;</code> SVG : il s’affiche
            dans la police de l’interface, reste sélectionnable et suit le thème.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Symbole seul — favicon, avatar, petites tailles</CardTitle>
          <code className="text-2xs text-fg-subtle">LogoMark</code>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-8">
            {SIZES.map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <LogoMark size={size} />
                <span className="text-2xs text-fg-subtle">{size} px</span>
              </div>
            ))}
          </div>
          <Snippet>{`import { LogoMark } from '@/components/brand';

<LogoMark size={24} />
<LogoMark size={40} mono />       // une seule couleur, prend celle du texte
<LogoMark title="" />             // décoratif : un libellé visible dit déjà « Chantia »`}</Snippet>
          <Alert tone="signal">
            Sous 24 px les dents se referment en un disque. C’est connu et accepté : la marque
            reste reconnaissable à sa couleur et à son casque. Le favicon
            (<code>src/app/icon.svg</code>) est le même dessin, couleurs en dur — un fichier
            servi seul n’a pas accès aux variables CSS de l’application.
          </Alert>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Une seule couleur, et sur aplat</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <span className="text-fg">
              <LogoMark size={56} mono />
            </span>
            <span className="text-2xs text-fg-subtle">mono, sur fond de page</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-20 items-center justify-center rounded-surface bg-brand-ring">
              <LogoMark size={56} />
            </div>
            <span className="text-2xs text-fg-subtle">sur l’ardoise de marque</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-20 items-center justify-center rounded-surface bg-brand-shell text-brand-ring">
              <LogoMark size={56} mono />
            </div>
            <span className="text-2xs text-fg-subtle">mono sur le jaune</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Illustration — connexion, erreurs, états vides</CardTitle>
          <code className="text-2xs text-fg-subtle">BrandIllustration</code>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-8">
            <BrandIllustration size={180} />
            <div className="flex max-w-sm flex-col gap-3">
              <p className="text-sm text-fg-muted">
                Un autre métier que le logo, et la raison pour laquelle les deux existent. Le
                logo doit survivre à 16 px, à une seule couleur et à un onglet de navigateur.
                L’illustration n’a qu’à être accueillante — elle peut se permettre tout le
                détail que la marque a dû abandonner.
              </p>
              <p className="text-sm text-fg-muted">
                Raster assumé : rien chez elle n’a besoin de devenir un favicon.
              </p>
            </div>
          </div>
          <Snippet>{`import { BrandIllustration } from '@/components/brand';

// page de connexion
<BrandIllustration size={240} />

// page d'erreur, état vide
<BrandIllustration size={160} className="mx-auto" />`}</Snippet>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Les règles</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 text-sm">
          {[
            [
              'Jamais les deux dans la même vue',
              'Logo et illustration ensemble se lisent comme deux produits. L’illustration accompagne un titre, pas une marque.',
            ],
            [
              'Ne pas recolorer la marque',
              'Elle a ses propres jetons (--brand-ring, --brand-shell) et garde ses couleurs dans les deux thèmes. C’est ce qui la rend reconnaissable ; --signal a déjà changé deux fois, la marque n’a pas bougé.',
            ],
            [
              'Ne pas redessiner le symbole',
              'L’anneau est calculé à partir de six constantes en haut de logo.tsx. Changer le nombre de dents ou leur profondeur, c’est un chiffre — pas un nouveau chemin SVG.',
            ],
            [
              'title="" quand un libellé visible existe',
              'Sinon un lecteur d’écran annonce « Chantia » deux fois. Le composant Logo le fait déjà pour vous.',
            ],
          ].map(([title, body]) => (
            <div key={title} className="border-l-2 border-border pl-3">
              <p className="font-medium text-fg">{title}</p>
              <p className="mt-0.5 text-fg-muted">{body}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exemple — une page de connexion</CardTitle>
        </CardHeader>
        <CardBody>
          <Snippet>{`import { BrandIllustration, Logo } from '@/components/brand';
import { Button, Card, CardBody, Field } from '@/components/ui';

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-section">
      <Logo size={36} />
      <BrandIllustration size={200} />

      <Card className="w-full">
        <CardBody className="flex flex-col gap-4">
          <Field label="Email" type="email" autoComplete="email" />
          <Field label="Mot de passe" type="password" autoComplete="current-password" />
          <Button variant="primary">Se connecter</Button>
        </CardBody>
      </Card>
    </div>
  );
}`}</Snippet>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" size="sm">
              Copier
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
