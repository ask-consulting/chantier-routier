import { ApiProperty } from '@nestjs/swagger';
import { IWorksiteCosts } from '@chantia/shared';

export class WorksiteCostsResponseDto implements IWorksiteCosts {
  @ApiProperty() worksiteId: string;
  @ApiProperty({ description: 'Σ hoursWorked × hourlyRate' }) laborCost: number;
  @ApiProperty({ description: 'Σ expense amounts' }) expensesCost: number;
  @ApiProperty({
    description: 'Σ each assigned machine’s daily cost over its whole period, future days included',
  })
  equipmentCost: number;
  @ApiProperty({ description: 'laborCost + expensesCost + equipmentCost' }) actualCost: number;
  @ApiProperty({ nullable: true }) totalBudget: number | null;
  @ApiProperty({ nullable: true, description: 'totalBudget - actualCost' }) variance: number | null;

  static fromDomain(costs: IWorksiteCosts): WorksiteCostsResponseDto {
    const dto = new WorksiteCostsResponseDto();
    dto.worksiteId = costs.worksiteId;
    dto.laborCost = costs.laborCost;
    dto.expensesCost = costs.expensesCost;
    dto.equipmentCost = costs.equipmentCost;
    dto.actualCost = costs.actualCost;
    dto.totalBudget = costs.totalBudget;
    dto.variance = costs.variance;
    return dto;
  }
}
