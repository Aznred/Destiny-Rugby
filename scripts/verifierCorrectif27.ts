import assert from 'node:assert/strict';
import { useGame } from '../src/store/useGame';
import type { Manager, ResultatMatchManager } from '../src/types';
import { effectifDuClub } from '../src/lib/effectif';
import { apresResultatCarriereAvancee, avancerSemaineCarriereAvancee, changerClubCarriereAvancee, type DossierMedical } from '../src/lib/carriereAvancee';
import { autorisationMedicale, bilanMedical, choisirReprise, compositionMedicale, evoluerSoin, niveauMedical, risqueReprise, statutMedical } from '../src/lib/infirmerieManager';
import { accepterProlongation, bilanContrat, evaluerConseil, suivreConseil } from '../src/lib/conseilManager';
import { clubParNom } from '../src/data/clubs';
import { appliquerLocalisations } from '../src/lib/localisationClub';
import { derbyGeographique, distanceEntreClubs, verifierDonneesClubs } from '../src/lib/donneesClubs';
import { validerLocalisation } from '../serveur/atelierAdmin';
import { evaluerObjectif, objectifsDeSaison } from '../src/lib/objectifsManager';

useGame.getState().reinitialiser();
useGame.getState().creerManager({ nom: 'Correctif 27', nation: 'France', club: 'Stade Toulousain' });
const m = structuredClone(useGame.getState().manager!);
const effectif = effectifDuClub(m.club, m.saison), joueur = effectif[0];
const blessure: DossierMedical = { id: 'medical27', joueurId: joueur.id, nom: joueur.nom, type: 'Fracture', gravite: 'grave',
  disponibilite: 0, douleur: 85, risqueAggravation: 35, semaines: 20, decision: 'attente', penalitePerformance: 25,
  saison: 1, semaine: 49, phase: 'suspicion', zone: 'cheville', origine: 'match', diagnosticDans: 1,
  guerison: 0, condition: 40, rythme: 30, risqueRechute: 35, joursRestants: 140, dureeInitiale: 140, joursReprise: 0, joursEcoules: 0 };
let controles = 0;
function test(nom: string, f: () => void) { f(); controles++; console.log(`OK ${nom}`); }
test('Soins automatiques, sept statuts et retour progressif', () => {
  let d = blessure; const statuts = new Set([statutMedical(d)]);
  for (let j = 0; j < 230; j++) { d = evoluerSoin(d, 1, 1); statuts.add(statutMedical(d)); }
  assert.equal(d.phase, 'clos'); assert.equal(d.joursEcoules, 140);
  assert.deepEqual([...statuts].sort(), ['indisponible','soins','reeducation','individuelle','collective','risque','apte'].sort());
  const rapide = evoluerSoin(blessure, 5, 14); assert.ok(rapide.joursRestants! > 120);
  const reprise = evoluerSoin(blessure, 1, 147); assert.equal(statutMedical(reprise), 'collective'); assert.ok(reprise.condition! < 100);
  assert.equal(autorisationMedicale(choisirReprise(blessure, 'forcer')), 'aucune');
});
const reprise: DossierMedical = { ...blessure, phase: 'reprise', semaines: 0, joursRestants: 0, guerison: 100, joursEcoules: 140, joursReprise: 14, condition: 80, rythme: 75, risqueBase: 22 };
test('Sélection sur le banc, commotion et risque proportionnel aux minutes', () => {
  const banc = choisirReprise(reprise, 'reprise20'), titulaire = choisirReprise(reprise, 'retourDirect');
  assert.equal(autorisationMedicale(banc), 'banc'); assert.equal(autorisationMedicale(titulaire), 'titulaire');
  assert.ok(risqueReprise(titulaire,80) > risqueReprise(banc,20)); assert.ok(risqueReprise(banc,20,5) < risqueReprise(banc,20,1));
  assert.equal(choisirReprise(titulaire, 'retourDirect').risqueRechute, titulaire.risqueRechute);
  const commotion = { ...reprise, protocoleCommotion: true, joursReprise: 7 };
  assert.equal(autorisationMedicale(choisirReprise(commotion, 'retourDirect')), 'aucune');
  const comp = compositionMedicale(effectif, m.composition, [banc]); assert.ok(!comp.titulaires.includes(joueur.id));
  const court = compositionMedicale(effectif.slice(0,15), m.composition, [blessure]); assert.ok(![...court.titulaires,...court.remplacants].includes(joueur.id));
  assert.ok(court.titulaires.includes(court.capitaineId));
});
test('Dates de retour, suivi sur plusieurs saisons et changement de club', () => {
  const avant = bilanMedical(blessure, { ...m, semaine: 49 }); const apres = bilanMedical(evoluerSoin(blessure), { ...m, semaine: 50 });
  assert.equal(avant.retour.getTime(), apres.retour.getTime());
  let mm: Manager = { ...m, semaine: 49, avancee: { ...m.avancee!, medical: [blessure] } };
  for (let n = 0; n < 35; n++) { if(mm.semaine >= 52) mm = { ...mm, saison: mm.saison + 1, semaine: 1 };
    const a = avancerSemaineCarriereAvancee(mm,effectif,mm.semaine+1); mm = { ...mm, semaine: mm.semaine+1, avancee: a }; }
  const h = mm.avancee!.profilsMedicaux[joueur.id].historique.filter(h => h.type === blessure.type);
  assert.equal(h.length,1); assert.equal(h[0].jours,140);
  assert.ok(changerClubCarriereAvancee({ ...m.avancee!, medical: [blessure] }, { ...m, club: 'RC Toulon' }, []).medical.some(d => d.id === blessure.id));
});
test('Centre médical payé une fois par niveau et conservé par club', () => {
  useGame.setState({ manager: { ...m, budgetStructure: 3_000_000 } });
  useGame.getState().ameliorerCentreMedicalManager(); assert.equal(niveauMedical(useGame.getState().manager!),2);
  assert.equal(useGame.getState().manager!.budgetStructure, 2_975_000);
  useGame.setState({ manager: { ...useGame.getState().manager!, club: 'RC Toulon' } }); assert.equal(niveauMedical(useGame.getState().manager!),1);
  useGame.setState({ manager: { ...useGame.getState().manager!, club: m.club, budgetStructure: 0 } });
  useGame.getState().ameliorerCentreMedicalManager(); assert.equal(niveauMedical(useGame.getState().manager!),2);
});
const resultat = (n:number, victoire=false): ResultatMatchManager => ({ cle:`champ27-${n}`,club:m.club,saison:1,semaine:n,journee:n,domicile:true,
  adversaire:'RC Toulon',scorePour:victoire?32:3,scoreContre:victoire?8:40,essaisPour:victoire?4:0,essaisContre:victoire?1:5,blessures:[],minutesJouees:{} });
test('Un remplaçant qui ne joue pas ne rechute pas, incidents multiples conservés', () => {
  const d = choisirReprise(reprise,'reprise20'); const comp = compositionMedicale(effectif,m.composition,[d]); comp.remplacants[0]=joueur.id;
  const r=resultat(1); const a=apresResultatCarriereAvancee({ ...m,composition:comp,avancee:{ ...m.avancee!,medical:[d] } },effectif,r).etat;
  assert.equal(a.medical.find(x=>x.id===d.id)!.joursRestants,0);
  const autres=effectif.slice(1,3);r.blessures=autres.map(j=>({ joueurId:j.id,minute:12,activite:'plaquage' }));
  const avec=apresResultatCarriereAvancee(m,effectif,r).etat;assert.equal(avec.medical.filter(x=>autres.some(j=>j.id===x.joueurId)).length,2);
});
test('Top 6 raté à la 11e place : non-renouvellement, bonne saison : offre finie', () => {
  const bad={ ...m,objectif:6,contrat:{saisons:1,salaire:100000} };assert.equal(bilanContrat(bad,effectif,11).decision,'nonRenouvele');
  const bon={ ...bad,objectif:12,resultats:Object.fromEntries(Array.from({length:26},(_,n)=>{const r=resultat(n+1,true);return[r.cle,r];})),avancee:{...m.avancee!,objectifs:[]} };
  const bilan=bilanContrat(bon,effectif,4);assert.equal(bilan.decision,'prolongation');assert.equal(bilan.offre!.duree,3);assert.ok(bilan.offre!.salaire>100000);
  const expire={...bon,saison:2,contrat:{saisons:0,salaire:100000},conseil:bilan};const accepte=accepterProlongation(expire);
  assert.equal(accepte.contrat!.saisons,3);assert.equal(accepterProlongation({...expire,...accepte}).budgetBonus,0);
  assert.equal(accepterProlongation(bon).contrat!.saisons,1);
  useGame.setState({manager:expire}); const semaine=expire.semaine;useGame.getState().semaineManager();useGame.getState().saisonManager();assert.equal(useGame.getState().manager!.semaine,semaine);assert.equal(useGame.getState().manager!.saison,2);
  useGame.getState().negocierContratManager();const budget=useGame.getState().manager!.budgetTransferts;
  for(let i=0;i<10;i++)useGame.getState().negocierContratManager();assert.equal(useGame.getState().manager!.contrat!.saisons,3);assert.equal(useGame.getState().manager!.budgetTransferts,budget);
});
test('Observation longue, avertissement cinq matchs, licenciement et réaction possible', () => {
  let mm={...m,objectif:1,confiance:25,avancee:{...m.avancee!,objectifs:[]},resultats:{}} as Manager;
  for(let n=1;n<=13;n++){const r=resultat(n); mm={...mm,resultats:{...mm.resultats,[r.cle]:r}};const s=suivreConseil(mm,effectif,14);mm={...mm,confiance:s.confiance,conseil:s.conseil};
    if(n<8)assert.equal(s.conseil.avertissement,undefined);if(n<13)assert.equal(s.licencie,false);if(n===13)assert.equal(s.licencie,true);}
  const averti={...mm,resultats:Object.fromEntries(Object.entries(mm.resultats).slice(0,8)),conseil:{...mm.conseil!,decision:undefined,avertissement:{saison:1,debut:8,cible:2,matchs:0,victoires:0}}};
  let reaction=averti;for(let n=9;n<=13;n++){const r=resultat(n,n<=10);reaction={...reaction,resultats:{...reaction.resultats,[r.cle]:r}};const s=suivreConseil(reaction,effectif,12);reaction={...reaction,confiance:s.confiance,conseil:s.conseil};assert.equal(s.licencie,false);}
  assert.equal(reaction.conseil!.avertissement!.termine,true);assert.ok(reaction.confiance>=40);
  const petits=evaluerConseil({...m,objectif:12},effectif,10),favoris=evaluerConseil({...m,objectif:1},effectif,10);assert.ok(petits.score>favoris.score);
});
test('Coupe : objectifs sur les matchs réels, aucune qualification fictive', () => {
  const o=objectifsDeSaison(m,effectif).find(o=>o.indicateur==='parcoursCoupe');assert.ok(o);
  assert.equal(evaluerObjectif(o!,m,effectif).progression,0);const r={...resultat(20),cle:`coupe#championsCup#1#quart#${m.club}#RC Toulon`};
  assert.ok(evaluerObjectif(o!,{...m,resultats:{[r.cle]:r}},effectif).atteint);
});
test('Stades réels, distances mises en cache et rivalités manuelles', () => {
  assert.equal(clubParNom('Stade Metropolitain')!.ville,'Villeurbanne');assert.equal(clubParNom('USON Nevers')!.ville,'Sermoise-sur-Loire');
  assert.equal(derbyGeographique(m.club,'US Colomiers').type,'local');assert.equal(derbyGeographique(m.club,'Montpellier HR').derby,false);
  assert.equal(distanceEntreClubs('Inconnu','Autre'),null);const d=distanceEntreClubs(m.club,'US Colomiers')!;
  assert.equal(d,distanceEntreClubs('US Colomiers',m.club));
  appliquerLocalisations({'US Colomiers':{ ...clubParNom('US Colomiers')!,longitude:3}},[{clubA:m.club,clubB:'Montpellier HR',source:'https://example.org/rivalite'}]);
  assert.notEqual(distanceEntreClubs(m.club,'US Colomiers'),d);assert.equal(derbyGeographique(m.club,'Montpellier HR').type,'historique');
  appliquerLocalisations({});assert.ok(verifierDonneesClubs().some(c=>c.alertes.length));
});
test('Changer de banc ne permet pas de resigner au même club pendant la saison', () => {
  useGame.setState({ manager: { ...m, libre: true } });
  useGame.getState().signerBanc('RC Toulon'); useGame.getState().signerBanc('Montpellier HR');
  useGame.getState().signerBanc(m.club); assert.equal(useGame.getState().manager!.club,'Montpellier HR');
  assert.equal(useGame.getState().manager!.departsCoach![m.club],m.saison);
});
test('Labo : validation des coordonnées et des sources', () => {
  const d={ville:'Toulouse',region:'Occitanie',pays:'France',latitude:43.6,longitude:1.43,precisionLieu:'stade',statutGeographique:'verifie',sourceLocalisation:'https://www.stadetoulousain.fr/'};
  assert.equal(validerLocalisation(d).statutGeographique,'verifie');
  for(const mauvaise of [{latitude:NaN},{longitude:181},{sourceLocalisation:'javascript:alert(1)'},{sourceLocalisation:''},{ville:''}])assert.throws(()=>validerLocalisation({...d,...mauvaise}));
});
console.log(`${controles} scénarios Correctif 27 validés.`);
