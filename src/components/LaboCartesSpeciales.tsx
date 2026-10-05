import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { CarteCarriere, RareteCarriere } from '../lib/ligue/typesCarriere';
import {
  infoSpeciale, postesDepuisNumeros, type DefinitionCarteSpeciale, type EvenementSpecial, type FamilleSpeciale, type StatutCarteSpeciale,
} from '../lib/ligue/cartesSpeciales';
import { rareteCarriere } from '../lib/ligue/catalogueCarriere';
import { statistiquesCarte } from '../lib/ligue/statistiquesCarte';
import { nomPoste, POSTES, POSTE_PAR_ID } from '../data/rugby';
import type { PosteId } from '../types';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { Citrouille, EmblemeIcon } from './EmblemesSpeciaux';
import { Selecteur } from './Selecteur';
import { Confirmation } from './Confirmation';
import { Drapeau } from './Drapeau';
import './LaboCartesSpeciales.css';

// LE LABO · CARTES SPÉCIALES (compte Kiri)
//
// ⚠️ L'ÉCRAN NE DÉCIDE RIEN : chaque bouton envoie une opération que le
// serveur revalide (`serveur/atelierSpeciales.ts`). GEN hors bornes, ICON
// rattachée à un actif, publication sans image : refusés là-bas, affichés ici.
// L'écran est en français : c'est un outil d'administration, pas le jeu.

type CarteLabo = DefinitionCarteSpeciale & { statut: StatutCarteSpeciale; packable: boolean };
type EvenementLabo = EvenementSpecial & { chances: { pack: string; chance: number }[] };
interface VueLabo { revision: number; maintenant: number; familles: Record<string, FamilleSpeciale>; evenements: EvenementLabo[]; cartes: CarteLabo[]; nations: string[] }

async function requete<T>(chemin: string, corps?: unknown): Promise<T> {
  const r = await fetch(`/api/carriere?atelier=1${chemin}`, { method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: corps ? { 'Content-Type': 'application/json' } : undefined, body: corps ? JSON.stringify(corps) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { erreur?: string }).erreur ?? 'Enregistrement impossible.');
  return d as T;
}

const LIBELLES_STATUT: Record<StatutCarteSpeciale, string> = { draft: 'Brouillon', image_missing: 'Image manquante', ready: 'Prête', published: 'Publiée' };
const numeros = (c: Pick<DefinitionCarteSpeciale, 'poste' | 'postesSecondaires'>) => [c.poste, ...(c.postesSecondaires ?? [])].map(p => POSTE_PAR_ID[p]?.numero).join('/');
/** ISO → valeur d'un champ `datetime-local`, à l'heure de l'appareil. */
const versLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const depuisLocal = (v: string) => (v ? new Date(v).toISOString() : '');
const dateCourte = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '');

/**
 * Une image prête à l'envoi : WebP, 640 px au plus grand côté, sous 350 Ko.
 * La qualité descend tant que l'image est trop lourde ; un portrait détouré
 * garde sa transparence (WebP la conserve).
 */
async function preparerImage(fichier: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(fichier.type) || fichier.size > 15_000_000) throw new Error('Choisis une image PNG, JPEG ou WebP de moins de 15 Mo.');
  const bitmap = await createImageBitmap(fichier);
  const ratio = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  const toile = document.createElement('canvas');
  toile.width = Math.round(bitmap.width * ratio); toile.height = Math.round(bitmap.height * ratio);
  toile.getContext('2d')!.drawImage(bitmap, 0, 0, toile.width, toile.height); bitmap.close();
  for (const qualite of [.9, .82, .72, .6, .48]) {
    const url = toile.toDataURL('image/webp', qualite);
    if (url.length <= 470_000) return url;
  }
  throw new Error('Cette image reste trop lourde, même compressée. Recadre-la.');
}

/** Une carte de ligue fictive, pour l'aperçu — exactement le rendu du jeu. */
function carteApercu(d: CarteLabo, image?: string): CarteCarriere {
  const famille = POSTE_PAR_ID[d.poste].famille;
  return { id: `apercu-${d.id}`, sourceId: d.id, nom: d.nom, poste: d.poste, famille, postesSecondaires: d.postesSecondaires, note: d.overall,
    potentiel: d.overall, age: d.age, nation: d.nation, clubReel: d.club, championnat: d.league, pays: '', photo: image ?? d.image,
    origine: 'professionnel', rarete: rareteCarriere(d.overall) as RareteCarriere, statistiques: statistiquesCarte(d.overall, famille, d.id),
    proprietaire: null, fatigue: 0, matchs: 0, essais: 0, clubs: [], speciale: infoSpeciale(d) };
}

const EmblemeType = ({ type, taille = 18 }: { type: string; taille?: number }) => (type === 'halloween' ? <Citrouille taille={taille} /> : <EmblemeIcon taille={taille} />);

export function LaboCartesSpeciales() {
  const [vue, setVue] = useState<VueLabo | null>(null);
  const [erreur, setErreur] = useState(''), [message, setMessage] = useState(''), [occupe, setOccupe] = useState(false);
  const [panneau, setPanneau] = useState<'cartes' | 'evenements' | 'creation' | 'import'>('cartes');
  const [type, setType] = useState(''), [statut, setStatut] = useState(''), [recherche, setRecherche] = useState('');
  const [selection, setSelection] = useState<string | null>(null);
  const [edition, setEdition] = useState<CarteLabo | null>(null);
  const [cochees, setCochees] = useState<Set<string>>(() => new Set());
  const [aSupprimer, setASupprimer] = useState<CarteLabo | null>(null);

  const charger = useCallback(async () => {
    try { const d = await requete<VueLabo>('&section=speciales'); setVue(d); setErreur(''); return d; }
    catch (e) { setErreur((e as Error).message); return null; }
  }, []);
  useEffect(() => { void charger(); }, [charger]);
  useEffect(() => {
    const carte = vue?.cartes.find(c => c.id === selection);
    setEdition(carte ? structuredClone(carte) : null);
  }, [vue, selection]);

  /** Une opération du Labo, puis on relit tout : la révision et les statuts viennent du serveur. */
  const operer = async (operation: string, champs: Record<string, unknown>, succes: string | ((r: Record<string, unknown>) => string)) => {
    if (!vue) return null;
    setOccupe(true); setErreur(''); setMessage('');
    try {
      const retour = await requete<Record<string, unknown>>('', { action: 'atelier', operation, revision: vue.revision, ...champs });
      await charger();
      setMessage(typeof succes === 'string' ? succes : succes(retour));
      return retour;
    } catch (e) { setErreur((e as Error).message); return null; }
    finally { setOccupe(false); }
  };

  const filtrees = useMemo(() => {
    const n = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return (vue?.cartes ?? []).filter(c => (!type || c.cardType === type) && (!statut || c.statut === statut)
      && (!recherche || n(`${c.nom} ${c.nation} ${c.club}`).includes(n(recherche))));
  }, [vue, type, statut, recherche]);
  const compte = (s: StatutCarteSpeciale) => (vue?.cartes ?? []).filter(c => (!type || c.cardType === type) && c.statut === s).length;
  const pretes = filtrees.filter(c => c.statut === 'ready');

  if (!vue) return <section className="labo-speciales">{erreur ? <p role="alert" className="ak-erreur">{erreur} <button type="button" onClick={() => { void charger(); }}>Réessayer</button></p> : <p>Chargement des cartes spéciales…</p>}</section>;

  return <section className="labo-speciales">
    <nav className="ls-panneaux" aria-label="Cartes spéciales">
      {([['cartes', `Cartes (${vue.cartes.length})`], ['evenements', 'Familles & packs'], ['creation', 'Nouvelle carte'], ['import', 'Import en masse']] as const).map(([id, libelle]) =>
        <button key={id} type="button" className={panneau === id ? 'actif' : ''} aria-pressed={panneau === id} onClick={() => setPanneau(id)}>{libelle}</button>)}
    </nav>
    {erreur && <p role="alert" className="ak-erreur">{erreur}</p>}
    {message && <p role="status" className="ak-succes">{message}</p>}

    {panneau === 'evenements' && <div className="ls-evenements">{vue.evenements.map(ev => <EditeurEvenement key={ev.id} ev={ev} occupe={occupe} operer={operer} />)}</div>}
    {panneau === 'creation' && <CreationCarte vue={vue} occupe={occupe} operer={async (champs) => {
      const r = await operer('creerCarteSpeciale', { carte: champs }, 'Carte créée. Ajoute son image avant de la publier.');
      if (r?.id) { setPanneau('cartes'); setSelection(String(r.id)); }
    }} />}
    {panneau === 'import' && <ImportCartes occupe={occupe} operer={operer} />}

    {panneau === 'cartes' && <>
      <div className="ls-compteurs">
        {(['draft', 'image_missing', 'ready', 'published'] as const).map(s => <button key={s} type="button" className={`ls-compteur statut-${s}${statut === s ? ' actif' : ''}`} aria-pressed={statut === s} onClick={() => setStatut(statut === s ? '' : s)}>
          <b>{compte(s)}</b><span>{LIBELLES_STATUT[s]}</span></button>)}
      </div>
      <div className="ls-filtres">
        <div className="ls-types" role="group" aria-label="Famille">
          {[['', 'Toutes'], ['icon', 'ICONS'], ['halloween', 'HALLOWEEN']].map(([valeur, libelle]) => <button key={valeur} type="button" className={type === valeur ? 'actif' : ''} aria-pressed={type === valeur} onClick={() => setType(valeur)}>{valeur && <EmblemeType type={valeur} />}{libelle}</button>)}
        </div>
        <label className="ls-recherche">Rechercher<input type="search" value={recherche} placeholder="Nom, nation, club" onChange={e => setRecherche(e.target.value)} /></label>
      </div>
      <div className="ls-masse">
        <span>{cochees.size ? `${cochees.size} sélectionnée(s)` : `${filtrees.length} carte(s) affichée(s)`}</span>
        <button type="button" className="btn fantome" disabled={occupe || !filtrees.length} onClick={() => setCochees(cochees.size ? new Set() : new Set(filtrees.map(c => c.id)))}>{cochees.size ? 'Tout décocher' : 'Tout cocher'}</button>
        <button type="button" className="btn primaire" disabled={occupe || !cochees.size} onClick={() => { void operer('publierCartesSpeciales', { ids: [...cochees], published: true }, r => `${r.modifiees} publiée(s).${(r.ignorees as string[])?.length ? ` En attente d’image : ${(r.ignorees as string[]).join(', ')}.` : ''}`).then(() => setCochees(new Set())); }}>Publier la sélection</button>
        <button type="button" className="btn fantome" disabled={occupe || !cochees.size} onClick={() => { void operer('publierCartesSpeciales', { ids: [...cochees], published: false }, r => `${r.modifiees} dépubliée(s).`).then(() => setCochees(new Set())); }}>Dépublier</button>
        <button type="button" className="btn fantome" disabled={occupe || !pretes.length} onClick={() => { void operer('publierCartesSpeciales', { ids: pretes.map(c => c.id), published: true }, r => `${r.modifiees} carte(s) prête(s) publiée(s).`); }}>Publier les prêtes ({pretes.length})</button>
      </div>
      <div className="ls-grille">
        <ul className="ls-liste" aria-label="Cartes spéciales">
          {filtrees.map(c => <li key={c.id} className={`${selection === c.id ? 'selectionnee' : ''} type-${c.cardType}`}>
            <input type="checkbox" aria-label={`Sélectionner ${c.nom}`} checked={cochees.has(c.id)} onChange={() => setCochees(courantes => { const n = new Set(courantes); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} />
            <button type="button" onClick={() => setSelection(c.id)}>
              <span className="ls-vignette">{c.image ? <img src={c.image} alt="" loading="lazy" /> : <EmblemeType type={c.cardType} taille={26} />}</span>
              <span className="ls-identite"><b>{c.nom}</b><small><Drapeau nation={c.nation} taille={.8} /> {c.nation} · n° {numeros(c)}{c.lot ? ` · ${c.lot}` : ''}</small></span>
              <span className="ls-gen"><b>{c.overall}</b><small>COL {c.collectif ?? 'auto'}</small></span>
              <span className={`ls-statut statut-${c.statut}`}>{LIBELLES_STATUT[c.statut]}{c.packable ? ' · en packs' : ''}</span>
            </button>
          </li>)}
          {!filtrees.length && <li className="ls-vide">Aucune carte pour ces filtres.</li>}
        </ul>
        {edition ? <EditeurCarte key={edition.id} carte={edition} vue={vue} occupe={occupe} operer={operer} supprimer={() => setASupprimer(edition)} />
          : <div className="ls-vide-edition">Choisis une carte pour régler son GEN, son COL, ses dates, son image et sa publication.</div>}
      </div>
    </>}
    {aSupprimer && <Confirmation titre={`Retirer ${aSupprimer.nom} du catalogue ?`} message="Elle ne sortira plus d’aucun pack et disparaît du Labo. Les exemplaires déjà distribués restent dans leurs clubs." libelleOui="Retirer"
      onNon={() => setASupprimer(null)} onOui={() => { const id = aSupprimer.id; setASupprimer(null); setSelection(null); void operer('supprimerCarteSpeciale', { id }, 'Carte retirée du catalogue.'); }} />}
  </section>;
}

type Operer = (operation: string, champs: Record<string, unknown>, succes: string | ((r: Record<string, unknown>) => string)) => Promise<Record<string, unknown> | null>;

function EditeurCarte({ carte, vue, occupe, operer, supprimer }: { carte: CarteLabo; vue: VueLabo; occupe: boolean; operer: Operer; supprimer: () => void }) {
  const [c, setC] = useState(carte);
  const [imageLocale, setImageLocale] = useState<string | undefined>();
  const [urlImage, setUrlImage] = useState('');
  const [erreurImage, setErreurImage] = useState('');
  const famille = vue.familles[c.cardType];
  const maj = <K extends keyof CarteLabo>(cle: K, valeur: CarteLabo[K]) => setC(courante => ({ ...courante, [cle]: valeur }));
  const enregistrer = () => operer('carteSpeciale', { id: c.id, carte: {
    nom: c.nom, overall: c.overall, collectif: c.collectif ?? null, poste: c.poste, postesSecondaires: c.postesSecondaires ?? [],
    nation: c.nation, club: c.club, league: c.league, packWeight: c.packWeight, availableFrom: c.availableFrom ?? '', availableUntil: c.availableUntil ?? '',
    canBePacked: c.canBePacked, canAppearInCollection: c.canAppearInCollection, canAppearOnMarket: c.canAppearOnMarket,
    brouillon: Boolean(c.brouillon), published: c.published, rarityAnimation: c.rarityAnimation,
  } }, `${c.nom} enregistrée.`);
  const choisirImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0]; e.target.value = '';
    if (!fichier) return;
    setErreurImage('');
    try {
      const image = await preparerImage(fichier);
      setImageLocale(image);
      await operer('imageCarteSpeciale', { id: c.id, image }, `Image de ${c.nom} enregistrée. Vérifie le rendu, puis publie.`);
    } catch (err) { setErreurImage((err as Error).message); }
  };
  const apercu = carteApercu(c, imageLocale);
  return <form className="ls-edition" onSubmit={e => { e.preventDefault(); void enregistrer(); }}>
    <fieldset disabled={occupe}>
      <legend><EmblemeType type={c.cardType} taille={22} /> {c.nom} <small className={`ls-statut statut-${c.statut}`}>{LIBELLES_STATUT[c.statut]}</small></legend>
      <div className="ls-edition-corps">
        <div className="ls-champs">
          <div className="ak-champs">
            <label>Nom<input required maxLength={60} value={c.nom} onChange={e => maj('nom', e.target.value)} /></label>
            <label>GEN ({famille?.overallMin ?? 20}-{famille?.overallMax ?? 99})<input required type="number" min={famille?.overallMin ?? 20} max={famille?.overallMax ?? 99} value={c.overall} onChange={e => maj('overall', Number(e.target.value))} /></label>
          </div>
          <div className="ak-champs">
            <label>COL (collectif garanti, vide = calculé)<input type="number" min={0} max={10} value={c.collectif ?? ''} onChange={e => maj('collectif', e.target.value === '' ? undefined : Number(e.target.value))} /></label>
            <label>Poids dans les packs<input type="number" min={0} max={100} step=".1" value={c.packWeight} onChange={e => maj('packWeight', Number(e.target.value))} /></label>
          </div>
          <div className="ak-champs">
            <div className="ls-champ"><span>Poste</span><Selecteur valeur={c.poste} onChange={v => maj('poste', v as PosteId)} options={POSTES.map(p => ({ valeur: p.id, label: `${p.numero} · ${p.nom}` }))} /></div>
            <div className="ls-champ"><span>Nation</span><Selecteur valeur={c.nation} recherche onChange={v => maj('nation', v)} options={vue.nations.map(n => ({ valeur: n, label: n, vignette: <Drapeau nation={n} taille={.9} /> }))} /></div>
          </div>
          <div className="ls-champ"><span>Postes secondaires</span><div className="ls-postes">{POSTES.filter(p => p.id !== c.poste).map(p => {
            const actif = (c.postesSecondaires ?? []).includes(p.id);
            return <button key={p.id} type="button" className={actif ? 'actif' : ''} aria-pressed={actif} title={nomPoste(p.id)} onClick={() => maj('postesSecondaires', actif ? (c.postesSecondaires ?? []).filter(x => x !== p.id) : [...(c.postesSecondaires ?? []), p.id])}>{p.numero}</button>;
          })}</div></div>
          <div className="ak-champs">
            <label>Club{c.retraite ? '' : ' (joueur actif)'}<input maxLength={100} value={c.club} onChange={e => maj('club', e.target.value)} /></label>
            <label>Ligue (non affichée sur la carte)<input maxLength={100} value={c.league} onChange={e => maj('league', e.target.value)} /></label>
          </div>
          <div className="ak-champs">
            <label>Disponible à partir du<input type="datetime-local" value={versLocal(c.availableFrom)} onChange={e => maj('availableFrom', depuisLocal(e.target.value) || undefined)} /></label>
            <label>Jusqu’au<input type="datetime-local" value={versLocal(c.availableUntil)} onChange={e => maj('availableUntil', depuisLocal(e.target.value) || undefined)} /></label>
          </div>
          <p className="ak-note">Sans dates propres, la carte suit celles de son événement. {c.basePlayerId ? `Rattachée au joueur actif ${c.basePlayerId}.` : 'Joueur retraité.'}</p>
          <div className="ls-bascules">
            {([['published', 'Publiée'], ['canBePacked', 'Dans les packs'], ['canAppearInCollection', 'Dans la collection'], ['canAppearOnMarket', 'Sur le marché'], ['brouillon', 'Brouillon']] as const).map(([cle, libelle]) =>
              <label key={cle} className={`ls-bascule${cle === 'published' && !c.imageReady ? ' bloquee' : ''}`}><input type="checkbox" checked={Boolean(c[cle])} disabled={cle === 'published' && !c.imageReady && !c.published} onChange={e => maj(cle, e.target.checked)} /><span>{libelle}</span></label>)}
          </div>
          {!c.imageReady && <p className="ak-note ls-alerte">Pas d’image : la carte ne peut ni être publiée, ni sortir d’un pack, ni apparaître en collection.</p>}
          <div className="ls-champ"><span>Animation d’ouverture</span><Selecteur valeur={c.rarityAnimation} onChange={v => maj('rarityAnimation', v as CarteLabo['rarityAnimation'])} options={[{ valeur: 'mythique', label: 'Mythique (premium)' }, { valeur: 'elite', label: 'Élite' }, { valeur: 'or', label: 'Or' }]} /></div>
          <div className="ls-actions">
            <button className="btn primaire" type="submit">{occupe ? 'Enregistrement…' : 'Enregistrer la carte'}</button>
            <button type="button" className="btn ak-supprimer" onClick={supprimer}>Retirer du catalogue</button>
          </div>
        </div>
        <aside className="ls-apercu">
          <CarteJoueurEnLigne key={`${apercu.photo}:${c.overall}:${c.nation}:${c.poste}`} carte={apercu} />
          <div className="ls-image">
            <label className="btn fantome ls-fichier">{c.imageReady ? 'Remplacer l’image' : 'Ajouter l’image'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void choisirImage(e); }} /></label>
            <div className="ls-url"><input placeholder="ou une URL HTTPS / chemin /photos/" value={urlImage} onChange={e => setUrlImage(e.target.value)} /><button type="button" className="btn fantome" disabled={!urlImage.trim()} onClick={() => { void operer('imageCarteSpeciale', { id: c.id, image: urlImage.trim() }, 'Image enregistrée.').then(r => { if (r) setUrlImage(''); }); }}>Utiliser</button></div>
            {c.imageReady && <button type="button" className="btn fantome" onClick={() => { setImageLocale(undefined); void operer('imageCarteSpeciale', { id: c.id, image: '' }, 'Image retirée : la carte est dépubliée.'); }}>Retirer l’image</button>}
            {erreurImage && <p role="alert" className="ak-erreur">{erreurImage}</p>}
            <small>WebP, PNG ou JPEG. Réduite à 640 px et 350 Ko, transparence conservée. L’image n’est visible du public qu’une fois la carte publiée.</small>
          </div>
        </aside>
      </div>
    </fieldset>
  </form>;
}

function EditeurEvenement({ ev, occupe, operer }: { ev: EvenementLabo; occupe: boolean; operer: Operer }) {
  const [e, setE] = useState(ev);
  useEffect(() => setE(ev), [ev]);
  const pack = e.pack;
  const total = pack ? Object.values(pack.probabilites).reduce((a, b) => a + b, 0) : 100;
  const enregistrer = () => operer('evenementSpecial', { id: e.id, evenement: {
    nom: e.nom, availableFrom: e.availableFrom ?? '', availableUntil: e.availableUntil ?? '', tauxPacksNormaux: e.tauxPacksNormaux, repere: e.repere,
    ...(pack ? { pack: { nom: pack.nom, promesse: pack.promesse ?? '', prix: pack.prix, cartes: pack.cartes, probabilites: pack.probabilites, speciales: pack.speciales ?? {}, garantieSpeciale: pack.garantieSpeciale ?? '' } } : {}),
  } }, `${e.nom} enregistré.`);
  const majPack = (champs: Partial<NonNullable<EvenementSpecial['pack']>>) => setE(courant => ({ ...courant, pack: { ...courant.pack!, ...champs } }));
  return <form className={`ls-evenement type-${e.cardType}${ev.actif ? ' actif' : ''}`} onSubmit={evt => { evt.preventDefault(); void enregistrer(); }}>
    <fieldset disabled={occupe}>
      <header>
        <EmblemeType type={e.cardType} taille={42} />
        <div><span className="eyebrow">{e.cardType === 'icon' ? 'Légendes retraitées · toute l’année' : 'Événement limité'}</span><h3>{e.nom}</h3>
          <small>{ev.availableFrom || ev.availableUntil ? `Du ${dateCourte(ev.availableFrom) || '…'} au ${dateCourte(ev.availableUntil ? new Date(Date.parse(ev.availableUntil) - 1).toISOString() : undefined) || '…'}` : 'Sans date de fin'}</small></div>
        <button type="button" className={`ls-interrupteur${ev.actif ? ' actif' : ''}`} aria-pressed={ev.actif} onClick={() => { void operer('evenementSpecial', { id: e.id, evenement: { actif: !ev.actif } }, ev.actif ? `${e.nom} désactivé : plus aucune carte ne sort.` : `${e.nom} activé.`); }}>
          <i />{ev.actif ? `${e.cardType === 'icon' ? 'ICONS' : 'Halloween'} activé` : `Activer ${e.cardType === 'icon' ? 'ICONS' : 'Halloween'}`}
        </button>
      </header>
      <div className="ak-champs">
        <label>Début<input type="datetime-local" value={versLocal(e.availableFrom)} onChange={x => setE({ ...e, availableFrom: depuisLocal(x.target.value) || undefined })} /></label>
        <label>Fin (exclue)<input type="datetime-local" value={versLocal(e.availableUntil)} onChange={x => setE({ ...e, availableUntil: depuisLocal(x.target.value) || undefined })} /></label>
      </div>
      <div className="ak-champs">
        <label>Multiplicateur dans les packs ordinaires<input type="number" min={0} max={20} step=".05" value={e.tauxPacksNormaux} onChange={x => setE({ ...e, tauxPacksNormaux: Number(x.target.value) })} /></label>
        <div className="ls-champ"><span>Repère de rareté</span><Selecteur valeur={e.repere} onChange={v => setE({ ...e, repere: v as EvenementSpecial['repere'] })} options={[{ valeur: 'mythique', label: 'Proche d’une Mythique' }, { valeur: 'entreBleueEtMythique', label: 'Entre bleue et Mythique' }]} /></div>
      </div>
      <details className="ls-chances"><summary>Chance par carte dans la boutique (réglage enregistré)</summary><ul>{ev.chances.map(c => <li key={c.pack}>{c.pack} <b>{c.chance.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} %</b></li>)}</ul></details>
      {pack && <div className="ls-pack">
        <h4>{pack.nom} · pack payant en Ovas</h4>
        <div className="ak-champs">
          <label>Nom du pack<input required maxLength={60} value={pack.nom} onChange={x => majPack({ nom: x.target.value })} /></label>
          <label>Prix (Ovas)<input required type="number" min={1} max={1000000} value={pack.prix} onChange={x => majPack({ prix: Number(x.target.value) })} /></label>
        </div>
        <label>Promesse<textarea maxLength={180} value={pack.promesse ?? ''} onChange={x => majPack({ promesse: x.target.value })} /></label>
        <div className="ak-champs">
          <label>Cartes par pack<input required type="number" min={1} max={12} value={pack.cartes} onChange={x => majPack({ cartes: Number(x.target.value) })} /></label>
          <label>Chance {e.cardType === 'icon' ? 'ICON' : 'Halloween'} par carte (%)<input type="number" min={0} max={100} step=".1" value={pack.speciales?.[e.id] ?? 0} onChange={x => majPack({ speciales: { ...(pack.speciales ?? {}), [e.id]: Number(x.target.value) } })} /></label>
        </div>
        <div className="ak-poids">{(['bronze', 'argent', 'or', 'elite', 'star'] as const).map(r => <label key={r}>{r}<input required type="number" min={0} max={100} step=".01" value={pack.probabilites[r]} onChange={x => majPack({ probabilites: { ...pack.probabilites, [r]: Number(x.target.value) } })} /></label>)}</div>
        <p className={Math.abs(total - 100) > .001 ? 'ak-erreur' : 'ak-note'}>Bandes ordinaires : {Number(total.toFixed(2))} % (doit faire 100 %).</p>
        <label className="ls-bascule"><input type="checkbox" checked={pack.garantieSpeciale === e.id} onChange={x => majPack({ garantieSpeciale: x.target.checked ? e.id : undefined })} /><span>Une carte {e.cardType === 'icon' ? 'ICON' : 'Halloween'} garantie par pack</span></label>
      </div>}
      <div className="ls-actions"><button className="btn primaire" disabled={Boolean(pack) && Math.abs(total - 100) > .001}>Enregistrer {e.nom}</button></div>
      <p className="ak-note">Fin de l’événement : le pack quitte la boutique, ses cartes ne sortent plus d’aucun pack, celles déjà obtenues restent dans les clubs.</p>
    </fieldset>
  </form>;
}

function CreationCarte({ vue, occupe, operer }: { vue: VueLabo; occupe: boolean; operer: (champs: Record<string, unknown>) => Promise<void> }) {
  const [champs, setChamps] = useState({ cardType: 'icon', specialEventId: 'icons', nom: '', poste: 'demi_ouverture', nation: 'France', overall: 90, lot: '' });
  const evenements = vue.evenements.filter(ev => ev.cardType === champs.cardType);
  const famille = vue.familles[champs.cardType];
  return <form className="ls-creation" onSubmit={e => { e.preventDefault(); void operer({ ...champs, lot: champs.lot || undefined }); }}>
    <fieldset disabled={occupe}>
      <legend>Ajouter une carte spéciale</legend>
      <div className="ak-champs">
        <div className="ls-champ"><span>Famille</span><Selecteur valeur={champs.cardType} onChange={v => { const ev = vue.evenements.find(x => x.cardType === v); setChamps({ ...champs, cardType: v, specialEventId: ev?.id ?? '', overall: Math.min(Math.max(champs.overall, vue.familles[v]?.overallMin ?? 20), vue.familles[v]?.overallMax ?? 99) }); }} options={Object.values(vue.familles).map(f => ({ valeur: f.type, label: f.nom, vignette: <EmblemeType type={f.type} /> }))} /></div>
        <div className="ls-champ"><span>Événement</span><Selecteur valeur={champs.specialEventId} onChange={v => setChamps({ ...champs, specialEventId: v })} options={evenements.map(ev => ({ valeur: ev.id, label: ev.nom }))} /></div>
      </div>
      <div className="ak-champs">
        <label>Nom complet<input required maxLength={60} value={champs.nom} onChange={e => setChamps({ ...champs, nom: e.target.value })} /></label>
        <label>GEN ({famille?.overallMin}-{famille?.overallMax})<input required type="number" min={famille?.overallMin} max={famille?.overallMax} value={champs.overall} onChange={e => setChamps({ ...champs, overall: Number(e.target.value) })} /></label>
      </div>
      <div className="ak-champs">
        <div className="ls-champ"><span>Poste</span><Selecteur valeur={champs.poste} onChange={v => setChamps({ ...champs, poste: v })} options={POSTES.map(p => ({ valeur: p.id, label: `${p.numero} · ${p.nom}` }))} /></div>
        <div className="ls-champ"><span>Nation</span><Selecteur valeur={champs.nation} recherche onChange={v => setChamps({ ...champs, nation: v })} options={vue.nations.map(n => ({ valeur: n, label: n, vignette: <Drapeau nation={n} taille={.9} /> }))} /></div>
      </div>
      <label>Lot (facultatif, ex. « Équipe Halloween · XV de départ »)<input maxLength={80} value={champs.lot} onChange={e => setChamps({ ...champs, lot: e.target.value })} /></label>
      <p className="ak-note">{famille?.retraitesSeulement ? 'Une ICON est un joueur retraité.' : 'Une Halloween peut être un joueur actif ou retraité.'} La carte naît en « image manquante » : elle ne sortira nulle part avant son image et sa publication.</p>
      <button className="btn primaire" disabled={!champs.nom.trim() || !champs.specialEventId}>Créer la carte</button>
    </fieldset>
  </form>;
}

/**
 * Import en masse. Une ligne par carte, séparateur « ; » :
 *   famille;nom;postes;nation;GEN;COL;club;ligue;poids;événement
 * Une carte existante (même famille, même nom) est mise à jour.
 */
function ImportCartes({ occupe, operer }: { occupe: boolean; operer: Operer }) {
  const [texte, setTexte] = useState('');
  const [bilan, setBilan] = useState<{ crees: number; misesAJour: number; erreurs: { ligne: number; message: string }[] } | null>(null);
  const [erreur, setErreur] = useState('');
  const analyser = () => {
    const brut = texte.trim();
    if (brut.startsWith('[')) return JSON.parse(brut) as Record<string, unknown>[];
    return brut.split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^famille\s*;/i.test(l)).map(l => {
      const [famille, nom, postes, nation, gen, col, club, ligue, poids, evenement] = l.split(';').map(x => x.trim());
      const { poste, postesSecondaires } = postesDepuisNumeros(postes || '10');
      return { cardType: famille.toLowerCase().startsWith('h') ? 'halloween' : 'icon', nom, poste, postesSecondaires, nation, overall: Number(gen),
        ...(col ? { collectif: Number(col) } : {}), ...(club ? { club } : {}), ...(ligue ? { league: ligue } : {}), ...(poids ? { packWeight: Number(poids) } : {}),
        ...(evenement ? { specialEventId: evenement } : {}) };
    });
  };
  return <div className="ls-import">
    <h3>Import en masse</h3>
    <p className="ak-note">Une ligne par carte : <code>famille;nom;postes;nation;GEN;COL;club;ligue;poids;événement</code> — par exemple <code>icon;Sébastien Chabal;8;France;89</code> ou <code>halloween;Pieter-Steph du Toit;7/6;Afrique du Sud;90;10</code>. Un tableau JSON est aussi accepté. Une carte déjà présente est mise à jour ; une ligne fautive est rendue avec sa raison, sans bloquer les autres. 300 lignes par envoi.</p>
    <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={10} spellCheck={false} placeholder="icon;Sébastien Chabal;8;France;89" />
    {erreur && <p role="alert" className="ak-erreur">{erreur}</p>}
    <button type="button" className="btn primaire" disabled={occupe || !texte.trim()} onClick={() => {
      setErreur(''); setBilan(null);
      let lignes: Record<string, unknown>[];
      try { lignes = analyser(); } catch (e) { setErreur(`Lecture impossible : ${(e as Error).message}`); return; }
      void operer('importCartesSpeciales', { lignes }, r => `${r.crees} créée(s), ${r.misesAJour} mise(s) à jour.`).then(r => { if (r) setBilan(r as never); });
    }}>Importer</button>
    {bilan && bilan.erreurs.length > 0 && <ul className="ls-erreurs-import">{bilan.erreurs.map(e => <li key={e.ligne}>Ligne {e.ligne} : {e.message}</li>)}</ul>}
  </div>;
}
