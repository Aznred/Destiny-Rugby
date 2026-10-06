// LA CARRIÈRE AVEC UN JOUEUR EXISTANT, MESURÉE — Correctif 19 (`lib/carriereExistante.ts`).
//
// Ce banc ne regarde pas d'écran : il joue la carrière d'Antoine DUPONT (et de quelques milliers d'autres cartes)
// à travers le vrai store, et vérifie ce qui ne doit jamais arriver :
//
//  1. ⚠️ une carrière avec un joueur existant ne compte JAMAIS au classement : rien ne part au serveur (même
//     `force`), le classement local l'ignore, le Panthéon la garde en la marquant, et aucune action ne peut la
//     remettre « classée » — y compris un drapeau réécrit à la main ;
//  2. ⚠️ la carte du catalogue ne bouge pas d'un point, quoi qu'il arrive à la carrière ;
//  3. le joueur incarné n'existe pas deux fois : il sort de l'effectif de son club, de sa sélection, de ses
//     concurrents — et y revient quand la carrière s'arrête ;
//  4. ce qui est repris de la carte l'est vraiment (nom, âge, club, poste, postes secondaires, nation, photo,
//     GEN, pied, rôles), et la GEN de départ est EXACTEMENT celle de la carte ;
//  5. les cartes spéciales (ICONS, Halloween) ne sont pas proposées, sauf option explicite, et seulement les retraités ;
//  6. la recherche trouve (nom, club, championnat, nation, poste, GEN) ;
//  7. une carrière créée normalement est inchangée : classée, sans joueur incarné.
//
// Lancer : npm run verify:carriere-existante
import './_envClassement';
import assert from 'node:assert/strict';
import { useGame, classementComplet, noteGlobale } from '../src/store/useGame';
import { catalogueMondialCarriere, type SourceCarte } from '../src/lib/ligue/catalogueCarriere';
import {
  AGE_MAX_EXISTANT, AGE_MIN_EXISTANT, FILTRES_VIDES, attributsDepuisCarte, estCarriereClassee, filtrerJoueursExistants,
  indexerJoueursExistants, joueurDepuisCarte, joueurIncarnable, scoreDeDepart,
} from '../src/lib/carriereExistante';
import { effectifDuClub, forceEffectif } from '../src/lib/effectif';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { IA_MATCH_DE_CARRIERE } from '../src/lib/moteur/ia/reglages';
import { effectifNational } from '../src/lib/international';
import { estJoueurIncarne, joueurIncarne, versionJoueurIncarne } from '../src/lib/joueurIncarne';
import { competitionDuClub } from '../src/data/clubs';
import { rolesDuJoueur } from '../src/lib/responsabilites';
import { jouerUneSaison } from './_saison';

let ok = 0;
const verifier = (condition: unknown, message: string) => { assert.ok(condition, message); ok++; };
const g = () => useGame.getState();

/** Gèle une valeur en profondeur : toute écriture sur la carte lèverait une exception. */
function geler<T>(valeur: T): T {
  if (valeur && typeof valeur === 'object' && !Object.isFrozen(valeur)) {
    Object.freeze(valeur);
    for (const v of Object.values(valeur as object)) geler(v);
  }
  return valeur;
}

// Ce que le jeu enverrait au serveur du classement : un faux `fetch` qui compte.
let envois = 0;
(globalThis as { fetch?: unknown }).fetch = async () => { envois++; return { ok: false, status: 500, json: async () => ({}), text: async () => '' }; };
const laisserPartir = () => new Promise((r) => setTimeout(r, 20));

const catalogue = catalogueMondialCarriere();
const trouver = (sourceId: string): SourceCarte => {
  const c = catalogue.find((x) => x.sourceId === sourceId);
  assert.ok(c, `carte introuvable : ${sourceId}`);
  return c;
};
const dupont = trouver('reel:antoine dupont');

console.log('— Le drapeau du classement —');
{
  verifier(estCarriereClassee({ rankedCareer: true }), 'une carrière créée est classée');
  verifier(!estCarriereClassee({ rankedCareer: false }), 'rankedCareer = false : hors classement');
  verifier(estCarriereClassee({}), 'une sauvegarde d\'avant le Correctif 19 (sans drapeau) reste classée');
  verifier(!estCarriereClassee(null) && !estCarriereClassee(undefined), 'pas de joueur : pas de classement');
  const origine = { sourceId: 'x', genDepart: 90, potentielDepart: 90, clubDepart: 'a', championnatDepart: 'b', ageDepart: 20 };
  verifier(!estCarriereClassee({ rankedCareer: true, origine }), 'un drapeau réécrit à la main ne suffit pas : l\'origine garde la carrière hors classement');
  verifier(!estCarriereClassee({ origine }), 'une origine sans drapeau : hors classement');
}

console.log('— Qui peut-on incarner ? —');
const index = indexerJoueursExistants(catalogue);
{
  verifier(index.length > 70_000, `la quasi-totalité du catalogue est incarnable (${index.length} sur ${catalogue.length})`);
  verifier(index.every((e) => !e.carte.speciale), 'aucune carte spéciale n\'est proposée par défaut');
  verifier(index.every((e) => e.carte.age >= AGE_MIN_EXISTANT && e.carte.age <= AGE_MAX_EXISTANT), 'tous ont un âge de carrière possible');
  verifier(index.every((e, i) => i === 0 || index[i - 1].carte.note >= e.carte.note), 'triés par GEN décroissante');
  verifier(index.every((e) => !!competitionDuClub(e.club)), 'tous ont un club qui existe dans le monde, donc une division');
  // Les légendes : fermées par défaut, ouvertes seulement pour les retraités.
  const base = catalogue.find((c) => !c.speciale)!;
  const icon: SourceCarte = { ...base, sourceId: 'icon:test', nom: 'Légende TEST', speciale: { type: 'icon', evenement: 'icons', design: 'icon', logo: '', animation: 'mythique', retraite: true } };
  const halloween: SourceCarte = { ...base, sourceId: 'hw:test', nom: 'Citrouille TEST', speciale: { type: 'halloween', evenement: 'halloween-2026', design: 'hw', logo: '', animation: 'or', base: base.sourceId } };
  verifier(!joueurIncarnable(icon) && !joueurIncarnable(halloween), 'ICONS et Halloween ne sont pas incarnables par défaut');
  verifier(joueurIncarnable(icon, { legendes: true }), 'l\'option légendes ouvre les ICONS retraités');
  verifier(!joueurIncarnable(halloween, { legendes: true }), 'et jamais une Halloween : c\'est le double d\'un joueur déjà listé');
  const avecLegendes = indexerJoueursExistants([...catalogue.slice(0, 50), icon, halloween], { legendes: true });
  verifier(avecLegendes.some((e) => e.carte.sourceId === 'icon:test') && !avecLegendes.some((e) => e.carte.sourceId === 'hw:test'), 'l\'index suit la même règle');
  verifier(!joueurIncarnable({ ...base, age: 17 + 30 }), 'un joueur de 47 ans n\'est pas incarnable (la carrière s\'arrête à 44)');
  verifier(!joueurIncarnable({ ...base, clubReel: 'Club qui n\'existe pas' }), 'ni un joueur dont le club est inconnu du monde');
}

console.log('— La recherche —');
{
  const f = (partiel: Partial<typeof FILTRES_VIDES>) => filtrerJoueursExistants(index, { ...FILTRES_VIDES, ...partiel });
  verifier(f({}).length === index.length, 'sans filtre, tout le monde');
  verifier(f({ recherche: 'dupont' })[0].carte.sourceId === 'reel:antoine dupont', '« dupont » trouve Antoine DUPONT en premier (le mieux noté)');
  verifier(f({ recherche: 'DUPONT antoine' }).some((e) => e.carte.sourceId === 'reel:antoine dupont'), 'les mots se cherchent dans n\'importe quel ordre');
  verifier(f({ recherche: 'dupönt  ANTOINE' }).some((e) => e.carte.sourceId === 'reel:antoine dupont'), 'sans accents ni majuscules');
  verifier(f({ recherche: 'zzzzzz' }).length === 0, 'aucun résultat pour un nom qui n\'existe pas');
  const toulouse = f({ club: 'Stade Toulousain' });
  verifier(toulouse.length > 20 && toulouse.every((e) => e.club === 'Stade Toulousain'), `le filtre club ne garde que son club (${toulouse.length} joueurs)`);
  verifier(f({ recherche: 'toulousain' }).some((e) => e.club === 'Stade Toulousain'), 'la zone de texte cherche aussi dans le nom du club');
  const top14 = f({ championnat: 'top14' });
  verifier(top14.length > 300 && top14.every((e) => e.division === 'top14'), `le filtre championnat ne garde que son championnat (${top14.length})`);
  const francais = f({ nation: dupont.nation });
  verifier(francais.every((e) => e.nation === dupont.nation) && francais.length > 1000, 'le filtre nation');
  const demis = f({ poste: 'demi_melee' });
  verifier(demis.length > 500 && demis.every((e) => e.poste === 'demi_melee'), 'le filtre poste');
  const etoiles = f({ genMin: 90 });
  verifier(etoiles.length > 5 && etoiles.every((e) => e.carte.note >= 90), `GEN minimale : ${etoiles.length} joueurs à 90 et plus`);
  const fenetre = f({ genMin: 60, genMax: 64 });
  verifier(fenetre.length > 50 && fenetre.every((e) => e.carte.note >= 60 && e.carte.note <= 64), 'une fenêtre de GEN');
  const combine = f({ championnat: 'top14', poste: 'demi_melee', nation: dupont.nation, genMin: 80 });
  verifier(combine.some((e) => e.carte.sourceId === 'reel:antoine dupont')
    && combine.every((e) => e.division === 'top14' && e.poste === 'demi_melee' && e.nation === dupont.nation && e.carte.note >= 80), 'les filtres se combinent (ET)');
}

console.log('— La fiche d\'Antoine DUPONT —');
{
  geler(dupont); // toute écriture sur la carte lèverait une exception
  const { joueur, nomIncarne } = joueurDepuisCarte(dupont);
  verifier(nomIncarne === 'Antoine DUPONT' && joueur.nom === 'Antoine DUPONT', 'le nom est celui de la carte, à l\'identique');
  verifier(joueur.age === dupont.age, `l'âge (${joueur.age})`);
  verifier(joueur.club === 'Stade Toulousain' && joueur.division === 'top14', 'le club et sa division');
  verifier(joueur.contrat?.club === 'Stade Toulousain' && (joueur.contrat?.saisons ?? 0) >= 2, 'un contrat au club');
  verifier(joueur.poste === dupont.poste && joueur.poste === 'demi_melee', 'le poste');
  verifier(JSON.stringify(joueur.postesSecondaires) === JSON.stringify(dupont.postesSecondaires), 'les postes secondaires');
  verifier(joueur.nation === dupont.nation, 'la nationalité');
  verifier(joueur.photo === dupont.photo && !!joueur.photo, 'la photo');
  verifier(noteGlobale(joueur) === dupont.note, `la GEN de départ est EXACTEMENT celle de la carte (${noteGlobale(joueur)} = ${dupont.note})`);
  verifier(joueur.origine?.genDepart === dupont.note && joueur.origine?.sourceId === dupont.sourceId, 'l\'instantané garde la GEN et l\'identité de la carte');
  verifier(joueur.attributs.jeuAuPied >= 85, `son pied vient de sa carte (JDP ${dupont.statistiques.JDP} → jeuAuPied ${joueur.attributs.jeuAuPied})`);
  verifier(joueur.attributs.vitesse >= 85 && joueur.attributs.passe >= 85, 'sa vitesse et sa passe aussi');
  verifier((joueur.potentiel ?? 0) >= dupont.note, 'un potentiel au moins égal à sa note');
  verifier(joueur.rankedCareer === false, 'rankedCareer = false, dès la création');
  verifier(joueur.saison === 1 && joueur.matchsJoues === 0 && joueur.essais === 0 && joueur.titres.length === 0, 'tous les compteurs repartent de zéro');
  // Une copie, pas un lien.
  joueur.attributs.vitesse = 1;
  joueur.postesSecondaires?.push('arriere');
  verifier(dupont.statistiques.VIT === 99 && dupont.postesSecondaires?.length === 1, 'modifier la fiche de la carrière ne touche pas la carte');
  verifier(JSON.stringify(joueurDepuisCarte(dupont)) === JSON.stringify(joueurDepuisCarte(dupont)), 'la même carte donne toujours la même fiche (aucun tirage)');
}

console.log('— Quatre mille cartes, de la Régionale 3 au Top 14 —');
{
  const pas = Math.max(1, Math.floor(index.length / 4000));
  let vues = 0, parNote = 0;
  const parFamille = new Map<string, number>();
  for (let i = 0; i < index.length; i += pas) {
    const c = index[i].carte;
    const a = attributsDepuisCarte(c);
    vues++;
    const valeurs = Object.values(a);
    if (!valeurs.every((v) => Number.isInteger(v) && v >= 5 && v <= 99)) throw new Error(`attribut hors bornes pour ${c.nom}`);
    if (noteGlobale({ attributs: a }) === c.note) parNote++;
    parFamille.set(c.famille, (parFamille.get(c.famille) ?? 0) + 1);
    const { joueur } = joueurDepuisCarte(c);
    if (!competitionDuClub(joueur.club) || joueur.division !== competitionDuClub(joueur.club)!.id) throw new Error(`division incohérente pour ${c.nom}`);
    if (joueur.age < AGE_MIN_EXISTANT || joueur.age > AGE_MAX_EXISTANT) throw new Error(`âge hors bornes pour ${c.nom}`);
  }
  verifier(vues > 3000, `${vues} cartes échantillonnées, aucune ne plante`);
  verifier(parNote === vues, `la GEN de départ est celle de la carte pour ${parNote} cartes sur ${vues}`);
  verifier(parFamille.size === 9, 'toutes les familles de poste sont représentées');
  // Un pilier garde sa silhouette de pilier : plus de force que de vitesse.
  const pilier = index.find((e) => e.carte.famille === 'pilier' && e.carte.note > 70)!.carte;
  const ap = attributsDepuisCarte(pilier);
  verifier(ap.force > ap.vitesse && ap.force > ap.jeuAuPied, `un pilier incarné a la silhouette d'un pilier (force ${ap.force}, vitesse ${ap.vitesse}, pied ${ap.jeuAuPied})`);
}

console.log('— Le monde sans son double —');
{
  const avant = effectifDuClub('Stade Toulousain', 1);
  verifier(avant.some((c) => c.nom === 'Antoine DUPONT'), 'avant : Antoine DUPONT est bien dans l\'effectif de Toulouse');
  const forceAvant = forceEffectif('Stade Toulousain', 1);
  const nationalAvant = effectifNational(dupont.nation, 1);
  verifier(nationalAvant.some((c) => c.nom === 'Antoine DUPONT'), 'et dans le XV de France');
  const autre = effectifDuClub('RC Toulon', 1).length;
  const version = versionJoueurIncarne();
  useGame.getState().reinitialiser();
  g().creerJoueurExistant(dupont);
  verifier(joueurIncarne() === 'Antoine DUPONT' && estJoueurIncarne('Antoine DUPONT'), 'le monde sait qui on incarne');
  verifier(versionJoueurIncarne() > version, 'et ses mémoires sont invalidées');
  const apres = effectifDuClub('Stade Toulousain', 1);
  verifier(!apres.some((c) => c.nom === 'Antoine DUPONT') && apres.length === avant.length - 1, 'après : il n\'est plus qu\'une fois (lui, au poste de la carrière), Toulouse compte un joueur de moins');
  verifier(forceEffectif('Stade Toulousain', 1) < forceAvant, `la force de Toulouse tient compte de son départ (${forceAvant.toFixed(1)} → ${forceEffectif('Stade Toulousain', 1).toFixed(1)}), c'est son apport qui le remplace`);
  verifier(!effectifNational(dupont.nation, 1).some((c) => c.nom === 'Antoine DUPONT'), 'il n\'est plus dans le vivier de sa sélection : on ne dispute pas la place à son double');
  verifier(effectifDuClub('RC Toulon', 1).length === autre, 'les autres clubs ne bougent pas');
}

console.log('— Un vrai match avec Antoine DUPONT —');
{
  const j = g().joueur!;
  for (const titulaire of [true, false]) {
    const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1), 24, 20, `existant-${titulaire}`,
      { club: 'Stade Toulousain', nom: j.nom, poste: j.poste, attributs: j.attributs, titulaire },
      { niveau: 'pro', scoreSurTerrain: true, controle: true, cadenceDetaillee: true, placementJoue: true, ia: IA_MATCH_DE_CARRIERE,
        responsabilites: { avatar: rolesDuJoueur(j) } });
    const siens = e.pions.filter((p) => p.nom === 'Antoine DUPONT');
    verifier(siens.length === 1 && siens[0].moi, `${titulaire ? 'titulaire' : 'remplaçant'} : un seul Antoine DUPONT sur la feuille, et c'est lui qu'on incarne`);
    verifier(siens[0].surLeTerrain === titulaire, `${titulaire ? 'titulaire' : 'remplaçant'} : il est ${titulaire ? 'sur le terrain' : 'sur le banc'}`);
    verifier(e.pions.filter((p) => p.cote === siens[0].cote).length === 23, 'le groupe de Toulouse compte toujours vingt-trois joueurs');
    let garde = 0;
    while (!e.fini && garde++ < 200000) avancer(e, 0.6);
    verifier(e.fini, `${titulaire ? 'titulaire' : 'remplaçant'} : le match va à son terme`);
  }
}

console.log('— Le store : une carrière, pas un clone —');
const instantane = JSON.stringify(dupont);
{
  const j = g().joueur!;
  verifier(j.nom === 'Antoine DUPONT' && j.rankedCareer === false && !!j.origine && g().ecran === 'carriere', 'la carrière s\'ouvre sur l\'écran de carrière, hors classement');
  // Hors navigateur le dictionnaire n'est pas chargé : `t()` rend la clé. On vérifie donc la clé choisie.
  verifier(g().journal.length === 1 && g().journal[0].texte === 'car.debutTexteExistant', 'son journal s\'ouvre sur le texte d\'un joueur existant');
  verifier(typeof j.apportClub === 'number', `le club compte sur lui dès la première saison (apport ${j.apportClub})`);
  verifier(!!j.responsabilites && j.responsabilites.evalueeEn === 1, 'ses rôles sont évalués dès le départ');
  console.log(`  rôles de départ : ${rolesDuJoueur(j).join(', ') || 'aucun'} · confiance du staff ${j.confianceCoach} · réputation ${j.reputation}`);

  // Rien ne part au serveur, même quand on force.
  envois = 0;
  g().publierAuClassement(true);
  g().publierAuClassement(false);
  await laisserPartir();
  verifier(envois === 0, 'publierAuClassement(true) n\'envoie rien pour un joueur existant');
  // Un drapeau réécrit à la main ne rouvre pas la porte.
  useGame.setState({ joueur: { ...g().joueur!, rankedCareer: true } });
  g().publierAuClassement(true);
  await laisserPartir();
  verifier(envois === 0 && !estCarriereClassee(g().joueur), 'même avec rankedCareer remis à true, l\'origine l\'interdit');
  useGame.setState({ joueur: { ...g().joueur!, rankedCareer: false } });

  // Trois saisons de carrière, comme n'importe quelle autre.
  for (let s = 1; s <= 3; s++) {
    const vivant = jouerUneSaison(g, (p) => useGame.setState(p));
    verifier(vivant, `la saison ${s} se joue`);
    verifier(g().joueur!.rankedCareer === false && g().joueur!.origine?.sourceId === dupont.sourceId, `saison ${s} : toujours hors classement`);
  }
  verifier(g().joueur!.saison === 4, 'trois saisons plus tard, nous sommes en saison 4');
  console.log(`  après trois saisons : GEN ${noteGlobale(g().joueur!)} (départ ${g().joueur!.origine!.genDepart}), ${g().joueur!.matchsJoues} matchs, ${g().joueur!.essais} essais, club ${g().joueur!.club}`);
  envois = 0;
  g().publierAuClassement(true);
  await laisserPartir();
  verifier(envois === 0, 'après trois saisons, toujours rien d\'envoyé');
  verifier(JSON.stringify(dupont) === instantane, 'la carte d\'Antoine DUPONT n\'a pas bougé d\'un octet');
  verifier(JSON.stringify(trouver('reel:antoine dupont')) === instantane, 'et le catalogue qui la sert non plus');
  verifier(classementComplet([], g().joueur).length === 0, 'le classement local ne contient pas la carrière en cours');
}

console.log('— La retraite —');
{
  const avantPantheon = g().pantheon.length;
  const j = g().joueur!;
  const coinsAvant = g().coins;
  g().prendreRetraite();
  const legende = g().pantheon[g().pantheon.length - 1];
  verifier(g().pantheon.length === avantPantheon + 1 && legende.nom === 'Antoine DUPONT', 'la carrière entre au Panthéon');
  verifier(legende.horsClassement === true, 'marquée hors classement');
  verifier(classementComplet(g().pantheon, null).every((l) => l.nom !== 'Antoine DUPONT'), 'mais absente du classement local');
  verifier(joueurIncarne() === null, 'le monde reprend son joueur');
  verifier(effectifDuClub('Stade Toulousain', 1).some((c) => c.nom === 'Antoine DUPONT'), 'Antoine DUPONT est de nouveau dans l\'effectif de Toulouse');
  const departScore = scoreDeDepart(j.origine!);
  verifier(departScore > 0 && departScore < legende.score + 1, `le score de départ (${departScore}) est retranché de la récompense de retraite`);
  const naif = Math.round(legende.score / 150);
  const paye = g().coins - coinsAvant;
  verifier(paye <= naif, `la retraite paie ${paye} Ovas au plus (récompense naïve : ${naif}, succès compris)`);
}

console.log('— Un entraîneur issu de cette carrière —');
{
  const legende = g().pantheon[g().pantheon.length - 1];
  g().creerManager({ nom: 'Entraîneur Test', nation: 'France', club: 'Stade Toulousain', age: 40, depuis: legende });
  verifier(g().manager?.horsClassement === true && joueurIncarne() === null, 'le banc d\'un ancien joueur existant est hors classement, et le monde est complet');
  envois = 0;
  g().publierAuClassement(true);
  g().quitterBanc();
  await laisserPartir();
  verifier(envois === 0, 'ni en cours de carrière, ni en quittant le banc, rien ne part au classement des entraîneurs');
  g().creerManager({ nom: 'Entraîneur Classé', nation: 'France', club: 'Champagnole', age: 40 });
  verifier(!g().manager?.horsClassement, 'un banc ordinaire reste classé');
  envois = 0;
  g().publierAuClassement(true);
  await laisserPartir();
  verifier(envois === 1, 'et il part au classement');
  g().reinitialiser();
}

console.log('— Une carrière créée normalement est inchangée —');
{
  g().reinitialiser();
  g().creerJoueur({ nom: 'Tino Test', poste: 'ailier_droit', nation: 'France', club: 'Champagnole', division: 'reg1', age: 18 });
  const j = g().joueur!;
  verifier(j.rankedCareer === true && estCarriereClassee(j) && !j.origine, 'classée, sans origine');
  verifier(joueurIncarne() === null, 'sans joueur incarné');
  verifier(classementComplet([], j).length === 1, 'présente au classement local');
  envois = 0;
  g().publierAuClassement(true);
  await laisserPartir();
  verifier(envois === 1, 'et elle part bien au classement mondial');
  // Rechargement d'une sauvegarde : le joueur incarné est rétabli.
  g().reinitialiser();
  g().creerJoueurExistant(trouver('reel:antoine dupont'));
  const etatSauvegarde = g();
  const options = useGame.persist.getOptions();
  const rechargement = options.onRehydrateStorage?.(etatSauvegarde);
  g().reinitialiser();
  verifier(joueurIncarne() === null, 'après réinitialisation, plus personne');
  rechargement?.(etatSauvegarde);
  verifier(joueurIncarne() === 'Antoine DUPONT', 'au rechargement de la sauvegarde, le monde écarte de nouveau son double');
  g().reinitialiser();
}

console.log(`OK — ${ok} contrôles de la carrière avec un joueur existant.`);
