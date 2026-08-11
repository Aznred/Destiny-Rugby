// « CE MODÈLE EXISTE-T-IL ? » — la question à poser AVANT de le charger
//
// ⚠️ CE N'EST PAS UNE PRÉCAUTION THÉORIQUE. Les articles du vestiaire déclarent
// tous leur `.glb`, y compris ceux qui restent à modéliser : c'est ce qui
// permet de déposer un fichier dans `public/m3d/` et de le voir apparaître sans
// écrire une ligne de code. Mais si l'on tente de CHARGER un modèle absent,
// `useGLTF` lève — et l'erreur remonte hors du canvas, où `Garde` la rattrape
// en remplaçant tout l'écran par un message. Vu en jeu : le joueur portait un
// article dont le modèle n'était pas encore là, et **l'accueil devenait noir**.
//
// On teste donc la présence du fichier avant de le monter. Le résultat est
// mémorisé : un modèle absent n'est demandé qu'une seule fois par session.

const presences = new Map<string, Promise<boolean>>();

export function modelePresent(url: string): Promise<boolean> {
  const connu = presences.get(url);
  if (connu) return connu;
  const test = fetch(url, { method: 'HEAD' })
    .then((r) => {
      // ⚠️ Le serveur de développement répond `index.html` pour ce qu'il ne
      // connaît pas : un 200 ne suffit donc pas, il faut regarder le type.
      const type = r.headers.get('content-type') ?? '';
      return r.ok && !type.includes('text/html');
    })
    .catch(() => false);
  presences.set(url, test);
  return test;
}

/** Machine modeste ou animations réduites : on allège tout ce qui est 3D. */
export function modeAllege(): boolean {
  if (typeof navigator === 'undefined') return true;
  const coeurs = navigator.hardwareConcurrency ?? 4;
  const moinsDAnimations = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return coeurs <= 4 || moinsDAnimations;
}
