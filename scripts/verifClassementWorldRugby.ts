// Vérifie les notes fournies et la formule d'échange World Rugby intégrée au jeu.
import {
  CLASSEMENT_WORLD_RUGBY_INITIAL,
  NOTE_WORLD_RUGBY_INITIALE,
} from '../src/data/classementWorldRugby';
import {
  appliquerEchangeWorldRugby,
  echangeWorldRugby,
} from '../src/lib/classementWorldRugby';
import { classementMondial, forceNation } from '../src/lib/international';
import { CALENDRIER } from '../src/data/calendrier';

let erreurs = 0;
function verifier(libelle: string, condition: boolean, detail = ''): void {
  if (!condition) erreurs++;
  console.log(`  ${condition ? '✅' : '❌'} ${libelle}${detail ? ` — ${detail}` : ''}`);
}

const proche = (a: number, b: number) => Math.abs(a - b) < 0.001;

console.log('=== 1. LE CLASSEMENT FOURNI EST REPRIS À L’IDENTIQUE ===');
verifier('114 sélections classées', CLASSEMENT_WORLD_RUGBY_INITIAL.length === 114,
  String(CLASSEMENT_WORLD_RUGBY_INITIAL.length));
verifier('aucun doublon de nation',
  new Set(CLASSEMENT_WORLD_RUGBY_INITIAL.map((ligne) => ligne.nation)).size
    === CLASSEMENT_WORLD_RUGBY_INITIAL.length);
verifier('Afrique du Sud à 93,96', NOTE_WORLD_RUGBY_INITIALE['Afrique du Sud'] === 93.96);
verifier('France à 87,43', NOTE_WORLD_RUGBY_INITIALE.France === 87.43);
verifier('Samoa américaines à 7,53', NOTE_WORLD_RUGBY_INITIALE['Samoa Américaines'] === 7.53);
verifier('la force des matchs vient de la même table', forceNation('France') === 87.43);

console.log('\n=== 2. L’EXEMPLE GALLES–ÉCOSSE EST REPRODUIT ===');
const victoireGalles = echangeWorldRugby({
  noteDomicile: 76.92,
  noteExterieur: 76.36,
  scoreDomicile: 23,
  scoreExterieur: 10,
});
verifier('avantage domicile : écart corrigé de 3,56', proche(victoireGalles.ecartCorrige, 3.56));
verifier('victoire galloise : +0,64', proche(victoireGalles.variationDomicile, 0.64));
verifier('l’Écosse perd exactement 0,64', proche(victoireGalles.variationExterieur, -0.64));

const nul = echangeWorldRugby({
  noteDomicile: 76.92,
  noteExterieur: 76.36,
  scoreDomicile: 20,
  scoreExterieur: 20,
});
verifier('match nul : le favori à domicile perd 0,36', proche(nul.variationDomicile, -0.36));

const exploitEcossais = echangeWorldRugby({
  noteDomicile: 76.92,
  noteExterieur: 76.36,
  scoreDomicile: 16,
  scoreExterieur: 20,
});
verifier('victoire écossaise : l’outsider gagne 1,36', proche(exploitEcossais.variationExterieur, 1.36));

console.log('\n=== 3. LES COEFFICIENTS SONT APPLIQUÉS ===');
const large = echangeWorldRugby({
  noteDomicile: 76.92,
  noteExterieur: 76.36,
  scoreDomicile: 30,
  scoreExterieur: 10,
});
verifier('plus de 15 points : coefficient 1,5', large.coefficient === 1.5);
verifier('0,64 devient 0,96', proche(large.variationDomicile, 0.96));

const mondial = echangeWorldRugby({
  noteDomicile: 76.92,
  noteExterieur: 76.36,
  scoreDomicile: 23,
  scoreExterieur: 10,
  terrainNeutre: true,
  coupeDuMonde: true,
});
verifier('Coupe du monde : coefficient doublé', mondial.coefficient === 2);
verifier('terrain neutre : aucun bonus de trois points', proche(mondial.ecartCorrige, 0.56));

console.log('\n=== 4. L’ÉCHANGE RESTE À SOMME NULLE ET ENTRE 0 ET 100 ===');
const borne = appliquerEchangeWorldRugby({
  noteDomicile: 99.90,
  noteExterieur: 80,
  scoreDomicile: 40,
  scoreExterieur: 0,
});
verifier('la note domicile ne dépasse pas 100', borne.noteDomicile <= 100);
verifier('la somme des deux notes ne change pas',
  proche(borne.noteDomicile + borne.noteExterieur, 179.90));
verifier('chaque échange est strictement opposé',
  proche(borne.echange.variationDomicile + borne.echange.variationExterieur, 0));

console.log('\n=== 5. LE CLASSEMENT VIT DANS LA CARRIÈRE ===');
const debut = classementMondial(1);
verifier('le classement initial commence par l’Afrique du Sud',
  debut[0]?.nation === 'Afrique du Sud' && debut[0]?.points === 93.96);
verifier('la Nouvelle-Zélande est deuxième',
  debut[1]?.nation === 'Nouvelle-Zélande' && debut[1]?.points === 92.28);
const premiereFenetre = CALENDRIER.find((semaine) => semaine.type === 'international');
const apresPremiersMatchs = classementMondial(1, (premiereFenetre?.numero ?? 1) + 1);
const changement = debut.some((ligne) => {
  const apres = apresPremiersMatchs.find((candidate) => candidate.nation === ligne.nation);
  return apres && apres.points !== ligne.points;
});
verifier('les premiers matchs internationaux font bouger les notes', changement);
verifier('aucune note vivante ne sort de 0–100',
  apresPremiersMatchs.every((ligne) => ligne.points >= 0 && ligne.points <= 100));
verifier('aucune sélection n’apparaît deux fois',
  new Set(apresPremiersMatchs.map((ligne) => ligne.nation)).size === apresPremiersMatchs.length);

const longueCarriere = classementMondial(15, CALENDRIER.length);
verifier('quinze saisons, Coupes du monde comprises, restent calculables',
  longueCarriere.length >= 114 && longueCarriere.every((ligne) => Number.isFinite(ligne.points)));
verifier('le classement de long terme reste trié',
  longueCarriere.every((ligne, index) => index === 0
    || longueCarriere[index - 1].points >= ligne.points));

if (erreurs) {
  console.error(`\n❌ ${erreurs} vérification(s) en échec.`);
  process.exitCode = 1;
} else {
  console.log('\n✅ Classement World Rugby conforme.');
}
