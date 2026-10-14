import { useMemo } from 'react';
import { Icone, type NomIcone } from './Icone';
import { t } from '../lib/i18n';
import type { Coequipier } from '../lib/effectif';
import type { Combinaison, VarianteCombinaison } from '../lib/ligue/combinaisons';
import { erreursVariante } from '../lib/ligue/combinaisons';
import { chronologieCombinaison, type LigneChronologie } from '../lib/ligue/essaiCombinaisons';
import './ChronologieCombinaison.css';

/**
 * LA CHRONOLOGIE (Correctif 41, point 5) : « 0,0 s — sortie du ruck · 1,0 s — le 9 passe · 1,4 s — le 10 reçoit ».
 * ⚠️ ELLE N'EST NI SAISIE NI ESTIMÉE : `chronologieCombinaison` joue la combinaison une fois, sans défense, sur le moteur
 * du match, et relève l'instant où chaque étape commence. Modifier un geste la remesure.
 */
const ICONES: Record<LigneChronologie['action']['type'], NomIcone> = { passe: 'passe-droite', course: 'sprint', leurre: 'feinte', pied: 'pied' };
const secondes = (n: number) => `${n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;

function libelle(l: LigneChronologie): string {
  const a = l.action;
  if (a.type === 'passe') return t('cb.chrono.passe', { de: l.porteur, vers: a.destinataire });
  if (a.type === 'leurre') return t('cb.chrono.leurre', { de: a.numero });
  if (a.type === 'pied') return t('cb.chrono.pied', { de: l.porteur });
  return t('cb.chrono.course', { de: l.porteur });
}

export function ChronologieCombinaison({ combinaison: c, variante: v, effectif, etape = null, choisirEtape, compacte = false }: {
  combinaison: Combinaison; variante: VarianteCombinaison; effectif?: Coequipier[];
  /** L'étape en cours (essai) ou sélectionnée (éditeur). */
  etape?: number | null;
  choisirEtape?: (index: number) => void;
  compacte?: boolean;
}) {
  const valide = v.actions.length > 0 && erreursVariante(c.phase, v).length === 0;
  // Une mesure coûte un essai joué à blanc (quelques millisecondes) : elle ne se refait que si la combinaison change.
  const cle = JSON.stringify([c.phase, c.zone, c.couloir, v, effectif?.slice(0, 15).map((j) => [j.id, j.note])]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la clé est le contenu : l'hôte recrée ses objets à chaque sondage
  const chrono = useMemo(() => (valide ? chronologieCombinaison(c, v, effectif) : null), [valide, cle]);
  if (!chrono || !chrono.lignes.length) return compacte ? null : <p className="chrono-vide">{t('cb.chrono.vide')}</p>;
  const duree = Math.max(chrono.fin ?? 0, ...chrono.lignes.map((l) => l.t), 1);
  return (
    <section className={`chrono${compacte ? ' compacte' : ''}`} aria-label={t('cb.chrono.titre')}>
      {!compacte && <header><b><Icone nom="chrono" taille={15} />{t('cb.chrono.titre')}</b><small>{t('cb.chrono.aide')}</small></header>}
      <ol>
        <li className="chrono-depart">
          <span className="chrono-temps">{secondes(0)}</span>
          <span className="chrono-geste"><Icone nom="ballon" taille={13} />{t(`cb.chrono.sortie.${c.phase}`)}</span>
        </li>
        {chrono.lignes.map((l, i) => {
          const contenu = <>
            <span className="chrono-temps">{secondes(l.t)}{!l.mesure && <i> · {t('cb.chrono.estime')}</i>}</span>
            <span className="chrono-geste"><Icone nom={ICONES[l.action.type]} taille={13} />{libelle(l)}</span>
            {l.recu !== undefined && <span className="chrono-recu">{t('cb.chrono.recu', { n: secondes(l.recu) })}</span>}
          </>;
          return (
            <li key={i} className={etape === l.etape ? 'active' : ''} style={{ ['--chrono-position' as string]: `${Math.round(l.t / duree * 100)}%` }}>
              {choisirEtape ? <button type="button" onClick={() => choisirEtape(l.etape)}>{contenu}</button> : contenu}
            </li>
          );
        })}
      </ol>
      {!compacte && chrono.conquete !== null && chrono.conquete > .5 && <p className="chrono-note">{t('cb.chrono.conquete', { n: chrono.conquete.toLocaleString(undefined, { maximumFractionDigits: 1 }) })}</p>}
    </section>
  );
}
