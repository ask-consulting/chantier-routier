import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Alert } from './alert';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardBody, CardHeader, CardTitle } from './card';
import { Field } from './field';
import { Snippet } from './snippet';
import { EmptyState, Skeleton } from './states';
import { TD, TH, THead, TRow, Table } from './table';

/**
 * The design system's components, tested for the promises they make — not for
 * the classes they emit.
 *
 * `docs/15` §4 counted these at zero tests: the living reference at
 * `/design-system` shows them, but only to somebody who opens it. What is
 * checked here is what a class name cannot tell you — that a `<button>` inside
 * a form does not submit it, that an error is announced to a screen reader and
 * not merely coloured red, that a tone with something to say gets `role="alert"`
 * while a neutral one does not.
 *
 * Colours are deliberately absent. They are jetons, they change, and asserting
 * on `bg-primary` would only pin today's spelling of a decision — the contrasts
 * behind them are a separate job (`docs/15` §2).
 */

afterEach(cleanup);

describe('Button', () => {
  it('is a button, not a submit — the default that keeps "cancel" from saving', () => {
    render(<Button>Annuler</Button>);

    expect(screen.getByRole('button', { name: 'Annuler' }).getAttribute('type')).toBe('button');
  });

  it('still submits when asked to', () => {
    render(<Button type="submit">Enregistrer</Button>);

    expect(screen.getByRole('button', { name: 'Enregistrer' }).getAttribute('type')).toBe('submit');
  });

  it('takes every variant and size without losing its label', () => {
    render(
      <>
        <Button variant="primary" size="sm">
          Enregistrer
        </Button>
        <Button variant="ghost">Filtrer</Button>
        <Button variant="danger" size="md">
          Supprimer
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filtrer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeTruthy();
  });

  it('is properly disabled, not just greyed', () => {
    render(<Button disabled>Supprimer</Button>);

    expect((screen.getByRole('button', { name: 'Supprimer' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe('Badge', () => {
  it('renders its label, which is what carries the meaning', () => {
    render(<Badge tone="success">Terminé</Badge>);

    expect(screen.getByText('Terminé')).toBeTruthy();
  });

  it('hides the dot from screen readers — it repeats the label, it does not add to it', () => {
    const { container } = render(
      <Badge tone="danger" dot>
        Dépassé
      </Badge>,
    );

    const dot = container.querySelector('[aria-hidden]');
    expect(dot).toBeTruthy();
    expect(screen.getByText('Dépassé')).toBeTruthy();
  });
});

describe('Alert', () => {
  it('announces itself when it has something to warn about', () => {
    render(<Alert tone="danger">Le budget est dépassé</Alert>);

    // `alert` interrupts; a screen reader reads it without waiting for focus.
    expect(screen.getByRole('alert').textContent).toBe('Le budget est dépassé');
  });

  it('stays a polite status when it is only informing', () => {
    render(<Alert tone="info">Chargement terminé</Alert>);

    expect(screen.getByRole('status').textContent).toBe('Chargement terminé');
  });

  it('treats a signal the same as a danger — both are acted on', () => {
    render(<Alert tone="signal">Chantier suspendu</Alert>);

    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('Field', () => {
  it('binds its label to its input, so tapping the label focuses the field', () => {
    render(<Field label="Email" />);

    const input = screen.getByLabelText('Email');
    expect(input.tagName).toBe('INPUT');
  });

  it('describes the field with its hint', () => {
    render(<Field label="Mot de passe" hint="12 caractères minimum" />);

    const input = screen.getByLabelText('Mot de passe');
    const described = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(described?.textContent).toBe('12 caractères minimum');
  });

  it('marks itself invalid and points at the message, not just at a red border', () => {
    render(<Field label="Email" error="Adresse déjà utilisée" />);

    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const described = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(described?.textContent).toBe('Adresse déjà utilisée');
  });

  it('replaces the hint with the error — one message at a time, and it is the one that blocks', () => {
    render(<Field label="Email" hint="Votre adresse professionnelle" error="Adresse invalide" />);

    expect(screen.queryByText('Votre adresse professionnelle')).toBeNull();
    expect(screen.getByText('Adresse invalide')).toBeTruthy();
  });

  it('gives each instance its own id, so two fields on a page stay separate', () => {
    render(
      <>
        <Field label="Prénom" />
        <Field label="Nom" />
      </>,
    );

    const first = screen.getByLabelText('Prénom').getAttribute('id');
    const second = screen.getByLabelText('Nom').getAttribute('id');
    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });
});

describe('Card', () => {
  it('renders its parts, with the title as a real heading', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Budget</CardTitle>
        </CardHeader>
        <CardBody>12 000 €</CardBody>
      </Card>,
    );

    expect(screen.getByRole('heading', { name: 'Budget' })).toBeTruthy();
    expect(screen.getByText('12 000 €')).toBeTruthy();
  });
});

describe('Table', () => {
  it('is a real table, with column headers a screen reader can use', () => {
    render(
      <Table>
        <THead>
          <TRow>
            <TH>Chantier</TH>
            <TH numeric>Budget</TH>
          </TRow>
        </THead>
        <tbody>
          <TRow>
            <TD>Route A7</TD>
            <TD numeric>12 000 €</TD>
          </TRow>
        </tbody>
      </Table>,
    );

    expect(screen.getByRole('table')).toBeTruthy();
    // `scope="col"` is what ties a cell to its heading when the table is read
    // one cell at a time.
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.getAttribute('scope'))).toEqual(['col', 'col']);
    expect(screen.getByRole('cell', { name: 'Route A7' })).toBeTruthy();
  });
});

describe('Skeleton and EmptyState', () => {
  it('keeps the skeleton out of the accessibility tree — it stands for nothing yet', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('gives an empty state a way out', () => {
    render(
      <EmptyState
        title="Aucun chantier"
        description="Créez le premier"
        action={<Button variant="primary">Nouveau chantier</Button>}
      />,
    );

    expect(screen.getByText('Aucun chantier')).toBeTruthy();
    expect(screen.getByText('Créez le premier')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nouveau chantier' })).toBeTruthy();
  });

  it('renders an empty state with nothing but a title', () => {
    render(<EmptyState title="Rien à afficher" />);

    expect(screen.getByText('Rien à afficher')).toBeTruthy();
  });
});

describe('Snippet', () => {
  it('renders code as code', () => {
    const { container } = render(<Snippet>{'<Button variant="primary" />'}</Snippet>);

    expect(container.querySelector('code')?.textContent).toBe('<Button variant="primary" />');
  });
});
