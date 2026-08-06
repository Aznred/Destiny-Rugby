import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame, classementComplet } from '../store/useGame';
import { POSTE_PAR_ID, migrerPoste } from '../data/rugby';
import { Drapeau, nomNation } from '../components/Drapeau';
import { TROPHEES } from '../data/trophees';
import { ficheDepuisJoueur, verifierFiche } from '../lib/classementMondial';
import {
  lireClassementMondial, URL_CLASSEMENT, type EtatMondial,
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
      <div className="eyebrow">Classement mondial</div>
      <h1>🏆 Les plus grandes carrières</h1>
      <p style={{ color: 'var(--craie-dim)', maxWidth: '64ch', margin: '0.6rem 0 1.4rem' }}>
        Chaque carrière est notée par un score global (niveau, réputation, longévité,
        titres, essais). Le tableau <b>part vierge</b> : il ne contient que ce qui a
        vraiment été joué. Mène une carrière à son terme et elle y entrera.
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
        <h2 style={{ marginTop: 0 }}>🌍 Classement mondial</h2>
        <p className="aide">
          Les carrières de <b>tous les joueurs</b>, tous appareils confondus. Chaque
          score a été <b>recalculé par le serveur</b> à partir des faits de la
          carrière : aucun n'a été cru sur parole. Une carrière y entre quand elle
          est menée à son terme — ou dès maintenant, avec le bouton ci-dessous.
        </p>

        {mondial === null && <p className="aide">⏳ Lecture du classement mondial…</p>}

        {mondial?.etat === 'hors-ligne' && (
          <p className="aide">
            💻 <b>Pas de classement en ligne sur cette installation.</b> En
            développement (<code>npm run dev</code>), Vite ne sait pas exécuter la
            fonction serveur. Joue sur le site déployé, ou lance{' '}
            <code>vercel dev</code>, ou pointe une API existante :{' '}
            <code>VITE_CLASSEMENT_URL=https://ton-site/api/classement npm run dev</code>.
          </p>
        )}

        {mondial?.etat === 'panne' && (
          <p className="aide">
            ⛔ <b>Le serveur du classement ne répond pas</b> ({mondial.erreur}).
            Vérifie <code>{URL_CLASSEMENT}</code> et les journaux Vercel — le
            classement local, lui, continue de fonctionner juste en dessous.
          </p>
        )}

        {mondial?.etat === 'ok' && mondial.lignes.length === 0 && (
          <p className="aide">
            🌱 <b>Personne n'y figure encore.</b> Le serveur répond bien, la table
            est simplement vide : sois le premier à y entrer.
          </p>
        )}

        {mondial?.etat === 'ok' && mondial.lignes.length > 0 && (
          <>
            <div className="ligne-classement entete">
              <span className="c-rang">#</span>
              <span className="c-joueur">Joueur</span>
              <span className="c-score">Score</span>
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
                <span className="c-score">{l.score.toLocaleString('fr-FR')}</span>
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
              ? `🌍 Ta carrière part toute seule au classement, à chaque fin de saison et `
                + `à la retraite. Tu y figures sous « ${monPseudo} » avec `
                + `${envoi.verdict.score.toLocaleString('fr-FR')} points — le serveur ne garde `
                + `que ton meilleur total.`
              : `⛔ Ta carrière ne peut pas être envoyée : ${envoi.verdict.anomalies.join(' · ')}.`}
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
            🏟️ <b>Le classement est encore vide.</b>
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
          <span className="c-joueur">Joueur</span>
          <span className="c-note">Note</span>
          <span className="c-saisons">Saisons</span>
          <span className="c-score">Score</span>
        </div>
        {liste.map((l, i) => (
          <div
            key={l.id}
            className={`ligne-classement ${l.joueur ? 'moi' : ''} ${l.enCours ? 'en-cours' : ''}`}
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
                  {POSTE_PAR_ID[migrerPoste(l.poste)].nom} · <Drapeau nation={l.nation} taille={0.72} /> {nomNation(l.nation)}
                </small>
              </span>
            </span>
            <span className="c-note">{l.note}</span>
            <span className="c-saisons">{l.saisons}</span>
            <span className="c-score">{(l.score ?? 0).toLocaleString('fr-FR')}</span>
          </div>
        ))}
      </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginTop: '2rem' }}>
        {joueur ? (
          <button className="btn primaire" onClick={() => setEcran('carriere')}>
            Faire grimper ma carrière →
          </button>
        ) : (
          <button className="btn primaire" onClick={() => setEcran('creation')}>
            Commencer une carrière →
          </button>
        )}
        <button className="btn fantome" onClick={() => setEcran('pantheon')}>
          Hall des Légendes
        </button>
      </div>
    </motion.section>
  );
}
