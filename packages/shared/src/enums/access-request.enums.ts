/** The kind of worksite a prospect says they run. */
export enum AccessRequestKind {
  BUILDING = 'building',
  ROADS = 'roads',
  NETWORKS = 'networks',
  EARTHWORKS = 'earthworks',
  OTHER = 'other',
}

/** The language the showcase was read in: Tunisian in Arabic or Latin script, or French. */
export enum AccessRequestLocale {
  AR = 'ar',
  LATIN = 'la',
  FR = 'fr',
}
