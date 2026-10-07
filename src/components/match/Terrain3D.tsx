import { useEffect, useRef, useState, type ReactNode } from 'react';
import { creerScene3D, detruireScene, type OptionsScene3D, type Scene3D } from '../../lib/match3D';
import { t } from '../../lib/i18n';
import { profileurActif } from '../../lib/profileur';
import { profilAppareil, retenirMesure } from '../../lib/profilAppareil';
import { Profileur } from './Profileur';
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
  options, surPrete, surEchec, enfants, pret = true,
}: {
  options: OptionsScene3D;
  /**
   * Les options sont-elles définitives ? Faux tant que l'écran lit encore les couleurs des écussons : la scène attend
   * (quatre secondes au plus — un écusson qui ne répond pas ne retient pas le match).
   */
  pret?: boolean;
  surPrete: (scene: Scene3D | null) => void;
  /** Chargement impossible (WebGL refusé, fichier absent) : l'écran revient à son terrain plat. */
  surEchec?: (erreur: unknown) => void;
  /** Calques posés par-dessus la scène, dans le même cadre. */
  enfants?: ReactNode;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const [prete, setPrete] = useState(false);
  // Le profileur du Labo (Correctif 25) : un calque de mesures, seulement si CET appareil l'a allumé.
  const [mesuree, setMesuree] = useState<Scene3D | null>(null);
  // Les rappels changent à chaque rendu de l'hôte : la scène, elle, ne se remonte pas.
  const rappels = useRef({ options, surPrete, surEchec });
  rappels.current = { options, surPrete, surEchec };
  const [patience, setPatience] = useState(true);
  useEffect(() => {
    const minuteur = window.setTimeout(() => setPatience(false), 4000);
    return () => window.clearTimeout(minuteur);
  }, []);
  const partir = pret || !patience;

  useEffect(() => {
    const noeud = cadre.current;
    if (!noeud || !partir) return;
    let annule = false;
    let scene: Scene3D | null = null;
    creerScene3D(noeud, {
      leger: profilAppareil().leger,
      // Un appareil qui a fini son dernier match à trente images par seconde y commence celui-ci (Correctif 25).
      profil: profilAppareil().profil,
      // Le navigateur a repris la mémoire graphique en plein match (iOS quand elle manque) :
      // l'hôte revient au terrain vu de haut au lieu de laisser une image noire.
      surPerte: () => { if (!annule) rappels.current.surEchec?.(new Error('Contexte WebGL perdu')); },
      ...rappels.current.options,
    })
      .then((creee) => {
        if (annule) { void detruireScene(creee); return; }
        scene = creee;
        // En développement, la scène reste accessible depuis la console pour les vérifications.
        if (import.meta.env.DEV) (window as unknown as { __scene3D?: Scene3D }).__scene3D = creee;
        setPrete(true);
        if (profileurActif()) setMesuree(creee);
        rappels.current.surPrete(creee);
      })
      .catch((erreur: unknown) => {
        if (!annule) rappels.current.surEchec?.(erreur);
      });
    return () => {
      annule = true;
      setMesuree(null);
      // Ce que l'appareil a tenu sur ce match : le profil du suivant, et un compteur anonyme pour le Labo.
      try { retenirMesure(scene?.mesures?.()); } catch { /* une mesure ne retient jamais le démontage */ }
      rappels.current.surPrete(null);
      // ⚠️ PAR TRANCHES (Correctif 26) : ce démontage tombe dans l'image du coup de sifflet final.
      void detruireScene(scene);
    };
  }, [partir]);

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
      {mesuree && <Profileur scene={mesuree} />}
      {enfants}
    </div>
  );
}
