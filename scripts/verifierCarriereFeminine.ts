// BANC DE LA CARRIÈRE SOLO FÉMININE — npx vite-node scripts/verifierCarriereFeminine.ts
//
// ⚠️ LE MONDE SE CHOISIT AVANT D'IMPORTER LE JEU (`lib/mondeActif.ts`) : ce banc pose `__DESTINY_MONDE = 'F'`, puis charge
// tout par import dynamique. Il tient que : le monde chargé est bien celui des joueuses (aucun club ni joueur masculin) ;
// une carrière de joueuse se crée en Élite 2 et se joue sur plusieurs saisons sans erreur ; ses coéquipières et ses
// adversaires sont des joueuses ; les classements, phases finales et mouvements entre Élite 1 et Élite 2 fonctionnent.
(globalThis as { __DESTINY_MONDE?: string }).__DESTINY_MONDE = 'F';

let controles = 0, echecs = 0;
const ok = (condition: unknown, quoi: string) => { controles++; if (!condition) { echecs++; console.error('ÉCHEC :', quoi); } };

const { MONDE_FEMININ } = await import('../src/lib/mondeActif');
const { COMPETITIONS, DIVISIONS_FRANCE, clubParNom, competitionDuClub } = await import('../src/data/clubs');
const { effectifDuClub, forceEffectif, noteDuClub } = await import('../src/lib/effectif');
const { catalogueBaseCarriere } = await import('../src/lib/ligue/catalogueCarriere');
const { CLUBS_FEMININS } = await import('../src/data/mondeFeminin.generated');

ok(MONDE_FEMININ, 'le monde chargé est féminin');
ok(COMPETITIONS.length === 11 && COMPETITIONS.every(c => c.id.startsWith('f-')), `onze compétitions, toutes féminines (${COMPETITIONS.length})`);
ok(DIVISIONS_FRANCE.map(c => c.id).join() === 'f-elite1,f-elite2', 'pyramide française : Élite 1, Élite 2');
ok(!clubParNom('Union Bordeaux Bègles') && !clubParNom('Champagnole'), 'aucun club du monde masculin');
ok(competitionDuClub('Stade Toulousain')?.id === 'f-elite1' && competitionDuClub('Racing 92')?.id === 'f-elite2', 'les clubs homonymes sont ceux des joueuses');

const catalogue = catalogueBaseCarriere();
ok(catalogue.length > 2500 && catalogue.every(c => c.gender === 'female'), `catalogue : ${catalogue.length} joueuses, aucune carte masculine`);
ok(!catalogue.some(c => c.nom === 'Antoine DUPONT'), 'Antoine Dupont n’est pas de ce monde');

let incomplets = 0;
for (const club of CLUBS_FEMININS) {
  const effectif = effectifDuClub(club, 1);
  if (effectif.length < 26) { incomplets++; console.error('Effectif incomplet :', club, effectif.length); }
}
ok(incomplets === 0, `chaque club aligne au moins 26 joueuses (${incomplets} en dessous)`);
ok(effectifDuClub('Canterbury Women', 1).some(j => j.photo?.startsWith('/photos/feminines/')), 'Canterbury conserve ses internationales et leurs portraits malgré leur inscription en Aupiki');
const toulouse = effectifDuClub('Stade Toulousain', 1);
ok(toulouse.some(j => j.nom === 'Pauline BOURDON SANSUS') && !toulouse.some(j => j.nom === 'Antoine DUPONT'), 'Stade Toulousain : Bourdon Sansus, pas Dupont');
ok(toulouse.filter(j => j.photo?.startsWith('/photos/feminines/')).length > 20, 'les portraits sont ceux des joueuses');
ok(forceEffectif('Stade Bordelais', 1) > forceEffectif('Nancy Seichamps Rugby', 1), 'Bordeaux est plus fort que Nancy');
// ⚠️ La note d'un club homonyme d'un club masculin est celle de ses JOUEUSES (le Stade Toulousain des hommes vaut 90).
ok(noteDuClub('Stade Toulousain') < 88 && noteDuClub('Racing 92') < 72, `notes de clubs féminines (Toulouse ${noteDuClub('Stade Toulousain')}, Racing ${noteDuClub('Racing 92')})`);

// ── Une carrière de joueuse ──
const { useGame } = await import('../src/store/useGame');
const g = () => useGame.getState();
g().creerJoueur({ nom: 'Lou Essai', poste: 'demi_melee', nation: 'France', club: 'Stade Rennais Rugby', division: 'f-elite2', age: 19 });
ok(g().joueur?.club === 'Stade Rennais Rugby' && g().joueur?.division === 'f-elite2', 'carrière créée au Stade Rennais, en Élite 2');
// Toutes les saisons se jouent semaine par semaine : aucun raccourci réservé à la pyramide masculine.
let semaines = 0;
try {
  while (g().joueur && g().joueur!.saison === 1 && semaines < 70) { g().semaineSuivante(); semaines++; if (g().scenarioEnCours) g().resoudreChoix(0); }
} catch (erreur) { ok(false, `semaine ${semaines} : ${(erreur as Error).stack?.split('\n').slice(0, 4).join(' | ')}`); }
ok(g().joueur?.saison === 2 && semaines >= 40, `première saison jouée semaine par semaine (${semaines} semaines)`);
ok((g().joueur?.matchsJoues ?? 0) >= 1, `la joueuse a disputé au moins un match (${g().joueur?.matchsJoues})`);
ok(g().journal.some(e => /Élite 2 Féminine/.test(String(e.titre ?? '') + String(e.texte ?? ''))), 'le journal parle de l’Élite 2 Féminine');
ok(g().journal.some(e => /accède|Montées|descen/i.test(String(e.titre ?? '') + String(e.texte ?? ''))), 'montées et descentes entre Élite 1 et Élite 2 annoncées');
const saisons: string[] = [];
for (let s = 2; s <= 8; s++) {
  const avant = g().joueur;
  if (!avant) break;
  try {
    let semainesDeLaSaison = 0;
    while (g().joueur?.saison === avant.saison && semainesDeLaSaison++ < 70) {
      // Comme à l'écran : une joueuse libre doit signer l'offre reçue avant de reprendre les matchs.
      if ((g().joueur?.contrat?.saisons ?? 1) <= 0 && !g().joueur?.preAccord) {
        const offre = g().approches.filter(a => a.etat === 'ouverte').sort((a, b) => b.noteClub - a.noteClub)[0];
        if (offre) g().accepterApproche(offre.id);
      }
      g().semaineSuivante();
      if (g().scenarioEnCours) g().resoudreChoix(0);
    }
    ok(g().joueur?.saison === avant.saison + 1, `saison ${s} : calendrier entièrement parcouru`);
    ok(g().joueur!.matchsJoues >= avant.matchsJoues, `saison ${s} : les statistiques sont conservées, même sur le banc`);
  }
  catch (erreur) { ok(false, `saison ${s} : ${(erreur as Error).stack?.split('\n').slice(0, 4).join(' | ')}`); break; }
  const j = g().joueur;
  if (!j) { saisons.push(`S${s} : carrière terminée`); break; }
  const generale = Math.round(Object.values(j.attributs).reduce((a, b) => a + b, 0) / 8);
  saisons.push(`S${avant.saison} → ${j.club} (${j.division}) · gén ${generale} · ${j.matchsJoues} matchs, ${j.essais} essais · titres ${j.titres.length}`);
  ok(Boolean(competitionDuClub(j.club)), `saison ${s} : le club ${j.club} existe dans ce monde`);
  ok(String(j.division).startsWith('f-'), `saison ${s} : division féminine (${j.division})`);
}
console.log(saisons.join('\n'));
ok(saisons.length >= 7 && Boolean(g().joueur), `huit saisons jouées, carrière toujours en cours (${saisons.length})`);
ok((g().joueur?.matchsJoues ?? 0) >= 10, 'la carrière compte des matchs disputés sur plusieurs saisons');
ok(g().journal.length > 5, 'le journal se remplit');
const bourdon = catalogue.find(c => c.nom === 'Pauline BOURDON SANSUS' && c.clubReel === 'Stade Toulousain')!;
ok(g().creerJoueurExistant(bourdon), 'on peut incarner Pauline Bourdon Sansus');
ok(g().joueur?.genre === 'F' && g().joueur?.division === 'f-elite1', 'la carrière réelle conserve le genre féminin et le bon championnat');
ok(g().joueur?.photo === bourdon.photo && g().joueur?.rankedCareer === false, 'portrait conservé et carrière réelle hors classement');
ok(!effectifDuClub('Stade Toulousain', 1).some(j => j.nom === bourdon.nom), 'la joueuse incarnée est retirée de son effectif');
const { joueurIncarnable } = await import('../src/lib/carriereExistante');
ok(!joueurIncarnable({ ...bourdon, gender: 'male' }), 'une carte masculine homonyme ne peut pas entrer dans la carrière féminine');

console.log(`${controles - echecs}/${controles} contrôles`);
if (echecs) process.exitCode = 1;
