/** The families of worksites a plan can be written for. */
export enum WorksiteKind {
  BUILDING = "building",
  ROADS = "roads",
  NETWORKS = "networks",
  EARTHWORKS = "earthworks",
  OTHER = "other",
}

/** The three levels of a project plan, from the widest to the finest. */
export enum PlanNodeLevel {
  PHASE = "phase",
  TASK = "task",
  SUBTASK = "subtask",
}
