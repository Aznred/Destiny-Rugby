import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../store/useGame';
import { useCatalogueSolo } from '../lib/catalogueSoloCommun';
import { cleCarteSolo } from '../lib/collectionSolo';
import type { LotCartesSolo, OffreSolo, PageOffresSolo } from '../lib/echangesSolo';
import { possedeDoublons } from '../lib/echangesSolo';
import { accepterOffreSolo, annulerOffreSolo, chargerSessionCarriere, creerOffreSolo, listerEchangesSolo, proposerOffreSolo, refuserOffreSolo } from '../lib/carriereEnLigneClient';
import type { EtatBoutiqueCompte } from '../lib/boutiqueCompte';
import { appliquerCollectionSoloDistante } from '../lib/synchronisationBoutiqueCompte';
import { carteDepuisSource, type SourceCarte } from '../lib/ligue/catalogueCarriere';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { Icone } from './Icone';
import { RoueCartes } from './RoueCartes';
import './EchangesCollectionSolo.css';

const ajout = (lot: LotCartesSolo, cle: string): LotCartesSolo => ({ ...lot, [cle]: (lot[cle] ?? 0) + 1 });
const retrait = (lot: LotCartesSolo, cle: string): LotCartesSolo => {
  const suivant = { ...lot }; delete suivant[cle]; return suivant;
};
const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function LotVisuel({ lot, parCle, vide, onRetirer }: { lot: LotCartesSolo; parCle: Map<string, SourceCarte>; vide: string; onRetirer?: (cle: string) => void }) {
  const entrees = Object.entries(lot);
  return <div className="solo-echanges-cartes">{entrees.length ? entrees.map(([cle, quantite]) => {
    const carte = parCle.get(cle);
    return <div className="solo-echanges-carte" key={cle}>
      {carte ? <CarteJoueurEnLigne carte={carteDepuisSource(carte, 'solo', 'collection', 1)} compacte /> : <span className="solo-echanges-carte-inconnue">Carte inconnue</span>}
      {quantite > 1 && <b className="solo-echanges-quantite">×{quantite}</b>}
      {onRetirer && <button type="button" onClick={() => onRetirer(cle)} aria-label={`Retirer ${carte?.nom ?? 'carte'}`}>Retirer ×</button>}
    </div>;
  }) : <span className="solo-echanges-vide">{vide}</span>}</div>;
}

export function EchangesCollectionSolo() {
  const collection = useGame(s => s.collectionSolo);
  const [compte, setCompte] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [offres, setOffres] = useState<PageOffresSolo>({ offres: [], total: 0 });
  const [don, setDon] = useState<LotCartesSolo>({});
  const [souhait, setSouhait] = useState<LotCartesSolo>({});
  const [libre, setLibre] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [rechercheDoublon, setRechercheDoublon] = useState('');
  const [proposition, setProposition] = useState<{ offre: string; cartes: LotCartesSolo } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const catalogue = useCatalogueSolo();
  const parCle = useMemo(() => new Map(catalogue.map(c => [cleCarteSolo(c.sourceId), c])), [catalogue]);
  const doublons = useMemo(() => catalogue.filter(c => (collection.quantites[cleCarteSolo(c.sourceId)] ?? 0) > 1)
    .sort((a, b) => b.note - a.note || a.nom.localeCompare(b.nom, 'fr')), [catalogue, collection.quantites]);
  const cartesDoublons = useMemo(() => doublons.filter(c => normaliser(`${c.nom} ${c.clubReel} ${c.poste}`).includes(normaliser(rechercheDoublon.trim())))
    .map(c => carteDepuisSource(c, 'solo', 'collection', 1)), [doublons, rechercheDoublon]);
  const idRoue = (cle: string) => {
    const source = parCle.get(cle);
    return source ? `solo:${source.sourceId}` : '';
  };
  const cleRoue = (id: string) => cleCarteSolo(id.slice('solo:'.length));
  const trouvailles = useMemo(() => {
    const terme = normaliser(recherche.trim());
    if (terme.length < 2) return [];
    return catalogue.filter(c => normaliser(`${c.nom} ${c.clubReel}`).includes(terme)).slice(0, 12);
  }, [catalogue, recherche]);
  const charger = async (numero = page) => {
    const resultat = await listerEchangesSolo(numero * 30);
    setOffres(resultat);
  };
  useEffect(() => {
    let actif = true;
    void chargerSessionCarriere().then(session => {
      if (!actif) return;
      setCompte(session.compte.id);
      return listerEchangesSolo(0).then(resultat => { if (actif) setOffres(resultat); });
    }).catch(e => { if (actif) setErreur(e instanceof Error ? e.message : 'Échanges indisponibles.'); });
    return () => { actif = false; };
  }, []);
  const agir = async (action: () => Promise<{ boutique: EtatBoutiqueCompte }>) => {
    setOccupe(true); setErreur('');
    try {
      const resultat = await action();
      if (resultat.boutique) appliquerCollectionSoloDistante(resultat.boutique.collectionSolo);
      await charger();
    } catch (e) { setErreur(e instanceof Error ? e.message : 'Échange indisponible.'); }
    finally { setOccupe(false); }
  };
  const creation = () => {
    if (!Object.keys(don).length) return;
    void agir(async () => {
      const resultat = await creerOffreSolo(don, libre ? {} : souhait);
      setDon({}); setSouhait({}); setRecherche('');
      return resultat;
    });
  };
  const choisirDoublon = (cle: string, pourProposition = false) => {
    if (!cle) return;
    if (pourProposition) {
      if (!proposition) return;
      const cartes = ajout(proposition.cartes, cle);
      if (possedeDoublons(collection, cartes)) setProposition({ ...proposition, cartes });
    } else {
      const suivant = ajout(don, cle);
      if (possedeDoublons(collection, suivant)) setDon(suivant);
    }
  };
  return <section className="solo-echanges carte" aria-labelledby="titre-echanges-solo">
    <div className="solo-echanges-titre"><div><div className="eyebrow">MARCHÉ PUBLIC</div><h2 id="titre-echanges-solo">Échanges entre joueurs</h2><p>Propose tes doublons, indique les cartes voulues ou laisse les autres te faire une proposition.</p></div>
      <button type="button" className="btn fantome" disabled={!compte || occupe} onClick={() => void charger().catch(e => setErreur(e.message))}>Actualiser</button></div>
    {!compte ? <p className="solo-echanges-info">Connecte-toi à ton compte depuis la Carrière en ligne pour publier et voir les offres.</p> : <>
      <div className="solo-echanges-creation">
        <h3>Publier une offre</h3>
        <label className="solo-echanges-recherche-roue">Chercher dans mes doublons<input type="search" value={rechercheDoublon} onChange={e => setRechercheDoublon(e.target.value)} placeholder="Nom, club ou poste" /></label>
        <RoueCartes titre={`Mes doublons · ${doublons.length}`} cartes={cartesDoublons} selections={Object.keys(don).map(idRoue)} onChoisir={id => choisirDoublon(cleRoue(id))} vide="Aucun doublon ne correspond à cette recherche." />
        <div className="solo-echanges-cote"><h4>Je donne</h4><LotVisuel lot={don} parCle={parCle} vide="Choisis au moins un doublon." onRetirer={cle => setDon(retrait(don, cle))} /></div>
        <label className="solo-echanges-libre"><input type="checkbox" checked={libre} onChange={e => setLibre(e.target.checked)} /> Libre à toutes les propositions</label>
        {!libre && <><label>Cartes recherchées<input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Chercher un joueur ou son club" /></label>
          {trouvailles.length > 0 && <div className="solo-echanges-resultats">{trouvailles.map(c => <button type="button" key={c.sourceId} onClick={() => setSouhait(ajout(souhait, cleCarteSolo(c.sourceId)))}><CarteJoueurEnLigne carte={carteDepuisSource(c, 'solo', 'collection', 1)} compacte /><span>{c.nom}</span></button>)}</div>}
          <div className="solo-echanges-cote"><h4>Je recherche</h4><LotVisuel lot={souhait} parCle={parCle} vide="Choisis les cartes voulues." onRetirer={cle => setSouhait(retrait(souhait, cle))} /></div></>}
        <button type="button" className="btn primaire" disabled={occupe || !Object.keys(don).length || (!libre && !Object.keys(souhait).length)} onClick={creation}>Publier l’offre</button>
      </div>
      {erreur && <p className="solo-echanges-erreur" role="alert">{erreur}</p>}
      <div className="solo-echanges-liste"><h3>Offres visibles par tous <small>{offres.total}</small></h3>
        {offres.offres.map((offre: OffreSolo) => <article key={offre.id} className="solo-echanges-offre">
          <div><b>{offre.pseudo}</b><small>{new Date(offre.creeLe).toLocaleDateString('fr-FR')} · {offre.statut === 'ouverte' ? 'Ouverte' : offre.statut === 'acceptee' ? 'Conclue' : 'Annulée'}</small></div>
          <div className="solo-echanges-cotes"><div className="solo-echanges-cote"><h4>{offre.pseudo} donne</h4><LotVisuel lot={offre.offertes} parCle={parCle} vide="Aucune carte" /></div><Icone nom="repost" taille={26} /><div className="solo-echanges-cote"><h4>{offre.pseudo} recherche</h4><LotVisuel lot={offre.souhaitees} parCle={parCle} vide="Libre à toutes les propositions" /></div></div>
          {offre.statut === 'ouverte' && (offre.compteId === compte
            ? <><button type="button" className="btn fantome" disabled={occupe} onClick={() => void agir(() => annulerOffreSolo(offre.id))}>Retirer mon offre</button>
                {offre.propositions.map(p => <div className="solo-echanges-proposition" key={p.id}><strong>Proposition de {p.pseudo}</strong><LotVisuel lot={p.cartes} parCle={parCle} vide="Aucune carte" /><div className="solo-echanges-actions"><button type="button" className="btn primaire" disabled={occupe} onClick={() => void agir(() => accepterOffreSolo(offre.id, p.id))}>Accepter</button><button type="button" className="btn fantome" disabled={occupe} onClick={() => void agir(() => refuserOffreSolo(offre.id, p.id))}>Refuser</button></div></div>)}</>
            : <div className="solo-echanges-actions">{Object.keys(offre.souhaitees).length > 0 && <button type="button" className="btn primaire" disabled={occupe || !possedeDoublons(collection, offre.souhaitees)} onClick={() => void agir(() => accepterOffreSolo(offre.id))}>Échanger maintenant</button>}
                <button type="button" className="btn fantome" onClick={() => setProposition({ offre: offre.id, cartes: {} })}>Faire une proposition</button></div>)}
          {proposition?.offre === offre.id && <div className="solo-echanges-creation"><label className="solo-echanges-recherche-roue">Chercher dans mes doublons<input type="search" value={rechercheDoublon} onChange={e => setRechercheDoublon(e.target.value)} placeholder="Nom, club ou poste" /></label>
            <RoueCartes titre={`Mes doublons · ${doublons.length}`} cartes={cartesDoublons} selections={Object.keys(proposition.cartes).map(idRoue)} onChoisir={id => choisirDoublon(cleRoue(id), true)} vide="Aucun doublon ne correspond à cette recherche." />
            <LotVisuel lot={proposition.cartes} parCle={parCle} vide="Ajoute une ou plusieurs cartes." onRetirer={cle => setProposition({ ...proposition, cartes: retrait(proposition.cartes, cle) })} />
            <button type="button" className="btn primaire" disabled={occupe || !Object.keys(proposition.cartes).length} onClick={() => void agir(async () => { const r = await proposerOffreSolo(offre.id, proposition.cartes); setProposition(null); return r; })}>Envoyer la proposition</button></div>}
        </article>)}
        {!offres.offres.length && <p className="solo-echanges-info">Aucune offre pour le moment. Publie la première !</p>}
        <div className="solo-echanges-pages"><button type="button" disabled={page === 0 || occupe} onClick={() => { const n = page - 1; setPage(n); void charger(n); }}>Précédent</button><span>{page + 1} / {Math.max(1, Math.ceil(offres.total / 30))}</span><button type="button" disabled={(page + 1) * 30 >= offres.total || occupe} onClick={() => { const n = page + 1; setPage(n); void charger(n); }}>Suivant</button></div>
      </div>
    </>}
  </section>;
}
