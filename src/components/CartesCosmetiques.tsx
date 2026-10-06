// LES PIÈCES COMMUNES DE LA BOUTIQUE ET DE LA PERSONNALISATION (Correctif 21)
//   PastilleRarete — commun / rare / épique / légendaire ;
//   PrixBoutons   — « 260 Ovas » et/ou « 52 Crédits » : une icône par monnaie, un bouton par monnaie acceptée.
//   MiniatureArticle — la vignette 3D d'un article, quelle que soit sa catégorie.

import { devisesAcceptees, montantEn, type Devise, type PrixArticle } from '../lib/monnaies';
import type { ArticleEquipement } from '../data/boutique';
import { nombre, t } from '../lib/i18n';
import { PieceOvas } from './PieceOvas';
import { PieceCredits } from './PieceCredits';
import { IconeArticle } from './ModeleObjet';

const LIBELLES_RARETE = { commun: 'bo.rarete.commun', rare: 'bo.rarete.rare', epique: 'bo.rarete.epique', legendaire: 'bo.rarete.legendaire' } as const;
export function PastilleRarete({ rarete }: { rarete?: keyof typeof LIBELLES_RARETE }) {
  if (!rarete) return null;
  return <span className={`pastille-rarete rarete-${rarete}`}>{t(LIBELLES_RARETE[rarete])}</span>;
}

/** L'icône de la monnaie, à la taille d'un bouton. */
export const IconeMonnaie = ({ d, taille = 16 }: { d: Devise; taille?: number }) => (d === 'ovas' ? <PieceOvas taille={taille} /> : <PieceCredits taille={taille} />);

/**
 * Un bouton par monnaie acceptée. Il n'est JAMAIS grisé pour un solde insuffisant : un clic ouvre la fenêtre qui dit combien il manque
 * (`demanderPaiement`) — griser sans rien dire laisserait le joueur sans sortie.
 */
export function PrixBoutons({ prix, onAcheter, petit = true }: { prix: PrixArticle; onAcheter: (d: Devise) => void; petit?: boolean }) {
  const acceptees = devisesAcceptees(prix);
  return (
    <div className="prix-boutons">
      {acceptees.map((d) => (
        <button key={d} type="button" className={`btn ${d === 'credits' ? 'prix-credits' : 'prix-ovas'}${petit ? ' petit' : ''}`}
          onClick={(e) => { e.stopPropagation(); onAcheter(d); }}
          aria-label={t('bo.acheterPour', { n: nombre(montantEn(prix, d)!), monnaie: d === 'ovas' ? 'Ovas' : t('mo.credits') })}>
          <IconeMonnaie d={d} /> {nombre(montantEn(prix, d)!)}
        </button>
      ))}
      {acceptees.length === 2 && <span className="prix-ou">{t('bo.ou')}</span>}
    </div>
  );
}

/**
 * La vignette d'un article : toujours le VRAI modèle 3D rendu hors écran (`IconeArticle`). Un kit d'équipe est le maillot du jeu —
 * `/m3d/maillot.glb` ou le modèle du club —, teinté à ses couleurs : le même modèle que les autres maillots de la boutique.
 */
export function MiniatureArticle({ a }: { a: ArticleEquipement }) {
  if (a.glb) return <IconeArticle url={a.glb} teinte={a.teinte} emoji={a.emoji} />;
  return <div className="miniature miniature-emoji" aria-hidden>{a.emoji}</div>;
}
