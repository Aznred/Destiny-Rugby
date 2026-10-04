import { tn, t } from '../../lib/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VueMatchEnLigne } from '../../lib/ligue/matchCarriere';
import { creerScenarioDirect } from '../../lib/ligue/scenarioDirect';
import TerrainEnDirect, { type AfficheDirect, type CouleursDirect } from './TerrainEnDirect';
import { CadreTmoReplay } from './CadreTmoReplay';
import { Icone, type NomIcone } from '../Icone';
import { TexteIcones } from '../TexteIcones';
import './DirectCinema.css';

const heure = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

const libelleMoment = (type: string, texte: string) =>
  type === 'essai' ? 'ESSAI'
    : type === 'carton' ? (/rouge/i.test(texte) ? 'CARTON ROUGE' : 'CARTON JAUNE')
      : type === 'penalite' || type === 'faute' ? 'PÉNALITÉ'
        : type === 'but' ? 'TIR RÉUSSI'
          : type === 'butRate' ? 'TIR MANQUÉ'
            : type === 'blessure' ? 'BLESSURE'
              : type === 'remplacement' ? 'REMPLACEMENT'
                : type === 'franchissement' ? 'FRANCHISSEMENT'
                  : 'ACTION IMPORTANTE';

const iconeMoment = (type: string): NomIcone => type === 'essai' ? 'ballon' : type === 'carton' ? 'carton'
  : type === 'penalite' || type === 'faute' ? 'sifflet' : type === 'but' ? 'cible'
    : type === 'butRate' ? 'croix' : type === 'blessure' ? 'soin' : type === 'remplacement' ? 'repost' : 'eclair';

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
}: {
  /** Ce que le terrain montre réellement (film rejoué avec retard) : l'écran hôte y cale son score et son chrono. */
  surAffiche?: (affiche: AfficheDirect | null) => void;
  match: VueMatchEnLigne;
  domicile: string;
  exterieur: string;
  couleurs: CouleursDirect;
  emblemes?: { domicile?: string; exterieur?: string };
  modeDemo?: boolean;
  pause?: boolean;
  vitesseDemo?: number;
}) {
  const [selection, setSelection] = useState<string | null>(null);
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
  const score = affiche?.score ?? m.score;
  // Une pénalité attend la décision du manager : ses boutons sont dans la page,
  // sous le direct. On quitte donc le plein écran pour qu'il puisse trancher.
  const decisionEnAttente = !!m.decision;
  const moments = m.moments ?? [];
  useEffect(() => {
    if (decisionEnAttente && document.fullscreenElement) void document.exitFullscreen();
  }, [decisionEnAttente]);
  const cahier = m.maStrategie;
  const combinaisonsActives = cahier?.combinaisons?.filter(c => c.active).length ?? 0;
  const momentSelectionne = moments.find((v) => v.id === selection);
  const secondeCourante = affiche ? affiche.seconde : (m.terrain?.horloge ?? m.horloge) * 60;
  const ligneDirect = [...(m.fil ?? [])]
    .reverse()
    .find((v) => !v.ordre && v.texte && (v.seconde ?? v.minute * 60) <= secondeCourante + 2);
  const momentsVus = affiche ? moments.filter((v) => v.seconde <= secondeCourante + 0.5) : moments;
  const dernierMoment = momentsVus.at(-1);
  const ageMoment = dernierMoment ? secondeCourante - dernierMoment.seconde : Infinity;
  const momentVif = dernierMoment && ageMoment >= -2 && ageMoment <= 15 ? dernierMoment : undefined;
  const carton = terrain?.sifflet?.cle?.includes('cartonRouge') ? 'rouge'
    : terrain?.sifflet?.cle?.includes('cartonJaune') ? 'jaune'
    : momentVif?.type === 'carton' ? (/rouge/i.test(momentVif.texte) ? 'rouge' : 'jaune')
    : undefined;
  const scenario = terrain ? creerScenarioDirect(terrain) : undefined;
  const prep = terrain?.preparationTir;
  // La décision n'apparaît qu'une fois la pénalité sifflée À L'ÉCRAN.
  const decision = m.decision && (!affiche || affiche.seconde >= m.decision.horloge * 60 - 1.5) ? m.decision : undefined;
  const montrerTerrain = Boolean(m.terrain || m.film || (vu && !filmFini));
  const commentaire =
    momentSelectionne?.texte ??
    momentVif?.texte ??
    ligneDirect?.texte ??
    (prep
      ? 'Concentration maximale du buteur face aux poteaux.'
      : scenario?.ballonLent
        ? 'La sortie est ralentie. La défense a le temps de se replacer.'
        : scenario?.intensite === 'forte'
          ? 'La défense recule, l’action peut basculer à tout instant.'
          : scenario?.intensite === 'active'
            ? 'Le ballon circule et l’attaque cherche l’intervalle.'
            : 'Les deux équipes se replacent et construisent la séquence suivante.');
  const bandeau = decision
    ? 'DÉCISION DU MANAGER'
    : momentSelectionne
      ? 'ACTION DU MATCH'
      : prep
        ? (prep.transformation ? 'TRANSFORMATION' : 'TIR AU BUT')
        : momentVif || scenario?.momentFort
          ? 'MOMENT FORT'
          : 'COMMENTAIRE EN DIRECT';

  const isTmo = Boolean((terrain?.phase === 'tmo' || terrain?.tmo?.actif) && terrain?.tmo);
  const alerteVif = Boolean(momentVif && ageMoment <= 6.5 && !isTmo);
  const alertePrep = Boolean(prep && !decision && (!momentVif || ageMoment > 6.5));
  const hasAlerte = Boolean(decision || alerteVif || alertePrep);

  return (
    <section className="dc" aria-label={t("ui.a223eeb07f09")}>
      <header className="dc-entete">
        <span>
          <i />
          {m.termine ? t("online.match.finished") : t("ui.c089a4499f41")} <b>{t("ui.2a109b609a5b")}</b>
        </span>
        <span>{t("ui.f3ba155271f1")}</span>
      </header>
      <div className="dc-score">
        <time>{heure(affiche ? affiche.seconde : m.horloge * 60)}</time>
        <span style={{ borderColor: couleurs.domicile }}>{domicile}</span>
        <strong>
          {score.domicile} – {score.exterieur}
        </strong>
        <span style={{ borderColor: couleurs.exterieur }}>{exterieur}</span>
      </div>
      {m.monCote && cahier && (cahier.modeCombinaisons === 'configure' || !!cahier.combinaisons?.length) && <div className={`dc-cahier ${cahier.modeCombinaisons === 'configure' && combinaisonsActives ? 'actif' : ''}`}><Icone nom="sifflet" taille={16} /><span>{cahier.modeCombinaisons === 'automatique' ? t("ui.89b87c5d09fc") : combinaisonsActives ? tn("ui.13ebe03563fd", combinaisonsActives, { v0: combinaisonsActives }) : t("ui.c2b2701297f3")}</span></div>}
      <div className={`dc-ecran ${isTmo ? 'dc-ecran-tmo' : ''} ${hasAlerte ? 'dc-ecran-alerte' : ''}`}>
        {montrerTerrain ? (
          <TerrainEnDirect
            key={m.id}
            terrain={m.terrain}
            film={m.film}
            matchId={modeDemo ? undefined : m.id}
            surAffiche={noterAffiche}
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

        {(decision || alerteVif) && (
          <div className={`dc-alerte-terrain dc-alerte-${decision ? 'penalite' : momentVif?.type}`} role="status">
            <b><Icone nom={decision ? 'sifflet' : iconeMoment(momentVif!.type)} taille={16} /> {decision ? t("ui.229b9ae7b57f") : libelleMoment(momentVif!.type, momentVif!.texte)}</b>
            <span>
              {decision
                ? t("ui.be54646015c1")
                : <TexteIcones texte={momentVif!.texte} />}
            </span>
          </div>
        )}

        {alertePrep && (
          <div className="dc-alerte-terrain dc-alerte-penalite" role="status">
            <b><Icone nom="cible" taille={16} /> {prep?.transformation ? t("ui.608665dbbdd1") : t("ui.8ef71761d747")}</b>
            <span>{t("ui.e88e6f5ad19c")}</span>
          </div>
        )}
      </div>
      <div className={`dc-commentaire ${momentVif || scenario?.momentFort ? 'fort' : ''}`} aria-live="polite">
        <span>
          {bandeau}
          {terrain?.lancement?.combinaison && ` · ${terrain.lancement.combinaison}`}
          {momentSelectionne
            ? ` · ${heure(momentSelectionne.seconde)} · ${momentSelectionne.score.domicile}–${momentSelectionne.score.exterieur}`
            : scenario
              ? t("ui.466408d4ea15", { v0: scenario.sequence })
              : ''}
        </span>
        <p>
          {decision
            ? t("ui.0b0e23e2076f")
            : <TexteIcones texte={commentaire} />}
        </p>
        {selection && <button onClick={() => setSelection(null)}>{t("ui.4f00a5d0128e")}</button>}
      </div>
      <div className="dc-chiffres">
        {[
          ['Possession', `${m.stats.domicile.possession}%`, `${m.stats.exterieur.possession}%`],
          ['Mètres gagnés', m.stats.domicile.metres, m.stats.exterieur.metres],
          ['Plaquages', m.stats.domicile.plaquages, m.stats.exterieur.plaquages],
        ].map(([label, a, b]) => (
          <div key={label}>
            <span>{label}</span>
            <b>
              {a} <i>–</i> {b}
            </b>
          </div>
        ))}
      </div>
      <div className="dc-moments">
        <div className="dc-titre">
          <h3>{t("ui.0bc62a01f8cc")}</h3>
          <span>{t("ui.545a48fc341f", { v0: momentsVus.length })}</span>
        </div>
        <div className="dc-liste">
          {[...momentsVus].reverse().map((v) => (
            <button key={v.id} aria-pressed={selection === v.id} onClick={() => setSelection(v.id)}>
              <time>{heure(v.seconde)}</time>
              <span>
                <b>
                  {v.cote === 'domicile' ? domicile : v.cote === 'exterieur' ? exterieur : t("ui.4f3619d26a09")}
                  {v.points ? t("ui.bc26b8a2ad14", { v0: v.points }) : ''}
                </b>
                <small><TexteIcones texte={v.texte} /></small>
              </span>
              <strong>
                {v.score.domicile}–{v.score.exterieur}
              </strong>
            </button>
          ))}
        </div>
        {!momentsVus.length && <p className="dc-attente">{t("ui.01e3902d4152")}</p>}
      </div>
    </section>
  );
}
