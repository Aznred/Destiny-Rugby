// LE LABO — GESTION DE LA BOUTIQUE (Correctif 21)
//
// Créer un cosmétique sans toucher au code : nom, catégorie, prix en Ovas et/ou en Crédits, rareté, fenêtre de vente, publié ON/OFF, et
// pour un maillot : couleurs, motif, atlas du maillot (texture), le tout sur le MAILLOT du jeu — jamais un nouveau maillage.
// Les articles publiés arrivent aux joueurs avec le catalogue (`?catalogueSolo=1`), sans requête de plus.
// ⚠️ Réservé à Kiri, comme tout l'Atelier : le serveur refuse l'écriture aux autres comptes et revalide chaque champ.

import { useEffect, useState, type FormEvent } from 'react';
import type { ArticleLabo } from '../lib/ligue/atelierCatalogue';
import type { ModePrix } from '../lib/monnaies';
import { texteTraduit } from '../lib/i18n';

type Categorie = ArticleLabo['categorie'];
const CATEGORIES: { id: Categorie; nom: string }[] = [
  { id: 'maillot', nom: 'Maillot (kit d’équipe)' }, { id: 'crampons', nom: 'Crampons' }, { id: 'casque', nom: 'Casque' },
  { id: 'sac', nom: 'Sac de match' }, { id: 'bouclier', nom: 'Bouclier de plaquage' },
];
const MODES: { id: ModePrix; nom: string }[] = [
  { id: 'OVAS', nom: 'Ovas seulement' }, { id: 'CREDITS', nom: 'Crédits seulement' }, { id: 'OVAS_OR_CREDITS', nom: 'Ovas ou Crédits (au choix)' },
];
const MOTIFS = ['uni', 'cerceaux', 'rayures', 'epaules', 'bande', 'diagonale'] as const;
const MODELES = ['crampons', 'crampons-bleus', 'crampons-dupont', 'crampons-graffiti', 'crampons-roses', 'casque', 'casque-rouge', 'casque-australie', 'casque-tribal', 'casque-rose', 'sac', 'bouclier-plaquage'];

const nouveau = (): ArticleLabo => ({
  id: `lab-${crypto.randomUUID().slice(0, 8)}`, nom: 'Nouveau cosmétique', categorie: 'maillot', emoji: '🎁', glb: '/m3d/maillot.glb', detail: '',
  prixDef: { mode: 'OVAS_OR_CREDITS', ovas: 200, credits: 40 }, rarete: 'commun', publie: false,
  kit: { principal: '#15317e', secondaire: '#f4f4ef', accent: '#ffffff', short: '#0c1b4a', chaussettes: '#15317e', motif: 'uni' },
});

async function appeler(corps?: unknown) {
  const r = await fetch('/api/carriere?atelier=1&q=', {
    method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: corps ? { 'Content-Type': 'application/json' } : undefined, body: corps ? JSON.stringify(corps) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.erreur ?? 'Enregistrement impossible.');
  return d as { revision: number; boutique?: ArticleLabo[] };
}

export function LaboBoutique() {
  const [articles, setArticles] = useState<ArticleLabo[]>([]);
  const [revision, setRevision] = useState(0);
  const [a, setA] = useState<ArticleLabo>(nouveau);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);

  const charger = async () => {
    try { const d = await appeler(); setArticles(d.boutique ?? []); setRevision(d.revision); setErreur(''); }
    catch (e) { setErreur((e as Error).message); }
  };
  useEffect(() => { void charger(); }, []);

  const maj = (p: Partial<ArticleLabo>) => setA((x) => ({ ...x, ...p }));
  const majPrix = (p: Partial<NonNullable<ArticleLabo['prixDef']>>) => setA((x) => ({ ...x, prixDef: { ...x.prixDef!, ...p } as NonNullable<ArticleLabo['prixDef']> }));
  const majKit = (p: Partial<NonNullable<ArticleLabo['kit']>>) => setA((x) => ({ ...x, kit: { ...x.kit!, ...p } }));
  const changerCategorie = (c: Categorie) => setA((x) => ({
    ...x, categorie: c, glb: c === 'maillot' ? '/m3d/maillot.glb' : `/m3d/${MODELES.find((m) => (c === 'bouclier' ? m.startsWith('bouclier') : m.startsWith(c))) ?? 'casque'}.glb`,
    kit: c === 'maillot' ? (x.kit ?? nouveau().kit) : undefined,
  }));

  const importer = async (fichier: File | undefined) => {
    if (!fichier) return;
    setErreur('');
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(fichier.type)) throw new Error('Choisis une image PNG, JPEG ou WebP.');
      const bitmap = await createImageBitmap(fichier), canvas = document.createElement('canvas');
      const k = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * k); canvas.height = Math.round(bitmap.height * k);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      let url = canvas.toDataURL('image/webp', 0.8);
      if (url.length > 250000) url = canvas.toDataURL('image/webp', 0.55);
      if (url.length > 250000) throw new Error('Cet atlas reste trop lourd (250 Ko max) : simplifie l’image.');
      majKit({ jerseyTexture: url });
    } catch (e) { setErreur((e as Error).message); }
  };

  const enregistrer = async (ev: FormEvent) => {
    ev.preventDefault(); setOccupe(true); setErreur(''); setMessage('');
    try {
      const d = await appeler({ action: 'atelier', operation: 'article', revision, article: a });
      setRevision(d.revision); setMessage('Cosmétique enregistré.'); await charger();
    } catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };
  const supprimer = async () => {
    if (!articles.some((x) => x.id === a.id) || !window.confirm(`Supprimer définitivement « ${a.nom} » ?`)) return;
    setOccupe(true); setErreur('');
    try { const d = await appeler({ action: 'atelier', operation: 'supprimerArticle', revision, articleId: a.id }); setRevision(d.revision); setA(nouveau()); await charger(); setMessage('Cosmétique supprimé.'); }
    catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };

  const mode = a.prixDef?.mode ?? 'OVAS';
  return (
    <section className="ak-grille">
      <aside className="ak-liste">
        <button className="btn principal" disabled={occupe} onClick={() => { setA(nouveau()); setMessage(''); setErreur(''); }}>Nouveau cosmétique</button>
        {articles.map((x) => (
          <button key={x.id} type="button" className={x.id === a.id ? 'actif' : ''} onClick={() => { setA(structuredClone(x)); setMessage(''); setErreur(''); }}>
            <b>{texteTraduit(x.nom)}</b><small>{x.categorie} · {x.publie ? 'publié' : 'brouillon'}</small>
          </button>
        ))}
        {articles.length === 0 && <p>Aucun cosmétique du Labo pour l’instant.</p>}
      </aside>
      <form onSubmit={enregistrer}>
        <fieldset disabled={occupe}>
          <legend>Cosmétique de la boutique</legend>
          {erreur && <p role="alert" className="ak-erreur">{erreur}</p>}{message && <p role="status" className="ak-succes">{message}</p>}
          <label>Nom<input required maxLength={60} value={a.nom} onChange={(e) => maj({ nom: e.target.value })} /></label>
          <label>Catégorie<select value={a.categorie} onChange={(e) => changerCategorie(e.target.value as Categorie)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></label>
          <label>Description<input maxLength={200} value={a.detail} onChange={(e) => maj({ detail: e.target.value })} /></label>
          <label>Pastille (emoji)<input maxLength={8} value={a.emoji} onChange={(e) => maj({ emoji: e.target.value })} /></label>
          <label>Rareté<select value={a.rarete ?? 'commun'} onChange={(e) => maj({ rarete: e.target.value as ArticleLabo['rarete'] })}>{['commun', 'rare', 'epique', 'legendaire'].map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
          <label>Monnaie<select value={mode} onChange={(e) => {
            const m = e.target.value as ModePrix; const p = a.prixDef ?? { mode: m };
            maj({ prixDef: { mode: m, ...(m !== 'CREDITS' ? { ovas: p.ovas ?? 200 } : {}), ...(m !== 'OVAS' ? { credits: p.credits ?? 40 } : {}) } });
          }}>{MODES.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}</select></label>
          {mode !== 'CREDITS' && <label>Prix en Ovas<input type="number" min={0} max={10000000} value={a.prixDef?.ovas ?? 0} onChange={(e) => majPrix({ ovas: Number(e.target.value) })} /></label>}
          {mode !== 'OVAS' && <label>Prix en Crédits<input type="number" min={0} max={10000000} value={a.prixDef?.credits ?? 0} onChange={(e) => majPrix({ credits: Number(e.target.value) })} /></label>}
          <label>En vente du<input type="date" value={(a.dispoDu ?? '').slice(0, 10)} onChange={(e) => maj({ dispoDu: e.target.value || undefined })} /></label>
          <label>Jusqu’au<input type="date" value={(a.dispoAu ?? '').slice(0, 10)} onChange={(e) => maj({ dispoAu: e.target.value || undefined })} /></label>
          <label><input type="checkbox" checked={a.publie === true} onChange={(e) => maj({ publie: e.target.checked })} /> Publié (visible dans la boutique)</label>

          {a.categorie === 'maillot' && a.kit && (<>
            <p>Le maillot est <b>le maillot du jeu</b> : même modèle 3D, mêmes animations. Seuls les couleurs, le motif et l’atlas changent.</p>
            {(['principal', 'secondaire', 'accent', 'short', 'chaussettes'] as const).map((c) => (
              <label key={c}>Couleur · {c}<input type="color" value={a.kit![c]} onChange={(e) => majKit({ [c]: e.target.value })} /></label>
            ))}
            <label>Motif<select value={a.kit.motif} onChange={(e) => { const motif = e.target.value as typeof MOTIFS[number]; setA((x) => ({ ...x, kit: { ...x.kit!, motif }, teinte: x.kit!.principal })); }}>{MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
            <label>Atlas du maillot (texture complète, facultatif)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void importer(e.target.files?.[0])} /></label>
            {a.kit.jerseyTexture && <><img src={a.kit.jerseyTexture} alt="Atlas du maillot" style={{ maxWidth: 160, borderRadius: 8 }} /><button type="button" className="btn fantome petit" onClick={() => majKit({ jerseyTexture: undefined })}>Retirer l’atlas</button></>}
          </>)}
          {a.categorie !== 'maillot' && (<>
            <label>Modèle 3D<select value={a.glb} onChange={(e) => maj({ glb: e.target.value })}>{MODELES.map((m) => <option key={m} value={`/m3d/${m}.glb`}>{m}</option>)}</select></label>
            <label>Teinte (facultatif)<input type="color" value={a.teinte ?? '#888888'} onChange={(e) => maj({ teinte: e.target.value })} /></label>
          </>)}
          <div className="ak-actions">
            <button className="btn principal" type="submit">Enregistrer</button>
            <button className="btn fantome" type="button" onClick={() => void supprimer()} disabled={!articles.some((x) => x.id === a.id)}>Supprimer</button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
