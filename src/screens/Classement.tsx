import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame, classementComplet } from '../store/useGame';
import { POSTE_PAR_ID, migrerPoste } from '../data/rugby';
import { Drapeau, nomNation } from '../components/Drapeau';
import { TROPHEES } from '../data/trophees';
import {
  ficheDepuisJoueur, verifierFiche, SCORE_MAX, SAISONS_MAX, LIMITES,
  RECOMMANDATIONS_SERVEUR_LISTE,
} from '../lib/classementMondial';
import {
  envoyerAuClassement, lireClassementMondial, type LigneMondiale, type ResultatEnvoi,
} from '../lib/classementEnLigne';

export function Classement() {
  const pantheon = useGame((s) => s.pantheon);
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);

  const liste = classementComplet(pantheon, joueur);

  // ⚠️ LE TABLEAU MONDIAL EST UN BONUS, JAMAIS UNE DÉPENDANCE. Sans serveur
  // déployé, `lireClassementMondial()` renvoie une liste vide sans lever
  // d'erreur, et l'écran garde son classement local. Voir `serveur/VERCEL.md`.
  const [mondial, setMondial] = useState<LigneMondiale[] | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [verdictServeur, setVerdictServeur] = useState<ResultatEnvoi | null>(null);

  useEffect(() => {
    let vivant = true;
    lireClassementMondial().then((l) => { if (vivant) setMondial(l); });
    return () => { vivant = false; };
  }, []);

  // ⚠️ LA FICHE QUI PARTIRAIT AU SERVEUR, ET SON VERDICT. On la montre en clair :
  // c'est exactement ce que le jeu enverrait, et exactement ce que le serveur
  // vérifierait. Rien de caché, donc rien à « découvrir » pour un tricheur — la
  // protection ne repose pas sur le secret du format, elle repose sur le fait
  // que le serveur RECALCULE.
  const envoi = useMemo(() => {
    if (!joueur) return null;
    const fiche = ficheDepuisJoueur(joueur);
    return { fiche, verdict: verifierFiche(fiche, Object.keys(TROPHEES)) };
  }, [joueur]);

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
      {/* ═══ CE QUI PARTIRAIT AU SERVEUR, ET CE QU'IL EN FERAIT ═══════════ */}
      {envoi && (
        <details className="carte tuto-classement">
          <summary>
            🔐 Ma fiche d'envoi — {envoi.verdict.valide
              ? `valide, score recalculé ${envoi.verdict.score.toLocaleString('fr-FR')}`
              : `refusée (${envoi.verdict.anomalies.length} anomalie(s))`}
          </summary>
          <p className="aide">
            Voici, en clair, <b>exactement</b> ce que le jeu enverrait pour ta carrière
            en cours — et le verdict que le serveur rendrait. Le score n'est pas
            « envoyé » : il est <b>recalculé</b> à partir de ces faits, puis comparé.
          </p>
          <pre className="fiche-envoi">{JSON.stringify(envoi.fiche, null, 2)}</pre>
          {envoi.verdict.anomalies.length > 0 && (
            <ul className="tuto-etapes">
              {envoi.verdict.anomalies.map((a) => <li key={a}>⛔ {a}</li>)}
            </ul>
          )}

          {/* L'envoi réel. Le bouton reste là même sans serveur : la réponse
              explique alors qu'aucun classement en ligne n'est branché — plutôt
              qu'un bouton absent, qui ne dit rien du tout. */}
          <button
            className="btn primaire"
            disabled={envoiEnCours || !envoi.verdict.valide}
            onClick={async () => {
              setEnvoiEnCours(true);
              setVerdictServeur(null);
              const r = await envoyerAuClassement(envoi.fiche);
              setVerdictServeur(r);
              setEnvoiEnCours(false);
              if (r.ok) setMondial(await lireClassementMondial());
            }}
          >
            {envoiEnCours ? 'Envoi…' : '🌍 Envoyer ma carrière au classement mondial'}
          </button>
          {verdictServeur && (
            <p className="aide" style={{ marginTop: '0.6rem' }}>
              {verdictServeur.ok
                ? `✅ Enregistré. Score retenu par le serveur : ${verdictServeur.score?.toLocaleString('fr-FR')}.`
                : `⛔ ${verdictServeur.erreur}`}
              {verdictServeur.anomalies?.length ? ` (${verdictServeur.anomalies.join(' · ')})` : ''}
            </p>
          )}
        </details>
      )}

      {/* ═══ LE TABLEAU MONDIAL, s'il y a un serveur ═════════════════════ */}
      {mondial && mondial.length > 0 && (
        <div className="carte tuto-classement">
          <h2 style={{ marginTop: 0 }}>🌍 Classement mondial</h2>
          <p className="aide">
            Les scores ci-dessous ont été <b>recalculés par le serveur</b> à partir des
            faits de chaque carrière. Aucun n'a été cru sur parole.
          </p>
          <ol className="tuto-etapes">
            {mondial.slice(0, 20).map((l, i) => (
              <li key={l.pseudo}>
                <b>#{i + 1}</b> {l.pseudo} — {l.score.toLocaleString('fr-FR')} pts
              </li>
            ))}
          </ol>
        </div>
      )}

      <details className="carte tuto-classement">
        <summary>🌍 Rendre ce classement mondial — et impossible à truquer</summary>

        <p className="aide">
          Aujourd'hui tout vit dans <code>localStorage</code>, donc dans{' '}
          <b>ton navigateur</b> : personne ne voit la carrière de personne. Voici le
          plan complet, conçu autour d'une seule idée.
        </p>

        <p className="aide">
          ⚠️ <b>La vérité d'abord.</b> Le jeu tourne entièrement dans le navigateur.
          Un joueur peut éditer son <code>localStorage</code>, modifier le bundle, ou
          appeler l'API à la main. <b>Aucun code livré au navigateur ne peut garantir
          un score</b>, et un secret embarqué dans le bundle se lit en vingt secondes.
          La seule protection réelle : <b>le serveur ne fait jamais confiance au score
          envoyé — il le recalcule.</b>
        </p>

        <ol className="tuto-etapes">
          <li>
            <b>Le navigateur envoie les FAITS, pas le score.</b>{' '}
            <code>ficheDepuisJoueur()</code> (<code>src/lib/classementMondial.ts</code>)
            construit la fiche ci-dessus : saisons, note, réputation, matchs, essais,
            sélections, ids de trophées. Le champ <code>score</code> est là pour être{' '}
            <i>comparé</i>, pas pour être cru.
          </li>
          <li>
            <b>Le serveur vérifie et recalcule.</b> Une Edge Function importe le{' '}
            <i>même fichier</i> et appelle <code>verifierFiche()</code> puis{' '}
            <code>scoreDeLaFiche()</code>. Le module n'a aucune dépendance : il se copie
            tel quel. Un seul barème, donc jamais deux vérités.
          </li>
          <li>
            <b>La base ne garde que le score.</b> La fiche est jetée aussitôt vérifiée.
            <pre className="fiche-envoi">{`create table classement (
  pseudo   text primary key,
  score    integer not null check (score >= 0 and score <= ${SCORE_MAX}),
  cree_le  timestamptz not null default now()
);
-- Personne n'écrit depuis le navigateur : seule l'Edge Function a la clé.
alter table classement enable row level security;
create policy lecture on classement for select using (true);`}</pre>
          </li>
          <li>
            <b>Lire les 100 meilleurs</b> à l'ouverture de cet écran, et y fusionner la
            carrière locale en cours (<code>classementComplet()</code> fait déjà la
            fusion).
          </li>
        </ol>

        <p className="aide">
          🔒 <b>Ce que la vérification refuse déjà</b> — et c'est elle qui fait tout le
          travail, bien plus que le plafond global. Chaque chiffre est borné par les{' '}
          <i>autres</i> :
        </p>
        <ul className="tuto-etapes">
          <li>une saison de jeu = un an de vie : <code>âge = âgeDébut + saisons − 1</code>, donc au plus <b>{SAISONS_MAX} saisons</b> (15 → {LIMITES.ageMax} ans) ;</li>
          <li>au plus <b>{LIMITES.matchsParSaison} matchs</b> par saison, <b>{LIMITES.essaisParMatch} essais</b> par match, <b>{LIMITES.titresParSaison} titres</b> et <b>{LIMITES.capesParSaison} capes</b> par saison ;</li>
          <li>la note doit rester atteignable en ce nombre de saisons (<code>40 + 6 × saisons</code>) ;</li>
          <li>chaque trophée annoncé doit <b>exister</b> dans le jeu ;</li>
          <li>et le score annoncé doit être <b>exactement</b> celui qu'on recalcule.</li>
        </ul>
        <p className="aide">
          Résultat : on ne peut plus « mettre un gros nombre ». Il faut fabriquer une
          carrière entière qui tient debout — et à ce moment-là, autant la jouer. Le
          plafond absolu, lui, est de <b>{SCORE_MAX.toLocaleString('fr-FR')}</b> points.
        </p>

        <p className="aide">🧯 <b>Ce que le serveur doit ajouter</b> (une fonction pure ne peut pas le voir) :</p>
        <ul className="tuto-etapes">
          {RECOMMANDATIONS_SERVEUR_LISTE.map((r) => <li key={r}>{r}</li>)}
        </ul>

        <p className="aide">
          💡 Le même serveur hébergerait ensuite la clé Groq côté back (aujourd'hui
          exposée dans le navigateur) avec un quota par joueur.
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
