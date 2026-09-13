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

import { memo, useEffect, useRef, useState } from 'react';
import { Icone } from '../Icone';
import { PelouseMemo } from './Pelouse';
import { Camera, angleDeVue, type Cadrage, type Vue } from '../../lib/moteur/camera';
import { LARGEUR, LONGUEUR, borner, type Vec } from '../../lib/moteur/terrain';
import type { CoteEnLigne, TerrainDirect } from '../../lib/ligue/matchCarriere';
import { creerScenarioDirect, type ScenarioDirect } from '../../lib/ligue/scenarioDirect';
import {
  amortirImageDirect, interpolerImageDirect, projeterImageDirect, type BallonAfficheDirect,
  type ImageDirect,
} from '../../lib/ligue/interpolationDirect';
import { t } from '../../lib/i18n';

/**
 * Le retard de rendu, en secondes réelles.
 *
 * ⚠️ IL DOIT DÉPASSER L'INTERVALLE DE SONDAGE (deux secondes), sinon le relevé
 * qui ferme l'interpolation n'est pas encore arrivé et on retombe sur de la
 * prédiction. Une marge de 20 % absorbe la latence du réseau.
 */
const RETARD = 2.25;
/** Au-delà du dernier relevé, on ne prolonge pas plus longtemps que ça. */
const PREDICTION_MAX = 1.15;
/** Deux images utiles, plus assez de marge pour un paquet retardé/réordonné. */
const TAMPON_MAX = 6;

const CLE_PHASE: Record<string, string> = {
  coupEnvoi: 'ml.phase.coupEnvoi', renvoi22: 'ml.phase.renvoi22', ruck: 'ml.phase.ruck',
  melee: 'ml.phase.melee', touche: 'ml.phase.touche', maul: 'ml.phase.maul',
  ballonEnLAir: 'ml.phase.ballonEnLAir', ballonLibre: 'ml.phase.ballonEnLAir', tirAuBut: 'ml.phase.tirAuBut',
  transformation: 'ml.phase.transformation', penalite: 'ml.phase.penalite',
  aplatissage: 'ml.phase.apresEssai', apresEssai: 'ml.phase.apresEssai', miTemps: 'ml.phase.miTemps',
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
  aplatissage: 'Aplatissage',
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

function TerrainEnDirect({ terrain, nomDomicile, nomExterieur, couleurs, monCote }: Props) {
  const scene = useRef<HTMLDivElement>(null);
  const boite = useRef({ largeur: 1, hauteur: 1 });
  const camera = useRef(new Camera());
  const vueRef = useRef<Vue | null>(null);
  /** Les positions affichées à cette image, reconstruites entre deux relevés. */
  const pions = useRef(new Map<string, Vec>());
  const ballon = useRef<BallonAfficheDirect>({ x: LONGUEUR / 2, y: LARGEUR / 2, h: 0 });
  /** Le relevé effectivement montré : c'est lui qui commande le bandeau. */
  const [affiche, setAffiche] = useState<TerrainDirect>(terrain);
  const [modeCamera, setModeCamera] = useState<ModeCamera>('auto');
  const [scenario, setScenario] = useState(() => creerScenarioDirect(terrain));
  const [, redessiner] = useState(0);

  // ⚠️ TOUT CE QUE LA BOUCLE LIT PASSE PAR UNE RÉFÉRENCE. Elle est montée une
  // seule fois pour la vie du composant : la relancer à chaque relevé du serveur
  // remettrait la caméra à zéro toutes les deux secondes.
  const premierRecu = performance.now() / 1000;
  const premierInstant = (terrain.emisLe ?? Date.now()) / 1000;
  const tampon = useRef<Releve[]>([{ terrain, recu: premierRecu, instant: premierInstant }]);
  /** performance.now() - horloge serveur ; filtré pour ne pas suivre le jitter. */
  const decalageServeur = useRef(premierRecu - premierInstant);
  const reglages = useRef({ modeCamera, monCote });
  const scenarioCourant = useRef(scenario);
  useEffect(() => {
    const file = tampon.current;
    if (file[file.length - 1]?.terrain === terrain) return;
    const recu = performance.now() / 1000;
    const instant = (terrain.emisLe ?? Date.now()) / 1000;
    // Une réponse lente arrivée après la suivante ne doit jamais faire reculer
    // le film. Elle est simplement obsolète : le prochain relevé fait foi.
    if (instant + 0.001 < (file[file.length - 1]?.instant ?? -Infinity)) return;
    const observation = recu - instant;
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
    let montre: TerrainDirect | null = null;
    let imageAffichee: ImageDirect | null = null;
    const avancer = (brut: number) => {
      if (!actif) return;
      const maintenant = brut / 1000;
      const dt = Math.min(0.1, Math.max(0, maintenant - precedent));
      precedent = maintenant;

      const file = tampon.current;
      const instant = maintenant - decalageServeur.current - RETARD;
      // Les deux relevés qui encadrent l'instant rendu. Tant que le tampon n'a
      // pas pris d'avance (les deux premières secondes), on tient la première
      // image : mieux vaut un terrain immobile qu'un terrain inventé.
      let i = 0;
      while (i < file.length - 2 && file[i + 1].instant <= instant) i++;
      const a = file[i];
      const b = file[i + 1];
      let u = 0;
      let dtSim = 0;
      if (b) {
        const span = Math.max(0.001, b.instant - a.instant);
        u = borner((instant - a.instant) / span, 0, 1);
        // ⚠️ LE TEMPS SIMULÉ VIENT DE L'HORLOGE DU MATCH, PAS DE LA MONTRE. Une
        // décision de pénalité gèle le chrono du serveur : les deux relevés
        // portent alors la même minute, les tangentes s'annulent, et le terrain
        // s'immobilise exactement comme le jeu.
        dtSim = Math.max(0, (b.terrain.horloge - a.terrain.horloge) * 60);
      } else {
        // Rien derrière : on prolonge brièvement le dernier relevé connu.
        dtSim = borner(instant - a.instant, 0, PREDICTION_MAX) * a.terrain.cadence;
      }

      let imageDirecte;
      if (b) {
        imageDirecte = interpolerImageDirect(a.terrain, b.terrain, u, dtSim);
      } else {
        imageDirecte = projeterImageDirect(a.terrain, dtSim / Math.max(0.01, a.terrain.cadence));
      }
      imageAffichee = amortirImageDirect(imageAffichee, imageDirecte, dt);
      pions.current = imageAffichee.pions;
      ballon.current = imageAffichee.ballon;

      // Le bandeau et le porteur ne changent qu'au terme de la trajectoire.
      // Avant, ils basculaient à u=0,5 : le ballon quittait alors une position
      // interpolée pour apparaître d'un coup dans les mains du relevé suivant.
      const courant = b && u >= 1 ? b.terrain : a.terrain;
      if (courant !== montre) { montre = courant; setAffiche(courant); }

      const prochainScenario = creerScenarioDirect(courant);
      if (prochainScenario.id !== scenarioCourant.current.id) {
        scenarioCourant.current = prochainScenario;
        setScenario(prochainScenario);
      }

      const { largeur, hauteur } = boite.current;
      const mode = reglages.current.modeCamera;
      const cadrage: Cadrage = mode === 'auto' ? prochainScenario.cadrage : mode;
      // La caméra suit la position effectivement dessinée. Viser soudain le
      // milieu entre le ballon et sa destination provoquait un second saut,
      // même quand la trajectoire du ballon était correcte.
      const cible = ballon.current;
      vueRef.current = camera.current.suivre(
        cible, cadrage, largeur / hauteur,
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
    const nomCourt = p.nom.split(' ').at(-1) ?? p.nom;
    const largeurNom = Math.max(tailleTexte * 3.2, nomCourt.length * tailleTexte * 0.64);
    return (
      <g
        key={p.id}
        className={affiche.aplatissage?.marqueurId === p.id ? 'cel-joueur-aplatit' : undefined}
        transform={`translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`}
      >
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
        {porte && (
          <g className="cel-nom-porteur" transform={vue?.redresser}>
            <rect x={-largeurNom / 2} y={-rayon * 3.1} width={largeurNom} height={tailleTexte * 1.35} rx={tailleTexte * 0.35} />
            <text y={-rayon * 2.25} textAnchor="middle" fontSize={tailleTexte * 0.76}>{nomCourt}</text>
          </g>
        )}
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
  const conquete = affiche.conquete;
  const cibleConquete = conquete?.cibleId
    ? pions.current.get(conquete.cibleId)
    : undefined;
  const poussee = conquete?.type === 'melee'
    ? borner((conquete.progression - 0.45) / 0.55, 0, 1)
    : 0;
  const sensPoussee = conquete?.pousseVers === 'exterieur' ? -1 : 1;

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
        <div className={`cel-scenario cel-scenario-${scenario.intensite}`} aria-live="polite">
          {scenario.momentFort && <b>MOMENT FORT</b>}
          <span>{LIBELLES_SCENARIO[scenario.type]}</span>
          <small>{scenario.sequence}<sup>e</sup> phase · {LIBELLES_ZONE[scenario.zone]}</small>
        </div>
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
          onClick={() => setModeCamera(modeCamera === 'auto' ? 'large' : modeCamera === 'large' ? 'suivi' : 'auto')}
        >
          <Icone nom="oeil" taille={15} />
          {modeCamera === 'auto' ? 'Caméra auto' : modeCamera === 'large' ? 'Vue terrain' : 'Suivre le ballon'}
        </button>
      </div>
    </div>
  );
}

export default memo(TerrainEnDirect);
