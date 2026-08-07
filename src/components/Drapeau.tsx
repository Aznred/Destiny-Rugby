
import { CODE_PAR_NATION } from '../data/nations';
import { langueCourante } from '../lib/i18n';

// Vrai drapeau SVG (lib flag-icons, locale — les emojis drapeaux ne s'affichent
// pas sous Windows). Accepte une nation au format « 🇫🇷 France ».
// La table vient de data/nations.ts (202 nations) ; on y ajoute les
// orthographes et entités croisées dans les données réelles.
const CODES: Record<string, string> = {
  ...CODE_PAR_NATION,
  'Grande-Bretagne': 'gb',
  Jersey: 'je',
  'Samoa Américaines': 'as',
  Nigéria: 'ng',
  Tchéquie: 'cz',
  'République Démocratique du Congo': 'cd',

  Myanmar: 'mm',
  Vietnam: 'vn',
};

// Orthographes alternatives (les données réelles écrivent « Nouvelle Zélande »,
// « Ecosse », « Etats-Unis »… sans trait d'union ni accent).
const ALIAS: Record<string, string> = {
  'Nouvelle Zélande': 'Nouvelle-Zélande',
  Ecosse: 'Écosse',
  'Etats-Unis': 'États-Unis',
  'Samoa occidental': 'Samoa',
  'Afrique du sud': 'Afrique du Sud',
  'Pays-de-Galles': 'Pays de Galles',
  'République démocratique du Congo': 'République Démocratique du Congo',
  "Côte d'Ivoire": 'Côte d’Ivoire',
  'Ile de Jersey': 'Jersey',
  'Republique tcheque': 'République tchèque',
  Tcheque: 'République tchèque',
  Angleterre_A: 'Angleterre',
  // Sélections : noms d'usage des équipes internationales
  Galles: 'Pays de Galles',
  USA: 'États-Unis',
  'All Blacks': 'Nouvelle-Zélande',
  'Māori All Blacks': 'Nouvelle-Zélande',
};

// Le drapeau existe-t-il ? (les Barbarians n'ont pas de pays)
export function aDrapeau(nation: string): boolean {
  return CODES[nomNation(nation)] !== undefined;
}

// Retire l'emoji de tête pour ne garder que le nom (« 🇫🇷 France » → « France »).
export function nomNation(nation: string | undefined | null): string {
  const nom = String(nation ?? '').replace(/^[^A-Za-zÀ-ÿ]+/, '').trim();
  return ALIAS[nom] ?? nom;
}

/**
 * Libellé de présentation d'une nation. `nomNation()` reste volontairement
 * français et stable : il sert aussi de clé dans les calendriers et les
 * classements. Cette fonction est réservée à l'interface.
 */
export function nomNationTraduit(nation: string | undefined | null): string {
  const nom = nomNation(nation);
  const langue = langueCourante();
  const casParticuliers: Record<string, Partial<Record<typeof langue, string>>> = {
    Angleterre: { fr: 'Angleterre', en: 'England', es: 'Inglaterra', it: 'Inghilterra', de: 'England', pt: 'Inglaterra', ja: 'イングランド' },
    'Écosse': { fr: 'Écosse', en: 'Scotland', es: 'Escocia', it: 'Scozia', de: 'Schottland', pt: 'Escócia', ja: 'スコットランド' },
    'Pays de Galles': { fr: 'Pays de Galles', en: 'Wales', es: 'Gales', it: 'Galles', de: 'Wales', pt: 'País de Gales', ja: 'ウェールズ' },
    'Irlande du Nord': { fr: 'Irlande du Nord', en: 'Northern Ireland', es: 'Irlanda del Norte', it: 'Irlanda del Nord', de: 'Nordirland', pt: 'Irlanda do Norte', ja: '北アイルランド' },
  };
  const particulier = casParticuliers[nom]?.[langue];
  if (particulier) return particulier;

  const code = CODES[nom];
  if (!code) return nom;
  const region = code === 'gb' ? 'GB' : code.toUpperCase();
  try {
    return new Intl.DisplayNames([langue === 'ja' ? 'ja-JP' : langue], { type: 'region' }).of(region) ?? nom;
  } catch {
    return nom;
  }
}

export function Drapeau({ nation, taille = 1 }: { nation: string; taille?: number }) {
  const nom = nomNation(nation);
  const code = CODES[nom];
  if (!code) return <span>{String(nation ?? '').split(' ')[0]}</span>;
  return (
    <span
      className={`fi fi-${code}`}
      title={nomNationTraduit(nom)}
      style={{ fontSize: `${taille}rem`, borderRadius: '2px', flex: 'none' }}
    />
  );
}
