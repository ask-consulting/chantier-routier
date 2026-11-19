import { ITaskTeam, ITaskWorker, PayMode, PlanNodeLevel } from '@chantia/shared';

export const TASK_TEAM_PORT = Symbol('TASK_TEAM_PORT');

/** No tenant in any signature: the Prisma layer scopes them to the caller. */
export interface TaskTeamPort {
  findTask(id: string): Promise<{ worksiteId: string; level: PlanNodeLevel } | null>;
  /** A worker still on the payroll, or `null`. */
  findActiveWorker(id: string): Promise<{ hourlyRate: number } | null>;
  /** Everybody and everything on the tasks of a worksite, rates included. */
  findTeam(worksiteId: string): Promise<ITaskTeam>;
  isWorkerOnTask(taskId: string, workerId: string): Promise<boolean>;
  addWorker(row: {
    organizationId: string;
    taskId: string;
    workerId: string;
    payMode: PayMode;
    rate: number;
  }): Promise<ITaskWorker>;
  /** `false` when there was nothing of the caller's to remove. */
  removeWorker(id: string): Promise<boolean>;
  findEquipmentAssignment(id: string): Promise<{ worksiteId: string } | null>;
  isEquipmentOnTask(taskId: string, equipmentAssignmentId: string): Promise<boolean>;
  linkEquipment(
    organizationId: string,
    taskId: string,
    equipmentAssignmentId: string,
  ): Promise<void>;
  unlinkEquipment(id: string): Promise<boolean>;
}
