/**
 * The materials feature's public surface. Everything else is private, and
 * ESLint says so: `@/features/materials/*` is a forbidden import path.
 */

export { MaterialsPage } from './ui/materials-page';

// For a worksite's tasks: what a task can be planned to need.
export { useMaterialCatalog, useOwnMaterials } from './api/materials.queries';
export { choicesOf, labelOf, needLabel, parseQuantity, type MaterialChoice } from './model/materials';
