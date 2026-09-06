import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { agirCarriere, avancerCarriere as actualiserCarriere, creerCarriere, vueCarriere } from '../src/lib/ligue/carriere.js';
import type { CommandeCarriere, EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere.js';
import type { CompteStocke, LigueStockee, StockageCarriere } from './carriereStockage.js';

export interface RequeteCarriere {
  method?: string; url?: string; body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}
export interface ReponseCarriere {
  status(code: number): ReponseCarriere;
  setHeader(nom: string, valeur: string): unknown;
  json(contenu: unknown): unknown;
  /**
   * Réponse binaire — le relais d'écussons, et rien d'autre. Facultative :
   * un hôte qui ne la fournit pas rend simplement les écussons distants tels
   * qu'ils sont, sans détourage.
   */
  envoyer?(donnees: Uint8Array): unknown;
}
class ErreurHttp extends Error { constructor(public statut: number, message: string) { super(message); } }
const COOKIE = 'destiny_carriere';
const DUREE_SESSION = 30 * 24 * 60 * 60_000;
const chiffrer = promisify(scrypt);
export const empreinteJeton = (valeur: string) => createHash('sha256').update(valeur).digest('hex');
const entete = (req: RequeteCarriere, nom: string) => String(req.headers[nom] ?? '');
const objet = (x: unknown): Record<string, unknown> => {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new ErreurHttp(400, 'Demande invalide.');
  return x as Record<string, unknown>;
};
const texte = (x: unknown, min: number, max: number, nom: string): string => {
  if (typeof x !== 'string' || x.trim().length < min || x.trim().length > max || /\p{Cc}/u.test(x)) {
    throw new ErreurHttp(400, `${nom} : entre ${min} et ${max} caractères.`);
  }
  return x.trim();
};
const idValide = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function hacherMotDePasse(mot: string): Promise<string> {
  const sel = randomBytes(16).toString('hex');
  const cle = await chiffrer(mot, sel, 64) as Buffer;
  return `scrypt$${sel}$${cle.toString('hex')}`;
}
export async function verifierMotDePasse(mot: string, empreinte: string): Promise<boolean> {
  const [algo, sel, attendu] = empreinte.split('$');
  if (algo !== 'scrypt' || !sel || !attendu || attendu.length !== 128) return false;
  const cle = await chiffrer(mot, sel, 64) as Buffer;
  return timingSafeEqual(cle, Buffer.from(attendu, 'hex'));
}
function lireJeton(req: RequeteCarriere) {
  return entete(req, 'cookie').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? '';
}
function cookie(req: RequeteCarriere, res: ReponseCarriere, jeton: string, expire = false) {
  const securise = entete(req, 'x-forwarded-proto') === 'https' || process.env.VERCEL === '1';
  res.setHeader('Set-Cookie', `${COOKIE}=${jeton}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${expire ? 0 : DUREE_SESSION / 1000}${securise ? '; Secure' : ''}`);
}
function protegerOrigine(req: RequeteCarriere) {
  if (req.method !== 'POST') return;
  if (!entete(req, 'content-type').toLowerCase().startsWith('application/json')) throw new ErreurHttp(415, 'Une demande JSON est requise.');
  if (entete(req, 'sec-fetch-site') === 'cross-site') throw new ErreurHttp(403, 'Origine de la demande refusée.');
  const origine = entete(req, 'origin');
  if (origine) {
    let hote = '';
    try { hote = new URL(origine).host; } catch { throw new ErreurHttp(403, 'Origine invalide.'); }
    if (hote !== entete(req, 'host')) throw new ErreurHttp(403, 'Origine de la demande refusée.');
  }
}

/** Aucune empreinte, graine ou identité privée ne part dans la vue. */
const publicCompte = (c: CompteStocke) => ({ id: c.id, pseudo: c.pseudo });
const comptesEtat = (e: EtatCarriereEnLigne) => e.clubs.map(c => c.compteId);

export function creerGestionnaireCarriere(stockage: StockageCarriere) {
  async function appliquer(id: string, compte: string, requete: string,
    operation: (etat: EtatCarriereEnLigne, maintenant: number, graine: string) => EtatCarriereEnLigne,
    autoriserInscription = false) {
    for (let tentative = 0; tentative < 8; tentative++) {
      const ligne = await stockage.ligue(id);
      if (!ligne || (!autoriserInscription && compte !== 'horloge' && !ligne.comptes.includes(compte))) {
        throw new ErreurHttp(404, 'Ligue introuvable.');
      }
      if (await stockage.dejaTraitee(id, compte, requete)) return ligne.etat;
      const suivant = operation(ligne.etat, Date.now(), randomBytes(24).toString('hex'));
      const maj: LigueStockee = { ...ligne, etat: suivant, comptes: comptesEtat(suivant) };
      if (await stockage.comparerEtEcrire(maj, ligne.version, compte, requete)) return suivant;
    }
    throw new ErreurHttp(409, 'La ligue vient de changer. Réessayez dans un instant.');
  }
  async function avancerLigues() {
    const ids = await stockage.actives();
    let traitees = 0;
    for (const id of ids) {
      await appliquer(id, 'horloge', `tick-${Math.floor(Date.now() / 15_000)}`, (e, n, g) => actualiserCarriere(e, n, g));
      traitees++;
    }
    return traitees;
  }
  async function handler(req: RequeteCarriere, res: ReponseCarriere) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.method !== 'GET' && req.method !== 'POST') throw new ErreurHttp(405, 'Méthode non autorisée.');
      protegerOrigine(req);
      const url = new URL(req.url ?? '/api/carriere', 'http://localhost');
      if (url.searchParams.get('horloge') === '1') {
        const secret = process.env.CRON_SECRET;
        if (!secret || entete(req, 'authorization') !== `Bearer ${secret}`) throw new ErreurHttp(401, 'Connexion requise.');
        return res.status(200).json({ liguesActualisees: await avancerLigues() });
      }
      // ⚠️ Les écussons se demandent à part, PAS dans la vue de la ligue :
      // 1 353 entrées, soit 80 Ko qui repartiraient toutes les deux secondes
      // pendant un direct. La liste est publique et ne change jamais, donc
      // elle se met en cache côté navigateur.
      if (url.searchParams.get('emblemes') === '1') {
        const { emblemesCarriere, competitionsCarriere, tropheesCarriere } = await import('../src/lib/ligue/catalogueCarriere.js');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).json({ groupes: emblemesCarriere(), competitions: competitionsCarriere(), trophees: tropheesCarriere() });
      }
      // ═══════════════════════════════════════════════════════════════════
      // LE RELAIS D'ÉCUSSONS
      // ═══════════════════════════════════════════════════════════════════
      // 599 écussons de Fédérale et de Régionale sont servis par l'API de la
      // FFR, qui renvoie `Access-Control-Allow-Origin: monclubhouse.ffr.fr` :
      // dessinés sur un canvas, ils le souillent, et on ne peut donc pas leur
      // enlever leur fond blanc. Relayés par NOTRE origine, ils redeviennent
      // détourables comme les 754 autres.
      //
      // ⚠️ CE N'EST PAS UN PROXY OUVERT, ET ÇA NE DOIT JAMAIS LE DEVENIR.
      // `emblemeValide` est une liste blanche fermée, construite depuis les
      // données du jeu : seule une URL qui y figure déjà est relayée. Sans ce
      // contrôle, n'importe qui ferait de notre serveur un relais anonyme vers
      // n'importe quelle adresse — y compris nos propres services internes.
      const ecusson = url.searchParams.get('ecusson');
      if (ecusson) {
        const { emblemeValide } = await import('../src/lib/ligue/catalogueCarriere.js');
        if (!emblemeValide(ecusson) || !ecusson.startsWith('https://')) {
          throw new ErreurHttp(404, 'Écusson inconnu.');
        }
        if (!res.envoyer) throw new ErreurHttp(501, 'Relais indisponible sur cet hôte.');
        const amont = await fetch(ecusson, { signal: AbortSignal.timeout(8000) });
        if (!amont.ok) throw new ErreurHttp(502, 'Écusson indisponible à la source.');
        const type = amont.headers.get('content-type') ?? '';
        if (!type.startsWith('image/')) throw new ErreurHttp(502, 'La source n’a pas renvoyé une image.');
        const octets = new Uint8Array(await amont.arrayBuffer());
        if (octets.byteLength > 3_000_000) throw new ErreurHttp(502, 'Écusson trop volumineux.');
        res.setHeader('Content-Type', type);
        // Une semaine : ces écussons ne changent jamais, et chaque relais est
        // un aller-retour vers un serveur qui n'est pas le nôtre.
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        res.status(200);
        return res.envoyer(octets);
      }

      const maintenant = Date.now();
      const corps = req.method === 'POST' ? objet(typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};
      if (JSON.stringify(corps).length > 24_000) throw new ErreurHttp(413, 'Demande trop volumineuse.');
      const action = corps.action;
      if (action === 'inscription' || action === 'connexion') {
        const identifiant = texte(corps.identifiant, 3, 100, 'Identifiant').toLocaleLowerCase('fr');
        if (!/^[a-z0-9@._+-]+$/.test(identifiant)) throw new ErreurHttp(400, 'Utilisez un identifiant sans espaces ni accents.');
        // L'IP n'est jamais stockée en clair. La limite compte reste commune aux appareils.
        const ip = entete(req, 'x-forwarded-for').split(',')[0] || req.socket?.remoteAddress || 'local';
        const autorisations = await Promise.all([
          stockage.limiter(empreinteJeton(`connexion:${identifiant}`), 15, 15 * 60_000, maintenant),
          stockage.limiter(empreinteJeton(`adresse:${ip}`), 80, 15 * 60_000, maintenant),
        ]);
        if (autorisations.some(v => !v)) throw new ErreurHttp(429, 'Trop de tentatives. Patientez quelques minutes.');
        const mot = texte(corps.motDePasse, 10, 200, 'Mot de passe');
        let compte = await stockage.compteParIdentifiant(identifiant);
        if (action === 'inscription') {
          if (compte) throw new ErreurHttp(409, 'Cet identifiant est déjà utilisé.');
          compte = { id: randomUUID(), identifiant, pseudo: texte(corps.pseudo, 2, 20, 'Pseudo'), empreinte: await hacherMotDePasse(mot) };
          if (!await stockage.creerCompte(compte)) throw new ErreurHttp(409, 'Cet identifiant est déjà utilisé.');
        } else {
          if (!compte) { await hacherMotDePasse(mot); throw new ErreurHttp(401, 'Identifiant ou mot de passe incorrect.'); }
          if (!await verifierMotDePasse(mot, compte.empreinte)) throw new ErreurHttp(401, 'Identifiant ou mot de passe incorrect.');
        }
        const jeton = randomBytes(32).toString('hex');
        await stockage.ouvrirSession(empreinteJeton(jeton), compte.id, maintenant + DUREE_SESSION);
        cookie(req, res, jeton);
        return res.status(200).json({ compte: publicCompte(compte) });
      }
      const jeton = lireJeton(req);
      const compte = jeton ? await stockage.session(empreinteJeton(jeton), maintenant) : null;
      if (!compte) throw new ErreurHttp(401, 'Connectez-vous pour retrouver vos ligues.');
      if (!await stockage.limiter(`jeu:${compte.id}`, 240, 60_000, maintenant)) throw new ErreurHttp(429, 'Trop de demandes. Patientez quelques secondes.');
      if (action === 'deconnexion') {
        await stockage.fermerSession(empreinteJeton(jeton)); cookie(req, res, '', true);
        return res.status(200).json({ ok: true });
      }
      if (req.method === 'GET') {
        const id = url.searchParams.get('ligue');
        if (!id) {
          const ligues = await stockage.ligues(compte.id);
          return res.status(200).json({ compte: publicCompte(compte), ligues: ligues.map(({ etat: e }) => {
            const club = e.clubs.find(c => c.compteId === compte.id)!;
            return {
              id: e.id, nom: e.nom, etat: e.phase, clubNom: club.nom, ovas: club.ovas,
              clubEmbleme: club.embleme, logo: e.logo,
            };
          }) });
        }
        if (!idValide(id)) throw new ErreurHttp(404, 'Ligue introuvable.');
        if (url.searchParams.get('collection') === '1') {
          const ligne = await stockage.ligue(id);
          if (!ligne || !ligne.comptes.includes(compte.id)) throw new ErreurHttp(404, 'Ligue introuvable.');
          const { collectionCarriere } = await import('../src/lib/ligue/collectionCarriere.js');
          return res.status(200).json(collectionCarriere(ligne.etat, compte.id, url.searchParams));
        }

        const e = await appliquer(id, compte.id, `lecture-${Math.floor(maintenant / 2000)}`, (e, n, g) => actualiserCarriere(e, n, g));
        return res.status(200).json(vueCarriere(e, compte.id));
      }
      if (action === 'creer') {
        if ((await stockage.ligues(compte.id)).length >= 20) throw new ErreurHttp(400, 'Vous participez déjà à 20 ligues.');
        if (corps.rythme !== 1 && corps.rythme !== 2) throw new ErreurHttp(400, 'Choisissez un ou deux matchs par semaine.');
        if (!Number.isInteger(corps.maxClubs) || Number(corps.maxClubs) < 2 || Number(corps.maxClubs) > 20) throw new ErreurHttp(400, 'Une ligue accueille de 2 à 20 clubs.');
        for (let essai = 0; essai < 3; essai++) {
          const id = randomUUID();
          const code = `DR-${randomBytes(5).toString('hex').toUpperCase()}`;
          const e = creerCarriere({ id, code, compteId: compte.id, pseudo: compte.pseudo,
            nom: texte(corps.nom, 3, 40, 'Nom de ligue'), clubNom: texte(corps.clubNom, 3, 40, 'Nom du club'),
            rythme: corps.rythme, maxClubs: Number(corps.maxClubs),
            embleme: corps.embleme,
            logo: corps.logo, tropheeId: corps.tropheeId, playoffs: corps.playoffs === true,
            dotationOvas: typeof corps.dotationOvas === 'number' ? corps.dotationOvas : undefined,
          }, maintenant, randomBytes(24).toString('hex'));
          if (await stockage.creerLigue({ id, code, etat: e, comptes: comptesEtat(e), version: 0 })) return res.status(201).json(vueCarriere(e, compte.id));
        }
        throw new ErreurHttp(409, 'Création en cours. Réessayez.');
      }
      if (action === 'rejoindre') {
        const code = texte(corps.code, 5, 30, 'Code').toUpperCase();
        const ligne = await stockage.ligueParCode(code);
        if (!ligne) throw new ErreurHttp(404, 'Code de ligue introuvable.');
        // ⚠️ UN LIEN D'INVITATION SE CLIQUE DEUX FOIS. On le range dans une
        // boucle de messages, on y revient le lendemain, on le rouvre depuis
        // l'historique du navigateur. La deuxième fois, la règle d'adhésion
        // répondait « Ce compte possède déjà un club dans cette ligue » — une
        // erreur, pour quelqu'un qui voulait simplement entrer chez lui.
        // Membre déjà inscrit : on ouvre la ligue, c'est tout ce qu'il demande.
        if (ligne.comptes.includes(compte.id)) {
          const e = await appliquer(ligne.id, compte.id, `lecture-${Math.floor(maintenant / 2000)}`, (e, n, g) => actualiserCarriere(e, n, g));
          return res.status(200).json(vueCarriere(e, compte.id));
        }
        const e = await appliquer(ligne.id, compte.id, `adhesion-${compte.id}`, (e, n, g) => agirCarriere(e, compte.id,
          { type: 'rejoindre', pseudo: compte.pseudo, clubNom: texte(corps.clubNom, 3, 40, 'Nom du club'), embleme: corps.embleme as string | undefined }, n, g), true);
        return res.status(200).json(vueCarriere(e, compte.id));
      }
      if (action === 'commande') {
        const id = texte(corps.ligue, 36, 36, 'Ligue');
        if (!idValide(id)) throw new ErreurHttp(404, 'Ligue introuvable.');
        const requete = texte(corps.requeteId, 16, 100, 'Requête');
        const commande = objet(corps.commande);
        if (commande.type === 'rejoindre') throw new ErreurHttp(400, 'Utilisez le code pour rejoindre la ligue.');
        const e = await appliquer(id, compte.id, requete, (e, n, g) => agirCarriere(e, compte.id, commande as unknown as CommandeCarriere, n, g));
        return res.status(200).json(vueCarriere(e, compte.id));
      }
      throw new ErreurHttp(400, 'Action inconnue.');
    } catch (erreur) {
      if (erreur instanceof ErreurHttp) return res.status(erreur.statut).json({ erreur: erreur.message });
      // Les erreurs de règles sont lisibles ; ne jamais exposer une erreur SQL ou une pile.
      if (erreur instanceof Error && erreur.name === 'ErreurCarriere') return res.status(400).json({ erreur: erreur.message });
      if (erreur instanceof SyntaxError || erreur instanceof TypeError) return res.status(400).json({ erreur: 'Demande invalide.' });
      // ⚠️ UNE BASE NON INITIALISÉE N'EST PAS UN SECRET, C'EST UN ÉTAT DE
      // DÉPLOIEMENT — et le taire coûte cher. Tant que les schémas SQL n'ont
      // pas été passés, TOUTE requête échouait sur un « réessayez dans un
      // instant » qui invitait justement à ne rien faire, alors qu'il manquait
      // une action précise. Postgres nomme ces deux cas : 42P01 (table
      // absente) et 42703 (colonne absente, typiquement `schema-carriere.sql`
      // passé sans `schema-ligues.sql`). On les distingue, sans jamais rendre
      // la requête ni la pile.
      const code = (erreur as { code?: string })?.code;
      if (code === '42P01' || code === '42703') {
        return res.status(503).json({
          erreur: 'La base de la Carrière en ligne n’est pas encore initialisée. '
            + 'Il reste à exécuter serveur/schema-ligues.sql puis serveur/schema-carriere.sql '
            + '(dans cet ordre) — voir serveur/MISE-EN-LIGNE.md.',
        });
      }
      return res.status(503).json({ erreur: 'Le serveur de carrière est indisponible. Réessayez dans un instant.' });
    }
  }
  return { handler, avancerLigues };
}
