import assert from 'node:assert/strict';
import { creerMatch, avancer } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { extraireTerrain } from '../src/lib/ligue/matchCarriere';
import { filmer, cadrerFilm, extraireFilm, LecteurFilm } from '../src/lib/ligue/filmDirect';
import { interpolerEtatDirect } from '../src/lib/ligue/interpolationDirect';
import { exclusionsDepuisEtat, logoTV, LIGNES_TV, tempsTV, texteSurCouleur } from '../src/lib/habillageTV';
import type { EtatMatch } from '../src/lib/moteur/etat';

assert.equal(logoTV(), '/favicon.svg');
assert.equal(logoTV('inconnu'), '/favicon.svg');
assert.equal(logoTV('top14'), '/logos-competitions/top14.webp');
assert.equal(tempsTV(573), '09:33');
assert.equal(tempsTV(5087), '84:47');
assert.equal(texteSurCouleur('#ffffff'), '#101613');
assert.equal(texteSurCouleur('#18253e'), '#ffffff');
assert.deepEqual(LIGNES_TV.flatMap(l => l.numeros).sort((a, b) => a - b), Array.from({ length: 15 }, (_, i) => i + 1));

const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1),
  17, 12, 'verification-habillage-tv', undefined, { tempsReel: true, niveau: 'pro', cadenceDetaillee: true });
const [jaune1, jaune2] = e.pions.filter(p => p.cote === 'A' && p.surLeTerrain);
const rouge = e.pions.find(p => p.cote === 'B' && p.surLeTerrain)!;
jaune1.sanction = 572; jaune1.stats.cartonsJaunes = 1; jaune1.surLeTerrain = false;
jaune2.sanction = 221; jaune2.stats.cartonsJaunes = 1; jaune2.surLeTerrain = false;
rouge.sanction = 99999; rouge.stats.cartonsRouges = 1; rouge.surLeTerrain = false;
const sanctions = exclusionsDepuisEtat(e);
assert.equal(sanctions.length, 3, 'Deux jaunes et un rouge hors du terrain sont visibles');
assert.equal(sanctions.find(p => p.id === rouge.id)?.retour, undefined, 'Le rouge ne possède pas de minuterie');
const avant = extraireTerrain(e, 1000);
assert.equal(avant.exclusionsTV?.length, 3);
assert.ok(!avant.pions.some(p => p.id === jaune1.id));
filmer(e); extraireFilm(e); cadrerFilm(e, 0);
avancer(e, .6);
const film = extraireFilm(e);
assert.ok(film?.cle);
const lecteur = new LecteurFilm();
lecteur.recevoir(JSON.parse(JSON.stringify(film)));
const rejoue = extraireTerrain(lecteur.etat as unknown as EtatMatch, 1000);
assert.equal(rejoue.exclusionsTV?.length, 3, 'Les exclus et leurs échéances survivent au film et au JSON');
assert.deepEqual(rejoue.exclusionsTV?.map(p => [p.id, p.type, p.retour]), sanctions.map(p => [p.id, p.type, p.retour]));

const apres = { ...avant, instantJeu: 2, horloge: 2 / 60, exclusionsTV: [...sanctions,
  { ...sanctions[0], id: 'futur', retour: 602 }] };
const milieu = interpolerEtatDirect(avant, apres, .5);
assert.equal(milieu.instantJeu, 1);
assert.equal(milieu.exclusionsTV?.length, 3, 'Un carton futur ne fuit pas dans l’image précédente');
assert.equal(tempsTV(Math.ceil(sanctions[0].retour! - milieu.instantJeu!)), '09:31');
assert.equal(exclusionsDepuisEtat({ pions: [], t: 573, exclusionsTV: sanctions }).length, 1, 'Les deux jaunes expirent, le rouge reste');
jaune1.sanction = 0; jaune2.sanction = 0;
assert.equal(exclusionsDepuisEtat(e).length, 1, 'Les jaunes historiques ne réapparaissent pas après le retour');
console.log('OK — habillage TV : identité de ligue, XV complet, cartons multiples, échéances, expiration, rouge permanent et synchronisation du film.');
