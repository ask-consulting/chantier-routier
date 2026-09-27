/**
 * The equipment feature's public surface. Everything else is private, and
 * ESLint says so: `@/features/equipment/*` is a forbidden import path.
 */

export { EquipmentListPage } from './ui/equipment-list-page';

// For the route, which hands in the worksites feature's picker.
export type { WorksitePicker, WorksitePickerProps } from './ui/assignments-drawer';

// For a worksite's page, handed over by the `/worksites/[id]` route.
export { WorksiteEquipment } from './ui/worksite-equipment';
