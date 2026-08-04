import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { MODELE_DEFAUT, CLE_ENV, consoGroq, reinitialiserConsoGroq } from '../lib/groq';
import type { Theme } from '../types';
import { LANGUES, t } from '../lib/i18n';

const MODELES = [
  { id: 'llama-3.3-70b-versatile', nom: 'Llama 3.3 70B (recommandé)' },
  { id: 'llama-3.1-8b-instant', nom: 'Llama 3.1 8B (rapide)' },
  { id: 'openai/gpt-oss-120b', nom: 'GPT-OSS 120B' },
];

// Les trois ambiances. `apercu` est le dégradé montré sur la pastille — il
// reprend exactement les deux extrémités de la rampe de fond du thème.
const AMBIANCES: { id: Theme; nom: string; apercu: string }[] = [
  { id: 'vert', nom: 'Pelouse', apercu: 'linear-gradient(135deg,#08160f,#237a44)' },
  { id: 'bleu', nom: 'Nuit', apercu: 'linear-gradient(135deg,#060f1c,#1f5c9c)' },
  { id: 'rouge', nom: 'Grenat', apercu: 'linear-gradient(135deg,#1a0709,#8f2733)' },
];

interface Props {
  onFermer: () => void;
}

export function Reglages({ onFermer }: Props) {
  const groqKey = useGame((s) => s.groqKey);
  const modele = useGame((s) => s.modele);
  const rythme = useGame((s) => s.rythme);
  const setRythme = useGame((s) => s.setRythme);
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
        <div className="eyebrow">Moteur du Maître du Jeu</div>
        <h2>Connexion à Groq</h2>
        {CLE_ENV ? (
          <p className="aide">
            ✅ Une clé est <b>déjà fournie par le site</b> — tu n'as rien à faire,
            joue directement&nbsp;! Tu peux éventuellement saisir ta propre clé
            ci-dessous pour utiliser ton quota personnel.
          </p>
        ) : (
          <p className="aide">
            Le Maître du Jeu tourne sur l'API <b>Groq</b> (gratuite). Colle ta clé
            ci-dessous&nbsp;: elle est stockée <b>uniquement dans ton navigateur</b> et
            n'est jamais envoyée ailleurs. Obtiens-en une sur{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
              console.groq.com/keys
            </a>.
          </p>
        )}

        <div className="champ">
          <label htmlFor="cle">Clé API Groq</label>
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
              <span className="badge-cle ko">Aucune clé</span>
            ) : valide ? (
              <span className="badge-cle ok">✓ Format valide</span>
            ) : (
              <span className="badge-cle ko">Format inattendu (attendu : gsk_…)</span>
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
                {m.nom}
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
              <span><b>{conso.appels}</b> appel{conso.appels > 1 ? 's' : ''}</span>
              <span><b>{conso.entree.toLocaleString('fr-FR')}</b> tokens envoyés</span>
              <span><b>{conso.sortie.toLocaleString('fr-FR')}</b> reçus</span>
              <button type="button" className="btn fantome mini" onClick={remettreAZero}>
                Remettre à zéro
              </button>
            </div>
            <p className="aide">
              Une semaine de jeu coûte <b>un seul appel</b> pour tout L’Ovale (fil et
              commentaires réunis) : les comptes à suivre, eux, sortent de l’annuaire du
              jeu et ne coûtent rien.
            </p>
          </div>
        )}

        {/* GIFs dans les publications de L'Ovale. Facultatif : sans cette clé,
            les posts s'illustrent quand même avec des photos libres. */}
        <div className="champ">
          <label htmlFor="tenor">Clé Tenor (GIFs) — facultatif</label>
          <input
            id="tenor"
            type="password"
            value={tenorKey}
            placeholder="AIza… (laisse vide pour des photos libres)"
            onChange={(e) => setTenorKey(e.target.value.trim())}
          />
          <p className="aide">
            Sans clé, la recherche d’images de L’Ovale utilise une banque libre (LoremFlickr)
            et il n’y a pas de GIF animé. Une clé Tenor gratuite s’obtient sur Google Cloud.
          </p>
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
                title={a.nom}
              >
                <span className="pastille-theme" style={{ background: a.apercu }} />
                {a.nom}
              </button>
            ))}
          </div>
          <p className="aide">
            {t('reg.ambianceAide')}
          </p>
        </div>

        <div className="champ">
          <label>{t('reg.rythme')}</label>
          <div className="choix-rythme">
            <button
              type="button"
              className={rythme === 'semaine' ? 'actif' : ''}
              onClick={() => setRythme('semaine')}
            >
              📅 Journée par journée
              <span>Le vrai calendrier, d’août à juin : chaque match se joue, avec sa note.</span>
            </button>
            <button
              type="button"
              className={rythme === 'saison' ? 'actif' : ''}
              onClick={() => setRythme('saison')}
            >
              ⏩ Saison par saison
              <span>Pour avancer vite : la saison entière est simulée d’un bloc.</span>
            </button>
          </div>
        </div>

        <details className="tuto">
          <summary>📘 Tutoriel : obtenir et mettre ma clé (2 min, gratuit)</summary>
          <ol className="tuto-etapes">
            <li>Va sur <a href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a> et crée un compte (Google/GitHub, gratuit).</li>
            <li>Dans le menu de gauche, ouvre <b>« API Keys »</b>.</li>
            <li>Clique <b>« Create API Key »</b>, donne-lui un nom (ex. « Destiny Rugby »).</li>
            <li>Copie la clé affichée (elle commence par <code>gsk_</code>) — tu ne pourras plus la revoir ensuite.</li>
            <li>Reviens ici, colle-la dans le champ ci-dessus et clique <b>Enregistrer</b>. C'est prêt&nbsp;!</li>
          </ol>
        </details>

        <div className="note-sans-cle">
          🎮 <b>Pas de clé ?</b> Tu peux jouer quand même : utilise « 📖 Vivre une
          situation » et « 🎲 Évènement aléatoire » dans ta carrière — des
          situations à choix et des évènements arrivent <b>sans IA</b>.
        </div>

        <div className="rangee-fin">
          <button className="btn fantome" onClick={onFermer}>
            Annuler
          </button>
          <button className="btn primaire" onClick={enregistrer}>
            Enregistrer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
