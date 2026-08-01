import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
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
          if (/node_modules\/(three|@react-three)\//.test(id)) return 'three';
          return undefined;
        },
      },
    },
  },
})
