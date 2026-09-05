import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// ═══════════════════════════════════════════════════════════════════════════
// LA CARRIÈRE EN LIGNE EN DÉVELOPPEMENT
// ═══════════════════════════════════════════════════════════════════════════
// En production, `/api/carriere` est une fonction serverless Vercel adossée à
// Neon. En local, il n'y a ni l'une ni l'autre — et sans ce pont, le mode en
// ligne ne serait tout simplement PAS testable dans le navigateur, ce que les
// règles de travail du projet interdisent (« compiler ne suffit pas »).
//
// Le même gestionnaire est branché sur un stockage fichier
// (`serveur/carriereFichier.ts`, un JSON dans `node_modules/.destiny`). Ce sont
// exactement les mêmes règles, la même validation et la même comparaison de
// version : ce qui marche ici marche déployé.
//
// ⚠️ CHARGEMENT PARESSEUX, PAR `ssrLoadModule`. Importer le gestionnaire en
// tête de ce fichier tirerait `effectifsReels` et ses 6 306 joueurs dans la
// configuration de Vite, donc à chaque démarrage, même pour un `npm run build`.
function carriereEnDeveloppement(): Plugin {
  return {
    name: 'destiny-carriere-dev',
    apply: 'serve',
    configureServer(serveur) {
      serveur.middlewares.use('/api/carriere', (req, res, suite) => {
        void (async () => {
          try {
            const { creerGestionnaireCarriere } = await serveur.ssrLoadModule('/serveur/carriereApi.ts');
            const { stockageFichier } = await serveur.ssrLoadModule('/serveur/carriereFichier.ts');
            // ⚠️ SEUL LE STOCKAGE SE GARDE ENTRE DEUX REQUÊTES, PAS LE
            // GESTIONNAIRE. `ssrLoadModule` recharge bien les fichiers modifiés,
            // mais un gestionnaire mémorisé ici continuait d'appeler l'ANCIEN
            // module : on modifiait `carriereApi.ts`, le serveur de dev
            // répondait toujours comme avant, et on cherchait le bug ailleurs.
            // Le recréer à chaque requête ne coûte rien — c'est une fermeture.
            stockage ??= stockageFichier('node_modules/.destiny/carriere.json');
            const gestionnaire = creerGestionnaireCarriere(stockage);
            const morceaux: Buffer[] = [];
            for await (const morceau of req) morceaux.push(morceau as Buffer);
            const brut = Buffer.concat(morceaux).toString('utf8');
            const reponse = {
              status(code: number) { res.statusCode = code; return reponse; },
              setHeader(nom: string, valeur: string) { res.setHeader(nom, valeur); return reponse; },
              json(contenu: unknown) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify(contenu));
                return reponse;
              },
              // Le relais d'écussons : une vraie réponse binaire.
              envoyer(donnees: Uint8Array) { res.end(Buffer.from(donnees)); return reponse; },
            };
            await gestionnaire.handler({
              method: req.method, url: req.originalUrl ?? req.url,
              headers: req.headers as Record<string, string | undefined>,
              body: brut ? JSON.parse(brut) : undefined,
              socket: req.socket,
            }, reponse);
          } catch (erreur) {
            console.error('[carriere]', erreur);
            suite(erreur as Error);
          }
        })();
      });
    },
  };
}
let stockage: unknown;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), carriereEnDeveloppement()],
  build: {
    // Three.js est volontairement un bloc fournisseur paresseux (~972 Ko
    // minifiés, 265 Ko gzip), partagé par toutes les scènes 3D. Le couper
    // artificiellement multiplierait les requêtes sans réduire le transfert ;
    // le seuil distingue ce cas connu d'une nouvelle régression applicative.
    chunkSizeWarningLimit: 1000,
    // ⚠️ LES DRAPEAUX NE SONT PLUS INLINÉS. `flag-icons` fournit 250 drapeaux en
    // SVG ; sous la limite d'inlining par défaut (4 Ko), Vite les recopiait TOUS
    // en `data:` URI dans la feuille de style — 503 Ko de CSS (102 Ko gzip) à
    // télécharger et à ANALYSER avant le premier pixel, pour afficher deux ou
    // trois drapeaux à l'écran. À zéro, ils redeviennent des fichiers : le
    // navigateur ne va chercher que ceux qu'il affiche, en parallèle, et le CSS
    // retombe à 30 Ko. Mesuré : 102 → 21 Ko gzip de feuille de style.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Les grosses données réelles et la 3D sortent du chunk principal :
        // elles sont téléchargées en parallèle, mises en cache à part et ne
        // bloquent plus le premier rendu. Ce sont des fichiers générés, qui
        // changent rarement : leur hash reste stable d'un déploiement à l'autre.
        // Rolldown (Vite 8) n'accepte plus l'objet : `manualChunks` est une
        // fonction qui reçoit le chemin du module.
        manualChunks(id: string) {
          if (id.includes('/src/data/effectifsReels') || id.includes('/src/data/mondeReel')) {
            return 'donnees-monde';
          }
          if (id.includes('/src/data/amateurs') || id.includes('/src/data/mercato')) {
            return 'donnees-amateurs';
          }
          // ⚠️ Les 18 nouvelles ligues (183 clubs, 5 070 joueurs générés) dans
          // leur propre fichier. Sans cette règle, le découpage automatique les
          // collait au chunk du moteur de match — qui est PARESSEUX : charger
          // l'atlas des clubs aurait alors tiré tout le moteur avec lui.
          if (id.includes('/src/data/nouvellesLigues')) return 'donnees-nouvelles';
          if (/node_modules\/(three|@react-three)\//.test(id)) return 'three';
          // ⚠️ LE MOTEUR DE MATCH DANS SON PROPRE FICHIER. 3 500 lignes qui ne
          // servent qu'au moment où l'on joue une rencontre : le store le charge
          // à la demande (`simulerStatsJournee`) et `MatchLive` est lazy. Sans
          // cette règle, le découpage automatique le recollait au chunk
          // principal dès qu'un deuxième appelant apparaissait.
          if (id.includes('/src/lib/moteur/') && !id.includes('titulaire')) return 'moteur';
          return undefined;
        },
      },
    },
  },
})
