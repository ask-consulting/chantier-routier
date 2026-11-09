import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permission } from '@chantia/shared';
import { CurrentUser, RequirePermissions } from '@shared/auth';
import {
  CreateOrganizationPlanCommand,
  DeleteOrganizationPlanCommand,
  UpdateOrganizationPlanCommand,
} from '../../application/commands/plan-library.commands';
import {
  GetOrganizationPlanQuery,
  GetOrganizationPlansQuery,
} from '../../application/queries/plan-library.queries';
import { OrganizationPlan } from '../../domain/entities/organization-plan.entity';
import {
  OrganizationPlanResponseDto,
  OrganizationPlanSummaryResponseDto,
} from '../dto/organization-plan-response.dto';
import { CreateOrganizationPlanDto, UpdateOrganizationPlanDto } from '../dto/organization-plan.dto';

/**
 * An organization's own plans. Reads take no tenant: the Prisma layer scopes
 * them from the token, so another organization's plan is simply not found.
 */
@ApiTags('Plan library')
@ApiBearerAuth()
@Controller('organization-plans')
export class OrganizationPlanController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions(Permission.PLAN_READ)
  @ApiOperation({
    summary: 'The plans of the organization, without their lines',
  })
  @ApiResponse({ status: 200, type: [OrganizationPlanSummaryResponseDto] })
  async findAll(): Promise<OrganizationPlanSummaryResponseDto[]> {
    const plans = await this.queryBus.execute<GetOrganizationPlansQuery, OrganizationPlan[]>(
      new GetOrganizationPlansQuery(),
    );
    return plans.map((plan) => OrganizationPlanSummaryResponseDto.fromDomain(plan));
  }

  @Get(':id')
  @RequirePermissions(Permission.PLAN_READ)
  @ApiOperation({ summary: 'One plan with its phases, tasks and subtasks' })
  @ApiResponse({ status: 200, type: OrganizationPlanResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Unknown plan, or another tenant’s',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationPlanResponseDto> {
    const plan = await this.queryBus.execute<GetOrganizationPlanQuery, OrganizationPlan>(
      new GetOrganizationPlanQuery(id),
    );
    return OrganizationPlanResponseDto.fromDomain(plan);
  }

  @Post()
  @RequirePermissions(Permission.PLAN_MANAGE)
  @ApiOperation({
    summary: 'Copy a reference plan, or start an empty one',
    description: 'The copy belongs to the organization. The reference plan does not change.',
  })
  @ApiResponse({ status: 201, type: OrganizationPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Unknown reference plan' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateOrganizationPlanDto,
  ): Promise<OrganizationPlanResponseDto> {
    const plan = await this.commandBus.execute<CreateOrganizationPlanCommand, OrganizationPlan>(
      new CreateOrganizationPlanCommand(organizationId, dto),
    );
    return OrganizationPlanResponseDto.fromDomain(plan);
  }

  @Put(':id')
  @RequirePermissions(Permission.PLAN_MANAGE)
  @ApiOperation({ summary: 'Rename a plan or replace its whole tree' })
  @ApiResponse({ status: 200, type: OrganizationPlanResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Unknown plan, or another tenant’s',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationPlanDto,
  ): Promise<OrganizationPlanResponseDto> {
    const plan = await this.commandBus.execute<UpdateOrganizationPlanCommand, OrganizationPlan>(
      new UpdateOrganizationPlanCommand(id, dto),
    );
    return OrganizationPlanResponseDto.fromDomain(plan);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PLAN_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a plan of the organization' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({
    status: 404,
    description: 'Unknown plan, or another tenant’s',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeleteOrganizationPlanCommand(id));
  }
}
