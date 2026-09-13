import { useMemo, useState } from 'react';
import { Icone } from '../components/Icone';
import { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
import OuverturePack from '../components/OuverturePack';
import BoutiquePacks3D from '../components/BoutiquePacks3D';
import { useGame } from '../store/useGame';
import { carteDepuisSource, catalogueBaseCarriere, PACKS_CARRIERE } from '../lib/ligue/catalogueCarriere';
import type { PackCarriere, RareteCarriere } from '../lib/ligue/typesCarriere';
import { cleCarteSolo, IDS_PACKS_SOLO_GRATUITS, ouvrirPackSolo, prixPackSolo } from '../lib/collectionSolo';
import { NOMS_PACK } from '../lib/presentationPacks';
import { nombre } from '../lib/i18n';
import './CollectionSolo.css';

const PAR_PAGE = 40;
const RARETES: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
const normaliser = (texte: string) => texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function CollectionSolo() {
  const setEcran = useGame(s => s.setEcran);
  const coins = useGame(s => s.coins);
  const etat = useGame(s => s.collectionSolo);
  const acheterPack = useGame(s => s.acheterPackCollectionSolo);
  const joueur = useGame(s => s.joueur);
  const manager = useGame(s => s.manager);
  const catalogue = useMemo(() => catalogueBaseCarriere(), []);
  const packsRoue = useMemo<PackCarriere[]>(() => [...PACKS_CARRIERE], []);
  const [recherche, setRecherche] = useState('');
  const [rarete, setRarete] = useState<RareteCarriere | 'toutes'>('toutes');
  const [statut, setStatut] = useState<'toutes' | 'trouvees' | 'manquantes'>('trouvees');
  const [page, setPage] = useState(0);
  const [ouverture, setOuverture] = useState<{ pack: PackCarriere; indices: number[] } | null>(null);
  const [bilan, setBilan] = useState('');

  const cartesFiltrees = useMemo(() => {
    const terme = normaliser(recherche.trim());
    return catalogue.map((carte, indice) => {
      const quantite = etat.quantites[cleCarteSolo(carte.sourceId)] ?? 0;
      return { carte, indice, trouvee: quantite > 0, quantite };
    })
      .filter(({ carte, trouvee }) => (rarete === 'toutes' || carte.rarete === rarete)
        && (statut === 'toutes' || (statut === 'trouvees' ? trouvee : !trouvee))
        && (!terme || normaliser(`${carte.nom} ${carte.clubReel} ${carte.nation} ${carte.championnat}`).includes(terme)))
      .sort((a, b) => b.carte.note - a.carte.note || a.carte.nom.localeCompare(b.carte.nom, 'fr'));
  }, [catalogue, etat.quantites, rarete, recherche, statut]);
  const pages = Math.max(1, Math.ceil(cartesFiltrees.length / PAR_PAGE));
  const pageSure = Math.min(page, pages - 1);
  const visibles = cartesFiltrees.slice(pageSure * PAR_PAGE, (pageSure + 1) * PAR_PAGE);
  const total = catalogue.length;
  const trouvees = catalogue.reduce((somme, carte) => somme + (etat.quantites[cleCarteSolo(carte.sourceId)] ? 1 : 0), 0);
  const exemplaires = Object.values(etat.quantites).reduce((somme, quantite) => somme + quantite, 0);
  const progression = total ? Math.round(trouvees / total * 1000) / 10 : 0;
  const nomCompte = joueur?.pseudo ?? joueur?.nom ?? manager?.nom ?? 'Compte joueur';

  const ouvrirDepuisRoue = async (id: string) => {
    const pack = PACKS_CARRIERE.find(candidat => candidat.id === id);
    if (!pack) return;
    const prix = prixPackSolo(pack);
    const resultat = acheterPack(prix, precedent => ouvrirPackSolo(pack, catalogue, precedent));
    if (!resultat) {
      setBilan(coins < prix ? `Il te manque ${nombre(prix - coins)} Ovas pour ouvrir ce pack.` : 'Ce pack ne contient aucun joueur disponible.');
      return;
    }
    const doublons = resultat.indices.length - resultat.nouvelles;
    setBilan(`${resultat.nouvelles} nouvelle${resultat.nouvelles > 1 ? 's' : ''} carte${resultat.nouvelles > 1 ? 's' : ''}, ${doublons} doublon${doublons > 1 ? 's' : ''}.`);
    setOuverture({ pack, indices: resultat.indices });
  };

  return <section className="solo-collection">
    <header className="solo-entete">
      <button type="button" className="btn fantome" onClick={() => setEcran('accueil')}><Icone nom="fleche-droite" className="solo-retour" taille={16} /> Accueil</button>
      <div><div className="eyebrow">Collection du compte · {nomCompte}</div><h1>Ma collection</h1><p>Ta collection, tes doublons et tes Ovas sont partagés entre toutes tes carrières sur ce compte.</p></div>
      <div className="solo-solde"><Icone nom="ova" taille={18} /><strong>{nombre(coins)}</strong><span>Ovas</span></div>
    </header>

    <section className="solo-progression carte">
      <div><span>Joueurs trouvés</span><strong>{nombre(trouvees)} <small>/ {nombre(total)}</small></strong></div>
      <div className="solo-jauge"><i style={{ width: `${progression}%` }} /><span>{progression} %</span></div>
      <div className="solo-stats"><span><b>{nombre(Object.values(etat.packsOuverts).reduce((s, n) => s + n, 0))}</b> packs ouverts</span><span><b>{nombre(etat.doublons)}</b> doublons</span><span><b>{nombre(exemplaires)}</b> cartes au total</span></div>
    </section>

    {bilan && <p className="solo-bilan" role="status"><Icone nom="ok" taille={17} /> {bilan}</p>}

    <section className="solo-rayon" aria-labelledby="solo-packs-titre">
      <div className="solo-titre-ligne"><div><div className="eyebrow">Tous les packs du jeu</div><h2 id="solo-packs-titre">Choisis un pack</h2></div><span>Bronze, Argent et Or sont gratuits. Les autres packs sont débités de tes Ovas. Chaque tirage peut contenir des doublons.</span></div>
      <BoutiquePacks3D
        packs={packsRoue}
        solde={coins}
        occupe={ouverture !== null}
        onOuvrir={ouvrirDepuisRoue}
        packsGratuits={IDS_PACKS_SOLO_GRATUITS}
        paiementAlternatif={<button type="button" className="btn fantome petit solo-pub-desactivee" disabled title="Les publicités ne sont pas encore activées"><Icone nom="video" taille={15} /> Ouvrir avec une pub · bientôt</button>}
      />
    </section>

    <section className="solo-catalogue">
      <div className="solo-titre-ligne"><div><div className="eyebrow">Du meilleur au moins bien noté</div><h2>Mes joueurs</h2></div><span>Un badge ×2, ×3… indique le nombre d’exemplaires possédés.</span></div>
      <div className="solo-filtres">
        <label><span>Rechercher</span><input value={recherche} onChange={e => { setRecherche(e.target.value); setPage(0); }} placeholder="Joueur, club, nation…" /></label>
        <label><span>Rareté</span><select value={rarete} onChange={e => { setRarete(e.target.value as RareteCarriere | 'toutes'); setPage(0); }}><option value="toutes">Toutes</option>{RARETES.map(r => <option value={r} key={r}>{NOMS_PACK[r]}</option>)}</select></label>
        <label><span>Collection</span><select value={statut} onChange={e => { setStatut(e.target.value as typeof statut); setPage(0); }}><option value="trouvees">Possédées</option><option value="toutes">Toutes</option><option value="manquantes">Manquantes</option></select></label>
      </div>
      <p className="solo-resultats">{nombre(cartesFiltrees.length)} joueur{cartesFiltrees.length > 1 ? 's' : ''}</p>
      <div className="solo-cartes">
        {visibles.map(({ carte, trouvee, quantite }) => <div className="solo-carte-conteneur" key={carte.sourceId}>{quantite > 1 && <span className="solo-quantite" aria-label={`${quantite} exemplaires`}>×{quantite}</span>}<CarteJoueurEnLigne carte={carteDepuisSource(carte, 'solo', 'collection', 1)} compacte etatCollection={trouvee ? 'decouverte' : 'inconnue'} /></div>)}
      </div>
      {!visibles.length && <div className="solo-vide"><Icone nom="cadeau" taille={28} /><b>{statut === 'trouvees' ? 'Ouvre ton premier pack pour commencer ta collection.' : 'Aucun joueur ne correspond à ces filtres.'}</b></div>}
      {pages > 1 && <nav className="solo-pagination" aria-label="Pages du catalogue"><button type="button" className="btn fantome" disabled={pageSure === 0} onClick={() => setPage(Math.max(0, pageSure - 1))}>Précédent</button><span>Page {pageSure + 1} / {pages}</span><button type="button" className="btn fantome" disabled={pageSure >= pages - 1} onClick={() => setPage(Math.min(pages - 1, pageSure + 1))}>Suivant</button></nav>}
    </section>

    {ouverture && <OuverturePack
      cartes={ouverture.indices.map((indice, position) => ({ ...carteDepuisSource(catalogue[indice], 'solo', 'collection', 1), id: `solo-pack-${position}-${catalogue[indice].sourceId}` }))}
      pack={ouverture.pack.nom}
      garantie={ouverture.pack.garantie}
      onFermer={() => setOuverture(null)}
      rendreCarte={carte => <CarteJoueurEnLigne carte={carte} compacte proprietaire="Ma collection" />}
    />}
  </section>;
}
