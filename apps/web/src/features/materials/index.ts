/**
 * The materials feature's public surface. Everything else is private, and
 * ESLint says so: `@/features/materials/*` is a forbidden import path.
 */

export { MaterialsPage } from './ui/materials-page';

// For a worksite's page, handed over by the `/my-worksites/[id]` route.
export { TaskMaterials } from './ui/task-materials';

// For other features caching material data.
export { materialKeys } from './api/materials.queries';
