import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Arbre } from '../src/screens/Tableau';
import { TableauClassement } from '../src/components/TableauClassement';
import { useGame } from '../src/store/useGame';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { COMPETITIONS } from '../src/data/clubs';
import { championnatEnDirect, enregistrerResultatJoue } from '../src/lib/championnat';
import { tournoiDeFinDAnnee } from '../src/lib/tournoi';
import { coupeEnDirect } from '../src/lib/coupe';
import { standingsStatuses, rulesFor } from '../src/lib/competitionRules';
import { RegleAccession } from '../src/components/RegleAccession';
import { qualifiesPourAccession } from '../src/lib/accessionFederale';
import '../src/index.css';
import '../src/App.css';
chargerTextes(TEXTES);
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
useGame.getState().setLangue('fr');
const division = new URLSearchParams(location.search).get('division') || 'fed1';
const europe = division === 'challengeCup';
export function ApercuRetours() {
  const [revision, actualiser] = useState(0);
  const [date, changerDate] = useState(5);
  const comp = COMPETITIONS.find(c => c.id === division);
  const tournoi = europe ? null : tournoiDeFinDAnnee(division, 1, comp?.nom ?? division);
  const coupe = europe ? coupeEnDirect(division, 1, '', date) : null;
  const cl = tournoi?.poules[0].classement ?? (europe ? coupe!.poules[0].classement : championnatEnDirect(division, 1, '', 999).classement);
  const statuts = standingsStatuses(rulesFor(division), cl.length, tournoi?.poules.length ?? 1);
  const matchs = tournoi?.matchs ?? coupe?.bracket ?? [];
  const jouer = () => {
    for (const m of matchs) {
      if ('status' in m && m.status === 'completed') continue;
      enregistrerResultatJoue(m.cle ?? `coupe#${division}#1#${m.tour}#${m.domicile}#${m.exterieur}`,
        { domicile: m.domicile, exterieur: m.exterieur, scoreD: 10, scoreE: 30, essaisD: 1, essaisE: 4 });
    }
    if (europe) changerDate(date + 1);
    actualiser(revision + 1);
  };
  return <main data-division={division} style={{ maxWidth: 1200, margin: 'auto', padding: '1rem', minWidth: 0 }}>
    <p className="eyebrow">Aperçu local · résultats de démonstration</p>
    <h1>{comp?.nom ?? 'Challenge Cup'}</h1>
    <p>{europe ? 'Reversés classés 9 à 12 : huitième à l’extérieur, puis réception selon le rang.' : division === 'premiership' ? 'Aucune relégation ni match d’accès automatique.' : `${tournoi?.qualifiesDirects?.length ?? 0} qualifiés directs · ${tournoi?.barragistes?.length ?? 0} barragistes`}</p>
    <div className="carte bloc-competition" style={{ padding: '1rem', margin: '1rem 0' }}>
      <TableauClassement lignes={cl.map((l, i) => ({ ...l, cle: l.club, nom: l.club, position: i + 1, statut: statuts[i] }))}/>
      <RegleAccession division={division} />
      {['nationale2','fed1','fed2'].includes(division) && <p data-promus={qualifiesPourAccession(rulesFor(division), tournoi?.matchs ?? []).length}>
        Accession acquise : {qualifiesPourAccession(rulesFor(division), tournoi?.matchs ?? []).join(', ') || 'aucun club avant les résultats qualificatifs'}
      </p>}
    </div>
    {!!matchs.length && <section className="carte bloc-competition" style={{ padding: '1rem' }}>
      <button className="btn primaire" onClick={jouer}>Jouer le tour de démonstration</button>
      <Arbre matchs={matchs} club="" taille={tournoi?.tailleTableau ?? 16}/>
    </section>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<ApercuRetours/>);
