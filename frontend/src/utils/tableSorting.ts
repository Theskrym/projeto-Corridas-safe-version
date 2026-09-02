export type SortDirection = 'asc' | 'desc';

export interface SortState<TKey extends string> {
  key: TKey;
  direction: SortDirection;
}

export const cycleSort = <TKey extends string>(
  current: SortState<TKey> | null,
  key: TKey
): SortState<TKey> | null => {
  if (!current || current.key !== key) {
    return { key, direction: 'asc' };
  }

  if (current.direction === 'asc') {
    return { key, direction: 'desc' };
  }

  return null;
};

export const sortItems = <T, TKey extends string>(
  items: T[],
  sort: SortState<TKey> | null,
  getValue: (item: T, key: TKey) => string | number | Date | null | undefined
): T[] => {
  if (!sort) return items;

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const valueA = getValue(a.item, sort.key);
      const valueB = getValue(b.item, sort.key);
      let comparison = 0;

      if (valueA instanceof Date && valueB instanceof Date) {
        comparison = valueA.getTime() - valueB.getTime();
      } else if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = String(valueA ?? '').localeCompare(String(valueB ?? ''), 'pt-BR', {
          sensitivity: 'base',
          numeric: true
        });
      }

      if (comparison === 0) comparison = a.index - b.index;
      return sort.direction === 'asc' ? comparison : -comparison;
    })
    .map(({ item }) => item);
};
