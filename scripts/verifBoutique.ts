// Banc de la boutique du Correctif 21 : monnaies, prix, achats, inventaire, kits, Labo, coffre du compte.
// npm run verify:boutique
import assert from 'node:assert/strict';
import { useGame } from '../src/store/useGame';
import { EQUIPEMENTS, EQUIPEMENT_PAR_ID, RUBRIQUES, SKINS, prixArticle, prixSkin, estEnVente, rubriqueDe, enregistrerArticlesLabo } from '../src/data/boutique';
import { KITS_BOUTIQUE } from '../src/data/kitsBoutique';
import { devisesAcceptees, devisesProposees, manque, montantEn, prixValide, prixCredits, prixLesDeux, prixOvas, devisePreferee, estGratuit } from '../src/lib/monnaies';
import { kitDeMonEquipe, maillotDepuisKit } from '../src/lib/personnalisationMatch';
import { appliquerModificationsBoutiqueCompte, differencesBoutiqueCompte, validerEtatBoutiqueCompte, validerModificationsBoutiqueCompte, type EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';
import { validerArticleLabo } from '../serveur/atelierAdmin';
import { demanderPaiement, fournirSoldes, lireEtatAchat, choisirDevise, confirmerAchat, annulerAchat, aller } from '../src/lib/achatUi';
import { etatCollectionSoloVide, prixPackSoloArticle } from '../src/lib/collectionSolo';

let total = 0;
const ok = (c: unknown, m: string) => { total++; assert.ok(c, m); };
const egal = <T>(a: T, b: T, m: string) => { total++; assert.deepEqual(a, b, m); };
const etat = () => useGame.getState();
const remise = (p: Partial<ReturnType<typeof etat>> = {}) => useGame.setState({ coins: 0, credits: 0, inventaire: ['classique'], skinActif: 'classique', equipements: [], equipementActif: {}, cosmetiquesMeta: {}, ...p });

// ── 1. Les prix : trois modes, jamais de monnaie absente ─────────────────────────────────────────
egal(devisesAcceptees(prixOvas(10)), ['ovas'], 'OVAS seulement');
egal(devisesAcceptees(prixCredits(10)), ['ovas', 'credits'], 'un ancien prix « Crédits seulement » s’achète aussi en Ovas');
ok(montantEn(prixCredits(10), 'ovas') === 50, 'son prix en Ovas se déduit au taux de 5');
ok(prixValide({ mode: 'CREDITS', credits: 10 })?.ovas === 50, 'un article du Labo réglé en Crédits seulement reste achetable en Ovas');
egal(devisesProposees(prixLesDeux(100), { ovas: 0, credits: 0 }), ['ovas'], 'sans Crédits, la boutique ne propose que les Ovas');
egal(devisesProposees(prixLesDeux(100), { ovas: 0, credits: 3 }), ['ovas', 'credits'], 'un solde de Crédits restant reste dépensable');
egal(devisesAcceptees(prixLesDeux(100)), ['ovas', 'credits'], 'les deux, Ovas d’abord');
ok(montantEn(prixLesDeux(100), 'credits') === 20, 'le prix en Crédits se déduit au taux de 5 Ovas');
ok(montantEn(prixOvas(10), 'credits') === null, 'une monnaie non acceptée n’a pas de montant');
ok(manque(prixLesDeux(100), 'ovas', { ovas: 30, credits: 0 }) === 70, 'il manque 70 Ovas');
ok(manque(prixLesDeux(100), 'credits', { ovas: 0, credits: 25 }) === 0, 'assez de Crédits');
ok(devisePreferee(prixLesDeux(100), { ovas: 0, credits: 50 }) === 'credits', 'la monnaie proposée est celle qu’on peut payer');
ok(estGratuit(prixOvas(0)) && !estGratuit(prixOvas(1)), 'gratuit');
for (const mauvais of [null, {}, { mode: 'OVAS' }, { mode: 'OVAS', ovas: -1 }, { mode: 'CREDITS', credits: 1.5 }, { mode: 'OVAS_OR_CREDITS', ovas: 5 }, { mode: 'X', ovas: 5 }]) ok(prixValide(mauvais) === null, 'prix invalide refusé : ' + JSON.stringify(mauvais));
ok(prixValide({ mode: 'OVAS_OR_CREDITS', ovas: 5, credits: 1 }) !== null, 'prix valide accepté');

// ── 2. Le catalogue ──────────────────────────────────────────────────────────────────────────────
ok(EQUIPEMENTS.every((a) => devisesAcceptees(prixArticle(a)).length > 0), 'tout article a une monnaie');
ok(SKINS.every((s) => devisesAcceptees(prixSkin(s)).length > 0), 'tout ballon a une monnaie');
ok(EQUIPEMENTS.every((a) => devisesAcceptees(prixArticle(a)).includes('ovas')) && SKINS.every((s) => devisesAcceptees(prixSkin(s)).includes('ovas')), 'plus aucun article n’exige des Crédits : tout s’achète en Ovas');
ok(!EQUIPEMENTS.some((a) => (a.categorie as string) === 'stade') && RUBRIQUES.every((r) => !['stades', 'evenement'].includes(r.id)), 'ni stades ni événements dans la boutique');
ok(KITS_BOUTIQUE.length >= 8 && KITS_BOUTIQUE.every((k) => EQUIPEMENT_PAR_ID[k.id]?.glb === '/m3d/maillot.glb'), 'les nouveaux kits utilisent le modèle 3D du maillot du jeu, jamais un nouveau maillage');
ok(EQUIPEMENTS.filter((a) => a.categorie === 'maillot').every((a) => a.kit && a.glb.endsWith('.glb')), 'chaque maillot porte un kit ET son modèle 3D');
ok(EQUIPEMENTS.filter((a) => a.categorie === 'maillot').every((a) => rubriqueDe(a) === 'maillots'), 'les maillots sont dans le rayon Maillots');
ok(!estEnVente(EQUIPEMENT_PAR_ID['kit-champion']) && !!EQUIPEMENT_PAR_ID['kit-champion'].recompense, 'le kit de champion ne se vend pas : il se gagne');
ok(!estEnVente(EQUIPEMENT_PAR_ID['maillot-vannes']), 'un article par pub n’est pas en vente');

// ── 3. Acheter ───────────────────────────────────────────────────────────────────────────────────
remise({ coins: 50, credits: 10 });
let r = etat().acheterCosmetique('crampons-or', 'ovas');
ok(!r.ok && r.raison === 'solde' && r.devise === 'ovas', 'les anciens crampons « Crédits seulement » s’achètent désormais en Ovas (ici : solde insuffisant)');
r = etat().acheterCosmetique('crampons-or', 'credits');
ok(!r.ok && r.raison === 'solde' && r.manque === 58, 'Crédits insuffisants : il manque la bonne quantité (68 − 10)');
ok(etat().credits === 10 && etat().coins === 50 && etat().equipements.length === 0, 'un achat refusé ne débite rien');
r = etat().acheterCosmetique('crampons-cuir', 'ovas');
ok(!r.ok && r.raison === 'solde' && r.manque === 10, 'il manque 10 Ovas');
remise({ coins: 500, credits: 100 });
r = etat().acheterCosmetique('crampons-cuir', 'ovas');
ok(r.ok && etat().coins === 440 && etat().equipements.includes('crampons-cuir'), 'achat en Ovas');
ok(etat().equipementActif.crampons === 'crampons-cuir', 'le matériel personnel s’équipe tout de suite');
ok(etat().cosmetiquesMeta['crampons-cuir']?.source === 'boutique' && etat().cosmetiquesMeta['crampons-cuir'].date > 0, 'l’inventaire date l’achat et en note la source');
r = etat().acheterCosmetique('crampons-cuir', 'ovas');
ok(!r.ok && r.raison === 'possede', 'pas deux fois le même article');
r = etat().acheterCosmetique('crampons-flash', 'credits');
ok(r.ok && etat().credits === 100 - 26, 'achat en Crédits (130 Ovas → 26 Crédits)');
r = etat().acheterCosmetique('kit-destiny-nuit', 'credits');
ok(r.ok && !etat().equipementActif.maillot, 'un kit acheté n’est PAS équipé d’office : il s’équipe d’un geste volontaire');
r = etat().acheterCosmetique('kit-champion', 'ovas');
ok(!r.ok && r.raison === 'indisponible', 'une récompense ne s’achète pas');
r = etat().acheterCosmetique('maillot-vannes', 'ovas');
ok(!r.ok && r.raison === 'indisponible', 'un article par pub ne s’achète pas');
ok(!etat().acheterCosmetique('n-existe-pas', 'ovas').ok, 'article inconnu refusé');
useGame.setState({ credits: 200 });
ok(etat().acheterCosmetique('ocean', 'credits').ok && etat().inventaire.includes('ocean') && etat().skinActif === 'ocean', 'un ballon se paie aussi en Crédits');

// ── 4. Équiper : seulement ce qu'on possède ──────────────────────────────────────────────────────
remise({ coins: 0, credits: 0, equipements: ['kit-destiny-classique', 'kit-retro-80'] });
etat().basculerEquipement('kit-destiny-nuit');
ok(!etat().equipementActif.maillot, 'un kit non possédé ne s’équipe pas');
etat().basculerEquipement('kit-destiny-classique');
etat().basculerEquipement('kit-retro-80', 'maillotExt');
egal([etat().equipementActif.maillot, etat().equipementActif.maillotExt], ['kit-destiny-classique', 'kit-retro-80'], 'un kit domicile et un kit extérieur');
etat().basculerEquipement('kit-destiny-classique');
ok(!etat().equipementActif.maillot, 'rebasculer retire le kit');
ok(etat().octroyerCosmetique('kit-champion', 'titre') && etat().equipements.includes('kit-champion') && !etat().octroyerCosmetique('kit-champion', 'titre'), 'une récompense s’octroie une seule fois');

// ── 5. Le kit entre dans le match ────────────────────────────────────────────────────────────────
const actif = { maillot: 'kit-destiny-classique', maillotExt: 'kit-retro-80' } as const;
ok(kitDeMonEquipe(actif, true) === EQUIPEMENT_PAR_ID['kit-destiny-classique'].kit, 'à domicile : le kit domicile');
ok(kitDeMonEquipe(actif, false) === EQUIPEMENT_PAR_ID['kit-retro-80'].kit, 'à l’extérieur : le kit extérieur');
ok(kitDeMonEquipe({ maillot: 'kit-destiny-classique' }, false) === EQUIPEMENT_PAR_ID['kit-destiny-classique'].kit, 'à l’extérieur sans kit extérieur : le kit domicile (la scène l’adapte si les couleurs se confondent)');
ok(kitDeMonEquipe({}, true) === undefined, 'aucun kit : l’équipe garde son maillot');
ok(maillotDepuisKit(EQUIPEMENT_PAR_ID['kit-destiny-nuit'].kit!).motif === 'diagonale', 'les paramètres du kit passent tels quels à la scène');

// ── 6. Le Labo ───────────────────────────────────────────────────────────────────────────────────
const valide = { id: 'lab-test1', nom: 'Maillot test', categorie: 'maillot', emoji: '🎽', glb: '/m3d/ailleurs.glb', prixDef: { mode: 'OVAS_OR_CREDITS', ovas: 100, credits: 20 }, rarete: 'rare', publie: true,
  kit: { principal: '#112233', secondaire: '#ffffff', accent: '#ffffff', short: '#000000', chaussettes: '#112233', motif: 'rayures' } };
const article = validerArticleLabo(valide);
ok(article.glb === '/m3d/maillot.glb', 'le modèle d’un maillot du Labo est TOUJOURS celui du jeu, quoi que le formulaire envoie');
for (const [nom, mauvais] of [
  ['identifiant', { ...valide, id: 'test' }], ['catégorie', { ...valide, categorie: 'stade' }], ['prix négatif', { ...valide, prixDef: { mode: 'OVAS', ovas: -5 } }],
  ['couleur', { ...valide, kit: { ...valide.kit, principal: 'rouge' } }], ['motif', { ...valide, kit: { ...valide.kit, motif: 'pois' } }],
  ['modèle 3D hors /m3d', { ...valide, categorie: 'casque', glb: 'https://exemple.fr/x.glb' }], ['dates inversées', { ...valide, dispoDu: '2026-12-01', dispoAu: '2026-11-01' }],
  ['atlas trop lourd', { ...valide, kit: { ...valide.kit, jerseyTexture: 'data:image/png;base64,' + 'A'.repeat(260000) } }],
] as const) assert.throws(() => validerArticleLabo(mauvais), undefined, `refusé : ${nom}`), total++;
enregistrerArticlesLabo([article, { ...article, id: 'lab-cache', publie: false }, { ...article, id: 'crampons-or' }]);
ok(!!EQUIPEMENT_PAR_ID['lab-test1'] && EQUIPEMENT_PAR_ID['crampons-or'].origine !== 'labo', 'un article du Labo entre au catalogue sans écraser celui du code');
ok(!estEnVente(EQUIPEMENT_PAR_ID['lab-cache']), 'un article du Labo non publié ne se vend pas');
enregistrerArticlesLabo([]);
ok(!EQUIPEMENT_PAR_ID['lab-test1'], 'relire le catalogue retire les anciens articles du Labo');

// ── 7. Le coffre du compte : Crédits comme Ovas ──────────────────────────────────────────────────
const coffre: EtatBoutiqueCompte = { ovas: 10, achatsOvas: 0, credits: 100, achatsCredits: 0, cosmetiquesMeta: {}, collectionSolo: etatCollectionSoloVide(), inventaire: ['classique'], skinActif: 'classique', equipements: ['kit-destiny-classique'], equipementActif: { maillot: 'kit-destiny-classique', maillotExt: 'kit-destiny-classique' }, traitsDebloques: [] };
ok(validerEtatBoutiqueCompte(coffre) !== null, 'un coffre avec Crédits, kits et emplacements extérieurs est valide');
ok(validerEtatBoutiqueCompte({ ...coffre, credits: -1 }) === null && validerEtatBoutiqueCompte({ ...coffre, credits: 1.5 }) === null, 'des Crédits négatifs ou décimaux sont refusés');
ok(validerEtatBoutiqueCompte({ ...coffre, equipementActif: { maillot: 'kit-inconnu' } }) === null, 'équiper un kit non possédé est refusé côté serveur');
ok(validerEtatBoutiqueCompte({ ...coffre, equipementActif: { stade: 'x' } as never }) === null, 'la catégorie stade n’existe plus');
const apres = { ...coffre, credits: 70 };
const diff = differencesBoutiqueCompte(coffre, apres);
ok(diff.credits === 70 && validerModificationsBoutiqueCompte(diff) !== null, 'une dépense de Crédits traverse le réseau comme un delta valide');
ok(validerModificationsBoutiqueCompte({ ...diff, credits: -3 }) === null, 'un delta négatif est refusé');
// Un paiement confirmé entre-temps (+600 côté serveur) n'est jamais effacé par une sauvegarde locale plus ancienne.
const serveur = { ...coffre, credits: 700, achatsCredits: 600 };
const fusion = appliquerModificationsBoutiqueCompte(serveur, diff);
ok(fusion.credits === 670 && fusion.achatsCredits === 600, 'dépense locale (−30) + achat serveur (+600) : 670 Crédits, rien d’écrasé');

// ── 8. Les fenêtres d'achat ──────────────────────────────────────────────────────────────────────
let soldes = { ovas: 0, credits: 0 };
fournirSoldes(() => soldes);
async function attendre<T>(p: Promise<T>, f: () => void): Promise<T> { await new Promise((r) => setTimeout(r, 20)); f(); return p; }
soldes = { ovas: 500, credits: 0 };
ok((await demanderPaiement({ titre: 'x', prix: prixOvas(100) })) === 'ovas' && lireEtatAchat().etape === null, 'assez d’Ovas : aucune fenêtre');
soldes = { ovas: 10, credits: 5 };
let p = demanderPaiement({ titre: 'Pack', prix: prixLesDeux(100) });
await new Promise((r) => setTimeout(r, 20));
ok(lireEtatAchat().etape === 'choix', 'deux monnaies : le joueur CHOISIT');
choisirDevise('ovas');
ok(lireEtatAchat().etape === 'insuffisant' && lireEtatAchat().devise === 'ovas', 'Ovas insuffisants : une vraie fenêtre, pas un message');
choisirDevise('credits');
ok(lireEtatAchat().etape === 'insuffisant' && lireEtatAchat().devise === 'credits', 'Crédits insuffisants aussi (aucune recharge : le jeu ne vend rien)');
annulerAchat();
ok((await p) === null && lireEtatAchat().etape === null, 'renoncer ne débite et n’achète rien');
soldes = { ovas: 0, credits: 100 };
p = demanderPaiement({ titre: 'Stade', prix: prixCredits(40), devise: 'credits' });
await new Promise((r) => setTimeout(r, 20));
ok(lireEtatAchat().etape === 'confirmation', 'dépenser des Crédits demande TOUJOURS une confirmation');
soldes = { ovas: 0, credits: 10 };
confirmerAchat();
ok(lireEtatAchat().etape === 'insuffisant', 'si le solde a baissé pendant la fenêtre, on ne confirme pas');
annulerAchat(); await p;
soldes = { ovas: 0, credits: 100 };
p = demanderPaiement({ titre: 'Stade', prix: prixCredits(40), devise: 'credits' });
ok((await attendre(p, () => confirmerAchat())) === 'credits', 'confirmé : on rend la monnaie à débiter');

// ── 9. Les packs de la collection solo ───────────────────────────────────────────────────────────
ok(devisesAcceptees(prixPackSoloArticle({ id: 'top14', prix: 210, monnaie: undefined, prixCredits: undefined })).join() === 'ovas,credits', 'un pack payant accepte les deux monnaies par défaut');
ok(montantEn(prixPackSoloArticle({ id: 'top14', prix: 210 }), 'credits') === 42, 'prix en Crédits déduit : 210 Ovas → 42');
ok(montantEn(prixPackSoloArticle({ id: 'x', prix: 100, monnaie: 'CREDITS', prixCredits: 33 }), 'credits') === 33 && montantEn(prixPackSoloArticle({ id: 'x', prix: 100, monnaie: 'CREDITS', prixCredits: 33 }), 'ovas') === 100, 'un pack réglé « Crédits seulement » dans le Labo s’ouvre aussi en Ovas');
remise({ coins: 100, credits: 50 });
const tirage = (e: ReturnType<typeof etatCollectionSoloVide>) => ({ etat: { ...e, doublons: e.doublons + 1 }, indices: [0], nouvelles: 1 });
ok(etat().acheterPackCollectionSolo(30, tirage as never, 'credits') !== null && etat().credits === 20 && etat().coins === 100, 'un pack payé en Crédits ne touche pas aux Ovas');
ok(etat().acheterPackCollectionSolo(30, tirage as never, 'credits') === null && etat().credits === 20, 'Crédits insuffisants : rien n’est débité');

console.log(`OK — ${total} contrôles de la boutique : monnaies, prix, achats, inventaire, kits, Labo, coffre, fenêtres d’achat.`);
