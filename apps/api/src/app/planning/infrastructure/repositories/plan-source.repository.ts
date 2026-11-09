import { Inject, Injectable } from '@nestjs/common';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { SourceNode, SourcePlan, treeOf } from '../../domain/plan-tree';
import { PlanSourcePort } from '../../domain/ports/plan-source.port';

const DEFAULT_LOCALE = 'fr';

/**
 * Reads what a planning starts from. The reference tables are the same for
 * everybody; an organization's plans go through the tenant filter, so another
 * organization's plan is simply not found.
 */
@Injectable()
export class PlanSourceRepository implements PlanSourcePort {
  constructor(@Inject(TENANT_PRISMA) private readonly prisma: TenantPrismaClient) {}

  async findTemplate(id: string, locale: string): Promise<SourcePlan | null> {
    const row = await this.prisma.planTemplate.findUnique({
      where: { id },
      include: {
        nodes: {
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: {
              where: { locale: { in: [locale, DEFAULT_LOCALE] } },
              select: { locale: true, label: true },
            },
          },
        },
      },
    });
    if (!row) {
      return null;
    }
    return {
      nodes: treeOf<(typeof row.nodes)[number], SourceNode>(
        row.nodes,
        (node) => node.id,
        (node) => node.parentId,
        (node, children) => {
          const label = (wanted: string) =>
            node.translations.find((translation) => translation.locale === wanted)?.label;
          return {
            label: label(locale) ?? label(DEFAULT_LOCALE) ?? node.code,
            isControl: node.isControl,
            code: node.code,
            children,
          };
        },
      ),
    };
  }

  async findOrganizationPlan(id: string): Promise<SourcePlan | null> {
    const row = await this.prisma.organizationPlan.findUnique({
      where: { id },
      include: { nodes: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!row) {
      return null;
    }
    return {
      nodes: treeOf<(typeof row.nodes)[number], SourceNode>(
        row.nodes,
        (node) => node.id,
        (node) => node.parentId,
        (node, children) => ({
          label: node.label,
          isControl: node.isControl,
          code: null,
          children,
        }),
      ),
    };
  }
}
