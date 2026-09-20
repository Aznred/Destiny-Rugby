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
import { Icone } from './Icone';
import { usePreferencesInterface } from '../store/preferencesInterface';

// Les huit ambiances. `apercu` est le dégradé montré sur la pastille — il
// reprend exactement les deux extrémités de la rampe de fond du thème.
const AMBIANCES: { id: Theme; cle: string; apercu: string }[] = [
  { id: 'vert', cle: 'reg.pelouse', apercu: 'linear-gradient(135deg,#08160f,#237a44)' },
  { id: 'bleu', cle: 'reg.nuit', apercu: 'linear-gradient(135deg,#060f1c,#1f5c9c)' },
  { id: 'rouge', cle: 'reg.grenat', apercu: 'linear-gradient(135deg,#1a0709,#8f2733)' },
  { id: 'violet', cle: 'reg.violet', apercu: 'linear-gradient(135deg,#130a23,#6d38a5)' },
  { id: 'turquoise', cle: 'reg.turquoise', apercu: 'linear-gradient(135deg,#041716,#18766f)' },
  { id: 'cuivre', cle: 'reg.cuivre', apercu: 'linear-gradient(135deg,#1b0d06,#92502b)' },
  { id: 'rose', cle: 'reg.rose', apercu: 'linear-gradient(135deg,#190812,#8c2b68)' },
  { id: 'carbone', cle: 'reg.carbone', apercu: 'linear-gradient(135deg,#0c0e12,#4b5568)' },
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
  const musique = usePreferencesInterface(s => s.musique);
  const setMusique = usePreferencesInterface(s => s.setMusique);
  const animationsMenus = usePreferencesInterface(s => s.animationsMenus);
  const setAnimationsMenus = usePreferencesInterface(s => s.setAnimationsMenus);
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

  // ⚠️ IL N'Y A PLUS DE BROUILLON POUR LA LANGUE NI POUR L'AMBIANCE (demande
  // explicite : « fais que les changements de paramètres s'effectuent sans
  // enregistrer »). Un panneau de préférences n'est pas un formulaire : on
  // clique sur « English » pour voir le jeu en anglais, pas pour armer une
  // intention qu'il faudra confirmer plus bas. Les deux boutons lisent donc
  // directement le store et écrivent dedans.
  //
  // Seules les DEUX CLÉS gardent un état local, et c'est nécessaire : ce sont
  // des champs de saisie, et publier à chaque frappe ferait passer « g », « gs »,
  // « gsk »… pour des clés d'API. Elles sont validées à la sortie du champ et,
  // par sécurité, à la fermeture du panneau — Échap et le clic à l'extérieur
  // compris.
  const [tenorLocal, setTenorLocal] = useState(tenorKey);
  const [groqLocal, setGroqLocal] = useState(groqKey);
  // ⚠️ ABONNEMENT, PAS LECTURE. L'état de l'IA change tout seul quand le quota
  // se libère : sans abonnement, le badge resterait figé sur « quota épuisé »
  // alors que le jeu est déjà reparti sur Groq.
  const etat = useSyncExternalStore(ecouterEtatIA, etatIA, etatIA);

  const validerLesCles = () => {
    const groq = groqLocal.trim();
    const tenor = tenorLocal.trim();
    if (groq !== groqKey) setGroqKey(groq);
    if (tenor !== tenorKey) setTenorKey(tenor);
  };
  const fermer = () => { validerLesCles(); onFermer(); };

  const { overlayRef, dialogRef } = useModalDialog(fermer);
  const [, rafraichir] = useState(0);
  const activite = activiteIA();
  const remettreAZero = () => { reinitialiserActiviteIA(); rafraichir((n) => n + 1); };

  return createPortal(
    <div ref={overlayRef} className="overlay" onClick={fermer}>
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
        <div className="champ reglages-confort">
          <label><input type="checkbox" checked={musique} onChange={e => setMusique(e.target.checked)} /> Musique d’ambiance</label>
          <p className="aide">Désactiver arrête le lecteur immédiatement. Ton choix est conservé.</p>
          <label><input type="checkbox" checked={animationsMenus} onChange={e => setAnimationsMenus(e.target.checked)} /> Effets décoratifs des menus</label>
          <p className="aide">Désactivés par défaut pour une navigation plus réactive. Les animations du match restent actives.</p>
        </div>
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
                  ? t('reg.iaPrete')
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
            onBlur={validerLesCles}
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
            onBlur={validerLesCles}
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
            <Icone nom="calendrier" taille={15} /> {t('reg.rythmeAide')}
          </p>
        </div>

        {/* ⚠️ LE RÉGLAGE DES TOUCHES DU MATCH A ÉTÉ RETIRÉ, ET IL NE DOIT PAS
            REVENIR TANT QU'ON NE PILOTE PAS. Il y avait ici une table de six
            commandes réassignables (quatre directions, sprint, action du
            moment) plus les gestes. Le match ne se pilote plus : « on ne fait
            que les choix, on ne bouge pas le joueur ». Les cartes de décision
            se jouent aux chiffres 1-4, qui sont écrits dessus et qu'on ne
            réassigne pas. Un panneau de réglage pour des touches qui n'existent
            plus, c'est pire qu'une fonction manquante : c'est un mensonge. */}

        <details className="tuto">
          <summary><Icone nom="livre" taille={16} /> {t('reg.tutoriel')}</summary>
          <p className="aide">{t('reg.tutorielAide')}</p>
        </details>

        <div className="note-sans-cle">
          <Icone nom="sifflet" taille={15} /> {t('reg.sansCleAide')}
        </div>

        {/* ⚠️ IL N'Y A PLUS DE BOUTON « ENREGISTRER », et ce n'est pas un oubli.
            Il ne servait plus rien : la langue, l'ambiance, l'IA et les clés
            s'appliquent au moment où on y touche. Le garder aurait été pire que
            l'enlever — un bouton qui ne fait rien laisse croire qu'on peut
            encore annuler. */}
        <div className="rangee-fin">
          <button className="btn primaire" onClick={fermer}>
            {t('reg.fermer')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
