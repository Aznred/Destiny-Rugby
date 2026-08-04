import { lazy, Suspense, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { Jauge } from './Jauge';
import { useGame, noteGlobale, bonusClubDuJoueur } from '../store/useGame';
import { POSTE_PAR_ID, ATTRIBUTS_LABELS } from '../data/rugby';
import { competitionDuClub, clubParNom } from '../data/clubs';
import { Blason } from './Blason';
import { LogoCompet } from './LogoCompet';
import { Drapeau, nomNation } from './Drapeau';
import { Confirmation } from './Confirmation';
import { semaine, libelleDate, SEMAINES_PAR_SAISON } from '../data/calendrier';
import { AGE_RETRAITE_LIBRE, AGE_RETRAITE_FORCEE, RECONVERSIONS } from '../store/useGame';
import { amisPresents } from '../lib/vestiaire';
import { TRAIT_PAR_ID } from '../data/traits';
import { matchDeLaSemaine } from '../lib/matchLive';
import { matchInternationalDuJoueur } from '../lib/international';
import { convocation } from '../lib/selection';
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
  const saisonSuivante = useGame((s) => s.saisonSuivante);
  const semaineSuivante = useGame((s) => s.semaineSuivante);
  const rythme = useGame((s) => s.rythme);
  const semaineActuelle = semaine(joueur.semaine ?? 1);
  const vecu = joueur.saisonEnCours;
  const prendreRetraite = useGame((s) => s.prendreRetraite);
  const setEcran = useGame((s) => s.setEcran);
  const ouvrirOffres = useGame((s) => s.ouvrirOffres);
  const demanderTransfert = useGame((s) => s.demanderTransfert);
  const offres = useGame((s) => s.offres);
  const poste = POSTE_PAR_ID[joueur.poste];
  const generale = noteGlobale(joueur);
  const division = competitionDuClub(joueur.club);
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
  const inter = useMemo(() => {
    if (rythme !== 'semaine' || semaineActuelle.type !== 'international') return null;
    if (!convocation(joueur).selectionne) return null;
    return matchInternationalDuJoueur(joueur, bonusClubDuJoueur(joueur));
  }, [joueur, rythme, semaineActuelle.type]);

  const affiche = useMemo(
    () => (rythme === 'semaine' && !inter
      ? matchDeLaSemaine(joueur, bonusClubDuJoueur(joueur))
      : inter
        ? { journee: inter.journee, match: inter.match, cle: inter.cle }
        : null),
    [joueur, rythme, inter],
  );
  const monEquipe = inter ? nomNation(joueur.nation) : joueur.club;
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
            const t = TRAIT_PAR_ID[id];
            return t ? (
              <span key={id} className="pastille" title={t.desc}>{t.emoji} {t.nom}</span>
            ) : null;
          })}
        </div>
      )}

      <div className="ressources">
        <span className="pastille">Saison <b>{joueur.saison}</b></span>
        <span className="pastille">{joueur.age} ans</span>
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
              ? 'Carrière terminée'
              : `Indisponible ${joueur.blessure.semaines} semaine${joueur.blessure.semaines > 1 ? 's' : ''}`}
          </span>
        </div>
      )}

      {/* Jauges sur deux colonnes : demande explicite — tout doit tenir dans
          l'écran, sans défilement du panneau. */}
      <div className="pj-jauges">
        <Jauge label="Forme" valeur={joueur.forme} variante="vert" />
        <Jauge label="Moral" valeur={joueur.moral} variante="or" />
        <Jauge label="Réputation" valeur={joueur.reputation} variante="cuir" />
        {/* Lot 6 : ce que le staff et le public pensent de toi. La confiance du
            coach pèse vraiment sur le temps de jeu, la popularité sur le marché. */}
        <Jauge label="Staff" valeur={joueur.confianceCoach ?? 50} variante="vert" />
        <Jauge label="Popularité" valeur={joueur.popularite ?? 50} variante="or" />
      </div>

      <div className="pj-titre eyebrow">Attributs</div>
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
      {rythme === 'semaine' ? (
        <>
          {/* ⚠️ L'ENTRAÎNEMENT EST PERMANENT. On ne clique plus sur un secteur
              chaque semaine : on choisit ce qu'on travaille, la séance se fait
              toute seule à chaque semaine jouée, et on peut changer quand on
              veut. */}
          <div className="entrainement">
            <div className="entr-tete">
              💪 <b>Ce que tu travailles</b>
              <span>
                {blesse ? 'à l’infirmerie'
                  : joueur.entrainementFocus
                    ? `${ATTRIBUTS_LABELS[joueur.entrainementFocus]}${dejaEntraine ? ' · séance faite' : ' · chaque semaine'}`
                    : 'choisis un secteur'}
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
              <span>Semaine {semaineActuelle.numero} / {SEMAINES_PAR_SAISON}</span>
            </div>
            <div className="cal-libelle">
              {EMOJI_SEMAINE[semaineActuelle.type]} {semaineActuelle.libelle}
              <i className="cal-lien">🗓️ tout le calendrier →</i>
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
            <button
              type="button"
              className="btn match-semaine"
              onClick={() => setMatchOuvert(true)}
              title={`Suivre ${affiche!.match.domicile} – ${affiche!.match.exterieur} en direct`}
            >
              ▶️ <b>{inter ? 'Jouer avec ta sélection' : 'Jouer le match'}</b>
              <span>
                {inter ? `${inter.competition.emoji} ${inter.competition.nom}` : `J${affiche!.journee}`}
                {' · '}{affiche!.match.domicile === monEquipe ? 'reçoit' : 'à'} {adversaire}
              </span>
            </button>
          ) : (
            <div className="pj-avancer">
              <button
                className="btn vert"
                onClick={semaineSuivante}
                title="Jouer la semaine suivante du calendrier"
              >
                {semaineActuelle.type === 'treve' ? 'Clore la saison →' : 'Semaine suivante →'}
              </button>
              <button
                className="btn fantome"
                onClick={saisonSuivante}
                title="Passer directement au bilan de la saison"
              >
                ⏩ Fin de saison
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="pj-avancer">
          <button className="btn vert" onClick={saisonSuivante} title="Clore la saison et récupérer">
            Saison suivante →
          </button>
        </div>
      )}

      {/* Barre d'actions : tout est atteignable sans faire défiler le panneau. */}
      <div className="pj-actions">
        <button onClick={() => setEcran('effectif')} title="Voir les joueurs de ton club">
          👥<span>Équipe</span>
        </button>
        <button
          onClick={() => (offres.length ? ouvrirOffres() : setConfirmerTransfert(true))}
          title="Offres de contrat et marché des transferts"
        >
          ✈️<span>Marché</span>
          {offres.length > 0 && <i className="badge-offres">{offres.length}</i>}
        </button>
        <button onClick={() => setEcran('tableau')} title="Classement et résultats en direct">
          📊<span>Résultats</span>
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
            🧑‍🏫<span>Mentor</span>
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
          🏛️<span>Retraite</span>
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
            ? `${inter.competition.nom} · ${libelleDate(semaineActuelle)} · journée ${inter.journee}`
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
            <button type="button" className="btn primaire" onClick={() => setMatchOuvert(true)}>
              ▶️ {inter ? 'Jouer en sélection' : 'Jouer le match'}
            </button>
          ) : (
            <button type="button" className="btn vert" onClick={semaineSuivante}>
              {semaineActuelle.type === 'treve' ? 'Clore la saison →' : 'Semaine suivante →'}
            </button>
          )}
        </div>,
        document.body,
      )}
    </aside>
  );
}
