// Écrit les icônes autonomes du jeton de Crédits : public/icons/credit_icon.svg (+ -ui, -boutique, -achat, -popup).
// Source unique : components/PieceCredits.tsx (le composant et les fichiers ne peuvent pas diverger). Lancer : npx vite-node scripts/genererIconeCredit.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PieceCredits, type VarianteCredit } from '../src/components/PieceCredits';

mkdirSync('public/icons', { recursive: true });
const TAILLES: Record<VarianteCredit, number> = { ui: 24, boutique: 96, achat: 160, popup: 128 };
for (const v of Object.keys(TAILLES) as VarianteCredit[]) {
  const svg = renderToStaticMarkup(<PieceCredits variante={v} taille={TAILLES[v]} className={`piece-credits piece-credits-${v}`} />)
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/ class="piece-credits-tour"/, '');
  writeFileSync(`public/icons/credit_icon-${v}.svg`, svg);
  if (v === 'boutique') writeFileSync('public/icons/credit_icon.svg', svg);
}
console.log('Icônes de Crédits écrites dans public/icons/');
