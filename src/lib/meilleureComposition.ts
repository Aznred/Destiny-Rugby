import { POSTE_PAR_ID } from '../data/rugby';
import type { CarteCarriere } from './ligue/typesCarriere';
import type { CompositionManager } from '../types';
import { POSTES_XV_MANAGER, POSTES_BANC_MANAGER } from './compositionManager';
import { adequationAuPoste } from './carteJoueur';
import { collectifCarriere } from './ligue/collectifCarriere';

interface ClusterAffinite {
  type: 'club' | 'nation' | 'championnat';
  valeur: string;
}

function joueurCorrespondCluster(carte: CarteCarriere, cluster: ClusterAffinite): boolean {
  if (cluster.type === 'club') return Boolean(carte.clubReel && carte.clubReel === cluster.valeur);
  if (cluster.type === 'nation') return Boolean(carte.nation && carte.nation === cluster.valeur);
  if (cluster.type === 'championnat') return Boolean(carte.championnat && carte.championnat === cluster.valeur);
  return false;
}

/** Algorithme hongrois O(n²m) pour l'affectation optimale rectangulaire n <= m. */
function resoudreHongrois(couts: number[][], n: number, m: number): number[] {
  const u = Array(n + 1).fill(0);
  const v = Array(m + 1).fill(0);
  const p = Array(m + 1).fill(0);
  const way = Array(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(m + 1).fill(Infinity);
    const used = Array(m + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= m; j++) {
        if (!used[j]) {
          const cur = couts[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const choix = Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j]) choix[p[j] - 1] = j - 1;
  }
  return choix;
}

/**
 * Assemble la meilleure feuille de match (23 joueurs) :
 * - Maximise la somme entre Collectif (0-100) et Note moyenne du XV.
 * - Assure que chaque joueur est à son bon poste sans malus (naturel ou secondaire).
 */
export function meilleureComposition(
  cartes: CarteCarriere[],
  maintenant = Date.now(),
): CompositionManager | null {
  const joueurs = cartes
    .filter((c) => !c.blesseJusqua || Date.parse(c.blesseJusqua) <= maintenant)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (joueurs.length < 23) return null;

  const postes = [...POSTES_XV_MANAGER, ...POSTES_BANC_MANAGER];
  const n = 23;
  const m = joueurs.length;

  // 1. Détecte les clusters d'affinité dominants de l'effectif
  const compteursClubs = new Map<string, number>();
  const compteursNations = new Map<string, number>();
  const compteursChampionnats = new Map<string, number>();

  for (const c of joueurs) {
    if (c.clubReel) compteursClubs.set(c.clubReel, (compteursClubs.get(c.clubReel) ?? 0) + 1);
    if (c.nation) compteursNations.set(c.nation, (compteursNations.get(c.nation) ?? 0) + 1);
    if (c.championnat) compteursChampionnats.set(c.championnat, (compteursChampionnats.get(c.championnat) ?? 0) + 1);
  }

  const clusters: (ClusterAffinite | null)[] = [null]; // null = note brute

  for (const [valeur, count] of compteursClubs.entries()) {
    if (count >= 2) clusters.push({ type: 'club', valeur });
  }
  for (const [valeur, count] of compteursNations.entries()) {
    if (count >= 3) clusters.push({ type: 'nation', valeur });
  }
  for (const [valeur, count] of compteursChampionnats.entries()) {
    if (count >= 3) clusters.push({ type: 'championnat', valeur });
  }

  // Fonction d'évaluation globale : Collectif + Note du XV, pénalisant tout malus hors-poste
  const evaluerFeuille = (selection: number[]): number => {
    const titulaires = selection.slice(0, 15).map((idx) => joueurs[idx]);
    const banc = selection.slice(15).map((idx) => joueurs[idx]);
    const compo = { titulaires: titulaires.map((c) => c.id) };
    const col = collectifCarriere(titulaires, compo);

    let malusXV = 0;
    let sommeNotesXV = 0;
    for (let i = 0; i < 15; i++) {
      const c = titulaires[i];
      const adeq = adequationAuPoste(c.poste, postes[i], c.postesSecondaires);
      if (adeq === 'horsPoste') malusXV++;
      sommeNotesXV += c.note;
    }
    const noteXV = sommeNotesXV / 15;

    let malusBanc = 0;
    let sommeNotesBanc = 0;
    for (let i = 0; i < 8; i++) {
      const c = banc[i];
      const adeq = adequationAuPoste(c.poste, postes[15 + i], c.postesSecondaires);
      if (adeq === 'horsPoste') malusBanc++;
      sommeNotesBanc += c.note;
    }
    const noteBanc = sommeNotesBanc / 8;

    // La somme demandée : note du XV + collectif
    const sommeCollectifNotes = noteXV + col.total;
    // Pénalité stricte : 1 joueur hors poste annule tout bénéfice
    const penaliteHorsPoste = malusXV * 500 + malusBanc * 50;
    const departage = noteXV * 0.01 + noteBanc * 0.001;

    return (sommeCollectifNotes - penaliteHorsPoste) * 1000 + departage;
  };

  let meilleurChoixGlobal: number[] | null = null;
  let meilleurScoreGlobal = -Infinity;

  // 2. Évalue chaque graine d'affinité
  for (const cluster of clusters) {
    const couts = postes.map((poste, i) =>
      joueurs.map((c) => {
        const adeq = adequationAuPoste(c.poste, poste, c.postesSecondaires);
        let penalitePoste = 0;

        if (adeq === 'horsPoste') {
          const estPremiereLigne = i < 3 || (i >= 15 && i < 18);
          const memeFamille = POSTE_PAR_ID[c.poste]?.famille === POSTE_PAR_ID[poste]?.famille;
          penalitePoste = estPremiereLigne && !memeFamille ? 10_000_000 : 5_000_000;
        } else if (adeq === 'secondaire') {
          penalitePoste = 1; // Légère préférence pour poste naturel à note égale
        }

        const notePonderee = (c.note - (c.fatigue ?? 0) * 0.05) * (i < 15 ? 100 : 10);
        const bonusCluster = cluster && i < 15 && joueurCorrespondCluster(c, cluster) ? 2500 : 0;

        return penalitePoste - (notePonderee + bonusCluster);
      }),
    );

    const choixInitial = resoudreHongrois(couts, n, m);
    if (choixInitial.some((j) => j < 0)) continue;

    let choixCourant = [...choixInitial];
    let scoreCourant = evaluerFeuille(choixCourant);

    // 3. Recherche locale par échanges pour optimiser la somme collectif + note
    for (let tour = 0; tour < 25; tour++) {
      let amelioration = false;

      // Échanges entre titulaires compatibles
      for (let i = 0; i < 14; i++) {
        for (let j = i + 1; j < 15; j++) {
          const j1 = joueurs[choixCourant[i]];
          const j2 = joueurs[choixCourant[j]];

          const adeq1 = adequationAuPoste(j1.poste, postes[j], j1.postesSecondaires);
          const adeq2 = adequationAuPoste(j2.poste, postes[i], j2.postesSecondaires);
          if (adeq1 === 'horsPoste' || adeq2 === 'horsPoste') continue;

          const copie = [...choixCourant];
          [copie[i], copie[j]] = [copie[j], copie[i]];
          const score = evaluerFeuille(copie);

          if (score > scoreCourant + 1e-4) {
            scoreCourant = score;
            choixCourant = copie;
            amelioration = true;
          }
        }
      }

      // Remplacement d'un titulaire par un joueur du banc ou de réserve
      for (let place = 0; place < 15; place++) {
        for (let candidat = 0; candidat < m; candidat++) {
          if (choixCourant[place] === candidat) continue;
          const joueurCandidat = joueurs[candidat];
          const adeqCandidat = adequationAuPoste(joueurCandidat.poste, postes[place], joueurCandidat.postesSecondaires);
          if (adeqCandidat === 'horsPoste') continue;

          const indexExistant = choixCourant.indexOf(candidat);
          const copie = [...choixCourant];

          if (indexExistant >= 15) {
            // Le candidat est sur le banc : le titulaire sortant prend-il le banc sans être hors-poste ?
            const titulaireSortant = joueurs[choixCourant[place]];
            const adeqSortant = adequationAuPoste(titulaireSortant.poste, postes[indexExistant], titulaireSortant.postesSecondaires);
            if (adeqSortant === 'horsPoste') continue;
            [copie[place], copie[indexExistant]] = [copie[indexExistant], copie[place]];
          } else if (indexExistant < 0) {
            // Le candidat vient des réserves (hors feuille)
            copie[place] = candidat;
          } else {
            continue;
          }

          const score = evaluerFeuille(copie);
          if (score > scoreCourant + 1e-4) {
            scoreCourant = score;
            choixCourant = copie;
            amelioration = true;
          }
        }
      }

      if (!amelioration) break;
    }

    if (scoreCourant > meilleurScoreGlobal) {
      meilleurScoreGlobal = scoreCourant;
      meilleurChoixGlobal = choixCourant;
    }
  }

  if (!meilleurChoixGlobal) return null;

  const feuille = meilleurChoixGlobal.map((j) => joueurs[j]);
  const xv = feuille.slice(0, 15);
  const banc = feuille.slice(15);

  const capitaine = [...xv].sort((a, b) => b.age * 1.4 + b.note - (a.age * 1.4 + a.note))[0];
  const buteur = [...xv].sort((a, b) => (b.statistiques.JDP ?? b.note) - (a.statistiques.JDP ?? a.note))[0];

  return {
    titulaires: xv.map((c) => c.id),
    remplacants: banc.map((c) => c.id),
    capitaineId: capitaine.id,
    buteurId: buteur.id,
  };
}
