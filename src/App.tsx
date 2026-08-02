import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';
import { Analytics } from "@vercel/analytics/next"
import { useGame } from './store/useGame';
import { Nav } from './components/Nav';
import { Garde } from './components/Garde';
import { Reglages } from './components/Reglages';
import { Accueil } from './screens/Accueil';
import { Creation } from './screens/Creation';
import { Carriere } from './screens/Carriere';
import { Profil } from './screens/Profil';
import { Boutique } from './screens/Boutique';
import { Pantheon } from './screens/Pantheon';
import { Classement } from './screens/Classement';
import { Championnats } from './screens/Championnats';
import { Effectif } from './screens/Effectif';
import { Tableau } from './screens/Tableau';
import { Social } from './screens/Social';
// La cérémonie 3D tire tout Three.js derrière elle : on ne la charge qu'au
// moment où un trophée est remporté (sinon elle alourdit le chunk principal).
const TropheeGagne = lazy(() =>
  import('./components/TropheeGagne').then((m) => ({ default: m.TropheeGagne })),
);
import { Offres } from './components/Offres';

export default function App() {
  const ecran = useGame((s) => s.ecran);
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);
  const tropheesEnAttente = useGame((s) => s.tropheesEnAttente);
  const fermerTrophee = useGame((s) => s.fermerTrophee);
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  // Nombre de trophées de la « salve » en cours, figé à l'ouverture de la file
  const [totalTrophees, setTotalTrophees] = useState(0);

  useEffect(() => {
    if (tropheesEnAttente.length > totalTrophees) {
      setTotalTrophees(tropheesEnAttente.length);
    } else if (tropheesEnAttente.length === 0 && totalTrophees !== 0) {
      setTotalTrophees(0);
    }
  }, [tropheesEnAttente.length, totalTrophees]);

  // Garde-fou : pas d'écran carrière/profil sans joueur.
  useEffect(() => {
    if (
      (ecran === 'carriere' || ecran === 'profil' || ecran === 'effectif'
        || ecran === 'tableau' || ecran === 'social') && !joueur
    ) {
      setEcran('accueil');
    }
  }, [ecran, joueur, setEcran]);

  return (
    <>
      <Nav onReglages={() => setReglagesOuverts(true)} />

      <main>
        {/* Un écran qui plante ne doit JAMAIS emporter la navigation avec lui. */}
        <Garde key={ecran} onRetour={() => setEcran('accueil')}>
        <AnimatePresence mode="wait">
          <motion.div
            key={ecran}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {ecran === 'accueil' && <Accueil />}
            {ecran === 'creation' && <Creation />}
            {ecran === 'carriere' && <Carriere onReglages={() => setReglagesOuverts(true)} />}
            {ecran === 'profil' && <Profil />}
            {ecran === 'boutique' && <Boutique />}
            {ecran === 'pantheon' && <Pantheon />}
            {ecran === 'classement' && <Classement />}
            {ecran === 'championnats' && <Championnats />}
            {ecran === 'effectif' && <Effectif />}
            {ecran === 'tableau' && <Tableau />}
            {ecran === 'social' && <Social />}
          </motion.div>
        </AnimatePresence>
        </Garde>
      </main>

      <AnimatePresence>
        {reglagesOuverts && <Reglages onFermer={() => setReglagesOuverts(false)} />}
      </AnimatePresence>

      {/* Marché des transferts : le panneau « Choix de carrière » */}
      {joueur && <Offres />}

      {/* Cérémonie : le trophée gagné s'affiche en 3D, un par un */}
      <AnimatePresence>
        {tropheesEnAttente.length > 0 && (
          <Suspense fallback={null}>
            <TropheeGagne
              key={`${tropheesEnAttente[0]}-${tropheesEnAttente.length}`}
              tropheeId={tropheesEnAttente[0]}
              index={totalTrophees - tropheesEnAttente.length + 1}
              total={totalTrophees}
              onFermer={fermerTrophee}
            />
          </Suspense>
        )}
      </AnimatePresence>
      <Analytics/>
    </>
  );
}
