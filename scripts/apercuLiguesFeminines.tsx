/* oxlint-disable react/only-export-components -- aperçu local autonome */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CHAMPIONNATS_FEMININS } from '../src/data/mondeFeminin.generated';
import { LOGO_COMPETITION } from '../src/data/logosCompetitions';
import { ScoreTV } from '../src/components/match/HabillageTV';
import { MatchLive } from '../src/components/MatchLive';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';
import './apercuLiguesFeminines.css';

chargerTextes(TEXTES);
function Apercu() {
  const [match, setMatch] = useState<string>();
  const ligue = CHAMPIONNATS_FEMININS.find(c => c.id === match);
  return <main className="apercu-ligues">
    <header><p className="eyebrow">Destiny Rugby · Aperçu local</p><h1>Les ligues féminines</h1><p>Onze écussons officiels, dans les championnats et sur le bandeau des matchs.</p><a href="/">Retour au jeu</a></header>
    <div className="apercu-ligues-grille">{CHAMPIONNATS_FEMININS.map(c => <section key={c.id} data-ligue={c.id}>
      <div className="apercu-ligues-identite"><img src={LOGO_COMPETITION[c.id]} alt={c.nom} /><div><h2>{c.nom}</h2><p>{c.clubs.length} clubs</p></div></div>
      <div className="btv"><ScoreTV identite={{ logo: c.id, nom: c.nom }} seconde={1226} equipes={[
        { nom: c.clubs[0].nom, couleur: c.clubs[0].c1, score: 10 },
        { nom: c.clubs[1].nom, couleur: c.clubs[1].c1, score: 7 },
      ]} /></div>
      <button type="button" onClick={() => setMatch(c.id)}>Voir le match</button>
    </section>)}</div>
    {ligue && <MatchLive match={{ domicile: ligue.clubs[0].nom, exterieur: ligue.clubs[1].nom, scoreD: 17, scoreE: 12, essaisD: 2, essaisE: 1 }} saison={1}
      cle={`apercu-${ligue.id}`} titre={ligue.nom} onFermer={() => setMatch(undefined)} />}
  </main>;
}
const root = createRoot(document.getElementById('root')!);
root.render(<Apercu />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
