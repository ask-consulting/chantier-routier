import { SearchParams } from '../../domain/search.types';

/**
 * Builds Prisma `where` / `orderBy` from generic SearchParams.
 * `searchableFields` lists the columns a free-text `search` filter matches against.
 */
export function buildPrismaSearchQuery(
  params: SearchParams,
  defaultSortField: string,
  options: { searchableFields?: string[]; sortFieldMapping?: Record<string, string> } = {},
): {
  where: Record<string, unknown>;
  orderBy: Record<string, unknown>;
} {
  const { searchableFields = ['name', 'code'], sortFieldMapping = {} } = options;
  const where: Record<string, unknown> = {};
  const orderBy: Record<string, unknown> = {};

  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value === undefined || value === null || value === '') continue;

      if (key === 'search' && typeof value === 'string') {
        where.OR = searchableFields.map((field) => ({
          [field]: { contains: value, mode: 'insensitive' },
        }));
      } else {
        where[key] = value;
      }
    }
  }

  if (params.sort) {
    const field = sortFieldMapping[params.sort.field] ?? params.sort.field;
    orderBy[field] = params.sort.order;
  } else {
    orderBy[defaultSortField] = 'asc';
  }

  return { where, orderBy };
}
