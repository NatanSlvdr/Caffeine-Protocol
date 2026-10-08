import type { Language } from '@/shared/language';
import { typeset } from '@/shared/typography';

/**
 * Lays a catalog of French words over data kept by id: each item's French is built once, set with French typography,
 * and replaces the English field by field. An item or a field the catalog doesn't tell keeps its English, and English
 * gives back the very same item.
 */
export function toldIn<T extends { id: string }>(
  items: readonly T[],
  told: Record<string, Partial<Record<keyof T, string>>>,
): (item: T, language: Language) => T {
  const french = new Map(
    items.map((item) => {
      const fr = told[item.id];
      if (!fr) return [item.id, item];
      const fields = Object.entries(fr).map(([key, text]) => [key, typeset(text as string)]);
      return [item.id, { ...item, ...Object.fromEntries(fields) } as T];
    }),
  );
  return (item, language) => (language === 'fr' ? (french.get(item.id) ?? item) : item);
}
