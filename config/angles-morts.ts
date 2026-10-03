/**
 * Les seuils du compteur d'angles morts — dans la configuration, pas dans le code, comme les
 * règles d'alerte de prix.
 *
 * Le compteur mesure l'incomplétude de la grille, pas la vigilance : un événement de matérialité
 * haute qui ne se rattache à aucun axe signale que le modèle du driver n'a pas de case pour lui.
 */
export const ANGLES_MORTS = {
  /** « En un trimestre » : une fenêtre glissante, comme les autres règles du cahier. */
  fenetreJours: 91,
  /** Angles morts avec driver, sans axe : trois sur le même driver — il manque une dimension. */
  seuilAvecDriver: 3,
  /** Angles morts sans driver : deux sur un même sujet — le marché suit une force absente. */
  seuilSansDriver: 2,
} as const;
