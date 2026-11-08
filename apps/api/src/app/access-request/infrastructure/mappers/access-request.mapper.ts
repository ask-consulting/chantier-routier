import { AccessRequestKind, AccessRequestLocale } from '@chantia/shared';
import { AccessRequest as PrismaAccessRequest } from '@prisma/client';
import { AccessRequest } from '../../domain/entities/access-request.entity';

export class AccessRequestMapper {
  static toDomain(row: PrismaAccessRequest): AccessRequest {
    return AccessRequest.create({
      id: row.id,
      company: row.company,
      phone: row.phone,
      kind: row.kind as AccessRequestKind,
      locale: row.locale as AccessRequestLocale,
      createdAt: row.createdAt,
    });
  }
}
