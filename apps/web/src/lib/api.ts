import type { IWorksite } from '@chantia/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://chantia-api.onrender.com';

// TODO: replace with the authenticated tenant id once Supabase auth is wired.
const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'b62107ee-2174-463f-9365-1fa967cc1925';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'x-organization-id': ORG_ID },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Requête API échouée (${res.status}) sur ${path}`);
  }
  return res.json() as Promise<T>;
}

export function fetchWorksites(): Promise<Paginated<IWorksite>> {
  return apiGet<Paginated<IWorksite>>('/worksites');
}
