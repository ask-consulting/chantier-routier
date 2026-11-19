import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IMaterialCategory, IOwnMaterial } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  MaterialLabelTakenException,
  MaterialUnitInUseException,
  UnknownMaterialCategoryException,
} from '../domain/exceptions/material.exceptions';
import { MATERIAL_PORT, MaterialPort } from '../domain/ports/material.port';
import {
  CreateOwnMaterialCommand,
  GetMaterialCatalogQuery,
  GetOwnMaterialsQuery,
  RemoveOwnMaterialCommand,
  UpdateOwnMaterialCommand,
} from './material.messages';

@QueryHandler(GetMaterialCatalogQuery)
export class GetMaterialCatalogHandler implements IQueryHandler<GetMaterialCatalogQuery> {
  constructor(@Inject(MATERIAL_PORT) private readonly materials: MaterialPort) {}

  execute(): Promise<IMaterialCategory[]> {
    return this.materials.listCatalog();
  }
}

@QueryHandler(GetOwnMaterialsQuery)
export class GetOwnMaterialsHandler implements IQueryHandler<GetOwnMaterialsQuery> {
  constructor(@Inject(MATERIAL_PORT) private readonly materials: MaterialPort) {}

  execute(): Promise<IOwnMaterial[]> {
    return this.materials.listOwn();
  }
}

/** Adds a material of the organization's own beside the common catalog. */
@CommandHandler(CreateOwnMaterialCommand)
export class CreateOwnMaterialHandler implements ICommandHandler<CreateOwnMaterialCommand> {
  constructor(@Inject(MATERIAL_PORT) private readonly materials: MaterialPort) {}

  async execute({ organizationId, data }: CreateOwnMaterialCommand): Promise<IOwnMaterial> {
    const label = data.label.trim();
    if (!(await this.materials.categoryExists(data.categoryId))) {
      throw new UnknownMaterialCategoryException();
    }
    if (await this.materials.isLabelTaken(label)) {
      throw new MaterialLabelTakenException();
    }
    return this.materials.createOwn(organizationId, { ...data, label });
  }
}

/**
 * Renames, refiles, or changes the unit of an own material — the unit only
 * while no task counts in it yet.
 */
@CommandHandler(UpdateOwnMaterialCommand)
export class UpdateOwnMaterialHandler implements ICommandHandler<UpdateOwnMaterialCommand> {
  constructor(@Inject(MATERIAL_PORT) private readonly materials: MaterialPort) {}

  async execute({ id, data }: UpdateOwnMaterialCommand): Promise<IOwnMaterial> {
    const current = await this.materials.findOwn(id);
    if (!current) {
      throw new ResourceNotFoundException('Material', id);
    }
    const label = data.label?.trim();
    if (data.categoryId !== undefined && !(await this.materials.categoryExists(data.categoryId))) {
      throw new UnknownMaterialCategoryException();
    }
    if (label !== undefined && (await this.materials.isLabelTaken(label, id))) {
      throw new MaterialLabelTakenException();
    }
    if (
      data.unit !== undefined &&
      data.unit !== current.unit &&
      (await this.materials.isInUse(id))
    ) {
      throw new MaterialUnitInUseException();
    }
    return this.materials.updateOwn(id, {
      ...(data.categoryId === undefined ? {} : { categoryId: data.categoryId }),
      ...(label === undefined ? {} : { label }),
      ...(data.unit === undefined ? {} : { unit: data.unit }),
    });
  }
}

@CommandHandler(RemoveOwnMaterialCommand)
export class RemoveOwnMaterialHandler implements ICommandHandler<RemoveOwnMaterialCommand> {
  constructor(@Inject(MATERIAL_PORT) private readonly materials: MaterialPort) {}

  async execute({ id }: RemoveOwnMaterialCommand): Promise<void> {
    if (!(await this.materials.findOwn(id))) {
      throw new ResourceNotFoundException('Material', id);
    }
    await this.materials.removeOwn(id);
  }
}
