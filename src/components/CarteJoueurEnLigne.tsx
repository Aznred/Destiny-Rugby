import { useId, useState } from 'react';
import type { CarteCarriere } from '../lib/ligue/typesCarriere';
import { nomRaretePack } from '../lib/presentationPacks';
import { locale, t } from '../lib/i18n';
import { nomPoste, POSTE_PAR_ID } from '../data/rugby';
import { photoReelle } from '../lib/avatars';
import { formatTempsBlessure, formatTempsBlessureDetaille } from '../lib/carteJoueur';
import { Drapeau } from './Drapeau';
import { useBlasonCarte } from '../lib/useBlasonCarte';
import { EcussonClub } from './EcussonClub';
import { Blason } from './Blason';
import { clubParNom } from '../data/clubs';
import { logoChampionnat } from '../lib/logoChampionnat';
import { nomFamilleSpeciale } from '../lib/ligue/cartesSpeciales';
import { EmblemeSpecial } from './EmblemesSpeciaux';
import './CarteJoueurEnLigne.css';

const PALETTES = {
  bronze: ['#f1c79b', '#bb7945', '#543021', '#ffe3bd'],
  argent: ['#f2f7ff', '#a6b6c9', '#3a485e', '#fff'],
  or: ['#fff0ae', '#dcaf42', '#655022', '#fff4c7'],
  elite: ['#b6faff', '#22b9df', '#063c67', '#c9fcff'],
  star: ['#ffb9b5', '#e93450', '#520d2d', '#ffe0d2'],
};
const SILHOUETTE = 'M120 7 C107 23 83 21 65 29 L15 47 L15 282 Q15 314 57 326 Q101 338 120 351 Q139 338 183 326 Q225 314 225 282 L225 47 L175 29 C157 21 133 23 120 7Z';

/**
 * LE JOUEUR SANS PORTRAIT GARDE LA SILHOUETTE GRISE — c'est le repli voulu.
 *
 * ⚠️ MAIS ELLE A SON PROPRE FICHIER, ET C'EST TOUT LE BUG. Le repli pointait
 * sur `/photos/adam_hastings.webp`, qui n'était pas le portrait d'Adam
 * Hastings : c'était cette silhouette-là, enregistrée 181 fois sous 181 noms de
 * joueurs par l'aspirateur de portraits (voir `scripts/nettoyerPhotos.cjs`).
 * Indexée comme un vrai visage, elle passait AVANT la photo réelle rangée dans
 * `photos/maj/`. Un seul exemplaire subsiste donc, sous un nom qui ne
 * revendique personne, et il ne sert que quand on n'a vraiment rien.
 */
const SANS_PHOTO = '/photos/silhouette.webp';

// ═══════════════════════════════════════════════════════════════════════════
// LES CARTES SPÉCIALES
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ PAS UNE RECOLORATION. Une ICON n'est pas une carte Or plus claire : c'est
// un ivoire de Hall of Fame, un double filet d'or, un bandeau noir gravé, une
// trame guillochée et un grain de papier. Une Halloween n'est pas une Mythique
// assombrie : anthracite, citrouilles grises dans le fond, toile d'araignée,
// filet orange qui luit. Les deux gardent la MÊME géométrie que les autres
// cartes (portrait, colonne de note, bandeau du nom) : elles se rangent dans
// les mêmes grilles, les mêmes packs, sur le même terrain.

/** Les rayons guillochés d'une ICON, partant du haut du blason. */
const RAYONS_ICON = Array.from({ length: 23 }, (_, i) => {
  const a = (-100 + i * 9) * Math.PI / 180;
  return `M120 26 L${(120 + Math.cos(a) * 330).toFixed(1)} ${(26 - Math.sin(a) * 330).toFixed(1)}`;
}).join(' ');

/** Les citrouilles grises semées dans le fond d'une carte Halloween : x, y, taille, angle. */
const CITROUILLES_FOND: readonly [number, number, number, number][] = [
  [18, 30, 30, -12], [176, 18, 22, 10], [196, 116, 34, 6], [24, 150, 26, 14], [150, 168, 20, -8],
  [70, 92, 16, 20], [206, 196, 18, -16], [98, 20, 14, 4], [40, 238, 22, 8], [180, 262, 26, -6],
];

function ArtIcon({ id }: { id: string }) {
  return <svg className="dr-player-art" viewBox="0 0 240 360" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-ivoire`} x1="0" y1="0" x2=".55" y2="1"><stop stopColor="#fffbf1" /><stop offset=".5" stopColor="#f4e9d0" /><stop offset="1" stopColor="#e2d1aa" /></linearGradient>
      <linearGradient id={`${id}-or`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff2bd" /><stop offset=".32" stopColor="#d8aa45" /><stop offset=".62" stopColor="#8d661c" /><stop offset="1" stopColor="#f0cc6e" /></linearGradient>
      <pattern id={`${id}-trame`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><path d="M0 3.5 H7" stroke="#a9853c" strokeWidth=".4" opacity=".28" /></pattern>
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="11" /><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .4  0 0 0 0 .24  0 0 0 .13 0" /></filter>
      <clipPath id={`${id}-clip`}><path d={SILHOUETTE} /></clipPath>
    </defs>
    <path d={SILHOUETTE} fill={`url(#${id}-ivoire)`} />
    <g clipPath={`url(#${id}-clip)`}>
      <rect width="240" height="360" fill={`url(#${id}-trame)`} />
      <rect width="240" height="360" filter={`url(#${id}-grain)`} />
      <path d={RAYONS_ICON} stroke="#b9913f" strokeWidth=".6" opacity=".22" fill="none" />
      <circle cx="120" cy="26" r="62" fill="none" stroke="#b9913f" strokeWidth=".7" opacity=".3" />
      <circle cx="120" cy="26" r="96" fill="none" stroke="#b9913f" strokeWidth=".5" opacity=".22" />
      <text x="229" y="96" transform="rotate(90 229 96)" className="dr-icon-filigrane">ICON · HALL OF FAME</text>
      <path d="M8 213 Q120 238 232 213 L240 365 H0Z" fill="#15110c" />
      <path d="M8 213 Q120 238 232 213" stroke={`url(#${id}-or)`} strokeWidth="2.4" fill="none" />
      <path d="M20 223 Q120 245 220 223" stroke={`url(#${id}-or)`} strokeWidth=".7" fill="none" opacity=".75" />
      <path d="M44 276 H196" stroke={`url(#${id}-or)`} strokeWidth=".7" opacity=".55" />
      <path d="M120 270 l4 6 l-4 6 l-4 -6 Z" fill={`url(#${id}-or)`} />
    </g>
    <path d={SILHOUETTE} fill="none" stroke={`url(#${id}-or)`} strokeWidth="4.2" />
    <path d={SILHOUETTE} transform="translate(7 9) scale(.942 .95)" stroke="#15110c" strokeWidth="1.3" fill="none" opacity=".8" />
    <path d={SILHOUETTE} transform="translate(10.5 13.5) scale(.913 .925)" stroke={`url(#${id}-or)`} strokeWidth=".9" fill="none" />
    <path d="M120 3 l5 7 l-5 7 l-5 -7 Z" fill={`url(#${id}-or)`} stroke="#15110c" strokeWidth=".6" />
  </svg>;
}

function ArtHalloween({ id }: { id: string }) {
  return <svg className="dr-player-art" viewBox="0 0 240 360" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-nuit`} x1="0" y1="0" x2=".45" y2="1"><stop stopColor="#3a3a41" /><stop offset=".45" stopColor="#1c1c21" /><stop offset="1" stopColor="#0a0a0c" /></linearGradient>
      <linearGradient id={`${id}-orange`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffd08a" /><stop offset=".38" stopColor="#ff8a1c" /><stop offset=".7" stopColor="#b44a06" /><stop offset="1" stopColor="#ffa242" /></linearGradient>
      <radialGradient id={`${id}-lueur`} cx="50%" cy="22%" r="58%"><stop stopColor="#ff8a1c" stopOpacity=".26" /><stop offset="1" stopColor="#ff8a1c" stopOpacity="0" /></radialGradient>
      <filter id={`${id}-halo`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.2" /></filter>
      <symbol id={`${id}-citrouille`} viewBox="0 0 20 20"><ellipse cx="6.4" cy="12" rx="5" ry="6" /><ellipse cx="13.6" cy="12" rx="5" ry="6" /><ellipse cx="10" cy="12" rx="5" ry="6.8" /><path d="M9.2 5.4 C9 3.6 9.8 2.4 11.4 1.8 L12 2.8 C11 3.3 10.6 4.1 10.8 5.4 Z" /></symbol>
      <clipPath id={`${id}-clip`}><path d={SILHOUETTE} /></clipPath>
    </defs>
    <path d={SILHOUETTE} fill={`url(#${id}-nuit)`} />
    <g clipPath={`url(#${id}-clip)`}>
      <rect width="240" height="360" fill={`url(#${id}-lueur)`} />
      {CITROUILLES_FOND.map(([x, y, taille, angle], i) => <use key={i} href={`#${id}-citrouille`} x={x} y={y} width={taille} height={taille}
        transform={`rotate(${angle} ${x + taille / 2} ${y + taille / 2})`} fill="#8b8b93" opacity={i % 3 === 0 ? .2 : .13} />)}
      <g stroke="#a3a3ab" strokeWidth=".7" fill="none" opacity=".22">
        <path d="M232 8 L150 30 M232 8 L178 70 M232 8 L214 92 M232 8 L232 110" />
        <path d="M206 15 Q212 30 218 34 Q224 38 232 40 M182 22 Q194 46 206 58 Q218 68 232 72 M164 26 Q178 58 196 80 Q214 98 232 100" />
      </g>
      <path d="M8 213 Q120 238 232 213 L240 365 H0Z" fill="#09090b" opacity=".93" />
      <path d="M8 213 Q120 238 232 213" stroke={`url(#${id}-orange)`} strokeWidth="2.2" fill="none" />
      <path d="M44 276 H196" stroke="#ff8a1c" strokeWidth=".7" opacity=".5" />
    </g>
    <path d={SILHOUETTE} fill="none" stroke="#ff7a00" strokeWidth="6" opacity=".55" filter={`url(#${id}-halo)`} />
    <path d={SILHOUETTE} fill="none" stroke={`url(#${id}-orange)`} strokeWidth="3.4" />
    <path d={SILHOUETTE} transform="translate(8 11) scale(.933 .94)" stroke="#ff8a1c" strokeWidth=".9" fill="none" opacity=".55" />
  </svg>;
}

function ArtInfluenceur({ id }: { id: string }) {
  return <svg className="dr-player-art" viewBox="0 0 240 360" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-live`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#6227b9" /><stop offset=".4" stopColor="#21113f" /><stop offset="1" stopColor="#080711" /></linearGradient>
      <linearGradient id={`${id}-neon`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e2c0ff" /><stop offset=".35" stopColor="#a669ff" /><stop offset=".7" stopColor="#ff314e" /><stop offset="1" stopColor="#cba4ff" /></linearGradient>
      <pattern id={`${id}-scan`} width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 1 H6" stroke="#b878ff" strokeWidth=".5" opacity=".2" /></pattern>
      <clipPath id={`${id}-clip`}><path d={SILHOUETTE} /></clipPath>
    </defs>
    <path d={SILHOUETTE} fill={`url(#${id}-live)`} />
    <g clipPath={`url(#${id}-clip)`}>
      <rect width="240" height="360" fill={`url(#${id}-scan)`} />
      <path d="M-35 238 L217 -14 H252 L-3 278Z" fill="#9146ff" opacity=".22" />
      <path d="M145 -15 L240 95 M132 -15 L240 108 M170 130 L260 220" stroke="#ff314e" strokeWidth="3" opacity=".5" />
      <g stroke="#ba83ff" fill="none" opacity=".5"><path d="M83 48 H151 M83 48 V73 M192 151 V185 H168" strokeWidth="1.5" /><rect x="156" y="67" width="48" height="30" rx="7" /><path d="M175 76 L188 82 L175 89Z" fill="#ba83ff" /></g>
      <g fill="#f4deff"><circle cx="108" cy="71" r="2" /><circle cx="206" cy="116" r="2" /><path d="M159 30 h7 M162.5 26.5 v7" stroke="#f4deff" /></g>
      <rect x="159" y="42" width="47" height="16" rx="4" fill="#ff314e" /><circle cx="166" cy="50" r="2" fill="#fff" /><text x="173" y="53" fill="#fff" fontSize="8" fontWeight="800" letterSpacing="1">LIVE</text>
      <path d="M8 213 Q120 238 232 213 L240 365 H0Z" fill="#0b0819" opacity=".95" />
      <path d="M8 213 Q120 238 232 213 M44 276 H196" stroke={`url(#${id}-neon)`} strokeWidth="2" fill="none" />
      <path d="M23 285 V307 H42 M217 285 V307 H198" stroke="#ff314e" strokeWidth="1.5" fill="none" />
    </g>
    <path d={SILHOUETTE} fill="none" stroke={`url(#${id}-neon)`} strokeWidth="4" />
    <path d={SILHOUETTE} transform="translate(8 11) scale(.933 .94)" stroke="#c899ff" strokeWidth="1" fill="none" opacity=".6" />
  </svg>;
}

export function CarteJoueurEnLigne({ carte, proprietaire, logoClub, onClick, compacte = false, etatCollection }: {
  carte: CarteCarriere; proprietaire?: string; logoClub?: string; onClick?: () => void; compacte?: boolean; etatCollection?: 'inconnue' | 'decouverte';
}) {
  const id = useId().replaceAll(':', '');
  const [photosRatees, setPhotosRatees] = useState<Set<string>>(() => new Set());
  const blason = useBlasonCarte(carte.clubReel, logoClub);
  const competition = logoChampionnat(carte.championnat);
  // ⚠️ UNE CARTE SPÉCIALE N'EMPRUNTE JAMAIS LE PORTRAIT ORDINAIRE DU JOUEUR :
  // une Halloween de Dupont avec sa photo de club ne serait qu'un faux.
  const photoIndexee = carte.speciale ? undefined : photoReelle(carte.nom, carte.clubReel);
  // Les cartes déjà distribuées peuvent conserver une ancienne URL. Si elle
  // échoue, on retente le portrait actuellement indexé avant le repli neutre.
  const photo = [carte.photo, photoIndexee].find((candidate) => candidate && !photosRatees.has(candidate));
  const [clair, couleur, sombre, bord] = PALETTES[carte.rarete];
  const speciale = carte.speciale;
  const design = speciale?.type === 'influencer' ? 'influencer' : speciale?.type === 'halloween' ? 'halloween' : speciale ? 'icon' : null;
  const stats = Object.entries(carte.statistiques).slice(0, 6);
  const Balise = onClick ? 'button' : 'div';
  const poste = nomPoste(carte.poste).replace(/\s*\(\d+\)\s*$/, '');
  const seconds = (carte.postesSecondaires ?? [])
    .filter((p) => p !== carte.poste)
    .map((p) => ({ numero: POSTE_PAR_ID[p]?.numero, nom: nomPoste(p).replace(/\s*\(\d+\)\s*$/, '') }))
    .filter((p) => p.numero !== undefined);
  return <Balise type={onClick ? 'button' : undefined} className={`cel-carte dr-player ${carte.rarete}${design ? ` speciale design-${design}` : ''}${compacte ? ' compacte' : ''}${etatCollection ? ` collection-${etatCollection}` : ''}`} onClick={onClick}>
    {design === 'influencer' ? <ArtInfluenceur id={id} /> : design === 'icon' ? <ArtIcon id={id} /> : design === 'halloween' ? <ArtHalloween id={id} /> : <svg className="dr-player-art" viewBox="0 0 240 360" aria-hidden="true">
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
    </svg>}
    {/* ⚠️ LE CHAMPIONNAT SOUS L'ÉCUSSON, ET SEULEMENT S'IL EN A UN VRAI. La
        colonne de gauche disait déjà la note, le poste, la nation et le club :
        il manquait l'étage où le joueur évolue, la seule information qui
        explique pourquoi deux cartes de même note ne valent pas pareil. On
        n'affiche RIEN quand le championnat n'a pas de logo — le repli en ballon
        générique de `LogoCompet` se lirait ici comme un blason de compétition
        que personne ne reconnaîtrait. */}
    <span className="dr-player-rating"><b>{carte.note}</b><em title={poste}><span>{POSTE_PAR_ID[carte.poste]?.numero} · {poste}</span>{seconds.length > 0 && <small title={t('online.card.secondPositions', { positions: seconds.map((p) => p.nom).join(', ') })}>2e : {seconds.map((p) => p.numero).join(' / ')}</small>}</em><Drapeau nation={carte.nation} taille={1.15} />{
      // ⚠️ UNE CARTE SPÉCIALE N'AFFICHE PAS SA LIGUE : son emblème en tient
      // lieu (ICON, citrouille). Un joueur actif garde l'écusson de son club.
      speciale ? <>{!speciale.retraite && blason && <EcussonClub logo={blason} nom={carte.clubReel} taille={25} />}<span className="dr-player-embleme" title={nomFamilleSpeciale(speciale.type)}><EmblemeSpecial logo={speciale.logo} /></span></>
      : <>{blason ? <EcussonClub logo={blason} nom={carte.clubReel} taille={25} /> : <span className="dr-player-blason-fallback"><Blason club={clubParNom(carte.clubReel) ?? { nom: carte.clubReel, c1: '#0a2a6b', c2: '#c1121f' }} taille={25} /></span>}{competition && <img className="dr-player-compet" src={competition} alt="" title={carte.championnat} loading="lazy" decoding="async" draggable={false} />}</>}</span>
    <span className="dr-player-photo">{photo ? <img draggable={false} src={photo} alt="" loading="lazy" onError={() => setPhotosRatees((ratees) => new Set(ratees).add(photo))} /> : <img draggable={false} src={SANS_PHOTO} alt={t('online.card.defaultPortrait')} />}</span>
    <span className="dr-player-identity"><strong>{carte.nom}</strong><small>{speciale?.retraite ? carte.nation : carte.clubReel || (speciale?.type === 'influencer' ? 'Creator / Influencer' : '')}</small></span>
    <span className="dr-player-stats">{stats.map(([cle, valeur]) => <span key={cle}><b>{valeur}</b><small>{cle}</small></span>)}</span>
    {speciale
      ? <span className="dr-player-rarity dr-player-famille">{nomFamilleSpeciale(speciale.type)}<i> · {speciale.retraite ? t('special.legend') : `${carte.age} ${t('compo.ans')}`}</i></span>
      : <span className="dr-player-rarity">{nomRaretePack(carte.rarete)}<i> · {carte.age} {t('compo.ans')}</i></span>}
    {(() => {
      const estBlesse = Boolean(carte.blesseJusqua && carte.blesseJusqua > new Date().toISOString());
      const tempsRestant = estBlesse && carte.blesseJusqua ? formatTempsBlessure(carte.blesseJusqua) : '';
      const dateFin = estBlesse && carte.blesseJusqua ? new Date(carte.blesseJusqua).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      const bulle = estBlesse && carte.blesseJusqua ? t('online.infirmary.injuredUntilTooltip', { date: dateFin, time: formatTempsBlessureDetaille(carte.blesseJusqua) }) : undefined;
      return (
        <span
          className={`dr-player-status${estBlesse ? ' dr-player-status-blesse' : ''}`}
          title={bulle}
        >
          {estBlesse ? `🚑 ${t('compo.badge.blesse')} (${tempsRestant})` : carte.fatigue > 55 ? t('compo.badge.fatigue') : proprietaire ?? t("ui.5d32d136eb83")}
        </span>
      );
    })()}
  </Balise>;
}
