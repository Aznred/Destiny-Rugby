import type { Manager } from '../types.js';
import type { Coequipier } from './effectif.js';
import type { ObjectifDirection } from './carriereAvancee.js';
import { competitionEffective } from './divisions.js';
import { graine } from './championnat.js';
import { nomNation } from './nations.js';
import { situationSalariale } from './recrutementManager.js';
import { nombre } from './i18n.js';

export type IndicateurObjectif = 'classement' | 'masseSalariale' | 'reserveTransferts'
  | 'feuillesJeunes' | 'recruesJeunes' | 'locaux' | 'essais' | 'victoires' | 'defensesSolides';

/** Les priorités tournent chaque saison, dans les limites du groupe réel. */
export function objectifsDeSaison(m: Manager, effectif: Coequipier[]): ObjectifDirection[] {
  if (!m.club) return [];
  const comp = competitionEffective(m.club, m.division);
  const jeunes = effectif.filter((j) => j.age <= 22).length;
  const locaux = effectif.filter((j) => nomNation(j.nation) === nomNation(comp?.pays)).length;
  const creer = (indicateur: IndicateurObjectif, categorie: ObjectifDirection['categorie'], titre: string,
    detail: string, cible: number, importance: ObjectifDirection['importance'] = 2): ObjectifDirection => ({
    id: `${indicateur}-${m.club}-${m.saison}`, indicateur, categorie, titre, detail, cible, importance,
    progression: 0, etat: 'enCours',
  });
  const salaires = situationSalariale(m);
  const sportif = creer('classement', 'sportif', m.objectif === 1 ? 'Viser la première place' : `Viser le top ${m.objectif}`,
    `Terminer ${m.objectif === 1 ? '1er' : `${m.objectif}e`} ou mieux dans la poule de ${comp?.nom ?? m.divisionNom}.`, m.objectif, 3);
  const financier = salaires.engagee > 0 && m.saison % 2 === 1
    ? creer('masseSalariale', 'financier', 'Respecter la masse salariale', '', salaires.plafond, 3)
    : creer('reserveTransferts', 'financier', 'Conserver une réserve de recrutement',
      'Garder 10 % de l’enveloppe de recrutement de début de saison pour les imprévus.', Math.round(m.budgetTransferts * .1), 3);
  const priorites: ObjectifDirection[] = [
    creer('essais', 'sportif', 'Développer le jeu offensif', 'Cumuler des essais dans les matchs du club joués cette saison, toutes compétitions confondues.', 24 + (m.saison % 3) * 6),
    creer('victoires', 'sportif', 'Installer une dynamique de victoire', 'Gagner des rencontres du club cette saison, toutes compétitions confondues.', Math.max(4, 12 - Math.floor(m.objectif / 2))),
    creer('defensesSolides', 'sportif', 'Fermer la ligne d’en-but', 'Terminer des matchs en concédant au maximum un essai.', Math.max(4, 9 - Math.floor(m.objectif / 3))),
    creer('recruesJeunes', 'recrutement', 'Préparer la relève', 'Recruter ou intégrer au groupe senior des joueurs de 23 ans ou moins et les conserver au club.', jeunes >= 5 ? 1 : 2),
  ];
  if (jeunes > 0) priorites.push(creer('feuillesJeunes', 'formation', 'Donner leur chance aux jeunes',
    'Cumuler des présences sur les feuilles de match avec les moins de 23 ans. Les joueurs absents ne comptent pas.', Math.min(24, jeunes * 6)));
  if (locaux / Math.max(1, effectif.length) >= .6) priorites.push(creer('locaux', 'identite', 'Préserver l’ancrage local',
    `Conserver au moins 60 % de joueurs de ${comp?.pays} dans l’effectif senior.`, 60));
  const depart = (Math.floor(graine(`priorites#${m.club}`)() * priorites.length) + (m.saison - 1) * 2) % priorites.length;
  return [sportif, financier, priorites[depart], priorites[(depart + 1) % priorites.length]];
}

/** Même mesure pour Direction et pour le verdict final ; aucune réussite tirée au sort. */
export function evaluerObjectif(o: ObjectifDirection, m: Manager, effectif: Coequipier[], rang?: number, final = false) {
  const matchs = Object.values(m.resultats).filter((r) => r.saison === m.saison && r.club === m.club);
  let valeur = o.progression;
  let cible = o.cible;
  let detail = o.detail;
  let libelle = '';
  let atteint = false;
  switch (o.indicateur) {
    case 'classement':
      valeur = rang ?? 0;
      atteint = valeur > 0 && valeur <= cible;
      libelle = valeur > 0 ? `${valeur === 1 ? '1er' : `${valeur}e`} · objectif top ${cible}` : 'Classement à venir';
      break;
    case 'masseSalariale': {
      const s = situationSalariale(m);
      valeur = s.engagee;
      cible = s.plafond;
      detail = `Ne pas dépasser le plafond annuel de ${nombre(cible)} €.`;
      atteint = valeur <= cible && m.budgetTransferts >= 0 && m.budgetStructure >= 0;
      libelle = `${nombre(valeur)} € engagés / ${nombre(cible)} €`;
      break;
    }
    case 'reserveTransferts':
      valeur = m.budgetTransferts;
      atteint = valeur >= cible;
      libelle = `${nombre(valeur)} € en réserve / ${nombre(cible)} € requis`;
      break;
    case 'recruesJeunes': {
      const presents = new Set(effectif.map((j) => j.nom));
      const noms = new Set(m.recrues.filter((r) => (!r.club || r.club === m.club) && r.saison === m.saison && r.joueur.age <= 23 && presents.has(r.joueur.nom)).map((r) => r.joueur.nom));
      for (const j of m.jeunesFormes) {
        if (j.club === m.club && j.saison === m.saison && j.age <= 23 && presents.has(j.nom)) noms.add(j.nom);
      }
      valeur = noms.size;
      break;
    }
    case 'locaux': {
      const pays = competitionEffective(m.club, m.division)?.pays;
      valeur = effectif.filter((j) => nomNation(j.nation) === nomNation(pays)).length / Math.max(1, effectif.length) * 100;
      libelle = `${Math.round(valeur)} % de joueurs du pays / ${cible} % requis`;
      break;
    }
    case 'essais': valeur = matchs.reduce((n, r) => n + r.essaisPour, 0); break;
    case 'victoires': valeur = matchs.filter((r) => r.scorePour > r.scoreContre).length; break;
    case 'defensesSolides': valeur = matchs.filter((r) => r.essaisContre <= 1).length; break;
  }
  if (!['classement', 'masseSalariale'].includes(o.indicateur)) atteint = valeur >= cible;
  if (!libelle) libelle = `${nombre(valeur)} / ${nombre(cible)} ${o.indicateur === 'feuillesJeunes' ? 'feuilles de match' : o.indicateur === 'essais' ? 'essais' : o.indicateur === 'victoires' ? 'victoires' : o.indicateur === 'defensesSolides' ? 'matchs solides' : 'joueurs'}`;
  const pourcentage = o.indicateur === 'classement' ? (atteint ? 100 : 0)
    : o.indicateur === 'masseSalariale' ? (atteint ? 100 : 0)
      : cible === 0 ? (atteint ? 100 : 0) : Math.max(0, Math.min(100, valeur / cible * 100));
  return { ...o, cible, detail, progression: valeur, atteint, pourcentage, libelle,
    etat: final ? (atteint ? 'reussi' as const : 'echoue' as const) : 'enCours' as const };
}
