/**
 * Le déclenchement de la publication, depuis le portail.
 *
 * Le portail n'écrit jamais de commit git lui-même — il n'a ni les droits ni la position pour
 * ça (Vercel, pas le dépôt). Il déclenche `publier-note.yml` par `workflow_dispatch`, qui
 * recharge les décisions depuis Supabase (source de vérité, jamais ce que le navigateur
 * prétend avoir soumis), reconstruit le MDX final, le valide, et commite lui-même — même
 * répartition des rôles qu'entre `note-hebdo.yml` et le reste du pipeline.
 */

export type DispatchResult = { ok: boolean; erreur?: string };

const REPO = process.env.GITHUB_REPO ?? "njbsert-lgtm/cockpit-macro";
const WORKFLOW_FILE = "publier-note.yml";

export async function declencherPublication(
  slug: string,
  fetcher: typeof fetch = fetch,
): Promise<DispatchResult> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return { ok: false, erreur: "GITHUB_DISPATCH_TOKEN non configuré côté Vercel" };
  }

  let reponse: Response;
  try {
    reponse = await fetcher(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main", inputs: { slug } }),
      },
    );
  } catch (erreur) {
    return { ok: false, erreur: `GitHub injoignable — ${(erreur as Error).message}` };
  }

  if (!reponse.ok) {
    return { ok: false, erreur: `GitHub a répondu ${reponse.status}` };
  }
  return { ok: true };
}
