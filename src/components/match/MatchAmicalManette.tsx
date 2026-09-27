import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Icone } from '../Icone';
import { PelouseMemo } from './Pelouse';
import { SpriteRugbymanMemo } from './SpriteRugbyman';
import { Camera, angleDeVue, type Cadrage } from '../../lib/moteur/camera';
import { LONGUEUR, distance2, type Cote, type Vec } from '../../lib/moteur/terrain';
import { avancer, creerMatch, resoudreChoix, type EtatMatch } from '../../lib/moteur/moteur';
import type { ActionJoueur } from '../../lib/moteur/etat';
import type { Pion } from '../../lib/moteur/entites';
import type { MaillotMatch } from '../../lib/moteur/apparenceMatch';
import type { PionDirect, TerrainDirect } from '../../lib/ligue/matchCarriere';
import {
  actionContextuelleArcade, creerQteArcade, deplacerJoueurArcade, etatGlobalArcade,
  evaluerQteArcade, InputManagerArcade, interpolerPosition, MachineEtatsJoueurs,
  progressionQte, selectionnerJoueurPertinent, type EvenementInputArcade,
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

const DUREE_MATCH = 10 * 60;
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
    revision, simulation: m.sim, minute: m.minute, scoreA: m.scoreA, scoreB: m.scoreB,
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
      ? interpolerPosition(pion.pos, { x: recu.x, y: recu.y })
      : { x: recu.x, y: recu.y };
    pion.pos.x = position.x; pion.pos.y = position.y;
    pion.vitesse.x = recu.vx; pion.vitesse.y = recu.vy;
    pion.endurance = recu.endurance; pion.surLeTerrain = recu.surLeTerrain;
    if (typeof recu.battu === 'number') pion.battu = recu.battu;
    if (recu.role) pion.role = recu.role as Pion['role'];
  }
  m.sim = snapshot.simulation; m.minute = snapshot.minute;
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
  const preparationRef = useRef<Partial<Record<Cote, { action: 'plaquage' | 'raffut' | 'crochet'; pionId: string; expire: number }>>>({});
  const decalageServeurRef = useRef(0);
  const gesteRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const joystickRef = useRef({ actif: false, departX: 0, departY: 0, dx: 0, dy: 0 });
  const pressionActionRef = useRef(0);
  const pressionPiedRef = useRef(0);
  const dernierRenduRef = useRef(0);

  const [vueCamera, setVueCamera] = useState<{ viewBox: string; transform: string; redresser: string } | null>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [tempsSimule, setTempsSimule] = useState(0);
  const [messageAction, setMessageAction] = useState('Coup d’envoi');
  const [finDeMatch, setFinDeMatch] = useState(false);
  const [pionControleId, setPionControleId] = useState<string | null>(null);
  const [enduranceJauge, setEnduranceJauge] = useState(100);
  const [manetteDetectee, setManetteDetectee] = useState(false);
  const [sprintActif, setSprintActif] = useState(false);
  const [qteAffichee, setQteAffichee] = useState<QteArcade | null>(null);
  const [progressionQteAffichee, setProgressionQteAffichee] = useState(0);
  const [versionRendu, setVersionRendu] = useState(0);

  const maillotA = useMemo(() => maillot(equipeA.couleur || '#1e40af', equipeB.couleur || '#f8fafc'), [equipeA.couleur, equipeB.couleur]);
  const maillotB = useMemo(() => maillot(equipeB.couleur || '#dc2626', equipeA.couleur || '#f8fafc'), [equipeA.couleur, equipeB.couleur]);

  useEffect(() => {
    const m = creerMatch(
      equipeA.nom, equipeB.nom,
      convertirEnCoequipiers(equipeA.joueurs), convertirEnCoequipiers(equipeB.joueurs),
      20, 17, `collection#${salonCode ?? Date.now()}`, undefined,
      { niveau: 'pro', tempsReel: true, controle: false },
    );
    m.carriereDixMinutes = true;
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
          ? serialiserMatch(m, ++revisionRef.current, qteRef.current, derniereSequenceTraitee.current, messageAction)
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
    const interval = window.setInterval(synchroniser, 100);
    return () => { actif = false; window.clearInterval(interval); };
  }, [messageAction, mode, monCamp, salonCode]);

  useEffect(() => {
    let animation = 0;
    let precedent = performance.now();
    const tick = (maintenant: number) => {
      const dt = Math.min((maintenant - precedent) / 1000, .05);
      precedent = maintenant;
      const m = matchRef.current;
      if (m && !m.fini) {
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

          if (!qteRef.current) avancer(m, dt);
          machineRef.current.synchroniser(m);
        } else {
          const pionLocal = choisirJoueur(m, monCamp, { x: trameLocale.dx, y: trameLocale.dy });
          if (pionLocal) deplacerJoueurArcade(m, pionLocal, trameLocale, dt);
        }

        const controle = choisirJoueur(m, monCamp);
        if (controle) { setPionControleId(controle.id); setEnduranceJauge(Math.round(controle.endurance)); }
        setScoreA(m.scoreA); setScoreB(m.scoreB); setTempsSimule(Math.min(DUREE_MATCH, Math.floor(m.sim)));
        if (m.fini || m.sim >= DUREE_MATCH) { m.fini = true; m.phase = 'fini'; setFinDeMatch(true); }

        const cible: Vec = controle?.pos ?? m.porteur?.pos ?? m.ballon;
        const rect = conteneurRef.current?.getBoundingClientRect();
        const ratio = rect ? rect.width / Math.max(1, rect.height) : 16 / 9;
        const angle = angleDeVue(monCamp, Boolean(rect && rect.height > rect.width));
        const vue = cameraRef.current.suivre(cible, 'suivi' as Cadrage, ratio, angle, dt);
        setVueCamera({ viewBox: vue.viewBox, transform: vue.transform, redresser: vue.redresser });

        if (qteRef.current) setProgressionQteAffichee(progressionQte(qteRef.current, Date.now() + decalageServeurRef.current));
        if (maintenant - dernierRenduRef.current > 42) {
          dernierRenduRef.current = maintenant; setVersionRendu((v) => v + 1);
        }
      }
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [annoncerIssue, choisirJoueur, mode, monCamp, salonCode, traiterEvenement]);

  const debutJoystick = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    joystickRef.current = { actif: true, departX: touch.clientX, departY: touch.clientY, dx: 0, dy: 0 };
  };
  const bougerJoystick = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickRef.current.actif) return;
    const touch = event.touches[0];
    const x = touch.clientX - joystickRef.current.departX;
    const y = touch.clientY - joystickRef.current.departY;
    const distance = Math.hypot(x, y); const force = Math.min(1, distance / 45); const angle = Math.atan2(y, x);
    joystickRef.current.dx = Math.cos(angle) * force; joystickRef.current.dy = Math.sin(angle) * force;
    inputRef.current.definirTactile(joystickRef.current.dx, joystickRef.current.dy);
  };
  const finirJoystick = () => {
    joystickRef.current = { actif: false, departX: 0, departY: 0, dx: 0, dy: 0 };
    inputRef.current.definirTactile(0, 0);
  };

  const debutGeste = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    gesteRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const finGeste = (event: React.PointerEvent<HTMLDivElement>) => {
    const debut = gesteRef.current;
    if (!debut || debut.id !== event.pointerId) return;
    const dx = event.clientX - debut.x; const dy = event.clientY - debut.y;
    gesteRef.current = null;
    if (Math.abs(dx) > 58 && Math.abs(dx) > Math.abs(dy)) emettreAction(dx < 0 ? 'PASS_LEFT' : 'PASS_RIGHT');
    else if (dy < -70) emettreAction('KICK');
  };

  const m = matchRef.current;
  void versionRendu;
  const terrain = m ? terrainSprites(m) : null;
  const pionControle = m?.pions.find((p) => p.id === pionControleId);
  const contexte = m ? actionContextuelleArcade(m, pionControle) : null;
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
        <div className="amical-centre-chrono"><span className="amical-badge-chrono">{Math.floor(tempsSimule / 60)}:{(tempsSimule % 60).toString().padStart(2, '0')} / 10:00</span><span className="amical-mode-label">{m ? libellePhase(m) : 'Chargement'}</span></div>
        <div className={`amical-equipe exterieur ${monCamp === 'B' ? 'mon-camp' : ''}`}><span className="amical-score">{scoreB}</span><span className="amical-nom-equipe">{equipeB.nom}</span></div>
      </div>
      <div className="amical-endurance-badge"><Icone nom="eclair" taille={14} /><div className="amical-jauge-endurance"><div style={{ width: `${enduranceJauge}%`, backgroundColor: enduranceJauge > 40 ? '#10b981' : '#f59e0b' }} /></div></div>
    </header>

    <div className="amical-bandeau-action" role="status">{messageAction}{manetteDetectee ? ' · Manette connectée' : ''}</div>

    <div className="amical-terrain-viewport" onPointerDown={debutGeste} onPointerUp={finGeste} onPointerCancel={() => { gesteRef.current = null; }}>
      {vueCamera && m && terrain && <svg className="amical-terrain-svg" viewBox={vueCamera.viewBox} preserveAspectRatio="xMidYMid meet">
        <g transform={vueCamera.transform}>
          <PelouseMemo />
          {m.pions.filter((p) => p.surLeTerrain).map((p) => {
            const direct = terrain.pions.find((candidat) => candidat.id === p.id)!;
            const controle = p.id === pionControleId;
            return <g key={p.id}>
              {controle && <circle cx={p.pos.x} cy={p.pos.y} r={2.45} fill="none" stroke="#ffd700" strokeWidth={.34} strokeDasharray=".8,.35" className="halo-controle" />}
              <SpriteRugbymanMemo pion={direct} position={p.pos} terrain={terrain} maillot={p.cote === 'A' ? maillotA : maillotB} porteur={m.porteur?.id === p.id} positionPorteur={m.porteur?.pos} redresser={vueCamera.redresser} hauteurMetres={5.3} temps={m.sim} />
            </g>;
          })}
          {!m.porteur && <g transform={`translate(${m.ballon.x}, ${m.ballon.y})`}><ellipse rx={.7} ry={.42} fill="#854d0e" stroke="#fef08a" strokeWidth={.12} /></g>}
        </g>
      </svg>}

      {qteAffichee && <div className={`amical-qte amical-qte-${qteAffichee.type}`} style={styleQte}>
        <strong>{qteAffichee.type === 'melee' ? 'Poussée en mêlée' : qteAffichee.type === 'touche' ? 'Duel en touche' : 'Grattage'}</strong>
        {qteAffichee.type === 'touche' && <div className="amical-qte-choix">
          {(['court', 'milieu', 'long'] as const).map((option) => <button type="button" key={option} className={qteAffichee.choix?.[monCamp] === option ? 'actif' : ''} onClick={() => emettreAction('ACTION_SECONDARY', { option })}>{option === 'court' ? 'Court' : option === 'milieu' ? 'Milieu' : 'Long'}</button>)}
        </div>}
        <div className="amical-qte-jauge"><i /><span /></div>
        <button type="button" disabled={qteLocaleDejaJouee} onClick={() => emettreAction('ACTION_PRIMARY')}>{qteLocaleDejaJouee ? 'Timing envoyé' : qteAffichee.type === 'ruck' ? 'Relâcher' : 'Maintenant'}</button>
      </div>}
      <div className="amical-geste-indication">Glisse horizontalement pour passer · vers le haut pour jouer au pied</div>
    </div>

    <footer className="amical-hud">
      <div className="amical-joystick-zone" onTouchStart={debutJoystick} onTouchMove={bougerJoystick} onTouchEnd={finirJoystick} onTouchCancel={finirJoystick} aria-label="Joystick de déplacement">
        <div className="amical-joystick-base"><div className="amical-joystick-manche" style={{ transform: `translate(${joystickRef.current.dx * 35}px, ${joystickRef.current.dy * 35}px)` }} /></div><span className="amical-joystick-guide">Déplacement</span>
      </div>
      <div className="amical-actions-zone">
        <button type="button" className="amical-btn-action passe gauche" onClick={() => emettreAction('PASS_LEFT')}><span>‹</span> Passe</button>
        <button type="button" className={`amical-btn-action sprint ${sprintActif ? 'actif' : ''}`} onPointerDown={() => { setSprintActif(true); inputRef.current.definirSprintTactile(true); }} onPointerUp={() => { setSprintActif(false); inputRef.current.definirSprintTactile(false); }} onPointerCancel={() => { setSprintActif(false); inputRef.current.definirSprintTactile(false); }}>Sprint</button>
        <button type="button" className="amical-btn-action principal action-contextuelle" onPointerDown={() => { pressionActionRef.current = performance.now(); }} onPointerUp={() => { const duree = performance.now() - pressionActionRef.current; emettreAction(duree > 420 ? 'ACTION_SECONDARY' : 'ACTION_PRIMARY', { dureeMs: duree }); }}><b>{contexte?.libellePrincipal ?? 'Action'}</b><small>maintenir : {contexte?.libelleSecondaire ?? 'action 2'}</small></button>
        <button type="button" className="amical-btn-action passe droite" onClick={() => emettreAction('PASS_RIGHT')}>Passe <span>›</span></button>
        {contexte?.piedVisible && <button type="button" className="amical-btn-pied-contextuel" onPointerDown={() => { pressionPiedRef.current = performance.now(); }} onPointerUp={() => emettreAction('KICK', { dureeMs: performance.now() - pressionPiedRef.current })}>Jeu au pied</button>}
      </div>
      <button type="button" className="amical-btn-changer" onClick={() => emettreAction('SWITCH_PLAYER')} aria-label="Changer de joueur">Changer</button>
    </footer>

    <div className="amical-aide-pc">WASD · Maj sprint · Q/E passes · Espace action · F action 2 · C pied · Tab changer</div>

    {finDeMatch && <div className="amical-modale-fin" role="dialog" aria-modal="true"><div className="amical-modale-contenu carte">
      <h2>Fin du match</h2><div className="amical-score-final"><span>{equipeA.nom} <b>{scoreA}</b></span><span>–</span><span><b>{scoreB}</b> {equipeB.nom}</span></div>
      <p className="amical-message-vainqueur">{scoreA > scoreB ? `Victoire de ${equipeA.nom}` : scoreB > scoreA ? `Victoire de ${equipeB.nom}` : 'Match nul'}</p>
      <button type="button" className="btn primaire" onClick={onQuitter}>Retour à la collection</button>
    </div></div>}
  </div>;
}
