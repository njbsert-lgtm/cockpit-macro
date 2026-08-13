import type { Zone } from "./types";
import { ALL_ZONES } from "./zones";

export const DEFAULT_ZONE: Zone = "global";
export const ZONE_PARAM = "zone";

export function parseZone(value: string | string[] | undefined | null): Zone {
  const v = Array.isArray(value) ? value[0] : value;
  return (ALL_ZONES as readonly string[]).includes(v ?? "")
    ? (v as Zone)
    : DEFAULT_ZONE;
}

/** Construit l'URL d'une page en conservant la zone sélectionnée. */
export function hrefWithZone(pathname: string, zone: Zone): string {
  return `${pathname}?${ZONE_PARAM}=${zone}`;
}
