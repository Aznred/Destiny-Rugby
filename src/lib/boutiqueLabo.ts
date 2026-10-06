// LES COSMÉTIQUES DU LABO, CÔTÉ JOUEUR (Correctif 21)
//
// Ils arrivent avec le catalogue solo (`synchroniserCatalogueSolo`, relu au plus une fois par minute) : AUCUNE requête de plus. Ce hook ouvre
// cette synchronisation à l'entrée de la boutique ou de la personnalisation, et fait redessiner l'écran quand de nouveaux articles arrivent.
import { useEffect, useState } from 'react';
import { synchroniserCatalogueSolo } from './catalogueSoloCommun';

export function useBoutiqueLabo(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    void synchroniserCatalogueSolo();
    const relire = () => setVersion((n) => n + 1);
    window.addEventListener('destiny-boutique-labo', relire);
    return () => window.removeEventListener('destiny-boutique-labo', relire);
  }, []);
  return version;
}
