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

/** A phase or a task with subtasks takes its progress from them. */
export class TaskProgressFromChildrenException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'This line takes its progress from the lines under it';
    super(message, [{ field: 'progress', code: 'form.errors.taskProgressFromChildren', message }]);
  }
}

/** Every member must be an active account of the organization. */
export class InvalidWorksiteMembersException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'Every member must be an active account of the organization';
    super(message, [{ field: 'userIds', code: 'form.errors.unknownMember', message }]);
  }
}

/** People and machines go on tasks and subtasks: a phase is only their sum. */
export class TaskNotAssignableException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'People and machines go on tasks, not on a phase';
    super(message, [{ field: 'taskId', code: 'form.errors.taskNotAssignable', message }]);
  }
}

export class WorkerNotAvailableException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'This worker is unknown or no longer active';
    super(message, [{ field: 'workerId', code: 'form.errors.workerNotAvailable', message }]);
  }
}

export class AlreadyOnTaskException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(field: 'workerId' | 'equipmentAssignmentId') {
    const message = 'Already on this task';
    super(message, [{ field, code: 'form.errors.alreadyOnTask', message }]);
  }
}

/** A lump sum has no default: it is agreed for each task. */
export class TaskRateRequiredException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'Paid by the task: the amount for the task is required';
    super(message, [{ field: 'rate', code: 'form.errors.taskRateRequired', message }]);
  }
}

export class EquipmentNotOnWorksiteException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor() {
    const message = 'This machine is not booked on the worksite of the task';
    super(message, [
      { field: 'equipmentAssignmentId', code: 'form.errors.equipmentNotOnWorksite', message },
    ]);
  }
}
