// LA LANGUE SELON LE PAYS DE L'IP — fonction serverless Vercel
//
// Vercel ajoute lui-même `x-vercel-ip-country` à la requête. L'adresse IP ne
// quitte donc jamais l'hébergeur et ce point d'accès ne la lit, ne la renvoie
// et ne la stocke pas : il répond seulement avec l'une des sept langues du jeu.

import { langueDuPays } from '../src/lib/i18n.js';

export const config = { runtime: 'nodejs' };

const ENTETES = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, max-age=3600',
  Vary: 'X-Vercel-IP-Country, Accept-Language',
} as const;

function preferencesDepuis(entete: string | null): string[] {
  return String(entete ?? '')
    .split(',')
    .map((partie) => partie.split(';')[0]?.trim())
    .filter((valeur): valeur is string => Boolean(valeur));
}

export function GET(req: Request): Response {
  const pays = req.headers.get('x-vercel-ip-country');
  const preferences = preferencesDepuis(req.headers.get('accept-language'));
  return new Response(JSON.stringify({ langue: langueDuPays(pays, preferences) }), {
    status: 200,
    headers: ENTETES,
  });
}

type RequeteVercel = {
  headers?: Record<string, string | string[] | undefined>;
};
type ReponseVercel = {
  status: (code: number) => ReponseVercel;
  setHeader: (nom: string, valeur: string) => void;
  send: (corps: string) => void;
};

export default async function langueVercel(req: RequeteVercel, res: ReponseVercel): Promise<void> {
  const headers = new Headers();
  for (const [nom, valeur] of Object.entries(req.headers ?? {})) {
    if (Array.isArray(valeur)) headers.set(nom, valeur.join(', '));
    else if (valeur) headers.set(nom, valeur);
  }
  const resultat = GET(new Request('https://destiny-rugby.local/api/langue', { headers }));
  resultat.headers.forEach((valeur, nom) => res.setHeader(nom, valeur));
  res.status(resultat.status).send(await resultat.text());
}
