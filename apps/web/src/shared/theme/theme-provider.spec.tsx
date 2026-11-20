import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from './theme-provider';

function Probe() {
  const { preference, resolved, setPreference } = useTheme();
  return (
    <>
      <span>{`${preference}/${resolved}`}</span>
      <button type="button" onClick={() => setPreference('light')}>
        clair
      </button>
      <button type="button" onClick={() => setPreference('system')}>
        système
      </button>
    </>
  );
}

/**
 * Every value `<html data-theme>` takes, in order. An observer is called late,
 * once for a batch, so the history is rebuilt from each change's old value.
 */
function recordThemes(): { values: string[]; stop: () => void } {
  const values: string[] = [];
  const keep = (records: MutationRecord[]) => {
    for (const record of records) {
      values.push(record.oldValue ?? '');
    }
  };
  const observer = new MutationObserver(keep);
  observer.observe(document.documentElement, {
    attributeFilter: ['data-theme'],
    attributeOldValue: true,
  });
  return {
    values,
    stop: () => {
      keep(observer.takeRecords());
      values.push(document.documentElement.dataset.theme ?? '');
      observer.disconnect();
    },
  };
}

let darkSystem = false;
beforeEach(() => {
  darkSystem = false;
  window.localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: darkSystem,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe('ThemeProvider', () => {
  it('never paints light over the dark theme the init script applied', async () => {
    // What the inline script did before React ran.
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    document.documentElement.dataset.theme = 'dark';
    const themes = recordThemes();

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await act(async () => {});
    themes.stop();

    expect(screen.getByText('dark/dark')).toBeTruthy();
    expect(themes.values).not.toContain('light');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('follows the system when nothing is stored', async () => {
    darkSystem = true;
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await act(async () => {});

    expect(screen.getByText('system/dark')).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('stores a choice, and forgets it to follow the system again', async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await act(async () => {});

    fireEvent.click(screen.getByText('clair'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    fireEvent.click(screen.getByText('système'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
