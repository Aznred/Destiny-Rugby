// LE COACHING EN DIRECT
//
// En plein match, le joueur tape une consigne en français — « défends plus
// bas », « propose-toi au ras du ruck », « écarte au large ». On la traduit en
// vecteurs de placement appliqués à SON pion (lib/moteur/tactique.ts).
//
// Deux niveaux, comme partout dans le jeu :
//   1. une lecture LOCALE par mots-clés, immédiate et hors ligne ;
//   2. si l'IA locale est activée, elle affine l'interprétation — elle comprend
//      « reste dans l'axe et attends le ballon dans la poche », que les
//      mots-clés rateraient.

import { appelIAJSON, type MessageIA } from '../groq';
import { consigneDeLangue } from '../i18n';
import type { ConsigneJoueur } from './etat';

export const CONSIGNE_NEUTRE: ConsigneJoueur = {
  profondeur: 0, largeur: 0, agressivite: 0.3, libelle: 'Jeu normal',
};

// --- LECTURE LOCALE ---------------------------------------------------------
const REGLES: { motif: RegExp; effet: Partial<ConsigneJoueur>; libelle: string }[] = [
  { motif: /\b(plus bas|recule|en retrait|profondeur|derrière|arrière|couvre|couverture)\b/i,
    effet: { profondeur: -9 }, libelle: 'Jouer plus bas, en couverture' },
  { motif: /\b(monte|plus haut|agress|blitz|pression|étouffe|etouffe|avance)\b/i,
    effet: { profondeur: 7, agressivite: 0.8 }, libelle: 'Monter agressivement' },
  { motif: /\b(ras du ruck|au ras|près du ruck|pres du ruck|pick|propose[- ]toi|dispo)\b/i,
    effet: { agressivite: 0.95, largeur: -8 }, libelle: 'Se proposer au ras du ruck' },
  { motif: /\b(au large|écarte|ecarte|dehors|sur l.aile|aile|extérieur|exterieur)\b/i,
    effet: { largeur: 12 }, libelle: 'Chercher le large' },
  { motif: /\b(dans l.axe|recentre|centre|intérieur|interieur)\b/i,
    effet: { largeur: -12 }, libelle: 'Rester dans l’axe' },
  { motif: /\b(économise|economise|souffle|repos|calme|conserve)\b/i,
    effet: { agressivite: 0.1, profondeur: -4 }, libelle: 'Gérer son effort' },
];

export function lireConsigneLocale(texte: string): ConsigneJoueur {
  const c: ConsigneJoueur = { ...CONSIGNE_NEUTRE, libelle: texte.trim().slice(0, 60) };
  const libelles: string[] = [];
  for (const r of REGLES) {
    if (!r.motif.test(texte)) continue;
    Object.assign(c, { ...c, ...r.effet });
    libelles.push(r.libelle);
  }
  if (libelles.length) c.libelle = libelles.join(' · ');
  return c;
}

// --- LECTURE PAR L'IA -------------------------------------------------------
export async function lireConsigneIA(
  texte: string,
  contexte = '',
): Promise<ConsigneJoueur> {
  const messages: MessageIA[] = [
    {
      role: 'system',
      content: `Tu traduis une consigne de rugby en paramètres de placement pour UN joueur.
Réponds UNIQUEMENT en JSON valide :
{"profondeur":-15..15,"largeur":-15..15,"agressivite":0..1,"libelle":"reformulation courte"}

- profondeur : négatif = le joueur se place plus BAS / en retrait / en couverture,
  positif = il monte, il avance, il presse.
- largeur : négatif = il se recentre dans l'axe, positif = il cherche le large, l'aile.
- agressivite : 0 = il attend, il temporise ; 1 = il se propose systématiquement au
  ras du ruck, il réclame le ballon.
- libelle : la consigne reformulée en 5 mots maximum.` + consigneDeLangue(),
    },
    { role: 'user', content: `${contexte}\n\nConsigne du joueur : « ${texte} »` },
  ];
  const brut = await appelIAJSON(messages, { temperature: 0.2, maxTokens: 120 });
  try {
    const d = JSON.parse(brut);
    const nombre = (v: unknown, min: number, max: number, defaut: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : defaut;
    return {
      profondeur: nombre(d.profondeur, -15, 15, 0),
      largeur: nombre(d.largeur, -15, 15, 0),
      agressivite: nombre(d.agressivite, 0, 1, 0.3),
      libelle: String(d.libelle ?? texte).slice(0, 60),
    };
  } catch {
    // JSON illisible : la lecture par mots-clés fait le travail.
    return lireConsigneLocale(texte);
  }
}
