// QUAND LE SITE A ÉTÉ REDÉPLOYÉ SOUS LES PIEDS DU JOUEUR
//
// ⚠️ SIGNALÉ EN JEU : « Failed to fetch dynamically imported module :
// /assets/Hero3D-hyV7P-g2.js ». Ce n'est ni une sauvegarde abîmée ni un bug de
// rendu — c'est un onglet ouvert AVANT le déploiement qui réclame un morceau
// de l'ancienne version.
//
// Le jeu est découpé en morceaux chargés à la demande (`lazy(() => import(…))`)
// et chacun porte l'empreinte de son contenu dans son nom. Un nouveau build
// change ces empreintes : `Hero3D-hyV7P-g2.js` n'existe plus, il s'appelle
// autrement. La page ouverte, elle, tient toujours l'ANCIENNE liste — celle que
// son `index.html` lui a donnée à l'ouverture. Tant qu'elle ne touche à rien,
// tout va bien ; le jour où elle veut un morceau qu'elle n'a pas encore
// téléchargé, elle demande un fichier qui n'est plus là.
//
// ⚠️ ET RIEN N'ANNONCE LE PROBLÈME AVANT LE CLIC. Le joueur ne voit pas qu'il a
// une version périmée : il ouvre l'accueil, l'écran 3D se charge, et c'est
// l'écran d'erreur. La seule sortie est de RECHARGER — `index.html` est servi
// en `max-age=0, must-revalidate`, la nouvelle liste arrive donc aussitôt.
//
// ⚠️ MAIS UNE FOIS SEULEMENT. Si le rechargement ne règle rien (fichier
// réellement absent du déploiement, réseau coupé, cache d'un proxy), recharger
// à chaque erreur enferme le joueur dans une boucle de rechargements où il ne
// peut même plus lire le message. On note donc l'heure du dernier rechargement,
// et on laisse l'écran d'erreur s'afficher si on vient déjà d'essayer.

/** Combien de temps on considère qu'un rechargement vient d'avoir lieu. */
const REPIT_MS = 30_000;
const CLE = 'dr:rechargement-module';

/**
 * L'erreur dit-elle « le morceau demandé n'est plus là » ?
 *
 * ⚠️ CHAQUE NAVIGATEUR LA FORMULE À SA FAÇON, et il n'existe pas de code
 * d'erreur pour ça : Chrome dit « Failed to fetch dynamically imported
 * module », Firefox « error loading dynamically imported module », Safari
 * « Importing a module script failed ». On les reconnaît au texte, faute de
 * mieux — et on reste volontairement large plutôt que de rater un navigateur.
 */
export function moduleObsolete(erreur: unknown): boolean {
  const message = (erreur instanceof Error ? `${erreur.name} ${erreur.message}` : String(erreur ?? '')).toLowerCase();
  return message.includes('dynamically imported module')
    || message.includes('importing a module script failed')
    || message.includes('failed to fetch dynamically')
    || message.includes('error loading dynamically imported module');
}

/**
 * Recharge la page, une seule fois par répit. Rend `true` si le rechargement
 * est lancé — l'appelant n'a alors plus rien à afficher.
 */
export function rechargerPourModuleObsolete(): boolean {
  let dernier = 0;
  try { dernier = Number(sessionStorage.getItem(CLE) ?? 0); } catch { /* onglet privé : on tente quand même */ }
  if (Number.isFinite(dernier) && Date.now() - dernier < REPIT_MS) return false;
  try { sessionStorage.setItem(CLE, String(Date.now())); } catch { /* tant pis, le répit ne tiendra pas */ }
  window.location.reload();
  return true;
}

/**
 * ⚠️ TOUS LES IMPORTS NE PASSENT PAS PAR LE RENDU. Un préchargement lancé dans
 * un `useEffect` (`lib/prechargementPacks.ts`) ou un module tiré au clic échoue
 * hors de React : aucune frontière d'erreur ne le voit, et l'écran reste tel
 * quel jusqu'à ce que le joueur clique sur ce qui ne marche plus. On écoute
 * donc aussi les rejets non rattrapés.
 */
export function surveillerModulesObsoletes(): void {
  window.addEventListener('unhandledrejection', (e) => {
    if (moduleObsolete(e.reason)) rechargerPourModuleObsolete();
  });
}
