// LE MATCH EN DIRECT — vue 2D de dessus, 30 pions, 80 minutes
//
// L'écran ne raconte plus un score : il AFFICHE le moteur (lib/moteur/) qui
// joue vraiment le match. Les pions se placent en pods, la défense monte en
// ligne, le ballon circule, les plaquages naissent d'une collision.
//
// ÉCHELLE DE TEMPS VARIABLE : l'action se joue à ×5, les temps morts défilent
// à ×50 — un match tient en ~8 minutes réelles à ×1, dont l'essentiel en ballon
// vivant. Le rendu tourne au rythme de `requestAnimationFrame` (60 fps), la
// simulation avance par pas de 0,2 s de jeu : le mouvement reste fluide sans
// que la physique dépende du framerate.
//
// ⚠️ `createPortal(document.body)` obligatoire : le `backdrop-filter` des
// `.carte` crée un bloc conteneur qui piège les `position: fixed`.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  appliquerConsigne, avancer, bilan, creerMatch, type Commentaire, type EtatMatch,
} from '../lib/moteur/moteur';
import { LARGEUR, LONGUEUR } from '../lib/moteur/terrain';
import { CONSIGNE_NEUTRE, lireConsigneGroq, lireConsigneLocale } from '../lib/moteur/consignes';
import type { Pion } from '../lib/moteur/entites';
import { graine, type MatchChampionnat } from '../lib/championnat';
import { effectifDuClub } from '../lib/effectif';
import { clubParNom } from '../data/clubs';
import { CLE_ENV } from '../lib/groq';
import { useGame } from '../store/useGame';
import { Blason } from './Blason';
import type { Joueur } from '../types';

// ⚠️ L'ÉCHELLE DE TEMPS EST VARIABLE, et c'est ce qui rend le direct regardable.
//
// Faire défiler 80 minutes en 10 minutes réelles, c'est ×8 : les pions filent
// à 60 m/s à l'écran, ça saute et on ne voit rien. Mais un match ne contient
// que ~35 minutes de BALLON EN JEU — le reste, ce sont des mêlées qui se
// forment, des touches qui s'alignent, des transformations.
//
// On joue donc l'action à ×5 (on suit les courses sans que ça saute) et on
// ACCÉLÈRE les temps morts ×10. Résultat : ~8 minutes de match, dont presque
// tout en ballon vivant.
const VITESSES = [
  { label: '×1', facteur: 3 },
  { label: '×2', facteur: 6 },
  { label: '×4', facteur: 12 },
  { label: '⏭️', facteur: 400 },
];
// Multiplicateur appliqué pendant les arrêts de jeu : on ne regarde pas une
// mêlée se former pendant 45 secondes.
const ACCELERATION_TEMPS_MORT = 45;
const PHASES_MORTES = new Set(['melee', 'touche', 'apresEssai', 'tirAuBut', 'miTemps', 'coupEnvoi', 'ruck']);

function couleursDe(nom: string): [string, string] {
  const club = clubParNom(nom);
  if (club) return [club.c1, club.c2];
  const rng = graine('coul#' + nom);
  return [`hsl(${Math.floor(rng() * 360)} 62% 42%)`, '#ffffff'];
}

const EMOJI: Record<Commentaire['type'], string> = {
  essai: '🏉', but: '🎯', butRate: '❌', plaquage: '💥', ruck: '🔒', melee: '🌀',
  touche: '🙌', maul: '🚂', pied: '🦶', penalite: '⚖️', carton: '🟨',
  remplacement: '🔄', jalon: '🔔', jeu: '⚡',
};

export function MatchLive({
  match, saison, cle, titre, onFermer, joueur,
}: {
  match: MatchChampionnat;
  saison: number;
  cle: string;
  titre: string;
  onFermer: () => void;
  joueur?: Joueur | null;
}) {
  const groqKey = useGame((s) => s.groqKey);
  const modele = useGame((s) => s.modele);
  const enregistrerMatchVecu = useGame((s) => s.enregistrerMatchVecu);

  // Le moteur vit dans une ref : c'est un objet muté 5 fois par seconde de jeu,
  // le passer par l'état de React ferait 300 rendus par seconde.
  const moteur = useRef<EtatMatch>(null as unknown as EtatMatch);
  if (!moteur.current) {
    moteur.current = creerMatch(
      match.domicile, match.exterieur,
      effectifDuClub(match.domicile, saison), effectifDuClub(match.exterieur, saison),
      match.scoreD, match.scoreE, cle,
      joueur && (joueur.club === match.domicile || joueur.club === match.exterieur)
        ? { club: joueur.club, nom: joueur.nom, poste: joueur.poste, attributs: joueur.attributs }
        : undefined,
    );
  }
  const e = moteur.current;

  // Ce que l'affichage relit à chaque image. On ne stocke qu'un compteur : le
  // rendu lit ensuite directement l'état du moteur.
  const [, redessiner] = useState(0);
  const [enPause, setEnPause] = useState(false);
  const [vitesse, setVitesse] = useState(0);
  const [consigneTexte, setConsigneTexte] = useState('');
  const [envoiConsigne, setEnvoiConsigne] = useState(false);
  const filRef = useRef<HTMLDivElement>(null);
  const dernierTemps = useRef<number>(0);

  // --- LA BOUCLE DE RENDU ---------------------------------------------------
  useEffect(() => {
    let brut = 0;
    let actif = true;
    const image = (ms: number) => {
      if (!actif) return;
      brut = requestAnimationFrame(image);
      const precedent = dernierTemps.current || ms;
      dernierTemps.current = ms;
      if (enPause || e.fini) { redessiner((n) => n + 1); return; }
      // Le delta réel est plafonné : revenir sur l'onglet ne doit pas faire
      // avancer le match de trois minutes d'un coup.
      const dtReel = Math.min(0.25, (ms - precedent) / 1000);
      const mort = PHASES_MORTES.has(e.phase);
      const facteur = VITESSES[vitesse].facteur * (mort && vitesse < 3 ? ACCELERATION_TEMPS_MORT : 1);
      avancer(e, dtReel * facteur);
      redessiner((n) => n + 1);
    };
    brut = requestAnimationFrame(image);
    return () => { actif = false; cancelAnimationFrame(brut); };
  }, [enPause, vitesse, e]);

  useEffect(() => {
    filRef.current?.scrollTo({ top: filRef.current.scrollHeight });
  }, [e.commentaires.length]);

  useEffect(() => {
    const clavier = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onFermer();
      if (ev.key === ' ' && (ev.target as HTMLElement)?.tagName !== 'INPUT') {
        ev.preventDefault();
        setEnPause((p) => !p);
      }
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [onFermer]);

  // --- LE COACHING EN DIRECT ------------------------------------------------
  const envoyerConsigne = async () => {
    const t = consigneTexte.trim();
    if (!t) return;
    setConsigneTexte('');
    setEnvoiConsigne(true);
    // Réponse immédiate par mots-clés, puis affinage par l'IA si une clé existe.
    appliquerConsigne(e, lireConsigneLocale(t));
    const cleIA = groqKey || CLE_ENV;
    if (cleIA) {
      try {
        const fine = await lireConsigneGroq(t, cleIA, modele,
          `${e.clubA} ${e.scoreA} – ${e.scoreB} ${e.clubB}, ${e.minute}e minute.`);
        appliquerConsigne(e, fine);
      } catch {
        // On garde la lecture locale : le coaching marche toujours hors ligne.
      }
    }
    setEnvoiConsigne(false);
  };

  const [couleurA] = couleursDe(e.clubA);
  const [couleurB] = couleursDe(e.clubB);
  const clubA = clubParNom(e.clubA);
  const clubB = clubParNom(e.clubB);
  const surLeTerrain = e.pions.filter((p) => p.surLeTerrain);
  const monPion = e.pions.find((p) => p.moi);
  const stats = useMemo(() => (e.fini ? bilan(e) : null), [e.fini, e]);

  // ⚠️ À LA SIRÈNE, LES VRAIES STATS DE TON JOUEUR PARTENT DANS LA SAISON.
  // Elles alimentent ensuite le classement des joueurs (écran Résultats) : ce
  // ne sont plus des chiffres estimés, ce sont ceux du match qu'on vient de
  // regarder. L'action se protège elle-même contre le double comptage.
  const dejaEnregistre = useRef(false);
  useEffect(() => {
    if (!e.fini || dejaEnregistre.current || !monPion) return;
    dejaEnregistre.current = true;
    enregistrerMatchVecu({
      essais: monPion.stats.essais,
      plaquages: monPion.stats.plaquages,
      plaquagesManques: monPion.stats.plaquagesManques,
      passes: monPion.stats.passes,
      metres: Math.round(monPion.stats.metres),
      grattages: monPion.stats.grattages,
      butsTentes: monPion.stats.butsTentes,
      butsReussis: monPion.stats.butsReussis,
      cartons: monPion.stats.cartons,
      minutes: Math.round(monPion.minutesJouees),
    });
  }, [e.fini, monPion, enregistrerMatchVecu]);

  const pion = (p: Pion) => {
    const x = (p.pos.x / LONGUEUR) * LONGUEUR;
    const y = (p.pos.y / LARGEUR) * LARGEUR;
    return (
      <g key={p.id} className={`ml-pion${p.moi ? ' moi' : ''}`} transform={`translate(${x} ${y})`}>
        {p.moi && <circle r="1.9" className="ml-aura" />}
        <circle
          r="0.85"
          fill={p.cote === 'A' ? couleurA : couleurB}
          stroke={p.moi ? '#ffd45e' : p.cote === 'A' ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.6)'}
          strokeWidth={p.moi ? 0.3 : 0.16}
        />
        <text y="0.34" textAnchor="middle" fontSize="1.05" fill="#fff" fontWeight="700">
          {p.numero}
        </text>
      </g>
    );
  };

  return createPortal(
    <div className="overlay-match" onClick={(ev) => { if (ev.target === ev.currentTarget) onFermer(); }}>
      <motion.div
        className="match-live"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <header className="ml-tete">
          <div className="ml-equipe">
            {clubA && <Blason club={clubA} taille={30} />}
            <b>{e.clubA}</b>
          </div>
          <div className="ml-score">
            <span>{e.scoreA}</span>
            <i>
              {e.minute}′{e.sirene && <em className="ml-sirene"> +</em>}
            </i>
            <span>{e.scoreB}</span>
          </div>
          <div className="ml-equipe droite">
            <b>{e.clubB}</b>
            {clubB && <Blason club={clubB} taille={30} />}
          </div>
          <button className="ml-fermer" onClick={onFermer} title="Fermer (Échap)">✕</button>
        </header>
        <div className="ml-sous-titre">
          {titre}
          {e.phase !== 'jeuCourant' && e.phase !== 'fini' && (
            <span className="ml-phase"> · {LIBELLE_PHASE[e.phase] ?? e.phase}</span>
          )}
        </div>

        {/* ---------- LE TERRAIN, AUX PROPORTIONS RÉELLES ---------- */}
        <svg className="ml-terrain" viewBox={`0 0 ${LONGUEUR} ${LARGEUR}`} aria-label="terrain">
          <defs>
            <linearGradient id="ml-pelouse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1a5232" />
              <stop offset="1" stopColor="#0f3a22" />
            </linearGradient>
          </defs>
          <rect width={LONGUEUR} height={LARGEUR} fill="url(#ml-pelouse)" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="0" y={(i * LARGEUR) / 8} width={LONGUEUR} height={LARGEUR / 8}
              fill={i % 2 ? 'rgba(255,255,255,.04)' : 'transparent'} />
          ))}
          <rect x="0" y="0" width="11" height={LARGEUR} fill="rgba(0,0,0,.3)" />
          <rect x={LONGUEUR - 11} y="0" width="11" height={LARGEUR} fill="rgba(0,0,0,.3)" />
          {[11, 33, 61, 89, LONGUEUR - 11].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2={LARGEUR}
              stroke="rgba(255,255,255,.55)" strokeWidth={x === 61 ? 0.5 : 0.4} />
          ))}
          {[51, 71].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2={LARGEUR} stroke="rgba(255,255,255,.3)"
              strokeWidth="0.3" strokeDasharray="1.6 2.4" />
          ))}
          <rect x="0.2" y="0.2" width={LONGUEUR - 0.4} height={LARGEUR - 0.4}
            fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="0.35" />
          {[5, 15, LARGEUR - 15, LARGEUR - 5].map((y) => (
            <line key={y} x1="11" y1={y} x2={LONGUEUR - 11} y2={y} stroke="rgba(255,255,255,.16)"
              strokeWidth="0.22" strokeDasharray="1 4" />
          ))}
          {[11, LONGUEUR - 11].map((x) => (
            <g key={x} stroke="#f5f5f5" strokeWidth="0.6" fill="none">
              <line x1={x} y1={LARGEUR / 2 - 2.8} x2={x} y2={LARGEUR / 2 - 9} />
              <line x1={x} y1={LARGEUR / 2 + 2.8} x2={x} y2={LARGEUR / 2 + 9} />
              <line x1={x} y1={LARGEUR / 2 - 2.8} x2={x} y2={LARGEUR / 2 + 2.8} strokeWidth="0.8" />
            </g>
          ))}
          {surLeTerrain.filter((p) => p.cote === 'B').map(pion)}
          {surLeTerrain.filter((p) => p.cote === 'A').map(pion)}
          <ellipse className="ml-ballon" cx={e.ballon.x} cy={e.ballon.y}
            rx="0.85" ry="0.58" fill="#f4e3c0" stroke="#3a2410" strokeWidth="0.28" />
        </svg>

        {/* ---------- COMMANDES ---------- */}
        <div className="ml-commandes">
          <button className="btn fantome" onClick={() => setEnPause((p) => !p)} disabled={e.fini}>
            {enPause ? '▶️ Reprendre' : '⏸️ Pause'}
          </button>
          <div className="ml-vitesses">
            {VITESSES.map((v, i) => (
              <button
                key={v.label}
                className={`ml-vitesse${vitesse === i ? ' actif' : ''}`}
                onClick={() => setVitesse(i)}
                title={i === VITESSES.length - 1 ? 'Aller à la fin' : `Vitesse ${v.label}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="ml-progression">
            <span style={{ width: `${Math.min(100, (e.t / 4800) * 100)}%` }} />
          </div>
          {monPion && (
            <span className="ml-endurance" title="Endurance de ton joueur">
              🫁 {Math.round(monPion.endurance)}%
            </span>
          )}
          {e.fini && <button className="btn vert" onClick={onFermer}>Terminer</button>}
        </div>

        {/* ---------- COACHING EN DIRECT ---------- */}
        {monPion && !e.fini && (
          <div className="ml-coaching">
            <input
              value={consigneTexte}
              placeholder="Consigne à ton joueur — « défends plus bas », « propose-toi au ras du ruck »…"
              onChange={(ev) => setConsigneTexte(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === 'Enter') void envoyerConsigne(); }}
              maxLength={120}
            />
            <button className="x-poster" disabled={!consigneTexte.trim() || envoiConsigne}
              onClick={() => void envoyerConsigne()}>
              {envoiConsigne ? '…' : '📣 Transmettre'}
            </button>
            {e.consigne && e.consigne !== CONSIGNE_NEUTRE && (
              <span className="ml-consigne">{e.consigne.libelle}</span>
            )}
          </div>
        )}

        {/* ---------- COMMENTAIRE / BILAN ---------- */}
        {e.fini && stats ? (
          <div className="ml-fil">
            <div className="ml-bilan-tete">📋 Feuille de match</div>
            {[...stats.parJoueur]
              .sort((a, b) => b.stats.metres - a.stats.metres)
              .slice(0, 12)
              .map((j) => (
                <div key={`${j.club}-${j.nom}`} className="ml-bilan-ligne">
                  <span className="ml-bilan-num">{j.numero}</span>
                  <span className="ml-bilan-nom">{j.nom}<i>{j.club}</i></span>
                  <span>{Math.round(j.stats.metres)} m</span>
                  <span>{j.stats.plaquages} plq.</span>
                  <span>{j.stats.passes} passes</span>
                  <span>{j.minutes}′</span>
                </div>
              ))}
          </div>
        ) : (
          <div className="ml-fil" ref={filRef}>
            {e.commentaires.map((c, i) => (
              <div
                key={i}
                className={`ml-action${c.points > 0 ? ' marque' : ''}${c.type === 'jalon' ? ' jalon' : ''}`}
                data-moi={c.moi ? 'oui' : undefined}
              >
                <span className="ml-minute">{c.minute}′</span>
                <span className="ml-emoji">{EMOJI[c.type] ?? '•'}</span>
                <span className="ml-texte">{c.texte}</span>
                {c.points > 0 && <b className="ml-points">+{c.points}</b>}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}

const LIBELLE_PHASE: Record<string, string> = {
  coupEnvoi: 'coup d’envoi', ruck: 'ruck', melee: 'mêlée', touche: 'touche',
  maul: 'ballon porté', coupDePied: 'ballon en l’air', tirAuBut: 'tir au but',
  apresEssai: 'après l’essai', miTemps: 'mi-temps',
};
