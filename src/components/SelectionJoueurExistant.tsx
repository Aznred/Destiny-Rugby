import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useCatalogueSolo } from '../lib/catalogueSoloCommun';
import { carteDepuisSource, type SourceCarte } from '../lib/ligue/catalogueCarriere';
import {
  FILTRES_VIDES, filtrerJoueursExistants, indexerJoueursExistants,
  type EntreeRecherche, type FiltresJoueursExistants,
} from '../lib/carriereExistante';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { Selecteur, type OptionSelecteur } from './Selecteur';
import { Drapeau } from './Drapeau';
import { LogoCompet } from './LogoCompet';
import { Blason } from './Blason';
import { Icone } from './Icone';
import { BadgeHorsClassement } from './BadgeHorsClassement';
import { COMPETITIONS } from '../data/clubs';
import { POSTES, categoriePoste, nomPoste } from '../data/rugby';
import { nomNationTraduit } from '../lib/nations';
import { useModalDialog } from '../lib/useModalDialog';
import { nombre, t } from '../lib/i18n';
import type { PosteId } from '../types';
import './SelectionJoueurExistant.css';

/** Combien de cartes d'un coup : 78 000 joueurs ne se montent jamais d'un seul rendu. */
const PAR_LOT = 24;

/** Les bornes de GEN proposées : de cinq en cinq, là où les cartes se distinguent. */
const PALIERS_GEN = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95];

/**
 * LA SÉLECTION D'UN JOUEUR EXISTANT (Correctif 19).
 *
 * Demande : « un écran de recherche permettant de filtrer par nom, club, championnat, nation, poste, GEN — et
 * afficher les cartes existantes pour rendre la sélection agréable ».
 *
 * ⚠️ L'INDEX SE CONSTRUIT APRÈS LE PREMIER RENDU, pas pendant : 78 000 cartes à normaliser, c'est quelques
 * centaines de millisecondes qu'on ne veut pas voir figer le passage d'un écran à l'autre. ⚠️ ET LA FRAPPE EST
 * DIFFÉRÉE (`useDeferredValue`) : le champ reste fluide, la liste suit.
 */
export function SelectionJoueurExistant({ onChoisir, erreur }: {
  onChoisir: (carte: SourceCarte) => void;
  /** Le store a refusé la carte (club inconnu…). */
  erreur?: boolean;
}) {
  const catalogue = useCatalogueSolo();
  const [index, setIndex] = useState<EntreeRecherche[] | null>(null);
  useEffect(() => {
    setIndex(null);
    const minuteur = window.setTimeout(() => setIndex(indexerJoueursExistants(catalogue)), 30);
    return () => window.clearTimeout(minuteur);
  }, [catalogue]);

  const [filtres, setFiltres] = useState<FiltresJoueursExistants>(FILTRES_VIDES);
  const [lots, setLots] = useState(1);
  const [choisi, setChoisi] = useState<EntreeRecherche | null>(null);
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const modifier = (partiel: Partial<FiltresJoueursExistants>) => { setFiltres((f) => ({ ...f, ...partiel })); setLots(1); };

  const filtresDiffs = useDeferredValue(filtres);
  const resultats = useMemo(() => (index ? filtrerJoueursExistants(index, filtresDiffs) : []), [index, filtresDiffs]);
  const affiches = resultats.slice(0, lots * PAR_LOT);
  const filtresActifs = JSON.stringify(filtres) !== JSON.stringify(FILTRES_VIDES);
  // Les filtres repliés sur téléphone : tout sauf la zone de texte, qui reste toujours visible.
  const nombreFiltres = [filtres.championnat, filtres.club, filtres.nation, filtres.poste].filter(Boolean).length
    + (filtres.genMin > FILTRES_VIDES.genMin ? 1 : 0) + (filtres.genMax < FILTRES_VIDES.genMax ? 1 : 0);

  // ── Les listes de choix : seulement ce qui existe dans le catalogue ──
  const presents = useMemo(() => {
    const championnats = new Set<string>(), clubs = new Set<string>(), nations = new Set<string>();
    for (const e of index ?? []) { championnats.add(e.division); clubs.add(e.club); nations.add(e.nation); }
    return { championnats, clubs, nations };
  }, [index]);

  const optionsChampionnats: OptionSelecteur[] = useMemo(() => [
    { valeur: '', label: t('cr.existant.tous') },
    ...COMPETITIONS.filter((c) => presents.championnats.has(c.id)).map((c) => ({
      valeur: c.id, label: c.nom, vignette: <LogoCompet id={c.id} taille={22} />,
      groupe: c.zone === 'France' ? t('cr.pyramide') : nomNationTraduit(c.pays),
    })),
  ], [presents]);

  const championnatChoisi = COMPETITIONS.find((c) => c.id === filtres.championnat);
  const optionsClubs: OptionSelecteur[] = useMemo(() => [
    { valeur: '', label: t('cr.existant.tous') },
    ...(championnatChoisi?.clubs ?? []).filter((c) => presents.clubs.has(c.nom)).map((c) => ({
      valeur: c.nom, label: c.nom, vignette: <Blason club={c} taille={22} />,
      sous: c.ville ? `${c.ville}${c.departementNum ? ` (${c.departementNum})` : ''}` : undefined,
    })),
  ], [championnatChoisi, presents]);

  const optionsNations: OptionSelecteur[] = useMemo(() => [
    { valeur: '', label: t('cr.existant.toutes') },
    ...[...presents.nations].map((n) => ({ valeur: n, label: nomNationTraduit(n), vignette: <Drapeau nation={n} taille={1.05} /> }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ], [presents]);

  const optionsPostes: OptionSelecteur[] = useMemo(() => [
    { valeur: '', label: t('cr.existant.tous') },
    ...POSTES.map((p) => ({ valeur: p.id, label: `${p.numero} · ${nomPoste(p.id)}`, groupe: categoriePoste(p.id) })),
  ], []);

  const optionsGenMin: OptionSelecteur[] = useMemo(() => [
    { valeur: '0', label: t('cr.existant.tous') }, ...PALIERS_GEN.map((n) => ({ valeur: String(n), label: `${n}+` })),
  ], []);
  const optionsGenMax: OptionSelecteur[] = useMemo(() => [
    { valeur: '100', label: t('cr.existant.tous') }, ...[...PALIERS_GEN].reverse().map((n) => ({ valeur: String(n), label: `≤ ${n}` })),
  ], []);

  return (
    <div className="sje">
      <h2 className="sje-titre">{t('cr.existant.titre')}</h2>
      <p className="sje-chapo">{t('cr.existant.chapo')}</p>

      <div className="sje-filtres carte">
        <label className="sje-recherche">
          <span>{t('cr.existant.recherche')}</span>
          <input
            type="search"
            value={filtres.recherche}
            placeholder={t('cr.existant.recherchePlaceholder')}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => modifier({ recherche: e.target.value })}
          />
        </label>
        {/* Sur téléphone, sept champs avant la première carte, c'est un écran de formulaire : les filtres se replient derrière
            un bouton qui dit combien sont actifs. Au-delà de 560 px ils restent ouverts (voir le CSS). */}
        <button type="button" className="sje-bascule btn fantome" aria-expanded={filtresOuverts} onClick={() => setFiltresOuverts((v) => !v)}>
          <Icone nom="loupe" taille={16} /> {t('cr.existant.filtres')}{nombreFiltres > 0 ? ` · ${nombreFiltres}` : ''}
          <Icone nom="chevron" taille={14} />
        </button>
        <div className={`sje-avances${filtresOuverts ? ' ouvert' : ''}`}>
        <div className="sje-champ">
          <span>{t('cr.existant.championnat')}</span>
          <Selecteur options={optionsChampionnats} valeur={filtres.championnat} onChange={(v) => modifier({ championnat: v, club: '' })} />
        </div>
        <div className="sje-champ">
          <span>{t('cr.existant.club')}</span>
          <Selecteur
            options={optionsClubs}
            valeur={filtres.club}
            onChange={(v) => modifier({ club: v })}
            placeholder={filtres.championnat ? undefined : t('cr.existant.choisirChampionnat')}
          />
        </div>
        <div className="sje-champ">
          <span>{t('cr.existant.nation')}</span>
          <Selecteur options={optionsNations} valeur={filtres.nation} onChange={(v) => modifier({ nation: v })} />
        </div>
        <div className="sje-champ">
          <span>{t('cr.existant.poste')}</span>
          <Selecteur options={optionsPostes} valeur={filtres.poste} onChange={(v) => modifier({ poste: v as PosteId | '' })} />
        </div>
        <div className="sje-gen">
          <div className="sje-champ">
            <span>{t('cr.existant.genMin')}</span>
            <Selecteur options={optionsGenMin} valeur={String(filtres.genMin)} onChange={(v) => modifier({ genMin: Number(v) })} />
          </div>
          <div className="sje-champ">
            <span>{t('cr.existant.genMax')}</span>
            <Selecteur options={optionsGenMax} valeur={String(filtres.genMax)} onChange={(v) => modifier({ genMax: Number(v) })} />
          </div>
        </div>
        </div>
      </div>

      {index === null ? (
        <p className="sje-etat" role="status">{t('cr.existant.chargement')}</p>
      ) : (
        <>
          <div className="sje-resume">
            <span role="status">{resultats.length === 1 ? t('cr.existant.resultat1') : t('cr.existant.resultats', { n: nombre(resultats.length) })}</span>
            {filtresActifs && (
              <button type="button" className="btn fantome" onClick={() => { setFiltres(FILTRES_VIDES); setLots(1); }}>
                {t('cr.existant.reinitialiser')}
              </button>
            )}
          </div>
          {resultats.length === 0 ? (
            <div className="sje-vide carte"><Icone nom="loupe" taille={28} /><b>{t('cr.existant.aucun')}</b></div>
          ) : (
            <div className="sje-cartes">
              {affiches.map((e) => (
                <div className="sje-carte" key={e.carte.sourceId}>
                  <CarteJoueurEnLigne
                    carte={carteDepuisSource(e.carte, 'creation', e.club, 1)}
                    proprietaire={e.club}
                    compacte
                    onClick={() => setChoisi(e)}
                  />
                </div>
              ))}
            </div>
          )}
          {affiches.length < resultats.length && (
            <div className="sje-suite">
              <button type="button" className="btn fantome" onClick={() => setLots((n) => n + 1)}>{t('cr.existant.plus')}</button>
            </div>
          )}
        </>
      )}

      {choisi && <ConfirmationJoueur entree={choisi} erreur={!!erreur} onNon={() => setChoisi(null)} onOui={() => onChoisir(choisi.carte)} />}
    </div>
  );
}

/** La carte choisie, ce qu'elle emporte, et le rappel que la carrière sera hors classement. */
function ConfirmationJoueur({ entree, erreur, onOui, onNon }: {
  entree: EntreeRecherche; erreur: boolean; onOui: () => void; onNon: () => void;
}) {
  const { overlayRef, dialogRef } = useModalDialog(onNon);
  const { carte } = entree;
  return createPortal(
    <div ref={overlayRef} className="overlay" onClick={onNon}>
      <motion.div
        ref={dialogRef}
        className="carte modale sje-modale"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sje-confirmer-titre"
        tabIndex={-1}
        onClick={(ev) => ev.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="sje-modale-carte">
          <CarteJoueurEnLigne carte={carteDepuisSource(carte, 'creation', entree.club, 1)} proprietaire={entree.club} compacte />
        </div>
        <div className="sje-modale-texte">
          <h2 id="sje-confirmer-titre">{t('cr.existant.confirmer', { nom: carte.nom })}</h2>
          <p className="aide">
            {t('cr.existant.resume', { poste: nomPoste(carte.poste), club: entree.club, age: carte.age, gen: carte.note })}
          </p>
          <p className="sje-rappel"><BadgeHorsClassement /> {t('cr.horsClassement.irreversible')}</p>
          {erreur && <p className="sje-erreur" role="alert">{t('cr.existant.echec')}</p>}
          <div className="rangee-fin">
            <button type="button" className="btn fantome" onClick={onNon}>{t('cr.existant.annuler')}</button>
            <button type="button" className="btn primaire" onClick={onOui}><Icone nom="ballon" taille={18} /> {t('cr.existant.commencer')}</button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
