// ═══════════════════════════════════════════════════════════════════════════
// LA FICHE D'UN JOUEUR — la modale qu'on ouvre en cliquant sur un nom
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « pouvoir cliquer sur les profils » dans le marché mondial, « aussi
// dans le X de l'entraîneur ».
//
// ⚠️ IL N'EXISTAIT AUCUNE FICHE DE JOUEUR EN MODE ENTRAÎNEUR, et c'est pour ça
// que rien n'était cliquable : `PanneauJoueur` est la fiche du joueur INCARNÉ
// (elle porte l'entraînement, la retraite, le marché — des actions qu'un
// manager ne peut pas faire sur quelqu'un d'autre), et `FicheClub` montre un
// effectif, pas un homme. Un manager qui repère un nom sur le marché ou dans
// une conversation n'avait donc littéralement nulle part où aller.
//
// ⚠️ ELLE NE MONTRE QUE CE QU'ON SAIT. Le rapport de scouting
// (`rapportConnaissance`) est facultatif : quand il est fourni, c'est LUI qui
// commande la note affichée et sa marge. Sans lui — un coéquipier, un joueur
// de son propre effectif — on affiche la vraie note, parce qu'on la connaît.
// Afficher la vérité derrière un rapport incomplet viderait le scouting de son
// sens, et c'est exactement le piège que `rapportConnaissance` existe pour
// éviter.
//
// ⚠️ `createPortal(document.body)` EST OBLIGATOIRE. Le `backdrop-filter` des
// `.carte` crée un bloc conteneur qui piège les `position: fixed` : c'est la
// leçon déjà payée par `Confirmation` et par `FicheClub`.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { nomPoste } from '../data/rugby';
import { nombre, t } from '../lib/i18n';
import {
  ABREVIATION, NOM_RARETE, attributsDe, axesDe, estPepite, rareteDe, statutDe,
  valeurAxe,
} from '../lib/carteJoueur';
import { photoReelle } from '../lib/avatars';
import { clubParNom } from '../data/clubs';
import { Blason } from './Blason';
import { Drapeau } from './Drapeau';
import { Icone } from './Icone';
import type { PosteId } from '../types';

/** Le minimum pour dessiner une fiche. Tout le reste est facultatif. */
export interface JoueurFiche {
  id: string;
  nom: string;
  poste: PosteId;
  age: number;
  note: number;
  potentiel?: number;
  nation?: string;
  club?: string;
}

/** Ce que le service de recrutement CROIT savoir. Absent = on sait vraiment. */
export interface RapportFiche {
  niveau: 'inconnu' | 'partiel' | 'complet';
  estimation: number;
  marge: number;
  potentiel: [number, number] | null;
  salaire: [number, number] | null;
  personnalite: string | null;
}

/** Le volet marché, quand la fiche s'ouvre depuis une cible de recrutement. */
export interface MarcheFiche {
  valeur: number;
  indemnite: number;
  situation: string;
  saisonsRestantes: number;
  /** L'action principale, reprise telle quelle de la carte du marché. */
  action?: { libelle: string; onClic: () => void; desactive?: boolean };
  observer?: { onClic: () => void; desactive?: boolean };
}

interface Props {
  joueur: JoueurFiche;
  rapport?: RapportFiche;
  marche?: MarcheFiche;
  onFermer: () => void;
}

function Portrait({ nom }: { nom: string }) {
  const photo = photoReelle(nom);
  const [erreur, setErreur] = useState(false);
  useEffect(() => setErreur(false), [photo, nom]);
  return (
    <span className="fj-portrait" aria-hidden="true">
      {photo && !erreur
        ? <img src={photo} alt="" decoding="async" onError={() => setErreur(true)} />
        : (
          <svg viewBox="0 0 48 48" className="fj-portrait-vide">
            <circle cx="24" cy="17" r="9" />
            <path d="M8 43c1.8-10.3 7.2-15.5 16-15.5S38.2 32.7 40 43H8Z" />
          </svg>
        )}
    </span>
  );
}

export function FicheJoueur({ joueur, rapport, marche, onFermer }: Props) {
  // Échap ferme, comme partout ailleurs dans le jeu.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onFermer]);

  const potentiel = joueur.potentiel ?? joueur.note;
  const complet = { ...joueur, potentiel };
  const rarete = rareteDe(complet);
  const attributs = attributsDe(joueur);
  const club = joueur.club ? clubParNom(joueur.club) : undefined;
  // ⚠️ La note affichée vient du RAPPORT s'il existe. Voir l'entête du fichier.
  const noteVue = rapport ? rapport.estimation : joueur.note;
  const marge = rapport?.marge ?? 0;

  return createPortal(
    <div className="fj-fond" role="presentation" onClick={onFermer}>
      <motion.section
        className={`fj-carte ct-r-${rarete}`}
        role="dialog"
        aria-modal="true"
        aria-label={joueur.nom}
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="fj-fermer" onClick={onFermer} aria-label={t('compo.fermer')}>
          <Icone nom="croix" taille={18} />
        </button>

        <header className="fj-tete">
          <Portrait nom={joueur.nom} />
          <div className="fj-identite">
            <b>{joueur.nom}</b>
            <span>
              {joueur.nation && <Drapeau nation={joueur.nation} taille={0.95} />}
              {nomPoste(joueur.poste)} · {joueur.age} {t('compo.ans')}
            </span>
            {joueur.club && (
              <span className="fj-club">
                {club && <Blason club={club} taille={20} />} {joueur.club}
              </span>
            )}
          </div>
          <div className="fj-note">
            <strong>{noteVue}</strong>
            {marge > 0 && <em>± {marge}</em>}
            <small>{t('mgr.general')}</small>
          </div>
        </header>

        <div className="fj-etiquettes">
          <span className={`fj-rarete ct-r-txt-${rarete}`}>
            <Icone nom="etoile" taille={12} /> {NOM_RARETE[rarete]}
          </span>
          <span className="fj-statut">{t(`compo.statut.${statutDe(complet)}`)}</span>
          {estPepite(complet) && (
            <span className="fj-pepite"><Icone nom="pousse" taille={12} /> {t('compo.badge.espoir')}</span>
          )}
          {rapport && (
            <span className="fj-scouting">
              <Icone nom="oeil" taille={12} /> {t(`mgr.rapport.${rapport.niveau}`)}
            </span>
          )}
        </div>

        {/* ⚠️ LES SIX AXES SONT CEUX DU POSTE, comme sur la carte de composition :
            un pilier et un ailier ne se jugent pas sur les mêmes qualités. Voir
            `AXES_PAR_FAMILLE` (`lib/carteJoueur.ts`). */}
        <ul className="fj-axes">
          {axesDe(joueur.poste).map((axe) => (
            <li key={axe}>
              <span>{ABREVIATION[axe]}</span>
              <progress value={valeurAxe(joueur, axe)} max={100} />
              <b>{valeurAxe(joueur, axe)}</b>
            </li>
          ))}
        </ul>

        <details className="fj-brut">
          <summary>{t('compo.attributsBruts')}</summary>
          <ul>
            {Object.entries(attributs).map(([k, v]) => (
              <li key={k}><span>{t(`attr.${k}`)}</span><b>{v}</b></li>
            ))}
          </ul>
        </details>

        {/* Le potentiel : la vraie marge si on la connaît, la fourchette du
            rapport sinon, et rien du tout quand le service n'a rien vu. */}
        <div className="fj-chiffres">
          <div>
            <em>{t('mgr.potentiel')}</em>
            <b>
              {rapport
                ? (rapport.potentiel ? `${rapport.potentiel[0]}–${rapport.potentiel[1]}` : '?')
                : potentiel}
            </b>
          </div>
          {marche && (
            <>
              <div>
                <em>{t('mgr.valeur')}</em>
                <b>{nombre(marche.valeur)} €</b>
              </div>
              <div className={marche.indemnite === 0 ? 'fj-gratuit' : ''}>
                <em>{t('mgr.indemnite')}</em>
                <b>{marche.indemnite === 0 ? t('mgr.libreGratuit') : `${nombre(marche.indemnite)} €`}</b>
              </div>
              <div>
                <em>{t('mgr.salaire')}</em>
                <b>
                  {rapport?.salaire
                    ? `${nombre(rapport.salaire[0])}–${nombre(rapport.salaire[1])} €`
                    : '?'}
                </b>
              </div>
            </>
          )}
        </div>

        {marche && (
          <p className={`fj-situation ${marche.situation}`}>
            <Icone nom="chrono" taille={13} /> {t(`mgr.situation.${marche.situation}`)}
            {marche.saisonsRestantes > 0
              && ` · ${t('mgr.contratRestant', { n: marche.saisonsRestantes })}`}
          </p>
        )}

        {rapport?.personnalite && (
          <p className="fj-personnalite">
            <Icone nom="profil" taille={13} /> {rapport.personnalite}
          </p>
        )}

        {marche && (marche.action || marche.observer) && (
          <div className="fj-actions">
            {marche.action && (
              <button
                type="button"
                className="btn primaire"
                disabled={marche.action.desactive}
                onClick={() => { marche.action!.onClic(); onFermer(); }}
              >
                {marche.action.libelle}
              </button>
            )}
            {marche.observer && (
              <button
                type="button"
                className="btn fantome"
                disabled={marche.observer.desactive}
                onClick={() => marche.observer!.onClic()}
              >
                <Icone nom="oeil" taille={16} /> {t('mgr.observerPlus')}
              </button>
            )}
          </div>
        )}
      </motion.section>
    </div>,
    document.body,
  );
}
