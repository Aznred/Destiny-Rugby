import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { MODELE_DEFAUT, CLE_ENV, consoGroq, reinitialiserConsoGroq } from '../lib/groq';
import type { Theme } from '../types';
import { LANGUES, nombre, t, tn } from '../lib/i18n';

const MODELES = [
  { id: 'llama-3.3-70b-versatile', nom: 'Llama 3.3 70B', qualificatif: 'reg.recommande' },
  { id: 'llama-3.1-8b-instant', nom: 'Llama 3.1 8B', qualificatif: 'reg.rapide' },
  { id: 'openai/gpt-oss-120b', nom: 'GPT-OSS 120B', qualificatif: '' },
];

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
  const groqKey = useGame((s) => s.groqKey);
  const modele = useGame((s) => s.modele);
  const theme = useGame((s) => s.theme);
  const langue = useGame((s) => s.langue);
  const setLangue = useGame((s) => s.setLangue);
  const setTheme = useGame((s) => s.setTheme);
  const setGroqKey = useGame((s) => s.setGroqKey);
  const setModele = useGame((s) => s.setModele);
  const tenorKey = useGame((s) => s.tenorKey);
  const setTenorKey = useGame((s) => s.setTenorKey);

  const [cleLocale, setCleLocale] = useState(groqKey);
  const [voir, setVoir] = useState(false);
  // Le compteur vit dans un module : on le lit à l'ouverture du panneau, et on
  // force un rendu quand on le remet à zéro.
  const [, rafraichir] = useState(0);
  const conso = consoGroq();
  const remettreAZero = () => { reinitialiserConsoGroq(); rafraichir((n) => n + 1); };

  const valide = cleLocale.trim().startsWith('gsk_');

  const enregistrer = () => {
    setGroqKey(cleLocale.trim());
    onFermer();
  };

  return (
    <div className="overlay" onClick={onFermer}>
      <motion.div
        className="carte modale"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22 }}
      >
        <div className="eyebrow">{t('reg.eyebrow')}</div>
        <h2>{t('reg.titre')}</h2>
        {CLE_ENV ? (
          <p className="aide">
            ✅ {t('reg.cleFournie')}
          </p>
        ) : (
          <p className="aide">
            {t('reg.cleAide')} {' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
              console.groq.com/keys
            </a>.
          </p>
        )}

        <div className="champ">
          <label htmlFor="cle">{t('reg.cleApi')}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="cle"
              type={voir ? 'text' : 'password'}
              placeholder="gsk_..."
              value={cleLocale}
              onChange={(e) => setCleLocale(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className="btn fantome"
              type="button"
              onClick={() => setVoir((v) => !v)}
              style={{ padding: '0 1rem' }}
            >
              {voir ? '🙈' : '👁️'}
            </button>
          </div>
          <div style={{ marginTop: '0.6rem' }}>
            {cleLocale.trim() === '' ? (
              <span className="badge-cle ko">{t('reg.sansCle')}</span>
            ) : valide ? (
              <span className="badge-cle ok">✓ {t('reg.formatValide')}</span>
            ) : (
              <span className="badge-cle ko">{t('reg.formatInvalide')}</span>
            )}
          </div>
        </div>

        <div className="champ">
          <label htmlFor="modele">{t('reg.modele')}</label>
          <select
            id="modele"
            value={modele || MODELE_DEFAUT}
            onChange={(e) => setModele(e.target.value)}
          >
            {MODELES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}{m.qualificatif ? ` (${t(m.qualificatif)})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ⚠️ LA CONSOMMATION, SOUS LES YEUX. La clé du site est partagée par
            tous les joueurs : on ne peut pas économiser ce qu'on ne mesure pas.
            Compteur de SESSION (lib/groq.ts), remis à zéro au rechargement. */}
        {conso.appels > 0 && (
          <div className="champ">
            <label>{t('reg.conso')}</label>
            <div className="conso-groq">
              <span><b>{nombre(conso.appels)}</b> {tn('reg.appels', conso.appels)}</span>
              <span><b>{nombre(conso.entree)}</b> {t('reg.envoyes')}</span>
              <span><b>{nombre(conso.sortie)}</b> {t('reg.recus')}</span>
              <button type="button" className="btn fantome mini" onClick={remettreAZero}>
                {t('reg.remiseAZero')}
              </button>
            </div>
            <p className="aide">{t('reg.consoAide')}</p>
          </div>
        )}

        {/* GIFs dans les publications de L'Ovale. Facultatif : sans cette clé,
            les posts s'illustrent quand même avec des photos libres. */}
        <div className="champ">
          <label htmlFor="tenor">{t('reg.tenor')}</label>
          <input
            id="tenor"
            type="password"
            value={tenorKey}
            placeholder={t('reg.tenorPlaceholder')}
            onChange={(e) => setTenorKey(e.target.value.trim())}
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
                className={langue === l.id ? 'actif' : ''}
                onClick={() => setLangue(l.id)}
                aria-pressed={langue === l.id}
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
                className={theme === a.id ? 'actif' : ''}
                onClick={() => setTheme(a.id)}
                aria-pressed={theme === a.id}
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
    </div>
  );
}
