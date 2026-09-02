// LE PORTRAIT DE TON JOUEUR — le visage dans le Profil, le corps entier au clic
//
// ⚠️ Demande explicite : « dans le profil, mets juste qu'on voie le visage avec
// casque ou non, et qu'on puisse cliquer dessus et ça nous amène dans un
// endroit où c'est le joueur en entier tout seul en 3D ».
//
// Deux cadrages, un seul modèle : la caméra vise la TÊTE dans la vignette, et
// le corps entier dans la modale. C'est le même rugbyman que sur l'accueil
// (`useTenue`) — deux sources donneraient deux joueurs différents, et c'est
// exactement ce qu'il ne faut pas quand on essaie de dire « c'est toi ».
//
// ⚠️ RIEN NE TOURNE, NI ICI NI SUR L'ACCUEIL (« il faut qu'aucun asset ne
// tourne dans le menu ou le profil »). Dans la modale, en revanche, on peut
// FAIRE tourner le joueur à la souris : ce n'est plus une animation subie,
// c'est le joueur qui regarde son avatar.

import { Suspense, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Rugbyman3D } from './Rugbyman3D';
import { useTenue } from '../lib/tenue';
import { modeAllege } from '../lib/modeles';
import { useModalDialog } from '../lib/useModalDialog';
import { t } from '../lib/i18n';
import { Icone } from './Icone';
import type { NomIcone } from './Icone';

/**
 * ⚠️ DOIT VALOIR LA MÊME CHOSE QUE `TAILLE` DANS `Rugbyman3D.tsx`.
 * C'est la hauteur du personnage dans la scène : elle décide où viser pour
 * cadrer le visage, et où poser l'ombre au sol. Si le rugbyman change de
 * taille là-bas et pas ici, le portrait vise le torse ou le ciel.
 */
const TAILLE = 5;

function Lumieres() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 4]} intensity={1.8} color="#fff2d0" />
      <directionalLight position={[-4, 1, -3]} intensity={0.55} color="#3fae66" />
    </>
  );
}

// ⚠️ LE REPLI EST UN NOM D'ICÔNE, PLUS UN EMOJI. C'est ce qui s'affiche quand
// le joueur n'a pas de portrait : un ballon 🏉 de la police système au milieu
// d'un avatar rond ne ressemble à rien de ce que le jeu dessine ailleurs.
export function PortraitJoueur({ repli = 'ballon' }: { repli?: NomIcone }) {
  const tenue = useTenue();
  const allege = useMemo(modeAllege, []);
  const [ouvert, setOuvert] = useState(false);

  if (allege || !tenue.nom) {
    return <div className="grand-avatar"><Icone nom={repli} taille={40} /></div>;
  }

  return (
    <>
      <button
        type="button"
        className="portrait-joueur"
        title={t('prof.voirJoueur')}
        aria-label={t('prof.voirJoueur')}
        onClick={() => setOuvert(true)}
      >
        {/* ⚠️ LA VIGNETTE NE MONTRE QUE LE VISAGE. La caméra est posée à hauteur
            de tête (le modèle est centré sur l'origine, la tête est donc en
            haut) et le corps sort du cadre par le bas — c'est voulu : on veut
            reconnaître son joueur, casque compris, pas admirer ses chaussures
            dans une vignette de 130 px. */}
        {/* ⚠️ C'EST LE JOUEUR QU'ON DESCEND, PAS LA CAMÉRA QU'ON MONTE. Une
            caméra R3F vise TOUJOURS l'origine : posée à hauteur de tête, elle
            regardait vers le bas et cadrait le torse. On descend donc le
            personnage pour amener sa tête sur l'origine, et la caméra reste
            droite, en face. */}
        <Canvas
          camera={{ position: [0, 0, 1.5], fov: 32 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <Lumieres />
            {/* Le petit décalage en x recentre le visage : le personnage est
                posé en trois-quarts, sa tête n'est donc pas sur l'axe. */}
            <group position={[0.08, -TAILLE * 0.4, 0]}>
              <Rugbyman3D tenue={tenue} />
            </group>
          </Suspense>
        </Canvas>
        <span className="portrait-loupe" aria-hidden="true"><Icone nom="plein-ecran" taille={15} /></span>
      </button>

      {ouvert && <VueEntiere onFermer={() => setOuvert(false)} />}
    </>
  );
}

/** Le joueur en entier, seul, sur fond de stade nocturne. */
function VueEntiere({ onFermer }: { onFermer: () => void }) {
  const tenue = useTenue();
  const { overlayRef, dialogRef } = useModalDialog(onFermer);

  return createPortal(
    // ⚠️ `createPortal(document.body)` obligatoire : le `backdrop-filter` des
    // `.carte` crée un bloc conteneur qui piège les `position: fixed`.
    <div className="overlay" ref={overlayRef} onClick={onFermer}>
      <motion.div
        className="carte modale modale-joueur"
        role="dialog"
        aria-modal="true"
        aria-label={tenue.nom}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
      >
        <div className="modale-joueur-tete">
          <div>
            <div className="eyebrow">{t('prof.tonJoueur')}</div>
            <h2>{tenue.nom}</h2>
          </div>
          <button type="button" className="btn fantome petit" onClick={onFermer}><Icone nom="croix" taille={17} /></button>
        </div>

        <div className="modale-joueur-scene">
          <Canvas
            camera={{ position: [0, 0, 9.2], fov: 40 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
          >
            <Suspense fallback={null}>
              <Lumieres />
              <Rugbyman3D tenue={tenue} />
              <ContactShadows position={[0, -TAILLE / 2 - 0.05, 0]} opacity={0.4} scale={8} blur={2.4} far={4} color="#04120a" />
              {/* Ici seulement, la rotation est PILOTÉE : c'est le joueur qui
                  tourne son avatar, pas une animation qui tourne toute seule. */}
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 2.6}
                maxPolarAngle={Math.PI / 1.9}
              />
            </Suspense>
          </Canvas>
        </div>
        <p className="aide">{t('prof.tournerAide')}</p>
      </motion.div>
    </div>,
    document.body,
  );
}
