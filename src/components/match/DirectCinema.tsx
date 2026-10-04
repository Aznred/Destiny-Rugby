import { tn, t } from '../../lib/i18n';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { VueMatchEnLigne } from '../../lib/ligue/matchCarriere';
import TerrainEnDirect, { type AfficheDirect, type CouleursDirect } from './TerrainEnDirect';
import { CadreTmoReplay } from './CadreTmoReplay';
import { Icone } from '../Icone';
import { HabillageTV } from './HabillageTV';
import { couleursEquipeTV, DUREE_EQUIPE_TV, type IdentiteTV } from '../../lib/habillageTV';
import { preferencesTele } from '../../lib/match3D';
import './DirectCinema.css';

const heure = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export function DirectCinema({
  match: m,
  domicile,
  exterieur,
  couleurs,
  emblemes,
  modeDemo,
  pause,
  vitesseDemo,
  surAffiche,
  identite,
  portraits,
  panneauDecision,
}: {
  /** Les choix d'une pénalité à trancher : posés SUR l'image, donc visibles aussi en plein écran. */
  panneauDecision?: ReactNode;
  /** Ce que le terrain montre réellement (film rejoué avec retard) : l'écran hôte y cale son score et son chrono. */
  surAffiche?: (affiche: AfficheDirect | null) => void;
  identite?: IdentiteTV;
  /** Le portrait de la carte de chaque joueur, par nom ; `null` : carte sans photo (silhouette grise). */
  portraits?: Record<string, string | null>;
  match: VueMatchEnLigne;
  domicile: string;
  exterieur: string;
  couleurs: CouleursDirect;
  emblemes?: { domicile?: string; exterieur?: string };
  modeDemo?: boolean;
  pause?: boolean;
  vitesseDemo?: number;
}) {
  const [presentationPassee, setPresentationPassee] = useState(false);
  // ⚠️ L'ENTRÉE DES ÉQUIPES SE VOIT TANT QU'ELLE DURE, pas seulement à la première
  // seconde : il fallait ouvrir le direct À L'INSTANT du coup d'envoi pour voir
  // les compositions, donc on ne les voyait jamais. Qui arrive dans les
  // quarante-cinq premières secondes prend la présentation là où elle en est.
  // En ligne le match n'attend personne : la présentation suit donc SA propre
  // horloge, lancée à l'ouverture du direct, tant que le premier quart d'heure
  // n'est pas passé — le jeu continue derrière, comme à l'antenne.
  const ouverture = useRef(m.horloge < 15 && !m.termine && !modeDemo && preferencesTele().presentation);
  const [tempsPresentation, setTempsPresentation] = useState(0);
  useEffect(() => {
    if (!ouverture.current || presentationPassee || pause) return;
    const debut = performance.now() - tempsPresentation * 1000;
    const battement = window.setInterval(() => {
      const ecoule = (performance.now() - debut) / 1000;
      setTempsPresentation(ecoule);
      if (ecoule >= 3 + DUREE_EQUIPE_TV * 2) setPresentationPassee(true);
    }, 250);
    return () => window.clearInterval(battement);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- l'horloge repart d'où elle s'était arrêtée
  }, [presentationPassee, pause]);
  // ⚠️ L'ÉCRAN A QUELQUES SECONDES DE RETARD SUR LE SERVEUR, ET TOUT DOIT L'AVOIR.
  // Le film se rejoue derrière le direct : afficher le score et le fil du
  // serveur annonçait l'essai avant qu'on ne le voie. Tout ce qui entoure le
  // terrain lit donc l'instant MONTRÉ, tant qu'un film est en cours.
  const [vu, setVu] = useState<AfficheDirect | null>(null);
  const rappel = useRef(surAffiche);
  useEffect(() => { rappel.current = surAffiche; }, [surAffiche]);
  const noterAffiche = useCallback((a: AfficheDirect) => { setVu(a); rappel.current?.(a); }, []);
  // À la sirène le serveur n'envoie plus rien : on laisse le film finir ce qu'il a, puis on rend la main.
  const [filmFini, setFilmFini] = useState(false);
  useEffect(() => {
    if (!m.termine) { setFilmFini(false); return; }
    const attente = setTimeout(() => { setFilmFini(true); setVu(null); rappel.current?.(null); }, 4500);
    return () => clearTimeout(attente);
  }, [m.termine]);
  const affiche = filmFini ? null : vu;
  const terrain = affiche?.terrain ?? m.terrain;
  const dernieresExclusions = useRef(terrain?.exclusionsTV);
  useEffect(() => { if (terrain?.exclusionsTV) dernieresExclusions.current = terrain.exclusionsTV; }, [terrain?.exclusionsTV]);
  const score = affiche?.score ?? m.score;
  // Les essais suivent l'image, comme le score : on ne compte que ceux déjà vus.
  const essaisVus = { ...m.essais };
  if (affiche) {
    essaisVus.domicile = 0; essaisVus.exterieur = 0;
    for (const v of m.fil ?? []) {
      if (v.type === 'essai' && v.cote && (v.seconde ?? v.minute * 60) <= affiche.seconde + 0.5) essaisVus[v.cote] += 1;
    }
  }
  const moments = m.moments ?? [];
  const cahier = m.maStrategie;
  const combinaisonsActives = cahier?.combinaisons?.filter(c => c.active).length ?? 0;
  const secondeCourante = affiche ? affiche.seconde : (m.terrain?.horloge ?? m.horloge) * 60;
  const presentation = ouverture.current && !presentationPassee ? tempsPresentation : undefined;
  const momentsVus = affiche ? moments.filter((v) => v.seconde <= secondeCourante + 0.5) : moments;
  const dernierMoment = momentsVus.at(-1);
  const ageMoment = dernierMoment ? secondeCourante - dernierMoment.seconde : Infinity;
  const momentVif = dernierMoment && ageMoment >= -2 && ageMoment <= 15 ? dernierMoment : undefined;
  const carton = terrain?.sifflet?.cle?.includes('cartonRouge') ? 'rouge'
    : terrain?.sifflet?.cle?.includes('cartonJaune') ? 'jaune'
    : momentVif?.type === 'carton' ? (/rouge/i.test(momentVif.texte) ? 'rouge' : 'jaune')
    : undefined;
  // La décision n'apparaît qu'une fois la pénalité sifflée À L'ÉCRAN.
  const decision = m.decision && (!affiche || affiche.seconde >= m.decision.horloge * 60 - 1.5) ? m.decision : undefined;
  const montrerTerrain = Boolean(m.terrain || m.film || (vu && !filmFini));

  const isTmo = Boolean((terrain?.phase === 'tmo' || (terrain?.tmo?.actif && !carton)) && terrain?.tmo);

  return (
    <section className="dc" aria-label={t("ui.a223eeb07f09")}>
      <header className="dc-entete">
        <span>
          <i />
          {m.termine ? t("online.match.finished") : t("ui.c089a4499f41")} <b>{t("ui.2a109b609a5b")}</b>
        </span>
        <span>{t("ui.f3ba155271f1")}</span>
      </header>
      {m.monCote && cahier && (cahier.modeCombinaisons === 'configure' || !!cahier.combinaisons?.length) && <div className={`dc-cahier ${cahier.modeCombinaisons === 'configure' && combinaisonsActives ? 'actif' : ''}`}><Icone nom="sifflet" taille={16} /><span>{cahier.modeCombinaisons === 'automatique' ? t("ui.89b87c5d09fc") : combinaisonsActives ? tn("ui.13ebe03563fd", combinaisonsActives, { v0: combinaisonsActives }) : t("ui.c2b2701297f3")}</span></div>}
      <div className={`dc-ecran ${isTmo ? 'dc-ecran-tmo' : ''}`}>
        <HabillageTV key={`${m.id}:${m.instance ?? ''}`} identite={identite} seconde={secondeCourante}
          periode={terrain?.periode ?? (secondeCourante >= 2400 ? 2 : 1)} phase={terrain?.phase} termine={m.termine && filmFini}
          equipes={[
            { nom: domicile, ...couleursEquipeTV(couleurs.domicile), logo: emblemes?.domicile, score: score.domicile, essais: essaisVus.domicile },
            { nom: exterieur, ...couleursEquipeTV(couleurs.exterieur, true), logo: emblemes?.exterieur, score: score.exterieur, essais: essaisVus.exterieur },
          ]}
          exclusions={terrain?.exclusionsTV ?? (m.termine ? dernieresExclusions.current : undefined)} pause={pause}
          joueurs={(terrain?.pions ?? []).map(p => ({ ...p, cote: p.cote === 'domicile' ? 'A' : 'B', photo: portraits ? portraits[p.nom] ?? null : undefined }))}
          sifflet={decision ? null : terrain?.sifflet} presentation={presentation} surPasser={() => setPresentationPassee(true)} />
        {montrerTerrain ? (
          <TerrainEnDirect
            key={m.id}
            terrain={m.terrain}
            film={m.film}
            matchId={modeDemo ? undefined : m.id}
            surAffiche={noterAffiche}
            scoreMatch={m.score}
            identite={identite}
            nomDomicile={domicile}
            nomExterieur={exterieur}
            couleurs={couleurs}
            emblemes={emblemes}
            monCote={m.monCote}
            carton={carton}
            modeDemo={modeDemo}
            pause={pause}
            vitesseDemo={vitesseDemo}
          />
        ) : (
          <p className="dc-attente">
            {m.termine
              ? t("ui.2ce809c64e56")
              : t("ui.d725dbfdd9aa")}
          </p>
        )}
        {/* ---------- 📺 TMO : CADRE TÉLÉ REPLAY BROADCAST (L'ACTION RESTE VISIBLE AU CENTRE) ---------- */}
        {isTmo && terrain?.tmo && (
          <CadreTmoReplay
            action={terrain.tmo.action}
            decision={terrain.tmo.decision}
            explication={terrain.tmo.explication}
            cadreCamera={terrain.tmo.cadreCamera}
            horloge={heure(secondeCourante)}
          />
        )}

        {/* L'image ne porte que l'habillage TV ; seule la décision à prendre s'y pose, là où l'on regarde. */}
        {decision && panneauDecision && <div className="dc-decision">{panneauDecision}</div>}
      </div>
    </section>
  );
}
