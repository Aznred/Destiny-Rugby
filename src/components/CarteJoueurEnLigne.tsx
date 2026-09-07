import { useId, useState } from 'react';
import type { CarteCarriere } from '../lib/ligue/typesCarriere';
import { NOMS_PACK } from '../lib/presentationPacks';
import { nomPoste, POSTE_PAR_ID } from '../data/rugby';
import { photoReelle } from '../lib/avatars';
import { Drapeau } from './Drapeau';
import { useBlasonCarte } from '../lib/useBlasonCarte';
import { EcussonClub } from './EcussonClub';
import './CarteJoueurEnLigne.css';

const PALETTES = {
  bronze: ['#f1c79b', '#bb7945', '#543021', '#ffe3bd'],
  argent: ['#f2f7ff', '#a6b6c9', '#3a485e', '#fff'],
  or: ['#fff0ae', '#dcaf42', '#655022', '#fff4c7'],
  elite: ['#b6faff', '#22b9df', '#063c67', '#c9fcff'],
  star: ['#ffb9b5', '#e93450', '#520d2d', '#ffe0d2'],
};
const SILHOUETTE = 'M120 7 C107 23 83 21 65 29 L15 47 L15 282 Q15 314 57 326 Q101 338 120 351 Q139 338 183 326 Q225 314 225 282 L225 47 L175 29 C157 21 133 23 120 7Z';

export function CarteJoueurEnLigne({ carte, proprietaire, logoClub, onClick, compacte = false, etatCollection }: {
  carte: CarteCarriere; proprietaire?: string; logoClub?: string; onClick?: () => void; compacte?: boolean; etatCollection?: 'inconnue' | 'decouverte';
}) {
  const id = useId().replaceAll(':', '');
  const [photosRatees, setPhotosRatees] = useState<Set<string>>(() => new Set());
  const blason = useBlasonCarte(carte.clubReel, logoClub);
  const photoIndexee = photoReelle(carte.nom);
  // Les cartes déjà distribuées peuvent conserver une ancienne URL. Si elle
  // échoue, on retente le portrait actuellement indexé avant le repli neutre.
  const photo = [carte.photo, photoIndexee].find((candidate) => candidate && !photosRatees.has(candidate));
  const [clair, couleur, sombre, bord] = PALETTES[carte.rarete];
  const stats = Object.entries(carte.statistiques).slice(0, 6);
  const Balise = onClick ? 'button' : 'div';
  const poste = nomPoste(carte.poste).replace(/\s*\(\d+\)\s*$/, '');
  return <Balise type={onClick ? 'button' : undefined} className={`cel-carte dr-player ${carte.rarete}${compacte ? ' compacte' : ''}${etatCollection ? ` collection-${etatCollection}` : ''}`} onClick={onClick}>
    <svg className="dr-player-art" viewBox="0 0 240 360" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={clair} /><stop offset=".38" stopColor={couleur} /><stop offset=".78" stopColor={sombre} /><stop offset="1" stopColor={couleur} /></linearGradient>
        <clipPath id={`${id}-clip`}><path d={SILHOUETTE} /></clipPath>
      </defs>
      <path d={SILHOUETTE} fill={`url(#${id}-metal)`} stroke={bord} strokeWidth="2" />
      <g clipPath={`url(#${id}-clip)`}>
        <path d="M-30 245 L198 -15 L220 3 L-8 268Z M32 370 L268 56 L284 84 L69 380Z" fill={clair} opacity=".16" />
        <path d="M-4 184 L240 58 M12 310 L230 153 M80 0 L240 205 M0 74 L202 350" fill="none" stroke={bord} opacity=".2" />
        <path d="M10 215 Q120 240 230 215 L240 365 H0Z" fill={sombre} opacity=".84" />
        <path d="M25 215 Q120 233 215 215 M36 277 H204" stroke={bord} opacity=".55" fill="none" />
      </g>
      <path d={SILHOUETTE} transform="translate(6 8) scale(.95 .956)" stroke={bord} opacity=".55" fill="none" />
    </svg>
    <span className="dr-player-rating"><b>{carte.note}</b><em title={poste}>{POSTE_PAR_ID[carte.poste]?.numero} · {poste}</em><Drapeau nation={carte.nation} taille={1.15} />{blason && <EcussonClub logo={blason} nom={carte.clubReel} taille={25} />}</span>
    <span className="dr-player-photo">{photo ? <img draggable={false} src={photo} alt="" loading="lazy" onError={() => setPhotosRatees((ratees) => new Set(ratees).add(photo))} /> : <img draggable={false} src="/photos/adam_hastings.webp" alt="Portrait par défaut" />}</span>
    <span className="dr-player-identity"><strong>{carte.nom}</strong><small>{carte.clubReel}</small></span>
    <span className="dr-player-stats">{stats.map(([cle, valeur]) => <span key={cle}><b>{valeur}</b><small>{cle}</small></span>)}</span>
    <span className="dr-player-rarity">{NOMS_PACK[carte.rarete]}<i> · {carte.age} ans</i></span>
    <span className="dr-player-status">{carte.blesseJusqua && carte.blesseJusqua > new Date().toISOString() ? 'Blessé' : carte.fatigue > 55 ? 'Fatigué' : proprietaire ?? 'DESTINY RUGBY'}</span>
  </Balise>;
}
