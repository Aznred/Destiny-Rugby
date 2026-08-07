import { codeDrapeau, nomNation, nomNationTraduit } from '../lib/nations';

// Vrai drapeau SVG (flag-icons) : les emojis drapeaux ne s'affichent pas sous
// Windows. Les fonctions de données vivent dans lib/nations.ts afin que ce
// fichier n'exporte qu'un composant et reste compatible avec Fast Refresh.
export function Drapeau({ nation, taille = 1 }: { nation: string; taille?: number }) {
  const nom = nomNation(nation);
  const code = codeDrapeau(nom);
  if (!code) return <span>{String(nation ?? '').split(' ')[0]}</span>;
  return (
    <span
      className={`fi fi-${code}`}
      title={nomNationTraduit(nom)}
      style={{ fontSize: `${taille}rem`, borderRadius: '2px', flex: 'none' }}
    />
  );
}
