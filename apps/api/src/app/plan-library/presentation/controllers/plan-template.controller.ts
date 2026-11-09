import { Controller, Get, Header, Param, ParseUUIDPipe } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IPlanTemplate, IPlanTemplateSummary, Permission } from '@chantia/shared';
import { RequirePermissions } from '@shared/auth';
import {
  GetPlanTemplateQuery,
  GetPlanTemplatesQuery,
} from '../../application/queries/plan-library.queries';

/**
 * The reference plans. The same for every organization and written only by
 * migrations: there is deliberately no route here that changes one.
 */
@ApiTags('Plan library')
@ApiBearerAuth()
@Controller('plan-templates')
export class PlanTemplateController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermissions(Permission.PLAN_READ)
  // Private: it is behind a token. An hour: it changes only with a deployment.
  @Header('Cache-Control', 'private, max-age=3600')
  @ApiOperation({
    summary: 'The reference plans, in display order, without their lines',
  })
  async findAll(): Promise<IPlanTemplateSummary[]> {
    return this.queryBus.execute<GetPlanTemplatesQuery, IPlanTemplateSummary[]>(
      new GetPlanTemplatesQuery(),
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.PLAN_READ)
  @Header('Cache-Control', 'private, max-age=3600')
  @ApiOperation({
    summary: 'One reference plan with its phases, tasks and subtasks',
  })
  @ApiResponse({ status: 404, description: 'Unknown reference plan' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IPlanTemplate> {
    return this.queryBus.execute<GetPlanTemplateQuery, IPlanTemplate>(new GetPlanTemplateQuery(id));
  }
}
