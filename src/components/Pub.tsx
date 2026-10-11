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
import { useGame } from '../store/useGame';
import { t } from '../lib/i18n';
import {
  CLIENT_PUB, SLOT_PUB,
  chargerRegie,
} from '../lib/pub';
import { CarteOvasGratuits } from './PublicitesRecompensees';

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
/**
 * UN BLOC D'ANNONCE ADSENSE, et le seul endroit du jeu qui en fabrique un.
 *
 * ⚠️ IL NE REND RIEN SANS `SLOT_PUB`. Un « slot » se crée bloc par bloc dans la
 * console AdSense : on ne peut pas le deviner, et un identifiant inventé fait
 * rendre un cadre vide au milieu de l'écran. Tant qu'il manque, ce composant
 * renvoie `null` — la bannière n'existe simplement pas, et la pub récompensée
 * retombe sur son encart maison.
 *
 * Renvoie `null` aussi sans consentement ou si le script ne s'est pas chargé
 * (bloqueur de pub, réseau) : un bloqueur ne doit JAMAIS casser un écran.
 */
function BlocAnnonce({ format = 'horizontal' }: { format?: string }) {
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
    <ins
      ref={bloc}
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={CLIENT_PUB}
      data-ad-slot={SLOT_PUB}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}

/**
 * ⚠️ ELLE NE REND RIEN DU TOUT quand il n'y a pas de régie, pas de
 * consentement, ou que le script ne s'est pas chargé (bloqueur de pub). Pas de
 * cadre gris « emplacement publicitaire », pas de trou dans la mise en page :
 * l'écran doit être identique à ce qu'il était avant qu'on parle de pub.
 */
export function Pub() {
  if (!CLIENT_PUB || !SLOT_PUB) return null;
  return (
    <aside className="emplacement-pub" aria-label={t('pub.emplacement')}>
      <span className="emplacement-pub-etiquette">{t('pub.etiquette')}</span>
      {/* `position: static` et hauteur bornée : voir `.emplacement-pub` dans
          App.css. Le bloc vit dans le flux, il ne recouvre jamais le jeu. */}
      <BlocAnnonce />
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
export function CartePubRecompensee() { return <CarteOvasGratuits />; }

// Les anciennes récompenses cosmétiques maison restent fermées.
export function BoutonDeblocageParPub(_props: { id: string; onDebloque?: () => void }) {
  return <button type="button" className="btn fantome petit" disabled>{t('ui.b3bdedf18c24')}</button>;
}
