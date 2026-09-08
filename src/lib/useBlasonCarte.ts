import { useEffect, useState } from 'react';
import { chargerEmblemesCarriere } from './carriereEnLigneClient';
const cle = (nom: string) => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * ⚠️ LA LNR RENOMME SES CLUBS, ET LA CARTE PERD SON ÉCUSSON. Le blason se
 * retrouve par le NOM du club, normalisé ; il suffit donc qu'une source écrive
 * « Oyonnax Rugby » là où le jeu range « US Oyonnax » pour que la carte sorte
 * sans blason. Mesuré : quatre clubs de Pro D2 sur seize étaient dans ce cas —
 * Biarritz, Grenoble, Oyonnax et Valence Romans, soit 151 cartes du catalogue,
 * et un quart des cartes d'un marché rempli de Pro D2.
 */
const ALIASES = new Map([
  ['asmclermont', 'asmclermontauvergne'],
  ['colomiersrugby', 'uscolomiers'],
  ['lourugby', 'lyonou'],
  ['montpellierheraultrugby', 'montpellierhr'],
  ['nissarugby', 'stadenicois'],
  ['rcnarbonnais', 'rcnarbonne'],
  ['biarritzolympiquepb', 'biarritzolympique'],
  ['fcgrenoblerugby', 'fcgrenoble'],
  ['oyonnaxrugby', 'usoyonnax'],
  ['valenceromans', 'valenceromansdromerugby'],
]);

/** Ramène les appellations LNR récentes vers les noms canoniques du jeu. */
export const cleBlasonCarte = (nom: string) => ALIASES.get(cle(nom)) ?? cle(nom);

/**
 * ⚠️ ET UN FILET, PARCE QUE LA LISTE CI-DESSUS SERA TOUJOURS EN RETARD. Elle
 * se remplit APRÈS coup, quand quelqu'un remarque un blason manquant sur une
 * carte. Le filet rattrape la forme que prend toujours cette dérive : un nom
 * qui grossit ou qui maigrit d'un mot (« FC Grenoble » → « FC Grenoble
 * Rugby »). On accepte alors le blason dont la clé CONTIENT celle du club, ou
 * qui y est contenue — et uniquement s'il n'y en a qu'UN SEUL. Un blason
 * ambigu est un blason faux, et un écusson faux sur une carte se remarque plus
 * qu'une case vide.
 *
 * Les clés courtes ne jouent pas : « nice » ou « albi » se retrouveraient dans
 * dix noms de clubs.
 */
const LONGUEUR_MINIMALE = 8;
const rattrapages = new Map<string, string | undefined>();
function blasonDuClub(table: Map<string, string>, club: string): string | undefined {
  const direct = table.get(cleBlasonCarte(club));
  if (direct) return direct;
  if (rattrapages.has(club)) return rattrapages.get(club);
  const recherche = cleBlasonCarte(club);
  let trouve: string | undefined;
  let combien = 0;
  if (recherche.length >= LONGUEUR_MINIMALE) {
    for (const [cleTable, logo] of table) {
      if (cleTable.length < LONGUEUR_MINIMALE) continue;
      if (!cleTable.includes(recherche) && !recherche.includes(cleTable)) continue;
      if (logo === trouve) continue; // Le même club listé dans deux groupes.
      combien++;
      trouve = logo;
    }
  }
  const resultat = combien === 1 ? trouve : undefined;
  rattrapages.set(club, resultat);
  return resultat;
}

let logos: Map<string, string> | undefined;
let demande: Promise<Map<string, string>> | undefined;
/** Même table partagée pour chaque écran et toutes les cartes, y compris les packs. */
export function useBlasonCarte(club: string, explicite?: string) {
  const [table, setTable] = useState(logos);
  useEffect(() => {
    if (explicite || logos) { if (logos) setTable(logos); return; }
    let actif = true;
    demande ??= chargerEmblemesCarriere().then(r => {
      logos = new Map(r.groupes.flatMap(g => g.emblemes.map(e => [cle(e.nom), e.logo] as const)));
      return logos;
    }).catch(e => { demande = undefined; throw e; });
    void demande.then(t => { if (actif) setTable(t); }).catch(() => {});
    return () => { actif = false; };
  }, [explicite]);
  return explicite ?? (table && blasonDuClub(table, club));
}
