import assert from 'node:assert/strict';
import { collectifCarriere } from '../src/lib/ligue/collectifCarriere';
import { creerCarriere, agirCarriere, vueCarriere } from '../src/lib/ligue/carriere';
import type { CarteCarriere } from '../src/lib/ligue/typesCarriere';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { LIGNE_B } from '../src/lib/moteur/terrain';

for (const [cle, seuil] of [['clubReel',3], ['nation',5], ['championnat',7]] as const) {
  for (const taille of [seuil-1,seuil,seuil+1]) {
    const cartes = Array.from({length:23},(_,i)=>({id:`c${i}`, clubReel:`club${i}`, nation:`nation${i}`, championnat:`ligue${i}`, [cle]:i<taille?'commun':`${cle}${i}`} as CarteCarriere));
    const resultat=collectifCarriere(cartes,{titulaires:cartes.slice(0,15).map(c=>c.id)});
    assert.equal(resultat.parCarte.c0.points === 10, taille>=seuil);
    assert.equal(resultat.parCarte.c15,undefined,'Le banc ne doit pas gonfler le collectif.');
  }
}

const maintenant=Date.parse('2026-09-26T12:00:00Z');
const etat=creerCarriere({id:'12345678-1234-1234-1234-123456789abc',nom:'Test célébration',code:'DR-FETE',compteId:'compte-a',pseudo:'Alice',clubNom:'Club A',rythme:1,maxClubs:4},maintenant,'celebration-test');
const club=etat.clubs[0];
etat.histoire.push({competitionId:'coupe-a',nom:'Coupe',trophee:'Coupe',saison:1,vainqueur:club.id,date:new Date(maintenant).toISOString()});
const commande={type:'celebrationVue' as const,competitionId:'coupe-a',saison:1};
const vue=vueCarriere(agirCarriere(etat,'compte-a',commande,maintenant,'test'),'compte-a');
assert.deepEqual(vue.clubs[0].tropheesVus,['coupe-a:1']);
const repete=agirCarriere(agirCarriere(etat,'compte-a',commande,maintenant,'test'),'compte-a',commande,maintenant,'test');
assert.equal(repete.clubs[0].tropheesVus?.length,1);
assert.throws(()=>agirCarriere(etat,'compte-a',{...commande,saison:2},maintenant,'test'));

const a=effectifDuClub('Stade Toulousain',1), b=effectifDuClub('Stade Rochelais',1);
for(let i=0;i<3;i++) {
  const match=creerMatch('Stade Toulousain','Stade Rochelais',a,b,24,20,`dix-minutes-${i}`);
  match.carriereDixMinutes=true;
  let secondes=0;
  while(!match.fini && secondes<750){avancer(match,0.15);secondes+=0.15;}
  assert.ok(match.fini,'Le match doit se terminer.');
  assert.ok(secondes>=590 && secondes<730,`Durée inattendue : ${secondes}s`);
  console.log(`Match ${i+1} : ${Math.round(secondes)} secondes, ${match.scoreA}–${match.scoreB}`);
}
// Un défenseur arrivé pendant le plongeon ne peut plus annuler l'essai en solo.
const match=creerMatch('Stade Toulousain','Stade Rochelais',a,b,24,20,'en-but');
match.carriereDixMinutes=true;
const porteur=match.pions.find(p=>p.cote==='A' && p.surLeTerrain)!;
porteur.pos={x:LIGNE_B+1,y:35};
match.porteur=porteur; match.possession='A'; match.phase='aplatissage'; match.minuteur=.01;
match.aplatissage={marqueur:porteur,origine:'jeu',lieu:{...porteur.pos}};
match.rng=()=>0;
for(const pion of match.pions.filter(p=>p.cote==='B')) pion.pos={...porteur.pos};
for(let i=0;i<100 && !match.scoreA;i++) avancer(match,.15);
assert.ok(match.scoreA>=5,'Le ballon dans l’en-but doit donner un essai sans sauvetage aléatoire.');
console.log('OK — seuils 3/5/7, célébration persistée, durée naturelle et essai en solo.');
