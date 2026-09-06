import { CODE_PAR_NATION } from '../data/nations.js';
import { langueCourante } from './i18n.js';

const CODES: Record<string, string> = {
  ...CODE_PAR_NATION,
  'Grande-Bretagne': 'gb',
  Jersey: 'je',
  'Samoa Américaines': 'as',
  'Îles Caïmans': 'ky',
  Bermudes: 'bm',
  Guam: 'gu',
  Nigéria: 'ng',
  Tchéquie: 'cz',
  'République Démocratique du Congo': 'cd',
  Myanmar: 'mm',
  Vietnam: 'vn',
};

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
  'République Tchèque': 'République tchèque',
  Israel: 'Israël',
  'Iles Salomon': 'Îles Salomon',
  'Papouasie Nouvelle-Guinée': 'Papouasie-Nouvelle-Guinée',
  Angleterre_A: 'Angleterre',
  Galles: 'Pays de Galles',
  USA: 'États-Unis',
  'All Blacks': 'Nouvelle-Zélande',
  'Māori All Blacks': 'Nouvelle-Zélande',
};

/** Nom français canonique, stable pour les clés de calendrier et classement. */
export function nomNation(nation: string | undefined | null): string {
  const nom = String(nation ?? '').replace(/^[^A-Za-zÀ-ÿ]+/, '').trim();
  return ALIAS[nom] ?? nom;
}

export function codeDrapeau(nation: string | undefined | null): string | undefined {
  return CODES[nomNation(nation)];
}

export function aDrapeau(nation: string): boolean {
  return codeDrapeau(nation) !== undefined;
}

export function nomNationTraduit(nation: string | undefined | null): string {
  const nom = nomNation(nation);
  const langue = langueCourante();
  const particuliers: Record<string, Partial<Record<typeof langue, string>>> = {
    Angleterre: { fr: 'Angleterre', en: 'England', es: 'Inglaterra', it: 'Inghilterra', de: 'England', pt: 'Inglaterra', ja: 'イングランド' },
    Écosse: { fr: 'Écosse', en: 'Scotland', es: 'Escocia', it: 'Scozia', de: 'Schottland', pt: 'Escócia', ja: 'スコットランド' },
    'Pays de Galles': { fr: 'Pays de Galles', en: 'Wales', es: 'Gales', it: 'Galles', de: 'Wales', pt: 'País de Gales', ja: 'ウェールズ' },
    'Irlande du Nord': { fr: 'Irlande du Nord', en: 'Northern Ireland', es: 'Irlanda del Norte', it: 'Irlanda del Nord', de: 'Nordirland', pt: 'Irlanda do Norte', ja: '北アイルランド' },
  };
  const particulier = particuliers[nom]?.[langue];
  if (particulier) return particulier;

  const code = codeDrapeau(nom);
  if (!code) return nom;
  const region = code === 'gb' ? 'GB' : code.toUpperCase();
  try {
    return new Intl.DisplayNames([langue === 'ja' ? 'ja-JP' : langue], { type: 'region' }).of(region) ?? nom;
  } catch {
    return nom;
  }
}
