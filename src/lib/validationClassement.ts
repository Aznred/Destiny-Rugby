import { LIMITES, VERSION_BAREME, scoreDeLaFiche, verifierFiche, type FicheCarriere } from './classementMondial.js';
/** Au-dessus du maximum arithmétique des faits bornés, sans utiliser un plafond de performance ancien. */
export const PLAFOND_SCORE_VALIDATION = 1_000_000;

export type StatutValidation = 'ELIGIBLE' | 'PENDING_VALIDATION' | 'LIMITED' | 'REJECTED';
export interface RegleValidation { id: string; points: number; bloquante: boolean; detail: string }
export interface ValidationClassement {
  statut: StatutValidation; riskScore: number; regles: RegleValidation[];
  visible: boolean; recompensesAutorisees: boolean; horsClassement: boolean; version: 38;
}
export interface EvaluationClassement extends ValidationClassement { fiche: FicheCarriere; score: number }
export interface ContexteValidation {
  /** Ces preuves viennent du serveur, jamais de champs déclarés par le client. */
  integriteInvalide?: boolean; joueurInexistant?: boolean; recompenseDupliquee?: boolean;
  historique?: boolean; precedent?: { fiche: FicheCarriere; synchroniseLe: number }; maintenant?: number;
}

/** Le classement reçoit des faits bornés. Une lacune reste réparable au prochain envoi. */
export function evaluerClassement(brut: unknown, trophees: Iterable<string>, contexte: ContexteValidation = {}): EvaluationClassement {
  const c = brut && typeof brut === 'object' && !Array.isArray(brut) ? brut as Record<string, unknown> : {};
  const regles: RegleValidation[] = [];
  const ajouter = (id: string, points: number, detail: string, bloquante = false) => {
    if (!regles.some(r => r.id === id)) regles.push({ id, points, detail, bloquante });
  };
  let incomplet = false;
  const manquant = (champ: string) => { incomplet = true; ajouter('donnees_manquantes', 15, `Données à compléter : ${champ}.`); };
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) ajouter('fiche_illisible', 100, 'Fiche absente ou illisible.', true);
  const texte = (valeur: unknown, champ: string, maximum: number, repli: string) => {
    if (valeur == null || valeur === '') { manquant(champ); return repli; }
    if (typeof valeur !== 'string' || valeur.length > maximum || /\p{Cc}/u.test(valeur)) {
      ajouter(`texte_${champ}`, 100, `Champ ${champ} mal formé.`, true); return repli;
    }
    if (!valeur.trim()) { manquant(champ); return repli; }
    return valeur.trim();
  };
  const nombre = (valeur: unknown, champ: string, maximum: number, repli = 0, minimum = 0) => {
    if (valeur == null) { manquant(champ); return repli; }
    if (typeof valeur !== 'number' || !Number.isFinite(valeur) || !Number.isInteger(valeur) || valeur < minimum || valeur > maximum) {
      ajouter(`nombre_${champ}`, 100, `${champ} impossible : ${String(valeur).slice(0, 80)}.`, true); return repli;
    }
    return valeur;
  };
  const liste = (valeur: unknown, champ: string, maximum: number, taille: number) => {
    if (valeur == null) { manquant(champ); return []; }
    if (!Array.isArray(valeur) || valeur.length > maximum || valeur.some(v => typeof v !== 'string' || !v.trim() || v.length > taille || /\p{Cc}/u.test(v))) {
      ajouter(`liste_${champ}`, 100, `Liste ${champ} mal formée ou démesurée.`, true); return [];
    }
    return [...valeur] as string[];
  };
  const saisons = nombre(c.saisons, 'saisons', 100, 1, 1);
  const age = nombre(c.age, 'age', 120, 18, 10);
  const ageDebut = c.ageDebut == null ? age - saisons + 1 : nombre(c.ageDebut, 'ageDebut', 120, 18, 10);
  if (c.ageDebut == null) manquant('âge de début');
  const titres = liste(c.titres, 'titres', 1200, 80);
  const clubs = liste(c.clubs, 'clubs', 200, 160);
  const f: FicheCarriere = {
    v: VERSION_BAREME, pseudo: texte(c.pseudo, 'pseudo', 24, 'Sans nom'), nom: texte(c.nom, 'nom', 100, 'Sans nom'),
    poste: texte(c.poste, 'poste', 40, 'inconnu'), nation: texte(c.nation, 'nation', 80, 'Non renseignée'),
    age, ageDebut, saisons, note: nombre(c.note, 'note', 100), reputation: nombre(c.reputation, 'reputation', 100),
    matchs: nombre(c.matchs, 'matchs', 10000), essais: nombre(c.essais, 'essais', 100000),
    selections: nombre(c.selections, 'selections', 2000), titres, clubs, score: 0,
  };
  if (c.cle !== undefined) {
    if (typeof c.cle !== 'string' || !/^[A-Za-z0-9:_-]{1,40}$/.test(c.cle)) ajouter('cle_invalide', 100, 'Identité de ligne invalide.', true);
    else f.cle = c.cle;
  }
  if (c.v !== VERSION_BAREME) { incomplet = true; ajouter('ancienne_version', 15, 'Ancienne version : vérification à compléter.'); }
  if (c.manager !== undefined) {
    if (!c.manager || typeof c.manager !== 'object' || Array.isArray(c.manager)) ajouter('manager_illisible', 100, 'Données entraîneur illisibles.', true);
    else {
      const m = c.manager as Record<string, unknown>;
      f.manager = { saisons: nombre(m.saisons, 'saisons_manager', 100, 1, 1), prestige: nombre(m.prestige, 'prestige', 100),
        montees: nombre(m.montees, 'montees', 100), titres: liste(m.titres, 'titres_manager', 600, 80), clubs: liste(m.clubs, 'clubs_manager', 200, 160) };
    }
  } else if (f.poste === 'entraineur') manquant('parcours entraîneur');
  const horsClassement = c.horsClassement === true;
  if (horsClassement) ajouter('hors_classement_volontaire', 0, 'Carrière volontairement hors classement.');
  const present = (...champs: string[]) => champs.every(champ => typeof c[champ] === 'number' && Number.isFinite(c[champ]));
  if (present('age','ageDebut','saisons') && age !== ageDebut + saisons - 1) ajouter('age_saisons', Math.abs(age-ageDebut-saisons+1)>1?100:20,
    'Âge et saisons à rapprocher.', Math.abs(age-ageDebut-saisons+1)>1);
  if (saisons > (f.manager ? 85 : 45)) ajouter('duree_longue', 30, 'Longue carrière : durée à vérifier.');
  // Un âge initial déduit d'une vieille projection ne constitue pas une preuve.
  if (c.ageDebut == null && ageDebut < 10) ajouter('duree_a_preciser', 30, 'Âge de début absent : durée à préciser.');
  // 53 semaines, doubles rencontres, Europe, sélections et phases finales : 100 laisse une marge réelle.
  if (present('matchs','saisons') && f.matchs > saisons * 100) ajouter('calendrier_impossible', 70, `${f.matchs} matchs pour ${saisons} saisons : calendrier impossible.`, true);
  else if (f.matchs > saisons * LIMITES.matchsParSaison) ajouter('matchs_nombreux', 15, 'Beaucoup de matchs : contrôle complémentaire.');
  if (present('essais','matchs') && (f.essais > f.matchs * 15 || (!f.matchs && f.essais > 0))) ajouter('essais_impossibles', 70, 'Essais incompatibles avec les matchs joués.', true);
  else if (f.essais > f.matchs * LIMITES.essaisParMatch) ajouter('saison_exceptionnelle', 20, 'Rendement exceptionnel, sans preuve de triche.');
  if (present('selections','saisons') && f.selections > saisons * 30) ajouter('selections_impossibles', 70, 'Sélections incompatibles avec le calendrier.', true);
  else if (f.selections > saisons * LIMITES.capesParSaison) ajouter('selections_nombreuses', 10, 'Nombre élevé de sélections.');
  if (f.note > LIMITES.noteApres(saisons)) ajouter('progression_elevee', 20, 'Progression élevée : contrôle complémentaire.');
  if (!clubs.length) manquant('club');
  else if (clubs.length > saisons + 1) ajouter('parcours_clubs', 10, 'Parcours comprenant plusieurs changements de club.');
  const connus = new Set(trophees);
  for (const [listeTitres, duree, suffixe] of [[titres, saisons, 'joueur'], [f.manager?.titres ?? [], f.manager?.saisons ?? 0, 'manager']] as const) {
    if (listeTitres.some(id => !connus.has(id))) ajouter(`trophee_inconnu_${suffixe}`, 100, 'Trophée inexistant.', true);
    const compte = new Map<string, number>();
    for (const id of listeTitres) compte.set(id, (compte.get(id) ?? 0) + 1);
    const saisonsConnues = suffixe === 'joueur' ? present('saisons') : typeof (c.manager as Record<string,unknown> | undefined)?.saisons === 'number';
    if (saisonsConnues && [...compte.values()].some(n => n > duree)) ajouter(`recompense_dupliquee_${suffixe}`, 100, 'Même récompense comptée plusieurs fois par saison.', true);
  }
  if (f.manager) {
    const m = c.manager as Record<string,unknown>;
    if ((present('saisons') && typeof m.saisons==='number' && f.manager.saisons > saisons) ||
      (typeof m.montees==='number' && typeof m.saisons==='number' && f.manager.montees > f.manager.saisons)) ajouter('parcours_manager_impossible', 100, 'Saisons ou montées entraîneur impossibles.', true);
    if (f.manager.titres.length > f.manager.saisons * 6) ajouter('titres_manager_nombreux', 20, 'Palmarès entraîneur exceptionnel.');
  }
  f.score = scoreDeLaFiche(f);
  if (c.score == null) manquant('score annoncé');
  else if (typeof c.score !== 'number' || !Number.isSafeInteger(c.score) || c.score < 0 || c.score > PLAFOND_SCORE_VALIDATION) ajouter('score_impossible', 100, 'Score annoncé impossible.', true);
  else if (c.score !== f.score) {
    if (contexte.historique || c.v !== VERSION_BAREME || incomplet) ajouter('score_a_resynchroniser', 15, 'Score recalculé avec les données disponibles.');
    else ajouter('score_modifie', 100, `Score annoncé ${c.score}, score recalculé ${f.score}.`, true);
  }
  if (f.score > PLAFOND_SCORE_VALIDATION) ajouter('score_plafond', 100, 'Score recalculé impossible.', true);
  if (contexte.integriteInvalide) ajouter('integrite_invalide', 100, 'Signature ou checksum vérifié invalide.', true);
  if (contexte.joueurInexistant) ajouter('joueur_inexistant', 100, 'Identité du joueur inexistante.', true);
  if (contexte.recompenseDupliquee) ajouter('recompense_dupliquee', 100, 'Récompense déjà enregistrée.', true);
  if (contexte.precedent) {
    const p = contexte.precedent.fiche;
    const delai = (contexte.maintenant ?? Date.now()) - contexte.precedent.synchroniseLe;
    if (delai > 0 && delai < 10 * 60_000 && (f.saisons > p.saisons + 3 || f.note > p.note + 15)) ajouter('progression_rapide', 20, 'Progression rapide entre deux synchronisations.');
  }
  const riskScore = Math.min(100, regles.reduce((s, r) => s + r.points, 0));
  const statut: StatutValidation = regles.some(r => r.bloquante) ? 'REJECTED'
    : incomplet || riskScore >= 60 ? 'PENDING_VALIDATION' : riskScore >= 30 ? 'LIMITED' : 'ELIGIBLE';
  return { fiche: f, score: f.score, statut, riskScore, regles, visible: !horsClassement && statut !== 'REJECTED',
    recompensesAutorisees: !horsClassement && statut === 'ELIGIBLE', horsClassement, version: 38 };
}

export function validationPublique(e: ValidationClassement): ValidationClassement {
  return { statut: e.statut, riskScore: e.riskScore, regles: e.regles, visible: e.visible,
    recompensesAutorisees: e.recompensesAutorisees, horsClassement: e.horsClassement, version: 38 };
}

/** Audit de l'ancien crible sur les mêmes faits, sans modifier une sauvegarde. */
export function comparaisonValidation(fiches: unknown[], trophees: string[]) {
  const resultats = fiches.map(f => ({ avant: verifierFiche(f, trophees), apres: evaluerClassement(f, trophees) }));
  const causes: Record<string, number> = {};
  const causesApres: Record<string, number> = {};
  for (const r of resultats) for (const motif of r.avant.anomalies) { const regle = motif.split(':')[0].replace(/\d+/g, 'N'); causes[regle] = (causes[regle] ?? 0) + 1; }
  for (const r of resultats) for (const regle of r.apres.regles) causesApres[regle.id] = (causesApres[regle.id] ?? 0) + 1;
  return { total: fiches.length, normalementEligibles: resultats.filter(r => !r.apres.horsClassement).length,
    classeesAvant: resultats.filter(r => r.avant.valide && !r.apres.horsClassement).length,
    visiblesApres: resultats.filter(r => r.apres.visible).length,
    recuperees: resultats.filter(r => !r.avant.valide && r.apres.visible).length,
    statuts: Object.fromEntries(['ELIGIBLE', 'LIMITED', 'PENDING_VALIDATION', 'REJECTED'].map(s => [s, resultats.filter(r => r.apres.statut === s && !r.apres.horsClassement).length])),
    causesAvant: Object.entries(causes).sort((a, b) => b[1] - a[1]), causesApres: Object.entries(causesApres).sort((a,b)=>b[1]-a[1]) };
}
