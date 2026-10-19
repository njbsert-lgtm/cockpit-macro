/**
 * La pastille de variation, lue d'un coup d'œil : vert pâle en hausse, rouge pâle en baisse.
 * Le fond porte le signe autant que le texte, mais le signe reste écrit — la couleur seule ne
 * suffit jamais, elle est invisible pour une partie des lecteurs.
 */
export function ChangePill({ change, direction }: { change: string; direction: "up" | "down" | "flat" }) {
  const tone =
    direction === "up"
      ? "bg-hausse/11 text-hausse"
      : direction === "down"
        ? "bg-baisse/11 text-baisse"
        : "bg-trait text-doux";

  return (
    <span
      className={`inline-block rounded-rp px-1.5 py-0.5 text-11 font-semibold tabular-nums ${tone}`}
    >
      {change}
    </span>
  );
}
