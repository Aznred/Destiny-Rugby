// APERÇU DU MONDE FÉMININ — /scripts/apercuMondeFeminin.html
//
// Les championnats, leurs clubs et leurs effectifs tels que la carrière solo féminine les lira
// (`data/mondeFeminin.generated.ts`). Rien n'est joué ici : c'est la relecture des données, club par club — qui est
// réelle, qui est générée pour combler un poste, quel règlement s'applique au classement.

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import 'flag-icons/css/flag-icons.min.css';
import '../src/App.css';
import './apercuMondeFeminin.css';
import { CHAMPIONNATS_FEMININS, effectifFeminin, type ChampionnatFeminin } from '../src/data/mondeFeminin.generated';
import { matchsParClub, statutsDuClassement } from '../src/lib/mondeFeminin';
import { POSTE_PAR_ID } from '../src/data/rugby';
import { EcussonClub } from '../src/components/EcussonClub';
import { Drapeau } from '../src/components/Drapeau';

const SILHOUETTE = '/photos/silhouette-femme.webp';
const LIBELLE: Record<string, string> = { QUALIFIED: 'Phase finale', PROMOTION: 'Montée', PLAYOFF: 'Barrage', ACCESS_MATCH: 'Match d’accès', DIRECT_RELEGATION: 'Descente' };

function Format({ c }: { c: ChampionnatFeminin }) {
  const morceaux = [
    `${c.clubs.length || '—'} clubs`, `${c.journees} journées`, c.clubs.length ? `${matchsParClub(c)} matchs par club` : '',
    c.finaleDirecte ? 'finale entre les deux premières' : `${c.qualifies} demi-finalistes`,
    c.montee ? 'la championne monte' : '', c.descente ? 'la dernière descend' : '', c.barrage ? 'barrage de maintien' : '',
    !c.montee && !c.descente && !c.barrage ? 'ni montée ni descente' : '',
  ].filter(Boolean);
  return <p className="mf-format">{morceaux.join(' · ')}</p>;
}

function Effectif({ club }: { club: string }) {
  const effectif = effectifFeminin(club) ?? [];
  return <ul className="mf-effectif">
    {effectif.map(j => <li key={j.nom} className={j.generee ? 'generee' : ''}>
      <img src={j.photo || SILHOUETTE} alt="" loading="lazy" />
      <span className="mf-poste">{POSTE_PAR_ID[j.poste].numero}</span>
      <span className="mf-nom"><b>{j.nom}</b><small>{POSTE_PAR_ID[j.poste].nom} · {j.age} ans{j.generee ? ' · générée' : j.posteEstime ? ' · poste estimé' : ''}</small></span>
      <Drapeau nation={j.nation} taille={0.95} />
      <span className="mf-note"><b>{j.note}</b><small>{j.potentiel}</small></span>
    </li>)}
  </ul>;
}

function Apercu() {
  const [ouvert, setOuvert] = useState<string | null>('Stade Toulousain');
  return <main className="mf">
    <header><p className="eyebrow">Carrière solo · première pierre</p><h1>Le monde du rugby féminin</h1>
      <p>{CHAMPIONNATS_FEMININS.length} championnats jouables et {CHAMPIONNATS_FEMININS.reduce((n, c) => n + c.clubs.length, 0)} clubs. Les effectifs mêlent joueuses réelles, postes estimés et joueuses générées pour compléter les équipes.</p></header>
    {CHAMPIONNATS_FEMININS.map(c => {
      const statuts = c.clubs.length ? statutsDuClassement(c) : [];
      return <section key={c.id} className={`mf-championnat${c.jouable ? '' : ' en-attente'}`}>
        <div className="mf-titre"><span className={`fi fi-${c.drapeau}`} /><h2>{c.nom}</h2><span className="mf-niveau">{c.niveau}<small>/100</small></span></div>
        <Format c={c} />
        {!c.jouable && <p className="mf-vide">Clubs et effectifs à récupérer.</p>}
        <ol className="mf-clubs">
          {c.clubs.map((k, i) => <li key={k.nom}>
            <button type="button" aria-expanded={ouvert === k.nom} onClick={() => setOuvert(ouvert === k.nom ? null : k.nom)}>
              <span className="mf-couleurs" style={{ background: `linear-gradient(135deg, ${k.c1} 50%, ${k.c2} 50%)` }} />
              {k.logo ? <EcussonClub logo={k.logo} nom={k.nom} taille={30} /> : <span className="mf-sans-ecusson" />}
              <span className="mf-club"><b>{k.nom}</b><small>{k.reelles} réelles{k.reelles < 30 ? ` · ${(effectifFeminin(k.nom)?.length ?? 0) - k.reelles} générées` : ''}{statuts[i] && statuts[i] !== 'SAFE' ? ` · ${i + 1}ᵉ : ${LIBELLE[statuts[i]] ?? statuts[i]}` : ''}</small></span>
              <span className="mf-note"><b>{k.note}</b></span>
            </button>
            {ouvert === k.nom && <Effectif club={k.nom} />}
          </li>)}
        </ol>
      </section>;
    })}
  </main>;
}

createRoot(document.getElementById('root')!).render(<Apercu />);
