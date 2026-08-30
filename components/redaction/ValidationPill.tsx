/**
 * La pastille ronde de 17px (DESIGN.md) : pleine verte si conforme, en pointillés `--k-choc`
 * sinon. Réutilisée pour l'état d'un bloc et pour le verdict d'un chiffre — c'est le même
 * signal, « conforme ou non », juste appliqué à deux granularités différentes.
 */
export function ValidationPill({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-rp text-9-5 ${
        ok ? "bg-hausse text-white" : "border border-dashed border-k-choc text-k-choc"
      }`}
    >
      {ok ? "✓" : ""}
    </span>
  );
}
