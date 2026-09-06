// ---------------------------------------------------------------------------
// LE LIEN D'INVITATION D'UNE LIGUE
// ---------------------------------------------------------------------------
// Un code de ligue se dicte au téléphone ; un lien se colle dans la boucle
// WhatsApp et se clique. C'est le même code au bout — `DR-XXXXXXXXXX` — juste
// porté par une adresse, pour que l'invité n'ait rien à recopier.
//
//   https://destiny-rugby.fr/?ligue=DR-9F2A10C4B7
//
// ⚠️ POURQUOI ÇA NE PEUT PAS ÊTRE QU'UN PARAMÈTRE LU À L'ARRIVÉE. Le lien
// tombe presque toujours sur quelqu'un qui n'a pas de compte : il va s'inscrire,
// peut-être recharger la page, peut-être revenir plus tard depuis le même
// onglet. Le code doit donc SURVIVRE à tout ça, alors qu'on le retire de la
// barre d'adresse tout de suite (un rechargement ne doit pas relancer
// l'adhésion, et l'adresse ne doit pas rester à traîner). D'où les deux
// mémoires : une variable de module pour la vie de la page, un
// `sessionStorage` pour le rechargement.
//
// ⚠️ ET L'URL N'EST NETTOYÉE QUE SI LE CODE A PU ÊTRE RANGÉ. En navigation
// privée, `sessionStorage` lève à la lecture comme à l'écriture ; effacer le
// paramètre sans avoir rien gardé perdrait l'invitation au premier F5. Une
// adresse un peu longue vaut mieux qu'une invitation évaporée.

export const PARAM_INVITATION = 'ligue';
const CLE = 'destiny:invitation-ligue';

// La mémoire de la page. Elle prime sur le stockage : c'est elle qui porte le
// code quand le navigateur refuse d'écrire.
let enMemoire: string | null = null;

/**
 * Normalise un code d'invitation, ou rend `null`.
 *
 * ⚠️ ON NE VALIDE PAS LE FORMAT EXACT. Le serveur fabrique `DR-` + 10
 * hexadécimaux, mais c'est LUI qui tranche : un filtre client trop serré
 * refuserait tout le jour où le format bougerait, et sans rien apporter — un
 * mauvais code donne un « Code de ligue introuvable » propre. On se contente
 * d'écarter ce qui ne peut pas être un code (espaces, accents, longueurs
 * absurdes), c'est-à-dire ce que le serveur refuse déjà : `texte(code, 5, 30)`.
 */
export function codeInvitationValide(brut: unknown): string | null {
  if (typeof brut !== 'string') return null;
  const code = brut.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{3,29}$/.test(code) ? code : null;
}

/** Le code porté par une chaîne de requête (`?ligue=DR-…`), ou `null`. */
export function codeDansLaRecherche(recherche: string): string | null {
  try { return codeInvitationValide(new URLSearchParams(recherche).get(PARAM_INVITATION)); }
  catch { return null; }
}

/** Le lien à partager pour rejoindre la ligue. */
export function lienInvitation(code: string, base?: { origin: string; pathname: string }): string {
  const lieu = base ?? (typeof location === 'undefined' ? { origin: '', pathname: '/' } : location);
  // `origin + pathname` plutôt qu'une adresse en dur : le lien reste juste sur
  // un déploiement de préversion, sur localhost, et le jour d'un changement de
  // domaine. Personne n'a à se souvenir de mettre une constante à jour.
  return `${lieu.origin}${lieu.pathname.replace(/\/index\.html$/, '/')}?${PARAM_INVITATION}=${encodeURIComponent(code)}`;
}

function ranger(code: string): boolean {
  enMemoire = code;
  try { sessionStorage.setItem(CLE, code); return true; } catch { return false; }
}

/**
 * À l'ouverture de la page : récupère le code du lien, le met de côté et
 * nettoie l'adresse. Rend le code capté, ou `null` si l'adresse n'en portait
 * pas — c'est ce booléen qui dit à l'application d'ouvrir la Carrière en ligne.
 */
export function capterInvitation(): string | null {
  if (typeof location === 'undefined') return null;
  const code = codeDansLaRecherche(location.search);
  if (!code) return null;
  if (ranger(code) && typeof history !== 'undefined') {
    const params = new URLSearchParams(location.search);
    params.delete(PARAM_INVITATION);
    const reste = params.toString();
    try { history.replaceState(null, '', `${location.pathname}${reste ? `?${reste}` : ''}${location.hash}`); }
    catch { /* une adresse non nettoyée ne coûte rien, l'invitation est rangée */ }
  }
  return code;
}

/** Le code mis de côté par un lien d'invitation, s'il y en a un. */
export function invitationEnAttente(): string | null {
  if (enMemoire) return enMemoire;
  try { return (enMemoire = codeInvitationValide(sessionStorage.getItem(CLE))); } catch { return null; }
}

/** À appeler une fois la ligue rejointe — ou l'invitation refusée. */
export function oublierInvitation(): void {
  enMemoire = null;
  try { sessionStorage.removeItem(CLE); } catch { /* rien à oublier */ }
}
