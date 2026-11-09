import { DomainErrorKind, DomainException } from '@shared/domain/domain.exception';

/** The dates of a planning are proposed over the worksite's period: it needs one. */
export class WorksitePeriodRequiredException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'The worksite needs a planned start and end date';
    super(message, [
      { field: 'plannedStartDate', code: 'form.errors.worksitePeriodRequired', message },
    ]);
  }
}

/** Starting over is deliberate: the planning has to be deleted first. */
export class WorksitePlanExistsException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor() {
    const message = 'This worksite already has a planning';
    super(message, [{ field: 'templateId', code: 'form.errors.worksitePlanExists', message }]);
  }
}

export class InvalidPlanSourceException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'Name exactly one plan to start from';
    super(message, [{ field: 'templateId', code: 'form.errors.planSourceRequired', message }]);
  }
}

export class InvalidTaskDatesException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'A task cannot end before it starts';
    super(message, [{ field: 'plannedEnd', code: 'form.errors.taskEndBeforeStart', message }]);
  }
}

/** A phase or a task with subtasks takes its dates from them. */
export class TaskDatesFromChildrenException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'This line takes its dates from the lines under it';
    super(message, [{ field: 'plannedStart', code: 'form.errors.taskDatesFromChildren', message }]);
  }
}
