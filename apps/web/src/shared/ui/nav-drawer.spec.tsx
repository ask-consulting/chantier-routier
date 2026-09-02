import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavDrawer } from './nav-drawer';
import { SidebarNavItem } from './sidebar';

/**
 * The phone menu, and mostly its ways out.
 *
 * A drawer that opens is easy; one that closes on every exit anybody tries is
 * the part that gets forgotten — the backdrop, Escape, and above all arriving
 * somewhere, which otherwise leaves the reader looking at the menu they just
 * used instead of the page they asked for.
 */

const pathname = vi.hoisted(() => ({ current: '/worksites' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

function Icon(props: { className?: string }) {
  return <svg {...props} />;
}

function renderDrawer() {
  return render(
    <NavDrawer
      openLabel="Ouvrir le menu"
      closeLabel="Fermer le menu"
      title="Navigation principale"
      header={<span>Chantia</span>}
      footer={<span>compte</span>}
    >
      <SidebarNavItem href="/worksites" label="Chantiers" icon={Icon} />
    </NavDrawer>,
  );
}

const dialog = () => document.querySelector('dialog') as HTMLDialogElement;

/**
 * jsdom 30 ships no `<dialog>` behaviour at all — `showModal` and `close` are
 * simply absent. These stand in for them, and only for the part these tests are
 * about: that the component opens and closes the element, and keeps its own
 * state in step. Focus trapping, Escape and the inert background are the
 * browser's own work, which is the reason for using a real `<dialog>` in the
 * first place — and they are checked in a real browser, not here.
 */
beforeEach(() => {
  pathname.current = '/worksites';

  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(cleanup);

describe('NavDrawer', () => {
  it('starts closed, behind a button that says what it does', () => {
    renderDrawer();

    const trigger = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(dialog().open).toBe(false);
  });

  it('opens as a modal, so focus and Escape are the browser’s problem', () => {
    renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));

    expect(dialog().open).toBe(true);
    expect(screen.getByRole('button', { name: 'Ouvrir le menu' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(screen.getByRole('link', { name: 'Chantiers' })).toBeTruthy();
  });

  it('closes on the close button', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));

    fireEvent.click(screen.getByRole('button', { name: 'Fermer le menu' }));

    expect(dialog().open).toBe(false);
  });

  it('closes on Escape', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));

    // What the browser sends before closing itself.
    fireEvent(dialog(), new Event('cancel', { cancelable: true, bubbles: false }));

    expect(dialog().open).toBe(false);
  });

  it('closes on a click that lands on the backdrop rather than the panel', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));

    fireEvent.click(dialog());
    expect(dialog().open).toBe(false);
  });

  it('stays open when the click lands inside the panel', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));

    fireEvent.click(screen.getByText('compte'));
    expect(dialog().open).toBe(true);
  });

  it('closes when a destination is tapped, even the current one', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));

    // `/worksites` is already the current path, so nothing will change under it
    // — and the menu must still get out of the way.
    fireEvent.click(screen.getByRole('link', { name: 'Chantiers' }));

    expect(dialog().open).toBe(false);
  });

  it('closes when the route changes under it', () => {
    const { rerender } = renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    expect(dialog().open).toBe(true);

    pathname.current = '/expenses';
    rerender(
      <NavDrawer
        openLabel="Ouvrir le menu"
        closeLabel="Fermer le menu"
        title="Navigation principale"
        header={<span>Chantia</span>}
        footer={<span>compte</span>}
      >
        <SidebarNavItem href="/worksites" label="Chantiers" icon={Icon} />
      </NavDrawer>,
    );

    expect(dialog().open).toBe(false);
  });
});
