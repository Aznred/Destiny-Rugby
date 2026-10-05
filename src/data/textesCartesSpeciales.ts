import type { Traduction } from '../lib/i18n.js';

/**
 * Les textes publics des cartes spéciales (ICONS, Halloween). Les mots ICON et
 * HALLOWEEN restent tels quels dans toutes les langues : ce sont des noms de
 * collection, imprimés sur la carte. Le Labo, réservé à Kiri, reste en français.
 */
export const TEXTES_CARTES_SPECIALES: Record<string, Traduction> = {
  'special.legend': { fr: 'Légende', en: 'Legend', es: 'Leyenda', it: 'Leggenda', de: 'Legende', pt: 'Lenda', ja: 'レジェンド' },
  'special.icons': { fr: 'ICONS', en: 'ICONS', es: 'ICONS', it: 'ICONS', de: 'ICONS', pt: 'ICONS', ja: 'ICONS' },
  'special.halloween': { fr: 'HALLOWEEN', en: 'HALLOWEEN', es: 'HALLOWEEN', it: 'HALLOWEEN', de: 'HALLOWEEN', pt: 'HALLOWEEN', ja: 'HALLOWEEN' },
  'special.filter.label': { fr: 'Type de carte', en: 'Card type', es: 'Tipo de carta', it: 'Tipo di carta', de: 'Kartentyp', pt: 'Tipo de carta', ja: 'カードの種類' },
  'special.filter.players': { fr: 'Joueurs', en: 'Players', es: 'Jugadores', it: 'Giocatori', de: 'Spieler', pt: 'Jogadores', ja: '選手' },
  'special.collection.section': { fr: 'Cartes spéciales', en: 'Special cards', es: 'Cartas especiales', it: 'Carte speciali', de: 'Sonderkarten', pt: 'Cartas especiais', ja: 'スペシャルカード' },
  'special.collection.players': { fr: 'Joueurs du monde', en: 'Players from around the world', es: 'Jugadores del mundo', it: 'Giocatori dal mondo', de: 'Spieler aus aller Welt', pt: 'Jogadores do mundo', ja: '世界の選手' },
  'special.collection.disabled': {
    fr: 'Les cartes spéciales sont désactivées dans cette ligue.', en: 'Special cards are disabled in this league.',
    es: 'Las cartas especiales están desactivadas en esta liga.', it: 'Le carte speciali sono disattivate in questa lega.',
    de: 'Sonderkarten sind in dieser Liga deaktiviert.', pt: 'As cartas especiais estão desativadas nesta liga.', ja: 'このリーグではスペシャルカードが無効です。',
  },
  'special.league.option': { fr: 'Autoriser les cartes spéciales', en: 'Allow special cards', es: 'Permitir cartas especiales', it: 'Consenti le carte speciali', de: 'Sonderkarten erlauben', pt: 'Permitir cartas especiais', ja: 'スペシャルカードを許可' },
  'special.league.optionHelp': {
    fr: 'ICONS, Halloween et les prochains événements : dans les packs, la collection, les équipes et le marché.',
    en: 'ICONS, Halloween and future events: in packs, the collection, squads and the market.',
    es: 'ICONS, Halloween y los próximos eventos: en los sobres, la colección, las plantillas y el mercado.',
    it: 'ICONS, Halloween e i prossimi eventi: nei pacchetti, nella collezione, nelle squadre e sul mercato.',
    de: 'ICONS, Halloween und kommende Events: in Packs, Sammlung, Kadern und auf dem Markt.',
    pt: 'ICONS, Halloween e os próximos eventos: nos pacotes, na coleção, nas equipas e no mercado.',
    ja: 'ICONS、ハロウィン、今後のイベント：パック、コレクション、チーム、マーケットに登場します。',
  },
  'special.league.eyebrow': { fr: 'Réglage du commissaire', en: 'Commissioner setting', es: 'Ajuste del comisario', it: 'Impostazione del commissario', de: 'Einstellung des Ligaleiters', pt: 'Definição do comissário', ja: 'コミッショナー設定' },
  'special.league.title': { fr: 'Cartes spéciales', en: 'Special cards', es: 'Cartas especiales', it: 'Carte speciali', de: 'Sonderkarten', pt: 'Cartas especiais', ja: 'スペシャルカード' },
  'special.league.help': {
    fr: 'Les légendes ICONS toute l’année, les cartes Halloween jusqu’à fin novembre. Désactivées, aucune carte spéciale n’apparaît dans cette ligue.',
    en: 'ICONS legends all year round, Halloween cards until the end of November. When disabled, no special card appears in this league.',
    es: 'Las leyendas ICONS todo el año, las cartas Halloween hasta finales de noviembre. Desactivadas, ninguna carta especial aparece en esta liga.',
    it: 'Le leggende ICONS tutto l’anno, le carte Halloween fino a fine novembre. Disattivate, nessuna carta speciale compare in questa lega.',
    de: 'ICONS-Legenden das ganze Jahr, Halloween-Karten bis Ende November. Deaktiviert erscheint keine Sonderkarte in dieser Liga.',
    pt: 'As lendas ICONS todo o ano, as cartas Halloween até ao fim de novembro. Desativadas, nenhuma carta especial aparece nesta liga.',
    ja: 'ICONSのレジェンドは通年、ハロウィンカードは11月末まで。無効にすると、このリーグにスペシャルカードは登場しません。',
  },
  'special.league.on': { fr: 'Autorisées', en: 'Allowed', es: 'Permitidas', it: 'Consentite', de: 'Erlaubt', pt: 'Permitidas', ja: '許可中' },
  'special.league.off': { fr: 'Désactivées', en: 'Disabled', es: 'Desactivadas', it: 'Disattivate', de: 'Deaktiviert', pt: 'Desativadas', ja: '無効' },
  'special.league.enable': { fr: 'Autoriser', en: 'Allow', es: 'Permitir', it: 'Consenti', de: 'Erlauben', pt: 'Permitir', ja: '許可する' },
  'special.league.disable': { fr: 'Désactiver', en: 'Disable', es: 'Desactivar', it: 'Disattiva', de: 'Deaktivieren', pt: 'Desativar', ja: '無効にする' },
  'special.league.locked': {
    fr: 'Des clubs en possèdent déjà : elles restent autorisées.', en: 'Clubs already own some: they stay allowed.',
    es: 'Algunos clubes ya tienen: siguen permitidas.', it: 'Alcuni club ne possiedono già: restano consentite.',
    de: 'Vereine besitzen bereits welche: Sie bleiben erlaubt.', pt: 'Alguns clubes já as têm: continuam permitidas.', ja: '既に所有しているクラブがあるため、許可のままです。',
  },
  'special.league.savedOn': {
    fr: 'Les cartes spéciales sont autorisées dans la ligue.', en: 'Special cards are now allowed in the league.',
    es: 'Las cartas especiales están permitidas en la liga.', it: 'Le carte speciali sono consentite nella lega.',
    de: 'Sonderkarten sind in der Liga erlaubt.', pt: 'As cartas especiais estão permitidas na liga.', ja: 'リーグでスペシャルカードが許可されました。',
  },
  'special.league.savedOff': {
    fr: 'Les cartes spéciales sont désactivées dans la ligue.', en: 'Special cards are now disabled in the league.',
    es: 'Las cartas especiales están desactivadas en la liga.', it: 'Le carte speciali sono disattivate nella lega.',
    de: 'Sonderkarten sind in der Liga deaktiviert.', pt: 'As cartas especiais estão desativadas na liga.', ja: 'リーグでスペシャルカードが無効になりました。',
  },
  'special.shop.packName': { fr: 'Pack {name}', en: '{name} pack', es: 'Sobre {name}', it: 'Pacchetto {name}', de: '{name}-Pack', pt: 'Pacote {name}', ja: '{name}パック' },
  'special.shop.event': { fr: 'Événement limité', en: 'Limited event', es: 'Evento limitado', it: 'Evento limitato', de: 'Begrenztes Event', pt: 'Evento limitado', ja: '期間限定イベント' },
  'special.shop.until': { fr: 'Jusqu’au {date}', en: 'Until {date}', es: 'Hasta el {date}', it: 'Fino al {date}', de: 'Bis {date}', pt: 'Até {date}', ja: '{date}まで' },
  'special.shop.open': { fr: 'Ouvrir · {price} Ovas', en: 'Open · {price} Ovas', es: 'Abrir · {price} Ovas', it: 'Apri · {price} Ovas', de: 'Öffnen · {price} Ovas', pt: 'Abrir · {price} Ovas', ja: '開封 · {price} Ovas' },
  'special.shop.guaranteed': { fr: 'Une carte {name} garantie', en: 'One {name} card guaranteed', es: 'Una carta {name} garantizada', it: 'Una carta {name} garantita', de: 'Eine {name}-Karte garantiert', pt: 'Uma carta {name} garantida', ja: '{name}カード1枚確定' },
  'special.shop.perCard': { fr: '{name} : {n} % par carte', en: '{name}: {n}% per card', es: '{name}: {n} % por carta', it: '{name}: {n}% per carta', de: '{name}: {n} % pro Karte', pt: '{name}: {n} % por carta', ja: '{name}：1枚あたり{n}%' },
  'special.shop.odds': { fr: 'Cartes spéciales', en: 'Special cards', es: 'Cartas especiales', it: 'Carte speciali', de: 'Sonderkarten', pt: 'Cartas especiais', ja: 'スペシャルカード' },
  'special.shop.missing': { fr: 'Il te manque {n} Ovas.', en: 'You need {n} more Ovas.', es: 'Te faltan {n} Ovas.', it: 'Ti mancano {n} Ovas.', de: 'Dir fehlen {n} Ovas.', pt: 'Faltam-te {n} Ovas.', ja: 'あと{n} Ovas必要です。' },
  'special.chemistry.floor': {
    fr: 'Carte spéciale : collectif garanti {points}/{max}.', en: 'Special card: guaranteed chemistry {points}/{max}.',
    es: 'Carta especial: colectivo garantizado {points}/{max}.', it: 'Carta speciale: collettivo garantito {points}/{max}.',
    de: 'Sonderkarte: garantierter Teamgeist {points}/{max}.', pt: 'Carta especial: coletivo garantido {points}/{max}.', ja: 'スペシャルカード：連携 {points}/{max} 保証。',
  },
};
