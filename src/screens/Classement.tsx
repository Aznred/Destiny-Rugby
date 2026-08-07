import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame, classementComplet } from '../store/useGame';
import { POSTE_PAR_ID, migrerPoste, nomPoste } from '../data/rugby';
import { Drapeau } from '../components/Drapeau';
import { nomNationTraduit } from '../lib/nations';
import { TROPHEES } from '../data/trophees';
import { titreTraduit } from '../lib/tropheesI18n';
import { ficheDepuisJoueur, verifierFiche } from '../lib/classementMondial';
import { nombre, t } from '../lib/i18n';
import type { LegendeSauvegardee } from '../types';
import {
  lireClassementMondial, type EtatMondial,
} from '../lib/classementEnLigne';

export function Classement() {
  const pantheon = useGame((s) => s.pantheon);
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);

  const liste = classementComplet(pantheon, joueur);

  // ⚠️ LE TABLEAU MONDIAL EST UN BONUS, JAMAIS UNE DÉPENDANCE — mais il doit
  // TOUJOURS S'AFFICHER, avec son état. Il n'était rendu que s'il contenait au
  // moins une ligne : sans serveur, en panne, ou simplement vide, l'écran ne
  // montrait RIEN, pas même un titre. D'où le bug signalé en jeu (« le
  // classement fonctionne pas, la table se remplit pas ») : il n'y avait
  // littéralement pas de table à remplir. Voir `serveur/VERCEL.md`.
  const [mondial, setMondial] = useState<EtatMondial | null>(null);
  const [ficheOuverte, setFicheOuverte] = useState<LegendeSauvegardee | null>(null);

  useEffect(() => {
    let vivant = true;
    lireClassementMondial().then((r) => { if (vivant) setMondial(r); });
    return () => { vivant = false; };
  }, []);

  // Le verdict que le serveur rendrait sur la carrière en cours : il sert à
  // afficher l'état de l'envoi automatique, et à dire pourquoi si ça coince.
  const envoi = useMemo(() => {
    if (!joueur) return null;
    const fiche = ficheDepuisJoueur(joueur);
    return { fiche, verdict: verifierFiche(fiche, Object.keys(TROPHEES)) };
  }, [joueur]);

  const monPseudo = envoi?.fiche.pseudo ?? '';

  return (
    <motion.section
      className="classement"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="eyebrow">{t('clst.eyebrow')}</div>
      <h1>🏆 {t('clst.h1')}</h1>
      <p style={{ color: 'var(--craie-dim)', maxWidth: '64ch', margin: '0.6rem 0 1.4rem' }}>
        {t('clst.chapo')}
      </p>

      {/* ⚠️ COMMENT BRANCHER CE CLASSEMENT SUR TOUS LES JOUEURS.
          Demande explicite : « explique comment connecter le classement à tous
          les joueurs, mets-le vierge ». Le tableau est désormais vide au départ
          (plus de légendes fictives), et voici la marche à suivre pour le rendre
          réellement mondial. Tant qu'il n'y a pas de serveur, tout reste sur
          l'appareil : localStorage ne se partage pas entre navigateurs. */}
      {/* ⚠️ LA FICHE D'ENVOI N'EST PLUS UN DÉPLIANT NI UN BOUTON.
          Demande explicite : « la fiche d'envoi, il faut que ça s'envoie
          automatiquement ». Elle partait sur un clic caché dans un pli — donc
          personne n'envoyait, donc la table restait vide. Le jeu envoie
          maintenant tout seul, à chaque fin de saison et à la retraite
          (`saisonSuivante` / `prendreRetraite`, store). Ce qu'on garde à
          l'écran : l'ÉTAT, une ligne, sous le tableau. */}

      {/* ═══ LE TABLEAU MONDIAL — TOUJOURS AFFICHÉ, AVEC SON ÉTAT ════════ */}
      <div className="carte tableau-classement mondial">
        <h2 style={{ marginTop: 0 }}>🌍 {t('clst.mondialTitre')}</h2>
        <p className="aide">{t('clst.mondialIntro')}</p>

        {mondial === null && <p className="aide">⏳ {t('clst.chargement')}</p>}

        {mondial?.etat === 'hors-ligne' && (
          <p className="aide">💻 {t('clst.horsLigne')}</p>
        )}

        {mondial?.etat === 'panne' && (
          <p className="aide">⛔ {t('clst.panne', { erreur: mondial.erreur })}</p>
        )}

        {mondial?.etat === 'ok' && mondial.lignes.length === 0 && (
          <p className="aide">🌱 {t('clst.mondialVide')}</p>
        )}

        {mondial?.etat === 'ok' && mondial.lignes.length > 0 && (
          <>
            <div className="ligne-classement entete">
              <span className="c-rang">#</span>
              <span className="c-joueur">{t('clst.joueur')}</span>
              <span className="c-score">{t('clst.score')}</span>
            </div>
            {mondial.lignes.slice(0, 100).map((l, i) => (
              <div
                key={l.pseudo}
                className={`ligne-classement ${l.pseudo === monPseudo ? 'moi' : ''}`}
              >
                <span className="c-rang">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <span className="c-joueur"><b>{l.pseudo}</b></span>
                <span className="c-score">{nombre(l.score)}</span>
              </div>
            ))}
          </>
        )}

        {/* ⚠️ PLUS DE BOUTON : L'ENVOI EST AUTOMATIQUE. Ne reste que l'état, en
            une ligne — le joueur doit savoir sous quel nom il figure et avec
            quel score, mais il n'a rien à faire. */}
        {envoi && (
          <p className="aide" style={{ marginTop: '1rem' }}>
            {envoi.verdict.valide
              ? t('clst.publie', { pseudo: monPseudo, score: nombre(envoi.verdict.score) })
              : t('clst.rejete', { erreurs: envoi.verdict.anomalies.join(' · ') })}
          </p>
        )}
      </div>

      {/* ⚠️ LE MODE D'EMPLOI DU CLASSEMENT A ÉTÉ RETIRÉ DE L'ÉCRAN.
          Demande explicite : « supprime la case dans le classement qui explique
          comment le setup ». Ce dépliant déroulait un schéma SQL, la liste des
          bornes de vérification et les recommandations serveur : de la
          documentation de DÉVELOPPEUR affichée à un JOUEUR. Elle vit maintenant
          là où elle sert — serveur/VERCEL.md et CLAUDE.md.
          Le dépliant « 🔐 Ma fiche d'envoi », lui, reste : voir en clair ce
          qu'on envoie fait partie du contrat de confiance. */}

      {liste.length === 0 ? (
        <div className="carte classement-vide">
          <p>
            🏟️ <b>{t('clst.vide')}</b>
          </p>
          <p className="aide">
            Aucune carrière n'a encore été menée à son terme sur cet appareil.
            Joue, raccroche les crampons — et ton nom s'inscrira ici le premier.
          </p>
        </div>
      ) : (
      <div className="carte tableau-classement">
        <div className="ligne-classement entete">
          <span className="c-rang">#</span>
          <span className="c-joueur">{t('clst.joueur')}</span>
          <span className="c-note">{t('clst.note')}</span>
          <span className="c-saisons">{t('clst.saisons')}</span>
          <span className="c-score">{t('clst.score')}</span>
        </div>
        {liste.map((l, i) => (
          <button
            type="button"
            key={l.id}
            className={`ligne-classement ouvrable ${l.joueur ? 'moi' : ''} ${l.enCours ? 'en-cours' : ''}`}
            onClick={() => setFicheOuverte(l)}
            title={t('clst.voirDetails')}
          >
            <span className="c-rang">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </span>
            <span className="c-joueur">
              <span className="c-emoji">
                {POSTE_PAR_ID[migrerPoste(l.poste)].categorie === 'Avant' ? '🛡️' : '⚡'}
              </span>
              <span>
                <b>{l.nom}</b>
                <small style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {nomPoste(migrerPoste(l.poste))} · <Drapeau nation={l.nation} taille={0.72} /> {nomNationTraduit(l.nation)}
                </small>
              </span>
            </span>
            <span className="c-note">{l.note}</span>
            <span className="c-saisons">{l.saisons}</span>
            <span className="c-score">{nombre(l.score ?? 0)}</span>
          </button>
        ))}
      </div>
      )}

      {ficheOuverte && (
        <section className="carte fiche-classement" aria-label={t('clst.details')}>
          <div>
            <div className="eyebrow">{t('clst.details')}</div>
            <h2 style={{ margin: '0.2rem 0' }}>{ficheOuverte.nom}</h2>
            <p className="aide" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {nomPoste(migrerPoste(ficheOuverte.poste))} · <Drapeau nation={ficheOuverte.nation} taille={0.8} /> {nomNationTraduit(ficheOuverte.nation)} · {ficheOuverte.age} {t('gen.ans')}
            </p>
          </div>
          <button type="button" className="btn fantome" onClick={() => setFicheOuverte(null)}>{t('clst.fermer')}</button>
          <div className="ressources fiche-classement-stats">
            <span className="pastille">{t('clst.note')} <b>{ficheOuverte.note}</b></span>
            <span className="pastille">{t('clst.saisons')} <b>{ficheOuverte.saisons}</b></span>
            <span className="pastille">🏉 <b>{ficheOuverte.matchsJoues}</b> {t('prof.matchs')}</span>
            <span className="pastille">🎯 <b>{ficheOuverte.essais}</b> {t('ml.essais')}</span>
            <span className="pastille">⭐ <b>{ficheOuverte.reputation}</b> {t('pj.reputation')}</span>
            <span className="pastille">{t('clst.score')} <b>{nombre(ficheOuverte.score)}</b></span>
          </div>
          {ficheOuverte.titres.length > 0 && (
            <div className="bloc-titres">
              {ficheOuverte.titres.map((titre, i) => <span className="medaille" key={`${titre}-${i}`}>🏆 {titreTraduit(titre)}</span>)}
            </div>
          )}
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginTop: '2rem' }}>
        {joueur ? (
          <button className="btn primaire" onClick={() => setEcran('carriere')}>
            {t('clst.grimper')}
          </button>
        ) : (
          <button className="btn primaire" onClick={() => setEcran('creation')}>
            {t('clst.commencer')}
          </button>
        )}
        <button className="btn fantome" onClick={() => setEcran('pantheon')}>
          {t('clst.hall')}
        </button>
      </div>
    </motion.section>
  );
}
