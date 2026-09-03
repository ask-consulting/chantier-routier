/**
 * The workers feature's public surface.
 *
 * Everything else is private, and ESLint says so: `@/features/workers/*` is a
 * forbidden import path. Only what appears below can be reached from a route.
 */

export { WorkerListPage } from './ui/worker-list-page';

export { useWorkers } from './api/worker.queries';
export type { WorkerListParams } from './api/worker.api';
