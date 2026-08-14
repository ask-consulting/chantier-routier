/**
 * The worksite feature's public surface.
 *
 * Everything else — `api/worksite.api.ts`, `model/worksite-display.ts`, the
 * table's internals — is private, and ESLint says so: `@/features/worksites/*`
 * is a forbidden import path. Only what appears below can be reached from a
 * route or from another part of the application.
 *
 * Keep this list short. Every export is a promise: move or rename it later and
 * you break callers you cannot see from here.
 */

export { WorksiteListPage } from './ui/worksite-list-page';
export { WorksiteTable } from './ui/worksite-table';

// Exposed because the design-system page documents the tones, and because a
// dashboard will want to colour a status without duplicating the mapping.
export { WORKSITE_STATUS, WORKSITE_STATUS_TONE, varianceTone } from './model/worksite-display';

// Queries, for the screens that compose worksites with something else. The raw
// `worksite.api` functions stay private: a component that fetches without a
// cache key is exactly what this layout is meant to prevent.
export { useWorksite, useWorksites } from './api/worksite.queries';
export type { WorksiteListParams } from './api/worksite.api';
