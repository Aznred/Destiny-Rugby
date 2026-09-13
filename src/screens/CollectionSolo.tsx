import { useMemo, useState } from 'react';
import { Icone } from '../components/Icone';
import { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
import OuverturePack from '../components/OuverturePack';
import BoutiquePacks3D from '../components/BoutiquePacks3D';
import { useGame } from '../store/useGame';
import { carteDepuisSource, catalogueBaseCarriere } from '../lib/ligue/catalogueCarriere';
import type { PackCarriere, RareteCarriere } from '../lib/ligue/typesCarriere';
import {
  chargerCollectionSolo, cleCarteSolo, effacerCollectionSolo, etatCollectionSoloVide,
  ouvrirPackSolo, PACKS_SOLO, sauvegarderCollectionSolo, type PackSolo,
} from '../lib/collectionSolo';
import { NOMS_PACK } from '../lib/presentationPacks';
import { nombre } from '../lib/i18n';
import './CollectionSolo.css';

const PAR_PAGE = 40;
const RARETES: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
const normaliser = (texte: string) => texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function CollectionSolo() {
  const setEcran = useGame(s => s.setEcran);
  const catalogue = useMemo(() => catalogueBaseCarriere(), []);
  const packsRoue = useMemo<PackCarriere[]>(() => PACKS_SOLO.map(pack => ({
    ...pack, prix: 0, garantie: pack.garantie ?? pack.id,
  })), []);
  const [etat, setEtat] = useState(chargerCollectionSolo);
  const [recherche, setRecherche] = useState('');
  const [rarete, setRarete] = useState<RareteCarriere | 'toutes'>('toutes');
  const [statut, setStatut] = useState<'toutes' | 'trouvees' | 'manquantes'>('toutes');
  const [page, setPage] = useState(0);
  const [ouverture, setOuverture] = useState<{ pack: PackSolo; indices: number[] } | null>(null);
  const [bilan, setBilan] = useState('');
  const [erreurSauvegarde, setErreurSauvegarde] = useState(false);

  const cartesFiltrees = useMemo(() => {
    const terme = normaliser(recherche.trim());
    return catalogue.map((carte, indice) => ({ carte, indice, trouvee: etat.possedees.has(cleCarteSolo(carte.sourceId)) }))
      .filter(({ carte, trouvee }) => (rarete === 'toutes' || carte.rarete === rarete)
        && (statut === 'toutes' || (statut === 'trouvees' ? trouvee : !trouvee))
        && (!terme || normaliser(`${carte.nom} ${carte.clubReel} ${carte.nation} ${carte.championnat}`).includes(terme)));
  }, [catalogue, etat.possedees, rarete, recherche, statut]);
  const pages = Math.max(1, Math.ceil(cartesFiltrees.length / PAR_PAGE));
  const pageSure = Math.min(page, pages - 1);
  const visibles = cartesFiltrees.slice(pageSure * PAR_PAGE, (pageSure + 1) * PAR_PAGE);
  const total = catalogue.length;
  const trouvees = Math.min(etat.possedees.size, total);
  const progression = total ? Math.round(trouvees / total * 1000) / 10 : 0;

  const ouvrir = (pack: PackSolo) => {
    const resultat = ouvrirPackSolo(pack, catalogue, etat);
    setEtat(resultat.etat);
    setErreurSauvegarde(!sauvegarderCollectionSolo(resultat.etat));
    setBilan(`${resultat.nouvelles} nouvelle${resultat.nouvelles > 1 ? 's' : ''} carte${resultat.nouvelles > 1 ? 's' : ''} ajoutée${resultat.nouvelles > 1 ? 's' : ''} à ta collection.`);
    setOuverture({ pack, indices: resultat.indices });
  };
  const ouvrirDepuisRoue = (id: string) => {
    const pack = PACKS_SOLO.find(candidat => candidat.id === id);
    if (pack) ouvrir(pack);
    return Promise.resolve();
  };

  const reinitialiser = () => {
    if (!window.confirm('Effacer toute la collection solo et les statistiques de packs sur cet appareil ?')) return;
    effacerCollectionSolo();
    setEtat(etatCollectionSoloVide());
    setBilan('La collection locale a été remise à zéro.');
    setPage(0);
  };

  return <section className="solo-collection">
    <header className="solo-entete">
      <button type="button" className="btn fantome" onClick={() => setEcran('accueil')}><Icone nom="fleche-droite" className="solo-retour" taille={16} /> Accueil</button>
      <div><div className="eyebrow">Mode solo · hors ligne</div><h1>Ma collection</h1><p>Ouvre gratuitement des packs Bronze, Argent et Or. Aucun compte, aucun Ova et aucune base de données.</p></div>
    </header>

    <section className="solo-progression carte">
      <div><span>Collection trouvée</span><strong>{nombre(trouvees)} <small>/ {nombre(total)}</small></strong></div>
      <div className="solo-jauge"><i style={{ width: `${progression}%` }} /><span>{progression} %</span></div>
      <div className="solo-stats"><span><b>{nombre(Object.values(etat.packsOuverts).reduce((s, n) => s + n, 0))}</b> packs ouverts</span><span><b>{nombre(etat.doublons)}</b> doublons</span><span><b>{nombre(total - trouvees)}</b> à trouver</span></div>
    </section>

    {erreurSauvegarde && <p className="solo-alerte" role="alert">Le navigateur refuse la sauvegarde locale. Tu peux continuer, mais cette session risque de ne pas être conservée.</p>}
    {bilan && <p className="solo-bilan" role="status"><Icone nom="ok" taille={17} /> {bilan}</p>}

    <section className="solo-rayon" aria-labelledby="solo-packs-titre">
      <div className="solo-titre-ligne"><div><div className="eyebrow">Gratuits et illimités</div><h2 id="solo-packs-titre">Choisis un pack</h2></div><span>Une nouvelle carte est recherchée à chaque tirage jusqu’aux 100 %.</span></div>
      <BoutiquePacks3D packs={packsRoue} solde={0} occupe={ouverture !== null} gratuit onOuvrir={ouvrirDepuisRoue} />
      <div className="solo-compteurs-packs" aria-label="Packs ouverts par catégorie">
        {PACKS_SOLO.map(pack => <span key={pack.id}><b>{nombre(etat.packsOuverts[pack.id])}</b> {pack.nom} ouvert{etat.packsOuverts[pack.id] > 1 ? 's' : ''}</span>)}
      </div>
    </section>

    <section className="solo-catalogue">
      <div className="solo-titre-ligne"><div><div className="eyebrow">Catalogue mondial</div><h2>Tous les joueurs</h2></div><button type="button" className="btn fantome solo-reset" onClick={reinitialiser}>Réinitialiser</button></div>
      <div className="solo-filtres">
        <label><span>Rechercher</span><input value={recherche} onChange={e => { setRecherche(e.target.value); setPage(0); }} placeholder="Joueur, club, nation…" /></label>
        <label><span>Rareté</span><select value={rarete} onChange={e => { setRarete(e.target.value as RareteCarriere | 'toutes'); setPage(0); }}><option value="toutes">Toutes</option>{RARETES.map(r => <option value={r} key={r}>{NOMS_PACK[r]}</option>)}</select></label>
        <label><span>Collection</span><select value={statut} onChange={e => { setStatut(e.target.value as typeof statut); setPage(0); }}><option value="toutes">Toutes</option><option value="trouvees">Trouvées</option><option value="manquantes">Manquantes</option></select></label>
      </div>
      <p className="solo-resultats">{nombre(cartesFiltrees.length)} joueur{cartesFiltrees.length > 1 ? 's' : ''}</p>
      <div className="solo-cartes">
        {visibles.map(({ carte, trouvee }) => <CarteJoueurEnLigne key={carte.sourceId} carte={carteDepuisSource(carte, 'solo', 'collection', 1)} compacte etatCollection={trouvee ? 'decouverte' : 'inconnue'} />)}
      </div>
      {!visibles.length && <div className="solo-vide"><Icone nom="loupe" taille={28} /><b>Aucun joueur ne correspond à ces filtres.</b></div>}
      {pages > 1 && <nav className="solo-pagination" aria-label="Pages du catalogue"><button type="button" className="btn fantome" disabled={pageSure === 0} onClick={() => setPage(Math.max(0, pageSure - 1))}>Précédent</button><span>Page {pageSure + 1} / {pages}</span><button type="button" className="btn fantome" disabled={pageSure >= pages - 1} onClick={() => setPage(Math.min(pages - 1, pageSure + 1))}>Suivant</button></nav>}
    </section>

    {ouverture && <OuverturePack
      cartes={ouverture.indices.map(indice => carteDepuisSource(catalogue[indice], 'solo', 'collection', 1))}
      pack={ouverture.pack.nom}
      garantie={ouverture.pack.garantie}
      onFermer={() => setOuverture(null)}
      rendreCarte={carte => <CarteJoueurEnLigne carte={carte} compacte proprietaire="Collection solo" />}
    />}
  </section>;
}
