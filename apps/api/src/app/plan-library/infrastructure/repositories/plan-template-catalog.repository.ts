import { Inject, Injectable } from '@nestjs/common';
import {
  IPlanTemplate,
  IPlanTemplateNode,
  IPlanTemplateSummary,
  PlanNodeLevel,
  Translations,
  WorksiteKind,
} from '@chantia/shared';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { PlanTemplateCatalogPort } from '../../domain/ports/plan-template-catalog.port';

interface NodeRow {
  id: string;
  parentId: string | null;
  level: string;
  isControl: boolean;
  translations: readonly { locale: string; label: string }[];
}

const TRANSLATIONS = { select: { locale: true, label: true } } as const;

function labelsOf(rows: readonly { locale: string; label: string }[]): Translations {
  return Object.fromEntries(rows.map((row) => [row.locale, row.label]));
}

function treeOf(rows: readonly NodeRow[]): IPlanTemplateNode[] {
  const byParent = new Map<string | null, NodeRow[]>();
  for (const row of rows) {
    byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row]);
  }
  const childrenOf = (parent: string | null): IPlanTemplateNode[] =>
    (byParent.get(parent) ?? []).map((row) => ({
      id: row.id,
      level: row.level as PlanNodeLevel,
      isControl: row.isControl,
      labels: labelsOf(row.translations),
      children: childrenOf(row.id),
    }));
  return childrenOf(null);
}

/**
 * Reads the reference tables. They carry no `organizationId`, so the tenant
 * extension leaves these queries alone: the library is the same for all.
 */
@Injectable()
export class PlanTemplateCatalogRepository implements PlanTemplateCatalogPort {
  constructor(@Inject(TENANT_PRISMA) private readonly prisma: TenantPrismaClient) {}

  async list(): Promise<IPlanTemplateSummary[]> {
    const rows = await this.prisma.planTemplate.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: TRANSLATIONS,
        _count: { select: { nodes: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind as WorksiteKind,
      labels: labelsOf(row.translations),
      nodeCount: row._count.nodes,
    }));
  }

  async findById(id: string): Promise<IPlanTemplate | null> {
    const row = await this.prisma.planTemplate.findUnique({
      where: { id },
      include: {
        translations: TRANSLATIONS,
        nodes: {
          orderBy: { sortOrder: 'asc' },
          include: { translations: TRANSLATIONS },
        },
      },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      kind: row.kind as WorksiteKind,
      labels: labelsOf(row.translations),
      nodes: treeOf(row.nodes),
    };
  }
}
