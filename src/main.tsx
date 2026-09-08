import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// ⚠️ LES DRAPEAUX SONT IMPORTÉS ICI, à l'entrée. Ils l'étaient depuis
// `Drapeau.tsx` et `Championnats.tsx` : depuis que les écrans sont chargés à la
// demande, le découpage rattachait cette feuille de style à un chunk paresseux,
// et les drapeaux de l'écran de création restaient sans style le temps que
// l'écran des championnats soit chargé. À l'entrée, c'est déterministe.
import 'flag-icons/css/flag-icons.min.css'
import { chargerTextes } from './lib/i18n'
import { moduleObsolete, rechargerPourModuleObsolete, surveillerModulesObsoletes } from './lib/moduleObsolete'

// ⚠️ LA SURVEILLANCE S'INSTALLE AVANT TOUT LE RESTE. Les deux imports de
// `demarrer()` sont eux-mêmes des morceaux chargés à la demande : après un
// déploiement, un onglet resté ouvert peut échouer AVANT que React existe, et
// la page reste alors blanche — pas même l'écran d'erreur pour le dire.
surveillerModulesObsoletes()

// L'application et le gros dictionnaire multilingue sont deux chunks séparés,
// chargés en parallèle. `t()` est tout de même prêt avant le premier rendu,
// sans gonfler le fichier d'entrée au-delà du seuil de Vite.
async function demarrer() {
  const [{ TEXTES }, { default: App }] = await Promise.all([
    import('./data/textes'),
    import('./App.tsx'),
  ])
  chargerTextes(TEXTES)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void demarrer().catch((erreur) => {
  if (moduleObsolete(erreur) && rechargerPourModuleObsolete()) return
  throw erreur
})
