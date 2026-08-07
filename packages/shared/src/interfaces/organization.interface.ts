/** Tenant. Every business row is isolated by `organizationId`. */
export interface IOrganization {
  id: string;
  name: string;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
}
