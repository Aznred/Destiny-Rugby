// LES TOUCHES DU CONTRÔLE DIRECT — remappables, et lisibles sur AZERTY comme sur QWERTY.
//
// ⚠️ ON STOCKE DES CODES PHYSIQUES (`KeyW`), PAS DES LETTRES. `event.code` désigne
// l'emplacement de la touche sur le clavier, quelle que soit la disposition : « la
// touche en haut à gauche du pavé de déplacement » est `KeyW` sur QWERTY et porte
// un Z sur AZERTY. Les réglages suivent donc le joueur d'un clavier à l'autre, et
// le pavé ZQSD marche sans qu'on ait rien configuré.
//
// Ce qui s'AFFICHE, en revanche, doit être la lettre qu'il lit sur sa touche :
// `libelleDeTouche` la demande au navigateur (`navigator.keyboard.getLayoutMap`,
// Chromium) ; à défaut, elle l'apprend des frappes (`event.key` à côté de
// `event.code`), ou devine AZERTY d'après la langue.
//
// ⚠️ PAS DE CTRL PAR DÉFAUT : Ctrl + W ferme l'onglet, et on tape en courant.
// ⚠️ ÉCHAP N'EST PAS RÉASSIGNABLE : il appartient à la fenêtre du match (pause en jeu, sortie sinon).

import { t } from '../i18n';

export type ActionClavier =
  | 'haut' | 'bas' | 'gauche' | 'droite' | 'sprint'
  | 'passeGauche' | 'passeDroite' | 'coupDePied' | 'raffut' | 'crochet'
  | 'action' | 'appel' | 'gratter' | 'aide' | 'pause' | 'drop';

export interface DefinitionTouche {
  id: ActionClavier;
  /** Clé i18n du libellé. */
  cle: string;
  /** Clé i18n de l'aide (ce que ça fait). */
  aide: string;
  groupe: 'deplacement' | 'ballon' | 'sansBallon' | 'jeu';
}

export const DEFINITIONS_TOUCHES: DefinitionTouche[] = [
  { id: 'haut', cle: 'cd.touche.haut', aide: 'cd.touche.haut.aide', groupe: 'deplacement' },
  { id: 'bas', cle: 'cd.touche.bas', aide: 'cd.touche.bas.aide', groupe: 'deplacement' },
  { id: 'gauche', cle: 'cd.touche.gauche', aide: 'cd.touche.gauche.aide', groupe: 'deplacement' },
  { id: 'droite', cle: 'cd.touche.droite', aide: 'cd.touche.droite.aide', groupe: 'deplacement' },
  { id: 'sprint', cle: 'cd.touche.sprint', aide: 'cd.touche.sprint.aide', groupe: 'deplacement' },
  { id: 'passeGauche', cle: 'cd.touche.passeGauche', aide: 'cd.touche.passeGauche.aide', groupe: 'ballon' },
  { id: 'passeDroite', cle: 'cd.touche.passeDroite', aide: 'cd.touche.passeDroite.aide', groupe: 'ballon' },
  { id: 'coupDePied', cle: 'cd.touche.coupDePied', aide: 'cd.touche.coupDePied.aide', groupe: 'ballon' },
  { id: 'raffut', cle: 'cd.touche.raffut', aide: 'cd.touche.raffut.aide', groupe: 'ballon' },
  { id: 'crochet', cle: 'cd.touche.crochet', aide: 'cd.touche.crochet.aide', groupe: 'ballon' },
  { id: 'drop', cle: 'cd.touche.drop', aide: 'cd.touche.drop.aide', groupe: 'ballon' },
  { id: 'action', cle: 'cd.touche.action', aide: 'cd.touche.action.aide', groupe: 'sansBallon' },
  { id: 'appel', cle: 'cd.touche.appel', aide: 'cd.touche.appel.aide', groupe: 'sansBallon' },
  { id: 'gratter', cle: 'cd.touche.gratter', aide: 'cd.touche.gratter.aide', groupe: 'sansBallon' },
  { id: 'aide', cle: 'cd.touche.aide', aide: 'cd.touche.aide.aide', groupe: 'jeu' },
  { id: 'pause', cle: 'cd.touche.pause', aide: 'cd.touche.pause.aide', groupe: 'jeu' },
];

export type TouchesDirectes = Record<ActionClavier, string[]>;

export const TOUCHES_PAR_DEFAUT: Readonly<TouchesDirectes> = {
  haut: ['KeyW', 'ArrowUp'],
  bas: ['KeyS', 'ArrowDown'],
  gauche: ['KeyA', 'ArrowLeft'],
  droite: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  passeGauche: ['KeyQ'],
  passeDroite: ['KeyE'],
  coupDePied: ['KeyV'],
  raffut: ['KeyF'],
  crochet: ['KeyC'],
  drop: ['KeyX'],
  action: ['Space'],
  appel: ['KeyR'],
  gratter: ['KeyG'],
  aide: ['KeyH'],
  pause: ['KeyP'],
};

export function copierTouches(t0: Readonly<TouchesDirectes> = TOUCHES_PAR_DEFAUT): TouchesDirectes {
  const sortie = {} as TouchesDirectes;
  for (const d of DEFINITIONS_TOUCHES) sortie[d.id] = [...(t0[d.id] ?? TOUCHES_PAR_DEFAUT[d.id])];
  return sortie;
}

/** Une table lue dans le stockage : on garde ce qui est valide, on complète avec les défauts. */
export function assainirTouches(brut: unknown): TouchesDirectes {
  const sortie = copierTouches();
  if (!brut || typeof brut !== 'object') return sortie;
  for (const d of DEFINITIONS_TOUCHES) {
    const lu = (brut as Record<string, unknown>)[d.id];
    if (Array.isArray(lu)) {
      const codes = lu.filter((c): c is string => typeof c === 'string' && /^[A-Za-z0-9]{1,24}$/.test(c)).slice(0, 3);
      if (codes.length) sortie[d.id] = codes;
    }
  }
  return sortie;
}

/** L'action que cette touche déclenche, dans cette table (la première qui la porte). */
export function actionDeLaTouche(table: Readonly<TouchesDirectes>, code: string): ActionClavier | null {
  for (const d of DEFINITIONS_TOUCHES) if (table[d.id].includes(code)) return d.id;
  return null;
}

/** Les touches qui ne se réassignent JAMAIS : le navigateur ou le système les garde. */
const INTERDITES = new Set(['MetaLeft', 'MetaRight', 'ContextMenu', 'OSLeft', 'OSRight', 'Escape']);
export function touchePermise(code: string): boolean { return !INTERDITES.has(code) && !/^F\d+$/.test(code); }
/** Permises, mais risquées : Ctrl + W ferme l'onglet, Alt + flèche change de page. Les réglages le disent. */
export function toucheRisquee(code: string): boolean { return /^(Control|Alt)(Left|Right)$/.test(code); }

// ---------------------------------------------------------------------------
// CE QUE LE JOUEUR LIT SUR SA TOUCHE
// ---------------------------------------------------------------------------

let disposition: Map<string, string> | null = null;
const apprises = new Map<string, string>();
const AZERTY: Record<string, string> = { KeyQ: 'A', KeyA: 'Q', KeyW: 'Z', KeyZ: 'W', Semicolon: 'M', Comma: ';', Period: ':', Slash: '!' };

/** Demande la disposition au navigateur (Chromium) : sans réponse, on apprend des frappes. */
export async function chargerDisposition(): Promise<void> {
  try {
    const clavier = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
    if (clavier?.getLayoutMap) disposition = await clavier.getLayoutMap();
  } catch {
    // Refusé (iframe, permission) : on retombe sur ce qu'on apprend des frappes.
  }
}

/** Une frappe : `code` et `key` côte à côte disent ce que la touche porte vraiment. */
export function apprendreTouche(code: string, key: string): void {
  if (/^Key[A-Z]$/.test(code) && key.length === 1) apprises.set(code, key.toUpperCase());
}

function estAzerty(): boolean {
  if (disposition) return (disposition.get('KeyQ') ?? '').toLowerCase() === 'a';
  const a = apprises.get('KeyQ');
  if (a) return a === 'A';
  return /^(fr|be)/i.test(typeof navigator !== 'undefined' ? navigator.language : '');
}

export function libelleDeTouche(code: string): string {
  if (/^Key[A-Z]$/.test(code)) {
    const lettre = disposition?.get(code) ?? apprises.get(code) ?? (estAzerty() ? AZERTY[code] : undefined);
    return (lettre ?? code.slice(3)).toUpperCase();
  }
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `Pavé ${code.slice(6)}`;
  const speciales: Record<string, string> = {
    Space: t('cd.cle.espace'), ShiftLeft: t('cd.cle.maj'), ShiftRight: t('cd.cle.maj'), Enter: t('cd.cle.entree'),
    Tab: 'Tab', Escape: t('cd.cle.echap'), Backspace: t('cd.cle.retour'), ArrowUp: '↑', ArrowDown: '↓',
    ArrowLeft: '←', ArrowRight: '→', Comma: ',', Period: '.', Semicolon: disposition?.get('Semicolon')?.toUpperCase() ?? ';',
    Slash: '/', Backslash: '\\', Quote: "'", BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`',
  };
  return speciales[code] ?? code;
}
