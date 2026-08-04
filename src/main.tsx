import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// ⚠️ LES DRAPEAUX SONT IMPORTÉS ICI, à l'entrée. Ils l'étaient depuis
// `Drapeau.tsx` et `Championnats.tsx` : depuis que les écrans sont chargés à la
// demande, le découpage rattachait cette feuille de style à un chunk paresseux,
// et les drapeaux de l'écran de création restaient sans style le temps que
// l'écran des championnats soit chargé. À l'entrée, c'est déterministe.
import 'flag-icons/css/flag-icons.min.css'
// Le dictionnaire est chargé AVANT le premier rendu : `t()` doit pouvoir
// répondre dès la première ligne d'interface.
import { chargerTextes } from './lib/i18n'
import { TEXTES } from './data/textes'
import App from './App.tsx'

chargerTextes(TEXTES)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
