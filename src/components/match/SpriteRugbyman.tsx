import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import type { PionDirect, TerrainDirect } from '../../lib/ligue/matchCarriere';
import type { Vec } from '../../lib/moteur/terrain';
import { apparenceJoueurMatch, graineVisuelleMatch, type MaillotMatch } from '../../lib/moteur/apparenceMatch';
import { CharacterRenderer } from '../../lib/spritesGenerateur/renderer';
import { mirrorPose, poseAtTime } from '../../lib/spritesGenerateur/engine';
import { rugbyAnimations } from '../../lib/spritesGenerateur/rugbyAnimations';
import type { AnimationClip, BodyType, Character, KitPattern, Orientation } from '../../lib/spritesGenerateur/models';
import { orientationSprite } from '../../lib/moteur/orientationSprite';

export type AnimationRugby = string;

const CLIPS = new Map(rugbyAnimations.map(clip => [clip.id.replace(/^rugby_/, ''), clip]));
// Le générateur produit du pixel art : une surface Retina de 190×290 par joueur
// gaspillait quatre fois plus de pixels sans ajouter de détail visible. Trente
// joueurs + l'arbitre restent ainsi nettement sous le budget d'une image 60 Hz.
const LARGEUR_CANVAS = 96;
const HAUTEUR_CANVAS = 146;

interface Props {
  pion: PionDirect;
  position: Vec;
  terrain: TerrainDirect;
  maillot: MaillotMatch;
  porteur?: boolean;
  positionPorteur?: Vec;
  redresser?: string;
  hauteurMetres: number;
  temps: number;
  angleVue?: number;
}

const MOTIFS: Record<MaillotMatch['motif'], KitPattern> = {
  uni: 'SOLID', cerceaux: 'HOOPS', rayures: 'VERTICAL_STRIPES',
  epaules: 'SHOULDERS', bande: 'CHEST_STRIPE', diagonale: 'DIAGONAL',
};

const TYPES: Record<ReturnType<typeof apparenceJoueurMatch>['morphologie'], BodyType> = {
  pilier: 'prop', avant: 'forward', athletique: 'athletic', arriere: 'back', ailier: 'winger',
};

function animationDe(p: PionDirect, pos: Vec, terrain: TerrainDirect, porteur: boolean, positionPorteur?: Vec): AnimationRugby {
  const instant = terrain.simulation ?? 0;
  const geste = terrain.gestes?.filter((g) => g.joueurId === p.id && instant >= g.debut && instant < g.debut + g.duree).at(-1);
  if (geste && CLIPS.has(geste.clip)) return geste.clip;
  if (p.corps && p.corps.age < p.corps.duree) return p.corps.age > p.corps.duree - .5 ? 'getup' : 'tackled';
  if (terrain.preparationTir?.buteurId === p.id) {
    const k = terrain.preparationTir.progression;
    return k > .85 ? terrain.preparationTir.transformation ? 'conversion' : 'penalty'
      : k > .3 && k < .5 ? 'walk' : k < .3 && Math.hypot(p.vx, p.vy) > .5 ? 'jog' : 'ready';
  }
  if (terrain.aplatissage?.marqueurId === p.id) return terrain.aplatissage.progression > .78 ? 'celebrate' : 'try';
  if (terrain.contact && terrain.contact.progression < 1 && terrain.contact.porteurId === p.id) return 'tackled';
  if (terrain.contact && terrain.contact.progression < 1 && terrain.contact.plaqueurId === p.id) return 'tackle';
  const vitesse = Math.hypot(p.vx, p.vy);
  const distanceBallon = Math.hypot(pos.x - terrain.ballon.x, pos.y - terrain.ballon.y);
  const role = p.numeroRole ?? p.numero;
  if (terrain.conquete?.type === 'melee' && role <= 8 && distanceBallon < 8) return terrain.conquete.progression < .4 ? 'scrum_bind' : role === 2 ? 'scrum_hook' : 'scrum';
  if (terrain.conquete?.type === 'touche') {
    const cible = terrain.pions.find((q) => q.id === terrain.conquete?.cibleId);
    if (p.id === cible?.id) return 'lineout_jump';
    if (p.cote === terrain.possession && role === 2) return 'lineout_throw';
    if (cible && p.cote === cible.cote && role <= 8 && role !== 2) {
      const lifteurs = terrain.pions
        .filter((q) => q.cote === cible.cote && (q.numeroRole ?? q.numero) <= 8 && (q.numeroRole ?? q.numero) !== 2 && q.id !== cible.id)
        .sort((a, b) => Math.hypot(a.x - cible.x, a.y - cible.y) - Math.hypot(b.x - cible.x, b.y - cible.y))
        .slice(0, 2);
      if (lifteurs.some((q) => q.id === p.id)) return 'lineout_lift';
    }
    if (distanceBallon < 10) return 'idle';
  }
  if (terrain.phase === 'maul' && distanceBallon < 5) return 'maul';
  if (terrain.phase === 'ruck' && distanceBallon < 4.2) return p.cote === terrain.possession ? 'clearout' : 'jackal';
  if (terrain.vol?.auteurId === p.id && terrain.vol.ecoule < 1.4) return terrain.vol.type === 'pied'
    ? terrain.vol.intention === 'renvoi' ? 'restart' : terrain.vol.intention === 'rasant' ? 'grubber'
      : terrain.vol.intention === 'chandelle' ? 'chip' : terrain.vol.intention === 'drop' ? 'drop' : role === 9 ? 'box_kick' : 'punt'
    : terrain.vol.intention === 'offload' ? 'offload' : terrain.vol.vers.y < terrain.vol.de.y ? 'pass_left' : 'pass';
  if (terrain.vol?.receveurId === p.id) return 'catch';
  if (positionPorteur && p.cote !== terrain.possession && Math.hypot(pos.x - positionPorteur.x, pos.y - positionPorteur.y) < 2.2) return 'tackle';
  if (terrain.phase === 'ballonLibre' && distanceBallon < 1.8) return 'pickup';
  if (porteur) return vitesse > 7.2 ? 'sprint_ball' : vitesse > .7 ? 'run_ball' : 'ready';
  if (p.cote !== terrain.possession && Math.abs(p.vy) > Math.abs(p.vx) * 1.5 && vitesse > .7) return 'sidestep';
  return vitesse > 7.2 ? 'sprint' : vitesse > 3.5 ? 'run' : vitesse > 1.5 ? 'jog' : vitesse > .55 ? 'walk' : 'idle';
}

function personnage(pion: PionDirect, maillot: MaillotMatch): Character {
  const a = apparenceJoueurMatch(pion.nom, pion.poste);
  const taille = Math.max(.88, Math.min(1.12, a.tailleCm / 184));
  const largeur = Math.max(.82, Math.min(1.28, a.poidsKg / (a.tailleCm - 87)));
  return {
    id: pion.id, name: pion.nom, position: pion.poste,
    appearance: {
      skin: a.peau, bodyType: TYPES[a.morphologie],
      hair: { style: a.coiffure, color: a.cheveux },
      facialHair: { style: graineVisuelleMatch(pion.nom) % 5 === 0 ? 'short_beard' : 'none', color: a.cheveux },
      body: {
        height: taille, torsoLength: taille, torsoWidth: largeur,
        shoulderWidth: Math.max(.9, largeur), armLength: taille,
        armThickness: Math.sqrt(largeur), legLength: taille,
        legThickness: Math.sqrt(largeur), headScale: Math.max(.92, Math.min(1.08, 1 / taille)),
      },
      kit: {
        primary: maillot.principal, secondary: maillot.secondaire, accent: maillot.accent,
        pattern: MOTIFS[maillot.motif], shorts: maillot.short,
        socks: maillot.chaussettes, boots: '#111519',
      },
      number: pion.numero,
    },
  };
}

function dessinerSprite(
  canvas: HTMLCanvasElement, renderer: CharacterRenderer, character: Character,
  clip: AnimationClip, temps: number, graine: number, orientation: Orientation, afficherBallon: boolean,
  progression?: number, corps?: PionDirect['corps'],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);
  const duree = clip.frames.length / clip.fps;
  const local = progression === undefined
    ? (temps + (graine % 997) / 997 * duree) % Math.max(.01, duree)
    : Math.max(0, Math.min(.999, progression)) * duree;
  let pose = poseAtTime(clip, local * clip.fps);
  if (orientation === 'left') pose = mirrorPose(pose);
  pose.orientation = orientation;
  // Le déplacement appartient au moteur. Le root du clip ne fait pas glisser
  // un joueur de plusieurs mètres en plus de sa trajectoire physique.
  pose.root.x = 0;
  if (corps && corps.age < corps.duree - .5) {
    const impact = Math.sin(Math.min(1, corps.age / .6) * Math.PI) * corps.intensite;
    pose.bones.leftForearm.rotation += impact * 22;
    pose.bones.rightShin.rotation -= impact * 28;
    pose.root.rotation += Math.sin(corps.direction) * impact * 12;
  }
  // Le ballon du terrain disparaît dès qu'un joueur le porte : c'est alors
  // celui du générateur qui vit dans ses mains et suit réellement la pose.
  if (!afficherBallon) pose.ball.attachment = 'HIDDEN';
  else {
    if (pose.ball.attachment === 'HIDDEN') {
      pose.ball.attachment = 'RIGHT_HAND';
      pose.ball.x = 0;
      pose.ball.y = 0;
    }
    pose.ball.scale = (pose.ball.scale || 1) * .56;
  }
  renderer.draw(ctx, character, pose, {
    width: LARGEUR_CANVAS, height: HAUTEUR_CANVAS, zoom: .36,
    pan: { x: 0, y: -1 }, showField: false, showSkeleton: false,
  });
}

function SpriteRugbyman({ pion, position, terrain, maillot, porteur = false, positionPorteur, redresser, hauteurMetres, temps, angleVue = 0 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useMemo(() => new CharacterRenderer(), []);
  const character = useMemo(() => personnage(pion, maillot), [pion.id, pion.nom, pion.numero, pion.poste, maillot]);
  const animation = animationDe(pion, position, terrain, porteur, positionPorteur);
  const clip = CLIPS.get(animation) ?? CLIPS.get('idle')!;
  const sensAffichage = useRef({ x: pion.cote === 'exterieur' ? -1 : 1, y: 0 });
  // On conserve le dernier vrai sens de course pendant le freinage. Le joueur
  // qui se replie ne fait donc plus quelques pas en marche arrière.
  if (Math.hypot(pion.vx, pion.vy) > .15) sensAffichage.current = { x: pion.vx, y: pion.vy };
  const direction = sensAffichage.current;
  const orientation = orientationSprite(direction, angleVue);
  const instant = terrain.simulation ?? temps;
  const geste = terrain.gestes?.filter((g) => g.joueurId === pion.id && instant >= g.debut && instant < g.debut + g.duree).at(-1);
  const progression = geste ? (instant - geste.debut) / geste.duree
    : pion.corps ? animation === 'getup' ? (pion.corps.age - pion.corps.duree + .5) / .5 : Math.min(1, pion.corps.age / 1.2)
    : terrain.preparationTir?.buteurId === pion.id && terrain.preparationTir.progression > .85 ? (terrain.preparationTir.progression - .85) / .15 * .55
    : terrain.contact && (terrain.contact.porteurId === pion.id || terrain.contact.plaqueurId === pion.id)
    ? terrain.contact.progression
    : terrain.conquete?.type === 'touche' && animation.startsWith('lineout_')
      ? terrain.conquete.progression
      : undefined;
  const ballonTouche = terrain.conquete?.type === 'touche'
    && (terrain.conquete.progression < .58
      ? pion.cote === terrain.possession && (pion.numeroRole ?? pion.numero) === 2
      : pion.id === terrain.conquete.cibleId);
  const ballonAnime = porteur || ballonTouche;
  const graine = graineVisuelleMatch(pion.id);
  const derniereImage = useRef('');
  useLayoutEffect(() => {
    const cle = `${character.id}:${maillot.principal}:${maillot.secondaire}:${maillot.motif}:${clip.id}:${orientation}:${ballonAnime}:${Math.floor((progression ?? temps) * 24)}:${Math.floor((pion.corps?.age ?? 0) * 24)}`;
    if (cle === derniereImage.current) return;
    derniereImage.current = cle;
    if (canvas.current) dessinerSprite(canvas.current, renderer, character, clip, temps, graine, orientation, ballonAnime, progression, pion.corps);
  }, [renderer, character, clip, temps, graine, orientation, ballonAnime, progression, pion.corps, maillot]);

  const largeurMetres = hauteurMetres * (LARGEUR_CANVAS / HAUTEUR_CANVAS);
  return <g transform={`translate(${position.x.toFixed(2)} ${position.y.toFixed(2)})`} className={`rg-canvas-groupe${porteur ? ' rg-porteur' : ''}`}>
    <g transform={redresser}>
      <foreignObject x={-largeurMetres / 2} y={-hauteurMetres * .78} width={largeurMetres} height={hauteurMetres} overflow="visible">
        <canvas ref={canvas} width={LARGEUR_CANVAS} height={HAUTEUR_CANVAS} className="rg-canvas" aria-hidden="true" />
      </foreignObject>
    </g>
  </g>;
}

export const SpriteRugbymanMemo = memo(SpriteRugbyman);

function personnageArbitre(couleur: '#f4c542' | '#35b76d'): Character {
  return {
    id: 'arbitre', name: 'Arbitre', position: 'Arbitre',
    appearance: {
      skin: '#c98b68', bodyType: 'athletic', hair: { style: 'short', color: '#28201d' },
      facialHair: { style: 'none', color: '#28201d' },
      body: { height: 1, torsoLength: 1, torsoWidth: .94, shoulderWidth: .96, armLength: 1, armThickness: .94, legLength: 1, legThickness: .94, headScale: 1 },
      kit: { primary: couleur, secondary: '#111820', accent: '#ffffff', pattern: 'SHOULDERS', shorts: '#111820', socks: '#111820', boots: '#080b0d' },
      number: 0,
    },
  };
}

export function SpriteArbitre({ position, phase, sifflet, redresser, hauteurMetres, temps, couleur, carton, regard = 0, vitesse = 0, angleVue = 0 }: {
  position: Vec; phase: TerrainDirect['phase']; sifflet?: TerrainDirect['sifflet']; redresser?: string;
  hauteurMetres: number; temps: number; couleur: '#f4c542' | '#35b76d'; carton?: 'jaune' | 'rouge';
  regard?: number; vitesse?: number; angleVue?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useMemo(() => new CharacterRenderer(), []);
  const character = useMemo(() => personnageArbitre(couleur), [couleur]);
  const animation = carton === 'rouge' ? 'ref_red' : carton === 'jaune' ? 'ref_yellow'
    : sifflet?.cle.includes('enAvant') ? 'ref_knockon' : phase === 'penalite' ? 'ref_penalty'
      : phase === 'miTemps' || phase === 'bagarre' ? 'ref_timeoff' : phase === 'fini' ? 'ref_end'
        : sifflet ? 'ref_whistle' : phase === 'melee' ? 'ref_scrum' : phase === 'aplatissage' ? 'ref_try'
          : vitesse > 4 ? 'run' : vitesse > .6 ? 'jog' : 'idle';
  const angle = regard + angleVue * Math.PI / 180;
  const orientation: Orientation = Math.abs(Math.sin(angle)) > .72 ? Math.sin(angle) < 0 ? 'back' : 'front' : Math.cos(angle) < 0 ? 'left' : 'right';
  const clip = CLIPS.get(animation) ?? CLIPS.get('idle')!;
  useLayoutEffect(() => {
    if (canvas.current) dessinerSprite(canvas.current, renderer, character, clip, temps, 41, orientation, false);
  }, [renderer, character, clip, temps, orientation]);
  const largeurMetres = hauteurMetres * (LARGEUR_CANVAS / HAUTEUR_CANVAS);
  return <g transform={`translate(${position.x.toFixed(2)} ${position.y.toFixed(2)})`} className="rg-canvas-groupe rg-arbitre">
    <g transform={redresser}><foreignObject x={-largeurMetres / 2} y={-hauteurMetres * .78} width={largeurMetres} height={hauteurMetres} overflow="visible">
      <canvas ref={canvas} width={LARGEUR_CANVAS} height={HAUTEUR_CANVAS} className="rg-canvas" aria-hidden="true" />
    </foreignObject></g>
  </g>;
}
