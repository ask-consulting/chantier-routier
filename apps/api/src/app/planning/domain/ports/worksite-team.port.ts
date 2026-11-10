import { IWorksiteMember, IWorksiteTask } from '@chantia/shared';

export const WORKSITE_TEAM_PORT = Symbol('WORKSITE_TEAM_PORT');

/** A worksite with what « mes chantiers » needs to summarize it. */
export interface WorksiteWithPlan {
  id: string;
  code: string;
  name: string;
  client: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  tasks: IWorksiteTask[];
  memberCount: number;
}

/** Who works where. No tenant in any signature: the Prisma layer scopes them. */
export interface WorksiteTeamPort {
  isMember(worksiteId: string, userId: string): Promise<boolean>;
  listMembers(worksiteId: string): Promise<IWorksiteMember[]>;
  /** The ids, among these, of the organization's active accounts. */
  findActiveUserIds(userIds: string[]): Promise<string[]>;
  replaceMembers(organizationId: string, worksiteId: string, userIds: string[]): Promise<void>;
  /**
   * The worksites in progress the viewer may see, or the one named by `id`
   * whatever its status. `memberOf` absent: every worksite (an admin).
   */
  findVisible(options: { memberOf?: string; id?: string }): Promise<WorksiteWithPlan[]>;
}
