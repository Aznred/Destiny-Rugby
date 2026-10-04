import { useState, type MutableRefObject } from 'react';
import { Icone } from '../Icone';
import { t } from '../../lib/i18n';
import { avatarInitiales, photoReelle } from '../../lib/avatars';
import {
  CAMERAS_3D, preferencesTele, retenirPreferencesTele, type Camera3D, type Scene3D,
} from '../../lib/match3D';
import { hommeDuMatch, type ChangementTV } from '../../lib/presentationTV';
import type { EtatMatch } from '../../lib/moteur/etat';
import type { Pion } from '../../lib/moteur/entites';
import type { Cote } from '../../lib/moteur/terrain';
import './PresentationTV.css';

// ---------------------------------------------------------------------------
// L'HABILLAGE TÉLÉVISION DU MATCH
// ---------------------------------------------------------------------------
// Tout ce qui entoure le match à l'image : commandes de la réalisation,
// cartons au tableau d'affichage, bandeau de remplacement, compositions
// d'avant-match, statistiques de mi-temps, homme du match.
//
// ⚠️ RIEN ICI NE DÉCIDE. Ces composants LISENT l'état du match. Et rien n'est
// imposé : ralentis, avant-match et son se coupent d'un bouton, et le choix est
// retenu d'un match à l'autre.

const portrait = (nom: string, club?: string) => photoReelle(nom, club) ?? avatarInitiales(nom);
/** « Antoine DUPONT » → « DUPONT » : ce qu'on lit sur un bandeau de télévision. */
const nomCourt = (nom: string) => {
  const mots = nom.trim().split(/\s+/);
  return mots.length > 1 ? mots.slice(1).join(' ') : nom;
};

// ── Les commandes de la réalisation ─────────────────────────────────────────

/** Caméra, son et ralentis : trois boutons, posés avec ceux de la vue. */
export function OutilsTele({ scene, camera, surCamera }: {
  scene: MutableRefObject<Scene3D | null>;
  /** Absent : l'écran garde sa propre commande de caméra. */
  camera?: Camera3D;
  surCamera?: (c: Camera3D) => void;
}) {
  const son = scene.current?.son ?? null;
  const [muet, setMuet] = useState(() => son?.muet ?? false);
  const [ralentis, setRalentis] = useState(() => preferencesTele().ralentis);
  const basculerSon = () => {
    const s = scene.current?.son;
    if (!s) return;
    s.muet = !s.muet;
    setMuet(s.muet);
  };
  const basculerRalentis = () => {
    const suivants = !ralentis;
    retenirPreferencesTele({ ralentis: suivants });
    if (scene.current) scene.current.television = { ralentis: suivants };
    setRalentis(suivants);
  };
  const coupe = son ? son.muet : muet;
  return (
    <>
      {camera && surCamera && (
        <button type="button"
          onClick={() => surCamera(CAMERAS_3D[(CAMERAS_3D.indexOf(camera) + 1) % CAMERAS_3D.length])}
          className={camera === 'tv' ? 'actif' : undefined}
          title={`${t('ml.camera')} · ${t(`ml.camera.${camera}`)}`}
          aria-label={`${t('ml.camera')} · ${t(`ml.camera.${camera}`)}`}>
          <Icone nom="camera" taille={17} />
        </button>
      )}
      {(!son || son.disponible) && (
        <button type="button" onClick={basculerSon} aria-pressed={!coupe}
          title={t(coupe ? 'ml.sonCoupe' : 'ml.son')} aria-label={t(coupe ? 'ml.sonCoupe' : 'ml.son')}>
          <Icone nom={coupe ? 'son-coupe' : 'son'} taille={17} />
        </button>
      )}
      <button type="button" onClick={basculerRalentis} aria-pressed={ralentis}
        className={ralentis ? undefined : 'eteint'}
        title={t(ralentis ? 'ml.ralentis' : 'ml.ralentisCoupes')}
        aria-label={t(ralentis ? 'ml.ralentis' : 'ml.ralentisCoupes')}>
        <Icone nom="ralenti" taille={17} />
      </button>
    </>
  );
}

// ── Les cartons, à côté du nom de l'équipe ──────────────────────────────────

/** Un rectangle par joueur exclu : jaune avec ses minutes restantes, rouge sans. */
export function CartonsEquipe({ pions, cote }: { pions: readonly Pion[]; cote: Cote }) {
  const exclus = pions.filter((p) => p.cote === cote && p.sanction > 0 && !p.remplace);
  if (!exclus.length) return null;
  return (
    <span className="tv-cartons">
      {exclus.map((p) => {
        const rouge = p.sanction > 3600;
        return (
          <i key={p.id} className={rouge ? 'rouge' : 'jaune'} title={p.nom}>
            {rouge ? '' : Math.max(1, Math.ceil(p.sanction / 60))}
          </i>
        );
      })}
    </span>
  );
}

// ── Le bandeau de remplacement ──────────────────────────────────────────────

/** Les remplacements que relève `changementsRecents` (`lib/presentationTV`), avec les portraits. */
export function BandeauRemplacements({ changements }: { changements: ChangementTV[] }) {
  if (!changements.length) return null;
  // Un banc entier peut entrer au même arrêt de jeu : on montre les derniers, et on compte les autres.
  const montres = changements.slice(-4);
  const reste = changements.length - montres.length;
  return (
    <div className="tv-changements" role="status">
      <b className="tv-etiquette"><Icone nom="repost" taille={14} /> {t(changements.length > 1 ? 'ml.tv.remplacements' : 'ml.tv.remplacement')}{reste > 0 && <i> +{reste}</i>}</b>
      <ul>
        {montres.map((c) => (
          <li key={c.cle} style={{ borderColor: c.couleur }}>
            <span className="tv-numero">{c.numero}</span>
            <span className="tv-joueur sort">
              <img src={portrait(c.sortant, c.club)} alt="" loading="lazy" />
              <Icone nom="chevron" taille={13} className="tv-fleche bas" />
              <em>{nomCourt(c.sortant)}{c.blesse && <Icone nom="soin" taille={12} />}</em>
            </span>
            <span className="tv-joueur entre">
              <img src={portrait(c.entrant, c.club)} alt="" loading="lazy" />
              <Icone nom="chevron" taille={13} className="tv-fleche haut" />
              <em>{nomCourt(c.entrant)}</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── L'avant-match : les compositions ────────────────────────────────────────

/** Les lignes d'un XV, telles qu'on les présente à l'écran : de la première ligne au fond du terrain. */
const LIGNES: number[][] = [[1, 2, 3], [4, 5], [6, 8, 7], [9, 10], [12, 13], [11, 15, 14]];

export function Composition({ e, cote, couleur }: { e: EtatMatch; cote: Cote; couleur: string }) {
  const club = cote === 'A' ? e.clubA : e.clubB;
  const equipe = e.pions.filter((p) => p.cote === cote);
  const titulaire = (n: number) => equipe.find((p) => (p.numeroMaillot ?? p.numero) === n && p.surLeTerrain)
    ?? equipe.find((p) => p.numero === n && p.surLeTerrain);
  const banc = equipe.filter((p) => !p.surLeTerrain).sort((a, b) => (a.numeroMaillot ?? a.numero) - (b.numeroMaillot ?? b.numero));
  return (
    <section className="tv-compo" style={{ ['--club' as string]: couleur }}>
      <header>
        <small>{t('ml.tv.compositions')}</small>
        <h3>{club}</h3>
      </header>
      <div className="tv-lignes">
        {LIGNES.map((ligne, i) => (
          <div key={i} className={`tv-ligne ${i < 3 ? 'avants' : 'arrieres'}`}>
            {ligne.map((n) => {
              const p = titulaire(n);
              return p ? (
                <figure key={n}>
                  <span className="tv-photo"><img src={portrait(p.nom, club)} alt="" loading="lazy" /><i>{n}</i></span>
                  <figcaption>{nomCourt(p.nom)}{p.capitaine && <b title="Capitaine"> (c)</b>}</figcaption>
                </figure>
              ) : null;
            })}
          </div>
        ))}
      </div>
      {banc.length > 0 && (
        <footer>
          <small>{t('ml.tv.remplacants')}</small>
          <p>{banc.map((p) => (
            <span key={p.id}><i>{p.numeroMaillot ?? p.numero}</i> {nomCourt(p.nom)}</span>
          ))}</p>
        </footer>
      )}
    </section>
  );
}

/**
 * L'avant-match, par-dessus le stade : l'affiche, puis les deux compositions
 * pendant que les équipes sortent du tunnel. L'écran hôte conduit le temps
 * (`etape`) ; ce composant ne fait que montrer, et « Passer » rend la main.
 */
export function AvantMatch({ e, etape, couleurs, competition, surPasser }: {
  e: EtatMatch;
  etape: 'affiche' | 'A' | 'B';
  couleurs: Record<Cote, string>;
  competition?: string;
  surPasser: () => void;
}) {
  return (
    <div className={`tv-avant-match etape-${etape}`}>
      {etape === 'affiche' ? (
        <div className="tv-affiche">
          <small>{competition || t('ml.tv.avantMatch')}</small>
          <h2>
            <span style={{ ['--club' as string]: couleurs.A }}>{e.clubA}</span>
            <i>—</i>
            <span style={{ ['--club' as string]: couleurs.B }}>{e.clubB}</span>
          </h2>
        </div>
      ) : (
        <Composition key={etape} e={e} cote={etape} couleur={couleurs[etape]} />
      )}
      <button type="button" className="tv-passer" onClick={surPasser}>
        {t('ml.passer')} <Icone nom="fleche-droite" taille={15} />
      </button>
    </div>
  );
}

// ── Mi-temps et fin de match ────────────────────────────────────────────────

interface TotauxEquipe {
  essais: number; plaquages: number; passes: number; metres: number; percees: number;
}
function totaux(e: EtatMatch, cote: Cote): TotauxEquipe {
  const equipe = e.pions.filter((p) => p.cote === cote);
  const somme = (lire: (p: Pion) => number) => equipe.reduce((n, p) => n + lire(p), 0);
  return {
    essais: cote === 'A' ? e.essaisA : e.essaisB,
    plaquages: somme((p) => p.stats.plaquages),
    passes: somme((p) => p.stats.passes),
    metres: Math.round(somme((p) => p.stats.metres)),
    percees: somme((p) => p.stats.franchissements),
  };
}

export function HommeDuMatch({ e }: { e: EtatMatch }) {
  const p = hommeDuMatch(e);
  if (!p) return null;
  const club = p.cote === 'A' ? e.clubA : e.clubB;
  const faits = [
    p.stats.essais > 0 && `${p.stats.essais} ${t('ml.tv.essais').toLowerCase()}`,
    p.stats.plaquages > 0 && `${p.stats.plaquages} ${t('ml.tv.plaquages').toLowerCase()}`,
    p.stats.metres > 0 && `${Math.round(p.stats.metres)} m`,
    p.stats.franchissements > 0 && `${p.stats.franchissements} ${t('ml.tv.percees').toLowerCase()}`,
  ].filter(Boolean).slice(0, 3);
  return (
    <aside className="tv-homme">
      <img src={portrait(p.nom, club)} alt="" loading="lazy" />
      <div>
        <small><Icone nom="medaille" taille={13} /> {t('ml.tv.hommeDuMatch')}</small>
        <b>{p.nom}</b>
        <span>{club} · n° {p.numeroMaillot ?? p.numero}{faits.length > 0 && ` · ${faits.join(' · ')}`}</span>
      </div>
    </aside>
  );
}

/** Les chiffres de la première période, face à face. */
export function PanneauMiTemps({ e, couleurs }: { e: EtatMatch; couleurs: Record<Cote, string> }) {
  const a = totaux(e, 'A');
  const b = totaux(e, 'B');
  const temps = e.compteurs.tempsA + e.compteurs.tempsB;
  const possessionA = temps > 0 ? Math.round((e.compteurs.tempsA / temps) * 100) : 50;
  const lignes: [string, number, number, string?][] = [
    [t('ml.tv.possession'), possessionA, 100 - possessionA, ' %'],
    [t('ml.tv.essais'), a.essais, b.essais],
    [t('ml.tv.metres'), a.metres, b.metres],
    [t('ml.tv.percees'), a.percees, b.percees],
    [t('ml.tv.passes'), a.passes, b.passes],
    [t('ml.tv.plaquages'), a.plaquages, b.plaquages],
  ];
  return (
    <div className="tv-mi-temps" role="status">
      <header>
        <small>{t('ml.tv.miTemps')}</small>
        <p>
          <span style={{ ['--club' as string]: couleurs.A }}>{e.clubA}</span>
          <b>{e.scoreA} – {e.scoreB}</b>
          <span style={{ ['--club' as string]: couleurs.B }}>{e.clubB}</span>
        </p>
      </header>
      <ul>
        {lignes.map(([nom, va, vb, unite]) => {
          const total = va + vb;
          const part = total > 0 ? (va / total) * 100 : 50;
          return (
            <li key={nom}>
              <b>{va}{unite}</b>
              <span>
                <em>{nom}</em>
                <i><u style={{ width: `${part}%`, background: couleurs.A }} /><u style={{ width: `${100 - part}%`, background: couleurs.B }} /></i>
              </span>
              <b>{vb}{unite}</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
