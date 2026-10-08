import { clubParNom } from '../src/data/clubs.js';
import { verifierDonneesClubs } from '../src/lib/donneesClubs.js';
import { coordonneesValides } from '../src/lib/localisationClub.js';
import type { LocalisationClub } from '../src/lib/localisationClub.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { CATALOGUE_ADMIN_VIDE, catalogueAdmin, fournirCatalogueAdmin, type CatalogueAdmin, type EditionJoueur } from '../src/lib/ligue/atelierCatalogue.js';
import { bandesGaranties, carteDansPack, catalogueBaseCarriere, catalogueMondialCarriere, packsCatalogueAdmin, RARETES_CARRIERE } from '../src/lib/ligue/catalogueCarriere.js';
import type { PackCarriere, RareteCarriere } from '../src/lib/ligue/typesCarriere.js';
import type { StockageAtelier } from './atelierStockage.js';
import { appliquerOperationSpeciale, validerLigneImport, vueImports } from './atelierSpeciales.js';
import { POSTES } from '../src/data/rugby.js';
import type { PosteId } from '../src/types.js';
import type { ArticleLabo } from '../src/lib/ligue/atelierCatalogue.js';
import { prixValide } from '../src/lib/monnaies.js';

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
/** La monnaie d'un pack de la collection solo (Correctif 21) : OVAS, CREDITS ou OVAS_OR_CREDITS (défaut), et son prix en Crédits. */
function monnaiePack(p: Record<string, unknown>): Pick<PackCarriere, 'monnaie' | 'prixCredits'> {
  const sortie: Pick<PackCarriere, 'monnaie' | 'prixCredits'> = {};
  if (p.monnaie !== undefined && p.monnaie !== '') {
    if (!['OVAS', 'CREDITS', 'OVAS_OR_CREDITS'].includes(String(p.monnaie))) refuser('Monnaie du pack invalide.');
    sortie.monnaie = p.monnaie as PackCarriere['monnaie'];
  }
  if (p.prixCredits !== undefined && p.prixCredits !== '' && p.prixCredits !== null) sortie.prixCredits = entier(p.prixCredits, 1, 1000000);
  if (sortie.monnaie === 'CREDITS' && sortie.prixCredits === undefined) refuser('Un pack en Crédits seulement a besoin d’un prix en Crédits.');
  return sortie;
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
  const pack: PackCarriere = { id, nom:texte(p.nom,60), prix:entier(p.prix,1,1000000), cartes:entier(p.cartes,1,12), probabilites, garantie, promesse: p.promesse ? texte(p.promesse,180) : undefined, famille: ['general','poste','monde','age'].includes(String(p.famille)) ? p.famille as PackCarriere['famille'] : 'general', ...monnaiePack(p) };
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
const COULEUR = /^#[0-9a-fA-F]{6}$/;
const MOTIFS = ['uni', 'cerceaux', 'rayures', 'epaules', 'bande', 'diagonale'];
/** Une image de maillot ou d'aperçu : une URL `data:` (PNG, JPEG, WebP) de 250 Ko au plus, une URL HTTPS, ou un chemin du jeu. */
function validerImageLabo(v: unknown): string | undefined {
  if (v === undefined || v === '' || v === null) return undefined;
  if (typeof v !== 'string') refuser('Image invalide.');
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v)) { if (v.length > 250000) refuser('Image trop volumineuse (250 Ko maximum).'); return v; }
  if (/^\/(photos|m3d|icons)\/[a-zA-Z0-9_./%-]+$/.test(v) && !v.includes('..')) return v;
  try { const u = new URL(v); if (u.protocol === 'https:' && !u.username && !u.password && v.length <= 2048) return v; } catch { /* refus ci-dessous */ }
  return refuser('Utilise une image importée, une URL HTTPS ou un chemin du jeu.');
}
function dateLabo(v: unknown): string | undefined {
  if (v === undefined || v === '' || v === null) return undefined;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v) || Number.isNaN(Date.parse(v))) refuser('Date de disponibilité invalide.');
  return v;
}
/** Valide un cosmétique du Labo. Jamais de prix négatif, de monnaie absente, de modèle 3D hors `/m3d/` ni de maillage de maillot nouveau. */
export function validerArticleLabo(v: unknown): ArticleLabo {
  const a = objet(v), id = texte(a.id, 44);
  if (!/^lab-[a-z0-9][a-z0-9-]{1,38}$/.test(id)) refuser('Les cosmétiques du Labo ont un identifiant en « lab-… ».');
  const categorie = String(a.categorie);
  if (!['crampons', 'maillot', 'casque', 'bouclier', 'sac'].includes(categorie)) refuser('Catégorie de cosmétique invalide.');
  const prixDef = prixValide(a.prixDef);
  if (!prixDef) refuser('Prix invalide : une monnaie (Ovas, Crédits ou les deux) et des montants entiers.');
  const rarete = a.rarete === undefined || a.rarete === '' ? undefined : String(a.rarete);
  if (rarete && !['commun', 'rare', 'epique', 'legendaire'].includes(rarete)) refuser('Rareté invalide.');
  // ⚠️ UN MAILLOT DE LA BOUTIQUE N'EST JAMAIS UN NOUVEAU MAILLAGE : le modèle est celui du jeu, seules les couleurs, le motif et l'atlas changent.
  let glb = '/m3d/maillot.glb';
  if (categorie !== 'maillot') {
    glb = texte(a.glb, 80);
    if (!/^\/m3d\/[a-z0-9-]+\.glb$/.test(glb)) refuser('Le modèle 3D doit être un fichier de /m3d/.');
  }
  const article: ArticleLabo = {
    id, nom: texte(a.nom, 60), categorie: categorie as ArticleLabo['categorie'], emoji: typeof a.emoji === 'string' && a.emoji.length <= 8 && a.emoji ? a.emoji : '🎁',
    glb, prixDef, detail: typeof a.detail === 'string' ? a.detail.slice(0, 200) : '', publie: a.publie === true,
    ...(rarete ? { rarete: rarete as ArticleLabo['rarete'] } : {}),
  };
  if (typeof a.teinte === 'string' && a.teinte) { if (!COULEUR.test(a.teinte)) refuser('Teinte invalide.'); article.teinte = a.teinte; }
  const du = dateLabo(a.dispoDu), au = dateLabo(a.dispoAu);
  if (du) article.dispoDu = du;
  if (au) article.dispoAu = au;
  if (du && au && Date.parse(du) > Date.parse(au)) refuser('La fin de disponibilité précède son début.');
  if (categorie === 'maillot') {
    const k = objet(a.kit);
    const c = (cle: string) => { const x = k[cle]; if (typeof x !== 'string' || !COULEUR.test(x)) refuser('Couleur de kit invalide (' + cle + ').'); return x; };
    if (!MOTIFS.includes(String(k.motif))) refuser('Motif de kit invalide.');
    article.kit = { principal: c('principal'), secondaire: c('secondaire'), accent: c('accent'), short: c('short'), chaussettes: c('chaussettes'), motif: k.motif as NonNullable<ArticleLabo['kit']>['motif'] };
    const atlas = validerImageLabo(k.jerseyTexture);
    if (atlas) article.kit.jerseyTexture = atlas;
    if (!article.teinte) article.teinte = article.kit.principal;
  }
  return article;
}
export function vueDonneesClubs() { return { revision: catalogueAdmin().revision, clubs: verifierDonneesClubs(), rivalites: catalogueAdmin().rivalitesHistoriques ?? [] }; }
export function validerLocalisation(v: unknown): LocalisationClub {
  const d = objet(v), sortie: LocalisationClub = {};
  for (const cle of ['ville', 'stade', 'adresseStade', 'departement', 'departementNum', 'region', 'pays', 'codePostal'] as const) {
    if (d[cle] !== undefined && d[cle] !== '') sortie[cle] = texte(d[cle], cle === 'adresseStade' ? 300 : 120);
  }
  for (const cle of ['latitude', 'longitude', 'latitudeVille', 'longitudeVille'] as const) {
    if (d[cle] !== undefined && d[cle] !== null && d[cle] !== '') sortie[cle] = nombre(d[cle], cle.includes('latitude') ? -90 : -180, cle.includes('latitude') ? 90 : 180);
  }
  for (const cle of ['sourceLocalisation', 'sourceCoordonnees'] as const) if (d[cle]) {
    const source = texte(d[cle], 2000); let url: URL;
    try { url = new URL(source); } catch { return refuser('Une source HTTPS est requise.'); }
    if (url.protocol !== 'https:' || url.username || url.password) refuser('Une source HTTPS est requise.');
    sortie[cle] = source;
  }
  if (!['stade', 'siege', 'commune', 'fallback'].includes(String(d.precisionLieu))) refuser('Précision géographique invalide.');
  if (!['verifie', 'nonVerifie'].includes(String(d.statutGeographique))) refuser('Statut géographique invalide.');
  sortie.precisionLieu = d.precisionLieu as LocalisationClub['precisionLieu'];
  sortie.statutGeographique = d.statutGeographique as LocalisationClub['statutGeographique'];
  if (sortie.statutGeographique === 'verifie') {
    if (!coordonneesValides(sortie) || !sortie.ville || !sortie.pays || !sortie.region || !sortie.sourceLocalisation || sortie.precisionLieu === 'fallback') refuser('Pour vérifier un club, renseigne ville, pays, région, coordonnées et source fiable.');
    sortie.verifieLe = new Date().toISOString().slice(0,10);
  }
  return sortie;
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
    boutique:Object.values(catalogueAdmin().boutique ?? {}),
    packs:packsCatalogueAdmin(),
    joueurs:joueurs.slice(0,40),
    total:joueurs.length,
    championnats:[...new Set(catalogue.map(c=>c.championnat))].sort((a,b)=>a.localeCompare(b,'fr')),
    nations:[...new Set(catalogue.map(c=>c.nation).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr')),
    clubs,
  };
}
export async function enregistrerAtelier(stockage: StockageAtelier, corps: Record<string,unknown>) {
  // L'analyse d'un import ne modifie rien : elle répond sans révision.
  if(corps.operation === 'analyserImport') {
    if(!Array.isArray(corps.lignes) || !corps.lignes.length || corps.lignes.length > 2000) refuser('Entre 1 et 2 000 lignes à analyser.');
    return vueImports(corps.lignes.map(validerLigneImport));
  }
  const courant=catalogueAdmin();
  if(corps.revision !== courant.revision) refuser('Le catalogue a changé. Recharge l’atelier avant d’enregistrer.');
  const suivant=structuredClone(courant);
  let compteRendu: Record<string, unknown> | undefined;
  if (corps.operation === 'localisationClub') {
    const club = clubParNom(texte(corps.club, 150)); if (!club) refuser('Club introuvable.');
    suivant.clubs = { ...suivant.clubs, [club.nom]: validerLocalisation(corps.localisation) };
  } else if (corps.operation === 'rivaliteHistorique') {
    const a = clubParNom(texte(corps.clubA, 150)), b = clubParNom(texte(corps.clubB, 150));
    if (!a || !b || a.nom === b.nom) refuser('Deux clubs distincts sont requis.');
    const paire = [a.nom,b.nom].sort();
    const reste = (suivant.rivalitesHistoriques ?? []).filter(r => [r.clubA,r.clubB].sort().join('|') !== paire.join('|'));
    if (corps.supprimer === true) suivant.rivalitesHistoriques = reste;
    else {
      const source = validerLocalisation({ sourceLocalisation: corps.source, precisionLieu: 'commune', statutGeographique: 'nonVerifie' }).sourceLocalisation;
      if (!source) refuser('Une source est requise pour cette rivalité.');
      suivant.rivalitesHistoriques = [...reste, { clubA: paire[0], clubB: paire[1], source }];
    }
  } else if(corps.operation === 'pack') {
    const pack=validerPack(corps.pack); suivant.packs[pack.id]=pack;
    if(Object.keys(suivant.packs).length>100) refuser('Maximum de 100 packs personnalisés.');
  } else if(corps.operation === 'supprimerPack') {
    const id=texte(corps.packId,80);
    if(!id.startsWith('kiri-') || !suivant.packs[id]) refuser('Seuls les packs créés dans l’Atelier peuvent être supprimés.');
    delete suivant.packs[id];
  } else if(corps.operation === 'article') {
    const article=validerArticleLabo(corps.article);
    suivant.boutique={...(suivant.boutique??{}),[article.id]:article};
    if(Object.keys(suivant.boutique).length>200) refuser('Maximum de 200 cosmétiques personnalisés.');
  } else if(corps.operation === 'supprimerArticle') {
    const id=texte(corps.articleId,44);
    if(!suivant.boutique?.[id]) refuser('Cosmétique introuvable.');
    delete suivant.boutique[id];
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
      ...(j.age !== undefined ? { age: entier(j.age, 16, 50) } : {}),
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
  } else {
    compteRendu = await appliquerOperationSpeciale(courant, suivant, corps, stockage);
    if(!compteRendu) refuser('Action inconnue.');
  }
  suivant.revision++;
  if(JSON.stringify(suivant).length>3000000) refuser('Catalogue trop volumineux. Utilise des URL pour les prochaines photos.');
  if(!await stockage.ecrire(suivant,courant.revision)) refuser('Une autre modification a été enregistrée. Recharge l’atelier.');
  return {...compteRendu, revision:suivant.revision};
}
