import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar, SidebarNavItem, SIDEBAR_COOKIE } from './sidebar';

/**
 * What the rail has to keep true in both states.
 *
 * Collapsing is a *visual* shorthand, not a second menu: the same destinations,
 * the same names, the same current page — only narrower. Everything below is a
 * way of saying that, because it is the property that quietly breaks the day
 * somebody replaces `sr-only` with a condition that drops the label.
 */

const pathname = vi.hoisted(() => ({ current: '/worksites' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

function Icon(props: { className?: string }) {
  return <svg data-testid="icon" {...props} />;
}

function renderSidebar(collapsed = false) {
  return render(
    <Sidebar
      defaultCollapsed={collapsed}
      navLabel="Navigation principale"
      collapseLabel="Réduire le menu"
      expandLabel="Déployer le menu"
      header={(isCollapsed) => <span>{isCollapsed ? 'C' : 'Chantia'}</span>}
      footer={() => <span>compte</span>}
    >
      <SidebarNavItem href="/worksites" label="Chantiers" icon={Icon} />
      <SidebarNavItem href="/expenses" label="Dépenses" icon={Icon} />
    </Sidebar>,
  );
}

beforeEach(() => {
  pathname.current = '/worksites';
  document.cookie = `${SIDEBAR_COOKIE}=; max-age=0; path=/`;
});

// Explicit because `globals` is off in `vitest.config.mts`: Testing Library
// only auto-cleans when it can hook a global `afterEach`, and without it every
// render piles up in the same document.
afterEach(cleanup);

describe('Sidebar', () => {
  it('names its landmark and lists every destination', () => {
    renderSidebar();

    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Chantiers' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Dépenses' })).toBeTruthy();
  });

  it('marks the current page, and only it', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Chantiers' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Dépenses' }).getAttribute('aria-current')).toBeNull();
  });

  it('keeps a sub-route on its section', () => {
    pathname.current = '/worksites/8f2c';
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Chantiers' }).getAttribute('aria-current')).toBe('page');
  });

  it('does not mark a section whose path is merely a prefix', () => {
    pathname.current = '/worksites-archive';
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Chantiers' }).getAttribute('aria-current')).toBeNull();
  });

  it('collapsed, keeps the names reachable and adds a tooltip', () => {
    renderSidebar(true);

    // Still findable by name — the label is hidden from the eye, not from the
    // accessibility tree.
    const link = screen.getByRole('link', { name: 'Chantiers' });
    expect(link.getAttribute('title')).toBe('Chantiers');
    expect(link.querySelector('span')?.className).toContain('sr-only');
  });

  it('hands the collapsed state to the header, so a logo can shrink itself', () => {
    renderSidebar(true);

    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.queryByText('Chantia')).toBeNull();
  });

  it('toggles, and remembers it in a cookie for the next load', () => {
    renderSidebar();

    const collapse = screen.getByRole('button', { name: 'Réduire le menu' });
    expect(collapse.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(collapse);

    const expand = screen.getByRole('button', { name: 'Déployer le menu' });
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE}=collapsed`);

    fireEvent.click(expand);
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE}=expanded`);
  });
});
