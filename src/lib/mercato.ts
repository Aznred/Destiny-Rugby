// MARCHÉ DES TRANSFERTS — le monde bouge autour du joueur.
//
// Deux couches se superposent à l'effectif d'un club :
//
// 1. Le MERCATO RÉEL de l'été (données fournies, Top 14 → Nationale 2) :
//    à partir de la saison 2, les vraies recrues rejoignent le club et les
//    vrais partants le quittent.
// 2. Un MERCATO SIMULÉ pour les saisons suivantes : chaque division organise un
//    échange circulaire déterministe — le club i envoie N joueurs au club i+k.
//    Comme l'échange est calculé des deux côtés à partir de la même graine,
//    aucun joueur n'est dupliqué et rien n'a besoin d'être persisté.
//
// Simplification assumée : le mercato simulé se calcule à partir de l'effectif
// « de base » de la saison, pas en cascade sur les mercatos précédents — sinon
// il faudrait rejouer toutes les saisons à chaque affichage.

import type { FamillePoste } from '../types';
import { MERCATO_REEL } from '../data/mercato';
import { POSTES_AMATEURS } from '../data/amateurs';

export interface RecrueReelle {
  nom: string;
  poste: FamillePoste | null;
  nation: string;
  age: number | null;
  autre: string | null; // club lié (provenance ou destination) quand il est connu
}

export interface MercatoClub {
  arrivees: RecrueReelle[];
  departs: RecrueReelle[];
  prolongations: RecrueReelle[];
}

function decoder(encode: string): RecrueReelle[] {
  if (!encode) return [];
  return encode.split('~').map((e) => {
    const [nom, poste, nation, age, autre] = e.split('|');
    return {
      nom,
      poste: poste === '' ? null : (POSTES_AMATEURS[Number(poste)] as FamillePoste),
      nation: nation || 'France',
      age: age ? Number(age) : null,
      autre: autre || null,
    };
  });
}

const cache = new Map<string, MercatoClub>();

// Mercato réel d'un club (vide s'il n'est pas couvert par les données).
export function mercatoReel(nomClub: string): MercatoClub {
  const memo = cache.get(nomClub);
  if (memo) return memo;
  const brut = MERCATO_REEL[nomClub];
  const m: MercatoClub = brut
    ? { arrivees: decoder(brut[0]), departs: decoder(brut[1]), prolongations: decoder(brut[2]) }
    : { arrivees: [], departs: [], prolongations: [] };
  cache.set(nomClub, m);
  return m;
}

export function aUnMercatoReel(nomClub: string): boolean {
  return MERCATO_REEL[nomClub] !== undefined;
}
