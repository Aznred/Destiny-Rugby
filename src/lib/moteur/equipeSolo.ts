// Contrôle collectif réservé à la carrière solo. Aucun état ajouté aux matchs réseau.
import type { EtatMatch } from './etat.js';
import type { Pion } from './entites.js';
import { adverse, borner, distance, LARGEUR, metresAvantLaLigne, sens, type Cote, type Vec } from './terrain.js';
import { creerEtatDirect, majVueDirecte } from './direct.js';
import { pionDuRole } from './responsabilites.js';

export interface ReglagesEquipe { melees: 'manuel' | 'auto'; touches: 'manuel' | 'auto'; rucks: 'manuel' | 'assiste' }
export const REGLAGES_EQUIPE: ReglagesEquipe = { melees: 'manuel', touches: 'manuel', rucks: 'manuel' };
export type OptionNeuf = 'dix' | 'gauche' | 'droite' | 'pick' | 'box' | 'depart';
export type OrdreEquipe = 'large' | 'serre' | 'cellules' | 'pick' | 'pied' | 'occupation' | 'rapide' | 'lent';
export interface CelluleSolo { ids: string[]; centre: Vec }
export interface OrganisationSolo {
  cle: string; cote: Cote; origine: Vec; gauche: CelluleSolo; droite: CelluleSolo; pickId?: string; neufId?: string;
  lancee?: { cote: 'gauche' | 'droite'; depuis: number };
}
export interface ControleEquipe {
  cote: Cote; actif: boolean; reglages: ReglagesEquipe; selectionId?: string; dernierChangement: number;
  manuelJusqua: number; ordre?: OrdreEquipe;
  sortie?: { neufId: string; origine: Vec; depuis: number; choix?: OptionNeuf; cibleId?: string; departA?: number };
  reserves: Record<string, { recharges: NonNullable<EtatMatch['direct']>['recharges'] }>;
}
const disponible = (p: Pion) => p.surLeTerrain && p.sanction <= 0 && !p.corps && p.battu <= 0;
const debout = (p: Pion) => p.surLeTerrain && p.sanction <= 0 && !p.corps;

export function configurerEquipeSolo(e: EtatMatch, cote: Cote, actif: boolean, reglages = REGLAGES_EQUIPE): void {
  e.cellulesSolo = true;
  if (!actif) return;
  e.controleEquipe = { cote, actif, reglages: { ...reglages }, dernierChangement: -99, manuelJusqua: 0, reserves: {} };
  e.direct ??= creerEtatDirect();
  actualiserSelectionEquipe(e);
}

/** L'identité contrôlée change, jamais l'identité d'un joueur de carrière. */
export function selectionnerPionEquipe(e: EtatMatch, pion: Pion): boolean {
  const c = e.controleEquipe;
  if (!c?.actif || pion.cote !== c.cote || !debout(pion)) return false;
  if (c.selectionId === pion.id) return true;
  const d = e.direct ??= creerEtatDirect();
  if (c.selectionId) c.reserves[c.selectionId] = { recharges: { ...d.recharges } };
  for (const p of e.pions) p.moi = p === pion;
  c.selectionId = pion.id; c.dernierChangement = e.sim;
  d.file = []; d.arme = null; d.pasDeCote = null; d.appel = null; d.pack = undefined;
  d.recharges = { ...c.reserves[pion.id]?.recharges }; d.tenuJusqua = 0; d.suggestion = null;
  d.plaquageOffensifJusqua = undefined;
  e.intention = null;
  majVueDirecte(e);
  return true;
}

/** Porteur et réception sont prioritaires ; la défense garde son joueur tant qu'un autre n'est pas nettement mieux placé. */
export function actualiserSelectionEquipe(e: EtatMatch): Pion | undefined {
  const c = e.controleEquipe;
  if (!c?.actif || e.fini) return undefined;
  const joueurs = e.pions.filter(p => p.cote === c.cote && debout(p));
  const actuel = joueurs.find(p => p.id === c.selectionId);
  let prioritaire: Pion | undefined;
  const attente = e.responsabilites?.attente;
  if (attente?.type === 'tir') prioritaire = e.tir?.buteur;
  else if (attente?.type === 'penalite') prioritaire = pionDuRole(e, c.cote, 'capitaine');
  else if (attente?.type === 'engagement') prioritaire = pionDuRole(e, c.cote, 'engagement');
  else if ((attente?.type === 'touche' && !e.responsabilites?.touche?.lancer) || attente?.type === 'toucheRapide') prioritaire = pionDuRole(e, c.cote, 'lanceur');
  if (prioritaire?.cote !== c.cote) prioritaire = undefined;
  if (!prioritaire && e.phase === 'melee' && c.reglages.melees === 'manuel') {
    prioritaire = actuel?.role === 'melee' && actuel.avant ? actuel : joueurs.find(p => p.numero === 8 && p.role === 'melee');
  }
  if (!prioritaire && e.phase === 'maul') prioritaire = actuel?.role === 'maul' ? actuel : joueurs.find(p => p.role === 'maul' && p.avant);
  if (!prioritaire && e.phase === 'touche' && c.reglages.touches === 'manuel' && (!attente || e.responsabilites?.touche?.lancer)) {
    const sauteur = e.pions.find(p => p.id === e.conquete?.cibleId);
    prioritaire = joueurs.find(p => p === sauteur) ?? joueurs.filter(p => p.role === 'alignement')
      .sort((a,b)=>Math.abs(a.pos.y-(sauteur?.pos.y??e.ballon.y))-Math.abs(b.pos.y-(sauteur?.pos.y??e.ballon.y)))[0];
  }
  if (!prioritaire && e.sim < c.manuelJusqua && actuel && !e.vol) return actuel;
  if (!prioritaire && e.porteur?.cote === c.cote && debout(e.porteur)) prioritaire = e.porteur;
  if (!prioritaire && e.vol?.type === 'passe' && e.vol.receveur?.cote === c.cote) prioritaire = e.vol.receveur;
  if (!prioritaire && e.phase === 'ruck' && e.possession === c.cote) prioritaire = joueurs.find(p => p.id === e.organisationSolo?.neufId);
  if (!prioritaire && e.sim < c.manuelJusqua && actuel) return actuel;
  const cible = e.vol?.vers ?? e.porteur?.pos ?? e.ballon;
  const note = (p: Pion) => distance(p.pos, cible) + (p.horsJeu ? 30 : 0) + (p.role === 'ruck' ? 15 : 0)
    + (e.porteur?.cote === adverse(c.cote) && (p.pos.x - cible.x) * sens(c.cote) > 0 ? 4 : 0);
  const meilleur = prioritaire ?? joueurs.filter(disponible).sort((a,b) => note(a) - note(b) || a.id.localeCompare(b.id))[0];
  const conserve = !prioritaire && actuel && disponible(actuel) && (e.sim - c.dernierChangement < 0.7 || !meilleur || note(actuel) <= note(meilleur) + 3.5);
  if (meilleur && !conserve) selectionnerPionEquipe(e, meilleur);
  return e.pions.find(p => p.id === c.selectionId);
}

export function changerJoueurEquipe(e: EtatMatch, direction: Vec): boolean {
  const c = e.controleEquipe;
  if (!c?.actif || c.sortie || e.responsabilites?.attente || e.direct?.pack) return false;
  const courant = e.pions.find(p => p.id === c.selectionId);
  const cible = e.vol?.vers ?? e.porteur?.pos ?? e.ballon;
  const norme = Math.hypot(direction.x, direction.y);
  const note = (p: Pion) => {
    const dx = p.pos.x - (courant?.pos.x ?? cible.x), dy = p.pos.y - (courant?.pos.y ?? cible.y);
    const alignement = norme > 0.2 ? (dx * direction.x + dy * direction.y) / (Math.hypot(dx,dy) * norme || 1) : 0;
    return distance(p.pos,cible) - alignement * 18 + (p.horsJeu ? 25 : 0);
  };
  const suivant = e.pions.filter(p => p.cote === c.cote && p !== courant && disponible(p) && p.role !== 'ruck')
    .sort((a,b) => note(a) - note(b) || a.id.localeCompare(b.id))[0];
  if (!suivant || !selectionnerPionEquipe(e,suivant)) return false;
  c.manuelJusqua = e.sim + 2;
  return true;
}

/** Deux triangles conservés pendant la phase, exclusifs des joueurs au sol et engagés. Ne modifie jamais une position. */
export function organiserCellulesSolo(e: EtatMatch): void {
  if (!e.cellulesSolo || !['ruck','jeuCourant','ballonEnLAir'].includes(e.phase)) return;
  const cote = e.possession, s = sens(cote);
  const origine = e.phase === 'ruck' ? e.ballon : e.origine;
  const cle = `${cote}:${e.compteurs.rucks}:${origine.x.toFixed(1)}:${origine.y.toFixed(1)}`;
  const disponibles = e.pions.filter(p => p.cote === cote && disponible(p) && p.avant && p.role !== 'ruck' && p !== e.porteur);
  const courte = metresAvantLaLigne(origine,cote) <= 10;
  const ordre = e.controleEquipe?.cote === cote ? e.controleEquipe.ordre : undefined;
  const profondeur = courte ? 1.2 : ordre === 'occupation' ? 6 : ordre === 'serre' || ordre === 'pick' ? 3 : 4.5;
  const largeur = courte ? 2 : ordre === 'serre' || ordre === 'pick' ? 5 : ordre === 'large' ? 12 : 9;
  const centre = (c: -1 | 1): Vec => ({ x: borner(origine.x - s * profondeur, 11, 113), y: borner(origine.y + c * largeur, 3, LARGEUR-3) });
  let o = e.organisationSolo;
  if (!o || o.cle !== cle) {
    const reserves = [...disponibles];
    const pick = reserves.sort((a,b)=>distance(a.pos,origine)-distance(b.pos,origine)).shift();
    const prendre = (c: -1 | 1): CelluleSolo => {
      const place = centre(c);
      // Pas de cellule coincée contre la touche : elle laisse le petit côté au pick and go.
      const n = (c < 0 ? origine.y : LARGEUR-origine.y) < 5 ? 0 : Math.min(3, c===-1 ? Math.ceil(reserves.length/2) : reserves.length);
      reserves.sort((a,b) => distance(a.pos,place)-distance(b.pos,place));
      return { ids: reserves.splice(0,n).map(p => p.id), centre: place };
    };
    const gauche = prendre(-1), droite = prendre(1);
    const neuf = e.pions.filter(p => p.cote===cote && disponible(p) && p.role!=='ruck' && !p.avant)
      .sort((a,b) => (a.numero===9 ? -100 : distance(a.pos,origine)) - (b.numero===9 ? -100 : distance(b.pos,origine)))[0];
    o = e.organisationSolo = { cle,cote,origine:{...origine},gauche,droite,neufId:neuf?.id,pickId:pick?.id };
  }
  for (const coteCellule of ['gauche','droite'] as const) {
    const cellule = o[coteCellule];
    if (!o.lancee) cellule.centre = centre(coteCellule === 'gauche' ? -1 : 1);
    cellule.ids = cellule.ids.filter(id => e.pions.some(p => p.id===id && debout(p) && p.role!=='ruck'));
    const pivot = e.pions.find(p=>p.id===cellule.ids[0]);
    const lancee = o.lancee?.cote === coteCellule;
    if (lancee && pivot && distance(pivot.pos,cellule.centre)>5) o.lancee!.depuis=e.sim;
    cellule.ids.forEach((id,i)=> {
      const p = e.pions.find(q=>q.id===id)!;
      if (p===e.porteur || (p.moi && e.direct?.actif && !(lancee && e.vol?.receveur===p))) return;
      const porteur = pivot===e.porteur;
      const ancre = porteur ? pivot.pos : cellule.centre;
      let avance = lancee && !porteur ? Math.min(profondeur-0.6, Math.max(0,e.sim-o!.lancee!.depuis)*2.8) : 0;
      const neuf = e.pions.find(q=>q.id===o!.neufId);
      // Jusqu'au départ de la passe, le premier porteur reste derrière les mains du 9.
      if (lancee && !porteur && neuf===e.porteur && !e.vol) avance=Math.min(avance,Math.max(0,(neuf.pos.x-ancre.x)*s-0.9));
      p.role = coteCellule === 'gauche' ? 'podRas' : 'podMilieu';
      p.cible = { x: borner(ancre.x + s * avance - s * (i ? 1.8 : 0), 10,115), y: borner(ancre.y + (i===1 ? -1.9 : i===2 ? 1.9 : 0),1.5,LARGEUR-1.5) };
      p.effort = lancee ? 1.15 : 1;
    });
  }
  if (e.phase === 'ruck') {
    const neuf = e.pions.find(p=>p.id===o.neufId);
    if (neuf) { neuf.role='demi'; neuf.cible={x:origine.x-s*1.8,y:origine.y}; }
    const pick = e.pions.find(p=>p.id===o.pickId);
    if (pick) { pick.role='podRas'; pick.cible={x:origine.x-s*1.2,y:borner(origine.y+1.7,2,LARGEUR-2)}; }
  }
  const dix = e.pions.find(p=>p.cote===cote && p.numero===10 && disponible(p));
  if (dix && dix!==e.porteur && !(dix.moi && e.direct?.actif)) {
    const large = ordre==='large', serre = ordre==='serre' || ordre==='pick';
    dix.cible = { x: borner(origine.x-s*(large||ordre==='pied'||ordre==='occupation'?8:6),11,113), y:borner(origine.y+e.ouvert*(large?19:serre?8:13),3,LARGEUR-3) };
  }
  if (ordre==='large' || ordre==='serre' || ordre==='pick') {
    for (const p of e.pions.filter(p=>p.cote===cote && !p.avant && p.numero>10 && disponible(p) && p!==e.porteur && !p.moi)) {
      const y=p.numero===11?4:p.numero===14?LARGEUR-4:p.numero===12?origine.y+e.ouvert*22:p.numero===13?origine.y+e.ouvert*30:origine.y-e.ouvert*12;
      p.cible={x:borner(origine.x-s*(8+(p.numero%3)*1.5),11,113),y:borner(ordre==='large'?y:origine.y+(y-origine.y)*0.45,4,LARGEUR-4)};
    }
  }
}

export function cibleOptionNeuf(e: EtatMatch, option: OptionNeuf): Pion | undefined {
  const o = e.organisationSolo;
  const id = option==='gauche' ? o?.gauche.ids[0] : option==='droite' ? o?.droite.ids[0] : option==='pick' ? o?.pickId : undefined;
  return option==='dix' ? e.pions.find(p=>p.cote===e.possession && p.numero===10 && disponible(p)) : e.pions.find(p=>p.id===id && debout(p));
}
export function choisirOptionNeuf(e: EtatMatch, choix: OptionNeuf): boolean {
  const c = e.controleEquipe, sortie=c?.sortie;
  if (!c?.actif || !sortie || sortie.choix || e.porteur?.id!==sortie.neufId) return false;
  const cible = cibleOptionNeuf(e,choix);
  if (['gauche','droite','dix','pick'].includes(choix) && !cible) return false;
  sortie.choix=choix; sortie.cibleId=cible?.id; sortie.departA=e.sim+(choix==='gauche'||choix==='droite' ? 0.5 : 0);
  if ((choix==='gauche'||choix==='droite') && e.organisationSolo) e.organisationSolo.lancee={cote:choix,depuis:e.sim};
  return true;
}

/** Choix tactique déterministe : espace, rideau et distance de placement comptent ensemble. */
export function meilleurCoteCellule(e: EtatMatch): 'gauche' | 'droite' {
  const o=e.organisationSolo;
  if (!o) return e.ouvert<0?'gauche':'droite';
  const note = (c:'gauche'|'droite') => {
    const cellule=o[c], pivot=e.pions.find(p=>p.id===cellule.ids[0]);
    if (!pivot) return -999;
    const defense=e.pions.filter(p=>p.cote!==o.cote && disponible(p) && distance(p.pos,cellule.centre)<13).length;
    const largeur=c==='gauche'?o.origine.y:LARGEUR-o.origine.y;
    const dix=e.pions.find(p=>p.cote===o.cote && p.numero===10 && disponible(p));
    const soutienDix=dix ? Math.max(0,12-distance(dix.pos,cellule.centre))*0.25 : 0;
    return Math.min(largeur,25)-defense*5-distance(pivot.pos,cellule.centre)*0.7+soutienDix;
  };
  return note('gauche')>=note('droite')?'gauche':'droite';
}
export function donnerOrdreEquipe(e: EtatMatch, ordre: OrdreEquipe): void {
  const c=e.controleEquipe;
  if (!c) return;
  c.ordre=ordre;
  const t=e.tactiques[c.cote];
  if (!t) return;
  if (ordre==='large') t.attaque='large';
  else if (ordre==='serre'||ordre==='cellules'||ordre==='pick') t.attaque='avants';
  else if (ordre==='pied'||ordre==='occupation') t.attaque='occupation';
  if (ordre==='rapide') t.rythme='intense';
  if (ordre==='lent') t.rythme='gestion';
}
