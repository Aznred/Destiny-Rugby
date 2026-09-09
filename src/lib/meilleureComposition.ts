import { POSTE_PAR_ID } from '../data/rugby';
import type { CarteCarriere } from './ligue/typesCarriere';
import type { CompositionManager } from '../types';
import { POSTES_XV_MANAGER, POSTES_BANC_MANAGER } from './compositionManager';
import { adequationAuPoste, facteurDePerformance } from './carteJoueur';
import { bonusCollectif, collectifCarriere } from './ligue/collectifCarriere';

/** Affectation globale des 23 places, avec priorité au XV et première ligne spécialisée. */
export function meilleureComposition(cartes: CarteCarriere[], maintenant = Date.now()): CompositionManager | null {
  const joueurs = cartes.filter(c => !c.blesseJusqua || Date.parse(c.blesseJusqua) <= maintenant).sort((a,b) => a.id.localeCompare(b.id));
  if (joueurs.length < 23) return null;
  const postes = [...POSTES_XV_MANAGER, ...POSTES_BANC_MANAGER];
  const couts = postes.map((poste, i) => joueurs.map(c => {
    if ((i < 3 || (i >= 15 && i < 18)) && POSTE_PAR_ID[c.poste].famille !== POSTE_PAR_ID[poste].famille) return 1e9;
    const note = c.note * facteurDePerformance(adequationAuPoste(c.poste, poste));
    return -(note * (i < 15 ? 100 : 1) - c.fatigue * .001);
  }));
  // Algorithme hongrois rectangulaire : aucun doublon et optimum global du score.
  const n = 23, m = joueurs.length;
  const u = Array(n+1).fill(0), v = Array(m+1).fill(0), p = Array(m+1).fill(0), way = Array(m+1).fill(0);
  for (let i=1;i<=n;i++) {
    p[0]=i; let j0=0; const minv=Array(m+1).fill(Infinity), used=Array(m+1).fill(false);
    do {
      used[j0]=true; const i0=p[j0]; let delta=Infinity, j1=0;
      for (let j=1;j<=m;j++) if (!used[j]) { const cur=couts[i0-1][j-1]-u[i0]-v[j]; if(cur<minv[j]) {minv[j]=cur;way[j]=j0;} if(minv[j]<delta) {delta=minv[j];j1=j;} }
      for(let j=0;j<=m;j++) { if(used[j]) {u[p[j]]+=delta;v[j]-=delta;} else minv[j]-=delta; }
      j0=j1;
    } while(p[j0]!==0);
    do { const j1=way[j0];p[j0]=p[j1];j0=j1; } while(j0!==0);
  }
  const choix=Array<number>(23).fill(-1);
  for(let j=1;j<=m;j++) if(p[j]) choix[p[j]-1]=j-1;
  if(choix.some((j,i)=>j<0 || couts[i][j]>=1e9)) return null;
  /**
   * L'affectation hongroise donne le meilleur XV par GEN pur. Le collectif
   * dépend cependant du groupe entier et ne peut pas entrer dans une matrice
   * joueur/poste. On affine donc cette feuille avec son vrai score de match :
   * GEN au poste + bonus (ou malus) de collectif, puis GEN du banc.
   */
  const score = (selection: number[]) => {
    const titulaires = selection.slice(0, 15).map(index => joueurs[index]);
    const composition = { titulaires: titulaires.map(c => c.id) };
    const collectif = collectifCarriere(titulaires, composition);
    const scoreXV = titulaires.reduce((total, carte, i) => {
      const bonus = bonusCollectif(collectif.parCarte[carte.id]?.points ?? 0);
      return total + (carte.note + bonus) * facteurDePerformance(adequationAuPoste(carte.poste, postes[i]));
    }, 0);
    const scoreBanc = selection.slice(15).reduce((total, index, i) => {
      const carte = joueurs[index];
      return total + carte.note * facteurDePerformance(adequationAuPoste(carte.poste, postes[i + 15]));
    }, 0);
    return scoreXV * 100 + scoreBanc;
  };
  let meilleurScore = score(choix);
  // Échanges et remplacements successifs : chaque mouvement doit augmenter le
  // total réel. L'ordre stable des joueurs rend le résultat reproductible.
  for (let tour = 0; tour < 23; tour++) {
    let meilleurChoix: number[] | null = null;
    let scoreTour = meilleurScore;
    for (let place = 0; place < 23; place++) for (let candidat = 0; candidat < m; candidat++) {
      if (choix[place] === candidat || couts[place][candidat] >= 1e9) continue;
      const essai = [...choix];
      const autrePlace = essai.indexOf(candidat);
      if (autrePlace >= 0) {
        if (couts[autrePlace][essai[place]] >= 1e9) continue;
        [essai[place], essai[autrePlace]] = [essai[autrePlace], essai[place]];
      } else essai[place] = candidat;
      const valeur = score(essai);
      if (valeur > scoreTour + 1e-6) { scoreTour = valeur; meilleurChoix = essai; }
    }
    if (!meilleurChoix) break;
    choix.splice(0, choix.length, ...meilleurChoix);
    meilleurScore = scoreTour;
  }
  const feuille=choix.map(j=>joueurs[j]), xv=feuille.slice(0,15);
  const capitaine=[...xv].sort((a,b)=>(b.age*1.4+b.note)-(a.age*1.4+a.note))[0];
  const buteur=[...xv].sort((a,b)=>(b.statistiques.PIED ?? b.note)-(a.statistiques.PIED ?? a.note))[0];
  return {titulaires:xv.map(c=>c.id),remplacants:feuille.slice(15).map(c=>c.id),capitaineId:capitaine.id,buteurId:buteur.id};
}
