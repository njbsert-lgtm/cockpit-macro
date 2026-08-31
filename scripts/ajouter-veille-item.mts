/**
 * Verse un item de veille directement dans `/triage`, sans passer par un collecteur.
 *
 *   npm run veille:ajouter -- --title="..." --url="..." --source="..." --publishedAt=2026-08-19 \
 *     --zones=us --drivers=rates --channels=fonction-reaction
 *
 * Sert à ce qu'un document lu à la main hors des sources automatiques (un papier de recherche
 * de banque, par exemple — jamais scrapé, jamais collecté par la passe 1) entre quand même dans
 * la file de tri comme n'importe quel autre item : lien et métadonnées seulement, jamais le
 * texte intégral (droit d'auteur, cahier des charges § Veille). `id` est le même hash stable de
 * (source, url) que `toVeilleItem` — l'upsert le rend idempotent, relancer avec les mêmes
 * `--source`/`--url` ne duplique rien.
 */
import { getWriteClient } from "../lib/supabase";
import { stableId } from "../lib/veille/filter";
import type { VeilleChannel, Zone } from "../lib/types";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

function listArg(name: string): string[] {
  return (
    arg(name)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

async function main(): Promise<void> {
  const title = arg("title");
  const url = arg("url");
  const source = arg("source");
  const publishedAt = arg("publishedAt");

  if (!title || !url || !source || !publishedAt) {
    console.error(
      'Usage : veille:ajouter -- --title="..." --url="..." --source="..." ' +
        "--publishedAt=2026-08-19 [--zones=us,global] [--drivers=rates] [--channels=fonction-reaction]",
    );
    process.exit(1);
  }

  const client = getWriteClient();
  if (!client) {
    console.error("Supabase non configuré côté écriture (SUPABASE_SERVICE_ROLE_KEY manquante).");
    process.exit(1);
  }

  const id = stableId(source, url);
  const row = {
    id,
    title,
    url,
    source,
    published_at: publishedAt,
    zones: listArg("zones") as Zone[],
    driver_refs: listArg("drivers"),
    channels: listArg("channels") as VeilleChannel[],
    is_signal: true,
    status: "nouveau",
    attached_to_block: null,
    draft_note_slug: null,
    collected_at: new Date().toISOString(),
  };

  const { error } = await client.from("veille_items").upsert(row, { onConflict: "id" });
  if (error) {
    console.error(`Échec de l'écriture : ${error.message}`);
    process.exit(1);
  }

  console.log(`Item ajouté à /triage : « ${title} » (id ${id}).`);
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
