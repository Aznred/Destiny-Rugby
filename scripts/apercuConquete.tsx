/* oxlint-disable react/only-export-components -- page de démonstration autonome, pas un module applicatif */
// BANC VISUEL DES CONQUÊTES (Correctif 23) — le match est conduit PAS À PAS depuis la console, la scène 3D l'affiche.
//
// Ouvrir : /scripts/apercuConquete.html      (?ia=3 pour comparer avec l'ancien moteur)
//
//   __conquete.situation('touche' | 'ruck' | 'melee' | 'maul')   pose la situation, sans rien jouer
//   __conquete.avancer(2.4)                                       fait avancer moteur ET scène de 2,4 s simulées
//   __conquete.camera('close' | 'follow' | 'wide' | 'basse')
//   __conquete.duel('gratte' | 'contre', issue)                   lance un duel de ruck (turnover, attaqueConserve, instable, penalite)
//   __conquete.issueTouche('perdue' | 'devie' | 'courte' | 'longue' | 'gagnee', variante)   force l'issue d'une touche
//   __conquete.e                                                  l'état du match
//
// ⚠️ Un panneau de navigateur CACHÉ ne dessine pas : `avancer` appelle `scene.image` lui-même (aucune boucle d'animation).
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Terrain3D } from '../src/components/match/Terrain3D';
import { tenueDepuisCouleurs, type Scene3D } from '../src/lib/match3D';
import { avancer, creerMatch, installerSituationCombinaison, lancerLeDuelDuRuck } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { clubParNom } from '../src/data/clubs';
import { surLeTerrain } from '../src/lib/moteur/tactique';
import { adverse } from '../src/lib/moteur/terrain';
import type { EtatMatch, IssueTouche } from '../src/lib/moteur/etat';
import '../src/index.css';

const reglages = new URLSearchParams(location.search);
const IA = Number(reglages.get('ia') ?? 4);
const A = 'Stade Toulousain', B = 'RC Toulon';
const e: EtatMatch = creerMatch(A, B, effectifDuClub(A, 1), effectifDuClub(B, 1), 24, 20, 'apercu-conquete', undefined,
  { niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, ia: IA });
e.carriereDixMinutes = true;
let scene: Scene3D | null = null;

const clubA = clubParNom(A), clubB = clubParNom(B);
const equipes: [{ nom: string; maillot: ReturnType<typeof tenueDepuisCouleurs> }, { nom: string; maillot: ReturnType<typeof tenueDepuisCouleurs> }] = [
  { nom: A, maillot: tenueDepuisCouleurs(clubA?.c1 ?? '#b0182a', clubA?.c2, A) },
  { nom: B, maillot: tenueDepuisCouleurs(clubB?.c1 ?? '#16181c', clubB?.c2, B) },
];

/** Un cadrage libre pour les vérifications : où l'on regarde (repère terrain), à quelle distance, à quelle hauteur, sous quel angle. */
let vueLibre: { x: number; y: number; dist: number; haut: number; angle: number } | null = null;
function cadrerLaVue(): void {
  const I = (scene as unknown as { interne?: { camera: { position: { set(x: number, y: number, z: number): void }; lookAt(x: number, y: number, z: number): void }; renderer: { render(s: unknown, c: unknown): void }; scene: unknown } } | null)?.interne;
  if (!vueLibre || !I) return;
  const cx = vueLibre.y - 35, cz = vueLibre.x - 61;
  I.camera.position.set(cx + Math.sin(vueLibre.angle) * vueLibre.dist, vueLibre.haut, cz + Math.cos(vueLibre.angle) * vueLibre.dist);
  I.camera.lookAt(cx, 1.5, cz);
  const cam = I.camera as unknown as { updateMatrix?: () => void; updateMatrixWorld?: (f: boolean) => void; matrixAutoUpdate?: boolean };
  cam.matrixAutoUpdate = true; cam.updateMatrix?.(); cam.updateMatrixWorld?.(true);
  I.renderer.render(I.scene, I.camera);
}

function pas(secondes: number): void {
  const n = Math.max(1, Math.round(secondes / 0.15));
  for (let i = 0; i < n; i++) {
    scene?.retenir(0.15);
    avancer(e, 0.15);
    scene?.image(0.15, { vitesse: 1 });
  }
  cadrerLaVue();
}

const api = {
  e,
  get scene() { return scene; },
  avancer: pas,
  /** `vue({ x, y, dist, haut, angle })` : cadrage libre (repère terrain) ; `vue(null)` rend la caméra à la scène. */
  vue(v: typeof vueLibre) { vueLibre = v; cadrerLaVue(); },
  camera(c: 'close' | 'follow' | 'wide' | 'basse' | 'aerienne') { if (scene) (scene as unknown as { camera: string }).camera = c; (scene as unknown as { moi?: string }).moi = undefined; scene?.recadrer(); },
  situation(nom: 'touche' | 'ruck' | 'melee' | 'maul', x = 60) {
    e.tir = null; e.vol = null; e.ballonLibre = null; e.conquete = null; e.lancement = null; e.porteur = null; e.ruck = null;
    if (nom === 'maul') {
      installerSituationCombinaison(e, 'ruck', { x, y: 35 });
      e.phase = 'maul'; e.minuteur = 8; e.maul = { receveurId: surLeTerrain(e, e.possession).find((p) => p.numero === 4)!.id, debut: e.sim };
      return 'maul posé';
    }
    installerSituationCombinaison(e, nom, nom === 'touche' ? { x, y: 0.5 } : { x, y: 35 });
    return `${nom} posé`;
  },
  duel(type: 'gratte' | 'contre', issue: 'turnover' | 'attaqueConserve' | 'instable' | 'penalite' = 'turnover') {
    if (e.phase !== 'ruck' || !e.ruck) return 'pas de ruck';
    const def = surLeTerrain(e, adverse(e.possession)).filter((p) => p.avant && p.surLeTerrain)
      .sort((a, b) => Math.hypot(a.pos.x - e.ballon.x, a.pos.y - e.ballon.y) - Math.hypot(b.pos.x - e.ballon.x, b.pos.y - e.ballon.y));
    lancerLeDuelDuRuck(e, type, def[0], type === 'contre' ? def.slice(0, 3) : [], issue, type === 'contre' ? (issue === 'attaqueConserve' ? -0.9 : 2.2) : 0, def[0], 'entrée par le côté au ruck');
    return `duel ${type}/${issue}`;
  },
  issueTouche(type: IssueTouche['type'], variante = 0) {
    const c = e.conquete;
    if (e.phase !== 'touche' || !c) return 'pas de touche';
    const cible = e.pions.find((p) => p.id === c.cibleId)!;
    const contre = surLeTerrain(e, adverse(e.possession)).filter((p) => p.role === 'alignement')
      .sort((a, b) => Math.abs(a.pos.y - cible.pos.y) - Math.abs(b.pos.y - cible.pos.y))[0];
    const bord = e.ballon.y < 35 ? 0 : 70;
    c.issue = {
      type, sauteurId: cible.id, contreurId: contre?.id, variante, decideeA: e.sim,
      point: type === 'courte' || type === 'longue' ? { x: cible.pos.x, y: cible.pos.y + (type === 'courte' ? 1 : -1) * (bord === 0 ? -2.4 : 2.4) }
        : type === 'devie' ? { x: cible.pos.x + (e.possession === 'A' ? -1 : 1) * 3.4, y: cible.pos.y } : undefined,
    };
    return `issue ${type}`;
  },
};
(globalThis as unknown as { __conquete: typeof api }).__conquete = api;

function Apercu() {
  const pret = useRef(false);
  useEffect(() => { pret.current = true; }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#071108' }}>
      <Terrain3D
        options={{ equipes, camera: 'close', television: { ralentis: false } }}
        surPrete={(s) => { scene = s; if (s) { s.brancher(e); s.recadrer(); } }}
      />
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Apercu />);
