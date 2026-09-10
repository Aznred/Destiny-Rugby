import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { configurationPush, envoyerPush, idPush, notifierMatchs, validerAbonnement } from './notificationsPush.js';
import { agirCarriere, avancerCarriere as actualiserCarriere, creerCarriere, empreinteEcriture, vueCarriere } from '../src/lib/ligue/carriere.js';
import { echeanceLigue } from '../src/lib/ligue/echeanceCarriere.js';
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
const publicCompte = (c: CompteStocke) => ({ id: c.id, pseudo: c.pseudo, administrateur: c.identifiant === 'kiri' });
const comptesEtat = (e: EtatCarriereEnLigne) => e.clubs.map(c => c.compteId);

export function creerGestionnaireCarriere(stockage: StockageCarriere, programmer?: (etat: EtatCarriereEnLigne) => Promise<void>) {
  const notifier = async (etat: EtatCarriereEnLigne) => {
    await programmer?.(etat);
    if (stockage.push) await notifierMatchs(stockage.push, etat).catch(() => console.warn('[push] Service temporairement indisponible'));
  };
  // Les fonctions serverless chaudes réutilisent ces caches. Une vérification
  // d'en-tête minuscule garde la cohérence entre instances sans retransférer
  // les centaines de Ko de la ligue à chaque sondage de direct.
  const liguesChaudes = new Map<string, LigueStockee>();
  const sessionsChaudes = new Map<string, { compte: CompteStocke; jusqua: number }>();
  const memoriserLigue = (id: string, ligne: LigueStockee) => {
    liguesChaudes.delete(id);
    liguesChaudes.set(id, ligne);
    if (liguesChaudes.size > 32) liguesChaudes.delete(liguesChaudes.keys().next().value as string);
  };
  async function lireLigue(id: string, connue?: { version: number; comptes: string[]; echeance: number | null }) {
    const cache = liguesChaudes.get(id);
    if (!cache) {
      const ligne = await stockage.ligue(id);
      if (ligne) memoriserLigue(id, ligne);
      return ligne;
    }
    const entete = connue ?? await stockage.entete(id);
    if (entete && entete.version === cache.etat.version) {
      const ligne = { ...cache, comptes: entete.comptes, echeance: entete.echeance };
      memoriserLigue(id, ligne); return ligne;
    }
    const ligne = await stockage.ligue(id);
    if (ligne) memoriserLigue(id, ligne); else liguesChaudes.delete(id);
    return ligne;
  }
  async function appliquer(id: string, compte: string, requete: string,
    operation: (etat: EtatCarriereEnLigne, maintenant: number, graine: string) => EtatCarriereEnLigne,
    autoriserInscription = false, verifierRecu = true,
    enteteConnue?: { version: number; comptes: string[]; echeance: number | null }) {
    for (let tentative = 0; tentative < 8; tentative++) {
      const ligne = await lireLigue(id, tentative === 0 ? enteteConnue : undefined);
      if (!ligne || (!autoriserInscription && compte !== 'horloge' && !ligne.comptes.includes(compte))) {
        throw new ErreurHttp(404, 'Ligue introuvable.');
      }
      if (verifierRecu && await stockage.dejaTraitee(id, compte, requete)) return ligne.etat;
      const maintenant = Date.now();
      const suivant = operation(ligne.etat, maintenant, randomBytes(24).toString('hex'));
      /**
       * ⚠️ UN ÉTAT IDENTIQUE NE SE RÉÉCRIT PAS — et c'était la plus grosse fuite
       * du mode. `avancerCarriere` incrémente `version` À CHAQUE APPEL, même
       * quand il n'a rien trouvé à faire : un simple sondage de lecture
       * renvoyait donc les 300 à 400 Ko de l'état vers la base, six fois par
       * minute et par onglet ouvert. Lecture PLUS écriture, pour rien.
       *
       * On compare donc l'état produit à celui qu'on a lu, en neutralisant le
       * compteur de version — le seul champ qui bouge toujours. Identiques : on
       * garde l'ancien, on n'écrit pas, et la version reste stable. C'est ce qui
       * rend la lecture conditionnelle possible plus bas : une version qui
       * s'incrémente toute seule ne dit plus rien à personne.
       *
       * ⚠️ ON REPOUSSE QUAND MÊME L'ÉCHÉANCE. Une date peut passer sans rien
       * changer (`echeanceCarriere` est volontairement large et retient parfois
       * une date qui n'était l'échéance de rien). Sans ce rafraîchissement,
       * l'échéance resterait éternellement dans le passé et chaque sondage
       * relirait l'état entier — exactement ce qu'on cherche à éviter.
       */
      const memeEtat = empreinteEcriture(suivant, ligne.etat.version) === empreinteEcriture(ligne.etat, ligne.etat.version);
      if (memeEtat) {
        const echeance = echeanceLigue(ligne.etat, maintenant);
        // En direct `echeanceLigue` vaut « maintenant » afin de laisser passer
        // chaque sondage. L'écrire toutes les deux secondes ne sert à rien :
        // l'ancienne échéance, déjà passée, produit exactement le même effet et
        // évite une UPDATE/WAL permanente pendant 80 minutes.
        if (echeance > maintenant && ligne.echeance !== echeance) await stockage.rafraichirEcheance(id, echeance).catch(() => {});
        // ⚠️ ON NE RÉÉCRIT PAS, MAIS ON REND BIEN L'ÉTAT AVANCÉ. Rendre l'état
        // LU ferait revivre indéfiniment la même seconde de match : pendant un
        // direct, la seule chose qui bouge est justement ce que
        // « empreinteEcriture » ignore — l'horloge, le score, le fil, le
        // terrain. Mesuré dans le navigateur : les trente joueurs restaient
        // figés, deux minutes durant.
        //
        // ⚠️ ET LA VERSION RESTE CELLE QUI EST STOCKÉE. « avancerCarriere »
        // l'incrémente à chaque appel ; la laisser filer rendrait au client des
        // numéros qui n'existent nulle part, et la première VRAIE écriture lui
        // reviendrait avec une version PLUS PETITE — que l'écran ignore, parce
        // qu'il refuse par principe de revenir en arrière.
        const avance = { ...suivant, version: ligne.etat.version };
        memoriserLigue(id, { ...ligne, etat: avance, echeance });
        await notifier(avance);
        return avance;
      }
      const maj: LigueStockee = { ...ligne, etat: suivant, comptes: comptesEtat(suivant) };
      if (await stockage.comparerEtEcrire(maj, ligne.version, compte, requete)) {
        memoriserLigue(id, { ...maj, version: ligne.version + 1, echeance: echeanceLigue(suivant, maintenant) });
        await notifier(suivant);
        return suivant;
      }
      liguesChaudes.delete(id);
    }
    throw new ErreurHttp(409, 'La ligue vient de changer. Réessayez dans un instant.');
  }
  async function avancerLigues() {
    const ids = await stockage.actives();
    let traitees = 0;
    for (const id of ids) {
      try {
        await appliquer(id, 'horloge', `tick-${randomUUID()}`, (e, n, g) => actualiserCarriere(e, n, g), false, false);
        traitees++;
      } catch { console.warn('[horloge] Une ligue sera reprise au prochain passage'); }
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
        // ⚠️ ET IL NE SUIT AUCUNE REDIRECTION. La liste blanche ne contrôle que
        // l'adresse DEMANDÉE : si l'un des serveurs autorisés répond un jour
        // « 302 vers http://169.254.169.254/… », c'est notre serveur qui va
        // chercher la page — et il le fait depuis l'intérieur, là où personne
        // d'autre n'a le droit d'aller. Une redirection est donc une erreur,
        // pas un détour : la liste blanche perd son sens dès qu'on la suit.
        const amont = await fetch(ecusson, { signal: AbortSignal.timeout(8000), redirect: 'manual' });
        if (amont.status >= 300 && amont.status < 400) throw new ErreurHttp(502, 'La source redirige : écusson refusé.');
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
        if (action === 'inscription' && corps.confirmationMotDePasse !== mot) throw new ErreurHttp(400, 'Les deux mots de passe ne correspondent pas.');
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
        sessionsChaudes.set(empreinteJeton(jeton), { compte, jusqua: maintenant + 60_000 });
        cookie(req, res, jeton);
        return res.status(200).json({ compte: publicCompte(compte) });
      }
      const jeton = lireJeton(req);
      const empreinteSession = jeton ? empreinteJeton(jeton) : '';
      const sessionChaude = empreinteSession ? sessionsChaudes.get(empreinteSession) : undefined;
      const compte = sessionChaude && sessionChaude.jusqua > maintenant ? sessionChaude.compte
        : empreinteSession ? await stockage.session(empreinteSession, maintenant) : null;
      if (compte && (!sessionChaude || sessionChaude.jusqua <= maintenant)) sessionsChaudes.set(empreinteSession, { compte, jusqua: maintenant + 60_000 });
      if (!compte) throw new ErreurHttp(401, 'Connectez-vous pour retrouver vos ligues.');
      // Un GET de sondage est une lecture sûre. Le limiter SQL écrivait une
      // ligne à chaque consultation et gonflait à lui seul le WAL / l'historique.
      if (req.method === 'POST' && !await stockage.limiter(`jeu:${compte.id}`, 240, 60_000, maintenant)) throw new ErreurHttp(429, 'Trop de demandes. Patientez quelques secondes.');
      if (action === 'deconnexion') {
        await stockage.fermerSession(empreinteSession); sessionsChaudes.delete(empreinteSession); cookie(req, res, '', true);
        return res.status(200).json({ ok: true });
      }
      if (url.searchParams.has('push') || action === 'push') {
        const configPush = configurationPush();
        const id = String(req.method === 'GET' ? url.searchParams.get('ligue') ?? '' : corps.ligue ?? '');
        const membre = idValide(id) ? await stockage.entete(id) : null;
        if (!membre?.comptes.includes(compte.id)) throw new ErreurHttp(404, 'Ligue introuvable.');
        if (req.method === 'GET') return res.status(200).json({ disponible: Boolean(configPush && stockage.push), clePublique: configPush?.publicKey });
        if (!stockage.push) throw new ErreurHttp(503, 'Le service de notifications attend son installation.');
        if (corps.operation === 'supprimer') {
          const endpoint = texte(corps.endpoint, 10, 2048, 'Abonnement');
          await stockage.push.supprimer(compte.id,idPush(endpoint),id);
          return res.status(200).json({ ok:true });
        }
        let abonnement;
        try { abonnement = validerAbonnement(corps.abonnement); } catch { throw new ErreurHttp(400,'Abonnement de notification invalide.'); }
        if (corps.operation === 'etat') {
          const actif = (await stockage.push.lister(id)).some(a => a.compte === compte.id && a.id === idPush(abonnement.endpoint));
          return res.status(200).json({ actif });
        }
        if (!configPush) throw new ErreurHttp(503, 'Les notifications attendent la configuration du serveur.');
        if (corps.operation === 'tester') {
          const actif = (await stockage.push.lister(id)).some(a => a.compte === compte.id && a.id === idPush(abonnement.endpoint));
          if (!actif) throw new ErreurHttp(403,'Active les notifications avant de les tester.');
          if (!await stockage.limiter(`push-test:${compte.id}`,3,60000,maintenant)) throw new ErreurHttp(429,'Patiente une minute avant un nouveau test.');
          await envoyerPush(abonnement,{title:'Destiny Rugby',body:'Les alertes de match arrivent ici, même lorsque le jeu est fermé.',tag:`test-${maintenant}`,url:`/?directLigue=${id}`});
        } else if (corps.operation === 'activer') {
          const existants = await stockage.push.lister(id);
          if (existants.filter(a => a.compte === compte.id).length >= 8 && !existants.some(a => a.id === idPush(abonnement.endpoint))) throw new ErreurHttp(400,'Huit appareils sont déjà abonnés à cette ligue.');
          await stockage.push.enregistrer({id:idPush(abonnement.endpoint),compte:compte.id,ligue:id,cree:maintenant,abonnement});
          const liguePush = await lireLigue(id);
          if (liguePush) await programmer?.(liguePush.etat);
        } else throw new ErreurHttp(400,'Action de notification inconnue.');
        return res.status(200).json({ok:true});
      }
      if (req.method === 'GET') {
        if (url.searchParams.get('statistiques') === 'globales') {
          if (compte.identifiant !== 'kiri') throw new ErreurHttp(404, 'Page introuvable.');
          return res.status(200).json(await stockage.statistiquesGlobales());
        }
        const id = url.searchParams.get('ligue');
        if (!id) {
          const ligues = await stockage.ligues(compte.id);
          // ⚠️ LE RÉSUMÉ ARRIVE DÉJÀ TAILLÉ. `stockage.ligues` rendait l'état
          // complet de chaque ligue pour qu'on en extraie ces sept champs ici :
          // 400 Ko traversaient le réseau par ligue et par ouverture d'écran.
          // C'est Postgres qui les extrait maintenant.
          return res.status(200).json({ compte: publicCompte(compte), ligues: ligues.map(l => ({
            id: l.id, nom: l.nom, etat: l.phase, clubNom: l.clubNom, ovas: l.ovas,
            clubEmbleme: l.clubEmbleme, logo: l.logo,
          })) });
        }
        if (!idValide(id)) throw new ErreurHttp(404, 'Ligue introuvable.');
        if (url.searchParams.get('collection') === '1') {
          const ligne = await stockage.ligue(id);
          if (!ligne || !ligne.comptes.includes(compte.id)) throw new ErreurHttp(404, 'Ligue introuvable.');
          const { collectionCarriere } = await import('../src/lib/ligue/collectionCarriere.js');
          return res.status(200).json(collectionCarriere(ligne.etat, compte.id, url.searchParams));
        }

        /**
         * ⚠️ LE SONDAGE QUI NE LIT RIEN. C'est ici que se joue l'essentiel du
         * transfert : l'écran redemande la ligue toutes les dix secondes, et
         * neuf fois sur dix rien n'a bougé. On lisait quand même les 300 à
         * 400 Ko de l'état pour s'en apercevoir.
         *
         * Le client annonce la version qu'il détient (`&v=`). Deux octets de
         * plus dans l'URL suffisent à répondre par un 304 : version identique
         * ET aucune échéance passée, donc rien n'a pu changer ni de la main
         * d'un manager (la version aurait bougé) ni toute seule (l'échéance
         * serait derrière nous).
         *
         * ⚠️ SANS `v`, ON RÉPOND COMME AVANT. Un client d'une version
         * antérieure, un onglet resté ouvert, un appel à la main : tous
         * continuent de recevoir la vue complète. L'optimisation ne peut pas
         * casser ce qui ne la connaît pas.
         */
        const connue = Number(url.searchParams.get('v'));
        let enteteConnue: { version: number; comptes: string[]; echeance: number | null } | undefined;
        if (Number.isInteger(connue) && connue > 0) {
          const entete = await stockage.entete(id);
          enteteConnue = entete ?? undefined;
          if (!entete || !entete.comptes.includes(compte.id)) throw new ErreurHttp(404, 'Ligue introuvable.');
          /**
           * ⚠️ UN CORPS MINUSCULE PLUTÔT QU'UN VRAI 304. La réponse HTTP 304
           * serait la forme juste, mais elle exige un corps VIDE — donc un
           * `end()` que `ReponseCarriere` n'expose pas : le contrat volontaire
           * de ce module est de ne rien supposer de son hôte, pour tourner
           * derrière Vercel comme derrière le serveur de développement de Vite.
           * L'ajouter pour l'occasion, c'était le premier écart. Vingt octets
           * contre quatre cent mille, le gain est le même.
           */
          if (entete.version === connue && entete.echeance !== null && maintenant < entete.echeance) {
            return res.status(200).json({ inchange: true });
          }
        }
        const e = await appliquer(id, compte.id, `lecture-${Math.floor(maintenant / 2000)}`, (e, n, g) => actualiserCarriere(e, n, g), false, false, enteteConnue);
        return res.status(200).json(vueCarriere(e, compte.id));
      }
      if (action === 'creer') {
        // ⚠️ COMPTER, C'EST COMPTER. Ce plafond lisait la liste entière — donc,
        // avant, l'état complet de vingt ligues — pour en prendre la longueur.
        if (await stockage.nombreLigues(compte.id) >= 20) throw new ErreurHttp(400, 'Vous participez déjà à 20 ligues.');
        if (!Number.isInteger(corps.rythme) || Number(corps.rythme) < 1 || Number(corps.rythme) > 7) throw new ErreurHttp(400, 'Choisissez entre 1 et 7 matchs par semaine.');
        if (!Number.isInteger(corps.maxClubs) || Number(corps.maxClubs) < 2 || Number(corps.maxClubs) > 64) throw new ErreurHttp(400, 'Une ligue accueille de 2 à 64 clubs.');
        for (let essai = 0; essai < 3; essai++) {
          const id = randomUUID();
          const code = `DR-${randomBytes(5).toString('hex').toUpperCase()}`;
          const e = creerCarriere({ id, code, compteId: compte.id, pseudo: compte.pseudo,
            nom: texte(corps.nom, 3, 40, 'Nom de ligue'), clubNom: texte(corps.clubNom, 3, 40, 'Nom du club'),
            rythme: Number(corps.rythme), maxClubs: Number(corps.maxClubs),
            embleme: typeof corps.embleme === 'string' ? corps.embleme : undefined,
            logo: typeof corps.logo === 'string' ? corps.logo : undefined, tropheeId: typeof corps.tropheeId === 'string' ? corps.tropheeId : undefined, playoffs: corps.playoffs === true,
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
  return { handler, avancerLigues, actualiserLigue: async (id: string) => {
    if (!await stockage.entete(id)) return;
    return appliquer(id, 'horloge', `queue-${randomUUID()}`, (e,n,g) => actualiserCarriere(e,n,g), false, false);
  } };
}
