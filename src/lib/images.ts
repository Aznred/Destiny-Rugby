// IMAGES ET GIFS DANS LES PUBLICATIONS
//
// Contrainte posée : **aucune base de données**, et si possible aucune clé.
//
// ⚠️ La première version tapait dans LoremFlickr. Mauvais choix : le service
// répond lentement, tombe souvent, et renvoie une photo au hasard qui n'a
// qu'un rapport lointain avec les mots-clés — d'où des images « qui marchent
// pas bien ». On est passé à :
//
//   1. WIKIMEDIA COMMONS — l'API de recherche de Wikipédia. Sans clé, avec
//      CORS (`origin=*`), rapide, et surtout PERTINENTE : on cherche vraiment
//      « rugby scrum » et on obtient une photo de mêlée. C'est la source par
//      défaut, pour le joueur comme pour les images demandées par l'IA.
//   2. TENOR pour les GIFs animés — l'API officielle demande une clé gratuite,
//      qui se saisit dans ⚙️. Sans elle, on retombe sur Commons : le jeu ne
//      casse jamais.
//   3. UN REPLI PEINT À LA MAIN — si le réseau ne répond pas du tout, on
//      fabrique une vignette SVG (dégradé + mots-clés) en `data:` URI. Aucune
//      requête, donc jamais de carré gris cassé dans le fil.
//
// Rien n'est stocké côté serveur : une publication ne garde qu'une URL.

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const TENOR = 'https://tenor.googleapis.com/v2/search';

export interface Media {
  url: string;
  gif: boolean;
  legende: string;
}

// Nettoie une requête : accents retirés, 4 mots utiles au maximum.
export function motsCles(requete: string): string {
  const mots = requete
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 2)
    .slice(0, 4);
  return mots.join(' ').toLowerCase() || 'rugby union';
}

// --- LE REPLI HORS LIGNE ---------------------------------------------------
// Une vignette dessinée à la main, sans une seule requête réseau. Les couleurs
// sortent des mots-clés : deux publications différentes n'ont pas la même.
const PALETTES = [
  ['#0d3b2e', '#1c6b4c'], ['#2b1a10', '#7a4a22'], ['#101a33', '#2f4d8f'],
  ['#2a0f1c', '#7d2244'], ['#1a2410', '#4d6b1f'], ['#26102e', '#5c2a72'],
];

export function vignetteLocale(requete: string): string {
  const mots = motsCles(requete);
  let h = 0;
  for (let i = 0; i < mots.length; i++) h = (h * 31 + mots.charCodeAt(i)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  const titre = mots.toUpperCase().slice(0, 28);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="640" height="360" fill="url(#g)"/>` +
    `<ellipse cx="320" cy="180" rx="118" ry="72" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="3"/>` +
    `<path d="M320 108v144M258 180h124" stroke="rgba(255,255,255,.22)" stroke-width="3"/>` +
    `<text x="320" y="316" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" ` +
    `letter-spacing="3" fill="rgba(255,255,255,.65)">${titre}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// --- WIKIMEDIA COMMONS -----------------------------------------------------
interface PageCommons {
  index?: number;
  title?: string;
  imageinfo?: { thumburl?: string; url?: string; descriptionurl?: string }[];
}

async function chercherCommons(requete: string, combien: number): Promise<Media[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*', // CORS : c'est ce qui rend l'API utilisable depuis le navigateur
    generator: 'search',
    gsrsearch: `filetype:bitmap ${motsCles(requete)}`,
    gsrnamespace: '6', // espace « Fichier »
    gsrlimit: String(Math.min(24, combien * 3)),
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '640',
  });
  const res = await fetch(`${COMMONS}?${params}`);
  if (!res.ok) throw new Error(`Wikimedia a répondu ${res.status}.`);
  const data = await res.json();
  const pages: PageCommons[] = Object.values(data?.query?.pages ?? {});
  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((p) => ({
      url: p.imageinfo?.[0]?.thumburl ?? '',
      gif: false,
      legende: (p.title ?? '').replace(/^File:/, '').replace(/\.\w+$/, ''),
    }))
    .filter((m) => !!m.url && !/\.svg\.png$/i.test(m.url))
    .slice(0, combien);
}

// --- TENOR (GIFs animés, clé facultative) ----------------------------------
async function chercherTenor(requete: string, cle: string, combien: number): Promise<Media[]> {
  const url = `${TENOR}?q=${encodeURIComponent(motsCles(requete))}&key=${encodeURIComponent(cle)}`
    + `&limit=${combien}&media_filter=tinygif,gif&client_key=destin_ovalie`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tenor a répondu ${res.status}. Vérifie ta clé dans ⚙️.`);
  const data = await res.json();
  const resultats = Array.isArray(data?.results) ? data.results : [];
  return resultats
    .map((r: { media_formats?: Record<string, { url?: string }>; content_description?: string }) => ({
      url: r.media_formats?.tinygif?.url ?? r.media_formats?.gif?.url ?? '',
      gif: true,
      legende: r.content_description ?? requete,
    }))
    .filter((m: Media) => !!m.url)
    .slice(0, combien);
}

// Recherche pour la galerie de rédaction. Tenor si une clé est là, sinon
// Commons, et en tout dernier recours des vignettes peintes à la main.
export async function chercherMedias(
  requete: string, cleTenor: string, combien = 8,
): Promise<Media[]> {
  const q = requete.trim() || 'rugby union';
  try {
    const trouves = cleTenor
      ? await chercherTenor(q, cleTenor, combien)
      : await chercherCommons(q, combien);
    if (trouves.length) return trouves;
  } catch {
    // on retombe plus bas
  }
  try {
    if (cleTenor) {
      const secours = await chercherCommons(q, combien);
      if (secours.length) return secours;
    }
  } catch {
    // idem
  }
  return Array.from({ length: Math.min(4, combien) }, (_, i) => ({
    url: vignetteLocale(`${q} ${i}`),
    gif: false,
    legende: q,
  }));
}

// UNE image pour des mots-clés — c'est ce que l'IA demande quand elle illustre
// une publication (elle ne manipule jamais d'URL, seulement des mots).
// Asynchrone parce que Commons est une vraie recherche ; en cas d'échec on rend
// la vignette locale, donc la promesse n'échoue jamais.
export async function imagePourRequete(requete: string): Promise<Media> {
  try {
    const [premier] = await chercherCommons(requete, 1);
    if (premier) return premier;
  } catch {
    // réseau muet : vignette locale
  }
  return { url: vignetteLocale(requete), gif: false, legende: requete };
}

// Redimensionne une image choisie par le joueur pour en faire une photo de
// profil : 160×160 en JPEG, sinon une photo de 4 Mo ferait exploser le
// localStorage (quota ~5 Mo pour TOUTE la sauvegarde).
export function reduirePourAvatar(fichier: File, taille = 160): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => rejeter(new Error('Fichier illisible.'));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => rejeter(new Error('Ce fichier n’est pas une image.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = taille;
        canvas.height = taille;
        const ctx = canvas.getContext('2d');
        if (!ctx) return rejeter(new Error('Rendu impossible.'));
        // Recadrage centré : on garde le carré du milieu.
        const cote = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - cote) / 2, (img.height - cote) / 2, cote, cote,
          0, 0, taille, taille,
        );
        resoudre(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(lecteur.result);
    };
    lecteur.readAsDataURL(fichier);
  });
}
