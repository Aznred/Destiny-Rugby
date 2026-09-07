import { useEffect, useState } from 'react';
import { chargerEmblemesCarriere } from './carriereEnLigneClient';
const cle = (nom: string) => nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIASES = new Map([
  ['asmclermont', 'asmclermontauvergne'],
  ['colomiersrugby', 'uscolomiers'],
  ['lourugby', 'lyonou'],
  ['montpellierheraultrugby', 'montpellierhr'],
  ['nissarugby', 'stadenicois'],
  ['rcnarbonnais', 'rcnarbonne'],
]);

/** Ramène les appellations LNR récentes vers les noms canoniques du jeu. */
export const cleBlasonCarte = (nom: string) => ALIASES.get(cle(nom)) ?? cle(nom);
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
  return explicite ?? table?.get(cleBlasonCarte(club));
}
