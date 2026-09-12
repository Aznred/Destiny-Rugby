import { AXE, LIGNE_A, LIGNE_B, MILIEU, borner, type Vec } from '../moteur/terrain.js';
import type { Cadrage } from '../moteur/camera.js';
import type { CoteEnLigne, TerrainDirect } from './matchCarriere.js';

export type TypeScenarioDirect =
  | 'coupEnvoi' | 'renvoi22' | 'ruck' | 'melee' | 'touche' | 'maul'
  | 'penalite' | 'tirAuBut' | 'transformation' | 'apresEssai' | 'miTemps'
  | 'jeuRas' | 'pod' | 'jeuLarge' | 'passeSautee' | 'pickAndGo'
  | 'passe' | 'offload' | 'degagement' | 'occupation' | 'chandelle'
  | 'cinquanteVingtDeux' | 'rasant' | 'transversale' | 'drop' | 'penaltouche'
  | 'renvoi' | 'franchissement' | 'ballonLibre' | 'jeuCourant' | 'fini';

export type ZoneScenarioDirect =
  | 'enButAdverse' | 'cinqAdverse' | 'vingtDeuxAdverse' | 'campAdverse'
  | 'milieu' | 'campPropre' | 'vingtDeuxPropre' | 'enButPropre';
export type CouloirScenarioDirect = 'gauche' | 'axe' | 'droite';
export type IntensiteScenarioDirect = 'calme' | 'active' | 'forte';

/**
 * Une description stable de l'action en cours. Le moteur garde la vérité du
 * résultat ; cette couche ne fait qu'identifier la bonne mise en scène.
 *
 * Type × zone × couloir × intensité donne plusieurs centaines de variantes
 * sans envoyer de coordonnées inventées ni exposer le plan de score au client.
 */
export interface ScenarioDirect {
  id: string;
  type: TypeScenarioDirect;
  zone: ZoneScenarioDirect;
  couloir: CouloirScenarioDirect;
  intensite: IntensiteScenarioDirect;
  possession: CoteEnLigne;
  sequence: number;
  progression: number;
  ballonLent: boolean;
  momentFort: boolean;
  cadrage: Cadrage;
  cibleCamera: Vec;
}

function positionBallon(t: TerrainDirect): Vec {
  if (t.porteurId) {
    const porteur = t.pions.find((p) => p.id === t.porteurId);
    if (porteur) return { x: porteur.x, y: porteur.y };
  }
  return t.ballon;
}

function zoneDe(x: number, cote: CoteEnLigne): ZoneScenarioDirect {
  const avance = cote === 'domicile' ? x : LIGNE_B - (x - LIGNE_A);
  if (avance >= LIGNE_B) return 'enButAdverse';
  if (avance >= LIGNE_B - 5) return 'cinqAdverse';
  if (avance >= LIGNE_B - 22) return 'vingtDeuxAdverse';
  if (avance > MILIEU + 8) return 'campAdverse';
  if (avance >= MILIEU - 8) return 'milieu';
  if (avance <= LIGNE_A) return 'enButPropre';
  if (avance <= LIGNE_A + 22) return 'vingtDeuxPropre';
  return 'campPropre';
}

function couloirDe(y: number): CouloirScenarioDirect {
  if (y < AXE - 12) return 'gauche';
  if (y > AXE + 12) return 'droite';
  return 'axe';
}

function typeDe(t: TerrainDirect): TypeScenarioDirect {
  const phase = t.phase;
  if (phase !== 'jeuCourant' && phase !== 'ballonEnLAir') {
    if (phase === 'bagarre') return 'ballonLibre';
    return phase;
  }
  const intention = t.vol?.intention ?? t.lancement?.intention;
  if (t.vol?.type === 'passe') return t.vol.intention === 'offload' ? 'offload' : 'passe';
  if (intention && intention !== 'passe') return intention;
  if ((t.metresGagnes ?? 0) >= 8) return 'franchissement';
  switch (t.lancement?.type) {
    case 'ras': return 'jeuRas';
    case 'pod': return 'pod';
    case 'large': return 'jeuLarge';
    case 'saute': return 'passeSautee';
    case 'pickAndGo': return 'pickAndGo';
    case 'pied': return t.lancement.intention ?? 'occupation';
    default: return t.porteurId ? 'jeuCourant' : 'ballonLibre';
  }
}

export function creerScenarioDirect(t: TerrainDirect): ScenarioDirect {
  const ballon = positionBallon(t);
  const type = typeDe(t);
  const zone = zoneDe(ballon.x, t.possession);
  const couloir = couloirDe(ballon.y);
  const progression = Math.max(0, t.metresGagnes ?? 0);
  const porteur = t.porteurId ? t.pions.find((p) => p.id === t.porteurId) : undefined;
  const vitessePorteur = porteur ? Math.hypot(porteur.vx, porteur.vy) : 0;
  const actionTranchante = new Set<TypeScenarioDirect>([
    'franchissement', 'offload', 'passeSautee', 'pickAndGo', 'rasant',
    'transversale', 'drop', 'cinquanteVingtDeux',
  ]).has(type);
  const zoneDangereuse = zone === 'enButAdverse' || zone === 'cinqAdverse' || zone === 'vingtDeuxAdverse';
  const phaseArretee = new Set<TypeScenarioDirect>([
    'coupEnvoi', 'renvoi22', 'melee', 'touche', 'penalite', 'tirAuBut',
    'transformation', 'apresEssai', 'miTemps', 'fini',
  ]).has(type);
  const forte = type === 'tirAuBut' || type === 'transformation'
    || (!phaseArretee && (zone === 'enButAdverse' || zone === 'cinqAdverse'
      || progression >= 8 || vitessePorteur >= 7 || actionTranchante));
  const active = forte || zoneDangereuse || Boolean(t.vol) || (!phaseArretee && type !== 'jeuCourant');
  const intensite: IntensiteScenarioDirect = forte ? 'forte' : active ? 'active' : 'calme';
  const cibleCamera = t.vol
    ? { x: borner((ballon.x + t.vol.vers.x) / 2, 0, LIGNE_B + LIGNE_A), y: borner((ballon.y + t.vol.vers.y) / 2, 0, AXE * 2) }
    : ballon;
  const sequence = Math.max(1, t.sequence ?? 1);

  return {
    id: [type, zone, couloir, intensite, sequence].join(':'),
    type, zone, couloir, intensite, possession: t.possession, sequence,
    progression, ballonLent: Boolean(t.ballonLent), momentFort: forte,
    cadrage: forte ? 'proche' : active ? 'suivi' : 'large', cibleCamera,
  };
}
