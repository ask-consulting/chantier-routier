import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from './cors-origins';

/**
 * Every failure mode here is silent, the same way `security-headers.spec.ts`
 * describes: a browser blocked by CORS shows nothing on this server, only an
 * unhelpful console message on the other side. Worth pinning both directions —
 * what gets in, and what a nearly-identical origin does not.
 */

const ALLOWED = ['http://localhost:3000', 'https://chantier-routier.vercel.app'];

describe('isAllowedOrigin', () => {
  it('allows an origin from the fixed list', () => {
    expect(isAllowedOrigin('http://localhost:3000', ALLOWED)).toBe(true);
    expect(isAllowedOrigin('https://chantier-routier.vercel.app', ALLOWED)).toBe(true);
  });

  it('allows a real preview URL, hash and all', () => {
    expect(
      isAllowedOrigin('https://chantier-routier-3llprhhft-aellouzes-projects.vercel.app', ALLOWED),
    ).toBe(true);
    expect(
      isAllowedOrigin('https://chantier-routier-d0iczxfrm-aellouzes-projects.vercel.app', ALLOWED),
    ).toBe(true);
  });

  it('refuses a same-named project in another Vercel team', () => {
    // Anyone can name a project `chantier-routier-<x>`; only the team slug is ours.
    expect(isAllowedOrigin('https://chantier-routier-abc123-a-different-team.vercel.app', ALLOWED)).toBe(
      false,
    );
    expect(isAllowedOrigin('https://chantier-routier-evil-attacker.vercel.app', ALLOWED)).toBe(false);
    expect(
      isAllowedOrigin('https://chantier-routier-evil-x9y8z7-attacker-team.vercel.app', ALLOWED),
    ).toBe(false);
  });

  it('refuses a known domain with a suffix appended', () => {
    expect(isAllowedOrigin('https://chantier-routier.vercel.app.evil.com', ALLOWED)).toBe(false);
    expect(
      isAllowedOrigin('https://chantier-routier-abc123-aellouzes-projects.vercel.app.evil.com', ALLOWED),
    ).toBe(false);
  });

  it('refuses another Vercel project entirely', () => {
    expect(isAllowedOrigin('https://evil-chantier-routier-abc-team.vercel.app', ALLOWED)).toBe(false);
    expect(isAllowedOrigin('https://some-other-app-abc-team.vercel.app', ALLOWED)).toBe(false);
  });

  it('refuses plain HTTP for a preview URL — only HTTPS previews exist', () => {
    expect(isAllowedOrigin('http://chantier-routier-abc123-aellouzes-projects.vercel.app', ALLOWED)).toBe(false);
  });

  it('refuses an origin that is not in the list and not a preview at all', () => {
    expect(isAllowedOrigin('https://chantia-api.onrender.com', ALLOWED)).toBe(false);
    expect(isAllowedOrigin('https://attacker.example', ALLOWED)).toBe(false);
  });
});
