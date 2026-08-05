import { motion } from 'framer-motion';
import { useGame, classementComplet } from '../store/useGame';
import { POSTE_PAR_ID, migrerPoste } from '../data/rugby';
import { Drapeau, nomNation } from '../components/Drapeau';

export function Classement() {
  const pantheon = useGame((s) => s.pantheon);
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);

  const liste = classementComplet(pantheon, joueur);

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
      <details className="carte tuto-classement">
        <summary>🌍 Comment rendre ce classement mondial (partagé par tous les joueurs)</summary>
        <p className="aide">
          Aujourd'hui, tout est stocké dans <code>localStorage</code>, c'est-à-dire
          dans <b>ton navigateur</b>. Aucun joueur ne peut voir la carrière d'un autre :
          il n'y a pas de serveur. Pour un vrai classement en ligne, il faut trois
          choses, dans cet ordre.
        </p>
        <ol className="tuto-etapes">
          <li>
            <b>Une base hébergée.</b> Le plus simple est <b>Supabase</b> (gratuit
            jusqu'à 500 Mo, PostgreSQL) ou Firebase. Créer une table
            <code>carrieres</code> : <code>id</code>, <code>pseudo</code>,{' '}
            <code>nom</code>, <code>poste</code>, <code>nation</code>,{' '}
            <code>note</code>, <code>saisons</code>, <code>titres</code>,{' '}
            <code>score</code>, <code>cree_le</code>.
          </li>
          <li>
            <b>Un envoi à la retraite.</b> Dans <code>prendreRetraite()</code>{' '}
            (<code>src/store/useGame.ts</code>), après avoir ajouté la légende au
            panthéon, poster la même ligne à la base. Une seule requête, une fois
            par carrière : ça ne coûte presque rien.
          </li>
          <li>
            <b>Une lecture au chargement de cet écran.</b> Remplacer{' '}
            <code>classementComplet()</code> par une lecture des 100 meilleurs
            scores de la table, triés par <code>score</code>, et y fusionner la
            carrière locale en cours.
          </li>
        </ol>
        <p className="aide">
          ⚠️ <b>Deux garde-fous indispensables.</b> Le score est calculé côté
          navigateur : n'importe qui peut envoyer <code>score: 999999</code>. Il faut
          donc (a) recalculer le score sur le serveur à partir des champs bruts, et
          (b) limiter les envois par appareil (quelques carrières par jour). Sans ça,
          le tableau sera faux en une semaine. Prévoir aussi un pseudo choisi par le
          joueur, plutôt que le nom du personnage.
        </p>
        <p className="aide">
          💡 Le même serveur servirait ensuite à héberger la clé Groq côté back
          (aujourd'hui exposée dans le navigateur) avec un quota par joueur.
        </p>
      </details>

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
