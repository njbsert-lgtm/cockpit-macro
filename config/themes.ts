/**
 * Les règles des thèmes sous observation — dans la configuration, pas dans le code.
 *
 * « Cinq thèmes sous observation au maximum : au-delà, on surveille tout, donc rien. » Les thèmes
 * `observe-sans-temoin` n'y comptent pas : ils n'occupent aucune attention, ils attendent.
 */
export const THEMES = {
  plafondObserves: 5,
  delaiJoursMin: 1,
  delaiJoursMax: 730,
} as const;
