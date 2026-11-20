/** The planning feature's public surface. */

// For a worksite's page, handed over by the `/worksites/[id]` route.
export { WorksitePlanning } from './ui/worksite-planning';

// For « Mes chantiers », which reads the same plan from the same cache entry.
export { planKey } from './api/planning.queries';
