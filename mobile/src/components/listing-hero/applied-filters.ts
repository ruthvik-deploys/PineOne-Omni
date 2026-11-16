import type { ListingFilter } from '@/components/shared/filters-sheet';

export type Chip = { key: string; label: string; onRemove: () => void };

/** One removable chip per filter that's set (date filters aren't expected here: the hero owns the period). */
export function appliedChips(filters: ListingFilter[]): Chip[] {
  return filters.flatMap((filter, index): Chip[] => {
    if (filter.type === 'select') {
      const fallback = filter.defaultValue ?? filter.options[0]?.value ?? '';
      if (filter.value === fallback) return [];
      const option = filter.options.find((item) => item.value === filter.value);
      return [{ key: `${index}`, label: `${filter.label}: ${option?.label ?? filter.value}`, onRemove: () => filter.onApply(fallback) }];
    }
    if (filter.type === 'more') {
      return filter.categories.flatMap((category) =>
        (filter.applied[category.id] ?? []).map((id) => ({
          key: `${index}-${category.id}-${id}`,
          label: category.options.find((option) => option.id === id)?.label ?? id,
          onRemove: () => filter.onApply({ ...filter.applied, [category.id]: (filter.applied[category.id] ?? []).filter((item) => item !== id) }),
        }))
      );
    }
    return [];
  });
}

export function clearAll(filters: ListingFilter[]) {
  filters.forEach((filter) => {
    if (filter.type === 'select') filter.onApply(filter.defaultValue ?? filter.options[0]?.value ?? '');
    else if (filter.type === 'more') filter.onApply({});
  });
}

