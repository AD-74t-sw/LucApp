export type Page<T> = Readonly<{
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}>;

export function pageOf<T>(items: T[], page: number, pageSize: number, total: number): Page<T> {
  return { items, page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
