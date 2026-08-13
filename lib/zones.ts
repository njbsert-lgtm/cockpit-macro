import type { Zone } from "./types";

// fr ⊂ ez ⊂ global, de ⊂ ez ⊂ global, us ⊂ global, cn ⊂ em ⊂ global — et les zones sœurs
// non listées explicitement suivent le même principe (une zone remonte toujours vers global).
const PARENTS: Record<Zone, Zone | null> = {
  fr: "ez",
  de: "ez",
  es: "ez",
  it: "ez",
  ez: "global",
  uk: "global",
  us: "global",
  jp: "global",
  cn: "em",
  in: "em",
  em: "global",
  global: null,
};

export const ALL_ZONES: Zone[] = [
  "us",
  "ez",
  "fr",
  "de",
  "es",
  "it",
  "uk",
  "jp",
  "cn",
  "in",
  "em",
  "global",
];

export const ZONE_LABELS: Record<Zone, string> = {
  us: "États-Unis",
  ez: "Zone euro",
  fr: "France",
  de: "Allemagne",
  es: "Espagne",
  it: "Italie",
  uk: "Royaume-Uni",
  jp: "Japon",
  cn: "Chine",
  in: "Inde",
  em: "Émergents",
  global: "Global",
};

/** La zone elle-même, puis tous ses ancêtres jusqu'à 'global' inclus. */
export function zoneAncestors(zone: Zone): Zone[] {
  const chain: Zone[] = [zone];
  let current = PARENTS[zone];
  while (current) {
    chain.push(current);
    current = PARENTS[current];
  }
  return chain;
}

/**
 * Un contenu taggé `itemZones` est-il visible pour la zone sélectionnée `selected` ?
 * Sélectionner 'fr' doit remonter les contenus taggés 'ez' et 'global' — pas l'inverse :
 * un contenu taggé 'fr' ne doit pas apparaître quand 'ez' ou 'global' est sélectionné.
 *
 * 'global' est la racine de l'arbre, pas une feuille comme les autres : c'est la vue
 * « rien de caché » choisie par défaut (voir DEFAULT_ZONE), donc elle montre tout, y compris
 * le contenu taggé uniquement 'fr' ou 'jp'. Sans ce cas particulier, le contenu spécifique à
 * une zone ne remonterait jamais vers 'global' — seul le contenu explicitement taggé 'global'
 * serait visible, ce qui viderait la vue par défaut de tout ce qui a une portée régionale.
 */
export function zoneMatches(itemZones: Zone[], selected: Zone): boolean {
  if (selected === "global") return true;
  const visible = new Set(zoneAncestors(selected));
  return itemZones.some((z) => visible.has(z));
}
