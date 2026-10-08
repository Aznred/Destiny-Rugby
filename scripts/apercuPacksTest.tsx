// APERÇU DES PACKS DE TEST (Correctif 33) — le Labo et l'ouverture, devant un serveur simulé.
//
// Ouvrir : /scripts/apercuPacksTest.html        (?interdit=1 : le compte n'a pas la permission)
//
// ⚠️ AUCUN COMPTE RÉEL. `/api/carriere` est remplacé par un petit serveur en mémoire qui exécute les MÊMES fonctions
// que le vrai (`serveur/packsInternes.ts` : recherche, résolution des cartes, contenu d'un pack). En dessous du Labo,
// la section « Packs de test » telle que la Collection solo la présente, et la vraie fenêtre d'ouverture.
// `window.__packsTest` donne l'état du serveur simulé (packs, journal, appels) à la console.

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/App.css';
import '../src/components/AtelierKiri.css';
import '../src/components/LaboCartesSpeciales.css';
import '../src/screens/CollectionSolo.css';
import { LaboPacksTest } from '../src/components/LaboPacksTest';
import OuverturePack from '../src/components/OuverturePack';
import { CarteJoueurEnLigne } from '../src/components/CarteJoueurEnLigne';
import { Icone } from '../src/components/Icone';
import { chargerTextes, definirLangue } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import { carteDepuisSource, type SourceCarte } from '../src/lib/ligue/catalogueCarriere';
import { apparencePackInterne, contenuPackInterne, detailPackInterne, rechercherCartes, resoudreCartes, universCartes } from '../serveur/packsInternes';
import {
  CARTES_MAX_PACK_INTERNE, packInternePourBoutique, PACKS_INTERNES_MAX, SOURCE_ACQUISITION_INTERNE, validerDefinitionPackInterne,
  type LigneJournalPackInterne, type PackInterne, type PackInterneBoutique,
} from '../src/lib/packsInternes';

chargerTextes(TEXTES);
definirLangue('fr');

// ── Le serveur simulé ───────────────────────────────────────────────────────
const config = { ...CATALOGUE_ADMIN_VIDE, revision: 1, speciales: {
  evenements: { influencers: { actif: true } },
  cartes: {
    'icon:dan-carter': { published: true, image: '/photos/silhouette.webp' },
    'icon:richie-mccaw': { image: '/photos/silhouette.webp' },
    'halloween-2026:antoine-dupont': { published: true, image: '/photos/silhouette.webp' },
    'influencers:mika': { id: 'influencers:mika', cardType: 'influencer', specialEventId: 'influencers', nom: 'Mika', display_name: '@MikaLive', poste: 'demi_ouverture',
      overall: 85, nation: 'France', club: 'Stade Toulousain', published: true, image: '/photos/silhouette.webp', brouillon: false },
  },
} } as typeof CATALOGUE_ADMIN_VIDE;
const u = universCartes(config);
const interdit = new URLSearchParams(location.search).get('interdit') === '1';
const packs: PackInterne[] = [];
const journal: LigneJournalPackInterne[] = [];
const appels: { quoi: string; statut: number }[] = [];
const tracer = (pack: PackInterne, action: LigneJournalPackInterne['action'], cartes: string[]) =>
  journal.unshift({ packId: pack.id, nom: pack.nom, action, cartes, source: SOURCE_ACQUISITION_INTERNE, date: new Date().toISOString() });
const reponse = (statut: number, corps: unknown, quoi: string) => { appels.push({ quoi, statut }); return new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } }); };

const fetchReel = window.fetch.bind(window);
window.fetch = async (entree, init) => {
  const url = new URL(typeof entree === 'string' ? entree : entree instanceof URL ? entree.href : entree.url, location.href);
  if (url.pathname !== '/api/carriere') return fetchReel(entree, init);
  const corps = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
  if (interdit) return reponse(403, { erreur: 'FORBIDDEN' }, 'interdit');
  if (url.searchParams.has('recherche')) {
    const p = url.searchParams;
    return reponse(200, rechercherCartes(u, { q: p.get('q') ?? '', club: p.get('club') ?? '', poste: p.get('poste') ?? '', rarete: p.get('rarete') ?? '', type: p.get('type') ?? '' }), 'recherche');
  }
  if (corps.action === 'packInterne' && corps.operation === 'creer') {
    try {
      const definition = validerDefinitionPackInterne(corps.pack);
      resoudreCartes(u, definition.cartes);
      if (packs.length >= PACKS_INTERNES_MAX) return reponse(409, { erreur: 'Plafond atteint.' }, 'creer');
      const pack: PackInterne = { id: crypto.randomUUID(), ...definition, creeLe: new Date().toISOString(), ouvertures: 0 };
      packs.unshift(pack); tracer(pack, 'CREATE', pack.cartes);
      window.dispatchEvent(new Event('apercu-packs'));
      return reponse(200, { pack: detailPackInterne(u, pack) }, 'creer');
    } catch (e) { return reponse(400, { erreur: (e as Error).message }, 'creer'); }
  }
  if (corps.action === 'packInterne' && corps.operation === 'supprimer') {
    const i = packs.findIndex(p => p.id === corps.id);
    if (i < 0) return reponse(404, { erreur: 'Pack introuvable.' }, 'supprimer');
    const [retire] = packs.splice(i, 1); tracer(retire, 'DELETE', retire.cartes);
    window.dispatchEvent(new Event('apercu-packs'));
    return reponse(200, { ok: true }, 'supprimer');
  }
  if (url.searchParams.has('packsInternes')) {
    return reponse(200, { packs: packs.map(p => detailPackInterne(u, p)), journal, limites: { cartes: CARTES_MAX_PACK_INTERNE, packs: PACKS_INTERNES_MAX }, types: [...new Set(u.liste.map(e => e.type))] }, 'liste');
  }
  return reponse(404, { erreur: 'Hors de l’aperçu.' }, 'autre');
};
/** L'ouverture, comme le serveur la fait : le contenu enregistré, relu dans le catalogue, sans tirage. */
function ouvrir(id: string): SourceCarte[] {
  const pack = packs.find(p => p.id === id)!;
  const contenu = contenuPackInterne(u, pack);
  pack.ouvertures += 1; pack.derniereOuverture = new Date().toISOString();
  tracer(pack, 'OPEN', contenu.ordre);
  window.dispatchEvent(new Event('apercu-packs'));
  return contenu.cartes;
}
(window as unknown as { __packsTest: unknown }).__packsTest = { packs, journal, appels, univers: u };

// ── La section de la Collection solo, et la vraie fenêtre d'ouverture ───────
function SectionCollection() {
  const [, rafraichir] = useState(0);
  const [ouverture, setOuverture] = useState<{ pack: PackInterneBoutique; cartes: SourceCarte[] } | null>(null);
  useEffect(() => { const suivre = () => rafraichir(n => n + 1); window.addEventListener('apercu-packs', suivre); return () => window.removeEventListener('apercu-packs', suivre); }, []);
  const enBoutique = packs.map(p => packInternePourBoutique(p, apparencePackInterne(u, p)));
  if (!enBoutique.length) return <p className="ak-note">Crée un pack ci-dessus : il apparaîtra ici, comme dans la Collection solo.</p>;
  return <section className="solo-rayon solo-packs-test" aria-labelledby="solo-packs-test-titre">
    <div className="solo-titre-ligne"><div><div className="eyebrow">Outil interne</div><h2 id="solo-packs-test-titre">Packs de test</h2></div><span>Contenu imposé, composé dans le Labo. Ces packs n’existent que pour ce compte.</span></div>
    <ul className="solo-liste-packs-test">{enBoutique.map(pack => <li key={pack.id}>
      <button type="button" className={`solo-pack-test palier-${Object.entries(pack.probabilites).find(([, v]) => v === 100)?.[0] ?? 'bronze'}`} disabled={Boolean(ouverture)}
        onClick={() => setOuverture({ pack, cartes: ouvrir(pack.id.slice('interne:'.length)) })}>
        <span className="solo-pack-test-pochette" aria-hidden="true"><Icone nom="cadeau" taille={22} /></span>
        <span className="solo-pack-test-nom"><b>{pack.nom}</b><small>{pack.cartes} carte(s) · {pack.ouvertures ? `ouvert ${pack.ouvertures} fois` : 'jamais ouvert'}</small></span>
        <span className="solo-pack-test-action">Ouvrir</span>
      </button>
    </li>)}</ul>
    {ouverture && <OuverturePack
      cartes={ouverture.cartes.map((source, position) => ({ ...carteDepuisSource(source, 'solo', 'collection', 1), id: `solo-pack-${position}-${source.sourceId}` }))}
      pack={ouverture.pack.nom.replace(/^pack\s+/i, '') || ouverture.pack.nom} apparenceInitiale="bronze" ordreImpose
      onFermer={() => setOuverture(null)}
      rendreCarte={carte => <CarteJoueurEnLigne carte={carte} compacte proprietaire="Ma collection" />} />}
  </section>;
}

createRoot(document.getElementById('root')!).render(<main className="atelier-kiri" style={{ maxWidth: 1320, margin: '0 auto', padding: '1.25rem 1rem 4rem', display: 'grid', gap: '1.5rem' }}>
  <LaboPacksTest />
  <hr style={{ width: '100%', border: 0, borderTop: '1px solid var(--bordure)' }} />
  <SectionCollection />
</main>);
