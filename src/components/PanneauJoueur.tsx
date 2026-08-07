import { lazy, Suspense, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { Jauge } from './Jauge';
import { useGame, noteGlobale, bonusClubDuJoueur } from '../store/useGame';
import { POSTE_PAR_ID, ATTRIBUTS_LABELS } from '../data/rugby';
import { clubParNom } from '../data/clubs';
import { competitionEffective } from '../lib/divisions';
import { Blason } from './Blason';
import { LogoCompet } from './LogoCompet';
import { Drapeau, nomNation } from './Drapeau';
import { Confirmation } from './Confirmation';
import { semaine, libelleDate, SEMAINES_PAR_SAISON } from '../data/calendrier';
import { AGE_RETRAITE_LIBRE, AGE_RETRAITE_FORCEE, RECONVERSIONS } from '../store/useGame';
import { amisPresents } from '../lib/vestiaire';
import { TRAIT_PAR_ID } from '../data/traits';
import { t, tn } from '../lib/i18n';
import { matchDeLaSemaine } from '../lib/matchLive';
import { matchInternationalDuJoueur, equipeU20 } from '../lib/international';
import { convocation, convocationU20 } from '../lib/selection';
// ⚠️ LE MATCH EN DIRECT ARRIVE AU CLIC, pas au chargement de la page. Ce
// composant tire derrière lui tout `lib/moteur/` (le terrain, la tactique, les
// phases arrêtées, les pools de commentaire) : il pesait dans le chunk
// principal alors qu'on ne l'ouvre qu'un week-end sur deux, et jamais avant
// d'avoir créé un joueur.
const MatchLive = lazy(() => import('./MatchLive').then((m) => ({ default: m.MatchLive })));
import type { Joueur } from '../types';

const EMOJI_POSTE: Record<string, string> = {
  Avant: '🛡️',
  Arrière: '⚡',
};

// Un pictogramme par type de semaine du calendrier.
const EMOJI_SEMAINE: Record<string, string> = {
  championnat: '🏉', coupe: '🌍', international: '🏳️', phaseFinale: '🔥', treve: '🛌',
};

export function PanneauJoueur({ joueur }: { joueur: Joueur }) {
  const semaineSuivante = useGame((s) => s.semaineSuivante);
  // ⚠️ ON N'AVANCE PAS EN LAISSANT UNE QUESTION EN PLAN. Depuis que le récit
  // tombe CHAQUE semaine, pouvoir enchaîner sans répondre remplissait le journal
  // de scènes orphelines — et le MJ ne posait plus rien, puisqu'une scène
  // attendait déjà. Le bouton se bloque donc tant qu'on n'a pas répondu.
  const scenarioActif = useGame((s) => s.scenarioActif);
  const evenementHebdo = useGame((s) => s.evenementHebdo);
  const aRepondre = !!scenarioActif || !!evenementHebdo;
  const motifAttente = evenementHebdo
    ? 'Réponds d’abord à la situation en cours'
    : 'Fais d’abord ton choix';
  const semaineActuelle = semaine(joueur.semaine ?? 1);
  const vecu = joueur.saisonEnCours;
  const prendreRetraite = useGame((s) => s.prendreRetraite);
  const setEcran = useGame((s) => s.setEcran);
  const approchesOuvertes = useGame(
    (s) => s.approches.filter((a) => a.etat === 'ouverte').length,
  );
  const demanderTransfert = useGame((s) => s.demanderTransfert);
  const poste = POSTE_PAR_ID[joueur.poste];
  const generale = noteGlobale(joueur);
  // ⚠️ La division EFFECTIVE, pas celle du fichier de données : sinon un club
  // qui vient de monter reste affiché dans son ancien championnat.
  const division = competitionEffective(joueur.club, joueur.division);
  const clubData = clubParNom(joueur.club);
  const contrat = joueur.contrat;
  const [confirmerRetraite, setConfirmerRetraite] = useState(false);
  const [confirmerTransfert, setConfirmerTransfert] = useState(false);
  const prendreMentorat = useGame((st) => st.prendreMentorat);
  const [reconversion, setReconversion] = useState(RECONVERSIONS[0].id);
  const finDeCarriere = joueur.age >= AGE_RETRAITE_LIBRE;
  const amis = amisPresents(joueur, joueur.saison);
  const choisirFocus = useGame((st) => st.choisirFocus);
  const dejaEntraine = joueur.entrainementSemaine === (joueur.semaine ?? 1);
  const blesse = !!joueur.blessure && joueur.blessure.semaines > 0;
  // LE MATCH DE LA SEMAINE : s'il y en a un, c'est LUI qu'on joue, et c'est lui
  // qui fait passer à la semaine suivante une fois la sirène tombée.
  const [matchOuvert, setMatchOuvert] = useState(false);
  const [matchTermine, setMatchTermine] = useState(false);
  const matchRegarde = useGame((s) => s.matchRegarde);
  // ⚠️ UNE SEMAINE INTERNATIONALE A AUSSI SON MATCH. On ne voyait ni affiche ni
  // compétition pendant le Tournoi ou la tournée d'automne : la sélection se
  // joue maintenant comme un match de club (lib/international.ts).
  // ⚠️ ET SI TU N'ES PAS (ENCORE) CHEZ LES A, IL Y A LES U20.
  // Un espoir de 19 ans n'a aucune chance d'être appelé chez les séniors, mais
  // il peut porter le maillot de son pays chez les moins de 20 ans — Tournoi
  // U20 et Championnat du monde U20 (lib/international.ts).
  const inter = useMemo(() => {
    if (semaineActuelle.type !== 'international') return null;
    if (convocation(joueur).selectionne) {
      const senior = matchInternationalDuJoueur(joueur, bonusClubDuJoueur(joueur));
      if (senior) return { affiche: senior, u20: false };
    }
    if (convocationU20(joueur).selectionne) {
      const jeune = matchInternationalDuJoueur(joueur, bonusClubDuJoueur(joueur), true);
      if (jeune) return { affiche: jeune, u20: true };
    }
    return null;
  }, [joueur, semaineActuelle.type]);

  const affiche = useMemo(
    () => (inter
      ? { journee: inter.affiche.journee, match: inter.affiche.match, cle: inter.affiche.cle }
      : matchDeLaSemaine(joueur, bonusClubDuJoueur(joueur))),
    [joueur, inter],
  );
  const monEquipe = inter ? (inter.u20 ? equipeU20(joueur.nation) : nomNation(joueur.nation)) : joueur.club;
  const adversaire = affiche
    ? (affiche.match.domicile === monEquipe ? affiche.match.exterieur : affiche.match.domicile)
    : null;
  // Déjà suivi cette semaine ? Alors on repasse sur les boutons classiques.
  const matchAJouer = !!affiche && !blesse
    && matchRegarde !== `${joueur.saison}#${joueur.semaine ?? 1}`;

  return (
    <aside className="carte panneau-joueur">
      <div className="ph">
        {/* L'écusson du club plutôt qu'une icône générique : on joue POUR un club. */}
        <div className="avatar avatar-club" title={joueur.club}>
          {clubData ? <Blason club={clubData} taille={44} /> : EMOJI_POSTE[poste.categorie]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nom">{joueur.nom}</div>
          <div className="sous" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {poste.nom} · <Drapeau nation={joueur.nation} taille={0.8} /> {nomNation(joueur.nation)}
          </div>
        </div>
        <div
          className="badge-generale"
          title={`Note générale (moyenne des attributs)${joueur.potentiel ? ` — potentiel ${joueur.potentiel}` : ''}`}
        >
          <b>{generale}</b>
          <span>GÉN</span>
          {joueur.potentiel && joueur.potentiel > generale && (
            <em className="badge-potentiel">↗ {joueur.potentiel}</em>
          )}
        </div>
      </div>

      {(joueur.traits?.length || joueur.capitaine) && (
        <div className="ressources" style={{ marginBottom: '0.2rem' }}>
          {joueur.capitaine && <span className="pastille pastille-capitaine">©️ Capitaine</span>}
          {(joueur.traits ?? []).map((id) => {
            const trait = TRAIT_PAR_ID[id];
            return trait ? (
              <span key={id} className="pastille" title={trait.desc}>{trait.emoji} {trait.nom}</span>
            ) : null;
          })}
        </div>
      )}

      <div className="ressources">
        <span className="pastille">{t('gen.saison')} <b>{joueur.saison}</b></span>
        <span className="pastille">{joueur.age} {t('gen.ans')}</span>
        <span className="pastille">💰 <b>{joueur.argent.toLocaleString('fr-FR')} €</b></span>
      </div>
      <div className="ressources" style={{ marginTop: '-0.4rem' }}>
        <span className="pastille" title="Ton club et sa division">
          {clubData ? <Blason club={clubData} taille={18} /> : '🏟️'} <b>{joueur.club}</b>
          {division && (
            <>
              {' · '}
              <LogoCompet id={division.id} emoji={division.emoji} taille={16} />
              {' '}{division.nom}
            </>
          )}
        </span>
      </div>

      {joueur.blessure && (
        <div className="bandeau-blessure" data-gravite={joueur.blessure.gravite}>
          🚑 <b>{joueur.blessure.nom}</b>
          <span>
            {joueur.blessure.gravite === 'carriere'
              ? t('pj.carriereTerminee')
              : tn('pj.indisponible', joueur.blessure.semaines)}
          </span>
        </div>
      )}

      {/* Jauges sur deux colonnes : demande explicite — tout doit tenir dans
          l'écran, sans défilement du panneau. */}
      <div className="pj-jauges">
        <Jauge label={t('pj.forme')} valeur={joueur.forme} variante="vert" />
        <Jauge label={t('pj.moral')} valeur={joueur.moral} variante="or" />
        <Jauge label={t('pj.reputation')} valeur={joueur.reputation} variante="cuir" />
        {/* Lot 6 : ce que le staff et le public pensent de toi. La confiance du
            coach pèse vraiment sur le temps de jeu, la popularité sur le marché. */}
        <Jauge label={t('pj.staff')} valeur={joueur.confianceCoach ?? 50} variante="vert" />
        <Jauge label={t('pj.popularite')} valeur={joueur.popularite ?? 50} variante="or" />
      </div>

      <div className="pj-titre eyebrow">{t('pj.attributs')}</div>
      <div className="attrs-grille pj-attrs">
        {(Object.keys(joueur.attributs) as (keyof Joueur['attributs'])[]).map((k) => (
          <Jauge key={k} label={ATTRIBUTS_LABELS[k]} valeur={joueur.attributs[k]} />
        ))}
      </div>

      <div className="ressources pj-stats">
        <span className="pastille">🏉 <b>{joueur.matchsJoues}</b></span>
        <span className="pastille">🎯 <b>{joueur.essais}</b></span>
        {joueur.noteSaison != null && (
          <span className="pastille" title="Note moyenne de la saison écoulée">
            ⭐ <b>{joueur.noteSaison.toFixed(1)}</b>/10
          </span>
        )}
        {contrat && (
          <span className="pastille" title={`Contrat : ${contrat.salaire.toLocaleString('fr-FR')} € par saison`}>
            📄 <b>{Math.round(contrat.salaire / 1000)} k€</b> ·{' '}
            {contrat.saisons > 0 ? `${contrat.saisons} s.` : 'fin'}
          </span>
        )}
        {amis.length > 0 && (
          <span className="pastille" title={`Dans le vestiaire : ${amis.map((r) => r.nom).join(', ')}`}>
            🤝 <b>{amis.length}</b>
          </span>
        )}
      </div>
      {/* ⚠️ IL N'Y A PLUS QU'UN SEUL RYTHME. Le mode « saison rapide » a été
          retiré : il résumait l'année en un tirage et le joueur y perdait ses
          statistiques, sa forme et ses sélections. `rythme` reste dans le store
          le temps que les vieilles sauvegardes migrent — il vaut toujours
          « semaine ». */}
      <>
        <>
          {/* ⚠️ L'ENTRAÎNEMENT EST PERMANENT. On ne clique plus sur un secteur
              chaque semaine : on choisit ce qu'on travaille, la séance se fait
              toute seule à chaque semaine jouée, et on peut changer quand on
              veut. */}
          <div className="entrainement">
            <div className="entr-tete">
              💪 <b>{t('pj.travailles')}</b>
              <span>
                {blesse ? t('pj.infirmerie')
                  : joueur.entrainementFocus
                    ? `${ATTRIBUTS_LABELS[joueur.entrainementFocus]} · ${dejaEntraine ? t('pj.seanceFaite') : t('pj.chaqueSemaine')}`
                    : t('pj.choisirSecteur')}
              </span>
            </div>
            <div className="entr-boutons">
              {(Object.keys(joueur.attributs) as (keyof Joueur['attributs'])[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={joueur.entrainementFocus === k ? 'actif' : undefined}
                  disabled={blesse}
                  onClick={() => choisirFocus(k)}
                  title={`Travailler ${ATTRIBUTS_LABELS[k].toLowerCase()} chaque semaine (−4 de forme par séance)`}
                >
                  {ATTRIBUTS_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          {/* Le calendrier est CLIQUABLE : il ouvre le programme complet de
              l'année, toutes les affiches, jouées comme à venir. */}
          <button
            type="button"
            className="calendrier-semaine cliquable"
            onClick={() => setEcran('tableau')}
            title="Voir tout le calendrier de la saison et les affiches de l’année"
          >
            <div className="cal-date">
              <b>{libelleDate(semaineActuelle)}</b>
              <span>{t('pj.semaine', { n: semaineActuelle.numero, total: SEMAINES_PAR_SAISON })}</span>
            </div>
            <div className="cal-libelle">
              {EMOJI_SEMAINE[semaineActuelle.type]} {semaineActuelle.libelle}
              <i className="cal-lien">🗓️ {t('pj.calendrier')}</i>
            </div>
            <div className="cal-barre">
              <span style={{ width: `${(semaineActuelle.numero / SEMAINES_PAR_SAISON) * 100}%` }} />
            </div>
            {vecu && (
              <div className="cal-bilan">
                🏉 {vecu.matchs} match{vecu.matchs > 1 ? 's' : ''} · 🎯 {vecu.essais} essai{vecu.essais > 1 ? 's' : ''}
                {vecu.notes.length > 0 &&
                  ` · ⭐ ${(vecu.notes.reduce((a, b) => a + b, 0) / vecu.notes.length).toFixed(1)}/10`}
                {vecu.capes > 0 && ` · 🏳️ ${vecu.capes} sélection${vecu.capes > 1 ? 's' : ''}`}
              </div>
            )}
          </button>
          {/* ⚠️ QUAND IL Y A MATCH, C'EST LE MATCH QUI FAIT AVANCER LA SEMAINE.
              On ne propose plus « Semaine suivante » à côté : on joue le match,
              et la semaine passe toute seule à la sirène. */}
          {matchAJouer ? (
            // ⚠️ LE MATCH EST BLOQUÉ LUI AUSSI TANT QU'UNE SCÈNE ATTEND. Il ne
            // l'était pas : « Semaine suivante » se verrouillait, mais le match
            // — qui fait passer la semaine à la sirène — restait cliquable. Il
            // suffisait donc d'avoir un match au programme pour enjamber la
            // question du MJ, et le journal se remplissait de scènes orphelines.
            <button
              type="button"
              className="btn match-semaine"
              onClick={() => setMatchOuvert(true)}
              disabled={aRepondre}
              title={aRepondre ? motifAttente : `Suivre ${affiche!.match.domicile} – ${affiche!.match.exterieur} en direct`}
            >
              ▶️ <b>{aRepondre
                ? '✍️ Réponds d’abord'
                : inter ? t(inter.u20 ? 'pj.jouerU20' : 'pj.jouerSelection') : t('pj.jouerMatch')}</b>
              <span>
                {inter ? `${inter.affiche.competition.emoji} ${inter.affiche.competition.nom}` : `J${affiche!.journee}`}
                {' · '}{affiche!.match.domicile === monEquipe ? 'reçoit' : 'à'} {adversaire}
              </span>
            </button>
          ) : (
            <div className="pj-avancer">
              <button
                className="btn vert"
                onClick={semaineSuivante}
                disabled={aRepondre}
                title={aRepondre ? motifAttente : 'Jouer la semaine suivante du calendrier'}
              >
                {semaineActuelle.type === 'treve' ? t('pj.cloreSaison') : t('pj.semaineSuivante')}
              </button>
              {/* ⚠️ « ⏩ FIN DE SAISON » A ÉTÉ SUPPRIMÉ (demande explicite : « il
                  faut pas qu'on puisse simuler la saison »). Il sautait à un
                  bilan calculé par un `Math.random()` de fin d'année — d'où les
                  « 2 matchs, 0 essai » quelle que soit la saison. Pour avancer
                  vite, on clique désormais une DATE dans le calendrier : les
                  semaines sont réellement jouées, une par une. */}
              <button
                className="btn fantome"
                onClick={() => setEcran('tableau')}
                title="Choisir une date dans le calendrier et jouer jusque-là"
              >
                🗓️ {t('pj.calendrier')}
              </button>
            </div>
          )}
        </>
      </>

      {/* Barre d'actions : tout est atteignable sans faire défiler le panneau. */}
      <div className="pj-actions">
        <button onClick={() => setEcran('effectif')} title="Voir les joueurs de ton club">
          👥<span>{t('pj.equipe')}</span>
        </button>
        {/* ⚠️ LE MARCHÉ VIT SUR L'OVALE, PLUS DANS UN PANNEAU. Ce bouton ouvre
            les messages privés quand des clubs discutent, et sert à se mettre
            sur le marché quand personne n'écrit. */}
        <button
          onClick={() => (approchesOuvertes > 0 ? setEcran('social') : setConfirmerTransfert(true))}
          title={approchesOuvertes > 0
            ? 'Des clubs t’écrivent : va négocier dans tes messages'
            : 'Se mettre sur le marché des transferts'}
        >
          ✈️<span>{t('pj.marche')}</span>
          {approchesOuvertes > 0 && <i className="badge-offres">{approchesOuvertes}</i>}
        </button>
        <button onClick={() => setEcran('tableau')} title="Classement et résultats en direct">
          📊<span>{t('pj.resultats')}</span>
        </button>
        <button onClick={() => setEcran('social')} title="L’Ovale — réseau social, succès et défis">
          𝕏<span>L’Ovale</span>
        </button>
        {/* Après 30 ans : transmettre pour durer (lot « corps, âge et fin de carrière ») */}
        {joueur.age >= 30 && !joueur.mentorat && (
          <button
            onClick={prendreMentorat}
            title="Prendre un jeune sous ton aile : ton déclin ralentit et le moral remonte"
          >
            🧑‍🏫<span>{t('pj.mentor')}</span>
          </button>
        )}
        {joueur.mentorat && (
          <button disabled title="Tu accompagnes un jeune du centre de formation">
            🧑‍🏫<span>Mentor ✓</span>
          </button>
        )}
        <button
          onClick={() => setConfirmerRetraite(true)}
          title="Terminer la carrière et rejoindre le Hall des Légendes"
        >
          🏛️<span>{t('pj.retraite')}</span>
        </button>
      </div>

      {/* Reconversion : on choisit ce qu'on deviendra AVANT de raccrocher */}
      {finDeCarriere && (
        <div className="champ pj-reconversion">
          <label htmlFor="reconversion">
            Après ta carrière {joueur.age >= AGE_RETRAITE_FORCEE && '— dernière saison !'}
          </label>
          <select
            id="reconversion"
            value={reconversion}
            onChange={(e) => setReconversion(e.target.value)}
          >
            {RECONVERSIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.emoji} {r.nom}</option>
            ))}
          </select>
        </div>
      )}

      <AnimatePresence>
        {confirmerRetraite && (
          <Confirmation
            titre="🏛️ Prendre ta retraite ?"
            message="Ta carrière sera immortalisée dans le Hall des Légendes et le classement, puis tu pourras en commencer une nouvelle. Cette décision est définitive."
            libelleOui="Je raccroche les crampons"
            libelleNon="Continuer à jouer"
            onOui={() => {
              setConfirmerRetraite(false);
              prendreRetraite(finDeCarriere ? reconversion : undefined);
            }}
            onNon={() => setConfirmerRetraite(false)}
          />
        )}
        {confirmerTransfert && (
          <Confirmation
            titre="📣 Demander ton transfert ?"
            message="Ton agent va faire le tour du marché pour trouver un club à ta hauteur. Le vestiaire n'aime pas ça : tu perdras un peu de moral et de réputation, et rien ne garantit qu'une offre arrive."
            libelleOui="Oui, contacte les clubs"
            libelleNon="Rester concentré"
            onOui={() => {
              setConfirmerTransfert(false);
              demanderTransfert();
            }}
            onNon={() => setConfirmerTransfert(false)}
          />
        )}
      </AnimatePresence>

      {matchOuvert && affiche && (
        <Suspense fallback={null}>
        <MatchLive
          match={affiche.match}
          saison={joueur.saison}
          cle={affiche.cle}
          joueur={joueur}
          selection={!!inter}
          titre={inter
            ? `${inter.affiche.competition.nom} · ${libelleDate(semaineActuelle)} · journée ${inter.affiche.journee}`
            : `${division?.nom ?? 'Championnat'} · ${libelleDate(semaineActuelle)} · journée ${affiche.journee}`}
          onTermine={() => setMatchTermine(true)}
          onFermer={() => {
            setMatchOuvert(false);
            // ⚠️ La semaine n'avance QUE si le match est allé au bout. Fermer en
            // cours de match (Échap) ne doit rien faire passer.
            if (matchTermine) { setMatchTermine(false); semaineSuivante(); }
          }}
        />
        </Suspense>
      )}

      {/* ---------------------------------------------------------------
          ⚠️ SUR TÉLÉPHONE, L'ACTION PRINCIPALE RESTE SOUS LE POUCE.
          L'écran de carrière devient un long défilement sur mobile : la
          fiche du joueur, puis le classement, puis le journal. Le bouton
          qui fait AVANCER LE JEU — jouer le match, passer la semaine —
          se retrouvait à huit écrans de défilement du fil de lecture.
          Cette barre le remet en bas de l'écran, en permanence, avec la
          semaine en cours pour se repérer. Elle n'existe qu'en dessous de
          900 px (voir `.barre-jouer` dans App.css).
          ⚠️ `createPortal(document.body)` obligatoire : le `backdrop-filter`
          des `.carte` crée un bloc conteneur qui piège les `position: fixed`.
          --------------------------------------------------------------- */}
      {!matchOuvert && createPortal(
        <div className="barre-jouer">
          <span className="barre-jouer-info">
            <b>S{joueur.saison}</b> · {libelleDate(semaineActuelle)}
            {matchAJouer && adversaire ? ` · ${adversaire}` : ` · ${semaineActuelle.libelle}`}
          </span>
          {matchAJouer ? (
            <button
              type="button"
              className="btn primaire"
              onClick={() => setMatchOuvert(true)}
              disabled={aRepondre}
              title={aRepondre ? motifAttente : undefined}
            >
              {aRepondre
                ? '✍️ À toi de répondre'
                : `▶️ ${inter ? t(inter.u20 ? 'pj.jouerU20Court' : 'pj.jouerSelectionCourt') : t('pj.jouerMatch')}`}
            </button>
          ) : (
            <button
              type="button"
              className="btn vert"
              onClick={semaineSuivante}
              disabled={aRepondre}
              title={aRepondre ? motifAttente : undefined}
            >
              {aRepondre ? '✍️ À toi de répondre' : semaineActuelle.type === 'treve' ? t('pj.cloreSaison') : t('pj.semaineSuivante')}
            </button>
          )}
        </div>,
        document.body,
      )}
    </aside>
  );
}
