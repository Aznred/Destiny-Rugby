// LE LABO · PACKS DE TEST (Correctif 33) — composer un pack dont le contenu est imposé.
//
// « Je veux exactement ces joueurs dans le pack. » On cherche une carte (nom, club, poste, rareté, type), on l'ajoute,
// on range l'ordre de révélation, on désigne la carte principale, et le pack apparaît dans la Collection solo, section
// « Packs de test », où il s'ouvre comme un vrai pack.
//
// ⚠️ CET ÉCRAN N'ACCORDE RIEN. Chaque appel est vérifié par le serveur contre la permission du compte : sans elle,
// la réponse est 403 et l'écran le dit. Le navigateur n'envoie que des identifiants de cartes ; noms, notes et images
// sont relus par le serveur dans son catalogue.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  chargerPacksInternes, creerPackInterne, ErreurCarriere, rechercherCartesPackInterne, supprimerPackInterne,
  type PackInterneDetaille, type VuePacksInternes,
} from '../lib/carriereEnLigneClient';
import { CARTES_MAX_PACK_INTERNE, PERMISSION_PACKS_INTERNES, type CarteCandidate } from '../lib/packsInternes';
import { nomPoste, POSTES, POSTE_PAR_ID } from '../data/rugby';
import type { PosteId } from '../types';
import { Selecteur } from './Selecteur';
import { Confirmation } from './Confirmation';
import { Icone } from './Icone';
import './LaboPacksTest.css';

const NOMS_TYPE: Record<string, string> = { normale: 'Normale', feminine: 'Féminine · bêta', icon: 'ICON', halloween: 'Halloween', 'octobre-rose': 'Octobre Rose', influencer: 'Influenceur' };
const NOMS_RARETE: Record<string, string> = { bronze: 'Bronze', argent: 'Argent', or: 'Or', elite: 'Élite', star: 'Rouge' };
const NOMS_STATUT: Record<string, string> = { draft: 'brouillon', image_missing: 'sans image', ready: 'prête, non publiée', published: 'publiée' };
const nomType = (type: string) => NOMS_TYPE[type] ?? type;
const numero = (poste: string) => POSTE_PAR_ID[poste as PosteId]?.numero ?? '';
const dateCourte = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Une ligne du pack en cours de composition : la même carte peut y figurer deux fois, d'où la clé propre. */
interface Ligne { cle: number; carte: CarteCandidate }

function Vignette({ carte }: { carte: Pick<CarteCandidate, 'photo' | 'rarete' | 'type'> }) {
  return <span className={`lp-vignette rarete-${carte.rarete} type-${carte.type}`}>{carte.photo ? <img src={carte.photo} alt="" loading="lazy" /> : <Icone nom="joueur" taille={20} />}</span>;
}

export function LaboPacksTest() {
  const [vue, setVue] = useState<VuePacksInternes | null>(null);
  const [interdit, setInterdit] = useState(false);
  const [erreur, setErreur] = useState(''), [message, setMessage] = useState(''), [occupe, setOccupe] = useState(false);
  // La recherche.
  const [q, setQ] = useState(''), [club, setClub] = useState(''), [poste, setPoste] = useState(''), [rarete, setRarete] = useState(''), [type, setType] = useState('');
  const [resultats, setResultats] = useState<{ cartes: CarteCandidate[]; total: number } | null>(null);
  const [cherche, setCherche] = useState(false);
  // Le pack en cours.
  const [nom, setNom] = useState('Pack Test');
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [principale, setPrincipale] = useState<number | null>(null);
  const prochaineCle = useRef(1);
  const [aSupprimer, setASupprimer] = useState<PackInterneDetaille | null>(null);

  const charger = useCallback(async () => {
    try { setVue(await chargerPacksInternes()); setInterdit(false); setErreur(''); }
    catch (e) {
      if (e instanceof ErreurCarriere && e.statut === 403) setInterdit(true);
      else setErreur((e as Error).message);
    }
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  // La recherche part 300 ms après la dernière frappe ; une réponse en retard ne remplace pas la plus récente.
  useEffect(() => {
    if (interdit) return;
    if (!q.trim() && !club.trim() && !poste && !rarete && !type) { setResultats(null); setCherche(false); return; }
    const abandon = new AbortController();
    setCherche(true);
    const minuterie = window.setTimeout(() => {
      rechercherCartesPackInterne({ q: q.trim(), club: club.trim(), poste, rarete, type }, abandon.signal)
        .then((r) => { setResultats(r); setErreur(''); })
        .catch((e) => { if (!abandon.signal.aborted) setErreur((e as Error).message); })
        .finally(() => { if (!abandon.signal.aborted) setCherche(false); });
    }, 300);
    return () => { window.clearTimeout(minuterie); abandon.abort(); };
  }, [q, club, poste, rarete, type, interdit]);

  const plein = lignes.length >= (vue?.limites.cartes ?? CARTES_MAX_PACK_INTERNE);
  const ajouter = (carte: CarteCandidate) => {
    if (plein) return;
    setLignes(l => [...l, { cle: prochaineCle.current++, carte }]);
    setMessage('');
  };
  const deplacer = (index: number, pas: -1 | 1) => setLignes((l) => {
    const cible = index + pas;
    if (cible < 0 || cible >= l.length) return l;
    const copie = [...l];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    return copie;
  });
  const retirer = (cle: number) => { setLignes(l => l.filter(x => x.cle !== cle)); setPrincipale(p => p === cle ? null : p); };
  // La carte principale se retourne en dernier : l'ordre affiché est celui que le pack jouera.
  const ordre = useMemo(() => {
    if (principale === null) return lignes;
    const choisie = lignes.find(l => l.cle === principale);
    return choisie ? [...lignes.filter(l => l.cle !== principale), choisie] : lignes;
  }, [lignes, principale]);
  const invisibles = ordre.filter(l => !l.carte.visibleEnCollection);

  const creer = async () => {
    if (!ordre.length || occupe) return;
    setOccupe(true); setErreur(''); setMessage('');
    try {
      const derniere = ordre[ordre.length - 1].carte.sourceId;
      const { pack } = await creerPackInterne({ nom: nom.trim(), cartes: ordre.map(l => l.carte.sourceId), ...(principale !== null ? { principale: derniere } : {}) });
      setMessage(`« ${pack.nom} » créé : ${pack.cartes.length} carte(s). Il t’attend dans la Collection solo, section « Packs de test ».`);
      setLignes([]); setPrincipale(null);
      await charger();
    } catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };
  const reprendre = (pack: PackInterneDetaille) => {
    const cartes = pack.detail.filter((c): c is CarteCandidate => !('manquante' in c));
    const nouvelles = cartes.map(carte => ({ cle: prochaineCle.current++, carte }));
    setLignes(nouvelles); setNom(`${pack.nom} (copie)`.slice(0, 40));
    setPrincipale(pack.principale && nouvelles.length ? nouvelles[nouvelles.length - 1].cle : null);
    setMessage(`Contenu de « ${pack.nom} » repris : modifie-le, puis crée un nouveau pack.`);
  };
  const supprimer = async (pack: PackInterneDetaille) => {
    setOccupe(true); setErreur(''); setMessage('');
    try { await supprimerPackInterne(pack.id); setMessage(`« ${pack.nom} » supprimé. Les cartes déjà ouvertes restent dans la collection.`); await charger(); }
    catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };

  if (interdit) return <section className="labo-packs-test"><p role="alert" className="ak-erreur">
    Ce compte n’a pas la permission <code>{PERMISSION_PACKS_INTERNES}</code>. Elle se pose dans la base, sur l’identifiant du compte :
    applique le schéma (<code>npm run base:appliquer</code>), puis recharge cette page.
  </p></section>;
  if (!vue) return <section className="labo-packs-test">{erreur ? <p role="alert" className="ak-erreur">{erreur} <button type="button" onClick={() => { void charger(); }}>Réessayer</button></p> : <p>Chargement des packs de test…</p>}</section>;

  const types = [...new Set(['normale', ...vue.types])];
  return <section className="labo-packs-test">
    <header className="lp-entete">
      <div><h3>Packs de test</h3><p>Un pack dont tu choisis chaque carte et l’ordre de révélation. Hors boutique, hors probabilités : il n’existe que pour ce compte, et chaque création comme chaque ouverture est consignée.</p></div>
      <span className="lp-compte"><b>{vue.packs.length}</b> / {vue.limites.packs} packs</span>
    </header>
    {erreur && <p role="alert" className="ak-erreur">{erreur}</p>}
    {message && <p role="status" className="ak-succes">{message}</p>}

    <div className="lp-atelier">
      <div className="lp-recherche">
        <h4><Icone nom="loupe" taille={16} /> Chercher une carte</h4>
        <div className="lp-champs">
          <label>Nom<input type="search" value={q} placeholder="Antoine Dupont" onChange={e => setQ(e.target.value)} /></label>
          <label>Club<input type="search" value={club} placeholder="Stade Toulousain" onChange={e => setClub(e.target.value)} /></label>
        </div>
        <div className="lp-champs lp-filtres">
          <div className="ls-champ"><span>Poste</span><Selecteur valeur={poste} onChange={setPoste} options={[{ valeur: '', label: 'Tous les postes' }, ...POSTES.map(p => ({ valeur: p.id, label: `${p.numero} · ${p.nom}` }))]} /></div>
          <div className="ls-champ"><span>Rareté</span><Selecteur valeur={rarete} onChange={setRarete} options={[{ valeur: '', label: 'Toutes' }, ...Object.entries(NOMS_RARETE).map(([valeur, label]) => ({ valeur, label }))]} /></div>
          <div className="ls-champ"><span>Type de carte</span><Selecteur valeur={type} onChange={setType} options={[{ valeur: '', label: 'Tous les types' }, ...types.map(valeur => ({ valeur, label: nomType(valeur) }))]} /></div>
        </div>
        <ul className="lp-resultats" aria-label="Cartes trouvées" aria-busy={cherche}>
          {!resultats && <li className="lp-vide">Saisis un nom, un club, ou choisis un poste, une rareté ou un type.</li>}
          {resultats && !resultats.cartes.length && <li className="lp-vide">Aucune carte ne correspond.</li>}
          {resultats?.cartes.map(carte => <li key={carte.sourceId}>
            <Vignette carte={carte} />
            <span className="lp-identite"><b>{carte.nom}</b><small>n° {numero(carte.poste)} · {nomPoste(carte.poste as PosteId)} · {carte.club || 'Sans club'}</small></span>
            <span className="lp-note"><b>{carte.note}</b><small>{nomType(carte.type)}{carte.statut && carte.statut !== 'published' ? ` · ${NOMS_STATUT[carte.statut] ?? carte.statut}` : ''}</small></span>
            <button type="button" className="btn fantome" disabled={plein} onClick={() => ajouter(carte)}>Ajouter au pack</button>
          </li>)}
          {resultats && resultats.total > resultats.cartes.length && <li className="lp-vide">{resultats.total - resultats.cartes.length} autre(s) carte(s) : précise la recherche.</li>}
        </ul>
      </div>

      <form className="lp-composition" onSubmit={(e) => { e.preventDefault(); void creer(); }}>
        <h4><Icone nom="cadeau" taille={16} /> Contenu du pack</h4>
        <label>Nom du pack<input required minLength={2} maxLength={40} value={nom} onChange={e => setNom(e.target.value)} /></label>
        <p className="ak-note">{ordre.length} / {vue.limites.cartes} carte(s) · la première se retourne d’abord, la dernière clôt le pack.</p>
        <ol className="lp-ordre">
          {!ordre.length && <li className="lp-vide">Ajoute des cartes depuis la recherche.</li>}
          {ordre.map((ligne, index) => {
            const estPrincipale = ligne.cle === principale;
            const position = lignes.findIndex(l => l.cle === ligne.cle);
            return <li key={ligne.cle} className={estPrincipale ? 'principale' : ''}>
              <span className="lp-rang">{index + 1}</span>
              <Vignette carte={ligne.carte} />
              <span className="lp-identite"><b>{ligne.carte.nom}</b><small>{ligne.carte.note} · {nomType(ligne.carte.type)}{index === ordre.length - 1 && ordre.length > 1 ? ' · révélée en dernier' : ''}</small></span>
              <span className="lp-actions">
                <button type="button" className={`lp-icone${estPrincipale ? ' actif' : ''}`} aria-pressed={estPrincipale} title="Carte principale : révélée en dernier" aria-label={`${ligne.carte.nom} : carte principale, révélée en dernier`} onClick={() => setPrincipale(estPrincipale ? null : ligne.cle)}><Icone nom="etoile" taille={16} /></button>
                <button type="button" className="lp-icone" disabled={estPrincipale || position <= 0} title="Révéler plus tôt" aria-label={`Révéler ${ligne.carte.nom} plus tôt`} onClick={() => deplacer(position, -1)}><span className="lp-fleche haut"><Icone nom="chevron" taille={16} /></span></button>
                <button type="button" className="lp-icone" disabled={estPrincipale || position >= lignes.length - 1} title="Révéler plus tard" aria-label={`Révéler ${ligne.carte.nom} plus tard`} onClick={() => deplacer(position, 1)}><span className="lp-fleche bas"><Icone nom="chevron" taille={16} /></span></button>
                <button type="button" className="lp-icone danger" title="Retirer du pack" aria-label={`Retirer ${ligne.carte.nom} du pack`} onClick={() => retirer(ligne.cle)}><Icone nom="croix" taille={16} /></button>
              </span>
            </li>;
          })}
        </ol>
        {invisibles.length > 0 && <p className="ak-note lp-alerte">
          {invisibles.map(l => l.carte.nom).join(', ')} : {invisibles.length > 1 ? 'ces cartes s’ouvriront' : 'cette carte s’ouvrira'} dans le pack, mais {invisibles.length > 1 ? 'n’apparaîtront' : 'n’apparaîtra'} dans la grille de la Collection solo qu’une fois {invisibles.length > 1 ? 'publiées' : 'publiée'}.
        </p>}
        <button className="btn primaire" type="submit" disabled={occupe || !ordre.length || nom.trim().length < 2}>{occupe ? 'Création…' : 'Créer le pack'}</button>
      </form>
    </div>

    <h4 className="lp-titre"><Icone nom="dossier" taille={16} /> Mes packs de test</h4>
    <ul className="lp-packs">
      {!vue.packs.length && <li className="lp-vide">Aucun pack de test pour l’instant.</li>}
      {vue.packs.map(pack => <li key={pack.id}>
        <div className="lp-pack-tete">
          <b>{pack.nom}</b>
          <small>{pack.cartes.length} carte(s) · créé le {dateCourte(pack.creeLe)} · {pack.ouvertures ? `ouvert ${pack.ouvertures} fois, la dernière le ${dateCourte(pack.derniereOuverture ?? pack.creeLe)}` : 'jamais ouvert'}</small>
        </div>
        <ol className="lp-pack-cartes">{pack.detail.map((c, i) => <li key={`${c.sourceId}:${i}`} className={'manquante' in c ? 'manquante' : ''}>
          {'manquante' in c ? <>Carte retirée du catalogue</> : <><b>{c.note}</b> {c.nom} <small>{nomType(c.type)}</small></>}
        </li>)}</ol>
        <div className="lp-pack-actions">
          <button type="button" className="btn fantome" disabled={occupe} onClick={() => reprendre(pack)}>Reprendre le contenu</button>
          <button type="button" className="btn ak-supprimer" disabled={occupe} onClick={() => setASupprimer(pack)}>Supprimer</button>
        </div>
      </li>)}
    </ul>
    <p className="ak-note">Pour l’ouvrir : Collection solo → Packs → « Packs de test ». Un pack s’ouvre autant de fois que tu veux ; chaque ouverture ajoute ses cartes à ta collection.</p>

    <details className="lp-journal">
      <summary>Journal ({vue.journal.length} dernière(s) opération(s))</summary>
      <table>
        <thead><tr><th>Date</th><th>Opération</th><th>Pack</th><th>Cartes</th><th>Source</th></tr></thead>
        <tbody>{vue.journal.map((l, i) => <tr key={`${l.date}:${i}`}>
          <td>{dateCourte(l.date)}</td><td>{l.action === 'CREATE' ? 'Création' : l.action === 'OPEN' ? 'Ouverture' : 'Suppression'}</td>
          <td>{l.nom ?? l.packId.slice(0, 8)}</td><td>{l.cartes.length}</td><td><code>{l.source}</code></td>
        </tr>)}</tbody>
      </table>
    </details>

    {aSupprimer && <Confirmation titre={`Supprimer « ${aSupprimer.nom} » ?`} message="Le pack disparaît de la Collection solo. Les cartes déjà ouvertes restent dans ta collection, et le journal garde sa trace." libelleOui="Supprimer"
      onNon={() => setASupprimer(null)} onOui={() => { const pack = aSupprimer; setASupprimer(null); void supprimer(pack); }} />}
  </section>;
}
