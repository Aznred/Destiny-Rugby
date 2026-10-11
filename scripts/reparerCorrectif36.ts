// npm run repair:correctif36 -- chemin/sauvegarde.json
// Écrit une copie et son rapport ; ne remplace jamais le fichier d'origine.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setMouvementsClubs, setArriveesClubs } from '../src/lib/divisions';
import { setTransfertsSociaux } from '../src/lib/effectif';
import { enregistrerResultatJoue, effacerResultatsJoues } from '../src/lib/championnat';
import { analyserReparationPlayoffs } from '../src/lib/reparationPlayoffs';
import type { Manager, Joueur } from '../src/types';

const entree = process.argv[2];
if (!entree) throw new Error('Préciser le chemin du fichier JSON de sauvegarde.');
const chemin = resolve(entree);
const document = JSON.parse(readFileSync(chemin, 'utf8'));
const etat = document.state ?? document;
const manager: Manager | undefined = etat.manager;
const joueur: Joueur | undefined = etat.joueur;
const carriere = manager ?? (joueur && { ...joueur, division: joueur.division ?? '', semaine: joueur.semaine ?? 1 });
if (!carriere?.club || !carriere.division) throw new Error('Aucune carrière de club dans cette sauvegarde.');
setMouvementsClubs(etat.mouvementsClubs ?? {}); setArriveesClubs(etat.arriveesClubs ?? {});
setTransfertsSociaux(etat.transfertsSociaux ?? []); effacerResultatsJoues();
for (const r of Object.values(manager?.resultats ?? {})) enregistrerResultatJoue(r.cle, {
  domicile: r.domicile ? r.club : r.adversaire, exterieur: r.domicile ? r.adversaire : r.club,
  scoreD: r.domicile ? r.scorePour : r.scoreContre, scoreE: r.domicile ? r.scoreContre : r.scorePour,
  essaisD: r.domicile ? r.essaisPour : r.essaisContre, essaisE: r.domicile ? r.essaisContre : r.essaisPour,
  prolongation: r.prolongation, tirsAuBut: r.tirsAuBut,
  ...(r.vainqueur ? { vainqueurDesigne: (r.vainqueur === 'pour') === r.domicile ? 'D' as const : 'E' as const } : {}),
});
for (const [cle, match] of Object.entries(joueur?.resultatsClub ?? {})) enregistrerResultatJoue(cle, match);
for (const [cle, match] of Object.entries(etat.resultatsPhasesFinales ?? {})) enregistrerResultatJoue(cle, match as import('../src/lib/championnat').MatchChampionnat);
const rapport = analyserReparationPlayoffs(carriere);
carriere.semaine = rapport.semaineReprise;
if (manager) etat.manager = carriere; else etat.joueur = carriere;
etat.correctifPlayoffsApplique = 36; etat.reparationPlayoffs = rapport;
if (document.state) document.version = 36;
writeFileSync(chemin + '.correctif36.json', JSON.stringify(document), { flag: 'wx' });
writeFileSync(chemin + '.rapport36.json', JSON.stringify(rapport, null, 2), { flag: 'wx' });
console.log(`Copie réparée : ${chemin}.correctif36.json\nRapport : ${chemin}.rapport36.json`);
