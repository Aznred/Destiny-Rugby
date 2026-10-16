import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CompleteTaCarte } from '../src/screens/CompleteTaCarte';
import { LaboCartesNormales } from '../src/components/LaboCartesNormales';
import { CarteJoueurEnLigne } from '../src/components/CarteJoueurEnLigne';
import { carteNormaleVide, validerClubPropose, validerDemandeCarte, demandeCarteSansImages } from '../src/lib/cartesNormales';
import type { DemandeCarte } from '../src/lib/cartesNormales';
import { carteDepuisSource, rareteCarriere, statistiquesCarte } from '../src/lib/ligue/catalogueCarriere';
import type { SourceCarte } from '../src/lib/ligue/catalogueCarriere';
import { appliquerLocalisations } from '../src/lib/localisationClub';
import { POSTE_PAR_ID } from '../src/data/rugby';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';
import '../src/components/AtelierKiri.css';
chargerTextes(TEXTES);
const demandes: DemandeCarte[] = [{ id: crypto.randomUUID(), type: 'club', carte: { ...carteNormaleVide(), nom: 'Louis Exemple' },
  clubPropose: { nom: 'Club Contribution', division: 'Régionale 1', pays: 'France', logo: '/logos/arcol.png', c1: '#235c41', c2: '#dec175',
    joueurs: ['Louis Exemple', 'Martin Exemple', 'Jules Exemple'].map((nom, i) => ({ ...carteNormaleVide(), nom,
      poste: i === 0 ? 'demi_melee' : i === 1 ? 'demi_ouverture' : 'demi_melee', photo: '/photos/silhouette.webp' })) },
  message: 'Club et trois joueurs de démonstration.', statut: 'attente', revision: 0, creeLe: new Date().toISOString(), pseudo: 'Contributeur local' }];
const sources: SourceCarte[] = [];
let revision = 0;
const origine = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(String(input), location.href);
  if (!url.searchParams.has('demandesCartes')) return origine(input, init);
  const repondre = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } });
  if (!init?.body) {
    const id = url.searchParams.get('id');
    return id ? repondre({ demande: demandes.find(d => d.id === id) })
      : repondre({ demandes: demandes.map(demandeCarteSansImages), cartes: sources, revisionCatalogue: revision, interne: true });
  }
  const b = JSON.parse(String(init.body));
  try {
    if (b.operation === 'soumettre') demandes.unshift({ ...validerDemandeCarte(b), id: crypto.randomUUID(), statut: 'attente', revision: 0, creeLe: new Date().toISOString(), pseudo: 'Contributeur local' });
    else {
      const demande = demandes.find(d => d.id === b.id)!;
      if (b.operation === 'refuser') { demande.statut = 'refusee'; demande.reponse = b.reponse; }
      else {
        demande.clubPropose = validerClubPropose(b.clubPropose);
        if (b.operation === 'approuver') {
          const club = demande.clubPropose;
          appliquerLocalisations({ [club.nom]: { logo: club.logo, c1: club.c1, c2: club.c2 } });
          club.joueurs.forEach((joueur, i) => {
            const famille = POSTE_PAR_ID[joueur.poste].famille;
            sources.push({ ...joueur, sourceId: `${demande.id}-${i}`, famille, origine: 'professionnel',
              rarete: rareteCarriere(joueur.note), statistiques: statistiquesCarte(joueur.note, famille, joueur.nom) });
          });
          demande.statut = 'acceptee'; revision++;
        }
      }
      demande.revision++;
    }
    return repondre({ demandes: demandes.map(demandeCarteSansImages), revisionCatalogue: revision });
  } catch (e) { return repondre({ erreur: (e as Error).message }, 400); }
};
export function ApercuContribution() {
  const [vue, setVue] = useState('contribution');
  return <main className="atelier-kiri" style={{ maxWidth: 1250, margin: 'auto', padding: 16 }}>
    <h1>Contribution de club · aperçu local</h1><p>Formulaires réels, demandes simulées. Aucune publication ni sauvegarde réelle.</p>
    <nav className="cn-actions"><button onClick={() => setVue('contribution')}>Contribution</button><button onClick={() => setVue('validation')}>Validation</button><button onClick={() => setVue('cartes')}>Cartes publiées</button></nav>
    {vue === 'contribution' ? <CompleteTaCarte /> : vue === 'validation' ? <LaboCartesNormales demandesSeulement />
      : <section><h2>{sources.length} cartes publiées</h2><div className="cn-joueurs-grille">{sources.map(s => <CarteJoueurEnLigne key={s.sourceId} carte={carteDepuisSource(s, 'local', 'test', 1)} />)}</div></section>}
  </main>;
}
const conteneur = document.getElementById('root')! as HTMLElement & { racineContribution?: Root };
conteneur.racineContribution ??= createRoot(conteneur);
conteneur.racineContribution.render(<ApercuContribution />);
