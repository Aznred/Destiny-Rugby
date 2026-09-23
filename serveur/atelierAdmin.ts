import { AsyncLocalStorage } from 'node:async_hooks';
import { CATALOGUE_ADMIN_VIDE, catalogueAdmin, fournirCatalogueAdmin, type CatalogueAdmin, type EditionJoueur } from '../src/lib/ligue/atelierCatalogue.js';
import { bandesGaranties, carteDansPack, catalogueBaseCarriere, catalogueMondialCarriere, packsCatalogueAdmin, RARETES_CARRIERE } from '../src/lib/ligue/catalogueCarriere.js';
import type { PackCarriere, RareteCarriere } from '../src/lib/ligue/typesCarriere.js';
import type { StockageAtelier } from './atelierStockage.js';
import { POSTES } from '../src/data/rugby.js';
import type { PosteId } from '../src/types.js';

export const contexteAtelier = new AsyncLocalStorage<CatalogueAdmin>();
fournirCatalogueAdmin(() => contexteAtelier.getStore() ?? CATALOGUE_ADMIN_VIDE);
function refuser(message: string): never { const e = new Error(message); e.name = 'ErreurCarriere'; throw e; }
function nombre(v: unknown, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) refuser(`Nombre attendu entre ${min} et ${max}.`);
  return v;
}
function entier(v: unknown, min: number, max: number) { const n = nombre(v,min,max); if (!Number.isInteger(n)) refuser('Un nombre entier est requis.'); return n; }
function texte(v: unknown, max: number): string {
  if(typeof v !== 'string' || !v.trim() || v.length > max) refuser('Texte vide ou trop long.'); return v.trim();
}
function objet(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) refuser('Données invalides.'); return v as Record<string, unknown>;
}
export function validerPhoto(v: unknown): string | undefined {
  if(v === undefined || v === '') return undefined;
  if(typeof v !== 'string' || v.length > 90000) refuser('Photo trop volumineuse (90 Ko maximum).');
  if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v)) return v;
  if(/^\/photos\/[a-zA-Z0-9_./%-]+$/.test(v) && !v.includes('..')) return v;
  try { const url = new URL(v); if(url.protocol === 'https:' && !url.username && !url.password && v.length <= 2048) return v; } catch { /* validation ci-dessous */ }
  return refuser('Utilise une image importée, une URL HTTPS ou un chemin /photos/.');
}
export function validerPack(v: unknown): PackCarriere {
  const p = objet(v), id = texte(p.id,80);
  if(!/^[a-z0-9][a-z0-9-]*$/.test(id)) refuser('Identifiant du pack invalide.');
  if(!packsCatalogueAdmin().some(p=>p.id===id) && !id.startsWith('kiri-')) refuser('Les nouveaux packs commencent par kiri-.');
  const poids = objet(p.probabilites);
  const probabilites = Object.fromEntries(RARETES_CARRIERE.map(r=>[r,nombre(poids[r],0,100)])) as Record<RareteCarriere,number>;
  if(Math.abs(Object.values(probabilites).reduce((a,b)=>a+b,0)-100) > .001) refuser('Les probabilités doivent totaliser 100 %.');
  const garantie = p.garantie === '' || p.garantie === undefined ? undefined : p.garantie as RareteCarriere;
  if(garantie && !RARETES_CARRIERE.includes(garantie)) refuser('Garantie invalide.');
  const pack: PackCarriere = { id, nom:texte(p.nom,60), prix:entier(p.prix,1,1000000), cartes:entier(p.cartes,1,12), probabilites, garantie, promesse: p.promesse ? texte(p.promesse,180) : undefined, famille: ['general','poste','monde','age'].includes(String(p.famille)) ? p.famille as PackCarriere['famille'] : 'general' };
  if(p.filtre) {
    const f=objet(p.filtre); pack.filtre={};
    if(f.categorie) { if(!['avant','arriere'].includes(String(f.categorie))) refuser('Catégorie invalide.'); pack.filtre.categorie=f.categorie as 'avant'|'arriere'; }
    for(const cle of ['championnats','pays','nations','familles'] as const) if(f[cle] !== undefined) {
      if(!Array.isArray(f[cle]) || f[cle].length > 30) refuser('Filtre invalide.');
      const valeurs = f[cle].map(v=>texte(v,100));
      const connues=new Set(catalogueMondialCarriere().map(c=>c[cle==='championnats'?'championnat':cle==='nations'?'nation':cle==='familles'?'famille':'pays']));
      if(valeurs.some(v=>!connues.has(v))) refuser('Valeur de filtre inconnue.');
      Object.assign(pack.filtre,{[cle]:valeurs});
    }
    if(f.ageMin !== undefined) pack.filtre.ageMin=entier(f.ageMin,16,60);
    if(f.ageMax !== undefined) pack.filtre.ageMax=entier(f.ageMax,16,60);
    if((pack.filtre.ageMin??16)>(pack.filtre.ageMax??60)) refuser('Âges minimum et maximum inversés.');
    if(f.horsFrance !== undefined) { if(typeof f.horsFrance !== 'boolean') refuser('Filtre invalide.'); pack.filtre.horsFrance=f.horsFrance; }
  }
  const rayon=catalogueMondialCarriere().filter(c=>carteDansPack(c,pack.filtre));
  if(rayon.filter(c=>probabilites[c.rarete]>0 || (garantie && bandesGaranties(garantie).includes(c.rarete))).length < pack.cartes) refuser('Pas assez de joueurs pour ce pack.');
  for(const r of RARETES_CARRIERE) if(probabilites[r]>0 && !rayon.some(c=>c.rarete===r)) refuser(`Aucun joueur ${r} dans ce filtre : règle sa probabilité à 0 %.`);
  if(garantie && !rayon.some(c=>bandesGaranties(garantie).includes(c.rarete))) refuser('Aucun joueur ne peut satisfaire cette garantie.');
  return pack;
}
export function vueAtelier(q: string) {
  const normaliser=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const recherche=normaliser(q.slice(0,100));
  const catalogue=catalogueMondialCarriere();
  const joueurs=catalogue.filter(c=>normaliser(`${c.nom} ${c.clubReel}`).includes(recherche));
  const clubs=[...new Map(catalogueBaseCarriere().map(c=>[c.clubReel,{nom:c.clubReel,championnat:c.championnat}])).values()].sort((a,b)=>a.nom.localeCompare(b.nom,'fr'));
  return {
    revision:catalogueAdmin().revision,
    rotationPacks:catalogueAdmin().rotationPacks === true,
    packs:packsCatalogueAdmin(),
    joueurs:joueurs.slice(0,40),
    total:joueurs.length,
    championnats:[...new Set(catalogue.map(c=>c.championnat))].sort((a,b)=>a.localeCompare(b,'fr')),
    nations:[...new Set(catalogue.map(c=>c.nation).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr')),
    clubs,
  };
}
export async function enregistrerAtelier(stockage: StockageAtelier, corps: Record<string,unknown>) {
  const courant=catalogueAdmin();
  if(corps.revision !== courant.revision) refuser('Le catalogue a changé. Recharge l’atelier avant d’enregistrer.');
  const suivant=structuredClone(courant);
  if(corps.operation === 'pack') {
    const pack=validerPack(corps.pack); suivant.packs[pack.id]=pack;
    if(Object.keys(suivant.packs).length>100) refuser('Maximum de 100 packs personnalisés.');
  } else if(corps.operation === 'supprimerPack') {
    const id=texte(corps.packId,80);
    if(!id.startsWith('kiri-') || !suivant.packs[id]) refuser('Seuls les packs créés dans l’Atelier peuvent être supprimés.');
    delete suivant.packs[id];
  } else if(corps.operation === 'rotationPacks') {
    if(typeof corps.active !== 'boolean') refuser('Réglage de rotation invalide.');
    suivant.rotationPacks=corps.active;
  } else if(corps.operation === 'joueur') {
    const id=texte(corps.sourceId,250), source=catalogueMondialCarriere().find(c=>c.sourceId===id);
    if(!source) refuser('Joueur introuvable.');
    const j=objet(corps.joueur);
    const nation=texte(j.nation,80);
    if(!new Set(catalogueMondialCarriere().map(c=>c.nation)).has(nation)) refuser('Nation inconnue dans le catalogue.');
    const clubDemande=j.clubReel===undefined?source.clubReel:texte(j.clubReel,100);
    const club=catalogueBaseCarriere().find(c=>c.clubReel===clubDemande);
    if(!club) refuser('Club inconnu dans le catalogue.');
    let poste: PosteId | undefined = undefined;
    if (j.poste !== undefined) {
      const pStr = String(j.poste);
      if (!POSTES.some(p => p.id === pStr)) refuser('Poste invalide.');
      poste = pStr as PosteId;
    }
    const posteActuel = poste ?? source.poste;
    let postesSecondaires: PosteId[] | undefined = undefined;
    if (j.postesSecondaires !== undefined) {
      if (!Array.isArray(j.postesSecondaires)) refuser('Postes secondaires invalides.');
      const tousPostes = new Set<string>(POSTES.map(p => p.id));
      const nettoyes = [...new Set(j.postesSecondaires.map(p => String(p)).filter(p => tousPostes.has(p) && p !== posteActuel))] as PosteId[];
      if (nettoyes.length > 14) refuser('Trop de postes secondaires.');
      postesSecondaires = nettoyes;
    }
    const edition: EditionJoueur = {
      note: entier(j.note, 20, 99),
      potentiel: entier(j.potentiel, 20, 99),
      photo: validerPhoto(j.photo),
      nation,
      clubReel: club.clubReel,
      championnat: club.championnat,
      ...(poste ? { poste } : {}),
      ...(postesSecondaires !== undefined ? { postesSecondaires } : {}),
    };
    if(edition.potentiel<edition.note) refuser('Le potentiel doit être au moins égal au GEN.');
    suivant.joueurs[id]=edition;
    if(Object.keys(suivant.joueurs).length>2000) refuser('Maximum de 2 000 joueurs personnalisés.');
  } else refuser('Action inconnue.');
  suivant.revision++;
  if(JSON.stringify(suivant).length>3000000) refuser('Catalogue trop volumineux. Utilise des URL pour les prochaines photos.');
  if(!await stockage.ecrire(suivant,courant.revision)) refuser('Une autre modification a été enregistrée. Recharge l’atelier.');
  return {revision:suivant.revision};
}
