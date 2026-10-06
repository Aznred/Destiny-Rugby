import type { Traduction } from '../lib/i18n.js';

// LES NOMS ET DESCRIPTIONS DES KITS DE LA BOUTIQUE (Correctif 21), dans les sept langues.
// ⚠️ LE FRANÇAIS DE CHAQUE LIGNE EST LE TEXTE CANONIQUE DES DONNÉES (`data/kitsBoutique.ts`) : `texteTraduit()` le
// reconnaît à l'identique et rend la langue du joueur. Retoucher un texte là-bas sans le retoucher ici le laisse en français.

const l = (fr: string, en: string, es: string, it: string, de: string, pt: string, ja: string): Traduction => ({ fr, en, es, it, de, pt, ja });

const LIGNES: Traduction[] = [
  // ── Kits ────────────────────────────────────────────────────────────────────────────────────────
  l('Destiny · Classique', 'Destiny · Classic', 'Destiny · Clásica', 'Destiny · Classica', 'Destiny · Klassik', 'Destiny · Clássica', 'デスティニー・クラシック'),
  l('Le vert profond du stade de nuit, liseré doré. Le maillot de la maison.', 'The deep green of the night stadium, gold piping. The house shirt.', 'El verde profundo del estadio de noche, ribete dorado. La camiseta de la casa.', 'Il verde profondo dello stadio di notte, bordo dorato. La maglia di casa.', 'Das tiefe Grün des Nachtstadions, goldene Paspel. Das Haustrikot.', 'O verde profundo do estádio à noite, debrum dourado. A camisola da casa.', '夜のスタジアムの深い緑に金のパイピング。ホームのユニフォーム。'),
  l('Destiny · Nuit', 'Destiny · Night', 'Destiny · Noche', 'Destiny · Notte', 'Destiny · Nacht', 'Destiny · Noite', 'デスティニー・ナイト'),
  l('Bleu minuit, diagonale électrique. Fait pour les matchs sous les projecteurs.', 'Midnight blue, electric diagonal. Made for matches under the floodlights.', 'Azul medianoche, diagonal eléctrica. Hecha para los partidos bajo los focos.', 'Blu notte, diagonale elettrica. Fatta per le partite sotto i riflettori.', 'Mitternachtsblau, elektrische Diagonale. Gemacht für Spiele unter Flutlicht.', 'Azul-meia-noite, diagonal elétrica. Feita para os jogos sob os projetores.', '真夜中の青に電気的な斜め柄。ナイトゲーム向け。'),
  l('Destiny · Or', 'Destiny · Gold', 'Destiny · Oro', 'Destiny · Oro', 'Destiny · Gold', 'Destiny · Ouro', 'デスティニー・ゴールド'),
  l('Or satiné et noir de fumée. À ne sortir que les soirs de finale.', 'Satin gold and smoky black. Only for final nights.', 'Oro satinado y negro humo. Solo para las noches de final.', 'Oro satinato e nero fumo. Da sfoggiare solo nelle sere di finale.', 'Seidiges Gold und Rauchschwarz. Nur für Finalabende.', 'Ouro acetinado e preto-fumo. Só para as noites de final.', 'サテンゴールドとスモークブラック。決勝の夜だけに。'),
  l('Rétro 1984', 'Retro 1984', 'Retro 1984', 'Retrò 1984', 'Retro 1984', 'Retro 1984', 'レトロ1984'),
  l('Cerceaux larges sur coton crème, col blanc. Comme sur les photos jaunies du club-house.', 'Wide hoops on cream cotton, white collar. Like the yellowed photos in the clubhouse.', 'Aros anchos sobre algodón crema, cuello blanco. Como en las fotos amarillentas del club.', 'Cerchi larghi su cotone crema, colletto bianco. Come nelle foto ingiallite del club-house.', 'Breite Ringel auf cremefarbener Baumwolle, weißer Kragen. Wie auf den vergilbten Fotos im Clubhaus.', 'Riscas largas em algodão creme, gola branca. Como nas fotos amareladas do clube.', 'クリームのコットンに太いフープ、白い襟。クラブハウスの色あせた写真のように。'),
  l('Rétro 1996', 'Retro 1996', 'Retro 1996', 'Retrò 1996', 'Retro 1996', 'Retro 1996', 'レトロ1996'),
  l('Rayures vert bouteille sur beige, la grande époque des tournées d’été.', 'Bottle-green stripes on beige, the golden age of summer tours.', 'Rayas verde botella sobre beige, la gran época de las giras de verano.', 'Righe verde bottiglia su beige, la grande epoca delle tournée estive.', 'Flaschengrüne Streifen auf Beige, die große Zeit der Sommertourneen.', 'Riscas verde-garrafa sobre bege, a grande época das digressões de verão.', 'ベージュにボトルグリーンのストライプ。夏のツアー全盛期。'),
  l('Rétro Atlantique', 'Retro Atlantic', 'Retro Atlántico', 'Retrò Atlantico', 'Retro Atlantik', 'Retro Atlântico', 'レトロ・アトランティック'),
  l('Blanc et noir à cerceaux serrés, comme une marinière de pêcheur.', 'Black and white in tight hoops, like a fisherman’s sailor top.', 'Blanco y negro en aros apretados, como una marinera de pescador.', 'Bianco e nero a cerchi stretti, come una maglia da pescatore.', 'Schwarz-Weiß in engen Ringeln, wie ein Fischerhemd.', 'Branco e preto em riscas apertadas, como uma camisola de pescador.', '白と黒の細いフープ。漁師のボーダーシャツのように。'),
  l('Le Fromager', 'The Cheesemaker', 'El Quesero', 'Il Casaro', 'Der Käser', 'O Queijeiro', 'チーズ職人'),
  l('Jaune tomme et trous de gruyère. On sent l’équipe arriver.', 'Cheese-yellow with Swiss-cheese holes. You can smell the team coming.', 'Amarillo queso y agujeros de gruyère. Se huele al equipo llegar.', 'Giallo formaggio e buchi da groviera. Si sente arrivare la squadra.', 'Käsegelb mit Emmentaler-Löchern. Man riecht die Mannschaft kommen.', 'Amarelo-queijo e buracos de gruyère. Cheira-se a equipa a chegar.', 'チーズの黄色とグリュイエールの穴。チームが来るのが匂いでわかる。'),
  l('La Pastèque', 'The Watermelon', 'La Sandía', 'L’Anguria', 'Die Wassermelone', 'A Melancia', 'スイカ'),
  l('Vert écorce et rose chair. Léger, comme un après-midi de juillet.', 'Rind green and flesh pink. Light, like a July afternoon.', 'Verde corteza y rosa pulpa. Ligera, como una tarde de julio.', 'Verde buccia e rosa polpa. Leggera, come un pomeriggio di luglio.', 'Schalengrün und Fruchtrosa. Leicht wie ein Julinachmittag.', 'Verde-casca e rosa-polpa. Leve, como uma tarde de julho.', '皮の緑と果肉のピンク。7月の午後のように軽やか。'),
  l('Le Flamant', 'The Flamingo', 'El Flamenco', 'Il Fenicottero', 'Der Flamingo', 'O Flamingo', 'フラミンゴ'),
  l('Rose fluo, épaules blanches. Impossible de ne pas vous voir.', 'Neon pink, white shoulders. Impossible not to see you.', 'Rosa fluorescente, hombros blancos. Imposible no veros.', 'Rosa fluo, spalle bianche. Impossibile non vedervi.', 'Neonrosa, weiße Schultern. Man kann euch nicht übersehen.', 'Rosa-fluorescente, ombros brancos. Impossível não vos ver.', '蛍光ピンクに白い肩。見逃しようがない。'),
  l('Champion en titre', 'Reigning Champion', 'Campeón en título', 'Campione in carica', 'Titelverteidiger', 'Campeão em título', '現王者'),
  l('Or et blanc brodés de l’étoile du titre. Il ne s’achète pas : il se gagne.', 'Gold and white embroidered with the title star. It can’t be bought: it is won.', 'Oro y blanco bordados con la estrella del título. No se compra: se gana.', 'Oro e bianco ricamati con la stella del titolo. Non si compra: si vince.', 'Gold und Weiß mit dem Titelstern bestickt. Er ist nicht käuflich: Man gewinnt ihn.', 'Ouro e branco bordados com a estrela do título. Não se compra: ganha-se.', 'タイトルの星が刺繍された金と白。買えません、勝ち取るものです。'),
  l('Gagner un titre de champion', 'Win a championship title', 'Ganar un título de campeón', 'Vincere un titolo di campione', 'Einen Meistertitel gewinnen', 'Ganhar um título de campeão', '優勝タイトルを獲得する'),
];

/** Une clé stable par ligne : `ui.art21.<rang>`. `texteTraduit()` retrouve la ligne par son texte français. */
export const TEXTES_ARTICLES_21: Record<string, Traduction> = Object.fromEntries(LIGNES.map((t, i) => [`ui.art21.${i}`, t]));
