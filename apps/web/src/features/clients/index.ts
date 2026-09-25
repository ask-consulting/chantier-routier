/**
 * The clients feature's public surface. Everything else is private, and
 * ESLint says so: `@/features/clients/*` is a forbidden import path.
 */

export { ClientListPage } from './ui/client-list-page';

// For the worksite drawer, handed over by the `/worksites` route: features do
// not import each other, a route composes them.
export { ClientSelect } from './ui/client-select';
