import { CLUBS_AMATEURS, EFFECTIFS_AMATEURS } from '../src/data/amateurs';
import { COMPETITIONS, clubParNom } from '../src/data/clubs';
import { positionDuClub, distanceKm } from '../src/data/geographie';
import { effectifDuClub } from '../src/lib/effectif';
import { poulesDe } from '../src/lib/championnat';

let echecs = 0;
function verifier(nom: string, ok: boolean, detail = ''): void {
  console.log(`  ${ok ? '✅' : '❌'} ${nom}${detail ? ` · ${detail}` : ''}`);
  if (!ok) echecs++;
}

console.log('\n=== DONNÉES FFR 2026-2027 ===');
const attendus: Record<string, number> = {
  nationale: 14, nationale2: 24, fed1: 48, fed2: 96,
  fed3: 157, reg1: 203, reg2: 232, reg3: 249,
};
for (const [division, nombre] of Object.entries(attendus)) {
  verifier(`${division} contient tous ses clubs`, CLUBS_AMATEURS[division]?.length === nombre,
    `${CLUBS_AMATEURS[division]?.length ?? 0}/${nombre}`);
}

const clubs = Object.values(CLUBS_AMATEURS).flat();
const noms = clubs.map((club) => club.nom);
verifier('un club ne figure qu’à un seul échelon', new Set(noms).size === noms.length,
  `${new Set(noms).size}/${noms.length}`);
const nomsFrance = COMPETITIONS.filter((competition) => competition.zone === 'France')
  .flatMap((competition) => competition.clubs.map((club) => club.nom));
verifier('aucun club amateur ne masque un club professionnel français',
  new Set(nomsFrance).size === nomsFrance.length,
  `${new Set(nomsFrance).size}/${nomsFrance.length}`);
verifier('chaque club porte sa commune', clubs.every((club) => !!club.ville), `${clubs.length} clubs`);
verifier('chaque club porte son département', clubs.every((club) => !!club.departementNum));
verifier('chaque club utilise les coordonnées réelles de sa commune',
  clubs.every((club) => club.latitude != null && club.longitude != null
    && positionDuClub(club.nom).place),
  `${clubs.length}/${clubs.length}`);

const joueurs = Object.values(EFFECTIFS_AMATEURS)
  .reduce((total, effectif) => total + effectif.split('~').filter(Boolean).length, 0);
verifier('tous les joueurs de rugby compétition sont importés', joueurs === 73_999,
  joueurs.toLocaleString('fr-FR'));

let completionsAttendues = 0;
let completionsObservees = 0;
let taillesExactes = true;
for (const club of clubs) {
  const source = EFFECTIFS_AMATEURS[club.nom]?.split('~').filter(Boolean).length ?? 0;
  const jeu = effectifDuClub(club.nom, 1);
  completionsAttendues += Math.max(0, 26 - source);
  completionsObservees += jeu.filter((joueur) => !joueur.id.includes('-am-')).length;
  if (jeu.length !== Math.max(26, source)) taillesExactes = false;
}
verifier('aucun joueur inventé n’est ajouté à un effectif déjà suffisant',
  taillesExactes && completionsObservees === completionsAttendues,
  `${completionsObservees} compléments strictement nécessaires`);

const tyrosse = EFFECTIFS_AMATEURS['US Tyrosse'].split('~').length;
const tyrosseJeu = effectifDuClub('US Tyrosse', 1);
verifier('un effectif FFR complet ne reçoit aucun joueur généré',
  tyrosseJeu.length === tyrosse && tyrosseJeu.every((joueur) => !joueur.id.includes('-complement-')),
  `${tyrosseJeu.length} joueurs`);

const sansListe = clubs.find((club) => !(club.nom in EFFECTIFS_AMATEURS));
const complet = sansListe ? effectifDuClub(sansListe.nom, 1) : [];
verifier('un club sans liste publique est seulement complété au minimum jouable',
  !!sansListe && complet.length === 26 && complet.every((joueur) => !joueur.id.includes('-am-')),
  sansListe ? `${sansListe.nom} · ${complet.length} joueurs` : 'aucun club trouvé');

const d = distanceKm(positionDuClub('US Tyrosse'), positionDuClub('Peyrehorade Sports Rugby'));
verifier('Tyrosse–Peyrehorade est calculé avec les vraies communes', d >= 15 && d <= 30, `${d} km`);

for (const division of ['nationale2', 'fed1', 'fed2', 'fed3', 'reg1', 'reg2', 'reg3']) {
  const poules = poulesDe(division);
  const tailles = poules.map((poule) => poule.length);
  verifier(`${division} garde des poules jouables`, Math.min(...tailles) >= 4 && Math.max(...tailles) <= 16,
    `${poules.length} poules de ${Math.min(...tailles)} à ${Math.max(...tailles)}`);
  for (const poule of poules.filter((p) => p.length <= 3)) {
    console.log('    petite poule :', poule.map((nom) => `${nom} [${clubParNom(nom)?.ligue ?? '?'}]`).join(', '));
  }
}

const nationale = COMPETITIONS.find((competition) => competition.id === 'nationale');
verifier('la Nationale est synchronisée à la frontière de la Nationale 2',
  nationale?.clubs.some((club) => club.nom === 'CS Vienne Rugby') === true
  && nationale.clubs.some((club) => club.nom === 'RC Orléans') === true
  && nationale.clubs.every((club) => club.nom !== 'Niort Rugby Club'));

if (echecs) {
  console.error(`\n❌ ${echecs} contrôle(s) FFR en échec`);
  process.exitCode = 1;
} else console.log('\n✅ Effectifs, clubs, poules et géographie FFR sont cohérents.');
