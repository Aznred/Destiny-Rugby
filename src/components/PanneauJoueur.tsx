import { lazy, Suspense, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { Jauge } from './Jauge';
import { useGame, noteGlobale, bonusClubDuJoueur } from '../store/useGame';
import { POSTE_PAR_ID, labelAttribut, nomPoste } from '../data/rugby';
import { clubParNom } from '../data/clubs';
import { competitionEffective } from '../lib/divisions';
import { Blason } from './Blason';
import { LogoCompet } from './LogoCompet';
import { Drapeau } from './Drapeau';
import { nomNation, nomNationTraduit } from '../lib/nations';
import { Confirmation } from './Confirmation';
import { semaine, libelleDate, libelleSemaine, SEMAINES_PAR_SAISON, CALENDRIER } from '../data/calendrier';
import { AGE_RETRAITE_LIBRE, AGE_RETRAITE_FORCEE, RECONVERSIONS } from '../store/useGame';
import { amisPresents } from '../lib/vestiaire';
import { TRAIT_PAR_ID, descriptionTrait, nomTrait } from '../data/traits';
import { nombre, t, tn } from '../lib/i18n';
import { matchDeLaSemaine } from '../lib/matchLive';
import { matchInternationalDuJoueur, equipeU20 } from '../lib/international';
import { coupeEnDirect, coupesDuClub } from '../lib/coupe';
import { matchPhaseFinaleDuJoueur } from '../lib/phaseFinale';
import { convocation, convocationU20 } from '../lib/selection';
import { nomBlessure } from '../lib/blessures';
import { EQUIPEMENT_PAR_ID } from '../data/boutique';
// ⚠️ LE MATCH EN DIRECT ARRIVE AU CLIC, pas au chargement de la page. Ce
// composant tire derrière lui tout `lib/moteur/` (le terrain, la tactique, les
// phases arrêtées, les pools de commentaire) : il pesait dans le chunk
// principal alors qu'on ne l'ouvre qu'un week-end sur deux, et jamais avant
// d'avoir créé un joueur.
// ⚠️ LE MATCH SE JOUE DANS LE FIL, PLUS SUR LE TERRAIN 2D.
// Demande explicite : « refais la mécanique de match totalement, que ce soit
// super facile et fun à prendre en main sur n'importe quel appareil ». Le
// terrain, la caméra et le joystick demandaient d'apprendre à jouer avant de
// pouvoir jouer ; le fil demande de lire et de choisir. Voir MatchDirect.tsx.
//
// ⚠️ LE MOTEUR EST LE MÊME (lib/moteur/) : score de la ligue, statistiques,
// discipline et note passent exactement par les mêmes fonctions.
const MatchDirect = lazy(() => import('./MatchDirect').then((m) => ({ default: m.MatchDirect })));
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
    ? t('pj.attenteSituation')
    : t('pj.attenteChoix');
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
  // La tenue portée (boutique → vestiaire). Cosmétique pur.
  const equipementActif = useGame((s) => s.equipementActif);
  const tenue = useMemo(
    () => Object.values(equipementActif)
      .map((id) => (id ? EQUIPEMENT_PAR_ID[id] : undefined))
      .filter((e): e is NonNullable<typeof e> => !!e),
    [equipementActif],
  );
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

  const coupe = useMemo(() => {
    if (semaineActuelle.type !== 'coupe') return null;
    const id = coupesDuClub(joueur.club, joueur.saison)[0];
    if (!id) return null;
    const date = CALENDRIER.slice(0, joueur.semaine ?? 1).filter((s) => s.type === 'coupe').length;
    const etat = coupeEnDirect(id, joueur.saison, joueur.club, date);
    if (!etat) return null;
    const poule = etat.poules.find((p) => p.clubs.includes(joueur.club));
    const matchPoule = date <= etat.totalJournees
      ? poule?.journees[date - 1]?.find((m) => m.domicile === joueur.club || m.exterieur === joueur.club)
      : undefined;
    const matchFinal = etat.bracket.find((m) => m.domicile === joueur.club || m.exterieur === joueur.club);
    const match = matchPoule ?? (matchFinal
      ? { ...matchFinal, essaisD: Math.floor(matchFinal.scoreD / 7), essaisE: Math.floor(matchFinal.scoreE / 7) }
      : undefined);
    return match ? { id, nom: etat.nom, journee: date, match } : null;
  }, [joueur, semaineActuelle.type]);

  const phase = useMemo(() => (
    semaineActuelle.type === 'phaseFinale'
      ? matchPhaseFinaleDuJoueur(joueur, bonusClubDuJoueur(joueur))
      : null
  ), [joueur, semaineActuelle.type]);

  const affiche = useMemo(
    () => (inter
      ? { journee: inter.affiche.journee, match: inter.affiche.match, cle: inter.affiche.cle }
      : coupe
        ? { journee: coupe.journee, match: coupe.match, cle: `${coupe.id}#${joueur.saison}#${joueur.semaine}` }
        : phase
          ? {
              journee: 0,
              match: { ...phase, essaisD: Math.floor(phase.scoreD / 7), essaisE: Math.floor(phase.scoreE / 7) },
              cle: `phase#${joueur.division}#${joueur.saison}#${joueur.semaine}`,
            }
          : matchDeLaSemaine(joueur, bonusClubDuJoueur(joueur))),
    [joueur, inter, coupe, phase],
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
            {nomPoste(joueur.poste)} · <Drapeau nation={joueur.nation} taille={0.8} /> {nomNationTraduit(joueur.nation)}
          </div>
        </div>
        <div
          className="badge-generale"
          title={`${t('pj.generale')}${joueur.potentiel ? ` - ${t('pj.potentiel', { note: joueur.potentiel })}` : ''}`}
        >
          <b>{generale}</b>
          <span aria-hidden="true">OVR</span>
          {joueur.potentiel && joueur.potentiel > generale && (
            <em className="badge-potentiel">↗ {joueur.potentiel}</em>
          )}
        </div>
      </div>

      {(joueur.traits?.length || joueur.capitaine || tenue.length > 0) && (
        <div className="ressources" style={{ marginBottom: '0.2rem' }}>
          {joueur.capitaine && <span className="pastille pastille-capitaine">©️ {t('pj.capitaine')}</span>}
          {(joueur.traits ?? []).map((id) => {
            const trait = TRAIT_PAR_ID[id];
            return trait ? (
              <span key={id} className="pastille" title={descriptionTrait(id)}>{trait.emoji} {nomTrait(id)}</span>
            ) : null;
          })}
          {/* La tenue achetée au vestiaire. Purement décoratif — c'est tout
              l'intérêt : elle se VOIT, et elle ne change rien au terrain. */}
          {tenue.map((e) => (
            <span key={e.id} className="pastille pastille-tenue" title={e.detail}>{e.emoji} {e.nom}</span>
          ))}
        </div>
      )}

      <div className="ressources">
        <span className="pastille">{t('gen.saison')} <b>{joueur.saison}</b></span>
        <span className="pastille">{joueur.age} {t('gen.ans')}</span>
        <span className="pastille">💰 <b>{nombre(joueur.argent)} €</b></span>
      </div>
      <div className="ressources" style={{ marginTop: '-0.4rem' }}>
        <span className="pastille" title={t('pj.clubDivision')}>
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
          🚑 <b>{nomBlessure(joueur.blessure)}</b>
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
          <Jauge key={k} label={labelAttribut(k)} valeur={joueur.attributs[k]} />
        ))}
      </div>

      <div className="ressources pj-stats">
        <span className="pastille">🏉 <b>{joueur.matchsJoues}</b></span>
        <span className="pastille">🎯 <b>{joueur.essais}</b></span>
        {joueur.noteSaison != null && (
          <span className="pastille" title={t('pj.noteSaison')}>
            ⭐ <b>{joueur.noteSaison.toFixed(1)}</b>/10
          </span>
        )}
        {contrat && (
          <span className="pastille" title={t('pj.contratAide', { salaire: nombre(contrat.salaire) })}>
            📄 <b>{Math.round(contrat.salaire / 1000)} k€</b> ·{' '}
            {contrat.saisons > 0 ? `${contrat.saisons} s.` : t('pj.contrat')}
          </span>
        )}
        {amis.length > 0 && (
          <span className="pastille" title={t('pj.vestiaire', { joueurs: amis.map((r) => r.nom).join(', ') })}>
            🤝 <b>{amis.length}</b>
          </span>
        )}
      </div>
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
                    ? `${labelAttribut(joueur.entrainementFocus)} · ${dejaEntraine ? t('pj.seanceFaite') : t('pj.chaqueSemaine')}`
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
                  title={t('pj.entrainementAide', { attribut: labelAttribut(k) })}
                >
                  {labelAttribut(k)}
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
            title={t('pj.calendrierAide')}
          >
            <div className="cal-date">
              <b>{libelleDate(semaineActuelle)}</b>
              <span>{t('pj.semaine', { n: semaineActuelle.numero, total: SEMAINES_PAR_SAISON })}</span>
            </div>
            <div className="cal-libelle">
              {EMOJI_SEMAINE[semaineActuelle.type]} {libelleSemaine(semaineActuelle)}
              <i className="cal-lien">🗓️ {t('pj.calendrier')}</i>
            </div>
            <div className="cal-barre">
              <span style={{ width: `${(semaineActuelle.numero / SEMAINES_PAR_SAISON) * 100}%` }} />
            </div>
            {vecu && (
              <div className="cal-bilan">
                🏉 {tn('pj.bilanMatch', vecu.matchs)} · 🎯 {tn('pj.bilanEssai', vecu.essais)}
                {vecu.notes.length > 0 &&
                  ` · ⭐ ${(vecu.notes.reduce((a, b) => a + b, 0) / vecu.notes.length).toFixed(1)}/10`}
                {vecu.capes > 0 && ` · 🏳️ ${tn('pj.bilanSelection', vecu.capes)}`}
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
              title={aRepondre ? motifAttente : t('pj.suivreDirect', { domicile: affiche!.match.domicile, exterieur: affiche!.match.exterieur })}
            >
              ▶️ <b>{aRepondre
                ? `✍️ ${t('pj.reponds')}`
                : inter ? t(inter.u20 ? 'pj.jouerU20' : 'pj.jouerSelection') : t('pj.jouerMatch')}</b>
              <span>
                {inter ? `${inter.affiche.competition.emoji} ${inter.affiche.competition.nom}` : `J${affiche!.journee}`}
                {' · '}{affiche!.match.domicile === monEquipe ? t('pj.recoit') : t('pj.chez')} {adversaire}
              </span>
            </button>
          ) : (
            <div className="pj-avancer">
              <button
                className="btn vert"
                onClick={semaineSuivante}
                disabled={aRepondre}
                title={aRepondre ? motifAttente : t('pj.jouerSemaineAide')}
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
                title={t('pj.choisirDateAide')}
              >
                🗓️ {t('pj.calendrier')}
              </button>
            </div>
          )}
      {/* Barre d'actions : tout est atteignable sans faire défiler le panneau. */}
      <div className="pj-actions">
        <button onClick={() => setEcran('effectif')} title={t('pj.voirJoueursAide')}>
          👥<span>{t('pj.equipe')}</span>
        </button>
        {/* ⚠️ LE MARCHÉ VIT SUR L'OVALE, PLUS DANS UN PANNEAU. Ce bouton ouvre
            les messages privés quand des clubs discutent, et sert à se mettre
            sur le marché quand personne n'écrit. */}
        <button
          onClick={() => (approchesOuvertes > 0 ? setEcran('social') : setConfirmerTransfert(true))}
          title={approchesOuvertes > 0
            ? t('pj.messagesClubsAide')
            : t('pj.marcheAide')}
        >
          ✈️<span>{t('pj.marche')}</span>
          {approchesOuvertes > 0 && <i className="badge-offres">{approchesOuvertes}</i>}
        </button>
        <button onClick={() => setEcran('tableau')} title={t('pj.resultatsAide')}>
          📊<span>{t('pj.resultats')}</span>
        </button>
        <button onClick={() => setEcran('social')} title={t('pj.ovaleAide')}>
          𝕏<span>{t('pj.ovale')}</span>
        </button>
        {/* Après 30 ans : transmettre pour durer (lot « corps, âge et fin de carrière ») */}
        {joueur.age >= 30 && !joueur.mentorat && (
          <button
            onClick={prendreMentorat}
            title={t('pj.mentorAide')}
          >
            🧑‍🏫<span>{t('pj.mentor')}</span>
          </button>
        )}
        {joueur.mentorat && (
          <button disabled title={t('pj.mentoratAide')}>
            🧑‍🏫<span>{t('pj.mentor')} ✓</span>
          </button>
        )}
        <button
          onClick={() => setConfirmerRetraite(true)}
          title={t('pj.retraiteAide')}
        >
          🏛️<span>{t('pj.retraite')}</span>
        </button>
      </div>

      {/* Reconversion : on choisit ce qu'on deviendra AVANT de raccrocher */}
      {finDeCarriere && (
        <div className="champ pj-reconversion">
          <label htmlFor="reconversion">
            {t('pj.apresCarriere')} {joueur.age >= AGE_RETRAITE_FORCEE && `- ${t('pj.derniereSaison')}`}
          </label>
          <select
            id="reconversion"
            value={reconversion}
            onChange={(e) => setReconversion(e.target.value)}
          >
            {RECONVERSIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.emoji} {t(`pj.reconversion.${r.id}`)}</option>
            ))}
          </select>
        </div>
      )}

      <AnimatePresence>
        {confirmerRetraite && (
          <Confirmation
            titre={`🏛️ ${t('pj.confirmerRetraite.titre')}`}
            message={t('pj.confirmerRetraite.message')}
            libelleOui={t('pj.confirmerRetraite.oui')}
            libelleNon={t('pj.confirmerRetraite.non')}
            onOui={() => {
              setConfirmerRetraite(false);
              prendreRetraite(finDeCarriere ? reconversion : undefined);
            }}
            onNon={() => setConfirmerRetraite(false)}
          />
        )}
        {confirmerTransfert && (
          <Confirmation
            titre={`📣 ${t('pj.confirmerTransfert.titre')}`}
            message={t('pj.confirmerTransfert.message')}
            libelleOui={t('pj.confirmerTransfert.oui')}
            libelleNon={t('pj.confirmerTransfert.non')}
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
        <MatchDirect
          match={affiche.match}
          saison={joueur.saison}
          cle={affiche.cle}
          joueur={joueur}
          selection={!!inter}
          titre={inter
            ? `${inter.affiche.competition.nom} · ${libelleDate(semaineActuelle)} · ${t('tb.journee', { n: inter.affiche.journee })}`
            : `${division?.nom ?? t('pj.championnat')} · ${libelleDate(semaineActuelle)} · ${t('tb.journee', { n: affiche.journee })}`}
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
            {matchAJouer && adversaire ? ` · ${adversaire}` : ` · ${libelleSemaine(semaineActuelle)}`}
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
                ? `✍️ ${t('pj.reponds')}`
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
              {aRepondre ? `✍️ ${t('pj.reponds')}` : semaineActuelle.type === 'treve' ? t('pj.cloreSaison') : t('pj.semaineSuivante')}
            </button>
          )}
        </div>,
        document.body,
      )}
    </aside>
  );
}
