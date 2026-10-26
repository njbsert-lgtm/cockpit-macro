import { NextResponse, type NextRequest } from "next/server";
import { confirmerLien } from "@/lib/auth/connexion";
import { clientSession } from "@/lib/auth/session";
import { ROUTE_CONNEXION } from "@/lib/auth/regles";

/**
 * Le retour du lien magique : ouvre la session en cookie, puis mène au portail de rédaction.
 * Un lien expiré, déjà utilisé ou ouvert pour un compte non administrateur ramène à
 * `/connexion` avec le même message, sans dire lequel des trois.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ok = await confirmerLien(await clientSession(), request.nextUrl.searchParams);
  const destination = ok ? "/redaction" : `${ROUTE_CONNEXION}?etat=lien`;
  return NextResponse.redirect(new URL(destination, request.url), { status: 303 });
}
