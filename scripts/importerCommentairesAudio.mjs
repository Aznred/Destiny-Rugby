// Réutilise les enregistrements déjà extraits de l'APK dans l'espace de travail.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(racine, '../analyse-rn26/projet-unity-recupere/ExportedProject/Assets/AudioClip');
const cible = path.join(racine, 'public/rn26/commentaires');
const groupes = ['ScoreTryGeneric', 'ConversionScored', 'ConversionMissed', 'DropGoalScore',
  'ScorePenaltyGeneric', 'OpenPlayStandingTackleSuccess', 'OpenPlayLineBreak', 'RefereeScrum',
  'RefereeLineout', 'LineoutCatchSuccess', 'MaulCalled', 'RefereePenalty', 'SentOffYellowCard',
  'KnockOn', 'OpenPlayPassForward', 'ClearanceKicked', 'OpenPlayKickHigh', 'OpenPlayKickGrubber',
  'SubstituteOn', 'RuckTurnover', 'PreKickOffFirstHalf', 'PreKickOffSecondHalf', 'HalfTime', 'FullTime', 'FillerCrowd'];
const fichiers = fs.readdirSync(source);
const catalogue = {};
let octets = 0, nombre = 0;
fs.mkdirSync(cible, { recursive: true });
for (const groupe of groupes) {
  const clips = fichiers.filter(f => new RegExp(`^${groupe}_\\d+\\.ogg$`).test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (!clips.length) throw new Error(`Enregistrements manquants : ${groupe}`);
  catalogue[groupe] = clips.map(fichier => {
    fs.copyFileSync(path.join(source, fichier), path.join(cible, fichier));
    octets += fs.statSync(path.join(cible, fichier)).size; nombre++;
    return `/rn26/commentaires/${fichier}`;
  });
}
fs.writeFileSync(path.join(racine, 'src/data/commentairesAudio.json'), JSON.stringify(catalogue, null, 2) + '\n');
console.log(`${nombre} commentaires originaux anglais, ${groupes.length} familles, ${(octets / 1048576).toFixed(1)} Mo. Chargement à la demande.`);
