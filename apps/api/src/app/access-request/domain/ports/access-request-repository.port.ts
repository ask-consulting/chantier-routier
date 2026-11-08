import { AccessRequest } from '../entities/access-request.entity';

export interface AccessRequestRepositoryPort {
  save(request: AccessRequest): Promise<AccessRequest>;
  countSince(date: Date): Promise<number>;
}

export const ACCESS_REQUEST_REPOSITORY_PORT = Symbol('AccessRequestRepositoryPort');
