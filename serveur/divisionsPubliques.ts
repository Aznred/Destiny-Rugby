import { createHash } from 'node:crypto';
import { classementCarriere } from '../src/lib/ligue/carriere.js';
import { coequipierDepuisCarte } from '../src/lib/ligue/catalogueCarriere.js';
import { conclureMatchEnLigne, creerMatchEnLigne } from '../src/lib/ligue/matchCarriere.js';
import type { CarteCarriere, ClubCarriere } from '../src/lib/ligue/typesCarriere.js';
import type { LigueStockee } from './carriereStockage.js';
import { rulesFor, zones } from '../src/lib/competitionRules.js';

export interface HeritierDivision { club: ClubCarriere; cartes: CarteCarriere[] }
export interface PlanDivision { division: number; heritiers: HeritierDivision[]; barrage?: string }

const heritier = (ligne: LigueStockee, id: string): HeritierDivision => ({
  club: structuredClone(ligne.etat.clubs.find(c => c.id === id)!),
  cartes: structuredClone(ligne.etat.cartes.filter(c => c.proprietaire === id)),
});
const equipeBarrage = (h: HeritierDivision) => ({
  clubId: h.club.id, nom: h.club.nom, effectif: h.cartes.map(c => coequipierDepuisCarte(c)),
  composition: h.club.composition, strategie: h.club.strategie,
});

/** Classements de la saison précédente ; un champion monte, un dernier descend. */
export function planifierDivisionsPubliques(ligues: readonly LigueStockee[], cycle: number): PlanDivision[] {
  const plans = ligues.filter(l => l.etat.publique).sort((a, b) => a.etat.publique!.division - b.etat.publique!.division)
    .map(ligne => ({ division: ligne.etat.publique!.division,
      heritiers: ligne.etat.clubs.map(club => heritier(ligne, club.id)),
      classement: classementCarriere(ligne.etat).map(c => c.clubId),
      finaliste: ligne.etat.competitions.find(c => c.saison === ligne.etat.saison && c.nom.startsWith('Coupe Destiny Rugby'))?.finaliste,
    }));
  const echanger = (haut: typeof plans[number], idHaut: string, bas: typeof plans[number], idBas: string) => {
    const hi = haut.heritiers.findIndex(h => h.club.id === idHaut);
    const bi = bas.heritiers.findIndex(h => h.club.id === idBas);
    if (hi < 0 || bi < 0) return;
    [haut.heritiers[hi], bas.heritiers[bi]] = [bas.heritiers[bi], haut.heritiers[hi]];
  };
  const barrages = new Map<number, string>();
  for (let i = 0; i < plans.length - 1; i++) {
    const haut = plans[i], bas = plans[i + 1];
    if (haut.classement.length < 2 || bas.classement.length < 2) continue;
    // ⚠️ LE RÈGLEMENT DES DIVISIONS PUBLIQUES (`competitionRules.ts`) dit combien descendent et qui joue le barrage :
    // c'est le même qui colore le classement à l'écran.
    const z = zones(rulesFor('divisionPublique'), haut.classement.length);
    const dernier = haut.classement.at(-1)!;
    const champion = bas.classement[0];
    // À deux clubs, l'avant-dernier serait le champion déjà promu depuis la
    // division inférieure ; il n'existe pas de place distincte pour un barrage.
    if (z.accessMatch.length) {
      const avantDernier = haut.classement[z.accessMatch[0] - 1];
      const finaliste = bas.finaliste && bas.finaliste !== champion ? bas.finaliste : bas.classement[1];
      const hHaut = haut.heritiers.find(h => h.club.id === avantDernier);
      const hBas = bas.heritiers.find(h => h.club.id === finaliste);
      if (hHaut && hBas) {
        const nombre = createHash('sha256').update(`destiny-barrage:${cycle}:${haut.division}:${avantDernier}:${finaliste}`).digest();
        const rencontre = conclureMatchEnLigne(creerMatchEnLigne({ id: `barrage:${cycle}:${haut.division}`,
          domicile: equipeBarrage(hHaut), exterieur: equipeBarrage(hBas), debut: 0, graine: nombre.readUInt32BE(0),
          departage: rulesFor('divisionPublique').knockout.drawResolution }));
        const scoreHaut = rencontre.score.domicile;
        const scoreBas = rencontre.score.exterieur;
        const gagneBas = rencontre.issue ? rencontre.issue.vainqueur === 'exterieur' : scoreBas > scoreHaut;
        barrages.set(haut.division, `Barrage D${haut.division}/D${bas.division} : ${hHaut.club.nom} ${scoreHaut}–${scoreBas} ${hBas.club.nom} · ${gagneBas ? hBas.club.nom + ' monte' : hHaut.club.nom + ' se maintient'}`);
        if (gagneBas) echanger(haut, avantDernier, bas, finaliste);
      }
    }
    if (z.directRelegation > 0 || haut.classement.length < 4) echanger(haut, dernier, bas, champion);
  }
  return plans.map(({ division, heritiers }) => ({ division, heritiers, barrage: barrages.get(division) }));
}
