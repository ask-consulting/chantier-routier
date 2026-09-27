export class DeleteEquipmentAssignmentCommand {
  constructor(
    public readonly assignmentId: string,
    /** `equipment:correct-history` — may delete an assignment that started. */
    public readonly mayCorrectHistory = false,
  ) {}
}
