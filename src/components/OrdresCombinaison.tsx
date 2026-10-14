import { useState } from 'react';
import { Icone, type NomIcone } from './Icone';
import { t } from '../lib/i18n';
import type { Combinaison, PiedCombinaison, VarianteCombinaison } from '../lib/ligue/combinaisons';
import { donnerOrdre, finDeSequence, ordresPossibles, type OrdreCombinaison, type RefusOrdre, type ResultatOrdre } from '../lib/ligue/ordresCombinaisons';
import './OrdresCombinaison.css';

/**
 * LES ORDRES RAPIDES (Correctif 41) : un joueur touché sur le terrain, un ordre, et le jeu trace la course.
 * ⚠️ LA PALETTE NE FABRIQUE RIEN ELLE-MÊME : chaque bouton appelle `donnerOrdre`, qui rend un cahier ordinaire. Ce qu'on
 * obtient ici se retouche donc en mode Avancé, et se joue comme n'importe quelle combinaison écrite à la main.
 */
const ICONES: Record<OrdreCombinaison, NomIcone> = {
  recevoir: 'passe-droite', course: 'sprint', fixer: 'cible', leurre: 'feinte', croisee: 'crochet', soutien: 'soutien',
  large: 'plein-ecran', cellule: 'melee', derriere: 'passe-gauche', pied: 'pied', annuler: 'corbeille',
};
const PIEDS: PiedCombinaison[] = ['occupation', 'degagement', 'chandelle', 'rasant', 'transversale', 'cinquanteVingtDeux', 'drop'];
const NOMS_PIEDS: Record<PiedCombinaison, string> = { occupation: 'Occupation', degagement: 'Dégagement en touche', chandelle: 'Chandelle', rasant: 'Rasant', transversale: 'Transversale', cinquanteVingtDeux: '50/22', drop: 'Drop' };
const REFUS: Partial<Record<RefusOrdre, string>> = { plein: 'cb.ordre.plein', apresPied: 'cb.ordre.apresPied' };

export function OrdresCombinaison({ combinaison: c, variante: v, joueur, joueurs, bloque, appliquer }: {
  combinaison: Combinaison; variante: VarianteCombinaison;
  /** Le joueur sélectionné sur le terrain. */
  joueur: number | null;
  joueurs: Record<number, string>;
  bloque: boolean;
  appliquer: (resultat: ResultatOrdre, numero: number) => void;
}) {
  const [pied, setPied] = useState(false);
  const [refus, setRefus] = useState<RefusOrdre | null>(null);
  const [vientDeTracer, setVientDeTracer] = useState(false);
  const fin = finDeSequence(c, v);
  const possibles = joueur === null ? [] : ordresPossibles(c, v, joueur);
  const donner = (ordre: OrdreCombinaison, intention?: PiedCombinaison) => {
    if (joueur === null) return;
    if (ordre === 'pied' && !intention) { setPied((ouvert) => !ouvert); return; }
    const resultat = donnerOrdre(c, v, joueur, ordre, intention);
    setPied(false);
    setRefus(resultat.refus ?? null);
    if (resultat.refus) return;
    const geste = resultat.action === null ? undefined : resultat.variante.actions[resultat.action];
    setVientDeTracer(geste?.type === 'course' || geste?.type === 'leurre');
    appliquer(resultat, joueur);
  };
  return (
    <section className="ordres" aria-label={t('cb.ordre.titre')}>
      <header>
        <b><Icone nom="sifflet" taille={15} />{t('cb.ordre.titre')}</b>
        <span className="ordres-ballon"><Icone nom="ballon" taille={13} />{t('cb.ordre.ballonAu', { n: fin.porteur })}{joueurs[fin.porteur] ? ` · ${joueurs[fin.porteur]}` : ''}</span>
      </header>
      {joueur === null ? <p className="ordres-aide">{t('cb.ordre.choisir')}</p> : (
        <>
          <p className="ordres-joueur">
            <strong>{t('cb.ordre.pour', { n: joueur })}</strong>{joueurs[joueur] ? ` · ${joueurs[joueur]}` : ''}
            {joueur === fin.porteur && <em>{t('cb.ordre.porteur')}</em>}
          </p>
          <div className="ordres-liste" role="group" aria-label={t('cb.ordre.pour', { n: joueur })}>
            {possibles.map((ordre) => (
              <button key={ordre} type="button" className={`ordre ordre-${ordre}`} disabled={bloque} title={ordre === 'annuler' ? undefined : t(`cb.ordre.${ordre}Aide`)}
                aria-expanded={ordre === 'pied' ? pied : undefined} onClick={() => donner(ordre)}>
                <Icone nom={ICONES[ordre]} taille={16} /><span>{t(`cb.ordre.${ordre}`)}</span>
              </button>
            ))}
            {!possibles.length && <p className="ordres-aide">{fin.pied ? t('cb.ordre.apresPied') : t('cb.ordre.choisir')}</p>}
          </div>
          {pied && <div className="ordres-pieds" role="group" aria-label={t('cb.ordre.pied')}>
            {PIEDS.map((intention) => <button key={intention} type="button" className="ordre" disabled={bloque} onClick={() => donner('pied', intention)}>{NOMS_PIEDS[intention]}</button>)}
          </div>}
          {refus && REFUS[refus] && <p className="ordres-refus" role="status">{t(REFUS[refus]!)}</p>}
          {!refus && vientDeTracer && <p className="ordres-aide" role="status">{t('cb.ordre.tracer')}</p>}
        </>
      )}
    </section>
  );
}
