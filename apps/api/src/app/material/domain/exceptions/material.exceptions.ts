import { DomainErrorKind, DomainException } from '@shared/domain/domain.exception';

export class UnknownMaterialCategoryException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'No such material category';
    super(message, [{ field: 'categoryId', code: 'form.errors.unknownMaterialCategory', message }]);
  }
}

/** Two live materials of one organization never share a name, whatever the case. */
export class MaterialLabelTakenException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor() {
    const message = 'A material of the organization already has this name';
    super(message, [{ field: 'label', code: 'form.errors.materialLabelTaken', message }]);
  }
}

/** A planned quantity is counted in the material's unit: changing it would change the quantity. */
export class MaterialUnitInUseException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor() {
    const message = 'A task already counts this material in its unit';
    super(message, [{ field: 'unit', code: 'form.errors.materialUnitInUse', message }]);
  }
}
