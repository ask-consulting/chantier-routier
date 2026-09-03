import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEARCH_DEBOUNCE_MS, useWorkerFilters } from './use-worker-filters';

/**
 * The filter state, and the two conventions that make it work — same as
 * `use-invitation-filters.spec.tsx`, with a boolean in place of an enum.
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useWorkerFilters', () => {
  it('starts with nothing filtered, and sends no params', () => {
    const { result } = renderHook(() => useWorkerFilters());

    expect(result.current.search).toBe('');
    expect(result.current.active).toBe('all');
    expect(result.current.isFiltering).toBe(false);
    expect(result.current.params).toEqual({});
  });

  it('shows the typed text immediately and holds the request back', () => {
    const { result } = renderHook(() => useWorkerFilters());

    act(() => result.current.setSearch('Ben'));

    // On screen at once…
    expect(result.current.search).toBe('Ben');
    // …but not yet on the wire.
    expect(result.current.params).toEqual({});

    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current.params).toEqual({ search: 'Ben' });
  });

  it('only asks once for a name typed in one go', () => {
    const { result } = renderHook(() => useWorkerFilters());

    act(() => result.current.setSearch('B'));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.setSearch('Be'));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.setSearch('Ben'));
    expect(result.current.params).toEqual({});

    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current.params).toEqual({ search: 'Ben' });
  });

  it('drops a search made only of spaces', () => {
    const { result } = renderHook(() => useWorkerFilters());

    act(() => result.current.setSearch('   '));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

    expect(result.current.params).toEqual({});
    expect(result.current.isFiltering).toBe(false);
  });

  it('trims what it does send', () => {
    const { result } = renderHook(() => useWorkerFilters());

    act(() => result.current.setSearch('  Benali  '));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

    expect(result.current.params).toEqual({ search: 'Benali' });
  });

  it('turns "active" into true and "inactive" into false, immediately', () => {
    const { result } = renderHook(() => useWorkerFilters());

    act(() => result.current.setActive('active'));
    expect(result.current.params).toEqual({ active: true });

    act(() => result.current.setActive('inactive'));
    expect(result.current.params).toEqual({ active: false });
  });

  it('keeps "all" out of the params entirely', () => {
    const { result } = renderHook(() => useWorkerFilters());

    act(() => result.current.setActive('inactive'));
    act(() => result.current.setActive('all'));

    expect(result.current.params).toEqual({});
    expect(result.current.isFiltering).toBe(false);
  });

  it('combines both filters', () => {
    const { result } = renderHook(() => useWorkerFilters());

    act(() => result.current.setSearch('Karim'));
    act(() => result.current.setActive('active'));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

    expect(result.current.params).toEqual({ search: 'Karim', active: true });
  });

  it('clears both at once, without waiting for the debounce', () => {
    const { result } = renderHook(() => useWorkerFilters());

    act(() => result.current.setSearch('Karim'));
    act(() => result.current.setActive('inactive'));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current.params).not.toEqual({});

    act(() => result.current.clear());

    expect(result.current.params).toEqual({});
    expect(result.current.search).toBe('');
    expect(result.current.active).toBe('all');
    expect(result.current.isFiltering).toBe(false);
  });
});
