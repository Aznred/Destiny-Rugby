import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from './Icone';
import { Terrain3D } from './match/Terrain3D';
import { ChronologieCombinaison } from './ChronologieCombinaison';
import { t } from '../lib/i18n';
import { useModalDialog } from '../lib/useModalDialog';
import { apparencesDesJoueurs, webglDisponible, type Camera3D, type OptionsScene3D, type Scene3D } from '../lib/match3D';
import { maillotDeSecours, type MaillotMatch } from '../lib/moteur/apparenceMatch';
import type { Coequipier } from '../lib/effectif';
import type { Combinaison, VarianteCombinaison } from '../lib/ligue/combinaisons';
import {
  NIVEAUX_DEFENSE, preparerEssaiCombinaison, REGLAGES_ESSAI_DEFAUT, SYSTEMES_DEFENSE,
  type BilanEssai, type EssaiPrepare, type ReglagesEssai,
} from '../lib/ligue/essaiCombinaisons';
import './TestCombinaison3D.css';

/**
 * « TESTER EN 3D » (Correctif 41, points 1, 2 et 14).
 *
 * ⚠️ CE N'EST PAS UNE ANIMATION DE L'ÉDITEUR. La fenêtre monte la scène du match (`Terrain3D`, la même que `MatchLive`
 * et le direct d'une ligue) et lui branche un vrai `EtatMatch` : l'essai préparé par `preparerEssaiCombinaison`, avec les
 * options de moteur d'une rencontre de ligue créée aujourd'hui. Ce qu'on voit — courses, passes, cellules, contacts,
 * ballon — est ce que le moteur joue ; la fenêtre ne fait qu'avancer le temps et lire le bilan.
 *
 * La scène n'est montée qu'une fois : changer de défense ou retenter rebranche un nouvel état sur les mêmes trente joueurs.
 */
// La réalisation télévisée d'abord : elle suit le ballon de près, comme pendant un match.
const CAMERAS: readonly Camera3D[] = ['tv', 'aerienne', 'wide', 'follow'];
const VITESSES = [.5, 1, 2] as const;

function Segments<T extends string | number>({ valeur, options, onChange, libelle }: {
  valeur: T; options: readonly { valeur: T; libelle: string }[]; onChange: (v: T) => void; libelle: string;
}) {
  return (
    <span className="t3-segments" role="group" aria-label={libelle}>
      {options.map((o) => (
        <button key={String(o.valeur)} type="button" className={o.valeur === valeur ? 'actif' : ''} aria-pressed={o.valeur === valeur} onClick={() => onChange(o.valeur)}>{o.libelle}</button>
      ))}
    </span>
  );
}

export function TestCombinaison3D({ combinaison: c, variante: v, joueurs, effectif, maillot, fermer }: {
  combinaison: Combinaison; variante: VarianteCombinaison; joueurs: Record<number, string>;
  effectif?: Coequipier[]; maillot?: MaillotMatch; fermer: () => void;
}) {
  const { overlayRef, dialogRef } = useModalDialog(fermer);
  const [reglages, setReglages] = useState<ReglagesEssai>(REGLAGES_ESSAI_DEFAUT);
  // Rejouer le même tirage : le compteur change, pas les réglages — le moteur rejoue à l'identique.
  const [reprise, setReprise] = useState(0);
  const [passerConquete, setPasserConquete] = useState(true);
  const [pause, setPause] = useState(false);
  const [vitesse, setVitesse] = useState<(typeof VITESSES)[number]>(1);
  const [camera, setCamera] = useState<Camera3D>('tv');
  const [bilan, setBilan] = useState<BilanEssai | null>(null);
  const [sans3D, setSans3D] = useState(() => !webglDisponible());
  const scene = useRef<Scene3D | null>(null);
  const [scenePrete, setScenePrete] = useState(false);
  const essai = useRef<EssaiPrepare | null>(null);
  const reglage = useRef({ pause, vitesse });
  reglage.current = { pause, vitesse };

  // L'essai : préparé à chaque changement de défense, de tirage ou de reprise. Un jumeau joué à blanc dit quand il part.
  // ⚠️ LA CLÉ EST LE CONTENU, PAS L'OBJET : l'écran de la ligue recrée `joueurs` et `effectif` à chaque sondage, et
  // l'essai repartait du début toutes les vingt secondes. `reprise` relance le même tirage.
  const cle = JSON.stringify([c, v, joueurs, effectif?.slice(0, 15).map((j) => [j.id, j.note]), reglages, passerConquete, reprise]);
  const prepare = useMemo(
    () => preparerEssaiCombinaison(c, v, joueurs, reglages, effectif, passerConquete),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- voir `cle`
    [cle],
  );
  useEffect(() => {
    essai.current = prepare;
    setBilan(prepare?.essai.bilan() ?? null);
    setPause(false);
    if (prepare && scene.current) { scene.current.brancher(prepare.essai.e); scene.current.recadrer(); }
  }, [prepare]);

  // Les options de la scène sont lues une fois : les trente joueurs gardent leurs identifiants d'un essai à l'autre.
  const options = useMemo<OptionsScene3D | null>(() => {
    if (!prepare) return null;
    return {
      equipes: [
        { nom: t('compo.tonXV'), maillot: maillot ?? maillotDeSecours('#b9473d', 'atelier-attaque') },
        { nom: t('cb.essai.defense'), maillot: maillotDeSecours('#3889cb', 'atelier-defense') },
      ],
      apparences: apparencesDesJoueurs(prepare.essai.e.pions),
      camera: 'tv', television: { ralentis: false }, stade: 'campagne',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montée une seule fois
  }, [!!prepare, maillot]);

  // La boucle : c'est la fenêtre qui fait avancer le moteur, la scène ne fait que le lire (comme `MatchLive`).
  useEffect(() => {
    if (!scenePrete) return undefined;
    let image = 0, dernier = performance.now(), dernierBilan = 0;
    const tourner = (maintenant: number) => {
      image = requestAnimationFrame(tourner);
      const s = scene.current, p = essai.current;
      const reel = Math.min(.12, (maintenant - dernier) / 1000);
      dernier = maintenant;
      if (!s || !p) return;
      const { pause: enPause, vitesse: allure } = reglage.current;
      const fini = p.essai.termine();
      if (enPause || fini) { s.image(reel, { fige: true, vitesse: 1 }); }
      else {
        const dt = reel * allure;
        s.retenir(dt);
        p.essai.avancerDe(dt);
        s.image(dt, { vitesse: allure });
      }
      // Le bilan ne se relit que cinq fois par seconde : React n'a pas à redessiner à chaque image.
      if (maintenant - dernierBilan > 200) { dernierBilan = maintenant; setBilan(p.essai.bilan()); }
    };
    image = requestAnimationFrame(tourner);
    return () => cancelAnimationFrame(image);
  }, [scenePrete]);

  useEffect(() => { if (scene.current) { scene.current.camera = camera; scene.current.recadrer(); } }, [camera, scenePrete]);

  const brancher = (creee: Scene3D | null) => {
    scene.current = creee;
    setScenePrete(!!creee);
    if (!creee) return;
    if (creee.son) creee.son.muet = true;
    creee.camera = camera;
    if (essai.current) { creee.brancher(essai.current.essai.e); creee.recadrer(); }
  };
  const termine = bilan ? bilan.issue !== 'enCours' : false;
  const reussi = bilan?.issue === 'essai';

  return createPortal(
    <div ref={overlayRef} className="t3-fond">
      <div ref={dialogRef} className="t3" role="dialog" aria-modal="true" aria-labelledby="t3-titre" tabIndex={-1}>
        <header className="t3-tete">
          <div>
            <span className="eyebrow">{c.nom} · {v.nom}</span>
            <h2 id="t3-titre">{t('cb.essai.titre')}</h2>
          </div>
          <button type="button" className="t3-fermer" onClick={fermer} aria-label={t('ctr.fermer')}><Icone nom="croix" taille={18} /></button>
        </header>

        <div className="t3-reglages">
          <label><span>{t('cb.essai.defense')}</span>
            <Segments libelle={t('cb.essai.defense')} valeur={reglages.niveau} onChange={(niveau) => setReglages({ ...reglages, niveau })}
              options={NIVEAUX_DEFENSE.map((valeur) => ({ valeur, libelle: t(`cb.essai.niveau.${valeur}`) }))} /></label>
          {reglages.niveau !== 'aucune' && <label><span>{t('cb.essai.systeme')}</span>
            <Segments libelle={t('cb.essai.systeme')} valeur={reglages.systeme} onChange={(systeme) => setReglages({ ...reglages, systeme })}
              options={SYSTEMES_DEFENSE.map((valeur) => ({ valeur, libelle: t(`cb.essai.systeme.${valeur}`) }))} /></label>}
          {c.phase !== 'ruck' && <label className="t3-case"><input type="checkbox" checked={passerConquete} onChange={(e) => setPasserConquete(e.target.checked)} /><span>{t('cb.essai.conquete')}</span></label>}
        </div>

        <div className="t3-scene">
          {!prepare ? <p className="t3-message" role="alert">{t('cb.essai.invalide')}</p>
            : sans3D ? <p className="t3-message" role="status">{t('cb.essai.sans3D')}</p>
              : options && <Terrain3D options={options} surPrete={brancher} surEchec={() => { scene.current = null; setScenePrete(false); setSans3D(true); }} />}
          {prepare && !sans3D && bilan && (
            <div className={`t3-issue${termine ? ' finie' : ''}${reussi ? ' reussie' : ''}`} role="status" aria-live="polite">
              {t(`cb.essai.issue.${bilan.issue === 'invalide' ? 'enCours' : bilan.issue}`)}
            </div>
          )}
        </div>

        <div className="t3-commandes">
          <button type="button" className="btn primaire" disabled={!prepare} onClick={() => setReprise((n) => n + 1)}><Icone nom="lecture" taille={15} /> {t('cb.essai.rejouer')}</button>
          <button type="button" className="btn fantome" disabled={!prepare} onClick={() => setReglages({ ...reglages, essai: reglages.essai + 1 })}><Icone nom="repost" taille={15} /> {t('cb.essai.nouvel')}</button>
          <button type="button" className="btn fantome" disabled={!prepare || termine} aria-pressed={pause} onClick={() => setPause((p) => !p)}>
            <Icone nom={pause ? 'lecture' : 'pause'} taille={15} /> {pause ? t('cb.essai.reprendre') : t('cb.essai.pause')}
          </button>
          <label><span>{t('cb.essai.vitesse')}</span>
            <Segments libelle={t('cb.essai.vitesse')} valeur={vitesse} onChange={setVitesse} options={VITESSES.map((valeur) => ({ valeur, libelle: `×${valeur}` }))} /></label>
          {!sans3D && <label><span>{t('cb.essai.camera')}</span>
            <Segments libelle={t('cb.essai.camera')} valeur={camera} onChange={setCamera} options={CAMERAS.map((valeur) => ({ valeur, libelle: t(`cb.essai.camera.${valeur}`) }))} /></label>}
        </div>

        {bilan && (
          <p className="t3-bilan">
            <span>{t('cb.essai.metres', { n: bilan.metres.toLocaleString(undefined, { maximumFractionDigits: 1 }) })}</span>
            <span>{t('cb.essai.passes', { n: bilan.passes })}</span>
            <span>{t('cb.essai.franchissements', { n: bilan.franchissements })}</span>
            <span>{t('cb.essai.plaquages', { n: bilan.plaquages })}</span>
            {bilan.option && <span className="t3-option">{t('cb.option.jouee', { o: t(`cb.si.${bilan.option}`) })}</span>}
          </p>
        )}
        <ChronologieCombinaison combinaison={c} variante={v} effectif={effectif} etape={bilan?.etape ?? null} compacte />
        <p className="t3-note">{t('cb.essai.memeMoteur')}</p>
      </div>
    </div>,
    document.body,
  );
}
