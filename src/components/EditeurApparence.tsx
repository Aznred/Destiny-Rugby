// L'ÉDITEUR D'APPARENCE — un seul composant pour la création ET la personnalisation en carrière
//
// À gauche l'aperçu 3D (qui se met à jour à chaque geste, qu'on tourne face / profil / dos) ; à droite trois
// onglets : Visage (teint, coupe, couleur, barbe), Physique (morphologie bornée) et Équipement (casque et
// crampons déjà achetés). `morphoFigee` verrouille la taille et la carrure une fois la carrière lancée.

import { useMemo, useState } from 'react';
import { ApercuJoueur3D } from './ApercuJoueur3D';
import { t } from '../lib/i18n';
import { nomPoste, POSTE_PAR_ID } from '../data/rugby';
import { EQUIPEMENT_PAR_ID, EQUIPEMENTS } from '../data/boutique';
import type { CategorieEquipement } from '../data/boutique';
import { texteTraduit } from '../lib/i18n';
import {
  BARBES, COUPES, COULEURS_CHEVEUX, LIMITES_MORPHO, TEINTS_PEAU, apparencePourApercu, apparencePourPoste, morphoConseillee, morphoValide,
  type ApparenceJoueur, type FamilleBarbe, type FamilleCoupe, type MorphoJoueur,
} from '../lib/apparenceJoueur';
import type { PosteId } from '../types';
import './EditeurApparence.css';

type Onglet = 'visage' | 'physique' | 'equipement';

const CURSEURS: { cle: keyof MorphoJoueur; min: number; max: number; pas: number; unite?: 'cm' | 'kg' }[] = [
  { cle: 'tailleCm', min: LIMITES_MORPHO.tailleCm[0], max: LIMITES_MORPHO.tailleCm[1], pas: 1, unite: 'cm' },
  { cle: 'poidsKg', min: LIMITES_MORPHO.poidsKg[0], max: LIMITES_MORPHO.poidsKg[1], pas: 1, unite: 'kg' },
  { cle: 'epaules', min: -1, max: 1, pas: 0.05 },
  { cle: 'muscle', min: -1, max: 1, pas: 0.05 },
  { cle: 'torse', min: -1, max: 1, pas: 0.05 },
  { cle: 'bras', min: -1, max: 1, pas: 0.05 },
  { cle: 'jambes', min: -1, max: 1, pas: 0.05 },
];

/** Numérote chaque coupe dans sa famille : « Court 1 », « Court 2 »… */
function numeroter<T extends { id: string; famille: string }>(liste: readonly T[]) {
  const compte: Record<string, number> = {};
  return liste.map((e) => ({ ...e, n: (compte[e.famille] = (compte[e.famille] ?? 0) + 1) }));
}
const COUPES_NUMEROTEES = numeroter(COUPES);
const BARBES_NUMEROTEES = numeroter(BARBES);

export function EditeurApparence({
  apparence, poste, nom, club, onChange, morphoFigee = false, equipementActif = {}, equipements = [], onEquiper, onMorphoTouchee,
}: {
  apparence: ApparenceJoueur;
  poste: PosteId;
  nom?: string;
  club?: string;
  onChange: (a: ApparenceJoueur) => void;
  morphoFigee?: boolean;
  equipementActif?: Partial<Record<CategorieEquipement, string>>;
  /** Identifiants des articles achetés ; sans eux l'onglet Équipement n'affiche que ce qui est porté. */
  equipements?: string[];
  /** Équipe ou retire un article (boutique). Absent : l'équipement est montré en lecture seule. */
  onEquiper?: (id: string) => void;
  onMorphoTouchee?: () => void;
}) {
  const [onglet, setOnglet] = useState<Onglet>('visage');
  const [cadrage, setCadrage] = useState<'corps' | 'visage'>('corps');
  const avant = (POSTE_PAR_ID[poste]?.numero ?? 15) <= 8;
  const resolue = useMemo(
    () => apparencePourApercu(nom || 'Joueur', poste, apparence, equipementActif),
    [nom, poste, apparence, equipementActif],
  );
  const maj = (changement: Partial<ApparenceJoueur>) => onChange({ ...apparence, ...changement });
  const majMorpho = (cle: keyof MorphoJoueur, valeur: number) => {
    onMorphoTouchee?.();
    onChange({ ...apparence, morpho: morphoValide({ ...apparence.morpho, [cle]: valeur }, poste) });
  };
  const articles = (categorie: CategorieEquipement) => EQUIPEMENTS.filter((e) => e.categorie === categorie && (equipements.includes(e.id) || equipementActif[categorie] === e.id));

  return (
    <div className="edap" data-tuto="apparence">
      <div className="edap-apercu">
        <ApercuJoueur3D apparence={resolue} club={club} avant={avant} cadrage={cadrage} />
        <button type="button" className="edap-cadre" onClick={() => setCadrage((c) => (c === 'corps' ? 'visage' : 'corps'))}>
          {cadrage === 'corps' ? t('ap.cadreVisage') : t('ap.cadreCorps')}
        </button>
      </div>

      <div className="edap-commandes">
        <div className="edap-onglets" role="tablist">
          {(['visage', 'physique', 'equipement'] as const).map((o) => (
            <button key={o} type="button" role="tab" aria-selected={onglet === o} className={onglet === o ? 'actif' : undefined}
              onClick={() => { setOnglet(o); if (o === 'visage') setCadrage('visage'); else setCadrage('corps'); }}>
              {t(`ap.onglet.${o}`)}
            </button>
          ))}
        </div>

        {onglet === 'visage' && (
          <div className="edap-panneau">
            <fieldset>
              <legend>{t('ap.teint')}</legend>
              <div className="edap-pastilles">
                {TEINTS_PEAU.map((c, i) => (
                  <button key={c} type="button" className={apparence.peau === i ? 'actif' : undefined} style={{ background: c }}
                    aria-pressed={apparence.peau === i} aria-label={t('ap.teintN', { n: i + 1 })} title={t('ap.teintN', { n: i + 1 })}
                    onClick={() => maj({ peau: i })} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>{t('ap.coupes')}</legend>
              <div className="edap-choix">
                <button type="button" className={apparence.coupe === '' ? 'actif' : undefined} onClick={() => maj({ coupe: '' })}>{t('ap.chauve')}</button>
                {COUPES_NUMEROTEES.map((c) => (
                  <button key={c.id} type="button" className={apparence.coupe === c.id ? 'actif' : undefined} onClick={() => maj({ coupe: c.id })}>
                    {t(`ap.coupe.${c.famille as FamilleCoupe}`, { n: c.n })}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>{t('ap.couleurCheveux')}</legend>
              <div className="edap-pastilles">
                {COULEURS_CHEVEUX.map((c, i) => (
                  <button key={c} type="button" className={apparence.couleurCheveux === c ? 'actif' : undefined} style={{ background: c }}
                    aria-pressed={apparence.couleurCheveux === c} aria-label={t('ap.couleurN', { n: i + 1 })} title={t('ap.couleurN', { n: i + 1 })}
                    onClick={() => maj({ couleurCheveux: c })} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>{t('ap.barbe')}</legend>
              <div className="edap-choix">
                <button type="button" className={apparence.barbe === '' ? 'actif' : undefined} onClick={() => maj({ barbe: '' })}>{t('ap.aucune')}</button>
                {BARBES_NUMEROTEES.map((b) => (
                  <button key={b.id} type="button" className={apparence.barbe === b.id ? 'actif' : undefined} onClick={() => maj({ barbe: b.id })}>
                    {t(`ap.barbeStyle.${b.famille as FamilleBarbe}`, { n: b.n })}
                  </button>
                ))}
              </div>
            </fieldset>

            {apparence.barbe !== '' && (
              <fieldset>
                <legend>{t('ap.couleurBarbe')}</legend>
                <div className="edap-pastilles">
                  <button type="button" className={`edap-meme${apparence.couleurBarbe ? '' : ' actif'}`} onClick={() => maj({ couleurBarbe: undefined })}>{t('ap.memeCouleur')}</button>
                  {COULEURS_CHEVEUX.map((c, i) => (
                    <button key={c} type="button" className={apparence.couleurBarbe === c ? 'actif' : undefined} style={{ background: c }}
                      aria-pressed={apparence.couleurBarbe === c} aria-label={t('ap.couleurN', { n: i + 1 })} onClick={() => maj({ couleurBarbe: c })} />
                  ))}
                </div>
              </fieldset>
            )}

            {!morphoFigee && (
              <button type="button" className="btn fantome petit" onClick={() => onChange({ ...apparencePourPoste(poste, Math.floor(Math.random() * 99999)), morpho: apparence.morpho })}>
                {t('ap.alea')}
              </button>
            )}
          </div>
        )}

        {onglet === 'physique' && (
          <div className="edap-panneau">
            <p className="edap-note">{morphoFigee ? t('ap.morphoFigee') : t('ap.morphoConseil', { poste: nomPoste(poste) })}</p>
            {CURSEURS.map((c) => {
              const valeur = apparence.morpho[c.cle];
              const lisible = c.unite ? t(c.unite === 'cm' ? 'ap.valCm' : 'ap.valKg', { n: Math.round(valeur) }) : `${valeur > 0 ? '+' : ''}${Math.round(valeur * 100)} %`;
              return (
                <label key={c.cle} className="edap-curseur">
                  <span>{t(`ap.morpho.${c.cle}`)}</span>
                  <input type="range" min={c.min} max={c.max} step={c.pas} value={valeur} disabled={morphoFigee}
                    onChange={(e) => majMorpho(c.cle, Number(e.target.value))} />
                  <output>{lisible}</output>
                </label>
              );
            })}
            {!morphoFigee && (
              <button type="button" className="btn fantome petit" onClick={() => onChange({ ...apparence, morpho: morphoConseillee(poste) })}>
                {t('ap.morphoReset')}
              </button>
            )}
          </div>
        )}

        {onglet === 'equipement' && (
          <div className="edap-panneau">
            <p className="edap-note">{t('ap.equipementAide')}</p>
            {(['casque', 'crampons'] as const).map((cat) => {
              const liste = articles(cat);
              return (
                <fieldset key={cat}>
                  <legend>{t(cat === 'casque' ? 'ap.casque' : 'ap.crampons')}</legend>
                  <div className="edap-choix">
                    <button type="button" className={!equipementActif[cat] ? 'actif' : undefined} disabled={!onEquiper || !equipementActif[cat]}
                      onClick={() => { const id = equipementActif[cat]; if (id) onEquiper?.(id); }}>
                      {t(cat === 'casque' ? 'ap.sansCasque' : 'ap.cramponsOrigine')}
                    </button>
                    {liste.map((e) => (
                      <button key={e.id} type="button" className={equipementActif[cat] === e.id ? 'actif' : undefined} disabled={!onEquiper}
                        onClick={() => onEquiper?.(e.id)}>
                        {texteTraduit(EQUIPEMENT_PAR_ID[e.id]?.nom ?? e.nom)}
                      </button>
                    ))}
                  </div>
                  {liste.length === 0 && <p className="edap-note">{t('ap.aucunArticle')}</p>}
                </fieldset>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
