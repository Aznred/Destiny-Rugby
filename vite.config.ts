import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
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
