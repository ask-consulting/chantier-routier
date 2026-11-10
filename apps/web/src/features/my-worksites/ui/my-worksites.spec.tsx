import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@chantia/shared';
import { renderWithProviders } from '@/test/render';
import { MyWorksitePage } from './my-worksite-page';
import { MyWorksitesPage } from './my-worksites-page';

let user: { role: UserRole; email: string } = { role: UserRole.ADMIN, email: 'admin@test' };
vi.mock('@/features/auth', () => ({ useSession: () => ({ user }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const cardLinks = () => screen.getAllByRole('link', { name: /^Ouvrir / });

afterEach(() => {
  user = { role: UserRole.ADMIN, email: 'admin@test' };
  cleanup();
});

describe('MyWorksitesPage', () => {
  it('shows an admin every worksite, and says the data is an example', () => {
    renderWithProviders(<MyWorksitesPage />);

    expect(cardLinks()).toHaveLength(6);
    expect(screen.getByText(/Données d'exemple/)).toBeTruthy();
  });

  it('shows a foreman only the worksites assigned to them', () => {
    user = { role: UserRole.FOREMAN, email: 'chef@chantia-demo.test' };
    renderWithProviders(<MyWorksitesPage />);

    expect(cardLinks()).toHaveLength(4);
  });

  it('tells someone with no worksite why the page is empty', () => {
    user = { role: UserRole.FOREMAN, email: 'nobody@test' };
    renderWithProviders(<MyWorksitesPage />);

    expect(screen.getByText('Aucun chantier ne vous est affecté')).toBeTruthy();
    expect(screen.queryByLabelText('Rechercher')).toBeNull();
  });

  it('filters by state and by text, and says when nothing matches', () => {
    renderWithProviders(<MyWorksitesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'En retard · 2' }));
    expect(cardLinks()).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'sahloul' } });
    expect(cardLinks()).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'zzz' } });
    expect(screen.getByText('Aucun chantier ne correspond à cette recherche.')).toBeTruthy();
  });

  it('links each card to its worksite', () => {
    renderWithProviders(<MyWorksitesPage />);

    expect(cardLinks()[0]?.getAttribute('href')).toBe('/my-worksites/rn1');
  });
});

describe('MyWorksitePage', () => {
  it('opens on the overview, with what to do now', () => {
    renderWithProviders(<MyWorksitePage id="rn1" />);

    expect(screen.getByRole('heading', { name: /Réfection de la RN1/ })).toBeTruthy();
    expect(screen.getByText('À faire maintenant')).toBeTruthy();
    expect(screen.getByText('9 j')).toBeTruthy();
  });

  it('recalculates the task and the worksite when a subtask moves', () => {
    renderWithProviders(<MyWorksitePage id="rn1" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Avancement' }));
    // 58 % d'avancement, et 58 % de budget consommé dans ces données d'exemple.
    expect(screen.getAllByText('58 %')).toHaveLength(2);
    expect(screen.getByText('90 %')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Essai de densité et de portance'), {
      target: { value: '100' },
    });

    expect(screen.getByText('100 %', { selector: 'span.text-lg' })).toBeTruthy();
    expect(screen.getAllByText('58 %')).toHaveLength(1);
  });

  it('reaches each section from its shortcut', () => {
    renderWithProviders(<MyWorksitePage id="rn1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Personnel' }));
    expect(screen.getByText('Mohamed Ayari')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Achat' }));
    expect(screen.getByText('Émulsion de bitume')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Note' }));
    expect(screen.getByText(/Livraison de grave/)).toBeTruthy();
  });

  it('says so when a section has nothing yet', () => {
    renderWithProviders(<MyWorksitePage id="pr5" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Matériel' }));

    expect(screen.getByText("Rien à afficher pour l'instant.")).toBeTruthy();
  });

  it('hides a worksite the person is not assigned to', () => {
    user = { role: UserRole.FOREMAN, email: 'nobody@test' };
    renderWithProviders(<MyWorksitePage id="rn1" />);

    expect(screen.getByText('Chantier introuvable')).toBeTruthy();
  });
});
