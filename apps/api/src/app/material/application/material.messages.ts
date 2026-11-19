import { ICreateOwnMaterial, IUpdateOwnMaterial } from '@chantia/shared';

export class GetMaterialCatalogQuery {}

export class GetOwnMaterialsQuery {}

export class CreateOwnMaterialCommand {
  constructor(
    public readonly organizationId: string,
    public readonly data: ICreateOwnMaterial,
  ) {}
}

export class UpdateOwnMaterialCommand {
  constructor(
    public readonly id: string,
    public readonly data: IUpdateOwnMaterial,
  ) {}
}

export class RemoveOwnMaterialCommand {
  constructor(public readonly id: string) {}
}
