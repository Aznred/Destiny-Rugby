import enregistrements from '../data/commentairesAudio.json';

export interface ActionCommentee { texte: string; type: string; minute: number; seconde?: number; points?: number }
export type FamilleCommentaireAudio = keyof typeof enregistrements;
export function familleCommentaireAudio(action: ActionCommentee): FamilleCommentaireAudio | undefined {
  const texte = action.texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  switch (action.type) {
    case 'essai': return 'ScoreTryGeneric';
    case 'but': return /drop/.test(texte) ? 'DropGoalScore' : action.points === 2 || /transform|conversion/.test(texte) ? 'ConversionScored' : 'ScorePenaltyGeneric';
    case 'butRate': return /transform|conversion/.test(texte) ? 'ConversionMissed' : undefined;
    case 'plaquage': return 'OpenPlayStandingTackleSuccess';
    case 'franchissement': return 'OpenPlayLineBreak';
    case 'melee': return 'RefereeScrum';
    case 'touche': return /gagne|capte|recupere/.test(texte) ? 'LineoutCatchSuccess' : 'RefereeLineout';
    case 'maul': return 'MaulCalled';
    case 'penalite': return 'RefereePenalty';
    case 'carton': return /rouge|red card/.test(texte) ? undefined : /jaune|yellow/.test(texte) ? 'SentOffYellowCard' : undefined;
    case 'remplacement': return 'SubstituteOn';
    case 'ruck': return /gratt|turnover|recupere/.test(texte) ? 'RuckTurnover' : undefined;
    case 'faute': return /passe.*avant|forward pass/.test(texte) ? 'OpenPlayPassForward' : /en.avant|knock/.test(texte) ? 'KnockOn' : 'RefereePenalty';
    case 'pied': return /chandelle|high kick/.test(texte) ? 'OpenPlayKickHigh' : /rasant|grubber/.test(texte) ? 'OpenPlayKickGrubber' : /degag|clearance/.test(texte) ? 'ClearanceKicked' : undefined;
    case 'jalon':
      if (/sifflet final|fin du match|full.?time/.test(texte)) return 'FullTime';
      if (/deuxieme|seconde mi.temps|second half/.test(texte)) return 'PreKickOffSecondHalf';
      if (/mi.temps|half.?time/.test(texte)) return 'HalfTime';
      if (/coup d.envoi|kick.?off/.test(texte) && (action.seconde ?? action.minute * 60) < 60) return 'PreKickOffFirstHalf';
  }
}
export function creerChoixCommentaireAudio() {
  const derniers = new Map<FamilleCommentaireAudio, number>();
  return (famille: FamilleCommentaireAudio) => {
    const clips = enregistrements[famille];
    if (clips.length === 1) return clips[0];
    const precedent = derniers.get(famille);
    let index = Math.floor(Math.random() * (clips.length - (precedent === undefined ? 0 : 1)));
    if (precedent !== undefined && index >= precedent) index++;
    derniers.set(famille, index);
    return clips[index];
  };
}
const PRIORITAIRES = new Set(['essai', 'but', 'butRate', 'carton', 'jalon']);
const COMMENTEES = new Set([...PRIORITAIRES, 'plaquage', 'franchissement', 'melee', 'touche', 'maul', 'pied', 'penalite', 'faute', 'remplacement', 'ruck']);
export const actionPrioritaire = (action: ActionCommentee) => PRIORITAIRES.has(action.type);

/** Suit uniquement les actions déjà montrées, sans relire l'historique ni empiler du retard. */
export function creerSuiviCommentaires() {
  const vues = new Set<string>();
  let initialise = false;
  let derniereParole = -Infinity;
  return (lignes: readonly ActionCommentee[], seconde: number, actif: boolean, maintenant: number) => {
    let candidate: ActionCommentee | undefined;
    for (const ligne of lignes) {
      const instant = ligne.seconde ?? ligne.minute * 60;
      if (instant > seconde) continue;
      const cle = `${instant}|${ligne.type}|${ligne.texte}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      if (!initialise || !actif || seconde - instant > 12 || !COMMENTEES.has(ligne.type) || !familleCommentaireAudio(ligne)) continue;
      if (!candidate || actionPrioritaire(ligne) || !actionPrioritaire(candidate)) candidate = ligne;
    }
    initialise = true;
    if (!candidate || maintenant - derniereParole < (actionPrioritaire(candidate) ? 1200 : 4500)) return;
    derniereParole = maintenant;
    return candidate;
  };
}
