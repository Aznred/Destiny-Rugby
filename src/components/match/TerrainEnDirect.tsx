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
//   • `animerArret` — la mêlée se présente, se lie et pousse pendant ses
//     cinquante secondes au lieu de tenir une pose.
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

import { memo, useEffect, useRef, useState } from 'react';
import { Icone } from '../Icone';
import { PelouseMemo } from './Pelouse';
import { Camera, angleDeVue, type Cadrage, type Vue } from '../../lib/moteur/camera';
import { LARGEUR, LONGUEUR, borner, type Vec } from '../../lib/moteur/terrain';
import type { CoteEnLigne, TerrainDirect } from '../../lib/ligue/matchCarriere';
import { t } from '../../lib/i18n';

/**
 * Le retard de rendu, en secondes réelles.
 *
 * ⚠️ IL DOIT DÉPASSER L'INTERVALLE DE SONDAGE (deux secondes), sinon le relevé
 * qui ferme l'interpolation n'est pas encore arrivé et on retombe sur de la
 * prédiction. Une marge de 20 % absorbe la latence du réseau.
 */
const RETARD = 2.4;
/** Au-delà du dernier relevé, on ne prolonge pas plus longtemps que ça. */
const PREDICTION_MAX = 1.2;
/** Nombre de relevés gardés : deux pour interpoler, un pour la marge. */
const TAMPON_MAX = 4;

const CLE_PHASE: Record<string, string> = {
  coupEnvoi: 'ml.phase.coupEnvoi', renvoi22: 'ml.phase.renvoi22', ruck: 'ml.phase.ruck',
  melee: 'ml.phase.melee', touche: 'ml.phase.touche', maul: 'ml.phase.maul',
  ballonEnLAir: 'ml.phase.ballonEnLAir', tirAuBut: 'ml.phase.tirAuBut',
  transformation: 'ml.phase.transformation', penalite: 'ml.phase.penalite',
  apresEssai: 'ml.phase.apresEssai', miTemps: 'ml.phase.miTemps',
};

export interface CouleursDirect { domicile: string; exterieur: string }

interface Props {
  terrain: TerrainDirect;
  nomDomicile: string;
  nomExterieur: string;
  couleurs: CouleursDirect;
  /** Le camp qu'on entraîne : c'est vers son en-but qu'on attaque à l'écran. */
  monCote?: CoteEnLigne;
}

interface Ballon extends Vec { h: number }
interface Releve { terrain: TerrainDirect; recu: number }

/**
 * La spline d'Hermite entre deux positions et leurs vitesses.
 *
 * `u` va de 0 à 1 ; `dt` est le temps SIMULÉ qui sépare les deux relevés, sans
 * quoi les tangentes n'auraient pas la bonne échelle et la courbe partirait en
 * boucle.
 */
function hermite(p0: number, v0: number, p1: number, v1: number, u: number, dt: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0
    + (u3 - 2 * u2 + u) * dt * v0
    + (-2 * u3 + 3 * u2) * p1
    + (u3 - u2) * dt * v1;
}

/** Le ballon d'un relevé : porté, en vol, ou au sol. */
function ballonDe(T: TerrainDirect, pions: Map<string, Vec>, sim: number): Ballon {
  if (T.vol) {
    const k = Math.min(1, (T.vol.ecoule + sim) / Math.max(0.01, T.vol.duree));
    return {
      x: T.vol.de.x + (T.vol.vers.x - T.vol.de.x) * k,
      y: T.vol.de.y + (T.vol.vers.y - T.vol.de.y) * k,
      h: T.vol.hauteur * Math.sin(Math.PI * k),
    };
  }
  if (T.porteurId) {
    const p = pions.get(T.porteurId);
    if (p) return { x: p.x + 1.25, y: p.y + 0.7, h: 0 };
  }
  return { x: T.ballon.x, y: T.ballon.y, h: 0 };
}

function TerrainEnDirect({ terrain, nomDomicile, nomExterieur, couleurs, monCote }: Props) {
  const scene = useRef<HTMLDivElement>(null);
  const boite = useRef({ largeur: 1, hauteur: 1 });
  const camera = useRef(new Camera());
  const vueRef = useRef<Vue | null>(null);
  /** Les positions affichées à cette image, reconstruites entre deux relevés. */
  const pions = useRef(new Map<string, Vec>());
  const ballon = useRef<Ballon>({ x: LONGUEUR / 2, y: LARGEUR / 2, h: 0 });
  /** Le relevé effectivement montré : c'est lui qui commande le bandeau. */
  const [affiche, setAffiche] = useState<TerrainDirect>(terrain);
  const [cadrage, setCadrage] = useState<Cadrage>('large');
  const [, redessiner] = useState(0);

  // ⚠️ TOUT CE QUE LA BOUCLE LIT PASSE PAR UNE RÉFÉRENCE. Elle est montée une
  // seule fois pour la vie du composant : la relancer à chaque relevé du serveur
  // remettrait la caméra à zéro toutes les deux secondes.
  const tampon = useRef<Releve[]>([{ terrain, recu: performance.now() / 1000 }]);
  const reglages = useRef({ cadrage, monCote });
  useEffect(() => {
    const file = tampon.current;
    if (file[file.length - 1]?.terrain === terrain) return;
    file.push({ terrain, recu: performance.now() / 1000 });
    if (file.length > TAMPON_MAX) file.splice(0, file.length - TAMPON_MAX);
  }, [terrain]);
  useEffect(() => { reglages.current = { cadrage, monCote }; }, [cadrage, monCote]);

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
    let montre: TerrainDirect | null = null;
    const avancer = (brut: number) => {
      if (!actif) return;
      const maintenant = brut / 1000;
      const dt = Math.min(0.1, Math.max(0, maintenant - precedent));
      precedent = maintenant;

      const file = tampon.current;
      const instant = maintenant - RETARD;
      // Les deux relevés qui encadrent l'instant rendu. Tant que le tampon n'a
      // pas pris d'avance (les deux premières secondes), on tient la première
      // image : mieux vaut un terrain immobile qu'un terrain inventé.
      let i = 0;
      while (i < file.length - 2 && file[i + 1].recu <= instant) i++;
      const a = file[i];
      const b = file[i + 1];
      let u = 0;
      let dtSim = 0;
      if (b) {
        const span = Math.max(0.001, b.recu - a.recu);
        u = borner((instant - a.recu) / span, 0, 1);
        // ⚠️ LE TEMPS SIMULÉ VIENT DE L'HORLOGE DU MATCH, PAS DE LA MONTRE. Une
        // décision de pénalité gèle le chrono du serveur : les deux relevés
        // portent alors la même minute, les tangentes s'annulent, et le terrain
        // s'immobilise exactement comme le jeu.
        dtSim = Math.max(0, (b.terrain.horloge - a.terrain.horloge) * 60);
      } else {
        // Rien derrière : on prolonge brièvement le dernier relevé connu.
        dtSim = borner(instant - a.recu, 0, PREDICTION_MAX) * a.terrain.cadence;
      }

      const positions = pions.current;
      positions.clear();
      if (b) {
        const parId = new Map(b.terrain.pions.map((p) => [p.id, p]));
        for (const p0 of a.terrain.pions) {
          const p1 = parId.get(p0.id);
          if (!p1) continue;
          positions.set(p0.id, {
            x: borner(hermite(p0.x, p0.vx, p1.x, p1.vx, u, dtSim), 0, LONGUEUR),
            y: borner(hermite(p0.y, p0.vy, p1.y, p1.vy, u, dtSim), 0, LARGEUR),
          });
        }
        // Un entrant apparaît dans le relevé le plus récent seulement.
        for (const p1 of b.terrain.pions) {
          if (!positions.has(p1.id)) positions.set(p1.id, { x: p1.x, y: p1.y });
        }
      } else {
        for (const p of a.terrain.pions) {
          positions.set(p.id, {
            x: borner(p.x + p.vx * dtSim, 0, LONGUEUR),
            y: borner(p.y + p.vy * dtSim, 0, LARGEUR),
          });
        }
      }

      // Le relevé qui commande le bandeau : le plus proche de l'instant rendu.
      const courant = b && u > 0.5 ? b.terrain : a.terrain;
      if (courant !== montre) { montre = courant; setAffiche(courant); }
      ballon.current = ballonDe(courant, positions, courant === a.terrain ? u * dtSim : 0);

      const { largeur, hauteur } = boite.current;
      vueRef.current = camera.current.suivre(
        ballon.current, reglages.current.cadrage, largeur / hauteur,
        angleDeVue(reglages.current.monCote === 'exterieur' ? 'B' : 'A', hauteur > largeur), dt,
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
  const b = ballon.current;

  const dessiner = (p: TerrainDirect['pions'][number]) => {
    const pos = pions.current.get(p.id);
    if (!pos) return null;
    const porte = affiche.porteurId === p.id;
    const mien = monCote !== undefined && p.cote === monCote;
    return (
      <g key={p.id} transform={`translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`}>
        <title>{`${p.numero} · ${p.nom}`}</title>
        <ellipse cx={rayon * 0.14} cy={rayon * 0.35} rx={rayon} ry={rayon * 0.7} fill="rgba(0,0,0,.35)" />
        <circle
          r={rayon}
          fill={couleurs[p.cote]}
          stroke={porte ? '#fff6d8' : mien ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.5)'}
          strokeWidth={porte ? Math.max(rayon * 0.34, trait * 1.8) : trait}
        />
        {/* Les numéros reçoivent la rotation INVERSE de la caméra : sans elle
            ils se lisent de travers dès que le terrain pivote en portrait. */}
        <text
          transform={vue?.redresser}
          y={tailleTexte * 0.36} textAnchor="middle" fontSize={tailleTexte} fill="#fff" fontWeight="700"
          style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.6)', strokeWidth: tailleTexte * 0.26 }}
        >
          {p.numero}
        </text>
      </g>
    );
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
          {/* Le porteur passe DEVANT tout le monde : c'est lui qu'on suit. */}
          {affiche.pions.filter((p) => p.cote === 'exterieur' && p.id !== affiche.porteurId).map(dessiner)}
          {affiche.pions.filter((p) => p.cote === 'domicile' && p.id !== affiche.porteurId).map(dessiner)}
          {porteur ? dessiner(porteur) : null}
          {b.h > 0.02 && <ellipse cx={b.x} cy={b.y} rx={rayon * 0.8} ry={rayon * 0.5} fill="rgba(0,0,0,.3)" />}
          <ellipse
            className="cel-ballon"
            cx={b.x} cy={b.y - b.h * 2.2}
            rx={rayon * 0.95 + b.h * 0.35} ry={rayon * 0.66 + b.h * 0.25}
            fill="#f4e3c0" stroke="#3a2410" strokeWidth={rayon * 0.3}
          />
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
        {affiche.sifflet && (
          <div className="cel-sifflet" role="status">
            <b>{t(affiche.sifflet.cle)}</b>
            <span>{t('ml.sifflet.pour', { club: affiche.sifflet.club })}{affiche.sifflet.fautif ? ` · ${affiche.sifflet.fautif}` : ''}</span>
          </div>
        )}
        <button
          type="button"
          className="cel-cadrage"
          onClick={() => setCadrage(cadrage === 'suivi' ? 'large' : 'suivi')}
        >
          <Icone nom="oeil" taille={15} />{cadrage === 'suivi' ? 'Tout le terrain' : 'Suivre le ballon'}
        </button>
      </div>
    </div>
  );
}

export default memo(TerrainEnDirect);
