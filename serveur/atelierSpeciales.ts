// LE LABO — cartes spéciales et imports de joueurs (compte Kiri uniquement)
//
// ⚠️ TOUT PASSE PAR LA MÊME RÉVISION QUE L'ATELIER. Une carte publiée, une
// image remplacée, un pack Halloween repricé : c'est une nouvelle révision du
// catalogue, et chaque ligue la relit à sa prochaine actualisation. Aucune
// ligue n'a besoin d'être réécrite à la main, aucune migration SQL.
//
// ⚠️ ET LE SERVEUR REVÉRIFIE TOUT. Le Labo est un écran ; ce qui compte est
// ce qu'accepte `appliquerOperationSpeciale` : GEN Halloween entre 82 et 92,
// une ICON jamais rattachée à un joueur actif, aucune publication sans image.

import type { CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
import { catalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
import { catalogueBaseCarriere, catalogueMondialCarriere, packsCatalogueAdmin, RARETES_CARRIERE } from '../src/lib/ligue/catalogueCarriere.js';
import {
  carteSpecialePackable, catalogueSpecial, chanceSpecialeParCarte, FAMILLES_SPECIALES, slugSpecial, statutCarteSpeciale,
  type DefinitionCarteSpeciale, type EvenementSpecial,
} from '../src/lib/ligue/catalogueSpecial.js';
import { analyserImport, cleImport, memeClub, nomComplet, posteImport, sourceIdImport, type AjoutJoueur, type LigneImport } from '../src/lib/ligue/importsJoueurs.js';
import type { PackCarriere, RareteCarriere } from '../src/lib/ligue/typesCarriere.js';
import { POSTES } from '../src/data/rugby.js';
import type { PosteId } from '../src/types.js';
import type { StockageAtelier } from './atelierStockage.js';

function refuser(message: string): never { const e = new Error(message); e.name = 'ErreurCarriere'; throw e; }
function objet(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) refuser('Données invalides.'); return v as Record<string, unknown>;
}
function nombre(v: unknown, min: number, max: number, champ: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) refuser(`${champ} : nombre attendu entre ${min} et ${max}.`);
  return v;
}
function entier(v: unknown, min: number, max: number, champ: string) {
  const n = nombre(v, min, max, champ); if (!Number.isInteger(n)) refuser(`${champ} : un nombre entier est requis.`); return n;
}
function texte(v: unknown, max: number, champ: string): string {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max) refuser(`${champ} : texte vide ou trop long.`); return v.trim();
}
function booleen(v: unknown, champ: string): boolean { if (typeof v !== 'boolean') refuser(`${champ} : oui ou non attendu.`); return v; }
function dateOuVide(v: unknown, champ: string): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || !Number.isFinite(Date.parse(v))) refuser(`${champ} : date invalide.`);
  return new Date(v).toISOString();
}
const posteValide = (v: unknown, champ: string): PosteId => {
  if (typeof v !== 'string' || !POSTES.some(p => p.id === v)) refuser(`${champ} : poste invalide.`); return v as PosteId;
};

/** Une image de carte : `data:` (envoyée au stockage), HTTPS ou /photos/. */
export function validerImageSpeciale(v: unknown): string {
  if (typeof v !== 'string' || !v) refuser('Image manquante.');
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v)) {
    if (v.length > 480_000) refuser('Image trop lourde (350 Ko maximum après compression).');
    return v;
  }
  if (/^\/photos\/[a-zA-Z0-9_./%-]+$/.test(v) && !v.includes('..')) return v;
  try { const url = new URL(v); if (url.protocol === 'https:' && !url.username && !url.password && v.length <= 2048) return v; } catch { /* refus ci-dessous */ }
  return refuser('Utilise une image importée, une URL HTTPS ou un chemin /photos/.');
}
export const urlImageSpeciale = (id: string, version: number) => `/api/carriere?imageSpeciale=${encodeURIComponent(id)}&v=${version}`;

const nationsConnues = (config: CatalogueAdmin) => new Set([...catalogueMondialCarriere(config).map(c => c.nation), 'Légendes']);

/**
 * Les champs modifiables d'une carte, validés UN PAR UN. Seuls ceux présents
 * dans la demande sont rendus : une modification partielle n'écrase rien.
 */
function validerChamps(brut: Record<string, unknown>, config: CatalogueAdmin): Partial<DefinitionCarteSpeciale> {
  const c: Partial<DefinitionCarteSpeciale> = {};
  if (brut.nom !== undefined) c.nom = texte(brut.nom, 60, 'Nom');
  for (const champ of ['display_name', 'real_name', 'first_name', 'last_name', 'description'] as const) {
    if (brut[champ] !== undefined) c[champ] = brut[champ] === '' || brut[champ] === null ? undefined : texte(brut[champ], champ === 'description' ? 1000 : 80, champ);
  }
  if (brut.rarity !== undefined) {
    if (brut.rarity === '' || brut.rarity === null) c.rarity = undefined;
    else { if (!RARETES_CARRIERE.includes(brut.rarity as RareteCarriere)) refuser('Rareté inconnue.'); c.rarity = brut.rarity as RareteCarriere; }
  }
  if (brut.allowedPackIds !== undefined) {
    if (brut.allowedPackIds === null) c.allowedPackIds = undefined;
    else {
      if (!Array.isArray(brut.allowedPackIds) || brut.allowedPackIds.length > 100) refuser('Liste de packs invalide.');
      const connus = new Set([...packsCatalogueAdmin().map(p => p.id), ...catalogueSpecial(config).evenements.flatMap(e => e.pack ? [e.pack.id] : [])]);
      c.allowedPackIds = [...new Set(brut.allowedPackIds.map(id => texte(id, 100, 'Pack')))];
      if (c.allowedPackIds.some(id => !connus.has(id))) refuser('Pack inconnu.');
    }
  }
  if (brut.sansClub !== undefined) {
    if (!['nation', 'neutre', 'creator'].includes(String(brut.sansClub))) refuser('Collectif sans club inconnu.');
    c.sansClub = brut.sansClub as DefinitionCarteSpeciale['sansClub'];
  }
  if (brut.niveauInfluenceur !== undefined) {
    if (!['fun', 'rare', 'evenement'].includes(String(brut.niveauInfluenceur))) refuser('Niveau Influenceur inconnu.');
    c.niveauInfluenceur = brut.niveauInfluenceur as DefinitionCarteSpeciale['niveauInfluenceur'];
  }
  if (brut.statistiques !== undefined) {
    if (brut.statistiques === null) c.statistiques = undefined;
    else {
      const stats = objet(brut.statistiques);
      const cles = new Set(['MEL', 'PHY', 'DEF', 'RCK', 'END', 'TEC', 'VIT', 'PAS', 'JDP']);
      if (Object.keys(stats).some(k => !cles.has(k))) refuser('Statistique inconnue.');
      c.statistiques = Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, entier(v, 20, 99, k)]));
    }
  }
  if (brut.poste !== undefined) c.poste = posteValide(brut.poste, 'Poste');
  if (brut.postesSecondaires !== undefined) {
    if (!Array.isArray(brut.postesSecondaires) || brut.postesSecondaires.length > 14) refuser('Postes secondaires invalides.');
    c.postesSecondaires = [...new Set(brut.postesSecondaires.map(p => posteValide(p, 'Poste secondaire')))];
  }
  if (brut.overall !== undefined) c.overall = entier(brut.overall, 20, 99, 'GEN');
  if (brut.collectif !== undefined) c.collectif = brut.collectif === null || brut.collectif === '' ? undefined : entier(brut.collectif, 0, 10, 'COL');
  if (brut.packWeight !== undefined) c.packWeight = nombre(brut.packWeight, 0, 100, 'Poids');
  if (brut.availableFrom !== undefined) c.availableFrom = dateOuVide(brut.availableFrom, 'Début');
  if (brut.availableUntil !== undefined) c.availableUntil = dateOuVide(brut.availableUntil, 'Fin');
  for (const champ of ['published', 'brouillon', 'canBePacked', 'canAppearInCollection', 'canAppearOnMarket', 'market_allowed', 'trade_allowed'] as const) {
    if (brut[champ] !== undefined) c[champ] = booleen(brut[champ], champ);
  }
  if (brut.nation !== undefined) {
    c.nation = brut.nation === '' ? '' : texte(brut.nation, 80, 'Nation');
    if (c.nation && !nationsConnues(config).has(c.nation)) refuser('Nation inconnue du catalogue.');
  }
  if (brut.club !== undefined) c.club = brut.club === '' ? '' : texte(brut.club, 100, 'Club');
  if (brut.league !== undefined) c.league = brut.league === '' ? '' : texte(brut.league, 100, 'Ligue');
  if (brut.age !== undefined) c.age = entier(brut.age, 16, 60, 'Âge');
  if (brut.rarityAnimation !== undefined) {
    if (!['mythique', 'elite', 'or', 'influenceur'].includes(String(brut.rarityAnimation))) refuser('Animation inconnue.');
    c.rarityAnimation = brut.rarityAnimation as DefinitionCarteSpeciale['rarityAnimation'];
  }
  if (brut.specialLogo !== undefined) c.specialLogo = texte(brut.specialLogo, 40, 'Emblème');
  if (brut.designId !== undefined) c.designId = texte(brut.designId, 60, 'Design');
  if (brut.lot !== undefined) c.lot = brut.lot === '' ? undefined : texte(brut.lot, 80, 'Lot');
  if (brut.basePlayerId !== undefined) {
    if (brut.basePlayerId === null || brut.basePlayerId === '') c.basePlayerId = undefined;
    else {
      c.basePlayerId = texte(brut.basePlayerId, 250, 'Joueur de base');
      if (!catalogueMondialCarriere(config).some(s => s.sourceId === c.basePlayerId)) refuser('Joueur de base introuvable dans le catalogue.');
    }
  }
  if (brut.image !== undefined) {
    if (brut.image === '' || brut.image === null) c.image = undefined;
    else {
      const image = validerImageSpeciale(brut.image);
      if (image.startsWith('data:')) refuser('Une image importée passe par l’envoi d’image, pas par l’édition.');
      c.image = image;
    }
  }
  return c;
}

/** Les règles qui portent sur la carte ENTIÈRE, une fois la modification appliquée. */
function verifierCoherence(def: DefinitionCarteSpeciale, config: CatalogueAdmin) {
  const famille = FAMILLES_SPECIALES[def.cardType];
  const ev = catalogueSpecial(config).evenementParId.get(def.specialEventId);
  if (!ev) refuser('Événement inconnu.');
  if (ev.cardType !== def.cardType) refuser('Cet événement ne porte pas ce type de carte.');
  if (def.cardType !== 'influencer' && !def.nation) refuser('Nation requise pour cette famille.');
  if (def.cardType === 'influencer' && def.basePlayerId) refuser('Un influenceur possède sa propre identité.');
  if (famille) {
    if (def.overall < famille.overallMin || def.overall > famille.overallMax) refuser(`${famille.nom} : GEN entre ${famille.overallMin} et ${famille.overallMax}.`);
    // ⚠️ UNE ICON EST UNE LÉGENDE QUI NE JOUE PLUS. Rattachée à une carte
    // active, elle doublerait un joueur du catalogue au lieu de l'honorer.
    if (famille.retraitesSeulement && def.basePlayerId) refuser('Une ICON est un joueur retraité : elle ne se rattache à aucun joueur actif.');
  }
  if (def.postesSecondaires?.includes(def.poste)) def.postesSecondaires = def.postesSecondaires.filter(p => p !== def.poste);
  if (def.availableFrom && def.availableUntil && Date.parse(def.availableFrom) >= Date.parse(def.availableUntil)) refuser('La date de fin doit suivre la date de début.');
  // ⚠️ AUCUNE PUBLICATION SANS IMAGE, MÊME DEMANDÉE. C'est la règle qui protège
  // tout le reste : une carte publiée sort des packs dans toutes les ligues.
  if (def.published && !def.image) refuser(`${def.nom} : ajoute son image avant de la publier.`);
  if (def.published && def.brouillon) refuser(`${def.nom} : un brouillon ne se publie pas.`);
}

/** Les champs d'un pack d'événement, avec ses chances de cartes spéciales. */
function validerPackEvenement(brut: Record<string, unknown>, existant: PackCarriere | undefined, evenementId: string, config: CatalogueAdmin): PackCarriere {
  const poids = objet(brut.probabilites ?? existant?.probabilites);
  const probabilites = Object.fromEntries(RARETES_CARRIERE.map(r => [r, nombre(poids[r], 0, 100, `Probabilité ${r}`)])) as Record<RareteCarriere, number>;
  if (Math.abs(Object.values(probabilites).reduce((a, b) => a + b, 0) - 100) > .001) refuser('Les probabilités doivent totaliser 100 %.');
  const evenements = catalogueSpecial(config).evenementParId;
  const speciales: Record<string, number> = {};
  for (const [id, valeur] of Object.entries(objet(brut.speciales ?? existant?.speciales ?? {}))) {
    if (!evenements.has(id) && id !== evenementId) refuser('Chance spéciale : événement inconnu.');
    speciales[id] = nombre(valeur, 0, 100, 'Chance spéciale');
  }
  const garantieBrute = brut.garantieSpeciale === undefined ? existant?.garantieSpeciale : brut.garantieSpeciale;
  const garantieSpeciale = garantieBrute === '' || garantieBrute === null || garantieBrute === undefined ? undefined : texte(garantieBrute, 80, 'Garantie');
  if (garantieSpeciale && !evenements.has(garantieSpeciale) && garantieSpeciale !== evenementId) refuser('Garantie : événement inconnu.');
  return {
    id: existant?.id ?? `evenement-${evenementId}`,
    nom: texte(brut.nom ?? existant?.nom, 60, 'Nom du pack'),
    promesse: brut.promesse === undefined ? existant?.promesse : brut.promesse === '' ? undefined : texte(brut.promesse, 180, 'Promesse'),
    prix: entier(brut.prix ?? existant?.prix, 1, 1_000_000, 'Prix'),
    // Le pack d'événement vit en Collection solo : 10 à 20 cartes comme ses voisins.
    cartes: entier(brut.cartes ?? existant?.cartes, 1, 20, 'Cartes'),
    famille: 'general', probabilites,
    ...(Object.keys(speciales).length ? { speciales } : {}),
    ...(garantieSpeciale ? { garantieSpeciale } : {}),
  };
}

function cartesDuLabo(suivant: CatalogueAdmin) {
  suivant.speciales ??= {};
  suivant.speciales.cartes ??= {};
  return suivant.speciales.cartes;
}
const LIMITE_LOT = 300;

/**
 * Applique une opération du Labo à la copie `suivant` du catalogue. Rend
 * `undefined` quand l'opération n'est pas une opération de cartes spéciales
 * ou d'import, sinon un compte rendu (en plus de la révision).
 */
export async function appliquerOperationSpeciale(courant: CatalogueAdmin, suivant: CatalogueAdmin, corps: Record<string, unknown>, stockage: StockageAtelier): Promise<Record<string, unknown> | undefined> {
  const operation = corps.operation;
  const cat = catalogueSpecial(courant);
  const ecrireCarte = (id: string, champs: Partial<DefinitionCarteSpeciale>) => {
    const base = cat.parId.get(id) ?? (cartesDuLabo(suivant)[id] as DefinitionCarteSpeciale | undefined);
    if (!base) refuser('Carte spéciale introuvable.');
    const fusion = { ...base, ...champs, imageReady: Boolean(champs.image ?? base.image) } as DefinitionCarteSpeciale;
    if ('image' in champs && !champs.image) fusion.image = undefined;
    fusion.imageReady = Boolean(fusion.image);
    verifierCoherence(fusion, courant);
    const cartes = cartesDuLabo(suivant);
    cartes[id] = { ...(cartes[id] ?? {}), ...champs, imageReady: fusion.imageReady, ...(fusion.postesSecondaires ? { postesSecondaires: fusion.postesSecondaires } : {}) };
    if (fusion.published && !fusion.publieeLe) cartes[id].publieeLe = new Date().toISOString();
    if ('image' in champs && !champs.image) delete cartes[id].image;
  };
  const creer = (brut: Record<string, unknown>) => {
    const cardType = texte(brut.cardType, 40, 'Type');
    const famille = FAMILLES_SPECIALES[cardType];
    const specialEventId = brut.specialEventId ? texte(brut.specialEventId, 80, 'Événement') : famille?.evenementDefaut;
    if (!specialEventId) refuser('Choisis l’événement de la carte.');
    const nom = texte(brut.nom, 60, 'Nom');
    const id = `${cardType === 'icon' ? 'icon' : specialEventId}:${slugSpecial(nom)}`;
    const supprimees = suivant.speciales?.supprimees ?? [];
    const existe = cat.parId.has(id) || Boolean(suivant.speciales?.cartes?.[id] && !supprimees.includes(id));
    if (existe) return { id, cree: false };
    const champs = validerChamps(brut, courant);
    const def: DefinitionCarteSpeciale = {
      id, cardType, specialEventId, nom, poste: champs.poste ?? posteValide(brut.poste, 'Poste'),
      postesSecondaires: champs.postesSecondaires, overall: champs.overall ?? entier(brut.overall, 20, 99, 'GEN'),
      collectif: 'collectif' in champs ? champs.collectif : famille?.collectifDefaut,
      designId: champs.designId ?? famille?.designId ?? `special-${cardType}`, packWeight: champs.packWeight ?? 1,
      availableFrom: champs.availableFrom, availableUntil: champs.availableUntil, published: false, imageReady: Boolean(champs.image),
      image: champs.image, canBePacked: champs.canBePacked ?? true, canAppearInCollection: champs.canAppearInCollection ?? true,
      canAppearOnMarket: champs.canAppearOnMarket ?? true, nation: champs.nation ?? (cardType === 'influencer' ? '' : texte(brut.nation, 80, 'Nation')),
      club: champs.club ?? '', league: champs.league ?? '', rarityAnimation: champs.rarityAnimation ?? (cardType === 'influencer' ? 'influenceur' : 'mythique'),
      specialLogo: champs.specialLogo ?? famille?.specialLogo ?? 'etoile', retraite: cardType !== 'influencer' && !champs.basePlayerId,
      age: champs.age ?? 0, basePlayerId: champs.basePlayerId, brouillon: champs.brouillon ?? (cardType === 'influencer'), lot: champs.lot,
      display_name: champs.display_name, real_name: champs.real_name, first_name: champs.first_name, last_name: champs.last_name,
      description: champs.description, rarity: champs.rarity, statistiques: champs.statistiques, allowedPackIds: champs.allowedPackIds,
      market_allowed: champs.market_allowed ?? true, trade_allowed: champs.trade_allowed ?? true,
      sansClub: champs.sansClub ?? 'nation', niveauInfluenceur: champs.niveauInfluenceur ?? 'rare',
    };
    if (def.nation && !nationsConnues(courant).has(def.nation)) refuser('Nation inconnue du catalogue.');
    verifierCoherence({ ...def, club: def.club || 'x', league: def.league || 'x', age: def.age || 30 }, courant);
    const propre = Object.fromEntries(Object.entries(def).filter(([k, v]) => v !== undefined && ((cardType === 'influencer' && ['club', 'league', 'nation', 'packWeight', 'collectif'].includes(k)) || (v !== '' && v !== 0)))) as Partial<DefinitionCarteSpeciale>;
    cartesDuLabo(suivant)[id] = { ...propre, published: false, imageReady: Boolean(def.image) };
    if (suivant.speciales!.supprimees) suivant.speciales!.supprimees = suivant.speciales!.supprimees.filter(s => s !== id);
    return { id, cree: true };
  };

  switch (operation) {
    case 'carteSpeciale': {
      const id = texte(corps.id, 160, 'Carte');
      ecrireCarte(id, validerChamps(objet(corps.carte), courant));
      return { id };
    }
    case 'creerCarteSpeciale': {
      const resultat = creer(objet(corps.carte));
      if (!resultat.cree) refuser('Cette carte spéciale existe déjà : modifie-la plutôt.');
      return resultat;
    }
    // ⚠️ L'IMPORT EN MASSE CRÉE CE QUI MANQUE ET MET À JOUR CE QUI EXISTE.
    // Une ligne fautive n'arrête pas le lot : elle est rendue avec sa raison,
    // les autres passent — comme un tableur qu'on corrige ligne par ligne.
    case 'importCartesSpeciales': {
      if (!Array.isArray(corps.lignes) || !corps.lignes.length || corps.lignes.length > LIMITE_LOT) refuser(`Entre 1 et ${LIMITE_LOT} lignes par import.`);
      const bilan = { crees: 0, misesAJour: 0, erreurs: [] as { ligne: number; message: string }[] };
      corps.lignes.forEach((brut, i) => {
        try {
          const ligne = objet(brut);
          const resultat = creer(ligne);
          if (resultat.cree) bilan.crees++;
          else { ecrireCarte(resultat.id, validerChamps({ ...ligne, nom: undefined, cardType: undefined, specialEventId: undefined }, courant)); bilan.misesAJour++; }
        } catch (e) { bilan.erreurs.push({ ligne: i + 1, message: e instanceof Error ? e.message : 'Ligne invalide.' }); }
      });
      if (!bilan.crees && !bilan.misesAJour) refuser(`Aucune ligne importée. ${bilan.erreurs[0]?.message ?? ''}`.trim());
      return bilan;
    }
    case 'publierCartesSpeciales': {
      if (!Array.isArray(corps.ids) || !corps.ids.length || corps.ids.length > 500) refuser('Sélection invalide.');
      const publier = booleen(corps.published, 'Publication');
      const bilan = { modifiees: 0, ignorees: [] as string[] };
      for (const brut of corps.ids) {
        const id = texte(brut, 160, 'Carte'), def = cat.parId.get(id);
        if (!def) { bilan.ignorees.push(id); continue; }
        // Publier en masse ne force rien : une carte sans image reste en attente.
        if (publier && statutCarteSpeciale(def) === 'image_missing') { bilan.ignorees.push(def.nom); continue; }
        if (publier && def.brouillon) { bilan.ignorees.push(def.nom); continue; }
        ecrireCarte(id, { published: publier }); bilan.modifiees++;
      }
      return bilan;
    }
    case 'supprimerCarteSpeciale': {
      const id = texte(corps.id, 160, 'Carte');
      if (!cat.parId.has(id)) refuser('Carte spéciale introuvable.');
      suivant.speciales ??= {};
      suivant.speciales.supprimees = [...new Set([...(suivant.speciales.supprimees ?? []), id])];
      if (suivant.speciales.cartes) delete suivant.speciales.cartes[id];
      await stockage.supprimerImage?.(id);
      return { id };
    }
    case 'imageCarteSpeciale': {
      const id = texte(corps.id, 160, 'Carte');
      if (!cat.parId.has(id)) refuser('Carte spéciale introuvable.');
      if (corps.image === '' || corps.image === null) {
        // Retirer l'image dépublie : une carte sans visuel ne reste jamais en ligne.
        await stockage.supprimerImage?.(id);
        ecrireCarte(id, { image: undefined, published: false });
        return { id };
      }
      const image = validerImageSpeciale(corps.image);
      if (image.startsWith('data:')) {
        if (!stockage.ecrireImage) refuser('Stockage des images indisponible sur ce serveur.');
        const version = await stockage.ecrireImage(id, image);
        ecrireCarte(id, { image: urlImageSpeciale(id, version) });
      } else ecrireCarte(id, { image });
      return { id, image: cartesDuLabo(suivant)[id].image };
    }
    case 'evenementSpecial': {
      const id = texte(corps.id, 80, 'Événement');
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) refuser('Identifiant d’événement invalide.');
      const brut = objet(corps.evenement);
      const existant = cat.evenementParId.get(id);
      const cardType = existant?.cardType ?? texte(brut.cardType, 40, 'Type');
      if (!existant && !FAMILLES_SPECIALES[cardType]) refuser('Type de carte inconnu : choisis une famille existante.');
      const ev: Partial<EvenementSpecial> = { ...(suivant.speciales?.evenements?.[id] ?? {}) };
      if (!existant) Object.assign(ev, { cardType, nom: texte(brut.nom, 60, 'Nom'), actif: false, repere: 'mythique', tauxPacksNormaux: 1 });
      if (brut.nom !== undefined) ev.nom = texte(brut.nom, 60, 'Nom');
      if (brut.actif !== undefined) ev.actif = booleen(brut.actif, 'Activation');
      if (brut.availableFrom !== undefined) ev.availableFrom = dateOuVide(brut.availableFrom, 'Début');
      if (brut.availableUntil !== undefined) ev.availableUntil = dateOuVide(brut.availableUntil, 'Fin');
      if (brut.tauxPacksNormaux !== undefined) ev.tauxPacksNormaux = nombre(brut.tauxPacksNormaux, 0, 20, 'Taux des packs ordinaires');
      if (brut.repere !== undefined) {
        if (!['mythique', 'entreBleueEtMythique'].includes(String(brut.repere))) refuser('Repère inconnu.');
        ev.repere = brut.repere as EvenementSpecial['repere'];
      }
      const du = ev.availableFrom ?? existant?.availableFrom, au = ev.availableUntil ?? existant?.availableUntil;
      if ('availableFrom' in ev && ev.availableFrom === undefined) delete ev.availableFrom;
      if ('availableUntil' in ev && ev.availableUntil === undefined) delete ev.availableUntil;
      if (du && au && Date.parse(du) >= Date.parse(au)) refuser('La fin de l’événement doit suivre son début.');
      if (brut.pack === null) ev.pack = undefined;
      else if (brut.pack !== undefined) ev.pack = validerPackEvenement(objet(brut.pack), existant?.pack, id, courant);
      suivant.speciales ??= {};
      suivant.speciales.evenements = { ...(suivant.speciales.evenements ?? {}), [id]: ev };
      return { id };
    }
    case 'deciderImport': return deciderImport(courant, suivant, corps);
    default: return undefined;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTS JOUEURS
// ═══════════════════════════════════════════════════════════════════════════

/** Les noms de la source → les championnats du jeu. */
const ALIAS_LIGUES: Record<string, string> = {
  mlr: 'Major League Rugby', 'major league rugby': 'Major League Rugby',
  'champ rugby': 'RFU Championship', championship: 'RFU Championship', 'rfu championship': 'RFU Championship',
  npc: 'Bunnings NPC', 'bunnings npc': 'Bunnings NPC',
};
/** Sans note fournie : le milieu de l'échelle du championnat (scripts/ligues.cjs). */
const NOTE_PAR_DEFAUT: Record<string, number> = { 'Major League Rugby': 58, 'RFU Championship': 58, 'Championship Cup': 56, 'Bunnings NPC': 64 };
const normaliser = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function validerLigneImport(brut: unknown): LigneImport {
  const l = objet(brut);
  const ligne: LigneImport = { nom: texte(l.nom, 80, 'Nom'), club: texte(l.club, 100, 'Club'), ligue: texte(l.ligue, 100, 'Ligue') };
  if (l.prenom) ligne.prenom = texte(l.prenom, 60, 'Prénom');
  if (l.poste) ligne.poste = texte(l.poste, 40, 'Poste');
  if (l.image) ligne.image = validerImageSpeciale(l.image);
  if (ligne.image?.startsWith('data:')) refuser('Image d’import : utilise une URL HTTPS ou un chemin /photos/.');
  if (l.dateNaissance) {
    const d = texte(l.dateNaissance, 10, 'Date de naissance');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d))) refuser('Date de naissance : AAAA-MM-JJ.');
    ligne.dateNaissance = d;
  }
  if (l.nation) ligne.nation = texte(l.nation, 80, 'Nation');
  if (l.note !== undefined && l.note !== '' && l.note !== null) ligne.note = entier(Number(l.note), 20, 99, 'Note');
  if (l.age !== undefined && l.age !== '' && l.age !== null) ligne.age = entier(Number(l.age), 15, 50, 'Âge');
  if (l.fichesSource !== undefined) ligne.fichesSource = entier(l.fichesSource, 0, 99, 'Fiches source');
  return ligne;
}

/** Le lot préparé depuis `sources/data/base_rugby_finale.json` (MLR, Championship, NPC). */
export async function lotImport(id: string): Promise<LigneImport[]> {
  if (id !== 'mlr-championship-npc') refuser('Lot inconnu.');
  const { LOT_MLR_CHAMPIONSHIP_NPC } = await import('./lotImportJoueurs.js');
  return [...LOT_MLR_CHAMPIONSHIP_NPC];
}

export function vueImports(lignes: readonly LigneImport[], config: CatalogueAdmin = catalogueAdmin()) {
  const analyses = analyserImport(lignes, config);
  const compteurs = { nouveau: 0, present: 0, douteux: 0, decides: 0 };
  for (const a of analyses) { compteurs[a.verdict]++; if (a.decision) compteurs.decides++; }
  return { revision: config.revision, compteurs, analyses };
}

async function deciderImport(courant: CatalogueAdmin, suivant: CatalogueAdmin, corps: Record<string, unknown>) {
  if (!Array.isArray(corps.decisions) || !corps.decisions.length || corps.decisions.length > 2000) refuser('Entre 1 et 2 000 décisions.');
  const date = new Date().toISOString();
  const catalogue = catalogueMondialCarriere(courant);
  const parId = new Map(catalogue.map(s => [s.sourceId, s]));
  const nations = new Map([...new Set(catalogue.map(s => s.nation))].map(n => [normaliser(n), n]));
  const championnats = new Map<string, string>();
  for (const s of catalogueBaseCarriere()) if (!championnats.has(s.championnat)) championnats.set(s.championnat, s.pays);
  suivant.ajouts ??= {};
  suivant.importsDecisions ??= {};
  suivant.joueurs ??= {};
  const bilan = { ajoutes: 0, fusionnes: 0, ignores: 0 };
  for (const brut of corps.decisions) {
    const d = objet(brut);
    const ligne = validerLigneImport(d.ligne);
    const decision = d.decision;
    if (decision !== 'ajouter' && decision !== 'fusionner' && decision !== 'ignorer') refuser('Décision inconnue.');
    const cle = cleImport(ligne);
    if (decision === 'ignorer') { suivant.importsDecisions[cle] = { decision, date }; bilan.ignores++; continue; }
    if (decision === 'fusionner') {
      const sourceId = texte(d.sourceId, 250, 'Joueur cible');
      const cible = parId.get(sourceId);
      if (!cible) refuser(`${nomComplet(ligne)} : joueur cible introuvable.`);
      // Le même joueur : on ne crée rien. Son portrait manquant est repris.
      if (ligne.image && !cible.photo && !cible.speciale) {
        suivant.joueurs[sourceId] = { ...(suivant.joueurs[sourceId] ?? { note: cible.note, potentiel: cible.potentiel }), photo: ligne.image };
      }
      suivant.importsDecisions[cle] = { decision, sourceId, date }; bilan.fusionnes++; continue;
    }
    const sourceId = sourceIdImport(ligne);
    if (!parId.has(sourceId) && !suivant.ajouts[sourceId]) {
      const poste = posteImport(ligne.poste);
      if (!poste) refuser(`${nomComplet(ligne)} : poste inconnu (« ${ligne.poste ?? ''} »).`);
      const championnat = ALIAS_LIGUES[normaliser(ligne.ligue)] ?? ligne.ligue;
      const clubCanonique = catalogue.find(s => s.championnat === championnat && memeClub(s.clubReel, ligne.club))?.clubReel ?? ligne.club;
      const note = ligne.note ?? NOTE_PAR_DEFAUT[championnat] ?? 50;
      const naissance = ligne.dateNaissance ? Date.parse(ligne.dateNaissance) : NaN;
      const age = ligne.age ?? (Number.isFinite(naissance) ? Math.floor((Date.parse(date) - naissance) / (365.25 * 86_400_000)) : 26);
      const ajout: AjoutJoueur = {
        sourceId, nom: nomComplet(ligne), poste, note, potentiel: Math.min(99, note + 3), age: Math.max(16, Math.min(50, age)),
        nation: (ligne.nation && nations.get(normaliser(ligne.nation))) ?? ligne.nation ?? 'Inconnue',
        clubReel: clubCanonique, championnat, pays: championnats.get(championnat) ?? 'Monde', ajouteLe: date,
        ...(ligne.image ? { photo: ligne.image } : {}), ...(ligne.dateNaissance ? { dateNaissance: ligne.dateNaissance } : {}),
      };
      suivant.ajouts[sourceId] = ajout;
    }
    suivant.importsDecisions[cle] = { decision, sourceId, date }; bilan.ajoutes++;
  }
  if (Object.keys(suivant.ajouts).length > 5000) refuser('Maximum de 5 000 joueurs ajoutés.');
  return bilan;
}

// ═══════════════════════════════════════════════════════════════════════════
// LA VUE DU LABO
// ═══════════════════════════════════════════════════════════════════════════

export function vueSpeciales(maintenant: number, config: CatalogueAdmin = catalogueAdmin()) {
  const cat = catalogueSpecial(config);
  const packs = packsCatalogueAdmin().filter(p => ['bronze', 'standard', 'premium', 'or', 'grand', 'elite'].includes(p.id));
  return {
    revision: config.revision,
    maintenant,
    familles: FAMILLES_SPECIALES,
    packs: [...packsCatalogueAdmin(), ...cat.evenements.flatMap(e => e.pack ? [e.pack] : [])].map(p => ({ id: p.id, nom: p.nom })),
    clubs: [...new Set(catalogueMondialCarriere(config).map(c => c.clubReel))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr')),
    evenements: cat.evenements.map(ev => ({
      ...ev,
      // Ce que l'événement représente dans les packs de la boutique, par carte.
      chances: [...packs, ...(ev.pack ? [ev.pack] : [])].map(p => ({ pack: p.nom, chance: chanceSpecialeParCarte(p, ev) })),
    })),
    cartes: cat.definitions.map(def => ({ ...def, statut: statutCarteSpeciale(def), packable: carteSpecialePackable(def, cat, maintenant) })),
    nations: [...new Set([...catalogueMondialCarriere(config).map(c => c.nation), 'Légendes'])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr')),
  };
}
