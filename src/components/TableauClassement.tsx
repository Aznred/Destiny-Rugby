// LE CLASSEMENT — un seul tableau pour la carrière joueur, la carrière entraîneur et la ligue en ligne (Correctif 29)
//
// ⚠️ SUR TÉLÉPHONE, CE N'EST PAS LE TABLEAU DE BUREAU RÉTRÉCI. Dix colonnes ne tiennent pas dans 360 px : on perdait
// les points hors de l'écran, ou il fallait zoomer. La vue étroite montre ce qu'on vient lire — position, équipe,
// matchs joués, différence, points — de la première à la dernière ligne, sans défilement horizontal ; toucher une
// équipe déplie le reste (V, N, D, bonus, points pour et contre).
//
// ⚠️ LA COULEUR D'UNE LIGNE VIENT DU RÈGLEMENT, JAMAIS D'UNE POSITION. Chaque ligne arrive avec son `statut`
// (`standingsStatuses`, `lib/competitionRules.ts`) : relégation directe en rouge, match d'accès en orange,
// qualification, barrages, reversement en Challenge Cup. Chaque couleur est doublée d'un symbole et d'un libellé.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PRESENTATION_STATUT, type StandingsStatus } from '../lib/competitionRules';
import { nomCourt } from '../lib/nomCourt';
import { t } from '../lib/i18n';
import './TableauClassement.css';

export interface LigneClassement {
  cle: string;
  position: number;
  nom: string;
  /** Sous le nom : le pseudo de l'entraîneur en ligne, par exemple. */
  sousTitre?: string;
  ecusson?: ReactNode;
  joues: number;
  gagnes: number;
  nuls: number;
  perdus: number;
  pour: number;
  contre: number;
  difference: number;
  bonus: number;
  points: number;
  statut?: StandingsStatus;
  moi?: boolean;
  /** Pastille posée après le nom (« toi »). */
  pastille?: ReactNode;
  /** Les derniers résultats, du plus ancien au plus récent (`V`, `N`, `D`). */
  forme?: string[];
}

/** En dessous de cette largeur DU TABLEAU (pas de l'écran), on passe à la vue étroite. */
const LARGEUR_ETROITE = 600;

const ORDRE_LEGENDE: Exclude<StandingsStatus, 'SAFE'>[] = [
  'PROMOTION', 'QUALIFIED', 'PLAYOFF', 'CHALLENGE_CUP', 'ACCESS_MATCH', 'DIRECT_RELEGATION', 'ELIMINATED',
];

const signe = (n: number) => (n > 0 ? `+${n}` : String(n));

function Zone({ statut }: { statut?: StandingsStatus }) {
  if (!statut || statut === 'SAFE') return <span className="clt-zone" aria-hidden="true" />;
  const p = PRESENTATION_STATUT[statut];
  return <span className="clt-zone" data-statut={statut} title={t(p.cle)}><i aria-hidden="true">{p.symbole}</i><span className="clt-lu">{t(p.cle)}</span></span>;
}

export function TableauClassement({ lignes, onOuvrir, libelleOuvrir, avecForme = false, legende = true }: {
  lignes: LigneClassement[];
  /** Ouvre la fiche de l'équipe (ligue en ligne). */
  onOuvrir?: (cle: string) => void;
  libelleOuvrir?: string;
  avecForme?: boolean;
  legende?: boolean;
}) {
  const racine = useRef<HTMLDivElement>(null);
  const [etroit, setEtroit] = useState(() => typeof window !== 'undefined' && window.innerWidth < LARGEUR_ETROITE + 40);
  const [ouverte, setOuverte] = useState<string | null>(null);

  // La largeur qui compte est celle du tableau : dans une grille de poules, il est étroit sur un grand écran.
  useEffect(() => {
    const el = racine.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const mesurer = () => setEtroit(el.clientWidth < LARGEUR_ETROITE);
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  const statuts = ORDRE_LEGENDE.filter((s) => lignes.some((l) => l.statut === s));

  return (
    <div className="clt" ref={racine} data-etroit={etroit ? 'oui' : undefined} data-forme={avecForme && !etroit ? 'oui' : undefined}>
      <div className="clt-table" role="table">
        <div className="clt-entete" role="row">
          <span role="columnheader" className="clt-c-pos">#</span>
          <span role="columnheader" className="clt-c-nom">{t('tb.club')}</span>
          <span role="columnheader" title={t('tb.joues')}>{t('cl.mj')}</span>
          {!etroit && <>
            <span role="columnheader" title={t('tb.gagnes')}>{t('cl.col.v')}</span>
            <span role="columnheader" title={t('tb.nuls')}>{t('cl.col.n')}</span>
            <span role="columnheader" title={t('tb.perdus')}>{t('cl.col.d')}</span>
            <span role="columnheader" title={t('cl.col.pour')}>+</span>
            <span role="columnheader" title={t('cl.col.contre')}>−</span>
          </>}
          <span role="columnheader" className="clt-c-diff" title={t('tb.difference')}>{t('cl.col.diff')}</span>
          {!etroit && <span role="columnheader" title={t('tb.bonus')}>B</span>}
          {avecForme && !etroit && <span role="columnheader" className="clt-c-forme">{t('attr.forme')}</span>}
          <span role="columnheader" className="clt-c-pts" title={t('tb.points')}>{t('cl.col.pts')}</span>
          {etroit && <span aria-hidden="true" />}
        </div>

        {lignes.map((l) => {
          const depliee = etroit && ouverte === l.cle;
          const cliquable = etroit || !!onOuvrir;
          const contenu = <>
            <span role="cell" className="clt-c-pos"><b>{l.position}</b><Zone statut={l.statut} /></span>
            <span role="cell" className="clt-c-nom">
              {l.ecusson ?? <span className="clt-sans-ecusson" />}
              <span className="clt-nom" title={l.nom}>
                <span className="clt-nom-texte">{etroit ? nomCourt(l.nom) : l.nom}</span>{l.pastille}
                {l.sousTitre && !etroit && <small>{l.sousTitre}</small>}
              </span>
            </span>
            <span role="cell">{l.joues}</span>
            {!etroit && <>
              <span role="cell">{l.gagnes}</span><span role="cell">{l.nuls}</span><span role="cell">{l.perdus}</span>
              <span role="cell">{l.pour}</span><span role="cell">{l.contre}</span>
            </>}
            <span role="cell" className={`clt-c-diff ${l.difference >= 0 ? 'plus' : 'moins'}`}>{signe(l.difference)}</span>
            {!etroit && <span role="cell">{l.bonus}</span>}
            {avecForme && !etroit && <span role="cell" className="clt-c-forme"><Forme forme={l.forme} /></span>}
            <span role="cell" className="clt-c-pts">{l.points}</span>
            {etroit && <span className="clt-chevron" aria-hidden="true">{depliee ? '−' : '+'}</span>}
          </>;
          return (
            <div key={l.cle} className="clt-rang" data-statut={l.statut && l.statut !== 'SAFE' ? l.statut : undefined} data-moi={l.moi ? 'oui' : undefined}>
              {cliquable
                ? <button type="button" className="clt-ligne" role="row"
                    aria-expanded={etroit ? depliee : undefined}
                    aria-label={etroit ? t('cl.detail', { club: l.nom }) : undefined}
                    onClick={() => (etroit ? setOuverte(depliee ? null : l.cle) : onOuvrir?.(l.cle))}>{contenu}</button>
                : <div className="clt-ligne" role="row">{contenu}</div>}
              {depliee && (
                <div className="clt-detail">
                  <b className="clt-detail-nom">{l.nom}{l.sousTitre && <small> · {l.sousTitre}</small>}</b>
                  {l.statut && l.statut !== 'SAFE' && (
                    <span className="clt-detail-zone" data-statut={l.statut}>{PRESENTATION_STATUT[l.statut].symbole} {t(PRESENTATION_STATUT[l.statut].cle)}</span>
                  )}
                  <dl>
                    <div><dt>{t('cl.col.v')}</dt><dd>{l.gagnes}</dd></div>
                    <div><dt>{t('cl.col.n')}</dt><dd>{l.nuls}</dd></div>
                    <div><dt>{t('cl.col.d')}</dt><dd>{l.perdus}</dd></div>
                    <div><dt>{t('cl.col.bonus')}</dt><dd>{l.bonus}</dd></div>
                    <div><dt>{t('cl.col.pour')}</dt><dd>{l.pour}</dd></div>
                    <div><dt>{t('cl.col.contre')}</dt><dd>{l.contre}</dd></div>
                    <div><dt>{t('cl.col.diff')}</dt><dd>{signe(l.difference)}</dd></div>
                  </dl>
                  {avecForme && !!l.forme?.length && <Forme forme={l.forme} />}
                  {onOuvrir && <button type="button" className="clt-ouvrir" onClick={() => onOuvrir(l.cle)}>{libelleOuvrir ?? l.nom} →</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {legende && statuts.length > 0 && (
        <ul className="clt-legende" aria-label={t('zone.legende')}>
          {statuts.map((s) => (
            <li key={s} data-statut={s}><i aria-hidden="true">{PRESENTATION_STATUT[s].symbole}</i>{t(PRESENTATION_STATUT[s].cle)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Forme({ forme }: { forme?: string[] }) {
  if (!forme?.length) return <em className="clt-forme-vide">—</em>;
  return <span className="clt-forme">{forme.map((f, n) => <i key={n} data-resultat={f}>{f}</i>)}</span>;
}
