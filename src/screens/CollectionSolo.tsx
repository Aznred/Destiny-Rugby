import { useEffect, useMemo, useState } from 'react';
import { Icone } from '../components/Icone';
import { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
import OuverturePack from '../components/OuverturePack';
import BoutiquePacks3D from '../components/BoutiquePacks3D';
import { useGame } from '../store/useGame';
import { carteDepuisSource, catalogueBaseCarriere, PACKS_CARRIERE } from '../lib/ligue/catalogueCarriere';
import type { PackCarriere, RareteCarriere } from '../lib/ligue/typesCarriere';
import { cleCarteSolo, IDS_PACKS_SOLO_GRATUITS, ouvrirPackSolo, packsCollectionSolo } from '../lib/collectionSolo';
import { SalonAmicalModal } from '../components/SalonAmicalModal';
import { CompositionCollectionSolo } from '../components/CompositionCollectionSolo';
import { estCompteKiriAutorise } from '../lib/amicalCollection';
import { chargerSessionCarriere, type CompteCarriere } from '../lib/carriereEnLigneClient';
import { nombre, t } from '../lib/i18n';
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
  const packsRoue = useMemo<PackCarriere[]>(() => packsCollectionSolo(PACKS_CARRIERE), []);
  const [recherche, setRecherche] = useState('');
  const [rarete, setRarete] = useState<RareteCarriere | 'toutes'>('toutes');
  const [statut, setStatut] = useState<'toutes' | 'trouvees' | 'manquantes'>('trouvees');
  const [page, setPage] = useState(0);
  const [ouverture, setOuverture] = useState<{ pack: PackCarriere; indices: number[] } | null>(null);
  const [bilan, setBilan] = useState('');
  const [sessionCompte, setSessionCompte] = useState<CompteCarriere | null>(() => {
    if (typeof window !== 'undefined') {
      const pseudo = localStorage.getItem('destiny-compte-pseudo');
      const estAdmin = localStorage.getItem('destiny-compte-kiri') === '1';
      if (pseudo || estAdmin) return { id: 'cache', pseudo: pseudo ?? '', administrateur: estAdmin };
    }
    return null;
  });

  useEffect(() => {
    chargerSessionCarriere()
      .then((session) => {
        if (session?.compte) {
          setSessionCompte(session.compte);
          if (session.compte.administrateur || session.compte.pseudo?.trim().toLowerCase() === 'kiri') {
            try { localStorage.setItem('destiny-compte-kiri', '1'); } catch {}
          }
          if (session.compte.pseudo) {
            try { localStorage.setItem('destiny-compte-pseudo', session.compte.pseudo); } catch {}
          }
        }
      })
      .catch(() => {});
  }, []);

  const nomCompte = joueur?.pseudo ?? joueur?.nom ?? manager?.nom ?? 'Compte joueur';
  const estKiri = useMemo(() => estCompteKiriAutorise(sessionCompte, nomCompte), [sessionCompte, nomCompte]);
  const [amicalOuvert, setAmicalOuvert] = useState(() => typeof window !== 'undefined' && (new URLSearchParams(window.location.search).has('amical') || new URLSearchParams(window.location.search).get('amicalOuvert') === '1'));
  const codeAmicalUrl = useMemo(() => typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('amical') ?? undefined : undefined, []);
  const [compoPleineOuverte, setCompoPleineOuverte] = useState(false);

  const cartesPossedees = useMemo(() => {
    return catalogue
      .filter((carte) => (etat.quantites[cleCarteSolo(carte.sourceId)] ?? 0) > 0)
      .map((carte) => carteDepuisSource(carte, 'solo', 'collection', 1));
  }, [catalogue, etat.quantites]);

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

  const ouvrirDepuisRoue = async (id: string) => {
    const pack = packsRoue.find(candidat => candidat.id === id);
    if (!pack) return;
    const prix = pack.prix;
    const resultat = acheterPack(prix, precedent => ouvrirPackSolo(pack, catalogue, precedent));
    if (!resultat) {
      setBilan(coins < prix ? t('solo.missingOvas', { n: nombre(prix - coins) }) : t('solo.noPlayerInPack'));
      return;
    }
    const doublons = resultat.indices.length - resultat.nouvelles;
    const texteNouvelles = resultat.nouvelles > 1 ? t('solo.summaryNewPlural', { n: resultat.nouvelles }) : t('solo.summaryNew', { n: resultat.nouvelles });
    const texteDoublons = doublons > 1 ? t('solo.summaryDupPlural', { n: doublons }) : t('solo.summaryDup', { n: doublons });
    setBilan(`${texteNouvelles}, ${texteDoublons}.`);
    setOuverture({ pack, indices: resultat.indices });
  };

  return <section className="solo-collection">
    <header className="solo-entete">
      <button type="button" className="btn fantome" onClick={() => setEcran('accueil')}><Icone nom="fleche-droite" className="solo-retour" taille={16} /> {t('online.home')}</button>
      <div><div className="eyebrow">{t('solo.account', { name: nomCompte })}</div><h1>{t('solo.title')}</h1><p>{t('solo.description')}</p></div>
      <div className="solo-entete-droite">
        <button type="button" className="btn primaire solo-btn-compo" onClick={() => setCompoPleineOuverte(true)}>
          <Icone nom="equipe" taille={18} /> {t('solo.lineupBtn', { n: cartesPossedees.length })}
        </button>
        <div className="solo-solde"><Icone nom="ova" taille={18} /><strong>{nombre(coins)}</strong><span>Ovas</span></div>
      </div>
    </header>

    <section className="solo-progression carte">
      <div><span>{t('solo.found')}</span><strong>{nombre(trouvees)} <small>/ {nombre(total)}</small></strong></div>
      <div className="solo-jauge"><i style={{ width: `${progression}%` }} /><span>{progression} %</span></div>
      <div className="solo-stats"><span><b>{nombre(Object.values(etat.packsOuverts).reduce((s, n) => s + n, 0))}</b> {t('solo.packsOpened')}</span><span><b>{nombre(etat.doublons)}</b> {t('solo.duplicates')}</span><span><b>{nombre(exemplaires)}</b> {t('solo.totalCards')}</span></div>
    </section>

    {estKiri && (
      <section className="solo-banniere-amical carte">
        <div className="solo-amical-texte">
          <span className="amical-badge-kiri">{t('solo.amical.activeBadge')}</span>
          <h3>{t('solo.amical.title')}</h3>
          <p>{t('solo.amical.desc')}</p>
        </div>
        <div className="solo-amical-actions">
          <button type="button" className="btn solo-btn-terrain" onClick={() => setCompoPleineOuverte(true)}>
            <Icone nom="equipe" taille={18} /> {t('solo.amical.lineupBtn')}
          </button>
          <button type="button" className="btn primaire" onClick={() => setAmicalOuvert(true)}>
            <Icone nom="eclair" taille={18} /> {t('solo.amical.launchBtn')}
          </button>
        </div>
      </section>
    )}

    {bilan && <p className="solo-bilan" role="status"><Icone nom="ok" taille={17} /> {bilan}</p>}

    <section className="solo-rayon" aria-labelledby="solo-packs-titre">
      <div className="solo-titre-ligne"><div><div className="eyebrow">{t('solo.allPacks')}</div><h2 id="solo-packs-titre">{t('solo.choosePack')}</h2></div><span>{t('solo.packsHelp')}</span></div>
      <BoutiquePacks3D
        packs={packsRoue}
        solde={coins}
        occupe={ouverture !== null}
        onOuvrir={ouvrirDepuisRoue}
        packsGratuits={IDS_PACKS_SOLO_GRATUITS}
        paiementAlternatif={<button type="button" className="btn fantome petit solo-pub-desactivee" disabled title={t('solo.adTitle')}><Icone nom="video" taille={15} /> {t('solo.adDisabled')}</button>}
      />
    </section>

    <section className="solo-catalogue">
      <div className="solo-titre-ligne"><div><div className="eyebrow">{t('solo.playersSubtitle')}</div><h2>{t('solo.playersTitle')}</h2></div><span>{t('solo.badgeNotice')}</span></div>
      <div className="solo-filtres">
        <label><span>{t('solo.search')}</span><input value={recherche} onChange={e => { setRecherche(e.target.value); setPage(0); }} placeholder={t('solo.searchPlaceholder')} /></label>
        <label><span>{t('solo.rarity')}</span><select value={rarete} onChange={e => { setRarete(e.target.value as RareteCarriere | 'toutes'); setPage(0); }}><option value="toutes">{t('solo.rarity.all')}</option>{RARETES.map(r => <option value={r} key={r}>{t(`online.rarity.${r}`)}</option>)}</select></label>
        <label><span>{t('solo.status')}</span><select value={statut} onChange={e => { setStatut(e.target.value as typeof statut); setPage(0); }}><option value="trouvees">{t('solo.status.owned')}</option><option value="toutes">{t('solo.status.all')}</option><option value="manquantes">{t('solo.status.missing')}</option></select></label>
      </div>
      <p className="solo-resultats">{nombre(cartesFiltrees.length)} {t('online.common.players')}</p>
      <div className="solo-cartes">
        {visibles.map(({ carte, trouvee, quantite }) => <div className="solo-carte-conteneur" key={carte.sourceId}>{quantite > 1 && <span className="solo-quantite" aria-label={t('solo.copiesCount', { count: quantite })}>×{quantite}</span>}<CarteJoueurEnLigne carte={carteDepuisSource(carte, 'solo', 'collection', 1)} compacte etatCollection={trouvee ? 'decouverte' : 'inconnue'} /></div>)}
      </div>
      {!visibles.length && <div className="solo-vide"><Icone nom="cadeau" taille={28} /><b>{statut === 'trouvees' ? t('solo.emptyOwned') : t('solo.emptyFiltered')}</b></div>}
      {pages > 1 && <nav className="solo-pagination" aria-label="Pages du catalogue"><button type="button" className="btn fantome" disabled={pageSure === 0} onClick={() => setPage(Math.max(0, pageSure - 1))}>{t('solo.pagination.prev')}</button><span>{t('solo.pagination.page', { page: pageSure + 1, pages })}</span><button type="button" className="btn fantome" disabled={pageSure >= pages - 1} onClick={() => setPage(Math.min(pages - 1, pageSure + 1))}>{t('solo.pagination.next')}</button></nav>}
    </section>

    {ouverture && <OuverturePack
      cartes={ouverture.indices.map((indice, position) => ({ ...carteDepuisSource(catalogue[indice], 'solo', 'collection', 1), id: `solo-pack-${position}-${catalogue[indice].sourceId}` }))}
      pack={ouverture.pack.nom}
      garantie={ouverture.pack.garantie}
      onFermer={() => setOuverture(null)}
      rendreCarte={carte => <CarteJoueurEnLigne carte={carte} compacte proprietaire="Ma collection" />}
    />}

    {amicalOuvert && (
      <SalonAmicalModal
        codeInitial={codeAmicalUrl}
        onFermer={() => setAmicalOuvert(false)}
      />
    )}

    {compoPleineOuverte && (
      <CompositionCollectionSolo
        cartes={cartesPossedees}
        onFermer={() => setCompoPleineOuverte(false)}
      />
    )}
  </section>;
}
