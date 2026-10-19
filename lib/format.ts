const shortFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const longFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateShort(iso: string): string {
  return shortFormatter.format(new Date(iso + "T00:00:00Z"));
}

/** « 14/10 » : jour et mois seuls, pour les dates proches qu'on lit d'un coup d'œil. */
export function formatJourMois(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export function formatDateLong(iso: string): string {
  return longFormatter.format(new Date(iso + "T00:00:00Z"));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatSignedPct(pct: number, digits = 1): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(digits).replace(".", ",")} %`;
}

export function formatSignedBps(bps: number): string {
  const sign = bps > 0 ? "+" : "";
  return `${sign}${Math.round(bps)} bps`;
}
