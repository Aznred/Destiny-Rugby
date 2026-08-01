import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame, MAX_PAR_SAISON } from '../store/useGame';
import { PanneauJoueur } from '../components/PanneauJoueur';
import { ClassementLateral } from '../components/ClassementLateral';
import { demanderAuMJ, CLE_ENV } from '../lib/groq';
import { genererSituation, scenarioDuPool } from '../lib/ia';
import { ATTRIBUTS_LABELS } from '../data/rugby';
import type { EntreeJournal } from '../types';

interface Props {
  onReglages: () => void;
}

const IDEES = [
  "Je m'entraîne dur au plaquage toute la semaine.",
  "Je demande plus de temps de jeu à mon entraîneur.",
  "Je soigne mon hygiène de vie et ma récupération.",
  "Je tente une action décisive lors du prochain match.",
];

export function Carriere({ onReglages }: Props) {
  const joueur = useGame((s) => s.joueur);
  const journal = useGame((s) => s.journal);
  const groqKey = useGame((s) => s.groqKey);
  const modele = useGame((s) => s.modele);
  const appliquerReponse = useGame((s) => s.appliquerReponse);
  const evenementAleatoire = useGame((s) => s.evenementAleatoire);
  const poserSituation = useGame((s) => s.poserSituation);
  const resoudreChoix = useGame((s) => s.resoudreChoix);
  const scenarioActif = useGame((s) => s.scenarioActif);
  const compteurs = useGame((s) => s.compteurs);
  const cle = groqKey || CLE_ENV;

  const [texte, setTexte] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choix, setChoix] = useState<string[]>([]);
  const finRef = useRef<HTMLDivElement>(null);

  const historique = useMemo(
    () =>
      journal
        .filter((e) => e.role === 'joueur' || e.role === 'mj')
        .map((e) => ({
          role: (e.role === 'joueur' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: e.texte,
        })),
    [journal],
  );

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [journal, enCours]);

  if (!joueur) return null;

  const envoyer = async (action: string) => {
    const contenu = action.trim();
    if (!contenu || enCours) return;
    if (!cle) {
      setErreur('Ajoute d’abord ta clé Groq dans les réglages (⚙️) pour réveiller le Maître du Jeu.');
      onReglages();
      return;
    }
    setErreur(null);
    setTexte('');
    setChoix([]);
    setEnCours(true);
    try {
      const reponse = await demanderAuMJ({
        cle,
        modele,
        joueur,
        historique,
        action: contenu,
      });
      appliquerReponse(reponse, contenu);
      setChoix(reponse.choix ?? []);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue.');
      // On garde l'action dans la barre pour réessayer
      setTexte(contenu);
    } finally {
      setEnCours(false);
    }
  };

  // BOUCLE UNIFIÉE (lot 6) : une situation par itération. Écrite par Groq si
  // une clé est là — sinon tirée du pool pré-écrit. Même bouton, même rendu.
  const vivreUneSituation = async () => {
    if (enCours || scenarioActif) return;
    if (!cle) {
      poserSituation(scenarioDuPool());
      return;
    }
    setErreur(null);
    setEnCours(true);
    try {
      const derniere = [...journal].reverse().find((e) => e.role !== 'joueur');
      const sc = await genererSituation({
        cle,
        modele,
        joueur,
        contexte: derniere ? `${derniere.titre ?? ''} — ${derniere.texte}`.slice(0, 300) : undefined,
      });
      poserSituation(sc);
    } catch {
      // L'IA a flanché : le jeu ne s'arrête jamais pour autant.
      poserSituation(scenarioDuPool());
    } finally {
      setEnCours(false);
    }
  };

  const gererClavier = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      envoyer(texte);
    }
  };

  const suggestions = choix.length ? choix : IDEES;

  return (
    // ⚠️ Trois colonnes qui tiennent DANS l'écran : la page elle-même ne
    // défile jamais, chaque colonne défile de son côté (voir App.css).
    <section className="carriere">
      <PanneauJoueur joueur={joueur} />

      <div className="carte jeu">
        <div className="journal">
          <AnimatePresence initial={false}>
            {journal.map((e) => (
              <Message key={e.id} entree={e} />
            ))}
          </AnimatePresence>

          {enCours && (
            <div className="msg mj">
              <div className="bulle">
                <div className="reflexion">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        {erreur && <div className="alerte" style={{ margin: '0 1.2rem' }}>{erreur}</div>}

        {scenarioActif ? (
          <div className="scenario-choix">
            <div className="scenario-consigne">👉 Fais ton choix :</div>
            {scenarioActif.choix.map((c, i) => (
              <button key={i} className="choix-scenario" onClick={() => resoudreChoix(i)}>
                {c.texte}
              </button>
            ))}
          </div>
        ) : (
          !enCours && (
            <div className="choix-rapides" style={{ padding: '0 1.2rem' }}>
              <button
                className="evt-aleatoire"
                onClick={vivreUneSituation}
                disabled={compteurs.situations >= MAX_PAR_SAISON}
                title={
                  compteurs.situations >= MAX_PAR_SAISON
                    ? 'Limite atteinte — passe à la saison suivante'
                    : cle
                      ? 'Une situation écrite pour toi par le Maître du Jeu'
                      : 'Une situation à choix, sans IA'
                }
              >
                📖 Vivre une situation ({compteurs.situations}/{MAX_PAR_SAISON})
              </button>
              <button
                className="evt-aleatoire"
                onClick={evenementAleatoire}
                disabled={compteurs.evenements >= MAX_PAR_SAISON}
                title={compteurs.evenements >= MAX_PAR_SAISON ? 'Limite atteinte — passe à la saison suivante' : 'Un évènement imprévu'}
              >
                🎲 Évènement aléatoire ({compteurs.evenements}/{MAX_PAR_SAISON})
              </button>
              {suggestions.slice(0, 4).map((c, i) => (
                <button key={i} onClick={() => envoyer(c)}>{c}</button>
              ))}
            </div>
          )
        )}

        <div className="saisie">
          <textarea
            placeholder={scenarioActif ? 'Réponds au choix ci-dessus…' : 'Décris ton action… (ex. « Je négocie une prolongation de contrat »)'}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={gererClavier}
            rows={1}
            disabled={enCours || !!scenarioActif}
          />
          <button
            className="btn primaire"
            onClick={() => envoyer(texte)}
            disabled={enCours || !!scenarioActif || !texte.trim()}
          >
            {enCours ? '…' : 'Jouer'}
          </button>
        </div>
      </div>

      {/* Le classement du championnat, en permanence sous les yeux. */}
      <ClassementLateral joueur={joueur} />
    </section>
  );
}

function Message({ entree }: { entree: EntreeJournal }) {
  return (
    <motion.div
      className={`msg ${entree.role}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bulle">
        {entree.titre && entree.role === 'mj' && (
          <div className="titre-evt">◆ {entree.titre}</div>
        )}
        {entree.titre && entree.role === 'systeme' && (
          <div className="titre-evt" style={{ color: 'var(--brume)' }}>{entree.titre}</div>
        )}
        {entree.texte}
        {entree.deltas && Object.keys(entree.deltas).length > 0 && (
          <div className="deltas">
            {Object.entries(entree.deltas).map(([k, v]) => (
              <span key={k} className={`delta ${v > 0 ? 'plus' : 'moins'}`}>
                {v > 0 ? '▲' : '▼'} {ATTRIBUTS_LABELS[k] ?? k} {v > 0 ? '+' : ''}
                {k === 'argent' ? `${v.toLocaleString('fr-FR')} €` : v}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
