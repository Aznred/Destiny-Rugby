import { strict as assert } from 'node:assert';
import { CALENDRIER, SEMAINES_PAR_SAISON, semaine, estAnneeDeCoupeDuMonde, migrerSemaineCalendrier } from '../src/data/calendrier';
import { datesCompetitionInternationale, numeroDate } from '../src/data/calendrierMondial';
import { mondialEnDirect, afficheMondialDe, journeesParDate } from '../src/lib/mondial';
import { cycleQualification } from '../src/lib/qualificationsMondial';
import { effectifNational, matchInternationalDuJoueur, internationalEnDirect } from '../src/lib/international';
import { actualiserRassemblements, situationInternationale, fenetresDeNation, finDeRassemblement, bilanInternational } from '../src/lib/rassemblements';
import { enregistrerResultatJoue, setResultatsJoues, calendrier } from '../src/lib/championnat';
import { actualiserConvocationsClub, indisponiblesCarriereAvancee } from '../src/lib/carriereAvancee';
import { effectifDuClub } from '../src/lib/effectif';
import { afficheDuClub } from '../src/lib/matchLive';
import { useGame } from '../src/store/useGame';

const g = () => useGame.getState();
assert.equal(CALENDRIER[0].mois,7);
assert.equal(CALENDRIER.at(-1)!.mois,6);
assert.equal(CALENDRIER.filter((s) => s.type === 'phaseFinale').length,4);
assert.deepEqual(CALENDRIER.filter((s) => s.type === 'coupe').map((s) => s.mois),[10,12,1,1,4,4,5,5]);
assert.equal(estAnneeDeCoupeDuMonde(2),true);
assert.equal(estAnneeDeCoupeDuMonde(6),true);
assert.equal(estAnneeDeCoupeDuMonde(1),false);
assert.equal(semaine(migrerSemaineCalendrier(42)).tourFinal,'finale');
const dates = datesCompetitionInternationale('coupeDuMonde','automne',7,2);
assert.equal(dates.length,7);
for (let i=1;i<7;i++) assert.equal(dates[i]-dates[i-1],1);
for (const n of dates) assert.ok(['championnat','coupe'].includes(semaine(n).type),'Les compétitions de clubs continuent pendant le Mondial');
assert.equal(datesCompetitionInternationale('sixNations','tournoi',5,1).length,5);
assert.equal(semaine(datesCompetitionInternationale('rugbyChampionship','sud',3,1)[0]).mois,8);
console.log('✓ calendrier juillet–juin, Europe, fenêtres superposées et migration');

for (let date=0;date<=7;date++) {
  const etat=mondialEnDirect(2,date);
  assert.equal(etat.journeesPoulesJouees,Math.min(date,3));
  assert.equal(etat.bracket.length,[0,0,0,0,8,12,14,16][date]);
  assert.equal(!!etat.vainqueur,date===7);
  assert.equal(journeesParDate(etat).length,date);
}
assert.equal(journeesParDate(mondialEnDirect(2,7)).flat().length,52);
console.log('✓ 36 matchs de poules, 16 éliminatoires, aucun tour anticipé');

g().creerJoueur({ nom: 'Test mondial', poste: 'demi_ouverture', nation:'France', club:'Stade Toulousain', division:'top14', age:24 });
const base=g().joueur!;
const fort={...base, international:undefined, saison:2, semaine:numeroDate(9,4), forme:99, moral:99, reputation:99,
  blessure:null, attributs:Object.fromEntries(Object.keys(base.attributs).map((k)=>[k,99])) as typeof base.attributs};
let joueur=actualiserRassemblements(fort);
assert.equal(situationInternationale(joueur).camp?.competition,'coupeDuMonde');
const fige=JSON.stringify(joueur.international!.rassemblements);
joueur=actualiserRassemblements({...joueur, reputation:1});
assert.equal(JSON.stringify(joueur.international!.rassemblements),fige);
for (let i=0;i<dates.length;i++) {
  joueur={...joueur,semaine:dates[i]};
  const a=situationInternationale(joueur).match;
  assert.ok(a,'La France doit avoir un tour à jouer après chaque victoire');
  const m={...a.match,scoreD:a.match.domicile==='France'?70:0,scoreE:a.match.domicile==='France'?0:70,essaisD:0,essaisE:0};
  enregistrerResultatJoue(a.cle,m);
}
assert.equal(mondialEnDirect(2,7).vainqueur,'France');
console.log('✓ liste figée et résultats joués propagés jusqu’au titre mondial');

setResultatsJoues([]);
const petite=cycleQualification(2).qualifies.at(-1)!;
const camp=fenetresDeNation(petite,2).find((c)=>c.competition==='coupeDuMonde')!;
for (let i=0;i<3;i++) {
  const a=afficheMondialDe(mondialEnDirect(2,i+1),petite,i+1)!;
  enregistrerResultatJoue(a.cle,{...a.match,scoreD:a.match.domicile===petite?0:70,scoreE:a.match.exterieur===petite?0:70,essaisD:0,essaisE:0});
}
assert.equal(finDeRassemblement(camp,dates[2]),camp.fin,'Pas de retour avant le match');
assert.equal(finDeRassemblement(camp,dates[2]+1),dates[2],'Retour avant le week-end suivant, après 5 jours');
assert.equal(matchInternationalDuJoueur({nation:petite,saison:2,semaine:dates[3]}),null);
console.log('✓ nation éliminée en poule libérée, sans huitième fantôme');

setResultatsJoues([]);
for (const saison of [2,6,10]) {
  const cycle=cycleQualification(saison);
  assert.equal(cycle.automatiques.length,12);
  assert.equal(cycle.regions.flatMap((r)=>r.qualifies).length,11);
  assert.equal(cycle.repechage.equipes.length,4);
  assert.equal(cycle.qualifies.length,24);
  assert.equal(new Set(cycle.qualifies).size,24);
  for(const r of cycle.regions) assert.equal(datesCompetitionInternationale(r.competition.id,'tournoi',r.competition.journees,saison-1).length,r.competition.journees);
}
const europe=cycleQualification(2).regions.find((r)=>r.competition.id==='qualif-europe')!.competition;
calendrier(europe.equipes,europe.id+'#1').forEach((tour,j)=>tour.forEach(([d,e])=>{
  if(d==='Belgique'||e==='Belgique') enregistrerResultatJoue(`${europe.id}#1#${j}#${d}#${e}`,
    {domicile:d,exterieur:e,scoreD:d==='Belgique'?70:0,scoreE:e==='Belgique'?70:0,essaisD:d==='Belgique'?10:0,essaisE:e==='Belgique'?10:0});
}));
assert.ok(cycleQualification(2).qualifies.includes('Belgique'));
assert.equal(internationalEnDirect(europe.id,1,99)!.classement[0].club,'Belgique');
console.log('✓ trois cycles, 24 pays uniques, places régionales réellement gagnées');

setResultatsJoues([]);
const six=numeroDate(2,6);
let hors={...fort,saison:3,semaine:six,international:undefined};
const liste=fenetresDeNation('France',3).find((c)=>c.competition==='sixNations')!;
for(let i=0;i<100;i++){
  const essai={...hors,nom:'Réserve '+i,international:{rassemblements:[{...liste,retenu:true,marge:-2}],matchs:{},resultats:{}}};
  if(situationInternationale(essai).role==='horsGroupe'){hors=essai;break;}
}
assert.equal(situationInternationale(hors).role,'horsGroupe');
assert.equal(situationInternationale(hors).indisponibleClub,true);
assert.ok(afficheDuClub({club:hors.club,division:'top14',saison:3,semaine:six}));
useGame.setState({joueur:hors,matchRegarde:'',evenementHebdo:null,scenarioActif:null});
g().semaineSuivante();
assert.equal(g().joueur!.saisonEnCours?.capes ?? 0,0);
assert.equal(g().joueur!.saisonEnCours?.matchs ?? 0,0);
assert.equal(g().joueur!.semaine,six+1);
console.log('✓ hors des 23 : pas de cape, pas de match club, calendrier poursuivi');

// Direct : points réels, cape unique et score restauré après rechargement.
const titulaire={...fort,saison:3,semaine:six,international:{rassemblements:[{...liste,retenu:true,marge:10}],matchs:{},resultats:{}}};
useGame.setState({joueur:titulaire,matchRegarde:'',evenementHebdo:null,scenarioActif:null});
const afficheDirect=situationInternationale(g().joueur!).match!;
const chezNous=afficheDirect.match.domicile==='France';
const feuille={points:11,essais:1,plaquages:10,plaquagesManques:1,passes:15,metres:50,grattages:1,butsTentes:2,butsReussis:2,cartons:0,minutes:80};
g().enregistrerMatchVecu(feuille,{adversaire:chezNous?afficheDirect.match.exterieur:afficheDirect.match.domicile,scorePour:40,scoreContre:7,domicile:chezNous,libelle:'Test'});
g().enregistrerMatchVecu(feuille);
assert.equal(bilanInternational(g().joueur!).capes,1);
assert.equal(bilanInternational(g().joueur!).points,11);
const sauvegarde=JSON.parse(JSON.stringify(g().joueur!)) as typeof titulaire;
setResultatsJoues(Object.entries(sauvegarde.international.resultats).map(([cle,match])=>({cle,match})));
assert.equal(matchInternationalDuJoueur(sauvegarde)!.match[chezNous?'scoreD':'scoreE'],40);
g().semaineSuivante();
assert.equal(bilanInternational(g().joueur!).capes,1,'Ne pas compter à nouveau la cape en avançant');
console.log('✓ direct, points au pied, cape unique et rechargement');

g().creerJoueur({nom:'Test été',poste:'ailier_droit',nation:'France',club:'Stade Toulousain',division:'top14',age:24});
useGame.setState({evenementHebdo:null,scenarioActif:null});
assert.equal(g().avancerJusqua(3).semaines,2);
assert.equal(g().joueur!.saison,1);
assert.equal(g().joueur!.semaine,3);
assert.equal(g().avancerJusqua(Number.NaN).semaines,0);
assert.equal(bilanInternational(g().joueur!).capes,0);

g().creerManager({nom:'Test absences',club:'Stade Toulousain',nation:'France',age:40,libre:true});
const m={...g().manager!,saison:2,semaine:dates[0]};
const groupe=effectifDuClub(m.club,2);
const convoques=actualiserConvocationsClub(m,groupe,m.semaine,[]);
assert.ok(convoques.length>0);
const absents=indisponiblesCarriereAvancee({...m.avancee!,convocations:convoques},m.semaine);
assert.ok(absents.length>0);
for(const nation of ['France','Belgique','Uruguay']) assert.equal(effectifNational(nation,2).length,34);
useGame.setState({manager:{...m,avancee:{...m.avancee!,convocations:convoques}}});
assert.ok(afficheDuClub(g().manager!));
assert.equal(g().avancerJusquaManager(dates[0]+1,true).semaines,1);
assert.ok(Object.keys(g().manager!.resultats).length>0);
console.log('✓ coach : groupe de 34, absences réelles et championnat délégué maintenu');
assert.ok(SEMAINES_PAR_SAISON>=52);
console.log('Calendrier mondial : tous les contrôles réussis.');
