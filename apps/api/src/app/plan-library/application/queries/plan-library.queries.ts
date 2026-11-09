export class GetPlanTemplatesQuery {}

export class GetPlanTemplateQuery {
  constructor(public readonly code: string) {}
}

export class GetOrganizationPlansQuery {}

export class GetOrganizationPlanQuery {
  constructor(public readonly id: string) {}
}
