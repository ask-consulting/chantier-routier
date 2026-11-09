import {
  ICreateOrganizationPlan,
  IUpdateOrganizationPlan,
} from "@chantia/shared";

export class CreateOrganizationPlanCommand {
  constructor(
    public readonly organizationId: string,
    public readonly data: ICreateOrganizationPlan,
  ) {}
}

export class UpdateOrganizationPlanCommand {
  constructor(
    public readonly id: string,
    public readonly data: IUpdateOrganizationPlan,
  ) {}
}

export class DeleteOrganizationPlanCommand {
  constructor(public readonly id: string) {}
}
