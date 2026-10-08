import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icone } from '../components/Icone';
import { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
import OuverturePack from '../components/OuverturePack';
import BoutiquePacks3D from '../components/BoutiquePacks3D';
import { useGame } from '../store/useGame';
import { carteDepuisSource, PACKS_CARRIERE } from '../lib/ligue/catalogueCarriere';
import type { SourceCarte } from '../lib/ligue/catalogueCarriere';
import { catalogueSpecialSolo, synchroniserCatalogueSolo, useCatalogueSolo } from '../lib/catalogueSoloCommun';
import type { PackCarriere, RareteCarriere } from '../lib/ligue/typesCarriere';
import { cleCarteSolo, IDS_PACKS_SOLO_GRATUITS, ouvrirPackSolo, packsCollectionSolo, packsEvenementSolo, prixPackSoloArticle } from '../lib/collectionSolo';
import { SoldesMonnaies } from '../components/SoldesMonnaies';
import { demanderPaiement } from '../lib/achatUi';
import { montantEn, type Devise } from '../lib/monnaies';
import { nomPackCarriere } from '../lib/presentationPacks';
import { carteSpecialeVisibleCollection, preparerTirageSpecial, nomFamilleSpeciale } from '../lib/ligue/cartesSpeciales';
import { Citrouille, EmblemeIcon, EmblemeInfluenceur } from '../components/EmblemesSpeciaux';
import { nombre, t } from '../lib/i18n';
import { apparencePack, modelePackParNom, packAvecSkin } from '../lib/presentationPacks';
import { chargerPacksPrivesSolo, ouvrirPackPriveSolo } from '../lib/carriereEnLigneClient';
import { appliquerCollectionSoloDistante, attendreBoutiqueSoloEnregistree } from '../lib/synchronisationBoutiqueCompte';
import './CollectionSolo.css';
import { fournirCatalogueUsage } from '../lib/usage/collection';

const PAR_PAGE = 40;
const EchangesCollectionSolo = lazy(() => import('../components/EchangesCollectionSolo').then(module => ({ default: module.EchangesCollectionSolo })));
const RARETES: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
const normaliser = (texte: string) => texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function CollectionSolo() {
  const setEcran = useGame(s => s.setEcran);
  const coins = useGame(s => s.coins);
  const credits = useGame(s => s.credits);
  const etat = useGame(s => s.collectionSolo);
  const acheterPack = useGame(s => s.acheterPackCollectionSolo);
  const joueur = useGame(s => s.joueur);
  const manager = useGame(s => s.manager);
  const catalogue = useCatalogueSolo();
  useEffect(() => { fournirCatalogueUsage(catalogue, cleCarteSolo); }, [catalogue]);
  // Relu à chaque nouveau catalogue : `useCatalogueSolo` change d'identité quand
  // le serveur a servi de nouvelles cartes spéciales.
  const speciales = useMemo(() => (catalogue.length ? catalogueSpecialSolo() : null), [catalogue]);
  // L'horloge de la boutique : le pack d'un événement qui se termine disparaît
  // dans la minute, même si l'écran est resté ouvert.
  const [instant, setInstant] = useState(() => Date.now());
  useEffect(() => { const minute = window.setInterval(() => setInstant(Date.now()), 60_000); return () => window.clearInterval(minute); }, []);
  // ⚠️ LE PACK HALLOWEEN EST ICI, DANS LES PACKS SPÉCIAUX, PAS DANS LES LIGUES.
  // Il apparaît en tête pendant sa fenêtre et disparaît seul à la fin du mois.
  const packsEvenement = useMemo(() => packsEvenementSolo(speciales, instant), [speciales, instant]);
  const packsRoue = useMemo<PackCarriere[]>(() => [...packsEvenement, ...packsCollectionSolo(PACKS_CARRIERE)], [packsEvenement]);
  const idsPacksGratuits = useMemo(() => new Set<string>(IDS_PACKS_SOLO_GRATUITS), []);
  const packsGratuits = useMemo(() => packsRoue.filter((pack) => idsPacksGratuits.has(pack.id)), [packsRoue, idsPacksGratuits]);
  const packsPayants = useMemo(() => packsRoue.filter((pack) => !idsPacksGratuits.has(pack.id)), [packsRoue, idsPacksGratuits]);
  /** Une carte spéciale non obtenue ne se montre que publiée, et son événement ouvert. */
  const visibleSiInconnue = useCallback((carte: SourceCarte) => {
    if (!carte.speciale) return true;
    const def = speciales?.parId.get(carte.sourceId);
    return Boolean(def && speciales && carteSpecialeVisibleCollection(def, speciales, instant));
  }, [speciales, instant]);
  /** Ce que chaque pack payant peut donner en cartes spéciales, par carte. */
  const chancesSpeciales = (packId: string) => {
    const pack = packsRoue.find(p => p.id === packId);
    if (!pack || !speciales || idsPacksGratuits.has(pack.id)) return [];
    return (preparerTirageSpecial(pack, true, instant, new Set(), speciales)?.lots ?? [])
      .map(lot => ({ nom: nomFamilleSpeciale(speciales.evenementParId.get(lot.evenement)!.cardType), chance: Math.round(lot.chance * 1000) / 1000 }))
      .filter(c => c.chance > 0);
  };
  const [typeCartes, setTypeCartes] = useState<'' | 'normal' | 'icon' | 'halloween' | 'influencer'>('');
  const comptesSpeciaux = useMemo(() => {
    const comptes: Record<string, number> = {};
    for (const carte of catalogue) if (carte.speciale && (etat.quantites[cleCarteSolo(carte.sourceId)] || visibleSiInconnue(carte))) comptes[carte.speciale.type] = (comptes[carte.speciale.type] ?? 0) + 1;
    return comptes;
  }, [catalogue, etat.quantites, visibleSiInconnue]);
  const [categoriePacks, setCategoriePacks] = useState<'gratuits' | 'payants'>('gratuits');
  const [recherche, setRecherche] = useState('');
  const [rarete, setRarete] = useState<RareteCarriere | 'toutes'>('toutes');
  const [statut, setStatut] = useState<'toutes' | 'trouvees' | 'manquantes'>('trouvees');
  const [page, setPage] = useState(0);
  const [ouverture, setOuverture] = useState<{ pack: PackCarriere; indices: number[]; catalogue: readonly SourceCarte[] } | null>(null);
  const [bilan, setBilan] = useState('');
  const nomCompte = joueur?.pseudo ?? joueur?.nom ?? manager?.nom ?? 'Compte joueur';
  const [echangesOuverts, setEchangesOuverts] = useState(false);
  const [packsPrives, setPacksPrives] = useState<PackCarriere[]>([]);
  const [occupe, setOccupe] = useState(false);
  const verrouOuverture = useRef(false);
  /** La monnaie que le joueur vient de choisir dans la fenêtre d'achat (Correctif 21) ; les packs gratuits n'en demandent aucune. */
  const choixDevise = useRef<Devise>('ovas');
  const controleurOuverture = useRef<AbortController | null>(null);
  useEffect(() => {
    let vivant = true;
    let controleur: AbortController | undefined;
    const charger = () => {
      controleurOuverture.current?.abort();
      controleur?.abort();
      controleur = new AbortController();
      const courant = controleur;
      setPacksPrives([]);
      void chargerPacksPrivesSolo(courant.signal).then(resultat => {
        if (vivant && !courant.signal.aborted) setPacksPrives(resultat.packs);
      }).catch(() => { /* Aucun pack privé sans session vérifiée. */ });
    };
    const deconnecter = () => { controleur?.abort(); controleurOuverture.current?.abort(); setPacksPrives([]); };
    charger();
    window.addEventListener('destiny-compte-connecte', charger);
    window.addEventListener('destiny-compte-deconnecte', deconnecter);
    return () => {
      vivant = false; controleur?.abort(); controleurOuverture.current?.abort();
      window.removeEventListener('destiny-compte-connecte', charger);
      window.removeEventListener('destiny-compte-deconnecte', deconnecter);
    };
  }, []);

  const cartesFiltrees = useMemo(() => {
    const terme = normaliser(recherche.trim());
    return catalogue.map((carte, indice) => {
      const quantite = etat.quantites[cleCarteSolo(carte.sourceId)] ?? 0;
      return { carte, indice, trouvee: quantite > 0, quantite };
    })
      .filter(({ carte, trouvee }) => (trouvee || visibleSiInconnue(carte))
        && (!typeCartes || (typeCartes === 'normal' ? !carte.speciale : carte.speciale?.type === typeCartes))
        && (rarete === 'toutes' || carte.rarete === rarete)
        && (statut === 'toutes' || (statut === 'trouvees' ? trouvee : !trouvee))
        && (!terme || normaliser(`${carte.nom} ${carte.clubReel} ${carte.nation} ${carte.championnat}`).includes(terme)))
      .sort((a, b) => b.carte.note - a.carte.note || a.carte.nom.localeCompare(b.carte.nom, 'fr'));
  }, [catalogue, etat.quantites, rarete, recherche, statut, typeCartes, visibleSiInconnue]);
  const pages = Math.max(1, Math.ceil(cartesFiltrees.length / PAR_PAGE));
  const pageSure = Math.min(page, pages - 1);
  const visibles = cartesFiltrees.slice(pageSure * PAR_PAGE, (pageSure + 1) * PAR_PAGE);
  const total = catalogue.filter(carte => !carte.speciale || visibleSiInconnue(carte) || etat.quantites[cleCarteSolo(carte.sourceId)]).length;
  const trouvees = catalogue.reduce((somme, carte) => somme + (etat.quantites[cleCarteSolo(carte.sourceId)] ? 1 : 0), 0);
  const exemplaires = Object.values(etat.quantites).reduce((somme, quantite) => somme + quantite, 0);
  const progression = total ? Math.round(trouvees / total * 1000) / 10 : 0;

  const ouvrirDepuisRoue = async (id: string) => {
    if (verrouOuverture.current || ouverture) return;
    verrouOuverture.current = true; setOccupe(true);
    try {
      const prive = packsPrives.find(pack => pack.id === id);
      if (prive) {
        const controleur = new AbortController();
        controleurOuverture.current = controleur;
        await attendreBoutiqueSoloEnregistree();
        if (controleur.signal.aborted) return;
        const resultat = await ouvrirPackPriveSolo(id, controleur.signal);
        if (controleur.signal.aborted) return;
        appliquerCollectionSoloDistante(resultat.boutique.collectionSolo);
        setBilan('Dix cartes ICONS ajoutées à ta collection.');
        setOuverture({ pack: prive, indices: resultat.cartes.map((_, indice) => indice), catalogue: resultat.cartes });
        return;
      }
      const pack = packsRoue.find(candidat => candidat.id === id);
      if (!pack) return;
      const catalogueActuel = await synchroniserCatalogueSolo();
      const gratuitPack = idsPacksGratuits.has(pack.id);
      const prixArt = prixPackSoloArticle(pack);
      const devise: Devise = gratuitPack ? 'ovas' : choixDevise.current;
      const prix = montantEn(prixArt, devise) ?? pack.prix;
      // Les packs gratuits ordinaires conservent leur tirage sans carte spéciale.
      const avecSpeciales = !idsPacksGratuits.has(pack.id);
      const resultat = acheterPack(prix, precedent => ouvrirPackSolo(pack, catalogueActuel, precedent, undefined,
        avecSpeciales ? { speciales: catalogueSpecialSolo(), maintenant: Date.now() } : {}), devise);
      if (!resultat) {
        const solde = devise === 'ovas' ? coins : credits;
        setBilan(solde < prix ? t(devise === 'ovas' ? 'solo.missingOvas' : 'solo.missingCredits', { n: nombre(prix - solde) }) : t('solo.noPlayerInPack'));
        return;
      }
      const doublons = resultat.indices.length - resultat.nouvelles;
      const texteNouvelles = resultat.nouvelles > 1 ? t('solo.summaryNewPlural', { n: resultat.nouvelles }) : t('solo.summaryNew', { n: resultat.nouvelles });
      const texteDoublons = doublons > 1 ? t('solo.summaryDupPlural', { n: doublons }) : t('solo.summaryDup', { n: doublons });
      setBilan(`${texteNouvelles}, ${texteDoublons}.`);
      setOuverture({ pack, indices: resultat.indices, catalogue: catalogueActuel });
    } catch (erreur) {
      if (!(erreur instanceof Error && erreur.name === 'AbortError')) {
        setBilan(erreur instanceof Error ? erreur.message : 'Impossible d’ouvrir ce pack.');
      }
    } finally { controleurOuverture.current = null; verrouOuverture.current = false; setOccupe(false); }
  };

  return <section className="solo-collection">
    <header className="solo-entete">
      <button type="button" className="btn fantome" onClick={() => setEcran('accueil')}><Icone nom="fleche-droite" className="solo-retour" taille={16} /> {t('online.home')}</button>
      <div><div className="eyebrow">{t('solo.account', { name: nomCompte })}</div><h1>{t('solo.title')}</h1><p>{t('solo.description')}</p></div>
      <div className="solo-entete-droite">
        <SoldesMonnaies />
      </div>
    </header>

    <section className="solo-progression carte">
      <div><span>{t('solo.found')}</span><strong>{nombre(trouvees)} <small>/ {nombre(total)}</small></strong></div>
      <div className="solo-jauge"><i style={{ width: `${progression}%` }} /><span>{progression} %</span></div>
      <div className="solo-stats"><span><b>{nombre(Object.values(etat.packsOuverts).reduce((s, n) => s + n, 0))}</b> {t('solo.packsOpened')}</span><span><b>{nombre(etat.doublons)}</b> {t('solo.duplicates')}</span><span><b>{nombre(exemplaires)}</b> {t('solo.totalCards')}</span></div>
    </section>

    {bilan && <p className="solo-bilan" role="status"><Icone nom="ok" taille={17} /> {bilan}</p>}

    <button type="button" className="btn fantome solo-bouton-echanges" onClick={() => setEchangesOuverts(ouvert => !ouvert)}>
      {echangesOuverts ? t("ui.ad2d61675932") : t("ui.5c8f1fe771de")}
    </button>
    {echangesOuverts && <Suspense fallback={<p>{t("ui.f433895f5136")}</p>}><EchangesCollectionSolo /></Suspense>}

    {packsPrives.length > 0 && <section className="solo-rayon" aria-labelledby="solo-packs-prives-titre">
      <div className="solo-titre-ligne"><div><div className="eyebrow">{t('solo.privateAccount')}</div><h2 id="solo-packs-prives-titre">{t('solo.iconGuaranteed')}</h2></div><span>{t('solo.freeIconPack')}</span></div>
      <BoutiquePacks3D packs={packsPrives} solde={coins} occupe={occupe || Boolean(ouverture)} gratuit
        onOuvrir={ouvrirDepuisRoue} chancesSpeciales={() => [{ nom: 'ICON', chance: 100 }]} />
    </section>}

    <section className="solo-rayon" aria-labelledby="solo-packs-titre">
      <div className="solo-titre-ligne"><div><div className="eyebrow">{t('solo.allPacks')}</div><h2 id="solo-packs-titre">{t('solo.choosePack')}</h2></div><span>{categoriePacks === 'gratuits' ? t('solo.freePacksHelp') : t('solo.paidPacksHelp')}</span></div>
      <div className="solo-categories-packs" role="tablist" aria-label={t('solo.packCategories')}>
        <button
          type="button"
          role="tab"
          aria-selected={categoriePacks === 'gratuits'}
          onClick={() => setCategoriePacks('gratuits')}
        >
          <span><Icone nom="cadeau" taille={20} /></span>
          <b>{t('solo.freePacks')}</b>
          <small>{t('solo.freePacksDetail')}</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={categoriePacks === 'payants'}
          onClick={() => setCategoriePacks('payants')}
        >
          <span><Icone nom="ova" taille={20} /></span>
          <b>{t('solo.paidPacks')}</b>
          <small>{t('solo.paidPacksDetail', { n: packsPayants.length })}</small>
        </button>
      </div>
      <BoutiquePacks3D
        key={categoriePacks}
        packs={categoriePacks === 'gratuits' ? packsGratuits : packsPayants}
        solde={coins}
        occupe={occupe || ouverture !== null}
        onOuvrir={ouvrirDepuisRoue}
        gratuit={categoriePacks === 'gratuits'}
        chancesSpeciales={chancesSpeciales}
        avantAchat={categoriePacks === 'gratuits' ? undefined : async (pack) => {
          // Le joueur CHOISIT sa monnaie quand le pack accepte les deux ; un solde insuffisant ouvre une vraie fenêtre, jamais un message muet.
          const d = await demanderPaiement({ titre: nomPackCarriere(pack), prix: prixPackSoloArticle(pack) });
          if (!d) return false;
          choixDevise.current = d;
          return true;
        }}
        etiquettePrix={categoriePacks === 'gratuits' ? undefined : (pack) => {
          const p = prixPackSoloArticle(pack);
          const o = montantEn(p, 'ovas'), c = montantEn(p, 'credits');
          return [o !== null ? nombre(o) + ' Ovas' : '', c !== null ? nombre(c) + ' ' + t('mo.credits') : ''].filter(Boolean).join(' · ');
        }}
        paiementAlternatif={categoriePacks === 'gratuits' ? <button type="button" className="btn fantome petit solo-pub-desactivee" disabled title={t('solo.adTitle')}><Icone nom="video" taille={15} /> {t('solo.adDisabled')}</button> : undefined}
      />
    </section>

    <section className="solo-catalogue">
      <div className="solo-titre-ligne"><div><div className="eyebrow">{t('solo.playersSubtitle')}</div><h2>{t('solo.playersTitle')}</h2></div><span>{t('solo.badgeNotice')}</span></div>
      {Object.keys(comptesSpeciaux).length > 0 && <div className="solo-types" role="group" aria-label={t('special.filter.label')}>
        {([['', t('online.collection.all'), null], ['normal', t('special.filter.players'), null],
          ['icon', t('special.icons'), <EmblemeIcon key="i" taille={20} />], ['halloween', t('special.halloween'), <Citrouille key="h" taille={20} />], ['influencer', t('special.influencers'), <EmblemeInfluenceur key="c" taille={20} />]] as const).map(([valeur, libelle, embleme]) =>
          (valeur === 'icon' || valeur === 'halloween' || valeur === 'influencer') && !comptesSpeciaux[valeur] ? null
            : <button key={valeur} type="button" className={`solo-type type-${valeur || 'tout'}${typeCartes === valeur ? ' actif' : ''}`} aria-pressed={typeCartes === valeur} onClick={() => { setTypeCartes(valeur); setPage(0); }}>
              {embleme}<span>{libelle}</span>{(valeur === 'icon' || valeur === 'halloween' || valeur === 'influencer') && <b>{nombre(comptesSpeciaux[valeur] ?? 0)}</b>}
            </button>)}
      </div>}
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
      {pages > 1 && <nav className="solo-pagination" aria-label={t("ui.4730b31bdedb")}><button type="button" className="btn fantome" disabled={pageSure === 0} onClick={() => setPage(Math.max(0, pageSure - 1))}>{t('solo.pagination.prev')}</button><span>{t('solo.pagination.page', { page: pageSure + 1, pages })}</span><button type="button" className="btn fantome" disabled={pageSure >= pages - 1} onClick={() => setPage(Math.min(pages - 1, pageSure + 1))}>{t('solo.pagination.next')}</button></nav>}
    </section>

    {ouverture && <OuverturePack
      cartes={ouverture.indices.map((indice, position) => ({ ...carteDepuisSource(ouverture.catalogue[indice], 'solo', 'collection', 1), id: `solo-pack-${position}-${ouverture.catalogue[indice].sourceId}` }))}
      pack={ouverture.pack.nom}
      modele={packAvecSkin(ouverture.pack) ? modelePackParNom(ouverture.pack) : undefined}
      garantie={ouverture.pack.garantie}
      apparenceInitiale={apparencePack(ouverture.pack)}
      onFermer={() => setOuverture(null)}
      rendreCarte={carte => <CarteJoueurEnLigne carte={carte} compacte proprietaire="Ma collection" />}
    />}

  </section>;
}
