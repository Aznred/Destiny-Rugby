import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import type { PionDirect, TerrainDirect } from '../../lib/ligue/matchCarriere';
import type { Vec } from '../../lib/moteur/terrain';
import { apparenceJoueurMatch, graineVisuelleMatch, type MaillotMatch } from '../../lib/moteur/apparenceMatch';
import { CharacterRenderer } from '../../lib/spritesGenerateur/renderer';
import { mirrorPose, poseAtTime } from '../../lib/spritesGenerateur/engine';
import { rugbyAnimations } from '../../lib/spritesGenerateur/rugbyAnimations';
import type { AnimationClip, BodyType, Character, KitPattern } from '../../lib/spritesGenerateur/models';

export type AnimationRugby =
  | 'idle' | 'jog' | 'run' | 'sprint' | 'run_ball' | 'sprint_ball' | 'pass' | 'catch' | 'punt'
  | 'tackle' | 'tackled' | 'clearout' | 'jackal' | 'maul' | 'scrum' | 'lineout_jump'
  | 'try' | 'celebrate';

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
}

const MOTIFS: Record<MaillotMatch['motif'], KitPattern> = {
  uni: 'SOLID', cerceaux: 'HOOPS', rayures: 'VERTICAL_STRIPES',
  epaules: 'SHOULDERS', bande: 'CHEST_STRIPE', diagonale: 'DIAGONAL',
};

const TYPES: Record<ReturnType<typeof apparenceJoueurMatch>['morphologie'], BodyType> = {
  pilier: 'prop', avant: 'forward', athletique: 'athletic', arriere: 'back', ailier: 'winger',
};

function animationDe(p: PionDirect, pos: Vec, terrain: TerrainDirect, porteur: boolean, positionPorteur?: Vec): AnimationRugby {
  if (terrain.aplatissage?.marqueurId === p.id) return terrain.aplatissage.progression > .78 ? 'celebrate' : 'try';
  const vitesse = Math.hypot(p.vx, p.vy);
  const distanceBallon = Math.hypot(pos.x - terrain.ballon.x, pos.y - terrain.ballon.y);
  if (terrain.conquete?.type === 'melee' && p.numero <= 8 && distanceBallon < 8) return 'scrum';
  if (terrain.conquete?.type === 'touche' && distanceBallon < 10) return p.numero === 2 || p.id === terrain.conquete.cibleId ? 'lineout_jump' : 'idle';
  if (terrain.phase === 'maul' && distanceBallon < 5) return 'maul';
  if (terrain.phase === 'ruck' && distanceBallon < 4.2) return p.cote === terrain.possession ? 'clearout' : 'jackal';
  if (terrain.vol?.auteurId === p.id) return terrain.vol.type === 'pied' ? 'punt' : 'pass';
  if (terrain.vol?.receveurId === p.id) return 'catch';
  if (positionPorteur && p.cote !== terrain.possession && Math.hypot(pos.x - positionPorteur.x, pos.y - positionPorteur.y) < 2.2) return 'tackle';
  if (porteur) return vitesse > 7.2 ? 'sprint_ball' : vitesse > .7 ? 'run_ball' : 'idle';
  return vitesse > 7.2 ? 'sprint' : vitesse > 3.5 ? 'run' : vitesse > .55 ? 'jog' : 'idle';
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
  clip: AnimationClip, temps: number, graine: number, versGauche: boolean,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);
  const duree = clip.frames.length / clip.fps;
  const local = (temps + (graine % 997) / 997 * duree) % Math.max(.01, duree);
  let pose = poseAtTime(clip, local * clip.fps);
  if (versGauche) pose = mirrorPose(pose);
  pose.ball.attachment = 'HIDDEN';
  renderer.draw(ctx, character, pose, {
    width: LARGEUR_CANVAS, height: HAUTEUR_CANVAS, zoom: .36,
    pan: { x: 0, y: -1 }, showField: false, showSkeleton: false,
  });
}

function SpriteRugbyman({ pion, position, terrain, maillot, porteur = false, positionPorteur, redresser, hauteurMetres, temps }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useMemo(() => new CharacterRenderer(), []);
  const character = useMemo(() => personnage(pion, maillot), [pion.id, pion.nom, pion.numero, pion.poste, maillot]);
  const animation = animationDe(pion, position, terrain, porteur, positionPorteur);
  const clip = CLIPS.get(animation) ?? CLIPS.get('idle')!;
  const versGauche = Math.abs(pion.vx) > .2 ? pion.vx < 0 : pion.cote === 'exterieur';
  const graine = graineVisuelleMatch(pion.id);
  useLayoutEffect(() => {
    if (canvas.current) dessinerSprite(canvas.current, renderer, character, clip, temps, graine, versGauche);
  }, [renderer, character, clip, temps, graine, versGauche]);

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

export function SpriteArbitre({ position, phase, sifflet, redresser, hauteurMetres, temps, couleur, carton }: {
  position: Vec; phase: TerrainDirect['phase']; sifflet?: TerrainDirect['sifflet']; redresser?: string;
  hauteurMetres: number; temps: number; couleur: '#f4c542' | '#35b76d'; carton?: 'jaune' | 'rouge';
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useMemo(() => new CharacterRenderer(), []);
  const character = useMemo(() => personnageArbitre(couleur), [couleur]);
  const animation = carton === 'rouge' ? 'ref_red_card' : carton === 'jaune' ? 'ref_yellow_card'
    : sifflet ? 'ref_whistle' : phase === 'melee' ? 'ref_scrum' : phase === 'aplatissage' ? 'ref_try' : 'jog';
  const clip = CLIPS.get(animation) ?? CLIPS.get('idle')!;
  useLayoutEffect(() => {
    if (canvas.current) dessinerSprite(canvas.current, renderer, character, clip, temps, 41, false);
  }, [renderer, character, clip, temps]);
  const largeurMetres = hauteurMetres * (LARGEUR_CANVAS / HAUTEUR_CANVAS);
  return <g transform={`translate(${position.x.toFixed(2)} ${position.y.toFixed(2)})`} className="rg-canvas-groupe rg-arbitre">
    <g transform={redresser}><foreignObject x={-largeurMetres / 2} y={-hauteurMetres * .78} width={largeurMetres} height={hauteurMetres} overflow="visible">
      <canvas ref={canvas} width={LARGEUR_CANVAS} height={HAUTEUR_CANVAS} className="rg-canvas" aria-hidden="true" />
    </foreignObject></g>
  </g>;
}
