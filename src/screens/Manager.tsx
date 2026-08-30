import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { t, nombre } from '../lib/i18n';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { Confirmation } from '../components/Confirmation';
import { Selecteur } from '../components/Selecteur';
import type { OptionSelecteur } from '../components/Selecteur';
import { COMPETITIONS, clubParNom, competitionDuClub } from '../data/clubs';
import { effectifDuClub, forceEffectif } from '../lib/effectif';
import { classementManagerEnDirect } from '../lib/tableauManager';
import { semaine, libelleSemaine, SEMAINES_PAR_SAISON } from '../data/calendrier';
import { TROPHEES } from '../data/trophees';
import { nomPoste, POSTES } from '../data/rugby';
import { Drapeau } from '../components/Drapeau';
import { CompositionTerrainManager } from '../components/CompositionTerrainManager';
import type { EtatDuJoueur } from '../lib/carteJoueur';
import { poidsDansSecteur, SECTEURS_COHESION } from '../lib/cohesion';
import type { Automatismes } from '../lib/cohesion';
import { ciblesDuMarche, masseSalarialeActuelle } from '../lib/recrutementManager';
import {
  CONFIANCE_DEPART, CONFIANCE_LICENCIEMENT, clubsAccessibles, etageAccessible,
  noteMaximale, salaireManager,
} from '../lib/manager';
import { matchDuClubSemaine } from '../lib/matchLive';
import {
  CLUBS_OBSERVES, coutAmelioration, EMOJI_INSTALLATION, GAIN_ENTRAINEMENT,
  installationsVierges, NIVEAU_INSTALLATION_MAX, PLACES_ENTRAINEMENT,
  INCERTITUDE_RECRUTEURS, budgetStructure,
} from '../lib/installations';
import { AXES_CENTRE, EMOJI_AXE } from '../lib/centreFormation';
import {
  capaciteAcademie, ficheAcademicienManager, nomObjectifJeune, OBJECTIFS_JEUNES,
  tableauDetectionManager,
} from '../lib/formationManager';
import {
  compositionManagerParDefaut, noteCompositionManager, POSTES_XV_MANAGER,
  reconcilerCompositionManager,
} from '../lib/compositionManager';
import {
  assurerEtatCarriereAvancee, indisponiblesCarriereAvancee, moyenneVestiaire,
  penalitesMedicales, rapportConnaissance, joueurAgent,
} from '../lib/carriereAvancee';
import { hallOfFameDe, totaux } from '../lib/histoire';
import { rivalitesDe, traitsDominants } from '../lib/identiteClub';
import { effectifNational, jouerTestMatch } from '../lib/international';
import { nomNation } from '../lib/nations';
import {
  ajustementsCapitaines, contexteDerby, DOMAINES_DELEGATION, LIBELLES_DELEGATION,
  saisonsChronologie, vieClubProfonde,
} from '../lib/carriereProfonde';
import type {
  CompositionManager, ObjectifJeuneManager,
  TactiqueManager, TypeInstallation,
} from '../types';

const MatchLive = lazy(() => import('../components/MatchLive').then((m) => ({ default: m.MatchLive })));
const OvaleManager = lazy(() => import('./Social').then((m) => ({ default: m.OvaleManager })));

type VueManager = 'bureau' | 'equipe' | 'match' | 'marche'
  | 'ovale' | 'formation' | 'recruteurs' | 'entrainement'
  | 'direction' | 'vestiaire' | 'univers' | 'histoire';

function humeurDuBoard(confiance: number): { texte: string; ton: string } {
  if (confiance < CONFIANCE_LICENCIEMENT + 12) return { texte: t('mgr.board.sellette'), ton: 'rouge' };
  if (confiance < CONFIANCE_DEPART) return { texte: t('mgr.board.doute'), ton: 'orange' };
  if (confiance < 78) return { texte: t('mgr.board.suit'), ton: 'vert' };
  return { texte: t('mgr.board.confiance'), ton: 'or' };
}

function niveauLisible(note: number): string {
  if (note >= 82) return 'exceptionnel';
  if (note >= 68) return 'très bon';
  if (note >= 54) return 'bon';
  if (note >= 40) return 'moyen';
  return 'à développer';
}

function etoiles(bas: number, haut: number): string {
  return bas === haut ? `${bas.toFixed(1)} ★` : `${bas.toFixed(1)}–${haut.toFixed(1)} ★`;
}

function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((partie) => partie[0])
    .join('')
    .toUpperCase();
}

export function Manager() {
  const manager = useGame((s) => s.manager);
  const setEcran = useGame((s) => s.setEcran);
  const semaineManager = useGame((s) => s.semaineManager);
  const contacterClub = useGame((s) => s.contacterClubManager);
  const ouvrirMessages = useGame((s) => s.ouvrirMessagesOvale);
  const ouvrirDiscussion = useGame((s) => s.ouvrirDiscussionOvale);
  const ouvertureSociale = useGame((s) => s.ouvrirSocialSur);
  const signerBanc = useGame((s) => s.signerBanc);
  const quitterBanc = useGame((s) => s.quitterBanc);
  const definirComposition = useGame((s) => s.definirCompositionManager);
  const verifierSucces = useGame((s) => s.verifierSucces);
  const definirTactique = useGame((s) => s.definirTactiqueManager);
  const ameliorerInstallation = useGame((s) => s.ameliorerInstallation);
  const basculerEntrainement = useGame((s) => s.basculerEntrainement);
  const observerJeune = useGame((s) => s.observerJeuneManager);
  const proposerProjetJeune = useGame((s) => s.proposerProjetJeuneManager);
  const gererAcademicien = useGame((s) => s.gererAcademicienManager);
  const definirObjectifJeune = useGame((s) => s.definirObjectifJeuneManager);
  const definirMentorJeune = useGame((s) => s.definirMentorJeuneManager);
  const enregistrerResultat = useGame((s) => s.enregistrerResultatManager);
  const repondreDiscussion = useGame((s) => s.repondreDiscussionAvancee);
  const deciderMedical = useGame((s) => s.deciderMedicalManager);
  const observerCible = useGame((s) => s.observerCibleManager);
  const postulerBanc = useGame((s) => s.postulerBancManager);
  const negocierContrat = useGame((s) => s.negocierContratManager);
  const demissionner = useGame((s) => s.demissionnerManager);
  const accepterOffreBanc = useGame((s) => s.accepterOffreBancManager);
  const repondreSelection = useGame((s) => s.repondreSelectionManager);
  const enregistrerMatchSelection = useGame((s) => s.enregistrerMatchSelectionManager);
  const configurerDelegation = useGame((s) => s.configurerDelegationManager);
  const definirHierarchieCapitaines = useGame((s) => s.definirHierarchieCapitainesManager);
  const repondreDecisionStrategique = useGame((s) => s.repondreDecisionStrategiqueManager);
  const journal = useGame((s) => s.journal);

  const [vue, setVue] = useState<VueManager>('bureau');
  // ⚠️ LES MURS SONT CEUX DU CLUB, pas ceux de l'entraîneur : on lit le club
  // courant, et un manager qui change de banc découvre ce que l'autre a bâti.
  const murs = manager?.installations?.[manager.club] ?? installationsVierges();
  const enveloppe = manager?.club
    ? budgetStructure(forceEffectif(manager.club, manager.saison), competitionDuClub(manager.club)?.niveau ?? 8)
    : 0;
  const placesEntrainement = PLACES_ENTRAINEMENT[Math.min(murs.entrainement, NIVEAU_INSTALLATION_MAX)];
  const rapportsFrais = manager?.rapports?.filter((r) => r.saison >= (manager.saison ?? 0)).length ?? 0;
  // La masse déjà engagée : c'est elle qui bloque une signature, pas le solde.
  const masseEngagee = manager?.club ? masseSalarialeActuelle(manager.club, manager.saison) : 0;
  const masseSaturee = !!manager && masseEngagee >= manager.budgetSalarial * 0.92;
  const [raccrocher, setRaccrocher] = useState(false);
  const [clubVise, setClubVise] = useState('');
  const [divisionMarche, setDivisionMarche] = useState(manager?.division ?? 'top14');
  const [clubMarche, setClubMarche] = useState('');
  const [recherche, setRecherche] = useState('');
  const [poste, setPoste] = useState('');
  const [matchOuvert, setMatchOuvert] = useState(false);
  const [matchSelectionOuvert, setMatchSelectionOuvert] = useState(false);
  const [jeuneALiberer, setJeuneALiberer] = useState<string | null>(null);
  const [demission, setDemission] = useState(false);
  const [competitionHistoire, setCompetitionHistoire] = useState(manager?.division ?? 'top14');
  const [saisonChronologie, setSaisonChronologie] = useState(manager?.saison ?? 1);

  useEffect(() => {
    if (manager && ouvertureSociale) setVue('ovale');
  }, [manager, ouvertureSociale]);
  useEffect(() => {
    if (manager) verifierSucces();
  }, [manager, verifierSucces]);

  const saison = manager?.saison ?? 1;
  const prestige = manager?.prestige ?? 0;
  const libre = manager?.libre ?? false;
  const bancsLibres = useMemo(
    () => clubsAccessibles(prestige, saison, { triche: libre, limite: 60 }),
    [prestige, saison, libre],
  );
  const classement = useMemo(() => {
    if (!manager) return null;
    return classementManagerEnDirect(manager);
  }, [manager]);
  const classementVisible = useMemo(() => {
    const lignes = classement?.classement ?? [];
    if (lignes.length <= 5) return lignes;
    const rang = Math.max(0, lignes.findIndex((l) => l.club === manager?.club));
    const debut = Math.max(0, Math.min(lignes.length - 5, rang - 2));
    return lignes.slice(debut, debut + 5);
  }, [classement, manager?.club]);
  const cibles = useMemo(() => {
    if (!manager?.club) return [];
    return ciblesDuMarche(divisionMarche, manager.saison, manager.club, clubMarche)
      .filter((c) => !poste || c.poste === poste)
      .filter((c) => !recherche.trim()
        || `${c.nom} ${c.club} ${c.nation}`.toLowerCase().includes(recherche.trim().toLowerCase()));
  }, [manager?.club, manager?.saison, divisionMarche, clubMarche, poste, recherche]);
  const effectifBrut = useMemo(
    () => manager?.club ? effectifDuClub(manager.club, manager.saison) : [],
    [manager],
  );
  const avancee = useMemo(
    () => manager ? assurerEtatCarriereAvancee(manager, effectifBrut) : null,
    [manager, effectifBrut],
  );
  const indisponibles = useMemo(
    () => indisponiblesCarriereAvancee(avancee ?? undefined, manager?.semaine ?? 0),
    [avancee, manager?.semaine],
  );
  const afficheMemo = useMemo(
    () => manager ? matchDuClubSemaine(manager) : null,
    [manager],
  );
  const derbyMemo = useMemo(() => {
    if (!manager?.club || !afficheMemo) return null;
    const adversaire = afficheMemo.match.domicile === manager.club
      ? afficheMemo.match.exterieur
      : afficheMemo.match.domicile;
    return contexteDerby(manager.club, adversaire);
  }, [afficheMemo, manager?.club]);
  const penalitesNote = useMemo(() => {
    const medicales = penalitesMedicales(avancee ?? undefined);
    const capitanat = ajustementsCapitaines(avancee?.profonde, effectifBrut);
    return Object.fromEntries([...new Set([...Object.keys(medicales), ...Object.keys(capitanat)])]
      .map((id) => [id, (medicales[id] ?? 0) + (capitanat[id] ?? 0) - (derbyMemo?.motivation ?? 0)]));
  }, [avancee, derbyMemo?.motivation, effectifBrut]);
  const effectif = useMemo(
    () => effectifBrut
      .filter((j) => !indisponibles.includes(j.id))
      .map((j) => ({ ...j, note: Math.max(1, j.note - (penalitesNote[j.id] ?? 0)) })),
    [effectifBrut, indisponibles, penalitesNote],
  );
  const compositionMemo = useMemo(
    () => reconcilerCompositionManager(effectif, manager?.composition),
    [effectif, manager?.composition],
  );
  const detectionJeunes = useMemo(
    () => manager?.club ? tableauDetectionManager(manager) : null,
    [manager],
  );
  const matchSelection = useMemo(() => {
    const selection = avancee?.selection;
    const rencontre = selection?.matchEnAttente;
    if (!manager || !selection || !rencontre) return null;
    return jouerTestMatch(selection.nation, rencontre.adversaire, manager.saison, rencontre.id, null);
  }, [avancee?.selection, manager]);

  if (!manager) return null;

  const sansBanc = !manager.club;
  const fiche = manager.club ? clubParNom(manager.club) : undefined;
  const comp = manager.club ? competitionDuClub(manager.club) : undefined;
  const force = manager.club ? forceEffectif(manager.club, manager.saison) : 0;
  const humeur = humeurDuBoard(manager.confiance);
  const maLigne = classement?.classement.find((l) => l.club === manager.club);
  const sem = semaine(manager.semaine);
  const actives = manager.negociations.filter((n) => n.etat === 'ouverte' || n.etat === 'accord');
  const dossiersClubs = manager.negociationsClubs.filter((n) => n.etat === 'ouverte' || n.etat === 'accord');
  const demandesOuvertes = manager.demandes.filter((d) => d.etat === 'ouverte');
  const alertesOvale = actives.length + dossiersClubs.length + demandesOuvertes.length
    + manager.ventes.reduce((total, vente) => total + vente.offres.length, 0);
  const composition = compositionMemo;
  const afficheManager = afficheMemo;
  const resultatManager = afficheManager ? manager.resultats[afficheManager.cle] : undefined;
  const academieClub = manager.academie.filter((j) => j.clubCentre === manager.club);
  const mentors = effectif.filter((j) => j.age >= 28).sort((a, b) => b.note - a.note);
  const revenusFormationClub = Object.entries(manager.revenusFormation)
    .filter(([cle]) => cle.startsWith(`${manager.club}|`))
    .reduce((somme, [, montant]) => somme + montant, 0);
  const objectifsAvances = avancee?.objectifs ?? [];
  const discussionsOuvertes = avancee?.discussions.filter((d) => d.etat === 'ouverte') ?? [];
  const dossiersMedicaux = avancee?.medical.filter((d) => d.semaines > 0) ?? [];
  const convocationsActives = avancee?.convocations.filter((c) => manager.semaine >= c.debut && manager.semaine <= c.fin) ?? [];
  const rivalitesClub = rivalitesDe(avancee?.rivalites ?? [], manager.club);
  const identiteClub = avancee?.identites[manager.club];
  const hallClub = hallOfFameDe(avancee?.carrieresJoueurs ?? [], manager.club);
  const archiveVisible = avancee?.histoire[competitionHistoire] ?? [];
  const selectionManager = avancee?.selection;
  const rencontreSelection = selectionManager?.matchEnAttente;
  const profonde = avancee?.profonde;
  const vieProfonde = vieClubProfonde(profonde, manager.club);
  const etatsComposition = new Map<string, EtatDuJoueur>();
  for (const dossier of dossiersMedicaux) {
    etatsComposition.set(dossier.joueurId, {
      condition: dossier.disponibilite,
      blesse: dossier.semaines > 0,
    });
  }
  for (const convocation of convocationsActives) {
    etatsComposition.set(convocation.joueurId, {
      ...etatsComposition.get(convocation.joueurId),
      enSelection: true,
    });
  }
  const automatismesComposition = profonde ? Object.fromEntries(
    SECTEURS_COHESION.map((secteur) => {
      let total = 0;
      let poids = 0;
      composition.titulaires.forEach((id, index) => {
        const integration = profonde.integrations[id];
        const posteAligne = POSTES_XV_MANAGER[index];
        if (!integration || !posteAligne) return;
        const p = poidsDansSecteur(posteAligne, secteur);
        total += integration.cohesion * p;
        poids += p;
      });
      return [secteur, Math.round(poids > 0 ? total / poids : 45)];
    }),
  ) as Automatismes : undefined;
  const decisionStrategique = profonde?.decisionsStrategiques.find((d) => !d.choisie);
  const saisonsMemoire = saisonsChronologie(profonde);
  const chronologieVisible = profonde?.chronologie.filter((e) => e.saison === saisonChronologie).sort((a, b) => a.semaine - b.semaine) ?? [];
  const changerJoueur = (zone: 'titulaires' | 'remplacants', index: number, joueurId: string) => {
    const suivante: CompositionManager = {
      ...composition,
      titulaires: [...composition.titulaires],
      remplacants: [...composition.remplacants],
    };
    const ancien = suivante[zone][index];
    for (const autreZone of ['titulaires', 'remplacants'] as const) {
      const autreIndex = suivante[autreZone].indexOf(joueurId);
      if (autreIndex >= 0) suivante[autreZone][autreIndex] = ancien;
    }
    suivante[zone][index] = joueurId;
    if (suivante.capitaineId === ancien && zone === 'titulaires') suivante.capitaineId = joueurId;
    if (suivante.buteurId === ancien) suivante.buteurId = joueurId;
    definirComposition(suivante);
  };

  const majTactique = <K extends keyof TactiqueManager>(cle: K, valeur: TactiqueManager[K]) => {
    definirTactique({ ...manager.tactique, [cle]: valeur });
  };

  const optionsBancs: OptionSelecteur[] = bancsLibres.map((c) => ({
    valeur: c.club.nom,
    label: c.club.nom,
    sous: t('mgr.banc.sous', {
      competition: c.competition.nom, force: c.force.toFixed(1), objectif: c.objectif,
      salaire: nombre(salaireManager(c.force)),
    }),
    vignette: <Blason club={c.club} taille={22} />,
  }));
  const optionsDivisions: OptionSelecteur[] = COMPETITIONS.map((c) => ({
    valeur: c.id, label: c.nom, sous: `${c.pays} · ${c.clubs.length} ${t('mgr.clubs')}`,
    vignette: <LogoCompet id={c.id} emoji={c.emoji} taille={22} />,
  }));
  const competitionMarche = COMPETITIONS.find((c) => c.id === divisionMarche);
  const optionsClubs: OptionSelecteur[] = [
    { valeur: '', label: t('mgr.marche.tousClubs'), sous: t('mgr.marche.selectionMondiale') },
    ...(competitionMarche?.clubs ?? []).map((c) => ({
      valeur: c.nom, label: c.nom, vignette: <Blason club={c} taille={20} />,
    })),
  ];
  const optionsPostes: OptionSelecteur[] = [
    { valeur: '', label: t('mgr.marche.tousPostes') },
    ...POSTES.map((p) => ({ valeur: p.id, label: nomPoste(p.id), sous: `n° ${p.numero}` })),
  ];

  return (
    <motion.section className="carriere-manager" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <header className="manager-entete">
        <div>
          <div className="eyebrow">
            {libre ? t('mgr.modeLibre') : t('mgr.carriere')}
            {' · '}{t('gen.saison').toLowerCase()} {manager.saison}
            {!sansBanc && ` · ${libelleSemaine(sem, manager.saison)}`}
          </div>
          <h1>🧑‍🏫 {manager.nom}</h1>
        </div>
        {!sansBanc && fiche && (
          <div className="manager-identite-club">
            <Blason club={fiche} taille={42} />
            <span><b>{manager.club}</b><small>{manager.divisionNom}</small></span>
          </div>
        )}
      </header>

      {sansBanc ? (
        <div className="carte manager-sans-banc">
          <h2>{t('mgr.sansClub')}</h2>
          <p>{t('mgr.sansClubTexte', {
            prestige: manager.prestige.toFixed(0), note: noteMaximale(manager.prestige).toFixed(0),
            niveau: etageAccessible(manager.prestige)?.nom ?? t('mgr.amateur'),
          })}</p>
          <div className="champ">
            <label htmlFor="banc">{t('mgr.bancsPortee', { n: bancsLibres.length })}</label>
            <Selecteur id="banc" options={optionsBancs} valeur={clubVise || optionsBancs[0]?.valeur || ''} onChange={setClubVise} recherche />
          </div>
          <button className="btn primaire grand" disabled={!optionsBancs.length} onClick={() => signerBanc(clubVise || optionsBancs[0].valeur)}>
            ✍️ {t('mgr.signer')}
          </button>
        </div>
      ) : (
        <>
          <nav className="manager-onglets" aria-label={t('mgr.navigation')}>
            <button className={vue === 'bureau' ? 'actif' : ''} onClick={() => setVue('bureau')}>🏟️ Club</button>
            <button className={vue === 'equipe' ? 'actif' : ''} onClick={() => setVue('equipe')}>👥 Composition</button>
            <button className={vue === 'match' ? 'actif' : ''} onClick={() => setVue('match')}>
              🎮 Match {afficheManager && !resultatManager && <i>1</i>}
            </button>
            <button className={vue === 'marche' ? 'actif' : ''} onClick={() => setVue('marche')}>🌍 {t('mgr.marche')}</button>
            <button className={vue === 'ovale' ? 'actif' : ''} onClick={() => { setVue('ovale'); ouvrirMessages(); }}>
              𝕏 L’Ovale {alertesOvale > 0 && <i>{alertesOvale}</i>}
            </button>
            <button className={vue === 'formation' ? 'actif' : ''} onClick={() => setVue('formation')}>🎓 Formation</button>
            <button className={vue === 'recruteurs' ? 'actif' : ''} onClick={() => setVue('recruteurs')}>
              🔎 Recruteurs {rapportsFrais > 0 && <i>{rapportsFrais}</i>}
            </button>
            <button className={vue === 'entrainement' ? 'actif' : ''} onClick={() => setVue('entrainement')}>🏋️ Entraînement</button>
            <button className={vue === 'direction' ? 'actif' : ''} onClick={() => setVue('direction')}>
              🏛️ Direction {objectifsAvances.some((o) => o.etat === 'echoue') && <i>!</i>}
            </button>
            <button className={vue === 'vestiaire' ? 'actif' : ''} onClick={() => setVue('vestiaire')}>
              🗣️ Vestiaire {(discussionsOuvertes.length + dossiersMedicaux.filter((d) => d.decision === 'attente').length) > 0 && <i>{discussionsOuvertes.length + dossiersMedicaux.filter((d) => d.decision === 'attente').length}</i>}
            </button>
            <button className={vue === 'univers' ? 'actif' : ''} onClick={() => setVue('univers')}>📰 Monde</button>
            <button className={vue === 'histoire' ? 'actif' : ''} onClick={() => setVue('histoire')}>📚 Histoire</button>
          </nav>

          {vue === 'bureau' && (
            <div className="manager-bureau">
              <section className="carte manager-club-resume">
                <div className="manager-club-resume-identite">
                  {fiche && <Blason club={fiche} taille={62} />}
                  <div>
                    <div className="eyebrow">Tableau de bord · saison {manager.saison}</div>
                    <h2>{manager.club}</h2>
                    <p>{comp && <LogoCompet id={comp.id} emoji={comp.emoji} taille={19} />} {manager.divisionNom} · {humeur.texte}</p>
                  </div>
                </div>
                <div className="manager-resume-actions">
                  <button className="btn fantome" onClick={() => setEcran('effectif')}>👥 Effectif</button>
                  <button className="btn fantome" onClick={() => { setVue('ovale'); ouvrirMessages(); }}>𝕏 L’Ovale</button>
                  <button className="btn primaire" onClick={() => {
                    if (afficheManager && !resultatManager) setVue('match'); else semaineManager();
                  }}>
                    {afficheManager && !resultatManager ? '🎮 Coacher le match' : '▶ Semaine suivante'}
                  </button>
                </div>
              </section>

              <section className="manager-kpis" aria-label="Informations importantes du club">
                <article className="carte"><small>Classement</small><b>{maLigne ? `${maLigne.position}e` : '—'}</b><span>{maLigne?.points ?? 0} points</span></article>
                <article className="carte"><small>Objectif du board</small><b>{manager.objectif}e</b><span>{maLigne && maLigne.position <= manager.objectif ? 'Objectif tenu' : 'À rattraper'}</span></article>
                <article className="carte"><small>Force du groupe</small><b>{force.toFixed(1)}</b><span>{effectif.length} joueurs</span></article>
                <article className="carte"><small>Confiance</small><b>{Math.round(manager.confiance)}%</b><span>{humeur.texte}</span></article>
                <article className="carte"><small>Budget transferts</small><b>{nombre(manager.budgetTransferts)} €</b><span>{nombre(manager.budgetSalarial)} € salarial</span></article>
                <article className="carte"><small>Structures</small><b>{nombre(manager.budgetStructure)} €</b><span>Formation {murs.formation}/4 · Recrutement {murs.recrutement}/4 · Entraînement {murs.entrainement}/4</span></article>
              </section>

              <section className="carte manager-classement-complet">
                <div className="comp-tete">
                  <div><b>📊 Course au classement · {manager.divisionNom}</b><small>Les cinq clubs autour du tien</small></div>
                  <button onClick={() => setEcran('tableau')}>Classement complet</button>
                </div>
                <div className="manager-table-classement" role="region" aria-label={`Classement ${manager.divisionNom}`} tabIndex={0}>
                  <table>
                    <thead><tr><th>#</th><th>Club</th><th>J</th><th>G</th><th>N</th><th>P</th><th>+/-</th><th>Pts</th></tr></thead>
                    <tbody>
                      {classementVisible.map((l) => {
                        const club = clubParNom(l.club);
                        return (
                          <tr key={l.club} className={l.club === manager.club ? 'moi' : ''}>
                            <td>{l.position}</td>
                            <th scope="row"><span>{club && <Blason club={club} taille={27} />}<b>{l.club}</b></span></th>
                            <td>{l.joues}</td><td>{l.gagnes}</td><td>{l.nuls}</td><td>{l.perdus}</td>
                            <td className={l.difference >= 0 ? 'positif' : 'negatif'}>{l.difference > 0 ? '+' : ''}{l.difference}</td>
                            <td><strong>{l.points}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="manager-bureau-bas">
                <article className="carte manager-prochain-match">
                  <div className="comp-tete"><b>🏉 Prochaine échéance</b></div>
                  {afficheManager ? (
                    <div className="manager-mini-duel">
                      <span>{afficheManager.match.domicile}</span><strong>{resultatManager ? `${afficheManager.match.scoreD} – ${afficheManager.match.scoreE}` : 'VS'}</strong><span>{afficheManager.match.exterieur}</span>
                    </div>
                  ) : <p>Aucun match cette semaine : récupération et préparation.</p>}
                </article>
                <article className="carte manager-journal">
                  <div className="comp-tete"><b>📜 {t('mgr.journal')}</b></div>
                  <div className="journal">{[...journal].reverse().slice(0, 3).map((e) => <div key={e.id} className="entree"><b>{e.titre}</b><p>{e.texte}</p></div>)}</div>
                </article>
              </section>
            </div>
          )}

          {vue === 'direction' && avancee && (
            <div className="manager-avance-grille">
              <section className="carte avance-entete">
                <div><div className="eyebrow">Conseil d’administration · saison {manager.saison}</div><h2>🏛️ Attentes et avenir du manager</h2><p>Les objectifs sont pondérés selon les moyens du club. Ils nourrissent la confiance, les offres reçues et le risque de licenciement.</p></div>
                <div className={`avance-score ${manager.confiance < CONFIANCE_LICENCIEMENT + 12 ? 'danger' : ''}`}><b>{Math.round(manager.confiance)}</b><span>confiance</span></div>
              </section>

              {decisionStrategique && <section className="carte decision-strategique-manager">
                <div className="eyebrow">Décision pluriannuelle · {decisionStrategique.choix[0]?.duree ?? 3} saisons</div>
                <h2>⚖️ {decisionStrategique.titre}</h2><p>{decisionStrategique.texte}</p>
                <div>{decisionStrategique.choix.map((choix) => <button key={choix.id} onClick={() => repondreDecisionStrategique(decisionStrategique.id, choix.id)}><b>{choix.label}</b><span>{choix.consequence}</span><small>Direction {choix.confianceDirection >= 0 ? '+' : ''}{choix.confianceDirection} · Supporters {choix.confianceSupporters >= 0 ? '+' : ''}{choix.confianceSupporters}</small></button>)}</div>
              </section>}

              <section className="avance-objectifs">
                {objectifsAvances.map((objectif) => {
                  const pct = objectif.categorie === 'sportif'
                    ? Math.min(100, Math.max(0, ((objectif.cible - (maLigne?.position ?? objectif.cible + 3) + 3) / 3) * 100))
                    : Math.min(100, objectif.progression / Math.max(1, objectif.cible) * 100);
                  return <article className={`carte objectif-board ${objectif.etat}`} key={objectif.id}>
                    <header><span>{objectif.categorie}</span><b>{'★'.repeat(objectif.importance)}{'☆'.repeat(3 - objectif.importance)}</b></header>
                    <h3>{objectif.titre}</h3><p>{objectif.detail}</p>
                    <i><em style={{ width: `${pct}%` }} /></i><small>{objectif.etat === 'enCours' ? `${Math.round(pct)} %` : objectif.etat === 'reussi' ? '✓ Réussi' : '✕ Manqué'}</small>
                  </article>;
                })}
              </section>

              {profonde && <section className="carte delegation-manager">
                <div className="comp-tete"><div><b>🧑‍💼 Répartition des responsabilités</b><small>Tu peux tout contrôler ou laisser le directeur sportif agir selon ses vraies compétences.</small></div><span className="comp-count">{DOMAINES_DELEGATION.filter((d) => profonde.delegations[d]).length}/9</span></div>
                <div className="delegation-contenu">
                  <div className="fiche-directeur-sportif"><div><span>Directeur sportif</span><h3>{profonde.directeurSportif.nom}</h3><small>Réputation {profonde.directeurSportif.reputation} · {nombre(profonde.directeurSportif.salaire)} €/an</small></div><div>{[
                    ['Évaluation', profonde.directeurSportif.evaluation], ['Recrutement', profonde.directeurSportif.recrutement], ['Négociation', profonde.directeurSportif.negociation], ['Formation', profonde.directeurSportif.formation], ['Staff', profonde.directeurSportif.gestionStaff], ['Tactique', profonde.directeurSportif.tactique],
                  ].map(([label, valeur]) => <label key={String(label)}><span>{label}</span><i><em style={{ width: `${valeur}%` }} /></i><b>{valeur}</b></label>)}</div></div>
                  <div className="grille-delegations">{DOMAINES_DELEGATION.map((domaine) => <label key={domaine} className={profonde.delegations[domaine] ? 'delegue' : ''}><input type="checkbox" checked={profonde.delegations[domaine]} onChange={(e) => configurerDelegation(domaine, e.target.checked)} /><span><b>{LIBELLES_DELEGATION[domaine]}</b><small>{profonde.delegations[domaine] ? `Délégué à ${profonde.directeurSportif.nom}` : 'Géré par toi'}</small></span></label>)}</div>
                </div>
                {!!profonde.decisionsDeleguees.length && <div className="journal-delegations">{profonde.decisionsDeleguees.slice().reverse().slice(0, 5).map((d) => <article key={d.id} className={d.qualite}><span>{d.qualite === 'bonne' ? '✓' : d.qualite === 'mauvaise' ? '!' : '•'}</span><div><b>{d.titre}</b><small>S{d.saison} · semaine {d.semaine} · score {d.score}</small><p>{d.detail}</p></div></article>)}</div>}
              </section>}

              {vieProfonde && <section className="carte politique-club-manager">
                <div className="president-manager"><div className="eyebrow">Président {vieProfonde.president.type}</div><h3>{vieProfonde.president.nom}</h3><p>Depuis la saison {vieProfonde.president.depuis}. Sa personnalité change les priorités, la patience et les investissements du club.</p><div>{[['Patience', vieProfonde.president.patience], ['Ambition', vieProfonde.president.ambition], ['Finances', vieProfonde.president.finances], ['Formation', vieProfonde.president.formation], ['Local', vieProfonde.president.localisme]].map(([label, valeur]) => <span key={String(label)}><small>{label}</small><b>{valeur}</b></span>)}</div></div>
                <div className="confiances-club"><h3>Deux confiances distinctes</h3><div><span><small>Direction</small><b>{Math.round(manager.confiance)}</b></span><span className={(vieProfonde.supporters.confiance < 45 ? 'danger' : '')}><small>Supporters</small><b>{vieProfonde.supporters.confiance}</b></span></div><ul>{vieProfonde.supporters.motifs.slice(0, 4).map((motif, index) => <li key={`${motif.saison}-${motif.semaine}-${index}`} className={motif.delta >= 0 ? 'positif' : 'negatif'}>{motif.delta >= 0 ? '✓' : '✕'} {motif.texte} <b>{motif.delta >= 0 ? '+' : ''}{motif.delta}</b></li>)}</ul></div>
              </section>}

              <section className="carte direction-contrat">
                <div><div className="eyebrow">Contrat personnel</div><h3>{manager.contrat?.saisons ?? 0} saison(s) · {nombre(manager.contrat?.salaire ?? 0)} €/an</h3><p>Une prolongation dépend de tes résultats, de ta réputation et de la confiance du président.</p></div>
                <div><button className="btn fantome" onClick={negocierContrat}>Négocier une prolongation</button><button className="btn danger" onClick={() => setDemission(true)}>Démissionner</button></div>
              </section>

              <section className="carte direction-marche-coachs">
                <div className="comp-tete"><div><b>📨 Marché des entraîneurs</b><small>Les postes changent dans toutes les divisions, même sans ton intervention.</small></div><span className="comp-count">{avancee.offresBanc.filter((o) => o.statut === 'offre').length}</span></div>
                <div className="direction-candidature">
                  <Selecteur options={optionsBancs.filter((o) => o.valeur !== manager.club)} valeur={clubVise || optionsBancs.find((o) => o.valeur !== manager.club)?.valeur || ''} onChange={setClubVise} recherche />
                  <button className="btn fantome" onClick={() => postulerBanc(clubVise || optionsBancs.find((o) => o.valeur !== manager.club)?.valeur || '')}>Envoyer ma candidature</button>
                </div>
                <div className="offres-coachs">
                  {avancee.offresBanc.slice().reverse().slice(0, 8).map((offre) => <article key={offre.id}>
                    <span><b>{offre.club}</b><small>{COMPETITIONS.find((c) => c.id === offre.division)?.nom ?? offre.division} · {nombre(offre.salaire)} € · {offre.duree} ans</small></span>
                    {offre.statut === 'offre' ? <button onClick={() => accepterOffreBanc(offre.id)}>Accepter le banc</button> : <em>{offre.statut === 'refusee' ? 'Candidature refusée' : offre.statut}</em>}
                  </article>)}
                  {!avancee.offresBanc.length && <p className="manager-vide-texte">Aucune approche pour l’instant. Une candidature reste possible.</p>}
                </div>
              </section>

              {(avancee.propositionSelection || selectionManager) && <section className="carte direction-selection">
                <div className="comp-tete"><div><b>🌐 Carrière internationale</b><small>Réputation distincte de la réputation en club.</small></div></div>
                {avancee.propositionSelection && <div className="proposition-selection"><h3>{avancee.propositionSelection.nation} te propose le poste</h3><p>Le cumul avec ton club est autorisé. Tournées, tournoi continental et Coupe du monde feront évoluer ta réputation internationale.</p><div><button className="btn primaire" onClick={() => repondreSelection(true)}>Accepter</button><button className="btn fantome" onClick={() => repondreSelection(false)}>Refuser</button></div></div>}
                {selectionManager && <div className="selection-manager-kpis"><span><small>Sélection</small><b>{selectionManager.nation}</b></span><span><small>Réputation</small><b>{selectionManager.reputation}</b></span><span><small>Matchs</small><b>{selectionManager.matchs}</b></span><span><small>Victoires</small><b>{selectionManager.victoires}</b></span>{rencontreSelection && <button className="btn primaire" onClick={() => setMatchSelectionOuvert(true)}>Coacher contre {rencontreSelection.adversaire}</button>}</div>}
              </section>}
            </div>
          )}

          {vue === 'vestiaire' && avancee && (
            <div className="manager-avance-grille">
              <section className="carte avance-entete"><div><div className="eyebrow">Hiérarchie, personnalités et parole donnée</div><h2>🗣️ Un vestiaire qui se souvient</h2><p>Les leaders diffusent leur soutien ou leur colère. Le temps de jeu réel, les résultats et tes réponses font le reste.</p></div><div className="avance-score"><b>{moyenneVestiaire(avancee)}</b><span>satisfaction</span></div></section>

              {profonde && <section className="carte capitaines-manager">
                <div className="comp-tete"><div><b>©️ Conseil des capitaines</b><small>Leadership, expérience, ancienneté, respect, sang-froid et discipline rendent le brassard crédible — ou contesté.</small></div></div>
                <div>{[
                  ['Capitaine', profonde.capitaines.capitaineId || manager.composition.capitaineId, (id: string) => definirHierarchieCapitaines(id, profonde.capitaines.viceCapitaineId, profonde.capitaines.troisiemeCapitaineId)],
                  ['Vice-capitaine', profonde.capitaines.viceCapitaineId, (id: string) => definirHierarchieCapitaines(profonde.capitaines.capitaineId || manager.composition.capitaineId, id, profonde.capitaines.troisiemeCapitaineId)],
                  ['3e capitaine', profonde.capitaines.troisiemeCapitaineId, (id: string) => definirHierarchieCapitaines(profonde.capitaines.capitaineId || manager.composition.capitaineId, profonde.capitaines.viceCapitaineId, id)],
                ].map(([label, valeur, changer]) => <label key={String(label)}><span>{String(label)}</span><select value={String(valeur)} onChange={(e) => (changer as (id: string) => void)(e.target.value)}><option value="">Non désigné</option>{effectifBrut.map((j) => <option key={j.id} value={j.id}>{j.nom} · {j.age} ans · {nomPoste(j.poste)}</option>)}</select></label>)}</div>
              </section>}

              {!!discussionsOuvertes.length && <section className="discussions-joueurs">
                {discussionsOuvertes.map((discussion) => <article className="carte discussion-joueur" key={discussion.id}><header><span>💬 {discussion.nom}</span><em>{discussion.type}</em></header><blockquote>{discussion.texte}</blockquote><div><button onClick={() => repondreDiscussion(discussion.id, 'promettre')}>Je vais te donner ta chance</button><button onClick={() => repondreDiscussion(discussion.id, 'merite')}>Montre-moi davantage</button><button onClick={() => repondreDiscussion(discussion.id, 'aucunePromesse')}>Je ne promets rien</button><button className="danger" onClick={() => repondreDiscussion(discussion.id, 'ecarter')}>Tu n’entres pas dans mes plans</button></div></article>)}
              </section>}

              <section className="carte hierarchie-vestiaire">
                <div className="comp-tete"><div><b>👥 Hiérarchie interne</b><small>Les profils ne sont pas de simples étiquettes : ils modifient les réactions.</small></div></div>
                <div>{Object.values(avancee.vestiaire).sort((a, b) => ['leader', 'influent', 'groupe', 'nouveau'].indexOf(a.rang) - ['leader', 'influent', 'groupe', 'nouveau'].indexOf(b.rang) || b.satisfaction - a.satisfaction).map((profil) => {
                  const agent = joueurAgent(avancee, profil.joueurId);
                  return <article key={profil.joueurId}><span className={`rang-vestiaire ${profil.rang}`}>{profil.rang}</span><b>{profil.nom}</b><small>{profil.traits.join(' · ')}</small><i><em style={{ width: `${profil.satisfaction}%` }} /></i><strong>{profil.satisfaction}</strong><span>{profil.soutien ? '🤝 Soutien' : '⚠ Mécontent'}</span><small>{agent ? `Agent : ${agent.nom} · relation ${agent.relationManager}` : ''}</small></article>;
                })}</div>
              </section>

              {profonde && <section className="carte relations-joueurs-manager">
                <div className="comp-tete"><div><b>🔗 Relations entre joueurs</b><small>Amitié, respect, rivalité, mentorat, conflit et famille continuent d’exister sans passer par le manager.</small></div><span className="comp-count">{profonde.relations.length}</span></div>
                <div>{profonde.relations.filter((r) => effectifBrut.some((j) => j.id === r.joueurA) && effectifBrut.some((j) => j.id === r.joueurB)).slice(0, 18).map((relation) => { const a = effectifBrut.find((j) => j.id === relation.joueurA); const b = effectifBrut.find((j) => j.id === relation.joueurB); return <article key={relation.id} className={relation.type}><span><b>{a?.nom}</b><i>↔</i><b>{b?.nom}</b></span><em>{relation.type}</em><div><i><em style={{ width: `${relation.intensite}%` }} /></i><strong>{relation.intensite}</strong></div></article>; })}</div>
              </section>}

              {profonde && <section className="carte integration-joueurs-manager">
                <div className="comp-tete"><div><b>🌐 Adaptation et projets de vie</b><small>Compatriotes, langue et adaptabilité accélèrent l’intégration. L’argent ne suffit pas toujours à retenir un joueur.</small></div></div>
                <div className="table-integration-entete"><span>Joueur</span><span>Pays</span><span>Club</span><span>Langue</span><span>Cohésion</span><span>Projet</span></div>
                {effectifBrut.map((j) => profonde.integrations[j.id]).filter(Boolean).sort((a, b) => a.cohesion - b.cohesion).slice(0, 20).map((integration) => <article key={integration.joueurId}><span><b>{integration.nom}</b><small>{nomNation(integration.nation)} · adaptabilité {integration.adaptabilite}</small></span>{[
                  integration.adaptationPays, integration.adaptationClub, integration.langue, integration.cohesion,
                ].map((valeur, index) => <div key={index}><i><em style={{ width: `${valeur}%` }} /></i><b>{valeur}</b></div>)}<em>{integration.ambitionRevelee ? integration.ambition.replace(/([A-Z])/g, ' $1').toLowerCase() : 'Ambition encore cachée'}<small>{integration.preferenceAvenir !== 'indecis' ? ` · préfère ${integration.preferenceAvenir}` : ''}</small></em></article>)}
              </section>}

              <section className="carte promesses-manager">
                <div className="comp-tete"><div><b>🤞 Promesses</b><small>Une promesse respectée construit la relation ; une parole rompue atteint aussi l’agent.</small></div><span className="comp-count">{avancee.promesses.filter((p) => p.etat === 'active').length}</span></div>
                {avancee.promesses.slice().reverse().slice(0, 12).map((p) => <article key={p.id} className={p.etat}><span><b>{p.nom}</b><small>{p.type} · échéance semaine {p.echeance}</small></span><progress value={p.progression} max={p.objectif} /><strong>{p.progression}/{p.objectif}</strong><em>{p.etat}</em></article>)}
                {!avancee.promesses.length && <p className="manager-vide-texte">Aucune parole formelle donnée.</p>}
              </section>

              <section className="carte infirmerie-manager">
                <div className="comp-tete"><div><b>🩺 Décisions médicales</b><small>Disponibilité, douleur et risque d’aggravation sont séparés.</small></div><span className="comp-count">{dossiersMedicaux.length}</span></div>
                {dossiersMedicaux.map((d) => <article key={d.id}><header><span><b>{d.nom}</b><small>{d.type} · {d.semaines} semaine(s)</small></span><strong>{d.disponibilite}% disponible</strong></header><p>Douleur {d.douleur}/100 · risque d’aggravation {d.risqueAggravation}%{d.penalitePerformance > 0 && ` · performance −${d.penalitePerformance}`}</p>{d.decision === 'attente' ? <div><button onClick={() => deciderMedical(d.id, 'repos')}>Repos · aucun match</button><button onClick={() => deciderMedical(d.id, 'traitement')}>Traitement · 80%</button><button className="danger" onClick={() => deciderMedical(d.id, 'forcer')}>Forcer · 90%</button></div> : <em>Décision : {d.decision}</em>}</article>)}
                {!dossiersMedicaux.length && <p className="manager-vide-texte">Infirmerie vide.</p>}
              </section>

              {!!convocationsActives.length && <section className="carte convocations-manager"><div className="comp-tete"><b>🌐 Absents en sélection</b></div>{convocationsActives.map((c) => <p key={c.id}><b>{c.nom}</b> · {c.nation} · {c.competition}</p>)}</section>}
            </div>
          )}

          {vue === 'univers' && avancee && (
            <div className="manager-avance-grille univers-manager">
              <section className="carte avance-entete"><div><div className="eyebrow">Le monde continue sans toi</div><h2>📰 Actualités issues de la sauvegarde</h2><p>Résultats, blessures, sélections, finances et changements d’entraîneur viennent des systèmes de jeu, jamais d’un tirage décoratif.</p></div><div className="avance-score"><b>{avancee.actualites.length}</b><span>faits mémorisés</span></div></section>
              {profonde && <section className="carte profil-tactique-manager"><div className="comp-tete"><div><b>🧠 Ton identité d’entraîneur</b><small>Elle se construit sur les consignes réellement utilisées en match et influence les clubs prêts à te recruter.</small></div><span className="comp-count">{profonde.profilManager.matchsObserves} matchs</span></div><div className="tags-manager">{profonde.tagsManager.map((tag) => <strong key={tag}>🏷️ {tag}</strong>)}{!profonde.tagsManager.length && <small>Les premiers tags apparaîtront quand ton style deviendra lisible.</small>}</div><div className="axes-profil-manager">{[
                ['Jeu au large', profonde.profilManager.jeuAuLarge], ['Jeu au pied', profonde.profilManager.jeuAuPied], ['Possession', profonde.profilManager.possession], ['Rythme', profonde.profilManager.rythme], ['Défense agressive', profonde.profilManager.defenseAgressive], ['Conquête', profonde.profilManager.conquete],
              ].map(([label, valeur]) => <label key={String(label)}><span>{label}</span><i><em style={{ width: `${valeur}%` }} /></i><b>{valeur}</b></label>)}</div></section>}

              {vieProfonde && <section className="carte reputation-club-manager"><div className="comp-tete"><div><b>📣 Réputation et publics</b><small>Être immense localement ne signifie pas encore être connu à l’étranger.</small></div></div><div className="trois-reputations"><span><small>Locale</small><b>{vieProfonde.reputations.locale}</b></span><span><small>Nationale</small><b>{vieProfonde.reputations.nationale}</b></span><span><small>Internationale</small><b>{vieProfonde.reputations.internationale}</b></span></div><div className="profils-supporters">{Object.entries(vieProfonde.supporters.profils).map(([profil, part]) => <label key={profil}><span>{profil}</span><i><em style={{ width: `${part}%` }} /></i><b>{part}%</b></label>)}</div></section>}

              {vieProfonde && <section className="carte marketing-joueurs-manager"><div className="comp-tete"><div><b>⭐ Niveau sportif ≠ valeur culturelle</b><small>Popularité et marketing rapportent maillots, sponsors, réseaux et affluence. Dernière saison : {nombre(vieProfonde.revenuMarketingDerniereSaison)} €.</small></div></div><div>{Object.values(vieProfonde.popularites).sort((a, b) => b.locale - a.locale).slice(0, 16).map((p) => { const joueur = effectifBrut.find((j) => j.id === p.joueurId); return <article key={p.joueurId}><span><b>{p.nom}</b><small>Général {joueur?.note ?? '—'}</small></span><label><small>Local</small><b>{p.locale}</b></label><label><small>National</small><b>{p.nationale}</b></label><label><small>International</small><b>{p.internationale}</b></label><strong>Marketing {p.marketing}</strong></article>; })}</div></section>}
              <section className="carte fil-actualites-manager"><div className="comp-tete"><b>Fil d’actualité</b></div>{avancee.actualites.slice().reverse().slice(0, 30).map((actu) => <article key={actu.id} className={`importance-${actu.importance}`}><span>{actu.categorie}</span><div><b>{actu.titre}</b><p>{actu.texte}</p><small>S{actu.saison} · semaine {actu.semaine}{actu.club && ` · ${actu.club}`}</small></div></article>)}{!avancee.actualites.length && <p className="manager-vide-texte">La saison vient de commencer. Les vrais événements apparaîtront ici.</p>}</section>

              {identiteClub && <section className="carte adn-club"><div className="comp-tete"><div><b>🧬 ADN de {manager.club}</b><small>Il faut plusieurs saisons cohérentes pour le transformer.</small></div></div><div className="traits-adn">{traitsDominants(identiteClub).map((axe) => <strong key={axe}>{axe}</strong>)}</div><div className="axes-adn">{Object.entries(identiteClub).map(([axe, valeur]) => <label key={axe}><span>{axe}</span><i><em style={{ width: `${valeur}%` }} /></i><b>{Math.round(valeur)}</b></label>)}</div></section>}

              <section className="carte rivalites-manager"><div className="comp-tete"><div><b>⚔️ Rivalités dynamiques</b><small>Les matchs serrés, finales, luttes et transferts les nourrissent lentement.</small></div></div>{rivalitesClub.map((r) => { const autre = r.clubs.find((c) => c !== manager.club); return <article key={r.clubs.join('-')}><span><b>{manager.club} — {autre}</b><small>{r.causes.join(' · ') || 'proximité et histoire en construction'}</small></span><i><em style={{ width: `${r.intensite}%` }} /></i><strong>{Math.round(r.intensite)}/100</strong></article>; })}{!rivalitesClub.length && <p className="manager-vide-texte">Aucune rivalité n’a encore franchi le seuil public de 20/100.</p>}</section>

              <section className="carte monde-clubs-manager"><div className="comp-tete"><div><b>🌍 Clubs et entraîneurs IA</b><small>Richesse, infrastructures, stratégie et carrière du coach évoluent chaque été.</small></div><span className="comp-count">{Object.keys(avancee.clubsMonde).length}</span></div><div>{Object.values(avancee.clubsMonde).sort((a, b) => Math.abs(b.tendance) - Math.abs(a.tendance)).slice(0, 18).map((club) => { const coach = avancee.entraineursIA[club.entraineurId]; return <article key={club.club}><span><b>{club.club}</b><small>{club.strategie} · {club.professionnel ? 'pro' : 'amateur/semi-pro'}</small></span><strong className={club.tendance >= 0 ? 'cl-plus' : 'cl-moins'}>{club.tendance > 0 ? '+' : ''}{club.tendance}</strong><small>💶 {club.richesse} · 🏗️ {club.infrastructures}</small><em>{coach?.nom} · contrat {coach?.contrat ?? 0} an(s)</em></article>; })}</div></section>
            </div>
          )}

          {vue === 'histoire' && avancee && (
            <div className="manager-avance-grille histoire-manager">
              <section className="carte avance-entete"><div><div className="eyebrow">Aucune saison ne disparaît</div><h2>📚 Mémoire de la sauvegarde</h2><p>Palmarès des compétitions, carrières saison par saison, anciens joueurs, Hall of Fame et reconversions restent consultables.</p></div><div className="avance-score"><b>{Object.values(avancee.histoire).reduce((n, s) => n + s.length, 0)}</b><span>saisons archivées</span></div></section>
              {profonde && <section className="carte chronologie-annuelle-manager"><div className="comp-tete"><div><b>🗓️ L’année en événements</b><small>Transferts, licenciements, sélections, records, titres, retraites et décisions majeures restent consultables saison par saison.</small></div><select value={saisonChronologie} onChange={(e) => setSaisonChronologie(Number(e.target.value))}><option value={manager.saison}>Saison {manager.saison}</option>{saisonsMemoire.filter((s) => s !== manager.saison).map((s) => <option key={s} value={s}>Saison {s}</option>)}</select></div><div>{chronologieVisible.map((evenement) => <article key={evenement.id} className={`importance-${evenement.importance}`}><time>{evenement.mois}</time><span>{evenement.categorie}</span><div><b>{evenement.titre}</b><p>{evenement.texte}</p></div></article>)}{!chronologieVisible.length && <p className="manager-vide-texte">Aucun événement majeur enregistré pour cette saison. Les faits ordinaires restent dans le journal du club.</p>}</div></section>}

              {vieProfonde && <section className="carte records-club-manager"><div className="comp-tete"><div><b>🏆 Records de {manager.club}</b><small>Ils sont recalculés après chaque match et une notification marque chaque nouveau sommet.</small></div><span className="comp-count">{Object.keys(vieProfonde.records.club).length}</span></div><div>{Object.values(vieProfonde.records.club).map((record) => <article key={record.id}><span><b>{record.libelle}</b><small>{record.joueurNom || record.adversaire || `Saison ${record.saison}`}</small></span><strong>{record.valeur.toLocaleString('fr-FR')} {record.unite}</strong></article>)}{!Object.keys(vieProfonde.records.club).length && <p className="manager-vide-texte">Le premier match joué ouvrira le livre des records.</p>}</div><h3>Records du championnat</h3><div>{Object.values(vieProfonde.records.championnat).map((record) => <article key={record.id}><span><b>{record.libelle}</b><small>Saison {record.saison}</small></span><strong>{record.valeur.toLocaleString('fr-FR')} {record.unite}</strong></article>)}</div></section>}

              {vieProfonde && <section className="carte xv-historique-manager"><div className="comp-tete"><div><b>👕 XV historique du club</b><small>Matchs, essais, points, capitanat, fidélité et numéro porté composent le score.</small></div></div><div>{POSTES.map((poste) => { const joueur = vieProfonde.records.xvHistorique[poste.id]; return <article key={poste.id}><span className="numero-xv">{poste.numero}</span><span><small>{nomPoste(poste.id)}</small><b>{joueur?.nom ?? 'Place à écrire'}</b></span><strong>{joueur ? `${joueur.scoreHistorique} pts` : '—'}</strong>{joueur && <small>{joueur.matchs} m. · {joueur.essais} e. · {joueur.capitanats} cap.</small>}</article>; })}</div></section>}

              {profonde && !!profonde.finsCarriere.length && <section className="carte fins-carriere-manager"><div className="comp-tete"><div><b>🎖️ Derniers chapitres</b><small>Retraites, retours au club formateur et rôles réduits donnent une fin aux personnages.</small></div></div>{profonde.finsCarriere.slice().reverse().slice(0, 18).map((fin) => <article key={`${fin.joueurId}-${fin.saison}`} className={fin.hommage ? 'hommage' : ''}><span><b>{fin.nom}</b><small>{fin.age} ans · saison {fin.saison} · {fin.choix}</small></span><p>{fin.texte}</p>{fin.hommage && <strong>🏟️ Tifo · hommage · standing ovation</strong>}</article>)}</section>}
              <section className="carte palmares-competition"><div className="comp-tete"><b>🏆 Palmarès par compétition</b><Selecteur options={optionsDivisions} valeur={competitionHistoire} onChange={setCompetitionHistoire} recherche /></div>{archiveVisible.map((s) => <article key={s.saison}><strong>S{s.saison}</strong><span><b>{s.champion}</b><small>{s.finaliste ? `Finaliste : ${s.finaliste}` : ''}</small></span><em>{s.montees.length ? `⬆ ${s.montees.join(', ')}` : ''}{s.relegations.length ? ` · ⬇ ${s.relegations.join(', ')}` : ''}</em></article>)}{!archiveVisible.length && <p className="manager-vide-texte">Cette compétition sera archivée à la prochaine fin de saison.</p>}</section>
              <section className="carte hall-club-manager"><div className="comp-tete"><div><b>🏛️ Hall of Fame · {manager.club}</b><small>Score local : fidélité, matchs, titres, capitanat et performances.</small></div><span className="comp-count">{hallClub.length}</span></div>{hallClub.map((f) => <article key={f.id}><strong>{f.score}</strong><span><b>{f.nom}</b><small>{f.rang} · {f.saisonsAuClub} saison(s) · {f.matchsAuClub} matchs</small></span><em>{f.titresAuClub} titre(s)</em></article>)}{!hallClub.length && <p className="manager-vide-texte">Il faut du temps pour devenir une icône. Les carrières sont déjà comptées.</p>}</section>
              <section className="carte carrieres-joueurs-manager"><div className="comp-tete"><div><b>📈 Historiques de joueurs</b><small>Les totaux survivent aux transferts et à la retraite.</small></div><span className="comp-count">{avancee.carrieresJoueurs.length}</span></div>{avancee.carrieresJoueurs.slice().reverse().slice(0, 25).map((c) => { const total = totaux(c); return <details key={c.id}><summary><span><b>{c.nom}</b><small>{total.clubs.join(' → ')}</small></span><strong>{total.matchs} matchs · {total.essais} essais · {total.selections} sél.</strong></summary><div>{c.saisons.map((s) => <p key={`${s.saison}-${s.club}`}><b>{s.resume ? `${s.saisonsResumees} saisons résumées` : `S${s.saison}`}</b> · {s.club} · {s.matchs} matchs · {s.titularisations} titularisations · {s.minutes} min · {s.essais} essais · note {s.note.toFixed(1)}</p>)}</div></details>; })}</section>
              <section className="carte anciens-staff-manager"><div className="comp-tete"><div><b>🧑‍🏫 Anciens joueurs reconvertis</b><small>Le personnage staff reste lié à son historique de joueur.</small></div><span className="comp-count">{avancee.staffAnciens.length}</span></div>{avancee.staffAnciens.map((s) => <article key={s.id}><b>{s.nom}</b><span>{s.role}</span><small>{s.club} · réputation {s.reputation} · joueur depuis S{s.joueurDepuis}</small></article>)}{!avancee.staffAnciens.length && <p className="manager-vide-texte">Les premières reconversions apparaîtront avec les retraites du groupe.</p>}</section>
            </div>
          )}

          {vue === 'equipe' && (
            <div className="manager-equipe">
              <section className="carte manager-composition-tete">
                <div>
                  <div className="eyebrow">Feuille de match · 23 joueurs</div>
                  <h2>👥 Ton XV, ton banc, tes rôles</h2>
                  <p>Chaque choix est transmis au moteur. Un joueur hors de son poste perd la cohérence collective ; le buteur et le capitaine influencent réellement les pénalités et la discipline.</p>
                </div>
                <div className="manager-note-compo"><b>{noteCompositionManager(effectif, composition).toFixed(1)}</b><span>note du XV</span></div>
              </section>

              <CompositionTerrainManager
                effectif={effectif}
                composition={composition}
                onPlacer={changerJoueur}
                etats={etatsComposition}
                automatismes={automatismesComposition}
                onCapitaine={(id) => definirComposition({ ...composition, capitaineId: id })}
                onButeur={(id) => definirComposition({ ...composition, buteurId: id })}
              />

              <section className="carte manager-roles-visuels">
                <div><b>🪪 Rôles du groupe</b><span>Les badges C et 🎯 apparaissent directement sur les cartes.</span></div>
                <label><span>©️ Capitaine</span><select value={composition.capitaineId} onChange={(e) => definirComposition({ ...composition, capitaineId: e.target.value })}>{composition.titulaires.map((id) => { const j = effectif.find((x) => x.id === id); return j && <option key={id} value={id}>{j.nom}</option>; })}</select></label>
                <label><span>🎯 Buteur</span><select value={composition.buteurId} onChange={(e) => definirComposition({ ...composition, buteurId: e.target.value })}>{[...composition.titulaires, ...composition.remplacants].map((id) => { const j = effectif.find((x) => x.id === id); return j && <option key={id} value={id}>{j.nom} · {nomPoste(j.poste)}</option>; })}</select></label>
              </section>

              <section className="carte manager-plan-avant-match">
                <div className="comp-tete"><b>🧠 Plan de jeu initial</b><span>modifiable pendant le match</span></div>
                <div className="manager-tactiques-selects">
                  <label><span>Attaque</span><select value={manager.tactique.attaque} onChange={(e) => majTactique('attaque', e.target.value as TactiqueManager['attaque'])}><option value="equilibre">Équilibré</option><option value="avants">Jeu d’avants</option><option value="large">Jouer au large</option><option value="occupation">Occupation au pied</option></select></label>
                  <label><span>Défense</span><select value={manager.tactique.defense} onChange={(e) => majTactique('defense', e.target.value as TactiqueManager['defense'])}><option value="blitz">Blitz</option><option value="glissee">Glissée</option><option value="repli">Repli</option></select></label>
                  <label><span>Rythme</span><select value={manager.tactique.rythme} onChange={(e) => majTactique('rythme', e.target.value as TactiqueManager['rythme'])}><option value="gestion">Gérer</option><option value="normal">Normal</option><option value="intense">Intense</option></select></label>
                  <label><span>Pénalités</span><select value={manager.tactique.penalites} onChange={(e) => majTactique('penalites', e.target.value as TactiqueManager['penalites'])}><option value="mixte">Selon le terrain</option><option value="points">Prendre les points</option><option value="touche">Chercher la touche</option></select></label>
                  <label><span>Remplacements</span><select value={manager.tactique.remplacements} onChange={(e) => majTactique('remplacements', e.target.value as TactiqueManager['remplacements'])}><option value="precoces">Précoces</option><option value="standard">Standards</option><option value="tardifs">Tardifs</option></select></label>
                </div>
              </section>
            </div>
          )}

          {vue === 'match' && (
            <div className="manager-match-centre">
              {!afficheManager ? (
                <section className="carte manager-match-vide"><span>📆</span><h2>Pas de match cette semaine</h2><p>Le calendrier laisse une fenêtre de récupération. Tu peux préparer la suite puis avancer.</p><button className="btn primaire" onClick={semaineManager}>▶ Semaine suivante</button></section>
              ) : (
                <section className="carte manager-affiche-match">
                  <div className="eyebrow">Journée {afficheManager.journee} · {manager.divisionNom}</div>
                  {derbyMemo?.derby && (
                    <div className="manager-contexte-derby">
                      <span>🔥 Derby à {derbyMemo.distance} km</span>
                      <b>+{derbyMemo.motivation} de motivation</b>
                      <small>Pression {derbyMemo.pression}/100 · exposition médias +{derbyMemo.medias}%</small>
                    </div>
                  )}
                  <div className="manager-duel">
                    <span>{clubParNom(afficheManager.match.domicile) && <Blason club={clubParNom(afficheManager.match.domicile)!} taille={54} />}<b>{afficheManager.match.domicile}</b></span>
                    <strong>{resultatManager ? `${afficheManager.match.scoreD} – ${afficheManager.match.scoreE}` : 'VS'}</strong>
                    <span>{clubParNom(afficheManager.match.exterieur) && <Blason club={clubParNom(afficheManager.match.exterieur)!} taille={54} />}<b>{afficheManager.match.exterieur}</b></span>
                  </div>
                  {resultatManager ? (
                    <div className="manager-match-joue"><b>✓ Résultat enregistré au championnat</b><p>{resultatManager.essaisPour} essai{resultatManager.essaisPour > 1 ? 's' : ''} marqué{resultatManager.essaisPour > 1 ? 's' : ''} · confiance du board mise à jour.</p><button className="btn primaire" onClick={semaineManager}>{manager.semaine >= SEMAINES_PAR_SAISON ? '🏁 Clore la saison' : '▶ Semaine suivante'}</button></div>
                  ) : (
                    <div className="manager-lancer-match"><p>Le XV, le banc, le capitaine, le buteur et le plan de jeu seront figés au coup d’envoi. Les consignes collectives resteront modifiables en direct.</p><div><button className="btn fantome" onClick={() => setVue('equipe')}>👥 Vérifier la composition</button><button className="btn primaire grand" onClick={() => setMatchOuvert(true)}>🎮 Prendre place sur le banc</button></div></div>
                  )}
                </section>
              )}
            </div>
          )}

          {(vue === 'formation' || vue === 'recruteurs' || vue === 'entrainement') && (
            <div className={`manager-club manager-club-${vue}`}>
              <section className="carte manager-inst-tete">
                <div>
                  <div className="eyebrow">{t('mgr.inst.eyebrow')}</div>
                  <h2>{vue === 'formation' ? '🎓 Centre de formation' : vue === 'recruteurs' ? '🔎 Recruteurs' : '🏋️ Centre d’entraînement'}</h2>
                  <p>{vue === 'formation'
                    ? 'Fais grandir les joueurs du cru et suis chaque promotion sortie par le club.'
                    : vue === 'recruteurs'
                      ? 'Développe ton réseau : plus il progresse, plus les rapports sont nombreux et précis.'
                      : 'Choisis les joueurs qui travaillent individuellement sans jamais dépasser leur potentiel.'}</p>
                </div>
                <div className="manager-note-compo manager-enveloppe">
                  <b>{nombre(manager.budgetStructure)} €</b>
                  <span>{t('mgr.inst.budget')}</span>
                </div>
              </section>

              <div className="manager-inst-grille">
                {([vue === 'formation' ? 'formation' : vue === 'recruteurs' ? 'recrutement' : 'entrainement'] as TypeInstallation[]).map((type) => {
                  const niveau = murs[type];
                  const cout = coutAmelioration(niveau, enveloppe);
                  const finance = cout !== null && manager.budgetStructure >= cout;
                  const n = Math.min(niveau, NIVEAU_INSTALLATION_MAX);
                  const effet = type === 'formation'
                    ? `Académie de ${capaciteAcademie(n)} places · coaching et progression renforcés.`
                    : type === 'entrainement'
                      ? t('mgr.inst.effet.entrainement', {
                        places: String(PLACES_ENTRAINEMENT[n]),
                        gain: GAIN_ENTRAINEMENT[n].toString().replace('.', ','),
                      })
                      : t('mgr.inst.effet.recrutement', {
                        clubs: String(CLUBS_OBSERVES[n]),
                        precision: INCERTITUDE_RECRUTEURS[n] === 0
                          ? t('mgr.inst.exact') : `± ${INCERTITUDE_RECRUTEURS[n]}`,
                      });
                  return (
                    <section className="carte manager-inst" key={type}>
                      <div className="inst-tete">
                        <span className="inst-emoji" aria-hidden="true">{EMOJI_INSTALLATION[type]}</span>
                        <div>
                          <b>{t(`mgr.inst.${type}.nom`)}</b>
                          <p>{t(`mgr.inst.${type}.desc`)}</p>
                        </div>
                      </div>
                      <div className="inst-marches">
                        {Array.from({ length: NIVEAU_INSTALLATION_MAX }, (_, i) => (
                          <i key={i} className={i < niveau ? 'pleine' : ''} />
                        ))}
                        <span>{t('mgr.inst.niveau', { n: String(niveau) })}</span>
                      </div>
                      <p className="inst-effet">{niveau > 0 ? effet : t('mgr.inst.rien')}</p>
                      {cout === null ? (
                        <p className="inst-max">{t('mgr.inst.max')}</p>
                      ) : (
                        <button
                          className="btn primaire"
                          disabled={!finance}
                          onClick={() => ameliorerInstallation(type)}
                        >
                          {t('mgr.inst.ameliorer', { cout: nombre(cout) })}
                        </button>
                      )}
                    </section>
                  );
                })}
              </div>

              {vue === 'formation' && detectionJeunes && (
                <>
                  <section className="carte manager-centre-identite">
                    <div className="manager-centre-score">
                      <span>Note du centre</span>
                      <b>{detectionJeunes.noteGlobale}</b>
                      <small>{detectionJeunes.portee} · rayon {nombre(detectionJeunes.rayon)} km</small>
                    </div>
                    <div className="manager-centre-notes" aria-label="Les six notes du centre">
                      {AXES_CENTRE.map((axe) => (
                        <div key={axe}>
                          <span>{EMOJI_AXE[axe]} {axe === 'installations' ? 'Installations' : axe === 'coaching' ? 'Coaching' : axe === 'recrutement' ? 'Recrutement' : axe === 'reseau' ? 'Réseau' : axe === 'medical' ? 'Médical' : 'Réputation'}</span>
                          <b>{detectionJeunes.notes[axe]}</b>
                          <i><em style={{ width: `${detectionJeunes.notes[axe]}%` }} /></i>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="carte manager-academie">
                    <div className="comp-tete">
                      <div><b>🎓 U18 et Espoirs</b><small>Chaque potentiel reste une estimation, même après la signature.</small></div>
                      <span className="comp-count">{academieClub.length}/{detectionJeunes.capacite}</span>
                    </div>
                    <div className="manager-formation-finances">
                      <span>Revenus de formation du club</span>
                      <b>{nombre(revenusFormationClub)} €</b>
                      <small>Les indemnités sont versées lorsqu’un autre club recrute un jeune formé ici.</small>
                    </div>
                    {!academieClub.length ? (
                      <div className="manager-vide-action">
                        <span>🌱</span>
                        <div><b>Ton académie est prête</b><p>Ouvre les rapports, observe les profils et présente ton projet aux jeunes qui correspondent au club.</p></div>
                        <button className="btn primaire" onClick={() => setVue('recruteurs')}>Voir la promotion détectée</button>
                      </div>
                    ) : (
                      <div className="manager-jeunes-grille">
                        {academieClub.map((j) => {
                          const estimation = ficheAcademicienManager(manager, j, detectionJeunes.notes);
                          const progression = j.derniereProgression;
                          return (
                            <article className="manager-jeune-carte" key={j.id}>
                              <header>
                                <div className="manager-jeune-identite">
                                  <div className="manager-jeune-avatar" aria-hidden="true">
                                    <b>{initiales(j.nom)}</b>
                                    <i><Drapeau nation={j.nation} taille={0.72} /></i>
                                  </div>
                                  <div className="manager-jeune-titre">
                                    <span>{j.clubOrigine}</span>
                                    <h3>{j.nom}</h3>
                                    <p>{j.age} ans · {nomPoste(j.poste)} · {j.taille / 100} m · {j.poids} kg</p>
                                  </div>
                                </div>
                                <em className={`manager-categorie ${j.categorie}`}>{j.categorie === 'u18' ? 'U18' : j.categorie === 'pret' ? 'PRÊT' : 'ESPOIRS'}</em>
                              </header>
                              <div className="manager-jeune-kpis">
                                <span><small>Niveau</small><b>{j.note.toFixed(1)}</b></span>
                                <span><small>Potentiel estimé</small><b>{etoiles(estimation.etoilesBas, estimation.etoilesHaut)}</b></span>
                                <span><small>Temps de jeu</small><b>{j.tempsDeJeu}%</b></span>
                                <span><small>Moral</small><b>{j.moral}%</b></span>
                              </div>
                              <p className="manager-jeune-profil">
                                {niveauLisible(j.physique)} physiquement · {niveauLisible(j.technique)} techniquement · {niveauLisible(j.mental)} mentalement
                                {j.clubPret && <> · prêté à <b>{j.clubPret}</b></>}
                              </p>
                              {progression && (
                                <p className={`manager-progression-annuelle${progression.blesse ? ' blesse' : ''}`}>
                                  Saison {progression.saison} : {progression.noteAvant.toFixed(1)} → {progression.noteApres.toFixed(1)} · {progression.resume}
                                </p>
                              )}
                              <div className="manager-actions-academie">
                                <button disabled={j.age > 18 || j.categorie === 'u18'} onClick={() => gererAcademicien(j.id, 'u18')}>U18</button>
                                <button disabled={j.categorie === 'espoirs'} onClick={() => gererAcademicien(j.id, 'espoirs')}>Espoirs</button>
                                <button disabled={j.age < 18 || j.categorie === 'pret'} onClick={() => gererAcademicien(j.id, 'pret')}>Prêter</button>
                                <button className="primaire" disabled={j.age < 17} onClick={() => gererAcademicien(j.id, 'senior')}>Intégrer seniors</button>
                                <button className="danger" onClick={() => setJeuneALiberer(j.id)}>Libérer</button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}

              {vue === 'entrainement' && (
                <section className="carte manager-planning-collectif">
                  <div className="comp-tete"><div><b>📅 Semaine collective</b><small>Le socle commun du groupe, volontairement simple à lire.</small></div></div>
                  <div>
                    {[['Lun.', 'Récupération'], ['Mar.', 'Physique'], ['Mer.', 'Technique'], ['Jeu.', 'Tactique'], ['Ven.', 'Léger'], ['Sam.', 'Match'], ['Dim.', 'Repos']].map(([jour, seance]) => (
                      <span key={jour}><b>{jour}</b><small>{seance}</small></span>
                    ))}
                  </div>
                </section>
              )}

              {vue === 'entrainement' && <section className="carte manager-programme">
                <div className="comp-tete">
                  <b>🏋️ {t('mgr.inst.programme')}</b>
                  <span className="comp-count">{manager.entrainements.length}/{placesEntrainement}</span>
                </div>
                {murs.entrainement <= 0 ? (
                  <p className="manager-vide-texte">{t('mgr.inst.programmeFerme')}</p>
                ) : (
                  <>
                    <p className="manager-vide-texte">{t('mgr.inst.programmeAide')}</p>
                    <div className="manager-liste-programme">
                      {[...effectif]
                        .sort((a, b) => (b.potentiel - b.note) - (a.potentiel - a.note))
                        .slice(0, 24)
                        .map((j) => {
                          const dedans = manager.entrainements.includes(j.nom);
                          const marge = j.potentiel - j.note;
                          const complet = !dedans && manager.entrainements.length >= placesEntrainement;
                          return (
                            <button
                              key={j.id}
                              className={`prog-ligne${dedans ? ' actif' : ''}`}
                              disabled={complet || marge <= 0}
                              aria-pressed={dedans}
                              onClick={() => basculerEntrainement(j.nom)}
                            >
                              <span className="prog-nom">{j.duCentre && '🎓 '}{j.nom}</span>
                              <span className="prog-poste">{nomPoste(j.poste)}</span>
                              <span className="prog-age">{j.age}</span>
                              <span className="prog-note">{j.note}</span>
                              <span className={`prog-marge${marge > 0 ? ' positive' : ''}`}>
                                {marge > 0 ? `↗ ${j.potentiel}` : '—'}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </>
                )}
              </section>}

              {vue === 'entrainement' && (
                <section className="carte manager-programme-jeunes">
                  <div className="comp-tete">
                    <div><b>🌱 Programmes de l’académie</b><small>Un objectif individuel et un mentor maximum par jeune.</small></div>
                    <span className="comp-count">{academieClub.length}</span>
                  </div>
                  {!academieClub.length ? (
                    <p className="manager-vide-texte">Recrute d’abord un jeune depuis l’onglet Recruteurs.</p>
                  ) : (
                    <div className="manager-plans-jeunes">
                      {academieClub.map((j) => (
                        <article key={j.id}>
                          <div>
                            <b>{j.nom}</b>
                            <span>{j.age} ans · {nomPoste(j.poste)} · {j.categorie === 'pret' ? `prêt à ${j.clubPret}` : j.categorie.toUpperCase()}</span>
                          </div>
                          <label>
                            <span>Objectif individuel</span>
                            <select value={j.objectif} onChange={(e) => definirObjectifJeune(j.id, e.target.value as ObjectifJeuneManager)}>
                              {OBJECTIFS_JEUNES.map((o) => <option key={o.id} value={o.id}>{o.nom} · {o.effet}</option>)}
                            </select>
                          </label>
                          <label>
                            <span>Mentor senior</span>
                            <select value={j.mentorId ?? ''} onChange={(e) => definirMentorJeune(j.id, e.target.value || undefined)}>
                              <option value="">Aucun mentor</option>
                              {mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.nom} · {mentor.age} ans · {mentor.note}</option>)}
                            </select>
                          </label>
                          <p><b>{nomObjectifJeune(j.objectif)}</b> · temps de jeu {j.tempsDeJeu}% · professionnalisme {j.professionnalisme}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {vue === 'recruteurs' && detectionJeunes && (
                <>
                  <section className="carte manager-detection-tete">
                    <div>
                      <div className="eyebrow">Promotion annuelle · {detectionJeunes.fiches.length} dossiers</div>
                      <h2>🔎 Les jeunes existent déjà dans leurs clubs</h2>
                      <p>{nombre(detectionJeunes.candidatsVus)} joueurs dans le rayon du réseau. La cellule en remonte {detectionJeunes.fiches.length}, mais seuls les {detectionJeunes.prioritaires} premiers sont considérés prioritaires.</p>
                      {detectionJeunes.fiches.filter((f) => f.etoilesHaut >= 4.5).length >= 3 && (
                        <strong className="manager-generation-doree">⭐ Une génération exceptionnelle semble arriver — le scout peut encore se tromper.</strong>
                      )}
                    </div>
                    <div className={`manager-missions${detectionJeunes.deplacementsRestants === 0 ? ' epuise' : ''}`}>
                      <span className="manager-missions-icone" aria-hidden="true">✈</span>
                      <b>{detectionJeunes.deplacementsRestants}/{detectionJeunes.deplacementsTotal}</b>
                      <span>déplacements restants</span>
                      <small>Entretien = 3 déplacements</small>
                    </div>
                  </section>

                  <section className="manager-dossiers-jeunes">
                    {detectionJeunes.fiches.map((ficheJeune, index) => {
                      const j = ficheJeune.jeune;
                      const suivi = manager.observationsJeunes[j.id];
                      const reponse = manager.reponsesJeunes[j.id];
                      const dejaSigne = manager.academie.some((a) => a.id === j.id);
                      return (
                        <article className={`carte manager-dossier-jeune${index < detectionJeunes.prioritaires ? ' prioritaire' : ''}`} key={j.id}>
                          <header>
                            <div className="manager-jeune-identite">
                              <div className="manager-jeune-avatar" aria-hidden="true">
                                <b>{initiales(j.nom)}</b>
                                <i><Drapeau nation={j.nation} taille={0.72} /></i>
                              </div>
                              <div className="manager-jeune-titre">
                                <span>{index < detectionJeunes.prioritaires ? '⭐ PRIORITAIRE' : 'DOSSIER À SUIVRE'}</span>
                                <h3>{j.nom}</h3>
                                <p>{j.age} ans · {nomPoste(j.poste)}</p>
                                <small>{j.club} · {nombre(j.distance)} km</small>
                              </div>
                            </div>
                            <strong className="manager-note-observee">{ficheJeune.noteObservee}<small>niveau<br />observé</small></strong>
                          </header>
                          <div className="manager-confiance-scout">
                            <span>Confiance du recruteur</span>
                            <i><em style={{ width: `${ficheJeune.confiance}%` }} /></i>
                            <b>{ficheJeune.confiance}%</b>
                          </div>
                          <div className="manager-potentiel-cache">
                            <span>Projection du potentiel</span>
                            <b>{etoiles(ficheJeune.etoilesBas, ficheJeune.etoilesHaut)}</b>
                            <small>Fourchette {ficheJeune.potentielBas}–{ficheJeune.potentielHaut} · estimation encore incertaine</small>
                          </div>
                          <div className="manager-jeune-attributs">
                            <span><b>Physique</b>{niveauLisible(j.physique)}</span>
                            <span><b>Technique</b>{niveauLisible(j.technique)}</span>
                            <span><b>Mental</b>{niveauLisible(j.mental)}</span>
                            <span><b>Profil</b>{j.style.replace('_', ' ')}</span>
                            <span><b>Gabarit</b>{j.taille / 100} m · {j.poids} kg</span>
                            <span><b>Pied</b>{j.piedFort}</span>
                          </div>
                          <p className="manager-observation-resume">
                            {ficheJeune.matchs} match{ficheJeune.matchs > 1 ? 's' : ''} observé{ficheJeune.matchs > 1 ? 's' : ''}
                            {ficheJeune.entretien ? ' · entretien réalisé' : ' · entretien non réalisé'}
                          </p>
                          {reponse && <p className={`manager-reponse-jeune ${reponse.etat}`}>{reponse.texte}</p>}
                          <div className="manager-actions-detection">
                            <button disabled={detectionJeunes.deplacementsRestants < 1 || ficheJeune.matchs >= 10 || dejaSigne} onClick={() => observerJeune(j.id)}>👁 Observer un match</button>
                            <button disabled={detectionJeunes.deplacementsRestants < 3 || ficheJeune.matchs < 3 || ficheJeune.entretien || dejaSigne} onClick={() => observerJeune(j.id, true)}>💬 Entretien famille</button>
                            <button className="primaire" disabled={dejaSigne || detectionJeunes.occupes >= detectionJeunes.capacite} onClick={() => proposerProjetJeune(j.id)}>{dejaSigne ? '✓ Au centre' : 'Présenter le projet'}</button>
                          </div>
                          {suivi && <small className="manager-rapport-date">Dossier suivi depuis la saison {suivi.saison}</small>}
                        </article>
                      );
                    })}
                  </section>

                  {!!manager.rapports.length && (
                    <details className="carte manager-rapports-pros">
                      <summary>Rapports du marché senior <span>{manager.rapports.length}</span></summary>
                      <div className="manager-table-rapports">
                        {manager.rapports.map((r) => (
                          <div className="rap-ligne" key={r.id}>
                            <span className="rap-nom"><Drapeau nation={r.nation} taille={0.8} /> {r.nom}<em>{nomPoste(r.poste)}</em></span>
                            <span className="rap-club">{r.club}<em>{r.division}</em></span>
                            <span>{r.age}</span><span>{r.note}</span>
                            <span className="rap-pot">↗ {r.potentiel}{r.incertitude > 0 && <em>± {r.incertitude}</em>}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          )}

          {vue === 'marche' && (
            <div className="manager-marche">
              <div className="carte manager-marche-tete">
                <div><div className="eyebrow">{t('mgr.baseMondiale')}</div><h2>🌍 {t('mgr.marcheTitre')}</h2><p>{t('mgr.marcheIntro')}</p></div>
                {/* ⚠️ LA MASSE ENGAGÉE PASSE DEVANT LE PLAFOND. Un plafond seul
                    ne dit rien : ce qu'un manager doit lire avant d'ouvrir une
                    négociation, c'est ce qu'il lui RESTE. */}
                <div className="manager-budgets resume">
                  <span>{t('mgr.inst.budget')} <b>{nombre(manager.budgetStructure)} €</b></span>
                  <span>{t('mgr.transferts')} <b>{nombre(manager.budgetTransferts)} €</b></span>
                  <span className={masseSaturee ? 'masse-saturee' : ''}>
                    {t('mgr.salaires')} <b>{nombre(masseEngagee)} / {nombre(manager.budgetSalarial)} €</b>
                  </span>
                </div>
              </div>
              <div className="manager-filtres carte">
                <Selecteur options={optionsDivisions} valeur={divisionMarche} onChange={(v) => { setDivisionMarche(v); setClubMarche(''); }} recherche />
                <Selecteur options={optionsClubs} valeur={clubMarche} onChange={setClubMarche} recherche />
                <Selecteur options={optionsPostes} valeur={poste} onChange={setPoste} />
                <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t('mgr.marche.rechercher')} aria-label={t('mgr.marche.rechercher')} />
              </div>
              <p className="manager-resultats-marche">{t('mgr.marche.resultats', { n: cibles.length })}</p>
              <div className="manager-cibles">
                {cibles.map((cible) => {
                  const connaissance = rapportConnaissance(avancee ?? undefined, cible, murs.recrutement);
                  const existante = manager.negociations.find((n) => n.joueur.id === cible.id && n.etat !== 'rompue');
                  const clubDossier = [...manager.negociationsClubs].reverse()
                    .find((n) => n.cible.id === cible.id && n.saison === manager.saison);
                  const clubCible = clubParNom(cible.club);
                  const libelleContact = existante?.etat === 'signee'
                    ? `✓ ${t('mgr.signe')}`
                    : existante
                      ? `𝕏 ${t('mgr.reprendreDiscussion')}`
                      : cible.indemnite <= 0 || clubDossier?.etat === 'accord'
                        ? `𝕏 Parler à ${cible.nom.split(' ')[0]}`
                        : clubDossier?.etat === 'ouverte'
                          ? `𝕏 Reprendre avec ${cible.club}`
                          : clubDossier?.etat === 'rompue'
                            ? '⛔ Club vendeur fermé'
                            : `𝕏 Négocier avec ${cible.club}`;
                  return (
                    <article key={cible.id} className="carte manager-cible">
                      <div className="manager-cible-note">{connaissance.note[0] === connaissance.note[1] ? connaissance.note[0] : `${connaissance.note[0]}–${connaissance.note[1]}`}<small>{connaissance.niveau}</small></div>
                      <div className="manager-cible-corps">
                        <div className="manager-cible-identite"><Drapeau nation={cible.nation} taille={0.95} /><span><b>{cible.nom}</b><small>{nomPoste(cible.poste)} · {cible.age} {t('gen.ans')}</small></span></div>
                        <p>{clubCible && <Blason club={clubCible} taille={18} />} {cible.club}</p>
                        {/* ⚠️ LA VALEUR ET L'INDEMNITÉ SONT DEUX CHOSES, et les
                            confondre était tout le défaut de l'ancien marché :
                            on affichait un prix de football là où le rugby
                            français attend la fin d'un contrat pour ne rien
                            payer. On montre donc les deux, plus le temps qui
                            reste — c'est lui qui décide du prix. */}
                        <div className="manager-cible-chiffres">
                          <span>{t('mgr.potentiel')} <b>{connaissance.potentiel ? `${connaissance.potentiel[0]}–${connaissance.potentiel[1]}` : '?'}</b></span>
                          <span>{t('mgr.valeur')} <b>{nombre(cible.valeur)} €</b></span>
                          <span className={cible.indemnite === 0 ? 'gratuit' : ''}>
                            {t('mgr.indemnite')} <b>{cible.indemnite === 0 ? t('mgr.libreGratuit') : `${nombre(cible.indemnite)} €`}</b>
                          </span>
                          <span>{t('mgr.salaire')} <b>{connaissance.salaire ? `${nombre(connaissance.salaire[0])}–${nombre(connaissance.salaire[1])} €` : '?'}</b></span>
                        </div>
                        <p className="manager-connaissance-cible">Rapport {connaissance.niveau}{connaissance.personnalite ? ` · personnalité ${connaissance.personnalite}` : ' · personnalité inconnue'}</p>
                        <p className={`manager-cible-situation ${cible.situation}`}>
                          {t(`mgr.situation.${cible.situation}`)}
                          {cible.saisonsRestantes > 0 && ` · ${t('mgr.contratRestant', { n: cible.saisonsRestantes })}`}
                        </p>
                      </div>
                      <button
                        className="btn primaire"
                        disabled={existante?.etat === 'signee' || clubDossier?.etat === 'rompue'}
                        onClick={() => {
                          if (existante) ouvrirDiscussion(existante.pseudo);
                          else if (clubDossier?.etat === 'ouverte') ouvrirDiscussion(clubDossier.pseudo);
                          else contacterClub(cible);
                        }}
                      >
                        {libelleContact}
                      </button>
                      <button className="btn fantome" disabled={connaissance.niveau === 'complet'} onClick={() => observerCible(cible)}>👁 Observer davantage</button>
                    </article>
                  );
                })}
                {!cibles.length && <div className="carte manager-vide">{t('mgr.marche.aucun')}</div>}
              </div>
            </div>
          )}

          {vue === 'ovale' && (
            <div className="manager-ovale">
              <Suspense fallback={<div className="carte manager-vide">Ouverture de L’Ovale…</div>}>
                <OvaleManager
                  embarque
                  onRetour={(destination = 'bureau') => setVue(destination)}
                />
              </Suspense>
            </div>
          )}

        </>
      )}

      {manager.historique.length > 0 && vue === 'bureau' && (
        <div className="carte bloc-competition manager-historique">
          <div className="comp-tete"><b>📋 {t('mgr.parcours')}</b><span className="comp-count">{manager.historique.length}</span></div>
          <div className="classement-tableau tableau-live histo-manager">{[...manager.historique].reverse().map((h) => <div key={`${h.saison}-${h.club}`} className="classement-ligne"><span className="cl-pos">S{h.saison}</span><span className="cl-nom">{h.club}</span><span>{h.divisionNom}</span><span className={h.tenu ? 'cl-plus' : 'cl-moins'}>{h.rang}ᵉ / {h.objectif}ᵉ</span><span>{h.titres.map((id) => TROPHEES[id]?.nom ?? id).join(', ')}{h.montee && ' ⬆️'}{h.descente && ' ⬇️'}{h.licencie && ' 📉'}</span></div>)}</div>
        </div>
      )}

      <button className="btn fantome manager-raccrocher" onClick={() => setRaccrocher(true)}>🚪 {t('mgr.raccrocher')}</button>
      {raccrocher && <Confirmation titre={t('mgr.raccrocherTitre')} message={libre ? t('mgr.raccrocherLibre') : t('mgr.raccrocherClasse')} libelleOui={t('mgr.raccrocher')} onOui={() => { setRaccrocher(false); quitterBanc(); }} onNon={() => setRaccrocher(false)} />}
      {jeuneALiberer && (
        <Confirmation
          titre="Libérer ce jeune ?"
          message={`${academieClub.find((j) => j.id === jeuneALiberer)?.nom ?? 'Ce joueur'} quittera définitivement le centre de formation.`}
          libelleOui="Libérer"
          onOui={() => { gererAcademicien(jeuneALiberer, 'liberer'); setJeuneALiberer(null); }}
          onNon={() => setJeuneALiberer(null)}
        />
      )}
      {matchOuvert && afficheManager && (
        <Suspense fallback={null}>
          <MatchLive
            match={afficheManager.match}
            saison={manager.saison}
            cle={afficheManager.cle}
            titre={`${manager.divisionNom} · journée ${afficheManager.journee}`}
            manager={{
              club: manager.club,
              composition,
              tactique: manager.tactique,
              onTactique: definirTactique,
              indisponibles,
              penalitesNote,
            }}
            onTermine={({ scoreA, scoreB, essaisA, essaisB }) => {
              const domicile = afficheManager.match.domicile === manager.club;
              enregistrerResultat({
                cle: afficheManager.cle, club: manager.club,
                saison: manager.saison, semaine: manager.semaine,
                journee: afficheManager.journee, domicile,
                adversaire: domicile ? afficheManager.match.exterieur : afficheManager.match.domicile,
                scorePour: domicile ? scoreA : scoreB,
                scoreContre: domicile ? scoreB : scoreA,
                essaisPour: domicile ? essaisA : essaisB,
                essaisContre: domicile ? essaisB : essaisA,
              });
            }}
            onFermer={() => setMatchOuvert(false)}
          />
        </Suspense>
      )}
      {demission && <Confirmation titre="Quitter le club ?" message={`Tu démissionneras de ${manager.club} immédiatement. Ta réputation et tout l’historique seront conservés, mais le calendrier s’arrêtera jusqu’à la signature d’un nouveau banc.`} libelleOui="Démissionner" onOui={() => { setDemission(false); demissionner(); }} onNon={() => setDemission(false)} />}
      {matchSelectionOuvert && selectionManager && rencontreSelection && matchSelection && (
        <Suspense fallback={null}>
          <MatchLive
            match={matchSelection}
            saison={manager.saison}
            cle={rencontreSelection.id}
            titre={`${rencontreSelection.competition} · ${selectionManager.nation}`}
            selection
            manager={{
              club: selectionManager.nation,
              composition: compositionManagerParDefaut(effectifNational(selectionManager.nation, manager.saison)),
              tactique: manager.tactique,
              onTactique: definirTactique,
            }}
            onTermine={({ scoreA, scoreB }) => enregistrerMatchSelection(scoreA, scoreB)}
            onFermer={() => setMatchSelectionOuvert(false)}
          />
        </Suspense>
      )}
    </motion.section>
  );
}
