import type { Joueur } from '../src/types';
import {
  appliquerSanctionSociale,
  evaluerEmbrouilleSociale,
  type NiveauSanctionSociale,
  type SanctionSociale,
} from '../src/lib/disciplineSociale';
import { estTitulaire } from '../src/lib/moteur/titulaire';

function verifier(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const joueur: Joueur = {
  nom: 'Test Clash', pseudo: 'test_clash', poste: 'ailier_droit', nation: 'France',
  club: 'Stade Toulousain', division: 'top14', age: 24,
  attributs: { vitesse: 82, force: 74, endurance: 78, plaquage: 70, passe: 76, jeuAuPied: 68, vision: 75, mental: 72 },
  forme: 85, moral: 80, reputation: 70, argent: 25_000, saison: 2,
  matchsJoues: 42, essais: 16, titres: [], confianceCoach: 50, popularite: 65,
  contrat: { club: 'Stade Toulousain', division: 'top14', saisons: 2, salaire: 120_000 },
};

verifier(
  evaluerEmbrouilleSociale(joueur, 'Bravo pour ton match', {
    canal: 'commentaire', cle: 'calme', relation: 10, cibleType: 'joueur',
  }) === null,
  'Un message normal déclenche une sanction.',
);

function trouver(
  niveau: NiveauSanctionSociale,
  texte: string,
  patch: Partial<Joueur> = {},
): SanctionSociale {
  for (let i = 0; i < 500; i++) {
    const sanction = evaluerEmbrouilleSociale({ ...joueur, ...patch }, texte, {
      canal: niveau === 'avertissement' || niveau === 'amende' ? 'publication' : 'commentaire',
      cle: `test-${niveau}-${i}`, relation: niveau === 'exclusion' ? -90 : 0,
      cibleType: 'joueur',
    });
    if (sanction?.niveau === niveau) return sanction;
  }
  throw new Error(`Impossible d'obtenir la sanction ${niveau}.`);
}

const avertissement = trouver('avertissement', 'T’es un clown');
const amende = trouver('amende', 'T’es un clown');
const banc = trouver('banc', 'Ferme-la bouffon');
const suspension = trouver('suspension', 'Ferme-la bouffon', { confianceCoach: 35 });
const exclusion = trouver('exclusion', 'Ferme-la bouffon', { confianceCoach: 10 });

verifier(avertissement.amende === 0, 'Un avertissement ne doit pas vider le compte bancaire.');
verifier(amende.amende > 0, 'La sanction financière ne contient aucune amende.');

const apresBanc = appliquerSanctionSociale(joueur, banc).joueur;
verifier((apresBanc.miseAuBanc?.semaines ?? 0) > 0, 'La mise au banc n’est pas persistée.');
for (let i = 0; i < 20; i++) {
  verifier(!estTitulaire(apresBanc, `match-${i}`), 'Un joueur sanctionné a été titularisé.');
}

const apresSuspension = appliquerSanctionSociale(joueur, suspension).joueur;
verifier((apresSuspension.blessure?.semaines ?? 0) === suspension.semaines, 'La suspension ne bloque pas les matchs.');

const apresExclusion = appliquerSanctionSociale(joueur, exclusion);
verifier(apresExclusion.exclusion, 'L’exclusion n’est pas signalée au marché.');
verifier(apresExclusion.joueur.contrat?.saisons === 0, 'Le contrat n’est pas rompu après exclusion.');

let fuiteTrouvee = false;
for (let i = 0; i < 500; i++) {
  const fuite = evaluerEmbrouilleSociale(joueur, 'Ferme-la bouffon', {
    canal: 'messagePrive', cle: `fuite-${i}`, relation: -80, cibleType: 'hater',
  });
  if (fuite?.fuite) { fuiteTrouvee = true; break; }
}
verifier(fuiteTrouvee, 'Aucune capture privée ne peut fuiter.');

console.log('OK — clashs, fuites, avertissement, amende, banc, suspension et exclusion vérifiés.');
