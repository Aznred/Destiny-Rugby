// GÉNÉRATEUR DES PAGES DE CONTENU — du HTML statique, vraiment lisible sans JS
//
// ═══ POURQUOI CE SCRIPT EXISTE ═══════════════════════════════════════════════
//
// AdSense a bloqué le site : « Annonces Google diffusées sur des pages ou écrans
// sans contenu d'éditeur ». Le diagnostic était net, et il tenait en trois
// points :
//
//  1. **LE JEU N'A QU'UNE SEULE URL.** `setEcran` change un champ du store,
//     l'adresse ne bouge jamais. Pour un moteur de recherche comme pour un
//     examinateur, tout le site EST la page d'accueil.
//  2. **CETTE PAGE EST VIDE AU CHARGEMENT.** Tout est rendu par React ; un
//     robot qui n'exécute pas le JS jusqu'au bout ne trouve que le bloc
//     `<noscript>`, soit quatre phrases.
//  3. **LES ÉCRANS QUI PORTAIENT LES ANNONCES SONT DES ÉCRANS D'APPLICATION** —
//     une boutique, deux tableaux de scores, un annuaire d'écussons. Le
//     règlement nomme précisément ce cas : « écrans qui servent aux alertes, à
//     la navigation ou à d'autres fins comportementales ».
//
// ⚠️ CE N'EST DONC PAS UN PROBLÈME DE RÉGLAGE, MAIS DE NATURE. Un jeu n'est pas
// un site de contenu. La réponse n'est pas de déplacer une bannière : c'est
// d'écrire de VRAIES pages, avec un vrai texte, à de VRAIES adresses — et de
// n'y mettre des annonces que là.
//
// ═══ POURQUOI DU HTML STATIQUE, ET PAS UN ROUTEUR ════════════════════════════
//
// ⚠️ UN ROUTEUR CÔTÉ NAVIGATEUR N'AURAIT RIEN RÉGLÉ. Il crée des adresses, mais
// le serveur continue de renvoyer la même coquille vide : le robot qui ne rend
// pas le JavaScript voit exactement ce qu'il voyait avant. Ces pages sont donc
// générées en HTML COMPLET, avec leur texte dans la source. Elles n'ont besoin
// ni de React, ni de JavaScript, ni même de CSS externe pour être lues.
//
// Elles vivent dans `public/`, que Vite recopie tel quel : `/guide/`,
// `/pyramide/`, `/moteur/`, `/journal/`. Le jeu, lui, reste l'application d'une
// seule page à la racine.
//
// ⚠️ LE CONTENU DOIT RESTER VRAI. Du remplissage tombe sous exactement la même
// règle que le vide (« contenu à faible valeur informative »). Chaque chiffre
// cité ici sort du code ou des mesures des scripts de vérification — s'il change
// dans le jeu, il faut le changer ici.
//
// Relancer :  node scripts/genPages.cjs
// Avec les annonces :  PUB_SLOT=1234567890 node scripts/genPages.cjs

const fs = require('node:fs');
const path = require('node:path');
const { PAGES, SITE } = require('./contenuPages.cjs');

// ⚠️ L'IDENTIFIANT ADSENSE EST PUBLIC PAR CONSTRUCTION (Google l'exige dans le
// script ET dans ads.txt). Le SLOT, lui, se crée bloc par bloc dans la console
// AdSense : sans lui, on ne génère AUCUN code publicitaire. Pas de balise
// fantôme sur une page qui n'a rien à afficher.
const CLIENT_ADSENSE = 'ca-pub-6166322317354663';

// Le conteneur Google Tag Manager. Public par construction, comme le `ca-pub-…`
// d’AdSense : Google exige qu’il figure en clair dans la page.
const GTM = 'GTM-KF48DSQ9';
const SLOT = (process.env.PUB_SLOT || '').trim();

const SORTIE = 'public';

function echapper(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Le gras et les liens dans un paragraphe, sans moteur de rendu Markdown.
 * ⚠️ L'ÉCHAPPEMENT PASSE AVANT LE BALISAGE : l'inverse laisserait un `<` du
 * texte casser la page, et un `&` de nom de club afficher une entité brisée.
 */
function riche(texte) {
  return echapper(texte)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/** Un bloc de contenu → son HTML. */
function bloc(b) {
  if (typeof b === 'string') return `      <p>${riche(b)}</p>`;
  if (b.h2) return `      <h2 id="${b.id}">${echapper(b.h2)}</h2>`;
  if (b.h3) return `      <h3>${echapper(b.h3)}</h3>`;
  if (b.liste) {
    return `      <ul>\n${b.liste.map((x) => `        <li>${riche(x)}</li>`).join('\n')}\n      </ul>`;
  }
  if (b.tableau) {
    const [entetes, ...lignes] = b.tableau;
    return [
      '      <div class="tableau-large">',
      '      <table>',
      `        <thead><tr>${entetes.map((c) => `<th>${riche(c)}</th>`).join('')}</tr></thead>`,
      '        <tbody>',
      ...lignes.map((l) => `          <tr>${l.map((c) => `<td>${riche(c)}</td>`).join('')}</tr>`),
      '        </tbody>',
      '      </table>',
      '      </div>',
    ].join('\n');
  }
  if (b.encadre) {
    return `      <aside class="encadre"><p>${riche(b.encadre)}</p></aside>`;
  }
  return '';
}

/**
 * L'emplacement publicitaire, EN MILIEU D'ARTICLE et une seule fois.
 *
 * ⚠️ UNE SEULE ANNONCE PAR PAGE, ET JAMAIS EN TÊTE. La règle « les annonces ne
 * doivent pas occuper plus de place que le contenu » se respecte en amont, pas
 * après coup — et une bannière avant le premier paragraphe donne exactement
 * l'impression que le règlement cherche à éviter.
 */
function encartPub() {
  if (!SLOT) return '';
  return [
    '      <div class="pub">',
    '        <span class="pub-mention">Publicité</span>',
    '        <ins class="adsbygoogle" style="display:block"',
    `             data-ad-client="${CLIENT_ADSENSE}"`,
    `             data-ad-slot="${SLOT}"`,
    '             data-ad-format="fluid"',
    '             data-ad-layout="in-article"></ins>',
    '        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>',
    '      </div>',
  ].join('\n');
}

/**
 * Google Tag Manager, la moitié <head>.
 *
 * ⚠️ CES PAGES SONT GÉNÉRÉES : on pose la balise ICI, jamais dans
 * `public/<slug>/index.html`. Le HTML est réécrit à chaque exécution de ce
 * script, et une balise collée à la main dans le résultat disparaîtrait à la
 * première régénération, sans un mot.
 *
 * ⚠️ ET CONTRAIREMENT À ADSENSE, ELLE N’EST PAS CONDITIONNÉE À `SLOT`. GTM
 * n’affiche rien : c’est un conteneur de mesure, il a du sens sur une page
 * sans la moindre annonce — c’est même là qu’on veut savoir si quelqu’un lit.
 */
function gtmTete() {
  return [
  '  <!-- Google Tag Manager -->',
  '  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":',
  '  new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],',
  '  j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src=',
  '  "https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);',
  `  })(window,document,"script","dataLayer","${GTM}");</script>`,
    '',
  ].join('\n');
}

/** Google Tag Manager, le repli sans JavaScript, juste après <body>. */
function gtmCorps() {
  return [
    '  <!-- Google Tag Manager (noscript) -->',
    `  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM}"`,
    '    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>',
    '',
  ].join('\n');
}

function scriptAdsense() {
  if (!SLOT) return '';
  return `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ADSENSE}" crossorigin="anonymous"></script>\n`;
}

/** Le sommaire, construit à partir des titres de niveau 2. */
function sommaire(page) {
  const titres = page.blocs.filter((b) => b && b.h2);
  if (titres.length < 3) return '';
  return [
    '      <nav class="sommaire" aria-label="Sommaire">',
    '        <p class="sommaire-titre">Sur cette page</p>',
    '        <ol>',
    ...titres.map((b) => `          <li><a href="#${b.id}">${echapper(b.h2)}</a></li>`),
    '        </ol>',
    '      </nav>',
  ].join('\n');
}

function rendre(page, toutes) {
  const url = `${SITE.origine}/${page.slug}/`;
  // ⚠️ L'ENCART TOMBE APRÈS LE PREMIER TIERS, pas au milieu exact : on veut
  // qu'il arrive une fois le lecteur entré dans le sujet, jamais avant.
  const coupe = Math.max(3, Math.floor(page.blocs.length / 3));
  const corps = [
    ...page.blocs.slice(0, coupe).map(bloc),
    encartPub(),
    ...page.blocs.slice(coupe).map(bloc),
  ].filter(Boolean).join('\n');

  const autres = toutes.filter((p) => p.slug !== page.slug);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
${gtmTete()}
  <title>${echapper(page.titre)} · ${echapper(SITE.nom)}</title>
  <meta name="description" content="${echapper(page.description)}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="${echapper(SITE.nom)}" />
  <meta property="og:title" content="${echapper(page.titre)}" />
  <meta property="og:description" content="${echapper(page.description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE.origine}/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/contenu.css" />
  <script type="application/ld+json">
${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.titre,
    description: page.description,
    inLanguage: 'fr',
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: SITE.nom },
    publisher: { '@type': 'Organization', name: SITE.nom },
  }, null, 2)}
  </script>
${scriptAdsense()}</head>
<body>
${gtmCorps()}
  <header class="entete">
    <a class="marque" href="/">🏉 ${echapper(SITE.nom)}</a>
    <nav aria-label="Pages du guide">
${toutes.map((p) => `      <a href="/${p.slug}/"${p.slug === page.slug ? ' aria-current="page"' : ''}>${echapper(p.court)}</a>`).join('\n')}
    </nav>
    <a class="jouer" href="/">Jouer</a>
  </header>

  <main>
    <article>
      <p class="fil"><a href="/">Accueil</a> › ${echapper(page.court)}</p>
      <h1>${echapper(page.titre)}</h1>
      <p class="chapo">${riche(page.chapo)}</p>
${sommaire(page)}
${corps}
    </article>

    <nav class="suite" aria-label="Continuer la lecture">
      <p class="suite-titre">Continuer</p>
      <ul>
${autres.map((p) => `        <li><a href="/${p.slug}/"><strong>${echapper(p.titre)}</strong><span>${echapper(p.description)}</span></a></li>`).join('\n')}
      </ul>
    </nav>
  </main>

  <footer class="pied">
    <p><a href="/">${echapper(SITE.nom)}</a> : jeu de rôle de carrière de rugby, gratuit et en français.</p>
    <p class="pied-note">Les noms de clubs, de compétitions et de joueurs appartiennent à leurs détenteurs respectifs. Ce site n'est affilié à aucune ligue ni fédération.</p>
  </footer>
</body>
</html>
`;
}

// --- Écriture -----------------------------------------------------------------
let ecrites = 0;
for (const page of PAGES) {
  const dossier = path.join(SORTIE, page.slug);
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'), rendre(page, PAGES), 'utf8');
  ecrites++;
}

// --- Le plan du site suit ------------------------------------------------------
// ⚠️ IL EST RÉGÉNÉRÉ ICI, pas maintenu à la main : une page ajoutée sans son
// entrée de sitemap est une page que personne ne trouvera jamais.
const aujourdHui = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITE.origine}/`, priorite: '1.0' },
  ...PAGES.map((p) => ({ loc: `${SITE.origine}/${p.slug}/`, priorite: '0.8' })),
];
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) => [
    '  <url>',
    `    <loc>${u.loc}</loc>`,
    `    <lastmod>${aujourdHui}</lastmod>`,
    `    <priority>${u.priorite}</priority>`,
    '  </url>',
  ].join('\n')),
  '</urlset>',
  '',
].join('\n');
fs.writeFileSync(path.join(SORTIE, 'sitemap.xml'), sitemap, 'utf8');

const mots = PAGES.reduce((n, p) => n + JSON.stringify(p.blocs).split(/\s+/).length, 0);
console.log(`${ecrites} page(s) écrite(s) dans ${SORTIE}/ · sitemap.xml régénéré`);
console.log(`~${mots} mots de contenu · annonces ${SLOT ? 'ACTIVÉES (slot ' + SLOT + ')' : 'désactivées (PUB_SLOT absent)'}`);
for (const p of PAGES) console.log(`   /${p.slug}/  ${p.titre}`);
