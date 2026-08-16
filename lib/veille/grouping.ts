import type { VeilleItem } from "@/lib/types";

export type VeilleDayGroup = {
  /** AAAA-MM-JJ, date de publication. */
  date: string;
  items: VeilleItem[];
};

/** Groupe par date de publication (UTC), du jour le plus récent au plus ancien. */
export function groupByDay(items: VeilleItem[]): VeilleDayGroup[] {
  const byDate = new Map<string, VeilleItem[]>();
  for (const item of items) {
    const date = item.publishedAt.slice(0, 10);
    const list = byDate.get(date) ?? [];
    list.push(item);
    byDate.set(date, list);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayItems]) => ({ date, items: dayItems }));
}

// « Les jours de plus de trois jours repliés par défaut » (cahier des charges, § Veille).
const COLLAPSE_AFTER_DAYS = 3;

export function isCollapsedByDefault(date: string, now: Date): boolean {
  const startOfDay = new Date(`${date}T00:00:00Z`).getTime();
  const days = Math.floor((now.getTime() - startOfDay) / (24 * 60 * 60 * 1000));
  return days > COLLAPSE_AFTER_DAYS;
}
