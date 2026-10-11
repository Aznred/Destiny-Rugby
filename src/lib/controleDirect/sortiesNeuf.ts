import type { OptionNeuf } from '../moteur/equipeSolo';
import type { ActionClavier } from './touches';
import type { NomBouton } from './manette';

/** Derrière le ruck : maintenir la touche Action, puis une commande familière. */
export const ACTIONS_SORTIE_NEUF: Record<OptionNeuf, ActionClavier> = {
  dix:'haut', gauche:'passeGauche', droite:'passeDroite', pick:'bas', box:'coupDePied', depart:'raffut',
};
export const BOUTONS_SORTIE_NEUF: Record<OptionNeuf, number> = { dix:3, gauche:2, droite:1, pick:0, box:5, depart:7 };
export const NOMS_MANETTE_NEUF: Record<OptionNeuf,NomBouton> = { dix:'y',gauche:'x',droite:'b',pick:'a',box:'rb',depart:'rt' };
export const GESTES_SORTIE_NEUF: Record<OptionNeuf,string> = { dix:'↑',gauche:'←',droite:'→',pick:'↓',box:'↖',depart:'↗' };

export function optionNeufClavier(action:ActionClavier|null, modificateur:boolean):OptionNeuf|undefined {
  if(!modificateur) return;
  return (Object.keys(ACTIONS_SORTIE_NEUF) as OptionNeuf[]).find(o=>ACTIONS_SORTIE_NEUF[o]===action);
}

/** LT + bouton, dans les deux ordres d'appui ; les relâchements n'ajoutent aucune passe ordinaire. */
export function optionNeufManette(fronts:readonly number[], boutons:readonly boolean[]):OptionNeuf|undefined {
  if(!boutons[6]) return;
  return (Object.keys(BOUTONS_SORTIE_NEUF) as OptionNeuf[]).find(o=>boutons[BOUTONS_SORTIE_NEUF[o]]
    && (fronts.includes(BOUTONS_SORTIE_NEUF[o])||fronts.includes(6)));
}

/** Six balayages : les diagonales montantes servent le pied et le départ du 9. */
export function optionNeufBalayage(dx:number,dy:number):OptionNeuf|undefined {
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<46) return;
  if(Math.abs(dx)>Math.abs(dy)*1.25) return dx<0?'gauche':'droite';
  if(Math.abs(dy)>Math.abs(dx)*1.25) return dy<0?'dix':'pick';
  return dy<0 ? dx<0?'box':'depart' : 'pick';
}
