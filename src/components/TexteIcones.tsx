import { Icone, type NomIcone } from './Icone';
import type { ReactNode } from 'react';

const ICONE: Record<string, NomIcone> = {
  '🏉': 'ballon', '🎯': 'cible', '❌': 'croix', '💥': 'eclair', '⚡': 'eclair',
  '🔒': 'verrou', '🌀': 'pousse', '🙌': 'equipe', '🚂': 'equipe', '🦶': 'ballon',
  '⚖️': 'sifflet', '🟨': 'carton', '🟥': 'carton', '🔄': 'repost', '🔔': 'alerte',
  '🫴': 'alerte', '✅': 'ok', '▶️': 'fleche-droite', '⏸️': 'stop', '⏭️': 'fleche-droite',
  '⏳': 'chrono', '🚑': 'soin', '📣': 'journal', '📋': 'dossier', '💢': 'eclair',
  '👟': 'ballon', '🏃': 'joueur', '🫁': 'coeur', '👁️': 'oeil', '🎁': 'cadeau',
  '🛡️': 'bouclier', '💨': 'eclair', '🥊': 'pousse', '✋': 'stop', '🚶': 'joueur',
  '↩️': 'repost', '💪': 'halteres', '🤝': 'poignee', '⬅️': 'fleche-droite',
  '➡️': 'fleche-droite', '☂️': 'ballon', '🐂': 'pousse', '🤲': 'ballon',
  '🕳️': 'cible', '🪁': 'ballon', '🤿': 'ballon', '🦅': 'eclair', '🐘': 'pousse',
  '🐛': 'equipe', '🙋': 'joueur', '🤸': 'joueur', '⬆️': 'fleche-droite',
  '🪝': 'pousse', '🗯️': 'journal', '⏱️': 'chrono', '⏩': 'eclair',
};
const MARQUEURS = Object.keys(ICONE).sort((a, b) => b.length - a.length);

export function IconeEmoji({ emoji, taille = 16 }: { emoji: string; taille?: number }) {
  return <Icone nom={ICONE[emoji] ?? 'eclair'} taille={taille} />;
}

/** Les commentaires du moteur peuvent contenir d'anciens marqueurs emoji. */
export function TexteIcones({ texte }: { texte: string }) {
  const morceaux: ReactNode[] = [];
  let reste = texte;
  let numero = 0;
  while (reste.length) {
    const index = MARQUEURS.reduce((meilleur, marqueur) => {
      const trouve = reste.indexOf(marqueur);
      return trouve >= 0 && (meilleur < 0 || trouve < meilleur) ? trouve : meilleur;
    }, -1);
    if (index < 0) { morceaux.push(reste); break; }
    if (index) morceaux.push(reste.slice(0, index));
    const marqueur = MARQUEURS.find(m => reste.startsWith(m, index))!;
    morceaux.push(<IconeEmoji key={numero++} emoji={marqueur} taille={14} />);
    reste = reste.slice(index + marqueur.length);
  }
  return <>{morceaux}</>;
}
