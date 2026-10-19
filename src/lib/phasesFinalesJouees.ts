import { COMPETITIONS } from '../data/clubs.js';
import { poulesDe, resultatJoue, enregistrerResultatJoue, jouerRencontre, type MatchChampionnat } from './championnat.js';
import { phaseFinale, matchAcces } from './phaseFinale.js';
import { tournoiDeFinDAnnee } from './tournoi.js';
import { divisionAuDessus, oublierResultats } from './promotion.js';
import { departager } from './couperet.js';
import { clubsDeDivision } from './divisions.js';

/** Commande de simulation du week-end. Les générateurs restent entièrement en lecture seule. */
export function jouerAutresPhasesFinales(saison: number, semaine: number, clubProtege: string, bonus = 0): Record<string, MatchChampionnat> {
  const resultats: Record<string, MatchChampionnat> = {};
  // Un tableau régional de 128 places peut commencer avant les tableaux fédéraux.
  if (semaine < 44) return resultats;
  const phases = () => COMPETITIONS.flatMap(comp => {
    const ancre = clubsDeDivision(comp.id).includes(clubProtege) ? clubProtege : '';
    const tournoi = tournoiDeFinDAnnee(comp.id, saison, comp.nom, ancre, ancre ? bonus : 0);
    return tournoi ? tournoi.matchs : phaseFinale(comp.id, saison, ancre, ancre ? bonus : 0).matchs;
  });
  // Rattrapage des seules dates déjà atteintes ; un match du club humain bloque son tour jusqu'à sa sirène.
  for (let garde = 0; garde < 8; garde++) {
    let joues = 0;
    for (const m of phases()) {
      if (m.semaine > semaine) continue;
      const inscrit = resultatJoue(m.cle);
      // Certaines sauvegardes ont conservé un nul couperet sans son issue : le
      // tour restait « en cours » pour toujours et personne ne pouvait être champion.
      // On conserve le score et tous les joueurs ; seul le départage manquant est inscrit.
      if (m.status === 'in_progress' && inscrit && inscrit.scoreD === inscrit.scoreE && !inscrit.vainqueurDesigne) {
        const fin = departager(m.cle, inscrit.scoreD, inscrit.scoreE);
        const vainqueur = fin.issue?.vainqueur;
        const match: MatchChampionnat = { ...inscrit, prolongation: true,
          vainqueurDesigne: vainqueur ? vainqueur === m.domicile ? 'D' : 'E' : fin.scorePour > fin.scoreContre ? 'D' : 'E' };
        enregistrerResultatJoue(m.cle, match); resultats[m.cle] = match; joues++;
        continue;
      }
      if (m.status !== 'scheduled' || inscrit || m.domicile === clubProtege || m.exterieur === clubProtege) continue;
      const brut = jouerRencontre(m.domicile, m.exterieur, saison, m.cle, null);
      const fin = departager(m.cle, brut.scoreD, brut.scoreE);
      const match = { ...brut, scoreD: fin.scorePour, scoreE: fin.scoreContre, prolongation: fin.prolongation };
      enregistrerResultatJoue(m.cle, match);
      resultats[m.cle] = match;
      joues++;
    }
    if (!joues) break;
    oublierResultats();
  }
  // Les accès suivent la finale ; jamais de résultat pendant la simple consultation du tableau.
  if (semaine >= 52) for (const comp of COMPETITIONS) {
    const haut = divisionAuDessus(comp.id);
    if (!haut || poulesDe(comp.id).length > 1 || poulesDe(haut).length > 1) continue;
    const phase = (id: string) => clubsDeDivision(id).includes(clubProtege)
      ? phaseFinale(id, saison, clubProtege, bonus) : phaseFinale(id, saison, '');
    const m = matchAcces(phase(haut), phase(comp.id), saison);
    if (!m || m.status !== 'scheduled' || m.domicile === clubProtege || m.exterieur === clubProtege) continue;
    const brut = jouerRencontre(m.domicile, m.exterieur, saison, m.cle, null);
    const fin = departager(m.cle, brut.scoreD, brut.scoreE);
    const match = { ...brut, scoreD: fin.scorePour, scoreE: fin.scoreContre, prolongation: fin.prolongation };
    enregistrerResultatJoue(m.cle, match); resultats[m.cle] = match;
  }
  oublierResultats();
  return resultats;
}
