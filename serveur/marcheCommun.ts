// LE MARCHÉ COMMUN DES DIVISIONS PUBLIQUES — le déroulé (Correctif 24, points 13 à 15)
//
// Les règles sont dans `src/lib/ligue/marchePartage.ts` (le document commun) et dans `operationMarcheCarriere`
// (ce qu'une étape fait dans UNE ligue). Ici : dans quel ordre on écrit, et comment on reprend après une coupure.
//
// ═══ UN ACHAT, PAS À PAS ═════════════════════════════════════════════════════
//
//   1. RÉSERVER   — ligue de l'acheteur : ses Ovas sont débités et notés « réservés ». Refusé s'il n'a pas de quoi.
//   2. RÉCLAMER   — document commun, écrit par comparaison de version : L'INSTANT OÙ L'ACHAT EST DÉCIDÉ. De deux
//                   acheteurs simultanés, un seul passe ; l'autre est remboursé (3 bis) et lit « plus disponible ».
//   3. SOLDER     — ligue du vendeur : la carte quitte son effectif, il est payé.
//   4. LIVRER     — ligue de l'acheteur : la carte arrive, la réserve est consommée.
//   5. L'annonce quitte le document.
//
// Entre 2 et 5 le document dit ce qu'il reste à faire (`acheteur.solde`, `acheteur.livre`) : si la fonction s'arrête au
// milieu, n'importe quelle requête suivante reprend (`entretenir`). Chaque étape de ligue est rejouable sans effet.
// La carte n'existe jamais deux fois : elle n'est créée chez l'acheteur que pour l'unique réclamation enregistrée.
//
// ⚠️ SANS LA TABLE `carriere_marches`, RIEN DE TOUT CELA NE S'ARME (`disponible`) : chaque division garde son marché.
import type { CarteCarriere, CommandeCarriere, EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere.js';
import { agirCarriere, operationMarcheCarriere, type OperationMarche } from '../src/lib/ligue/carriere.js';
import {
  annulerAnnonce, echeancesMarche, ErreurMarche, estIdDeVente, idMarchePublic, ligueDeLaVente, marcheVide, noterEtape, placerEnchere,
  publierAnnonce, reclamerAnnonce, refReserve, reserveJustifiee, travailEnAttente, vueMarchePartage,
  type AnnoncePartagee, type EtatMarchePartage, type PartieMarche, type VueMarchePartage,
} from '../src/lib/ligue/marchePartage.js';
import type { StockageCarriere } from './carriereStockage.js';
import { carteSeniorAutorisee } from '../src/lib/ligue/eligibiliteJoueurs.js';

type Operation = (etat: EtatCarriereEnLigne, maintenant: number, graine: string) => EtatCarriereEnLigne;
export interface DependancesMarche {
  stockage: StockageCarriere;
  /** L'écriture d'une ligue par comparaison de version (celle de l'API). `verifierRecu` : la requête d'un client ne passe qu'une fois. */
  appliquer(ligue: string, compte: string, requete: string, operation: Operation, verifierRecu: boolean): Promise<EtatCarriereEnLigne>;
  /** L'état à jour d'une ligue (`null` : elle n'existe plus). */
  lireEtat(ligue: string): Promise<EtatCarriereEnLigne | null>;
  /** Une erreur que l'API rend telle quelle au client. */
  refus(statut: number, message: string): Error;
}
type CompteMarche = { id: string; identifiant?: string };

const COMMANDES = new Set(['vendre', 'acheter', 'encherir', 'annulerVente']);
/** Une réserve plus jeune que cela appartient peut-être à un achat EN COURS : on n'y touche pas. */
const AGE_RESERVE_ORPHELINE = 90_000;

export function creerMarcheCommun({ stockage, appliquer, lireEtat, refus }: DependancesMarche) {
  let pose: boolean | undefined;
  let verifieLe = 0;
  /** La table existe-t-elle ? Vrai une fois pour toutes ; faux revérifié chaque minute (la migration peut arriver). */
  async function disponible(): Promise<boolean> {
    if (!stockage.lireMarche || !stockage.comparerEtEcrireMarche) return false;
    if (pose) return true;
    if (pose === false && Date.now() - verifieLe < 60_000) return false;
    verifieLe = Date.now();
    pose = (await stockage.lireMarche(idMarchePublic(0)).catch(() => undefined)) !== undefined;
    return pose;
  }

  async function lire(cycle: number): Promise<{ marche: EtatMarchePartage; revision: number | null }> {
    const lu = await stockage.lireMarche!(idMarchePublic(cycle));
    if (lu === undefined) throw refus(503, 'Le marché commun est momentanément indisponible.');
    return lu ? { marche: lu.donnees as EtatMarchePartage, revision: lu.revision } : { marche: marcheVide(cycle), revision: null };
  }
  /**
   * Modifie le document commun. La modification est REJOUÉE sur le document relu tant que quelqu'un d'autre a écrit
   * entre-temps : c'est là qu'un second acheteur découvre que l'annonce est partie (`reclamerAnnonce` lève son refus).
   */
  async function muter<T>(cycle: number, modifier: (m: EtatMarchePartage) => T): Promise<{ resultat: T; marche: EtatMarchePartage; revision: number }> {
    for (let essai = 0; essai < 16; essai++) {
      const { marche, revision } = await lire(cycle);
      const m = structuredClone(marche);
      const avant = JSON.stringify(m);
      const resultat = modifier(m);
      if (JSON.stringify(m) === avant) return { resultat, marche: m, revision: revision ?? 0 };
      if (await stockage.comparerEtEcrireMarche!(idMarchePublic(cycle), revision, m)) return { resultat, marche: m, revision: (revision ?? 0) + 1 };
    }
    throw refus(409, 'Le marché est très sollicité. Réessayez dans un instant.');
  }
  const enRefus = (erreur: unknown) => (erreur instanceof ErreurMarche ? refus(409, erreur.message) : erreur);

  /** Une étape dans une ligue, au nom du serveur. Rend `undefined` si la ligue n'existe plus. */
  async function etape(ligue: string, op: OperationMarche): Promise<{ fait: boolean; carte?: CarteCarriere } | undefined> {
    let fait = false, carte: CarteCarriere | undefined;
    try {
      await appliquer(ligue, 'horloge', `marche-${op.type}`, (e, n) => {
        const r = operationMarcheCarriere(e, op, n);
        fait = r.fait; carte = r.carte;
        return r.etat;
      }, false);
    } catch (erreur) {
      if ((erreur as { statut?: number }).statut === 404) return undefined;
      throw erreur;
    }
    return { fait, carte };
  }

  const partie = (etat: EtatCarriereEnLigne, compteId: string): PartieMarche => {
    const club = etat.clubs.find((c) => c.compteId === compteId);
    if (!club) throw refus(404, 'Ligue introuvable.');
    return { ligueId: etat.id, clubId: club.id, pseudo: club.pseudo, nom: club.nom, division: etat.publique!.division };
  };

  /** Solde le vendeur puis livre l'acheteur. Rejouable : le document dit ce qui est déjà fait. */
  async function conclure(cycle: number, annonceId: string): Promise<void> {
    let a = (await lire(cycle)).marche.annonces.find((x) => x.id === annonceId);
    if (!a || a.etat !== 'reclamee' || !a.acheteur) return;
    if (!carteSeniorAutorisee(a.carte, 'mixed')) return;
    if (!a.acheteur.solde) {
      const r = await etape(a.vendeur.ligueId, { type: 'solder', venteId: a.id, montant: a.acheteur.montant, acheteur: `${a.acheteur.nom} · D${a.acheteur.division}` });
      // La carte part telle qu'elle est AUJOURD'HUI chez le vendeur (ses matchs joués depuis la mise en vente comptent).
      a = (await muter(cycle, (m) => { noterEtape(m, annonceId, 'solde', r?.carte); return m.annonces.find((x) => x.id === annonceId); })).resultat;
      if (!a?.acheteur) return;
    }
    if (!a.acheteur.livre) {
      await etape(a.acheteur.ligueId, { type: 'livrer', clubId: a.acheteur.clubId, ref: refReserve(a.id, a.acheteur.montant), carte: a.carte });
      await muter(cycle, (m) => noterEtape(m, annonceId, 'livre'));
    }
  }

  const entretiens = new Map<number, Promise<void>>();
  /** Les suites dues dans les ligues : échéances, remboursements, annonces retirées, ventes à conclure. */
  function entretenir(cycle: number): Promise<void> {
    const enCours = entretiens.get(cycle);
    if (enCours) return enCours;
    const travail = (async () => {
      const { marche } = await muter(cycle, (m) => { echeancesMarche(m, Date.now()); });
      for (const r of marche.remboursements) {
        await etape(r.ligueId, { type: 'restituer', clubId: r.clubId, ref: r.ref, libelle: 'Enchère dépassée : Ovas restitués' });
        await muter(cycle, (m) => { m.remboursements = m.remboursements.filter((x) => !(x.ligueId === r.ligueId && x.clubId === r.clubId && x.ref === r.ref)); });
      }
      for (const c of marche.clotures) {
        await etape(c.ligueId, { type: 'clore', venteId: c.venteId, issue: c.issue });
        await muter(cycle, (m) => { m.clotures = m.clotures.filter((x) => x.venteId !== c.venteId); });
      }
      for (const a of marche.annonces) if (a.etat === 'reclamee') await conclure(cycle, a.id);
    })().finally(() => entretiens.delete(cycle));
    entretiens.set(cycle, travail);
    return travail;
  }

  /**
   * Ce qu'une coupure a pu laisser dans UNE ligue : une annonce écrite dans la ligue mais jamais publiée, une réserve
   * dont l'achat n'a jamais été réclamé. ⚠️ ON LIT LE DOCUMENT D'ABORD, PUIS LA LIGUE : dans l'autre ordre, une annonce
   * retirée entre les deux lectures serait republiée.
   */
  const reprises = new Map<string, number>();
  async function reprendreLigue(ligueId: string, cycle: number): Promise<void> {
    if (Date.now() - (reprises.get(ligueId) ?? 0) < 60_000) return;
    reprises.set(ligueId, Date.now());
    if (reprises.size > 2000) reprises.delete(reprises.keys().next().value!);
    const { marche } = await lire(cycle);
    const etat = await lireEtat(ligueId);
    if (!etat?.publique) return;
    const maintenant = Date.now();
    const oubliees = etat.ventes.filter((v) => v.partagee && v.etat === 'ouverte'
      && !marche.annonces.some((a) => a.id === v.id) && !marche.clotures.some((c) => c.venteId === v.id));
    for (const v of oubliees) {
      const annonce = annonceDepuisVente(etat, v.id);
      if (annonce) await muter(cycle, (m) => { if (!m.clotures.some((c) => c.venteId === v.id)) publierAnnonce(m, annonce); });
    }
    for (const club of etat.clubs) {
      for (const r of club.reservesMarche ?? []) {
        if (maintenant - Date.parse(r.le) < AGE_RESERVE_ORPHELINE || reserveJustifiee(marche, etat.id, club.id, r.ref)) continue;
        await etape(etat.id, { type: 'restituer', clubId: club.id, ref: r.ref, libelle: 'Achat non abouti : Ovas restitués' });
      }
    }
  }

  function annonceDepuisVente(etat: EtatCarriereEnLigne, venteId: string): AnnoncePartagee | undefined {
    const v = etat.ventes.find((x) => x.id === venteId);
    const carte = v && etat.cartes.find((c) => c.id === v.carteId);
    const club = v && etat.clubs.find((c) => c.id === v.vendeurId);
    if (!v || !carte || !club || !etat.publique) return undefined;
    if (!carteSeniorAutorisee(carte, 'mixed')) return undefined;
    return {
      id: v.id, vendeur: { ligueId: etat.id, clubId: club.id, pseudo: club.pseudo, nom: club.nom, division: etat.publique.division },
      carte: structuredClone(carte), type: v.type, prix: v.prix, publieLe: new Date().toISOString(), expireLe: v.expireLe, etat: 'ouverte',
    };
  }

  /**
   * Une commande de marché dans une division publique. Rend le nouvel état de la ligue du demandeur, ou `null` si la
   * commande n'est pas pour le marché commun (ligue privée, table absente, ancienne annonce restée locale).
   */
  async function traiter(etat: EtatCarriereEnLigne, compte: CompteMarche, commande: Record<string, unknown>, requete: string): Promise<EtatCarriereEnLigne | null> {
    if (typeof commande.type !== 'string' || !COMMANDES.has(commande.type)) return null;
    if (!etat.publique || !(await disponible())) return null;
    const cycle = etat.publique.cycle;
    const moi = partie(etat, compte.id);

    if (commande.type === 'vendre') {
      let nouvelle: string | undefined;
      const suivant = await appliquer(etat.id, compte.id, requete, (e, n, g) => {
        const s = agirCarriere(e, compte.id, { ...(commande as unknown as Extract<CommandeCarriere, { type: 'vendre' }>), partagee: true }, n, g, compte.identifiant === 'kiri');
        nouvelle = s.ventes.at(-1)?.id;
        return s;
      }, true);
      const annonce = nouvelle ? annonceDepuisVente(suivant, nouvelle) : undefined;
      if (annonce) await muter(cycle, (m) => publierAnnonce(m, annonce));
      return suivant;
    }

    const venteId = commande.venteId;
    if (!estIdDeVente(venteId)) return null;
    const { marche } = await lire(cycle);
    const annonce = marche.annonces.find((a) => a.id === venteId);
    // Une annonce de MA ligue qui n'est pas sur le marché commun : ancienne vente locale, la ligue la traite seule.
    if (!annonce && ligueDeLaVente(venteId) === etat.id && !etat.ventes.find((v) => v.id === venteId)?.partagee) return null;

    if (commande.type === 'annulerVente') {
      try { await muter(cycle, (m) => annulerAnnonce(m, venteId, moi)); } catch (erreur) { throw enRefus(erreur); }
      await entretenir(cycle);
      return (await lireEtat(etat.id)) ?? etat;
    }

    // Un client qui renvoie la MÊME requête (réseau coupé avant la réponse) : elle a déjà été servie, on lui rend sa ligue.
    if (await stockage.dejaTraitee(etat.id, compte.id, requete)) return (await lireEtat(etat.id)) ?? etat;
    if (!annonce || annonce.etat !== 'ouverte') throw refus(409, commande.type === 'acheter' ? 'Cette vente n’est plus disponible.' : 'Cette enchère est fermée.');
    const montant = commande.type === 'acheter' ? annonce.prix : Number(commande.montant);
    if (!Number.isSafeInteger(montant) || montant < 1 || montant > 1_000_000) throw refus(400, 'Montant ou nombre invalide.');
    const ref = refReserve(annonce.id, montant);
    let appelee = false, reservee = false;
    await appliquer(etat.id, compte.id, requete, (e, n) => {
      appelee = true;
      const r = operationMarcheCarriere(e, { type: 'reserver', compteId: compte.id, ref, montant, carte: annonce.carte, clubLibre: commande.type === 'acheter',
        libelle: commande.type === 'acheter' ? `Achat sur le marché commun : ${annonce.carte.nom}` : 'Ovas réservés pour une enchère' }, n);
      reservee = r.fait;
      return r.etat;
    }, true);
    // Requête déjà traitée (un client qui renvoie la même) : rien à refaire.
    if (!appelee) return (await lireEtat(etat.id)) ?? etat;
    try {
      await muter(cycle, (m) => (commande.type === 'acheter'
        ? reclamerAnnonce(m, annonce.id, moi, Date.now())
        : placerEnchere(m, annonce.id, moi, montant, Date.now())));
    } catch (erreur) {
      // ⚠️ ON NE REND QUE CE QUE CETTE REQUÊTE A RÉSERVÉ. Une réserve qui existait déjà est celle d'une enchère en cours.
      if (reservee) await etape(etat.id, { type: 'restituer', clubId: moi.clubId, ref, libelle: 'Achat non abouti : Ovas restitués' });
      throw enRefus(erreur);
    }
    // L'achat est acquis dès la réclamation : si la suite échoue ici, la prochaine requête la reprendra.
    await entretenir(cycle).catch(() => {});
    return (await lireEtat(etat.id)) ?? etat;
  }

  /** Le marché commun vu d'une division. `connue` : la révision que l'écran a déjà. */
  async function vue(etat: EtatCarriereEnLigne, connue: number | null): Promise<VueMarchePartage | { inchange: true } | { indisponible: true }> {
    if (!etat.publique || !(await disponible())) return { indisponible: true };
    const cycle = etat.publique.cycle;
    let lu = await lire(cycle);
    if (travailEnAttente(lu.marche, Date.now())) {
      await entretenir(cycle).catch(() => {});
      lu = await lire(cycle);
    }
    await reprendreLigue(etat.id, cycle).catch(() => {});
    const revision = lu.revision ?? 0;
    if (connue !== null && connue === revision) return { inchange: true };
    return vueMarchePartage(lu.marche, revision, etat.id, Date.now());
  }

  return { disponible, traiter, vue, entretenir, reprendreLigue };
}
