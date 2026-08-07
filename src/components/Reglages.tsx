import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import {
  MODELE_DEFAUT,
  MEMOIRE_MODELE_MO,
  activiteIALocale,
  chargerIALocale,
  dechargerIALocale,
  ecouterEtatIALocale,
  etatIALocale,
  iaLocaleCompatible,
  messageErreurIALocale,
  modeleIALocaleEnCache,
  reinitialiserActiviteIALocale,
  supprimerIALocale,
} from '../lib/iaLocale';
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

export function Reglages({ onFermer }: Props) {
  const iaLocaleActivee = useGame((s) => s.iaLocaleActivee);
  const theme = useGame((s) => s.theme);
  const langue = useGame((s) => s.langue);
  const setLangue = useGame((s) => s.setLangue);
  const setTheme = useGame((s) => s.setTheme);
  const setIALocaleActivee = useGame((s) => s.setIALocaleActivee);
  const tenorKey = useGame((s) => s.tenorKey);
  const setTenorKey = useGame((s) => s.setTenorKey);

  const [tenorLocal, setTenorLocal] = useState(tenorKey);
  const [langueLocale, setLangueLocale] = useState(langue);
  const [themeLocal, setThemeLocal] = useState(theme);
  const [modeleEnCache, setModeleEnCache] = useState(false);
  const [operationIA, setOperationIA] = useState(false);
  const [erreurIA, setErreurIA] = useState<string | null>(null);
  const etatIA = useSyncExternalStore(ecouterEtatIALocale, etatIALocale, etatIALocale);
  const { overlayRef, dialogRef } = useModalDialog(onFermer);
  const [, rafraichir] = useState(0);
  const activite = activiteIALocale();
  const remettreAZero = () => { reinitialiserActiviteIALocale(); rafraichir((n) => n + 1); };

  useEffect(() => {
    let actif = true;
    void modeleIALocaleEnCache()
      .then((present) => { if (actif) setModeleEnCache(present); })
      .catch(() => undefined);
    return () => { actif = false; };
  }, [etatIA.phase]);

  const activerIA = async () => {
    setErreurIA(null);
    setOperationIA(true);
    setIALocaleActivee(true);
    try {
      await chargerIALocale();
      setModeleEnCache(true);
    } catch (cause) {
      setIALocaleActivee(false);
      setErreurIA(messageErreurIALocale(cause));
    } finally {
      setOperationIA(false);
    }
  };

  const desactiverIA = async () => {
    setIALocaleActivee(false);
    setOperationIA(true);
    await dechargerIALocale();
    setOperationIA(false);
  };

  const effacerIA = async () => {
    setIALocaleActivee(false);
    setOperationIA(true);
    setErreurIA(null);
    try {
      await supprimerIALocale();
      setModeleEnCache(false);
    } catch (cause) {
      setErreurIA(messageErreurIALocale(cause));
    } finally {
      setOperationIA(false);
    }
  };

  const enregistrer = () => {
    setTenorKey(tenorLocal.trim());
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

        <div className="champ ia-locale">
          <label>{t('reg.iaLocale')}</label>
          <div className="ia-locale-entete">
            <div>
              <strong>Llama 3.2 1B</strong>
              <span>{MODELE_DEFAUT.includes('q4') ? ' · 4-bit' : ''} · {nombre(MEMOIRE_MODELE_MO)} Mo</span>
            </div>
            <span className={`badge-cle ${etatIA.phase === 'prete' && iaLocaleActivee ? 'ok' : 'ko'}`}>
              {etatIA.phase === 'prete' && iaLocaleActivee
                ? `✓ ${t('reg.iaPrete')}`
                : etatIA.phase === 'chargement'
                  ? t('reg.iaChargement')
                  : iaLocaleCompatible()
                    ? t('reg.iaInactive')
                    : t('reg.iaIncompatible')}
            </span>
          </div>

          {etatIA.phase === 'chargement' && (
            <div className="ia-progression" aria-live="polite">
              <div className="ia-progression-piste">
                <span style={{ width: `${Math.round(etatIA.progression * 100)}%` }} />
              </div>
              <b>{Math.round(etatIA.progression * 100)} %</b>
            </div>
          )}

          {(erreurIA || etatIA.erreur) && (
            <p className="alerte">{erreurIA || etatIA.erreur}</p>
          )}

          <p className="aide">
            {modeleEnCache ? t('reg.iaCache') : t('reg.iaTelechargement')}
          </p>
          <div className="ia-actions">
            {iaLocaleActivee ? (
              <button type="button" className="btn fantome" disabled={operationIA} onClick={() => void desactiverIA()}>
                {t('reg.iaDesactiver')}
              </button>
            ) : (
              <button
                type="button"
                className="btn primaire"
                disabled={operationIA || !iaLocaleCompatible()}
                onClick={() => void activerIA()}
              >
                {modeleEnCache ? t('reg.iaActiver') : t('reg.iaTelecharger')}
              </button>
            )}
            {modeleEnCache && (
              <button type="button" className="btn fantome" disabled={operationIA} onClick={() => void effacerIA()}>
                {t('reg.iaEffacer')}
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
