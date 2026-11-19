import { ITaskMaterial, PlanNodeLevel } from '@chantia/shared';

export const TASK_MATERIALS_PORT = Symbol('TASK_MATERIALS_PORT');

/** Where a material comes from: the common catalog, or the organization's own. */
export type MaterialRef = { catalogMaterialId: string } | { materialId: string };

/** No tenant in any signature: the Prisma layer scopes them to the caller. */
export interface TaskMaterialsPort {
  findTask(id: string): Promise<{ worksiteId: string; level: PlanNodeLevel } | null>;
  /** A catalog material, or a live one of the caller's own; `null` for anything else. */
  resolveMaterial(id: string): Promise<MaterialRef | null>;
  /** Every planned need on the tasks of a worksite, prices included. */
  findForWorksite(worksiteId: string): Promise<ITaskMaterial[]>;
  isPlanned(taskId: string, material: MaterialRef): Promise<boolean>;
  add(row: {
    organizationId: string;
    taskId: string;
    material: MaterialRef;
    quantity: number;
    unitPrice: number | null;
  }): Promise<ITaskMaterial>;
  /** `null` when there is nothing of the caller's to change. */
  update(
    id: string,
    data: { quantity?: number; unitPrice?: number | null },
  ): Promise<ITaskMaterial | null>;
  /** `false` when there was nothing of the caller's to remove. */
  remove(id: string): Promise<boolean>;
}
