// LES POINTS DE REPRISE DES MATCHS EN COURS
//
// Un match de ligue n'est pas stocké : il est rejoué depuis sa graine. Une
// instance qui démarre à froid rejouait donc CHAQUE match en cours depuis le
// coup d'envoi avant de répondre — mesuré sur la division publique 1 : trois
// matchs, quarante-cinq secondes, pour une limite de soixante.
//
// Toutes les cinq minutes de jeu, l'instance qui fait avancer un match dépose
// son moteur ici (19 Ko compressés) ; une instance froide le reprend en trois
// millisecondes et ne joue que la suite.
//
// ⚠️ CE N'EST PAS UNE SAUVEGARDE DU MATCH. Sans point, avec un point illisible
// ou qui ne prolonge pas le journal, le match est rejoué comme avant.

import { deserialize, serialize } from 'node:v8';
import { gunzipSync, gzipSync } from 'node:zlib';
import { pointDeReprise, reprendreMoteur, simCible, simMoteurGarde, type EtatMatchEnLigne, type PointDeReprise } from '../src/lib/ligue/matchCarriere.js';
import type { StockageCarriere } from './carriereStockage.js';

/**
 * ⚠️ UN POINT NE SE RELIT QUE PAR LE CODE QUI L'A ÉCRIT. C'est la mémoire brute
 * du moteur : un champ ajouté ou renommé entre deux mises en ligne et la reprise
 * jouerait un autre match. Chaque déploiement a donc ses points à lui ; après
 * une mise en ligne, la première ouverture rejoue une fois, comme avant.
 */
export const CODE_REPRISES = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? 'local').slice(0, 16);
/** Secondes de jeu entre deux points d'un même match. */
export const INTERVALLE_REPRISE = 300;
/** En deçà, rejouer coûte moins qu'un aller-retour avec la base. */
const SEUIL_DE_LECTURE = 90;

export function emballerReprise(point: PointDeReprise): string {
  return gzipSync(serialize(point), { level: 6 }).toString('base64');
}

export function deballerReprise(texte: string): PointDeReprise | null {
  try { return deserialize(gunzipSync(Buffer.from(texte, 'base64'))) as PointDeReprise; }
  catch { return null; }
}

type Rencontres = { rencontres: readonly { match?: EtatMatchEnLigne }[] };
const enCours = (etat: Rencontres): EtatMatchEnLigne[] =>
  etat.rencontres.flatMap(r => (r.match && !r.match.termine && r.match.equipes ? [r.match] : []));

export function creerReprises(stockage: StockageCarriere, code = CODE_REPRISES) {
  /** Par ligue : la seconde de jeu du dernier point connu de chaque match (`id@debut`). */
  const connus = new Map<string, Map<string, number>>();
  /** La table manque ou la base refuse : on n'insiste pas avant cette heure. */
  let suspendu = 0;
  const cle = (m: EtatMatchEnLigne) => `${m.id}@${m.debut}`;
  const suspendre = () => { suspendu = Date.now() + 5 * 60_000; };

  return {
    /** Avant de faire avancer une ligue : donne à ses matchs sans moteur le dernier point déposé. */
    async charger(ligue: string, etat: Rencontres, maintenant = Date.now()): Promise<number> {
      if (!stockage.lireReprises || suspendu > maintenant) return 0;
      const froids = enCours(etat).filter(m => simMoteurGarde(m) === undefined && simCible(m, maintenant) > SEUIL_DE_LECTURE);
      if (!froids.length) return 0;
      let lignes;
      try { lignes = await stockage.lireReprises(ligue, code); } catch { lignes = null; }
      if (!lignes) { suspendre(); return 0; }
      let repris = 0;
      for (const match of froids) {
        const ligne = lignes.find(l => l.match === match.id && l.debut === match.debut);
        const point = ligne && deballerReprise(ligne.donnees);
        if (!point) continue;
        let ok = false;
        try { ok = reprendreMoteur(match, point); } catch { ok = false; }
        if (!ok) continue;
        repris++;
        let ligueConnue = connus.get(ligue);
        if (!ligueConnue) connus.set(ligue, ligueConnue = new Map());
        ligueConnue.set(cle(match), point.sim);
      }
      return repris;
    },

    /** Après l'avance : dépose un point pour chaque match qui a joué cinq minutes depuis le dernier. */
    async deposer(ligue: string, etat: Rencontres): Promise<number> {
      if (!stockage.ecrireReprise || suspendu > Date.now()) return 0;
      const vivants = enCours(etat);
      let ligueConnue = connus.get(ligue);
      if (!vivants.length) {
        if (ligueConnue) {
          connus.delete(ligue);
          await stockage.nettoyerReprises?.(ligue, []).catch(() => {});
        }
        return 0;
      }
      const dus = vivants.filter(match => {
        const sim = simMoteurGarde(match);
        return sim !== undefined && sim - (ligueConnue?.get(cle(match)) ?? 0) >= INTERVALLE_REPRISE;
      });
      if (!dus.length) {
        // Cette instance a vu finir un match dont elle suivait le point.
        if (ligueConnue && ligueConnue.size > vivants.length) {
          const gardes = new Set(vivants.map(cle));
          for (const c of ligueConnue.keys()) if (!gardes.has(c)) ligueConnue.delete(c);
          await stockage.nettoyerReprises?.(ligue, vivants.map(m => m.id)).catch(() => {});
        }
        return 0;
      }
      if (!ligueConnue) connus.set(ligue, ligueConnue = new Map());
      // Quelques octets pour savoir où en est la base : une autre instance a peut-être déposé ce point il y a un instant.
      let enBase: { match: string; debut: number; sim: number }[] | null = null;
      try { enBase = await stockage.simsReprises?.(ligue, code) ?? null; } catch { enBase = null; }
      let deposes = 0;
      for (const match of dus) {
        const sim = simMoteurGarde(match);
        if (sim === undefined) continue;
        const depose = enBase?.find(l => l.match === match.id && l.debut === match.debut);
        if (depose && sim - depose.sim < INTERVALLE_REPRISE / 2) { ligueConnue.set(cle(match), depose.sim); continue; }
        let donnees: string;
        try {
          const point = pointDeReprise(match);
          if (!point) continue;
          donnees = emballerReprise(point);
        } catch { continue; }
        // Noté avant l'écriture : deux requêtes simultanées ne déposent pas le même point.
        ligueConnue.set(cle(match), sim);
        try {
          if (await stockage.ecrireReprise(ligue, match.id, match.debut, sim, code, donnees)) deposes++;
          else suspendre();
        } catch { suspendre(); }
      }
      // Les points des matchs finis s'en vont dès qu'on les voit (ou, sans la lecture légère, avec chaque dépôt).
      const vifs = new Set(vivants.map(m => m.id));
      if (enBase ? enBase.some(l => !vifs.has(l.match)) : deposes > 0) {
        const gardes = new Set(vivants.map(cle));
        for (const c of ligueConnue.keys()) if (!gardes.has(c)) ligueConnue.delete(c);
        await stockage.nettoyerReprises?.(ligue, [...vifs]).catch(() => {});
      }
      return deposes;
    },
    oublier(ligue: string) { connus.delete(ligue); },
  };
}
