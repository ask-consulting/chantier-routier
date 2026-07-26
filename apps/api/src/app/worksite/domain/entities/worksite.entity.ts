import { WorksiteStatus } from '@chantia/shared';

/** Worksite aggregate root. */
export class Worksite {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly code: string,
    public readonly name: string,
    public readonly client: string | null,
    public readonly address: string | null,
    public readonly latitude: number | null,
    public readonly longitude: number | null,
    public readonly plannedStartDate: Date | null,
    public readonly plannedEndDate: Date | null,
    public readonly status: WorksiteStatus,
    public readonly totalBudget: number | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(props: {
    id: string;
    organizationId: string;
    code: string;
    name: string;
    client?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    plannedStartDate?: Date | null;
    plannedEndDate?: Date | null;
    status?: WorksiteStatus;
    totalBudget?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Worksite {
    return new Worksite(
      props.id,
      props.organizationId,
      props.code,
      props.name,
      props.client ?? null,
      props.address ?? null,
      props.latitude ?? null,
      props.longitude ?? null,
      props.plannedStartDate ?? null,
      props.plannedEndDate ?? null,
      props.status ?? WorksiteStatus.UPCOMING,
      props.totalBudget ?? null,
      props.createdAt,
      props.updatedAt,
    );
  }
}
