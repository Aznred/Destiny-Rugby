import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import {
  MODELES_GROQ,
  activiteIA,
  ecouterEtatIA,
  etatIA,
  reinitialiserActiviteIA,
} from '../lib/groq';
import type { Theme } from '../types';
import { LANGUES, nombre, t, tn } from '../lib/i18n';
import { useModalDialog } from '../lib/useModalDialog';

// Les trois ambiances. `apercu` est le dégradé montré sur la pastille — il
// reprend exactement les deux extrémités de la rampe de fond du thème.
const AMBIANCES: { id: Theme; cle: string; apercu: string }[] = [
  { id: 'vert', cle: 'reg.pelouse', apercu: 'linear-gradient(135deg,#08160f,#237a44)' },
  { id: 'bleu', cle: 'reg.nuit', apercu: 'linear-gradient(135deg,#060f1c,#1f5c9c)' },
  { id: 'rouge', cle: 'reg.grenat', apercu: 'linear-gradient(135deg,#1a0709,#8f2733)' },
];

interface Props {
  onFermer: () => void;
}

/** « dans 4 min », « dans 35 s » — la reprise du quota, en clair. */
function delaiLisible(reprise: number | undefined): string {
  const restant = Math.max(0, (reprise ?? 0) - Date.now());
  const minutes = Math.ceil(restant / 60_000);
  return minutes > 1
    ? t('reg.iaRepriseMinutes', { n: String(minutes) })
    : t('reg.iaRepriseBientot');
}

export function Reglages({ onFermer }: Props) {
  const iaActivee = useGame((s) => s.iaActivee);
  const theme = useGame((s) => s.theme);
  const langue = useGame((s) => s.langue);
  const setLangue = useGame((s) => s.setLangue);
  const setTheme = useGame((s) => s.setTheme);
  const setIAActivee = useGame((s) => s.setIAActivee);
  const tenorKey = useGame((s) => s.tenorKey);
  const setTenorKey = useGame((s) => s.setTenorKey);
  const groqKey = useGame((s) => s.groqKey);
  const setGroqKey = useGame((s) => s.setGroqKey);

  const [tenorLocal, setTenorLocal] = useState(tenorKey);
  const [groqLocal, setGroqLocal] = useState(groqKey);
  const [langueLocale, setLangueLocale] = useState(langue);
  const [themeLocal, setThemeLocal] = useState(theme);
  // ⚠️ ABONNEMENT, PAS LECTURE. L'état de l'IA change tout seul quand le quota
  // se libère : sans abonnement, le badge resterait figé sur « quota épuisé »
  // alors que le jeu est déjà reparti sur Groq.
  const etat = useSyncExternalStore(ecouterEtatIA, etatIA, etatIA);
  const { overlayRef, dialogRef } = useModalDialog(onFermer);
  const [, rafraichir] = useState(0);
  const activite = activiteIA();
  const remettreAZero = () => { reinitialiserActiviteIA(); rafraichir((n) => n + 1); };

  const enregistrer = () => {
    setTenorKey(tenorLocal.trim());
    setGroqKey(groqLocal.trim());
    setLangue(langueLocale);
    setTheme(themeLocal);
    onFermer();
  };

  return createPortal(
    <div ref={overlayRef} className="overlay" onClick={onFermer}>
      <motion.div
        ref={dialogRef}
        className="carte modale"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reglages-titre"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22 }}
      >
        <div className="eyebrow">{t('reg.eyebrow')}</div>
        <h2 id="reglages-titre">{t('reg.titre')}</h2>
        <p className="aide">{t('reg.iaAide')}</p>

        {/* ⚠️ LE QUOTA N'EST PAS UNE PANNE. C'est le SEUL endroit du jeu où
            l'état de l'IA s'affiche : ailleurs, quand elle n'est pas
            disponible, le jeu bascule sur son contenu pré-écrit sans un mot
            (demande explicite) et repart tout seul dès que le quota revient. */}
        <div className="champ ia-locale">
          <label>{t('reg.iaMJ')}</label>
          <div className="ia-locale-entete">
            <div>
              <strong>Groq</strong>
              <span> · {etat.modele ?? MODELES_GROQ[0]}</span>
            </div>
            <span className={`badge-cle ${iaActivee && etat.disponible ? 'ok' : 'ko'}`}>
              {!iaActivee
                ? t('reg.iaInactive')
                : etat.disponible
                  ? `✓ ${t('reg.iaPrete')}`
                  : etat.quotaEpuise
                    ? t('reg.iaQuota')
                    : t('reg.iaSansCle')}
            </span>
          </div>

          <p className="aide">
            {!iaActivee
              ? t('reg.iaDesactiveeAide')
              : etat.quotaEpuise
                ? `${t('reg.iaQuotaAide')} ${delaiLisible(etat.reprise)}`
                : etat.disponible
                  ? t('reg.iaPreteAide')
                  : t('reg.iaSansCleAide')}
          </p>

          <div className="ia-actions">
            {iaActivee ? (
              <button type="button" className="btn fantome" onClick={() => setIAActivee(false)}>
                {t('reg.iaDesactiver')}
              </button>
            ) : (
              <button type="button" className="btn primaire" onClick={() => setIAActivee(true)}>
                {t('reg.iaActiver')}
              </button>
            )}
          </div>

          {activite.appels > 0 && (
            <div className="activite-ia">
              <span><b>{nombre(activite.appels)}</b> {tn('reg.appels', activite.appels)}</span>
              <span><b>{nombre(activite.entree)}</b> {t('reg.envoyes')}</span>
              <span><b>{nombre(activite.sortie)}</b> {t('reg.recus')}</span>
              <button type="button" className="btn fantome mini" onClick={remettreAZero}>
                {t('reg.remiseAZero')}
              </button>
            </div>
          )}
        </div>

        {/* La clé du site suffit à tout le monde. Celle-ci n'est là que pour
            qui veut son propre quota — elle prend alors la priorité. */}
        <div className="champ">
          <label htmlFor="groq">{t('reg.groq')}</label>
          <input
            id="groq"
            type="password"
            value={groqLocal}
            placeholder={t('reg.groqPlaceholder')}
            onChange={(e) => setGroqLocal(e.target.value)}
          />
          <p className="aide">{t('reg.groqAide')}</p>
        </div>

        {/* GIFs dans les publications de L'Ovale. Facultatif : sans cette clé,
            les posts s'illustrent quand même avec des photos libres. */}
        <div className="champ">
          <label htmlFor="tenor">{t('reg.tenor')}</label>
          <input
            id="tenor"
            type="password"
            value={tenorLocal}
            placeholder={t('reg.tenorPlaceholder')}
            onChange={(e) => setTenorLocal(e.target.value)}
          />
          <p className="aide">{t('reg.tenorAide')}</p>
        </div>

        {/* ⚠️ LA LANGUE CHANGE TOUT, pas seulement les boutons. Le Maître du
            Jeu, les situations, les tweets et les messages privés sont écrits à
            l'exécution : on demande au modèle d'écrire directement dans cette
            langue (`consigneDeLangue`), plutôt que de traduire après coup. */}
        <div className="champ">
          <label htmlFor="langue">{t('reg.langue')}</label>
          <div className="choix-langue">
            {LANGUES.map((l) => (
              <button
                key={l.id}
                type="button"
                className={langueLocale === l.id ? 'actif' : ''}
                onClick={() => setLangueLocale(l.id)}
                aria-pressed={langueLocale === l.id}
                lang={l.id}
              >
                <span className={`fi fi-${l.drapeau}`} aria-hidden="true" />
                {l.nom}
              </button>
            ))}
          </div>
          <p className="aide">{t('reg.langueAide')}</p>
        </div>

        {/* ⚠️ L'AMBIANCE (demande explicite). Elle ne repeint que le FOND :
            l'or, le cuir et la craie ne bougent pas, sinon on perdrait
            l'identité du jeu. Le changement est immédiat — le CSS fait tout. */}
        <div className="champ">
          <label>{t('reg.ambiance')}</label>
          <div className="choix-theme">
            {AMBIANCES.map((a) => (
              <button
                key={a.id}
                type="button"
                className={themeLocal === a.id ? 'actif' : ''}
                onClick={() => setThemeLocal(a.id)}
                aria-pressed={themeLocal === a.id}
                title={t(a.cle)}
              >
                <span className="pastille-theme" style={{ background: a.apercu }} />
                {t(a.cle)}
              </button>
            ))}
          </div>
          <p className="aide">
            {t('reg.ambianceAide')}
          </p>
        </div>

        {/* ⚠️ LE CHOIX DU RYTHME A ÉTÉ RETIRÉ (demande explicite : « il faut pas
            qu'on puisse simuler la saison »). Le mode « saison par saison »
            résumait l'année en un tirage de fin d'exercice : les compteurs
            affichaient « 2 matchs, 0 essai » quoi qu'il arrive, la forme ne
            bougeait pas, et aucune sélection n'était comptée. Pour avancer
            vite, on clique une DATE dans le calendrier (📊 Résultats) : les
            semaines sont réellement jouées, une par une. */}
        <div className="champ">
          <label>{t('reg.rythme')}</label>
          <p className="aide">
            📅 {t('reg.rythmeAide')}
          </p>
        </div>

        {/* ⚠️ LE RÉGLAGE DES TOUCHES A ÉTÉ RETIRÉ DE CET ÉCRAN, et ce n'est
            pas un oubli : le match ne se pilote plus au joystick ni au
            clavier. Il se lit et il se choisit (voir components/MatchDirect),
            et proposer de réassigner « plaquer » à une touche qui ne fait plus
            rien serait un réglage qui ment. Le composant reste sur le disque
            le temps qu'on décide du sort de l'ancien écran de match. */}

        <details className="tuto">
          <summary>📘 {t('reg.tutoriel')}</summary>
          <p className="aide">{t('reg.tutorielAide')}</p>
        </details>

        <div className="note-sans-cle">
          🎮 {t('reg.sansCleAide')}
        </div>

        <div className="rangee-fin">
          <button className="btn fantome" onClick={onFermer}>
            {t('reg.fermer')}
          </button>
          <button className="btn primaire" onClick={enregistrer}>
            {t('reg.enregistrer')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
