/**
 * Who the client is, legally — and therefore which name they go by.
 *
 *   - `individual` (personne physique): a first and a last name.
 *   - `legal_entity` (personne morale): a company, a municipality, a ministry —
 *     a legal name (raison sociale) and no first name at all.
 */
export enum ClientType {
  INDIVIDUAL = 'individual',
  LEGAL_ENTITY = 'legal_entity',
}
