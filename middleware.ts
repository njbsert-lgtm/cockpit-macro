import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { fetchWithTimeout } from "@/lib/http";
import { readClientCredentials } from "@/lib/supabase";
import { contournementLocal, estAdmin, ROUTE_INTROUVABLE } from "@/lib/auth/regles";

/**
 * La porte des routes d'administration.
 *
 * **Liste positive, jamais d'exclusion.** Le `matcher` nomme les seules routes protégées : une
 * route ajoutée au site est publique tant qu'on ne l'inscrit pas ici, mais aucune route
 * existante — le cron `/api/cron/collect`, protégé par son `Bearer CRON_SECRET`, l'accueil, les
 * notes — ne peut être interceptée par erreur. Une liste d'exclusions, elle, se périme au
 * premier oubli. Le `matcher` doit rester un littéral : Next le lit à la compilation.
 *
 * **Un refus est un 404, au corps identique à celui d'une adresse inconnue** : rien ne signale
 * à un visiteur qu'il y a là quelque chose à forcer. Échec fermé : base non configurée,
 * Supabase injoignable ou jeton refusé produisent le même 404.
 *
 * Le middleware ne suffit pas : Next rend chaque Server Action appelable par un POST direct.
 * Les pages et les actions portent donc leur propre garde (`lib/auth/session.ts`).
 */

export const config = {
  matcher: ["/admin/:path*", "/redaction/:path*", "/triage/:path*", "/diagnostic/:path*"],
};

const AUTH_TIMEOUT_MS = 8_000;

function refus(request: NextRequest): NextResponse {
  return NextResponse.rewrite(new URL(ROUTE_INTROUVABLE, request.url), { status: 404 });
}

function sansCache(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (contournementLocal(process.env, request.headers.get("host"))) {
    return sansCache(NextResponse.next());
  }

  const identifiants = readClientCredentials();
  if (!identifiants) return refus(request);

  // Le rafraîchissement d'un jeton expiré réécrit les cookies : sur la requête, pour que la
  // page les lise, et sur la réponse, pour que le navigateur les garde.
  let response = NextResponse.next({ request });
  const supabase = createServerClient(identifiants.url, identifiants.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (aPoser) => {
        for (const { name, value } of aPoser) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of aPoser) response.cookies.set(name, value, options);
      },
    },
    global: {
      fetch: (url: RequestInfo | URL, init?: RequestInit) =>
        fetchWithTimeout(String(url), { ...init, timeoutMs: AUTH_TIMEOUT_MS }),
    },
  });

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !estAdmin(data.user)) return refus(request);
  } catch {
    return refus(request);
  }

  return sansCache(response);
}
