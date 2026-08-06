// PHASE FINALE & BARRAGE D'ACCESSION
//
// Le championnat se joue vraiment (lib/championnat.ts) ; il se TERMINE ici.
// À l'issue de la phase régulière :
//
//   • les 6 premiers (4 dans une petite poule, 2 dans une toute petite)
//     disputent les barrages, les demi-finales puis LA FINALE ;
//   • le champion est le vainqueur de la finale — plus aucun tirage au sort ;
//   • le finaliste malheureux joue le MATCH D'ACCÈS contre l'avant-dernier de
//     la division du dessus : le vainqueur y jouera la saison prochaine.
//
// Tout est déterministe (graine = division + saison + tour + équipes) : rouvrir
// l'écran ne rejoue pas les matchs, et rien n'a besoin d'être sauvegardé.

import { championnatEnDirect, graine, type LigneTableau } from './championnat';
import { forceEffectif } from './effectif';

export type TourFinal = 'barrage' | 'quart' | 'demie' | 'finale' | 'accession';

export interface MatchFinal {
  tour: TourFinal;
  libelle: string;
  domicile: string;
  exterieur: string;
  scoreD: number;
  scoreE: number;
  vainqueur: string;
  perdant: string;
}

export interface PhaseFinale {
  divisionId: string;
  classement: LigneTableau[];
  qualifies: string[]; // dans l'ordre du classement (tête de série 1, 2, 3…)
  matchs: MatchFinal[];
  champion: string | null;
  finaliste: string | null; // le perdant de la finale — celui qui jouera l'accès
  dernier: string | null; // relégation directe
  avantDernier: string | null; // celui qui joue le match d'accès
}

// Combien de clubs disputent la phase finale ? Le format français : 6 dans une
// poule de 12 et plus, 4 dans une poule de 8 à 11, une finale sèche en dessous.
export function nbQualifies(taille: number): number {
  if (taille >= 12) return 6;
  if (taille >= 8) return 4;
  return 2;
}

// Un match couperet : pas de match nul, et le mieux classé reçoit.
// Exporté : les coupes d'Europe (lib/coupe.ts) jouent le même format.
export function duel(
  domicile: string,
  exterieur: string,
  saison: number,
  cle: string,
  tour: TourFinal,
  libelle: string,
  avantageDomicile = 3,
): MatchFinal {
  const rng = graine(cle);
  const fD = forceEffectif(domicile, saison) + avantageDomicile;
  const fE = forceEffectif(exterieur, saison);
  const ecart = fD - fE;
  // Un match de phase finale se joue plus fermé qu'une journée de championnat :
  // moins de points, plus de tension, et l'écart pèse un peu moins (« tout peut
  // arriver sur un match »).
  let scoreD = Math.max(0, Math.round(18 + ecart * 0.85 + (rng() * 18 - 9)));
  let scoreE = Math.max(0, Math.round(18 - ecart * 0.85 + (rng() * 18 - 9)));
  if (scoreD === scoreE) {
    // Prolongation puis drop : quelqu'un doit sortir vainqueur.
    if (rng() < 0.55) scoreD += 3;
    else scoreE += 3;
  }
  const vainqueur = scoreD > scoreE ? domicile : exterieur;
  const perdant = scoreD > scoreE ? exterieur : domicile;
  return { tour, libelle, domicile, exterieur, scoreD, scoreE, vainqueur, perdant };
}

// Toute la fin de saison d'une division : classement, bracket, champion.
// `ancre` sert à choisir la poule dans les grandes divisions amateurs (celle qui
// contient ce club) — mets-y le club du joueur quand c'est son championnat.
export function phaseFinale(
  divisionId: string,
  saison: number,
  ancre: string,
  bonusJoueur = 0,
  numeroPoule?: number,
): PhaseFinale {
  const etat = championnatEnDirect(divisionId, saison, ancre, 999, bonusJoueur, numeroPoule);
  const classement = etat.classement;
  const taille = classement.length;
  const vide: PhaseFinale = {
    divisionId, classement, qualifies: [], matchs: [],
    champion: null, finaliste: null, dernier: null, avantDernier: null,
  };
  if (taille < 2) return vide;

  const n = Math.min(nbQualifies(taille), taille);
  const q = classement.slice(0, n).map((l) => l.club);
  const matchs: MatchFinal[] = [];
  const cle = (tour: string, a: string, b: string) => `finale#${divisionId}#${saison}#${tour}#${a}#${b}`;
  // Rang d'un club dans le classement (sert à faire recevoir le mieux classé).
  const rang = (club: string) => classement.findIndex((l) => l.club === club);

  let demiFinalistes: string[];
  if (n >= 6) {
    // Barrages : 3 reçoit 6, 4 reçoit 5. Les deux premiers attendent.
    const b1 = duel(q[2], q[5], saison, cle('barrage1', q[2], q[5]), 'barrage', `Barrage : ${q[2]} – ${q[5]}`);
    const b2 = duel(q[3], q[4], saison, cle('barrage2', q[3], q[4]), 'barrage', `Barrage : ${q[3]} – ${q[4]}`);
    matchs.push(b1, b2);
    // Le 1er reçoit le moins bien classé des deux qualifiés.
    const [faible, fort] = [b1.vainqueur, b2.vainqueur].sort((a, b) => rang(b) - rang(a));
    demiFinalistes = [q[0], faible, q[1], fort];
  } else if (n >= 4) {
    demiFinalistes = [q[0], q[3], q[1], q[2]];
  } else {
    demiFinalistes = [];
  }

  let finalistes: string[];
  if (demiFinalistes.length === 4) {
    const d1 = duel(
      demiFinalistes[0], demiFinalistes[1], saison,
      cle('demie1', demiFinalistes[0], demiFinalistes[1]), 'demie',
      `Demi-finale : ${demiFinalistes[0]} – ${demiFinalistes[1]}`,
    );
    const d2 = duel(
      demiFinalistes[2], demiFinalistes[3], saison,
      cle('demie2', demiFinalistes[2], demiFinalistes[3]), 'demie',
      `Demi-finale : ${demiFinalistes[2]} – ${demiFinalistes[3]}`,
    );
    matchs.push(d1, d2);
    finalistes = [d1.vainqueur, d2.vainqueur];
  } else {
    finalistes = [q[0], q[1]];
  }

  // LA FINALE — terrain neutre : personne ne reçoit.
  const [fa, fb] = finalistes.sort((a, b) => rang(a) - rang(b));
  const finale = duel(fa, fb, saison, cle('finale', fa, fb), 'finale', `FINALE : ${fa} – ${fb}`, 0);
  matchs.push(finale);

  return {
    divisionId,
    classement,
    qualifies: q,
    matchs,
    champion: finale.vainqueur,
    finaliste: finale.perdant,
    dernier: classement[taille - 1]?.club ?? null,
    avantDernier: taille >= 2 ? classement[taille - 2].club : null,
  };
}

// LE MATCH D'ACCÈS : l'avant-dernier de la division du dessus reçoit le
// finaliste malheureux de la division du dessous. Le vainqueur jouera dans la
// division du dessus la saison prochaine, le perdant dans celle du dessous.
export function matchAcces(
  haut: PhaseFinale,
  bas: PhaseFinale,
  saison: number,
): MatchFinal | null {
  const tenant = haut.avantDernier;
  const pretendant = bas.finaliste;
  if (!tenant || !pretendant || tenant === pretendant) return null;
  return duel(
    tenant, pretendant, saison,
    `acces#${haut.divisionId}#${bas.divisionId}#${saison}#${tenant}#${pretendant}`,
    'accession',
    `Match d’accès : ${tenant} – ${pretendant}`,
    // Recevoir chez soi avec sa place en jeu : un vrai avantage.
    5,
  );
}
