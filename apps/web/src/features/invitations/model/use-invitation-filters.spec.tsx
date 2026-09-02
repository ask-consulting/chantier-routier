import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationStatus } from '@chantia/shared';
import { SEARCH_DEBOUNCE_MS, useInvitationFilters } from './use-invitation-filters';

/**
 * The filter state, and the two conventions that make it work.
 *
 * The first is the debounce: the box updates on every keystroke, the request
 * does not. Without it, typing "Benali" is six calls — and six React Query cache
 * entries nobody will ever ask for again.
 *
 * The second is that `all` never reaches the API. A `<select>` cannot hold "no
 * value" without an empty option that reads as a bug, so the absence is spelled
 * here and translated at the boundary.
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useInvitationFilters', () => {
  it('starts with nothing filtered, and sends no params', () => {
    const { result } = renderHook(() => useInvitationFilters());

    expect(result.current.search).toBe('');
    expect(result.current.status).toBe('all');
    expect(result.current.isFiltering).toBe(false);
    expect(result.current.params).toEqual({});
  });

  it('shows the typed text immediately and holds the request back', () => {
    const { result } = renderHook(() => useInvitationFilters());

    act(() => result.current.setSearch('Ben'));

    // On screen at once…
    expect(result.current.search).toBe('Ben');
    // …but not yet on the wire.
    expect(result.current.params).toEqual({});

    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current.params).toEqual({ search: 'Ben' });
  });

  it('only asks once for a name typed in one go', () => {
    const { result } = renderHook(() => useInvitationFilters());

    act(() => result.current.setSearch('B'));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.setSearch('Be'));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.setSearch('Ben'));
    // Nothing has been sent yet: each keystroke restarted the clock.
    expect(result.current.params).toEqual({});

    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current.params).toEqual({ search: 'Ben' });
  });

  it('drops a search made only of spaces', () => {
    const { result } = renderHook(() => useInvitationFilters());

    act(() => result.current.setSearch('   '));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

    expect(result.current.params).toEqual({});
    expect(result.current.isFiltering).toBe(false);
  });

  it('trims what it does send', () => {
    const { result } = renderHook(() => useInvitationFilters());

    act(() => result.current.setSearch('  Benali  '));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

    expect(result.current.params).toEqual({ search: 'Benali' });
  });

  it('applies a status immediately — a select needs no debounce', () => {
    const { result } = renderHook(() => useInvitationFilters());

    act(() => result.current.setStatus(InvitationStatus.PENDING));

    expect(result.current.params).toEqual({ status: InvitationStatus.PENDING });
    expect(result.current.isFiltering).toBe(true);
  });

  it('keeps "all" out of the params entirely', () => {
    const { result } = renderHook(() => useInvitationFilters());

    act(() => result.current.setStatus(InvitationStatus.ACCEPTED));
    act(() => result.current.setStatus('all'));

    expect(result.current.params).toEqual({});
    expect(result.current.isFiltering).toBe(false);
  });

  it('combines both filters', () => {
    const { result } = renderHook(() => useInvitationFilters());

    act(() => result.current.setSearch('Karim'));
    act(() => result.current.setStatus(InvitationStatus.PENDING));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

    expect(result.current.params).toEqual({ search: 'Karim', status: InvitationStatus.PENDING });
  });

  it('clears both at once, without waiting for the debounce', () => {
    const { result } = renderHook(() => useInvitationFilters());

    act(() => result.current.setSearch('Karim'));
    act(() => result.current.setStatus(InvitationStatus.EXPIRED));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current.params).not.toEqual({});

    act(() => result.current.clear());

    // Immediately: an empty state offering "clear the filters" must not leave a
    // stale search on the wire for another 300ms.
    expect(result.current.params).toEqual({});
    expect(result.current.search).toBe('');
    expect(result.current.status).toBe('all');
    expect(result.current.isFiltering).toBe(false);
  });
});
