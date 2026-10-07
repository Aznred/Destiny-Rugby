import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { photoReelle } from '../../lib/avatars';
import { t } from '../../lib/i18n';
import { Icone } from '../Icone';
import { nomPoste, POSTES } from '../../data/rugby';
import { sourceEcusson } from '../../lib/ecussons';
import {
  DUREE_EQUIPE_TV, DUREE_LIGNE_TV, LIGNES_TV, logoTV, PALETTE_TV, PALETTE_TOP14, siglesTV, tempsTV, texteSurCouleur,
  type EquipeTV, type ExclusionTV, type IdentiteTV, type JoueurTV, type PaletteTV,
} from '../../lib/habillageTV';
import type { MarqueurTV, PhraseTV, VentTV } from '../../lib/statsTV';
import './HabillageTV.css';

const palettes = new Map<string, Partial<PaletteTV>>();
const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);
/** Le nom du poste dans la langue du jeu, d'après le numéro du maillot. */
function nomDuPoste(numero: number): string | undefined {
  const poste = POSTES.find(v => v.numero === numero);
  return poste ? nomPoste(poste.id).replace(/\s*\(\d+\)\s*$/, '') : undefined;
}
const SANS_PHOTO = '/photos/silhouette.webp';
/**
 * ⚠️ SANS PHOTO, LA SILHOUETTE GRISE DES CARTES — jamais un autre visage. Le
 * portrait vient d'abord de la carte du joueur quand l'hôte la connaît ; une
 * carte sans photo (`null`) ne se cherche PAS par le nom, qui ramènerait le
 * portrait d'un homonyme. Une image qui ne charge pas retombe sur la même
 * silhouette.
 */
function PortraitTV({ joueur, club }: { joueur?: JoueurTV; club: string }) {
  const photo = !joueur ? undefined : joueur.photo === null ? undefined : joueur.photo ?? photoReelle(joueur.nom, club);
  const [ratee, setRatee] = useState<string>();
  const vide = !photo || photo === ratee;
  return <img className={vide ? 'btv-sans-photo' : undefined} src={vide ? SANS_PHOTO : photo} alt="" onError={() => setRatee(photo)} />;
}
function usePalette(identite: IdentiteTV) {
  const src = logoTV(identite.logo);
  const [extraite, setExtraite] = useState<{ src: string; palette: Partial<PaletteTV> }>();
  useEffect(() => {
    let actif = true;
    if (palettes.has(src) || src === '/favicon.svg') return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!actif) return;
      try {
        const toile = document.createElement('canvas');
        toile.width = toile.height = 32;
        const ctx = toile.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 32, 32);
        const pixels = ctx.getImageData(0, 0, 32, 32).data;
        const frequences = new Map<string, number>();
        for (let i = 0; i < pixels.length; i += 4) {
          const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
          if (pixels[i + 3] < 180 || Math.max(...rgb) - Math.min(...rgb) < 30) continue;
          const hex = '#' + rgb.map(v => Math.min(255, Math.round(v / 32) * 32).toString(16).padStart(2, '0')).join('');
          frequences.set(hex, (frequences.get(hex) ?? 0) + 1);
        }
        const couleur = [...frequences].sort((a, b) => b[1] - a[1])[0]?.[0];
        const palette = couleur ? { principale: couleur, accent: couleur, texte: texteSurCouleur(couleur) } : {};
        palettes.set(src, palette);
        setExtraite({ src, palette });
      } catch { /* Un logo distant sans CORS conserve la palette de secours. */ }
    };
    img.src = src;
    return () => { actif = false; };
  }, [src]);
  return { ...PALETTE_TV, ...(palettes.get(src) ?? (extraite?.src === src ? extraite.palette : {})),
    ...(src === '/logos-competitions/top14.webp' ? PALETTE_TOP14 : {}), ...identite.couleurs };
}

export function LogoLigueTV({ identite }: { identite: IdentiteTV }) {
  return <span className="btv-logo"><img key={identite.logo} src={logoTV(identite.logo)} alt={identite.nom || 'Destiny Rugby'}
    onError={e => { if (!e.currentTarget.src.endsWith('/favicon.svg')) e.currentTarget.src = '/favicon.svg'; }} /></span>;
}
function EcussonTV({ equipe }: { equipe: EquipeTV }) {
  return equipe.logo ? <img className="btv-ecusson" src={sourceEcusson(equipe.logo) ?? equipe.logo} alt=""
    onError={e => { e.currentTarget.style.visibility = 'hidden'; }} /> : null;
}
function SanctionsTV({ exclusions, seconde, cote }: { exclusions: ExclusionTV[]; seconde: number; cote: 'A' | 'B' }) {
  // Sous le score : les exclusions temporaires, réduites à leur compte à rebours.
  const actives = exclusions.filter(p => p.cote === cote && p.type === 'jaune' && (p.retour ?? 0) > seconde);
  return <div className="btv-exclusions">{actives.map(p => <span key={p.id} className="btv-exclusion jaune"
    title={`${p.numero} — ${p.nom} · ${t('tv.cartonJaune')}`}
    aria-label={`${p.nom}, ${t('tv.cartonJaune')}, ${t('tv.retourDans', { temps: tempsTV(Math.ceil((p.retour ?? 0) - seconde)) })}`}>
    <time>{tempsTV(Math.ceil((p.retour ?? 0) - seconde))}</time>
  </span>)}</div>;
}
/**
 * Au-dessus du score, comme à la télévision : à gauche un petit carré rouge
 * portant le nombre d'exclus définitifs (il reste jusqu'à la fin du match), à
 * droite l'onglet des essais marqués.
 */
function DessusTV({ exclusions, cote, essais }: { exclusions: ExclusionTV[]; cote: 'A' | 'B'; essais?: number }) {
  const rouges = exclusions.filter(p => p.cote === cote && p.type === 'rouge');
  if (!rouges.length && !essais) return null;
  return <div className="btv-dessus">
    {rouges.length > 0 && <b className="btv-rouge" title={rouges.map(p => `${p.numero} — ${p.nom}`).join(', ')}
      aria-label={`${t('tv.cartonRouge')} × ${rouges.length}`}>{rouges.length}</b>}
    {!!essais && <span className="btv-essais" aria-label={t('tv.essais', { n: essais })}>{essais}{t('tv.essaiAbrege')}</span>}
  </div>;
}
export function ScoreTV({ identite, equipes, seconde, exclusions = [], phase, termine, periode = 1 }: {
  identite: IdentiteTV; equipes: [EquipeTV, EquipeTV]; seconde: number; exclusions?: ExclusionTV[]; phase?: string; termine?: boolean; periode?: number;
}) {
  // Le temps additionnel : au-delà de la 40e en première période, de la 80e en seconde.
  // Prolongation : deux périodes de dix minutes après la 80e (le chrono continue : 80:00 → 90:00 → 100:00).
  const finPeriode = periode <= 2 ? periode * 2400 : 4800 + (periode - 2) * 600;
  const additionnel = !termine && phase !== 'miTemps' && seconde >= finPeriode;
  const sigles = siglesTV(equipes[0].nom, equipes[1].nom);
  return <div className="btv-score" aria-label={`${equipes[0].nom} ${equipes[0].score}, ${equipes[1].nom} ${equipes[1].score}, ${tempsTV(seconde)}`}>
    <div className="btv-marque"><LogoLigueTV identite={identite} /><time className={additionnel ? 'sirene' : ''}>{tempsTV(seconde)}</time>
      {(phase === 'miTemps' || termine || periode > 2) && <small>{t(termine ? 'tv.fin' : periode > 2 ? 'tv.prolongation' : 'tv.miTemps')}</small>}</div>
    {equipes.map((e, i) => <div className="btv-score-camp" key={i}>
      <DessusTV exclusions={exclusions} cote={i === 0 ? 'A' : 'B'} essais={e.essais} />
      <div className="btv-score-equipe" title={e.nom} style={{ background: e.couleur, color: e.texte ?? texteSurCouleur(e.couleur), ...(e.lisere ? { boxShadow: `inset 0 -4px 0 ${e.lisere}` } : {}) }}>
        <abbr title={e.nom}>{sigles[i]}</abbr><strong>{e.score}</strong>
      </div>
      <SanctionsTV exclusions={exclusions} seconde={seconde} cote={i === 0 ? 'A' : 'B'} />
    </div>)}
  </div>;
}
export function AfficheTV({ identite, equipes, periode = 1, avant = false }: {
  identite: IdentiteTV; equipes: [EquipeTV, EquipeTV]; periode?: number; avant?: boolean;
}) {
  return <div className="btv-affiche" role="status">
    <div className="btv-affiche-etiquette">{periode > 2 ? t('tv.prolongation') : periode === 2 ? t('tv.deuxiemeMiTemps') : identite.journee ? <>{t('tv.journee')} <b>{identite.journee}</b></> : avant ? t('tv.avantMatch') : t('tv.coupEnvoi')}</div>
    <div className="btv-affiche-corps">
      <div className="btv-affiche-equipe" style={{ background: equipes[0].couleur, color: equipes[0].texte ?? texteSurCouleur(equipes[0].couleur) }}>
        <EcussonTV equipe={equipes[0]} /><strong>{equipes[0].nom}</strong>{periode >= 2 && <b>{equipes[0].score}</b>}
      </div>
      <LogoLigueTV identite={identite} />
      <div className="btv-affiche-equipe droite" style={{ background: equipes[1].couleur, color: equipes[1].texte ?? texteSurCouleur(equipes[1].couleur) }}>
        {periode === 2 && <b>{equipes[1].score}</b>}<strong>{equipes[1].nom}</strong><EcussonTV equipe={equipes[1]} />
      </div>
    </div>
    <small className="btv-affiche-ligue">{identite.nom || 'Destiny Rugby'}</small>
  </div>;
}
export function CompositionTV({ identite, equipe, joueurs, ligne }: {
  identite: IdentiteTV; equipe: EquipeTV; joueurs: JoueurTV[]; ligne: number;
}) {
  const rang = LIGNES_TV[Math.min(LIGNES_TV.length - 1, Math.max(0, ligne))];
  return <section className="btv-composition" aria-label={`${t('tv.composition')} ${equipe.nom}`}>
    <header style={{ background: equipe.couleur, color: equipe.texte ?? texteSurCouleur(equipe.couleur) }}>
      <LogoLigueTV identite={identite} /><div><small>{t('tv.xvDeDepart')}</small><h3>{equipe.nom}</h3></div><EcussonTV equipe={equipe} />
    </header>
    <div className="btv-composition-ligne"><b>{t(rang.cle)}</b><span>{ligne + 1} / {LIGNES_TV.length}</span></div>
    <div className="btv-portraits" key={`${equipe.nom}-${ligne}`}>
      {rang.numeros.map(numero => {
        const p = joueurs.find(p => p.numero === numero);
        return <figure key={p?.id ?? numero}>
          <div className="btv-portrait"><PortraitTV joueur={p} club={equipe.nom} /><b>{numero}</b></div>
          <figcaption><strong>{p?.nom ?? t('tv.joueurInconnu')}{p?.capitaine ? ' (C)' : ''}</strong>
            <small>{nomDuPoste(numero) ?? p?.poste}</small></figcaption>
        </figure>;
      })}
    </div>
    <footer>{identite.nom || 'Destiny Rugby'}<span>{t('tv.composition')}</span></footer>
  </section>;
}
export function CartonTV({ identite, joueur, motif }: { identite: IdentiteTV; joueur: ExclusionTV; motif?: string }) {
  return <aside className={`btv-carton ${joueur.type}`} role="status">
    <LogoLigueTV identite={identite} /><i className="btv-grande-carte" aria-hidden="true" />
    <div><small>{t(joueur.type === 'jaune' ? 'tv.cartonJaune' : 'tv.cartonRouge')}</small><strong>{joueur.numero} — {joueur.nom}</strong>
      {/* Le motif de l'arbitre d'abord ; la durée de l'exclusion le suit. */}
      <span>{[motif || joueur.motif, t(joueur.type === 'jaune' ? 'tv.exclusionTemporaire' : 'tv.exclusionDefinitive')].filter((texte): texte is string => !!texte).map(majuscule).join(' · ')}</span></div>
  </aside>;
}

/** Après l'essai : le marqueur, son portrait, son poste, et la statistique qu'un réalisateur glisserait dessous. */
export interface MarqueurAffiche extends MarqueurTV { club: string; photo?: string | null; stat?: PhraseTV }
export function BandeauMarqueurTV({ identite, marqueur }: { identite: IdentiteTV; marqueur: MarqueurAffiche }) {
  return <aside className="btv-carton btv-marqueur" role="status">
    <LogoLigueTV identite={identite} />
    <div className="btv-portrait"><PortraitTV joueur={marqueur} club={marqueur.club} /><b>{marqueur.numero}</b></div>
    <div><small>{t('tv.essai')} · {marqueur.club}</small><strong>{marqueur.nom}</strong>
      <span>{[nomDuPoste(marqueur.numero) ?? marqueur.poste, marqueur.stat ? t(marqueur.stat.cle, marqueur.stat.vars) : undefined]
        .filter((texte): texte is string => !!texte).join(' · ')}</span></div>
  </aside>;
}

/** Une petite information de retransmission, glissée pendant le jeu. */
export function BulleStatTV({ phrase }: { phrase: PhraseTV }) {
  return <aside className="btv-bulle" role="status"><i aria-hidden="true" /><span>{t(phrase.cle, phrase.vars)}</span></aside>;
}

/** Le vent devant un tir posé : la flèche est vue par le buteur, poteaux en haut. */
export function VentTVPastille({ vent }: { vent: VentTV }) {
  return <aside className="btv-vent" role="status" aria-label={`${t('tv.vent')} ${t('tv.kmh', { n: vent.kmh })}`}>
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ transform: `rotate(${vent.angle}rad)` }}>
      <path d="M12 3 L12 21 M12 3 L6.5 9 M12 3 L17.5 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <div><small>{t('tv.vent')}</small><strong>{t('tv.kmh', { n: vent.kmh })}</strong></div>
  </aside>;
}

/** Ce que l'arbitre vient de siffler (pénalité, en-avant, passe en avant) : même bandeau qu'un carton, sans le carton. */
export interface SiffletTV { cle: string; club: string; fautif?: string; motif?: string }
export function BandeauSiffletTV({ identite, sifflet }: { identite: IdentiteTV; sifflet: SiffletTV }) {
  return <aside className="btv-carton sifflet" role="status">
    <LogoLigueTV identite={identite} /><i className="btv-coup-sifflet" aria-hidden="true"><Icone nom="sifflet" taille={22} /></i>
    <div><small>{t(sifflet.cle)}</small><strong>{t('ml.sifflet.pour', { club: sifflet.club })}</strong>
      {(sifflet.motif || sifflet.fautif) && <span>{[sifflet.motif, sifflet.fautif].filter((texte): texte is string => !!texte).map(majuscule).join(' · ')}</span>}</div>
  </aside>;
}

/** La même couche TV pour le moteur local et le film du direct en ligne. */
export function HabillageTV({ identite = {}, equipes, seconde, periode = 1, phase, exclusions, joueurs = [],
  presentation, surPasser, termine = false, motifCarton, pause = false, sifflet, marqueur, bulle, vent }: {
  /** Le marqueur de l'essai en cours de célébration, la bulle du moment, le vent devant un tir (`lib/statsTV.ts`). */
  marqueur?: MarqueurAffiche | null; bulle?: PhraseTV | null; vent?: VentTV | null;
  /** Le coup de sifflet en cours, tel que le moteur le porte ; un carton a son propre bandeau. */
  sifflet?: (SiffletTV & { restant?: number }) | null;
  identite?: IdentiteTV; equipes: [EquipeTV, EquipeTV]; seconde: number; periode?: number; phase?: string;
  exclusions?: ExclusionTV[]; joueurs?: JoueurTV[]; presentation?: number; surPasser?: () => void;
  termine?: boolean; motifCarton?: string; pause?: boolean;
}) {
  const palette = usePalette(identite);
  const style = { ...Object.fromEntries(Object.entries(palette).map(([k, v]) => [`--tv-${k}`, v])),
    '--tv-accent-texte': texteSurCouleur(palette.accent) } as CSSProperties;
  const precedents = useRef<Set<string> | null>(null);
  const [cartons, setCartons] = useState<ExclusionTV[]>([]);
  useEffect(() => {
    if (!exclusions) return;
    // Une arrivée tardive dans le direct ne doit pas réannoncer les anciens cartons.
    const nouveaux = precedents.current ? exclusions.filter(p => !precedents.current!.has(`${p.id}:${p.type}`)) : [];
    precedents.current = new Set(exclusions.map(p => `${p.id}:${p.type}`));
    if (nouveaux.length) setCartons(file => [...file, ...nouveaux]);
  }, [exclusions]); // Les secondes restantes ne redéclenchent pas le bandeau.
  const carton = cartons[0];
  useEffect(() => {
    if (!carton || pause) return;
    const timer = window.setTimeout(() => setCartons(file => file.slice(1)), 5500);
    return () => window.clearTimeout(timer);
  }, [carton, pause]);
  // Un coup de sifflet s'annonce une fois, quand il arrive : la clé ne change pas tant qu'il dure.
  const cleSifflet = sifflet && !sifflet.cle.includes('carton') && !sifflet.cle.includes('tmo')
    ? `${sifflet.cle}|${sifflet.club}|${sifflet.fautif ?? ''}` : null;
  const [annonce, setAnnonce] = useState<SiffletTV | null>(null);
  const dernierSifflet = useRef<SiffletTV | null>(null);
  if (cleSifflet && sifflet) dernierSifflet.current = { cle: sifflet.cle, club: sifflet.club, fautif: sifflet.fautif, motif: sifflet.motif };
  useEffect(() => {
    if (cleSifflet) setAnnonce(dernierSifflet.current);
  }, [cleSifflet]);
  useEffect(() => {
    if (!annonce || pause) return;
    const timer = window.setTimeout(() => setAnnonce(null), 4200);
    return () => window.clearTimeout(timer);
  }, [annonce, pause]);
  const dernierPeriode = useRef(periode);
  const repriseAttendue = useRef(false);
  const enPresentation = presentation !== undefined;
  const [bandeau, setBandeau] = useState<number | null>(null);
  const periodesVues = useRef(new Set<number>());
  useEffect(() => {
    if (phase === 'miTemps' || dernierPeriode.current !== periode) repriseAttendue.current = true;
    dernierPeriode.current = periode;
    const debut = phase === 'coupEnvoi' && (periode === 1 ? seconde < 2 : seconde < 2410 || repriseAttendue.current);
    if (enPresentation || termine || !debut || periodesVues.current.has(periode)) return;
    periodesVues.current.add(periode);
    repriseAttendue.current = false;
    setBandeau(periode);
  }, [phase, periode, seconde, enPresentation, termine]);
  useEffect(() => {
    if (bandeau === null || pause) return;
    const timer = window.setTimeout(() => setBandeau(null), 6500);
    return () => window.clearTimeout(timer);
  }, [bandeau, pause]);
  // Le marqueur reste à l'image six secondes, même si la célébration est plus courte.
  const [marqueurVu, setMarqueurVu] = useState<MarqueurAffiche | null>(null);
  const cleMarqueur = marqueur ? `${marqueur.id}:${marqueur.essaisDuMatch}` : null;
  const dernierMarqueur = useRef<MarqueurAffiche | null>(null);
  if (marqueur) dernierMarqueur.current = marqueur;
  useEffect(() => { if (cleMarqueur) setMarqueurVu(dernierMarqueur.current); }, [cleMarqueur]);
  useEffect(() => {
    if (!marqueurVu || pause) return;
    const timer = window.setTimeout(() => setMarqueurVu(null), 6000);
    return () => window.clearTimeout(timer);
  }, [marqueurVu, pause]);
  // Une bulle : six secondes, et jamais par-dessus un bandeau.
  const [bulleVue, setBulleVue] = useState<PhraseTV | null>(null);
  const cleBulle = bulle ? `${bulle.cle}|${Object.values(bulle.vars).join('|')}` : null;
  const derniereBulle = useRef<PhraseTV | null>(null);
  if (bulle) derniereBulle.current = bulle;
  useEffect(() => { if (cleBulle) setBulleVue(derniereBulle.current); }, [cleBulle]);
  useEffect(() => {
    if (!bulleVue || pause) return;
    const timer = window.setTimeout(() => setBulleVue(null), 6500);
    return () => window.clearTimeout(timer);
  }, [bulleVue, pause]);
  const etape = presentation === undefined ? null : presentation < 3 ? 'affiche' : presentation < 3 + DUREE_EQUIPE_TV ? 'A' : 'B';
  const cote = etape === 'B' ? 'B' : 'A';
  const compo = useMemo(() => joueurs.filter(p => p.cote === cote), [joueurs, cote]);
  const ligne = Math.min(6, Math.floor(Math.max(0, (presentation ?? 0) - 3 - (cote === 'B' ? DUREE_EQUIPE_TV : 0)) / DUREE_LIGNE_TV));
  return <div className="btv" style={style}>
    <ScoreTV identite={identite} equipes={equipes} seconde={seconde} exclusions={exclusions} phase={phase} termine={termine} periode={periode} />
    {carton ? <CartonTV key={`${carton.id}:${carton.type}`} identite={identite} joueur={carton} motif={motifCarton} />
      : etape === 'affiche' ? <AfficheTV identite={identite} equipes={equipes} avant />
      : etape ? <CompositionTV identite={identite} equipe={equipes[cote === 'A' ? 0 : 1]} joueurs={compo} ligne={ligne} />
      : bandeau !== null ? <AfficheTV identite={identite} equipes={equipes} periode={bandeau} />
      : marqueurVu ? <BandeauMarqueurTV key={`${marqueurVu.id}:${marqueurVu.essaisDuMatch}`} identite={identite} marqueur={marqueurVu} />
      : annonce ? <BandeauSiffletTV key={`${annonce.cle}|${annonce.club}|${annonce.fautif ?? ''}`} identite={identite} sifflet={annonce} />
      : bulleVue && !etape && <BulleStatTV key={`${bulleVue.cle}|${Object.values(bulleVue.vars).join('|')}`} phrase={bulleVue} />}
    {vent && !etape && !carton && <VentTVPastille vent={vent} />}
    {etape && surPasser && <button className="btv-passer" onClick={surPasser}>{t('tv.passer')} <span aria-hidden="true">→</span></button>}
  </div>;
}
