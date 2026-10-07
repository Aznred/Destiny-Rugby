import type { DossierMedical, DecisionMedicale } from './carriereAvancee.js';
import type { Manager, CompositionManager } from '../types.js';
import type { Coequipier } from './effectif.js';
import { reconcilerCompositionManager } from './compositionManager.js';
import { semaine } from '../data/calendrier.js';

export type StatutMedical = 'indisponible' | 'soins' | 'reeducation' | 'individuelle' | 'collective' | 'risque' | 'apte';
export const STATUTS_MEDICAUX: Record<StatutMedical, string> = {
  indisponible: 'Indisponible', soins: 'Soins', reeducation: 'Rééducation',
  individuelle: 'Reprise individuelle', collective: 'Reprise collective',
  risque: 'Apte avec risque', apte: 'Totalement apte',
};
export const CENTRES_MEDICAUX = [
  { nom: 'Infirmerie amateur', vitesse: 1, prevention: 0, reductionRechute: 0, precision: 10, prix: 0 },
  { nom: 'Suivi médical renforcé', vitesse: 1.05, prevention: .04, reductionRechute: .05, precision: 7, prix: 25_000 },
  { nom: 'Staff médical spécialisé', vitesse: 1.1, prevention: .08, reductionRechute: .1, precision: 5, prix: 150_000 },
  { nom: 'Rééducation avancée', vitesse: 1.15, prevention: .12, reductionRechute: .15, precision: 3, prix: 650_000 },
  { nom: 'Centre médical professionnel', vitesse: 1.2, prevention: .16, reductionRechute: .2, precision: 2, prix: 2_000_000 },
] as const;
export function niveauMedical(m: Pick<Manager, 'centresMedicaux' | 'club'>): number {
  return Math.max(1, Math.min(5, Math.floor(m.centresMedicaux?.[m.club] ?? 1)));
}
export function centreMedical(m: Pick<Manager, 'centresMedicaux' | 'club'>) { return CENTRES_MEDICAUX[niveauMedical(m) - 1]; }
const borne = (n: number) => Math.max(0, Math.min(100, n));

/** Migration sans changer l'absence restante des anciennes sauvegardes. */
export function normaliserSoin(d: DossierMedical): DossierMedical {
  const joursRestants = Math.max(0, d.joursRestants ?? d.semaines * 7);
  const joursEcoules = Math.max(0, d.joursEcoules ?? 0);
  return { ...d, joursRestants, joursEcoules,
    dureeInitiale: Math.max(1, d.dureeInitiale ?? joursRestants + joursEcoules),
    joursReprise: d.joursReprise ?? 0, risqueBase: d.risqueBase ?? d.risqueRechute ?? d.risqueAggravation,
    phase: d.phase ?? (joursRestants > 0 ? 'diagnostic' : 'clos'),
    condition: d.condition ?? 60, rythme: d.rythme ?? 50,
  };
}
export function statutMedical(brut: DossierMedical): StatutMedical {
  const d = normaliserSoin(brut);
  if (d.phase === 'clos') return 'apte';
  if (d.phase === 'suspicion') return 'indisponible';
  if (d.joursRestants! > 0) return (d.guerison ?? 0) < 40 ? 'soins' : 'reeducation';
  if (d.joursReprise! < 7) return 'individuelle';
  if (d.joursReprise! < 14 || (d.condition ?? 0) < 72) return 'collective';
  return 'risque';
}
export function minutesConseillees(d: DossierMedical): number {
  const statut = statutMedical(d);
  if (statut === 'apte') return 80;
  if (!['collective', 'risque'].includes(statut)) return 0;
  return statut === 'collective' ? 30 : (d.condition ?? 0) < 88 ? 40 : 60;
}
export function autorisationMedicale(d: DossierMedical): 'aucune' | 'banc' | 'titulaire' {
  const statut = statutMedical(d);
  if (statut === 'apte') return 'titulaire';
  if (!['collective', 'risque'].includes(statut)) return 'aucune';
  if (['reprise20', 'reprise40', 'disponible', 'traitement'].includes(d.decision)) return 'banc';
  if (['retourDirect', 'forcer'].includes(d.decision) && (!d.protocoleCommotion || statut === 'risque')) return 'titulaire';
  return 'aucune';
}
/** Le risque affiché est celui de la décision courante, sans cumul à chaque clic. */
export function risqueReprise(d: DossierMedical, minutes = autorisationMedicale(d) === 'titulaire' ? 80 : 30, niveau = 1): number {
  if (d.phase === 'clos' || minutes <= 0) return 0;
  const base = Math.max(2, d.risqueBase ?? d.risqueRechute ?? 15);
  const surcharge = Math.max(0, minutes - minutesConseillees(d)) * .3;
  return Math.round(Math.min(60, (base + surcharge) * (1 - CENTRES_MEDICAUX[Math.max(0, Math.min(4, niveau - 1))].reductionRechute)));
}
export function choisirReprise(dossier: DossierMedical, decision: DecisionMedicale): DossierMedical {
  const d = normaliserSoin(dossier);
  if (d.phase === 'clos') return d;
  if (['repos', 'reserve', 'attente'].includes(decision)) return { ...d, decision: 'repos', disponibilite: 0 };
  const statut = statutMedical(d);
  if (!['collective', 'risque'].includes(statut)) return d;
  if (d.protocoleCommotion && statut !== 'risque') return d;
  const banc = ['reprise20', 'reprise40', 'disponible', 'traitement'].includes(decision);
  const titulaire = ['forcer', 'retourDirect'].includes(decision);
  if (!banc && !titulaire) return d;
  const prochain = { ...d, decision: banc ? 'reprise20' as const : 'retourDirect' as const };
  return { ...prochain, disponibilite: banc ? 80 : 90,
    risqueRechute: risqueReprise(prochain), penalitePerformance: Math.round((100 - (d.condition ?? 60)) * .25) };
}
/** Les soins continuent automatiquement. Le bonus ne peut raccourcir de plus de 17 % l'absence initiale. */
export function evoluerSoin(dossier: DossierMedical, niveau = 1, jours = 7): DossierMedical {
  const d = normaliserSoin(dossier);
  if (d.phase === 'clos' || jours <= 0) return d;
  const centre = CENTRES_MEDICAUX[Math.max(0, Math.min(4, niveau - 1))];
  const avant = d.joursRestants!;
  const vitesse = centre.vitesse;
  const joursRestants = Math.max(0, avant - jours * vitesse);
  const joursEcoules = d.joursEcoules! + Math.min(jours, avant / vitesse);
  const joursReprise = d.joursReprise! + Math.max(0, jours - avant / vitesse);
  const guerison = Math.round(borne(100 * (1 - joursRestants / d.dureeInitiale!)));
  const condition = borne((d.condition ?? 60) + (joursRestants > 0 ? 0 : joursReprise - d.joursReprise!) * (1.25 + (niveau - 1) * .08));
  const rythme = borne((d.rythme ?? 50) + (joursRestants > 0 ? 0 : joursReprise - d.joursReprise!) * 1.2);
  const risqueBase = Math.max(3, d.risqueBase! - (joursReprise - d.joursReprise!) * .6);
  const clos = joursRestants === 0 && joursReprise >= 21 && condition >= 92 && rythme >= 88 && risqueBase <= 8;
  const suspicion = d.phase === 'suspicion' && (d.diagnosticDans ?? 0) > jours / 7;
  const suivant: DossierMedical = { ...d, joursRestants, joursEcoules, joursReprise,
    semaines: Math.ceil(joursRestants / 7), guerison, condition: Math.round(condition), rythme: Math.round(rythme), risqueBase,
    phase: clos ? 'clos' : joursRestants === 0 ? 'reprise' : suspicion ? 'suspicion' : 'guerison',
    diagnosticDans: Math.max(0, (d.diagnosticDans ?? 0) - jours / 7),
    douleur: Math.round(borne(d.douleur - jours * 1.5)),
    decision: clos ? 'repos' : avant > 0 && joursRestants === 0 ? 'repos' : d.decision,
    disponibilite: clos ? 100 : 0, penalitePerformance: clos ? 0 : Math.round((100 - condition) * .25),
  };
  suivant.disponibilite = clos ? 100 : autorisationMedicale(suivant) === 'aucune' ? 0 : autorisationMedicale(suivant) === 'banc' ? 80 : 90;
  suivant.risqueRechute = risqueReprise(suivant, suivant.disponibilite ? undefined : 0, niveau);
  return suivant;
}
export function dateMedicale(saison: number, numero: number): Date {
  const s = semaine(numero);
  return new Date(Date.UTC(2025 + saison + (s.mois <= 6 ? 1 : 0), s.mois - 1, s.jour));
}
export function bilanMedical(dossier: DossierMedical, m: Manager) {
  const d = normaliserSoin(dossier);
  const centre = centreMedical(m);
  const absence = Math.ceil(d.joursRestants! / centre.vitesse);
  const date = dateMedicale(m.saison, m.semaine);
  date.setUTCDate(date.getUTCDate() + absence + Math.max(0, 14 - d.joursReprise!));
  const risque = risqueReprise(d, undefined, niveauMedical(m));
  return { statut: statutMedical(d), absence, retour: date, dateBlessure: dateMedicale(d.saison, d.semaine),
    precision: centre.precision, risque, risqueLibelle: risque <= 10 ? 'Faible' : risque <= 25 ? 'Modéré' : 'Élevé',
    aptitude: Math.round((d.guerison ?? 0) * .7 + (d.condition ?? 60) * .3), minutes: minutesConseillees(d),
  };
}
/** Même contrôle à la sauvegarde, à l'affichage et avant de lancer un match. */
export function compositionMedicale(effectif: Coequipier[], composition: Partial<CompositionManager> | undefined, medical: DossierMedical[] = [], indisponibles: ReadonlySet<string> = new Set()): CompositionManager {
  const absents = new Set(indisponibles);
  const bancSeulement = new Set<string>();
  for (const d of medical) {
    const droit = autorisationMedicale(d);
    if (droit === 'aucune') absents.add(d.joueurId);
    if (droit === 'banc') bancSeulement.add(d.joueurId);
  }
  return reconcilerCompositionManager(effectif, composition, absents, bancSeulement);
}
