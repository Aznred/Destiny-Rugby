import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Icone } from '../Icone';
import { PelouseMemo } from './Pelouse';
import { SpriteRugbymanMemo } from './SpriteRugbyman';
import { Camera, angleDeVue, type Cadre, type Cadrage } from '../../lib/moteur/camera';
import { LONGUEUR, distance2, type Cote, type Vec } from '../../lib/moteur/terrain';
import { avancer, creerMatch, resoudreChoix, type EtatMatch } from '../../lib/moteur/moteur';
import type { ActionJoueur } from '../../lib/moteur/etat';
import type { Pion } from '../../lib/moteur/entites';
import type { MaillotMatch } from '../../lib/moteur/apparenceMatch';
import type { PionDirect, TerrainDirect } from '../../lib/ligue/matchCarriere';
import {
  actionContextuelleArcade, actionGesteTactileArcade, creerQteArcade, deflexionJoystickArcade, deplacerJoueurArcade, etatGlobalArcade,
  evaluerQteArcade, InputManagerArcade, interpolerPosition, MachineEtatsJoueurs,
  progressionQte, selectionnerJoueurPertinent, transformationArcadeReussie, type EvenementInputArcade,
  type InputActionArcade, type QteArcade, type TrameInputArcade,
} from '../../lib/moteur/arcade';
import {
  convertirEnCoequipiers, synchroniserSalonAmicalApi, type EquipeAmical,
  type EtatMatchAmicalReseau, type InputAmical,
} from '../../lib/amicalCollection';
import './MatchAmicalManette.css';

interface Props {
  equipeA: EquipeAmical;
  equipeB: EquipeAmical;
  monCamp: Cote;
  mode: 'ordinateur' | 'reseau';
  salonCode?: string;
  onQuitter: () => void;
}

const DUREE_MATCH_REELLE = 8 * 60;
const DUREE_MATCH_JEU = 80 * 60;
const TRAME_VIDE: TrameInputArcade = {
  sequence: 0, dx: 0, dy: 0, sprint: false, evenements: [], tempsClient: 0,
};

function maillot(couleur: string, secondaire: string): MaillotMatch {
  return {
    principal: couleur, secondaire, accent: '#f8fafc', short: '#101827',
    chaussettes: couleur, motif: 'epaules',
  };
}

function terrainSprites(m: EtatMatch): TerrainDirect {
  const pions: PionDirect[] = m.pions.map((p) => ({
    id: p.id, numero: p.numeroMaillot ?? p.numero, numeroRole: p.numero,
    nom: p.nom, poste: p.poste, cote: p.cote === 'A' ? 'domicile' : 'exterieur',
    x: p.pos.x, y: p.pos.y, vx: p.vitesse.x, vy: p.vitesse.y,
    force: p.puissance, tailleCm: p.tailleCm, poidsKg: p.poidsKg, corps: p.corps,
  }));
  return {
    simulation: m.sim, pions, ballon: { ...m.ballon }, porteurId: m.porteur?.id,
    vol: m.vol ? {
      de: { ...m.vol.de }, vers: { ...m.vol.vers }, duree: m.vol.duree,
      ecoule: m.vol.ecoule, hauteur: m.vol.hauteur, type: m.vol.type,
      intention: m.vol.intention, auteurId: m.vol.auteur?.id, receveurId: m.vol.receveur?.id,
    } : undefined,
    phase: m.phase, systeme: 'collection-arcade',
    possession: m.possession === 'A' ? 'domicile' : 'exterieur', cadence: 1, horloge: m.minute,
  };
}

function serialiserMatch(
  m: EtatMatch, revision: number, qte: QteArcade | null,
  acquittements: Partial<Record<Cote, number>>, message: string,
): EtatMatchAmicalReseau {
  return {
    revision, simulation: m.sim, minute: m.minute, tempsJeu: m.t, periode: m.periode, sirene: m.sirene, scoreA: m.scoreA, scoreB: m.scoreB,
    phase: m.phase, fini: m.fini, possession: m.possession, ballon: { ...m.ballon },
    porteurId: m.porteur?.id, qte, acquittements, tempsServeur: Date.now(), message,
    pions: m.pions.map((p) => ({
      id: p.id, x: p.pos.x, y: p.pos.y, vx: p.vitesse.x, vy: p.vitesse.y,
      endurance: p.endurance, surLeTerrain: p.surLeTerrain, battu: p.battu, role: p.role,
    })),
  };
}

function appliquerSnapshot(m: EtatMatch, snapshot: EtatMatchAmicalReseau, campLocal: Cote): void {
  const etats = new Map(snapshot.pions.map((p) => [p.id, p]));
  for (const pion of m.pions) {
    const recu = etats.get(pion.id);
    if (!recu) continue;
    const position = pion.cote === campLocal
      ? interpolerPosition(pion.pos, { x: recu.x, y: recu.y }, .45)
      : { x: recu.x, y: recu.y };
    pion.pos.x = position.x; pion.pos.y = position.y;
    pion.vitesse.x = recu.vx; pion.vitesse.y = recu.vy;
    pion.endurance = recu.endurance; pion.surLeTerrain = recu.surLeTerrain;
    if (typeof recu.battu === 'number') pion.battu = recu.battu;
    if (recu.role) pion.role = recu.role as Pion['role'];
  }
  m.sim = snapshot.simulation; m.minute = snapshot.minute;
  m.t = snapshot.tempsJeu ?? snapshot.minute * 60;
  m.periode = snapshot.periode ?? m.periode;
  m.sirene = snapshot.sirene ?? false;
  m.scoreA = snapshot.scoreA; m.scoreB = snapshot.scoreB;
  m.phase = snapshot.phase as EtatMatch['phase']; m.fini = snapshot.fini;
  m.possession = snapshot.possession; m.ballon = { ...snapshot.ballon };
  m.porteur = snapshot.porteurId ? m.pions.find((p) => p.id === snapshot.porteurId) ?? null : null;
  m.vol = null;
}

/** Donne brièvement au moteur le pion qui exécute le geste, puis nettoie cet état. */
function jouerGesteMoteur(m: EtatMatch, pion: Pion, action: ActionJoueur, bonusChance = 0) {
  const anciensMoi = m.pions.filter((p) => p.moi);
  const ancienControle = m.controle;
  const ancienneIntention = m.intention;
  for (const p of m.pions) p.moi = false;
  pion.moi = true; m.controle = true; m.intention = null;
  delete m.recharges[action];
  try {
    return resoudreChoix(m, pion, action, bonusChance);
  } finally {
    delete m.recharges[action];
    m.intention = ancienneIntention; m.controle = ancienControle; pion.moi = false;
    for (const p of anciensMoi) p.moi = true;
  }
}

function libellePhase(m: EtatMatch): string {
  const etat = etatGlobalArcade(m.phase, m.minuteur);
  const libelles: Record<typeof etat, string> = {
    OPEN_PLAY: 'Jeu courant', RUCK: 'Ruck', SCRUM_SETUP: 'Mise en place de la mêlée',
    SCRUM: 'Mêlée', LINEOUT_SETUP: 'Mise en place de la touche', LINEOUT: 'Touche',
    PENALTY: 'Pénalité', CONVERSION: 'Transformation', KICKOFF: 'Renvoi',
    HALF_TIME: 'Mi-temps', FULL_TIME: 'Terminé',
  };
  return libelles[etat];
}

export function MatchAmicalManette({ equipeA, equipeB, monCamp, mode, salonCode, onQuitter }: Props) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const joystickMancheRef = useRef<HTMLDivElement>(null);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const groupeTerrainRef = useRef<SVGGElement>(null);
  const noeudsPionsRef = useRef(new Map<string, { noeud: SVGGElement; origine: Vec }>());
  const noeudBallonRef = useRef<{ noeud: SVGGElement; origine: Vec } | null>(null);
  const positionsAfficheesRef = useRef(new Map<string, Vec>());
  const ballonAfficheRef = useRef<Vec | null>(null);
  const dimensionsRef = useRef({ largeur: 1280, hauteur: 720 });
  const cameraRef = useRef(new Camera());
  const matchRef = useRef<EtatMatch | null>(null);
  const inputRef = useRef(new InputManagerArcade());
  const inputAdverseRef = useRef<InputAmical>(TRAME_VIDE);
  const machineRef = useRef(new MachineEtatsJoueurs());
  const selectionRef = useRef<Partial<Record<Cote, string>>>({});
  const derniereSequenceTraitee = useRef<Partial<Record<Cote, number>>>({ A: 0, B: 0 });
  const revisionRef = useRef(0);
  const qteRef = useRef<QteArcade | null>(null);
  const qtePhaseRef = useRef('');
  const tirQteTraiteRef = useRef<EtatMatch['tir'] | null>(null);
  const preparationRef = useRef<Partial<Record<Cote, { action: 'plaquage' | 'raffut' | 'crochet'; pionId: string; expire: number }>>>({});
  const decalageServeurRef = useRef(0);
  const gesteRef = useRef<{ x: number; y: number; id: number; debut: number } | null>(null);
  const joystickRef = useRef({ actif: false, id: -1, departX: 0, departY: 0 });
  const dernierRenduRef = useRef(0);
  const appareilTactileRef = useRef(typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  const pleinEcranMatchRef = useRef(false);
  const orientationVerrouilleeRef = useRef(false);

  const [vueCamera, setVueCamera] = useState<{ viewBox: string; transform: string; redresser: string; cadre: Cadre } | null>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [tempsSimule, setTempsSimule] = useState(0);
  const [messageAction, setMessageAction] = useState('Coup d’envoi');
  const messageActionRef = useRef(messageAction);
  const [finDeMatch, setFinDeMatch] = useState(false);
  const [pionControleId, setPionControleId] = useState<string | null>(null);
  const [enduranceJauge, setEnduranceJauge] = useState(100);
  const [manetteDetectee, setManetteDetectee] = useState(false);
  const [qteAffichee, setQteAffichee] = useState<QteArcade | null>(null);
  const [progressionQteAffichee, setProgressionQteAffichee] = useState(0);
  const [portraitMobile, setPortraitMobile] = useState(false);

  const maillotA = useMemo(() => maillot(equipeA.couleur || '#1e40af', equipeB.couleur || '#f8fafc'), [equipeA.couleur, equipeB.couleur]);
  const maillotB = useMemo(() => maillot(equipeB.couleur || '#dc2626', equipeA.couleur || '#f8fafc'), [equipeA.couleur, equipeB.couleur]);
  useEffect(() => { messageActionRef.current = messageAction; }, [messageAction]);
  useEffect(() => {
    const conteneur = conteneurRef.current;
    if (!conteneur) return;
    const mesurer = () => {
      const rect = conteneur.getBoundingClientRect();
      dimensionsRef.current = { largeur: Math.max(1, rect.width), hauteur: Math.max(1, rect.height) };
    };
    mesurer();
    if (typeof ResizeObserver !== 'undefined') {
      const observateur = new ResizeObserver(mesurer);
      observateur.observe(conteneur);
      return () => observateur.disconnect();
    }
    window.addEventListener('resize', mesurer);
    return () => window.removeEventListener('resize', mesurer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse) and (orientation: portrait)');
    let actif = true;
    const actualiser = () => setPortraitMobile(media.matches);
    actualiser();
    media.addEventListener('change', actualiser);
    if (appareilTactileRef.current && typeof screen.orientation?.lock === 'function') {
      void screen.orientation.lock('landscape').then(() => {
        if (actif) orientationVerrouilleeRef.current = true;
        else screen.orientation.unlock();
      }).catch(() => {});
    }
    return () => {
      actif = false;
      media.removeEventListener('change', actualiser);
      if (orientationVerrouilleeRef.current) screen.orientation.unlock();
      if (pleinEcranMatchRef.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  const activerPaysage = async () => {
    try {
      if (!document.fullscreenElement && conteneurRef.current?.requestFullscreen) {
        await conteneurRef.current.requestFullscreen();
        pleinEcranMatchRef.current = true;
      }
      if (typeof screen.orientation?.lock === 'function') {
        await screen.orientation.lock('landscape');
        orientationVerrouilleeRef.current = true;
      }
    } catch { /* Le navigateur peut imposer une rotation manuelle. */ }
  };

  useEffect(() => {
    const m = creerMatch(
      equipeA.nom, equipeB.nom,
      convertirEnCoequipiers(equipeA.joueurs), convertirEnCoequipiers(equipeB.joueurs),
      20, 17, `collection#${salonCode ?? Date.now()}`, undefined,
      { niveau: 'pro', tempsReel: true, controle: false },
    );
    m.carriereDixMinutes = true;
    m.dureeReelleArcade = DUREE_MATCH_REELLE;
    m.finSurSortieOuEnAvant = true;
    m.controleArcadeCamps = mode === 'reseau' ? ['A', 'B'] : [monCamp];
    m.defenseArcadeCote = mode === 'ordinateur' ? (monCamp === 'A' ? 'B' : 'A') : undefined;
    matchRef.current = m;
    cameraRef.current.couper({ x: LONGUEUR / 2, y: 35 }, 'suivi');
    const premier = selectionnerJoueurPertinent(m, monCamp);
    if (premier) { selectionRef.current[monCamp] = premier.id; inputRef.current.joueurId = premier.id; }
  }, [equipeA, equipeB, monCamp, salonCode]);

  const annoncerIssue = useCallback((pion: Pion, action: ActionJoueur, issue: ReturnType<typeof jouerGesteMoteur>) => {
    const noms: Partial<Record<ActionJoueur, string>> = {
      passeGauche: 'Passe à gauche', passeDroite: 'Passe à droite', pied: 'Jeu au pied',
      plaquage: 'Plaquage', raffut: 'Raffut', crochet: 'Crochet', grattage: 'Grattage',
      soutien: 'Soutien', monter: 'Montée défensive',
    };
    setMessageAction(`${issue.reussi ? 'Réussi' : issue.joue ? 'Manqué' : 'Préparé'} · ${noms[action] ?? action} de ${pion.nom}`);
    if (issue.joue && navigator.vibrate) navigator.vibrate(issue.reussi ? [18, 28, 18] : 18);
  }, []);

  const choisirJoueur = useCallback((m: EtatMatch, camp: Cote, direction?: Vec, changer = false) => {
    const pion = selectionnerJoueurPertinent(m, camp, selectionRef.current[camp], direction, changer);
    if (pion) {
      selectionRef.current[camp] = pion.id;
      if (camp === monCamp) { inputRef.current.joueurId = pion.id; setPionControleId(pion.id); }
    }
    return pion;
  }, [monCamp]);

  const lancerQteRuck = useCallback((m: EtatMatch, camp: Cote) => {
    if (qteRef.current) return;
    const qte = creerQteArcade('ruck', `${m.sim.toFixed(2)}-${camp}`, Date.now() + decalageServeurRef.current + 260);
    qte.initiateur = camp;
    qteRef.current = qte;
    setQteAffichee({ ...qte });
    setMessageAction('Relâche dans la zone lumineuse pour gratter');
  }, []);

  const traiterEvenement = useCallback((m: EtatMatch, camp: Cote, evenement: EvenementInputArcade) => {
    if (evenement.sequence <= (derniereSequenceTraitee.current[camp] ?? 0)) return;
    derniereSequenceTraitee.current[camp] = evenement.sequence;

    const qte = qteRef.current;
    if (qte) {
      if (qte.type === 'tir' && camp !== qte.initiateur) return;
      if (qte.type === 'touche' && evenement.option) {
        qte.choix ??= {}; qte.choix[camp] = evenement.option;
        setQteAffichee({ ...qte, choix: { ...qte.choix } });
        return;
      }
      if (evenement.action === 'ACTION_PRIMARY' && qte.scores?.[camp] === undefined) {
        const resultat = evaluerQteArcade(qte, evenement.tempsServeurEstime);
        qte.scores ??= {}; qte.scores[camp] = resultat.score;
        setQteAffichee({ ...qte, scores: { ...qte.scores } });
        setMessageAction(resultat.qualite === 'excellent' ? 'Timing excellent' : resultat.qualite === 'bon' ? 'Bon timing' : 'Timing manqué');
        if (navigator.vibrate) navigator.vibrate(resultat.qualite === 'excellent' ? [16, 25, 16] : 12);
      }
      return;
    }

    const direction = evenement.direction ?? { x: 0, y: 0 };
    if (evenement.action === 'SWITCH_PLAYER') {
      const suivant = choisirJoueur(m, camp, direction, true);
      if (suivant && camp === monCamp) setMessageAction(`Tu contrôles ${suivant.nom}`);
      return;
    }

    const pion = choisirJoueur(m, camp, direction);
    if (!pion || !machineRef.current.autorise(pion.id, evenement.action)) return;
    const contexte = actionContextuelleArcade(m, pion);
    let action: ActionJoueur;
    if (evenement.action === 'PASS_LEFT') action = 'passeGauche';
    else if (evenement.action === 'PASS_RIGHT') action = 'passeDroite';
    else if (evenement.action === 'KICK') action = 'pied';
    else if (evenement.action === 'ACTION_SECONDARY') action = contexte.secondaire;
    else action = contexte.principale;

    if (action === 'grattage') { lancerQteRuck(m, camp); return; }

    const issue = jouerGesteMoteur(m, pion, action);
    annoncerIssue(pion, action, issue);
    if (!issue.joue && (action === 'plaquage' || action === 'raffut' || action === 'crochet')) {
      preparationRef.current[camp] = { action, pionId: pion.id, expire: performance.now() + 1050 };
      machineRef.current.transition(pion.id, action === 'plaquage' ? 'TACKLING' : 'RUNNING', true);
    }
  }, [annoncerIssue, choisirJoueur, lancerQteRuck, monCamp]);

  const emettreAction = useCallback((action: Exclude<InputActionArcade, 'MOVE' | 'SPRINT'>, options: { dureeMs?: number; option?: 'court' | 'milieu' | 'long' } = {}) => {
    const trame = inputRef.current.trame(navigator.getGamepads?.()[0], true);
    inputRef.current.emettre(action, { ...options, direction: { x: trame.dx, y: trame.dy } });
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const action = inputRef.current.enfoncer(event.code);
      if (action && action !== 'SPRINT' && action !== 'MOVE') event.preventDefault();
      if (event.repeat || !action || action === 'SPRINT' || action === 'MOVE') return;
      emettreAction(action);
    };
    const up = (event: KeyboardEvent) => { inputRef.current.relacher(event.code); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [emettreAction]);

  useEffect(() => {
    if (mode !== 'reseau' || !salonCode) return;
    let actif = true; let occupe = false;
    const synchroniser = async () => {
      if (occupe) return;
      occupe = true;
      const debut = Date.now();
      try {
        const m = matchRef.current;
        const hote = monCamp === 'A';
        const trame = inputRef.current.trame(navigator.getGamepads?.()[0], true);
        const snapshot = hote && m
          ? serialiserMatch(m, ++revisionRef.current, qteRef.current, derniereSequenceTraitee.current, messageActionRef.current)
          : undefined;
        const res = await synchroniserSalonAmicalApi(
          salonCode, hote ? 'hote' : 'invite', trame, snapshot,
          m?.fini ? 'termine' : 'en_cours',
        );
        if (!actif) return;
        const milieu = (debut + Date.now()) / 2;
        const decalage = res.tempsServeur - milieu;
        decalageServeurRef.current = decalageServeurRef.current * .8 + decalage * .2;
        inputRef.current.reglerDecalageServeur(decalage);
        if (res.inputAdverse) inputAdverseRef.current = res.inputAdverse;
        if (!hote && res.etatMatch && m && res.etatMatch.revision > revisionRef.current) {
          revisionRef.current = res.etatMatch.revision;
          appliquerSnapshot(m, res.etatMatch, monCamp);
          if (m.fini) {
            setScoreA(m.scoreA);
            setScoreB(m.scoreB);
            setTempsSimule(Math.min(DUREE_MATCH_JEU, Math.floor(m.t)));
            setFinDeMatch(true);
          }
          qteRef.current = res.etatMatch.qte ?? null;
          setQteAffichee(qteRef.current ? { ...qteRef.current } : null);
          inputRef.current.acquitter(res.etatMatch.acquittements?.[monCamp] ?? 0);
          if (res.etatMatch.message) setMessageAction(res.etatMatch.message);
        }
      } catch {
        setMessageAction('Reconnexion au match…');
      } finally { occupe = false; }
    };
    void synchroniser();
    const interval = window.setInterval(synchroniser, 150);
    return () => { actif = false; window.clearInterval(interval); };
  }, [mode, monCamp, salonCode]);

  useEffect(() => {
    let animation = 0;
    let precedent = performance.now();
    let precedenteImage = precedent;
    const intervalleSimulation = 1000 / 60;
    const intervalleRendu = appareilTactileRef.current ? 1000 / 18 : 1000 / 24;
    const tick = (maintenant: number) => {
      const dtImage = Math.min((maintenant - precedenteImage) / 1000, .05);
      precedenteImage = maintenant;
      const m = matchRef.current;
      if (m && !m.fini && maintenant - precedent >= intervalleSimulation) {
        const dt = Math.min((maintenant - precedent) / 1000, .1);
        precedent = maintenant;
        if ((m.phase === 'melee' || m.phase === 'touche') && joystickRef.current.actif) {
          joystickRef.current.actif = false;
          inputRef.current.definirTactile(0, 0);
          inputRef.current.definirSprintTactile(false);
          if (joystickMancheRef.current) joystickMancheRef.current.style.transform = '';
          joystickBaseRef.current?.classList.remove('sprint');
        }
        const autoritaire = mode === 'ordinateur' || monCamp === 'A';
        const gamepad = navigator.getGamepads?.()[0] ?? null;
        const trameLocale = inputRef.current.trame(gamepad, true);
        if (gamepad) setManetteDetectee(true);

        if (autoritaire) {
          for (const evenement of trameLocale.evenements) traiterEvenement(m, monCamp, evenement);
          inputRef.current.acquitter(derniereSequenceTraitee.current[monCamp] ?? 0);

          if (mode === 'reseau') {
            const campAdverse: Cote = monCamp === 'A' ? 'B' : 'A';
            const trameAdverse = inputAdverseRef.current;
            if (trameAdverse.joueurId) selectionRef.current[campAdverse] = trameAdverse.joueurId;
            for (const evenement of trameAdverse.evenements ?? []) traiterEvenement(m, campAdverse, evenement);
          }

          const pionLocal = choisirJoueur(m, monCamp, { x: trameLocale.dx, y: trameLocale.dy });
          if (pionLocal) deplacerJoueurArcade(m, pionLocal, trameLocale, dt);
          if (mode === 'reseau') {
            const campAdverse: Cote = monCamp === 'A' ? 'B' : 'A';
            const trameAdverse = inputAdverseRef.current;
            const pionAdverse = choisirJoueur(m, campAdverse, { x: trameAdverse.dx, y: trameAdverse.dy });
            if (pionAdverse) deplacerJoueurArcade(m, pionAdverse, trameAdverse, dt);
          }

          for (const camp of ['A', 'B'] as const) {
            const prep = preparationRef.current[camp];
            if (!prep) continue;
            const pion = m.pions.find((p) => p.id === prep.pionId);
            const cible = prep.action === 'plaquage'
              ? (m.porteur?.cote !== camp ? m.porteur : null)
              : m.pions.filter((p) => p.cote !== camp && p.surLeTerrain).sort((a, b) => distance2(a.pos, pion?.pos ?? m.ballon) - distance2(b.pos, pion?.pos ?? m.ballon))[0];
            if (!pion || !cible || maintenant > prep.expire) { delete preparationRef.current[camp]; continue; }
            const distance = Math.sqrt(distance2(pion.pos, cible.pos));
            if (distance < 3.4 && distance > 1.45 && prep.action === 'plaquage') {
              const aide = Math.min(.22, dt * 1.8);
              pion.pos.x += (cible.pos.x - pion.pos.x) / distance * aide;
              pion.pos.y += (cible.pos.y - pion.pos.y) / distance * aide;
            }
            if (distance <= 1.65) {
              const issue = jouerGesteMoteur(m, pion, prep.action);
              annoncerIssue(pion, prep.action, issue);
              delete preparationRef.current[camp];
            }
          }

          if (m.phase === 'transformation' && m.tir && !m.tir.volLance && m.tir !== tirQteTraiteRef.current && !qteRef.current) {
            tirQteTraiteRef.current = m.tir;
            if (mode === 'reseau' || m.tir.buteur.cote === monCamp) {
              const tir = creerQteArcade('tir', `${salonCode ?? 'solo'}-${m.essaisA + m.essaisB}-${m.sim.toFixed(1)}`, Date.now() + decalageServeurRef.current + 350);
              tir.initiateur = m.tir.buteur.cote;
              tir.etapeTir = 'direction';
              qteRef.current = tir;
              setQteAffichee({ ...tir });
              setMessageAction('Transformation · vise la direction avec la première jauge');
            }
          }

          const phaseQte = m.phase === 'melee' || m.phase === 'touche' ? m.phase : null;
          if (phaseQte) {
            const numero = phaseQte === 'melee' ? m.compteurs.melees : m.compteurs.touches;
            const cle = `${phaseQte}-${numero}`;
            if (!qteRef.current && qtePhaseRef.current !== cle) {
              qtePhaseRef.current = cle;
              qteRef.current = creerQteArcade(phaseQte, `${salonCode ?? 'solo'}-${numero}`, Date.now() + decalageServeurRef.current + 350);
              setQteAffichee({ ...qteRef.current });
              setMessageAction(phaseQte === 'melee' ? 'Mêlée · pousse au bon moment' : 'Touche · choisis la zone puis vise le bon timing');
            }
          }

          const qte = qteRef.current;
          const tempsServeur = Date.now() + decalageServeurRef.current;
          if (qte && tempsServeur >= qte.debutServeur + qte.dureeMs + 180) {
            if (qte.type === 'tir') {
              const score = qte.scores?.[qte.initiateur ?? monCamp] ?? -.2;
              if (qte.etapeTir === 'direction') {
                const puissance = creerQteArcade('tir', `${qte.id}-puissance`, tempsServeur + 350);
                puissance.initiateur = qte.initiateur;
                puissance.etapeTir = 'puissance';
                puissance.directionScore = score;
                qteRef.current = puissance;
                setQteAffichee({ ...puissance });
                setMessageAction('Transformation · dose la puissance avec la deuxième jauge');
              } else {
                const tir = m.tir;
                const reussi = Boolean(tir && transformationArcadeReussie(qte.directionScore ?? -.2, score, tir.angle, tir.distance));
                if (tir) { tir.reussi = reussi; m.minuteur = Math.min(m.minuteur, .45); }
                qteRef.current = null;
                setQteAffichee(null);
                setMessageAction(reussi ? 'Transformation bien frappée !' : 'Transformation manquée · ajuste les deux jauges au prochain essai');
              }
            } else {
              qte.scores ??= {};
              const autreCamp: Cote = monCamp === 'A' ? 'B' : 'A';
              qte.scores[monCamp] ??= -.2;
              qte.scores[autreCamp] ??= mode === 'ordinateur' ? .35 : -.2;
              if (qte.type === 'ruck' && qte.initiateur) {
                const pion = choisirJoueur(m, qte.initiateur);
                if (pion) annoncerIssue(pion, 'grattage', jouerGesteMoteur(m, pion, 'grattage', (qte.scores[qte.initiateur] ?? -.2) * .22));
              } else if (qte.type === 'melee' || qte.type === 'touche') {
                m.bonusConqueteArcade = { type: qte.type, scores: { ...qte.scores } };
                if (qte.type === 'touche') {
                  const choix = qte.choix?.[m.possession] ?? 'milieu';
                  if (m.conquete) m.conquete.combinaison = choix === 'court' ? 'premierBloc' : choix === 'long' ? 'fond' : 'milieu';
                }
                m.minuteur = Math.min(m.minuteur, 2.2);
              }
              qteRef.current = null; setQteAffichee(null);
            }
          }

          if (!qteRef.current) avancer(m, dt);
          machineRef.current.synchroniser(m);
        } else {
          const pionLocal = choisirJoueur(m, monCamp, { x: trameLocale.dx, y: trameLocale.dy });
          if (pionLocal) deplacerJoueurArcade(m, pionLocal, trameLocale, dt);
        }

        choisirJoueur(m, monCamp);
        if (m.fini) {
          setScoreA(m.scoreA);
          setScoreB(m.scoreB);
          setTempsSimule(Math.min(DUREE_MATCH_JEU, Math.floor(m.t)));
          setFinDeMatch(true);
        }
      }
      if (m && !m.fini) {
        // Même principe qu'en carrière : les positions et la caméra suivent
        // chaque image, React ne redessine les pixels des sprites qu'à 18/24 Hz.
        const interpolation = 1 - Math.exp(-dtImage * 18);
        for (const pion of m.pions) {
          const affiche = positionsAfficheesRef.current.get(pion.id);
          if (affiche) {
            affiche.x += (pion.pos.x - affiche.x) * interpolation;
            affiche.y += (pion.pos.y - affiche.y) * interpolation;
          } else positionsAfficheesRef.current.set(pion.id, { ...pion.pos });
        }
        const ballonAffiche = ballonAfficheRef.current ?? { ...m.ballon };
        ballonAffiche.x += (m.ballon.x - ballonAffiche.x) * interpolation;
        ballonAffiche.y += (m.ballon.y - ballonAffiche.y) * interpolation;
        ballonAfficheRef.current = ballonAffiche;

        const controle = m.porteur?.cote === monCamp
          ? m.porteur : m.pions.find((p) => p.id === selectionRef.current[monCamp]);
        const cible = (controle && positionsAfficheesRef.current.get(controle.id)) ?? ballonAffiche;
        const { largeur, hauteur } = dimensionsRef.current;
        const ratio = largeur / hauteur;
        const vue = cameraRef.current.suivre(cible, 'suivi' as Cadrage, ratio, angleDeVue(monCamp, hauteur > largeur), dtImage);
        svgRef.current?.setAttribute('viewBox', vue.viewBox);
        groupeTerrainRef.current?.setAttribute('transform', vue.transform);
        for (const [id, { noeud, origine }] of noeudsPionsRef.current) {
          const pos = positionsAfficheesRef.current.get(id);
          if (pos) noeud.setAttribute('transform', `translate(${(pos.x - origine.x).toFixed(2)} ${(pos.y - origine.y).toFixed(2)})`);
        }
        const ballonNoeud = noeudBallonRef.current;
        if (ballonNoeud) ballonNoeud.noeud.setAttribute('transform',
          `translate(${(ballonAffiche.x - ballonNoeud.origine.x).toFixed(2)} ${(ballonAffiche.y - ballonNoeud.origine.y).toFixed(2)})`);

        if (maintenant - dernierRenduRef.current >= intervalleRendu) {
          dernierRenduRef.current = maintenant;
          setVueCamera({ viewBox: vue.viewBox, transform: vue.transform, redresser: vue.redresser, cadre: vue.cadre });
          if (controle) setEnduranceJauge(Math.round(controle.endurance));
          setScoreA(m.scoreA); setScoreB(m.scoreB);
          setTempsSimule(Math.min(DUREE_MATCH_JEU, Math.floor(m.t)));
          if (qteRef.current) setProgressionQteAffichee(progressionQte(qteRef.current, Date.now() + decalageServeurRef.current));
        }
      }
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [annoncerIssue, choisirJoueur, mode, monCamp, salonCode, traiterEvenement]);

  const debutJoystick = (event: React.PointerEvent<HTMLDivElement>) => {
    if (matchRef.current?.phase === 'melee' || matchRef.current?.phase === 'touche') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    joystickRef.current = { actif: true, id: event.pointerId, departX: event.clientX, departY: event.clientY };
    inputRef.current.definirTactile(0, 0);
    inputRef.current.definirSprintTactile(false);
  };
  const bougerJoystick = (event: React.PointerEvent<HTMLDivElement>) => {
    const joystick = joystickRef.current;
    if (!joystick.actif || joystick.id !== event.pointerId) return;
    const x = event.clientX - joystick.departX;
    const y = event.clientY - joystick.departY;
    const { dx, dy, sprint, px, py } = deflexionJoystickArcade(x, y);
    inputRef.current.definirTactile(dx, dy);
    inputRef.current.definirSprintTactile(sprint);
    if (joystickMancheRef.current) joystickMancheRef.current.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
    joystickBaseRef.current?.classList.toggle('sprint', sprint);
  };
  const finirJoystick = (event: React.PointerEvent<HTMLDivElement>) => {
    if (joystickRef.current.id !== event.pointerId) return;
    joystickRef.current = { actif: false, id: -1, departX: 0, departY: 0 };
    inputRef.current.definirTactile(0, 0);
    inputRef.current.definirSprintTactile(false);
    if (joystickMancheRef.current) joystickMancheRef.current.style.transform = '';
    joystickBaseRef.current?.classList.remove('sprint');
  };

  const debutGeste = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    gesteRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId, debut: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const finGeste = (event: React.PointerEvent<HTMLDivElement>) => {
    const debut = gesteRef.current;
    if (!debut || debut.id !== event.pointerId) return;
    const dx = event.clientX - debut.x; const dy = event.clientY - debut.y;
    gesteRef.current = null;
    const qte = qteRef.current;
    if (qte) {
      if (qte.type === 'touche' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        emettreAction('ACTION_SECONDARY', { option: dx < 0 ? 'court' : 'long' });
      } else if (qte.type === 'touche' && dy > 45 && Math.abs(dy) > Math.abs(dx)) {
        emettreAction('ACTION_SECONDARY', { option: 'milieu' });
      } else emettreAction('ACTION_PRIMARY');
      return;
    }
    const m = matchRef.current;
    if (!m || m.phase === 'melee' || m.phase === 'touche') return;
    const action = actionGesteTactileArcade(dx, dy, m.porteur?.cote === monCamp);
    if (action) emettreAction(action, { dureeMs: performance.now() - debut.debut });
  };

  const m = matchRef.current;
  const terrain = m ? terrainSprites(m) : null;
  const pionsDirects = new Map(terrain?.pions.map((p) => [p.id, p]));
  const tempsSprite = m ? Math.floor(m.sim * (appareilTactileRef.current ? 8 : 12)) / (appareilTactileRef.current ? 8 : 12) : 0;
  const qteLocaleDejaJouee = qteAffichee?.scores?.[monCamp] !== undefined;
  const styleQte = qteAffichee ? {
    '--qte-progression': `${progressionQteAffichee * 100}%`,
    '--qte-cible': `${qteAffichee.cible * 100}%`,
    '--qte-largeur': `${qteAffichee.largeurBonne * 200}%`,
  } as CSSProperties : undefined;

  return <div className="amical-manette-racine" ref={conteneurRef}>
    <header className="amical-entete">
      <button type="button" className="btn fantome amical-btn-retour" onClick={onQuitter}><Icone nom="fleche-droite" taille={16} /> Quitter</button>
      <div className="amical-scoreboard">
        <div className={`amical-equipe domicile ${monCamp === 'A' ? 'mon-camp' : ''}`}><span className="amical-nom-equipe">{equipeA.nom}</span><span className="amical-score">{scoreA}</span></div>
        <div className="amical-centre-chrono"><span className="amical-badge-chrono">{Math.floor(tempsSimule / 60)}:{(tempsSimule % 60).toString().padStart(2, '0')}{m?.sirene ? '+' : ''} / 80:00</span><span className="amical-mode-label">{m ? libellePhase(m) : 'Chargement'}</span></div>
        <div className={`amical-equipe exterieur ${monCamp === 'B' ? 'mon-camp' : ''}`}><span className="amical-score">{scoreB}</span><span className="amical-nom-equipe">{equipeB.nom}</span></div>
      </div>
      <div className="amical-endurance-badge"><Icone nom="eclair" taille={14} /><div className="amical-jauge-endurance"><div style={{ width: `${enduranceJauge}%`, backgroundColor: enduranceJauge > 40 ? '#10b981' : '#f59e0b' }} /></div></div>
    </header>

    <div className="amical-bandeau-action" role="status">{messageAction}{manetteDetectee ? ' · Manette connectée' : ''}</div>

    <div className="amical-terrain-viewport" onPointerDown={debutGeste} onPointerUp={finGeste} onPointerCancel={() => { gesteRef.current = null; }}>
      {vueCamera && m && terrain && <svg ref={svgRef} className="amical-terrain-svg" viewBox={vueCamera.viewBox} preserveAspectRatio="xMidYMid meet">
        <g ref={groupeTerrainRef} transform={vueCamera.transform}>
          <PelouseMemo />
          {m.pions.filter((p) => p.surLeTerrain
            && Math.abs(p.pos.x - vueCamera.cadre.cx) <= vueCamera.cadre.w / 2 + 5.3
            && Math.abs(p.pos.y - vueCamera.cadre.cy) <= vueCamera.cadre.h / 2 + 5.3).map((p) => {
            const direct = pionsDirects.get(p.id);
            if (!direct) return null;
            return <g key={p.id} ref={(noeud) => {
              if (!noeud) { noeudsPionsRef.current.delete(p.id); return; }
              const origine = { ...p.pos };
              noeudsPionsRef.current.set(p.id, { noeud, origine });
              const affiche = positionsAfficheesRef.current.get(p.id) ?? origine;
              noeud.setAttribute('transform', `translate(${(affiche.x - origine.x).toFixed(2)} ${(affiche.y - origine.y).toFixed(2)})`);
            }}>
              <SpriteRugbymanMemo pion={direct} position={p.pos} terrain={terrain} maillot={p.cote === 'A' ? maillotA : maillotB} porteur={m.porteur?.id === p.id} positionPorteur={m.porteur?.pos} redresser={vueCamera.redresser} hauteurMetres={5.3} temps={tempsSprite} compact={appareilTactileRef.current} />
              {p.id === pionControleId && <g transform={`translate(${p.pos.x} ${p.pos.y})`} aria-label="Joueur contrôlé">
                <g transform={vueCamera.redresser} className="amical-fleche-controle">
                  <path d="M0 -4.15 L-.68 -5.25 L.68 -5.25 Z" fill="#ffe181" stroke="#211906" strokeWidth={.16} strokeLinejoin="round" />
                </g>
              </g>}
            </g>;
          })}
          {!m.porteur && <g ref={(noeud) => {
            if (!noeud) { noeudBallonRef.current = null; return; }
            const origine = { ...m.ballon };
            noeudBallonRef.current = { noeud, origine };
            const affiche = ballonAfficheRef.current ?? origine;
            noeud.setAttribute('transform', `translate(${(affiche.x - origine.x).toFixed(2)} ${(affiche.y - origine.y).toFixed(2)})`);
          }}><g transform={`translate(${m.ballon.x}, ${m.ballon.y})`}><ellipse rx={.24} ry={.15} fill="#f4eee1" stroke="#503e32" strokeWidth={.045} /></g></g>}
        </g>
      </svg>}

      {qteAffichee && <div className={`amical-qte amical-qte-${qteAffichee.type}`} style={styleQte}>
        <strong>{qteAffichee.type === 'melee' ? 'Poussée en mêlée' : qteAffichee.type === 'touche' ? 'Duel en touche' : qteAffichee.type === 'tir' ? qteAffichee.etapeTir === 'direction' ? 'Transformation · direction' : 'Transformation · puissance' : 'Grattage'}</strong>
        {qteAffichee.type === 'touche' && <div className="amical-qte-choix">
          {(['court', 'milieu', 'long'] as const).map((option) => <button type="button" key={option} className={qteAffichee.choix?.[monCamp] === option ? 'actif' : ''} onClick={() => emettreAction('ACTION_SECONDARY', { option })}>{option === 'court' ? 'Court' : option === 'milieu' ? 'Milieu' : 'Long'}</button>)}
        </div>}
        {qteAffichee.type === 'touche' && <div className="amical-qte-choix-tactile" aria-label="Zone de lancer">
          {(['court', 'milieu', 'long'] as const).map((option) => <span key={option} className={(qteAffichee.choix?.[monCamp] ?? 'milieu') === option ? 'actif' : ''}>{option === 'court' ? '← Court' : option === 'milieu' ? '↓ Milieu' : 'Long →'}</span>)}
        </div>}
        <div className="amical-qte-jauge"><i /><span /></div>
        <button type="button" disabled={qteLocaleDejaJouee || (qteAffichee.type === 'tir' && qteAffichee.initiateur !== monCamp)} onClick={() => emettreAction('ACTION_PRIMARY')}>{qteLocaleDejaJouee ? 'Timing envoyé' : qteAffichee.type === 'ruck' ? 'Relâcher' : qteAffichee.type === 'tir' ? 'Frapper' : 'Maintenant'}</button>
        <p className="amical-qte-aide-tactile">{qteAffichee.type === 'touche' ? 'Glisse pour choisir · touche la jauge au bon moment' : 'Touche la jauge au bon moment'}</p>
      </div>}
      <div className="amical-geste-indication"><span>{m?.porteur?.cote === monCamp ? '←/→ Passe · ↑ Pied · ↓ Raffut · ↘ Crochet' : 'Glisse pour plaquer · ↑ Changer de joueur'}</span><small>Joystick au bord : sprint automatique</small></div>
    </div>

    <footer className="amical-hud">
      <div className="amical-joystick-zone" onPointerDown={debutJoystick} onPointerMove={bougerJoystick} onPointerUp={finirJoystick} onPointerCancel={finirJoystick} aria-label="Joystick de déplacement, bord extérieur pour sprinter" aria-disabled={m?.phase === 'melee' || m?.phase === 'touche'}>
        <div className="amical-joystick-base" ref={joystickBaseRef}><div className="amical-joystick-manche" ref={joystickMancheRef} /></div><span className="amical-joystick-guide">{m?.phase === 'melee' || m?.phase === 'touche' ? 'Placement verrouillé' : 'Bord extérieur : sprint'}</span>
      </div>
    </footer>

    <div className="amical-aide-pc">WASD · Maj sprint · Q/E passes · Espace action · F action 2 · C pied · Tab changer</div>

    {finDeMatch && <div className="amical-modale-fin" role="dialog" aria-modal="true"><div className="amical-modale-contenu carte">
      <h2>Fin du match</h2><div className="amical-score-final"><span>{equipeA.nom} <b>{scoreA}</b></span><span>–</span><span><b>{scoreB}</b> {equipeB.nom}</span></div>
      <p className="amical-message-vainqueur">{scoreA > scoreB ? `Victoire de ${equipeA.nom}` : scoreB > scoreA ? `Victoire de ${equipeB.nom}` : 'Match nul'}</p>
      <button type="button" className="btn primaire" onClick={onQuitter}>Retour à la collection</button>
    </div></div>}
    {portraitMobile && <div className="amical-paysage-requis" role="dialog" aria-modal="true" aria-label="Mode paysage requis">
      <strong>Tourne ton téléphone en mode paysage</strong>
      <p>Le terrain et les commandes sont prévus pour un écran horizontal.</p>
      <button type="button" onClick={() => { void activerPaysage(); }}>Passer en plein écran</button>
      <button type="button" className="amical-paysage-quitter" onClick={onQuitter}>Quitter le match</button>
    </div>}
  </div>;
}
