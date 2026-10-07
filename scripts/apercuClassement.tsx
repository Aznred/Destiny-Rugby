// Aperçu local du classement (Correctif 29) : le VRAI tableau, les VRAIS règlements, de vraies poules — sans sauvegarde.
//   /scripts/apercuClassement.html
// Chaque bloc montre une compétition : les zones (relégation directe en rouge, match d'accès en orange, qualification,
// barrages, reversement en Challenge Cup) sortent de `competitionRules.ts`, jamais d'une position écrite ici.
import { createRoot } from 'react-dom/client';
import { TableauClassement, type LigneClassement } from '../src/components/TableauClassement';
import { Blason } from '../src/components/Blason';
import { clubParNom } from '../src/data/clubs';
import { CALENDRIER } from '../src/data/calendrier';
import { championnatEnDirect, poulesDe, type LigneTableau } from '../src/lib/championnat';
import { coupeEnDirect } from '../src/lib/coupe';
import { onlineRules, rulesFor, standingsStatuses, type StandingsStatus } from '../src/lib/competitionRules';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';

const lignes = (classement: LigneTableau[], statuts: StandingsStatus[], moi?: string): LigneClassement[] =>
  classement.map((l, i) => {
    const club = clubParNom(l.club);
    return {
      cle: l.club, position: l.position, nom: l.club, ecusson: club ? <Blason club={club} taille={22} /> : undefined,
      joues: l.joues, gagnes: l.gagnes, nuls: l.nuls, perdus: l.perdus, pour: l.pour, contre: l.contre,
      difference: l.difference, bonus: l.bonus, points: l.points, statut: statuts[i], moi: l.club === moi,
    };
  });

chargerTextes(TEXTES);

function Division({ id, titre }: { id: string; titre: string }) {
  const poules = poulesDe(id);
  const ancre = poules[0][0];
  const etat = championnatEnDirect(id, 1, ancre, 14);
  return <section className="carte bloc-competition">
    <div className="comp-tete"><b>{titre}</b><span className="comp-count">{etat.classement.length} clubs</span></div>
    <TableauClassement lignes={lignes(etat.classement, standingsStatuses(rulesFor(id), etat.classement.length, poules.length), etat.classement[3]?.club)} />
  </section>;
}

function Coupe() {
  const dates = CALENDRIER.filter((s) => s.type === 'coupe').length;
  const coupe = coupeEnDirect('championsCup', 1, '', dates)!;
  const poule = coupe.poules[0];
  return <section className="carte bloc-competition">
    <div className="comp-tete"><b>Champions Cup · {poule.nom}</b><span className="comp-count">{poule.clubs.length} clubs</span></div>
    <TableauClassement lignes={lignes(poule.classement, poule.statuts, poule.classement[4].club)} />
  </section>;
}

function EnLigne() {
  const noms = ['Les Ovalies du Canal', 'XV de la Garrigue', 'Stade Montois des Copains', 'Union Sportive Dacquoise Légendes', 'RC Vieux Port',
    'Racing Club de la Butte aux Cailles', 'Les Sangliers', 'AS Platanes', 'Bayonne Forever', 'Ovalie Club du Lauragais',
    'Les Mêlées Ouvertes', 'Team Biarrot', 'Castres Chaudron', 'Entente Pyrénées Gascogne', 'Brive la Gaillarde XV', 'Les Petits Princes'];
  const statuts = standingsStatuses(onlineRules({ publique: { division: 2 }, playoffs: false }), noms.length);
  return <section className="carte bloc-competition">
    <div className="comp-tete"><b>Ligue en ligne · Division publique 2</b><span className="comp-count">16 clubs</span></div>
    <TableauClassement avecForme onOuvrir={() => undefined} libelleOuvrir="Voir l’effectif"
      lignes={noms.map((nom, i) => {
        const gagnes = Math.max(0, 11 - i), perdus = Math.min(12, 1 + i), pour = 320 - i * 14, contre = 190 + i * 11;
        return {
          cle: nom, position: i + 1, nom, sousTitre: `coach${i + 1}`, joues: 12, gagnes, nuls: 12 - gagnes - perdus < 0 ? 0 : 12 - gagnes - perdus, perdus,
          pour, contre, difference: pour - contre, bonus: Math.max(0, 6 - Math.floor(i / 2)), points: gagnes * 4 + Math.max(0, 6 - Math.floor(i / 2)),
          statut: statuts[i], moi: i === 13, forme: ['V', 'D', 'V', 'N', i % 2 ? 'D' : 'V'],
        };
      })} />
  </section>;
}

createRoot(document.getElementById('root')!).render(
  <main className="championnats" style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem' }}>
    <h1>Classements · aperçu</h1>
    <Division id="top14" titre="Top 14 — relégation directe et match d’accès" />
    <Division id="fed1" titre="Fédérale 1 — les deux derniers descendent" />
    <Coupe />
    <EnLigne />
  </main>,
);
