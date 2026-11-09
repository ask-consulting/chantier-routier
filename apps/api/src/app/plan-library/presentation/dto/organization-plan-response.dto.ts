import { ApiProperty } from '@nestjs/swagger';
import { IOrganizationPlan, IOrganizationPlanSummary, WorksiteKind } from '@chantia/shared';
import { OrganizationPlan, PlanNode } from '../../domain/entities/organization-plan.entity';

export class OrganizationPlanSummaryResponseDto implements IOrganizationPlanSummary {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) sourceTemplateId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: WorksiteKind }) kind!: WorksiteKind;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  // `organizationId` is left out on purpose: the caller already knows its own.
  static fromDomain(plan: OrganizationPlan): OrganizationPlanSummaryResponseDto {
    return {
      id: plan.id,
      sourceTemplateId: plan.sourceTemplateId,
      name: plan.name,
      kind: plan.kind,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }
}

export class OrganizationPlanResponseDto
  extends OrganizationPlanSummaryResponseDto
  implements IOrganizationPlan
{
  @ApiProperty({ type: 'array', items: { type: 'object' } }) nodes!: PlanNode[];

  static override fromDomain(plan: OrganizationPlan): OrganizationPlanResponseDto {
    return {
      ...OrganizationPlanSummaryResponseDto.fromDomain(plan),
      nodes: plan.nodes,
    };
  }
}
