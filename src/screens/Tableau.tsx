// RÉSULTATS EN DIRECT — tout le rugby joué, pas seulement ton championnat.
//
// Trois choses ici :
//   1. le CLASSEMENT et les résultats journée par journée de N'IMPORTE QUELLE
//      compétition (la tienne par défaut, les 20 championnats consultables) ;
//   2. les COUPES D'EUROPE avec leurs poules — proposées d'office quand la
//      semaine en cours est une date européenne et que ton club y est engagé ;
//   3. l'ARBRE des phases finales (barrages → demies → finale, quarts compris
//      en coupe), affiché dès que la phase régulière est terminée.

import { useMemo, useState } from 'react';
import { t } from '../lib/i18n';
import { motion } from 'framer-motion';
import { useGame, bonusClubDuJoueur } from '../store/useGame';
import {
  championnatEnDirect, journeesALaSemaine, nombreJournees, affichesDeLaJournee,
  poulesDe, indexPoule, estAmateur, estJourneeDe, weekEndsJoues, journeesApres, totalWeekEnds,
  type LigneTableau, type MatchChampionnat, type AfficheCalendrier,
} from '../lib/championnat';
import { phaseFinale, type MatchFinal } from '../lib/phaseFinale';
import { tournoiDeFinDAnnee } from '../lib/tournoi';
import { coupeEnDirect, coupesDuClub } from '../lib/coupe';
import {
  internationalEnDirect, affichesInternationales, competitionsDeLaSaison,
  fenetreInternationale, journeesInternationalesA, classementMondial,
} from '../lib/international';
import { LogoEquipe } from '../components/Blason';
import { nomNation } from '../components/Drapeau';
import { COUPES_EUROPE } from '../data/mondeReel';
import { COMPETITIONS, clubParNom } from '../data/clubs';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { Selecteur, type OptionSelecteur } from '../components/Selecteur';
import { Confirmation } from '../components/Confirmation';
import { semaine, libelleDate, CALENDRIER } from '../data/calendrier';
import {
  classementJoueurs, CATEGORIES, afficherValeur, nomPoste, type Categorie,
} from '../lib/statsJoueurs';
import type { Joueur } from '../types';

// Week-ends déjà passés, par type de semaine.
function passees(numero: number, type: string): number {
  return CALENDRIER.slice(0, Math.max(0, numero - 1)).filter((s) => s.type === type).length;
}

// Le pictogramme de chaque type de semaine, dans la frise du calendrier.
const EMOJI_SEMAINE: Record<string, string> = {
  championnat: '🏉', coupe: '⭐', international: '🏳️', phaseFinale: '🔥', treve: '🏖️',
};

function Rencontre({ match, mien }: { match: MatchChampionnat; mien: boolean }) {
  return (
    <div className="resultat" data-moi={mien ? 'oui' : undefined}>
      <span className={`res-equipe${match.scoreD > match.scoreE ? ' gagnant' : ''}`}>{match.domicile}</span>
      <b className="res-score">{match.scoreD} - {match.scoreE}</b>
      <span className={`res-equipe droite${match.scoreE > match.scoreD ? ' gagnant' : ''}`}>{match.exterieur}</span>
    </div>
  );
}

// --- L'ARBRE d'une phase à élimination directe -----------------------------
const TITRE_TOUR: Record<string, string> = {
  barrage: 'Barrages', quart: 'Quarts de finale', demie: 'Demi-finales',
  finale: 'Finale', accession: 'Match d’accès',
};
const ORDRE_TOURS = ['barrage', 'quart', 'demie', 'finale', 'accession'];

function Arbre({ matchs, club }: { matchs: MatchFinal[]; club: string }) {
  const tours = ORDRE_TOURS
    .map((tour) => ({ tour, matchs: matchs.filter((m) => m.tour === tour) }))
    .filter((t) => t.matchs.length);
  if (!tours.length) return null;

  return (
    <div className="arbre">
      {tours.map((t) => (
        <div key={t.tour} className="arbre-tour">
          <div className="arbre-titre">{TITRE_TOUR[t.tour]}</div>
          <div className="arbre-matchs">
            {t.matchs.map((m) => (
              <div
                key={m.libelle}
                className={`arbre-match${m.tour === 'finale' ? ' finale' : ''}`}
                data-moi={m.domicile === club || m.exterieur === club ? 'oui' : undefined}
              >
                <div className={`arbre-equipe${m.vainqueur === m.domicile ? ' vainqueur' : ''}`}>
                  <span>{m.domicile}</span>
                  <b>{m.scoreD}</b>
                </div>
                <div className={`arbre-equipe${m.vainqueur === m.exterieur ? ' vainqueur' : ''}`}>
                  <span>{m.exterieur}</span>
                  <b>{m.scoreE}</b>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- LE CALENDRIER DE L'ANNÉE ----------------------------------------------
// Toutes les semaines de la saison, cliquables : on ouvre n'importe quelle
// journée, jouée ou à venir, et on voit TOUTES les affiches. Le calendrier
// existe entièrement dès le coup d'envoi — seuls les scores attendent.
function Frise({
  divisionId, semaineActuelle, journeeVue, onJournee, onAller, total,
}: {
  divisionId: string;
  semaineActuelle: number;
  journeeVue: number;
  onJournee: (journee: number) => void;
  /** Cliquer une date À VENIR : on y va, en jouant tout ce qu'il y a entre. */
  onAller: ((numeroSemaine: number) => void) | null;
  total: number;
}) {
  // On associe à chaque semaine du calendrier la (ou les) journée(s) qu'elle
  // fait disputer DANS CETTE DIVISION.
  const cases = useMemo(() => {
    const surCombien = totalWeekEnds(divisionId);
    return CALENDRIER.map((s) => {
      const joue = estJourneeDe(divisionId, s);
      const avant = journeesApres(weekEndsJoues(divisionId, s.numero), total, surCombien);
      const apres = journeesApres(weekEndsJoues(divisionId, s.numero) + (joue ? 1 : 0), total, surCombien);
      return { sem: s, joue, premiere: avant + 1, derniere: apres };
    });
  }, [divisionId, total]);

  return (
    <div className="frise-annee">
      {cases.map(({ sem: s, joue, premiere, derniere }) => {
        const aDesMatchs = joue && derniere >= premiere;
        const active = aDesMatchs && journeeVue >= premiere && journeeVue <= derniere;
        // ═══ LA DATE EST UNE DESTINATION ═══════════════════════════════════
        // ⚠️ Demande explicite : « qu'on puisse cliquer sur une date dans le
        // calendrier et que ça nous y amène en simulant tous les matchs ».
        // Une semaine À VENIR n'est plus seulement quelque chose à consulter,
        // c'est un endroit où aller. Une semaine passée reste une consultation.
        const aVenir = !!onAller && s.numero > semaineActuelle;
        return (
          <button
            key={s.numero}
            className={`frise-case${active ? ' actif' : ''}`
              + `${s.numero === semaineActuelle ? ' aujourdhui' : ''}`
              + `${aVenir ? ' a-venir' : ''}`}
            // ⚠️ Une semaine sans match reste cliquable si elle est à venir :
            // c'est une date du calendrier, on doit pouvoir s'y rendre même
            // s'il ne s'y joue rien dans CETTE division.
            disabled={!aDesMatchs && !aVenir}
            onClick={() => (aVenir ? onAller!(s.numero) : onJournee(premiere))}
            title={aVenir
              ? `Jouer jusqu’au ${libelleDate(s)} (${s.numero - semaineActuelle} semaine(s))`
              : `${libelleDate(s)} — ${s.libelle}${aDesMatchs ? ` (J${premiere}${derniere > premiere ? `-${derniere}` : ''})` : ''}`}
          >
            <span className="frise-emoji">{aVenir ? '▶' : EMOJI_SEMAINE[s.type] ?? '🏉'}</span>
            <b>{aDesMatchs ? `J${premiere}` : '—'}</b>
            <i>{libelleDate(s)}</i>
          </button>
        );
      })}
    </div>
  );
}

function Affiche({ a, club }: { a: AfficheCalendrier; club: string }) {
  const mien = a.domicile === club || a.exterieur === club;
  if (a.match) return <Rencontre match={a.match} mien={mien} />;
  return (
    <div className="resultat a-venir" data-moi={mien ? 'oui' : undefined}>
      <span className="res-equipe">{a.domicile}</span>
      <b className="res-score">–</b>
      <span className="res-equipe droite">{a.exterieur}</span>
    </div>
  );
}

// --- LES CLASSEMENTS INDIVIDUELS -------------------------------------------
// Meilleurs marqueurs, buteurs, plaqueurs, gratteurs… dans N'IMPORTE QUELLE
// compétition. Les statistiques de tous les joueurs sont dérivées de leur
// poste, de leur niveau et de leur temps de jeu (lib/statsJoueurs.ts) ; le
// joueur humain, lui, y entre avec ses vrais chiffres de la saison.
function ClassementsJoueurs({
  divisionId, saison, journees, numeroPoule, joueur,
}: {
  divisionId: string;
  saison: number;
  journees: number;
  numeroPoule?: number;
  joueur: Joueur;
}) {
  const [cat, setCat] = useState<Categorie>('essais');
  // Les statistiques produites par le moteur pour CETTE division et CETTE
  // saison, si des journées ont déjà été rejouées en fond.
  const reelles = useGame((s) => s.statsReelles[`${divisionId}#${saison}`]);
  // ⚠️ COMBIEN DE JOURNÉES ONT VRAIMENT ÉTÉ REJOUÉES. L'en-tête annonçait le
  // nombre de journées DISPUTÉES par le championnat : après un saut de plusieurs
  // semaines, il affichait « matchs joués · 12 journées » alors que le moteur
  // n'en avait rejoué que 6. Des chiffres de 6 journées présentés comme ceux de
  // 12, c'est exactement ce qui donne l'impression que le classement perd des
  // statistiques.
  const rejouees = useGame((s) => s.journeesReelles[`${divisionId}#${saison}`] ?? 0);
  const lignes = useMemo(
    () => classementJoueurs(divisionId, saison, journees, cat, joueur, numeroPoule, 20, reelles),
    [divisionId, saison, journees, cat, joueur, numeroPoule, reelles],
  );
  const info = CATEGORIES.find((c) => c.id === cat)!;

  return (
    <div className="carte bloc-competition">
      <div className="comp-tete">
        <b>🥇 Classements des joueurs</b>
        <span className="comp-count">
          {reelles
            ? `matchs joués · ${rejouees} journée${rejouees > 1 ? 's' : ''}`
              + (rejouees < journees ? ` sur ${journees}` : '')
            : `estimation · ${journees} journée${journees > 1 ? 's' : ''}`}
        </span>
      </div>
      <div className="cats-stats">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`chip-cat${cat === c.id ? ' actif' : ''}`}
            onClick={() => setCat(c.id)}
            title={c.desc}
          >
            {c.emoji} {c.nom}
          </button>
        ))}
      </div>
      <p className="cat-desc">{info.desc}</p>
      {lignes.length === 0 ? (
        <p className="x-vide" style={{ padding: '0.8rem 0' }}>
          Pas encore de statistiques : la saison n’a pas commencé.
        </p>
      ) : (
        <div className="stats-tableau">
          {lignes.map((l, i) => {
            const club = clubParNom(l.club);
            return (
              <div key={`${l.club}-${l.nom}`} className="stats-ligne" data-moi={l.moi ? 'oui' : undefined}>
                <span className="st-pos" data-tete={i < 3 ? 'oui' : undefined}>{i + 1}</span>
                {club ? <Blason club={club} taille={20} /> : <span />}
                <span className="st-nom">
                  <b>{l.nom}{l.moi && ' 🫵'}</b>
                  <i>{nomPoste(l.poste)} · {l.club}</i>
                </span>
                <span className="st-matchs">{l.matchs} m.</span>
                <b className="st-valeur">{afficherValeur(l, cat)}</b>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tableau1({ lignes, club, tete = 6 }: { lignes: LigneTableau[]; club: string; tete?: number }) {
  return (
    <div className="classement-tableau tableau-live">
      <div className="classement-entete">
        <span />
        <span />
        <span className="cl-nom">Club</span>
        <span title="Points">Pts</span>
        <span title="Joués">J</span>
        <span title="Gagnés">G</span>
        <span title="Nuls">N</span>
        <span title="Perdus">P</span>
        <span title="Différence de points">Diff</span>
        <span title="Points de bonus">B</span>
      </div>
      {lignes.map((l) => {
        const data = clubParNom(l.club);
        const moi = l.club === club;
        return (
          <div key={l.club} className="classement-ligne" data-moi={moi ? 'oui' : undefined}>
            <span className="cl-pos" data-tete={l.position <= tete ? 'oui' : undefined}>{l.position}</span>
            {data ? <Blason club={data} taille={22} /> : <span />}
            <span className="cl-nom">{l.club}{moi && ' 🫵'}</span>
            <span className="cl-pts">{l.points}</span>
            <span>{l.joues}</span>
            <span>{l.gagnes}</span>
            <span>{l.nuls}</span>
            <span>{l.perdus}</span>
            <span className={l.difference >= 0 ? 'cl-plus' : 'cl-moins'}>
              {l.difference > 0 ? `+${l.difference}` : l.difference}
            </span>
            <span>{l.bonus}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Tableau() {
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);
  const [journeeVue, setJourneeVue] = useState<number | null>(null);

  // ═══ AVANCER JUSQU'À UNE DATE ═══════════════════════════════════════════
  // ⚠️ Ce qui remplace la « simulation de saison ». On ne saute plus l'année :
  // on choisit une date, et toutes les semaines qui séparent sont JOUÉES.
  const avancerJusqua = useGame((s) => s.avancerJusqua);
  const evenementHebdo = useGame((s) => s.evenementHebdo);
  const scenarioActif = useGame((s) => s.scenarioActif);
  const [destination, setDestination] = useState<number | null>(null);
  const [bilanAvance, setBilanAvance] = useState<string | null>(null);
  // Une question du MJ en plan bloque l'avance, exactement comme elle bloque
  // « semaine suivante » : on ne saute pas par-dessus une scène sans réponse.
  const peutAvancer = !!joueur && !evenementHebdo && !scenarioActif;

  const numero = joueur?.semaine ?? 1;
  const semActuelle = semaine(numero);
  const maDivision = joueur?.division ?? '';
  const mesCoupes = useMemo(() => (joueur ? coupesDuClub(joueur.club) : []), [joueur]);

  // ⚠️ LES SÉLECTIONS SONT DES COMPÉTITIONS COMME LES AUTRES. Pendant une
  // fenêtre internationale, on n'y voyait ni affiche ni classement : le Tournoi
  // n'était qu'un tableau figé recopié de la vraie saison. Il se joue
  // maintenant pour de vrai (lib/international.ts).
  const saison = joueur?.saison ?? 1;
  const internationales = useMemo(() => competitionsDeLaSaison(saison), [saison]);
  const rangMondial = useMemo(() => classementMondial(saison), [saison]);
  const maNation = nomNation(joueur?.nation ?? '');
  const fenetre = useMemo(
    () => fenetreInternationale(numero, saison, maNation),
    [numero, saison, maNation],
  );
  const maSelection = useMemo(
    () => internationales.find((c) => c.equipes.includes(maNation))?.id ?? '',
    [internationales, maNation],
  );

  // Compétition affichée par défaut : la sienne — sauf pendant une semaine de
  // coupe d'Europe (la coupe de son club s'ouvre) ou une fenêtre internationale
  // (sa sélection s'ouvre, si sa nation joue).
  const [choix, setChoix] = useState<string>(() => {
    if (semActuelle.type === 'coupe' && mesCoupes.length) return mesCoupes[0];
    if (semActuelle.type === 'international' && fenetre
      && fenetre.competition.equipes.includes(maNation)) return fenetre.competition.id;
    if (semActuelle.type === 'international' && fenetre) return fenetre.competition.id;
    return maDivision;
  });
  const estCoupe = COUPES_EUROPE.some((c) => c.id === choix);
  const estInternational = internationales.some((c) => c.id === choix);

  // Les grandes divisions amateurs sont découpées en poules : on peut les
  // parcourir toutes, pas seulement la sienne.
  const poules = useMemo(
    () => (estCoupe || estInternational ? [] : poulesDe(choix)),
    [choix, estCoupe, estInternational],
  );
  const [pouleVue, setPouleVue] = useState<number | null>(null);
  const maPoule = useMemo(
    () => (joueur && choix === maDivision ? Math.max(0, indexPoule(choix, joueur.club)) : 0),
    [joueur, choix, maDivision],
  );
  const poule = pouleVue ?? maPoule;

  const donnees = useMemo(() => {
    if (!joueur || estCoupe || estInternational || !choix) return null;
    // ⚠️ On ne s'ancre sur SON club que dans SA division ET dans SA poule :
    // sinon le Stade Toulousain apparaissait dans le classement de la Régionale 3.
    const sien = choix === maDivision && poule === maPoule;
    const ancre = sien ? joueur.club : '';
    const bonus = sien ? bonusClubDuJoueur(joueur) : 0;
    const numeroPoule = poules.length > 1 ? poule : undefined;
    const total = nombreJournees(choix, ancre, numeroPoule);
    // ⚠️ Chaque étage a son propre calendrier : de la Nationale 2 à la
    // Régionale 3, on joue aussi les week-ends de Coupe d'Europe et de Tournoi.
    const jouees = journeesALaSemaine(choix, numero, total);
    return {
      etat: championnatEnDirect(choix, joueur.saison, ancre, jouees, bonus, numeroPoule),
      phase: jouees >= total ? phaseFinale(choix, joueur.saison, ancre, bonus, numeroPoule) : null,
      jouees, total, ancre, bonus, numeroPoule,
    };
  }, [joueur, choix, estCoupe, estInternational, maDivision, numero, poule, maPoule, poules.length]);

  // ---------- LA COMPÉTITION DE SÉLECTIONS ----------
  const inter = useMemo(() => {
    if (!joueur || !estInternational) return null;
    const jouees = journeesInternationalesA(choix, numero, joueur.saison);
    const etatInter = internationalEnDirect(choix, joueur.saison, jouees, null);
    if (!etatInter) return null;
    const vueInter = Math.max(1, Math.min(journeeVue ?? Math.max(1, jouees), etatInter.totalJournees));
    return {
      etat: etatInter,
      vue: vueInter,
      affiches: affichesInternationales(choix, joueur.saison, vueInter, jouees, null),
    };
  }, [joueur, choix, estInternational, numero, journeeVue]);

  // Le TOURNOI DE FIN D'ANNÉE : dans les divisions à poules multiples, c'est lui
  // qui désigne le champion — les meilleurs de chaque poule s'affrontent en
  // tableau sec, façon coupe de France.
  const tournoi = useMemo(() => {
    if (!joueur || estCoupe || poules.length < 2 || !donnees) return null;
    if (donnees.jouees < donnees.total) return null; // la phase de poules n'est pas finie
    return tournoiDeFinDAnnee(
      choix, joueur.saison,
      COMPETITIONS.find((c) => c.id === choix)?.nom ?? choix,
      choix === maDivision ? joueur.club : '',
      choix === maDivision ? bonusClubDuJoueur(joueur) : 0,
    );
  }, [joueur, choix, estCoupe, poules.length, donnees, maDivision]);

  const coupe = useMemo(() => {
    if (!joueur || !estCoupe) return null;
    return coupeEnDirect(choix, joueur.saison, joueur.club, passees(numero, 'coupe'));
  }, [joueur, choix, estCoupe, numero]);

  const etat = donnees?.etat;
  const phase = donnees?.phase;
  const derniere = etat?.journees.length ?? 0;
  const total = donnees?.total ?? 0;
  // ⚠️ On peut consulter N'IMPORTE QUELLE journée de l'année, y compris celles
  // qui ne sont pas encore jouées : les affiches existent, les scores non.
  const vue = Math.max(1, Math.min(journeeVue ?? Math.max(1, derniere), total || 1));
  const affiches: AfficheCalendrier[] = useMemo(() => {
    if (!joueur || !donnees) return [];
    return affichesDeLaJournee(
      choix, joueur.saison, donnees.ancre, vue, donnees.jouees, donnees.bonus, donnees.numeroPoule,
    );
  }, [joueur, choix, donnees, vue]);

  if (!joueur) return null;
  const competition = COMPETITIONS.find((c) => c.id === choix);

  // Options : mes compétitions d'abord, puis les coupes, puis tout le monde.
  const options: OptionSelecteur[] = [
    ...(maDivision
      ? [{
          valeur: maDivision,
          label: COMPETITIONS.find((c) => c.id === maDivision)?.nom ?? maDivision,
          sous: 'Ton championnat',
          vignette: <LogoCompet id={maDivision} emoji="⭐" taille={22} />,
          groupe: 'Mes compétitions',
        }]
      : []),
    ...mesCoupes.map((id) => {
      const c = COUPES_EUROPE.find((x) => x.id === id)!;
      return { valeur: id, label: c.nom, sous: 'Ton club y est engagé', vignette: <LogoCompet id={c.id} emoji={c.emoji} taille={22} />, groupe: 'Mes compétitions' };
    }),
    ...(maSelection
      ? [{
          valeur: maSelection,
          label: internationales.find((c) => c.id === maSelection)!.nom,
          sous: `Ta sélection — ${maNation}`,
          vignette: <LogoCompet id={maSelection} emoji="🏳️" taille={22} />,
          groupe: 'Mes compétitions',
        }]
      : []),
    ...COUPES_EUROPE.filter((c) => !mesCoupes.includes(c.id)).map((c) => ({
      valeur: c.id, label: c.nom, sous: c.pays, vignette: <LogoCompet id={c.id} emoji={c.emoji} taille={22} />, groupe: 'Coupes d’Europe',
    })),
    ...internationales.filter((c) => c.id !== maSelection).map((c) => ({
      valeur: c.id, label: c.nom, sous: `${c.equipes.length} sélections`,
      vignette: <LogoCompet id={c.id} emoji={c.emoji} taille={22} />, groupe: 'Sélections',
    })),
    ...COMPETITIONS.filter((c) => c.id !== maDivision).map((c) => ({
      valeur: c.id, label: c.nom, sous: c.pays, vignette: <LogoCompet id={c.id} emoji={c.emoji} taille={22} />, groupe: 'Championnats',
    })),
  ];

  return (
    <motion.section
      className="championnats"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <button className="btn fantome" onClick={() => setEcran('carriere')} style={{ marginBottom: '1rem' }}>
        ← Retour à la carrière
      </button>
      <div className="eyebrow">{semActuelle.libelle} · {t('gen.saison').toLowerCase()} {joueur.saison}</div>
      <h1>📊 {t('tb.titre')}</h1>

      <div className="barre-competitions">
        <div className="barre-selecteur">
          <Selecteur
            options={options}
            valeur={choix}
            onChange={(v) => { setChoix(v); setJourneeVue(null); setPouleVue(null); }}
            placeholder="Choisir une compétition"
          />
        </div>
        {maDivision && (
          <button
            className={`chip-comp${choix === maDivision ? ' actif' : ''}`}
            onClick={() => { setChoix(maDivision); setJourneeVue(null); setPouleVue(null); }}
          >
            <LogoCompet id={maDivision} emoji="⭐" taille={18} /> Mon championnat
          </button>
        )}
        {maSelection && (
          <button
            className={`chip-comp${choix === maSelection ? ' actif' : ''}`}
            onClick={() => { setChoix(maSelection); setJourneeVue(null); setPouleVue(null); }}
            title={`${maNation} dispute cette compétition`}
          >
            <LogoCompet id={maSelection} emoji="🏳️" taille={18} /> Ma sélection
          </button>
        )}
        {mesCoupes.map((id) => {
          const c = COUPES_EUROPE.find((x) => x.id === id)!;
          return (
            <button
              key={id}
              className={`chip-comp${choix === id ? ' actif' : ''}`}
              onClick={() => { setChoix(id); setJourneeVue(null); setPouleVue(null); }}
              title={`Ton club dispute la ${c.nom}`}
            >
              <LogoCompet id={c.id} emoji={c.emoji} taille={18} /> {c.nom}
            </button>
          );
        })}
      </div>

      <div className="carte bloc-competition">
        <div className="comp-tete">
          <b>🌍 {t('intl.classementMondial')}</b>
          <span className="comp-count">{t('intl.top12')}</span>
        </div>
        <div className="classement-tableau tableau-live">
          {rangMondial.slice(0, 20).map((l) => (
            <div key={l.nation} className="classement-ligne" data-moi={l.nation === maNation ? 'oui' : undefined}>
              <span className="cl-pos" data-tete={l.rang <= 12 ? 'oui' : undefined}>{l.rang}</span>
              <LogoEquipe nom={l.nation} taille={22} />
              <span className="cl-nom">{l.nation}{l.nation === maNation && ' 🫵'}</span>
              <span className="cl-pts">{l.points}</span>
              <span style={{ gridColumn: 'span 5' }}>{l.rang <= 12 ? t('intl.qualifie') : t('intl.barrages')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- COUPE D'EUROPE ---------- */}
      {coupe && (
        <>
          <p className="intro-comp">
            <LogoCompet id={coupe.id} emoji={coupe.emoji} taille={20} /> <b>{coupe.nom}</b> — {coupe.journeesJouees} journée
            {coupe.journeesJouees > 1 ? 's' : ''} de poules sur {coupe.totalJournees}.{' '}
            {coupe.engage
              ? 'Ton club est engagé dans cette coupe.'
              : 'Ton club n’y participe pas cette saison.'}
            {coupe.vainqueur && ` 🏆 Vainqueur : ${coupe.vainqueur}.`}
          </p>

          {coupe.bracket.length > 0 && (
            <div className="carte bloc-competition">
              <div className="comp-tete">
                <b>🔥 Tableau final</b>
                {coupe.vainqueur && <span className="comp-count">🏆 {coupe.vainqueur}</span>}
              </div>
              <Arbre matchs={coupe.bracket} club={joueur.club} />
            </div>
          )}

          <div className="grille-poules">
            {coupe.poules.map((p) => (
              <div key={p.nom} className="carte bloc-competition">
                <div className="comp-tete">
                  <b>{p.nom}</b>
                  <span className="comp-count">{p.clubs.length} clubs</span>
                </div>
                <Tableau1 lignes={p.classement} club={joueur.club} tete={2} />
                {p.journees.length > 0 && (
                  <div className="grille-resultats">
                    {p.journees[p.journees.length - 1].map((m) => (
                      <Rencontre
                        key={m.domicile}
                        match={m}
                        mien={m.domicile === joueur.club || m.exterieur === joueur.club}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------- SÉLECTIONS NATIONALES ---------- */}
      {inter && (
        <>
          <p className="intro-comp">
            <LogoCompet id={inter.etat.id} emoji={inter.etat.emoji} taille={20} /> <b>{inter.etat.nom}</b> —{' '}
            {inter.etat.journeesJouees > 0
              ? `${inter.etat.journeesJouees} journée${inter.etat.journeesJouees > 1 ? 's' : ''} sur ${inter.etat.totalJournees}.`
              : 'la compétition n’a pas encore commencé.'}
            {inter.etat.equipes.includes(maNation) && ` Ta sélection : ${maNation}.`}
          </p>

          <div className="carte bloc-competition">
            <div className="comp-tete">
              <b>{inter.etat.emoji} Classement</b>
              <span className="comp-count">{inter.etat.equipes.length} sélections</span>
            </div>
            <div className="classement-tableau tableau-live">
              <div className="classement-entete">
                <span /><span /><span className="cl-nom">Sélection</span>
                <span title="Points">Pts</span><span title="Joués">J</span>
                <span title="Gagnés">G</span><span title="Nuls">N</span><span title="Perdus">P</span>
                <span title="Différence de points">Diff</span><span title="Bonus">B</span>
              </div>
              {inter.etat.classement.map((l) => (
                <div key={l.club} className="classement-ligne" data-moi={l.club === maNation ? 'oui' : undefined}>
                  <span className="cl-pos" data-tete={l.position === 1 ? 'oui' : undefined}>{l.position}</span>
                  <LogoEquipe nom={l.club} taille={22} />
                  <span className="cl-nom">{l.club}{l.club === maNation && ' 🫵'}</span>
                  <span className="cl-pts">{l.points}</span>
                  <span>{l.joues}</span><span>{l.gagnes}</span><span>{l.nuls}</span><span>{l.perdus}</span>
                  <span className={l.difference >= 0 ? 'cl-plus' : 'cl-moins'}>
                    {l.difference > 0 ? `+${l.difference}` : l.difference}
                  </span>
                  <span>{l.bonus}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="carte bloc-competition">
            <div className="comp-tete">
              <b>{inter.affiches.some((a) => a.jouee) ? 'Résultats' : 'Programme'} — journée {inter.vue}</b>
              <div className="nav-journee">
                <button className="btn fantome mini" disabled={inter.vue <= 1}
                  onClick={() => setJourneeVue(inter.vue - 1)}>←</button>
                <span>J{inter.vue} / {inter.etat.totalJournees}</span>
                <button className="btn fantome mini" disabled={inter.vue >= inter.etat.totalJournees}
                  onClick={() => setJourneeVue(inter.vue + 1)}>→</button>
              </div>
            </div>
            <div className="grille-resultats">
              {inter.affiches.map((a) => (
                <div key={a.domicile} className="resultat"
                  data-moi={a.domicile === maNation || a.exterieur === maNation ? 'oui' : undefined}>
                  <span className={`res-equipe${a.match && a.match.scoreD > a.match.scoreE ? ' gagnant' : ''}`}>
                    {a.domicile}
                  </span>
                  <b className="res-score">{a.match ? `${a.match.scoreD} - ${a.match.scoreE}` : 'à venir'}</b>
                  <span className={`res-equipe droite${a.match && a.match.scoreE > a.match.scoreD ? ' gagnant' : ''}`}>
                    {a.exterieur}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ---------- CHAMPIONNAT ---------- */}
      {etat && (
        <>
          <p className="intro-comp">
            <LogoCompet id={competition?.id} emoji={competition?.emoji} taille={20} /> <b>{competition?.nom}</b> —{' '}
            {derniere > 0
              ? `${derniere} journée${derniere > 1 ? 's' : ''} disputée${derniere > 1 ? 's' : ''} sur ${etat.totalJournees}.`
              : 'la saison n’a pas encore commencé.'}
          </p>

          {poules.length > 1 && (
            <div className="barre-poules">
              <span className="poules-titre">
                {poules.length} poules — {estAmateur(choix) ? 'champion désigné par le tournoi final' : 'phase finale par poule'}
              </span>
              {poules.map((p, i) => (
                <button
                  key={i}
                  className={`chip-poule${poule === i ? ' actif' : ''}`}
                  onClick={() => { setPouleVue(i); setJourneeVue(null); }}
                  title={p.slice(0, 4).join(' · ') + '…'}
                >
                  Poule {i + 1}
                  {choix === maDivision && i === maPoule && ' 🫵'}
                </button>
              ))}
            </div>
          )}

          <div className="carte bloc-competition">
            <div className="comp-tete">
              <b>Classement{poules.length > 1 ? ` — poule ${poule + 1}` : ''}</b>
              <span className="comp-count">{etat.poule.length} clubs</span>
            </div>
            <Tableau1 lignes={etat.classement} club={joueur.club} />
          </div>

          {/* ---------- TOURNOI DE FIN D'ANNÉE ---------- */}
          {tournoi && tournoi.matchs.length > 0 && (
            <div className="carte bloc-competition">
              <div className="comp-tete">
                <b>🏆 {tournoi.nom}</b>
                <span className="comp-count">{tournoi.qualifies.length} qualifiés</span>
              </div>
              <p className="intro-comp" style={{ margin: '0 0 0.6rem' }}>
                Les meilleurs de chaque poule s’affrontent en tableau sec, façon coupe de France.
                {tournoi.champion && <> 🏆 Vainqueur : <b>{tournoi.champion}</b>.</>}
              </p>
              <Arbre matchs={tournoi.matchs} club={joueur.club} />
            </div>
          )}

          {phase && phase.matchs.length > 0 && (
            <div className="carte bloc-competition">
              <div className="comp-tete">
                <b>🔥 Phase finale</b>
                <span className="comp-count">{phase.qualifies.length} qualifiés</span>
              </div>
              <Arbre matchs={phase.matchs} club={joueur.club} />
              <p style={{ color: 'var(--craie-dim)', fontSize: '0.85rem', marginTop: '0.7rem' }}>
                🏆 Champion : <b>{phase.champion}</b>. {phase.finaliste} est battu en finale — il
                disputera le match d’accès à la division supérieure contre son avant-dernier.
              </p>
            </div>
          )}

          <ClassementsJoueurs
            divisionId={choix}
            saison={joueur.saison}
            journees={donnees?.jouees ?? 0}
            numeroPoule={poules.length > 1 ? poule : undefined}
            joueur={joueur}
          />

          {/* ---------- LE CALENDRIER DE L'ANNÉE ---------- */}
          <div className="carte bloc-competition">
            <div className="comp-tete">
              <b>🗓️ Calendrier de la saison</b>
              <span className="comp-count">{total} journées</span>
            </div>
            <p className="intro-comp" style={{ margin: '0 0 0.6rem' }}>
              Clique une semaine <b>passée</b> pour voir ses affiches.
              {peutAvancer
                ? <> Clique une semaine <b>à venir</b> (▶) et le jeu <b>joue jusque-là</b> :
                  tous les matchs, tes statistiques, ta forme et tes sélections comprises.</>
                : ' Les semaines à venir affichent le programme.'}
              {estAmateur(choix) && ' Ici, pas de trêve : on joue aussi pendant la Coupe d’Europe et le Tournoi.'}
            </p>
            <Frise
              divisionId={choix}
              semaineActuelle={numero}
              journeeVue={vue}
              onJournee={(jr) => setJourneeVue(jr)}
              onAller={peutAvancer ? (n) => setDestination(n) : null}
              total={total}
            />
          </div>

          {total > 0 && (
            <div className="carte bloc-competition">
              <div className="comp-tete">
                <b>
                  {vue <= derniere ? 'Résultats' : 'Programme'} — journée {vue} / {total}
                </b>
                <div className="nav-journees">
                  <button disabled={vue <= 1} onClick={() => setJourneeVue(vue - 1)}>←</button>
                  <button disabled={vue >= total} onClick={() => setJourneeVue(vue + 1)}>→</button>
                </div>
              </div>
              <div className="grille-resultats">
                {affiches.map((a) => (
                  <Affiche key={`${a.domicile}-${a.exterieur}`} a={a} club={joueur.club} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ ALLER À UNE DATE ══════════════════════════════════════════════ */}
      {/* ⚠️ On CONFIRME, parce que l'action n'est pas annulable : les semaines
          sautées sont jouées pour de bon (matchs, blessures, sélections). Et on
          dit combien il y en a — « ça avance » n'est pas une information. */}
      {destination != null && (
        <Confirmation
          titre={`Jouer jusqu’au ${libelleDate(semaine(destination))} ?`}
          message={
            `${destination - numero} semaine(s) vont être jouées, une par une : matchs, `
            + `statistiques, forme, blessures et sélections comprises. Tu ne verras pas ces `
            + `matchs en direct — ils sont simulés par le même moteur. Le jeu s’arrêtera avant `
            + `si une scène du Maître du Jeu t’attend, s’il faut signer un contrat, ou si la `
            + `saison se termine.`
          }
          libelleOui="▶️ Jouer jusque-là"
          onNon={() => setDestination(null)}
          onOui={() => {
            const cible = destination;
            setDestination(null);
            const r = avancerJusqua(cible);
            setJourneeVue(null);
            setBilanAvance(
              r.semaines === 0
                ? 'Aucune semaine n’a pu être jouée.'
                : `${r.semaines} semaine(s) jouée(s). `
                  + (r.arret === 'question' ? 'Une scène du Maître du Jeu t’attend.'
                    : r.arret === 'contrat' ? 'Il faut répondre aux offres de contrat.'
                      : r.arret === 'saison' ? 'La saison s’est terminée en chemin.'
                        : r.arret === 'fin' ? 'Ta carrière s’est arrêtée là.'
                          : 'Te voilà arrivé.'),
            );
          }}
        />
      )}
      {bilanAvance && (
        <Confirmation
          titre="🗓️ Avance terminée"
          message={bilanAvance}
          libelleOui="Retour à la carrière"
          libelleNon="Rester ici"
          onNon={() => setBilanAvance(null)}
          onOui={() => { setBilanAvance(null); setEcran('carriere'); }}
        />
      )}
    </motion.section>
  );
}
