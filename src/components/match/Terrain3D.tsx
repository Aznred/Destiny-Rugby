import { useEffect, useRef, useState, type ReactNode } from 'react';
import { appareilLeger, creerScene3D, type OptionsScene3D, type Scene3D } from '../../lib/match3D';
import { t } from '../../lib/i18n';
import './Terrain3D.css';

/**
 * LE TERRAIN EN TROIS DIMENSIONS.
 *
 * Ce composant ne fait que MONTER la scène dans son cadre et la rendre à
 * l'écran qui l'héberge (`surPrete`). C'est cet écran qui la nourrit, image par
 * image : il possède déjà la boucle du match, ses pauses et ses décisions, et
 * une seconde boucle ici ne pourrait que se désaccorder de la première.
 *
 * ⚠️ LES OPTIONS SONT LUES UNE FOIS, AU MONTAGE. Les tenues, les écussons et
 * les apparences sont peints sur des textures à la création de la scène ; un
 * match ne change pas de maillot en cours de route.
 */
export function Terrain3D({
  options, surPrete, surEchec, enfants,
}: {
  options: OptionsScene3D;
  surPrete: (scene: Scene3D | null) => void;
  /** Chargement impossible (WebGL refusé, fichier absent) : l'écran revient à son terrain plat. */
  surEchec?: (erreur: unknown) => void;
  /** Calques posés par-dessus la scène, dans le même cadre. */
  enfants?: ReactNode;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const [prete, setPrete] = useState(false);
  // Les rappels changent à chaque rendu de l'hôte : la scène, elle, ne se remonte pas.
  const rappels = useRef({ options, surPrete, surEchec });
  rappels.current = { options, surPrete, surEchec };

  useEffect(() => {
    const noeud = cadre.current;
    if (!noeud) return;
    let annule = false;
    let scene: Scene3D | null = null;
    creerScene3D(noeud, {
      leger: appareilLeger(),
      // Le navigateur a repris la mémoire graphique en plein match (iOS quand elle manque) :
      // l'hôte revient au terrain vu de haut au lieu de laisser une image noire.
      surPerte: () => { if (!annule) rappels.current.surEchec?.(new Error('Contexte WebGL perdu')); },
      ...rappels.current.options,
    })
      .then((creee) => {
        if (annule) { creee.detruire(); return; }
        scene = creee;
        // En développement, la scène reste accessible depuis la console pour les vérifications.
        if (import.meta.env.DEV) (window as unknown as { __scene3D?: Scene3D }).__scene3D = creee;
        setPrete(true);
        rappels.current.surPrete(creee);
      })
      .catch((erreur: unknown) => {
        if (!annule) rappels.current.surEchec?.(erreur);
      });
    return () => {
      annule = true;
      rappels.current.surPrete(null);
      scene?.detruire();
    };
  }, []);

  return (
    <div className="terrain-3d" aria-label={t('ml.terrain')}>
      {/* La toile de la scène vit dans son propre cadre : React n'y pose jamais rien. */}
      <div className="terrain-3d-toile" ref={cadre} />
      {!prete && (
        <div className="terrain-3d-attente" role="status">
          <span className="terrain-3d-ballon" aria-hidden />
          <b>{t('ml.stade3D')}</b>
        </div>
      )}
      {enfants}
    </div>
  );
}
