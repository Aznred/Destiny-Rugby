// LES TROIS SURFACES PUBLICITAIRES DU JEU — et rien de plus
//
//   • <BandeauConsentementPub> : la question, une seule fois, discrète.
//   • <Pub>                    : la bannière de bas de page, DANS le flux.
//   • <PubRecompensee>         : la vidéo qu'on choisit de regarder, contre des Ovas.
//
// ⚠️ LES RÈGLES QUI RENDENT TOUT ÇA SUPPORTABLE SONT DANS `lib/pub.ts`, EN
// TÊTE. Le résumé : jamais pendant le jeu, jamais en surimpression, jamais de
// vidéo lancée toute seule, jamais rien qui se débloque UNIQUEMENT par la pub.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { t } from '../lib/i18n';
import {
  CLIENT_PUB, SLOT_PUB, DUREE_PUB_MAISON_S, OVAS_PAR_PUB, PUBS_PAR_JOUR,
  attenteLisible, chargerRegie, pubDisponible,
} from '../lib/pub';

// ---------------------------------------------------------------------------
// LE CONSENTEMENT
// ---------------------------------------------------------------------------

export function BandeauConsentementPub() {
  const consentement = useGame((s) => s.pubConsentement);
  const setConsentement = useGame((s) => s.setPubConsentement);
  // Pas de régie configurée ? Pas de question. Demander un consentement pour
  // quelque chose qui n'existe pas, c'est du bruit.
  if (!CLIENT_PUB || consentement !== 'inconnu') return null;
  return (
    <div className="bandeau-pub" role="region" aria-label={t('pub.consentTitre')}>
      <p>{t('pub.consentTexte')}</p>
      <div className="bandeau-pub-actions">
        <button type="button" className="btn fantome petit" onClick={() => setConsentement('non')}>
          {t('pub.refuser')}
        </button>
        <button type="button" className="btn primaire petit" onClick={() => setConsentement('oui')}>
          {t('pub.accepter')}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LA BANNIÈRE
// ---------------------------------------------------------------------------

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

/**
 * ⚠️ ELLE NE REND RIEN DU TOUT quand il n'y a pas de régie, pas de
 * consentement, ou que le script ne s'est pas chargé (bloqueur de pub). Pas de
 * cadre gris « emplacement publicitaire », pas de trou dans la mise en page :
 * l'écran doit être identique à ce qu'il était avant qu'on parle de pub.
 */
export function Pub() {
  const consentement = useGame((s) => s.pubConsentement);
  const [prete, setPrete] = useState(false);
  const bloc = useRef<HTMLModElement>(null);
  const poussee = useRef(false);

  useEffect(() => {
    let vivant = true;
    void chargerRegie(consentement === 'oui').then((ok) => { if (vivant) setPrete(ok); });
    return () => { vivant = false; };
  }, [consentement]);

  useEffect(() => {
    if (!prete || poussee.current || !bloc.current) return;
    poussee.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // Une régie qui refuse une insertion ne doit pas emporter l'écran.
    }
  }, [prete]);

  if (!prete || !CLIENT_PUB || !SLOT_PUB) return null;

  return (
    <aside className="emplacement-pub" aria-label={t('pub.emplacement')}>
      <span className="emplacement-pub-etiquette">{t('pub.etiquette')}</span>
      {/* `position: static` et hauteur bornée : voir `.emplacement-pub` dans
          App.css. Le bloc vit dans le flux, il ne recouvre jamais le jeu. */}
      <ins
        ref={bloc}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT_PUB}
        data-ad-slot={SLOT_PUB}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </aside>
  );
}

// ---------------------------------------------------------------------------
// LA PUB RÉCOMPENSÉE
// ---------------------------------------------------------------------------

/**
 * La carte cliquable, à poser dans la Boutique. Elle dit toujours la vérité :
 * ce qu'on gagne, combien il en reste aujourd'hui, et quand revient la
 * prochaine. Rien ne se déclenche sans clic.
 */
export function CartePubRecompensee() {
  const pubs = useGame((s) => s.pubs);
  const encaisser = useGame((s) => s.encaisserPub);
  const consentement = useGame((s) => s.pubConsentement);
  const setConsentement = useGame((s) => s.setPubConsentement);
  const [ouverte, setOuverte] = useState(false);
  const [gain, setGain] = useState<number | null>(null);
  // La disponibilité dépend de l'heure : on redemande à chaque ouverture et
  // toutes les 30 s tant que la carte est visible.
  const [, battement] = useState(0);
  useEffect(() => {
    const minuterie = setInterval(() => battement((n) => n + 1), 30_000);
    return () => clearInterval(minuterie);
  }, []);

  const dispo = pubDisponible(pubs);

  return (
    <>
      <div className="carte article carte-pub">
        <div className="pastille-equipement" style={{ background: 'radial-gradient(circle at 32% 28%, #d8a94a, #10171200 72%)' }}>
          <span>🎬</span>
        </div>
        <div className="article-nom">{t('pub.recompenseTitre')}</div>
        <div className="article-detail">
          {t('pub.recompenseDetail', { ovas: String(OVAS_PAR_PUB) })}
        </div>
        <div className="article-detail" style={{ color: 'var(--craie-dim)' }}>
          {t('pub.restantes', { n: String(dispo.restantes), total: String(PUBS_PAR_JOUR) })}
        </div>
        {consentement === 'non' ? (
          <button type="button" className="btn fantome petit" onClick={() => setConsentement('oui')}>
            {t('pub.reactiver')}
          </button>
        ) : (
          <button
            type="button"
            className="btn primaire petit"
            disabled={!dispo.possible}
            title={dispo.attente > 0 ? attenteLisible(dispo.attente) : undefined}
            onClick={() => { setGain(null); setOuverte(true); }}
          >
            {dispo.possible
              ? `🎬 ${t('pub.regarder')}`
              : dispo.restantes === 0
                ? t('pub.demain')
                : attenteLisible(dispo.attente)}
          </button>
        )}
        {gain != null && <div className="flash-boutique">{t('pub.gagne', { ovas: String(gain) })}</div>}
      </div>

      {ouverte && (
        <PubRecompensee
          onFermer={() => setOuverte(false)}
          onTerminee={() => { setGain(encaisser()); setOuverte(false); }}
        />
      )}
    </>
  );
}

/**
 * ⚠️ SANS RÉGIE, C'EST UN ENCART « MAISON ». Une vraie vidéo récompensée passe
 * par le SDK d'une régie (Ad Manager, AdSense H5 games…) : sans compte, il n'y
 * a rien à afficher. Plutôt que de désactiver la mécanique en attendant, on la
 * joue avec un encart du jeu et son compte à rebours — c'est jouable, c'est
 * testable, et le jour où le SDK arrive il prend simplement la place du
 * contenu de cette modale.
 *
 * ⚠️ ON PEUT FERMER À TOUT MOMENT. Une pub récompensée dont on ne peut pas
 * sortir, c'est exactement ce que le joueur a demandé d'éviter — fermer avant
 * la fin annule simplement la récompense.
 */
function PubRecompensee({ onFermer, onTerminee }: { onFermer: () => void; onTerminee: () => void }) {
  const [reste, setReste] = useState(DUREE_PUB_MAISON_S);

  useEffect(() => {
    if (reste <= 0) { onTerminee(); return; }
    const minuterie = setTimeout(() => setReste((n) => n - 1), 1000);
    return () => clearTimeout(minuterie);
  }, [reste, onTerminee]);

  return createPortal(
    // ⚠️ `createPortal(document.body)` obligatoire : le `backdrop-filter` des
    // `.carte` crée un bloc conteneur qui piège les `position: fixed`.
    <div className="overlay" onClick={onFermer}>
      <motion.div
        className="carte modale modale-pub"
        role="dialog"
        aria-modal="true"
        aria-label={t('pub.recompenseTitre')}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="eyebrow">{t('pub.etiquette')}</div>
        <h2>{t('pub.maisonTitre')}</h2>
        <p className="aide">{t('pub.maisonTexte')}</p>
        <div className="pub-compte" aria-live="polite">
          <div className="pub-compte-piste">
            <span style={{ width: `${((DUREE_PUB_MAISON_S - reste) / DUREE_PUB_MAISON_S) * 100}%` }} />
          </div>
          <b>{Math.max(0, reste)} s</b>
        </div>
        <div className="rangee-fin">
          <button type="button" className="btn fantome" onClick={onFermer}>
            {t('pub.quitter')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
