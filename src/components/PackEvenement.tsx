import type { CSSProperties } from 'react';
import type { PackCarriere } from '../lib/ligue/typesCarriere';
import { nomFamilleSpeciale } from '../lib/ligue/cartesSpeciales';
import { locale, nombre, t } from '../lib/i18n';
import { Citrouille, EmblemeIcon } from './EmblemesSpeciaux';
import { PieceOvas } from './PieceOvas';
import './PackEvenement.css';

/**
 * LE PACK D'ÉVÉNEMENT, À PART DU PRÉSENTOIR.
 *
 * ⚠️ IL NE TOURNE PAS DANS LA COURONNE 3D. Les pochettes du présentoir sont des
 * modèles par rareté : le pack Halloween y aurait pris la couleur de l'Or, et
 * rien n'aurait dit qu'il disparaît à la fin du mois. Il a donc sa vitrine :
 * la matière de ses cartes, sa date de fin, sa garantie et ses chances écrites.
 */
export function PackEvenement({ pack, solde, occupe, onOuvrir }: {
  pack: PackCarriere; solde: number; occupe: boolean; onOuvrir: (id: string, nom: string) => void;
}) {
  const type = pack.evenement?.type ?? 'icon';
  const famille = nomFamilleSpeciale(type);
  // `au` est l'instant où l'événement se ferme (minuit) : on affiche la veille.
  const dernierJour = pack.evenement?.au ? new Date(Date.parse(pack.evenement.au) - 1) : null;
  const chances = Object.entries(pack.speciales ?? {}).filter(([, chance]) => chance > 0);
  const manque = Math.max(0, pack.prix - solde);
  return <section className={`pack-evenement theme-${type === 'halloween' ? 'halloween' : 'icon'}`} style={{ '--pe-cartes': pack.cartes } as CSSProperties} aria-label={pack.nom}>
    <div className="pe-decor" aria-hidden="true">{type === 'halloween' ? [0, 1, 2, 3, 4].map(i => <Citrouille key={i} taille={34 + (i % 3) * 14} className={`pe-citrouille pe-citrouille-${i}`} />) : null}</div>
    <div className="pe-pochette" aria-hidden="true">
      <span className="pe-pochette-bord" />
      {type === 'halloween' ? <Citrouille taille={74} /> : <EmblemeIcon taille={74} />}
      <b>{famille}</b>
      <small>{t('online.shop.cards', { n: pack.cartes })}</small>
    </div>
    <div className="pe-texte">
      <div className="eyebrow">{t('special.shop.event')}{dernierJour ? ` · ${t('special.shop.until', { date: dernierJour.toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) })}` : ''}</div>
      <h3>{t('special.shop.packName', { name: pack.nom })}</h3>
      {pack.promesse && <p>{pack.promesse}</p>}
      <ul className="pe-garanties">
        {pack.garantieSpeciale && <li>{t('special.shop.guaranteed', { name: famille })}</li>}
        {chances.map(([id, chance]) => <li key={id}>{t('special.shop.perCard', { name: id === pack.evenement?.id ? famille : id === 'icons' ? 'ICON' : id, n: nombre(chance) })}</li>)}
      </ul>
      <div className="pe-action">
        <button type="button" className="btn primaire" disabled={occupe || manque > 0} onClick={() => onOuvrir(pack.id, pack.nom)}>
          <PieceOvas taille={18} />{t('special.shop.open', { price: nombre(pack.prix) })}
        </button>
        {manque > 0 && <small role="status">{t('special.shop.missing', { n: nombre(manque) })}</small>}
      </div>
    </div>
  </section>;
}
