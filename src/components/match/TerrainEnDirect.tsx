// LE TERRAIN EN DIRECT — le match de la ligue, regardé comme celui de carrière.
//
// ═══ POURQUOI CE FICHIER EXISTE ══════════════════════════════════════════════
//
// Demande, mot pour mot : « il faut qu'on suive le match comme le match de
// carrière, mais il dure réellement 80 min IRL », puis « je veux un vrai match
// comme si on regardait un match qui se jouait en temps réel, comme dans la
// vraie vie — une mêlée prend une trentaine de secondes ».
//
// Le moteur est LE MÊME que celui de la carrière solo (`lib/moteur/`). Ce qui a
// changé pour le direct tient en deux endroits, et aucun n'est ici :
//   • `EtatMatch.tempsReel` — une seconde de jeu vaut une seconde à l'écran,
//     donc plus aucun étirement des phases arrêtées ;
//   • `animerArret` — la mêlée se présente, se lie et pousse, tandis que la
//     touche montre son appel et son sauteur au lieu de tenir une pose.
//
// ⚠️ LE MOTEUR N'EST PAS DANS LE NAVIGATEUR, ET IL NE DOIT PAS Y ÊTRE. Le
// rejouer ici demanderait la GRAINE, les deux feuilles et les cibles de score —
// c'est-à-dire livrer au client le plan de l'adversaire. Le serveur reste seul
// juge : il envoie trente positions toutes les deux secondes, et cet écran en
// fait soixante images par seconde.
//
// ═══ ON INTERPOLE, ON N'EXTRAPOLE PAS ════════════════════════════════════════
//
// Première version : on prolongeait `position + vitesse × temps` jusqu'au relevé
// suivant. C'est faux, et ça se voit. Un joueur ne court pas deux secondes en
// ligne droite : il crochète, il s'arrête, il repart. À neuf mètres par seconde,
// deux secondes de prédiction, ce sont dix-huit mètres d'erreur possible — des
// joueurs à côté de leur vraie place, exactement le défaut remonté en jeu.
//
// On rend donc le match avec UN RELEVÉ DE RETARD. À l'instant `t`, on cherche
// les deux relevés qui l'encadrent et on interpole entre eux :
//
//   • pas un `lerp` — une droite entre deux points distants de deux secondes
//     coupe les courbes et fait patiner les appuis ;
//   • une SPLINE D'HERMITE, qui utilise les vecteurs vitesse des DEUX bouts
//     comme tangentes. La trajectoire passe exactement par les deux positions
//     vraies ET repart dans la bonne direction. C'est la courbe que le moteur a
//     réellement parcourue, à quelques centimètres près.
//
// Le prix est un retard de deux secondes sur le direct. Personne ne le voit :
// il n'y a rien à côté pour le comparer.

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Icone } from '../Icone';
import { PelouseMemo } from './Pelouse';
import { Camera, angleDeVue, type Cadrage, type Vue } from '../../lib/moteur/camera';
import { LARGEUR, LONGUEUR, borner, type Vec } from '../../lib/moteur/terrain';
import type { CoteEnLigne, TerrainDirect } from '../../lib/ligue/matchCarriere';
import { creerScenarioDirect, type ScenarioDirect } from '../../lib/ligue/scenarioDirect';
import {
  amortirImageDirect, interpolerImageDirect, interpolerEtatDirect, projeterImageDirect, ballonAuReleve, type BallonAfficheDirect,
  type ImageDirect,
} from '../../lib/ligue/interpolationDirect';
import { t } from '../../lib/i18n';
import { maillotDeSecours, type MaillotMatch } from '../../lib/moteur/apparenceMatch';
import { SpriteArbitre, SpriteRugbymanMemo } from './SpriteRugbyman';

/**
 * Le retard de rendu, en secondes réelles.
 *
 * ⚠️ IL DOIT DÉPASSER L'INTERVALLE DE SONDAGE (deux secondes), sinon le relevé
 * qui ferme l'interpolation n'est pas encore arrivé et on retombe sur de la
 * prédiction. Une marge de 20 % absorbe la latence du réseau.
 */
const RETARD = 1.2;
/** Au-delà du dernier relevé, on ne prolonge pas plus longtemps que ça. */
const PREDICTION_MAX = 0.7;
/** Deux images utiles, plus assez de marge pour un paquet retardé/réordonné. */
const TAMPON_MAX = 6;

const CLE_PHASE: Record<string, string> = {
  coupEnvoi: 'ml.phase.coupEnvoi', renvoi22: 'ml.phase.renvoi22', ruck: 'ml.phase.ruck',
  melee: 'ml.phase.melee', touche: 'ml.phase.touche', maul: 'ml.phase.maul',
  ballonEnLAir: 'ml.phase.ballonEnLAir', ballonLibre: 'ml.phase.ballonEnLAir', tirAuBut: 'ml.phase.tirAuBut',
  transformation: 'ml.phase.transformation', penalite: 'ml.phase.penalite',
  aplatissage: 'ml.phase.apresEssai', apresEssai: 'ml.phase.apresEssai', miTemps: 'ml.phase.miTemps',
  tmo: 'ml.phase.tmo',
};

export interface CouleursDirect {
  domicile: string;
  exterieur: string;
  maillots?: Record<CoteEnLigne, MaillotMatch>;
}

interface Props {
  terrain: TerrainDirect;
  nomDomicile: string;
  nomExterieur: string;
  couleurs: CouleursDirect;
  emblemes?: Partial<Record<CoteEnLigne, string>>;
  /** Le camp qu'on entraîne : c'est vers son en-but qu'on attaque à l'écran. */
  monCote?: CoteEnLigne;
  carton?: 'jaune' | 'rouge';
  modeDemo?: boolean;
  pause?: boolean;
  vitesseDemo?: number;
}

interface Releve {
  terrain: TerrainDirect;
  /** Horloge monotone locale à la réception. */
  recu: number;
  /** Horloge murale du serveur à l'émission, en secondes. */
  instant: number;
}
type ModeCamera = 'auto' | 'large' | 'suivi';

const LIBELLES_SCENARIO: Record<ScenarioDirect['type'], string> = {
  coupEnvoi: 'Coup d’envoi', renvoi22: 'Renvoi aux 22', ruck: 'Ruck', melee: 'Mêlée',
  touche: 'Touche', maul: 'Maul', penalite: 'Pénalité', tirAuBut: 'Tentative au but',
  transformation: 'Transformation', apresEssai: 'Reprise après essai', miTemps: 'Mi-temps',
  aplatissage: 'Aplatissage', tmo: 'Arbitrage vidéo (TMO)',
  jeuRas: 'Jeu au ras', pod: 'Bloc d’avants', jeuLarge: 'Jeu au large',
  passeSautee: 'Passe sautée', pickAndGo: 'Pick-and-go', passe: 'Passe', offload: 'Passe après contact',
  degagement: 'Dégagement', occupation: 'Jeu d’occupation', chandelle: 'Chandelle',
  cinquanteVingtDeux: 'Tentative de 50:22', rasant: 'Coup de pied rasant',
  transversale: 'Transversale', drop: 'Drop', penaltouche: 'Pénaltouche', renvoi: 'Renvoi',
  franchissement: 'Franchissement', ballonLibre: 'Ballon libre', jeuCourant: 'Jeu courant', fini: 'Fin du match',
};

const LIBELLES_ZONE: Record<ScenarioDirect['zone'], string> = {
  enButAdverse: 'dans l’en-but', cinqAdverse: 'à 5 m', vingtDeuxAdverse: 'dans les 22 m adverses',
  campAdverse: 'dans le camp adverse', milieu: 'au milieu', campPropre: 'dans son camp',
  vingtDeuxPropre: 'dans ses 22 m', enButPropre: 'dans son en-but',
};

const LIBELLES_COMBINAISON = {
  premierBloc: 'Appel au premier bloc',
  milieu: 'Prise au milieu',
  fond: 'Saut au fond',
  leurreDevant: 'Leurre devant · saut au fond',
} as const;

function tracerTrajectoires(vol: NonNullable<TerrainDirect['vol']>) {
  const k = Math.min(1, Math.max(0, vol.ecoule / Math.max(0.01, vol.duree)));
  const nbPoints = Math.max(4, Math.round(k * 20));
  const pointsVol: string[] = [];
  const pointsOmbre: string[] = [];
  for (let i = 0; i <= nbPoints; i++) {
    const u = (i / nbPoints) * k;
    const x = vol.de.x + (vol.vers.x - vol.de.x) * u;
    const y = vol.de.y + (vol.vers.y - vol.de.y) * u;
    const h = vol.hauteur * Math.sin(Math.PI * u);
    pointsVol.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${(y - h * 2.2).toFixed(2)}`);
    pointsOmbre.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  let cheminAnticipe = '';
  if (k < 0.98 && (vol.type === 'pied' || vol.intention === 'drop')) {
    const nbAnticipe = Math.max(4, Math.round((1 - k) * 16));
    const pointsAnticipe: string[] = [];
    for (let i = 0; i <= nbAnticipe; i++) {
      const u = k + (i / nbAnticipe) * (1 - k);
      const x = vol.de.x + (vol.vers.x - vol.de.x) * u;
      const y = vol.de.y + (vol.vers.y - vol.de.y) * u;
      const h = vol.hauteur * Math.sin(Math.PI * u);
      pointsAnticipe.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${(y - h * 2.2).toFixed(2)}`);
    }
    cheminAnticipe = pointsAnticipe.join(' ');
  }
  return { vol: pointsVol.join(' '), ombre: pointsOmbre.join(' '), anticipe: cheminAnticipe };
}

function TerrainEnDirect({ terrain, nomDomicile, nomExterieur, couleurs, monCote, carton, modeDemo, pause, vitesseDemo }: Props) {
  const scene = useRef<HTMLDivElement>(null);
  const boite = useRef({ largeur: 1, hauteur: 1 });
  const camera = useRef(new Camera());
  const vueRef = useRef<Vue | null>(null);
  /** Les positions affichées à cette image, reconstruites entre deux relevés. */
  const pions = useRef(new Map<string, Vec>());
  const ballon = useRef<BallonAfficheDirect>({ x: LONGUEUR / 2, y: LARGEUR / 2, h: 0 });
  /** Le relevé effectivement montré : c'est lui qui commande le bandeau. */
  const afficheRef = useRef<TerrainDirect>(terrain);
  const affiche = afficheRef.current;
  const [modeCamera, setModeCamera] = useState<ModeCamera>('auto');
  const [scenario, setScenario] = useState(() => creerScenarioDirect(terrain));
  const [, redessiner] = useState(0);

  const tempsSimulationDemo = useRef(0);
  const demoOptions = useRef({ modeDemo, pause, vitesseDemo });
  useEffect(() => {
    demoOptions.current = { modeDemo, pause, vitesseDemo };
  }, [modeDemo, pause, vitesseDemo]);

  // ⚠️ TOUT CE QUE LA BOUCLE LIT PASSE PAR UNE RÉFÉRENCE. Elle est montée une
  // seule fois pour la vie du composant : la relancer à chaque relevé du serveur
  // remettrait la caméra à zéro toutes les deux secondes.
  const premierRecu = performance.now() / 1000;
  const premierInstant = (terrain.emisLe ?? Date.now()) / 1000;
  const tampon = useRef<Releve[]>([{ terrain, recu: premierRecu, instant: premierInstant }]);
  /** performance.now() - horloge serveur ; filtré pour ne pas suivre le jitter. */
  const decalageServeur = useRef(premierRecu - premierInstant);
  const retardCible = useRef(modeDemo ? 0 : RETARD);
  const retardRendu = useRef(modeDemo ? 0 : RETARD);
  const dernierInstantAffiche = useRef(-Infinity);
  const reglages = useRef({ modeCamera, monCote });
  const scenarioCourant = useRef(scenario);
  useEffect(() => {
    const file = tampon.current;
    if (file[file.length - 1]?.terrain === terrain) return;
    const recu = performance.now() / 1000;
    const instant = (terrain.emisLe ?? Date.now()) / 1000;
    if (demoOptions.current.modeDemo) {
      retardCible.current = 0;
      retardRendu.current = 0;
      decalageServeur.current = recu - instant;
    }
    // Une réponse lente arrivée après la suivante ne doit jamais faire reculer
    // le film. Elle est simplement obsolète : le prochain relevé fait foi.
    if (instant + 0.001 < (file[file.length - 1]?.instant ?? -Infinity)) return;
    const observation = recu - instant;
    const precedentReleve = file.at(-1);
    if (precedentReleve && instant > precedentReleve.instant) {
      const intervalle = instant - precedentReleve.instant;
      const variation = Math.abs((recu - precedentReleve.recu) - intervalle);
      retardCible.current += (borner(intervalle + .2 + variation * 2, RETARD, 2.5) - retardCible.current) * .2;
    }
    const ancien = decalageServeur.current;
    // On suit vite une meilleure mesure (moins de latence), très lentement une
    // mesure plus mauvaise. Ainsi un seul paquet lent n'étire pas les courses.
    decalageServeur.current += (observation - ancien) * (observation < ancien ? 0.35 : 0.04);
    file.push({ terrain, recu, instant });
    if (file.length > TAMPON_MAX) file.splice(0, file.length - TAMPON_MAX);
  }, [terrain]);
  useEffect(() => { reglages.current = { modeCamera, monCote }; }, [modeCamera, monCote]);

  useEffect(() => {
    const noeud = scene.current;
    if (!noeud) return;
    const mesurer = () => {
      const r = noeud.getBoundingClientRect();
      boite.current = { largeur: Math.max(1, r.width), hauteur: Math.max(1, r.height) };
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(noeud);

    let image = 0;
    let precedent = performance.now() / 1000;
    let actif = true;
    let imageAffichee: ImageDirect | null = null;
    const avancer = (brut: number) => {
      if (!actif) return;
      const maintenant = brut / 1000;
      const dtReel = Math.min(0.1, Math.max(0, maintenant - precedent));
      precedent = maintenant;

      const isDemo = demoOptions.current.modeDemo;
      const isPause = isDemo && demoOptions.current.pause;
      const isTmo = afficheRef.current?.phase === 'tmo' || Boolean(afficheRef.current?.tmo?.actif);
      const vit = (isDemo ? (demoOptions.current.vitesseDemo ?? 1) : 1) * (isTmo ? 0.5 : 1);
      const dt = isPause ? 0 : dtReel * vit;

      if (isDemo && !isPause) {
        tempsSimulationDemo.current += dt;
      }

      const file = tampon.current;
      if (isDemo) {
        retardRendu.current = 0;
        retardCible.current = 0;
      } else {
        retardRendu.current += borner(retardCible.current - retardRendu.current, -dt * .08, dt * .08);
      }
      const instant = Math.max(dernierInstantAffiche.current, maintenant - decalageServeur.current - retardRendu.current);
      dernierInstantAffiche.current = instant;
      // Les deux relevés qui encadrent l'instant rendu. Tant que le tampon n'a
      // pas pris d'avance (les deux premières secondes), on tient la première
      // image : mieux vaut un terrain immobile qu'un terrain inventé.
      let i = 0;
      while (i < file.length - 2 && file[i + 1].instant <= instant) i++;
      let a = file[i];
      let b: Releve | undefined = file[i + 1];
      if (b && instant > b.instant && i + 1 === file.length - 1) { a = b; b = undefined; }
      let u = 0;
      let dtSim = 0;
      if (b) {
        const span = Math.max(0.001, b.instant - a.instant);
        u = borner((instant - a.instant) / span, 0, 1);
        // ⚠️ LE TEMPS SIMULÉ VIENT DE L'HORLOGE DU MATCH, PAS DE LA MONTRE. Une
        // décision de pénalité gèle le chrono du serveur : les deux relevés
        // portent alors la même minute, les tangentes s'annulent, et le terrain
        // s'immobilise exactement comme le jeu.
        dtSim = Math.max(0, a.terrain.simulation !== undefined && b.terrain.simulation !== undefined
          ? b.terrain.simulation - a.terrain.simulation : (b.terrain.horloge - a.terrain.horloge) * 60);
      } else if (isDemo) {
        // En mode démo / labo, on avance le temps de simulation sans le brider à 0.7s
        const DUREE_CYCLE = 4.0;
        const tCycle = tempsSimulationDemo.current % DUREE_CYCLE;
        dtSim = tCycle * Math.max(1, a.terrain.cadence);
      } else {
        // Rien derrière : on prolonge brièvement le dernier relevé connu.
        dtSim = borner(instant - a.instant, 0, PREDICTION_MAX) * a.terrain.cadence;
      }

      let imageDirecte: ImageDirect;
      if (b) {
        imageDirecte = interpolerImageDirect(a.terrain, b.terrain, u, dtSim);
      } else if (isDemo) {
        const DUREE_CYCLE = 4.0;
        const tCycle = tempsSimulationDemo.current % DUREE_CYCLE;
        // Déplacement lissé en cycle continu (0 -> 1 -> 0) sans saut brutal au rebouclage
        const facteurCycle = (1 - Math.cos((tCycle / DUREE_CYCLE) * Math.PI * 2)) / 2;
        const pionsMap = new Map<string, Vec>();
        for (const p of a.terrain.pions) {
          pionsMap.set(p.id, {
            x: borner(p.x + p.vx * facteurCycle * 2.5, 0, LONGUEUR),
            y: borner(p.y + p.vy * facteurCycle * 2.5, 0, LARGEUR),
          });
        }
        const volActif = a.terrain.vol ? {
          ...a.terrain.vol,
          ecoule: (a.terrain.vol.ecoule + tCycle) % Math.max(0.1, a.terrain.vol.duree),
        } : undefined;
        const terrainActif: TerrainDirect = {
          ...a.terrain,
          vol: volActif,
          pions: a.terrain.pions.map((p) => {
            const pos = pionsMap.get(p.id);
            return pos ? { ...p, x: pos.x, y: pos.y } : p;
          }),
        };
        const ballonAffiche = ballonAuReleve(terrainActif, pionsMap, 0);
        imageDirecte = { pions: pionsMap, ballon: ballonAffiche };
      } else {
        imageDirecte = projeterImageDirect(a.terrain, dtSim / Math.max(0.01, a.terrain.cadence));
      }

      const tCycle = tempsSimulationDemo.current % 4.0;
      // ⚠️ Transition douce au rebouclage : au lieu de réinitialiser brutalement
      // les positions à tCycle < 0.08, on amortit toujours. Le blend du début
      // de cycle lisse le saut visuellement.
      const fonduDebut = Math.min(1, tCycle / 0.35); // ease-in sur 0.35s
      const fonduFin = Math.min(1, (4.0 - tCycle) / 0.35); // ease-out sur 0.35s
      const poidsFondu = Math.min(fonduDebut, fonduFin);
      if (isDemo && tCycle < 0.08) {
        imageAffichee = imageDirecte;
      } else {
        imageAffichee = amortirImageDirect(imageAffichee, imageDirecte, dtReel * (0.4 + poidsFondu * 0.6));
      }
      pions.current = imageAffichee.pions;
      ballon.current = imageAffichee.ballon;

      // Ping-pong (onde triangulaire) : 0→1→0 sans saut. Fréquence = 1 cycle
      // complet en DUREE_CYCLE secondes. Plus naturel qu'un modulo.
      const pingPong = (t: number, periode: number) => {
        const phase = (t % periode) / periode; // 0→1
        return phase < 0.5 ? phase * 2 : 2 - phase * 2; // 0→1→0
      };

      // Le bandeau et le porteur ne changent qu'au terme de la trajectoire.
      const courant = b ? interpolerEtatDirect(a.terrain, b.terrain, u)
        : isDemo
        ? {
            ...a.terrain,
            simulation: tCycle,
            instantJeu: tCycle,
            vol: a.terrain.vol ? {
              ...a.terrain.vol,
              ecoule: (a.terrain.vol.ecoule + tCycle) % Math.max(0.1, a.terrain.vol.duree),
            } : undefined,
            conquete: a.terrain.conquete ? {
              ...a.terrain.conquete,
              progression: pingPong(tCycle, 3.6),
            } : undefined,
            aplatissage: a.terrain.aplatissage ? {
              ...a.terrain.aplatissage,
              progression: pingPong(tCycle, 3.2),
            } : undefined,
            preparationTir: a.terrain.preparationTir ? {
              ...a.terrain.preparationTir,
              progression: a.terrain.preparationTir.clipRoutine
                ? 0.70
                : pingPong(tCycle, 3.4),
            } : undefined,
          }
        : { ...a.terrain, simulation: (a.terrain.simulation ?? a.terrain.instantJeu ?? 0) + dtSim };
      afficheRef.current = courant;

      const prochainScenario = creerScenarioDirect(courant);
      if (prochainScenario.id !== scenarioCourant.current.id) {
        scenarioCourant.current = prochainScenario;
        setScenario(prochainScenario);
      }

      const { largeur, hauteur } = boite.current;
      const mode = reglages.current.modeCamera;
      const cadrage: Cadrage = isTmo ? 'tmo' : mode === 'auto' ? prochainScenario.cadrage : mode;
      // La caméra suit la position effectivement dessinée. Viser soudain le
      // milieu entre le ballon et sa destination provoquait un second saut,
      // même quand la trajectoire du ballon était correcte.
      const cible = ballon.current;
      vueRef.current = camera.current.suivre(
        cible, cadrage, largeur / hauteur,
        angleDeVue(reglages.current.monCote === 'exterieur' ? 'B' : 'A', hauteur > largeur), dtReel,
      );
      redessiner((n) => n + 1);
      image = requestAnimationFrame(avancer);
    };
    image = requestAnimationFrame(avancer);
    return () => { actif = false; cancelAnimationFrame(image); observateur.disconnect(); };
  }, []);

  const vue = vueRef.current;
  // ⚠️ LE RAYON D'UN PION SE MESURE EN PIXELS, PAS EN MÈTRES. Le nombre de
  // pixels par mètre change avec le cadrage, l'orientation et la taille de
  // l'écran : sans ce plancher, un joueur fait trois pixels sur un téléphone.
  const pxParMetre = vue ? boite.current.largeur / vue.W : 4;
  const rayon = Math.max(0.86, 5.5 / pxParMetre);
  const tailleTexte = Math.max(rayon * 1.16, 7.6 / pxParMetre);
  const trait = Math.max(rayon * 0.18, 1.5 / pxParMetre);
  // Le ballon des pastilles faisait presque la taille d'un joueur. Avec des
  // silhouettes à l'échelle, il reste volontairement un peu agrandi pour être
  // suivi à la télévision, mais ne dépasse plus 45 cm à l'écran.
  const rayonBallon = Math.max(0.24, 2.7 / pxParMetre);
  // Les références fournies grossissent volontairement les personnages : ils
  // font environ 24 à 34 px même lorsque la caméra montre la moitié du terrain.
  const hauteurSprite = Math.min(5.2, Math.max(3.35, 25 / pxParMetre));
  // Le générateur travaille à 16 i/s : caler les dessins dessus évite de
  // recalculer trente sprites 60 fois par seconde sans perdre une image utile.
  const tempsAnimation = Math.floor((affiche.simulation ?? affiche.instantJeu ?? 0) * 24) / 24;
  const b = ballon.current;
  const maillots: Record<CoteEnLigne, MaillotMatch> = useMemo(() => couleurs.maillots ?? ({
    domicile: maillotDeSecours(couleurs.domicile, nomDomicile),
    exterieur: maillotDeSecours(couleurs.exterieur, nomExterieur),
  }), [couleurs.maillots, couleurs.domicile, couleurs.exterieur, nomDomicile, nomExterieur]);
  const porteurPosition = affiche.porteurId ? pions.current.get(affiche.porteurId) : undefined;

  const dessiner = (p: TerrainDirect['pions'][number]) => {
    const pos = pions.current.get(p.id);
    if (!pos) return null;
    const porte = affiche.porteurId === p.id;
    const mien = monCote !== undefined && p.cote === monCote;
    const nomCourt = p.nom.split(' ').at(-1) ?? p.nom;
    const largeurNom = Math.max(tailleTexte * 3.2, nomCourt.length * tailleTexte * 0.64);
    return <g key={p.id} className={mien ? 'rg-joueur-moi' : undefined}>
      <SpriteRugbymanMemo pion={p} position={pos} terrain={affiche} maillot={maillots[p.cote]}
        porteur={porte} positionPorteur={porteurPosition} redresser={vue?.redresser}
        hauteurMetres={hauteurSprite} temps={tempsAnimation} angleVue={vue?.angle ?? 0} />
      {porte && (
        <g transform={`translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`}>
          <g className="cel-nom-porteur" transform={vue?.redresser}>
            <rect x={-largeurNom / 2} y={-hauteurSprite * .98} width={largeurNom} height={tailleTexte * 1.35} rx={tailleTexte * 0.35} />
            <text y={-hauteurSprite * .98 + tailleTexte * .86} textAnchor="middle" fontSize={tailleTexte * 0.76}>{nomCourt}</text>
          </g>
        </g>
      )}
    </g>;
  };

  // La flèche de bord quand le ballon sort du cadre : sans elle, on le perd de
  // vue dès qu'un dégagement part à l'opposé.
  const fleche = (() => {
    if (!vue) return null;
    const p = vue.versEcran(b);
    if (p.x > 1 && p.x < vue.W - 1 && p.y > 1 && p.y < vue.H - 1) return null;
    const bx = borner(p.x, 2.5, vue.W - 2.5);
    const by = borner(p.y, 2.5, vue.H - 2.5);
    return { bx, by, angle: (Math.atan2(p.y - by, p.x - bx) * 180) / Math.PI };
  })();

  const porteur = affiche.porteurId
    ? affiche.pions.find((p) => p.id === affiche.porteurId)
    : undefined;
  const conquete = affiche.conquete;
  const cibleConquete = conquete?.cibleId
    ? pions.current.get(conquete.cibleId)
    : undefined;
  const poussee = conquete?.type === 'melee'
    ? borner((conquete.progression - 0.45) / 0.55, 0, 1)
    : 0;
  const sensPoussee = conquete?.pousseVers === 'exterieur' ? -1 : 1;
  const arbitre = affiche.arbitre ?? { x: LONGUEUR / 2 - 7, y: LARGEUR / 2 - 9 };
  // Une passe tourne peu ; un dégagement part en rotation bout par bout et le
  // rebond la ralentit. La couture rend ce mouvement lisible même de loin.
  const rotationBallon = affiche.vol ? (affiche.vol.ecoule * (affiche.vol.type === 'pied' ? 760 : 180)) % 360
    : affiche.phase === 'ballonLibre' ? (tempsAnimation * 390) % 360 : -18;

  return (
    <div className="cel-scene" ref={scene}>
      <svg
        className="cel-pelouse"
        viewBox={vue?.viewBox ?? `0 0 ${LONGUEUR} ${LARGEUR}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`${nomDomicile} contre ${nomExterieur} : positions réelles des joueurs et du ballon`}
      >
        <g transform={vue?.transform}>
          <PelouseMemo />
          {conquete?.type === 'melee' && conquete.pousseVers && (
            <g className="cel-conquete-dessin">
              <line
                x1={b.x - sensPoussee * 1.2} y1={b.y - 4.2}
                x2={b.x + sensPoussee * (2.2 + poussee * 4.8)} y2={b.y - 4.2}
                strokeWidth={Math.max(0.45, trait * 1.5)}
              />
              <path transform={`translate(${b.x + sensPoussee * (2.2 + poussee * 4.8)} ${b.y - 4.2}) scale(${sensPoussee} 1)`} d="M 0 0 L -2 -1.15 L -2 1.15 Z" />
            </g>
          )}
          {conquete?.type === 'touche' && cibleConquete && (
            <g className="cel-appel-touche" transform={`translate(${cibleConquete.x} ${cibleConquete.y})`}>
              <circle r={rayon * (1.65 + Math.sin(Math.PI * conquete.progression) * 0.45)} strokeWidth={trait * 1.35} />
              <path d={`M ${-rayon * 2.8} 0 Q 0 ${-rayon * 2.2} ${rayon * 2.8} 0`} strokeWidth={trait} />
            </g>
          )}
          {/* Le porteur passe DEVANT tout le monde : c'est lui qu'on suit. */}
          {affiche.pions.filter((p) => p.cote === 'exterieur' && p.id !== affiche.porteurId).map(dessiner)}
          {affiche.pions.filter((p) => p.cote === 'domicile' && p.id !== affiche.porteurId).map(dessiner)}
          <SpriteArbitre position={arbitre} phase={affiche.phase} sifflet={affiche.sifflet}
            regard={affiche.arbitre?.regard} vitesse={Math.hypot(affiche.arbitre?.vx ?? 0, affiche.arbitre?.vy ?? 0)} angleVue={vue?.angle ?? 0}
            redresser={vue?.redresser} hauteurMetres={hauteurSprite * .94} temps={tempsAnimation}
            couleur={(nomDomicile.length + nomExterieur.length) % 2 ? '#f4c542' : '#35b76d'} carton={carton} />
          {porteur ? dessiner(porteur) : null}
          {affiche.vol && (() => {
            const chemins = tracerTrajectoires(affiche.vol);
            return (
              <g className="cel-trajectoire-vol">
                {chemins.ombre && (
                  <path d={chemins.ombre} stroke="rgba(0,0,0,.24)" strokeWidth={Math.max(0.18, trait * 0.9)} fill="none" strokeDasharray="0.6 0.4" strokeLinecap="round" />
                )}
                {chemins.anticipe && (
                  <path d={chemins.anticipe} stroke="rgba(255,235,140,.35)" strokeWidth={Math.max(0.2, trait * 1.0)} fill="none" strokeDasharray="0.9 0.9" />
                )}
                {chemins.vol && (
                  <path d={chemins.vol} stroke="rgba(255,225,90,.85)" strokeWidth={Math.max(0.32, trait * 1.4)} fill="none" strokeLinecap="round" />
                )}
              </g>
            );
          })()}
          {!affiche.porteurId && affiche.conquete?.type !== 'touche' && <>
            {b.h > 0.02 && <ellipse cx={b.x} cy={b.y} rx={rayonBallon * (0.62 + b.h * 0.04)} ry={rayonBallon * (0.34 + b.h * 0.02)} fill="rgba(0,0,0,.32)" />}
            {b.h > 1.2 && <ellipse cx={b.x} cy={b.y - b.h * 2.2} rx={rayonBallon * (1.2 + b.h * 0.12)} ry={rayonBallon * (0.8 + b.h * 0.08)} fill="rgba(255,245,180,.25)" />}
            <g transform={`rotate(${rotationBallon.toFixed(1)} ${b.x} ${b.y - b.h * 2.2})`}>
              <ellipse
                className="cel-ballon"
                cx={b.x} cy={b.y - b.h * 2.2}
                rx={rayonBallon * 0.72 + b.h * 0.13} ry={rayonBallon * 0.41 + b.h * 0.08}
                fill="#f4e3c0" stroke="#3a2410" strokeWidth={rayonBallon * 0.16}
              />
              <path d={`M ${b.x - rayonBallon * .22} ${b.y - b.h * 2.2} L ${b.x + rayonBallon * .22} ${b.y - b.h * 2.2}`}
                stroke="#80552d" strokeWidth={rayonBallon * .09} strokeLinecap="round" />
            </g>
          </>}
        </g>
        {/* La flèche vit hors du groupe pivoté : elle est posée en coordonnées
            d'écran, comme les pastilles du bandeau. */}
        {fleche && (
          <g className="cel-fleche-ballon" transform={`translate(${fleche.bx} ${fleche.by}) rotate(${fleche.angle})`}>
            <path d="M 0 -1.6 L 3 0 L 0 1.6 Z" />
          </g>
        )}
      </svg>

      <div className="cel-hud">
        {conquete && (
          <div className={`cel-conquete cel-conquete-${conquete.type}`} role="status">
            <strong>{conquete.type === 'melee' ? 'MÊLÉE · POUSSÉE' : 'TOUCHE · COMBINAISON'}</strong>
            <span>{conquete.type === 'melee'
              ? conquete.progression < 0.32 ? 'Les packs se placent' : conquete.progression < 0.52 ? 'Liaison' : conquete.pousseVers ? 'Un pack prend l’ascendant' : 'Mêlée stable au centre'
              : LIBELLES_COMBINAISON[conquete.combinaison ?? 'milieu']}</span>
            <i><b style={{ width: `${Math.round(conquete.progression * 100)}%` }} /></i>
          </div>
        )}
        {affiche.aplatissage && (
          <div className="cel-aplatissage" role="status">
            <strong>ESSAI EN COURS</strong>
            <span>Contrôle et aplatissage du ballon</span>
          </div>
        )}
        {!affiche.tmo?.actif && affiche.phase !== 'tmo' && (
          <div className={`cel-scenario cel-scenario-${scenario.intensite}`} aria-live="polite">
            {scenario.momentFort && <b>MOMENT FORT</b>}
            <span>{LIBELLES_SCENARIO[scenario.type]}</span>
            <small>{scenario.sequence}<sup>e</sup> phase · {LIBELLES_ZONE[scenario.zone]}</small>
          </div>
        )}
        <div className="cel-hud-haut">
          <span className="cel-tag"><i style={{ background: couleurs.domicile }} />{nomDomicile}{monCote === 'domicile' ? ' · toi' : ''}</span>
          <span className="cel-tag"><i style={{ background: couleurs.exterieur }} />{nomExterieur}{monCote === 'exterieur' ? ' · toi' : ''}</span>
          <span className="cel-tag" style={{ borderColor: couleurs[affiche.possession] }}>
            <Icone nom="ballon" taille={13} />{affiche.possession === 'domicile' ? nomDomicile : nomExterieur}
          </span>
          {affiche.phase !== 'jeuCourant' && CLE_PHASE[affiche.phase] && (
            <span className="cel-tag">{t(CLE_PHASE[affiche.phase])}</span>
          )}
        </div>
        {affiche.sifflet && !affiche.tmo?.actif && (
          <div className="cel-sifflet" role="status">
            <b>{t(affiche.sifflet.cle)}</b>
            <span>{t('ml.sifflet.pour', { club: affiche.sifflet.club })}{affiche.sifflet.fautif ? ` · ${affiche.sifflet.fautif}` : ''}</span>
          </div>
        )}
        {!affiche.tmo?.actif && affiche.phase !== 'tmo' && (
          <button
            type="button"
            className="cel-cadrage"
            onClick={() => setModeCamera(modeCamera === 'auto' ? 'large' : modeCamera === 'large' ? 'suivi' : 'auto')}
          >
            <Icone nom="oeil" taille={15} />
            {modeCamera === 'auto' ? 'Caméra auto' : modeCamera === 'large' ? 'Vue terrain' : 'Suivre le ballon'}
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(TerrainEnDirect);
