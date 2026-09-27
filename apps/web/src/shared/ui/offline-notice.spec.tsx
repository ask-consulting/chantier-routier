import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { OfflineNotice } from './offline-notice';

afterEach(cleanup);

describe('OfflineNotice', () => {
  it('says there is no network, and retries on demand', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    renderWithProviders(<OfflineNotice />);

    expect(screen.getByText('Pas de réseau')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(reload).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
