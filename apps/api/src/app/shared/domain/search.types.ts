export const DEFAULT_PAGE_SIZE = 20;

export interface PaginationParams {
  page?: number;
  limit?: number;
  paginated?: boolean;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: unknown;
}

export interface SearchParams extends PaginationParams {
  sort?: SortParams;
  filters?: FilterParams;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
