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
  CLIENT_PUB, SLOT_PUB, DUREE_PUB_MAISON_S, OVAS_PAR_PUB, PUBS_PAR_JOUR, PUBLICITE_ACTIVEE,
  attenteLisible, chargerRegie, pubDisponible,
} from '../lib/pub';
import { Icone } from './Icone';

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
          <span><Icone nom="video" taille={22} /></span>
        </div>
        <div className="article-nom">{t('pub.recompenseTitre')}</div>
        <div className="article-detail">
          {t('pub.recompenseDetail', { ovas: String(OVAS_PAR_PUB) })}
        </div>
        <div className="article-detail" style={{ color: 'var(--craie-dim)' }}>
          {t('pub.restantes', { n: String(dispo.restantes), total: String(PUBS_PAR_JOUR) })}
        </div>
        {!PUBLICITE_ACTIVEE ? (
          <button type="button" className="btn fantome petit" disabled>Publicités bientôt disponibles</button>
        ) : consentement === 'non' ? (
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
              ? t('pub.regarder')
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
 * LE BOUTON D'UN COSMÉTIQUE QUI S'OBTIENT EN REGARDANT UNE PUB.
 *
 * ⚠️ Demande explicite : « fais en sorte que 3-4 cosmétiques on puisse les
 * obtenir en regardant une pub ». Il rejoue exactement la mécanique de la carte
 * récompensée — même modale, même compte à rebours, même quota quotidien — mais
 * la récompense est l'article, pas des Ovas. Fermer avant la fin ne débloque
 * rien et ne consomme pas le passage (`debloquerParPub` n'est appelée qu'au
 * bout du compte à rebours).
 *
 * ⚠️ ET ÇA RESTE DU COSMÉTIQUE. Règle 5 de `lib/pub.ts` : rien qui touche à la
 * difficulté ne se débloque par la pub — ici, un maillot et un casque.
 */
export function BoutonDeblocageParPub({ id, onDebloque }: { id: string; onDebloque?: () => void }) {
  const pubs = useGame((s) => s.pubs);
  const debloquer = useGame((s) => s.debloquerParPub);
  const consentement = useGame((s) => s.pubConsentement);
  const setConsentement = useGame((s) => s.setPubConsentement);
  const [ouverte, setOuverte] = useState(false);
  // La disponibilité dépend de l'heure : on rafraîchit tant que le bouton vit.
  const [, battement] = useState(0);
  useEffect(() => {
    const minuterie = setInterval(() => battement((n) => n + 1), 30_000);
    return () => clearInterval(minuterie);
  }, []);

  const dispo = pubDisponible(pubs);

  if (!PUBLICITE_ACTIVEE) return <button type="button" className="btn fantome petit" disabled>Publicités bientôt disponibles</button>;

  if (consentement === 'non') {
    return (
      <button type="button" className="btn fantome petit" onClick={() => setConsentement('oui')}>
        {t('pub.reactiver')}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn primaire petit"
        disabled={!dispo.possible}
        title={dispo.attente > 0 ? attenteLisible(dispo.attente) : undefined}
        onClick={(e) => { e.stopPropagation(); setOuverte(true); }}
      >
        {dispo.possible
          ? t('pub.debloquer')
          : dispo.restantes === 0
            ? t('pub.demain')
            : attenteLisible(dispo.attente)}
      </button>
      {ouverte && (
        <PubRecompensee
          onFermer={() => setOuverte(false)}
          /* La récompense n'est pas des Ovas ici, c'est l'article : le texte de
             l'encart maison doit dire la vérité. */
          texteMaison={t('pub.maisonTexteArticle')}
          onTerminee={() => { if (debloquer(id)) onDebloque?.(); setOuverte(false); }}
        />
      )}
    </>
  );
}

/**
 * ⚠️ CE QUI EST AFFICHÉ PENDANT L'ATTENTE DÉPEND DE CE QUI EST CONFIGURÉ.
 * L'identifiant AdSense du site est en dur (`CLIENT_PUB`, voir `lib/pub.ts`),
 * mais un bloc d'annonce a besoin EN PLUS d'un « slot » créé à la main dans la
 * console AdSense. Donc :
 * Cette modale reste toujours un encart MAISON. Une annonce display AdSense
 * ne doit pas être transformée en publicité récompensée. Un futur format
 * récompensé devra passer par l'API officielle pour jeux H5.
 *
 * ⚠️ ADSENSE NE FAIT PAS DE VIDÉO RÉCOMPENSÉE SUR UN SITE ORDINAIRE — c'est
 * AdMob / Ad Manager (« H5 games ») qui expose ce SDK. Ce qu'on fait ici est
 * donc une annonce display regardée pendant N secondes, pas un format
 * « rewarded » officiel. Le jour où un compte Ad Manager existe, c'est SON SDK
 * qui prend la place du contenu de cette modale, et rien d'autre ne bouge.
 *
 * ⚠️ ON PEUT FERMER À TOUT MOMENT. Une pub récompensée dont on ne peut pas
 * sortir, c'est exactement ce que le joueur a demandé d'éviter — fermer avant
 * la fin annule simplement la récompense.
 */
function PubRecompensee({
  onFermer, onTerminee, texteMaison = t('pub.maisonTexte'),
}: {
  onFermer: () => void; onTerminee: () => void;
  texteMaison?: string;
}) {
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
        <p className="aide">{texteMaison}</p>
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
