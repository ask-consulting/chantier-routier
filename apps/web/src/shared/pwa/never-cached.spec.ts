import { describe, expect, it } from 'vitest';
import { isNeverCached } from './never-cached';

const APP = 'https://chantier-routier.vercel.app';

function request(href: string) {
  const url = new URL(href);
  return { url, sameOrigin: url.origin === APP };
}

describe('isNeverCached', () => {
  it('never keeps an answer of the API — another origin', () => {
    expect(isNeverCached(request('https://chantia-api.onrender.com/worksites'))).toBe(true);
    expect(isNeverCached(request('https://chantia-api.onrender.com/equipment/eq-1'))).toBe(true);
  });

  it('never keeps the session handlers', () => {
    expect(isNeverCached(request(`${APP}/api/auth/refresh`))).toBe(true);
    expect(isNeverCached(request(`${APP}/api/auth/login`))).toBe(true);
  });

  it('keeps the application’s own shell', () => {
    expect(isNeverCached(request(`${APP}/worksites`))).toBe(false);
    expect(isNeverCached(request(`${APP}/_next/static/chunks/main.js`))).toBe(false);
    expect(isNeverCached(request(`${APP}/icons/icon-192.png`))).toBe(false);
  });

  it('is not fooled by a page whose name starts like the API', () => {
    expect(isNeverCached(request(`${APP}/apiary`))).toBe(false);
  });
});
