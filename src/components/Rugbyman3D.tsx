// LE RUGBYMAN — c'est TON joueur, et il porte ce que tu lui achètes
//
// Demande : « je veux un rugbyman 3D à l'accueil qui tient le ballon et sur
// lequel on peut customiser casque, ballon, chaussettes, maillot, chaussures
// etc., et qu'on le voie aussi dans le profil, en mode c'est notre joueur ».
//
// Le personnage est le modèle livré `public/m3d/rugbyman.glb` (compressé par
// `node scripts/copierTrophees.cjs`). Les cosmétiques sont des modèles à part,
// **accrochés dessus** : le casque sur la tête, les chaussettes sur les
// mollets, les mitaines aux mains, le ballon au creux du bras.
//
// ⚠️ LES POINTS D'ACCROCHE SONT CALCULÉS SUR LA BOÎTE ENGLOBANTE, pas codés en
// dur. Le modèle peut être relivré avec une autre échelle, une autre
// orientation ou un autre centrage — c'est déjà arrivé pour les trophées — et
// tout serait à refaire à la main. On mesure le personnage une fois, et on
// place tout en PROPORTION de sa taille : le casque à 92 % de sa hauteur, les
// mollets à 13 %, etc. Un modèle deux fois plus grand donne exactement le même
// rendu.
//
// ⚠️ ET IL Y A UN REPLI EN GÉOMÉTRIE. Sur machine modeste (≤ 4 cœurs) ou si le
// modèle n'est pas là, on dessine une silhouette en primitives : l'accueil est
// le PREMIER écran du jeu, il ne peut pas être vide parce qu'un fichier de
// 3 Mo n'est pas arrivé.

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { BallonRugby } from './BallonRugby';
import { ModeleBallon } from './ModeleBallon';
import { SKIN_PAR_ID, EQUIPEMENT_PAR_ID } from '../data/boutique';
import { clubParNom } from '../data/clubs';
import type { CategorieEquipement } from '../data/boutique';
import { type TenueRugbyman } from '../lib/tenue';
import { modelePresent } from '../lib/modeles';

const MODELE_JOUEUR = '/m3d/rugbyman.glb';
/** Hauteur du personnage dans la scène. Tout le reste s'en déduit. */
const TAILLE = 6;

/** Les couleurs effectivement portées, article équipé d'abord, club ensuite. */
function couleursDe(tenue: TenueRugbyman) {
  const club = clubParNom(tenue.club ?? '');
  const equipe = tenue.equipement ?? {};
  const article = (categorie: CategorieEquipement) => {
    const id = equipe[categorie];
    return id ? EQUIPEMENT_PAR_ID[id] : undefined;
  };
  // ⚠️ CASQUE ET CHAUSSETTES ONT LEUR PROPRE CATÉGORIE, et ce n'est pas un
  // détail de rangement : `equipementActif` ne garde qu'UN article par
  // catégorie. Rangés tous les deux dans « accessoire », on ne pourrait pas
  // porter le casque ET les chaussettes — exactement ce que la demande exige
  // (« on peut customiser casque, ballon, chaussettes, maillot, chaussures »).
  return {
    maillot: article('maillot'),
    crampons: article('crampons'),
    chaussettes: article('chaussettes'),
    casque: article('casque'),
    mains: equipe.accessoire === 'mitaines' ? EQUIPEMENT_PAR_ID.mitaines : undefined,
    clubPrincipale: club?.c1 ?? '#15317e',
    clubSecondaire: club?.c2 ?? '#f4f4ef',
  };
}

/**
 * Prépare une copie d'un modèle chargé : matériaux sains, et rien d'autre.
 *
 * ⚠️ DEUX PIÈGES, ET ILS SONT MORTELS TOUS LES DEUX.
 *  1. Ne JAMAIS transformer un matériau unique en tableau : three.js ne dessine
 *     un maillage à plusieurs matériaux qu'en suivant `geometry.groups`, que ces
 *     modèles n'ont pas — résultat, rien à l'écran et aucune erreur.
 *  2. Ces modèles sortent d'un générateur en `metalness: 1`. Un métal pur n'a
 *     pas de diffus : il ne rend QUE ce qu'il réfléchit, et sans carte
 *     d'environnement il n'a rien à réfléchir. Il s'affiche parfaitement noir.
 */
function assainir(objet: THREE.Object3D, teinte?: string, prioriteCalque: boolean = false): void {
  const couleur = teinte ? new THREE.Color(teinte) : null;
  const retoucher = (m: THREE.Material): THREE.Material => {
    const copie = m.clone() as THREE.MeshStandardMaterial;
    if (copie.metalness != null) copie.metalness = Math.min(copie.metalness, 0.25);
    if (copie.roughness != null) copie.roughness = Math.max(copie.roughness, 0.45);
    if (couleur && copie.color) copie.color = copie.color.clone().lerp(couleur, 0.75);

    // ⚠️ On tape plus fort sur l'offset ! -10 et -20 garantissent que l'accessoire
    // passe toujours au-dessus du corps de base sans clignoter.
    if (prioriteCalque) {
      copie.polygonOffset = true;
      copie.polygonOffsetFactor = -10;
      copie.polygonOffsetUnits = -20;
    }

    return copie;
  };
  objet.traverse((noeud) => {
    const maillage = noeud as THREE.Mesh;
    if (!maillage.isMesh) return;
    maillage.material = Array.isArray(maillage.material)
        ? maillage.material.map(retoucher)
        : retoucher(maillage.material);
  });
}

/** Copie recentrée sur son propre milieu et mise à une hauteur donnée. */
function normaliser(source: THREE.Object3D, hauteur: number, teinte?: string, prioriteCalque: boolean = false): THREE.Group {
  const clone = source.clone(true) as THREE.Group;
  const boite = new THREE.Box3().setFromObject(clone);
  const taille = new THREE.Vector3();
  const centre = new THREE.Vector3();
  boite.getSize(taille);
  boite.getCenter(centre);
  const max = Math.max(taille.x, taille.y, taille.z) || 1;
  const echelle = hauteur / max;
  clone.scale.setScalar(echelle);
  clone.position.set(-centre.x * echelle, -centre.y * echelle, -centre.z * echelle);
  assainir(clone, teinte, prioriteCalque);
  return clone;
}

/**
 * Un cosmétique accroché sur le joueur. `hauteur` est sa taille FINALE dans la
 * scène, `position` le point d'accroche — les deux en unités de la scène, donc
 * proportionnels à la taille du personnage.
 */
function Accessoire({
                      url, teinte, hauteur, position, rotation = [0, 0, 0],
                    }: {
  url: string; teinte?: string; hauteur: number;
  position: [number, number, number]; rotation?: [number, number, number];
}) {
  // ⚠️ ON VÉRIFIE QUE LE MODÈLE EXISTE AVANT DE LE CHARGER. Vu en jeu : un
  // article équipé dont le `.glb` n'était pas encore fabriqué faisait lever
  // `useGLTF`, l'erreur remontait hors du canvas et `Garde` remplaçait TOUT
  // l'écran d'accueil par un message. Un cosmétique manquant doit être un
  // cosmétique qu'on ne voit pas, rien de plus.
  const [present, setPresent] = useState(false);
  useEffect(() => {
    let vivant = true;
    setPresent(false);
    void modelePresent(url).then((ok) => { if (vivant) setPresent(ok); });
    return () => { vivant = false; };
  }, [url]);
  if (!present) return null;
  return (
      <Suspense fallback={null}>
        <PieceChargee url={url} teinte={teinte} hauteur={hauteur} position={position} rotation={rotation} />
      </Suspense>
  );
}

function PieceChargee({
                        url, teinte, hauteur, position, rotation,
                      }: {
  url: string; teinte?: string; hauteur: number;
  position: [number, number, number]; rotation: [number, number, number];
}) {
  const { scene } = useGLTF(url, true);
  // ⚠️ 'true' passé ici en 4ème argument pour dire que cet objet est prioritaire (un calque)
  const objet = useMemo(() => normaliser(scene, hauteur, teinte, true), [scene, hauteur, teinte]);
  return <primitive object={objet} position={position} rotation={rotation} />;
}

/** Le personnage seul, sans rien dessus. */
function Corps({ teinte }: { teinte?: string }) {
  const { scene } = useGLTF(MODELE_JOUEUR, true);
  // Le corps n'est pas prioritaire, on garde false (le défaut)
  const objet = useMemo(() => normaliser(scene, TAILLE, teinte), [scene, teinte]);
  return <primitive object={objet} />;
}

/**
 * Le joueur, debout, ballon sous le bras. `anime` le fait respirer et tourner
 * doucement — on le coupe dans le profil, où il sert de portrait.
 */
export function Rugbyman3D({
                             tenue = {}, echelle = 1,
                           }: { tenue?: TenueRugbyman; echelle?: number }) {
  const c = useMemo(() => couleursDe(tenue), [tenue]);
  const skin = SKIN_PAR_ID[tenue.skinBallon ?? 'classique'] ?? SKIN_PAR_ID.classique;

  // ⚠️ TOUT EST EXPRIMÉ EN PROPORTION DE `TAILLE` : si le modèle est relivré
  // dans une autre échelle, `normaliser` le ramène à la même hauteur et ces
  // points d'accroche restent valables. Rien n'est mesuré en « unités du
  // fichier », qui ne veulent rien dire.
  const h = TAILLE;
  return (
      // ⚠️ IL NE BOUGE PAS, ET C'EST DEMANDÉ : « il faut qu'aucun asset ne tourne
      // dans le menu ou le profil ». Il y avait ici une rotation lente et une
      // respiration ; sur un modèle de 138 000 sommets, ça donnait surtout des
      // à-coups (« c'est pas smooth sur la page principale »). Une pose fixe en
      // trois-quarts, nette, vaut mieux qu'un mouvement qui saccade.
      <group scale={echelle} rotation={[-0.1, -0.2, 0]} position={[ -0.125, -0.5 , -0.5]}>
        <Suspense fallback={null}>
          {/* ⚠️ LE PERSONNAGE N'EST PAS TEINTÉ. Le modèle livré est UN seul
            maillage avec UN seul matériau et une texture cuite : le teinter
            repeindrait la peau et le visage en même temps que le maillot. Les
            cosmétiques sont donc des pièces ACCROCHÉES par-dessus. */}
          <Corps />

          {c.maillot && (
              <Accessoire
                  url={c.maillot.glb}
                  teinte={c.maillot.teinte}
                  hauteur={h * 0.48}
                  rotation={[0, 0, 0]}
                  position={[0.05, h * 0.145, 0.018]}
              />
          )}
          {c.casque && (
              <Accessoire
                  url={c.casque.glb}
                  teinte={c.casque.teinte}
                  rotation={[0, 0.02, 0]}
                  hauteur={h * 0.148}
                  position={[0.08, h * 0.425, h * 0.015]}
              />
          )}


          {/* ── CRAMPONS ──────────────────────────── */}

          {/* Pied droit du joueur (à GAUCHE sur l'écran) */}
          {c.crampons && (
              <Accessoire
                  url={c.crampons.glb}
                  teinte={c.crampons.teinte}
                  hauteur={h * 0.19}
                  rotation={[0, 1.4, 0]}
                  // Remonté (Y de -0.48 à -0.46) et avancé (Z de 0.03 à 0.07)
                  position={[-h * 0.05, -h * 0.48, h * 0.028]}
              />
          )}

          {/* Pied gauche du joueur (à DROITE sur l'écran - pied relevé) */}
          {c.crampons && (
              <Accessoire
                  url={c.crampons.glb}
                  teinte={c.crampons.teinte}
                  hauteur={h * 0.19}
                  // Le pied pointe vers le bas (0.2) et l'extérieur (0.3)
                  rotation={[0.7, 1.7, 0]}
                  // Remonté (Y de -0.45 à -0.42) et beaucoup avancé (Z de -0.04 à 0.05)
                  position={[h * 0.08, -h * 0.42, -h * 0.1]}
              />
          )}

          {/* ── LE BALLON, calé au creux du bras ────────────────────────────
  ⚠️ C'est le VRAI ballon du joueur, skin compris : celui qu'il a
  acheté en boutique, pas un ballon générique. */}
          {/* ⚠️ IL EST POSÉ SUR LE BALLON QUE LE MODÈLE TIENT DÉJÀ. Le rugbyman
  livré porte un ballon cuit dans son maillage — impossible à retirer,
  c'est le même objet que lui. Le ballon personnalisable vient donc se
  placer EXACTEMENT dessus, un poil plus gros pour le recouvrir :
  sinon on en voyait deux, celui du modèle dans la main levée et le
  tien à la hanche. */}
          <group position={[-h * 0.078, h * 0.353, h* 0.115]} rotation={[1.8 , 2.4, 0.45]} scale={h * 0.06}>
            {skin.glb
                ? <ModeleBallon url={skin.glb} tourne={false} />
                : <BallonRugby skinId={skin.id} tourne={false} />}
          </group>
        </Suspense>
      </group>
  );
}

useGLTF.preload(MODELE_JOUEUR, true);