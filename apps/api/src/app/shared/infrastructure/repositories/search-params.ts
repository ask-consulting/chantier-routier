import { DEFAULT_PAGE_SIZE, PaginationParams } from '../../domain/search.types';

export function getPrismaPagination(params: PaginationParams): {
  skip: number;
  take: number | undefined;
  page: number;
  limit: number;
} {
  if (params.paginated === false) {
    return { skip: 0, take: undefined, page: 1, limit: 0 };
  }

  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}
