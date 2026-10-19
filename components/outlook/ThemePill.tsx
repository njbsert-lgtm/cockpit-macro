import type { OutlookTheme } from "@/lib/types";

/** Pastille de thème d'outlook : contour `--trait`, sans fond — distincte de la pastille de driver. */
export function ThemePill({ theme }: { theme: OutlookTheme }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-rp border border-trait px-[9px] py-[3px] text-11-5 text-encre">
      <span aria-hidden="true">{theme.emoji}</span>
      {theme.label}
    </span>
  );
}
