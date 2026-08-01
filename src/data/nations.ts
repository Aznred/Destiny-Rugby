// TOUTES LES NATIONS DU MONDE, en français, avec leur code de drapeau
// (flag-icons, ISO 3166-1 alpha-2 — plus les quatre nations britanniques, qui
// jouent séparément au rugby).
//
// Format compact « Nom|code » : c'est la source unique de vérité pour la liste
// de création ET pour <Drapeau> (src/components/Drapeau.tsx en dérive sa table
// de codes). Les nations sont groupées par zone, l'ordre de la liste étant
// celui qu'on veut voir dans le menu déroulant.

export interface ZoneNations {
  zone: string;
  nations: { nom: string; code: string }[];
}

function zone(nom: string, brut: string): ZoneNations {
  return {
    zone: nom,
    nations: brut
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [n, code] = l.split('|');
        return { nom: n.trim(), code: code.trim() };
      }),
  };
}

export const ZONES: ZoneNations[] = [
  zone('Nations de tête', `
France|fr
Angleterre|gb-eng
Irlande|ie
Écosse|gb-sct
Pays de Galles|gb-wls
Italie|it
Nouvelle-Zélande|nz
Afrique du Sud|za
Australie|au
Argentine|ar
`),
  zone('Europe', `
Albanie|al
Allemagne|de
Andorre|ad
Arménie|am
Autriche|at
Azerbaïdjan|az
Belgique|be
Biélorussie|by
Bosnie-Herzégovine|ba
Bulgarie|bg
Chypre|cy
Croatie|hr
Danemark|dk
Espagne|es
Estonie|ee
Finlande|fi
Géorgie|ge
Grèce|gr
Hongrie|hu
Islande|is
Kosovo|xk
Lettonie|lv
Liechtenstein|li
Lituanie|lt
Luxembourg|lu
Macédoine du Nord|mk
Malte|mt
Moldavie|md
Monaco|mc
Monténégro|me
Norvège|no
Pays-Bas|nl
Pologne|pl
Portugal|pt
République tchèque|cz
Roumanie|ro
Russie|ru
Saint-Marin|sm
Serbie|rs
Slovaquie|sk
Slovénie|si
Suède|se
Suisse|ch
Turquie|tr
Ukraine|ua
Vatican|va
`),
  zone('Afrique', `
Afrique centrale|cf
Algérie|dz
Angola|ao
Bénin|bj
Botswana|bw
Burkina Faso|bf
Burundi|bi
Cameroun|cm
Cap-Vert|cv
Comores|km
Congo|cg
Côte d’Ivoire|ci
Djibouti|dj
Égypte|eg
Érythrée|er
Eswatini|sz
Éthiopie|et
Gabon|ga
Gambie|gm
Ghana|gh
Guinée|gn
Guinée-Bissau|gw
Guinée équatoriale|gq
Kenya|ke
Lesotho|ls
Liberia|lr
Libye|ly
Madagascar|mg
Malawi|mw
Mali|ml
Maroc|ma
Maurice|mu
Mauritanie|mr
Mozambique|mz
Namibie|na
Niger|ne
Nigeria|ng
Ouganda|ug
République démocratique du Congo|cd
Rwanda|rw
São Tomé-et-Príncipe|st
Sénégal|sn
Seychelles|sc
Sierra Leone|sl
Somalie|so
Soudan|sd
Soudan du Sud|ss
Tanzanie|tz
Tchad|td
Togo|tg
Tunisie|tn
Zambie|zm
Zimbabwe|zw
`),
  zone('Amériques', `
Antigua-et-Barbuda|ag
Bahamas|bs
Barbade|bb
Belize|bz
Bolivie|bo
Brésil|br
Canada|ca
Chili|cl
Colombie|co
Costa Rica|cr
Cuba|cu
Dominique|dm
Équateur|ec
États-Unis|us
Grenade|gd
Guatemala|gt
Guyana|gy
Haïti|ht
Honduras|hn
Jamaïque|jm
Mexique|mx
Nicaragua|ni
Panama|pa
Paraguay|py
Pérou|pe
République dominicaine|do
Saint-Christophe-et-Niévès|kn
Saint-Vincent-et-les-Grenadines|vc
Sainte-Lucie|lc
Salvador|sv
Suriname|sr
Trinité-et-Tobago|tt
Uruguay|uy
Venezuela|ve
`),
  zone('Asie', `
Afghanistan|af
Arabie saoudite|sa
Bahreïn|bh
Bangladesh|bd
Bhoutan|bt
Birmanie|mm
Brunei|bn
Cambodge|kh
Chine|cn
Corée du Nord|kp
Corée du Sud|kr
Émirats arabes unis|ae
Hong Kong|hk
Inde|in
Indonésie|id
Irak|iq
Iran|ir
Israël|il
Japon|jp
Jordanie|jo
Kazakhstan|kz
Kirghizistan|kg
Koweït|kw
Laos|la
Liban|lb
Malaisie|my
Maldives|mv
Mongolie|mn
Népal|np
Oman|om
Ouzbékistan|uz
Pakistan|pk
Palestine|ps
Philippines|ph
Qatar|qa
Singapour|sg
Sri Lanka|lk
Syrie|sy
Tadjikistan|tj
Taïwan|tw
Thaïlande|th
Timor oriental|tl
Turkménistan|tm
Viêt Nam|vn
Yémen|ye
`),
  zone('Océanie', `
Fidji|fj
Samoa|ws
Tonga|to
Papouasie-Nouvelle-Guinée|pg
Îles Cook|ck
Îles Marshall|mh
Îles Salomon|sb
Kiribati|ki
Micronésie|fm
Nauru|nr
Niue|nu
Palaos|pw
Tuvalu|tv
Vanuatu|vu
`),
];

// Toutes les nations, à plat.
export const NATIONS_MONDE = ZONES.flatMap((z) => z.nations);

// Nom → code de drapeau, pour <Drapeau>.
export const CODE_PAR_NATION: Record<string, string> = Object.fromEntries(
  NATIONS_MONDE.map((n) => [n.nom, n.code]),
);
