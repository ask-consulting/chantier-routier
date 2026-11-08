import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/prisma/prisma.service';
import { AccessRequest } from '../../domain/entities/access-request.entity';
import { AccessRequestRepositoryPort } from '../../domain/ports/access-request-repository.port';
import { AccessRequestMapper } from '../mappers/access-request.mapper';

/** `PrismaService` directly: an access request belongs to no organization. */
@Injectable()
export class AccessRequestRepository implements AccessRequestRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(request: AccessRequest): Promise<AccessRequest> {
    const row = await this.prisma.accessRequest.create({
      data: {
        id: request.id,
        company: request.company,
        phone: request.phone,
        kind: request.kind,
        locale: request.locale,
      },
    });
    return AccessRequestMapper.toDomain(row);
  }

  countSince(date: Date): Promise<number> {
    return this.prisma.accessRequest.count({ where: { createdAt: { gte: date } } });
  }
}
