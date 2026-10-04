//#region src/data/nations.ts
function e(e, t) {
	return {
		zone: e,
		nations: t.trim().split("\n").map((e) => e.trim()).filter(Boolean).map((e) => {
			let [t, n] = e.split("|");
			return {
				nom: t.trim(),
				code: n.trim()
			};
		})
	};
}
var t = [
	e("Nations de tête", "\nFrance|fr\nAngleterre|gb-eng\nIrlande|ie\nÉcosse|gb-sct\nPays de Galles|gb-wls\nItalie|it\nNouvelle-Zélande|nz\nAfrique du Sud|za\nAustralie|au\nArgentine|ar\n"),
	e("Europe", "\nAlbanie|al\nAllemagne|de\nAndorre|ad\nArménie|am\nAutriche|at\nAzerbaïdjan|az\nBelgique|be\nBiélorussie|by\nBosnie-Herzégovine|ba\nBulgarie|bg\nChypre|cy\nCroatie|hr\nDanemark|dk\nEspagne|es\nEstonie|ee\nFinlande|fi\nGéorgie|ge\nGrèce|gr\nHongrie|hu\nIslande|is\nKosovo|xk\nLettonie|lv\nLiechtenstein|li\nLituanie|lt\nLuxembourg|lu\nMacédoine du Nord|mk\nMalte|mt\nMoldavie|md\nMonaco|mc\nMonténégro|me\nNorvège|no\nPays-Bas|nl\nPologne|pl\nPortugal|pt\nRépublique tchèque|cz\nRoumanie|ro\nRussie|ru\nSaint-Marin|sm\nSerbie|rs\nSlovaquie|sk\nSlovénie|si\nSuède|se\nSuisse|ch\nTurquie|tr\nUkraine|ua\nVatican|va\n"),
	e("Afrique", "\nAfrique centrale|cf\nAlgérie|dz\nAngola|ao\nBénin|bj\nBotswana|bw\nBurkina Faso|bf\nBurundi|bi\nCameroun|cm\nCap-Vert|cv\nComores|km\nCongo|cg\nCôte d’Ivoire|ci\nDjibouti|dj\nÉgypte|eg\nÉrythrée|er\nEswatini|sz\nÉthiopie|et\nGabon|ga\nGambie|gm\nGhana|gh\nGuinée|gn\nGuinée-Bissau|gw\nGuinée équatoriale|gq\nKenya|ke\nLesotho|ls\nLiberia|lr\nLibye|ly\nMadagascar|mg\nMalawi|mw\nMali|ml\nMaroc|ma\nMaurice|mu\nMauritanie|mr\nMozambique|mz\nNamibie|na\nNiger|ne\nNigeria|ng\nOuganda|ug\nRépublique démocratique du Congo|cd\nRwanda|rw\nSão Tomé-et-Príncipe|st\nSénégal|sn\nSeychelles|sc\nSierra Leone|sl\nSomalie|so\nSoudan|sd\nSoudan du Sud|ss\nTanzanie|tz\nTchad|td\nTogo|tg\nTunisie|tn\nZambie|zm\nZimbabwe|zw\n"),
	e("Amériques", "\nAntigua-et-Barbuda|ag\nBahamas|bs\nBarbade|bb\nBelize|bz\nBolivie|bo\nBrésil|br\nCanada|ca\nChili|cl\nColombie|co\nCosta Rica|cr\nCuba|cu\nDominique|dm\nÉquateur|ec\nÉtats-Unis|us\nGrenade|gd\nGuatemala|gt\nGuyana|gy\nHaïti|ht\nHonduras|hn\nJamaïque|jm\nMexique|mx\nNicaragua|ni\nPanama|pa\nParaguay|py\nPérou|pe\nRépublique dominicaine|do\nSaint-Christophe-et-Niévès|kn\nSaint-Vincent-et-les-Grenadines|vc\nSainte-Lucie|lc\nSalvador|sv\nSuriname|sr\nTrinité-et-Tobago|tt\nUruguay|uy\nVenezuela|ve\n"),
	e("Asie", "\nAfghanistan|af\nArabie saoudite|sa\nBahreïn|bh\nBangladesh|bd\nBhoutan|bt\nBirmanie|mm\nBrunei|bn\nCambodge|kh\nChine|cn\nCorée du Nord|kp\nCorée du Sud|kr\nÉmirats arabes unis|ae\nHong Kong|hk\nInde|in\nIndonésie|id\nIrak|iq\nIran|ir\nIsraël|il\nJapon|jp\nJordanie|jo\nKazakhstan|kz\nKirghizistan|kg\nKoweït|kw\nLaos|la\nLiban|lb\nMalaisie|my\nMaldives|mv\nMongolie|mn\nNépal|np\nOman|om\nOuzbékistan|uz\nPakistan|pk\nPalestine|ps\nPhilippines|ph\nQatar|qa\nSingapour|sg\nSri Lanka|lk\nSyrie|sy\nTadjikistan|tj\nTaïwan|tw\nThaïlande|th\nTimor oriental|tl\nTurkménistan|tm\nViêt Nam|vn\nYémen|ye\n"),
	e("Océanie", "\nFidji|fj\nSamoa|ws\nTonga|to\nPapouasie-Nouvelle-Guinée|pg\nÎles Cook|ck\nÎles Marshall|mh\nÎles Salomon|sb\nKiribati|ki\nMicronésie|fm\nNauru|nr\nNiue|nu\nPalaos|pw\nTuvalu|tv\nVanuatu|vu\n")
], n = t.flatMap((e) => e.nations);
Object.fromEntries(n.map((e) => [e.nom, e.code]));
var r = "fr";
function i() {
	return r;
}
//#endregion
//#region src/data/rugby.ts
var a = [
	{
		id: "pilier_gauche",
		numero: 1,
		famille: "pilier",
		nom: "Pilier gauche",
		categorie: "Avant",
		description: "Le pilier « tête close ». Il encaisse toute la poussée adverse en mêlée.",
		cles: [
			"force",
			"endurance",
			"plaquage"
		]
	},
	{
		id: "talonneur",
		numero: 2,
		famille: "talonneur",
		nom: "Talonneur",
		categorie: "Avant",
		description: "Cœur de la mêlée et lanceur en touche. Technique et gnaque.",
		cles: [
			"force",
			"passe",
			"mental"
		]
	},
	{
		id: "pilier_droit",
		numero: 3,
		famille: "pilier",
		nom: "Pilier droit",
		categorie: "Avant",
		description: "Le pilier « tête libre ». Puissance brute et travail de l’ombre.",
		cles: [
			"force",
			"endurance",
			"plaquage"
		]
	},
	{
		id: "deuxieme_ligne_g",
		numero: 4,
		famille: "deuxieme_ligne",
		nom: "Deuxième ligne (4)",
		categorie: "Avant",
		description: "La tour. Domine les airs en touche, abat un travail colossal.",
		cles: [
			"force",
			"endurance",
			"plaquage"
		]
	},
	{
		id: "deuxieme_ligne_d",
		numero: 5,
		famille: "deuxieme_ligne",
		nom: "Deuxième ligne (5)",
		categorie: "Avant",
		description: "Sauteur en touche et moteur de la mêlée.",
		cles: [
			"force",
			"endurance",
			"plaquage"
		]
	},
	{
		id: "troisieme_aile_g",
		numero: 6,
		famille: "troisieme_ligne",
		nom: "Troisième ligne aile (6)",
		categorie: "Avant",
		description: "Le flanker. Premier sur le ballon, plaqueur infatigable.",
		cles: [
			"plaquage",
			"endurance",
			"vitesse"
		]
	},
	{
		id: "troisieme_aile_d",
		numero: 7,
		famille: "troisieme_ligne",
		nom: "Troisième ligne aile (7)",
		categorie: "Avant",
		description: "Le gratteur. Il vit sur les ballons au sol.",
		cles: [
			"plaquage",
			"endurance",
			"mental"
		]
	},
	{
		id: "numero_8",
		numero: 8,
		famille: "troisieme_ligne",
		nom: "Numéro 8",
		categorie: "Avant",
		description: "Le porteur de balle. Il lance le jeu en base de mêlée.",
		cles: [
			"force",
			"plaquage",
			"vision"
		]
	},
	{
		id: "demi_melee",
		numero: 9,
		famille: "demi_melee",
		nom: "Demi de mêlée",
		categorie: "Arrière",
		description: "Le chef d’orchestre. Vitesse de passe et vision du jeu.",
		cles: [
			"passe",
			"vision",
			"vitesse"
		]
	},
	{
		id: "demi_ouverture",
		numero: 10,
		famille: "demi_ouverture",
		nom: "Demi d’ouverture",
		categorie: "Arrière",
		description: "Le stratège et le buteur. Il dicte le tempo.",
		cles: [
			"jeuAuPied",
			"vision",
			"mental"
		]
	},
	{
		id: "ailier_gauche",
		numero: 11,
		famille: "ailier",
		nom: "Ailier gauche",
		categorie: "Arrière",
		description: "La foudre. Vitesse pure et finition dans le coin.",
		cles: [
			"vitesse",
			"endurance",
			"plaquage"
		]
	},
	{
		id: "premier_centre",
		numero: 12,
		famille: "centre",
		nom: "Premier centre",
		categorie: "Arrière",
		description: "Le percuteur. Il casse la ligne d’avantage.",
		cles: [
			"force",
			"plaquage",
			"passe"
		]
	},
	{
		id: "deuxieme_centre",
		numero: 13,
		famille: "centre",
		nom: "Deuxième centre",
		categorie: "Arrière",
		description: "Le lanceur d’attaque. Prise d’intervalle et vitesse.",
		cles: [
			"vitesse",
			"vision",
			"passe"
		]
	},
	{
		id: "ailier_droit",
		numero: 14,
		famille: "ailier",
		nom: "Ailier droit",
		categorie: "Arrière",
		description: "Le finisseur. Il vit pour l’essai.",
		cles: [
			"vitesse",
			"endurance",
			"mental"
		]
	},
	{
		id: "arriere",
		numero: 15,
		famille: "arriere",
		nom: "Arrière",
		categorie: "Arrière",
		description: "Le dernier rempart. Jeu au pied, relance et courage sous les chandelles.",
		cles: [
			"jeuAuPied",
			"vitesse",
			"vision"
		]
	}
];
a.reduce((e, t) => ((e[t.famille] ??= []).push(t.id), e), {});
var o = Object.fromEntries(a.map((e) => [e.id, e]));
t.map((e) => ({
	zone: e.zone,
	nations: e.nations.map((e) => e.nom)
})).flatMap((e) => e.nations);
//#endregion
//#region src/lib/championnat.ts
function s(e) {
	let t = 1779033703 ^ e.length;
	for (let n = 0; n < e.length; n++) t = Math.imul(t ^ e.charCodeAt(n), 3432918353), t = t << 13 | t >>> 19;
	let n = t >>> 0;
	return () => {
		n |= 0, n = n + 1831565813 | 0;
		let e = Math.imul(n ^ n >>> 15, 1 | n);
		return e = e + Math.imul(e ^ e >>> 7, 61 | e) ^ e, ((e ^ e >>> 14) >>> 0) / 4294967296;
	};
}
function c(e) {
	let t = Math.max(0, Math.round(e));
	return t === 1 ? 0 : t === 2 || t === 4 ? 3 : t;
}
//#endregion
//#region src/lib/ligue/combinaisons.ts
function l(e) {
	let t = [];
	return e.forEach((e, n) => {
		(!e.simultanee || !t.length) && t.push({ actions: [] }), t.at(-1).actions.push({
			action: e,
			index: n
		});
	}), t;
}
var u = (e) => e && typeof e == "object" && !Array.isArray(e) ? e : {}, d = (e, t, n) => Math.max(t, Math.min(n, e)), f = (e, t, n, r) => typeof e == "number" && Number.isFinite(e) ? d(e, t, n) : r;
function p(e) {
	let t = u(e);
	return {
		alignes: t.alignes === 4 || t.alignes === 7 ? t.alignes : 5,
		distance: Math.round(f(t.distance, 5, 25, 8.1) * 10) / 10,
		feinte: t.feinte === !0
	};
}
function m(e) {
	return p(e.touche).distance > 15;
}
function h(e, t, n = 1) {
	return {
		x: e.x - n * .44,
		y: e.y < 35 ? p(t.touche).distance : 70 - p(t.touche).distance
	};
}
function g(e) {
	let t = [
		9,
		10,
		12,
		13,
		14,
		15
	], n = (n) => t.every((t, r) => e.placements.some((e) => e.numero === t && e.x === -2 - r * 2 && e.y === (n ? 10 + r * 6 : -12 + r * 6)));
	return n(!1) || n(!0) ? e.placements.filter((e) => !t.includes(e.numero)) : e.placements;
}
function _(e, t = [
	1,
	3,
	4,
	5,
	6,
	7,
	8
]) {
	let n = p(e.touche), r = t.slice(0, n.alignes);
	!r.includes(e.sauteur) && t.includes(e.sauteur) && (r[r.length - 1] = e.sauteur);
	let i = r.map((e, t) => 5 + t * 1.55);
	if (m(e)) return r.map((e, t) => ({
		numero: e,
		distance: i[t]
	}));
	let a = i.reduce((e, t, r) => Math.abs(t - n.distance) < Math.abs(i[e] - n.distance) ? r : e, 0), o = r.indexOf(e.sauteur);
	return o >= 0 && ([r[a], r[o]] = [r[o], r[a]]), r.map((t, r) => ({
		numero: t,
		distance: t === e.sauteur ? n.distance : i[r]
	}));
}
function v(e, t, n, r) {
	let i = n <= 22 ? "nos22" : n >= 78 ? "leurs22" : "milieu", a = r < 70 / 3 ? "gauche" : r > 140 / 3 ? "droite" : "centre";
	return e.filter((e) => e.active && e.phase === t && (e.zone === "toutes" || e.zone === i) && (e.couloir === "tous" || e.couloir === a)).sort((e, t) => Number(t.zone !== "toutes") + Number(t.couloir !== "tous") - Number(e.zone !== "toutes") - Number(e.couloir !== "tous"))[0];
}
function y(e, t) {
	let n = t() * e.variantes.reduce((e, t) => e + t.poids, 0);
	return e.variantes.find((e) => (n -= e.poids) < 0) ?? e.variantes[e.variantes.length - 1];
}
//#endregion
//#region src/lib/carteJoueur.ts
function b(e) {
	return a.find((t) => t.id === e)?.famille ?? "centre";
}
var x = {
	pilier: {
		force: 20,
		plaquage: 8,
		endurance: 7,
		mental: 5,
		vision: -2,
		passe: -9,
		jeuAuPied: -17,
		vitesse: -12
	},
	talonneur: {
		force: 16,
		mental: 7,
		plaquage: 6,
		passe: 3,
		endurance: 2,
		vision: -3,
		vitesse: -13,
		jeuAuPied: -18
	},
	deuxieme_ligne: {
		force: 18,
		plaquage: 8,
		endurance: 4,
		mental: 2,
		vision: -3,
		passe: -8,
		vitesse: -13,
		jeuAuPied: -8
	},
	troisieme_ligne: {
		plaquage: 10,
		endurance: 7,
		force: 6,
		mental: 2,
		vitesse: 0,
		vision: -2,
		passe: -5,
		jeuAuPied: -18
	},
	demi_melee: {
		passe: 15,
		vision: 12,
		vitesse: 5,
		mental: 4,
		jeuAuPied: 3,
		endurance: -2,
		plaquage: -9,
		force: -28
	},
	demi_ouverture: {
		jeuAuPied: 18,
		vision: 15,
		passe: 12,
		mental: 5,
		vitesse: 0,
		endurance: -3,
		plaquage: -13,
		force: -34
	},
	centre: {
		plaquage: 7,
		vitesse: 7,
		passe: 4,
		vision: 3,
		force: 2,
		mental: -1,
		endurance: -2,
		jeuAuPied: -20
	},
	ailier: {
		vitesse: 18,
		passe: 3,
		endurance: 2,
		mental: 0,
		vision: -2,
		plaquage: -6,
		jeuAuPied: -5,
		force: -10
	},
	arriere: {
		jeuAuPied: 14,
		vitesse: 11,
		vision: 7,
		passe: 3,
		mental: 1,
		endurance: -2,
		plaquage: -9,
		force: -25
	}
}, S = [
	"vitesse",
	"force",
	"endurance",
	"plaquage",
	"passe",
	"jeuAuPied",
	"vision",
	"mental"
], C = /* @__PURE__ */ new Map();
function w(e) {
	let t = `${e.id}:${e.poste}:${e.note}`, n = C.get(t);
	if (n) return n;
	let r = x[b(e.poste)], i = s(`attributs#${e.id}`), a = {};
	for (let t of S) {
		let n = (i() * 2 - 1) * 9;
		a[t] = Math.max(5, Math.min(99, Math.round(e.note + (r[t] ?? 0) + n)));
	}
	return C.size > 2e4 && C.clear(), C.set(t, a), a;
}
//#endregion
//#region src/data/apparencesMatch.generated.ts
var T = {
	"a one lolofie": {
		peau: "#a27051",
		cheveux: "#221b19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"aaron carroll": {
		peau: "#cea18f",
		cheveux: "#543f2f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"aaron grandidier nkanang": {
		peau: "#c07253",
		cheveux: "#242220",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"aaron smith": {
		peau: "#c69273",
		cheveux: "#534a42",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"aaron wainwright": {
		tailleCm: 185,
		poidsKg: 100,
		peau: "#c78b76",
		cheveux: "#524030",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"abraham anthony pole": {
		peau: "#bc7d6e",
		cheveux: "#171a1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"abraham papalii": {
		peau: "#c3745b",
		cheveux: "#271e1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"abrahams thaakir": {
		peau: "#d59c7f",
		cheveux: "#b8594c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"ackerman harri": {
		peau: "#d6a48b",
		cheveux: "#382c1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ackermann ruan": {
		peau: "#cb9171",
		cheveux: "#5c4737",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"adam beard": {
		tailleCm: 199,
		poidsKg: 113,
		peau: "#e0adaa",
		cheveux: "#0d0c0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"adam brocklebank": {
		tailleCm: 189,
		poidsKg: 114,
		peau: "#c79c99",
		cheveux: "#302e36",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"adam coleman": {
		tailleCm: 212,
		poidsKg: 113,
		peau: "#a47764",
		cheveux: "#1a1416",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"adam hastings": {
		tailleCm: 194,
		poidsKg: 84,
		peau: "#b17e63",
		cheveux: "#29272b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"adam lennox": {
		peau: "#cd9778",
		cheveux: "#4d3d33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"adam mountaga bouare": {
		peau: "#ae7752",
		cheveux: "#2f2726",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"adam radwan": {
		tailleCm: 177,
		poidsKg: 87,
		peau: "#a76855",
		cheveux: "#1b0f0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"adam vargas": {
		tailleCm: 179,
		poidsKg: 74,
		peau: "#d08872",
		cheveux: "#4a3530",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"adam zapedowski": {
		tailleCm: 195,
		poidsKg: 103,
		peau: "#d6a488",
		cheveux: "#332817",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"adams josh": {
		peau: "#ba8d8e",
		cheveux: "#30272f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"adre smith": {
		peau: "#c88c6d",
		cheveux: "#3e3322",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"adrea cocagi": {
		tailleCm: 183,
		poidsKg: 100,
		peau: "#ae6b55",
		cheveux: "#422b23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"adrian choat": {
		peau: "#a37a64",
		cheveux: "#3f2e20",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"adrian mitu": {
		tailleCm: 189,
		poidsKg: 89,
		peau: "#b47f69",
		cheveux: "#3c2a21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"adrian motoc": {
		tailleCm: 201,
		poidsKg: 104,
		peau: "#b58568",
		cheveux: "#28221f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"adrien bau": {
		tailleCm: 172,
		poidsKg: 63,
		peau: "#a47159",
		cheveux: "#49362a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"adrien drault": {
		tailleCm: 181,
		poidsKg: 89,
		peau: "#9b695c",
		cheveux: "#221a14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"adrien lapegue lafaye": {
		peau: "#ac8576",
		cheveux: "#42372f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"adrien martin": {
		tailleCm: 186,
		poidsKg: 74,
		peau: "#c18c85",
		cheveux: "#352e2b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"adrien roux": {
		tailleCm: 175,
		poidsKg: 82,
		peau: "#ba8278",
		cheveux: "#43322c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"adrien seguret": {
		tailleCm: 178,
		poidsKg: 88,
		peau: "#d98e70",
		cheveux: "#372b2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"adrien sonzogni": {
		tailleCm: 177,
		poidsKg: 92,
		peau: "#d08f75",
		cheveux: "#3a2c29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"adrien warion": {
		tailleCm: 197,
		poidsKg: 104,
		peau: "#c0857f",
		cheveux: "#5e4140",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"afolabi fasogbon": {
		tailleCm: 189,
		poidsKg: 123,
		peau: "#422929",
		cheveux: "#1a1011",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"afshar ben": {
		peau: "#b88664",
		cheveux: "#2c2620",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"afu ofeina": {
		peau: "#b37c60",
		cheveux: "#171615",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"agustin moyano": {
		peau: "#c48966",
		cheveux: "#362b1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ahern tom": {
		peau: "#dc9a87",
		cheveux: "#892226",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ahmed tidiane kane": {
		peau: "#54392c",
		cheveux: "#1a1511",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"aidan morgan": {
		peau: "#ca9383",
		cheveux: "#6a574b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"aidan pugh": {
		tailleCm: 178,
		poidsKg: 68,
		peau: "#cf968a",
		cheveux: "#221612",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"aidan ross": {
		peau: "#a06c6a",
		cheveux: "#5d3e3d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"aiden ainsworth cave": {
		tailleCm: 201,
		poidsKg: 106,
		peau: "#af7460",
		cheveux: "#1d1514",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"aiden reid": {
		peau: "#d4a79a",
		cheveux: "#342626",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ainsworth cave aiden": {
		peau: "#af7460",
		cheveux: "#1d1514",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"aisea nawai": {
		peau: "#b58066",
		cheveux: "#2c241f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"aitor hourcade": {
		tailleCm: 193,
		poidsKg: 98,
		peau: "#d8997e",
		cheveux: "#2c1c15",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"aitor kitutu": {
		tailleCm: 178,
		poidsKg: 105,
		peau: "#ad6d45",
		cheveux: "#201d19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"aj macginty": {
		tailleCm: 185,
		poidsKg: 89,
		peau: "#cd8a69",
		cheveux: "#302319",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"aj woulf": {
		peau: "#af7966",
		cheveux: "#120c0b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ajay faleafaga": {
		peau: "#9d6f61",
		cheveux: "#201d1e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"akato fakatika": {
		tailleCm: 177,
		poidsKg: 111,
		peau: "#825844",
		cheveux: "#1b1817",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"aki bundee": {
		peau: "#be8065",
		cheveux: "#2c4942",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"aki kajihara": {
		peau: "#b08565",
		cheveux: "#7b5440",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"aki tuivailala": {
		peau: "#c9906e",
		cheveux: "#1f1d1c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"akihide onogi": {
		peau: "#a97259",
		cheveux: "#10100f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"akihito yamada": {
		peau: "#c19272",
		cheveux: "#3f3829",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"akira ieremia": {
		peau: "#c59991",
		cheveux: "#1d1d1e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"akira inoue": {
		peau: "#ddaf8c",
		cheveux: "#201d1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"akira ioane": {
		peau: "#a66246",
		cheveux: "#191818",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"akito fujinami": {
		peau: "#a07766",
		cheveux: "#312724",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"akito okui": {
		peau: "#d5aa93",
		cheveux: "#232425",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"akito takechi": {
		peau: "#d49d8f",
		cheveux: "#333539",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"akker van der merwe": {
		peau: "#a36a5d",
		cheveux: "#4c3527",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"alan poku": {
		tailleCm: 183,
		poidsKg: 100,
		peau: "#4b312c",
		cheveux: "#080808",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"alan spicer": {
		peau: "#c08375",
		cheveux: "#28281d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alban placines": {
		tailleCm: 187,
		poidsKg: 102,
		peau: "#d49f8d",
		cheveux: "#866349",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"alban roussel": {
		tailleCm: 198,
		poidsKg: 110,
		peau: "#bb8d60",
		cheveux: "#423523",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"albert alcock": {
		peau: "#d18f7c",
		cheveux: "#46331f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"albert batista": {
		peau: "#ca8e74",
		cheveux: "#293641",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"albert tuisue": {
		tailleCm: 189,
		poidsKg: 108,
		peau: "#815e4d",
		cheveux: "#1f1f1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"alberto carmona molina": {
		peau: "#c7856d",
		cheveux: "#221814",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"albornoz tomas": {
		peau: "#bc876e",
		cheveux: "#28201c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ale loman": {
		tailleCm: 188,
		poidsKg: 123,
		peau: "#d8845d",
		cheveux: "#36160d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"alec clarey": {
		tailleCm: 179,
		poidsKg: 112,
		peau: "#804739",
		cheveux: "#0c0807",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"alec hepburn": {
		peau: "#a97a6d",
		cheveux: "#3c2d28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"aled davies": {
		tailleCm: 179,
		poidsKg: 82,
		peau: "#c89b9a",
		cheveux: "#484349",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"alejandro michael barrios": {
		peau: "#cd846c",
		cheveux: "#0a0b09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"aleksandre burduli": {
		tailleCm: 187,
		poidsKg: 92,
		peau: "#937670",
		cheveux: "#1a1a1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"aleksandre kuntelia": {
		tailleCm: 192,
		poidsKg: 126,
		peau: "#e2a693",
		cheveux: "#895749",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"alessandro fusco": {
		tailleCm: 184,
		poidsKg: 85,
		peau: "#cd9883",
		cheveux: "#415366",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"alessandro garbisi": {
		tailleCm: 174,
		poidsKg: 79,
		peau: "#bc8470",
		cheveux: "#382617",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alessandro izekor": {
		tailleCm: 196,
		poidsKg: 102,
		peau: "#614133",
		cheveux: "#3b2313",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"alessandro ortombina": {
		tailleCm: 197,
		poidsKg: 105,
		peau: "#b37f74",
		cheveux: "#2e3134",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alessandro ragusi": {
		tailleCm: 173,
		poidsKg: 73,
		peau: "#d3906c",
		cheveux: "#15100d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"alessio contigliani maillet": {
		peau: "#926d64",
		cheveux: "#473c34",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"alex burin": {
		tailleCm: 188,
		poidsKg: 116,
		peau: "#ba7a63",
		cheveux: "#3b2b25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alex coles": {
		tailleCm: 209,
		poidsKg: 112,
		peau: "#b57473",
		cheveux: "#3f2824",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alex craig": {
		tailleCm: 195,
		poidsKg: 108,
		peau: "#c89279",
		cheveux: "#554638",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alex dombrandt": {
		tailleCm: 190,
		poidsKg: 112,
		peau: "#b9796a",
		cheveux: "#422614",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alex groves": {
		tailleCm: 212,
		poidsKg: 115,
		peau: "#c38f86",
		cheveux: "#4b3330",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alex harford": {
		peau: "#c3876e",
		cheveux: "#282019",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alex hearle": {
		tailleCm: 183,
		poidsKg: 91,
		peau: "#c0968d",
		cheveux: "#5b4439",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alex kendellen": {
		tailleCm: 183,
		poidsKg: 100,
		peau: "#c67f6d",
		cheveux: "#602c21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alex lozowski": {
		tailleCm: 182,
		poidsKg: 86,
		peau: "#b38170",
		cheveux: "#151314",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alex mafi": {
		peau: "#a1624d",
		cheveux: "#221f1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"alex mann": {
		tailleCm: 191,
		poidsKg: 90,
		peau: "#b5817c",
		cheveux: "#493836",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alex mason": {
		peau: "#9c755d",
		cheveux: "#5c3c2f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"alex mead": {
		peau: "#bf8d89",
		cheveux: "#563c32",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"alex mitchell": {
		tailleCm: 176,
		poidsKg: 82,
		peau: "#a5625a",
		cheveux: "#160f0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alex mullan": {
		peau: "#b68570",
		cheveux: "#2d2c20",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"alex nankivell": {
		tailleCm: 188,
		poidsKg: 90,
		peau: "#d09078",
		cheveux: "#ae120e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"alex newsome": {
		tailleCm: 188,
		poidsKg: 90,
		peau: "#bd8a5e",
		cheveux: "#362811",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alex o driscoll": {
		tailleCm: 189,
		poidsKg: 100,
		peau: "#674137",
		cheveux: "#1a100a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"alex odriscoll": {
		peau: "#674137",
		cheveux: "#1a100a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"alex samuel": {
		tailleCm: 212,
		poidsKg: 117,
		peau: "#bc8c74",
		cheveux: "#3c2c23",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alex soroka": {
		peau: "#c2856e",
		cheveux: "#1c3947",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"alex takuya walker": {
		peau: "#d09a82",
		cheveux: "#1f1a18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"alex usanov": {
		peau: "#c2876f",
		cheveux: "#36422c",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alex wills": {
		tailleCm: 182,
		poidsKg: 93,
		peau: "#ab8171",
		cheveux: "#1d1817",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alexander ben": {
		peau: "#bf9189",
		cheveux: "#513b31",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alexander james moon": {
		peau: "#c87567",
		cheveux: "#4b2b1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alexander masibaka": {
		peau: "#c4907c",
		cheveux: "#18110f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"alexandre becognee": {
		tailleCm: 183,
		poidsKg: 99,
		peau: "#ce9d8a",
		cheveux: "#181414",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alexandre borie": {
		tailleCm: 177,
		poidsKg: 73,
		peau: "#bc795d",
		cheveux: "#3b2e28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alexandre etchebehere": {
		tailleCm: 177,
		poidsKg: 103,
		peau: "#ba846b",
		cheveux: "#302a26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alexandre everaert": {
		peau: "#bb9475",
		cheveux: "#3d2d27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alexandre fischer": {
		tailleCm: 183,
		poidsKg: 98,
		peau: "#c37260",
		cheveux: "#1e1512",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alexandre kaddouri": {
		tailleCm: 185,
		poidsKg: 103,
		peau: "#e5a992",
		cheveux: "#412e2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alexandre langlois": {
		tailleCm: 177,
		poidsKg: 117,
		peau: "#cba688",
		cheveux: "#131814",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alexandre manukula": {
		tailleCm: 199,
		poidsKg: 127,
		peau: "#985928",
		cheveux: "#412b12",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"alexandre plantier": {
		tailleCm: 180,
		poidsKg: 104,
		peau: "#b27960",
		cheveux: "#30211a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"alexandre ricard": {
		tailleCm: 205,
		poidsKg: 104,
		peau: "#bf7c5e",
		cheveux: "#381e13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alexandre roumat": {
		tailleCm: 201,
		poidsKg: 105,
		peau: "#d3937a",
		cheveux: "#412c25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alexandre tchaptchet noutcha": {
		peau: "#b86f4e",
		cheveux: "#4b3223",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"alexey konnov": {
		peau: "#d49288",
		cheveux: "#49332b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alexis bernadet": {
		tailleCm: 178,
		poidsKg: 69,
		peau: "#c59889",
		cheveux: "#151110",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alexis caumel": {
		tailleCm: 189,
		poidsKg: 93,
		peau: "#c58c7c",
		cheveux: "#1d110e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"alexis levron": {
		tailleCm: 167,
		poidsKg: 66,
		peau: "#c28c6f",
		cheveux: "#36281f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"alfie barbeary": {
		tailleCm: 182,
		poidsKg: 105,
		peau: "#ae7752",
		cheveux: "#160f0c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"alfie longstaff": {
		tailleCm: 179,
		poidsKg: 93,
		peau: "#bb8b72",
		cheveux: "#1b1c1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"alfred parisien": {
		tailleCm: 186,
		poidsKg: 81,
		peau: "#d0855e",
		cheveux: "#553625",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ali oz": {
		tailleCm: 194,
		poidsKg: 129,
		peau: "#b9885c",
		cheveux: "#332b22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ali vermaak": {
		peau: "#855538",
		cheveux: "#2e372c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"alifeleti tuifua kaituu": {
		peau: "#bf8b54",
		cheveux: "#493b2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"alistaire price": {
		peau: "#c89b92",
		cheveux: "#100d0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"alivereti loaloa": {
		tailleCm: 183,
		poidsKg: 94,
		peau: "#8c5c4a",
		cheveux: "#393431",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"alivereti raka": {
		tailleCm: 193,
		poidsKg: 97,
		peau: "#825646",
		cheveux: "#403730",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"alivereti uqueqe duguivalu": {
		peau: "#a17369",
		cheveux: "#141c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"allan alaalatoa": {
		peau: "#a1624a",
		cheveux: "#232525",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"allan ferrie": {
		tailleCm: 189,
		poidsKg: 111,
		peau: "#9f6c58",
		cheveux: "#231a12",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ally miller": {
		tailleCm: 191,
		poidsKg: 104,
		peau: "#d0a18a",
		cheveux: "#332e2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alulutho tshakweni": {
		peau: "#7b4e3a",
		cheveux: "#2e2b1f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"alun lawrence": {
		tailleCm: 193,
		poidsKg: 103,
		peau: "#bb8885",
		cheveux: "#2c282f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"alvaro garcia albo": {
		peau: "#e0a79a",
		cheveux: "#74574c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"alvaro garcia iandolino": {
		tailleCm: 202,
		poidsKg: 107,
		peau: "#d59386",
		cheveux: "#583c31",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"am lukhanyo": {
		peau: "#794c34",
		cheveux: "#191713",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"amanaki lisala": {
		peau: "#a36c55",
		cheveux: "#37332f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"amanaki saumaki": {
		peau: "#af7756",
		cheveux: "#25211d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"amane tomioka": {
		peau: "#d5a384",
		cheveux: "#1a1917",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"amato fakatava": {
		peau: "#db9f7a",
		cheveux: "#312c27",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "moustache"
	},
	"aminiasi shaw": {
		peau: "#88573c",
		cheveux: "#201c19",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"aminu destiny": {
		peau: "#5d3f34",
		cheveux: "#2f1c12",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"amir hattouma": {
		tailleCm: 198,
		poidsKg: 114,
		peau: "#9e6b59",
		cheveux: "#151112",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"anaru paenga morgan": {
		peau: "#b47253",
		cheveux: "#332823",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"anatole pauvert": {
		tailleCm: 182,
		poidsKg: 84,
		peau: "#b37c6e",
		cheveux: "#181819",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"anderson fletcher": {
		peau: "#835857",
		cheveux: "#52443b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"anderson huw": {
		peau: "#c08471",
		cheveux: "#543c2d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"andoni echegaray": {
		peau: "#e1b198",
		cheveux: "#694a35",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"andra pontanier": {
		peau: "#c09984",
		cheveux: "#504236",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"andra sacco": {
		peau: "#e3a68b",
		cheveux: "#462f25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"andre esterhuizen": {
		peau: "#c69389",
		cheveux: "#504242",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"andre hugo venter": {
		peau: "#a6745d",
		cheveux: "#264135",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"andrea zambonin": {
		tailleCm: 200,
		poidsKg: 105,
		peau: "#a76c55",
		cheveux: "#261a13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"andrew davidson": {
		peau: "#cea8a2",
		cheveux: "#a17d63",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"andrew john": {
		peau: "#af7760",
		cheveux: "#422b20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"andrew knewstubb": {
		peau: "#bc8865",
		cheveux: "#43352c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"andrew makalio": {
		peau: "#9f6a59",
		cheveux: "#181717",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"andrew osborne": {
		peau: "#bf8474",
		cheveux: "#483737",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"andrew porter": {
		peau: "#ab7861",
		cheveux: "#2b2b20",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "none"
	},
	"andrew smith": {
		peau: "#d79988",
		cheveux: "#a62e2a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"andrew sparrow": {
		peau: "#aa6a55",
		cheveux: "#2f2719",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"andro dvali": {
		tailleCm: 184,
		poidsKg: 98,
		peau: "#a0654e",
		cheveux: "#120b09",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"andrs zafra tarazona": {
		peau: "#b69074",
		cheveux: "#201c19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"andy bordelai": {
		tailleCm: 190,
		poidsKg: 109,
		peau: "#85463f",
		cheveux: "#130b08",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"andy muirhead": {
		peau: "#9f6251",
		cheveux: "#23262f",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"andy onyeama christie": {
		tailleCm: 192,
		poidsKg: 91,
		peau: "#874933",
		cheveux: "#0b0907",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"andy timo": {
		tailleCm: 197,
		poidsKg: 83,
		peau: "#7f5c55",
		cheveux: "#2c2526",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"andy uren": {
		tailleCm: 176,
		poidsKg: 88,
		peau: "#ae755e",
		cheveux: "#3e2f21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"aneurin owen": {
		tailleCm: 185,
		poidsKg: 80,
		peau: "#d59a83",
		cheveux: "#66412c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ange capuozzo": {
		tailleCm: 173,
		poidsKg: 75,
		peau: "#ce9685",
		cheveux: "#211c1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"angelo smith": {
		peau: "#a56d57",
		cheveux: "#48392d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"angus bell": {
		peau: "#ce9691",
		cheveux: "#392922",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"angus fletcher": {
		peau: "#d99f8c",
		cheveux: "#72553f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"angus fraser": {
		tailleCm: 184,
		poidsKg: 101,
		peau: "#c58d71",
		cheveux: "#57433f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"angus hall": {
		tailleCm: 183,
		poidsKg: 86,
		peau: "#916051",
		cheveux: "#170f0c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"angus obrien": {
		peau: "#b77f6d",
		cheveux: "#614633",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"angus scott young": {
		peau: "#ca806f",
		cheveux: "#403023",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"angus staniforth": {
		tailleCm: 180,
		poidsKg: 73,
		peau: "#cd8f82",
		cheveux: "#512c29",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"angus ta avao": {
		peau: "#8f6144",
		cheveux: "#1e1913",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"anoa laurent": {
		peau: "#e3af97",
		cheveux: "#4d3127",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"anpyon kim": {
		peau: "#ac7567",
		cheveux: "#261b18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"anselme cellier": {
		tailleCm: 188,
		poidsKg: 81,
		peau: "#c58b6b",
		cheveux: "#2e241c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"anthime hemery": {
		tailleCm: 190,
		poidsKg: 100,
		peau: "#d1a68d",
		cheveux: "#976e53",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"anthony aleo": {
		tailleCm: 172,
		poidsKg: 106,
		peau: "#b87871",
		cheveux: "#332927",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"anthony belleau": {
		tailleCm: 174,
		poidsKg: 77,
		peau: "#c89891",
		cheveux: "#1e1718",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"anthony bouthier": {
		tailleCm: 184,
		poidsKg: 77,
		peau: "#af5f50",
		cheveux: "#1b120d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"anthony coletta": {
		tailleCm: 200,
		poidsKg: 101,
		peau: "#8d5539",
		cheveux: "#17130f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"anthony jelonch": {
		tailleCm: 198,
		poidsKg: 102,
		peau: "#da9686",
		cheveux: "#634133",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"antoine abraham": {
		tailleCm: 183,
		poidsKg: 101,
		peau: "#bf8e69",
		cheveux: "#3a3124",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"antoine aucagne": {
		tailleCm: 183,
		poidsKg: 73,
		peau: "#cc918d",
		cheveux: "#493a3b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"antoine chalus cercy": {
		peau: "#cfa490",
		cheveux: "#332d29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"antoine deliance": {
		tailleCm: 197,
		poidsKg: 90,
		peau: "#d89876",
		cheveux: "#6a4629",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"antoine dupont": {
		tailleCm: 177,
		poidsKg: 80,
		peau: "#dda692",
		cheveux: "#3a2721",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"antoine frisch": {
		tailleCm: 193,
		poidsKg: 93,
		peau: "#c4836b",
		cheveux: "#251e1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"antoine gibert": {
		tailleCm: 182,
		poidsKg: 69,
		peau: "#d18778",
		cheveux: "#5b3226",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"antoine hastoy": {
		tailleCm: 183,
		poidsKg: 79,
		peau: "#e3a591",
		cheveux: "#36231e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"antoine latrasse": {
		tailleCm: 180,
		poidsKg: 69,
		peau: "#c88b6f",
		cheveux: "#29160d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"antoine miquel": {
		tailleCm: 195,
		poidsKg: 104,
		peau: "#bd8853",
		cheveux: "#402f18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"antoine payrastre": {
		tailleCm: 185,
		poidsKg: 81,
		peau: "#c78366",
		cheveux: "#2e1f12",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"anton lienert brown": {
		peau: "#d68262",
		cheveux: "#382d29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"antonin berruyer": {
		tailleCm: 183,
		poidsKg: 89,
		peau: "#d7b18f",
		cheveux: "#7a6e4b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"antonin corso": {
		tailleCm: 199,
		poidsKg: 103,
		peau: "#b78160",
		cheveux: "#342515",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"antonio mikaele tuu": {
		peau: "#cc8969",
		cheveux: "#1c1b17",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"antonio shalfoon": {
		peau: "#b3826b",
		cheveux: "#433325",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"aphelele fassi": {
		tailleCm: 190,
		poidsKg: 85,
		peau: "#894d47",
		cheveux: "#2b2321",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"aphiwe dyantyi": {
		tailleCm: 187,
		poidsKg: 85,
		peau: "#643b2a",
		cheveux: "#241c16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"apisai naqalevu": {
		tailleCm: 188,
		poidsKg: 102,
		peau: "#985d52",
		cheveux: "#2a2624",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"apisalome bogidrau": {
		peau: "#ca8660",
		cheveux: "#312a24",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"apisalome tegumailagi kuruisaqila": {
		peau: "#855138",
		cheveux: "#130e0a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"apolosi ranawai": {
		peau: "#975541",
		cheveux: "#181411",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"aporosa baleikasavu bativaga maka": {
		peau: "#7c513a",
		cheveux: "#0c0b09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"appollis diego": {
		peau: "#93604b",
		cheveux: "#24201a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"archer holz": {
		tailleCm: 193,
		poidsKg: 118,
		peau: "#9f685e",
		cheveux: "#24161b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"archie benson": {
		tailleCm: 201,
		poidsKg: 104,
		peau: "#ca968d",
		cheveux: "#462f28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"archie griffin": {
		tailleCm: 191,
		poidsKg: 117,
		peau: "#c38973",
		cheveux: "#5f452e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"archie hughes": {
		tailleCm: 178,
		poidsKg: 71,
		peau: "#b07c74",
		cheveux: "#523231",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"archie mcparland": {
		tailleCm: 178,
		poidsKg: 76,
		peau: "#c6978e",
		cheveux: "#50372c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"archie saunders": {
		peau: "#d69685",
		cheveux: "#3f2b23",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"archie van der flier": {
		tailleCm: 197,
		poidsKg: 113,
		peau: "#b16d58",
		cheveux: "#623a27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ardie savea": {
		peau: "#c37859",
		cheveux: "#251f1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"arendse kurt lee": {
		peau: "#b37757",
		cheveux: "#1c1f16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"arese poliko": {
		peau: "#b4714e",
		cheveux: "#724a33",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"arito takahashi": {
		peau: "#b27c78",
		cheveux: "#130e0d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"armstrong niall": {
		peau: "#cd9984",
		cheveux: "#483428",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"arnaud aletti": {
		tailleCm: 189,
		poidsKg: 96,
		peau: "#a96c4d",
		cheveux: "#1a1b13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"arnaud duputs": {
		tailleCm: 193,
		poidsKg: 91,
		peau: "#a5755f",
		cheveux: "#614938",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"arnaud erbinartegaray": {
		tailleCm: 186,
		poidsKg: 77,
		peau: "#c98878",
		cheveux: "#291912",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"arno botha": {
		tailleCm: 194,
		poidsKg: 98,
		peau: "#c98664",
		cheveux: "#563924",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"arron reed": {
		peau: "#ca9b87",
		cheveux: "#4c3936",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"arthur bonneval": {
		tailleCm: 177,
		poidsKg: 81,
		peau: "#d89d81",
		cheveux: "#32251f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"arthur clark": {
		tailleCm: 200,
		poidsKg: 115,
		peau: "#b47670",
		cheveux: "#44271c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"arthur coville": {
		tailleCm: 176,
		poidsKg: 77,
		peau: "#a3806e",
		cheveux: "#3c3229",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"arthur diaz": {
		tailleCm: 162,
		poidsKg: 68,
		peau: "#b47b65",
		cheveux: "#3f2a1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"arthur green": {
		tailleCm: 189,
		poidsKg: 102,
		peau: "#c78b74",
		cheveux: "#160f09",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"arthur iturria": {
		tailleCm: 194,
		poidsKg: 104,
		peau: "#cf8078",
		cheveux: "#341c18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"arthur mathiron": {
		tailleCm: 184,
		poidsKg: 89,
		peau: "#cf8960",
		cheveux: "#49352a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"arthur proult": {
		tailleCm: 177,
		poidsKg: 78,
		peau: "#bb8069",
		cheveux: "#372b24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"arthur retiere": {
		tailleCm: 172,
		poidsKg: 75,
		peau: "#855a50",
		cheveux: "#251b17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"arthur roche": {
		tailleCm: 182,
		poidsKg: 77,
		peau: "#cf8d6d",
		cheveux: "#17110c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"arthur vignolles": {
		tailleCm: 185,
		poidsKg: 99,
		peau: "#ba8366",
		cheveux: "#382b26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"arthur vincent": {
		tailleCm: 185,
		poidsKg: 86,
		peau: "#b8857a",
		cheveux: "#090909",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"asa stewart harris": {
		tailleCm: 176,
		poidsKg: 77,
		peau: "#845146",
		cheveux: "#1d100a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"asad moos": {
		peau: "#c68d65",
		cheveux: "#151a12",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"asaeli ai valu": {
		peau: "#bd8465",
		cheveux: "#322d2b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"asaeli lausii": {
		peau: "#a87662",
		cheveux: "#181717",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"asaeli pacolo gade": {
		tailleCm: 185,
		poidsKg: 78,
		peau: "#a1735b",
		cheveux: "#393530",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"asaeli tuivuaka": {
		tailleCm: 174,
		poidsKg: 98,
		peau: "#824a39",
		cheveux: "#261915",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"asafo aumua": {
		peau: "#b47153",
		cheveux: "#372924",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"asahi doei": {
		peau: "#c99c7f",
		cheveux: "#2a211c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"asahi uchikawa": {
		peau: "#d08757",
		cheveux: "#2e2317",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"aselo ikahehegi": {
		tailleCm: 186,
		poidsKg: 131,
		peau: "#b4785a",
		cheveux: "#342518",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"aseri masivou": {
		peau: "#cb8b6e",
		cheveux: "#39302e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ash dixon": {
		peau: "#c57d55",
		cheveux: "#272422",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ash paker": {
		peau: "#d99f95",
		cheveux: "#383137",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"asher opoku fordjour": {
		peau: "#4c4541",
		cheveux: "#171718",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"asiata richie": {
		peau: "#996b50",
		cheveux: "#17130e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"asipeli moala": {
		peau: "#ca9379",
		cheveux: "#28272a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"assiratti keiron": {
		peau: "#bb8787",
		cheveux: "#403c3f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"aston brad fortuin": {
		peau: "#d6987d",
		cheveux: "#332521",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ataata moeakiola": {
		peau: "#c38561",
		cheveux: "#282423",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"atila septar": {
		tailleCm: 193,
		poidsKg: 97,
		peau: "#c2906c",
		cheveux: "#241d19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"atkinson charlie": {
		peau: "#c78d8a",
		cheveux: "#482a20",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"atkinson seb": {
		peau: "#9f6359",
		cheveux: "#241712",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"atomu shirai": {
		peau: "#d19872",
		cheveux: "#191914",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"atonio ulutuipalelei": {
		tailleCm: 183,
		poidsKg: 130,
		peau: "#b76d4f",
		cheveux: "#30231e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"atsuhiro yoshida": {
		peau: "#bb7a60",
		cheveux: "#222120",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"atsuki kuwayama": {
		peau: "#cc977e",
		cheveux: "#402b20",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"atsuki yamamoto": {
		peau: "#c4877a",
		cheveux: "#232020",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"atsuro nakamura": {
		peau: "#c4815b",
		cheveux: "#1a1713",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"atsushi furuya": {
		peau: "#d19c7f",
		cheveux: "#322e29",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"atsushi hiwasa": {
		peau: "#c48462",
		cheveux: "#262525",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"atsushi minami": {
		peau: "#dea895",
		cheveux: "#242324",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"atsushi mizofuchi": {
		peau: "#be8c71",
		cheveux: "#1f1d1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"atsushi oshikawa": {
		peau: "#ca9487",
		cheveux: "#262224",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"atsushi sakate": {
		peau: "#c69076",
		cheveux: "#22211f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"atsushi yumoto": {
		peau: "#9a6e5d",
		cheveux: "#2d2524",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"aubin geffray": {
		peau: "#b0846b",
		cheveux: "#3c3027",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"auguste cadot": {
		tailleCm: 181,
		poidsKg: 80,
		peau: "#c2897c",
		cheveux: "#151313",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"augustus juarno": {
		peau: "#cb835f",
		cheveux: "#3a2314",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"aungier jack": {
		peau: "#d58669",
		cheveux: "#563a2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"aurelien azar": {
		tailleCm: 185,
		poidsKg: 115,
		peau: "#ad816c",
		cheveux: "#292a2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"aurlien callandret": {
		peau: "#c7a182",
		cheveux: "#363126",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"austin anderson": {
		peau: "#c17d66",
		cheveux: "#271f1b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"austin durbidge": {
		peau: "#d9a098",
		cheveux: "#6a402c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"austin emens": {
		tailleCm: 186,
		poidsKg: 77,
		peau: "#c38674",
		cheveux: "#4d220d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"austin mike": {
		peau: "#be8478",
		cheveux: "#2f170b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"av jonathan maalo": {
		peau: "#c6825e",
		cheveux: "#24231e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"avaca giuliano": {
		peau: "#d29c82",
		cheveux: "#30684c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"avakuki niusalelekitoga": {
		peau: "#7d5747",
		cheveux: "#1b1817",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"axel bevia": {
		tailleCm: 181,
		poidsKg: 66,
		peau: "#8d5d51",
		cheveux: "#4c3a34",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"axel bruchet": {
		tailleCm: 190,
		poidsKg: 90,
		peau: "#b37a72",
		cheveux: "#473832",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"axel desperes rigou": {
		peau: "#ba796a",
		cheveux: "#312621",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"axel guillaud": {
		tailleCm: 186,
		poidsKg: 83,
		peau: "#dcb7a2",
		cheveux: "#3e342e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"aymeric luc": {
		tailleCm: 184,
		poidsKg: 75,
		peau: "#ae775f",
		cheveux: "#3d2d25",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"ayuki yamada": {
		peau: "#dfb28f",
		cheveux: "#1f1c19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ayumu sawada": {
		peau: "#d4978e",
		cheveux: "#262129",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"azuma doei": {
		peau: "#cf9b88",
		cheveux: "#453630",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"bachuki tchumbadze": {
		tailleCm: 177,
		poidsKg: 120,
		peau: "#b87a65",
		cheveux: "#291e1a",
		yeux: "#587383",
		coiffure: "short",
		barbe: "moustache"
	},
	"badham iori": {
		peau: "#b3847b",
		cheveux: "#4b2829",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"bailyn sullivan": {
		peau: "#a56947",
		cheveux: "#261d1d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"baird ryan": {
		peau: "#b37f6c",
		cheveux: "#2b382b",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"ball jake": {
		peau: "#905c53",
		cheveux: "#611a28",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"baloucoune robert": {
		peau: "#bf907c",
		cheveux: "#2a211b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"baptiste abescat leroy": {
		peau: "#d5ae93",
		cheveux: "#332e22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"baptiste collet": {
		tailleCm: 192,
		poidsKg: 133,
		peau: "#aa675d",
		cheveux: "#4d3931",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"baptiste cope": {
		tailleCm: 186,
		poidsKg: 90,
		peau: "#d4856c",
		cheveux: "#4c332b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"baptiste couilloud": {
		tailleCm: 173,
		poidsKg: 76,
		peau: "#c27556",
		cheveux: "#3d2a1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"baptiste delaporte": {
		tailleCm: 194,
		poidsKg: 100,
		peau: "#d58b78",
		cheveux: "#422d25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"baptiste erdocio": {
		tailleCm: 177,
		poidsKg: 108,
		peau: "#ce8e87",
		cheveux: "#181516",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"baptiste escoffre": {
		tailleCm: 178,
		poidsKg: 64,
		peau: "#b17d63",
		cheveux: "#3d2c26",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"baptiste fariscot": {
		tailleCm: 186,
		poidsKg: 64,
		peau: "#e1ab8e",
		cheveux: "#3b271e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"baptiste germain": {
		tailleCm: 174,
		poidsKg: 76,
		peau: "#c97a72",
		cheveux: "#140e0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"baptiste heguy": {
		tailleCm: 196,
		poidsKg: 100,
		peau: "#d48877",
		cheveux: "#2a1b15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"baptiste jauneau": {
		tailleCm: 172,
		poidsKg: 71,
		peau: "#cda08a",
		cheveux: "#4b3e34",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"baptiste jules tilloles": {
		peau: "#d0897c",
		cheveux: "#331f1c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"baptiste lafond": {
		tailleCm: 185,
		poidsKg: 89,
		peau: "#c99774",
		cheveux: "#433327",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"baptiste lenoir": {
		peau: "#d9b29d",
		cheveux: "#6e5c4c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"baptiste moreno": {
		tailleCm: 186,
		poidsKg: 98,
		peau: "#c28d70",
		cheveux: "#453025",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"baptiste mouchous": {
		tailleCm: 185,
		poidsKg: 88,
		peau: "#ce9b85",
		cheveux: "#433025",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"baptiste narmand": {
		tailleCm: 188,
		poidsKg: 100,
		peau: "#d49272",
		cheveux: "#5d3d29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"baptiste pesenti": {
		tailleCm: 198,
		poidsKg: 112,
		peau: "#cd9785",
		cheveux: "#473632",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"baptiste serin": {
		tailleCm: 184,
		poidsKg: 72,
		peau: "#c88775",
		cheveux: "#2f2520",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"baptiste serrano": {
		tailleCm: 183,
		poidsKg: 82,
		peau: "#bb7f65",
		cheveux: "#1d1818",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"baptiste veschambre": {
		tailleCm: 206,
		poidsKg: 105,
		peau: "#d4ac94",
		cheveux: "#554034",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"barnab couilloud": {
		peau: "#c8a183",
		cheveux: "#2c2d27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"barnab massa": {
		peau: "#ce9e8b",
		cheveux: "#38322d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"barnab mechentel": {
		peau: "#d5966a",
		cheveux: "#312215",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"barnard meno": {
		peau: "#b07e6d",
		cheveux: "#39312d",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"barny langton cryer": {
		peau: "#c58976",
		cheveux: "#3e2820",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"barratt rhys": {
		peau: "#b88986",
		cheveux: "#574b46",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"barrett fiachna": {
		peau: "#c5846e",
		cheveux: "#312b1b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"barron diarmuid": {
		peau: "#ca8777",
		cheveux: "#5c2926",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"barron lee": {
		peau: "#e09c84",
		cheveux: "#503022",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"bartholome sanson": {
		tailleCm: 198,
		poidsKg: 93,
		peau: "#db9f74",
		cheveux: "#503522",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"bartley conor": {
		peau: "#d58a79",
		cheveux: "#b61b1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"barton george": {
		peau: "#9d6b5b",
		cheveux: "#3a1f15",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"basa khonelidze": {
		tailleCm: 177,
		poidsKg: 99,
		peau: "#a17466",
		cheveux: "#39332d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"basham taine": {
		peau: "#b88d8a",
		cheveux: "#372e36",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"bastien berenguel": {
		tailleCm: 193,
		poidsKg: 101,
		peau: "#ad7b61",
		cheveux: "#392a20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bastien chalureau": {
		tailleCm: 205,
		poidsKg: 110,
		peau: "#b97d71",
		cheveux: "#1a1616",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bastien chinarro": {
		tailleCm: 198,
		poidsKg: 86,
		peau: "#b78785",
		cheveux: "#191619",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"bastien daguerre": {
		peau: "#a1613d",
		cheveux: "#1d180d",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"bastien darre": {
		peau: "#ae7752",
		cheveux: "#402d23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"bastien guillemin": {
		tailleCm: 187,
		poidsKg: 83,
		peau: "#dba086",
		cheveux: "#755541",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"bastien masse": {
		tailleCm: 184,
		poidsKg: 79,
		peau: "#c6815c",
		cheveux: "#2a1b0f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"bastien rasal": {
		tailleCm: 182,
		poidsKg: 77,
		peau: "#d08e7f",
		cheveux: "#573a35",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"bastien soury": {
		tailleCm: 185,
		poidsKg: 97,
		peau: "#cb9884",
		cheveux: "#947065",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"bastien vergnes taillefer": {
		tailleCm: 193,
		poidsKg: 103,
		peau: "#9f6e5f",
		cheveux: "#211918",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bates jack": {
		peau: "#ae7a5f",
		cheveux: "#312418",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"batista albert": {
		peau: "#ca8e74",
		cheveux: "#293641",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"batley joe": {
		peau: "#b57153",
		cheveux: "#6b4e31",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"bautista bernasconi": {
		tailleCm: 178,
		poidsKg: 106,
		peau: "#aa7761",
		cheveux: "#16110d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bautista delguy": {
		tailleCm: 178,
		poidsKg: 77,
		peau: "#d7a490",
		cheveux: "#342a26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"bautista ezcurra": {
		tailleCm: 178,
		poidsKg: 81,
		peau: "#a87f65",
		cheveux: "#332721",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bautista stavile": {
		tailleCm: 183,
		poidsKg: 90,
		peau: "#a17260",
		cheveux: "#5a3d34",
		yeux: "#587383",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"bealham finlay": {
		peau: "#c47552",
		cheveux: "#70371a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	beard: {
		peau: "#c07d62",
		cheveux: "#4e2815",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"beau farrance": {
		tailleCm: 196,
		poidsKg: 113,
		peau: "#c3917b",
		cheveux: "#4d3226",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"beddall harry": {
		peau: "#d59c85",
		cheveux: "#84654f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"beetham jacob": {
		peau: "#b37d78",
		cheveux: "#223438",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"beirne tadhg": {
		peau: "#b88167",
		cheveux: "#751b1c",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"beka gigashvili": {
		tailleCm: 178,
		poidsKg: 110,
		peau: "#be7a68",
		cheveux: "#5e3832",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"beka gorgadze": {
		tailleCm: 194,
		poidsKg: 103,
		peau: "#a46a56",
		cheveux: "#3c2f29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"beka saginadze": {
		tailleCm: 196,
		poidsKg: 100,
		peau: "#bf836e",
		cheveux: "#382b25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"beka shvangiradze": {
		tailleCm: 191,
		poidsKg: 92,
		peau: "#c78061",
		cheveux: "#3d291e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"belcher liam": {
		peau: "#946765",
		cheveux: "#2f2c2f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"bell angus": {
		peau: "#ce9691",
		cheveux: "#392922",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	bellamy: {
		peau: "#b16b55",
		cheveux: "#190a07",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"belleau anthony": {
		peau: "#c89891",
		cheveux: "#1e1718",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"belloni mirko": {
		peau: "#c08879",
		cheveux: "#233544",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ben afshar": {
		tailleCm: 183,
		poidsKg: 73,
		peau: "#b88664",
		cheveux: "#2c2620",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ben alexander": {
		tailleCm: 175,
		poidsKg: 101,
		peau: "#bf9189",
		cheveux: "#513b31",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ben bamber": {
		tailleCm: 204,
		poidsKg: 121,
		peau: "#ac806d",
		cheveux: "#423b3c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ben carson": {
		peau: "#c38470",
		cheveux: "#41281c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ben carter": {
		tailleCm: 202,
		poidsKg: 119,
		peau: "#c9917e",
		cheveux: "#614b3a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ben coen": {
		tailleCm: 184,
		poidsKg: 80,
		peau: "#ce9685",
		cheveux: "#382215",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ben curry": {
		tailleCm: 190,
		poidsKg: 97,
		peau: "#c49380",
		cheveux: "#1b2123",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ben donaldson": {
		peau: "#c48269",
		cheveux: "#211d18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ben donnell": {
		peau: "#ae7d7e",
		cheveux: "#211e2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ben gunter": {
		peau: "#ca9a7f",
		cheveux: "#2c2927",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ben hammersley": {
		tailleCm: 181,
		poidsKg: 84,
		peau: "#d69180",
		cheveux: "#794922",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ben jason dixon": {
		peau: "#c78762",
		cheveux: "#28291d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ben loader": {
		tailleCm: 183,
		poidsKg: 89,
		peau: "#94553d",
		cheveux: "#281915",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ben morrow": {
		peau: "#764736",
		cheveux: "#0d0c0b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ben mowen": {
		peau: "#c48273",
		cheveux: "#251d16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ben moxham": {
		peau: "#c38364",
		cheveux: "#533422",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ben murphy": {
		tailleCm: 198,
		poidsKg: 118,
		peau: "#de977d",
		cheveux: "#af7753",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"ben oconnor": {
		peau: "#d48679",
		cheveux: "#392217",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ben paltridge": {
		peau: "#be8a7a",
		cheveux: "#2a2424",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ben redshaw": {
		tailleCm: 192,
		poidsKg: 75,
		peau: "#b27974",
		cheveux: "#361f13",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"ben spencer": {
		tailleCm: 181,
		poidsKg: 79,
		peau: "#c48774",
		cheveux: "#211711",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ben thomas": {
		tailleCm: 180,
		poidsKg: 85,
		peau: "#ac7866",
		cheveux: "#291e1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ben volavola": {
		peau: "#906257",
		cheveux: "#16161a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ben waghorn": {
		tailleCm: 191,
		poidsKg: 89,
		peau: "#c28678",
		cheveux: "#3c2011",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ben warren": {
		tailleCm: 187,
		poidsKg: 117,
		peau: "#c88f78",
		cheveux: "#3a2c27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ben williams": {
		peau: "#ad796e",
		cheveux: "#52392f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"benet kumeroa": {
		peau: "#cc7c65",
		cheveux: "#3b2e2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"benhard janse van rensburg": {
		tailleCm: 187,
		poidsKg: 88,
		peau: "#ae7560",
		cheveux: "#2b2420",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"benjamin bertrand": {
		tailleCm: 175,
		poidsKg: 116,
		peau: "#c98a6c",
		cheveux: "#27171b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"benjamin botica": {
		peau: "#a56e5b",
		cheveux: "#312925",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"benjamin boudou": {
		tailleCm: 177,
		poidsKg: 113,
		peau: "#b9826c",
		cheveux: "#2f2621",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"benjamin elizalde": {
		tailleCm: 188,
		poidsKg: 86,
		peau: "#c38f74",
		cheveux: "#3c322e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"benjamin grondona": {
		tailleCm: 189,
		poidsKg: 94,
		peau: "#cb8a75",
		cheveux: "#211e1b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"benjamin houston": {
		peau: "#bf8f78",
		cheveux: "#0d0c0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"benjamin james": {
		peau: "#bc826f",
		cheveux: "#2b1d15",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"benjamin lefranc": {
		tailleCm: 192,
		poidsKg: 97,
		peau: "#ba815c",
		cheveux: "#1e1712",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"benjamin lopas": {
		peau: "#c48565",
		cheveux: "#2b211d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"benjamin nee nee": {
		peau: "#e1a88a",
		cheveux: "#38312f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"benjamin odonnell": {
		peau: "#b78373",
		cheveux: "#4b3727",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"benjamin puntous": {
		tailleCm: 182,
		poidsKg: 87,
		peau: "#a8603f",
		cheveux: "#0f150f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"benjamin tameifuna": {
		peau: "#cc876f",
		cheveux: "#201a27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"benjamin thomas stevenson": {
		peau: "#c97560",
		cheveux: "#241711",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"benjamin urdapilleta": {
		tailleCm: 179,
		poidsKg: 79,
		peau: "#d0a78f",
		cheveux: "#8a7161",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"benjamin white": {
		peau: "#c98c80",
		cheveux: "#312725",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"benjamn elizalde": {
		peau: "#c38f74",
		cheveux: "#3c322e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bennett james": {
		peau: "#d0a098",
		cheveux: "#574034",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"beno obano": {
		tailleCm: 186,
		poidsKg: 110,
		peau: "#6e4836",
		cheveux: "#2e221a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"benson archie": {
		peau: "#ca968d",
		cheveux: "#462f28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"bernard foley": {
		peau: "#c7aba2",
		cheveux: "#7b6560",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"bernard van der linde": {
		tailleCm: 175,
		poidsKg: 76,
		peau: "#bd826b",
		cheveux: "#120e0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"bernasconi bautista": {
		peau: "#aa7761",
		cheveux: "#16110d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bertaccini giulio": {
		peau: "#d09785",
		cheveux: "#434449",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"bester ethan": {
		peau: "#b9826a",
		cheveux: "#342e28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"bester litelihle": {
		peau: "#9e6c55",
		cheveux: "#4f3b28",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"bevan ellis": {
		peau: "#a3736f",
		cheveux: "#1f1f28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bevan rodd": {
		tailleCm: 187,
		poidsKg: 111,
		peau: "#a67c67",
		cheveux: "#191d25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"bhatti jamie": {
		peau: "#be8870",
		cheveux: "#342c2e",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"bianchi jacopo": {
		peau: "#bc8174",
		cheveux: "#304053",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"billy bohan": {
		tailleCm: 191,
		poidsKg: 104,
		peau: "#d98a74",
		cheveux: "#42382e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"billy burns": {
		peau: "#d8a19b",
		cheveux: "#382c2a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"billy corrigan": {
		peau: "#c08974",
		cheveux: "#493c2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"billy harmon": {
		peau: "#c59678",
		cheveux: "#4a3c32",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"billy pollard": {
		peau: "#cd9c8b",
		cheveux: "#312929",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"billy proctor": {
		peau: "#c37d5e",
		cheveux: "#31221e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"billy searle": {
		tailleCm: 179,
		poidsKg: 75,
		peau: "#b9725e",
		cheveux: "#352017",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"blacker dane": {
		peau: "#c19186",
		cheveux: "#3e2f2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"blade caolin": {
		peau: "#c99788",
		cheveux: "#392822",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"blair kinghorn": {
		tailleCm: 197,
		poidsKg: 102,
		peau: "#d7a6a3",
		cheveux: "#2f2424",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"blair murray": {
		tailleCm: 175,
		poidsKg: 71,
		peau: "#a2756d",
		cheveux: "#6b3031",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"blair ryall": {
		peau: "#cfa38f",
		cheveux: "#8d6f5b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"blake gibson": {
		peau: "#c89a89",
		cheveux: "#69523b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"blake schoupp": {
		peau: "#b97e6e",
		cheveux: "#2c2e39",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"blake seb": {
		peau: "#bd827e",
		cheveux: "#3e2018",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"bleuler dian": {
		peau: "#a8705e",
		cheveux: "#21211e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"bobby bissu": {
		tailleCm: 189,
		poidsKg: 106,
		peau: "#6b5043",
		cheveux: "#212121",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"bobby sheehan": {
		peau: "#cc977f",
		cheveux: "#2b3244",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bohan billy": {
		peau: "#d98a74",
		cheveux: "#42382e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"bolton shayne": {
		peau: "#d38267",
		cheveux: "#564634",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"bongi mbonambi": {
		peau: "#965a51",
		cheveux: "#353633",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"boris goutard": {
		tailleCm: 177,
		poidsKg: 76,
		peau: "#c48b6e",
		cheveux: "#3e3128",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"boris hadinegoro": {
		tailleCm: 172,
		poidsKg: 67,
		peau: "#b88876",
		cheveux: "#2b2016",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"boris palu": {
		tailleCm: 195,
		poidsKg: 101,
		peau: "#6e4a3c",
		cheveux: "#211a16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"boris wenger": {
		tailleCm: 187,
		poidsKg: 97,
		peau: "#a97667",
		cheveux: "#2d1d10",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"boshoff evardi": {
		peau: "#a97b68",
		cheveux: "#513e36",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"boston fakafanua": {
		peau: "#be805d",
		cheveux: "#1f1c17",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"botha tom": {
		peau: "#9d6d5b",
		cheveux: "#3f3027",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"botham james": {
		peau: "#cfa093",
		cheveux: "#322622",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"bowen tom": {
		peau: "#a47676",
		cheveux: "#403134",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"boyle jack": {
		peau: "#be8074",
		cheveux: "#523e31",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"boyle paul": {
		peau: "#cd8f82",
		cheveux: "#1d1a1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"brad shields": {
		peau: "#b07053",
		cheveux: "#624330",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"brad weber": {
		peau: "#d18d77",
		cheveux: "#342921",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"bradley davids": {
		peau: "#8a594f",
		cheveux: "#1f1e1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"brandon julio tiute nansen": {
		peau: "#ceaa87",
		cheveux: "#746650",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"brandon paenga amosa": {
		peau: "#a86b41",
		cheveux: "#1d1b17",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"braude ross": {
		peau: "#c1816e",
		cheveux: "#4d3c3b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"braxton lua asi": {
		peau: "#b88572",
		cheveux: "#5c483d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"brayden iose": {
		peau: "#c98262",
		cheveux: "#342926",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"braydon ennor": {
		tailleCm: 182,
		poidsKg: 82,
		peau: "#bb8b75",
		cheveux: "#59412e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"brendan owen": {
		peau: "#c8977a",
		cheveux: "#5f4635",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"brendon nell": {
		peau: "#996540",
		cheveux: "#46311b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"brent liufau": {
		tailleCm: 193,
		poidsKg: 127,
		peau: "#bc775c",
		cheveux: "#1d1e20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"brett cameron": {
		peau: "#d18d6e",
		cheveux: "#634332",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"brett connon": {
		tailleCm: 179,
		poidsKg: 86,
		peau: "#ac837b",
		cheveux: "#282328",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"brian deeny": {
		peau: "#b67e6a",
		cheveux: "#30281b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"brian gleeson": {
		tailleCm: 193,
		poidsKg: 110,
		peau: "#d2917a",
		cheveux: "#a81e21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"brice ferrer": {
		tailleCm: 190,
		poidsKg: 93,
		peau: "#ad693c",
		cheveux: "#392611",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"brodi mccurran": {
		peau: "#d0987d",
		cheveux: "#694835",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"brodie coghlan": {
		tailleCm: 186,
		poidsKg: 103,
		peau: "#d3a48b",
		cheveux: "#332927",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"brodie mc alister": {
		peau: "#ad7260",
		cheveux: "#1d1510",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"brodie retallick": {
		peau: "#b9846c",
		cheveux: "#3b312d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"brody macaskill": {
		peau: "#d3a080",
		cheveux: "#171a11",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"brophy tadhg": {
		peau: "#b57c6a",
		cheveux: "#372a18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"brown gregor": {
		peau: "#ad785c",
		cheveux: "#45372d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"bruce devaux": {
		tailleCm: 181,
		poidsKg: 99,
		peau: "#b87878",
		cheveux: "#3d2e30",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"bryan oconnor": {
		peau: "#d79f8d",
		cheveux: "#733d2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"bryant john": {
		peau: "#b27d67",
		cheveux: "#2f1d13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bryce calvert": {
		peau: "#b48171",
		cheveux: "#29241f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bryn bradley": {
		tailleCm: 194,
		poidsKg: 94,
		peau: "#c88c77",
		cheveux: "#331c0f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"bryn gatland": {
		peau: "#b97f6f",
		cheveux: "#38302d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"bryn hall": {
		peau: "#d29d92",
		cheveux: "#423d3f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"bryn ward": {
		peau: "#d3a197",
		cheveux: "#643d26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"buckley denis": {
		peau: "#d19b8c",
		cheveux: "#263932",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"bundee aki": {
		tailleCm: 177,
		poidsKg: 91,
		peau: "#be8065",
		cheveux: "#2c4942",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"bunkei kaku": {
		peau: "#aa7e63",
		cheveux: "#2e2720",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"bunsuke kurita": {
		peau: "#cb8c70",
		cheveux: "#160c08",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"buonfiglio paolo": {
		peau: "#9b6c5e",
		cheveux: "#2c373d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"burger odendaal": {
		peau: "#b17865",
		cheveux: "#392c22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"burger zak": {
		peau: "#916150",
		cheveux: "#222725",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"burrows oli": {
		peau: "#c68a75",
		cheveux: "#1e1815",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"buthelezi phepsi": {
		peau: "#8d644e",
		cheveux: "#1c1c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"butler tony": {
		peau: "#cc7f67",
		cheveux: "#54231b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"buxton noah": {
		peau: "#bd8577",
		cheveux: "#20100f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"byrne harry": {
		peau: "#af826d",
		cheveux: "#29231c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"byrne ross": {
		peau: "#a1675e",
		cheveux: "#261915",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "full_beard"
	},
	"byron ralston": {
		tailleCm: 185,
		poidsKg: 89,
		peau: "#b56854",
		cheveux: "#191311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"cabango theo": {
		peau: "#8f645a",
		cheveux: "#1c1a20",
		yeux: "#587383",
		coiffure: "short",
		barbe: "moustache"
	},
	"cadan murley": {
		tailleCm: 186,
		poidsKg: 88,
		peau: "#c0826f",
		cheveux: "#27130c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"cadeyrn neville": {
		peau: "#cc9886",
		cheveux: "#4d424c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"caelan doris": {
		peau: "#996557",
		cheveux: "#143776",
		yeux: "#587383",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"cahir jerry": {
		peau: "#ba8071",
		cheveux: "#27281f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"cai evans": {
		tailleCm: 185,
		poidsKg: 74,
		peau: "#d59e8a",
		cheveux: "#966a56",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"caleb cavubati": {
		peau: "#b46d43",
		cheveux: "#0f140c",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"caleb delany": {
		peau: "#cd835f",
		cheveux: "#2b231f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"caleb kalisi timu": {
		peau: "#b97465",
		cheveux: "#2c2c2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"caleb muntz": {
		tailleCm: 176,
		poidsKg: 75,
		peau: "#b27860",
		cheveux: "#1b1410",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"caleb tangitau": {
		peau: "#b0857b",
		cheveux: "#5b4a2e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"callum chick": {
		tailleCm: 189,
		poidsKg: 109,
		peau: "#a8706a",
		cheveux: "#3e2b22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"callum harkin": {
		peau: "#d08b6a",
		cheveux: "#644b36",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"callum mac donald": {
		peau: "#c29387",
		cheveux: "#40332c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"callum reid": {
		peau: "#bf877a",
		cheveux: "#564031",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"callum sheedy": {
		tailleCm: 175,
		poidsKg: 79,
		peau: "#c08d87",
		cheveux: "#3e3134",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"callum woolley": {
		tailleCm: 194,
		poidsKg: 92,
		peau: "#8c5f4f",
		cheveux: "#472e28",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"calum randle": {
		tailleCm: 184,
		poidsKg: 83,
		peau: "#c5918d",
		cheveux: "#3d2f2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"calvert bryce": {
		peau: "#b48171",
		cheveux: "#29241f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"calvey emmett": {
		peau: "#d18073",
		cheveux: "#422417",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"calvin nash": {
		tailleCm: 181,
		poidsKg: 87,
		peau: "#d49885",
		cheveux: "#492b25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"cam roigard": {
		peau: "#ce876b",
		cheveux: "#50392b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cam winnett": {
		tailleCm: 177,
		poidsKg: 73,
		peau: "#b5807e",
		cheveux: "#4b3635",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cameron anderson": {
		tailleCm: 183,
		poidsKg: 84,
		peau: "#b9725c",
		cheveux: "#25130c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cameron bailey": {
		peau: "#a5746e",
		cheveux: "#483934",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"cameron dawson": {
		peau: "#c98c84",
		cheveux: "#5d3e31",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"cameron dodson": {
		peau: "#c98e6b",
		cheveux: "#452a15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cameron hanekom": {
		peau: "#a67a6c",
		cheveux: "#2f231b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cameron henderson": {
		tailleCm: 205,
		poidsKg: 106,
		peau: "#ac655b",
		cheveux: "#44261c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"cameron holt": {
		tailleCm: 193,
		poidsKg: 106,
		peau: "#d3ae98",
		cheveux: "#26221a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cameron hutchison": {
		peau: "#a87b6a",
		cheveux: "#171515",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"cameron jones": {
		tailleCm: 192,
		poidsKg: 123,
		peau: "#c38c7a",
		cheveux: "#2c211d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"cameron millar": {
		peau: "#b48466",
		cheveux: "#3a3e33",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"cameron redpath": {
		tailleCm: 192,
		poidsKg: 84,
		peau: "#bf866e",
		cheveux: "#150d07",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cameron woki": {
		tailleCm: 194,
		poidsKg: 101,
		peau: "#624134",
		cheveux: "#2a1c14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cameron wright": {
		tailleCm: 185,
		poidsKg: 86,
		peau: "#c18073",
		cheveux: "#211a16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"camille baz marcos": {
		tailleCm: 184,
		poidsKg: 91,
		peau: "#d0a394",
		cheveux: "#4b4649",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"camille chat": {
		tailleCm: 174,
		poidsKg: 92,
		peau: "#ce7f60",
		cheveux: "#4f3428",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"camille vallee": {
		peau: "#c68f6f",
		cheveux: "#30251a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"campbell ridl": {
		tailleCm: 200,
		poidsKg: 82,
		peau: "#dca08e",
		cheveux: "#331a0e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"canali matteo": {
		peau: "#b88b80",
		cheveux: "#3a3632",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"canan moodie": {
		peau: "#aa6144",
		cheveux: "#17110f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cannone lorenzo": {
		peau: "#b37e65",
		cheveux: "#65462c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cannone niccolo": {
		peau: "#a4725f",
		cheveux: "#463421",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"caolan englefield": {
		tailleCm: 180,
		poidsKg: 78,
		peau: "#9f6662",
		cheveux: "#441e10",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"caolin blade": {
		tailleCm: 167,
		poidsKg: 72,
		peau: "#c99788",
		cheveux: "#392822",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"carlo mignot": {
		peau: "#dea484",
		cheveux: "#807565",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"carlo tizzano": {
		peau: "#d0917a",
		cheveux: "#31271b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"carlu johann sadie": {
		peau: "#a26758",
		cheveux: "#2b201b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"carr nizaam": {
		peau: "#966046",
		cheveux: "#5c3925",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"carrera franco": {
		peau: "#d5a596",
		cheveux: "#384a79",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"carson ben": {
		peau: "#c38470",
		cheveux: "#41281c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"carter ben": {
		peau: "#c9917e",
		cheveux: "#614b3a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"carter gordon": {
		peau: "#ca9898",
		cheveux: "#6f5145",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"carty jack": {
		peau: "#dc947a",
		cheveux: "#36554c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"carwyn leggatt jones": {
		tailleCm: 169,
		poidsKg: 76,
		peau: "#9c6c63",
		cheveux: "#49242a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"casey craig": {
		peau: "#b26b4c",
		cheveux: "#783b27",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"caspar gabriel": {
		peau: "#96684e",
		cheveux: "#463026",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"cassius cleaves": {
		tailleCm: 179,
		poidsKg: 85,
		peau: "#a56845",
		cheveux: "#29170d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"cathal forde": {
		tailleCm: 189,
		poidsKg: 84,
		peau: "#c9857c",
		cheveux: "#312d22",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"caulfield josh": {
		peau: "#d79275",
		cheveux: "#84684f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"ceano everson": {
		peau: "#795234",
		cheveux: "#1a1b1a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"cebo dlamini": {
		tailleCm: 181,
		poidsKg: 111,
		peau: "#8e634d",
		cheveux: "#262021",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"cedate gomes sa": {
		tailleCm: 187,
		poidsKg: 108,
		peau: "#855443",
		cheveux: "#393029",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"celian pouzelgues": {
		tailleCm: 193,
		poidsKg: 88,
		peau: "#e0a996",
		cheveux: "#38281e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"chance peni": {
		peau: "#836150",
		cheveux: "#252225",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"chandler cunningham south": {
		tailleCm: 190,
		poidsKg: 114,
		peau: "#885837",
		cheveux: "#140d08",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"changho ahn": {
		peau: "#c4886b",
		cheveux: "#1b1a18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"charles henri berguet": {
		peau: "#b16856",
		cheveux: "#432d29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"charles kante samba": {
		tailleCm: 201,
		poidsKg: 106,
		peau: "#cb8869",
		cheveux: "#261815",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"charles laloi": {
		tailleCm: 180,
		poidsKg: 71,
		peau: "#b7816e",
		cheveux: "#352620",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"charles matthews": {
		peau: "#8c5436",
		cheveux: "#14150e",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"charles ollivon": {
		tailleCm: 201,
		poidsKg: 102,
		peau: "#c2847c",
		cheveux: "#1c1b1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"charles piutau": {
		peau: "#b0866b",
		cheveux: "#2d2825",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"charlie atkinson": {
		tailleCm: 181,
		poidsKg: 81,
		peau: "#c78d8a",
		cheveux: "#482a20",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"charlie bracken": {
		tailleCm: 182,
		poidsKg: 73,
		peau: "#ae7752",
		cheveux: "#1d100b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"charlie brosnan": {
		peau: "#b57f7b",
		cheveux: "#583a33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"charlie cale": {
		peau: "#c08674",
		cheveux: "#2d2e38",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"charlie cassang": {
		tailleCm: 177,
		poidsKg: 86,
		peau: "#c98562",
		cheveux: "#4e392a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"charlie clare": {
		tailleCm: 180,
		poidsKg: 105,
		peau: "#a75c4a",
		cheveux: "#2c1913",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"charlie ewels": {
		tailleCm: 202,
		poidsKg: 102,
		peau: "#c18970",
		cheveux: "#221914",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"charlie francoz": {
		tailleCm: 198,
		poidsKg: 99,
		peau: "#aa6f48",
		cheveux: "#1a1612",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"charlie griffin": {
		peau: "#ce9177",
		cheveux: "#5a381d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"charlie irvine": {
		peau: "#d3937f",
		cheveux: "#352214",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"charlie lawrence": {
		peau: "#c28a72",
		cheveux: "#2b2723",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"charlie savala": {
		tailleCm: 196,
		poidsKg: 94,
		peau: "#ce948e",
		cheveux: "#503243",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"charlie tamani": {
		peau: "#9e6959",
		cheveux: "#221a1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"charlie tector": {
		peau: "#ce8f79",
		cheveux: "#1f3332",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"charlie titcombe": {
		tailleCm: 185,
		poidsKg: 79,
		peau: "#bf7e70",
		cheveux: "#21130f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"charlie ulcoq": {
		tailleCm: 191,
		poidsKg: 95,
		peau: "#af766f",
		cheveux: "#3b251e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"charlie west": {
		peau: "#ae7752",
		cheveux: "#110b07",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"charlie worthington": {
		peau: "#d29789",
		cheveux: "#41342a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"charly gambini": {
		tailleCm: 201,
		poidsKg: 98,
		peau: "#ab836f",
		cheveux: "#362c26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"charly malie": {
		tailleCm: 184,
		poidsKg: 77,
		peau: "#ae754f",
		cheveux: "#281c12",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"charly mignot": {
		tailleCm: 180,
		poidsKg: 82,
		peau: "#c38164",
		cheveux: "#533725",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"chase tiatia": {
		peau: "#dd9588",
		cheveux: "#2e272e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"chawatama lovejoy": {
		peau: "#765644",
		cheveux: "#131414",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"chay fihaki": {
		peau: "#b48468",
		cheveux: "#312c28",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"chay mullins": {
		peau: "#c47d5b",
		cheveux: "#2b1e18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"che hope": {
		tailleCm: 180,
		poidsKg: 70,
		peau: "#c69177",
		cheveux: "#2d221c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cheikh saliou tiberghien": {
		peau: "#b6634b",
		cheveux: "#21100a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"cheng chao yi": {
		peau: "#a5735f",
		cheveux: "#1d191b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"cheslin kolbe": {
		peau: "#cb9a84",
		cheveux: "#473f3e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cheswill jooste": {
		peau: "#502e22",
		cheveux: "#160f0a",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"chick callum": {
		peau: "#a8706a",
		cheveux: "#3e2b22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"chihiro matsuyama": {
		peau: "#d69c83",
		cheveux: "#242729",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"chihito matsui": {
		peau: "#b88a61",
		cheveux: "#28211d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"chisonn kinn": {
		peau: "#bc805f",
		cheveux: "#2a211b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"chris harris": {
		tailleCm: 186,
		poidsKg: 99,
		peau: "#b77e68",
		cheveux: "#573e30",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"chris mickelson": {
		peau: "#b9826f",
		cheveux: "#23232a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"chris smit": {
		peau: "#ae7968",
		cheveux: "#593f28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"christ tshiunza": {
		tailleCm: 202,
		poidsKg: 110,
		peau: "#7b5646",
		cheveux: "#131517",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"christiaan van der merwe": {
		tailleCm: 199,
		poidsKg: 103,
		peau: "#c28f74",
		cheveux: "#634a34",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"christian coleman": {
		peau: "#c58c75",
		cheveux: "#2e2724",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"christian everitt": {
		tailleCm: 187,
		poidsKg: 100,
		peau: "#a26f64",
		cheveux: "#443226",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"christian guetang ambadiang": {
		peau: "#744a45",
		cheveux: "#43261c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"christian james judge": {
		peau: "#c9856c",
		cheveux: "#834c3b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"christian laui": {
		peau: "#bc6c40",
		cheveux: "#221910",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"christian lio willie": {
		peau: "#ce9b7b",
		cheveux: "#1c1b1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"christian luaki": {
		tailleCm: 182,
		poidsKg: 114,
		peau: "#dba28c",
		cheveux: "#322320",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"christie grobbelaar": {
		peau: "#c48875",
		cheveux: "#574029",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"christopher tolofua": {
		tailleCm: 180,
		poidsKg: 119,
		peau: "#986856",
		cheveux: "#080908",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"christopher vaotoa": {
		tailleCm: 184,
		poidsKg: 126,
		peau: "#b48570",
		cheveux: "#234648",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"chunya munga": {
		tailleCm: 203,
		poidsKg: 111,
		peau: "#88584a",
		cheveux: "#1d1615",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cian prendergast": {
		tailleCm: 197,
		poidsKg: 103,
		peau: "#d98770",
		cheveux: "#5f4136",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ciaran donoghue": {
		tailleCm: 181,
		poidsKg: 75,
		peau: "#cb947b",
		cheveux: "#3c2819",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ciaran frawley": {
		tailleCm: 192,
		poidsKg: 93,
		peau: "#b97c6c",
		cheveux: "#673f25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ciaran knight": {
		tailleCm: 191,
		poidsKg: 117,
		peau: "#bc7976",
		cheveux: "#2d1d1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ciaran mangan": {
		peau: "#be7f6a",
		cheveux: "#363628",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"clark arthur": {
		peau: "#b47670",
		cheveux: "#44271c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"clarkson thomas": {
		peau: "#8e5945",
		cheveux: "#1d1b18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"clein max": {
		peau: "#d28567",
		cheveux: "#9a5034",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"clem halaholo": {
		peau: "#b67e5d",
		cheveux: "#0e0f0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"clement jack": {
		peau: "#a6665c",
		cheveux: "#3a1e14",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"clement malinowski": {
		tailleCm: 176,
		poidsKg: 90,
		peau: "#b17a6b",
		cheveux: "#392923",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"clement mondinat": {
		tailleCm: 183,
		poidsKg: 75,
		peau: "#c28c76",
		cheveux: "#41342c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"clement paul": {
		tailleCm: 202,
		poidsKg: 97,
		peau: "#b77962",
		cheveux: "#382c25",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"clement sentubery": {
		tailleCm: 193,
		poidsKg: 94,
		peau: "#b47a64",
		cheveux: "#413227",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"clement verge": {
		tailleCm: 205,
		poidsKg: 115,
		peau: "#d79a90",
		cheveux: "#342926",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cleopas kundiona": {
		tailleCm: 178,
		poidsKg: 119,
		peau: "#5d312b",
		cheveux: "#1a1311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"clment ancely": {
		peau: "#966345",
		cheveux: "#17110b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"clment barthes": {
		peau: "#db9d82",
		cheveux: "#392d2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"clment bitz": {
		peau: "#9c685f",
		cheveux: "#48332a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"clment clavieres": {
		peau: "#a56a60",
		cheveux: "#4f362c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"clment egiziano": {
		peau: "#d19b78",
		cheveux: "#372a24",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"clment garrigues": {
		peau: "#c28c70",
		cheveux: "#41312c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"clment laporte": {
		peau: "#b16d5e",
		cheveux: "#28201c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"clment martinez": {
		peau: "#c68c71",
		cheveux: "#674e38",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"clovis le bail": {
		tailleCm: 174,
		poidsKg: 64,
		peau: "#d69781",
		cheveux: "#352b27",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"clynton knox": {
		peau: "#cc9e93",
		cheveux: "#4a3d37",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"cobus reinach": {
		peau: "#a86c59",
		cheveux: "#1f1812",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"cobus wiese": {
		peau: "#b57e6c",
		cheveux: "#3e3229",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"codie taylor": {
		peau: "#a2755d",
		cheveux: "#241f1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cody thomas": {
		tailleCm: 188,
		poidsKg: 118,
		peau: "#c39f7f",
		cheveux: "#2e2c22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"coenraad van wyk": {
		peau: "#c79085",
		cheveux: "#715248",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"coetzee le roux": {
		peau: "#c3947f",
		cheveux: "#362c24",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"coetzee marcell": {
		peau: "#a76d5f",
		cheveux: "#1e1a17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"coffey oliver": {
		peau: "#c78877",
		cheveux: "#262f21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"coghlan brodie": {
		peau: "#d3a48b",
		cheveux: "#332927",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cokanasiga phil": {
		peau: "#815b4a",
		cheveux: "#22211c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"colby faingaa": {
		peau: "#c38870",
		cheveux: "#28201d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"coleman christian": {
		peau: "#c58c75",
		cheveux: "#2e2724",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"coles alex": {
		peau: "#b57473",
		cheveux: "#3f2824",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"colin dupuy": {
		tailleCm: 173,
		poidsKg: 61,
		peau: "#d7968a",
		cheveux: "#4d3730",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"colm reilly": {
		tailleCm: 174,
		poidsKg: 67,
		peau: "#ad816c",
		cheveux: "#19281e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"conan jack": {
		peau: "#936757",
		cheveux: "#1c354d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"conbeer ryan": {
		peau: "#ad7c71",
		cheveux: "#3e3839",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"connor anderson": {
		peau: "#cc9990",
		cheveux: "#2a201c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"connor evans": {
		peau: "#b8805e",
		cheveux: "#47311e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"connor fahy": {
		peau: "#c58873",
		cheveux: "#412c1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"connor moyse": {
		peau: "#ac867c",
		cheveux: "#3b3131",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"connor sa": {
		tailleCm: 178,
		poidsKg: 95,
		peau: "#926756",
		cheveux: "#1e1715",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"connor seve": {
		peau: "#cf9480",
		cheveux: "#231f1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"connor slevin": {
		tailleCm: 184,
		poidsKg: 82,
		peau: "#c88870",
		cheveux: "#451f17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"connors will": {
		peau: "#af6e60",
		cheveux: "#192623",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"conor bartley": {
		peau: "#d58a79",
		cheveux: "#b61b1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"conor kennelly": {
		tailleCm: 202,
		poidsKg: 100,
		peau: "#d99a8a",
		cheveux: "#522716",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"conor mckee": {
		peau: "#cd8e7d",
		cheveux: "#5b3a1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"conor otighearnaigh": {
		peau: "#a8755d",
		cheveux: "#4f3d2a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"conor ryan": {
		tailleCm: 198,
		poidsKg: 105,
		peau: "#d28a78",
		cheveux: "#853724",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"coombes gavin": {
		peau: "#d8a082",
		cheveux: "#9f4827",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cooney hugh": {
		peau: "#b27f6e",
		cheveux: "#6b4927",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cooper flanders": {
		peau: "#d1906e",
		cheveux: "#563f34",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"cooper grant": {
		peau: "#c89077",
		cheveux: "#2d241c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cooper roberts": {
		peau: "#d9a18e",
		cheveux: "#392a20",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"corentin coularis": {
		tailleCm: 196,
		poidsKg: 101,
		peau: "#d78978",
		cheveux: "#201718",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"corentin glenat": {
		tailleCm: 189,
		poidsKg: 86,
		peau: "#af7b65",
		cheveux: "#302721",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"corentin mezou": {
		tailleCm: 203,
		poidsKg: 109,
		peau: "#d49083",
		cheveux: "#261d1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"corentin peccaud": {
		tailleCm: 184,
		poidsKg: 80,
		peau: "#cba28d",
		cheveux: "#383327",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"corey domachowski": {
		tailleCm: 179,
		poidsKg: 114,
		peau: "#be8d88",
		cheveux: "#4e464a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"corey kellow": {
		peau: "#be8c74",
		cheveux: "#624b33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"corey toole": {
		peau: "#bd8571",
		cheveux: "#2b2421",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"cormac daly": {
		peau: "#d9b095",
		cheveux: "#664a33",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"cormac foley": {
		peau: "#bc816e",
		cheveux: "#251e16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cormac izuchukwu": {
		peau: "#cf8e6c",
		cheveux: "#251b14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"corne rahl": {
		peau: "#ba7a7b",
		cheveux: "#70463a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"corne weilbach": {
		tailleCm: 183,
		poidsKg: 118,
		peau: "#7a453d",
		cheveux: "#221611",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"cornel smit": {
		peau: "#b98771",
		cheveux: "#3a2c23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"corrigan billy": {
		peau: "#c08974",
		cheveux: "#493c2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cortez ratima": {
		peau: "#ac6c53",
		cheveux: "#392418",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"costelow sam": {
		peau: "#ba847b",
		cheveux: "#5a4032",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cottle tom": {
		peau: "#ae7c7a",
		cheveux: "#2c2631",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"coughlan ethan": {
		peau: "#d29482",
		cheveux: "#992527",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"courtney lawes": {
		tailleCm: 202,
		poidsKg: 108,
		peau: "#ab745c",
		cheveux: "#121213",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"cowell joe": {
		peau: "#ae8d8d",
		cheveux: "#5c4646",
		yeux: "#587383",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"craig alex": {
		peau: "#c89279",
		cheveux: "#554638",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"craig casey": {
		tailleCm: 168,
		poidsKg: 72,
		peau: "#b26b4c",
		cheveux: "#783b27",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"craig millar": {
		peau: "#cd9c87",
		cheveux: "#82665c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"craig willis": {
		tailleCm: 184,
		poidsKg: 87,
		peau: "#c99683",
		cheveux: "#765848",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"craig wright": {
		tailleCm: 175,
		poidsKg: 97,
		peau: "#c59089",
		cheveux: "#6f5140",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"crean sam": {
		peau: "#d09c85",
		cheveux: "#2c211c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cristian ojovan": {
		tailleCm: 181,
		poidsKg: 109,
		peau: "#c4917c",
		cheveux: "#3e3530",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"crowley jack": {
		peau: "#cd8d78",
		cheveux: "#7e2326",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"cuckson harvey": {
		peau: "#c3806f",
		cheveux: "#772629",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"culhane james": {
		peau: "#ba8670",
		cheveux: "#243426",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cullen grace": {
		tailleCm: 189,
		poidsKg: 99,
		peau: "#cb957e",
		cheveux: "#483120",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cullen keillen": {
		peau: "#aa8176",
		cheveux: "#332b28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cummings scott": {
		peau: "#b6856f",
		cheveux: "#2f292b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"cummins steve": {
		peau: "#c1917c",
		cheveux: "#3e2d23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"curtis langdon": {
		tailleCm: 185,
		poidsKg: 102,
		peau: "#c59386",
		cheveux: "#3d2623",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"curtis reid": {
		peau: "#dcaa95",
		cheveux: "#c27360",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"curwin bosch": {
		peau: "#bd8368",
		cheveux: "#64473c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"cyprien kileztky": {
		peau: "#c09383",
		cheveux: "#322f2c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"cyriac guilly": {
		tailleCm: 196,
		poidsKg: 103,
		peau: "#c59569",
		cheveux: "#4f3d1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"cyril baille": {
		tailleCm: 177,
		poidsKg: 110,
		peau: "#d49b8d",
		cheveux: "#271418",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cyril cazeaux": {
		tailleCm: 195,
		poidsKg: 112,
		peau: "#885d4f",
		cheveux: "#181615",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"cyril deligny": {
		tailleCm: 176,
		poidsKg: 95,
		peau: "#c38a75",
		cheveux: "#604a3a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"da re giacomo": {
		peau: "#91665d",
		cheveux: "#333135",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"dachi papunashvili": {
		tailleCm: 174,
		poidsKg: 76,
		peau: "#dab19b",
		cheveux: "#1c1b1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dafydd hughes": {
		tailleCm: 181,
		poidsKg: 94,
		peau: "#ae7f80",
		cheveux: "#4e3632",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dafydd jenkins": {
		tailleCm: 206,
		poidsKg: 110,
		peau: "#d49577",
		cheveux: "#2b1b11",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"dai goto": {
		peau: "#dba583",
		cheveux: "#302320",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"dai kawahara": {
		peau: "#b5856e",
		cheveux: "#171615",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"dai richards": {
		peau: "#d99f83",
		cheveux: "#966f52",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"daichi akiyama": {
		peau: "#b48060",
		cheveux: "#251f1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daichi inami": {
		peau: "#cf9893",
		cheveux: "#201c22",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"daichi kono": {
		peau: "#ca9379",
		cheveux: "#26221d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daichi kurihara": {
		peau: "#cd958c",
		cheveux: "#262527",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daichi nagayama": {
		peau: "#5e504f",
		cheveux: "#2d2017",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"daichi saito": {
		peau: "#d2a082",
		cheveux: "#181817",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daichi sato": {
		peau: "#dbaea6",
		cheveux: "#353439",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daigo doi": {
		peau: "#a87c6c",
		cheveux: "#201c1e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daigo hashimoto": {
		peau: "#cd9782",
		cheveux: "#1d1c1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daigo sasagawa": {
		peau: "#dca283",
		cheveux: "#302925",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daigo uehata": {
		peau: "#b6795e",
		cheveux: "#201b17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daigo yoshimoto": {
		peau: "#b98a77",
		cheveux: "#191614",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"daiki ishiura": {
		peau: "#b07657",
		cheveux: "#1b1a16",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daiki kon": {
		peau: "#d39577",
		cheveux: "#2c2624",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"daiki kusunoki": {
		peau: "#c79e89",
		cheveux: "#1e1b1b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"daiki nakagawa": {
		peau: "#b37f73",
		cheveux: "#1c1614",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daiki nakajima": {
		peau: "#cc8a6e",
		cheveux: "#332926",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"daiki sato": {
		peau: "#d9a181",
		cheveux: "#10150e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"daiki shimura": {
		peau: "#d99f89",
		cheveux: "#2b2d31",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daiki yamagiwa": {
		peau: "#bc8366",
		cheveux: "#1c1a18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daiki yokota": {
		peau: "#ab826a",
		cheveux: "#191412",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"daishi kojima": {
		peau: "#dcac8a",
		cheveux: "#221c11",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"daishi nyui": {
		peau: "#a9806f",
		cheveux: "#231e1f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daishirou inoue": {
		peau: "#c18163",
		cheveux: "#332720",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daisuke fujikura": {
		peau: "#b26f57",
		cheveux: "#211710",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"daisuke hijii": {
		peau: "#c28461",
		cheveux: "#241f1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daisuke iba": {
		peau: "#ddad8d",
		cheveux: "#211e1c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daisuke ito": {
		peau: "#c6917d",
		cheveux: "#242121",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daisuke musha": {
		peau: "#c48975",
		cheveux: "#2f2623",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daisuke nishikawa": {
		peau: "#d5a182",
		cheveux: "#24211d",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"daisuke noguchi": {
		peau: "#a96d4e",
		cheveux: "#161613",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daisuke yamato": {
		peau: "#d6a091",
		cheveux: "#2b2e33",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daisuke yokoyama": {
		peau: "#d49d83",
		cheveux: "#23201b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daito tone": {
		peau: "#9d7361",
		cheveux: "#221c1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"dallas mc leod": {
		peau: "#c4927e",
		cheveux: "#473427",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dallas tatana": {
		peau: "#d29c88",
		cheveux: "#3f342f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"dalton matt": {
		peau: "#d1978a",
		cheveux: "#3a281c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"daly shane": {
		peau: "#db9580",
		cheveux: "#632e25",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"damian de allende": {
		peau: "#d3a193",
		cheveux: "#383336",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"damian mc kenzie": {
		peau: "#9a6752",
		cheveux: "#4d331f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"damian penaud": {
		tailleCm: 186,
		poidsKg: 91,
		peau: "#a97865",
		cheveux: "#2e221e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"damian willemse": {
		peau: "#804c39",
		cheveux: "#1e1714",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"damiano mazza": {
		tailleCm: 179,
		poidsKg: 91,
		peau: "#c59574",
		cheveux: "#253f3f",
		yeux: "#587383",
		coiffure: "short",
		barbe: "moustache"
	},
	"damien anon": {
		tailleCm: 180,
		poidsKg: 72,
		peau: "#a5684c",
		cheveux: "#14120e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"damien bozic": {
		tailleCm: 203,
		poidsKg: 97,
		peau: "#a77a60",
		cheveux: "#3c2e2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dan davis": {
		tailleCm: 182,
		poidsKg: 94,
		peau: "#a06f5e",
		cheveux: "#361c20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"dan du plessis": {
		tailleCm: 188,
		poidsKg: 92,
		peau: "#c89476",
		cheveux: "#584430",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dan edwards": {
		tailleCm: 175,
		poidsKg: 74,
		peau: "#ae877a",
		cheveux: "#3f2d24",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"dan frost": {
		tailleCm: 179,
		poidsKg: 95,
		peau: "#c0876f",
		cheveux: "#231812",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dan gemine": {
		peau: "#dbaa92",
		cheveux: "#271b18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"dan kelly": {
		tailleCm: 184,
		poidsKg: 93,
		peau: "#c17d62",
		cheveux: "#ae1b22",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"dan lancaster": {
		tailleCm: 186,
		poidsKg: 86,
		peau: "#c4947d",
		cheveux: "#574535",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"dan nelson": {
		peau: "#b88374",
		cheveux: "#302c32",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"dan robson": {
		tailleCm: 171,
		poidsKg: 72,
		peau: "#c38c84",
		cheveux: "#4d2d25",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"dan sheehan": {
		peau: "#9f6153",
		cheveux: "#16385c",
		yeux: "#587383",
		coiffure: "long",
		barbe: "short_beard"
	},
	"dan thomas": {
		tailleCm: 186,
		poidsKg: 92,
		peau: "#b28782",
		cheveux: "#483a3b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"dane blacker": {
		tailleCm: 178,
		poidsKg: 73,
		peau: "#c19186",
		cheveux: "#3e2f2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"daniel bibi biziwu": {
		tailleCm: 183,
		poidsKg: 108,
		peau: "#6f4c43",
		cheveux: "#252524",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"daniel botha": {
		peau: "#c47a65",
		cheveux: "#31221b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"daniel brennan": {
		tailleCm: 190,
		poidsKg: 124,
		peau: "#d6a28d",
		cheveux: "#3a2c26",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"daniel efan": {
		peau: "#977271",
		cheveux: "#2e241f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"daniel hooper": {
		peau: "#b07a65",
		cheveux: "#37261c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"daniel kasende": {
		peau: "#ae7752",
		cheveux: "#242224",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"daniel lienert brown": {
		peau: "#bd8060",
		cheveux: "#2e211b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"daniel maiava": {
		peau: "#ac8468",
		cheveux: "#1d1916",
		yeux: "#657452",
		coiffure: "curly",
		barbe: "none"
	},
	"daniel perez": {
		peau: "#cb987f",
		cheveux: "#2e2826",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"daniel rona": {
		peau: "#92583e",
		cheveux: "#13100b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"daniel sinkinson": {
		peau: "#ad715c",
		cheveux: "#150e0a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"daniel viljoen jooste": {
		peau: "#dc927f",
		cheveux: "#755748",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"daniel waite": {
		peau: "#dda5a3",
		cheveux: "#382c31",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"danilo fischetti": {
		tailleCm: 176,
		poidsKg: 109,
		peau: "#aa675c",
		cheveux: "#0e0c0b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"danny eite": {
		tailleCm: 193,
		poidsKg: 99,
		peau: "#8d5d4c",
		cheveux: "#3e2316",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"danny sheahan": {
		tailleCm: 185,
		poidsKg: 96,
		peau: "#d27f67",
		cheveux: "#512a24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"danny southworth": {
		tailleCm: 178,
		poidsKg: 114,
		peau: "#bc8384",
		cheveux: "#4d3b3c",
		yeux: "#587383",
		coiffure: "short",
		barbe: "short_beard"
	},
	"danny toala": {
		tailleCm: 177,
		poidsKg: 89,
		peau: "#c49160",
		cheveux: "#261f1c",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"dany priso mouangue": {
		peau: "#764b3f",
		cheveux: "#32241e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"darcy breen": {
		peau: "#c8907f",
		cheveux: "#523a2a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"darge rory": {
		peau: "#c8977d",
		cheveux: "#352c2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"darius thomas": {
		peau: "#e1a68f",
		cheveux: "#2f2723",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"darragh mcsweeney": {
		peau: "#d28679",
		cheveux: "#50281f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"darragh murray": {
		tailleCm: 202,
		poidsKg: 108,
		peau: "#cf8979",
		cheveux: "#2d2521",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"darwin lewis osian": {
		peau: "#b88783",
		cheveux: "#2c292e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"dave heffernan": {
		tailleCm: 188,
		poidsKg: 106,
		peau: "#d19173",
		cheveux: "#2e2b26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"dave mccann": {
		peau: "#c28a76",
		cheveux: "#3b261a",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"dave shanahan": {
		peau: "#d49c8b",
		cheveux: "#7d6144",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"david ainuu": {
		peau: "#cf9378",
		cheveux: "#191516",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"david bulbring": {
		peau: "#e2b1ac",
		cheveux: "#564541",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"david cherry": {
		peau: "#c88271",
		cheveux: "#595b9a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"david delarue": {
		tailleCm: 193,
		poidsKg: 79,
		peau: "#9b827a",
		cheveux: "#1f2020",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"david feliuai": {
		peau: "#ab7155",
		cheveux: "#23261f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"david geneste": {
		tailleCm: 189,
		poidsKg: 103,
		peau: "#9c5a36",
		cheveux: "#181511",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"david george ribbans": {
		peau: "#d7978a",
		cheveux: "#503b2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"david havili": {
		peau: "#c98f72",
		cheveux: "#2c231d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"david hawkshaw": {
		peau: "#c98678",
		cheveux: "#482c1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"david kriel": {
		tailleCm: 197,
		poidsKg: 94,
		peau: "#a4715f",
		cheveux: "#3a291e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"david lolohea": {
		tailleCm: 196,
		poidsKg: 127,
		peau: "#a86032",
		cheveux: "#121311",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"david oconnor": {
		peau: "#db9e88",
		cheveux: "#261c13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"david opoku fordjour": {
		peau: "#715749",
		cheveux: "#18191a",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"david patrick jackson": {
		peau: "#c37e62",
		cheveux: "#4b2f1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"david van zeeland": {
		peau: "#d8a9a2",
		cheveux: "#6d5144",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"davide odiase": {
		peau: "#815b4d",
		cheveux: "#2f2f2e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"davide ruggeri": {
		tailleCm: 186,
		poidsKg: 100,
		peau: "#9e7369",
		cheveux: "#313535",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"davids bradley": {
		peau: "#8a594f",
		cheveux: "#1f1e1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"davies aled": {
		peau: "#c89b9a",
		cheveux: "#484349",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"davies gareth": {
		peau: "#c59587",
		cheveux: "#362c29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"davies ieuan": {
		peau: "#bf8b76",
		cheveux: "#150f0b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"davies jac": {
		peau: "#a87972",
		cheveux: "#342323",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"davies king will": {
		peau: "#ad7b7a",
		cheveux: "#4a3d37",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"davies luke": {
		peau: "#ae7a68",
		cheveux: "#303035",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"davies rhys": {
		peau: "#9d715e",
		cheveux: "#322b2d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"davies seb": {
		peau: "#cd9887",
		cheveux: "#453730",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"davies tristan": {
		peau: "#ac7b74",
		cheveux: "#401c23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"davis dan": {
		peau: "#a06f5e",
		cheveux: "#361c20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"davison trevor": {
		peau: "#c08184",
		cheveux: "#593327",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"davit lagvilava": {
		tailleCm: 196,
		peau: "#b27e7d",
		cheveux: "#281f1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"davit mtchedlidze": {
		tailleCm: 189,
		poidsKg: 113,
		peau: "#cb8567",
		cheveux: "#372419",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"davit niniashvili": {
		tailleCm: 185,
		poidsKg: 85,
		peau: "#deae9a",
		cheveux: "#462c24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"daviti barbakadze": {
		peau: "#d59275",
		cheveux: "#463629",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dawid kellerman": {
		peau: "#cfa394",
		cheveux: "#50403b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"dawson cameron": {
		peau: "#c98c84",
		cheveux: "#5d3e31",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"dayimani hacjivah": {
		peau: "#8d4833",
		cheveux: "#44352d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"daymon leasuasu": {
		peau: "#9d7c64",
		cheveux: "#262420",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"de beer tinus": {
		peau: "#deaa95",
		cheveux: "#a47e6d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"de buitlear eoin": {
		peau: "#cc9083",
		cheveux: "#242821",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"de klerk sebastian": {
		peau: "#9c644f",
		cheveux: "#3f2a21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"de la rua lucas": {
		peau: "#9b736c",
		cheveux: "#2f2628",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"de villiers paul": {
		peau: "#bc8068",
		cheveux: "#23201c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"de wet paul": {
		peau: "#a77260",
		cheveux: "#4d382b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"deaves harri": {
		peau: "#b2826e",
		cheveux: "#5b4336",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"declan james minto": {
		peau: "#c37c75",
		cheveux: "#29150f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"declan meredith": {
		peau: "#bb8771",
		cheveux: "#2c2e34",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"dee elliot": {
		peau: "#ca917d",
		cheveux: "#5c4538",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"deegan jack": {
		peau: "#bf8e7d",
		cheveux: "#4c453f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"deegan max": {
		peau: "#bb866f",
		cheveux: "#17283f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"deeny brian": {
		peau: "#b67e6a",
		cheveux: "#30281b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"demba bamba": {
		tailleCm: 188,
		poidsKg: 117,
		peau: "#683c32",
		cheveux: "#251616",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"dempsey jack": {
		peau: "#c39273",
		cheveux: "#433225",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"denis buckley": {
		peau: "#d19b8c",
		cheveux: "#263932",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"denis marchois": {
		tailleCm: 198,
		poidsKg: 104,
		peau: "#d0937c",
		cheveux: "#3f312d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"deon fourie": {
		peau: "#c3886f",
		cheveux: "#304043",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"deon slabbert": {
		peau: "#b57d6c",
		cheveux: "#342b23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"destiny aminu": {
		tailleCm: 187,
		poidsKg: 110,
		peau: "#5d3f34",
		cheveux: "#2f1c12",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"devan flanders": {
		peau: "#be7d63",
		cheveux: "#3e3229",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"devine john": {
		peau: "#d0897a",
		cheveux: "#232019",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"devine matthew": {
		peau: "#ae7c6a",
		cheveux: "#161a17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"devon williams": {
		peau: "#aa7359",
		cheveux: "#201a16",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"dewaldt duvenage": {
		peau: "#bf8564",
		cheveux: "#30261a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"dewi lake": {
		tailleCm: 186,
		poidsKg: 105,
		peau: "#a7605e",
		cheveux: "#341a13",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"di bartolomeo tommaso": {
		peau: "#b68576",
		cheveux: "#303238",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"dian bleuler": {
		tailleCm: 188,
		poidsKg: 113,
		peau: "#9c5550",
		cheveux: "#1e1210",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "full_beard"
	},
	"diarmuid barron": {
		tailleCm: 182,
		poidsKg: 99,
		peau: "#ca8777",
		cheveux: "#5c2926",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"diarmuid kilgallen": {
		tailleCm: 189,
		poidsKg: 90,
		peau: "#c17b66",
		cheveux: "#6d2222",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"diarmuid mangan": {
		peau: "#ac7965",
		cheveux: "#2a2935",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"dick wilson": {
		peau: "#c8977c",
		cheveux: "#202226",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"didier tison": {
		tailleCm: 180,
		poidsKg: 94,
		peau: "#ca8d72",
		cheveux: "#715440",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"diego appollis": {
		peau: "#93604b",
		cheveux: "#24201a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"diego escobar": {
		tailleCm: 175,
		poidsKg: 91,
		peau: "#e6b194",
		cheveux: "#533e2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"diego jurd": {
		tailleCm: 189,
		poidsKg: 82,
		peau: "#eabeae",
		cheveux: "#875439",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"diego miranda": {
		tailleCm: 188,
		poidsKg: 78,
		peau: "#cf9072",
		cheveux: "#262313",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"dillon lewis": {
		tailleCm: 180,
		poidsKg: 113,
		peau: "#dfa593",
		cheveux: "#3c2d28",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"dillyn leyds": {
		tailleCm: 184,
		poidsKg: 82,
		peau: "#e2a284",
		cheveux: "#3d2c24",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"dimitri delibes": {
		tailleCm: 192,
		poidsKg: 93,
		peau: "#bc7f67",
		cheveux: "#1c1415",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dingwall fraser": {
		peau: "#c69089",
		cheveux: "#36251d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"diogo joel de almeida hasse ferreira": {
		peau: "#b16d47",
		cheveux: "#3a200e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"divad palu": {
		peau: "#b97c54",
		cheveux: "#171814",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"divan fuller": {
		peau: "#c5907b",
		cheveux: "#3c362b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dixon ben jason": {
		peau: "#c78762",
		cheveux: "#28291d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dj kashima": {
		peau: "#bc8264",
		cheveux: "#241e1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"djibril mahamadou gabriel sissako": {
		peau: "#423536",
		cheveux: "#090808",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"dlamini cebo": {
		peau: "#935f47",
		cheveux: "#433027",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"doak nathan": {
		peau: "#dda395",
		cheveux: "#602f19",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"dobie jamie": {
		peau: "#bd8f6b",
		cheveux: "#412b1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"doga maeda": {
		peau: "#c09782",
		cheveux: "#16120f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"dom hanson": {
		peau: "#a9785d",
		cheveux: "#1c2126",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"domachowski corey": {
		peau: "#be8d88",
		cheveux: "#4e464a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"dominguez thomas": {
		peau: "#d29c87",
		cheveux: "#876f5e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"dominic gardiner": {
		peau: "#ae7752",
		cheveux: "#3a2c1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"donnell ben": {
		peau: "#ae7d7e",
		cheveux: "#211e2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"donnelly mark": {
		peau: "#d2806c",
		cheveux: "#871a1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"donovan taofifenua": {
		tailleCm: 182,
		poidsKg: 76,
		peau: "#be8d79",
		cheveux: "#070707",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"dooley peter": {
		peau: "#c78a80",
		cheveux: "#28231f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dorian aldegheri": {
		tailleCm: 185,
		poidsKg: 111,
		peau: "#d59b86",
		cheveux: "#271d21",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"dorian bellot": {
		tailleCm: 169,
		poidsKg: 68,
		peau: "#b7866c",
		cheveux: "#2d2322",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"dorian diabou njeptchui": {
		peau: "#a46742",
		cheveux: "#1a1513",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"dorian laborde": {
		tailleCm: 182,
		poidsKg: 99,
		peau: "#de9f8d",
		cheveux: "#533d30",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dorian marco pena": {
		tailleCm: 172,
		poidsKg: 91,
		peau: "#b27b6e",
		cheveux: "#201e20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"doris caelan": {
		peau: "#996557",
		cheveux: "#143776",
		yeux: "#587383",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"doug philipson": {
		peau: "#c98d6b",
		cheveux: "#2e261d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"douglas levi": {
		peau: "#956756",
		cheveux: "#524343",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"douglas max": {
		peau: "#a47a74",
		cheveux: "#472727",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"dowling oisin": {
		peau: "#a27262",
		cheveux: "#14231d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"drago filippo": {
		peau: "#a86f5c",
		cheveux: "#3c2b23",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"dre pakeho": {
		peau: "#ab7469",
		cheveux: "#191818",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"drew wild": {
		peau: "#bd7c62",
		cheveux: "#7f583d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"dreyer ruan": {
		peau: "#ac7862",
		cheveux: "#362c21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"du plessis dan": {
		peau: "#c89476",
		cheveux: "#584430",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"du plessis jean luc": {
		peau: "#ad7a5e",
		cheveux: "#3e352b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"du plessis kirifi": {
		peau: "#c37c5d",
		cheveux: "#2a241f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"duacake vulainabuwaha": {
		peau: "#643c1e",
		cheveux: "#030e0c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"duggan jordan": {
		peau: "#cc8173",
		cheveux: "#4b382a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"duncan macenzzie": {
		peau: "#bc7d57",
		cheveux: "#403831",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"duncan munn": {
		tailleCm: 190,
		poidsKg: 85,
		peau: "#d9a38a",
		cheveux: "#815e40",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"duncan paiaaua": {
		peau: "#d5987a",
		cheveux: "#211b18",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"duncan weir": {
		peau: "#be836e",
		cheveux: "#432e27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"duran ryan koevort": {
		peau: "#bf7f58",
		cheveux: "#110e0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"duvenage dewaldt": {
		peau: "#bf8564",
		cheveux: "#30261a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"dyantyi aphiwe": {
		peau: "#643b2a",
		cheveux: "#241c16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"dyer rio": {
		peau: "#a4614c",
		cheveux: "#1e1511",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dyer thomas": {
		peau: "#ca9590",
		cheveux: "#503c35",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"dylan cazemajou": {
		tailleCm: 180,
		poidsKg: 76,
		peau: "#ab745c",
		cheveux: "#211916",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dylan cretin": {
		tailleCm: 194,
		poidsKg: 99,
		peau: "#c88a62",
		cheveux: "#43332b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dylan hicks": {
		peau: "#d28778",
		cheveux: "#150e09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dylan hodkinson": {
		peau: "#d1a594",
		cheveux: "#16171b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"dylan idrissi": {
		tailleCm: 187,
		poidsKg: 81,
		peau: "#c38d87",
		cheveux: "#392c26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"dylan jaminet": {
		tailleCm: 185,
		poidsKg: 72,
		peau: "#ab7655",
		cheveux: "#291f17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"dylan kelleher griffiths": {
		tailleCm: 177,
		poidsKg: 105,
		peau: "#ca9883",
		cheveux: "#473329",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"dylan maart": {
		peau: "#7d5d46",
		cheveux: "#3e3731",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"dylan nel": {
		peau: "#cc8264",
		cheveux: "#382415",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"dylan pietsch": {
		peau: "#d79175",
		cheveux: "#84634e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"dylan pledger": {
		peau: "#cb8e64",
		cheveux: "#312621",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"dylan riley": {
		peau: "#c69990",
		cheveux: "#362f30",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"dylan tierney martin": {
		tailleCm: 187,
		poidsKg: 96,
		peau: "#b37a72",
		cheveux: "#1f2924",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"eamon doyle": {
		peau: "#ce9185",
		cheveux: "#31241e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"eben etzebeth": {
		peau: "#ba8579",
		cheveux: "#1d140f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"ebenezer tshimanga": {
		tailleCm: 187,
		poidsKg: 98,
		peau: "#8a5836",
		cheveux: "#1c1815",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ed holmes": {
		peau: "#ca9490",
		cheveux: "#6f5550",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"ed prowse": {
		tailleCm: 195,
		poidsKg: 118,
		peau: "#c08c86",
		cheveux: "#352218",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"eddie james": {
		tailleCm: 197,
		poidsKg: 92,
		peau: "#c18f82",
		cheveux: "#402729",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"eddie swart": {
		peau: "#7b584e",
		cheveux: "#383030",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"edgar retiere": {
		tailleCm: 175,
		poidsKg: 78,
		peau: "#d4967e",
		cheveux: "#37251d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"ediz karsak": {
		peau: "#ae7752",
		cheveux: "#110b09",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"edoardo iachizzi": {
		tailleCm: 193,
		poidsKg: 106,
		peau: "#c1745f",
		cheveux: "#0f0b0a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"edoardo todaro": {
		tailleCm: 181,
		poidsKg: 82,
		peau: "#bf9182",
		cheveux: "#1d1314",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"edogbo edwin": {
		peau: "#965e4b",
		cheveux: "#3b2f27",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"edogbo sean": {
		peau: "#54342b",
		cheveux: "#110f0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"edouard jabea njocke": {
		peau: "#64382f",
		cheveux: "#1b100e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"edouard richer": {
		peau: "#cf8b7e",
		cheveux: "#4f2f23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"edward annandale": {
		peau: "#884e30",
		cheveux: "#2f1d11",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"edward condon": {
		peau: "#b77f69",
		cheveux: "#2a2018",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"edward dratai sawailau": {
		peau: "#9b7b5c",
		cheveux: "#1a1a18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"edward quirk": {
		peau: "#d6a395",
		cheveux: "#886454",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"edward sigauke": {
		tailleCm: 174,
		poidsKg: 72,
		peau: "#945851",
		cheveux: "#252d2d",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "none"
	},
	"edwards dan": {
		peau: "#ae877a",
		cheveux: "#3f2d24",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"edwards giraud josiah": {
		peau: "#552b25",
		cheveux: "#1d1211",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"edwards lewis": {
		peau: "#b0807b",
		cheveux: "#6b513d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"edwards liam": {
		peau: "#b58b7d",
		cheveux: "#3a2f28",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"edwill van der merwe": {
		peau: "#c1806a",
		cheveux: "#56413d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"edwin edogbo": {
		tailleCm: 197,
		poidsKg: 118,
		peau: "#965e4b",
		cheveux: "#3b2f27",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"efan daniel": {
		tailleCm: 185,
		poidsKg: 98,
		peau: "#977271",
		cheveux: "#2e241f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"efitusi tupola maafu": {
		peau: "#b1734e",
		cheveux: "#1d1916",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"efrain elias": {
		tailleCm: 205,
		poidsKg: 109,
		peau: "#d7a495",
		cheveux: "#252023",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ehren painter": {
		tailleCm: 197,
		poidsKg: 134,
		peau: "#c1867c",
		cheveux: "#372923",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"eigi fushimi": {
		peau: "#ba835e",
		cheveux: "#1e1b15",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"eishin kuwano": {
		peau: "#b98a6f",
		cheveux: "#181715",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"eite danny": {
		peau: "#8d5d4c",
		cheveux: "#3e2316",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"eito maki": {
		peau: "#c59879",
		cheveux: "#26221f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"eito tsutsumi": {
		peau: "#dca395",
		cheveux: "#31262b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"eiya miyazaki": {
		peau: "#daae98",
		cheveux: "#2e2f36",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ekain imaz agirre": {
		peau: "#e2b095",
		cheveux: "#54392a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"eli eglaine": {
		tailleCm: 187,
		poidsKg: 119,
		peau: "#c6a38e",
		cheveux: "#1d3c31",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"eli langi": {
		peau: "#bf8668",
		cheveux: "#21252d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"eli snyman": {
		peau: "#a1725b",
		cheveux: "#362e20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"elia canakaivata": {
		tailleCm: 183,
		poidsKg: 93,
		peau: "#ac725b",
		cheveux: "#1a1816",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"elias coulibaly": {
		tailleCm: 178,
		poidsKg: 101,
		peau: "#9a664d",
		cheveux: "#3b2a20",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"elias el ansari": {
		peau: "#c58569",
		cheveux: "#211d1d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"elias jack goodhue": {
		peau: "#d38476",
		cheveux: "#4f2e20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"elias ryan": {
		peau: "#a06e66",
		cheveux: "#74222c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"elijah evans": {
		tailleCm: 192,
		poidsKg: 83,
		peau: "#b5847b",
		cheveux: "#26242d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"elijah uitime": {
		peau: "#be8261",
		cheveux: "#5f4c3b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"eliot salt": {
		tailleCm: 185,
		poidsKg: 113,
		peau: "#a26555",
		cheveux: "#2a1811",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"eliott maurel": {
		tailleCm: 188,
		poidsKg: 104,
		peau: "#d0907f",
		cheveux: "#6d4b3d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"eliott roudil": {
		tailleCm: 189,
		poidsKg: 92,
		peau: "#a6644a",
		cheveux: "#241a11",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"eliott yemsi": {
		tailleCm: 181,
		poidsKg: 114,
		peau: "#af826d",
		cheveux: "#2b2320",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"elis price": {
		tailleCm: 194,
		poidsKg: 80,
		peau: "#ae796f",
		cheveux: "#5d3a39",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"ellande sanderson": {
		tailleCm: 204,
		poidsKg: 115,
		peau: "#dca48d",
		cheveux: "#3f2c22",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"elliot daly": {
		tailleCm: 189,
		poidsKg: 90,
		peau: "#6a3e33",
		cheveux: "#1d1511",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"elliot dee": {
		tailleCm: 187,
		poidsKg: 98,
		peau: "#ca917d",
		cheveux: "#5c4538",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"elliott stooke": {
		peau: "#ca9d87",
		cheveux: "#453f3a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ellis bevan": {
		tailleCm: 180,
		poidsKg: 87,
		peau: "#a3736f",
		cheveux: "#1f1f28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ellis genge": {
		tailleCm: 187,
		poidsKg: 105,
		peau: "#bc816c",
		cheveux: "#2a211c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ellis mee": {
		tailleCm: 193,
		poidsKg: 84,
		peau: "#bf8e85",
		cheveux: "#5f2a2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"eloi nottet": {
		peau: "#d49473",
		cheveux: "#584435",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"elrigh louw": {
		peau: "#b67f72",
		cheveux: "#2c231d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"else juann": {
		peau: "#9e665a",
		cheveux: "#362518",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"elyjah ibsaiene": {
		tailleCm: 184,
		poidsKg: 98,
		peau: "#785141",
		cheveux: "#16110f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"emanuel ioan": {
		peau: "#d49889",
		cheveux: "#3f2e25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"emanuel steff": {
		peau: "#b48483",
		cheveux: "#3f3c3d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"embrose papier": {
		peau: "#744c38",
		cheveux: "#171513",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"emeka ilione": {
		tailleCm: 184,
		poidsKg: 106,
		peau: "#3d211c",
		cheveux: "#1a0f0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"emerick setiano": {
		tailleCm: 186,
		poidsKg: 103,
		peau: "#b86d5b",
		cheveux: "#532818",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"emile van heerden": {
		peau: "#b57f72",
		cheveux: "#262522",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"emilien gailleton": {
		tailleCm: 190,
		poidsKg: 79,
		peau: "#965541",
		cheveux: "#5d3c29",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"emmanuel iyogun": {
		peau: "#6c362d",
		cheveux: "#110d0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"emmanuel meafou": {
		tailleCm: 206,
		poidsKg: 133,
		peau: "#c1816e",
		cheveux: "#271b17",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"emmett calvey": {
		peau: "#d18073",
		cheveux: "#422417",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"emoni narawa": {
		peau: "#b67453",
		cheveux: "#33251f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"emosi tumania": {
		peau: "#7c4031",
		cheveux: "#39190e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"emosi tuqiri": {
		peau: "#ad7b61",
		cheveux: "#211f1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"eneriko buliruarua": {
		peau: "#7b4e46",
		cheveux: "#111015",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"englefield caolan": {
		peau: "#9f6662",
		cheveux: "#441e10",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"enoal joguet": {
		peau: "#bf866f",
		cheveux: "#553a22",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"enoch opoku gyamfi": {
		tailleCm: 195,
		poidsKg: 134,
		peau: "#422a22",
		cheveux: "#060606",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"enrico lucchin": {
		peau: "#cc957e",
		cheveux: "#3d3f3e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"enrique pieretto": {
		peau: "#caa49d",
		cheveux: "#423b38",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"enrique pieretto heiland": {
		tailleCm: 184,
		poidsKg: 116,
		peau: "#ae7752",
		cheveux: "#40362e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"enslin wilfred claasen": {
		peau: "#93603d",
		cheveux: "#0e0b08",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"enzo benmegal": {
		tailleCm: 180,
		poidsKg: 73,
		peau: "#ba7153",
		cheveux: "#2f2619",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"enzo forletta": {
		tailleCm: 179,
		poidsKg: 113,
		peau: "#bc9a91",
		cheveux: "#0f0d0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"enzo herve": {
		tailleCm: 172,
		poidsKg: 89,
		peau: "#d3845f",
		cheveux: "#332019",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"enzo labadie": {
		tailleCm: 190,
		poidsKg: 91,
		peau: "#c6906c",
		cheveux: "#4e3a2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"enzo marzocca": {
		tailleCm: 181,
		poidsKg: 74,
		peau: "#b08374",
		cheveux: "#3f2924",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"enzo morand bruyat": {
		tailleCm: 188,
		poidsKg: 92,
		peau: "#b57b65",
		cheveux: "#483629",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"enzo reybier": {
		tailleCm: 176,
		poidsKg: 67,
		peau: "#ae7e45",
		cheveux: "#271c10",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"enzo salles": {
		tailleCm: 187,
		poidsKg: 88,
		peau: "#be7a66",
		cheveux: "#2f1d18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"enzo selponi": {
		peau: "#e19884",
		cheveux: "#61493b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"enzo serieyssol": {
		peau: "#c68e76",
		cheveux: "#3a2c24",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"eoghan barrett": {
		tailleCm: 185,
		poidsKg: 76,
		peau: "#b98a6f",
		cheveux: "#2f2721",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"eoghan clarke": {
		tailleCm: 186,
		poidsKg: 106,
		peau: "#ad735f",
		cheveux: "#1a100e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"eoghan gerard masterson": {
		peau: "#aa7663",
		cheveux: "#31241d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"eoghan smyth": {
		tailleCm: 187,
		poidsKg: 91,
		peau: "#d38b7b",
		cheveux: "#533627",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"eoin de buitlear": {
		tailleCm: 174,
		poidsKg: 92,
		peau: "#cc9083",
		cheveux: "#242821",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"epeli momo": {
		peau: "#9d6f58",
		cheveux: "#1c1817",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"epineri uluiviti": {
		peau: "#8f5a42",
		cheveux: "#1e1c19",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"erasmus owen": {
		peau: "#b68871",
		cheveux: "#3f3029",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ereatara enari": {
		peau: "#c28058",
		cheveux: "#7f5e4e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"eric escande": {
		tailleCm: 168,
		poidsKg: 74,
		peau: "#d6a089",
		cheveux: "#6f5c4b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"eric marks": {
		tailleCm: 191,
		poidsKg: 105,
		peau: "#be7058",
		cheveux: "#3b2718",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"eric osullivan": {
		peau: "#ce9484",
		cheveux: "#3a2b1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ericson josh": {
		peau: "#ac6e56",
		cheveux: "#082558",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ernst van rhyn": {
		tailleCm: 193,
		poidsKg: 107,
		peau: "#cb9682",
		cheveux: "#2f2e3b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"esei haangana": {
		peau: "#a8725a",
		cheveux: "#232221",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"essendon tuitupou": {
		peau: "#8a574d",
		cheveux: "#28201e",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "moustache"
	},
	"esteban abadie": {
		tailleCm: 185,
		poidsKg: 92,
		peau: "#ca866e",
		cheveux: "#2f2322",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"esteban capilla": {
		tailleCm: 202,
		poidsKg: 90,
		peau: "#cc7e70",
		cheveux: "#28180b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"esteban chouteau": {
		tailleCm: 165,
		poidsKg: 90,
		peau: "#b18273",
		cheveux: "#1c1c1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"esteban gonzalez": {
		tailleCm: 182,
		poidsKg: 75,
		peau: "#c07b5e",
		cheveux: "#4e3322",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"esterhuizen andre": {
		peau: "#c69389",
		cheveux: "#504242",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"etene nanai seturo": {
		tailleCm: 182,
		poidsKg: 83,
		peau: "#89533b",
		cheveux: "#0f0e0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ethan bester": {
		peau: "#b9826a",
		cheveux: "#342e28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ethan blackadder": {
		peau: "#c38975",
		cheveux: "#4f3824",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ethan burger": {
		tailleCm: 192,
		poidsKg: 127,
		peau: "#c57967",
		cheveux: "#341f15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ethan caine": {
		tailleCm: 183,
		poidsKg: 95,
		peau: "#b18672",
		cheveux: "#46343a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"ethan clarke": {
		tailleCm: 178,
		poidsKg: 105,
		peau: "#ae6d5c",
		cheveux: "#381a0c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"ethan coughlan": {
		tailleCm: 180,
		poidsKg: 71,
		peau: "#d29482",
		cheveux: "#992527",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ethan de groot": {
		peau: "#b2827a",
		cheveux: "#3b2c36",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ethan dobbins": {
		peau: "#c38578",
		cheveux: "#1c1311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ethan dumortier": {
		tailleCm: 195,
		poidsKg: 83,
		peau: "#c57d5b",
		cheveux: "#36271d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ethan grayson": {
		tailleCm: 195,
		poidsKg: 92,
		peau: "#b78781",
		cheveux: "#382721",
		yeux: "#624633",
		coiffure: "long",
		barbe: "full_beard"
	},
	"ethan hooker": {
		peau: "#b68889",
		cheveux: "#4e3930",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ethan lewis": {
		tailleCm: 184,
		poidsKg: 101,
		peau: "#b8877c",
		cheveux: "#343038",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"ethan mcilroy": {
		peau: "#c0816f",
		cheveux: "#362215",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ethan roots": {
		tailleCm: 187,
		poidsKg: 104,
		peau: "#a05f47",
		cheveux: "#2b221e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ethan staddon": {
		tailleCm: 192,
		poidsKg: 105,
		peau: "#bf866d",
		cheveux: "#5a432b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ethan tia": {
		peau: "#c58f77",
		cheveux: "#3b2c29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"etienne falgoux": {
		tailleCm: 187,
		poidsKg: 106,
		peau: "#c38d71",
		cheveux: "#352b25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"etienne fourcade": {
		tailleCm: 185,
		poidsKg: 95,
		peau: "#bc877a",
		cheveux: "#3c332c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"etienne loiret": {
		tailleCm: 199,
		poidsKg: 101,
		peau: "#874822",
		cheveux: "#080d0c",
		yeux: "#657452",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"etonia durugalo bainivalu": {
		peau: "#a6633d",
		cheveux: "#1b150e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"etonia waqa": {
		tailleCm: 200,
		poidsKg: 98,
		peau: "#a37c62",
		cheveux: "#1f1e1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"etuale manusamoa tuilagi": {
		peau: "#af604e",
		cheveux: "#15100c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"etzebeth eben": {
		peau: "#9e6963",
		cheveux: "#1d140f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"euan ferrie": {
		tailleCm: 194,
		poidsKg: 98,
		peau: "#c28c75",
		cheveux: "#664f3a",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "none"
	},
	"eugene guaini": {
		peau: "#cc9880",
		cheveux: "#262525",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"evan hill": {
		peau: "#a37e7c",
		cheveux: "#3e322e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"evan lloyd": {
		tailleCm: 189,
		poidsKg: 106,
		peau: "#9b6c6f",
		cheveux: "#302830",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"evan minto": {
		tailleCm: 185,
		poidsKg: 93,
		peau: "#cd9a8b",
		cheveux: "#5b4435",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"evan oconnell": {
		peau: "#cd8d7b",
		cheveux: "#692e25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"evan olmstead": {
		tailleCm: 194,
		poidsKg: 110,
		peau: "#a77f6f",
		cheveux: "#5c4e46",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"evan roos": {
		peau: "#c08871",
		cheveux: "#6b4d32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"evans cai": {
		peau: "#d59e8a",
		cheveux: "#966a56",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"evans connor": {
		peau: "#b8805e",
		cheveux: "#47311e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"evans elijah": {
		peau: "#b5847b",
		cheveux: "#26242d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"evans gwilym": {
		peau: "#a67464",
		cheveux: "#332926",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"evans keanu": {
		peau: "#be8578",
		cheveux: "#5b2c30",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"evardi boshoff": {
		tailleCm: 179,
		poidsKg: 87,
		peau: "#a97b68",
		cheveux: "#513e36",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"everson ceano": {
		peau: "#795234",
		cheveux: "#1a1b1a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ewan johnson": {
		tailleCm: 205,
		poidsKg: 111,
		peau: "#d2827a",
		cheveux: "#140c08",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"ewan richards": {
		tailleCm: 195,
		poidsKg: 104,
		peau: "#b97c68",
		cheveux: "#0f0906",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ewan rosser": {
		peau: "#b87c6c",
		cheveux: "#30251d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ezra paulo": {
		peau: "#a46252",
		cheveux: "#2c2825",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"faalae faletoi peni": {
		peau: "#bc6d58",
		cheveux: "#372922",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"fabian holland": {
		peau: "#bc8c82",
		cheveux: "#3f3235",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"fabien brau boirie": {
		tailleCm: 185,
		poidsKg: 91,
		peau: "#c37d6a",
		cheveux: "#291911",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"fabien sanconnie": {
		tailleCm: 199,
		poidsKg: 102,
		peau: "#d38877",
		cheveux: "#2d1a14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"fabio gonzalez": {
		tailleCm: 181,
		poidsKg: 111,
		peau: "#c68e6c",
		cheveux: "#433227",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"fabrice metz": {
		tailleCm: 203,
		poidsKg: 120,
		peau: "#d27e67",
		cheveux: "#120d0c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"facundo bosch": {
		tailleCm: 180,
		poidsKg: 91,
		peau: "#cd8879",
		cheveux: "#3f241c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"facundo isa": {
		tailleCm: 183,
		poidsKg: 102,
		peau: "#ad644c",
		cheveux: "#31271c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"facundo pomponio": {
		tailleCm: 190,
		poidsKg: 112,
		peau: "#b5786a",
		cheveux: "#292623",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"faf de klerk": {
		peau: "#cd926f",
		cheveux: "#5f4d2e",
		yeux: "#657452",
		coiffure: "short",
		barbe: "moustache"
	},
	"fagerson matt": {
		peau: "#c48e73",
		cheveux: "#4e3725",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"fagerson zander": {
		peau: "#c08d74",
		cheveux: "#302821",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"fahy connor": {
		peau: "#c58873",
		cheveux: "#412c1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"faissal malik": {
		peau: "#99654f",
		cheveux: "#222c2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"fakataha havili": {
		peau: "#c5825d",
		cheveux: "#3c332c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"faletau taulupe": {
		peau: "#96695d",
		cheveux: "#21202b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"farai tapuwa mudariki": {
		peau: "#b66642",
		cheveux: "#4b291c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"farell delourmel": {
		tailleCm: 175,
		poidsKg: 77,
		peau: "#a77559",
		cheveux: "#201714",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"farrell paidi": {
		peau: "#b6836b",
		cheveux: "#1d342e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"farrell tom": {
		peau: "#c27963",
		cheveux: "#462622",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"fasio taalo": {
		peau: "#bc744d",
		cheveux: "#2a1a11",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"fasogbon afolabi": {
		peau: "#422929",
		cheveux: "#1a1011",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"fassi aphelele": {
		peau: "#894d47",
		cheveux: "#2b2321",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"faulua makisi": {
		peau: "#bf8874",
		cheveux: "#292525",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"favretto riccardo": {
		peau: "#a77667",
		cheveux: "#16110d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"fc du plessis": {
		peau: "#d4b2a8",
		cheveux: "#4b413f",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "none"
	},
	"federico ignacio lavanini": {
		peau: "#906655",
		cheveux: "#1c1716",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"federico mori": {
		tailleCm: 193,
		poidsKg: 103,
		peau: "#c26f5d",
		cheveux: "#2f190f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"federico ruzza": {
		tailleCm: 202,
		poidsKg: 100,
		peau: "#c7957c",
		cheveux: "#5b3e29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"federico wegrzyn": {
		tailleCm: 190,
		poidsKg: 112,
		peau: "#ac8978",
		cheveux: "#3c3a37",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"federico zanandrea": {
		tailleCm: 185,
		poidsKg: 93,
		peau: "#bf8b71",
		cheveux: "#1d130d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"fehi fineanganofo": {
		peau: "#ae6e4a",
		cheveux: "#30251d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"feibyan cornell tukino": {
		peau: "#c8795f",
		cheveux: "#302827",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"feinberg mngomezulu sacha": {
		peau: "#90573d",
		cheveux: "#0d0e0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"feinga fakai": {
		peau: "#d89c84",
		cheveux: "#7e594a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"fekitoa malakai": {
		peau: "#84543e",
		cheveux: "#110e0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"felix kalapu": {
		peau: "#d29a73",
		cheveux: "#1b1a17",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"fender james": {
		peau: "#b18672",
		cheveux: "#36261b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"fepulea i marco": {
		peau: "#a4665c",
		cheveux: "#241717",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"fergus lee warner": {
		tailleCm: 197,
		poidsKg: 105,
		peau: "#c8a78c",
		cheveux: "#27221a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"fergus watson": {
		tailleCm: 196,
		poidsKg: 86,
		peau: "#ca9682",
		cheveux: "#493b31",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ferrari giacomo": {
		peau: "#bf8978",
		cheveux: "#3c3632",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ferrari simone": {
		peau: "#a96f5b",
		cheveux: "#7b5641",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"ferrie euan": {
		peau: "#c28c75",
		cheveux: "#664f3a",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "none"
	},
	"fetuli paea": {
		tailleCm: 195,
		poidsKg: 95,
		peau: "#9f6e5b",
		cheveux: "#251e18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"fez mbatha": {
		peau: "#8e6651",
		cheveux: "#302e2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"fiachna barrett": {
		tailleCm: 198,
		poidsKg: 114,
		peau: "#c5846e",
		cheveux: "#312b1b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"filipo daugunu": {
		peau: "#7f5346",
		cheveux: "#181516",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"filippo drago": {
		tailleCm: 183,
		poidsKg: 91,
		peau: "#a86f5c",
		cheveux: "#3c2b23",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"fin baxter": {
		tailleCm: 185,
		poidsKg: 109,
		peau: "#c9846f",
		cheveux: "#653b23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"fin richardson": {
		tailleCm: 186,
		poidsKg: 113,
		peau: "#d19b87",
		cheveux: "#4d494a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"fin smith": {
		tailleCm: 183,
		poidsKg: 82,
		peau: "#ba807a",
		cheveux: "#573225",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"finau makavaha": {
		peau: "#ca8468",
		cheveux: "#2b2421",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"finau tupa": {
		peau: "#c5907d",
		cheveux: "#252425",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"fine inisi": {
		tailleCm: 188,
		poidsKg: 92,
		peau: "#9f7665",
		cheveux: "#2b201b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"fineen wycherley": {
		tailleCm: 194,
		poidsKg: 109,
		peau: "#cc8873",
		cheveux: "#662721",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"finlay bealham": {
		tailleCm: 191,
		poidsKg: 112,
		peau: "#c47552",
		cheveux: "#70371a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"finlay brewis": {
		peau: "#c99f85",
		cheveux: "#3c3026",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"finn carnduff": {
		tailleCm: 196,
		poidsKg: 107,
		peau: "#b57262",
		cheveux: "#432517",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"finn hurley": {
		peau: "#c6906f",
		cheveux: "#6f5137",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"finn keylock": {
		tailleCm: 176,
		poidsKg: 79,
		peau: "#824e40",
		cheveux: "#2c1a13",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"finn mackay": {
		peau: "#cc9697",
		cheveux: "#372821",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"finn russell": {
		tailleCm: 186,
		poidsKg: 83,
		peau: "#bd8e89",
		cheveux: "#322318",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"finn theobald thomas": {
		tailleCm: 183,
		poidsKg: 98,
		peau: "#b06d5b",
		cheveux: "#3e2219",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"finn treacy": {
		tailleCm: 181,
		poidsKg: 85,
		peau: "#d89f8c",
		cheveux: "#223229",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"finn worley brady": {
		tailleCm: 187,
		poidsKg: 99,
		peau: "#c68168",
		cheveux: "#3e1e0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"fintan gunne": {
		peau: "#b1735c",
		cheveux: "#4d3823",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"fionn gibbons": {
		peau: "#cb8977",
		cheveux: "#992321",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"fischetti danilo": {
		peau: "#aa675c",
		cheveux: "#0e0c0b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"fisipuna tuiaki": {
		peau: "#de9482",
		cheveux: "#211d26",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"fiti sa": {
		peau: "#cc805b",
		cheveux: "#3b2d26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"fitz harding": {
		tailleCm: 186,
		poidsKg: 99,
		peau: "#cc8f77",
		cheveux: "#422f25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"fitzpatrick lee": {
		peau: "#c58a77",
		cheveux: "#292216",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"flannery jake": {
		peau: "#cf9183",
		cheveux: "#50372a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"flavio asquini": {
		tailleCm: 175,
		poidsKg: 74,
		peau: "#c48e6b",
		cheveux: "#473326",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"fletcher anderson": {
		tailleCm: 188,
		poidsKg: 102,
		peau: "#835857",
		cheveux: "#52443b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"fletcher newell": {
		peau: "#cd9a87",
		cheveux: "#62442d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"flix lambey": {
		peau: "#cf8066",
		cheveux: "#6e3d1c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"florence tom": {
		peau: "#aa8785",
		cheveux: "#3b393f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"florent guion": {
		tailleCm: 175,
		poidsKg: 98,
		peau: "#ae7752",
		cheveux: "#2c2524",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"florent vanverberghe": {
		tailleCm: 197,
		poidsKg: 112,
		peau: "#d1877d",
		cheveux: "#47312e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"florian goumat": {
		tailleCm: 194,
		poidsKg: 111,
		peau: "#b5807c",
		cheveux: "#393231",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"florian verhaeghe": {
		tailleCm: 202,
		poidsKg: 103,
		peau: "#d0ab9d",
		cheveux: "#4e3831",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"flynn max": {
		peau: "#d3967c",
		cheveux: "#7f5447",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"folau fainga a": {
		peau: "#ae6a50",
		cheveux: "#181616",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"folau fakatava": {
		peau: "#8f6657",
		cheveux: "#1f2536",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"foley cormac": {
		peau: "#bc816e",
		cheveux: "#251e16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"foliga christopher gabriel": {
		peau: "#c77e57",
		cheveux: "#181210",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ford harri": {
		peau: "#c78876",
		cheveux: "#573d2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ford robinson jamal": {
		peau: "#b57a6e",
		cheveux: "#6c3627",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"forde cathal": {
		peau: "#c9857c",
		cheveux: "#312d22",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"fouche neethling": {
		peau: "#c69779",
		cheveux: "#3d2e20",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"fourie deon": {
		peau: "#c3886f",
		cheveux: "#304043",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"fourie tiaan": {
		peau: "#ab7564",
		cheveux: "#30271f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"fousseynou cissokho": {
		tailleCm: 201,
		poidsKg: 110,
		peau: "#6c574b",
		cheveux: "#443b34",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"foxe ronan": {
		peau: "#d17e74",
		cheveux: "#62291f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"foy michael": {
		peau: "#cc846e",
		cheveux: "#451e1f",
		yeux: "#587383",
		coiffure: "curly",
		barbe: "full_beard"
	},
	"franceschetto luca": {
		peau: "#ba887d",
		cheveux: "#343c41",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"francesco gandossi": {
		tailleCm: 177,
		poidsKg: 93,
		peau: "#c08e69",
		cheveux: "#56452c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"francesco ruffolo": {
		tailleCm: 201,
		poidsKg: 111,
		peau: "#92695a",
		cheveux: "#514239",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "none"
	},
	"francis saili": {
		tailleCm: 176,
		poidsKg: 93,
		peau: "#ae8770",
		cheveux: "#363336",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"francisco coria marchetti": {
		tailleCm: 183,
		poidsKg: 118,
		peau: "#ae6546",
		cheveux: "#271f19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"francisco gorrissen": {
		tailleCm: 187,
		poidsKg: 100,
		peau: "#b66950",
		cheveux: "#583825",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"franco carrera": {
		tailleCm: 202,
		poidsKg: 109,
		peau: "#d5a596",
		cheveux: "#384a79",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"franco mostert": {
		peau: "#d4a38b",
		cheveux: "#4e3f39",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"francois cros": {
		tailleCm: 192,
		poidsKg: 101,
		peau: "#da9b87",
		cheveux: "#3b3234",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"francois joly": {
		peau: "#c38e67",
		cheveux: "#372e21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"francois klopper": {
		peau: "#905847",
		cheveux: "#231c19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"francois venter": {
		peau: "#b07d6a",
		cheveux: "#272726",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"frank lochore": {
		peau: "#b9765c",
		cheveux: "#191411",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"frank lomani": {
		peau: "#a16c52",
		cheveux: "#1e1d19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"frankie goldsbrough": {
		peau: "#b98a83",
		cheveux: "#5b453a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"franklin mcmillan": {
		tailleCm: 188,
		poidsKg: 78,
		peau: "#d09586",
		cheveux: "#2a170e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"franois mur": {
		peau: "#e1a890",
		cheveux: "#6e503b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"franois vergnaud": {
		peau: "#b98879",
		cheveux: "#3a302e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"frans malherbe": {
		peau: "#b1735b",
		cheveux: "#1d1a12",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"fraser angus": {
		peau: "#c58d71",
		cheveux: "#57433f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"fraser dingwall": {
		tailleCm: 186,
		poidsKg: 91,
		peau: "#c69089",
		cheveux: "#36251d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"fraser mc reight": {
		peau: "#a17671",
		cheveux: "#392c26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"fraser quirk": {
		peau: "#d7a594",
		cheveux: "#4a3a33",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"fraser rawlins": {
		peau: "#966655",
		cheveux: "#1b1513",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"frawley ciaran": {
		peau: "#b97c6c",
		cheveux: "#673f25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"fred quercy": {
		tailleCm: 192,
		poidsKg: 97,
		peau: "#cda08e",
		cheveux: "#332e2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"fred ryan guillet": {
		peau: "#7d4d33",
		cheveux: "#201e18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"freddie st john": {
		tailleCm: 193,
		poidsKg: 91,
		peau: "#be867b",
		cheveux: "#2b1b11",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"freddie steward": {
		tailleCm: 201,
		poidsKg: 97,
		peau: "#aa6155",
		cheveux: "#1f100b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"freddie thomas": {
		tailleCm: 195,
		poidsKg: 109,
		peau: "#c78c85",
		cheveux: "#331e1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"friedle olivier": {
		peau: "#c28b73",
		cheveux: "#3f3025",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"fritz jahnke tavana": {
		peau: "#936a5a",
		cheveux: "#221f1f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"fugo takada": {
		peau: "#d99f93",
		cheveux: "#2c262d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"fuller divan": {
		peau: "#c5907b",
		cheveux: "#3c362b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"fuma uekata": {
		peau: "#df9a84",
		cheveux: "#282521",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"fumiya dobashi": {
		peau: "#d5a58e",
		cheveux: "#201d1b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"fumiya saito": {
		peau: "#bb7f66",
		cheveux: "#211a16",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"funaki solomone": {
		peau: "#ab765d",
		cheveux: "#201b16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"furlong tadhg": {
		peau: "#996054",
		cheveux: "#2f2823",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"fusco alessandro": {
		peau: "#cd9883",
		cheveux: "#415366",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"futo yamaguchi": {
		peau: "#cca281",
		cheveux: "#1e1a16",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"futoshi mori": {
		peau: "#bc8674",
		cheveux: "#1f1f1d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"gabe hawley": {
		tailleCm: 187,
		poidsKg: 122,
		peau: "#a8796f",
		cheveux: "#543630",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"gabe mcdonald": {
		tailleCm: 192,
		poidsKg: 88,
		peau: "#ab817b",
		cheveux: "#472328",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gabin garault": {
		tailleCm: 191,
		poidsKg: 103,
		peau: "#dc9a7f",
		cheveux: "#3f2821",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"gabin kretchmann": {
		tailleCm: 179,
		poidsKg: 79,
		peau: "#c28e8d",
		cheveux: "#271e1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gabin lacoste": {
		tailleCm: 196,
		poidsKg: 81,
		peau: "#d2996e",
		cheveux: "#422e22",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"gabin lorre": {
		tailleCm: 187,
		poidsKg: 77,
		peau: "#b97d5b",
		cheveux: "#412e25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"gabin rocher": {
		tailleCm: 176,
		poidsKg: 70,
		peau: "#c48d74",
		cheveux: "#573d28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gabin villiere": {
		tailleCm: 185,
		poidsKg: 85,
		peau: "#c6836e",
		cheveux: "#332421",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gabriel atlan": {
		tailleCm: 174,
		poidsKg: 91,
		peau: "#c58172",
		cheveux: "#3c3837",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gabriel bohn": {
		tailleCm: 196,
		poidsKg: 81,
		peau: "#996858",
		cheveux: "#221815",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gabriel caspar": {
		peau: "#96684e",
		cheveux: "#463026",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"gabriel elissalde": {
		tailleCm: 173,
		poidsKg: 62,
		peau: "#ae7963",
		cheveux: "#3b2c23",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"gabriel hamer webb": {
		peau: "#894833",
		cheveux: "#150d0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gabriel ibitoye": {
		tailleCm: 182,
		poidsKg: 92,
		peau: "#705248",
		cheveux: "#272a2b",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"gabriel lapegue lafaye": {
		peau: "#c37970",
		cheveux: "#351b13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gabriel ngandebe": {
		peau: "#583e36",
		cheveux: "#110f0f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"gabriel oghre": {
		tailleCm: 175,
		poidsKg: 91,
		peau: "#b37450",
		cheveux: "#1d1c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gabriel registe": {
		peau: "#63372a",
		cheveux: "#090808",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"gael fickou": {
		tailleCm: 189,
		poidsKg: 92,
		peau: "#bf7159",
		cheveux: "#69392a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"gael galvan monsalve": {
		peau: "#e2a592",
		cheveux: "#302223",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gaku shimizu": {
		peau: "#daa48a",
		cheveux: "#212325",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"gakuto ishida": {
		peau: "#d8a37b",
		cheveux: "#1d1f14",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"gal drean": {
		peau: "#cc8874",
		cheveux: "#171311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gallagher matt": {
		peau: "#bc846d",
		cheveux: "#2b1c15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gallo thomas": {
		peau: "#b4785a",
		cheveux: "#1f1d13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gallorini marcos": {
		peau: "#af7a5e",
		cheveux: "#18110d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"gans stedman": {
		peau: "#75432f",
		cheveux: "#15120f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ganyane phatu": {
		peau: "#764d36",
		cheveux: "#272827",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"garbisi alessandro": {
		peau: "#bc8470",
		cheveux: "#382617",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"garcia gonzalo": {
		peau: "#cb9b85",
		cheveux: "#35302e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"gareth davies": {
		tailleCm: 176,
		poidsKg: 83,
		peau: "#c59587",
		cheveux: "#362c29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gareth milasinovich": {
		tailleCm: 194,
		poidsKg: 128,
		peau: "#c1887a",
		cheveux: "#342d2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gareth thomas": {
		tailleCm: 185,
		poidsKg: 114,
		peau: "#a77a66",
		cheveux: "#342921",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"garry ringrose": {
		peau: "#9e6b59",
		cheveux: "#372c1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gary porter": {
		peau: "#b47c69",
		cheveux: "#252116",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"garyn phillips": {
		tailleCm: 181,
		poidsKg: 114,
		peau: "#af7b6d",
		cheveux: "#5c4438",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gasperini nicholas": {
		peau: "#b98565",
		cheveux: "#432f1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gatan barlot": {
		peau: "#a37665",
		cheveux: "#281f1b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"gatien masse": {
		tailleCm: 181,
		poidsKg: 83,
		peau: "#b37452",
		cheveux: "#2d1d14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gauthier doubrere": {
		tailleCm: 176,
		poidsKg: 73,
		peau: "#d2846d",
		cheveux: "#41312f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gauthier maravat": {
		tailleCm: 198,
		poidsKg: 102,
		peau: "#d3856d",
		cheveux: "#442d27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gavin coombes": {
		tailleCm: 196,
		poidsKg: 110,
		peau: "#d8a082",
		cheveux: "#9f4827",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gavin hugh": {
		peau: "#d0896f",
		cheveux: "#3f543e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"gavin stark": {
		tailleCm: 189,
		poidsKg: 91,
		peau: "#ba926e",
		cheveux: "#32271e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"gela aprasidze": {
		tailleCm: 178,
		poidsKg: 69,
		peau: "#c18f76",
		cheveux: "#2e2726",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"gelant warrick": {
		peau: "#7f4e32",
		cheveux: "#2e1e0e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gemine dan": {
		peau: "#dbaa92",
		cheveux: "#271b18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"gen goto": {
		peau: "#c3977a",
		cheveux: "#271e17",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"gen mori": {
		peau: "#c6927b",
		cheveux: "#24211d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"gene oleary kareem": {
		peau: "#d08d74",
		cheveux: "#281d18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"genge ellis": {
		peau: "#bc816c",
		cheveux: "#2a211c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"genki ikuta": {
		peau: "#daa47c",
		cheveux: "#2f2720",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"genki mizobuchi": {
		peau: "#d7a598",
		cheveux: "#282628",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"genki okoshi": {
		peau: "#bd806f",
		cheveux: "#1c1a1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"genki tokushige": {
		peau: "#cb937c",
		cheveux: "#201d1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"genta nishibata": {
		peau: "#dfb3ac",
		cheveux: "#363436",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "none"
	},
	"gentaro ikenaga": {
		peau: "#ca9179",
		cheveux: "#231f1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"geoffrey cros": {
		tailleCm: 182,
		poidsKg: 80,
		peau: "#c68365",
		cheveux: "#322217",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"geoffrey malaterre": {
		tailleCm: 185,
		poidsKg: 83,
		peau: "#c07e59",
		cheveux: "#271b13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"geoffrey palis": {
		tailleCm: 185,
		poidsKg: 88,
		peau: "#d28879",
		cheveux: "#312524",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"george barton": {
		tailleCm: 177,
		poidsKg: 79,
		peau: "#9d6b5b",
		cheveux: "#3a1f15",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"george bell": {
		peau: "#c6997d",
		cheveux: "#5a432b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"george blake": {
		peau: "#99695f",
		cheveux: "#36221f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"george bower": {
		peau: "#926652",
		cheveux: "#452f1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"george dyer": {
		peau: "#a5614e",
		cheveux: "#281b12",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"george ford": {
		tailleCm: 174,
		poidsKg: 81,
		peau: "#d29d86",
		cheveux: "#352b2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"george furbank": {
		tailleCm: 184,
		poidsKg: 87,
		peau: "#ba7b68",
		cheveux: "#33180b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"george hadden": {
		peau: "#cd8475",
		cheveux: "#633422",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"george hammond": {
		peau: "#d08e8d",
		cheveux: "#4d352a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"george hendy": {
		tailleCm: 193,
		poidsKg: 90,
		peau: "#d9a49b",
		cheveux: "#835641",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"george horne": {
		tailleCm: 171,
		poidsKg: 73,
		peau: "#bd8972",
		cheveux: "#4c392d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"george kloska": {
		tailleCm: 180,
		poidsKg: 110,
		peau: "#bd8276",
		cheveux: "#5a463e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"george moala": {
		tailleCm: 184,
		poidsKg: 95,
		peau: "#ab7a60",
		cheveux: "#2d2622",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"george newman": {
		tailleCm: 177,
		poidsKg: 75,
		peau: "#e18a6d",
		cheveux: "#582c18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"george nott": {
		tailleCm: 195,
		poidsKg: 108,
		peau: "#976968",
		cheveux: "#392f2f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"george poolman": {
		peau: "#c58779",
		cheveux: "#36221a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"george roberts": {
		tailleCm: 186,
		poidsKg: 97,
		peau: "#cb917d",
		cheveux: "#6f5240",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"george smith": {
		peau: "#dd9777",
		cheveux: "#886342",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"george tilsley": {
		tailleCm: 192,
		poidsKg: 95,
		peau: "#7b5640",
		cheveux: "#2f231a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"george timmins": {
		tailleCm: 192,
		poidsKg: 95,
		peau: "#ce9780",
		cheveux: "#34271f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"george whitehead": {
		peau: "#b27f67",
		cheveux: "#4f3c2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"georges henri colombe reazel": {
		peau: "#7e5045",
		cheveux: "#33201f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"georges shvelidze": {
		tailleCm: 179,
		poidsKg: 92,
		peau: "#c98869",
		cheveux: "#342519",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"georgy balakarev": {
		tailleCm: 186,
		poidsKg: 114,
		peau: "#b67d65",
		cheveux: "#3a2921",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"gerard cowley tuioti": {
		peau: "#ac6e50",
		cheveux: "#2c2825",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gerdus vanderwalt": {
		peau: "#e5ab9e",
		cheveux: "#7a6050",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"gerhard steenekamp": {
		peau: "#9b6151",
		cheveux: "#362b20",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"gerhard van den heever": {
		peau: "#d7ada3",
		cheveux: "#56433d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"germain burgaud grimart": {
		peau: "#996c58",
		cheveux: "#2d221b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"germain marie eric roques de borda": {
		peau: "#d6ac9f",
		cheveux: "#38342c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"gernimo prisciantelli": {
		peau: "#9d634c",
		cheveux: "#1b120b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"gerswin mouton": {
		tailleCm: 178,
		poidsKg: 84,
		peau: "#cba87d",
		cheveux: "#20201b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"gesi simone": {
		peau: "#d6a088",
		cheveux: "#463f3c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gia kharaishvili": {
		tailleCm: 176,
		poidsKg: 111,
		peau: "#bc7d63",
		cheveux: "#865943",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"giacomo da re": {
		tailleCm: 176,
		poidsKg: 77,
		peau: "#91665d",
		cheveux: "#333135",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"giacomo ferrari": {
		tailleCm: 188,
		poidsKg: 96,
		peau: "#bf8978",
		cheveux: "#3c3632",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"giacomo milano": {
		tailleCm: 188,
		poidsKg: 105,
		peau: "#ce9983",
		cheveux: "#3c3538",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"giacomo nicotera": {
		tailleCm: 185,
		poidsKg: 100,
		peau: "#d19c86",
		cheveux: "#3f312e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"giampietro ribaldi": {
		tailleCm: 187,
		poidsKg: 103,
		peau: "#b68774",
		cheveux: "#4c3e38",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gianmarco lucchesi": {
		tailleCm: 189,
		poidsKg: 105,
		peau: "#c88771",
		cheveux: "#372720",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gibbons fionn": {
		peau: "#cb8977",
		cheveux: "#992321",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"gibson park jamison": {
		peau: "#9c6249",
		cheveux: "#184581",
		yeux: "#587383",
		coiffure: "long",
		barbe: "full_beard"
	},
	"gideon koegelenberg": {
		peau: "#bf866f",
		cheveux: "#252524",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"gideon wrampling": {
		peau: "#a97a6c",
		cheveux: "#2c2626",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"giga tutisani": {
		tailleCm: 184,
		poidsKg: 110,
		peau: "#a77a6d",
		cheveux: "#39322e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"gigi sirbiladze": {
		tailleCm: 178,
		peau: "#be8865",
		cheveux: "#362a1b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"gilbert sam": {
		peau: "#cd9886",
		cheveux: "#5e4533",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"giles keelan": {
		peau: "#966c53",
		cheveux: "#221a19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"giliomee luan": {
		peau: "#ae907a",
		cheveux: "#3f3826",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"gillian benoy": {
		tailleCm: 203,
		poidsKg: 111,
		peau: "#b27e5f",
		cheveux: "#1c150f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ginga ishii": {
		peau: "#c98468",
		cheveux: "#211b18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ginjiro hase": {
		peau: "#d59f87",
		cheveux: "#25262a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ginjiro sakiguchi": {
		peau: "#c99789",
		cheveux: "#2a2626",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"giorgi akhaladze": {
		tailleCm: 188,
		poidsKg: 122,
		peau: "#c2937a",
		cheveux: "#352b24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"giorgi beria": {
		tailleCm: 174,
		poidsKg: 102,
		peau: "#bb888c",
		cheveux: "#7d6161",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"giorgi dzmanashvili": {
		tailleCm: 186,
		poidsKg: 115,
		peau: "#cca08d",
		cheveux: "#54433c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"giorgi javakhia": {
		tailleCm: 196,
		poidsKg: 118,
		peau: "#d39997",
		cheveux: "#065575",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"giorgi kartvelishvili": {
		tailleCm: 188,
		poidsKg: 125,
		peau: "#98786f",
		cheveux: "#33322c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"giorgi khaindrava": {
		tailleCm: 177,
		poidsKg: 84,
		peau: "#c39583",
		cheveux: "#4b3b32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"giorgi melikidze": {
		tailleCm: 182,
		poidsKg: 106,
		peau: "#c48f7e",
		cheveux: "#3e3538",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"giorgi nutsubidze": {
		tailleCm: 178,
		poidsKg: 99,
		peau: "#dfac90",
		cheveux: "#2a2525",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"giorgi pertaia": {
		tailleCm: 185,
		poidsKg: 115,
		peau: "#d0ab8b",
		cheveux: "#4f4230",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"giorgi tetrashvili": {
		tailleCm: 180,
		poidsKg: 103,
		peau: "#c38f7f",
		cheveux: "#353433",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"giosue zilocchi": {
		tailleCm: 190,
		poidsKg: 104,
		peau: "#b07365",
		cheveux: "#372c27",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"giovanni habel kuffner": {
		peau: "#c6725f",
		cheveux: "#181412",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"giovanni licata": {
		tailleCm: 195,
		poidsKg: 104,
		peau: "#d39c8d",
		cheveux: "#4e4844",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"giovanni montemauri": {
		tailleCm: 185,
		poidsKg: 80,
		peau: "#c68b70",
		cheveux: "#2b302f",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"giovanni quattrini": {
		tailleCm: 178,
		poidsKg: 100,
		peau: "#a47469",
		cheveux: "#392e19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"giuliano avaca": {
		peau: "#d29c82",
		cheveux: "#30684c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"giulio bertaccini": {
		tailleCm: 179,
		poidsKg: 82,
		peau: "#d09785",
		cheveux: "#434449",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"giulio marini": {
		tailleCm: 190,
		poidsKg: 111,
		peau: "#b77d66",
		cheveux: "#3c3020",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"gleeson brian": {
		peau: "#d2917a",
		cheveux: "#a81e21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"go maeda": {
		peau: "#ca8a69",
		cheveux: "#2a2929",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"go nakano": {
		peau: "#a27867",
		cheveux: "#282224",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"goki saito": {
		peau: "#d19a7c",
		cheveux: "#211b19",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"gonzalo garcia": {
		tailleCm: 178,
		poidsKg: 73,
		peau: "#cb9b85",
		cheveux: "#35302e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"goode sonny": {
		peau: "#ab6b5d",
		cheveux: "#5c4131",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"goosen johan": {
		peau: "#9a6457",
		cheveux: "#211b16",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"gordon wood": {
		tailleCm: 183,
		poidsKg: 86,
		peau: "#d6907e",
		cheveux: "#7f1e1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"goro hashimoto": {
		peau: "#be8e77",
		cheveux: "#1c1a19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"gosuke kawakami": {
		peau: "#df9c78",
		cheveux: "#3c3532",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"grady mason": {
		peau: "#9f7373",
		cheveux: "#2e2830",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"grant stewart": {
		peau: "#c59777",
		cheveux: "#6e4f3e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"grant williams": {
		peau: "#865040",
		cheveux: "#221f1c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"greatbanks will": {
		peau: "#aa7f73",
		cheveux: "#775f3e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"green luke": {
		peau: "#c6948f",
		cheveux: "#1d0f0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"greg fisilau": {
		tailleCm: 190,
		poidsKg: 101,
		peau: "#a55f41",
		cheveux: "#4d2216",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"gregoire arfeuil": {
		tailleCm: 191,
		poidsKg: 83,
		peau: "#c18167",
		cheveux: "#453025",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"gregor brown": {
		tailleCm: 192,
		poidsKg: 98,
		peau: "#ad785c",
		cheveux: "#45372d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"gregor hiddleston": {
		tailleCm: 185,
		poidsKg: 114,
		peau: "#ad7665",
		cheveux: "#252022",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"grgoire bazin": {
		peau: "#be7d65",
		cheveux: "#3c291e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"grgory alldritt": {
		peau: "#d89687",
		cheveux: "#5d3b2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"grobbelaar christie": {
		peau: "#c48875",
		cheveux: "#574029",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"grobbelaar johann": {
		peau: "#905f4d",
		cheveux: "#31261d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"grondona benjamin": {
		peau: "#cb8a75",
		cheveux: "#211e1b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"groves alex": {
		peau: "#c38f86",
		cheveux: "#4b3330",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"guido petti pagadizbal": {
		peau: "#9c6951",
		cheveux: "#1d120a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"guido reyes rendon": {
		peau: "#cd7e60",
		cheveux: "#17100d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"guido volpi": {
		peau: "#cc8d73",
		cheveux: "#2f3f47",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"guillaume cramont": {
		tailleCm: 179,
		poidsKg: 100,
		peau: "#d8967f",
		cheveux: "#251d1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"guillaume ducat": {
		tailleCm: 203,
		poidsKg: 107,
		peau: "#c88271",
		cheveux: "#483027",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"guillaume galletier": {
		tailleCm: 182,
		poidsKg: 92,
		peau: "#bf7f5f",
		cheveux: "#372313",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"guillaume laffont": {
		tailleCm: 168,
		poidsKg: 66,
		peau: "#c07d5b",
		cheveux: "#463125",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"guillaume manevy": {
		tailleCm: 180,
		poidsKg: 76,
		peau: "#bf8367",
		cheveux: "#4f3827",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"guillaume marchand": {
		tailleCm: 184,
		poidsKg: 97,
		peau: "#d89d80",
		cheveux: "#4d3e35",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"guillaume martocq": {
		tailleCm: 183,
		poidsKg: 89,
		peau: "#ce7f6f",
		cheveux: "#261a15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"guillaume piazzoli": {
		tailleCm: 188,
		poidsKg: 97,
		peau: "#b08974",
		cheveux: "#342b25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"guillaume rouet": {
		tailleCm: 165,
		poidsKg: 66,
		peau: "#a87b66",
		cheveux: "#3b2f25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"guillaume tartas": {
		tailleCm: 174,
		poidsKg: 97,
		peau: "#bf7f6a",
		cheveux: "#7e5043",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"guillem calmon": {
		tailleCm: 189,
		poidsKg: 104,
		peau: "#b97a56",
		cheveux: "#1b1714",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gumede mpilo": {
		peau: "#7d513b",
		cheveux: "#382519",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gunne fintan": {
		peau: "#b1735c",
		cheveux: "#4d3823",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"guram ganiashvili": {
		peau: "#ae7e6c",
		cheveux: "#523b33",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"guram gogichashvili": {
		tailleCm: 184,
		poidsKg: 113,
		peau: "#c67b66",
		cheveux: "#382018",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"guram papidze": {
		tailleCm: 187,
		poidsKg: 114,
		peau: "#ca9384",
		cheveux: "#016452",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"gus brown": {
		peau: "#bc8672",
		cheveux: "#563e23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gus mccarthy": {
		peau: "#d18c80",
		cheveux: "#3e3024",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gus warr": {
		tailleCm: 173,
		poidsKg: 73,
		peau: "#b2826e",
		cheveux: "#3f3a39",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"guy pepper": {
		tailleCm: 188,
		poidsKg: 96,
		peau: "#c88d73",
		cheveux: "#4c3523",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"gwante o": {
		peau: "#de9f7d",
		cheveux: "#2a282b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"gwilym evans": {
		tailleCm: 181,
		poidsKg: 89,
		peau: "#a67464",
		cheveux: "#332926",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"gymael jean jacques": {
		tailleCm: 181,
		poidsKg: 102,
		peau: "#895f4c",
		cheveux: "#61483c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"hacjivah dayimani": {
		peau: "#8d4833",
		cheveux: "#44352d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"hadden george": {
		peau: "#cd8475",
		cheveux: "#633422",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"haereiti hetet": {
		peau: "#b78269",
		cheveux: "#282521",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hakeem kunene": {
		peau: "#7b4c35",
		cheveux: "#22211c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"halaholo tokolahi": {
		peau: "#cd946e",
		cheveux: "#0b110a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"halatoa vailea": {
		peau: "#d8a191",
		cheveux: "#5e473b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"haley mike": {
		peau: "#de9f89",
		cheveux: "#bc4033",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"hamdahn tuipulotu": {
		peau: "#c88d79",
		cheveux: "#3e332e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hamish muller": {
		peau: "#bf8e8a",
		cheveux: "#523830",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"hamish stewart": {
		peau: "#c88067",
		cheveux: "#503a25",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"hamza kaabeche": {
		tailleCm: 188,
		poidsKg: 111,
		peau: "#b07150",
		cheveux: "#432f22",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"handre pollard": {
		peau: "#d19474",
		cheveux: "#604331",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hanekom cameron": {
		peau: "#a67a6c",
		cheveux: "#2f231b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"haniteli vailea": {
		peau: "#b6795d",
		cheveux: "#1b1916",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"hanjiro hirai": {
		peau: "#dca390",
		cheveux: "#3e3a38",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hanrahan jj": {
		peau: "#d18f80",
		cheveux: "#78302a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"hanro jacobs": {
		peau: "#b7826d",
		cheveux: "#57412f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"hanru sirgel": {
		tailleCm: 189,
		poidsKg: 96,
		peau: "#cf9082",
		cheveux: "#594033",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hans lombard buret": {
		tailleCm: 178,
		poidsKg: 107,
		peau: "#ae7752",
		cheveux: "#453830",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"hansen mack": {
		peau: "#c28879",
		cheveux: "#3f3a33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"harding fitz": {
		peau: "#cc8f77",
		cheveux: "#422f25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"hardy kieran": {
		peau: "#a66c56",
		cheveux: "#30261f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"harold vorster": {
		peau: "#8f5c4c",
		cheveux: "#1e1a16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"harri ackerman": {
		tailleCm: 182,
		poidsKg: 83,
		peau: "#d6a48b",
		cheveux: "#382c1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"harri deaves": {
		peau: "#b2826e",
		cheveux: "#5b4336",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"harri ford": {
		tailleCm: 182,
		poidsKg: 63,
		peau: "#c78876",
		cheveux: "#573d2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"harri houston": {
		tailleCm: 179,
		poidsKg: 76,
		peau: "#b88269",
		cheveux: "#6e482a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"harri millard": {
		tailleCm: 188,
		poidsKg: 83,
		peau: "#a57775",
		cheveux: "#272e3c",
		yeux: "#587383",
		coiffure: "short",
		barbe: "none"
	},
	"harri oconnor": {
		peau: "#aa746c",
		cheveux: "#362727",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"harri wilde": {
		tailleCm: 181,
		poidsKg: 76,
		peau: "#a47776",
		cheveux: "#4d3633",
		yeux: "#624633",
		coiffure: "long",
		barbe: "short_beard"
	},
	"harri williams": {
		tailleCm: 169,
		poidsKg: 70,
		peau: "#b07f6e",
		cheveux: "#44342a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"harrison fox": {
		peau: "#be8772",
		cheveux: "#523c2e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"harrison goddard": {
		peau: "#d69785",
		cheveux: "#322924",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"harrison goggin": {
		peau: "#d2a08e",
		cheveux: "#2c2520",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"harrison keddie": {
		peau: "#bf8574",
		cheveux: "#543d33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"harrison plummer": {
		peau: "#cba28b",
		cheveux: "#392f28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"harrison usher": {
		peau: "#c69696",
		cheveux: "#5e4739",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"harry beddall": {
		tailleCm: 175,
		poidsKg: 85,
		peau: "#d59c85",
		cheveux: "#84654f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"harry browne": {
		tailleCm: 199,
		poidsKg: 103,
		peau: "#ab6a50",
		cheveux: "#261007",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"harry byrne": {
		peau: "#af826d",
		cheveux: "#29231c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"harry godfrey": {
		peau: "#cd8669",
		cheveux: "#553928",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"harry hockings": {
		peau: "#d09691",
		cheveux: "#352a25",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"harry johnson holmes": {
		tailleCm: 183,
		poidsKg: 110,
		peau: "#b56b59",
		cheveux: "#46200e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"harry mc laughlin phillips": {
		peau: "#c19693",
		cheveux: "#593d34",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"harry potter": {
		peau: "#c78376",
		cheveux: "#4a372d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"harry randall": {
		tailleCm: 170,
		poidsKg: 67,
		peau: "#bd886d",
		cheveux: "#30261f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"harry rees weldon": {
		tailleCm: 185,
		poidsKg: 94,
		peau: "#c28c76",
		cheveux: "#3e2f26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"harry sheridan": {
		peau: "#d09585",
		cheveux: "#4f312a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"harry taylor": {
		tailleCm: 188,
		poidsKg: 88,
		peau: "#d7a9a1",
		cheveux: "#6a433b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"harry thacker": {
		tailleCm: 170,
		poidsKg: 84,
		peau: "#d1977e",
		cheveux: "#342a1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"harry thomas": {
		tailleCm: 183,
		poidsKg: 97,
		peau: "#ac786e",
		cheveux: "#211a19",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"harry west": {
		tailleCm: 189,
		poidsKg: 80,
		peau: "#cf8370",
		cheveux: "#321d18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"harry willard": {
		peau: "#cf9f8f",
		cheveux: "#362928",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"harry williams": {
		tailleCm: 195,
		poidsKg: 125,
		peau: "#bc7e69",
		cheveux: "#4b2e25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"harry wilson": {
		tailleCm: 188,
		poidsKg: 96,
		peau: "#b58985",
		cheveux: "#583a36",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hartzenberg suleiman": {
		peau: "#ad7450",
		cheveux: "#181e16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"haru tomoda": {
		peau: "#ba9783",
		cheveux: "#2d261e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"haruhiko uemura": {
		peau: "#dda28a",
		cheveux: "#2b2726",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"haruhiro sakahara": {
		peau: "#805a54",
		cheveux: "#3d3434",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "none"
	},
	"haruka egihata": {
		peau: "#cc9175",
		cheveux: "#191916",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"haruki kitajima": {
		peau: "#ae7752",
		cheveux: "#221e1d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"haruki matsudo": {
		peau: "#dca99e",
		cheveux: "#2f313a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"haruki miyata": {
		peau: "#c08c73",
		cheveux: "#211f1d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"haruki umemoto": {
		peau: "#cd998b",
		cheveux: "#262222",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"harumichi tatekawa": {
		peau: "#d09e8e",
		cheveux: "#242326",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"haruto kida": {
		peau: "#bc887c",
		cheveux: "#291e1c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "moustache"
	},
	"haruto makiyama": {
		peau: "#c5886f",
		cheveux: "#332822",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"haruto takahashi": {
		peau: "#ddb2a8",
		cheveux: "#212022",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"harutomo kodera": {
		peau: "#926959",
		cheveux: "#221f1f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"haruya nakasu": {
		peau: "#dda093",
		cheveux: "#272128",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"harvey beaton": {
		tailleCm: 192,
		poidsKg: 106,
		peau: "#95614f",
		cheveux: "#18100d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"harvey cordukes": {
		peau: "#c08a72",
		cheveux: "#34271c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"harvey cuckson": {
		tailleCm: 203,
		poidsKg: 109,
		peau: "#c3806f",
		cheveux: "#772629",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"harvey skinner": {
		tailleCm: 188,
		poidsKg: 81,
		peau: "#d09076",
		cheveux: "#2a1c12",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"hasa muhamed": {
		peau: "#a57367",
		cheveux: "#2a353b",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hashizou yoshida": {
		peau: "#cb9980",
		cheveux: "#1d1a19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hassane kolingar": {
		tailleCm: 189,
		poidsKg: 106,
		peau: "#a0613e",
		cheveux: "#231a13",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"hastings adam": {
		peau: "#b17e63",
		cheveux: "#29272b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hathaway josh": {
		peau: "#be827b",
		cheveux: "#311e17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hatton nick": {
		peau: "#af7969",
		cheveux: "#4e3823",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"hawkins joe": {
		peau: "#ac7a6e",
		cheveux: "#491e27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hawkshaw david": {
		peau: "#c98678",
		cheveux: "#482c1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hawley gabe": {
		peau: "#a8796f",
		cheveux: "#543630",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hayam el bibouji": {
		tailleCm: 183,
		poidsKg: 98,
		peau: "#c47f5d",
		cheveux: "#232121",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hayata nakao": {
		peau: "#dba78f",
		cheveux: "#2b2b2d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hayata taniyama": {
		peau: "#b6876b",
		cheveux: "#1e1c19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hayata tsujino": {
		peau: "#ce7b5d",
		cheveux: "#29201d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hayate era": {
		peau: "#d9a894",
		cheveux: "#2c2726",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hayate hiraishi": {
		peau: "#c48d69",
		cheveux: "#241b17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hayato fukumoto": {
		peau: "#cb9889",
		cheveux: "#201b19",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"hayato fukunishi": {
		peau: "#cb9074",
		cheveux: "#2c2a29",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"hayato ishibashi": {
		peau: "#d79476",
		cheveux: "#372e27",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hayato kanamaru": {
		peau: "#c8968a",
		cheveux: "#262525",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"hayato kojo": {
		peau: "#c18267",
		cheveux: "#251e1a",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"hayato miyazaki": {
		peau: "#c7957b",
		cheveux: "#221f1c",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"hayato moriyama": {
		peau: "#c1927c",
		cheveux: "#161616",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hayato nishibayashi": {
		peau: "#cc8e7f",
		cheveux: "#2f2522",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hayato yokoi": {
		peau: "#925d48",
		cheveux: "#13110f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hayato yoshida": {
		peau: "#b38068",
		cheveux: "#1b1715",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hayden cripps": {
		peau: "#8f6361",
		cheveux: "#503933",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"hayden thompson stringer": {
		tailleCm: 195,
		poidsKg: 117,
		peau: "#b38066",
		cheveux: "#30231c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"heath backhouse": {
		tailleCm: 196,
		poidsKg: 98,
		peau: "#e0a48f",
		cheveux: "#9a7454",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"heffernan dave": {
		peau: "#d19173",
		cheveux: "#2e2b26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"heiichiro ito": {
		peau: "#c89b81",
		cheveux: "#14110d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"henderson iain": {
		peau: "#c69889",
		cheveux: "#362319",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"hendrik tui": {
		peau: "#d2916e",
		cheveux: "#161911",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hendrik venter": {
		peau: "#be7961",
		cheveux: "#2f2019",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"hendrikse jaden": {
		peau: "#a47355",
		cheveux: "#201c17",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hendrikse jordan": {
		peau: "#ba846c",
		cheveux: "#262217",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hendy george": {
		peau: "#d9a49b",
		cheveux: "#835641",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"henry arundell": {
		tailleCm: 178,
		poidsKg: 86,
		peau: "#cf937b",
		cheveux: "#1d140e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"henry bell": {
		peau: "#c08564",
		cheveux: "#3f3630",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"henry hodgson": {
		peau: "#8a5a4f",
		cheveux: "#492e23",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"henry immelman": {
		peau: "#975d4d",
		cheveux: "#231b16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"henry lumley": {
		peau: "#ca9a92",
		cheveux: "#412b1e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"henry mcerlean": {
		peau: "#b27862",
		cheveux: "#502f16",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "none"
	},
	"henry palmer": {
		peau: "#d19074",
		cheveux: "#2b2118",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"henry pollock": {
		tailleCm: 187,
		poidsKg: 94,
		peau: "#b7766e",
		cheveux: "#422920",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"henry rhys": {
		peau: "#ba816f",
		cheveux: "#6f4d43",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"henry robertson": {
		peau: "#cf9174",
		cheveux: "#433123",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"henry slade": {
		tailleCm: 197,
		poidsKg: 89,
		peau: "#af6953",
		cheveux: "#41281b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"henry taefu": {
		peau: "#cf9c7a",
		cheveux: "#1a1b1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"henry thomas": {
		tailleCm: 190,
		poidsKg: 113,
		peau: "#b38579",
		cheveux: "#7a4c47",
		yeux: "#587383",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"henry walker": {
		tailleCm: 179,
		poidsKg: 96,
		peau: "#9f6b64",
		cheveux: "#211614",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"henshaw robbie": {
		peau: "#c18672",
		cheveux: "#1d261e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"henzo kiteau": {
		tailleCm: 194,
		poidsKg: 117,
		peau: "#b5765a",
		cheveux: "#201a15",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"hepburn alec": {
		peau: "#a97a6d",
		cheveux: "#3c2d28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"heremaia murray": {
		peau: "#a37268",
		cheveux: "#232122",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"herman coetzee": {
		tailleCm: 186,
		poidsKg: 114,
		peau: "#d19579",
		cheveux: "#553e2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"herring rob": {
		peau: "#cd8f7c",
		cheveux: "#392720",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"herschel jantjies": {
		tailleCm: 165,
		poidsKg: 69,
		peau: "#cc7556",
		cheveux: "#19170f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"heward noah": {
		peau: "#ad7158",
		cheveux: "#533c25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hibiki nakazawa": {
		peau: "#765f4a",
		cheveux: "#4d3c2c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"hibiki noda": {
		peau: "#c69577",
		cheveux: "#1f1a16",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hicks dylan": {
		peau: "#d28778",
		cheveux: "#150e09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"hiddleston gregor": {
		peau: "#ad7665",
		cheveux: "#252022",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hideto niguma": {
		peau: "#ca9889",
		cheveux: "#2a2322",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hidetomo nabeshima": {
		peau: "#d9a479",
		cheveux: "#392b18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hidetora nasu": {
		peau: "#bb8879",
		cheveux: "#1c1716",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hikaru hashimoto": {
		peau: "#ca9372",
		cheveux: "#2c2827",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hikaru moriwaki": {
		peau: "#cd967b",
		cheveux: "#2c2a2a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hikaru tamura": {
		peau: "#d7a179",
		cheveux: "#13170f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hikaru yamaguchi": {
		peau: "#dfa992",
		cheveux: "#160d0a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hill evan": {
		peau: "#a37e7c",
		cheveux: "#3e322e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"hinata hori": {
		peau: "#c39387",
		cheveux: "#1b1312",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hinata takei": {
		peau: "#d29a7a",
		cheveux: "#2b2623",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hingano lolohea": {
		peau: "#c1886c",
		cheveux: "#282525",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hire kian": {
		peau: "#b38377",
		cheveux: "#402e27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hiroaki saito": {
		peau: "#9c7563",
		cheveux: "#211b1c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hiroaki shirahama": {
		peau: "#e0a990",
		cheveux: "#312e2f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hirofumi higashikawa": {
		peau: "#bf8c7a",
		cheveux: "#151414",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiroki hanada": {
		peau: "#deb294",
		cheveux: "#2f2924",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiroki handa": {
		peau: "#b3886c",
		cheveux: "#1e1a16",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"hiroki kawase": {
		peau: "#af846f",
		cheveux: "#221d1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiroki kumoyama": {
		peau: "#9b624f",
		cheveux: "#161514",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiroki murakawa": {
		peau: "#c58d74",
		cheveux: "#211d1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiroki yamamoto": {
		peau: "#d8a189",
		cheveux: "#292522",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"hiromichi sakamoto": {
		peau: "#daa986",
		cheveux: "#231f1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hironori yatomi": {
		peau: "#cdab8e",
		cheveux: "#1d1c1b",
		yeux: "#657452",
		coiffure: "long",
		barbe: "none"
	},
	"hirose yabu": {
		peau: "#d08054",
		cheveux: "#261b13",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiroshi yamashita": {
		peau: "#d38666",
		cheveux: "#272423",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiroto nishi": {
		peau: "#c88f76",
		cheveux: "#211a17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiroto ogasahara": {
		peau: "#a47b6e",
		cheveux: "#262123",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hiroto oka": {
		peau: "#c6907a",
		cheveux: "#181816",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiroyuki miyajima": {
		peau: "#da8959",
		cheveux: "#22170d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiroyuki yamasaki": {
		peau: "#cc998a",
		cheveux: "#232123",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"hisamitsu shimada": {
		peau: "#d7a280",
		cheveux: "#151413",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hisanori mimata": {
		peau: "#c27f61",
		cheveux: "#1d1610",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hitaka inoue": {
		peau: "#d6ada0",
		cheveux: "#2b2523",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hiyu sasaki": {
		peau: "#c99373",
		cheveux: "#1a1a18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"hoani bosmorin": {
		tailleCm: 188,
		poidsKg: 76,
		peau: "#eab7a6",
		cheveux: "#a1745b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"hodnett john": {
		peau: "#c58368",
		cheveux: "#321912",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"holz archer": {
		peau: "#9f685e",
		cheveux: "#24161b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"hondo atora": {
		peau: "#d5a48a",
		cheveux: "#312724",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"honeti taumohaapai": {
		peau: "#ac7458",
		cheveux: "#26221d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"hooker ethan": {
		peau: "#b68889",
		cheveux: "#4e3930",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hope che": {
		peau: "#c69177",
		cheveux: "#2d221c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"hopes joe": {
		peau: "#d4917f",
		cheveux: "#593425",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"hopkins iestyn": {
		peau: "#b08176",
		cheveux: "#7d5c46",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"horne george": {
		peau: "#bd8972",
		cheveux: "#4c392d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"houston harri": {
		peau: "#b88269",
		cheveux: "#6e482a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hubert texier": {
		tailleCm: 180,
		poidsKg: 99,
		peau: "#a97863",
		cheveux: "#3e2b24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"hudson creighton": {
		peau: "#aa7162",
		cheveux: "#282a33",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"hugh cooney": {
		peau: "#b27f6e",
		cheveux: "#6b4927",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugh gavin": {
		tailleCm: 192,
		poidsKg: 96,
		peau: "#d0896f",
		cheveux: "#3f543e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"hugh renton": {
		peau: "#c18767",
		cheveux: "#452d30",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"hugh shields": {
		tailleCm: 172,
		poidsKg: 76,
		peau: "#d1a196",
		cheveux: "#4d3834",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"hugh tizard": {
		tailleCm: 191,
		poidsKg: 118,
		peau: "#b49b86",
		cheveux: "#4b2d20",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"hughes archie": {
		peau: "#b07c74",
		cheveux: "#523231",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hughes dafydd": {
		peau: "#ae7f80",
		cheveux: "#4e3632",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"hugo auradou": {
		tailleCm: 200,
		poidsKg: 100,
		peau: "#c07056",
		cheveux: "#130d0b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"hugo bastard": {
		tailleCm: 183,
		poidsKg: 81,
		peau: "#c4876e",
		cheveux: "#46281d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"hugo bouyssou": {
		tailleCm: 173,
		poidsKg: 76,
		peau: "#ae7752",
		cheveux: "#69493f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"hugo cerisier": {
		tailleCm: 179,
		poidsKg: 78,
		peau: "#97613d",
		cheveux: "#2e210c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hugo clauzel": {
		peau: "#ab7067",
		cheveux: "#51352b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"hugo descube": {
		tailleCm: 200,
		poidsKg: 101,
		peau: "#c18b83",
		cheveux: "#392f2b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"hugo djehi": {
		tailleCm: 185,
		poidsKg: 109,
		peau: "#9f5131",
		cheveux: "#3b2210",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"hugo domingo miotti": {
		peau: "#b68479",
		cheveux: "#201814",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugo fabregue": {
		tailleCm: 189,
		poidsKg: 105,
		peau: "#bd8179",
		cheveux: "#43332b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugo fourquet": {
		tailleCm: 181,
		poidsKg: 88,
		peau: "#986848",
		cheveux: "#0d120d",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugo goyenech": {
		tailleCm: 184,
		poidsKg: 77,
		peau: "#c78579",
		cheveux: "#363332",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugo hermet": {
		tailleCm: 190,
		poidsKg: 84,
		peau: "#af815b",
		cheveux: "#3c301b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugo huurman": {
		tailleCm: 195,
		poidsKg: 94,
		peau: "#a97f72",
		cheveux: "#3f3424",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"hugo keenan": {
		peau: "#a17260",
		cheveux: "#252119",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"hugo mclaughlin": {
		peau: "#b97a65",
		cheveux: "#302419",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugo navizet": {
		tailleCm: 182,
		poidsKg: 78,
		peau: "#ca8c7d",
		cheveux: "#48342d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugo ndiaye": {
		peau: "#b18669",
		cheveux: "#2d2a2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"hugo parrou": {
		tailleCm: 187,
		poidsKg: 102,
		peau: "#be806d",
		cheveux: "#3a2d26",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"hugo pirlet": {
		tailleCm: 185,
		poidsKg: 119,
		peau: "#d89a81",
		cheveux: "#352721",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"hugo plummer": {
		peau: "#c78665",
		cheveux: "#50362b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"hugo reilhes": {
		tailleCm: 182,
		poidsKg: 98,
		peau: "#c27459",
		cheveux: "#211811",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugo reus": {
		tailleCm: 182,
		poidsKg: 78,
		peau: "#d3a8a3",
		cheveux: "#070606",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"hugo sarrasin": {
		tailleCm: 182,
		poidsKg: 99,
		peau: "#c89475",
		cheveux: "#59422d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"hugo trouilloud": {
		tailleCm: 179,
		poidsKg: 70,
		peau: "#d5b494",
		cheveux: "#2a2922",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugo zabalza": {
		tailleCm: 173,
		poidsKg: 74,
		peau: "#cf9b87",
		cheveux: "#3d3731",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugo zamora": {
		tailleCm: 173,
		poidsKg: 69,
		peau: "#c28d6b",
		cheveux: "#3d2f24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hugues bastide": {
		tailleCm: 180,
		poidsKg: 97,
		peau: "#bd7d62",
		cheveux: "#362c26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"hume james": {
		peau: "#cf8c79",
		cheveux: "#4d3727",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"humphreys james": {
		peau: "#cd8f76",
		cheveux: "#3f291b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"hunt rob": {
		peau: "#c18874",
		cheveux: "#392d23",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"hunter paisami": {
		peau: "#a57669",
		cheveux: "#131315",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"hurley langton shamus": {
		peau: "#b78272",
		cheveux: "#23302a",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"hutchinson rory": {
		peau: "#cb8a79",
		cheveux: "#2d1f16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"huw anderson": {
		tailleCm: 175,
		poidsKg: 80,
		peau: "#c08471",
		cheveux: "#543c2d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"huw jones": {
		tailleCm: 181,
		poidsKg: 94,
		peau: "#d49c7d",
		cheveux: "#402d22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"huw sutton": {
		tailleCm: 201,
		poidsKg: 115,
		peau: "#b78976",
		cheveux: "#64453d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"iain henderson": {
		peau: "#c69889",
		cheveux: "#362319",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"iaki ayarza": {
		peau: "#c79369",
		cheveux: "#423a2e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"iakopo petelo mapu": {
		peau: "#b18671",
		cheveux: "#42332d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"ian boubila": {
		tailleCm: 180,
		poidsKg: 100,
		peau: "#8d4d28",
		cheveux: "#3e2b1a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"ian kitwanga": {
		tailleCm: 201,
		poidsKg: 111,
		peau: "#543a2d",
		cheveux: "#0f0a07",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"iban etcheverry": {
		tailleCm: 174,
		poidsKg: 73,
		peau: "#ce8d72",
		cheveux: "#4b3c36",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"iban hiriart urruty": {
		tailleCm: 182,
		poidsKg: 91,
		peau: "#dc9d83",
		cheveux: "#523a2c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"iban laclau": {
		tailleCm: 189,
		poidsKg: 79,
		peau: "#e5b19b",
		cheveux: "#836348",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ibitoye gabriel": {
		peau: "#705248",
		cheveux: "#272a2b",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ibrahim diallo": {
		tailleCm: 198,
		poidsKg: 97,
		peau: "#55372c",
		cheveux: "#18140f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ichigo nakakusu": {
		peau: "#cf9e81",
		cheveux: "#312d28",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ichimaro okuhira": {
		peau: "#c08e63",
		cheveux: "#2c2d2c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ieremia mataena": {
		peau: "#966f5c",
		cheveux: "#1f1c1e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"iestyn hopkins": {
		tailleCm: 171,
		poidsKg: 82,
		peau: "#b08176",
		cheveux: "#7d5c46",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"ieuan davies": {
		tailleCm: 174,
		poidsKg: 71,
		peau: "#bf8b76",
		cheveux: "#150f0b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ignacio calles": {
		tailleCm: 183,
		poidsKg: 105,
		peau: "#c07b70",
		cheveux: "#241714",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ignacio mendy": {
		tailleCm: 192,
		poidsKg: 79,
		peau: "#b98475",
		cheveux: "#2f2624",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ignacio ruiz": {
		tailleCm: 182,
		poidsKg: 101,
		peau: "#b68a85",
		cheveux: "#514145",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"igor gatteau": {
		peau: "#eabba6",
		cheveux: "#694132",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ihaia west": {
		tailleCm: 170,
		poidsKg: 78,
		peau: "#e5aa96",
		cheveux: "#81462b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ika motulalo takau": {
		peau: "#c6836d",
		cheveux: "#272424",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"ikki morimoto": {
		peau: "#dfa094",
		cheveux: "#2d2326",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ikuma yamada": {
		peau: "#dea08c",
		cheveux: "#2f2b2a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ilaisa droasese": {
		peau: "#a87963",
		cheveux: "#24201d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ilan leblanc feron": {
		peau: "#d5a690",
		cheveux: "#070707",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"ilia spanderashvili": {
		tailleCm: 193,
		poidsKg: 103,
		peau: "#bd837f",
		cheveux: "#1a1819",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"iliesa nakoveda lomani erenavula": {
		peau: "#765343",
		cheveux: "#221c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"illo sam": {
		peau: "#86442d",
		cheveux: "#121610",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"ilyes seddi": {
		peau: "#d9997d",
		cheveux: "#251914",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"imad khan": {
		peau: "#ca8960",
		cheveux: "#151a11",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"imanol biscay": {
		tailleCm: 172,
		poidsKg: 63,
		peau: "#ae6f68",
		cheveux: "#3f302b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"immanuel feyi waboso": {
		tailleCm: 185,
		poidsKg: 82,
		peau: "#7e3c25",
		cheveux: "#151412",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"immelman henry": {
		peau: "#975d4d",
		cheveux: "#231b16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"inia tabuavou": {
		tailleCm: 183,
		poidsKg: 92,
		peau: "#8f5c4a",
		cheveux: "#2b2729",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"inisi fine": {
		peau: "#9f7665",
		cheveux: "#2b201b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"innard jack": {
		peau: "#b16e68",
		cheveux: "#37221f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"inoke burua": {
		peau: "#aa674c",
		cheveux: "#252120",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"inoke kurukuruvakatini": {
		peau: "#93644b",
		cheveux: "#19161a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ioan emanuel": {
		tailleCm: 193,
		poidsKg: 118,
		peau: "#d49889",
		cheveux: "#3f2e25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"ioan jones": {
		tailleCm: 181,
		poidsKg: 69,
		peau: "#9e7069",
		cheveux: "#4c2c22",
		yeux: "#587383",
		coiffure: "short",
		barbe: "none"
	},
	"ioan lloyd": {
		tailleCm: 185,
		poidsKg: 79,
		peau: "#ae7f7c",
		cheveux: "#3a3439",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ioan nicholas": {
		tailleCm: 179,
		poidsKg: 82,
		peau: "#bb8d82",
		cheveux: "#775f57",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"ioane iashagashvili": {
		tailleCm: 192,
		poidsKg: 110,
		peau: "#c29690",
		cheveux: "#3e2f2d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ioane josh": {
		peau: "#b46e53",
		cheveux: "#132b27",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"ioane rieko": {
		peau: "#ae7752",
		cheveux: "#090c17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ion neculai": {
		tailleCm: 188,
		poidsKg: 128,
		peau: "#b77971",
		cheveux: "#33231c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"iori badham": {
		tailleCm: 187,
		poidsKg: 75,
		peau: "#b3847b",
		cheveux: "#4b2829",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"iori nozaki": {
		peau: "#c6947a",
		cheveux: "#22211d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"iori suzuki": {
		peau: "#c48c7e",
		cheveux: "#221f20",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"iori yokoyama": {
		peau: "#b78c6e",
		cheveux: "#171313",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "moustache"
	},
	"iorwerth scott math": {
		peau: "#bb887b",
		cheveux: "#4b3b3a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"iosefatu mareko": {
		peau: "#c78667",
		cheveux: "#292420",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"iosefo masi baleiwairiki": {
		peau: "#9f6546",
		cheveux: "#312416",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"iosefo namoce": {
		peau: "#bf8b69",
		cheveux: "#2f211a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ippei okada": {
		peau: "#dcad9b",
		cheveux: "#322e2f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ippei oshima": {
		peau: "#c99479",
		cheveux: "#1b1a16",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"irakli aptsiauri": {
		tailleCm: 184,
		poidsKg: 120,
		peau: "#c8866d",
		cheveux: "#45352d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"irakli mtchedlidze": {
		tailleCm: 179,
		poidsKg: 105,
		peau: "#a07265",
		cheveux: "#441d22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"irn herbst": {
		peau: "#bb7053",
		cheveux: "#422d1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"irvine charlie": {
		peau: "#d3937f",
		cheveux: "#352214",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"isaac alexandre nounagnon koffi": {
		peau: "#6b5451",
		cheveux: "#3c2a29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"isaac henry": {
		peau: "#c19694",
		cheveux: "#2d2524",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"isaac hutchinson": {
		peau: "#ab6d5a",
		cheveux: "#3f281a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"isaac kailea": {
		peau: "#a15b45",
		cheveux: "#141111",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"isaac lucas": {
		peau: "#cda17e",
		cheveux: "#927147",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"isaac young": {
		tailleCm: 180,
		poidsKg: 95,
		peau: "#a87867",
		cheveux: "#6d1f29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"isaia walker leawere": {
		tailleCm: 204,
		poidsKg: 110,
		peau: "#925a3c",
		cheveux: "#593522",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"isaiah armstrong ravula": {
		peau: "#cd9670",
		cheveux: "#1f1e1d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"isaiah mapusua": {
		peau: "#cd9a86",
		cheveux: "#262728",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"isaiah punivai": {
		peau: "#c38374",
		cheveux: "#262121",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"isikeli basiyalo": {
		peau: "#b87e62",
		cheveux: "#1a1914",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"isikeli rabitu": {
		peau: "#a96e59",
		cheveux: "#211b16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"isileli manu": {
		peau: "#835b4b",
		cheveux: "#372e2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"isileli nakajima": {
		peau: "#b27459",
		cheveux: "#605143",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"isoa bakeidaku": {
		peau: "#a36a58",
		cheveux: "#1a1411",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"isoa nasilasila": {
		peau: "#b07b5f",
		cheveux: "#191714",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"isoa tuwai": {
		peau: "#ae7a62",
		cheveux: "#1e1c1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"israel folau": {
		peau: "#d09768",
		cheveux: "#271f13",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"issa carlo mendy": {
		peau: "#ab614a",
		cheveux: "#24191b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"issa hosoya": {
		peau: "#af826a",
		cheveux: "#211c19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"issa yamakawa": {
		peau: "#dfa98d",
		cheveux: "#37393a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"issak fines leleiwasa": {
		peau: "#c99578",
		cheveux: "#403127",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"issam hamel": {
		tailleCm: 183,
		poidsKg: 104,
		peau: "#cca89a",
		cheveux: "#534944",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"issei shige": {
		peau: "#b97e5f",
		cheveux: "#181716",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"issen kano": {
		peau: "#cb9684",
		cheveux: "#211f1f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"itsuki fujii": {
		peau: "#d9a191",
		cheveux: "#1f1b23",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"itsuki kamimura": {
		peau: "#c58e74",
		cheveux: "#2d2624",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"itsuki onishi": {
		peau: "#cd9a81",
		cheveux: "#2c2624",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"itsuki yano": {
		peau: "#deb48f",
		cheveux: "#23201d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ivan nemer": {
		tailleCm: 181,
		poidsKg: 112,
		peau: "#aa735d",
		cheveux: "#2b3626",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"ivanishvili luka": {
		peau: "#b67b65",
		cheveux: "#2c1f1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"iwan stephens": {
		tailleCm: 176,
		poidsKg: 72,
		peau: "#b78b85",
		cheveux: "#30292f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"iyogun emmanuel": {
		peau: "#6c362d",
		cheveux: "#110d0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"izack rodda": {
		tailleCm: 206,
		poidsKg: 116,
		peau: "#9a786d",
		cheveux: "#413730",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"izaiha moore": {
		peau: "#bf8b85",
		cheveux: "#27201f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"izekor alessandro": {
		peau: "#614133",
		cheveux: "#3b2313",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"izi sword": {
		peau: "#d8a091",
		cheveux: "#282528",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"izuchukwu cormac": {
		peau: "#cf8e6c",
		cheveux: "#251b14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jac davies": {
		tailleCm: 185,
		poidsKg: 79,
		peau: "#a87972",
		cheveux: "#342323",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jac lloyd": {
		tailleCm: 173,
		poidsKg: 70,
		peau: "#c08870",
		cheveux: "#5d4431",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jac morgan": {
		tailleCm: 177,
		poidsKg: 93,
		peau: "#895c4a",
		cheveux: "#321a10",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jac price": {
		tailleCm: 195,
		poidsKg: 109,
		peau: "#b6857e",
		cheveux: "#221714",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jack aungier": {
		tailleCm: 186,
		poidsKg: 116,
		peau: "#d58669",
		cheveux: "#563a2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jack barrett": {
		peau: "#c58b80",
		cheveux: "#533a2a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jack bates": {
		tailleCm: 184,
		poidsKg: 85,
		peau: "#ae7a5f",
		cheveux: "#312418",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"jack bennett": {
		tailleCm: 197,
		poidsKg: 104,
		peau: "#c8917e",
		cheveux: "#452d1b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jack boyle": {
		peau: "#be8074",
		cheveux: "#523e31",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jack bracken": {
		tailleCm: 179,
		poidsKg: 78,
		peau: "#ae7752",
		cheveux: "#20120c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"jack carty": {
		peau: "#dc947a",
		cheveux: "#36554c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"jack clement": {
		tailleCm: 190,
		poidsKg: 103,
		peau: "#a6665c",
		cheveux: "#3a1e14",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jack conan": {
		peau: "#936757",
		cheveux: "#1c354d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"jack cornelsen": {
		peau: "#d1a08e",
		cheveux: "#382c28",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jack crowley": {
		tailleCm: 187,
		poidsKg: 82,
		peau: "#cd8d78",
		cheveux: "#7e2326",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jack daly": {
		peau: "#cc896b",
		cheveux: "#342b1f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"jack deegan": {
		peau: "#bf8e7d",
		cheveux: "#4c453f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jack dempsey": {
		peau: "#c39273",
		cheveux: "#433225",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jack dunne": {
		peau: "#b18883",
		cheveux: "#453735",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"jack innard": {
		tailleCm: 187,
		poidsKg: 96,
		peau: "#b16e68",
		cheveux: "#37221f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"jack kenningham": {
		tailleCm: 197,
		poidsKg: 101,
		peau: "#cd8d7f",
		cheveux: "#724c30",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jack lewis": {
		tailleCm: 189,
		poidsKg: 102,
		peau: "#b6817a",
		cheveux: "#4e3329",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"jack maddocks": {
		tailleCm: 191,
		poidsKg: 88,
		peau: "#c58676",
		cheveux: "#342720",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"jack mann": {
		tailleCm: 190,
		poidsKg: 110,
		peau: "#be7a7c",
		cheveux: "#482a2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jack marshall": {
		peau: "#946e60",
		cheveux: "#0a0807",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jack murphy": {
		peau: "#9e6c5d",
		cheveux: "#1b100b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"jack musk": {
		tailleCm: 173,
		poidsKg: 81,
		peau: "#ae6453",
		cheveux: "#32180d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"jack nowell": {
		tailleCm: 184,
		poidsKg: 88,
		peau: "#e4b099",
		cheveux: "#977666",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"jack odonoghue": {
		peau: "#d9927e",
		cheveux: "#6e3327",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jack oliver": {
		tailleCm: 175,
		poidsKg: 71,
		peau: "#cf9a78",
		cheveux: "#4c3525",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jack osullivan": {
		peau: "#d0a18c",
		cheveux: "#332a24",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jack sexton": {
		peau: "#c18874",
		cheveux: "#473928",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"jack stratton": {
		peau: "#d59d85",
		cheveux: "#28231f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jack taylor": {
		peau: "#b78b87",
		cheveux: "#252c36",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"jack timu": {
		peau: "#bf9b82",
		cheveux: "#16110d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jack van poortvliet": {
		tailleCm: 178,
		poidsKg: 79,
		peau: "#b9725f",
		cheveux: "#512e1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jack walker": {
		tailleCm: 180,
		poidsKg: 97,
		peau: "#b7795e",
		cheveux: "#542e1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jack walsh": {
		tailleCm: 183,
		poidsKg: 77,
		peau: "#ae806b",
		cheveux: "#5a4130",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jack willis": {
		tailleCm: 192,
		poidsKg: 104,
		peau: "#dea599",
		cheveux: "#7a5d4e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jack woods": {
		tailleCm: 173,
		poidsKg: 79,
		peau: "#cd957e",
		cheveux: "#231811",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jack wright": {
		peau: "#b9947c",
		cheveux: "#2f271f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jack yeandle": {
		tailleCm: 180,
		poidsKg: 106,
		peau: "#c28371",
		cheveux: "#946049",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"jackson hemopo": {
		peau: "#ba7e61",
		cheveux: "#1b1a16",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jackson pugh": {
		peau: "#ca9897",
		cheveux: "#544139",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jaco coetzee": {
		tailleCm: 189,
		poidsKg: 97,
		peau: "#c2866d",
		cheveux: "#241d18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jaco williams": {
		peau: "#a4755c",
		cheveux: "#242422",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jacob abel": {
		peau: "#c89582",
		cheveux: "#231d1b",
		yeux: "#624633",
		coiffure: "long",
		barbe: "moustache"
	},
	"jacob beetham": {
		tailleCm: 188,
		poidsKg: 92,
		peau: "#b37d78",
		cheveux: "#223438",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jacob devery": {
		peau: "#ce8d6b",
		cheveux: "#593f31",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"jacob pierce": {
		peau: "#cc9c89",
		cheveux: "#302823",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jacob ratumaitavuki kneepkens": {
		peau: "#b88678",
		cheveux: "#2a2a3c",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"jacob stockdale": {
		peau: "#d19580",
		cheveux: "#5d3828",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"jacob umaga": {
		tailleCm: 184,
		poidsKg: 86,
		peau: "#b78162",
		cheveux: "#2d2017",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jacobs hanro": {
		peau: "#b7826d",
		cheveux: "#57412f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"jacobs stravino": {
		peau: "#ba8162",
		cheveux: "#2d3a3b",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "none"
	},
	"jacobus van tonder": {
		peau: "#ae837f",
		cheveux: "#514039",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"jacopo bianchi": {
		peau: "#bc8174",
		cheveux: "#304053",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jacopo trulla": {
		tailleCm: 180,
		poidsKg: 81,
		peau: "#bf9586",
		cheveux: "#2d3740",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jacques botha": {
		tailleCm: 207,
		poidsKg: 116,
		peau: "#dca595",
		cheveux: "#654c47",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"jacques vermeulen": {
		tailleCm: 193,
		poidsKg: 108,
		peau: "#d8a593",
		cheveux: "#3f3835",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jaden hendrikse": {
		peau: "#a47355",
		cheveux: "#201c17",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jadin kingi": {
		tailleCm: 198,
		poidsKg: 99,
		peau: "#95654c",
		cheveux: "#0e0908",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jae broomfield": {
		peau: "#ae7752",
		cheveux: "#362617",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jager oli": {
		peau: "#c98c7b",
		cheveux: "#76383c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"jahrome brown": {
		peau: "#cc835a",
		cheveux: "#433531",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jai tamati": {
		peau: "#c07c58",
		cheveux: "#2e2320",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jake aron mcintyre": {
		peau: "#ca9493",
		cheveux: "#5e4e49",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jake ball": {
		peau: "#905c53",
		cheveux: "#611a28",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jake flannery": {
		peau: "#cf9183",
		cheveux: "#50372a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jake gordon": {
		peau: "#bb7964",
		cheveux: "#261d18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jake oriordan": {
		peau: "#cf8468",
		cheveux: "#40291e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jake strachan": {
		tailleCm: 181,
		poidsKg: 77,
		peau: "#ac816f",
		cheveux: "#2c2420",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jake te hiwi": {
		peau: "#c88b67",
		cheveux: "#333b32",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"jake woolmore": {
		tailleCm: 182,
		poidsKg: 114,
		peau: "#cd8d71",
		cheveux: "#55412e",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jamal ford robinson": {
		tailleCm: 180,
		poidsKg: 108,
		peau: "#b57a6e",
		cheveux: "#6c3627",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"james benjamin": {
		peau: "#bc826f",
		cheveux: "#2b1d15",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"james bennett": {
		tailleCm: 198,
		poidsKg: 121,
		peau: "#d0a098",
		cheveux: "#574034",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"james botham": {
		tailleCm: 190,
		poidsKg: 99,
		peau: "#cfa093",
		cheveux: "#322622",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"james chisholm": {
		tailleCm: 192,
		poidsKg: 108,
		peau: "#c9846e",
		cheveux: "#36241e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"james culhane": {
		peau: "#ba8670",
		cheveux: "#243426",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"james dun": {
		tailleCm: 194,
		poidsKg: 114,
		peau: "#bd7461",
		cheveux: "#6d3d26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"james eddie": {
		peau: "#c18f82",
		cheveux: "#402729",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"james elliott": {
		tailleCm: 181,
		poidsKg: 72,
		peau: "#ca9f96",
		cheveux: "#1e1f25",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"james fender": {
		tailleCm: 200,
		poidsKg: 115,
		peau: "#b18672",
		cheveux: "#36261b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"james gaskell": {
		peau: "#574c4c",
		cheveux: "#3e3530",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"james grayson": {
		peau: "#ce927e",
		cheveux: "#392e27",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"james hadfield": {
		tailleCm: 175,
		poidsKg: 95,
		peau: "#8e5a4a",
		cheveux: "#0b0b0a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"james harper": {
		tailleCm: 195,
		poidsKg: 119,
		peau: "#a5625a",
		cheveux: "#120d0f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"james hendren": {
		peau: "#d69a8c",
		cheveux: "#4b3324",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"james hume": {
		peau: "#cf8c79",
		cheveux: "#4d3727",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"james humphreys": {
		peau: "#cd8f76",
		cheveux: "#3f291b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"james isaacs": {
		tailleCm: 185,
		poidsKg: 95,
		peau: "#814e41",
		cheveux: "#211a16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"james lowe": {
		peau: "#9b634b",
		cheveux: "#1f1d19",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"james martens": {
		peau: "#ab7770",
		cheveux: "#271c1d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"james martin": {
		tailleCm: 190,
		poidsKg: 91,
		peau: "#ad6f63",
		cheveux: "#4d2f24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"james mccormick": {
		peau: "#cb8870",
		cheveux: "#4b301f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"james mcnabney": {
		peau: "#cf8c79",
		cheveux: "#3b2014",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"james mollentze": {
		peau: "#a67b72",
		cheveux: "#43352d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"james nuualita tuituba": {
		peau: "#815c49",
		cheveux: "#161617",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"james owain": {
		peau: "#c99180",
		cheveux: "#846149",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"james pater": {
		tailleCm: 190,
		poidsKg: 76,
		peau: "#ddb0ab",
		cheveux: "#5c3f2d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"james ratti": {
		tailleCm: 195,
		poidsKg: 112,
		peau: "#b18c80",
		cheveux: "#342f31",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"james robert hall": {
		peau: "#cf9598",
		cheveux: "#513d37",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"james ryan": {
		peau: "#a06b60",
		cheveux: "#142c41",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"james shillcock": {
		peau: "#c97f61",
		cheveux: "#432c1d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"james slipper": {
		peau: "#ab7663",
		cheveux: "#413028",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"james thompson": {
		tailleCm: 197,
		poidsKg: 108,
		peau: "#a66255",
		cheveux: "#402417",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"james venter": {
		tailleCm: 182,
		poidsKg: 85,
		peau: "#b46d68",
		cheveux: "#392118",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"james white": {
		peau: "#c78e79",
		cheveux: "#1c1712",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"james williams": {
		tailleCm: 176,
		poidsKg: 84,
		peau: "#d39773",
		cheveux: "#5c412e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jamie bhatti": {
		tailleCm: 185,
		poidsKg: 113,
		peau: "#be8870",
		cheveux: "#342c2e",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jamie blamire": {
		tailleCm: 183,
		poidsKg: 108,
		peau: "#a96357",
		cheveux: "#190f0b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"jamie dobie": {
		tailleCm: 183,
		poidsKg: 75,
		peau: "#bd8f6b",
		cheveux: "#412b1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jamie hannah": {
		peau: "#cb967e",
		cheveux: "#241e1a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"jamie osborne": {
		peau: "#ca8b79",
		cheveux: "#8a6e4a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"jamison gibson park": {
		peau: "#9b604a",
		cheveux: "#174581",
		yeux: "#587383",
		coiffure: "long",
		barbe: "full_beard"
	},
	"jan hendrik wessels": {
		peau: "#bb867b",
		cheveux: "#403529",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jan serfontein": {
		peau: "#9f644b",
		cheveux: "#231912",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"janick tarrit": {
		tailleCm: 178,
		poidsKg: 102,
		peau: "#d28a76",
		cheveux: "#2f1f13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"janko swanepoel": {
		peau: "#c4938a",
		cheveux: "#846c60",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"jannes kirsten": {
		tailleCm: 197,
		poidsKg: 112,
		peau: "#9e6b58",
		cheveux: "#4f2d19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jannes potgieter": {
		peau: "#987264",
		cheveux: "#2c231f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"janse roux": {
		tailleCm: 199,
		poidsKg: 114,
		peau: "#da987b",
		cheveux: "#392c23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"janse van rensburg benhard": {
		peau: "#ae7560",
		cheveux: "#2b2420",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"janse van rensburg nicolaas": {
		peau: "#9f6454",
		cheveux: "#1a110b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jansen sean": {
		peau: "#c78571",
		cheveux: "#3c261c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jared proffit": {
		peau: "#9c5e49",
		cheveux: "#41251a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jared rosser": {
		tailleCm: 187,
		poidsKg: 87,
		peau: "#cb8f73",
		cheveux: "#37271f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"jarrah mc leod": {
		peau: "#a36d5b",
		cheveux: "#272324",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"jarrod taylor": {
		peau: "#ab7b6c",
		cheveux: "#422027",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jason colin fraser": {
		peau: "#b27a5f",
		cheveux: "#583d26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jason ilimotama": {
		peau: "#ad715f",
		cheveux: "#0e0e0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jason jenkins": {
		peau: "#af7d62",
		cheveux: "#2b221d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jasper spandler": {
		tailleCm: 182,
		poidsKg: 98,
		peau: "#c68b74",
		cheveux: "#4d321c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jasper wiese": {
		peau: "#dfaa8c",
		cheveux: "#412816",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"javan sebastian": {
		tailleCm: 173,
		poidsKg: 119,
		peau: "#ae7752",
		cheveux: "#262127",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"javier eissmann": {
		tailleCm: 201,
		poidsKg: 112,
		peau: "#af7d73",
		cheveux: "#1a1513",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"jayden joubert": {
		peau: "#5e4433",
		cheveux: "#3e2c22",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"jc mars": {
		peau: "#bd7e54",
		cheveux: "#3f2717",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jd schickerling": {
		peau: "#b47c67",
		cheveux: "#251e18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jean baptiste barrere": {
		tailleCm: 188,
		poidsKg: 97,
		peau: "#b4734c",
		cheveux: "#412611",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jean baptiste de clercq": {
		tailleCm: 178,
		poidsKg: 123,
		peau: "#ab7965",
		cheveux: "#634537",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jean baptiste gros": {
		tailleCm: 182,
		poidsKg: 104,
		peau: "#c68679",
		cheveux: "#704540",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"jean baptiste singer": {
		tailleCm: 202,
		poidsKg: 122,
		peau: "#b57853",
		cheveux: "#3c2b18",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "none"
	},
	"jean cotarmanach": {
		peau: "#c87a62",
		cheveux: "#1c0d08",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jean kleyn": {
		tailleCm: 208,
		poidsKg: 118,
		peau: "#a56457",
		cheveux: "#291712",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jean luc du plessis": {
		peau: "#ad7a5e",
		cheveux: "#3e352b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jean maurice decubber": {
		tailleCm: 173,
		poidsKg: 83,
		peau: "#a7735d",
		cheveux: "#2f241d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jean maxence jules rosette": {
		tailleCm: 184,
		poidsKg: 97,
		peau: "#b8745e",
		cheveux: "#3b261f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jean pascal barraque": {
		tailleCm: 179,
		poidsKg: 81,
		peau: "#b48065",
		cheveux: "#513b2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jean seux": {
		tailleCm: 178,
		poidsKg: 75,
		peau: "#dca693",
		cheveux: "#5e4739",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jean smith": {
		tailleCm: 180,
		poidsKg: 81,
		peau: "#ba8a74",
		cheveux: "#433729",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jean thomas": {
		tailleCm: 195,
		poidsKg: 103,
		peau: "#ae7752",
		cheveux: "#2f221d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jean yves liufau": {
		tailleCm: 175,
		poidsKg: 109,
		peau: "#7d5745",
		cheveux: "#25211b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jeandre labuschagne": {
		peau: "#c29470",
		cheveux: "#3c2f25",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jeandre rudolph": {
		peau: "#9a6955",
		cheveux: "#443122",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jed brown": {
		peau: "#b77c65",
		cheveux: "#403226",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jeff goufan": {
		tailleCm: 196,
		poidsKg: 93,
		peau: "#7e5651",
		cheveux: "#4f352c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"jefferson lee joseph": {
		tailleCm: 196,
		poidsKg: 81,
		peau: "#8b594d",
		cheveux: "#3a2726",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jefferson poirot": {
		tailleCm: 176,
		poidsKg: 107,
		peau: "#614336",
		cheveux: "#351e15",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"jeffery toomaga allen": {
		peau: "#a57771",
		cheveux: "#2d262a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jenkins jason": {
		peau: "#af7d62",
		cheveux: "#2b221d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jennings rory": {
		peau: "#ae7e7c",
		cheveux: "#4c3831",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"jennings shane": {
		peau: "#da968a",
		cheveux: "#532d1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jennings tsuyoshi": {
		peau: "#d0987f",
		cheveux: "#383131",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"jeremy bechu": {
		tailleCm: 183,
		poidsKg: 93,
		peau: "#c38775",
		cheveux: "#271c1c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"jeremy loughman": {
		tailleCm: 178,
		poidsKg: 115,
		peau: "#d49b8e",
		cheveux: "#9a6149",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"jeremy nemor": {
		tailleCm: 185,
		poidsKg: 71,
		peau: "#87594a",
		cheveux: "#36271d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jeremy paul toevalu": {
		peau: "#c78066",
		cheveux: "#1e1b19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jeremy tuima": {
		peau: "#755443",
		cheveux: "#18171a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jeremy williams": {
		peau: "#d4937d",
		cheveux: "#30261a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jeronimo de la fuente": {
		tailleCm: 186,
		poidsKg: 84,
		peau: "#b0807c",
		cheveux: "#131118",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jerry cahir": {
		tailleCm: 187,
		poidsKg: 106,
		peau: "#ba8071",
		cheveux: "#27281f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jesse kriel": {
		peau: "#d6977f",
		cheveux: "#41352f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jessy jegerlehner": {
		tailleCm: 186,
		poidsKg: 90,
		peau: "#de9a82",
		cheveux: "#624a39",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jf van heerden": {
		peau: "#8c6558",
		cheveux: "#2d241d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"jimi maximin": {
		tailleCm: 198,
		poidsKg: 127,
		peau: "#c57e61",
		cheveux: "#3e352e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jimmy obrien": {
		peau: "#b07663",
		cheveux: "#192019",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jimmy roots": {
		tailleCm: 187,
		poidsKg: 122,
		peau: "#bf7f69",
		cheveux: "#312c29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jingo murata": {
		peau: "#d59781",
		cheveux: "#212325",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jinichiro tamanaga": {
		peau: "#d19269",
		cheveux: "#141811",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jioji koroinawai": {
		peau: "#a2633c",
		cheveux: "#291e16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jiuta naqoli wainiqolo": {
		peau: "#986348",
		cheveux: "#231e1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jiwon gu": {
		peau: "#c98969",
		cheveux: "#242221",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jj hanrahan": {
		tailleCm: 179,
		poidsKg: 85,
		peau: "#d18f80",
		cheveux: "#78302a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jj kotze": {
		peau: "#a97152",
		cheveux: "#241b11",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jj scheepers": {
		tailleCm: 194,
		poidsKg: 114,
		peau: "#b37c70",
		cheveux: "#2a2120",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jj theron": {
		peau: "#b5846b",
		cheveux: "#523b1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"jj van der mescht": {
		tailleCm: 202,
		poidsKg: 142,
		peau: "#b67c73",
		cheveux: "#2d1c18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jo kuramori": {
		peau: "#bd816b",
		cheveux: "#131315",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"joan notolan": {
		tailleCm: 182,
		poidsKg: 81,
		peau: "#c79585",
		cheveux: "#080808",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"joape naco": {
		peau: "#a46c50",
		cheveux: "#201c18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"joaquin moro": {
		tailleCm: 187,
		poidsKg: 90,
		peau: "#9d5948",
		cheveux: "#23140e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joaquin oviedo": {
		tailleCm: 189,
		poidsKg: 105,
		peau: "#b47d76",
		cheveux: "#0b070a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"job poulet": {
		tailleCm: 176,
		poidsKg: 72,
		peau: "#b47873",
		cheveux: "#1d1a1e",
		yeux: "#587383",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jock campbell": {
		peau: "#b47a7a",
		cheveux: "#1e1918",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joe bailey": {
		tailleCm: 197,
		poidsKg: 105,
		peau: "#bc7462",
		cheveux: "#3b1d0f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"joe batley": {
		tailleCm: 201,
		poidsKg: 115,
		peau: "#b57153",
		cheveux: "#6b4e31",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"joe brial": {
		peau: "#bf8889",
		cheveux: "#40322f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"joe carpenter": {
		peau: "#b88570",
		cheveux: "#312c29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joe cokanasiga": {
		tailleCm: 196,
		poidsKg: 105,
		peau: "#986248",
		cheveux: "#1f1a12",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"joe cowell": {
		tailleCm: 186,
		poidsKg: 113,
		peau: "#ae8d8d",
		cheveux: "#5c4646",
		yeux: "#587383",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"joe dillon": {
		peau: "#c89184",
		cheveux: "#292930",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"joe hawkins": {
		tailleCm: 178,
		poidsKg: 93,
		peau: "#ac7a6e",
		cheveux: "#491e27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joe heyes": {
		tailleCm: 189,
		poidsKg: 114,
		peau: "#a36556",
		cheveux: "#462c21",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"joe hopes": {
		peau: "#d4917f",
		cheveux: "#593425",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"joe jonas": {
		tailleCm: 185,
		poidsKg: 80,
		peau: "#b07964",
		cheveux: "#332b2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"joe joyce": {
		tailleCm: 192,
		poidsKg: 107,
		peau: "#b56f69",
		cheveux: "#64342d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"joe marchant": {
		tailleCm: 178,
		poidsKg: 80,
		peau: "#a87260",
		cheveux: "#1e1b1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"joe mccarthy": {
		peau: "#ab7369",
		cheveux: "#204174",
		yeux: "#587383",
		coiffure: "long",
		barbe: "full_beard"
	},
	"joe owen": {
		tailleCm: 205,
		poidsKg: 98,
		peau: "#9a6447",
		cheveux: "#201914",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"joe quere karaba": {
		tailleCm: 186,
		poidsKg: 85,
		peau: "#c9866e",
		cheveux: "#2d221d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joe roberts": {
		tailleCm: 187,
		poidsKg: 88,
		peau: "#ac7c77",
		cheveux: "#29191a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joe simmonds": {
		tailleCm: 181,
		poidsKg: 85,
		peau: "#c98a74",
		cheveux: "#4b3c33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"joe westwood": {
		tailleCm: 197,
		poidsKg: 99,
		peau: "#c68b79",
		cheveux: "#684d38",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"joel kpoku": {
		tailleCm: 197,
		poidsKg: 118,
		peau: "#624639",
		cheveux: "#261d18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joel merkler perez": {
		peau: "#db9f96",
		cheveux: "#a8746b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"joey james walton": {
		peau: "#d39d84",
		cheveux: "#604938",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"johan cilliers viljoen": {
		peau: "#c88468",
		cheveux: "#3d271d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"johan georg wasserman": {
		peau: "#be8465",
		cheveux: "#5c3d24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"johan goosen": {
		peau: "#9a6457",
		cheveux: "#211b16",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"johan mulder": {
		tailleCm: 172,
		poidsKg: 74,
		peau: "#a77676",
		cheveux: "#35424b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"johann grobbelaar": {
		peau: "#905f4d",
		cheveux: "#31261d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"johannes jonker": {
		tailleCm: 183,
		poidsKg: 114,
		peau: "#d2ab99",
		cheveux: "#443e2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"johannes keagan": {
		peau: "#b77f64",
		cheveux: "#28221b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"john andrew": {
		peau: "#af7760",
		cheveux: "#422b20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"john bryant": {
		peau: "#b27d67",
		cheveux: "#2f1d13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"john cooney": {
		tailleCm: 177,
		poidsKg: 75,
		peau: "#c28466",
		cheveux: "#31241b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"john devine": {
		tailleCm: 188,
		poidsKg: 91,
		peau: "#d0897a",
		cheveux: "#232019",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"john dyer": {
		peau: "#b77962",
		cheveux: "#2b1d17",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"john hodnett": {
		tailleCm: 181,
		poidsKg: 100,
		peau: "#c58368",
		cheveux: "#321912",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"john madigan": {
		tailleCm: 193,
		poidsKg: 116,
		peau: "#bd8c7d",
		cheveux: "#5a402c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"john mckee": {
		tailleCm: 188,
		poidsKg: 101,
		peau: "#bc836e",
		cheveux: "#322e25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"john ryan": {
		peau: "#de9d8d",
		cheveux: "#9b3935",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"john thomas jackson": {
		peau: "#d6a48c",
		cheveux: "#49443e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"john ulugia": {
		peau: "#a46853",
		cheveux: "#573729",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"johnathan matthews": {
		peau: "#d9ac9f",
		cheveux: "#85684e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"johnny faauli": {
		peau: "#d99b80",
		cheveux: "#363333",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"johnny lee": {
		peau: "#d7a189",
		cheveux: "#2d2112",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"johnny matthews": {
		tailleCm: 181,
		poidsKg: 102,
		peau: "#c59881",
		cheveux: "#563d33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"johnny mc nicholl": {
		peau: "#c6957e",
		cheveux: "#594330",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"johnny ventisei": {
		tailleCm: 179,
		poidsKg: 89,
		peau: "#a2775f",
		cheveux: "#4b372a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"johnny williams": {
		tailleCm: 191,
		poidsKg: 100,
		peau: "#986a62",
		cheveux: "#3c1c1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"johnston kerr": {
		peau: "#c2937c",
		cheveux: "#1c1b1c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"joichiro iwashita": {
		peau: "#b68275",
		cheveux: "#1e1816",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"joji nasova": {
		peau: "#b07962",
		cheveux: "#22211d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jon echegaray": {
		tailleCm: 186,
		poidsKg: 81,
		peau: "#a9796b",
		cheveux: "#181515",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jon zabala arrieta": {
		peau: "#b97862",
		cheveux: "#5a453c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"jona nareki": {
		peau: "#ba825c",
		cheveux: "#42372e",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jonah bernard thompson": {
		peau: "#cd7e6b",
		cheveux: "#180c0a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"jonah lowe": {
		peau: "#ba8b7f",
		cheveux: "#2a2832",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jonas tanaka dowling": {
		peau: "#d09f90",
		cheveux: "#302b28",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jonathan danty": {
		tailleCm: 176,
		poidsKg: 100,
		peau: "#b76f54",
		cheveux: "#281a17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jonathan gray": {
		peau: "#a06c5f",
		cheveux: "#513c2c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jonathan hill": {
		peau: "#c18670",
		cheveux: "#392011",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jonathan maiau": {
		tailleCm: 173,
		poidsKg: 103,
		peau: "#b37953",
		cheveux: "#1d1916",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"jonathan roche": {
		peau: "#b47f64",
		cheveux: "#2f1f15",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jonathan ruru": {
		tailleCm: 186,
		poidsKg: 86,
		peau: "#a47753",
		cheveux: "#2d2620",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jonathan ryan": {
		peau: "#b88882",
		cheveux: "#5c3e25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jone kerevi": {
		peau: "#a1705e",
		cheveux: "#3b3633",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jone nabetelevu": {
		peau: "#7f5f55",
		cheveux: "#2f2c2b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"jone naikabula": {
		peau: "#be896f",
		cheveux: "#22201d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jone rova": {
		peau: "#90573d",
		cheveux: "#3e2a1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"jones cameron": {
		peau: "#c38c7a",
		cheveux: "#2c211d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jones huw": {
		peau: "#d49c7d",
		cheveux: "#402d22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jones ioan": {
		peau: "#9e7069",
		cheveux: "#4c2c22",
		yeux: "#587383",
		coiffure: "short",
		barbe: "none"
	},
	"jones lewis": {
		peau: "#a57c6e",
		cheveux: "#60473d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"jones rhodri": {
		peau: "#c08a74",
		cheveux: "#412f23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jones wyn": {
		peau: "#ba8775",
		cheveux: "#564135",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jongchu ryang": {
		peau: "#dfab90",
		cheveux: "#232121",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jonny green": {
		tailleCm: 199,
		poidsKg: 109,
		peau: "#b4765f",
		cheveux: "#22100a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jonny scott": {
		peau: "#c19088",
		cheveux: "#342017",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jonny weimann": {
		tailleCm: 187,
		poidsKg: 76,
		peau: "#ae706f",
		cheveux: "#201310",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jooste cheswill": {
		peau: "#502e22",
		cheveux: "#160f0a",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"jope naseara": {
		tailleCm: 176,
		poidsKg: 78,
		peau: "#a36a47",
		cheveux: "#1a1e15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jordan duggan": {
		tailleCm: 192,
		poidsKg: 105,
		peau: "#cc8173",
		cheveux: "#4b382a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jordan hendrikse": {
		peau: "#ba846c",
		cheveux: "#262217",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jordan joseph": {
		tailleCm: 187,
		poidsKg: 113,
		peau: "#78462f",
		cheveux: "#573023",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"jordan larmour": {
		peau: "#bf826a",
		cheveux: "#433122",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jordan morris": {
		tailleCm: 187,
		poidsKg: 102,
		peau: "#926453",
		cheveux: "#1b1713",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jordan tom": {
		peau: "#bd806d",
		cheveux: "#32261f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jordan uelese": {
		tailleCm: 186,
		poidsKg: 111,
		peau: "#c08d7c",
		cheveux: "#0a0a08",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jordi viljoen": {
		peau: "#d0876d",
		cheveux: "#563d2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jordie barrett": {
		peau: "#cb8768",
		cheveux: "#4b3223",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jordon janse van rensburg": {
		tailleCm: 199,
		poidsKg: 85,
		peau: "#b1745b",
		cheveux: "#1f1410",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"joris cazenave": {
		tailleCm: 170,
		poidsKg: 73,
		peau: "#a57c6c",
		cheveux: "#332b26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"joris dupont": {
		tailleCm: 183,
		poidsKg: 83,
		peau: "#b88f88",
		cheveux: "#362c2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joris jurand": {
		tailleCm: 184,
		poidsKg: 96,
		peau: "#c59780",
		cheveux: "#292421",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"joris moura": {
		tailleCm: 189,
		poidsKg: 84,
		peau: "#be9087",
		cheveux: "#2b292a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joris segonds": {
		tailleCm: 175,
		poidsKg: 83,
		peau: "#c97d6b",
		cheveux: "#3a251d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jos duarte madeira": {
		peau: "#d4a390",
		cheveux: "#354342",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"jos gilmore": {
		peau: "#b88972",
		cheveux: "#2a211e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jos junior kpoku": {
		peau: "#673930",
		cheveux: "#191011",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jose seru": {
		peau: "#9c694c",
		cheveux: "#1c1a18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"josefa taito ubitau": {
		peau: "#ab6543",
		cheveux: "#130f0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joseph adam": {
		tailleCm: 183,
		poidsKg: 126,
		peau: "#ca897c",
		cheveux: "#454e47",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"joseph aukuso suaalii": {
		peau: "#b77055",
		cheveux: "#292826",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"joseph dweba": {
		tailleCm: 181,
		poidsKg: 106,
		peau: "#8e4d34",
		cheveux: "#28242a",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"joseph edwards": {
		peau: "#924c2d",
		cheveux: "#221205",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"joseph laharrague": {
		tailleCm: 188,
		poidsKg: 70,
		peau: "#c17f63",
		cheveux: "#2e2117",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"joseph manu": {
		peau: "#cc8870",
		cheveux: "#170f0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"joseph patrick powell": {
		peau: "#d6a287",
		cheveux: "#83664f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"joseph will": {
		peau: "#925647",
		cheveux: "#261512",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"joseph woodward": {
		peau: "#be7b6c",
		cheveux: "#492c1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"joseva tamani": {
		peau: "#a77964",
		cheveux: "#1e1c1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"josh adams": {
		tailleCm: 189,
		poidsKg: 90,
		peau: "#ba8d8e",
		cheveux: "#30272f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"josh bartlett": {
		peau: "#c2845f",
		cheveux: "#3d2e24",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"josh bayliss": {
		tailleCm: 194,
		poidsKg: 100,
		peau: "#c18e70",
		cheveux: "#18100b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"josh canham": {
		peau: "#a5716d",
		cheveux: "#382523",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"josh caulfield": {
		tailleCm: 195,
		poidsKg: 106,
		peau: "#d79275",
		cheveux: "#84684f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"josh dickson": {
		peau: "#d7978a",
		cheveux: "#7d695c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"josh ericson": {
		peau: "#ac6e56",
		cheveux: "#082558",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"josh fenner": {
		peau: "#c78f8a",
		cheveux: "#583f34",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"josh flook": {
		tailleCm: 185,
		poidsKg: 80,
		peau: "#b8887e",
		cheveux: "#3c2c27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"josh goodhue": {
		peau: "#a87456",
		cheveux: "#594230",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"josh gray": {
		peau: "#ba7658",
		cheveux: "#3e2c22",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"josh hathaway": {
		tailleCm: 186,
		poidsKg: 78,
		peau: "#be827b",
		cheveux: "#311e17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"josh hodge": {
		tailleCm: 192,
		poidsKg: 81,
		peau: "#c89688",
		cheveux: "#72634f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"josh ioane": {
		tailleCm: 179,
		poidsKg: 87,
		peau: "#b46e53",
		cheveux: "#132b27",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"josh iosefa scott": {
		tailleCm: 189,
		poidsKg: 135,
		peau: "#b06652",
		cheveux: "#36201e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"josh jacomb": {
		peau: "#e1937f",
		cheveux: "#4d3426",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"josh kemeny": {
		tailleCm: 191,
		poidsKg: 105,
		peau: "#b9857f",
		cheveux: "#3f2a20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"josh lord": {
		peau: "#a2634f",
		cheveux: "#15110d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"josh macleod": {
		tailleCm: 193,
		poidsKg: 104,
		peau: "#b17b67",
		cheveux: "#873c3a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"josh mann": {
		tailleCm: 180,
		poidsKg: 116,
		peau: "#c48a7a",
		cheveux: "#40190c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"josh mckay": {
		tailleCm: 181,
		poidsKg: 84,
		peau: "#ab7d68",
		cheveux: "#4a352a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"josh mcnally": {
		tailleCm: 201,
		poidsKg: 118,
		peau: "#a67a76",
		cheveux: "#5c4741",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"josh morse": {
		tailleCm: 179,
		poidsKg: 106,
		peau: "#b07f76",
		cheveux: "#4d2522",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"josh murphy": {
		tailleCm: 195,
		poidsKg: 105,
		peau: "#b68279",
		cheveux: "#222b2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"josh nasser": {
		peau: "#b4817e",
		cheveux: "#221d1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"josh taylor": {
		tailleCm: 195,
		poidsKg: 106,
		peau: "#c28f87",
		cheveux: "#160b08",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"josh tengblad": {
		peau: "#c08159",
		cheveux: "#2c2225",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"josh timu": {
		peau: "#b77854",
		cheveux: "#30211b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"josh van der flier": {
		peau: "#ae7960",
		cheveux: "#322c1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"josh whaanga": {
		peau: "#c88b61",
		cheveux: "#294337",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"josh wycherley": {
		tailleCm: 184,
		poidsKg: 107,
		peau: "#dd9a87",
		cheveux: "#772a24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"joshua brennan": {
		tailleCm: 200,
		poidsKg: 113,
		peau: "#dca29e",
		cheveux: "#412e28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"joshua john thompson": {
		peau: "#b18b65",
		cheveux: "#181c1a",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joshua kenny": {
		peau: "#b67967",
		cheveux: "#1f1f17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"joshua manz": {
		peau: "#a96959",
		cheveux: "#20120d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"joshua moorby": {
		peau: "#c27e5e",
		cheveux: "#44362e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"joshua nohra": {
		peau: "#bc8c7a",
		cheveux: "#2e2a28",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"joshua smith": {
		peau: "#be7f55",
		cheveux: "#1f1b15",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"josiah edwards giraud": {
		tailleCm: 181,
		poidsKg: 80,
		peau: "#552b25",
		cheveux: "#1d1211",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"josiah meihana maraku": {
		peau: "#cb7c51",
		cheveux: "#28231f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"josselin bouhier": {
		tailleCm: 195,
		poidsKg: 93,
		peau: "#bd7d6c",
		cheveux: "#46362c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"josua kerevi": {
		peau: "#714f43",
		cheveux: "#2e2423",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"josua tuisova": {
		tailleCm: 182,
		poidsKg: 108,
		peau: "#85493a",
		cheveux: "#1b1211",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"josua vici": {
		tailleCm: 194,
		poidsKg: 101,
		peau: "#936757",
		cheveux: "#322e2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"joyce joe": {
		peau: "#df957e",
		cheveux: "#40302a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jp du preez": {
		peau: "#d5a58c",
		cheveux: "#292723",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"jrme dufour": {
		peau: "#8f5f47",
		cheveux: "#1c140e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jrme rey": {
		peau: "#c48058",
		cheveux: "#4f3d2e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"jrmy charles ward": {
		peau: "#c79582",
		cheveux: "#6d5043",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"jrmy fernandez": {
		peau: "#ce8679",
		cheveux: "#69483b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jrmy sinzelle": {
		peau: "#b97461",
		cheveux: "#332a27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"juan bautista pedemonte": {
		tailleCm: 189,
		poidsKg: 102,
		peau: "#b46453",
		cheveux: "#25150f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"juan cruz mallia": {
		tailleCm: 183,
		poidsKg: 81,
		peau: "#bc8270",
		cheveux: "#2f211a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"juan ignacio brex": {
		peau: "#d49279",
		cheveux: "#211919",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"juan manuel pitinari": {
		peau: "#a4705f",
		cheveux: "#42392a",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"juan martin gonzalez": {
		peau: "#ae7752",
		cheveux: "#150f0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"juan martin scelzo": {
		tailleCm: 194,
		poidsKg: 98,
		peau: "#c08a76",
		cheveux: "#392c27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"juan oosthuyzen": {
		peau: "#d19a83",
		cheveux: "#3e332f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"juan segundo martin montilla": {
		peau: "#d4b498",
		cheveux: "#393129",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "none"
	},
	"juan wilson": {
		peau: "#d1a296",
		cheveux: "#4c3e37",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"juann else": {
		peau: "#9e665a",
		cheveux: "#362518",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"juarno augustus": {
		peau: "#cb835f",
		cheveux: "#3a2314",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"judah saumaisue": {
		peau: "#955844",
		cheveux: "#2d2a2d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"jude gibbs": {
		peau: "#cda092",
		cheveux: "#403127",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jude postlethwaite": {
		peau: "#cc8c73",
		cheveux: "#332114",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"judicael cancoriet": {
		tailleCm: 192,
		poidsKg: 107,
		peau: "#905343",
		cheveux: "#271612",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"jui nakamori": {
		peau: "#d9a79e",
		cheveux: "#303139",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"jules bousquet": {
		tailleCm: 173,
		peau: "#b47d5e",
		cheveux: "#38281b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jules coulon": {
		tailleCm: 184,
		poidsKg: 93,
		peau: "#be816a",
		cheveux: "#171311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jules danglot": {
		tailleCm: 175,
		poidsKg: 66,
		peau: "#ba836e",
		cheveux: "#513726",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jules dubecq": {
		tailleCm: 177,
		poidsKg: 69,
		peau: "#c58a70",
		cheveux: "#3c3029",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jules favre": {
		tailleCm: 182,
		poidsKg: 88,
		peau: "#e1a796",
		cheveux: "#32201e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"jules gimbert": {
		tailleCm: 176,
		poidsKg: 70,
		peau: "#bb8c71",
		cheveux: "#342a27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jules martinez": {
		tailleCm: 181,
		poidsKg: 104,
		peau: "#c89173",
		cheveux: "#48392e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"jules solinas": {
		tailleCm: 173,
		poidsKg: 70,
		peau: "#c49260",
		cheveux: "#604a25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"jules soulan": {
		tailleCm: 184,
		poidsKg: 71,
		peau: "#c58779",
		cheveux: "#412f25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"jules veyrier": {
		tailleCm: 176,
		poidsKg: 80,
		peau: "#bc7d73",
		cheveux: "#343332",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jules vuachet": {
		tailleCm: 190,
		poidsKg: 85,
		peau: "#c99168",
		cheveux: "#291e18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"julian guiraud": {
		tailleCm: 196,
		poidsKg: 101,
		peau: "#b57a66",
		cheveux: "#553a2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"julian heaven": {
		tailleCm: 189,
		poidsKg: 97,
		peau: "#bc7f66",
		cheveux: "#1e1813",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"julien delbouis": {
		tailleCm: 181,
		poidsKg: 97,
		peau: "#c79581",
		cheveux: "#59463e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"julien farnoux": {
		tailleCm: 181,
		poidsKg: 84,
		peau: "#b97f60",
		cheveux: "#4b3e32",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"julien heriteau": {
		tailleCm: 179,
		poidsKg: 87,
		peau: "#cda98d",
		cheveux: "#333028",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"julien kazubek": {
		tailleCm: 195,
		poidsKg: 106,
		peau: "#b27a5a",
		cheveux: "#2a1f18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"julien koteureu": {
		peau: "#ae7752",
		cheveux: "#2a2321",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"julien lebian": {
		tailleCm: 190,
		poidsKg: 90,
		peau: "#ae7752",
		cheveux: "#382d28",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"julien marchand": {
		tailleCm: 178,
		poidsKg: 103,
		peau: "#d69381",
		cheveux: "#2d2423",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"julien rasamoelina": {
		tailleCm: 183,
		poidsKg: 106,
		peau: "#b7754f",
		cheveux: "#1b1911",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"julien ratajczak": {
		tailleCm: 177,
		poidsKg: 96,
		peau: "#d5a670",
		cheveux: "#6e5a3a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"julien tisseron": {
		tailleCm: 183,
		poidsKg: 80,
		peau: "#ba7c5a",
		cheveux: "#2b1c12",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"julin sixto montoya": {
		peau: "#be7c6b",
		cheveux: "#332820",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"julius jurenzo": {
		peau: "#754832",
		cheveux: "#181711",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"julius nostadt": {
		tailleCm: 183,
		poidsKg: 110,
		peau: "#a37c69",
		cheveux: "#2c211c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"jumpei tada": {
		peau: "#cf997d",
		cheveux: "#25211a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"jun morimoto": {
		peau: "#c18265",
		cheveux: "#2c2620",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jung soo yang": {
		peau: "#d3996e",
		cheveux: "#13140b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"junichiro matsushita": {
		peau: "#dda87f",
		cheveux: "#11160f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"junior ahokovi": {
		peau: "#a67a5b",
		cheveux: "#151413",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"junnosuke ito": {
		peau: "#d8b19a",
		cheveux: "#333235",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"junpei noguchi": {
		peau: "#c29183",
		cheveux: "#2e1810",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"junpei ogura": {
		peau: "#a7714f",
		cheveux: "#241b18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"junta hamano": {
		peau: "#ce8762",
		cheveux: "#2a2725",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"junya lee": {
		peau: "#be8a7b",
		cheveux: "#140f0e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"junya matsumoto": {
		peau: "#daa77e",
		cheveux: "#11150d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"jurenzo julius": {
		peau: "#754832",
		cheveux: "#181711",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"jurie matthee": {
		peau: "#c68968",
		cheveux: "#59422a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"justin bouraux": {
		tailleCm: 178,
		poidsKg: 71,
		peau: "#b58361",
		cheveux: "#433527",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"justin sangster": {
		peau: "#c6a28c",
		cheveux: "#534437",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"jyunki tokota": {
		peau: "#bc8577",
		cheveux: "#161110",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kade wolhuter": {
		peau: "#bc826b",
		cheveux: "#592a25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"kadin pritchard": {
		peau: "#854d39",
		cheveux: "#27282a",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"kaen hirano": {
		peau: "#cd9787",
		cheveux: "#221a18",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"kagechika ota": {
		peau: "#d69f89",
		cheveux: "#1c1b17",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kai ishii": {
		peau: "#d79b72",
		cheveux: "#12140c",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"kai oshiro": {
		peau: "#ca9576",
		cheveux: "#1b1b19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kai yamamoto": {
		peau: "#b98173",
		cheveux: "#232121",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kai yamasaki": {
		peau: "#ad846d",
		cheveux: "#241e19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kaiha noda": {
		peau: "#cf9884",
		cheveux: "#242121",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kaipono kayoshi": {
		peau: "#d2885c",
		cheveux: "#28251e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kaisei takai": {
		peau: "#dea58b",
		cheveux: "#25201f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kaisei tamura": {
		peau: "#d6a589",
		cheveux: "#222427",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kaisei umeda": {
		peau: "#dfaa84",
		cheveux: "#1d1a10",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kaishun azuma": {
		peau: "#e79371",
		cheveux: "#221109",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "short_beard"
	},
	"kaito doichi": {
		peau: "#bb8a67",
		cheveux: "#1c1715",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kaito isono": {
		peau: "#d39f84",
		cheveux: "#171412",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kaito sasaoka": {
		peau: "#b58572",
		cheveux: "#232121",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kaito shige": {
		peau: "#b9968f",
		cheveux: "#2e3136",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kaito shigeno": {
		peau: "#d49e85",
		cheveux: "#242628",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kaito sugahara": {
		peau: "#e4ab9d",
		cheveux: "#272128",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kaito sugimoto": {
		peau: "#cda98e",
		cheveux: "#241d17",
		yeux: "#657452",
		coiffure: "long",
		barbe: "none"
	},
	"kaito takata": {
		peau: "#d19b81",
		cheveux: "#24201e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kaito tamori": {
		peau: "#d5a092",
		cheveux: "#292c31",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kakeru miyaso": {
		peau: "#c68561",
		cheveux: "#271e15",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kakeru okumura": {
		peau: "#b89077",
		cheveux: "#13110e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kakeru sugihara": {
		peau: "#b59078",
		cheveux: "#151313",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kakhaber darbaidze": {
		tailleCm: 181,
		poidsKg: 118,
		peau: "#d9a892",
		cheveux: "#533f2f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"kalani thomas": {
		peau: "#96594f",
		cheveux: "#34201f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kalaveti ravouvou": {
		tailleCm: 181,
		poidsKg: 85,
		peau: "#724533",
		cheveux: "#080807",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kaleb trask": {
		peau: "#d79e95",
		cheveux: "#40312c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kaliova bulai": {
		tailleCm: 184,
		poidsKg: 98,
		peau: "#845b49",
		cheveux: "#211d1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kalvin gourgues": {
		tailleCm: 179,
		poidsKg: 86,
		peau: "#cc8871",
		cheveux: "#211819",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kamaliele tufele": {
		tailleCm: 181,
		poidsKg: 118,
		peau: "#b26e4a",
		cheveux: "#1c1816",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kaminieli rasaku": {
		tailleCm: 176,
		poidsKg: 87,
		peau: "#704f3f",
		cheveux: "#1f1c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kan nakano": {
		peau: "#c28572",
		cheveux: "#262120",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kanaru takahashi": {
		peau: "#ce9686",
		cheveux: "#201c21",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kanato hirano": {
		peau: "#dca995",
		cheveux: "#1a1515",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kane james": {
		tailleCm: 181,
		poidsKg: 89,
		peau: "#c48266",
		cheveux: "#291c15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kanji futamura": {
		peau: "#d7a494",
		cheveux: "#222023",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kanji shimokawa": {
		peau: "#c5968a",
		cheveux: "#1e1d1d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kanjiro naramoto": {
		peau: "#d9a384",
		cheveux: "#352d29",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"kanta fujita": {
		peau: "#cb9681",
		cheveux: "#1c1816",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kanta hasegawa": {
		peau: "#da9278",
		cheveux: "#39322e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kanta hattori": {
		peau: "#c89683",
		cheveux: "#1c1410",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kanta hosokawa": {
		peau: "#c9917c",
		cheveux: "#2b2722",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kanta kurahashi": {
		peau: "#d7a995",
		cheveux: "#28211c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kanta matsunaga": {
		peau: "#bf866a",
		cheveux: "#2b2623",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kanta noguchi": {
		peau: "#dba294",
		cheveux: "#2e262a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kanta ogawa": {
		peau: "#ce8d83",
		cheveux: "#1f1917",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kanta omata": {
		peau: "#b5764b",
		cheveux: "#422b1a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"kanta yamamoto": {
		peau: "#d39e78",
		cheveux: "#1d1916",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kanta yoshida": {
		peau: "#dfae95",
		cheveux: "#342e27",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kantaro tajima": {
		peau: "#dcac98",
		cheveux: "#2e2b2a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kanto watanabe": {
		peau: "#dda8a0",
		cheveux: "#2c2624",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kanzo schinckel": {
		peau: "#c18670",
		cheveux: "#221f1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kaoru tsuruta": {
		peau: "#deb08f",
		cheveux: "#26201d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kapa waimana": {
		peau: "#cf9f8c",
		cheveux: "#1d1d1e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kapeliele pifeleti jr": {
		peau: "#ba8b72",
		cheveux: "#171717",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kareem khalik": {
		peau: "#7f543e",
		cheveux: "#191916",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"karl anthony martin": {
		peau: "#d5ada8",
		cheveux: "#211813",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"karl sorin": {
		tailleCm: 189,
		poidsKg: 128,
		peau: "#e6b5a6",
		cheveux: "#513d35",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"karl wilkins": {
		tailleCm: 201,
		poidsKg: 107,
		peau: "#cc9e8b",
		cheveux: "#7c614d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"karsen talalua": {
		tailleCm: 177,
		poidsKg: 91,
		peau: "#b17862",
		cheveux: "#322d2d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kasende daniel": {
		peau: "#ae7752",
		cheveux: "#242224",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"katende tumba": {
		peau: "#93654e",
		cheveux: "#2d2522",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"katlego letebele": {
		peau: "#89533c",
		cheveux: "#1c201a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"katsuki ishizuka": {
		peau: "#ac8265",
		cheveux: "#191715",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"katsuto hatanaka": {
		peau: "#c28670",
		cheveux: "#261e1b",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"katsuto kubo": {
		peau: "#c59471",
		cheveux: "#2a2420",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"katsuya okuma": {
		peau: "#c18b80",
		cheveux: "#312a2a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"katsuyuki hoshino": {
		peau: "#d5a089",
		cheveux: "#2a2523",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kauri tipene grace": {
		peau: "#ba9379",
		cheveux: "#151414",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kauvaka kaivelata": {
		peau: "#c38d70",
		cheveux: "#211f1e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kavaia tagivetaua": {
		peau: "#bd6f57",
		cheveux: "#372b27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kaveinga finau": {
		peau: "#bc9071",
		cheveux: "#453831",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kaylum boshier": {
		peau: "#dc9772",
		cheveux: "#463a47",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"kazufumi yamasuga": {
		peau: "#cea27f",
		cheveux: "#201c1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazuhiro kawata": {
		peau: "#c49c87",
		cheveux: "#171514",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kazuhiro koike": {
		peau: "#dba592",
		cheveux: "#2a2828",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazuhiro taniguchi": {
		peau: "#ce9988",
		cheveux: "#272426",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"kazuki asakura": {
		peau: "#dda095",
		cheveux: "#221e25",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kazuki ban": {
		peau: "#d9a487",
		cheveux: "#312f2f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazuki himeno": {
		peau: "#d29f85",
		cheveux: "#282523",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazuki ikemura": {
		peau: "#daa69d",
		cheveux: "#231f26",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kazuki ishida": {
		peau: "#c3846b",
		cheveux: "#2d221d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazuki kato": {
		peau: "#e1aea0",
		cheveux: "#2b2a2d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazuki kurizaki": {
		peau: "#d49c74",
		cheveux: "#23201b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazuki yasui": {
		peau: "#c4947a",
		cheveux: "#211b13",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazuma matsuda": {
		peau: "#84513e",
		cheveux: "#171512",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazuma nishi": {
		peau: "#e2a584",
		cheveux: "#272422",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kazuma shimane": {
		peau: "#c38b7a",
		cheveux: "#252221",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kazuma ueda": {
		peau: "#bf8c73",
		cheveux: "#2c2726",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazuma yoshimura": {
		peau: "#b5807a",
		cheveux: "#191414",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazunari takagi": {
		peau: "#c99a76",
		cheveux: "#26201b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kazushi murata": {
		peau: "#9d7666",
		cheveux: "#292121",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kazushi ochi": {
		peau: "#c68e7c",
		cheveux: "#1d1816",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kazuto tokunaga": {
		peau: "#c28e75",
		cheveux: "#181614",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kazuya yamamura": {
		peau: "#e0b299",
		cheveux: "#3d3634",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keagan johannes": {
		peau: "#b77f64",
		cheveux: "#28221b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"keagen faria": {
		peau: "#cc7b4a",
		cheveux: "#2d1b11",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keanu evans": {
		peau: "#be8578",
		cheveux: "#5b2c30",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kebble oli": {
		peau: "#c3856a",
		cheveux: "#4a382a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"keddie harrison": {
		peau: "#bf8574",
		cheveux: "#543d33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"keelan giles": {
		tailleCm: 171,
		poidsKg: 73,
		peau: "#966c53",
		cheveux: "#221a19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"keenan hugo": {
		peau: "#a17260",
		cheveux: "#252119",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"kei ono": {
		peau: "#c1846a",
		cheveux: "#211d18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kei sato": {
		peau: "#a67c69",
		cheveux: "#2d2725",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kei shibuya": {
		peau: "#c49675",
		cheveux: "#1e1a19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kei takusagawa": {
		peau: "#a27a5c",
		cheveux: "#151413",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kei toma": {
		peau: "#c59487",
		cheveux: "#3a302d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"keiichi kaneko": {
		peau: "#a87359",
		cheveux: "#1e1b19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"keijiro tamefusa": {
		peau: "#c79487",
		cheveux: "#201a1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"keillen cullen": {
		peau: "#aa8176",
		cheveux: "#332b28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"keiran williams": {
		tailleCm: 183,
		poidsKg: 79,
		peau: "#b68574",
		cheveux: "#70533f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"keiron assiratti": {
		tailleCm: 183,
		poidsKg: 109,
		peau: "#bb8787",
		cheveux: "#403c3f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"keishin iwamoto": {
		peau: "#c5928c",
		cheveux: "#292220",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keisuke kikuta": {
		peau: "#d88a57",
		cheveux: "#1a110a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"keisuke maeda": {
		peau: "#b4816a",
		cheveux: "#1a1a18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"keisuke moriya": {
		peau: "#cda088",
		cheveux: "#1b1c1e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"keisuke nakamoto": {
		peau: "#d6a492",
		cheveux: "#232121",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"keisuke yamazoe": {
		peau: "#cc9476",
		cheveux: "#1c1816",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keita doi": {
		peau: "#c0877a",
		cheveux: "#150f0e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keita fujiwara": {
		peau: "#a36d54",
		cheveux: "#201c17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keita ichikawa": {
		peau: "#9f7467",
		cheveux: "#211b1b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"keita inagaki": {
		peau: "#d49b7b",
		cheveux: "#282524",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keita kimura": {
		peau: "#d8824a",
		cheveux: "#281f15",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keita kobayasi": {
		peau: "#d47c4a",
		cheveux: "#261d14",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"keita miyauchi": {
		peau: "#c8856b",
		cheveux: "#211e1e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"keita terada": {
		peau: "#b9775c",
		cheveux: "#372316",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keitaro hitora": {
		peau: "#aa6e57",
		cheveux: "#111110",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"keitatsu motoyama": {
		peau: "#ac856a",
		cheveux: "#13110e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"keito aoki": {
		peau: "#d9a28a",
		cheveux: "#342f2d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keito hayashi": {
		peau: "#dbb197",
		cheveux: "#2e2b2c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keito honda": {
		peau: "#ba876a",
		cheveux: "#1f1714",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"keito tahara": {
		peau: "#df9e90",
		cheveux: "#302a32",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"keke morabe": {
		peau: "#a97463",
		cheveux: "#192b31",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"kelleher griffiths dylan": {
		peau: "#ca9883",
		cheveux: "#473329",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kelleher ronan": {
		peau: "#976452",
		cheveux: "#3a2a20",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"kelly dan": {
		peau: "#c17d62",
		cheveux: "#ae1b22",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"kemeny josh": {
		peau: "#b9857f",
		cheveux: "#3f2a20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kemsley mathias": {
		tailleCm: 185,
		poidsKg: 113,
		peau: "#93635c",
		cheveux: "#2f231f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"kemu valetini": {
		peau: "#b8846a",
		cheveux: "#1a1613",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ken chiba": {
		peau: "#cd977f",
		cheveux: "#29211d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ken hiyoshi": {
		peau: "#d69983",
		cheveux: "#1f1d1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ken nakashima": {
		peau: "#cd9a7f",
		cheveux: "#1c1715",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ken osanai": {
		peau: "#b47f6f",
		cheveux: "#1e1917",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ken tonobe": {
		peau: "#9e7668",
		cheveux: "#231d20",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kendellen alex": {
		peau: "#c67f6d",
		cheveux: "#602c21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kengo gunji": {
		peau: "#d3a088",
		cheveux: "#212020",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kengo kitagawa": {
		peau: "#e7b9b1",
		cheveux: "#2a2424",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kengo nakamura": {
		peau: "#a47855",
		cheveux: "#171414",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kengo nonaka": {
		peau: "#ae7752",
		cheveux: "#1f1c1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kenji hayata": {
		peau: "#d19f7f",
		cheveux: "#201a17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kenji nigara": {
		peau: "#c9947d",
		cheveux: "#1b1816",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kenji sato": {
		peau: "#d19c8c",
		cheveux: "#292624",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kenkichi yanagawa": {
		peau: "#dcac9d",
		cheveux: "#2d282b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kennedy sylvester": {
		tailleCm: 208,
		poidsKg: 116,
		peau: "#ab7d68",
		cheveux: "#100e0c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kennelly conor": {
		peau: "#d99a8a",
		cheveux: "#522716",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kennta kitayama": {
		peau: "#d0a390",
		cheveux: "#271e1a",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"kennta ueda": {
		peau: "#c78763",
		cheveux: "#3b2e26",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kennto yamamoto": {
		peau: "#ba7959",
		cheveux: "#2d231d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kenny joshua": {
		peau: "#b67967",
		cheveux: "#1f1f17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kenshi yamamoto": {
		peau: "#c4907d",
		cheveux: "#1f1f21",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kenshin takada": {
		peau: "#ca8768",
		cheveux: "#181815",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kensho kawamura": {
		peau: "#a96b52",
		cheveux: "#181513",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kenta fukuda": {
		peau: "#c89b90",
		cheveux: "#251f1d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kenta hirai": {
		peau: "#dda48f",
		cheveux: "#282729",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kenta iemura": {
		peau: "#c39d87",
		cheveux: "#1d1916",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kenta kobayashi": {
		peau: "#cc978d",
		cheveux: "#232121",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kenta komura": {
		peau: "#dfb395",
		cheveux: "#1c1c1c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kenta matsuoka": {
		peau: "#a77d6d",
		cheveux: "#2a1f1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kenta tanaka": {
		peau: "#99624c",
		cheveux: "#1a1815",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kenta tokuda": {
		peau: "#cf9579",
		cheveux: "#312d2b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kenta yamashita": {
		peau: "#c19a7f",
		cheveux: "#1e1c19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kentaro iwanaga": {
		peau: "#c89781",
		cheveux: "#1b1a18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kentaro nagatomi": {
		peau: "#bd815f",
		cheveux: "#191412",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kentaro nanimatsu": {
		peau: "#dfa988",
		cheveux: "#18190e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kentaro obata": {
		peau: "#c88667",
		cheveux: "#261f1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kentaro otsuka": {
		peau: "#deab90",
		cheveux: "#2e2b29",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kentaro sugimori": {
		peau: "#a77f67",
		cheveux: "#13100e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kentaro ueno": {
		peau: "#d9a79c",
		cheveux: "#252025",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kentarou fujii": {
		peau: "#bf9076",
		cheveux: "#1e1b1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kento grateley": {
		peau: "#ac877d",
		cheveux: "#322724",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kento miyata": {
		peau: "#be886d",
		cheveux: "#151413",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kento mizutani": {
		peau: "#da9d93",
		cheveux: "#272026",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kenya nishikawa": {
		peau: "#c89b79",
		cheveux: "#1a1816",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kepueli tuipulotu": {
		peau: "#b07656",
		cheveux: "#120c08",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"kerman aurrekoetxea alegria": {
		peau: "#d9a18a",
		cheveux: "#29211b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kerr johnston": {
		tailleCm: 192,
		poidsKg: 98,
		peau: "#c2937c",
		cheveux: "#1c1b1c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"kerr yule": {
		tailleCm: 187,
		poidsKg: 96,
		peau: "#d49b84",
		cheveux: "#624730",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kershawl sykes martin": {
		peau: "#bc8869",
		cheveux: "#1c1a18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kevin firmin": {
		tailleCm: 185,
		poidsKg: 103,
		peau: "#d39b85",
		cheveux: "#9d705f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"kevin lebreton": {
		tailleCm: 178,
		poidsKg: 88,
		peau: "#b48058",
		cheveux: "#312318",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"kevin noah": {
		tailleCm: 186,
		poidsKg: 103,
		peau: "#76523e",
		cheveux: "#271f18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"khalik kareem": {
		peau: "#7f543e",
		cheveux: "#191916",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"khan imad": {
		peau: "#ca8960",
		cheveux: "#151a11",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"khutha mchunu": {
		peau: "#6d4533",
		cheveux: "#493026",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"kian hire": {
		tailleCm: 190,
		poidsKg: 111,
		peau: "#b38377",
		cheveux: "#402e27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kienori go": {
		peau: "#c48375",
		cheveux: "#211f1e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kieran hardy": {
		tailleCm: 190,
		poidsKg: 82,
		peau: "#a66c56",
		cheveux: "#30261f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kieran marmion": {
		tailleCm: 180,
		poidsKg: 80,
		peau: "#ce8d6d",
		cheveux: "#6a4f32",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"kieran ryan": {
		tailleCm: 180,
		poidsKg: 103,
		peau: "#db968a",
		cheveux: "#872f2a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"kieran treadwell": {
		tailleCm: 203,
		poidsKg: 106,
		peau: "#b57761",
		cheveux: "#5c361f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"kieran verden": {
		tailleCm: 180,
		poidsKg: 108,
		peau: "#c78a75",
		cheveux: "#1e1610",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kiichi takagi": {
		peau: "#b27e6f",
		cheveux: "#140e0c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kiichi uezato": {
		peau: "#c99479",
		cheveux: "#1d1b19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kilgallen diarmuid": {
		peau: "#c17b66",
		cheveux: "#6d2222",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"killian geraci": {
		tailleCm: 205,
		poidsKg: 112,
		peau: "#cd8564",
		cheveux: "#7b3d17",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"killian taofifenua": {
		tailleCm: 174,
		poidsKg: 105,
		peau: "#ab714e",
		cheveux: "#17130f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"killian tixeront": {
		tailleCm: 191,
		poidsKg: 102,
		peau: "#c1927e",
		cheveux: "#403025",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kim kihyun": {
		peau: "#ce9c78",
		cheveux: "#1c1916",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kim suryung": {
		peau: "#d29a7e",
		cheveux: "#151515",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kingi jadin": {
		peau: "#95654c",
		cheveux: "#0e0908",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kingsley uys": {
		peau: "#ae6f6c",
		cheveux: "#30211c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kini naholo": {
		peau: "#9e654c",
		cheveux: "#402b22",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"kippei ishida": {
		peau: "#cfa380",
		cheveux: "#261f1c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kippei taninaka": {
		peau: "#d9aa92",
		cheveux: "#413d38",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kiran mc donald": {
		peau: "#9e644d",
		cheveux: "#714f3e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"kirby myhill": {
		peau: "#7e5a5b",
		cheveux: "#35232c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"kirill fraindt": {
		tailleCm: 202,
		poidsKg: 89,
		peau: "#e9bcab",
		cheveux: "#986340",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kirsten jannes": {
		peau: "#9e6b58",
		cheveux: "#4f2d19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kitione salawa junior": {
		peau: "#a2705a",
		cheveux: "#231d1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kiyoshi ishii": {
		peau: "#d4997a",
		cheveux: "#1b1a17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"klayton thorn": {
		peau: "#b48168",
		cheveux: "#20222a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"klein shilo": {
		peau: "#ce9f98",
		cheveux: "#3e3432",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"kleo labarbe": {
		tailleCm: 179,
		poidsKg: 66,
		peau: "#aa7d67",
		cheveux: "#362c26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kleyn jean": {
		peau: "#c97e6a",
		cheveux: "#4b1f1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"klopper francois": {
		peau: "#905847",
		cheveux: "#231c19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kloska george": {
		peau: "#bd8276",
		cheveux: "#5a463e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"knight ciaran": {
		peau: "#bc7976",
		cheveux: "#2d1d1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ko kojima": {
		peau: "#bf8d7e",
		cheveux: "#120f0e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ko sato": {
		peau: "#dba78a",
		cheveux: "#524d42",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koch vincent": {
		peau: "#c29694",
		cheveux: "#8d6f59",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"kodai okazaki": {
		peau: "#d0aa8c",
		cheveux: "#211e1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kodai ono": {
		peau: "#cc9176",
		cheveux: "#433226",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kodai takahashi": {
		peau: "#d09c8e",
		cheveux: "#312f33",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"koegelenberg gideon": {
		peau: "#bf866f",
		cheveux: "#252524",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"koen bloemen": {
		tailleCm: 206,
		poidsKg: 100,
		peau: "#b9875a",
		cheveux: "#4a3816",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"koga nezuka": {
		peau: "#cc9e8f",
		cheveux: "#2d2728",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kohei horigome": {
		peau: "#db9f78",
		cheveux: "#3c3229",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"kohei ishigaki": {
		peau: "#d59a80",
		cheveux: "#4a372e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kohei kamei": {
		peau: "#cb9e8c",
		cheveux: "#1f1f1f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kohei kire": {
		peau: "#b47c5f",
		cheveux: "#171311",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kohei matsunaga": {
		peau: "#c49178",
		cheveux: "#1c1916",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kohei takahashi": {
		peau: "#d8a993",
		cheveux: "#1c1a19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kohei tanaka": {
		peau: "#c89c8f",
		cheveux: "#252221",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kohei yasuda": {
		peau: "#b47765",
		cheveux: "#221c1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kohki matsumoto": {
		peau: "#cb8c75",
		cheveux: "#1e1c19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kohki sato": {
		peau: "#c5896e",
		cheveux: "#1b1917",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koichi endo": {
		peau: "#cc967d",
		cheveux: "#22211f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koichi matsuura": {
		peau: "#543d2c",
		cheveux: "#24170d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"koji iino": {
		peau: "#c18070",
		cheveux: "#211f1e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koji okamura": {
		peau: "#9d654d",
		cheveux: "#1b1916",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kojiro arito": {
		peau: "#c5917a",
		cheveux: "#201d1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kok werner": {
		peau: "#c7896b",
		cheveux: "#583e32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"koki hida": {
		peau: "#cf977f",
		cheveux: "#231c1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"koki iida": {
		peau: "#d79d90",
		cheveux: "#27222a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"koki miyasaka": {
		peau: "#dea594",
		cheveux: "#382d2b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koki miyashita": {
		peau: "#e2b9ad",
		cheveux: "#2f2e2f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"koki nakano": {
		peau: "#c39588",
		cheveux: "#282322",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"koki saito": {
		peau: "#dba085",
		cheveux: "#262222",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koki takeyama": {
		peau: "#d09b80",
		cheveux: "#282624",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kolinio ramoka": {
		tailleCm: 188,
		poidsKg: 101,
		peau: "#b2775a",
		cheveux: "#322b29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"kolisi siya": {
		peau: "#7a4944",
		cheveux: "#242120",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"komiti junior alainuuese": {
		peau: "#b36d52",
		cheveux: "#1b1818",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"konstantine mikautadze": {
		tailleCm: 196,
		poidsKg: 116,
		peau: "#bd7d5e",
		cheveux: "#2b2119",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kosei kanda": {
		peau: "#d79786",
		cheveux: "#231e24",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"kosei miki": {
		peau: "#d9a68e",
		cheveux: "#2d2b2b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kosei nakamura": {
		peau: "#de9a7c",
		cheveux: "#36302b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kosei otani": {
		peau: "#b28770",
		cheveux: "#1e1a17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koshi emoto": {
		peau: "#ad8765",
		cheveux: "#1a1716",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koshi kato": {
		peau: "#b88576",
		cheveux: "#141414",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "short_beard"
	},
	"kosho muto": {
		peau: "#d7a37f",
		cheveux: "#2a2420",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kosuke horikoshi": {
		peau: "#b06c5c",
		cheveux: "#1c1a19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kosuke oike": {
		peau: "#c79477",
		cheveux: "#2a1c15",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kosuke shimoe": {
		peau: "#ca7655",
		cheveux: "#322014",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kosuke sugiura": {
		peau: "#da9d88",
		cheveux: "#242120",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kosuke urabe": {
		peau: "#b0806c",
		cheveux: "#1e1b18",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"kota hojo": {
		peau: "#b98d74",
		cheveux: "#231b17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kota iwamura": {
		peau: "#c68e6e",
		cheveux: "#1a1a16",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kota kaishi": {
		peau: "#cd9a87",
		cheveux: "#1c1a1c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kota mitake": {
		peau: "#d89f7b",
		cheveux: "#1f1b18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kota moriyama": {
		peau: "#c0907a",
		cheveux: "#181716",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kota nagashima": {
		peau: "#cd9a85",
		cheveux: "#231c16",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kota nakamura": {
		peau: "#ae846c",
		cheveux: "#131110",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kotaro hatada": {
		peau: "#b47e71",
		cheveux: "#1a1413",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kotaro hosoki": {
		peau: "#c5877a",
		cheveux: "#23201f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kotaro ito": {
		peau: "#b17751",
		cheveux: "#291f19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kotaro matsushima": {
		peau: "#9e6451",
		cheveux: "#1c1917",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kotaro murakami": {
		peau: "#dba892",
		cheveux: "#160a07",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kotaro nakao": {
		peau: "#ca8f70",
		cheveux: "#231d1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kotaro takahashi": {
		peau: "#b27559",
		cheveux: "#161513",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kotaro tatsuno": {
		peau: "#b17d6b",
		cheveux: "#141313",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kotze jj": {
		peau: "#a97152",
		cheveux: "#241b11",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kouga yoshida": {
		peau: "#c8987e",
		cheveux: "#1c1512",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kouki arai": {
		peau: "#c79a74",
		cheveux: "#2c2420",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kouki hattori": {
		peau: "#c68a71",
		cheveux: "#211e1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"kousei tamaki": {
		peau: "#b18172",
		cheveux: "#1a1210",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koushiro shigenobu": {
		peau: "#c38e82",
		cheveux: "#1b1a19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kouta oyabu": {
		peau: "#d6a893",
		cheveux: "#2b2929",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koutarou ohashi": {
		peau: "#cc8b66",
		cheveux: "#181615",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koyo adachi": {
		peau: "#d7a498",
		cheveux: "#2f2d31",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"koyo mitsunaga": {
		peau: "#cc896b",
		cheveux: "#201a18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kriel david": {
		peau: "#a4715f",
		cheveux: "#3a291e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"krumov leonard": {
		peau: "#a98375",
		cheveux: "#2e3b5b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"kumpei onishi": {
		peau: "#d9a593",
		cheveux: "#32302e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kumsu lee": {
		peau: "#d09f88",
		cheveux: "#252120",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"kundiona cleopas": {
		peau: "#5d312b",
		cheveux: "#1a1311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kunene hakeem": {
		peau: "#7b4c35",
		cheveux: "#22211c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kuniya sonoki": {
		peau: "#b88177",
		cheveux: "#181516",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kurt lee arendse": {
		peau: "#b37757",
		cheveux: "#1c1f16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kurtis mac donald": {
		peau: "#ca9177",
		cheveux: "#1f1a15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kurtley beale": {
		peau: "#985c3a",
		cheveux: "#573925",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"kwagga smith": {
		peau: "#ce9e92",
		cheveux: "#49382d",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"kye oates": {
		peau: "#cb8b77",
		cheveux: "#67483b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"kylan hamdaoui": {
		tailleCm: 177,
		poidsKg: 83,
		peau: "#c28e72",
		cheveux: "#322f2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"kyle brown": {
		peau: "#bb6c48",
		cheveux: "#110804",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"kyle preston": {
		peau: "#cd9c87",
		cheveux: "#3d2a1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kyle rowe": {
		tailleCm: 179,
		poidsKg: 76,
		peau: "#be8970",
		cheveux: "#523b2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kyle sinckler": {
		tailleCm: 183,
		poidsKg: 114,
		peau: "#a3634e",
		cheveux: "#392b22",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"kyle steyn": {
		tailleCm: 193,
		poidsKg: 92,
		peau: "#cb9680",
		cheveux: "#694b39",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"kylian jaminet": {
		tailleCm: 196,
		poidsKg: 95,
		peau: "#d29780",
		cheveux: "#513c33",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"kylian laurans": {
		tailleCm: 181,
		poidsKg: 92,
		peau: "#b58365",
		cheveux: "#62482e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"kyllian ringuet": {
		tailleCm: 201,
		poidsKg: 95,
		peau: "#965e50",
		cheveux: "#040303",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"kyo yoshida": {
		peau: "#cf957c",
		cheveux: "#232320",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kyogo okano": {
		peau: "#dc9d87",
		cheveux: "#2a2728",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kyohei yamasawa": {
		peau: "#c49275",
		cheveux: "#312521",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kyoji takano": {
		peau: "#b98878",
		cheveux: "#16100e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"kyosuke horie": {
		peau: "#a77161",
		cheveux: "#100e0d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kyren taumoefolau": {
		peau: "#b66a46",
		cheveux: "#0b0503",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"kyungmun wang": {
		peau: "#c29074",
		cheveux: "#1d1b19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"lachie anderson": {
		peau: "#b8837f",
		cheveux: "#282121",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lachie shaw": {
		peau: "#bd836d",
		cheveux: "#45362a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"lachlan boshier": {
		peau: "#be8878",
		cheveux: "#322824",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"lachlan hooper": {
		peau: "#d9978d",
		cheveux: "#483124",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"lachlan lonergan": {
		peau: "#c39184",
		cheveux: "#2d292e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"lachlan osborne": {
		peau: "#ae857e",
		cheveux: "#665344",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"lachlan william swinton": {
		peau: "#9a6a5a",
		cheveux: "#241c18",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"lahiff max": {
		peau: "#af7057",
		cheveux: "#32271e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lake dewi": {
		peau: "#b0827f",
		cheveux: "#533c37",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lalakai foketi": {
		tailleCm: 189,
		poidsKg: 96,
		peau: "#d0865f",
		cheveux: "#3f2f2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lalomilo lalomilo": {
		tailleCm: 180,
		poidsKg: 98,
		peau: "#be946b",
		cheveux: "#836b54",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"lamaro michele": {
		peau: "#b17c64",
		cheveux: "#39291a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"lamin dieng saito": {
		peau: "#815e48",
		cheveux: "#0e0d0c",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"lancaster dan": {
		peau: "#c4947d",
		cheveux: "#574535",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"langdon curtis": {
		peau: "#c59386",
		cheveux: "#3d2623",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"langton cryer barny": {
		peau: "#c58976",
		cheveux: "#3e2820",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"larmour jordan": {
		peau: "#bf826a",
		cheveux: "#433122",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"larry sulunga": {
		peau: "#daa38e",
		cheveux: "#222123",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"larry tipoai luteru": {
		peau: "#c8916d",
		cheveux: "#08100b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"larzlo sword": {
		peau: "#cb9579",
		cheveux: "#23211e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"lasha macharashvili": {
		tailleCm: 192,
		poidsKg: 121,
		peau: "#ae7752",
		cheveux: "#2f2220",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lasha pkhakadze": {
		tailleCm: 179,
		poidsKg: 114,
		peau: "#ca835e",
		cheveux: "#302215",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"lasha tabidze": {
		tailleCm: 185,
		poidsKg: 111,
		peau: "#a27463",
		cheveux: "#6e584e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"lasisi temi": {
		peau: "#a25740",
		cheveux: "#2b2016",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lata tangimana": {
		peau: "#88573f",
		cheveux: "#1a1916",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"latu silatolu latu": {
		peau: "#d1856b",
		cheveux: "#735244",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"lawrence alun": {
		peau: "#bb8885",
		cheveux: "#2c282f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"le roux coetzee": {
		peau: "#c3947f",
		cheveux: "#362c24",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"le roux malan": {
		tailleCm: 190,
		poidsKg: 94,
		peau: "#bd8c83",
		cheveux: "#3d2f2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"le roux willie": {
		peau: "#af7c70",
		cheveux: "#3a322d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ledua mau": {
		tailleCm: 190,
		poidsKg: 92,
		peau: "#7d5645",
		cheveux: "#3b2720",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lee barron": {
		tailleCm: 191,
		poidsKg: 99,
		peau: "#e09c84",
		cheveux: "#503022",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lee fitzpatrick": {
		peau: "#c58a77",
		cheveux: "#292216",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"lee marvin mazibuko": {
		peau: "#775c56",
		cheveux: "#242930",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"leftheri zigiriadis": {
		peau: "#b27668",
		cheveux: "#191312",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"leggatt jones carwyn": {
		peau: "#9c6c63",
		cheveux: "#49242a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"lehopoame leota": {
		peau: "#b06f51",
		cheveux: "#0c0a08",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"leicester fainga anuku": {
		peau: "#b88966",
		cheveux: "#181715",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"lekima nasamila": {
		peau: "#855538",
		cheveux: "#26201c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"lekima vuda tagitagivalu": {
		peau: "#8b4c3c",
		cheveux: "#1b1111",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lekso kaulashvili": {
		tailleCm: 186,
		poidsKg: 121,
		peau: "#c78a7c",
		cheveux: "#025e62",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"lemeki lomano lava": {
		peau: "#db9b85",
		cheveux: "#282628",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"lenni nouchi": {
		tailleCm: 192,
		poidsKg: 102,
		peau: "#c6928a",
		cheveux: "#201813",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lenny alifanety": {
		tailleCm: 193,
		poidsKg: 120,
		peau: "#784d41",
		cheveux: "#140f10",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"leny broncan": {
		tailleCm: 189,
		poidsKg: 74,
		peau: "#c68a6d",
		cheveux: "#2d1c12",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"leo aouf": {
		tailleCm: 185,
		poidsKg: 108,
		peau: "#c08b79",
		cheveux: "#342621",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"leo barre": {
		tailleCm: 184,
		poidsKg: 80,
		peau: "#d29c8e",
		cheveux: "#745849",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"leo carbonneau": {
		tailleCm: 169,
		poidsKg: 73,
		peau: "#cd8c72",
		cheveux: "#452816",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"leo chauvin": {
		tailleCm: 185,
		poidsKg: 93,
		peau: "#c88c73",
		cheveux: "#583d2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"leo labarthe": {
		tailleCm: 197,
		poidsKg: 101,
		peau: "#bb8069",
		cheveux: "#2d221c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"leo morand bruyat": {
		tailleCm: 191,
		poidsKg: 99,
		peau: "#b17764",
		cheveux: "#5d4530",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"leolin zas": {
		peau: "#976246",
		cheveux: "#1a1d13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"leonard krumov": {
		tailleCm: 197,
		poidsKg: 115,
		peau: "#a98375",
		cheveux: "#2e3b5b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"leonardo marin": {
		tailleCm: 184,
		poidsKg: 89,
		peau: "#c49075",
		cheveux: "#3b281c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"leonel oviedo": {
		peau: "#c27b5f",
		cheveux: "#211e16",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"leroy carter": {
		peau: "#b17962",
		cheveux: "#19120e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lester etien": {
		tailleCm: 183,
		poidsKg: 90,
		peau: "#85635a",
		cheveux: "#4e3630",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"letebele katlego": {
		peau: "#89533c",
		cheveux: "#1c201a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"levan chilachava": {
		tailleCm: 192,
		poidsKg: 126,
		peau: "#c78176",
		cheveux: "#9c5f55",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"levani botia veivuke": {
		peau: "#a8614b",
		cheveux: "#4b332f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"levi aumua": {
		peau: "#d69e7d",
		cheveux: "#29211d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"levi douglas": {
		tailleCm: 194,
		poidsKg: 113,
		peau: "#956756",
		cheveux: "#524343",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"lewis bean": {
		tailleCm: 204,
		poidsKg: 119,
		peau: "#c89988",
		cheveux: "#53463d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"lewis chessum": {
		tailleCm: 212,
		poidsKg: 110,
		peau: "#a86a5f",
		cheveux: "#3d1a0f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"lewis dillon": {
		peau: "#dfa593",
		cheveux: "#3c2d28",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"lewis edwards": {
		tailleCm: 200,
		poidsKg: 93,
		peau: "#b0807b",
		cheveux: "#6b513d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lewis ethan": {
		peau: "#b8877c",
		cheveux: "#343038",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"lewis hughes shane": {
		peau: "#d08b7a",
		cheveux: "#523b2d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"lewis jack": {
		peau: "#b6817a",
		cheveux: "#4e3329",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"lewis jones": {
		tailleCm: 198,
		poidsKg: 95,
		peau: "#a57c6e",
		cheveux: "#60473d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"lewis lloyd": {
		tailleCm: 185,
		poidsKg: 99,
		peau: "#a7796c",
		cheveux: "#403735",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lewis ludlow": {
		tailleCm: 185,
		poidsKg: 95,
		peau: "#ba7b72",
		cheveux: "#3a211d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lewis noon": {
		tailleCm: 188,
		poidsKg: 66,
		peau: "#bb6f53",
		cheveux: "#4a2d1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"lewis pearson": {
		tailleCm: 189,
		poidsKg: 105,
		peau: "#c8816d",
		cheveux: "#2b252b",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"lewis tomi": {
		peau: "#a7766b",
		cheveux: "#3d2d27",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"lewis wesley ludlam": {
		peau: "#bb7359",
		cheveux: "#1f1b1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"li tevita": {
		peau: "#d79578",
		cheveux: "#323031",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"liakimatagi moli": {
		peau: "#c1815d",
		cheveux: "#514138",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"liam belcher": {
		tailleCm: 182,
		poidsKg: 96,
		peau: "#946765",
		cheveux: "#2f2c2f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"liam bowron": {
		peau: "#c89480",
		cheveux: "#2f303c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"liam coltman": {
		peau: "#c48f81",
		cheveux: "#916955",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"liam coombes fabling": {
		tailleCm: 177,
		poidsKg: 79,
		peau: "#ba8761",
		cheveux: "#413321",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"liam couturier": {
		tailleCm: 187,
		poidsKg: 105,
		peau: "#d38d87",
		cheveux: "#3f2624",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"liam edwards": {
		peau: "#b58b7d",
		cheveux: "#3a2f28",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"liam gill": {
		peau: "#b98161",
		cheveux: "#4c3d30",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"liam jack": {
		peau: "#d19986",
		cheveux: "#1e1915",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"liam mitchell": {
		peau: "#b47d6f",
		cheveux: "#28201e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"liam molony": {
		peau: "#b0705c",
		cheveux: "#212519",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"liam robson allen": {
		peau: "#c97b5b",
		cheveux: "#513423",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"liam turner": {
		tailleCm: 187,
		poidsKg: 100,
		peau: "#bd8367",
		cheveux: "#52381f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"licata giovanni": {
		peau: "#d39c8d",
		cheveux: "#4e4844",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"liekina kaufusi": {
		peau: "#d79f7c",
		cheveux: "#272523",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"lilian baret": {
		tailleCm: 197,
		poidsKg: 96,
		peau: "#c47147",
		cheveux: "#352518",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lilian rossi": {
		tailleCm: 180,
		poidsKg: 99,
		peau: "#cda991",
		cheveux: "#302b20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lilou brun bourdi": {
		tailleCm: 188,
		poidsKg: 95,
		peau: "#ca8872",
		cheveux: "#352921",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lington ieli": {
		peau: "#a06651",
		cheveux: "#2c2e38",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"lino julien": {
		tailleCm: 181,
		poidsKg: 103,
		peau: "#a17868",
		cheveux: "#1c1511",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"lisala finau": {
		peau: "#bc866a",
		cheveux: "#262421",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"litchfield tom": {
		peau: "#d7a499",
		cheveux: "#38241c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"litelihle bester": {
		peau: "#9e6c55",
		cheveux: "#4f3b28",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"llewellyn max": {
		peau: "#bb8171",
		cheveux: "#382115",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lloyd evan": {
		peau: "#9b6c6f",
		cheveux: "#302830",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"lloyd ioan": {
		peau: "#ae7f7c",
		cheveux: "#3a3439",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"lloyd jac": {
		peau: "#c08870",
		cheveux: "#5d4431",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"lloyd lewis": {
		peau: "#a7796c",
		cheveux: "#403735",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lloyd morgan": {
		peau: "#ca8f7a",
		cheveux: "#5c3e28",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"lo ametlla": {
		peau: "#d39183",
		cheveux: "#261a17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lo banos": {
		peau: "#d89f90",
		cheveux: "#523a2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lo berdeu": {
		peau: "#cf8c6a",
		cheveux: "#3c2a1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lo coly": {
		peau: "#8d5c4a",
		cheveux: "#070607",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lo drouet": {
		peau: "#bd967f",
		cheveux: "#211d1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lo michaux vargas": {
		peau: "#d6a995",
		cheveux: "#877c6e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"lo monin": {
		peau: "#d4a793",
		cheveux: "#4a3c3a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"loader ben": {
		peau: "#94553d",
		cheveux: "#281915",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"loan lavergne": {
		tailleCm: 193,
		poidsKg: 101,
		peau: "#b8776c",
		cheveux: "#352c27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"loan real": {
		tailleCm: 185,
		poidsKg: 94,
		peau: "#b57c78",
		cheveux: "#42352f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"loc credoz": {
		peau: "#b67f60",
		cheveux: "#41332b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"locatelli samuele": {
		peau: "#a07465",
		cheveux: "#3f3d38",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lockett tom": {
		peau: "#c4908a",
		cheveux: "#2d201b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"logan wallace": {
		peau: "#c47b63",
		cheveux: "#563729",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"loic godener": {
		tailleCm: 192,
		poidsKg: 109,
		peau: "#b68159",
		cheveux: "#64512d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"loic varenne": {
		tailleCm: 180,
		poidsKg: 106,
		peau: "#e2ac95",
		cheveux: "#5c372c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lois guerois galisson": {
		tailleCm: 190,
		poidsKg: 115,
		peau: "#cb8577",
		cheveux: "#523933",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"lomig jouanny": {
		tailleCm: 195,
		poidsKg: 85,
		peau: "#d7a194",
		cheveux: "#3c3530",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lon boulier": {
		peau: "#be725d",
		cheveux: "#2b1b12",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"lon darricarrere": {
		peau: "#cfa794",
		cheveux: "#604939",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lood de jager": {
		peau: "#cfa08e",
		cheveux: "#483b3a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"lopeti faifua": {
		peau: "#ac6b4c",
		cheveux: "#11100d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lorcan mcloughlin": {
		peau: "#d79c8b",
		cheveux: "#442d21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lorencio boyer gallardo": {
		tailleCm: 180,
		poidsKg: 112,
		peau: "#c39583",
		cheveux: "#272d2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lorenzo cannone": {
		tailleCm: 189,
		poidsKg: 99,
		peau: "#b37e65",
		cheveux: "#65462c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lorenzo pani": {
		tailleCm: 197,
		poidsKg: 95,
		peau: "#c78f7a",
		cheveux: "#2c3433",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"loris zarantonello": {
		tailleCm: 187,
		poidsKg: 95,
		peau: "#d79181",
		cheveux: "#462e25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lotu inisi": {
		peau: "#c48d6c",
		cheveux: "#5c5140",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"loughman jeremy": {
		peau: "#d49b8e",
		cheveux: "#9a6149",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"louie chapman": {
		peau: "#c48d72",
		cheveux: "#5e4735",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louie gulley": {
		tailleCm: 186,
		poidsKg: 93,
		peau: "#bd826c",
		cheveux: "#251912",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louie hennessey": {
		tailleCm: 187,
		poidsKg: 96,
		peau: "#cb9276",
		cheveux: "#271810",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louie sinclair": {
		tailleCm: 192,
		poidsKg: 83,
		peau: "#be886b",
		cheveux: "#5b3e1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"louie wade": {
		peau: "#ca8c64",
		cheveux: "#2c1e12",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"louis barrere": {
		tailleCm: 172,
		poidsKg: 90,
		peau: "#8d4a2b",
		cheveux: "#342110",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"louis bielle biarrey": {
		tailleCm: 183,
		poidsKg: 72,
		peau: "#b17f63",
		cheveux: "#1b1818",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louis carbonel": {
		tailleCm: 179,
		poidsKg: 79,
		peau: "#d49e8b",
		cheveux: "#55423c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louis couget": {
		tailleCm: 170,
		poidsKg: 70,
		peau: "#a36544",
		cheveux: "#0e100b",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"louis descoux": {
		tailleCm: 191,
		poidsKg: 105,
		peau: "#d8958a",
		cheveux: "#49312a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"louis dupichot": {
		tailleCm: 188,
		poidsKg: 81,
		peau: "#be8870",
		cheveux: "#503a2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"louis foursans bourdette": {
		tailleCm: 172,
		poidsKg: 74,
		peau: "#c69783",
		cheveux: "#4e3931",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louis keziah penverne": {
		peau: "#d58f6e",
		cheveux: "#271917",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louis le brun": {
		tailleCm: 184,
		poidsKg: 92,
		peau: "#ca836e",
		cheveux: "#2d2220",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louis lynagh": {
		tailleCm: 184,
		poidsKg: 91,
		peau: "#c79473",
		cheveux: "#795937",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"louis marrou": {
		tailleCm: 186,
		poidsKg: 94,
		peau: "#d4a59b",
		cheveux: "#574440",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"louis mary": {
		tailleCm: 180,
		poidsKg: 116,
		peau: "#c27a5e",
		cheveux: "#35251a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"louis morland": {
		tailleCm: 188,
		poidsKg: 80,
		peau: "#cb9a6b",
		cheveux: "#594526",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louis rees zammit": {
		tailleCm: 195,
		poidsKg: 88,
		peau: "#b2745f",
		cheveux: "#201a17",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"louis suaud": {
		tailleCm: 189,
		poidsKg: 99,
		peau: "#ba8683",
		cheveux: "#433832",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"louis werchon": {
		tailleCm: 183,
		poidsKg: 78,
		peau: "#c49274",
		cheveux: "#704f35",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louka guilhot": {
		tailleCm: 182,
		poidsKg: 75,
		peau: "#dba594",
		cheveux: "#5e493f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lourens erasmus": {
		peau: "#cd9889",
		cheveux: "#3f3731",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"lousi sam": {
		peau: "#8b6356",
		cheveux: "#46181f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louw elrigh": {
		peau: "#b67f72",
		cheveux: "#2c231d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louw nel": {
		peau: "#c18a70",
		cheveux: "#594634",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"louw wilco": {
		peau: "#b67e6b",
		cheveux: "#372f28",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"lovejoy chawatama": {
		tailleCm: 175,
		poidsKg: 109,
		peau: "#765644",
		cheveux: "#131414",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lowe james": {
		peau: "#9b634b",
		cheveux: "#1f1d19",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lowry mike": {
		peau: "#ce9585",
		cheveux: "#5b3929",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"luan giliomee": {
		peau: "#ae907a",
		cheveux: "#3f3826",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"luatua steven": {
		peau: "#a4694c",
		cheveux: "#151313",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lubabalo dobela": {
		tailleCm: 174,
		poidsKg: 75,
		peau: "#83534d",
		cheveux: "#2a2726",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"luca franceschetto": {
		tailleCm: 193,
		poidsKg: 119,
		peau: "#ba887d",
		cheveux: "#343c41",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"luca morisi": {
		peau: "#ca9584",
		cheveux: "#3a3532",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"luca rizzoli": {
		tailleCm: 178,
		poidsKg: 101,
		peau: "#8f6058",
		cheveux: "#403735",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"luca tabarot": {
		tailleCm: 182,
		poidsKg: 108,
		peau: "#ae7752",
		cheveux: "#2e1912",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"lucas andjisseramatchi": {
		tailleCm: 183,
		poidsKg: 95,
		peau: "#6e463e",
		cheveux: "#22191a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lucas bachelier": {
		tailleCm: 186,
		poidsKg: 93,
		peau: "#ce9376",
		cheveux: "#785d4c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"lucas berti": {
		tailleCm: 170,
		poidsKg: 72,
		peau: "#ce9678",
		cheveux: "#4d372b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lucas blanc": {
		tailleCm: 187,
		poidsKg: 82,
		peau: "#cb9271",
		cheveux: "#443224",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"lucas casey": {
		peau: "#d8997a",
		cheveux: "#51402b",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lucas cashmore": {
		peau: "#bb7856",
		cheveux: "#43342b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lucas costa": {
		tailleCm: 184,
		poidsKg: 92,
		peau: "#c08c75",
		cheveux: "#332822",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lucas da silva": {
		tailleCm: 184,
		poidsKg: 109,
		peau: "#c2805f",
		cheveux: "#35281d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lucas de la rua": {
		tailleCm: 193,
		poidsKg: 94,
		peau: "#9b736c",
		cheveux: "#2f2628",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lucas delort": {
		tailleCm: 183,
		poidsKg: 101,
		peau: "#d0987c",
		cheveux: "#2c2620",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lucas dessaigne": {
		tailleCm: 193,
		poidsKg: 96,
		peau: "#e1b09b",
		cheveux: "#39372e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lucas dubois": {
		tailleCm: 189,
		poidsKg: 84,
		peau: "#ba7d7b",
		cheveux: "#42322f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"lucas martin": {
		tailleCm: 184,
		poidsKg: 93,
		peau: "#cb8272",
		cheveux: "#361e16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lucas martin paulos adler": {
		peau: "#d59c80",
		cheveux: "#211814",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"lucas martins": {
		tailleCm: 190,
		poidsKg: 84,
		peau: "#b5856c",
		cheveux: "#453530",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lucas mensa": {
		tailleCm: 187,
		poidsKg: 83,
		peau: "#be8b62",
		cheveux: "#342c20",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"lucas meret": {
		tailleCm: 173,
		poidsKg: 77,
		peau: "#c2968a",
		cheveux: "#252223",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lucas oudard": {
		tailleCm: 179,
		poidsKg: 81,
		peau: "#bb7759",
		cheveux: "#241a14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"lucas peyresblanques": {
		tailleCm: 186,
		poidsKg: 91,
		peau: "#c18c7a",
		cheveux: "#503a32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lucas rey": {
		tailleCm: 180,
		poidsKg: 92,
		peau: "#c2826d",
		cheveux: "#362e2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lucas schmid": {
		tailleCm: 191,
		poidsKg: 98,
		peau: "#bc7663",
		cheveux: "#502c16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"lucas seyrolle": {
		tailleCm: 180,
		poidsKg: 122,
		peau: "#c79a88",
		cheveux: "#604d40",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lucas tauzin": {
		tailleCm: 188,
		poidsKg: 87,
		peau: "#cba28e",
		cheveux: "#3f302d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lucas velarte": {
		tailleCm: 182,
		poidsKg: 99,
		peau: "#b27d7b",
		cheveux: "#302221",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"lucas vigneres": {
		tailleCm: 186,
		poidsKg: 87,
		peau: "#ae7752",
		cheveux: "#3c2c24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lucas zamora": {
		tailleCm: 174,
		poidsKg: 68,
		peau: "#d0a792",
		cheveux: "#3e3430",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lucchin enrico": {
		peau: "#cc957e",
		cheveux: "#3d3f3e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lucien richardis": {
		tailleCm: 192,
		poidsKg: 81,
		peau: "#c28a6a",
		cheveux: "#2d221d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lucio sordoni": {
		tailleCm: 191,
		poidsKg: 128,
		peau: "#cb9d8b",
		cheveux: "#3e3932",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ludlow lewis": {
		peau: "#ba7b72",
		cheveux: "#3a211d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ludo kolade": {
		tailleCm: 179,
		poidsKg: 84,
		peau: "#8f5a45",
		cheveux: "#1b0f0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ludwig reinhardt": {
		peau: "#b37e6b",
		cheveux: "#1e1916",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"luka azariashvili": {
		tailleCm: 191,
		poidsKg: 114,
		peau: "#ae7752",
		cheveux: "#291d15",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"luka begic": {
		tailleCm: 185,
		poidsKg: 107,
		peau: "#d6997f",
		cheveux: "#422a20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"luka goginava": {
		tailleCm: 183,
		poidsKg: 108,
		peau: "#d5a198",
		cheveux: "#97706b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"luka ivanishvili": {
		tailleCm: 187,
		poidsKg: 95,
		peau: "#b67b65",
		cheveux: "#2c1f1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"luka japaridze": {
		tailleCm: 184,
		poidsKg: 120,
		peau: "#d0a196",
		cheveux: "#203241",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"luka keletaona": {
		tailleCm: 181,
		poidsKg: 77,
		peau: "#c1866a",
		cheveux: "#201a19",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"luka khorbaladze": {
		tailleCm: 187,
		poidsKg: 73,
		peau: "#c87e5a",
		cheveux: "#452f24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"luka maia te rito russell": {
		peau: "#bc846c",
		cheveux: "#342926",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"luka matkava": {
		tailleCm: 174,
		poidsKg: 80,
		peau: "#ca9a68",
		cheveux: "#27241c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"luka nioradze": {
		tailleCm: 182,
		poidsKg: 96,
		peau: "#c7886c",
		cheveux: "#564032",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"luka petriashvili": {
		tailleCm: 181,
		poidsKg: 103,
		peau: "#d78e6c",
		cheveux: "#493223",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"luka plataret": {
		tailleCm: 180,
		poidsKg: 93,
		peau: "#bf7e6a",
		cheveux: "#2f201a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"luka ungiadze": {
		tailleCm: 187,
		poidsKg: 106,
		peau: "#bd7d5f",
		cheveux: "#392b1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"lukas doyhenard": {
		tailleCm: 183,
		poidsKg: 77,
		peau: "#deab8b",
		cheveux: "#332721",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lukas mitu": {
		tailleCm: 179,
		poidsKg: 97,
		peau: "#dd9379",
		cheveux: "#563d30",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"luke aiken": {
		peau: "#b4764d",
		cheveux: "#211b14",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"luke cowan dickie": {
		tailleCm: 180,
		poidsKg: 106,
		peau: "#bd8e7a",
		cheveux: "#0f0b09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"luke davidson": {
		tailleCm: 186,
		poidsKg: 72,
		peau: "#8d5e51",
		cheveux: "#21140e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"luke davies": {
		tailleCm: 170,
		poidsKg: 70,
		peau: "#ae7a68",
		cheveux: "#303035",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"luke evans": {
		tailleCm: 198,
		poidsKg: 112,
		peau: "#bc7761",
		cheveux: "#472118",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"luke green": {
		tailleCm: 186,
		poidsKg: 118,
		peau: "#c6948f",
		cheveux: "#1d0f0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"luke griffiths": {
		tailleCm: 197,
		poidsKg: 116,
		peau: "#c78563",
		cheveux: "#25160b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"luke jacobson": {
		peau: "#9d6652",
		cheveux: "#120d0a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"luke james": {
		tailleCm: 196,
		poidsKg: 87,
		peau: "#be9482",
		cheveux: "#1e1b1c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"luke mcgrath": {
		tailleCm: 174,
		poidsKg: 75,
		peau: "#ab7a65",
		cheveux: "#293627",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"luke morgan": {
		tailleCm: 174,
		poidsKg: 72,
		peau: "#a47567",
		cheveux: "#3d2f2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"luke murphy": {
		peau: "#d18a74",
		cheveux: "#4e281f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"luke northmore": {
		tailleCm: 185,
		poidsKg: 95,
		peau: "#b77866",
		cheveux: "#391f12",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"luke reimer": {
		peau: "#b68776",
		cheveux: "#11100d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"luke scully": {
		peau: "#a67e71",
		cheveux: "#6d5b48",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"luke tagi": {
		tailleCm: 186,
		poidsKg: 120,
		peau: "#945748",
		cheveux: "#191310",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"luke yendle": {
		peau: "#c78d78",
		cheveux: "#573f32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"lukhan salakaia loto": {
		peau: "#8d5749",
		cheveux: "#231c1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lukhanyo am": {
		peau: "#794c34",
		cheveux: "#191713",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lukhanyo vokozela": {
		peau: "#86604f",
		cheveux: "#1c281f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"lulu paea": {
		peau: "#c5886b",
		cheveux: "#302722",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"lumley henry": {
		peau: "#ca9a92",
		cheveux: "#412b1e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"luteru laulala": {
		peau: "#c98961",
		cheveux: "#161810",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"luvuyo pupuma": {
		tailleCm: 180,
		poidsKg: 114,
		peau: "#7c5a48",
		cheveux: "#322823",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"lyam akrab": {
		tailleCm: 174,
		poidsKg: 94,
		peau: "#c48d80",
		cheveux: "#0e0c0e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"lyan pakihivatau": {
		tailleCm: 179,
		poidsKg: 110,
		peau: "#b97244",
		cheveux: "#3d2e26",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"lylian zelioli": {
		peau: "#d49a7e",
		cheveux: "#433229",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"lynagh louis": {
		peau: "#c79473",
		cheveux: "#795937",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"maart dylan": {
		peau: "#7d5d46",
		cheveux: "#3e3731",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"mac grealy": {
		peau: "#c88166",
		cheveux: "#2d2217",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mac harris": {
		peau: "#cba18f",
		cheveux: "#2c2826",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"macarius pereira": {
		tailleCm: 183,
		poidsKg: 95,
		peau: "#cd8a65",
		cheveux: "#27282a",
		yeux: "#587383",
		coiffure: "short",
		barbe: "short_beard"
	},
	"macca springer": {
		peau: "#ce9779",
		cheveux: "#2a221c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"macenzzie duncan": {
		tailleCm: 186,
		poidsKg: 97,
		peau: "#bc7d57",
		cheveux: "#403831",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"macginty aj": {
		peau: "#cd8a69",
		cheveux: "#302319",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mack hansen": {
		tailleCm: 186,
		poidsKg: 84,
		peau: "#c28879",
		cheveux: "#3f3a33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mackenzie martin": {
		tailleCm: 193,
		poidsKg: 108,
		peau: "#a46950",
		cheveux: "#2f251d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"macleod josh": {
		peau: "#b17b67",
		cheveux: "#873c3a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"macs page": {
		tailleCm: 178,
		poidsKg: 83,
		peau: "#b6837d",
		cheveux: "#4b302b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"madosha tambwe": {
		peau: "#533d3b",
		cheveux: "#1d1614",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mael castel": {
		tailleCm: 173,
		poidsKg: 68,
		peau: "#dcab99",
		cheveux: "#6d5543",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mael navizet": {
		peau: "#d2b099",
		cheveux: "#1b1812",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"mael perrin": {
		tailleCm: 191,
		poidsKg: 108,
		peau: "#856c6c",
		cheveux: "#181516",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mahamadou coulibaly": {
		tailleCm: 192,
		poidsKg: 93,
		peau: "#6a4534",
		cheveux: "#21180e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mahe vailanu": {
		peau: "#dfa183",
		cheveux: "#28282a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"mahon ronan": {
		peau: "#b97c68",
		cheveux: "#24281c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"maika tuitubou": {
		peau: "#98715d",
		cheveux: "#1d1a17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"maile siua": {
		peau: "#8e594b",
		cheveux: "#1e1d1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"maito matsuo": {
		peau: "#d79a7b",
		cheveux: "#27282a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"makazole mapimpi": {
		peau: "#78433b",
		cheveux: "#33322c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"makito ishikawa": {
		peau: "#bf8872",
		cheveux: "#211e1c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"makoto iwafuchi": {
		peau: "#cd9b83",
		cheveux: "#181817",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"makoto kato": {
		peau: "#c9987f",
		cheveux: "#171311",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"makoto kurata": {
		peau: "#dd9e8e",
		cheveux: "#2a242a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"makoto torikai": {
		peau: "#b9826b",
		cheveux: "#181717",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"makoto tsuchiya": {
		peau: "#b78577",
		cheveux: "#281d1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"makoto tsutsuguchi": {
		peau: "#b78b6d",
		cheveux: "#181511",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"mal moustin": {
		peau: "#583e39",
		cheveux: "#0c0c0a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"malachi shea hawkes faimanifo": {
		peau: "#a17e74",
		cheveux: "#2b2724",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"malakai fekitoa": {
		tailleCm: 187,
		poidsKg: 91,
		peau: "#84543e",
		cheveux: "#110e0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"malan le roux": {
		peau: "#bd8c83",
		cheveux: "#3d2f2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"malan rabut": {
		peau: "#bf8e64",
		cheveux: "#5c4a32",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"malcolm marx": {
		peau: "#d7a6a3",
		cheveux: "#5f463f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"malend simon nguimbous diyog mouyenga": {
		peau: "#624034",
		cheveux: "#231913",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"malgene ilaua": {
		peau: "#ad805e",
		cheveux: "#3d3327",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"malherbe frans": {
		peau: "#b1735b",
		cheveux: "#1d1a12",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"malik faissal": {
		tailleCm: 181,
		poidsKg: 86,
		peau: "#8a4e3e",
		cheveux: "#0d0a0a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"malo hannoyer": {
		peau: "#99613d",
		cheveux: "#2a2010",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"malo tuitama": {
		peau: "#bf906e",
		cheveux: "#47382d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"malohi suta": {
		tailleCm: 194,
		poidsKg: 120,
		peau: "#b38e79",
		cheveux: "#231f1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"maloni kunawave": {
		peau: "#af7f64",
		cheveux: "#252323",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"mamik mstoian": {
		peau: "#a86655",
		cheveux: "#261d1c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"mamoudou alain meite": {
		peau: "#795243",
		cheveux: "#201c19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"manaaki selby rickit": {
		peau: "#e1b091",
		cheveux: "#282216",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"manaia lape": {
		peau: "#b5734f",
		cheveux: "#1e1814",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"manasa mataele": {
		peau: "#a36d58",
		cheveux: "#664430",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"manase havili": {
		peau: "#ac7259",
		cheveux: "#393431",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"manfredi marco": {
		peau: "#b6866f",
		cheveux: "#29251d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mangan ciaran": {
		peau: "#be7f6a",
		cheveux: "#363628",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mangan diarmuid": {
		peau: "#ac7965",
		cheveux: "#2a2935",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"manie libbok": {
		peau: "#a06b4a",
		cheveux: "#4c3f30",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"manjezi sintu": {
		peau: "#5f3e30",
		cheveux: "#1f1a16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"mann alex": {
		peau: "#b5817c",
		cheveux: "#493836",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mann jack": {
		peau: "#be7a7c",
		cheveux: "#482a2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"manu akauora": {
		peau: "#d49881",
		cheveux: "#1e1c1f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"manu tshituka": {
		peau: "#7e5540",
		cheveux: "#2c2c29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"manu vunipola": {
		peau: "#d6a084",
		cheveux: "#312f2d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"manuel leindekar virginio": {
		peau: "#c29d7c",
		cheveux: "#1d1c19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"manuel portela morais vareiro": {
		peau: "#9e7567",
		cheveux: "#3d352f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"manuel zuliani": {
		tailleCm: 191,
		poidsKg: 101,
		peau: "#b5836e",
		cheveux: "#4a3623",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"manumaua letiu": {
		peau: "#b87d5c",
		cheveux: "#151412",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mapimpi makazole": {
		peau: "#78433b",
		cheveux: "#33322c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"marc palmier": {
		tailleCm: 184,
		poidsKg: 86,
		peau: "#cfae98",
		cheveux: "#38342b",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"marceau marzullo": {
		tailleCm: 187,
		poidsKg: 91,
		peau: "#d09376",
		cheveux: "#211712",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"marcel theunissen": {
		peau: "#a98377",
		cheveux: "#405053",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"marcel van der merwe": {
		tailleCm: 187,
		poidsKg: 121,
		peau: "#b4765c",
		cheveux: "#1b120d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"marcell coetzee": {
		peau: "#a76d5f",
		cheveux: "#1e1a17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"marco fepulea i": {
		tailleCm: 181,
		poidsKg: 117,
		peau: "#a4665c",
		cheveux: "#241717",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"marco manfredi": {
		peau: "#b6866f",
		cheveux: "#29251d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"marco miguel trauth": {
		peau: "#ba887d",
		cheveux: "#40312a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"marco tauleigne": {
		tailleCm: 193,
		poidsKg: 111,
		peau: "#b78f8d",
		cheveux: "#2c292a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"marco van staden": {
		peau: "#b37975",
		cheveux: "#23211d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"marco zanon": {
		tailleCm: 186,
		poidsKg: 92,
		peau: "#c9897a",
		cheveux: "#3a4143",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"marcos gallorini": {
		tailleCm: 190,
		poidsKg: 127,
		peau: "#af7a5e",
		cheveux: "#18110d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"marcos kremer": {
		tailleCm: 197,
		poidsKg: 109,
		peau: "#bc9786",
		cheveux: "#3a322a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"marcus rea": {
		peau: "#cd9884",
		cheveux: "#573a29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"marcus smith": {
		tailleCm: 179,
		poidsKg: 77,
		peau: "#aa6954",
		cheveux: "#180b06",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"marcus street": {
		tailleCm: 185,
		poidsKg: 108,
		peau: "#ba877a",
		cheveux: "#1a100d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"marika koroibete": {
		tailleCm: 184,
		poidsKg: 89,
		peau: "#9f6c57",
		cheveux: "#262220",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"marin boulier": {
		tailleCm: 175,
		poidsKg: 84,
		peau: "#c97861",
		cheveux: "#341b0c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"marin leonardo": {
		peau: "#c49075",
		cheveux: "#3b281c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"marini giulio": {
		peau: "#b77d66",
		cheveux: "#3c3020",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"marino mikaele tu u": {
		peau: "#b0775c",
		cheveux: "#251f1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"maritino nemani": {
		peau: "#c78c78",
		cheveux: "#1f2021",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"marius domon": {
		tailleCm: 183,
		poidsKg: 80,
		peau: "#cc8c78",
		cheveux: "#211c1d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"marius louw": {
		tailleCm: 179,
		poidsKg: 90,
		peau: "#a67a68",
		cheveux: "#241e1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mark abbott": {
		peau: "#cca29e",
		cheveux: "#4c413f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mark donnelly": {
		tailleCm: 176,
		poidsKg: 106,
		peau: "#d2806c",
		cheveux: "#871a1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mark telea": {
		peau: "#c28d78",
		cheveux: "#6e5f5a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"marko gazzotti": {
		tailleCm: 191,
		poidsKg: 100,
		peau: "#ae7768",
		cheveux: "#3e2b1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"marley pearce": {
		peau: "#b2714c",
		cheveux: "#241f18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"marmion kieran": {
		peau: "#ce8d6d",
		cheveux: "#6a4f32",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"marnus potgieter": {
		peau: "#be8978",
		cheveux: "#5d4732",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"marnus van der merwe": {
		tailleCm: 183,
		poidsKg: 110,
		peau: "#a6786b",
		cheveux: "#4a1f23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"maro itoje": {
		tailleCm: 202,
		poidsKg: 106,
		peau: "#683b2d",
		cheveux: "#0b0909",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mars jc": {
		peau: "#bd7e54",
		cheveux: "#3f2717",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"martial rolland": {
		tailleCm: 192,
		poidsKg: 115,
		peau: "#a47361",
		cheveux: "#24201d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"martin alonso muoz": {
		peau: "#c58a6e",
		cheveux: "#462f20",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"martin blum": {
		peau: "#cd9379",
		cheveux: "#412f2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"martin bogado": {
		tailleCm: 196,
		poidsKg: 91,
		peau: "#a6806d",
		cheveux: "#252121",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"martin dulon": {
		tailleCm: 189,
		poidsKg: 90,
		peau: "#c0846d",
		cheveux: "#3a2924",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"martin james": {
		peau: "#ad6f63",
		cheveux: "#4d2f24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"martin mackenzie": {
		peau: "#a46950",
		cheveux: "#2f251d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"martin meliande": {
		tailleCm: 184,
		poidsKg: 77,
		peau: "#c6755a",
		cheveux: "#32251e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"martin page relo": {
		tailleCm: 170,
		poidsKg: 65,
		peau: "#a57362",
		cheveux: "#392a23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"martin roger farias": {
		peau: "#cf997d",
		cheveux: "#2d3d42",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"martin verdu": {
		peau: "#d39074",
		cheveux: "#2a1b14",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"martin villar": {
		tailleCm: 188,
		poidsKg: 117,
		peau: "#c1946e",
		cheveux: "#342c1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"martinez rodrigo": {
		peau: "#c48e79",
		cheveux: "#4a372c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"martino pucciariello": {
		tailleCm: 180,
		poidsKg: 70,
		peau: "#a07b66",
		cheveux: "#1d1916",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"marvin orie": {
		peau: "#8d5d45",
		cheveux: "#1d1c1b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"marvin saint gys okuya": {
		peau: "#9a6046",
		cheveux: "#593b2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"masaaki morita": {
		peau: "#c09079",
		cheveux: "#181817",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masafumi tanabe": {
		peau: "#c38669",
		cheveux: "#2b2622",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"masahiko sagara": {
		peau: "#c38b79",
		cheveux: "#1c1b1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masahiro eriguchi": {
		peau: "#ba7f5e",
		cheveux: "#322017",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"masahiro kitamura": {
		peau: "#dba891",
		cheveux: "#242526",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masahiro nakano": {
		peau: "#bd8b6e",
		cheveux: "#181716",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masahito tonomoto": {
		peau: "#c7876c",
		cheveux: "#30241b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"masakazu yatsumonji": {
		peau: "#c4845e",
		cheveux: "#29201c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masaki hamada": {
		peau: "#cd9d84",
		cheveux: "#26221f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masaki obata": {
		peau: "#d58758",
		cheveux: "#231d16",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"masaki shima": {
		peau: "#c99085",
		cheveux: "#292628",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masanori miyao": {
		peau: "#c89281",
		cheveux: "#3a2a24",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masashi debuchi": {
		peau: "#b28565",
		cheveux: "#41372e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"masashi ogawa": {
		peau: "#d8967c",
		cheveux: "#161513",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"masashi onishi": {
		peau: "#d7a681",
		cheveux: "#23201e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"masataka mikami": {
		peau: "#e5b39f",
		cheveux: "#2b2b29",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"masataka tsuruya": {
		peau: "#c89072",
		cheveux: "#1f1d1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masato furukawa": {
		peau: "#ba855e",
		cheveux: "#281e18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masatoshi doi": {
		peau: "#cd8f76",
		cheveux: "#1d1813",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"masaya kanado": {
		peau: "#c79376",
		cheveux: "#241c18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masaya makino": {
		peau: "#b98572",
		cheveux: "#1a1a18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"masaya tamaki": {
		peau: "#dcaea6",
		cheveux: "#2f2829",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masaya yamada": {
		peau: "#d9afa0",
		cheveux: "#2e313a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"masayoshi takezawa": {
		peau: "#b8845c",
		cheveux: "#1f1814",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"mason grady": {
		tailleCm: 191,
		poidsKg: 112,
		peau: "#9f7373",
		cheveux: "#2e2830",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"massimo de lutiis": {
		peau: "#ad7a75",
		cheveux: "#372321",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"massimo ortolan": {
		tailleCm: 181,
		poidsKg: 75,
		peau: "#bb856c",
		cheveux: "#503b2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"masuku siya": {
		peau: "#724e3c",
		cheveux: "#252621",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mata viliame": {
		peau: "#9f6745",
		cheveux: "#1c1a16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"matanzima simphiwe": {
		peau: "#b5765f",
		cheveux: "#3a393b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"matariki channings": {
		peau: "#d07e4b",
		cheveux: "#281e14",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"mateo carreras": {
		tailleCm: 173,
		poidsKg: 72,
		peau: "#c89582",
		cheveux: "#2f231d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mateo garcia": {
		tailleCm: 178,
		poidsKg: 70,
		peau: "#c0836c",
		cheveux: "#342925",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mateo lavasele": {
		tailleCm: 186,
		poidsKg: 94,
		peau: "#ba7b6a",
		cheveux: "#262422",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"math iorwerth scott": {
		tailleCm: 181,
		poidsKg: 115,
		peau: "#bb887b",
		cheveux: "#4b3b3a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mathias colombet": {
		tailleCm: 193,
		poidsKg: 91,
		peau: "#a57b6c",
		cheveux: "#2a2626",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mathias jean": {
		peau: "#ae7752",
		cheveux: "#563f2f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"mathias kemsley": {
		peau: "#93635c",
		cheveux: "#2f231f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"mathieu acebes": {
		tailleCm: 178,
		poidsKg: 80,
		peau: "#db987c",
		cheveux: "#3b2921",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"mathieu babillot": {
		tailleCm: 192,
		poidsKg: 104,
		peau: "#b66e5a",
		cheveux: "#603b2d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"mathieu bonnot": {
		tailleCm: 174,
		poidsKg: 92,
		peau: "#bc816a",
		cheveux: "#3e3029",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mathieu guillomot": {
		tailleCm: 181,
		poidsKg: 87,
		peau: "#b47b72",
		cheveux: "#554034",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mathieu hirigoyen": {
		tailleCm: 194,
		poidsKg: 97,
		peau: "#cd9980",
		cheveux: "#443734",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mathieu smaili": {
		tailleCm: 179,
		poidsKg: 76,
		peau: "#c9806b",
		cheveux: "#342824",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mathieu tanguy": {
		tailleCm: 199,
		poidsKg: 107,
		peau: "#a37576",
		cheveux: "#191619",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mathis baret": {
		tailleCm: 191,
		poidsKg: 92,
		peau: "#b9936d",
		cheveux: "#222221",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mathis castro ferreira": {
		tailleCm: 193,
		poidsKg: 102,
		peau: "#cd998f",
		cheveux: "#362723",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mathis dehauteur": {
		peau: "#9c6b5a",
		cheveux: "#0c0a09",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"mathis ferte": {
		tailleCm: 175,
		poidsKg: 65,
		peau: "#cc8971",
		cheveux: "#392c26",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"mathis galeazzi": {
		peau: "#d99e75",
		cheveux: "#36261d",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "none"
	},
	"mathis galthie": {
		tailleCm: 181,
		poidsKg: 75,
		peau: "#b4734c",
		cheveux: "#221911",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mathis grangier": {
		tailleCm: 193,
		poidsKg: 91,
		peau: "#c1795f",
		cheveux: "#704836",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"mathis ibo": {
		tailleCm: 184,
		poidsKg: 68,
		peau: "#aa7460",
		cheveux: "#261f1f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mathis lafon": {
		tailleCm: 190,
		poidsKg: 87,
		peau: "#ba7e66",
		cheveux: "#312823",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mathis locatelli": {
		peau: "#ba8563",
		cheveux: "#352713",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mathis sarragallet": {
		tailleCm: 176,
		poidsKg: 102,
		peau: "#c27e5e",
		cheveux: "#503624",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"matho frisach": {
		peau: "#d6ac9e",
		cheveux: "#382e2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mathys argenton": {
		tailleCm: 197,
		poidsKg: 88,
		peau: "#b0806b",
		cheveux: "#1a1614",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mathys belaubre": {
		tailleCm: 195,
		poidsKg: 102,
		peau: "#d19064",
		cheveux: "#2c1e16",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mathys lotrian": {
		tailleCm: 175,
		poidsKg: 100,
		peau: "#c18481",
		cheveux: "#1c1b20",
		yeux: "#587383",
		coiffure: "short",
		barbe: "none"
	},
	"matias remue": {
		tailleCm: 180,
		poidsKg: 75,
		peau: "#dda896",
		cheveux: "#0e0907",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matis perchaud": {
		tailleCm: 182,
		poidsKg: 105,
		peau: "#996a59",
		cheveux: "#221014",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matolu pataia": {
		peau: "#b26c4b",
		cheveux: "#2d251e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"matongo vernon": {
		peau: "#7c543b",
		cheveux: "#2f1f10",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matsuri odagiri": {
		peau: "#db9d8a",
		cheveux: "#0a0705",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"matt dalton": {
		peau: "#d1978a",
		cheveux: "#3a281c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matt faessler": {
		peau: "#cc9c9c",
		cheveux: "#2b2322",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"matt fagerson": {
		tailleCm: 183,
		poidsKg: 99,
		peau: "#c48e73",
		cheveux: "#4e3725",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"matt gallagher": {
		tailleCm: 181,
		poidsKg: 90,
		peau: "#bc846d",
		cheveux: "#2b1c15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matt mc gahan": {
		peau: "#cd9e91",
		cheveux: "#544841",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"matt philip": {
		peau: "#d29081",
		cheveux: "#4f372b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"matt romao": {
		peau: "#b27d65",
		cheveux: "#1a1713",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"matt vaega": {
		peau: "#b67c5f",
		cheveux: "#211e1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"matteo canali": {
		tailleCm: 200,
		poidsKg: 118,
		peau: "#b88b80",
		cheveux: "#3a3632",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"matteo coustalat": {
		tailleCm: 186,
		poidsKg: 90,
		peau: "#b68471",
		cheveux: "#4c3927",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matteo desjeux": {
		tailleCm: 205,
		poidsKg: 115,
		peau: "#c16e5b",
		cheveux: "#301d14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matteo nocera": {
		tailleCm: 198,
		poidsKg: 123,
		peau: "#b8816d",
		cheveux: "#223549",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"matteo rodor": {
		tailleCm: 167,
		poidsKg: 62,
		peau: "#be877a",
		cheveux: "#252424",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"matthee jurie": {
		peau: "#c68968",
		cheveux: "#59422a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"matthew beukeboom": {
		peau: "#b17d66",
		cheveux: "#543a2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matthew devine": {
		peau: "#ae7c6a",
		cheveux: "#161a17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"matthew screech": {
		tailleCm: 197,
		poidsKg: 109,
		peau: "#cb8e80",
		cheveux: "#5d4735",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matthew victory": {
		tailleCm: 178,
		poidsKg: 88,
		peau: "#d6937e",
		cheveux: "#2d1b17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matthews johnny": {
		peau: "#c59881",
		cheveux: "#563d33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"matthias haddad": {
		tailleCm: 189,
		poidsKg: 98,
		peau: "#e8ad9c",
		cheveux: "#3b2621",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matthias halagahu": {
		tailleCm: 190,
		poidsKg: 110,
		peau: "#c5795d",
		cheveux: "#191818",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"matthieu bonnet": {
		tailleCm: 194,
		poidsKg: 93,
		peau: "#ae7752",
		cheveux: "#372b24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matthieu jalibert": {
		tailleCm: 188,
		poidsKg: 78,
		peau: "#91675a",
		cheveux: "#221b19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"matthieu uhila": {
		tailleCm: 205,
		poidsKg: 102,
		peau: "#a96e59",
		cheveux: "#090808",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"matthieu vachon": {
		tailleCm: 187,
		poidsKg: 100,
		peau: "#cb8e88",
		cheveux: "#322b29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"matthis lebel": {
		tailleCm: 182,
		poidsKg: 80,
		peau: "#c6856b",
		cheveux: "#1d1615",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"matthys basson": {
		peau: "#d8a897",
		cheveux: "#3d3b3c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"matto lalanne": {
		peau: "#d99688",
		cheveux: "#4f332c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"matto le corvec": {
		peau: "#b27c79",
		cheveux: "#3c2c2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"matty young": {
		tailleCm: 183,
		poidsKg: 75,
		peau: "#a77a77",
		cheveux: "#3c3034",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"maurice marks": {
		peau: "#c38f72",
		cheveux: "#262321",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"mavesere tino": {
		peau: "#594138",
		cheveux: "#221f1b",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"mawande mdanda": {
		peau: "#7d4e38",
		cheveux: "#3d2a1c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"max clein": {
		tailleCm: 186,
		poidsKg: 97,
		peau: "#d28567",
		cheveux: "#9a5034",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"max clement": {
		tailleCm: 178,
		poidsKg: 68,
		peau: "#cb9e84",
		cheveux: "#221f19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"max deegan": {
		peau: "#bb866f",
		cheveux: "#17283f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"max douglas": {
		peau: "#a47a74",
		cheveux: "#472727",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"max eke": {
		tailleCm: 195,
		poidsKg: 88,
		peau: "#9f6b5e",
		cheveux: "#18100c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"max flynn": {
		peau: "#d3967c",
		cheveux: "#7f5447",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"max hicks": {
		tailleCm: 195,
		poidsKg: 102,
		peau: "#c8967e",
		cheveux: "#28201e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"max hughes": {
		peau: "#c59186",
		cheveux: "#232120",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"max james meagher": {
		peau: "#c08672",
		cheveux: "#46382f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"max jorgensen": {
		peau: "#d59587",
		cheveux: "#59423b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"max lahiff": {
		tailleCm: 188,
		poidsKg: 111,
		peau: "#af7057",
		cheveux: "#32271e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"max llewellyn": {
		tailleCm: 192,
		poidsKg: 101,
		peau: "#bb8171",
		cheveux: "#382115",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"max malins": {
		tailleCm: 181,
		poidsKg: 80,
		peau: "#6d3e35",
		cheveux: "#171414",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"max nagy": {
		peau: "#9e776e",
		cheveux: "#3b3236",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"max norey": {
		tailleCm: 182,
		poidsKg: 96,
		peau: "#ce988c",
		cheveux: "#3c1d0e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"max ojomoh": {
		tailleCm: 188,
		poidsKg: 89,
		peau: "#9e674b",
		cheveux: "#151009",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"max pearce": {
		tailleCm: 185,
		poidsKg: 102,
		peau: "#cf9685",
		cheveux: "#5f452f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"max pepper": {
		tailleCm: 185,
		poidsKg: 82,
		peau: "#ca8c6e",
		cheveux: "#362819",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"max spring": {
		tailleCm: 172,
		poidsKg: 69,
		peau: "#c98167",
		cheveux: "#1c110b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"max williamson": {
		tailleCm: 199,
		poidsKg: 108,
		peau: "#af7d61",
		cheveux: "#4f3928",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"maxence barjaud": {
		tailleCm: 194,
		poidsKg: 103,
		peau: "#c38769",
		cheveux: "#31241a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"maxence biasotto": {
		tailleCm: 182,
		poidsKg: 73,
		peau: "#bd7f61",
		cheveux: "#201710",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"maxence lemardelet": {
		tailleCm: 197,
		poidsKg: 111,
		peau: "#b17965",
		cheveux: "#332922",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"maxence ligeron borg": {
		peau: "#e9bab1",
		cheveux: "#55382d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"maxim granell": {
		tailleCm: 179,
		poidsKg: 71,
		peau: "#c58b85",
		cheveux: "#252025",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"maxime baudonne": {
		tailleCm: 190,
		poidsKg: 90,
		peau: "#d18e72",
		cheveux: "#683e23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"maxime belleterre": {
		peau: "#c89b6f",
		cheveux: "#463925",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"maxime espeut": {
		tailleCm: 183,
		poidsKg: 83,
		peau: "#c89279",
		cheveux: "#38302b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"maxime gouzou": {
		tailleCm: 188,
		poidsKg: 96,
		peau: "#ca865a",
		cheveux: "#3e2d25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"maxime granouillet": {
		tailleCm: 200,
		poidsKg: 108,
		peau: "#bf806e",
		cheveux: "#2a201b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"maxime lafage": {
		tailleCm: 188,
		poidsKg: 80,
		peau: "#c77964",
		cheveux: "#2c2218",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"maxime lamothe": {
		tailleCm: 179,
		poidsKg: 98,
		peau: "#9d685c",
		cheveux: "#472f24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"maxime lucu": {
		tailleCm: 175,
		poidsKg: 80,
		peau: "#a67462",
		cheveux: "#674335",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"maxime machenaud": {
		tailleCm: 176,
		poidsKg: 81,
		peau: "#c57467",
		cheveux: "#1d1616",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"maxime oltmann": {
		tailleCm: 186,
		poidsKg: 81,
		peau: "#a86b45",
		cheveux: "#2d2114",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"maxime sidobre": {
		tailleCm: 170,
		poidsKg: 78,
		peau: "#bd835f",
		cheveux: "#422818",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mayco vivas": {
		tailleCm: 190,
		poidsKg: 116,
		peau: "#b6895c",
		cheveux: "#544227",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mayron fahy": {
		peau: "#d1a1a3",
		cheveux: "#3a2824",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mazibuko lee marvin": {
		peau: "#775c56",
		cheveux: "#242930",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"mazza damiano": {
		peau: "#c59574",
		cheveux: "#253f3f",
		yeux: "#587383",
		coiffure: "short",
		barbe: "moustache"
	},
	"mbatha fez": {
		peau: "#8e6651",
		cheveux: "#302e2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"mbonambi bongi": {
		peau: "#965a51",
		cheveux: "#353633",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"mcallister tom": {
		peau: "#cd918b",
		cheveux: "#37190d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mcbeth nathan": {
		peau: "#b9846d",
		cheveux: "#3e3227",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mccann dave": {
		peau: "#c28a76",
		cheveux: "#3b261a",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"mccarthy gus": {
		peau: "#d18c80",
		cheveux: "#3e3024",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mccarthy joe": {
		peau: "#ac7368",
		cheveux: "#204074",
		yeux: "#587383",
		coiffure: "long",
		barbe: "full_beard"
	},
	"mccarthy paddy": {
		peau: "#c58272",
		cheveux: "#65433b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mccarthy shay": {
		peau: "#c07a5f",
		cheveux: "#641616",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"mccloskey stuart": {
		peau: "#c58d74",
		cheveux: "#4d3325",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mccormack oisin": {
		peau: "#c98a79",
		cheveux: "#48362b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mccormick james": {
		peau: "#cb8870",
		cheveux: "#4b301f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mcdonald gabe": {
		peau: "#ab817b",
		cheveux: "#472328",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mcdowall stafford": {
		peau: "#c8947c",
		cheveux: "#6e5039",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"mcerlean henry": {
		peau: "#b27862",
		cheveux: "#502f16",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "none"
	},
	"mcgrath luke": {
		peau: "#ab7a65",
		cheveux: "#293627",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mcguire rory": {
		peau: "#c68a75",
		cheveux: "#443125",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mchunu khutha": {
		peau: "#6d4533",
		cheveux: "#493026",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"mchunu ntuthuko": {
		peau: "#7a513d",
		cheveux: "#0c0d0a",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "moustache"
	},
	"mcilroy ethan": {
		peau: "#c0816f",
		cheveux: "#362215",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mckay josh": {
		peau: "#ab7d68",
		cheveux: "#4a352a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mckee conor": {
		peau: "#cd8e7d",
		cheveux: "#5b3a1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mckee john": {
		peau: "#bc836e",
		cheveux: "#322e25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mclaughlin hugo": {
		peau: "#b97a65",
		cheveux: "#302419",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mcloughlin lorcan": {
		peau: "#d79c8b",
		cheveux: "#442d21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mcnabney james": {
		peau: "#cf8c79",
		cheveux: "#3b2014",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mcnally josh": {
		peau: "#a67a76",
		cheveux: "#5c4741",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mcparland archie": {
		peau: "#c6978e",
		cheveux: "#50372c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mcsweeney darragh": {
		peau: "#d28679",
		cheveux: "#50281f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mdanda mawande": {
		peau: "#7d4e38",
		cheveux: "#3d2a1c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"mead alex": {
		peau: "#bf8d89",
		cheveux: "#563c32",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"mee ellis": {
		peau: "#bf8e85",
		cheveux: "#5f2a2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mehdi slamani": {
		tailleCm: 200,
		poidsKg: 124,
		peau: "#cc9281",
		cheveux: "#3b242b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mehdi tlili": {
		tailleCm: 196,
		poidsKg: 96,
		peau: "#ba7861",
		cheveux: "#272320",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"meihana grindlay": {
		peau: "#b27956",
		cheveux: "#27211c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"meishi watanabe": {
		peau: "#cc9177",
		cheveux: "#27221f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"meli tuni": {
		peau: "#be886b",
		cheveux: "#322829",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"melvyn jaminet": {
		tailleCm: 176,
		poidsKg: 75,
		peau: "#c07e6e",
		cheveux: "#3a2e29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"melvyn rates": {
		tailleCm: 176,
		poidsKg: 81,
		peau: "#d5afa5",
		cheveux: "#120f0e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"mendy ignacio": {
		peau: "#b98475",
		cheveux: "#2f2624",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"meno barnard": {
		peau: "#b07e6d",
		cheveux: "#39312d",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"menoncello tommaso": {
		peau: "#b5836f",
		cheveux: "#241c17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"merlin leflamand": {
		tailleCm: 188,
		poidsKg: 85,
		peau: "#ac7257",
		cheveux: "#482f20",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"merwe olivier": {
		peau: "#e5b3ae",
		cheveux: "#71564c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"mesake doge": {
		peau: "#ab745e",
		cheveux: "#382e2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mesake vocevoce": {
		peau: "#b07a63",
		cheveux: "#23211d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mesulame dolokoto": {
		peau: "#b1806a",
		cheveux: "#342d2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"michael alaalatoa": {
		tailleCm: 196,
		poidsKg: 125,
		peau: "#95765d",
		cheveux: "#2d271b",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"michael allardice": {
		peau: "#c19172",
		cheveux: "#4f4031",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"michael collins": {
		peau: "#d69785",
		cheveux: "#3c302a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"michael foy": {
		tailleCm: 197,
		poidsKg: 95,
		peau: "#cc846e",
		cheveux: "#451e1f",
		yeux: "#587383",
		coiffure: "curly",
		barbe: "full_beard"
	},
	"michael leitch": {
		peau: "#d0987c",
		cheveux: "#856b5e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"michael little": {
		peau: "#c89484",
		cheveux: "#3a322e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"michael loft": {
		peau: "#ad7760",
		cheveux: "#41291a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"michael milne": {
		tailleCm: 181,
		poidsKg: 108,
		peau: "#be846d",
		cheveux: "#722223",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"michael ruru": {
		tailleCm: 187,
		poidsKg: 84,
		peau: "#b56d52",
		cheveux: "#1a0e08",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"michael simutoga": {
		tailleCm: 182,
		poidsKg: 115,
		peau: "#9f7356",
		cheveux: "#201d1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"michael stolberg": {
		peau: "#d8a093",
		cheveux: "#322924",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"michele lamaro": {
		tailleCm: 192,
		poidsKg: 92,
		peau: "#b17c64",
		cheveux: "#39291a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"michiro takai": {
		peau: "#bb826b",
		cheveux: "#1c1a19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"mickael capelli": {
		tailleCm: 203,
		poidsKg: 126,
		peau: "#ac735c",
		cheveux: "#5e4b41",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"mickal guillard": {
		peau: "#d29063",
		cheveux: "#221814",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mifiposeti paea": {
		peau: "#c18864",
		cheveux: "#1f1a17",
		yeux: "#624633",
		coiffure: "long",
		barbe: "short_beard"
	},
	"mike austin": {
		tailleCm: 189,
		poidsKg: 78,
		peau: "#be8478",
		cheveux: "#2f170b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"mike haley": {
		tailleCm: 187,
		poidsKg: 85,
		peau: "#de9f89",
		cheveux: "#bc4033",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"mike lowry": {
		peau: "#ce9585",
		cheveux: "#5b3929",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mikey yarr": {
		peau: "#d58d7e",
		cheveux: "#402514",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mikheil alania": {
		tailleCm: 175,
		poidsKg: 75,
		peau: "#b0745b",
		cheveux: "#22160e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"mikheili shioshvili": {
		tailleCm: 193,
		poidsKg: 110,
		peau: "#c38a77",
		cheveux: "#282221",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mikiya takamoto": {
		peau: "#c98f81",
		cheveux: "#221f1e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"milano giacomo": {
		peau: "#ce9983",
		cheveux: "#3c3538",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"miles amatosero": {
		peau: "#9d5942",
		cheveux: "#171311",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"miles reid": {
		tailleCm: 185,
		poidsKg: 99,
		peau: "#c08269",
		cheveux: "#945947",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"millard harri": {
		peau: "#a57775",
		cheveux: "#272e3c",
		yeux: "#587383",
		coiffure: "short",
		barbe: "none"
	},
	"miller ally": {
		peau: "#d0a18a",
		cheveux: "#332e2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"millian ouldji": {
		tailleCm: 176,
		poidsKg: 98,
		peau: "#dba084",
		cheveux: "#372c24",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"milne michael": {
		peau: "#be846d",
		cheveux: "#722223",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"minato jinnouchi": {
		peau: "#e1aca6",
		cheveux: "#251f26",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"minogue oisin": {
		peau: "#ca7f69",
		cheveux: "#2b1b14",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"minto evan": {
		peau: "#cd9a8b",
		cheveux: "#5b4435",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"miracle tuavalu tangata": {
		peau: "#b8836e",
		cheveux: "#111110",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mirco spagnolo": {
		tailleCm: 185,
		poidsKg: 102,
		peau: "#c58f86",
		cheveux: "#2e3531",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mirian burduli": {
		tailleCm: 192,
		poidsKg: 111,
		peau: "#b37a5f",
		cheveux: "#72342c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"mirko belloni": {
		tailleCm: 185,
		poidsKg: 94,
		peau: "#c08879",
		cheveux: "#233544",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"misinale epenisa": {
		peau: "#a86242",
		cheveux: "#211e17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mitch dunshea": {
		peau: "#c38263",
		cheveux: "#3c2d28",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"mitchell alex": {
		peau: "#a5625a",
		cheveux: "#160f0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mitchell brown": {
		peau: "#ac755f",
		cheveux: "#2a211b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"mitchell drummond": {
		peau: "#ca9583",
		cheveux: "#3d2d22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mitchell hunt": {
		peau: "#d4998d",
		cheveux: "#43352b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"mitsuki ito": {
		peau: "#d19579",
		cheveux: "#3a2e24",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"miuaustin moriyama": {
		peau: "#d69b72",
		cheveux: "#161910",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"mizuki niura": {
		peau: "#cb9476",
		cheveux: "#27201b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"moeki fukushi": {
		peau: "#c79583",
		cheveux: "#181311",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"moerat salmaan": {
		peau: "#ab6f4f",
		cheveux: "#1f1c14",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"mohamed haouas": {
		tailleCm: 189,
		poidsKg: 116,
		peau: "#b6826c",
		cheveux: "#0a0a0a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"mohamed karim qadiri": {
		peau: "#b98154",
		cheveux: "#40342a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"mohamed megherbi": {
		tailleCm: 188,
		poidsKg: 132,
		peau: "#b28055",
		cheveux: "#3a3020",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"moloney ruben": {
		peau: "#be796b",
		cheveux: "#683715",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"molony liam": {
		peau: "#b0705c",
		cheveux: "#212519",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"montemauri giovanni": {
		peau: "#c68b70",
		cheveux: "#2b302f",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"montgomery saul loggenberg": {
		peau: "#cc8b6a",
		cheveux: "#3a2615",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"monty ioane": {
		tailleCm: 181,
		poidsKg: 84,
		peau: "#c5865c",
		cheveux: "#161515",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"moodie canan": {
		peau: "#aa6144",
		cheveux: "#17110f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"moody sol": {
		peau: "#c78e6a",
		cheveux: "#2c231b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"moore stewart": {
		peau: "#d28e74",
		cheveux: "#5a3722",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"moos asad": {
		peau: "#c68d65",
		cheveux: "#151a12",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"morabe keke": {
		peau: "#a97463",
		cheveux: "#192b31",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"morgan jac": {
		peau: "#b77862",
		cheveux: "#50341f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"morgan lloyd": {
		tailleCm: 178,
		poidsKg: 72,
		peau: "#ca8f7a",
		cheveux: "#5c3e28",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"morgan luke": {
		peau: "#a47567",
		cheveux: "#3d2f2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"morgan maga": {
		tailleCm: 200,
		poidsKg: 108,
		peau: "#c68a7f",
		cheveux: "#3b302a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"morgan morris": {
		tailleCm: 179,
		poidsKg: 100,
		peau: "#a98472",
		cheveux: "#3e312d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"morgan morse": {
		tailleCm: 183,
		poidsKg: 99,
		peau: "#ac7c6e",
		cheveux: "#392d2d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"morgan williams reuben": {
		peau: "#ac7f6c",
		cheveux: "#43342b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"moriarty ross": {
		peau: "#a97261",
		cheveux: "#79533c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"morishi ito": {
		peau: "#cba48c",
		cheveux: "#25211e",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"morisi luca": {
		peau: "#ca9584",
		cheveux: "#3a3532",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mornay smith": {
		peau: "#9d6859",
		cheveux: "#201d1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"morris jordan": {
		peau: "#926453",
		cheveux: "#1b1713",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"morris morgan": {
		peau: "#a98472",
		cheveux: "#3e312d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"morrison mabope": {
		tailleCm: 188,
		poidsKg: 92,
		peau: "#71504e",
		cheveux: "#282a2b",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"morse josh": {
		peau: "#b07f76",
		cheveux: "#4d2522",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"morse morgan": {
		peau: "#ac7c6e",
		cheveux: "#392d2d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"moses eneliko alo emile": {
		peau: "#c98f79",
		cheveux: "#43312c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"moses jones": {
		peau: "#d19a87",
		cheveux: "#785a41",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mosese bason": {
		peau: "#be7c59",
		cheveux: "#2d2420",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mosese dawai": {
		tailleCm: 193,
		poidsKg: 96,
		peau: "#9e6750",
		cheveux: "#342520",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"mosese tamaniceva tuvasu tabuakoto": {
		peau: "#9e6e5d",
		cheveux: "#262121",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"mosese tonga": {
		peau: "#d89b7a",
		cheveux: "#2d2c2c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"motikiai murray": {
		peau: "#b5886f",
		cheveux: "#2b2827",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"motoi naito": {
		peau: "#c7977c",
		cheveux: "#302520",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"motoki kaneko": {
		peau: "#dca197",
		cheveux: "#1f1b22",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"motoki tanaka": {
		peau: "#d1977e",
		cheveux: "#24221e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"mototsugu hachiya": {
		peau: "#c07f61",
		cheveux: "#231f1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"moxham ben": {
		peau: "#c38364",
		cheveux: "#533422",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"moyse connor": {
		peau: "#ac867c",
		cheveux: "#3b3131",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"mpilo gumede": {
		peau: "#7d513b",
		cheveux: "#382519",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"muhamed hasa": {
		tailleCm: 183,
		poidsKg: 114,
		peau: "#a57367",
		cheveux: "#2a353b",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"mulder johan": {
		peau: "#a77676",
		cheveux: "#35424b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"mullan alex": {
		peau: "#b68570",
		cheveux: "#2d2c20",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"mullins chay": {
		peau: "#c47d5b",
		cheveux: "#2b1e18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"munetaka sashida": {
		peau: "#d49d79",
		cheveux: "#161614",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"munga chunya": {
		peau: "#88584a",
		cheveux: "#1d1615",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"munn duncan": {
		peau: "#d9a38a",
		cheveux: "#815e40",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"murphy ben": {
		peau: "#de977d",
		cheveux: "#af7753",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"murphy jack": {
		peau: "#d5917b",
		cheveux: "#4f3323",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"murphy josh": {
		peau: "#b68279",
		cheveux: "#222b2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"murphy luke": {
		peau: "#d18a74",
		cheveux: "#4e281f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"murphy walker": {
		tailleCm: 186,
		poidsKg: 98,
		peau: "#bb8c77",
		cheveux: "#332d2d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"murray blair": {
		peau: "#a2756d",
		cheveux: "#6b3031",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"murray darragh": {
		peau: "#cf8979",
		cheveux: "#2d2521",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"murray douglas": {
		peau: "#bb9580",
		cheveux: "#332a22",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"murray koster": {
		peau: "#a1715b",
		cheveux: "#513925",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"murray niall": {
		peau: "#dca290",
		cheveux: "#49473c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"musashi matsuda": {
		peau: "#d89c90",
		cheveux: "#35292b",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"myhill kirby": {
		peau: "#7e5a5b",
		cheveux: "#35232c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"myles edwards": {
		tailleCm: 198,
		poidsKg: 114,
		peau: "#ae7752",
		cheveux: "#4f2b1e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"nadir bouhedjeur": {
		tailleCm: 182,
		poidsKg: 79,
		peau: "#b58d71",
		cheveux: "#5c4c42",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"nadir megdoud": {
		tailleCm: 181,
		poidsKg: 87,
		peau: "#c1976d",
		cheveux: "#362e20",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"nael souid": {
		tailleCm: 187,
		poidsKg: 90,
		peau: "#c28175",
		cheveux: "#232324",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nafitalai owen maafu": {
		peau: "#e09277",
		cheveux: "#130e12",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"nagito uno": {
		peau: "#916c5d",
		cheveux: "#2a2220",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"nagy max": {
		peau: "#9e776e",
		cheveux: "#3b3236",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nahuel tetaz chaparro": {
		peau: "#a6775e",
		cheveux: "#171311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nail audoire": {
		tailleCm: 177,
		poidsKg: 112,
		peau: "#a67a5f",
		cheveux: "#322722",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"naim ben alla": {
		tailleCm: 190,
		poidsKg: 86,
		peau: "#864926",
		cheveux: "#09110d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"nama abdallah coulibaly": {
		peau: "#7e5b47",
		cheveux: "#292c25",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"nama xaba": {
		peau: "#5e3f30",
		cheveux: "#2f241c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nankivell alex": {
		peau: "#d09078",
		cheveux: "#ae120e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"naoaki horibe": {
		peau: "#c89283",
		cheveux: "#201e1f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"naohiro aso": {
		peau: "#d19886",
		cheveux: "#292b2f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"naohiro kotaki": {
		peau: "#c98a69",
		cheveux: "#211f1f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"naoki izutani": {
		peau: "#d19276",
		cheveux: "#1b1a17",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"naoki kotera": {
		peau: "#cf9075",
		cheveux: "#211d19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"naoki ouno": {
		peau: "#d99f81",
		cheveux: "#332d2b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"naoki takaya": {
		peau: "#ce997d",
		cheveux: "#171512",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"naomichi tatekawa": {
		peau: "#e0a997",
		cheveux: "#383438",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"naoto shirakawa": {
		peau: "#d39992",
		cheveux: "#231d23",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"naoto yasutsune": {
		peau: "#c68e72",
		cheveux: "#211e1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"naoya ishibashi": {
		peau: "#aa7b6c",
		cheveux: "#252020",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"naoya ogita": {
		peau: "#c27855",
		cheveux: "#160f0c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"nash calvin": {
		peau: "#d49885",
		cheveux: "#492b25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"natan culinat": {
		tailleCm: 165,
		poidsKg: 69,
		peau: "#c1846e",
		cheveux: "#1d1716",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"nathan azais": {
		tailleCm: 191,
		poidsKg: 89,
		peau: "#cd9578",
		cheveux: "#624630",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nathan bollengier": {
		tailleCm: 186,
		poidsKg: 75,
		peau: "#e7b39c",
		cheveux: "#543725",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"nathan decron": {
		tailleCm: 180,
		poidsKg: 91,
		peau: "#ac6f57",
		cheveux: "#362a22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nathan doak": {
		peau: "#dda395",
		cheveux: "#602f19",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"nathan farissier": {
		tailleCm: 185,
		poidsKg: 77,
		peau: "#b1816a",
		cheveux: "#2e231d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nathan fraissenon": {
		tailleCm: 180,
		poidsKg: 122,
		peau: "#b37656",
		cheveux: "#28211e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nathan hastie": {
		peau: "#cc886c",
		cheveux: "#2a2118",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nathan hughes": {
		tailleCm: 199,
		poidsKg: 116,
		peau: "#9f6345",
		cheveux: "#351f13",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"nathan james claassen": {
		peau: "#bf8364",
		cheveux: "#55341f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"nathan jibulu": {
		tailleCm: 183,
		poidsKg: 102,
		peau: "#674a41",
		cheveux: "#161a1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"nathan llaveria": {
		tailleCm: 177,
		poidsKg: 72,
		peau: "#e1a58e",
		cheveux: "#3f2a20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nathan mcbeth": {
		tailleCm: 182,
		poidsKg: 115,
		peau: "#b9846d",
		cheveux: "#3e3227",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nathan michelow": {
		tailleCm: 194,
		poidsKg: 101,
		peau: "#976753",
		cheveux: "#614b3b",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"nathan pozin": {
		peau: "#d8b8a9",
		cheveux: "#545937",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"nathanael hulleu": {
		tailleCm: 175,
		poidsKg: 79,
		peau: "#de9582",
		cheveux: "#754a35",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"naughton sean": {
		peau: "#d59485",
		cheveux: "#2e413a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"nche ox": {
		peau: "#995b4f",
		cheveux: "#2c2522",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"neculai ion": {
		peau: "#c98974",
		cheveux: "#2b2a2f",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"neethling fouche": {
		peau: "#c69779",
		cheveux: "#3d2e20",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"negri sebastian": {
		peau: "#bc836c",
		cheveux: "#271f19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"neil hansen": {
		peau: "#866a57",
		cheveux: "#493a32",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"nel louw": {
		peau: "#c18a70",
		cheveux: "#594634",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nel ruhan": {
		peau: "#c99581",
		cheveux: "#262019",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nelson epee": {
		tailleCm: 171,
		poidsKg: 71,
		peau: "#c58c77",
		cheveux: "#1d1d1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"nemer ivan": {
		peau: "#aa735d",
		cheveux: "#2b3626",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"nephi leatigaga": {
		tailleCm: 191,
		poidsKg: 144,
		peau: "#aa5b2b",
		cheveux: "#050f0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"nesta mahina": {
		peau: "#a56c4b",
		cheveux: "#2f221c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"netani vakayalia": {
		peau: "#ad7463",
		cheveux: "#1f1f1d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ngane puniwai": {
		peau: "#bd7f57",
		cheveux: "#2e2320",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"niall armstrong": {
		peau: "#cd9984",
		cheveux: "#483428",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"niall murray": {
		tailleCm: 197,
		poidsKg: 99,
		peau: "#dca290",
		cheveux: "#49473c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"niall scannell": {
		peau: "#cd8a7c",
		cheveux: "#65211d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"niall smyth": {
		peau: "#bd9181",
		cheveux: "#10316a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"nic allison": {
		tailleCm: 190,
		poidsKg: 85,
		peau: "#cd8b7d",
		cheveux: "#301d11",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nic dolly": {
		peau: "#d29181",
		cheveux: "#553e28",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"nic souchon": {
		peau: "#ba896c",
		cheveux: "#392b20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"niccolo cannone": {
		tailleCm: 192,
		poidsKg: 115,
		peau: "#a4725f",
		cheveux: "#463421",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nicholas conway": {
		peau: "#b98e8c",
		cheveux: "#362521",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"nicholas gasperini": {
		tailleCm: 184,
		poidsKg: 111,
		peau: "#b98565",
		cheveux: "#432f1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nicholas ioan": {
		peau: "#bb8d82",
		cheveux: "#775f57",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"nicholas mc curran": {
		peau: "#d2a19b",
		cheveux: "#4c3f38",
		yeux: "#657452",
		coiffure: "curly",
		barbe: "none"
	},
	"nicholas peter schonert": {
		peau: "#c47467",
		cheveux: "#1f120f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nick bloomfield": {
		peau: "#bd8887",
		cheveux: "#2c2321",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nick champion de crespigny": {
		peau: "#d0946f",
		cheveux: "#503b25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nick david": {
		tailleCm: 181,
		poidsKg: 83,
		peau: "#9f5944",
		cheveux: "#180906",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"nick frost": {
		peau: "#ca9987",
		cheveux: "#3a2d26",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"nick hatton": {
		peau: "#af7969",
		cheveux: "#4e3823",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"nick isiekwe": {
		tailleCm: 205,
		poidsKg: 109,
		peau: "#8e5849",
		cheveux: "#2c1d1b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"nick jooste": {
		peau: "#c49582",
		cheveux: "#3e3127",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"nick lilley": {
		tailleCm: 191,
		poidsKg: 87,
		peau: "#dc9f8f",
		cheveux: "#372113",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nick phipps": {
		peau: "#b26c50",
		cheveux: "#1b1613",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"nick thomas": {
		tailleCm: 196,
		poidsKg: 107,
		peau: "#cf9581",
		cheveux: "#5d432d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nick timoney": {
		peau: "#cf9a91",
		cheveux: "#281c17",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"nick tompkins": {
		tailleCm: 178,
		poidsKg: 88,
		peau: "#825144",
		cheveux: "#231711",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"nicky smith": {
		tailleCm: 182,
		poidsKg: 113,
		peau: "#c78a76",
		cheveux: "#553e3b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"nicolaas janse van rensburg": {
		peau: "#9f6454",
		cheveux: "#1a110b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"nicolas christian krone": {
		peau: "#c77b5c",
		cheveux: "#634025",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nicolas ciancio": {
		tailleCm: 181,
		poidsKg: 121,
		peau: "#d8a077",
		cheveux: "#5f4032",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nicolas corato": {
		tailleCm: 179,
		poidsKg: 118,
		peau: "#d08776",
		cheveux: "#4a3b38",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"nicolas depoortere": {
		tailleCm: 197,
		poidsKg: 86,
		peau: "#9f6d5a",
		cheveux: "#171313",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nicolas elissondo": {
		peau: "#e2ab97",
		cheveux: "#634532",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"nicolas martins": {
		tailleCm: 200,
		poidsKg: 89,
		peau: "#cb9077",
		cheveux: "#201915",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"nicolas plazy": {
		tailleCm: 185,
		poidsKg: 84,
		peau: "#be8063",
		cheveux: "#423021",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nicolas ragoevi": {
		tailleCm: 172,
		poidsKg: 92,
		peau: "#ba8061",
		cheveux: "#261c16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"nika lomidze": {
		tailleCm: 186,
		poidsKg: 90,
		peau: "#cf9c8f",
		cheveux: "#120e0d",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nikolaj varottoj": {
		peau: "#916c58",
		cheveux: "#36312b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"nikolozi chkhortolia": {
		peau: "#d19c90",
		cheveux: "#302422",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"nikolozi sutidze": {
		peau: "#dfa791",
		cheveux: "#46302b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"nikora broughton": {
		peau: "#b68163",
		cheveux: "#37322d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"nils punti": {
		tailleCm: 202,
		poidsKg: 102,
		peau: "#d3a8a0",
		cheveux: "#170d0a",
		yeux: "#624633",
		coiffure: "long",
		barbe: "full_beard"
	},
	"nizaam carr": {
		peau: "#966046",
		cheveux: "#5c3925",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"noa isaac kanika bilonda": {
		peau: "#6c5349",
		cheveux: "#1d1d1d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"noa pommelet": {
		tailleCm: 185,
		poidsKg: 84,
		peau: "#c08369",
		cheveux: "#402b1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"noa tinnirello": {
		tailleCm: 183,
		poidsKg: 120,
		peau: "#b97358",
		cheveux: "#161615",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"noa traversier": {
		tailleCm: 193,
		poidsKg: 96,
		peau: "#b47b5e",
		cheveux: "#392721",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"noa zinzen": {
		tailleCm: 187,
		poidsKg: 93,
		peau: "#d08d7a",
		cheveux: "#24160f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"noah brown": {
		tailleCm: 207,
		poidsKg: 107,
		peau: "#c18a71",
		cheveux: "#16100b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"noah buxton": {
		peau: "#bd8577",
		cheveux: "#20100f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"noah fenton": {
		peau: "#de9d85",
		cheveux: "#311e15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"noah foster": {
		peau: "#cf9185",
		cheveux: "#292627",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"noah heward": {
		tailleCm: 181,
		poidsKg: 85,
		peau: "#ad7158",
		cheveux: "#533c25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"noah hotham": {
		peau: "#b97f65",
		cheveux: "#241d17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"noah lolesio": {
		peau: "#937061",
		cheveux: "#272424",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"noah tisie nene": {
		peau: "#ba8069",
		cheveux: "#302626",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"noah tovio": {
		peau: "#c88574",
		cheveux: "#110b07",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"noam pion": {
		peau: "#c39580",
		cheveux: "#363028",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nobuhisa takahashi": {
		peau: "#926f62",
		cheveux: "#231d1f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"nocera matteo": {
		peau: "#b8816d",
		cheveux: "#223549",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"noe darrelatour": {
		tailleCm: 183,
		poidsKg: 71,
		peau: "#b98269",
		cheveux: "#5f4635",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"noe della schiava": {
		tailleCm: 196,
		poidsKg: 88,
		peau: "#c38b87",
		cheveux: "#1f191b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"noe theraube": {
		tailleCm: 191,
		poidsKg: 114,
		peau: "#cba48c",
		cheveux: "#36392b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"noel kawamura": {
		peau: "#daac99",
		cheveux: "#323133",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"nolann donguy": {
		tailleCm: 184,
		poidsKg: 76,
		peau: "#c57961",
		cheveux: "#241410",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"nolann le garrec": {
		tailleCm: 171,
		poidsKg: 64,
		peau: "#e5af9f",
		cheveux: "#2b1b18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"nolhann couillaud": {
		tailleCm: 173,
		poidsKg: 62,
		peau: "#e5b198",
		cheveux: "#5e3d31",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"noriaki nakazuru": {
		peau: "#c69077",
		cheveux: "#1e1916",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"norifumi hashimoto": {
		peau: "#d59e76",
		cheveux: "#1b1b0f",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"norihiro aso": {
		peau: "#b88071",
		cheveux: "#1b1614",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"noriyuki kureyama": {
		peau: "#bf8c7b",
		cheveux: "#1e1b1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"nortje ruan": {
		peau: "#b17b6b",
		cheveux: "#2c251d",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"norton riley": {
		peau: "#ba8569",
		cheveux: "#2a2012",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"nott george": {
		peau: "#976968",
		cheveux: "#392f2f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"ntubeni scarra": {
		peau: "#81553f",
		cheveux: "#23180f",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"ntuthuko mchunu": {
		peau: "#7a513d",
		cheveux: "#0c0d0a",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "moustache"
	},
	"nugzari somkhisvhili": {
		peau: "#ca9a83",
		cheveux: "#746156",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"nyakane trevor": {
		peau: "#553425",
		cheveux: "#282626",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"obi ene": {
		tailleCm: 188,
		poidsKg: 97,
		peau: "#6c3527",
		cheveux: "#0d0a08",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ockie barnard": {
		peau: "#ce9e92",
		cheveux: "#6b5142",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"odiase davide": {
		peau: "#815b4d",
		cheveux: "#2f2f2e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"odogwu paolo": {
		peau: "#86573d",
		cheveux: "#140e0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ofa ki muli manuofetoa": {
		peau: "#9e6a52",
		cheveux: "#191c1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"oghre gabriel": {
		peau: "#b37450",
		cheveux: "#1d1c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"oguntibeju olujare": {
		peau: "#674b3f",
		cheveux: "#271e17",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"oisin dowling": {
		peau: "#a27262",
		cheveux: "#14231d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"oisin mccormack": {
		peau: "#c98a79",
		cheveux: "#48362b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"oisin minogue": {
		tailleCm: 183,
		poidsKg: 96,
		peau: "#ca7f69",
		cheveux: "#2b1b14",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"olamide sodeke": {
		tailleCm: 205,
		poidsKg: 120,
		peau: "#7e544b",
		cheveux: "#171210",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"oli burrows": {
		tailleCm: 184,
		poidsKg: 105,
		peau: "#c68a75",
		cheveux: "#1e1815",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"oli jager": {
		peau: "#c98c7b",
		cheveux: "#76383c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"oli kebble": {
		peau: "#c3856a",
		cheveux: "#4a382a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"oli mathis": {
		peau: "#ce947f",
		cheveux: "#3c2e24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"oliver coffey": {
		peau: "#c78877",
		cheveux: "#262f21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"oliver cowie": {
		tailleCm: 192,
		poidsKg: 89,
		peau: "#c58c7d",
		cheveux: "#261b16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"oliver cummins": {
		peau: "#ae7752",
		cheveux: "#45302a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"oliver haig": {
		peau: "#a17a73",
		cheveux: "#342928",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"oliver jack": {
		peau: "#cf9a78",
		cheveux: "#4c3525",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"oliver jack mccrea": {
		peau: "#d39a87",
		cheveux: "#704f40",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"oliver scola": {
		peau: "#be8a85",
		cheveux: "#351f1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"oliver spencer": {
		tailleCm: 187,
		poidsKg: 105,
		peau: "#cca186",
		cheveux: "#21201e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"olivier hull": {
		peau: "#cd907a",
		cheveux: "#241a16",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ollie allan": {
		tailleCm: 183,
		poidsKg: 81,
		peau: "#bb7765",
		cheveux: "#341e15",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ollie batson": {
		tailleCm: 177,
		poidsKg: 86,
		peau: "#d7896f",
		cheveux: "#402315",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ollie chessum": {
		tailleCm: 198,
		poidsKg: 107,
		peau: "#b88080",
		cheveux: "#613c33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ollie davies": {
		peau: "#c3896d",
		cheveux: "#272425",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ollie fletcher": {
		tailleCm: 185,
		poidsKg: 101,
		peau: "#bf9188",
		cheveux: "#322429",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ollie hassell collins": {
		tailleCm: 194,
		poidsKg: 96,
		peau: "#a35b4e",
		cheveux: "#22140e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ollie lawrence": {
		tailleCm: 184,
		poidsKg: 96,
		peau: "#aa7051",
		cheveux: "#322718",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ollie norris": {
		peau: "#cc8465",
		cheveux: "#744f36",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ollie sapsford": {
		peau: "#b97b67",
		cheveux: "#543a35",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ollie sleightholme": {
		tailleCm: 178,
		poidsKg: 91,
		peau: "#c9968c",
		cheveux: "#231612",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ollie smith": {
		tailleCm: 183,
		poidsKg: 92,
		peau: "#c78c75",
		cheveux: "#46342e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ollie stonham": {
		peau: "#a9796c",
		cheveux: "#64483d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"ollie thorley": {
		tailleCm: 188,
		poidsKg: 89,
		peau: "#965d58",
		cheveux: "#43281d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"olly cracknell": {
		tailleCm: 187,
		poidsKg: 110,
		peau: "#a46454",
		cheveux: "#311f19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"olly hartley": {
		tailleCm: 190,
		poidsKg: 99,
		peau: "#86554a",
		cheveux: "#2b1c14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"olly woodburn": {
		tailleCm: 192,
		poidsKg: 92,
		peau: "#9b5d41",
		cheveux: "#252427",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"olujare oguntibeju": {
		tailleCm: 208,
		poidsKg: 113,
		peau: "#674b3f",
		cheveux: "#271e17",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"onisi ratave": {
		tailleCm: 177,
		poidsKg: 91,
		peau: "#704732",
		cheveux: "#1a130f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"opeti helu": {
		tailleCm: 193,
		poidsKg: 116,
		peau: "#ca9282",
		cheveux: "#211f1f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"orbyn leger": {
		peau: "#5e381d",
		cheveux: "#371c0a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"orie marvin": {
		peau: "#8d5d45",
		cheveux: "#1d1c1b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"orion schmok": {
		peau: "#c99b88",
		cheveux: "#382d25",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"orlando bailey": {
		tailleCm: 195,
		poidsKg: 84,
		peau: "#af6f5b",
		cheveux: "#190e0b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"ortombina alessandro": {
		peau: "#b37f74",
		cheveux: "#2e3134",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"osborne andrew": {
		peau: "#bf8474",
		cheveux: "#483737",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"osborne jamie": {
		peau: "#ca8b79",
		cheveux: "#8a6e4a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"oscar beckerleg": {
		tailleCm: 199,
		poidsKg: 100,
		peau: "#dd9074",
		cheveux: "#361e10",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"oscar jegou": {
		tailleCm: 195,
		poidsKg: 88,
		peau: "#e4a792",
		cheveux: "#643d2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"oscar wilson": {
		tailleCm: 183,
		poidsKg: 80,
		peau: "#916355",
		cheveux: "#180f0b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"osian darwin lewis": {
		tailleCm: 185,
		poidsKg: 83,
		peau: "#b88783",
		cheveux: "#2c292e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"osian roberts": {
		tailleCm: 181,
		poidsKg: 83,
		peau: "#cda290",
		cheveux: "#2a2321",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"osian williams": {
		tailleCm: 202,
		poidsKg: 102,
		peau: "#b07d78",
		cheveux: "#5d1f21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"oskar konstantin rixen": {
		peau: "#c38a6e",
		cheveux: "#53361d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"osukalloyd murata": {
		peau: "#d59b81",
		cheveux: "#2b2725",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"otere black": {
		peau: "#e1ac8a",
		cheveux: "#261f10",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"otoya kihara": {
		peau: "#dea078",
		cheveux: "#2d2721",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"otunuku pauta": {
		tailleCm: 188,
		poidsKg: 105,
		peau: "#ab815e",
		cheveux: "#181715",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ougi yanamoto": {
		peau: "#d8a69b",
		cheveux: "#262628",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"owain james": {
		tailleCm: 186,
		poidsKg: 113,
		peau: "#c99180",
		cheveux: "#846149",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"owen aneurin": {
		peau: "#d59a83",
		cheveux: "#66412c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"owen erasmus": {
		tailleCm: 180,
		poidsKg: 76,
		peau: "#b68871",
		cheveux: "#3f3029",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"owen farrell": {
		tailleCm: 187,
		poidsKg: 83,
		peau: "#a16c57",
		cheveux: "#291d15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"owen fresnais": {
		peau: "#d18d71",
		cheveux: "#392017",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"owen gillett": {
		peau: "#865b4e",
		cheveux: "#2e1c14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"owen joe": {
		peau: "#9a6447",
		cheveux: "#201914",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"owen sorhaindo": {
		tailleCm: 192,
		poidsKg: 117,
		peau: "#c8806b",
		cheveux: "#2d221e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"owen watkin": {
		tailleCm: 190,
		poidsKg: 104,
		peau: "#92716a",
		cheveux: "#28242a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"owen williams": {
		tailleCm: 186,
		poidsKg: 93,
		peau: "#b7826b",
		cheveux: "#3a2c21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ox nche": {
		peau: "#995b4f",
		cheveux: "#2c2522",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"pablo barbaste": {
		tailleCm: 176,
		poidsKg: 68,
		peau: "#b17465",
		cheveux: "#3e312b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pablo dimcheff": {
		tailleCm: 186,
		poidsKg: 98,
		peau: "#bd806d",
		cheveux: "#281f1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pablo matera": {
		peau: "#dda38a",
		cheveux: "#4b3e3c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"pablo patilla": {
		tailleCm: 183,
		poidsKg: 81,
		peau: "#bb8769",
		cheveux: "#3d2e27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pablo uberti": {
		tailleCm: 181,
		poidsKg: 82,
		peau: "#a77667",
		cheveux: "#28201d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paco mazoyer": {
		tailleCm: 183,
		poidsKg: 80,
		peau: "#d5966f",
		cheveux: "#513829",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"paco scheibel": {
		peau: "#e7b29e",
		cheveux: "#3f2a26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paddy mccarthy": {
		peau: "#c58272",
		cheveux: "#65433b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paddy patterson": {
		peau: "#ce927f",
		cheveux: "#3b2220",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paddy ryan": {
		peau: "#c88c73",
		cheveux: "#4b3a2c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"paea fetuli": {
		peau: "#9f6e5b",
		cheveux: "#251e18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"page macs": {
		peau: "#b6837d",
		cheveux: "#4b302b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"paidi farrell": {
		peau: "#b6836b",
		cheveux: "#1d342e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"pani lorenzo": {
		peau: "#c78f7a",
		cheveux: "#2c3433",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"paolo buonfiglio": {
		tailleCm: 186,
		poidsKg: 102,
		peau: "#9b6c5e",
		cheveux: "#2c373d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paolo garbisi": {
		tailleCm: 180,
		poidsKg: 91,
		peau: "#ca8773",
		cheveux: "#2b221e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paolo odogwu": {
		tailleCm: 178,
		poidsKg: 92,
		peau: "#86573d",
		cheveux: "#140e0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paolo parpagiola": {
		tailleCm: 195,
		poidsKg: 90,
		peau: "#c27c64",
		cheveux: "#231816",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"papaseea matelau": {
		peau: "#b08163",
		cheveux: "#22201e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"papier embrose": {
		peau: "#744c38",
		cheveux: "#171513",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"pari pari parkinson": {
		peau: "#d27d5d",
		cheveux: "#512c1f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"parry sam": {
		peau: "#a8776a",
		cheveux: "#362c2c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"pascal cotet": {
		tailleCm: 188,
		poidsKg: 112,
		peau: "#a77c68",
		cheveux: "#2d211c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"pasilio tosi": {
		peau: "#a66447",
		cheveux: "#2a241f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"pasquali tiziano": {
		peau: "#b98164",
		cheveux: "#312318",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"patelesio fatuloa tomkinson": {
		peau: "#ba7c62",
		cheveux: "#201a17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pater james": {
		peau: "#ddb0ab",
		cheveux: "#5c3f2d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"patreece bell": {
		tailleCm: 178,
		poidsKg: 100,
		peau: "#855446",
		cheveux: "#121413",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"patrick hogg": {
		tailleCm: 201,
		poidsKg: 112,
		peau: "#d2a291",
		cheveux: "#4d2f2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"patrick keaveney": {
		peau: "#8e5b4d",
		cheveux: "#0d0806",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"patrick leafa": {
		peau: "#a47454",
		cheveux: "#3a2d26",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"patrick lucas tuifua": {
		peau: "#b46d56",
		cheveux: "#171515",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"patrick mc curran": {
		peau: "#d49886",
		cheveux: "#5b3e25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"patrick schickerling": {
		tailleCm: 185,
		poidsKg: 114,
		peau: "#b47f69",
		cheveux: "#553a30",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"patrick sobela": {
		tailleCm: 193,
		poidsKg: 98,
		peau: "#633f3a",
		cheveux: "#131118",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"patrick stehlin": {
		peau: "#935a3f",
		cheveux: "#24211b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"patrick tafa": {
		peau: "#945c43",
		cheveux: "#1b1917",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"patrick vakata": {
		peau: "#935b47",
		cheveux: "#181818",
		yeux: "#657452",
		coiffure: "curly",
		barbe: "none"
	},
	"patterson paddy": {
		peau: "#ce927f",
		cheveux: "#3b2220",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"patxi bidart": {
		tailleCm: 170,
		poidsKg: 82,
		peau: "#966c58",
		cheveux: "#221d1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"paul abadie": {
		tailleCm: 181,
		poidsKg: 79,
		peau: "#c9917c",
		cheveux: "#43312b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paul alo emile": {
		tailleCm: 182,
		poidsKg: 126,
		peau: "#b07a68",
		cheveux: "#5f4436",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"paul arnaud ausset": {
		tailleCm: 194,
		poidsKg: 93,
		peau: "#a65d39",
		cheveux: "#40240c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paul auradou": {
		tailleCm: 183,
		poidsKg: 77,
		peau: "#c99665",
		cheveux: "#382b17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"paul belzons": {
		tailleCm: 182,
		poidsKg: 96,
		peau: "#d79485",
		cheveux: "#593f33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paul berges": {
		tailleCm: 181,
		poidsKg: 63,
		peau: "#b28773",
		cheveux: "#2f221b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"paul boudehent": {
		tailleCm: 193,
		poidsKg: 97,
		peau: "#e7b1a2",
		cheveux: "#492f26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul boyle": {
		tailleCm: 195,
		poidsKg: 107,
		peau: "#cd8f82",
		cheveux: "#1d1a1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paul brown bampoe": {
		tailleCm: 186,
		poidsKg: 92,
		peau: "#552f24",
		cheveux: "#19140f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"paul cellio zwiler": {
		peau: "#9d766d",
		cheveux: "#3a342e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paul costes": {
		tailleCm: 188,
		poidsKg: 82,
		peau: "#da9785",
		cheveux: "#654530",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul dauguet": {
		tailleCm: 185,
		poidsKg: 106,
		peau: "#af7d70",
		cheveux: "#3c2025",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paul de villiers": {
		peau: "#bc8068",
		cheveux: "#23201c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul de wet": {
		peau: "#a77260",
		cheveux: "#4d382b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"paul dumas": {
		tailleCm: 170,
		poidsKg: 69,
		peau: "#c69185",
		cheveux: "#3a302f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul gabrillagues": {
		tailleCm: 200,
		poidsKg: 112,
		peau: "#bc8879",
		cheveux: "#3e2c2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paul gadea": {
		tailleCm: 186,
		poidsKg: 84,
		peau: "#c58661",
		cheveux: "#291d15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul graou": {
		tailleCm: 182,
		poidsKg: 79,
		peau: "#dca590",
		cheveux: "#654638",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paul jedrasiak": {
		tailleCm: 202,
		poidsKg: 116,
		peau: "#d28c7d",
		cheveux: "#4f3a30",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"paul laperne": {
		peau: "#9d5c30",
		cheveux: "#08120c",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paul mallez": {
		tailleCm: 185,
		poidsKg: 110,
		peau: "#dea394",
		cheveux: "#582f32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul marsan": {
		tailleCm: 186,
		poidsKg: 84,
		peau: "#ba8577",
		cheveux: "#372a25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul nava": {
		peau: "#b07f54",
		cheveux: "#332a20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul ravier": {
		tailleCm: 179,
		poidsKg: 70,
		peau: "#b5693e",
		cheveux: "#12150d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"paul reau": {
		tailleCm: 185,
		poidsKg: 77,
		peau: "#d69b71",
		cheveux: "#241c16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul recor": {
		tailleCm: 186,
		poidsKg: 87,
		peau: "#b27556",
		cheveux: "#261d15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul surano": {
		tailleCm: 183,
		poidsKg: 78,
		peau: "#ce8367",
		cheveux: "#100b09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"paul tailhades": {
		tailleCm: 181,
		poidsKg: 109,
		peau: "#986856",
		cheveux: "#272220",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"paul vallee": {
		tailleCm: 191,
		poidsKg: 78,
		peau: "#d7a78f",
		cheveux: "#4d3e33",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"paula mahe": {
		peau: "#bf826b",
		cheveux: "#232121",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"paulo tauiliili pelesasa": {
		tailleCm: 193,
		poidsKg: 114,
		peau: "#c87e5b",
		cheveux: "#1c1b1c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"pearce max": {
		peau: "#cf9685",
		cheveux: "#5f452f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pearson tom": {
		peau: "#c28e88",
		cheveux: "#62493d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"peato mauvaka": {
		tailleCm: 187,
		poidsKg: 103,
		peau: "#bb8270",
		cheveux: "#332b2d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"peceli yato": {
		tailleCm: 198,
		poidsKg: 115,
		peau: "#724641",
		cheveux: "#412622",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"pedro delgado": {
		tailleCm: 187,
		poidsKg: 125,
		peau: "#a16f56",
		cheveux: "#22110f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"pedro rubiolo": {
		tailleCm: 191,
		poidsKg: 109,
		peau: "#965c3f",
		cheveux: "#332416",
		yeux: "#587383",
		coiffure: "short",
		barbe: "short_beard"
	},
	"penaia cakobau": {
		peau: "#b77860",
		cheveux: "#292935",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"peni ravai": {
		peau: "#825b4d",
		cheveux: "#553b38",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"peni torau vuetimaiwai": {
		peau: "#b27056",
		cheveux: "#31221e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"peniami nasali narisia": {
		tailleCm: 187,
		poidsKg: 95,
		peau: "#a4784b",
		cheveux: "#2e2922",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"peniasi dakuwaqa": {
		tailleCm: 186,
		poidsKg: 85,
		peau: "#b8826d",
		cheveux: "#5d4239",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"penny scott": {
		peau: "#9e6452",
		cheveux: "#332d1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"penxe yaw": {
		peau: "#6d4f42",
		cheveux: "#2f2c26",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"pepesana patafilo": {
		peau: "#af7a5e",
		cheveux: "#1e1b1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"pepper max": {
		peau: "#ca8c6e",
		cheveux: "#362819",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"perry mayo": {
		tailleCm: 174,
		poidsKg: 76,
		peau: "#b97f60",
		cheveux: "#412e1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"pete samu": {
		peau: "#a45e48",
		cheveux: "#221e19",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"peter dooley": {
		peau: "#c78a80",
		cheveux: "#28231f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"peter lakai": {
		peau: "#945a3f",
		cheveux: "#231d1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"peter lydon": {
		tailleCm: 184,
		poidsKg: 90,
		peau: "#a0776a",
		cheveux: "#3a302b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"peter umaga jensen": {
		peau: "#b47960",
		cheveux: "#332b24",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"petero taviraki mailulu": {
		peau: "#a56b50",
		cheveux: "#1d1c16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"petersen sergeal": {
		peau: "#68432d",
		cheveux: "#412b1d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"peyo muscarditz": {
		tailleCm: 176,
		poidsKg: 83,
		peau: "#ae7752",
		cheveux: "#372924",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"phatu ganyane": {
		peau: "#764d36",
		cheveux: "#272827",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"phepsi buthelezi": {
		peau: "#8d644e",
		cheveux: "#1c1c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"phil brantingham": {
		tailleCm: 186,
		poidsKg: 112,
		peau: "#9c6253",
		cheveux: "#5c4034",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"phil cokanasiga": {
		tailleCm: 182,
		poidsKg: 98,
		peau: "#8a4c37",
		cheveux: "#28120c",
		yeux: "#624633",
		coiffure: "long",
		barbe: "moustache"
	},
	"philip baselala": {
		peau: "#b7714e",
		cheveux: "#1e1919",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"philippus petrus kleynhans": {
		peau: "#c78870",
		cheveux: "#472c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"phillip albert van niekerk": {
		peau: "#975b48",
		cheveux: "#192328",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"phillip kite": {
		peau: "#b87255",
		cheveux: "#904e30",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"phillips garyn": {
		peau: "#af7b6d",
		cheveux: "#5c4438",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"phoenix damon battye": {
		peau: "#c59774",
		cheveux: "#4c412c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"phransis sula siaosi": {
		peau: "#ce7b45",
		cheveux: "#241c12",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"pieretto enrique": {
		peau: "#caa49d",
		cheveux: "#423b38",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pierich siebert": {
		peau: "#bf8b83",
		cheveux: "#433532",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"pierre bochaton": {
		tailleCm: 198,
		poidsKg: 91,
		peau: "#9a6a5e",
		cheveux: "#3a2d24",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"pierre boudehent": {
		tailleCm: 200,
		poidsKg: 102,
		peau: "#a2604c",
		cheveux: "#1d130f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"pierre bourgarit": {
		tailleCm: 184,
		poidsKg: 103,
		peau: "#e1a79a",
		cheveux: "#8d5d40",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"pierre castillon": {
		tailleCm: 187,
		poidsKg: 96,
		peau: "#c58173",
		cheveux: "#291b12",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"pierre chanel tafili": {
		tailleCm: 189,
		poidsKg: 133,
		peau: "#b4795b",
		cheveux: "#1e1d1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pierre colonna": {
		tailleCm: 193,
		poidsKg: 106,
		peau: "#ca8170",
		cheveux: "#31241f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"pierre courtaud": {
		tailleCm: 176,
		poidsKg: 76,
		peau: "#b77b55",
		cheveux: "#35281a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"pierre damond": {
		tailleCm: 183,
		poidsKg: 92,
		peau: "#d59582",
		cheveux: "#29201d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"pierre emmanuel pacheco": {
		tailleCm: 178,
		poidsKg: 114,
		peau: "#82533c",
		cheveux: "#1a1614",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"pierre henri azagoh kouadio": {
		peau: "#b7816b",
		cheveux: "#754c3e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pierre huguet": {
		tailleCm: 197,
		poidsKg: 102,
		peau: "#d19b87",
		cheveux: "#6f584c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"pierre jouvin": {
		tailleCm: 187,
		poidsKg: 100,
		peau: "#c78672",
		cheveux: "#342620",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"pierre louis barassi": {
		tailleCm: 186,
		poidsKg: 95,
		peau: "#d69d8c",
		cheveux: "#4d3834",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"pierre lucas": {
		tailleCm: 186,
		poidsKg: 82,
		peau: "#bc907e",
		cheveux: "#453d37",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"pierre pacheco": {
		peau: "#886747",
		cheveux: "#282620",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"pierre popelin": {
		tailleCm: 177,
		poidsKg: 81,
		peau: "#d38a74",
		cheveux: "#442d27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pierre strippoli": {
		tailleCm: 177,
		poidsKg: 100,
		peau: "#ca957a",
		cheveux: "#44372d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"piers francis": {
		peau: "#bd9179",
		cheveux: "#483829",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"pieter lappies labuschagne": {
		peau: "#d3a098",
		cheveux: "#392e2c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"pieter scholtz": {
		peau: "#cb8f7a",
		cheveux: "#835549",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"pieter steph du toit": {
		peau: "#bf9084",
		cheveux: "#666757",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"pietro ceccarelli": {
		tailleCm: 181,
		poidsKg: 123,
		peau: "#976a6c",
		cheveux: "#372c2d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"pio muarua": {
		tailleCm: 190,
		poidsKg: 117,
		peau: "#aa785d",
		cheveux: "#332d29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"pita gus sowakula": {
		tailleCm: 194,
		poidsKg: 110,
		peau: "#8b604d",
		cheveux: "#3c3531",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"pitinari juan manuel": {
		peau: "#a4705f",
		cheveux: "#42392a",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"pj latu": {
		peau: "#dda078",
		cheveux: "#272422",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"pj steenkamp": {
		peau: "#d69d94",
		cheveux: "#30292e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"plumtree taine": {
		peau: "#9d6e65",
		cheveux: "#692b2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"pohiva yamato lotoahea": {
		peau: "#da9a70",
		cheveux: "#35322e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"pollard handre": {
		peau: "#d19474",
		cheveux: "#604331",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"pollock henry": {
		peau: "#b7766e",
		cheveux: "#422920",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pone faamausili": {
		peau: "#956551",
		cheveux: "#23211f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ponipate loganimasi": {
		tailleCm: 185,
		poidsKg: 83,
		peau: "#b47a64",
		cheveux: "#131417",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"porter andrew": {
		peau: "#ab7861",
		cheveux: "#2b2b20",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "none"
	},
	"porter gary": {
		peau: "#b47c69",
		cheveux: "#252116",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"porthen zac": {
		peau: "#905d47",
		cheveux: "#382b19",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"posolo tuilagi": {
		tailleCm: 197,
		poidsKg: 140,
		peau: "#b47973",
		cheveux: "#1e1a1c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"postlethwaite jude": {
		peau: "#cc8c73",
		cheveux: "#332114",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"potgieter jannes": {
		peau: "#987264",
		cheveux: "#2c231f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"potgieter marnus": {
		peau: "#be8978",
		cheveux: "#5d4732",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"pouri rakete stones": {
		tailleCm: 187,
		poidsKg: 113,
		peau: "#b27251",
		cheveux: "#564034",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"prendergast cian": {
		peau: "#d98770",
		cheveux: "#5f4136",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"prendergast sam": {
		peau: "#c28c72",
		cheveux: "#243023",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"price elis": {
		peau: "#ae796f",
		cheveux: "#5d3a39",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"price jac": {
		peau: "#b6857e",
		cheveux: "#221714",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"prowse ed": {
		peau: "#c08c86",
		cheveux: "#352218",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"pugh aidan": {
		peau: "#cf968a",
		cheveux: "#221612",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"quattrini giovanni": {
		peau: "#a47469",
		cheveux: "#392e19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"quentin algay": {
		tailleCm: 183,
		poidsKg: 95,
		peau: "#b4704c",
		cheveux: "#1f1610",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"quentin lespiaucq": {
		tailleCm: 183,
		poidsKg: 92,
		peau: "#e1ad9a",
		cheveux: "#825238",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"quentin samaran": {
		tailleCm: 174,
		poidsKg: 102,
		peau: "#e8b6a2",
		cheveux: "#81665a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"quentin valentino": {
		tailleCm: 189,
		poidsKg: 85,
		peau: "#bd8f72",
		cheveux: "#503729",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"quentin walcker": {
		tailleCm: 184,
		poidsKg: 102,
		peau: "#d78879",
		cheveux: "#432d2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"quinn roux": {
		tailleCm: 200,
		poidsKg: 116,
		peau: "#bd8567",
		cheveux: "#1e140e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"quinn ruadhan": {
		peau: "#b36f5c",
		cheveux: "#561c19",
		yeux: "#624633",
		coiffure: "long",
		barbe: "full_beard"
	},
	"quinn tupaea": {
		peau: "#a15f43",
		cheveux: "#110d0a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"quinten strange": {
		peau: "#e3ad93",
		cheveux: "#231f11",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"quinton mahina": {
		peau: "#b0796a",
		cheveux: "#222020",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"quinton nicols": {
		peau: "#b1826f",
		cheveux: "#1b1513",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"rabah slimani": {
		tailleCm: 180,
		poidsKg: 119,
		peau: "#c98466",
		cheveux: "#372e29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"raffaele costa storti": {
		tailleCm: 184,
		poidsKg: 83,
		peau: "#c6a484",
		cheveux: "#262622",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rafi kurokawa": {
		peau: "#ca8765",
		cheveux: "#372e22",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"rahboni warren vosayaco": {
		peau: "#ba8264",
		cheveux: "#221f1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"rahl corne": {
		peau: "#ba7a7b",
		cheveux: "#70463a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"raia takashima": {
		peau: "#a77a71",
		cheveux: "#292324",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"raito sakita": {
		peau: "#b88c7a",
		cheveux: "#161313",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"rakuhei yamashita": {
		peau: "#c8907a",
		cheveux: "#68584e",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "none"
	},
	"ralph mceachran": {
		tailleCm: 194,
		poidsKg: 109,
		peau: "#d09d88",
		cheveux: "#2f2d37",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ralston byron": {
		peau: "#b56854",
		cheveux: "#191311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"rameka poihipi": {
		peau: "#d29973",
		cheveux: "#342d26",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ramo sato": {
		peau: "#c59e8e",
		cheveux: "#1b1a1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"randall baker": {
		peau: "#d39870",
		cheveux: "#262220",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"randall harry": {
		peau: "#bd886d",
		cheveux: "#30261f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rapava ruskin val": {
		peau: "#814636",
		cheveux: "#1f100c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"raphael darquier": {
		tailleCm: 196,
		poidsKg: 101,
		peau: "#cd9b8f",
		cheveux: "#362929",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"raphael laboille": {
		tailleCm: 185,
		poidsKg: 98,
		peau: "#884924",
		cheveux: "#050f0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"raphael sanchez": {
		tailleCm: 176,
		poidsKg: 74,
		peau: "#bd8363",
		cheveux: "#30261d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"raphal audebert": {
		peau: "#d39e8e",
		cheveux: "#3d3732",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"raphal portat": {
		peau: "#b18775",
		cheveux: "#382e26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ratave onisi": {
		peau: "#704732",
		cheveux: "#1a130f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"rati zazadze": {
		tailleCm: 184,
		poidsKg: 98,
		peau: "#ba7e5d",
		cheveux: "#834929",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"ratti james": {
		peau: "#b18c80",
		cheveux: "#342f31",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"ratu jekope tubeimomo sovau": {
		peau: "#884d28",
		cheveux: "#08130e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ratu josaia nacika": {
		peau: "#874b22",
		cheveux: "#08100c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ratu leone rotuisolia": {
		peau: "#a87244",
		cheveux: "#2e271e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ratu mikaele antonio ratavo": {
		peau: "#845445",
		cheveux: "#161313",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ratu nemani naitoninicagi kurucake": {
		peau: "#65483e",
		cheveux: "#242222",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ratu osea waqaninavatu": {
		peau: "#a2796d",
		cheveux: "#2e2d32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ravouvou kalaveti": {
		peau: "#724533",
		cheveux: "#080807",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ray tatafu": {
		peau: "#9e6b4d",
		cheveux: "#181613",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"rayan houari": {
		tailleCm: 191,
		poidsKg: 81,
		peau: "#b3775e",
		cheveux: "#2f2522",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"rayan rebbadj": {
		tailleCm: 188,
		poidsKg: 92,
		peau: "#cb896e",
		cheveux: "#352c27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"raymond iese nuu": {
		peau: "#ba7f61",
		cheveux: "#181616",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"raymond tuputupu": {
		peau: "#af664a",
		cheveux: "#22201f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"raynard roets": {
		tailleCm: 197,
		poidsKg: 100,
		peau: "#d1927e",
		cheveux: "#63483b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"rea marcus": {
		peau: "#cd9884",
		cheveux: "#573a29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"reda wardi": {
		tailleCm: 189,
		poidsKg: 102,
		peau: "#e0a691",
		cheveux: "#8f604d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"redshaw ben": {
		peau: "#b27974",
		cheveux: "#361f13",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"reece hewat": {
		tailleCm: 197,
		poidsKg: 99,
		peau: "#b67d6a",
		cheveux: "#463a32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"reece macdonald": {
		peau: "#a96440",
		cheveux: "#472c14",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"rees weldon harry": {
		peau: "#c28c76",
		cheveux: "#3e2f26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rees zammit louis": {
		peau: "#b2745f",
		cheveux: "#201a17",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"reesjan pasitoa": {
		peau: "#d3936b",
		cheveux: "#39271c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"reffell sean": {
		peau: "#d39b8a",
		cheveux: "#533629",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"reggie hammick": {
		tailleCm: 183,
		peau: "#8c5a4c",
		cheveux: "#20150f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"reginald churchward": {
		peau: "#d29470",
		cheveux: "#936c52",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"regis desire omby": {
		peau: "#72422e",
		cheveux: "#191613",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rei ishioka": {
		peau: "#c99378",
		cheveux: "#1c1b19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"rei shibata": {
		peau: "#c4865f",
		cheveux: "#251f1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"reid aiden": {
		peau: "#d4a79a",
		cheveux: "#342626",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"reid callum": {
		peau: "#bf877a",
		cheveux: "#564031",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"reijiro usui": {
		peau: "#daa690",
		cheveux: "#222426",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"reijiro yamamoto": {
		peau: "#dd9e79",
		cheveux: "#28241f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"reilly colm": {
		peau: "#ad816c",
		cheveux: "#19281e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"reinach cobus": {
		peau: "#a86c59",
		cheveux: "#1f1812",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"reinhardt ludwig": {
		peau: "#b37e6b",
		cheveux: "#1e1916",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"reiya ueyama": {
		peau: "#ac7157",
		cheveux: "#141412",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"rekeiti ma asi white": {
		tailleCm: 182,
		poidsKg: 90,
		peau: "#966555",
		cheveux: "#161b1b",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"rekeiti maasi white": {
		peau: "#966555",
		cheveux: "#161b1b",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"remi bourdeau": {
		tailleCm: 199,
		poidsKg: 101,
		peau: "#d69d83",
		cheveux: "#352923",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"remi couty": {
		tailleCm: 189,
		poidsKg: 101,
		peau: "#745f62",
		cheveux: "#3d352e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"remi di pietro": {
		tailleCm: 189,
		poidsKg: 105,
		peau: "#c8916d",
		cheveux: "#493e2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"remy baget": {
		tailleCm: 177,
		poidsKg: 84,
		peau: "#d38474",
		cheveux: "#6e4f43",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ren hagiwara": {
		peau: "#c78d70",
		cheveux: "#382b22",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ren iinuma": {
		peau: "#dfac84",
		cheveux: "#151911",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"ren osawa": {
		peau: "#da8f5e",
		cheveux: "#1d1812",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ren ouchi": {
		peau: "#db9b73",
		cheveux: "#271c19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ren shinwada": {
		peau: "#b58c77",
		cheveux: "#171311",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ren takano": {
		peau: "#b67d63",
		cheveux: "#181816",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ren taninaka": {
		peau: "#b68774",
		cheveux: "#201d1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ren toma": {
		peau: "#dda999",
		cheveux: "#292524",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"renger van eerten": {
		tailleCm: 202,
		poidsKg: 111,
		peau: "#b69383",
		cheveux: "#3b3027",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"renji oike": {
		peau: "#d7b299",
		cheveux: "#312f30",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"rento tsukayama": {
		peau: "#cc9072",
		cheveux: "#1d1c1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"reo matsushita": {
		peau: "#dcac9c",
		cheveux: "#2a2628",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"reon paul": {
		peau: "#a66450",
		cheveux: "#17110d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"retief marais": {
		tailleCm: 194,
		poidsKg: 97,
		peau: "#c07a5b",
		cheveux: "#1f160f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"reuben logan": {
		tailleCm: 199,
		poidsKg: 104,
		peau: "#cf9a87",
		cheveux: "#2d2b33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"reuben morgan williams": {
		tailleCm: 185,
		poidsKg: 75,
		peau: "#ac7f6c",
		cheveux: "#43342b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"reuben o neill": {
		peau: "#a56350",
		cheveux: "#352218",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"rg snyman": {
		peau: "#ca8875",
		cheveux: "#1b2e49",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"rgis montagne": {
		peau: "#c4917c",
		cheveux: "#352b25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rhan janse van rensburg": {
		peau: "#976a56",
		cheveux: "#342922",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"rhodri jones": {
		tailleCm: 195,
		poidsKg: 108,
		peau: "#c08a74",
		cheveux: "#412f23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rhodri williams": {
		tailleCm: 178,
		poidsKg: 76,
		peau: "#b7826f",
		cheveux: "#4e382b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rhyno smith": {
		tailleCm: 177,
		poidsKg: 75,
		peau: "#8e5e47",
		cheveux: "#6d3818",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"rhys barratt": {
		tailleCm: 180,
		poidsKg: 104,
		peau: "#b88986",
		cheveux: "#574b46",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"rhys davies": {
		tailleCm: 200,
		poidsKg: 116,
		peau: "#9d715e",
		cheveux: "#322b2d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"rhys henry": {
		tailleCm: 168,
		poidsKg: 108,
		peau: "#ba816f",
		cheveux: "#6f4d43",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"rhys van nek": {
		peau: "#c68f7c",
		cheveux: "#2f3b48",
		yeux: "#587383",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"ribaldi giampietro": {
		peau: "#b68774",
		cheveux: "#4c3e38",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"riccardo favretto": {
		tailleCm: 200,
		poidsKg: 96,
		peau: "#a77667",
		cheveux: "#16110d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"richard capstick": {
		tailleCm: 193,
		poidsKg: 109,
		peau: "#d69683",
		cheveux: "#452b1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"richard goh jones": {
		peau: "#cba591",
		cheveux: "#4b3728",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"richard hardwick": {
		tailleCm: 180,
		poidsKg: 98,
		peau: "#d08c77",
		cheveux: "#342620",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"richard tamanui arnold": {
		peau: "#a77762",
		cheveux: "#241f1d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"richards dai": {
		peau: "#d99f83",
		cheveux: "#966f52",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"richardson fin": {
		peau: "#d19b87",
		cheveux: "#4d494a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"richie asiata": {
		peau: "#996b50",
		cheveux: "#17130e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"richie mounga": {
		peau: "#c49177",
		cheveux: "#1a1a18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"richmond tongatama": {
		peau: "#ad8065",
		cheveux: "#151413",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ricky riccitelli": {
		tailleCm: 183,
		poidsKg: 102,
		peau: "#e0b7b0",
		cheveux: "#1d1c1c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"rieko ioane": {
		peau: "#ae7752",
		cheveux: "#090c17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rihito katou": {
		peau: "#c58567",
		cheveux: "#2a221d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"riki sugihara": {
		peau: "#ad806a",
		cheveux: "#0e0d0b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"riki takebe": {
		peau: "#dba58b",
		cheveux: "#262220",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"riki tanaka": {
		peau: "#dead9b",
		cheveux: "#2d2d2e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"riki yamaguchi": {
		peau: "#b78065",
		cheveux: "#1b1816",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"rikiya matsuda": {
		peau: "#dbab93",
		cheveux: "#2a2a2c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"rikiya oishi": {
		peau: "#d9b6a1",
		cheveux: "#2c2928",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"riku iwai": {
		peau: "#c19382",
		cheveux: "#231c19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"riku kitahara": {
		peau: "#e1ab8e",
		cheveux: "#2c2b2c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"riku mishima": {
		peau: "#d1967d",
		cheveux: "#28221e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"riku mizuno": {
		peau: "#d39587",
		cheveux: "#2b2328",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"riku ono": {
		peau: "#cc927e",
		cheveux: "#151313",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "short_beard"
	},
	"riku takahashi": {
		peau: "#bf8e80",
		cheveux: "#2c231f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"riku tomita": {
		peau: "#9a6753",
		cheveux: "#14130f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"rikus pretorius": {
		peau: "#deb2ac",
		cheveux: "#4f3c37",
		yeux: "#624633",
		coiffure: "long",
		barbe: "moustache"
	},
	"rikuto fukuda": {
		peau: "#d39e8e",
		cheveux: "#262527",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"rikuya takashima": {
		peau: "#d2988a",
		cheveux: "#28242b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"rikyu yamakawa": {
		peau: "#c58e73",
		cheveux: "#26201c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"riley higgins": {
		peau: "#d08d71",
		cheveux: "#79503e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"riley hohepa": {
		peau: "#be754c",
		cheveux: "#1f160d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"riley norton": {
		peau: "#ba8569",
		cheveux: "#2a2012",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ringrose garry": {
		peau: "#9e6b59",
		cheveux: "#372c1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rinpei sakaki": {
		peau: "#dc9f87",
		cheveux: "#1e1d1b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"rintaro kawasima": {
		peau: "#bc8779",
		cheveux: "#181717",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"rintaro maruyama": {
		peau: "#a66a51",
		cheveux: "#23221e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"rintarou noda": {
		peau: "#c68764",
		cheveux: "#2b201a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"rinto kagawa": {
		peau: "#c49b88",
		cheveux: "#201b17",
		yeux: "#624633",
		coiffure: "long",
		barbe: "moustache"
	},
	"rio dyer": {
		tailleCm: 181,
		poidsKg: 73,
		peau: "#a4614c",
		cheveux: "#1e1511",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ritsuki nakayama": {
		peau: "#b88f7a",
		cheveux: "#16120f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"rivez reihana": {
		peau: "#c39175",
		cheveux: "#1c1713",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rizzoli luca": {
		peau: "#8f6058",
		cheveux: "#403735",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"rmi brosset": {
		peau: "#a67663",
		cheveux: "#211d1b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"rmi loop": {
		peau: "#dea294",
		cheveux: "#4d3a36",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rmi picquette": {
		peau: "#b06e59",
		cheveux: "#312d2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"rmi seneca": {
		peau: "#b37d62",
		cheveux: "#3e3632",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rmy lanen": {
		peau: "#c98b76",
		cheveux: "#796445",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"ro masivesi dakuwaqa": {
		peau: "#835b45",
		cheveux: "#1d1b19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"rob herring": {
		peau: "#cd8f7c",
		cheveux: "#392720",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rob hunt": {
		peau: "#c18874",
		cheveux: "#392d23",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"rob thompson": {
		peau: "#e5ae95",
		cheveux: "#26221f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"rob valetini": {
		peau: "#9b614b",
		cheveux: "#282a2f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"robbie henshaw": {
		peau: "#c18672",
		cheveux: "#1d261e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"robbie smith": {
		tailleCm: 174,
		poidsKg: 101,
		peau: "#cd9e9a",
		cheveux: "#896249",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"robert baloucoune": {
		peau: "#bf907c",
		cheveux: "#2a211b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"robert leota": {
		peau: "#a96150",
		cheveux: "#442b1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"robert rodgers": {
		peau: "#a87c67",
		cheveux: "#382f29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"roberts george": {
		peau: "#cb917d",
		cheveux: "#6f5240",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"roberts joe": {
		peau: "#ac7c77",
		cheveux: "#29191a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"robin bellemand": {
		tailleCm: 191,
		poidsKg: 116,
		peau: "#c0886f",
		cheveux: "#4f3526",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"robin taccola": {
		tailleCm: 181,
		poidsKg: 82,
		peau: "#985d4c",
		cheveux: "#2b1d17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"robson dan": {
		peau: "#c38c84",
		cheveux: "#4d2d25",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"roche jonathan": {
		peau: "#b47f64",
		cheveux: "#2f1f15",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"rodrigo bruni": {
		tailleCm: 189,
		poidsKg: 101,
		peau: "#b97260",
		cheveux: "#110e0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"rodrigo de bivar weinholtz cardoso marta": {
		peau: "#c98e71",
		cheveux: "#322118",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rodrigo isgr": {
		peau: "#9d6950",
		cheveux: "#1b1107",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rodrigo martinez": {
		tailleCm: 188,
		poidsKg: 111,
		peau: "#c48e79",
		cheveux: "#4a372c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rodrigue neti": {
		tailleCm: 187,
		poidsKg: 112,
		peau: "#bd7c65",
		cheveux: "#171517",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"roger farias martin": {
		peau: "#cf997d",
		cheveux: "#2d3d42",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"rogers tom": {
		peau: "#c0897d",
		cheveux: "#5f232a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"romain briatte": {
		tailleCm: 190,
		poidsKg: 101,
		peau: "#c48f7f",
		cheveux: "#694e46",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"romain buros": {
		tailleCm: 189,
		poidsKg: 89,
		peau: "#936753",
		cheveux: "#181515",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"romain delemarle": {
		tailleCm: 199,
		poidsKg: 98,
		peau: "#ae7752",
		cheveux: "#493324",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"romain fonnicola": {
		tailleCm: 189,
		poidsKg: 90,
		peau: "#deae90",
		cheveux: "#282522",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"romain fusier": {
		tailleCm: 192,
		poidsKg: 94,
		peau: "#ceab94",
		cheveux: "#322d23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"romain gardrat": {
		tailleCm: 197,
		poidsKg: 85,
		peau: "#473530",
		cheveux: "#191311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"romain latterrade": {
		tailleCm: 177,
		poidsKg: 106,
		peau: "#d1a994",
		cheveux: "#3b3837",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"romain macurdy": {
		tailleCm: 206,
		poidsKg: 102,
		peau: "#cc9f88",
		cheveux: "#40382f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"romain ntamack": {
		tailleCm: 187,
		poidsKg: 88,
		peau: "#d7967a",
		cheveux: "#1d1414",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"romain ruffenach": {
		tailleCm: 189,
		poidsKg: 100,
		peau: "#d4aaa3",
		cheveux: "#3a3a3a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"romain taofifenua": {
		tailleCm: 208,
		poidsKg: 130,
		peau: "#b36853",
		cheveux: "#1b1312",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"romain trouilloud": {
		tailleCm: 187,
		poidsKg: 90,
		peau: "#c49d85",
		cheveux: "#3e3630",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"roman salanoa": {
		peau: "#c57458",
		cheveux: "#6c2424",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"romao matt": {
		peau: "#b27d65",
		cheveux: "#1a1713",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"romaric camou": {
		tailleCm: 173,
		poidsKg: 74,
		peau: "#c47d67",
		cheveux: "#20120c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"romeo bonnard martin": {
		peau: "#deaa9a",
		cheveux: "#503828",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"romuald seguy": {
		tailleCm: 173,
		poidsKg: 79,
		peau: "#af6e4f",
		cheveux: "#342716",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ronald pieters": {
		peau: "#b49782",
		cheveux: "#6c5d43",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"ronan foxe": {
		tailleCm: 185,
		poidsKg: 121,
		peau: "#d17e74",
		cheveux: "#62291f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ronan kelleher": {
		peau: "#976452",
		cheveux: "#3a2a20",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ronan leahy": {
		peau: "#bc805a",
		cheveux: "#131311",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"ronan mahon": {
		peau: "#b97c68",
		cheveux: "#24281c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ronan patrick loughnane": {
		peau: "#b17d6c",
		cheveux: "#362b25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"roos evan": {
		peau: "#c08871",
		cheveux: "#6b4d32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rory arnold": {
		peau: "#c07d52",
		cheveux: "#2f2013",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"rory darge": {
		tailleCm: 189,
		poidsKg: 96,
		peau: "#c8977d",
		cheveux: "#352c2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rory hutchinson": {
		tailleCm: 182,
		poidsKg: 84,
		peau: "#cb8a79",
		cheveux: "#2d1f16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rory jennings": {
		peau: "#ae7e7c",
		cheveux: "#4c3831",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"rory mcguire": {
		peau: "#c68a75",
		cheveux: "#443125",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rory scott": {
		peau: "#b1806b",
		cheveux: "#4f3628",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"rory sutherland": {
		tailleCm: 186,
		poidsKg: 104,
		peau: "#b78875",
		cheveux: "#413329",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"rory thornton": {
		tailleCm: 203,
		poidsKg: 110,
		peau: "#996d6c",
		cheveux: "#262023",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"ross braude": {
		peau: "#c1816e",
		cheveux: "#4d3c3b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ross byrne": {
		tailleCm: 193,
		poidsKg: 85,
		peau: "#a1675e",
		cheveux: "#261915",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "full_beard"
	},
	"ross molony": {
		tailleCm: 197,
		poidsKg: 111,
		peau: "#c28c75",
		cheveux: "#342116",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ross moriarty": {
		tailleCm: 191,
		poidsKg: 99,
		peau: "#a97261",
		cheveux: "#79533c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"ross vintcent": {
		tailleCm: 188,
		poidsKg: 92,
		peau: "#d89982",
		cheveux: "#3c2315",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rosser ewan": {
		peau: "#b87c6c",
		cheveux: "#30251d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"rosser jared": {
		peau: "#cb8f73",
		cheveux: "#37271f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"rotimi segun": {
		tailleCm: 183,
		poidsKg: 82,
		peau: "#49302c",
		cheveux: "#1e130e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"rowe kyle": {
		peau: "#be8970",
		cheveux: "#523b2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rowe thomas": {
		peau: "#a3675c",
		cheveux: "#2a1f1c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ru hann greyling": {
		tailleCm: 182,
		poidsKg: 101,
		peau: "#daa390",
		cheveux: "#826956",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"ruadhan quinn": {
		tailleCm: 195,
		poidsKg: 102,
		peau: "#b36f5c",
		cheveux: "#561c19",
		yeux: "#624633",
		coiffure: "long",
		barbe: "full_beard"
	},
	"ruan ackermann": {
		peau: "#cb9171",
		cheveux: "#5c4737",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ruan botha": {
		peau: "#d4a697",
		cheveux: "#523f3b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ruan dreyer": {
		peau: "#ac7862",
		cheveux: "#362c21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ruan nortje": {
		peau: "#b17b6b",
		cheveux: "#2c251d",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"ruan vermaak": {
		peau: "#a16d5e",
		cheveux: "#2d231a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ruben courties": {
		tailleCm: 168,
		poidsKg: 73,
		peau: "#9b6d54",
		cheveux: "#483521",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"ruben diego pargade": {
		peau: "#ac7166",
		cheveux: "#473326",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ruben love": {
		peau: "#d4926d",
		cheveux: "#66412b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ruben moloney": {
		peau: "#be796b",
		cheveux: "#683715",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"ruben schoeman": {
		tailleCm: 203,
		poidsKg: 114,
		peau: "#bc7e78",
		cheveux: "#543b2e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ruben van heerden": {
		tailleCm: 204,
		poidsKg: 118,
		peau: "#b17a5e",
		cheveux: "#2b2117",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"rubiolo pedro": {
		peau: "#965c3f",
		cheveux: "#332416",
		yeux: "#587383",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rudolph jeandre": {
		peau: "#9a6955",
		cheveux: "#443122",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rudy derrieux": {
		tailleCm: 179,
		poidsKg: 82,
		peau: "#b3765c",
		cheveux: "#483422",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ruffolo francesco": {
		peau: "#92695a",
		cheveux: "#514239",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "none"
	},
	"ruggeri davide": {
		peau: "#9e7369",
		cheveux: "#313535",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"ruhan nel": {
		peau: "#c99581",
		cheveux: "#262019",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"rui kuriyama": {
		peau: "#b1856e",
		cheveux: "#1d1816",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"rupeni caucaunibuca jnr": {
		peau: "#946253",
		cheveux: "#070606",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"rusiate finau": {
		peau: "#b16b41",
		cheveux: "#19170f",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "none"
	},
	"ruzza federico": {
		peau: "#c7957c",
		cheveux: "#5b3e29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ryan baird": {
		peau: "#b37f6c",
		cheveux: "#2b382b",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"ryan chapuis": {
		tailleCm: 184,
		poidsKg: 99,
		peau: "#ad7a68",
		cheveux: "#302422",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"ryan conbeer": {
		peau: "#ad7c71",
		cheveux: "#3e3839",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ryan conor": {
		peau: "#d28a78",
		cheveux: "#853724",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ryan crowley": {
		tailleCm: 175,
		poidsKg: 80,
		peau: "#bf8c8a",
		cheveux: "#6a534c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ryan elias": {
		tailleCm: 188,
		poidsKg: 110,
		peau: "#a06e66",
		cheveux: "#74222c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ryan james": {
		peau: "#a06b60",
		cheveux: "#142c41",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ryan john": {
		peau: "#de9d8d",
		cheveux: "#9b3935",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ryan kieran": {
		peau: "#db968a",
		cheveux: "#872f2a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ryan lonergan": {
		peau: "#c59384",
		cheveux: "#39343f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"ryan mccauley": {
		tailleCm: 206,
		poidsKg: 108,
		peau: "#b07c7c",
		cheveux: "#28211f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ryan smith": {
		tailleCm: 194,
		poidsKg: 112,
		peau: "#b38677",
		cheveux: "#2f2729",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ryan woodman": {
		tailleCm: 194,
		poidsKg: 97,
		peau: "#dba188",
		cheveux: "#463125",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"rye on yoon": {
		peau: "#d39986",
		cheveux: "#1c1b19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryno pieterse": {
		peau: "#b87f6c",
		cheveux: "#302720",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ryo eto": {
		peau: "#c5936f",
		cheveux: "#231d19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryo furuta": {
		peau: "#dda086",
		cheveux: "#252526",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryo hosomoto": {
		peau: "#ba9476",
		cheveux: "#1e1a18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryo iwakami": {
		peau: "#b28269",
		cheveux: "#181816",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryo kikkawa": {
		peau: "#d89773",
		cheveux: "#352c29",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryo magoshi": {
		peau: "#c68976",
		cheveux: "#292723",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryo tabata": {
		peau: "#c1916c",
		cheveux: "#2c211c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryohei isoda": {
		peau: "#a37155",
		cheveux: "#211c18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryohei momota": {
		peau: "#c89e87",
		cheveux: "#282321",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryohei yamanaka": {
		peau: "#b77140",
		cheveux: "#443318",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "none"
	},
	"ryoi kamei": {
		peau: "#a76627",
		cheveux: "#41260c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"ryom kim": {
		peau: "#dda685",
		cheveux: "#412a17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryoma nishimura": {
		peau: "#dca98f",
		cheveux: "#2b2929",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryong ji kim": {
		peau: "#d8a57e",
		cheveux: "#13160d",
		yeux: "#657452",
		coiffure: "curly",
		barbe: "none"
	},
	"ryongtee oh": {
		peau: "#d9a581",
		cheveux: "#131110",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"ryosei kojima": {
		peau: "#d19678",
		cheveux: "#181614",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryosei takai": {
		peau: "#b56c4a",
		cheveux: "#0a0808",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryosuke funahashi": {
		peau: "#be9c82",
		cheveux: "#23201e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryosuke iwaihara": {
		peau: "#c89978",
		cheveux: "#1f1b19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryosuke kagoshima": {
		peau: "#c29278",
		cheveux: "#181815",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryosuke kataoka": {
		peau: "#a26646",
		cheveux: "#1d1d1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ryosuke kawase": {
		peau: "#bd8574",
		cheveux: "#281f1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryota fukamura": {
		peau: "#66543f",
		cheveux: "#4a3a28",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"ryota funabiki": {
		peau: "#ca9b85",
		cheveux: "#2f2b29",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryota hasegawa": {
		peau: "#c79273",
		cheveux: "#221f1d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryota kono": {
		peau: "#c69179",
		cheveux: "#2f261f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryota kuribara": {
		peau: "#a87b61",
		cheveux: "#191513",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ryota noda": {
		peau: "#d49a91",
		cheveux: "#2b2b2e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryota ohata": {
		peau: "#d79a74",
		cheveux: "#18150c",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"ryota saito": {
		peau: "#d29f91",
		cheveux: "#323236",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ryota sakino": {
		peau: "#d4a295",
		cheveux: "#36353a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryotaro asami": {
		peau: "#d79e89",
		cheveux: "#2f2823",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryotaro nose": {
		peau: "#d3af99",
		cheveux: "#49403c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryotaro saito": {
		peau: "#be8572",
		cheveux: "#1c1c1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryoto nakamura": {
		peau: "#ba7a6c",
		cheveux: "#1f1c1b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryoto tomita": {
		peau: "#cc9f94",
		cheveux: "#211f20",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryousei kohara": {
		peau: "#c18165",
		cheveux: "#271d19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryoutaro shimizu": {
		peau: "#dea69f",
		cheveux: "#1d171b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryu fukuhara": {
		peau: "#c08c67",
		cheveux: "#2b201a",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"ryu suzuki": {
		peau: "#cd967b",
		cheveux: "#161512",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryuga hashimoto": {
		peau: "#c48977",
		cheveux: "#1f1e1e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryuji abe": {
		peau: "#d89b7b",
		cheveux: "#2a2422",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryuji fujimura": {
		peau: "#dfab85",
		cheveux: "#191a11",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryuji hirose": {
		peau: "#b98376",
		cheveux: "#170f0e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryuji kobayashi": {
		peau: "#a06a54",
		cheveux: "#2e261f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ryuji noguchi": {
		peau: "#d2a182",
		cheveux: "#242222",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryuki hayashi": {
		peau: "#be948e",
		cheveux: "#232222",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryunosuke aoyagi": {
		peau: "#d08d76",
		cheveux: "#241d19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryunosuke fujiwara": {
		peau: "#d49488",
		cheveux: "#211d23",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryunosuke momoji": {
		peau: "#d79881",
		cheveux: "#363536",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryunosuke yamada": {
		peau: "#dca288",
		cheveux: "#2d2b29",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryusei kaneko": {
		peau: "#d4a17b",
		cheveux: "#151515",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryusei kato": {
		peau: "#dea88a",
		cheveux: "#323538",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryusei koike": {
		peau: "#bf8777",
		cheveux: "#222223",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryusei shibata": {
		peau: "#c79485",
		cheveux: "#372f2f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ryusei yamaguchi": {
		peau: "#c79678",
		cheveux: "#2a2320",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"ryushin sone": {
		peau: "#96624b",
		cheveux: "#131211",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryusuke yamamoto": {
		peau: "#dda29b",
		cheveux: "#35272b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryuta nakamori": {
		peau: "#c1856a",
		cheveux: "#211e1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryuta yasui": {
		peau: "#bb8561",
		cheveux: "#201b1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryutaro iguchi": {
		peau: "#b38c76",
		cheveux: "#1d1816",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryutaro nakayama": {
		peau: "#deac9b",
		cheveux: "#312f31",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"ryuto fukuyama": {
		peau: "#c37350",
		cheveux: "#2c1a0f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryuto yagisawa": {
		peau: "#bd9276",
		cheveux: "#1b1713",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"ryuuju murata": {
		peau: "#d28970",
		cheveux: "#352820",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"saba nozadze": {
		tailleCm: 173,
		poidsKg: 103,
		peau: "#b98d84",
		cheveux: "#1e2123",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sacha courthaliac": {
		tailleCm: 175,
		poidsKg: 64,
		peau: "#be8f5f",
		cheveux: "#352d1d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"sacha feinberg mngomezulu": {
		peau: "#90573d",
		cheveux: "#0d0e0b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sacha idoumi": {
		tailleCm: 181,
		poidsKg: 100,
		peau: "#ad7b6d",
		cheveux: "#1b1b1d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"sacha lonchampt": {
		tailleCm: 172,
		poidsKg: 90,
		peau: "#be8860",
		cheveux: "#332719",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sacha lotrian": {
		tailleCm: 180,
		poidsKg: 98,
		peau: "#c79987",
		cheveux: "#463e35",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"sacha zegueur": {
		tailleCm: 191,
		poidsKg: 99,
		peau: "#b97c5f",
		cheveux: "#413a33",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"sadek deghmache": {
		peau: "#a98275",
		cheveux: "#2f3233",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"saimoni vunilagi": {
		peau: "#8e523d",
		cheveux: "#1a1816",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"salanoa roman": {
		peau: "#c57458",
		cheveux: "#6c2424",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"salesi rayasi": {
		tailleCm: 193,
		poidsKg: 95,
		peau: "#76503f",
		cheveux: "#101011",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"salmaan moerat": {
		tailleCm: 199,
		poidsKg: 117,
		peau: "#ab6f4f",
		cheveux: "#1f1c14",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"salt eliot": {
		peau: "#a26555",
		cheveux: "#2a1811",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sam caird": {
		peau: "#dfab8e",
		cheveux: "#845b41",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"sam cane": {
		peau: "#c9948d",
		cheveux: "#60493f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sam chongkit": {
		peau: "#ca8e77",
		cheveux: "#232122",
		yeux: "#624633",
		coiffure: "long",
		barbe: "moustache"
	},
	"sam costelow": {
		tailleCm: 174,
		poidsKg: 76,
		peau: "#ba847b",
		cheveux: "#5a4032",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sam crean": {
		peau: "#d09c85",
		cheveux: "#2c211c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sam dugdale": {
		tailleCm: 187,
		poidsKg: 99,
		peau: "#a27563",
		cheveux: "#252320",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sam gilbert": {
		tailleCm: 188,
		poidsKg: 90,
		peau: "#cd9886",
		cheveux: "#5e4533",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sam graham": {
		tailleCm: 187,
		poidsKg: 104,
		peau: "#b5857d",
		cheveux: "#273028",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"sam greene": {
		peau: "#b9987c",
		cheveux: "#806b54",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"sam hainsworth fa aofo": {
		peau: "#c38967",
		cheveux: "#211d1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sam henwood": {
		peau: "#d09980",
		cheveux: "#312722",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sam illo": {
		tailleCm: 181,
		poidsKg: 110,
		peau: "#86442d",
		cheveux: "#121610",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"sam kieron jeffries": {
		peau: "#d08f87",
		cheveux: "#754f39",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sam lousi": {
		tailleCm: 198,
		poidsKg: 114,
		peau: "#8b6356",
		cheveux: "#46181f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sam oconnor": {
		peau: "#a06c63",
		cheveux: "#4c2b2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sam parry": {
		tailleCm: 189,
		poidsKg: 109,
		peau: "#a8776a",
		cheveux: "#362c2c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"sam phillip jeffries": {
		peau: "#c58477",
		cheveux: "#3b2b25",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sam prendergast": {
		peau: "#c28c72",
		cheveux: "#243023",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sam riley": {
		tailleCm: 184,
		poidsKg: 101,
		peau: "#b1745c",
		cheveux: "#3d2112",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"sam scarfe": {
		tailleCm: 180,
		poidsKg: 91,
		peau: "#ce9882",
		cheveux: "#896c53",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"sam sheperd": {
		peau: "#bda48c",
		cheveux: "#796e58",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "none"
	},
	"sam slade": {
		peau: "#d89b8d",
		cheveux: "#4d3f44",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sam talakai": {
		tailleCm: 186,
		poidsKg: 113,
		peau: "#b77d57",
		cheveux: "#724522",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"sam underhill": {
		tailleCm: 194,
		poidsKg: 105,
		peau: "#d09985",
		cheveux: "#684b3b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"sam wainwright": {
		tailleCm: 181,
		poidsKg: 111,
		peau: "#a97b7a",
		cheveux: "#2f363f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"sama leonardo malolo": {
		peau: "#a56f62",
		cheveux: "#201f23",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"sami zouhair": {
		tailleCm: 194,
		poidsKg: 104,
		peau: "#9b6c55",
		cheveux: "#1a1817",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"samipeni finau": {
		peau: "#bb7b5c",
		cheveux: "#322728",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"samisoni asaeli": {
		peau: "#cf9569",
		cheveux: "#2b2012",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"samisoni taukei aho": {
		peau: "#7b4931",
		cheveux: "#100d0a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"samisoni tua": {
		peau: "#c48157",
		cheveux: "#261f10",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"sammy arnold": {
		tailleCm: 181,
		poidsKg: 98,
		peau: "#b78d8b",
		cheveux: "#352f2e",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sampie swiegers": {
		tailleCm: 181,
		poidsKg: 98,
		peau: "#9c624f",
		cheveux: "#413a33",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"samson adejimi": {
		tailleCm: 180,
		poidsKg: 101,
		peau: "#876254",
		cheveux: "#463b3a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"samu kerevi": {
		peau: "#b77147",
		cheveux: "#2b1c10",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"samu tawake": {
		peau: "#9f6e5c",
		cheveux: "#252221",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"samuel alex": {
		peau: "#bc8c74",
		cheveux: "#3c2c23",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"samuel bielle biarrey": {
		tailleCm: 182,
		poidsKg: 82,
		peau: "#c2886a",
		cheveux: "#33251f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"samuel davies": {
		peau: "#d8afa5",
		cheveux: "#3c3b39",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"samuel derek wasley": {
		peau: "#b1714a",
		cheveux: "#1e1b11",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"samuel ezeala": {
		tailleCm: 182,
		poidsKg: 91,
		peau: "#af806e",
		cheveux: "#352d2d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"samuel james": {
		peau: "#d39482",
		cheveux: "#412817",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"samuel jean christophe": {
		tailleCm: 185,
		poidsKg: 102,
		peau: "#ab654b",
		cheveux: "#392a23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"samuel maximin": {
		tailleCm: 202,
		poidsKg: 100,
		peau: "#b06a44",
		cheveux: "#221c16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"samuel nollet": {
		tailleCm: 185,
		poidsKg: 92,
		peau: "#664439",
		cheveux: "#2d201a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"samuel nozomu faialaga": {
		peau: "#cd9e83",
		cheveux: "#322f2b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"samuel simmonds": {
		peau: "#ce8769",
		cheveux: "#4f2e22",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"samuel tuifua": {
		peau: "#b18071",
		cheveux: "#252228",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"samuel waqabaca": {
		peau: "#c68662",
		cheveux: "#302c28",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"samuele locatelli": {
		tailleCm: 187,
		poidsKg: 98,
		peau: "#a07465",
		cheveux: "#3f3d38",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sanaila waqa": {
		peau: "#744c39",
		cheveux: "#171714",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"sandi sazi": {
		peau: "#84563b",
		cheveux: "#272111",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"sanele nohamba": {
		tailleCm: 169,
		poidsKg: 64,
		peau: "#6e4f3f",
		cheveux: "#1a1815",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sanshiro kihara": {
		peau: "#b07d6f",
		cheveux: "#1a191b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"sanshiro nomura": {
		peau: "#d59c94",
		cheveux: "#2c2e34",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"santi carreras": {
		peau: "#ae836d",
		cheveux: "#120f0c",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"santiago arata perrone": {
		peau: "#a56b56",
		cheveux: "#4d3224",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"santiago chocobares": {
		tailleCm: 189,
		poidsKg: 95,
		peau: "#cc8e74",
		cheveux: "#231e1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"santiago medrano": {
		tailleCm: 189,
		poidsKg: 107,
		peau: "#a56144",
		cheveux: "#190f0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"santiago socino": {
		peau: "#cd947e",
		cheveux: "#3a302c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"sapoi viliami": {
		peau: "#be8a66",
		cheveux: "#151514",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"sascha mistrulli": {
		tailleCm: 183,
		poidsKg: 101,
		peau: "#cba387",
		cheveux: "#26281f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sasha gue": {
		tailleCm: 190,
		poidsKg: 93,
		peau: "#c17e5c",
		cheveux: "#261d15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"satoshi hatazawa": {
		peau: "#d8a07f",
		cheveux: "#443329",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"satoshi koizumi": {
		peau: "#ce987b",
		cheveux: "#171816",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"satoshi saita": {
		peau: "#d29f90",
		cheveux: "#29282a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"satoshi ueda": {
		peau: "#d0997c",
		cheveux: "#36312e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"saula ma u": {
		peau: "#b67559",
		cheveux: "#30241d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"savala charlie": {
		peau: "#ce948e",
		cheveux: "#503243",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"sazi sandi": {
		peau: "#84563b",
		cheveux: "#272111",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"sbastien taofifenua": {
		peau: "#8e6958",
		cheveux: "#222226",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"scannell niall": {
		peau: "#cd8a7c",
		cheveux: "#65211d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"scarfe sam": {
		peau: "#ce9882",
		cheveux: "#896c53",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"scarra ntubeni": {
		peau: "#81553f",
		cheveux: "#23180f",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"schalk erasmus": {
		peau: "#daa09c",
		cheveux: "#494240",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"scheepers jj": {
		peau: "#b98075",
		cheveux: "#3e342e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"schickerling jd": {
		peau: "#b47c67",
		cheveux: "#251e18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"schickerling patrick": {
		peau: "#b47f69",
		cheveux: "#553a30",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"scola oliver": {
		peau: "#be8a85",
		cheveux: "#351f1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"scott barrett": {
		peau: "#ce8e82",
		cheveux: "#402e30",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"scott cummings": {
		tailleCm: 196,
		poidsKg: 109,
		peau: "#b6856f",
		cheveux: "#2f292b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"scott jonny": {
		peau: "#c19088",
		cheveux: "#342017",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"scott kirk": {
		tailleCm: 177,
		poidsKg: 108,
		peau: "#c78765",
		cheveux: "#291f19",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"scott penny": {
		peau: "#9e6452",
		cheveux: "#332d1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"scott scrafton": {
		peau: "#c08b72",
		cheveux: "#3d291e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"scott whitlock": {
		tailleCm: 173,
		poidsKg: 65,
		peau: "#b48470",
		cheveux: "#221d18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"scott wilson": {
		peau: "#be8e70",
		cheveux: "#5e432e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"scrafton scott": {
		peau: "#c08b72",
		cheveux: "#3d291e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"screech matthew": {
		peau: "#cb8e80",
		cheveux: "#5d4735",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"scully luke": {
		peau: "#a67e71",
		cheveux: "#6d5b48",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"seabelo senatla": {
		peau: "#734935",
		cheveux: "#443523",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"sean edogbo": {
		tailleCm: 191,
		poidsKg: 101,
		peau: "#54342b",
		cheveux: "#110f0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sean jansen": {
		tailleCm: 191,
		poidsKg: 113,
		peau: "#c78571",
		cheveux: "#3c261c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sean kerr": {
		tailleCm: 186,
		poidsKg: 83,
		peau: "#bb795d",
		cheveux: "#3a1d0f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sean mc mahon": {
		peau: "#c88679",
		cheveux: "#3c2d28",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sean naughton": {
		tailleCm: 187,
		poidsKg: 75,
		peau: "#d59485",
		cheveux: "#2e413a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sean obrien": {
		peau: "#d28672",
		cheveux: "#aa2024",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"sean reffell": {
		peau: "#d39b8a",
		cheveux: "#533629",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sean robinson": {
		peau: "#c39280",
		cheveux: "#382f29",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sean vete": {
		peau: "#af856d",
		cheveux: "#211b17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sean walsh": {
		peau: "#d4988a",
		cheveux: "#211814",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sean withy": {
		peau: "#b58b86",
		cheveux: "#4f4940",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"seb atkinson": {
		tailleCm: 184,
		poidsKg: 87,
		peau: "#9f6359",
		cheveux: "#241712",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"seb blake": {
		tailleCm: 186,
		poidsKg: 106,
		peau: "#bd827e",
		cheveux: "#3e2018",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"seb calder": {
		peau: "#db9e8c",
		cheveux: "#3f2d21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"seb davies": {
		tailleCm: 205,
		poidsKg: 110,
		peau: "#cd9887",
		cheveux: "#453730",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"seb driscoll": {
		tailleCm: 183,
		poidsKg: 92,
		peau: "#b87762",
		cheveux: "#210f09",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"seb kelly": {
		tailleCm: 184,
		poidsKg: 98,
		peau: "#d49a81",
		cheveux: "#120e09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"seb stephen": {
		tailleCm: 187,
		poidsKg: 105,
		peau: "#b5876e",
		cheveux: "#372925",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sebasstian sialau": {
		peau: "#a66f55",
		cheveux: "#171614",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"sebastian boshoff": {
		peau: "#a27c6e",
		cheveux: "#65483c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"sebastian de klerk": {
		peau: "#9c644f",
		cheveux: "#3f2a21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sebastian javan": {
		peau: "#ae7752",
		cheveux: "#262127",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"sebastian negri": {
		peau: "#bc836c",
		cheveux: "#271f19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sebastien bezy": {
		tailleCm: 171,
		poidsKg: 68,
		peau: "#c4957e",
		cheveux: "#362e2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sebi krippner": {
		peau: "#c09079",
		cheveux: "#292221",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sef fa agase": {
		peau: "#b1764f",
		cheveux: "#372b20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sei matsuyama": {
		peau: "#ce9182",
		cheveux: "#211d1e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"seijun kawasaki": {
		peau: "#d6a187",
		cheveux: "#252221",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"seima inaba": {
		peau: "#d9a27e",
		cheveux: "#38312b",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"seiya kitajima": {
		peau: "#ca9280",
		cheveux: "#1c1a19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"seiya ozaki": {
		peau: "#b87f6d",
		cheveux: "#27211d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sekonaia pole": {
		peau: "#c98c65",
		cheveux: "#271c10",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sekou macalou": {
		tailleCm: 198,
		poidsKg: 103,
		peau: "#835f58",
		cheveux: "#4f312b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"selesitino ravutaumada": {
		peau: "#945939",
		cheveux: "#201912",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"selevasio tolofua": {
		tailleCm: 191,
		poidsKg: 108,
		peau: "#b8836b",
		cheveux: "#2e2926",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"semi lagivala": {
		tailleCm: 190,
		poidsKg: 82,
		peau: "#b66e54",
		cheveux: "#221616",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"semi radradra": {
		peau: "#765441",
		cheveux: "#3c2f25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"semisi masirewa": {
		peau: "#9f6e56",
		cheveux: "#704b33",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "none"
	},
	"semisi tupou": {
		peau: "#c8927b",
		cheveux: "#212123",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sena hosoya": {
		peau: "#bc9275",
		cheveux: "#12100e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sena hwang": {
		peau: "#d58f62",
		cheveux: "#2d2316",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sena kimura": {
		peau: "#d6a291",
		cheveux: "#1e1c1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"senatla seabelo": {
		peau: "#734935",
		cheveux: "#443523",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"senfu kamei": {
		peau: "#d9a085",
		cheveux: "#1c1c1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"senita lauaki": {
		peau: "#b07955",
		cheveux: "#28211f",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"sentaro fukue": {
		peau: "#c88d71",
		cheveux: "#141413",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"serfontein jan": {
		peau: "#9f644b",
		cheveux: "#231912",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"sergeal petersen": {
		peau: "#68432d",
		cheveux: "#412b1d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"sergo abramishvili": {
		tailleCm: 181,
		poidsKg: 104,
		peau: "#c59483",
		cheveux: "#312829",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"seru uru": {
		tailleCm: 196,
		poidsKg: 106,
		peau: "#6a4037",
		cheveux: "#171516",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"seta naivaluwaqa": {
		peau: "#a07660",
		cheveux: "#2a2524",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"seta tamanivalu": {
		peau: "#ad785e",
		cheveux: "#1d1c1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"setareki bituniyata": {
		tailleCm: 198,
		poidsKg: 105,
		peau: "#8f6f5c",
		cheveux: "#2d2c2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"setareki toganiyadrava": {
		peau: "#8f5d52",
		cheveux: "#0e0d14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"setareki turagacoke": {
		tailleCm: 195,
		poidsKg: 107,
		peau: "#a47260",
		cheveux: "#312929",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"setariki tuicuvu": {
		tailleCm: 183,
		poidsKg: 85,
		peau: "#8c5240",
		cheveux: "#221c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"seunghyok lee": {
		peau: "#c2856c",
		cheveux: "#1a1815",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"seungsin lee": {
		peau: "#d3896a",
		cheveux: "#252221",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"seuseu naitoa ah kuoi": {
		peau: "#9f6347",
		cheveux: "#191310",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"seva kava": {
		peau: "#522d27",
		cheveux: "#090706",
		yeux: "#587383",
		coiffure: "short",
		barbe: "moustache"
	},
	"sevu reece": {
		tailleCm: 178,
		poidsKg: 91,
		peau: "#b18163",
		cheveux: "#2a2722",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"seydou diakite": {
		tailleCm: 178,
		poidsKg: 105,
		peau: "#493936",
		cheveux: "#25211f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"shahn eru": {
		tailleCm: 199,
		poidsKg: 111,
		peau: "#955e3d",
		cheveux: "#1c1911",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"shamus hurley langton": {
		tailleCm: 188,
		poidsKg: 103,
		peau: "#b78272",
		cheveux: "#23302a",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"shanahan dave": {
		peau: "#d49c8b",
		cheveux: "#7d6144",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"shane daly": {
		tailleCm: 187,
		poidsKg: 92,
		peau: "#db9580",
		cheveux: "#632e25",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"shane gates": {
		peau: "#e5b396",
		cheveux: "#5d3c22",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"shane jennings": {
		tailleCm: 190,
		poidsKg: 91,
		peau: "#da968a",
		cheveux: "#532d1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"shane lewis hughes": {
		tailleCm: 192,
		poidsKg: 105,
		peau: "#d08b7a",
		cheveux: "#523b2d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shane wilcox": {
		peau: "#c1876f",
		cheveux: "#131311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"shannon frizell": {
		peau: "#d29e87",
		cheveux: "#997c68",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"shaun reynolds": {
		tailleCm: 189,
		poidsKg: 84,
		peau: "#b17757",
		cheveux: "#35251a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"shaun stevenson": {
		peau: "#d8a296",
		cheveux: "#2c282b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shay mccarthy": {
		tailleCm: 193,
		poidsKg: 83,
		peau: "#c07a5f",
		cheveux: "#641616",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"shayne bolton": {
		tailleCm: 187,
		poidsKg: 94,
		peau: "#d38267",
		cheveux: "#564634",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"sheahan danny": {
		peau: "#d27f67",
		cheveux: "#512a24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sheedy callum": {
		peau: "#c08d87",
		cheveux: "#3e3134",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"sheehan bobby": {
		peau: "#cc977f",
		cheveux: "#2b3244",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sheehan dan": {
		peau: "#9f6253",
		cheveux: "#17375d",
		yeux: "#587383",
		coiffure: "long",
		barbe: "short_beard"
	},
	"sheridan harry": {
		peau: "#d09585",
		cheveux: "#4f312a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"shido nagata": {
		peau: "#ab7b66",
		cheveux: "#191311",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shields hugh": {
		peau: "#d1a196",
		cheveux: "#4d3834",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"shigure takao": {
		peau: "#cf9478",
		cheveux: "#2a2726",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shilo klein": {
		peau: "#ce9f98",
		cheveux: "#3e3432",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"shimpei fukada": {
		peau: "#cf9d7f",
		cheveux: "#1b1a18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shimpei kamata": {
		peau: "#ce9980",
		cheveux: "#171615",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shin ouchi": {
		peau: "#dca480",
		cheveux: "#272422",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shin takeuchi": {
		peau: "#cc9373",
		cheveux: "#0d120b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shingirai dylan masimba manyarara": {
		peau: "#583020",
		cheveux: "#0b0907",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"shinichi tanaka": {
		peau: "#c89077",
		cheveux: "#171513",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"shinnosuke kakinaga": {
		peau: "#b97a68",
		cheveux: "#2a2625",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shinnosuke tafokitau oka": {
		peau: "#c99178",
		cheveux: "#1c1a18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shinnosuke toyonaga": {
		peau: "#d3a681",
		cheveux: "#1d1917",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shinnosuke yamashita": {
		peau: "#cb8f72",
		cheveux: "#25211e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shinnya hirayama": {
		peau: "#cc9d88",
		cheveux: "#191614",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shinobu fujiwara": {
		peau: "#c29a88",
		cheveux: "#291e1c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shinpei suganuma": {
		peau: "#b38a6d",
		cheveux: "#25201e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shinsuke iseki": {
		peau: "#cc967f",
		cheveux: "#2b2a28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"shintaro fujii": {
		peau: "#d7a680",
		cheveux: "#1f1d1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shintaro fukuzawa": {
		peau: "#d49c83",
		cheveux: "#393535",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shintaro matsuda": {
		peau: "#c18b7a",
		cheveux: "#1e1c1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shintaro okamoto": {
		peau: "#ad7761",
		cheveux: "#1f1b17",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shinya komura": {
		peau: "#d19888",
		cheveux: "#1d1d1e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shinya nara": {
		peau: "#dbac9a",
		cheveux: "#2d2d2f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shion matsuda": {
		peau: "#a37966",
		cheveux: "#201b1b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"sho fukui": {
		peau: "#9a6145",
		cheveux: "#1b1a16",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sho furuhata": {
		peau: "#d19f8e",
		cheveux: "#5d4034",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sho maeda": {
		peau: "#cd8b6b",
		cheveux: "#1f1e1d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sho morita": {
		peau: "#b06e4f",
		cheveux: "#2d2a29",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sho nakamura": {
		peau: "#be9880",
		cheveux: "#2d2623",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "moustache"
	},
	"shodai hirao": {
		peau: "#b3776b",
		cheveux: "#171719",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shodai osada": {
		peau: "#d09a86",
		cheveux: "#241f1d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shoei ijima": {
		peau: "#9d6957",
		cheveux: "#13100c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shogo matsushita": {
		peau: "#c5947e",
		cheveux: "#241c19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shogo miura": {
		peau: "#cd947d",
		cheveux: "#302c2c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shogo murakami": {
		peau: "#de9e92",
		cheveux: "#423537",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shogo nakano": {
		peau: "#b17e6f",
		cheveux: "#212022",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shogo nezuka": {
		peau: "#ae7752",
		cheveux: "#2c2a2b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shogo tokota": {
		peau: "#b18071",
		cheveux: "#070707",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shogo yamamura": {
		peau: "#dea07c",
		cheveux: "#302924",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shogo yanagita": {
		peau: "#bd8f77",
		cheveux: "#1d1614",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shohei hirano": {
		peau: "#af7a63",
		cheveux: "#362d24",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shohei ito": {
		peau: "#dda791",
		cheveux: "#262221",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shohei nonaka": {
		peau: "#975b41",
		cheveux: "#171714",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shohei oyama": {
		peau: "#daa37f",
		cheveux: "#2a241f",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"shohei toyoshima": {
		peau: "#d3a189",
		cheveux: "#282724",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shohei tsujimura": {
		peau: "#ac8268",
		cheveux: "#1a1816",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shohei tsukamoto": {
		peau: "#c08973",
		cheveux: "#1c1a19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shoichi takagi": {
		peau: "#d9a48e",
		cheveux: "#1d1a18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shokei kin": {
		peau: "#e2b593",
		cheveux: "#2e2213",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shoki morimoto": {
		peau: "#d99d90",
		cheveux: "#2b2228",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shoki yoshimoto": {
		peau: "#d4997f",
		cheveux: "#25211d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shoma kai": {
		peau: "#c88f79",
		cheveux: "#1f201f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shoma makinouchi": {
		peau: "#99614b",
		cheveux: "#161413",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shoma sagawa": {
		peau: "#c3876a",
		cheveux: "#1c1c19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shoon kataoka": {
		peau: "#c88666",
		cheveux: "#453224",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"shosuke fukasawa": {
		peau: "#dba98a",
		cheveux: "#211d18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shosuke funaki": {
		peau: "#b58274",
		cheveux: "#19100d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shota emi": {
		peau: "#bd8773",
		cheveux: "#1b1918",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shota fukui": {
		peau: "#d2a186",
		cheveux: "#262221",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shota kasai": {
		peau: "#d1a193",
		cheveux: "#212122",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shota kutsuna": {
		peau: "#b4827d",
		cheveux: "#292125",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shota matsuoka": {
		peau: "#ce9e81",
		cheveux: "#2c201c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shota okuno": {
		peau: "#d79a8c",
		cheveux: "#272229",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shota takai": {
		peau: "#bb8471",
		cheveux: "#191613",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shotaro hirai": {
		peau: "#dba17f",
		cheveux: "#261f12",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"shotaro ikedo": {
		peau: "#ce9681",
		cheveux: "#181817",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shotaro kameyama": {
		peau: "#d38457",
		cheveux: "#1d1711",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shoya koyama": {
		peau: "#b2866e",
		cheveux: "#201b17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shu hagihara": {
		peau: "#cb977a",
		cheveux: "#2b2522",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shu umemura": {
		peau: "#a96c52",
		cheveux: "#181714",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shu yamamoto": {
		peau: "#d99771",
		cheveux: "#352b25",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"shuhei matsuhashi": {
		peau: "#dea279",
		cheveux: "#2a2622",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shuhei takeuchi": {
		peau: "#c29489",
		cheveux: "#1c1b1b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shuhei yamaguchi": {
		peau: "#c89079",
		cheveux: "#312b28",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shuho fukushima": {
		peau: "#c79688",
		cheveux: "#1f1f1f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shuichi kobayashi": {
		peau: "#c99386",
		cheveux: "#2e2424",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shuki usuda": {
		peau: "#bb8e6c",
		cheveux: "#3c2e24",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"shuma kanayama": {
		peau: "#bd8a72",
		cheveux: "#151210",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shumpei matsuzawa": {
		peau: "#ca9d8f",
		cheveux: "#272221",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shumpei miura": {
		peau: "#cda383",
		cheveux: "#241f1b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"shun miyake": {
		peau: "#c3876d",
		cheveux: "#1a1916",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"shun nakashika": {
		peau: "#bf8d7f",
		cheveux: "#151111",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shun sawamura": {
		peau: "#d69f81",
		cheveux: "#1e1b18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shun terawaki": {
		peau: "#b88162",
		cheveux: "#413026",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"shun tomonaga": {
		peau: "#b67f70",
		cheveux: "#201814",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shunichiro naka": {
		peau: "#e4b79f",
		cheveux: "#7f675d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"shunsuke abe": {
		peau: "#ddac8c",
		cheveux: "#22211f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shunsuke asaoka": {
		peau: "#cb9075",
		cheveux: "#1c1a18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shunsuke ito": {
		peau: "#cea78e",
		cheveux: "#211d1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shunsuke nunomaki": {
		peau: "#c99179",
		cheveux: "#282422",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shunsuke sakamoto": {
		peau: "#c0876a",
		cheveux: "#1e1c1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"shunsuke sakuta": {
		peau: "#bd967a",
		cheveux: "#1b1915",
		yeux: "#657452",
		coiffure: "afro",
		barbe: "none"
	},
	"shunsuke tani": {
		peau: "#d39682",
		cheveux: "#25201b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shunsuke uenobo": {
		peau: "#ac7257",
		cheveux: "#070503",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shunta koga": {
		peau: "#d09987",
		cheveux: "#221f21",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shunta mori": {
		peau: "#d39b75",
		cheveux: "#10140c",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"shunta nakamura": {
		peau: "#b3815c",
		cheveux: "#2f2722",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shunta takenouchi": {
		peau: "#c48c6f",
		cheveux: "#25231f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"shuntaro kitamura": {
		peau: "#c3967f",
		cheveux: "#191612",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shunya hamano": {
		peau: "#c87949",
		cheveux: "#251b13",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shunya kato": {
		peau: "#c48766",
		cheveux: "#292420",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"shuto harabuchi": {
		peau: "#cf9983",
		cheveux: "#241d19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"shuto nobuhara": {
		peau: "#c79377",
		cheveux: "#201d1b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"si mcintyre": {
		tailleCm: 187,
		poidsKg: 108,
		peau: "#915a3b",
		cheveux: "#1a1410",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"siale lauaki": {
		peau: "#be7654",
		cheveux: "#29201e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"siale mahina": {
		peau: "#b78a6f",
		cheveux: "#1f1c18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"siale otuhouma": {
		peau: "#855e4d",
		cheveux: "#211c1e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sialevailea tolofua": {
		tailleCm: 185,
		poidsKg: 105,
		peau: "#b07757",
		cheveux: "#1f1816",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"sias koen": {
		tailleCm: 193,
		poidsKg: 101,
		peau: "#a56d54",
		cheveux: "#5a3e27",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"siate folau tokolahi": {
		peau: "#b87150",
		cheveux: "#181b1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sid harvey": {
		peau: "#d69b8e",
		cheveux: "#553024",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sidi mohamed diallo": {
		peau: "#6f5a50",
		cheveux: "#20201e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"simelane wandisile": {
		peau: "#6c4633",
		cheveux: "#2a1c0e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"simeli daunivucu": {
		tailleCm: 183,
		poidsKg: 88,
		peau: "#be7051",
		cheveux: "#6a3a23",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"simeone schmidt": {
		peau: "#975f46",
		cheveux: "#1a1715",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"simione kuruvoli": {
		peau: "#b48469",
		cheveux: "#1e1a18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"simli gordon yabaki": {
		peau: "#91614c",
		cheveux: "#352e2d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"simn bentez cruz": {
		peau: "#c99179",
		cheveux: "#1e1817",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"simo broeiro bento": {
		peau: "#c68c7c",
		cheveux: "#312623",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"simon augry": {
		tailleCm: 190,
		poidsKg: 93,
		peau: "#b1674d",
		cheveux: "#16110f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"simon benitez cruz": {
		tailleCm: 176,
		poidsKg: 71,
		peau: "#c99179",
		cheveux: "#1e1817",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"simon bourgeois": {
		tailleCm: 192,
		poidsKg: 112,
		peau: "#cc7c62",
		cheveux: "#22140d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"simon daroque": {
		tailleCm: 170,
		poidsKg: 68,
		peau: "#d18d77",
		cheveux: "#0f0a0c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"simon hickey": {
		peau: "#cc988d",
		cheveux: "#2b221f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"simon huchet": {
		tailleCm: 198,
		poidsKg: 104,
		peau: "#ad7065",
		cheveux: "#443029",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"simon kerrod": {
		tailleCm: 183,
		poidsKg: 116,
		peau: "#b97660",
		cheveux: "#29140e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"simon meka": {
		tailleCm: 196,
		poidsKg: 101,
		peau: "#bb725b",
		cheveux: "#291e1e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"simon miller": {
		peau: "#b78b70",
		cheveux: "#5f4a38",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"simon parker": {
		peau: "#ce8b71",
		cheveux: "#3d2921",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"simon pierre chauvac": {
		tailleCm: 193,
		poidsKg: 108,
		peau: "#c48565",
		cheveux: "#1f1914",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"simon renda": {
		tailleCm: 188,
		poidsKg: 96,
		peau: "#c69277",
		cheveux: "#392f27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"simon tarel": {
		tailleCm: 180,
		poidsKg: 73,
		peau: "#c09076",
		cheveux: "#5b4024",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"simone ferrari": {
		tailleCm: 182,
		poidsKg: 114,
		peau: "#a96f5b",
		cheveux: "#7b5641",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"simone gesi": {
		tailleCm: 187,
		poidsKg: 69,
		peau: "#d6a088",
		cheveux: "#463f3c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"simote moala": {
		tailleCm: 172,
		poidsKg: 116,
		peau: "#c57d61",
		cheveux: "#20181a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"simphiwe matanzima": {
		peau: "#b5765f",
		cheveux: "#3a393b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"sinclair louie": {
		peau: "#be886b",
		cheveux: "#5b3e1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sintaro kabuki": {
		peau: "#c39077",
		cheveux: "#211f1a",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"sintu manjezi": {
		peau: "#5f3e30",
		cheveux: "#1f1a16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"sioeli vakalahi": {
		peau: "#9c6b4c",
		cheveux: "#1c1918",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"sione afemui": {
		peau: "#a27754",
		cheveux: "#2d2923",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sione ahio": {
		tailleCm: 184,
		poidsKg: 111,
		peau: "#d4865c",
		cheveux: "#2b221d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"sione feofaaki tui": {
		peau: "#ac826b",
		cheveux: "#161616",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sione halasili": {
		peau: "#8d583a",
		cheveux: "#1c1918",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sione kalamafoni": {
		tailleCm: 200,
		poidsKg: 108,
		peau: "#ad6346",
		cheveux: "#2a1109",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"sione langi vailanu": {
		peau: "#c88c69",
		cheveux: "#070506",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sione lavemai": {
		peau: "#bd8567",
		cheveux: "#1f1b1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sione likuata teaupa": {
		peau: "#b57a58",
		cheveux: "#412f24",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sione polutele": {
		peau: "#9f6a4e",
		cheveux: "#2f221b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sione sime mau": {
		peau: "#c0825c",
		cheveux: "#2f2c2a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sione talitui": {
		peau: "#cf8970",
		cheveux: "#1a1c1f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"sione teaupa": {
		peau: "#bd8572",
		cheveux: "#2c2a2c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"sione tuipulotu": {
		tailleCm: 173,
		poidsKg: 97,
		peau: "#b48665",
		cheveux: "#201f1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sione vae nuku": {
		peau: "#9a5d45",
		cheveux: "#14100f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sione vaenuku": {
		peau: "#9a5d45",
		cheveux: "#14100f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sione vailanu": {
		tailleCm: 189,
		poidsKg: 118,
		peau: "#a87256",
		cheveux: "#1b1815",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sione vuna": {
		peau: "#91664d",
		cheveux: "#241b14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"siope tavo": {
		peau: "#db9674",
		cheveux: "#3c322b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"siosaia fifita": {
		peau: "#c89981",
		cheveux: "#343230",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"siosifa amone": {
		peau: "#a56046",
		cheveux: "#31261f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"siosifa lisala": {
		peau: "#c0845e",
		cheveux: "#181c13",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sipili falatea": {
		tailleCm: 185,
		poidsKg: 108,
		peau: "#7b5445",
		cheveux: "#2b1c1c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"sireli maqala": {
		tailleCm: 172,
		poidsKg: 76,
		peau: "#b26452",
		cheveux: "#110e0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sireli masiwini": {
		tailleCm: 181,
		poidsKg: 83,
		peau: "#805f4b",
		cheveux: "#1b1a18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"sitalekitaufa makisi": {
		peau: "#b6784e",
		cheveux: "#201c18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sithole sti": {
		peau: "#987464",
		cheveux: "#483f2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sitiveni vasuturaga": {
		peau: "#5b3224",
		cheveux: "#130906",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"siua maile": {
		tailleCm: 179,
		poidsKg: 104,
		peau: "#8e594b",
		cheveux: "#1e1d1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"siya kolisi": {
		peau: "#7a4944",
		cheveux: "#242120",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"siya masuku": {
		peau: "#724e3c",
		cheveux: "#252621",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sjoerd bakker": {
		peau: "#c79f91",
		cheveux: "#786451",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"skip jongejan": {
		tailleCm: 204,
		poidsKg: 95,
		peau: "#b98676",
		cheveux: "#5c4830",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"slabbert deon": {
		peau: "#b57d6c",
		cheveux: "#342b23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sleightholme ollie": {
		peau: "#c9968c",
		cheveux: "#231612",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"slimani rabah": {
		peau: "#c98466",
		cheveux: "#372e29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"smit chris": {
		peau: "#ae7968",
		cheveux: "#593f28",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"smit cornel": {
		peau: "#b98771",
		cheveux: "#3a2c23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"smith adre": {
		peau: "#c88c6d",
		cheveux: "#3e3322",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"smith andrew": {
		peau: "#d79988",
		cheveux: "#a62e2a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"smith fin": {
		peau: "#ba807a",
		cheveux: "#573225",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"smith jean": {
		peau: "#ba8a74",
		cheveux: "#433729",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"smith mornay": {
		peau: "#9d6859",
		cheveux: "#201d1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"smith ollie": {
		peau: "#c78c75",
		cheveux: "#46342e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"smith rhyno": {
		peau: "#8e5e47",
		cheveux: "#6d3818",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"smith robbie": {
		peau: "#cd9e9a",
		cheveux: "#896249",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"smith ryan": {
		peau: "#b38677",
		cheveux: "#2f2729",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"smyth eoghan": {
		peau: "#d38b7b",
		cheveux: "#533627",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"smyth niall": {
		peau: "#bd9181",
		cheveux: "#10316a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"smyth stephen": {
		peau: "#cc9078",
		cheveux: "#182528",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"snyman eli": {
		peau: "#a1725b",
		cheveux: "#362e20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"snyman rg": {
		peau: "#ca8875",
		cheveux: "#1b2e49",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"so ibaragi": {
		peau: "#b47961",
		cheveux: "#25211e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"so kinoshita": {
		peau: "#df9f88",
		cheveux: "#3b3d3f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"so matsushima": {
		peau: "#b18569",
		cheveux: "#191613",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"soichiro kuwata": {
		peau: "#cb998b",
		cheveux: "#2b2b2e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"soji iwamoto": {
		peau: "#e0ad9f",
		cheveux: "#140c0a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"soki watanabe": {
		peau: "#d3a48e",
		cheveux: "#222020",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sol moody": {
		tailleCm: 189,
		poidsKg: 91,
		peau: "#c78e6a",
		cheveux: "#2c231b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"solomon alaimalo": {
		tailleCm: 191,
		poidsKg: 89,
		peau: "#ce7f6d",
		cheveux: "#202020",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"solomon david shand": {
		peau: "#aa7663",
		cheveux: "#060707",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"solomone funaki": {
		peau: "#ab765d",
		cheveux: "#201b16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"solomone kata": {
		tailleCm: 174,
		poidsKg: 93,
		peau: "#9e675c",
		cheveux: "#1b191d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"soma matsumoto": {
		peau: "#daa57e",
		cheveux: "#10130b",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"soma okazaki": {
		peau: "#d0ad8f",
		cheveux: "#26211b",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"soma sugimoto": {
		peau: "#c2886b",
		cheveux: "#282322",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"songyu cho": {
		peau: "#c99073",
		cheveux: "#241f1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sonny goode": {
		peau: "#ab6b5d",
		cheveux: "#5c4131",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"sonny tonga uiha": {
		tailleCm: 196,
		poidsKg: 139,
		peau: "#b77d72",
		cheveux: "#181010",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"soonhong lee": {
		peau: "#c68a62",
		cheveux: "#241f1c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"soopyung lee": {
		peau: "#b38174",
		cheveux: "#1b1716",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"sootala faasoo": {
		peau: "#905d44",
		cheveux: "#100e0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"sora ouchi": {
		peau: "#ad7768",
		cheveux: "#341c12",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sora roland alaiasa": {
		peau: "#9f7664",
		cheveux: "#292322",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sora torigoe": {
		peau: "#b78073",
		cheveux: "#0f0c0c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"soroka alex": {
		peau: "#c2856e",
		cheveux: "#1c3947",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"sosefo fakatava": {
		peau: "#b67d61",
		cheveux: "#2d2928",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"soshi oga": {
		peau: "#c88c81",
		cheveux: "#22201f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sosiceni tokoqio": {
		peau: "#ce8c73",
		cheveux: "#272427",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"sota hashimoto": {
		peau: "#bc9578",
		cheveux: "#34312d",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"sota oketani": {
		peau: "#c18170",
		cheveux: "#1b1717",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sota saito": {
		peau: "#ca8b6a",
		cheveux: "#131310",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"sotaro matsunaga": {
		peau: "#a16750",
		cheveux: "#131210",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"sotaro tanaka": {
		peau: "#d79b8f",
		cheveux: "#27222a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"souheib benabdelkader": {
		peau: "#d49e8d",
		cheveux: "#100d0d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"soumaila camara": {
		tailleCm: 189,
		poidsKg: 93,
		peau: "#733c25",
		cheveux: "#17110b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"southworth danny": {
		peau: "#bc8384",
		cheveux: "#4d3b3c",
		yeux: "#587383",
		coiffure: "short",
		barbe: "short_beard"
	},
	"spagnolo mirco": {
		peau: "#c58f86",
		cheveux: "#2e3531",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sparrow andrew": {
		peau: "#aa6a55",
		cheveux: "#2f2719",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"sparrow tiaan": {
		peau: "#b1857b",
		cheveux: "#4b222a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"spencer jeans": {
		peau: "#c99280",
		cheveux: "#553724",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"spicer alan": {
		peau: "#c08375",
		cheveux: "#28281d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"st john freddie": {
		peau: "#be867b",
		cheveux: "#2b1b11",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"staddon ethan": {
		peau: "#bf866d",
		cheveux: "#5a432b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"stafford mcdowall": {
		tailleCm: 194,
		poidsKg: 93,
		peau: "#c8947c",
		cheveux: "#6e5039",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"stanley solomon": {
		peau: "#c59171",
		cheveux: "#30261f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"stavile bautista": {
		peau: "#a17260",
		cheveux: "#5a3d34",
		yeux: "#587383",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"stedman gans": {
		peau: "#75432f",
		cheveux: "#15120f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"steenekamp gerhard": {
		peau: "#9b6151",
		cheveux: "#362b20",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"steeve blanc mappaz": {
		tailleCm: 187,
		poidsKg: 94,
		peau: "#af8073",
		cheveux: "#55382f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"stefan marko buruiana": {
		peau: "#a1675d",
		cheveux: "#4e3830",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"stefan ungerer": {
		peau: "#b47e61",
		cheveux: "#272a22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"steff emanuel": {
		peau: "#b48483",
		cheveux: "#3f3c3d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"steff thomas": {
		tailleCm: 187,
		poidsKg: 114,
		peau: "#b08072",
		cheveux: "#443533",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"stephan le roux": {
		tailleCm: 203,
		poidsKg: 110,
		peau: "#a4705b",
		cheveux: "#482d28",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"stephanus du toit": {
		peau: "#c99f90",
		cheveux: "#493b32",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"stephen larkham": {
		peau: "#c78674",
		cheveux: "#3c281d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"stephen seb": {
		peau: "#b5876e",
		cheveux: "#372925",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"stephen smyth": {
		peau: "#cc9078",
		cheveux: "#182528",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"stephen varney": {
		tailleCm: 180,
		poidsKg: 74,
		peau: "#d69981",
		cheveux: "#402513",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"stephens iwan": {
		peau: "#b78b85",
		cheveux: "#30292f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"steve cummins": {
		peau: "#c1917c",
		cheveux: "#3e2d23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"steven barry cummins": {
		peau: "#ca9184",
		cheveux: "#4b3226",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"steven cummins": {
		tailleCm: 203,
		poidsKg: 110,
		peau: "#e2b49b",
		cheveux: "#442d1c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"steven david": {
		tailleCm: 183,
		poidsKg: 95,
		peau: "#6b534d",
		cheveux: "#413738",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"steven luatua": {
		tailleCm: 190,
		poidsKg: 110,
		peau: "#a4694c",
		cheveux: "#151313",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"stewart grant": {
		peau: "#c59777",
		cheveux: "#6e4f3e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"stewart moore": {
		peau: "#d28e74",
		cheveux: "#5a3722",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"stewart tom": {
		peau: "#e08e78",
		cheveux: "#39271b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"steyn kyle": {
		peau: "#cb9680",
		cheveux: "#694b39",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"sti sithole": {
		peau: "#987464",
		cheveux: "#483f2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"stockdale jacob": {
		peau: "#d19580",
		cheveux: "#5d3828",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"stphane ahmed": {
		peau: "#ae8069",
		cheveux: "#24221f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"stravino jacobs": {
		peau: "#ba8162",
		cheveux: "#2d3a3b",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "none"
	},
	"stu townsend": {
		tailleCm: 180,
		poidsKg: 80,
		peau: "#bd7963",
		cheveux: "#653a2a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"stuart hogg": {
		tailleCm: 182,
		poidsKg: 88,
		peau: "#d99e9c",
		cheveux: "#231d1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"stuart mccloskey": {
		peau: "#c58d74",
		cheveux: "#4d3325",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"stuart olding": {
		tailleCm: 179,
		poidsKg: 85,
		peau: "#cd8d6d",
		cheveux: "#67452c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"suguru aoyagi": {
		peau: "#ce957c",
		cheveux: "#1f1a1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"suguru hidaka": {
		peau: "#daa898",
		cheveux: "#3d3b41",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"suguru tanaka": {
		peau: "#ba897d",
		cheveux: "#1d1513",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"suleiman hartzenberg": {
		peau: "#ad7450",
		cheveux: "#181e16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"suliasi tolu": {
		peau: "#d9844c",
		cheveux: "#2a1f15",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"sunao takizawa": {
		peau: "#d58a58",
		cheveux: "#281e16",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"sutherland rory": {
		peau: "#b78875",
		cheveux: "#413329",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"sutton huw": {
		peau: "#b78976",
		cheveux: "#64453d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"swan cormenier": {
		tailleCm: 173,
		poidsKg: 112,
		peau: "#cd8175",
		cheveux: "#2e1d19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"swan rebbadj": {
		tailleCm: 201,
		poidsKg: 115,
		peau: "#ae6a55",
		cheveux: "#161515",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"swart eddie": {
		peau: "#7b584e",
		cheveux: "#383030",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"sylvestre vakauliafa": {
		tailleCm: 180,
		poidsKg: 105,
		peau: "#a16d5b",
		cheveux: "#070707",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"sylvian mahuza": {
		peau: "#9b7253",
		cheveux: "#46382e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"sylvre reteau": {
		peau: "#bb7c59",
		cheveux: "#60371b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"syoki teranishi": {
		peau: "#d4988b",
		cheveux: "#31262a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"syougo azuma": {
		peau: "#c2927c",
		cheveux: "#1e1c1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"syoutarou matsuo": {
		peau: "#bf8462",
		cheveux: "#26201b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"syunya motoyama": {
		peau: "#cd9f98",
		cheveux: "#252120",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"syuuta takami": {
		peau: "#cb8c6e",
		cheveux: "#251e18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"syuuto inoue": {
		peau: "#70625b",
		cheveux: "#2a1f17",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"tadatsugu kanayama": {
		peau: "#cea193",
		cheveux: "#1c1d1f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tadhg beirne": {
		tailleCm: 198,
		poidsKg: 108,
		peau: "#b88167",
		cheveux: "#751b1c",
		yeux: "#587383",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"tadhg brophy": {
		peau: "#b57c6a",
		cheveux: "#372a18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"tadhg furlong": {
		peau: "#b77669",
		cheveux: "#2f2823",
		yeux: "#577283",
		coiffure: "short",
		barbe: "none"
	},
	"taha kemara": {
		peau: "#c79174",
		cheveux: "#1b1716",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tahlor cahill": {
		peau: "#d19b83",
		cheveux: "#3d2011",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tai cribb": {
		peau: "#bb7f5d",
		cheveux: "#262122",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"tai dowling": {
		peau: "#d49a85",
		cheveux: "#2b241d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taichi chiba": {
		peau: "#daa281",
		cheveux: "#38322c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"taichi kugino": {
		peau: "#e0a985",
		cheveux: "#292623",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taichi mano": {
		peau: "#d7a289",
		cheveux: "#252220",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taichi takahashi": {
		peau: "#c89978",
		cheveux: "#302d2f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taichi takenaka": {
		peau: "#d48e6b",
		cheveux: "#655346",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"taichi yokoo": {
		peau: "#ce998b",
		cheveux: "#232324",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taichi yoshizawa": {
		peau: "#d6a583",
		cheveux: "#181512",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taiga ishida": {
		peau: "#d9a27d",
		cheveux: "#13170e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taiga kato": {
		peau: "#c0997d",
		cheveux: "#13120f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taiga kawasaki": {
		peau: "#d99d86",
		cheveux: "#332c28",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taiga matsuoka": {
		peau: "#a57d6d",
		cheveux: "#322522",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taiga mihara": {
		peau: "#ca8a6b",
		cheveux: "#271e1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taiga ozaki": {
		peau: "#ba7a63",
		cheveux: "#362823",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taiga yamaguchi": {
		peau: "#bb6e55",
		cheveux: "#221812",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taiki fujii": {
		peau: "#d9a895",
		cheveux: "#2b2825",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taiki ito": {
		peau: "#ca9582",
		cheveux: "#252223",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taiki koyama": {
		peau: "#c6977e",
		cheveux: "#201e1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taiki miyashita": {
		peau: "#8e5e43",
		cheveux: "#271f17",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taiki noguchi": {
		peau: "#cd9580",
		cheveux: "#221c19",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taiki washiya": {
		peau: "#c59280",
		cheveux: "#27211d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taiki yamaguchi": {
		peau: "#ce9e82",
		cheveux: "#181615",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taiki yoshioka": {
		peau: "#dead96",
		cheveux: "#262527",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"taine basham": {
		tailleCm: 179,
		poidsKg: 99,
		peau: "#b88d8a",
		cheveux: "#372e36",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"taine craig ranga": {
		peau: "#c78352",
		cheveux: "#111313",
		yeux: "#657452",
		coiffure: "curly",
		barbe: "none"
	},
	"taine plumtree": {
		tailleCm: 192,
		poidsKg: 103,
		peau: "#9d6e65",
		cheveux: "#692b2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"taine robinson": {
		peau: "#c48961",
		cheveux: "#342b1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"taine roiri": {
		peau: "#c47d5e",
		cheveux: "#412a1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"taira main": {
		peau: "#9b6b53",
		cheveux: "#29231f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taira shota": {
		peau: "#ca947a",
		cheveux: "#2d1f17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"taisei fukuda": {
		peau: "#be9984",
		cheveux: "#1f1a16",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taisei konishi": {
		peau: "#ddad84",
		cheveux: "#0b120c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taisei nakao": {
		peau: "#ac8061",
		cheveux: "#201a16",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"taisei okamoto": {
		peau: "#a0786f",
		cheveux: "#272021",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taisei shimomoto": {
		peau: "#d1a26e",
		cheveux: "#29271f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taisei tanaka": {
		peau: "#d9b1a1",
		cheveux: "#26292e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taisetsu kanai": {
		peau: "#c88057",
		cheveux: "#1f160e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taishi nakamura": {
		peau: "#956d5f",
		cheveux: "#1e191c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taishi tsumura": {
		peau: "#d69a76",
		cheveux: "#1c1b1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taishin yuasa": {
		peau: "#c89b82",
		cheveux: "#261e1c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taishiro kido": {
		peau: "#cd947b",
		cheveux: "#1e1b19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taison mogami": {
		peau: "#d59f80",
		cheveux: "#3b3531",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taiyo fukuyama": {
		peau: "#c49186",
		cheveux: "#1f1c1b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taiyou kubo": {
		peau: "#c69481",
		cheveux: "#201c1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taiyou minami": {
		peau: "#c99279",
		cheveux: "#261e1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taj annan": {
		peau: "#d19378",
		cheveux: "#362a1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"takahiro hayashi": {
		peau: "#aa694b",
		cheveux: "#1a1815",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takahiro ogawa": {
		peau: "#d9a78c",
		cheveux: "#2f2926",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"takahito sugahara": {
		peau: "#9d644e",
		cheveux: "#151311",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takanobu minami": {
		peau: "#d8a683",
		cheveux: "#3c332c",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"takara imamura": {
		peau: "#986d48",
		cheveux: "#2d2c26",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"takashi omoto": {
		peau: "#dea680",
		cheveux: "#10140d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takashi oshita": {
		peau: "#bb8a73",
		cheveux: "#181714",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takato mataba": {
		peau: "#cda976",
		cheveux: "#2e281e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takato nasu": {
		peau: "#946c52",
		cheveux: "#38302a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takato okabe": {
		peau: "#c79976",
		cheveux: "#241d1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takatoshi sugawara": {
		peau: "#deb0a3",
		cheveux: "#3e3b3e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takaya saito": {
		peau: "#c18f73",
		cheveux: "#23211f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takayoshi mohara": {
		peau: "#caa182",
		cheveux: "#282522",
		yeux: "#657452",
		coiffure: "curly",
		barbe: "none"
	},
	"takayuki watanabe": {
		peau: "#cf9572",
		cheveux: "#342e2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"takehiro kimura": {
		peau: "#b77b64",
		cheveux: "#28211d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takehiro kitsuki": {
		peau: "#ce8f76",
		cheveux: "#1f1d1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takehiro nishimura": {
		peau: "#bb8579",
		cheveux: "#311f18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takehiro watanabe": {
		peau: "#cea193",
		cheveux: "#232123",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takehito ekawa": {
		peau: "#b68066",
		cheveux: "#161615",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takemichi nakano": {
		peau: "#cf9376",
		cheveux: "#25282b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"takeo suenaga": {
		peau: "#c68c73",
		cheveux: "#302726",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "none"
	},
	"takeshi hino": {
		peau: "#bc9176",
		cheveux: "#221f1b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"takeshi sasaki": {
		peau: "#d8a695",
		cheveux: "#1c1c1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taketo yoshikawa": {
		peau: "#d79f91",
		cheveux: "#2b2b2f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taku toma": {
		peau: "#d28458",
		cheveux: "#2b1d11",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takuhei yasuda": {
		peau: "#e3b494",
		cheveux: "#191a13",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"takuma enomoto": {
		peau: "#b78a73",
		cheveux: "#1e1917",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takuma motohashi": {
		peau: "#c47f6a",
		cheveux: "#282321",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takuma nishino": {
		peau: "#d9a087",
		cheveux: "#2c2826",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takuma oyama": {
		peau: "#99755f",
		cheveux: "#2c2625",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takuma shoji": {
		peau: "#bc9377",
		cheveux: "#191715",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takuma suto": {
		peau: "#db9c80",
		cheveux: "#1e1d1b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takuma yasui": {
		peau: "#d1a280",
		cheveux: "#211913",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takumi aoki": {
		peau: "#c99374",
		cheveux: "#23201f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takumi fujii": {
		peau: "#d89b7f",
		cheveux: "#292424",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takumi furukawa": {
		peau: "#c49073",
		cheveux: "#242220",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takumi handa": {
		peau: "#cf8e75",
		cheveux: "#1b1916",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takumi inaba": {
		peau: "#ba8e77",
		cheveux: "#241d19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takumi ishimoto": {
		peau: "#b98477",
		cheveux: "#211816",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takumi sue": {
		peau: "#a97e6b",
		cheveux: "#231d1e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takumi sugiura": {
		peau: "#cb9170",
		cheveux: "#1c1a18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takumi suzuki": {
		peau: "#a67c68",
		cheveux: "#252020",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takumi takahashi": {
		peau: "#d79c8b",
		cheveux: "#15100e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takumi takeshita": {
		peau: "#c6987e",
		cheveux: "#282421",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takumi tokairin": {
		peau: "#e0a484",
		cheveux: "#362d29",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takumi yoshimoto": {
		peau: "#9e6b53",
		cheveux: "#141413",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takuro hayashida": {
		peau: "#aa7d62",
		cheveux: "#151310",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takuro hojo": {
		peau: "#dca68e",
		cheveux: "#393635",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takuro matsunaga": {
		peau: "#dbaa95",
		cheveux: "#282220",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takuru kamimura": {
		peau: "#bf816c",
		cheveux: "#272322",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takuto kajiwara": {
		peau: "#c78e6b",
		cheveux: "#2a211c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"takuto miwa": {
		peau: "#cea271",
		cheveux: "#332f25",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takuya kanemura": {
		peau: "#d19f93",
		cheveux: "#2a2f39",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"takuya kitade": {
		peau: "#ca886c",
		cheveux: "#2b2626",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"takuya shirae": {
		peau: "#dfb28f",
		cheveux: "#0e130c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takuya takahashi": {
		peau: "#d09782",
		cheveux: "#1f1c18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takuya tsushida": {
		peau: "#9e7567",
		cheveux: "#211c1d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"takuya yamasawa": {
		peau: "#b9826a",
		cheveux: "#242221",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"talakai sam": {
		peau: "#b77d57",
		cheveux: "#724522",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"talau samurai fakatava": {
		peau: "#d79977",
		cheveux: "#322d28",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"taleni seu": {
		peau: "#895c51",
		cheveux: "#1f1d1e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tali ioasa": {
		peau: "#be8961",
		cheveux: "#624e2f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"talifolofola tangipa": {
		peau: "#d89a82",
		cheveux: "#4b3f3b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"talilotu fakatulolo": {
		peau: "#ba8165",
		cheveux: "#252525",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tama kapene": {
		peau: "#8c634f",
		cheveux: "#1e1a1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"tamaiti williams": {
		peau: "#c18d6b",
		cheveux: "#625945",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"tamani charlie": {
		peau: "#9e6959",
		cheveux: "#221a1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tamati ioane": {
		peau: "#c78a62",
		cheveux: "#0c130d",
		yeux: "#624633",
		coiffure: "long",
		barbe: "short_beard"
	},
	"tana tuhakaraina": {
		peau: "#dfae8d",
		cheveux: "#0a110b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "short_beard"
	},
	"tane edmed": {
		peau: "#c5887a",
		cheveux: "#532d20",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tanginoa palu halaifonua": {
		peau: "#a0745e",
		cheveux: "#211f1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tanguy jaillon": {
		peau: "#c78665",
		cheveux: "#3f2a1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tani vili": {
		tailleCm: 188,
		poidsKg: 103,
		peau: "#ae7c62",
		cheveux: "#3b2925",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"taniela filimone": {
		peau: "#a96546",
		cheveux: "#31241f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"taniela matakaiongo": {
		tailleCm: 200,
		poidsKg: 115,
		peau: "#ae7752",
		cheveux: "#231d1e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"taniela rakuro": {
		peau: "#9c6d58",
		cheveux: "#1e1c1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"taniela sadrugu": {
		tailleCm: 192,
		poidsKg: 101,
		peau: "#a0603d",
		cheveux: "#201b16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"taniela vea": {
		peau: "#bd886f",
		cheveux: "#262323",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tanielu tele a": {
		peau: "#c18562",
		cheveux: "#272322",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tarek haffar": {
		tailleCm: 177,
		poidsKg: 111,
		peau: "#6e3829",
		cheveux: "#24110d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"taro nishikawa": {
		peau: "#c1907b",
		cheveux: "#26211f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taro sato": {
		peau: "#d6a989",
		cheveux: "#31271f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taro uesugi": {
		peau: "#b98266",
		cheveux: "#1f1611",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"taroma togo": {
		peau: "#be8f85",
		cheveux: "#141314",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tarou ide": {
		peau: "#bb7c5c",
		cheveux: "#392a1d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tasuke yao": {
		peau: "#cf9a85",
		cheveux: "#23201e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tate mc dermott": {
		peau: "#c2918d",
		cheveux: "#553b2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tatsuhiko tsurukawa": {
		peau: "#dbaa93",
		cheveux: "#2d2a2a",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"tatsuhiro ozaki": {
		peau: "#ce9f8a",
		cheveux: "#27292c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tatsuki kanza": {
		peau: "#dcab9e",
		cheveux: "#282228",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tatsuki tanina": {
		peau: "#dfa7a0",
		cheveux: "#211c23",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tatsunari fujita": {
		peau: "#c59279",
		cheveux: "#191714",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tatsuro sugimoto": {
		peau: "#ac7656",
		cheveux: "#2c211a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tatsuru owada": {
		peau: "#d38c59",
		cheveux: "#282019",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"tatsuya fujii": {
		peau: "#d08562",
		cheveux: "#1f160f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tatsuya fujioka": {
		peau: "#d7ac9f",
		cheveux: "#28272a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tatsuya hamano": {
		peau: "#dbab8a",
		cheveux: "#1d1b19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tatsuya hayashi": {
		peau: "#dba59b",
		cheveux: "#201d25",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tatsuya kanetsuki": {
		peau: "#c8957e",
		cheveux: "#242629",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tatsuya kuzumi": {
		peau: "#bc7e5d",
		cheveux: "#2b1d17",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tatsuya miyazaki": {
		peau: "#c07d67",
		cheveux: "#171514",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tatto katsuta": {
		peau: "#cb8a62",
		cheveux: "#2a221f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"taufa latu": {
		peau: "#cb927b",
		cheveux: "#3a3435",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"taulupe faletau": {
		peau: "#96695d",
		cheveux: "#21202b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"tavake oto": {
		peau: "#daa790",
		cheveux: "#2b292b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tavi tuipulotu": {
		tailleCm: 179,
		poidsKg: 100,
		peau: "#b2816b",
		cheveux: "#2e2a26",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tawera kerr barlow": {
		tailleCm: 183,
		poidsKg: 80,
		peau: "#d69f8b",
		cheveux: "#664c42",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"taylor gontineac": {
		tailleCm: 188,
		poidsKg: 93,
		peau: "#cc8b71",
		cheveux: "#59371c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"taylor harry": {
		peau: "#d7a9a1",
		cheveux: "#6a433b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"taylor jarrod": {
		peau: "#ab7b6c",
		cheveux: "#422027",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"taylor josh": {
		peau: "#c28f87",
		cheveux: "#160b08",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tayne harvey": {
		peau: "#bf825a",
		cheveux: "#201b16",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tayo adegbemile": {
		peau: "#573934",
		cheveux: "#080707",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"te kamaka howden": {
		peau: "#aa7e6b",
		cheveux: "#232430",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"te toiroa tahuriorangi": {
		peau: "#97634d",
		cheveux: "#2e2b29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"teariki ben nicholas": {
		peau: "#a97a59",
		cheveux: "#191715",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tector charlie": {
		peau: "#ce8f79",
		cheveux: "#1f3332",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"ted hill": {
		tailleCm: 197,
		poidsKg: 103,
		peau: "#d49a89",
		cheveux: "#42291a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"teddy baubigny": {
		tailleCm: 183,
		poidsKg: 100,
		peau: "#c28273",
		cheveux: "#2b221f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"teddy durand": {
		tailleCm: 180,
		poidsKg: 96,
		peau: "#d88e76",
		cheveux: "#58372b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"teddy thomas": {
		tailleCm: 182,
		poidsKg: 93,
		peau: "#b2715a",
		cheveux: "#884732",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"teddy williams": {
		tailleCm: 199,
		poidsKg: 109,
		peau: "#c08981",
		cheveux: "#2e272e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"teddy wilson": {
		peau: "#cf907f",
		cheveux: "#392922",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"tedo abzhandadze": {
		tailleCm: 173,
		poidsKg: 68,
		peau: "#b37d66",
		cheveux: "#221c19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"teimana harrison": {
		tailleCm: 189,
		poidsKg: 96,
		peau: "#c8a08c",
		cheveux: "#574a40",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"temi lasisi": {
		peau: "#a25740",
		cheveux: "#2b2016",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"temo matiu": {
		tailleCm: 194,
		poidsKg: 91,
		peau: "#96634f",
		cheveux: "#131112",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"temo mayanavanua": {
		peau: "#91614c",
		cheveux: "#3a2b23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"temur tsulukidze": {
		tailleCm: 200,
		poidsKg: 112,
		peau: "#b67f5e",
		cheveux: "#4f3e2b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"tenta kobayashi": {
		peau: "#cd9684",
		cheveux: "#211e1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tepaea cook savage": {
		peau: "#c37552",
		cheveux: "#070302",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"terrence hepetema": {
		peau: "#d7a69d",
		cheveux: "#3d3332",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"teruo makabe": {
		peau: "#cb937f",
		cheveux: "#1d1c1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"teruya goto": {
		peau: "#ce7b54",
		cheveux: "#2a1f16",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tetaz chaparro nahuel": {
		peau: "#a6775e",
		cheveux: "#171311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tetsunori osaki": {
		peau: "#d5a192",
		cheveux: "#312e32",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tetta shigematsu": {
		peau: "#dfad89",
		cheveux: "#191910",
		yeux: "#657452",
		coiffure: "curly",
		barbe: "none"
	},
	"teun karst": {
		tailleCm: 197,
		poidsKg: 114,
		peau: "#bf8362",
		cheveux: "#332419",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tevin ferris": {
		peau: "#cd9683",
		cheveux: "#9d5e5c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"tevita alatini": {
		peau: "#ae6c56",
		cheveux: "#402d24",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"tevita ikanivere": {
		peau: "#ba8f74",
		cheveux: "#645543",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tevita kasikasi ratuva": {
		peau: "#865a48",
		cheveux: "#292422",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tevita mafileo": {
		peau: "#a36141",
		cheveux: "#35271f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"tevita oto": {
		peau: "#987058",
		cheveux: "#1b1615",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tevita rokosuka": {
		peau: "#8b6959",
		cheveux: "#1f1f1e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tevita tatafu": {
		tailleCm: 182,
		poidsKg: 128,
		peau: "#c06e58",
		cheveux: "#1f1815",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tevita tupou": {
		peau: "#d9997b",
		cheveux: "#343030",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"thaakir abrahams": {
		peau: "#d59c7f",
		cheveux: "#b8594c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"thacker harry": {
		peau: "#d1977e",
		cheveux: "#342a1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thame toby": {
		peau: "#b67b6b",
		cheveux: "#301b15",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"thembelani bholi": {
		tailleCm: 187,
		poidsKg: 110,
		peau: "#8a625c",
		cheveux: "#5a4a4a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"theo cabango": {
		tailleCm: 176,
		poidsKg: 78,
		peau: "#8f645a",
		cheveux: "#1c1a20",
		yeux: "#587383",
		coiffure: "short",
		barbe: "moustache"
	},
	"theo forner": {
		tailleCm: 176,
		poidsKg: 69,
		peau: "#a66c62",
		cheveux: "#171519",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"theo gomez": {
		tailleCm: 175,
		poidsKg: 77,
		peau: "#a5675d",
		cheveux: "#3d2d27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"theo idjellidaine": {
		tailleCm: 171,
		poidsKg: 74,
		peau: "#b98462",
		cheveux: "#2d2420",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"theo lachaud": {
		tailleCm: 185,
		poidsKg: 101,
		peau: "#ae7752",
		cheveux: "#473128",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"theo lavoine": {
		tailleCm: 180,
		poidsKg: 116,
		peau: "#d5b097",
		cheveux: "#564a35",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"theo millet": {
		tailleCm: 188,
		poidsKg: 94,
		peau: "#ab796a",
		cheveux: "#231e1b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"theo ntamack muyenga": {
		peau: "#cd8c74",
		cheveux: "#261a19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"theo pedemons": {
		tailleCm: 191,
		poidsKg: 111,
		peau: "#583a34",
		cheveux: "#181416",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"theo william": {
		tailleCm: 199,
		poidsKg: 101,
		peau: "#ca8864",
		cheveux: "#2f221b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"theron jj": {
		peau: "#b5846b",
		cheveux: "#523b1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"theunissen marcel": {
		peau: "#a98377",
		cheveux: "#405053",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"thibaud drean": {
		tailleCm: 173,
		poidsKg: 114,
		peau: "#b27f65",
		cheveux: "#5a2a21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"thibaud flament": {
		tailleCm: 202,
		poidsKg: 109,
		peau: "#e0a7a0",
		cheveux: "#523b30",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thibaud lanen": {
		tailleCm: 203,
		poidsKg: 104,
		peau: "#d7ae9e",
		cheveux: "#805f49",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"thibaud rey": {
		tailleCm: 200,
		poidsKg: 99,
		peau: "#b1785f",
		cheveux: "#413027",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thibault daubagna": {
		tailleCm: 173,
		poidsKg: 72,
		peau: "#cd7f62",
		cheveux: "#1b120d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"thibault debaes": {
		tailleCm: 176,
		poidsKg: 79,
		peau: "#bc7e6c",
		cheveux: "#432f24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thibault santoro": {
		tailleCm: 176,
		poidsKg: 72,
		peau: "#bc7565",
		cheveux: "#412e27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thibaut martel": {
		tailleCm: 185,
		poidsKg: 94,
		peau: "#cf9a8d",
		cheveux: "#534a3e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"thibaut regard": {
		tailleCm: 177,
		poidsKg: 87,
		peau: "#c6805c",
		cheveux: "#5c473a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"thibaut robert motassi dibongue": {
		peau: "#be866d",
		cheveux: "#412f2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thierry paiva": {
		tailleCm: 181,
		poidsKg: 114,
		peau: "#856258",
		cheveux: "#2f2928",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tho attissogbe": {
		peau: "#b15c3a",
		cheveux: "#130c08",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"tho bevia": {
		peau: "#905c54",
		cheveux: "#4a372e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"tho beziat": {
		peau: "#bf6e56",
		cheveux: "#21160f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tho cambon": {
		peau: "#b08068",
		cheveux: "#473729",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tho chabouni": {
		peau: "#d68b73",
		cheveux: "#3c2923",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tho duprat": {
		peau: "#bd7c56",
		cheveux: "#804d27",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"tho gatelier": {
		peau: "#b27247",
		cheveux: "#573616",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tho giral": {
		peau: "#c9856d",
		cheveux: "#31211b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tho mercadier": {
		peau: "#b4724a",
		cheveux: "#20170d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"thomas adelaide": {
		tailleCm: 203,
		poidsKg: 114,
		peau: "#935c45",
		cheveux: "#211916",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas alary": {
		tailleCm: 190,
		poidsKg: 83,
		peau: "#c29c7c",
		cheveux: "#282821",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"thomas ben": {
		peau: "#ac7866",
		cheveux: "#291e1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas berjon": {
		tailleCm: 174,
		poidsKg: 79,
		peau: "#e5a78f",
		cheveux: "#472b22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas bue": {
		tailleCm: 177,
		poidsKg: 116,
		peau: "#dcaa99",
		cheveux: "#3b2e29",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"thomas canaleta": {
		tailleCm: 184,
		poidsKg: 90,
		peau: "#cc846a",
		cheveux: "#31261c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas carol": {
		tailleCm: 175,
		poidsKg: 74,
		peau: "#ae765d",
		cheveux: "#3e332c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas ceyte": {
		tailleCm: 193,
		poidsKg: 108,
		peau: "#ca9987",
		cheveux: "#483d38",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"thomas clarkson": {
		peau: "#8e5945",
		cheveux: "#1d1b18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"thomas cretu": {
		tailleCm: 193,
		poidsKg: 129,
		peau: "#ab6a59",
		cheveux: "#272728",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"thomas dan": {
		peau: "#b28782",
		cheveux: "#483a3b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"thomas darmon": {
		tailleCm: 179,
		poidsKg: 81,
		peau: "#a47a59",
		cheveux: "#19140e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas delpeuch": {
		tailleCm: 183,
		poidsKg: 91,
		peau: "#886d6e",
		cheveux: "#181818",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas dolhagaray": {
		tailleCm: 187,
		poidsKg: 72,
		peau: "#e0a78e",
		cheveux: "#563a27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas dominguez": {
		tailleCm: 180,
		poidsKg: 67,
		peau: "#d29c87",
		cheveux: "#876f5e",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"thomas du toit": {
		peau: "#b88470",
		cheveux: "#36271e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas dyer": {
		peau: "#ca9590",
		cheveux: "#503c35",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas fortunel": {
		tailleCm: 175,
		poidsKg: 81,
		peau: "#d09c81",
		cheveux: "#40362d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas freddie": {
		peau: "#c78c85",
		cheveux: "#331e1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas gallo": {
		tailleCm: 174,
		poidsKg: 101,
		peau: "#b4785a",
		cheveux: "#1f1d13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas gareth": {
		peau: "#a77a66",
		cheveux: "#342921",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas geffre": {
		tailleCm: 205,
		poidsKg: 101,
		peau: "#af5e4f",
		cheveux: "#1b110e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"thomas harry": {
		peau: "#ac786e",
		cheveux: "#211a19",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"thomas hebert": {
		tailleCm: 179,
		poidsKg: 83,
		peau: "#dea389",
		cheveux: "#42322b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"thomas henry": {
		peau: "#b38579",
		cheveux: "#7a4c47",
		yeux: "#587383",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"thomas jolmes": {
		tailleCm: 200,
		poidsKg: 122,
		peau: "#9a5c32",
		cheveux: "#63381c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"thomas laclayat": {
		tailleCm: 180,
		poidsKg: 117,
		peau: "#ce8573",
		cheveux: "#404d4a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas lacombre": {
		tailleCm: 174,
		poidsKg: 96,
		peau: "#e2a691",
		cheveux: "#291914",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas lainault": {
		tailleCm: 199,
		poidsKg: 102,
		peau: "#b4745b",
		cheveux: "#291e13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"thomas larrieu": {
		tailleCm: 188,
		poidsKg: 99,
		peau: "#b27363",
		cheveux: "#342520",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"thomas lavault": {
		tailleCm: 195,
		poidsKg: 103,
		peau: "#e5a898",
		cheveux: "#623f32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas lhusero": {
		tailleCm: 180,
		poidsKg: 70,
		peau: "#be8a86",
		cheveux: "#372c29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas marceline": {
		tailleCm: 176,
		poidsKg: 98,
		peau: "#cd8860",
		cheveux: "#8a5e37",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"thomas moukoro abouem": {
		peau: "#915a47",
		cheveux: "#563a27",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"thomas nick": {
		peau: "#cf9581",
		cheveux: "#5d432d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas ployet": {
		tailleCm: 200,
		poidsKg: 99,
		peau: "#d6a297",
		cheveux: "#997763",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"thomas ramos": {
		tailleCm: 177,
		poidsKg: 81,
		peau: "#d79380",
		cheveux: "#3a2a24",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"thomas ross": {
		peau: "#af7975",
		cheveux: "#4d3629",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"thomas rowe": {
		peau: "#a3675c",
		cheveux: "#2a1f1c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"thomas roziere": {
		tailleCm: 182,
		poidsKg: 80,
		peau: "#c1837a",
		cheveux: "#57463c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thomas salles": {
		tailleCm: 185,
		poidsKg: 81,
		peau: "#ba907d",
		cheveux: "#4e4034",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"thomas souverbie": {
		tailleCm: 172,
		poidsKg: 74,
		peau: "#b47b63",
		cheveux: "#513c30",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas staniforth": {
		peau: "#d28c7d",
		cheveux: "#603e2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas steff": {
		peau: "#b08072",
		cheveux: "#443533",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"thomas umaga jensen": {
		peau: "#bf9568",
		cheveux: "#3f3733",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"thomas vernet": {
		tailleCm: 188,
		poidsKg: 118,
		peau: "#bb7e71",
		cheveux: "#3f2a21",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"thomas vincent": {
		tailleCm: 183,
		poidsKg: 73,
		peau: "#be8d6a",
		cheveux: "#3b311e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"thomas young": {
		peau: "#c18d75",
		cheveux: "#604634",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"thomas zenon": {
		tailleCm: 196,
		poidsKg: 90,
		peau: "#b37355",
		cheveux: "#241f1d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"thompson cowan": {
		peau: "#bc8768",
		cheveux: "#0e0a08",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"thorley ollie": {
		peau: "#965d58",
		cheveux: "#43281d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"thornton rory": {
		peau: "#996d6c",
		cheveux: "#262023",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"tiaan falcon": {
		peau: "#d3a18e",
		cheveux: "#54463e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tiaan fourie": {
		peau: "#ab7564",
		cheveux: "#30271f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tiaan jacobs": {
		tailleCm: 189,
		poidsKg: 101,
		peau: "#9b6760",
		cheveux: "#3f2113",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tiaan sparrow": {
		peau: "#b1857b",
		cheveux: "#4b222a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tiaan thomaswheeler": {
		peau: "#a8776b",
		cheveux: "#2c2525",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tiane elone": {
		peau: "#ab7962",
		cheveux: "#120d0a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"tiennan costley": {
		peau: "#bb8d7b",
		cheveux: "#4c3e37",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tierney martin dylan": {
		peau: "#b37a72",
		cheveux: "#1f2924",
		yeux: "#657452",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"tietie tuimauga": {
		tailleCm: 193,
		poidsKg: 125,
		peau: "#915844",
		cheveux: "#100907",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tim de jong": {
		tailleCm: 189,
		poidsKg: 86,
		peau: "#c68e7a",
		cheveux: "#5a402c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"tim ryan": {
		peau: "#b18082",
		cheveux: "#563e37",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"timma fainga anuku": {
		peau: "#b67e6e",
		cheveux: "#0f0e0d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"timo sufia": {
		peau: "#81503b",
		cheveux: "#131311",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"timoci tavatavanawai": {
		peau: "#9b704f",
		cheveux: "#2f2a27",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"timoney nick": {
		peau: "#cf9a91",
		cheveux: "#281c17",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"timote tavalea": {
		peau: "#cc7a47",
		cheveux: "#492a14",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"timoth mezou": {
		peau: "#b76950",
		cheveux: "#0d0a0a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"timothy lafaele": {
		peau: "#c38564",
		cheveux: "#2d2c2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tino mavesere": {
		peau: "#594138",
		cheveux: "#221f1b",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tinus de beer": {
		tailleCm: 177,
		poidsKg: 83,
		peau: "#deaa95",
		cheveux: "#a47e6d",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"tisileli loketi": {
		peau: "#bb897a",
		cheveux: "#232223",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"titi lamositele": {
		tailleCm: 182,
		poidsKg: 130,
		peau: "#92583d",
		cheveux: "#140b09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tiziano pasquali": {
		tailleCm: 190,
		poidsKg: 112,
		peau: "#b98164",
		cheveux: "#312318",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"tj faiane": {
		peau: "#d79483",
		cheveux: "#27242e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tj perenara": {
		peau: "#c3846a",
		cheveux: "#46392f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tjay clarke": {
		peau: "#e5b9a9",
		cheveux: "#5c473c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tobi wilson": {
		tailleCm: 188,
		poidsKg: 83,
		peau: "#cd8e6d",
		cheveux: "#2e2419",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tobias elliott": {
		tailleCm: 184,
		poidsKg: 86,
		peau: "#8c5748",
		cheveux: "#2d1b11",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"toby bell": {
		peau: "#cf977d",
		cheveux: "#2b2019",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"toby knight": {
		tailleCm: 193,
		poidsKg: 98,
		peau: "#885448",
		cheveux: "#221611",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"toby macpherson": {
		peau: "#c68e7c",
		cheveux: "#3b3235",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"toby thame": {
		tailleCm: 186,
		poidsKg: 92,
		peau: "#b67b6b",
		cheveux: "#301b15",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"toby wilson": {
		peau: "#d2a18b",
		cheveux: "#232226",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"todaro edoardo": {
		peau: "#bf9182",
		cheveux: "#1d1314",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"toki toshikawa": {
		peau: "#cc958b",
		cheveux: "#262426",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tom ahern": {
		tailleCm: 208,
		poidsKg: 109,
		peau: "#dc9a87",
		cheveux: "#892226",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"tom allen": {
		tailleCm: 201,
		poidsKg: 109,
		peau: "#ce8b6a",
		cheveux: "#62422e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom banks": {
		tailleCm: 185,
		poidsKg: 85,
		peau: "#c89389",
		cheveux: "#0e0d0d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tom botha": {
		tailleCm: 181,
		poidsKg: 105,
		peau: "#9d6d5b",
		cheveux: "#3f3027",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tom bowen": {
		tailleCm: 167,
		poidsKg: 72,
		peau: "#a47676",
		cheveux: "#403134",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tom burrow": {
		tailleCm: 206,
		poidsKg: 108,
		peau: "#cb9986",
		cheveux: "#393433",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tom cairns": {
		tailleCm: 179,
		poidsKg: 73,
		peau: "#cf8d79",
		cheveux: "#2e2119",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"tom carr smith": {
		tailleCm: 176,
		poidsKg: 88,
		peau: "#c0836a",
		cheveux: "#2d2017",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom chauvet": {
		tailleCm: 174,
		poidsKg: 75,
		peau: "#ae6259",
		cheveux: "#2b2827",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tom christie": {
		tailleCm: 189,
		poidsKg: 94,
		peau: "#b1816b",
		cheveux: "#2b2929",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"tom cottle": {
		tailleCm: 199,
		poidsKg: 108,
		peau: "#ae7c7a",
		cheveux: "#2c2631",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom curry": {
		tailleCm: 186,
		poidsKg: 98,
		peau: "#cfa18a",
		cheveux: "#080706",
		yeux: "#587383",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tom dargan": {
		peau: "#ae7752",
		cheveux: "#160f0c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tom de glanville": {
		tailleCm: 193,
		poidsKg: 77,
		peau: "#bf856f",
		cheveux: "#312014",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tom delalain": {
		peau: "#be8c73",
		cheveux: "#30231b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom deleuze": {
		tailleCm: 181,
		poidsKg: 76,
		peau: "#bd886d",
		cheveux: "#2f221b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tom dunn": {
		tailleCm: 187,
		poidsKg: 97,
		peau: "#c28367",
		cheveux: "#916347",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"tom ecochard": {
		tailleCm: 172,
		poidsKg: 73,
		peau: "#a9706b",
		cheveux: "#3b2d2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tom farrell": {
		tailleCm: 184,
		poidsKg: 96,
		peau: "#c27963",
		cheveux: "#462622",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tom florence": {
		peau: "#aa8785",
		cheveux: "#3b393f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tom hooper": {
		tailleCm: 200,
		poidsKg: 118,
		peau: "#d29588",
		cheveux: "#271b18",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"tom james": {
		tailleCm: 188,
		poidsKg: 81,
		peau: "#ab765f",
		cheveux: "#1a120e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"tom jordan": {
		tailleCm: 192,
		poidsKg: 84,
		peau: "#bd806d",
		cheveux: "#32261f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom leveque": {
		tailleCm: 183,
		poidsKg: 72,
		peau: "#cb827b",
		cheveux: "#341c18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tom litchfield": {
		tailleCm: 186,
		poidsKg: 92,
		peau: "#d7a499",
		cheveux: "#38241c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom lockett": {
		tailleCm: 206,
		poidsKg: 106,
		peau: "#c4908a",
		cheveux: "#2d201b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom lynagh": {
		peau: "#bd918b",
		cheveux: "#745548",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"tom manz": {
		tailleCm: 200,
		poidsKg: 107,
		peau: "#ae6e5d",
		cheveux: "#603526",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tom mcallister": {
		peau: "#cd918b",
		cheveux: "#37190d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tom noble": {
		peau: "#c8a086",
		cheveux: "#40342d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tom o flaherty": {
		tailleCm: 176,
		poidsKg: 81,
		peau: "#916855",
		cheveux: "#2e262c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"tom oflaherty": {
		peau: "#916855",
		cheveux: "#2e262c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"tom otoole": {
		peau: "#ba8671",
		cheveux: "#523525",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"tom parton": {
		peau: "#c99987",
		cheveux: "#504039",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom pearson": {
		tailleCm: 192,
		poidsKg: 109,
		peau: "#c28e88",
		cheveux: "#62493d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom raffy": {
		tailleCm: 184,
		poidsKg: 76,
		peau: "#cfa490",
		cheveux: "#49382f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tom robertson": {
		peau: "#d09377",
		cheveux: "#5f4b34",
		yeux: "#657452",
		coiffure: "short",
		barbe: "none"
	},
	"tom robinson": {
		peau: "#bb908a",
		cheveux: "#574236",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"tom roebuck": {
		tailleCm: 191,
		poidsKg: 88,
		peau: "#d2a591",
		cheveux: "#1a1e2e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tom rogers": {
		tailleCm: 185,
		poidsKg: 82,
		peau: "#c0897d",
		cheveux: "#5f232a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tom rowe": {
		tailleCm: 189,
		poidsKg: 80,
		peau: "#a67872",
		cheveux: "#50423c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"tom spring": {
		tailleCm: 182,
		poidsKg: 76,
		peau: "#d17d66",
		cheveux: "#181513",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom stewart": {
		peau: "#e08e78",
		cheveux: "#39271b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom whiteley": {
		tailleCm: 173,
		poidsKg: 76,
		peau: "#ba8070",
		cheveux: "#2a1a14",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tom wood": {
		tailleCm: 193,
		poidsKg: 81,
		peau: "#d59682",
		cheveux: "#4c3826",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tom wright": {
		peau: "#ab7762",
		cheveux: "#1f222a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"tomaakino taufa": {
		peau: "#774b40",
		cheveux: "#120c0e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tomas albornoz": {
		tailleCm: 182,
		poidsKg: 74,
		peau: "#bc876e",
		cheveux: "#28201c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tomas francis": {
		tailleCm: 182,
		poidsKg: 121,
		peau: "#c08c7c",
		cheveux: "#382926",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tomas lavanini": {
		peau: "#a57c71",
		cheveux: "#1e2436",
		yeux: "#587383",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tomas rapetti": {
		tailleCm: 194,
		poidsKg: 119,
		peau: "#d29988",
		cheveux: "#3b2623",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tomasi fineanganofo": {
		tailleCm: 184,
		poidsKg: 103,
		peau: "#b87b5f",
		cheveux: "#272123",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tomasi maka": {
		tailleCm: 189,
		poidsKg: 117,
		peau: "#6c4043",
		cheveux: "#190f13",
		yeux: "#587383",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tomasi naibaruwaga": {
		peau: "#d79784",
		cheveux: "#282229",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomi lewis": {
		tailleCm: 181,
		poidsKg: 78,
		peau: "#a7766b",
		cheveux: "#3d2d27",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tommaso di bartolomeo": {
		tailleCm: 185,
		poidsKg: 98,
		peau: "#b68576",
		cheveux: "#303238",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tommaso menoncello": {
		tailleCm: 183,
		poidsKg: 95,
		peau: "#b5836f",
		cheveux: "#241c17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tommy obrien": {
		peau: "#cb927b",
		cheveux: "#3f3332",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tommy raynaud": {
		tailleCm: 184,
		poidsKg: 99,
		peau: "#bb9279",
		cheveux: "#4d4535",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tommy reffell": {
		tailleCm: 185,
		poidsKg: 93,
		peau: "#b36a60",
		cheveux: "#392019",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tommy wyatt": {
		tailleCm: 184,
		poidsKg: 84,
		peau: "#d59b87",
		cheveux: "#3a241a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"tomoaki ishii": {
		peau: "#c58869",
		cheveux: "#25211e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomohiro takeda": {
		peau: "#c29283",
		cheveux: "#211d1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomohito miyakawa": {
		peau: "#c79275",
		cheveux: "#282422",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomoki ashida": {
		peau: "#d19f8c",
		cheveux: "#232120",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomoki kishioka": {
		peau: "#d09c8b",
		cheveux: "#2e2c2e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomoki kusuda": {
		peau: "#e0ac95",
		cheveux: "#363434",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tomoki minami": {
		peau: "#bf8161",
		cheveux: "#1f1916",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tomoki nobeta": {
		peau: "#be7f5a",
		cheveux: "#12100e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomoki osada": {
		peau: "#c5927c",
		cheveux: "#2b2929",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tomoki yamaguchi": {
		peau: "#9e7363",
		cheveux: "#1e1b1c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tomoki yumbe": {
		peau: "#e2bcb5",
		cheveux: "#34302f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomonari aoki": {
		peau: "#c8957f",
		cheveux: "#27221f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomonori koyanagi": {
		peau: "#d19a92",
		cheveux: "#212121",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomotaka ishimatsu": {
		peau: "#c0907b",
		cheveux: "#1b1715",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tomoya adachi": {
		peau: "#c19173",
		cheveux: "#221c19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomoya haraguti": {
		peau: "#e1a9a1",
		cheveux: "#272025",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tomoya kimura": {
		peau: "#a97742",
		cheveux: "#1b160b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomoya nakamura": {
		peau: "#9a5f44",
		cheveux: "#151413",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tomoya otake": {
		peau: "#b7877c",
		cheveux: "#1a1a1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"tomoya yamamura": {
		peau: "#d59d78",
		cheveux: "#342d27",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"tomu takamoto": {
		peau: "#d69274",
		cheveux: "#2c2621",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"tonga uiha sonny": {
		peau: "#b77d72",
		cheveux: "#181010",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"tonishio vaiahu": {
		peau: "#9f694e",
		cheveux: "#261f1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tony alofipo": {
		peau: "#ad7769",
		cheveux: "#0e0d0d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tony butler": {
		peau: "#cc7f67",
		cheveux: "#54231b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tony hunt": {
		peau: "#d3957e",
		cheveux: "#2d2b2a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tony tafa": {
		peau: "#9b6148",
		cheveux: "#7c4830",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "none"
	},
	"tornike jalagonia": {
		tailleCm: 192,
		poidsKg: 94,
		peau: "#b79488",
		cheveux: "#302e2e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"toru sugishita": {
		peau: "#dcaa84",
		cheveux: "#1d1b1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"toshihiro yamanouchi": {
		peau: "#d9ad8a",
		cheveux: "#181818",
		yeux: "#657452",
		coiffure: "long",
		barbe: "none"
	},
	"toshiki amano": {
		peau: "#b6825d",
		cheveux: "#2d231e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"toshiki kuwayama": {
		peau: "#ddaa8d",
		cheveux: "#1f1d1c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"toshiki sato": {
		peau: "#e0a592",
		cheveux: "#282229",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"toshiya hirakawa": {
		peau: "#c69d7c",
		cheveux: "#58493c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"toshiya takahashi": {
		peau: "#b67e5d",
		cheveux: "#211b17",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"toshiyuki ohki": {
		peau: "#b27963",
		cheveux: "#1b1a19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"totoa auvaa": {
		peau: "#874d3c",
		cheveux: "#0a0807",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"toui kai": {
		peau: "#c89b8c",
		cheveux: "#2c2a2d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"towa kondo": {
		peau: "#d4a591",
		cheveux: "#262527",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"towa taniguchi": {
		peau: "#a27066",
		cheveux: "#191412",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"treacy finn": {
		peau: "#d89f8c",
		cheveux: "#223229",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"trenholm will": {
		peau: "#b27773",
		cheveux: "#251612",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "full_beard"
	},
	"trevor davison": {
		tailleCm: 193,
		poidsKg: 125,
		peau: "#c08184",
		cheveux: "#593327",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"trevor hosea": {
		peau: "#cfa28e",
		cheveux: "#252324",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"trevor king": {
		peau: "#78483c",
		cheveux: "#141214",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"trevor nyakane": {
		peau: "#553425",
		cheveux: "#282626",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"treyvon pritchard": {
		peau: "#8b5647",
		cheveux: "#161516",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tristan davies": {
		tailleCm: 193,
		poidsKg: 96,
		peau: "#ac7b74",
		cheveux: "#401c23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tristan james tedder": {
		peau: "#d49b9e",
		cheveux: "#282225",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tristan labouteley": {
		tailleCm: 206,
		poidsKg: 97,
		peau: "#c5a086",
		cheveux: "#39362d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tristan woodman": {
		tailleCm: 183,
		poidsKg: 98,
		peau: "#9a6a5c",
		cheveux: "#151618",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"troy callander": {
		peau: "#e0a79b",
		cheveux: "#785b58",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"troy hallett": {
		peau: "#d49682",
		cheveux: "#775b45",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"trulla jacopo": {
		peau: "#bf9586",
		cheveux: "#2d3740",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tshakweni alulutho": {
		peau: "#7b4e3a",
		cheveux: "#2e2b1f",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"tshituka manu": {
		peau: "#7e5540",
		cheveux: "#2c2c29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tshituka vincent": {
		peau: "#885540",
		cheveux: "#332415",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tsubasa arai": {
		peau: "#d1a289",
		cheveux: "#302724",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tsubasa kono": {
		peau: "#c48d7b",
		cheveux: "#24201f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tsubasa shinno": {
		peau: "#d0967a",
		cheveux: "#24211d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"tsukasa yasuda": {
		peau: "#dca583",
		cheveux: "#1e1f1e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "moustache"
	},
	"tsuyoshi hasegawa": {
		peau: "#b57752",
		cheveux: "#372b23",
		yeux: "#587383",
		coiffure: "bald",
		barbe: "none"
	},
	"tuaina taii tualima": {
		tailleCm: 191,
		poidsKg: 92,
		peau: "#9e634a",
		cheveux: "#141312",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tuaina tualima": {
		peau: "#b57d57",
		cheveux: "#110f0f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tuidraki samusamuvodre": {
		peau: "#af7b5f",
		cheveux: "#2a2623",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tuipulotu sione": {
		peau: "#b48665",
		cheveux: "#201f1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tuipulotu tavi": {
		peau: "#b2816b",
		cheveux: "#2e2a26",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tulimafua mahola tupou": {
		peau: "#8c6251",
		cheveux: "#262323",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tumua manu": {
		tailleCm: 181,
		poidsKg: 86,
		peau: "#bb7153",
		cheveux: "#1d1e20",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tupou vaa i": {
		peau: "#885036",
		cheveux: "#0f0c09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"tye nash": {
		peau: "#d9ada2",
		cheveux: "#7c5e50",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"tye raymont": {
		tailleCm: 186,
		poidsKg: 107,
		peau: "#ae795d",
		cheveux: "#16181a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"tyler ardron": {
		tailleCm: 195,
		poidsKg: 101,
		peau: "#a87a69",
		cheveux: "#59493f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tyler duguid": {
		tailleCm: 200,
		poidsKg: 118,
		peau: "#d0988c",
		cheveux: "#5d4144",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"tyler morgan": {
		tailleCm: 185,
		poidsKg: 94,
		peau: "#b78c77",
		cheveux: "#5a4833",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tyler offiah": {
		tailleCm: 189,
		poidsKg: 89,
		peau: "#935f43",
		cheveux: "#0d0b09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"tyler paul": {
		peau: "#dbaca6",
		cheveux: "#785c50",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"tyreese robin": {
		tailleCm: 179,
		poidsKg: 79,
		peau: "#896240",
		cheveux: "#131513",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tyrel lomax": {
		peau: "#b87455",
		cheveux: "#3e2e26",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "moustache"
	},
	"tyrone green": {
		tailleCm: 177,
		poidsKg: 83,
		peau: "#bc7b63",
		cheveux: "#68402b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"tyrone viiga": {
		tailleCm: 195,
		poidsKg: 106,
		peau: "#a77965",
		cheveux: "#191816",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"ugo boniface": {
		tailleCm: 188,
		poidsKg: 116,
		peau: "#90655a",
		cheveux: "#201a19",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"ugo pacome": {
		tailleCm: 183,
		poidsKg: 74,
		peau: "#e1a796",
		cheveux: "#3d2a25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ugo seguela": {
		tailleCm: 170,
		poidsKg: 68,
		peau: "#b57363",
		cheveux: "#3a251c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"ugo seunes": {
		tailleCm: 180,
		poidsKg: 69,
		peau: "#da9078",
		cheveux: "#392015",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ugo vignolles": {
		tailleCm: 202,
		poidsKg: 100,
		peau: "#b97e5e",
		cheveux: "#1e1812",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"uha lee": {
		peau: "#daa499",
		cheveux: "#2b2d35",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"ulcoq charlie": {
		peau: "#af766f",
		cheveux: "#3b251e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ulupano seuteni": {
		tailleCm: 188,
		poidsKg: 90,
		peau: "#d28a6e",
		cheveux: "#2c201f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"umaga jacob": {
		peau: "#b78162",
		cheveux: "#2d2017",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ungerer stefan": {
		peau: "#b47e61",
		cheveux: "#272a22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"upaleto feao": {
		peau: "#d79271",
		cheveux: "#251917",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"uren andy": {
		peau: "#ae755e",
		cheveux: "#3e2f21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"usa baleilautoka": {
		peau: "#d48e7b",
		cheveux: "#2a272a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"usanov alex": {
		peau: "#c2876f",
		cheveux: "#36422c",
		yeux: "#657452",
		coiffure: "short",
		barbe: "short_beard"
	},
	"uwe helu": {
		peau: "#c78761",
		cheveux: "#10160f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"uzair cassiem": {
		tailleCm: 191,
		poidsKg: 103,
		peau: "#a87550",
		cheveux: "#693d2a",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"vaea tangitau lapota fifita": {
		peau: "#b7846e",
		cheveux: "#73604c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"vailanu sione": {
		peau: "#a87256",
		cheveux: "#1b1815",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"vaiolini petelo ekuasi": {
		peau: "#ab7b63",
		cheveux: "#223130",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"vaiuta latu": {
		peau: "#844e41",
		cheveux: "#121315",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"vakhtang abdaladze": {
		peau: "#a86a4f",
		cheveux: "#342b24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"val rapava ruskin": {
		tailleCm: 187,
		poidsKg: 119,
		peau: "#814636",
		cheveux: "#1f100c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"valentin chamberaud": {
		peau: "#bc8a65",
		cheveux: "#2f2517",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"valentin delpy": {
		tailleCm: 185,
		poidsKg: 82,
		peau: "#cd927c",
		cheveux: "#39271e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"valentin gayraud": {
		tailleCm: 194,
		poidsKg: 95,
		peau: "#d19e82",
		cheveux: "#523b2e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"valentin hutteau": {
		tailleCm: 164,
		poidsKg: 63,
		peau: "#9d6c56",
		cheveux: "#191514",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"valentin ibanez": {
		peau: "#cca697",
		cheveux: "#46392f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"valentin simutoga": {
		tailleCm: 189,
		poidsKg: 118,
		peau: "#b88770",
		cheveux: "#1a1b1a",
		yeux: "#624633",
		coiffure: "long",
		barbe: "short_beard"
	},
	"valentin welsch": {
		tailleCm: 188,
		poidsKg: 101,
		peau: "#cd9893",
		cheveux: "#0a0909",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"valentino reggiardo": {
		tailleCm: 176,
		poidsKg: 75,
		peau: "#ae7752",
		cheveux: "#2e1f1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"valerio siciliano": {
		tailleCm: 182,
		poidsKg: 99,
		peau: "#c47f66",
		cheveux: "#412718",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"valynce te whare": {
		peau: "#b8957f",
		cheveux: "#1e1a16",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"van der flier josh": {
		peau: "#ae7960",
		cheveux: "#322c1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"van der merwe akker": {
		peau: "#a36a5d",
		cheveux: "#4c3527",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"van der merwe edwill": {
		peau: "#c1806a",
		cheveux: "#56413d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"van der merwe marnus": {
		peau: "#a6786b",
		cheveux: "#4a1f23",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"van der mescht jj": {
		peau: "#b67c73",
		cheveux: "#2d1c18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"van heerden emile": {
		peau: "#b57f72",
		cheveux: "#262522",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"van heerden jf": {
		peau: "#8c6558",
		cheveux: "#2d241d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"van heerden ruben": {
		peau: "#b17a5e",
		cheveux: "#2b2117",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"van niekerk phillip albert": {
		peau: "#975b48",
		cheveux: "#192328",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"van staden marco": {
		peau: "#b37975",
		cheveux: "#23211d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"vano karkadze": {
		tailleCm: 178,
		poidsKg: 106,
		peau: "#c49368",
		cheveux: "#55422a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"varian pasquet": {
		tailleCm: 194,
		poidsKg: 80,
		peau: "#aa6a43",
		cheveux: "#713e1e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"varottoj nikolaj": {
		peau: "#916c58",
		cheveux: "#36312b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"vasil lobzhanidze": {
		tailleCm: 180,
		poidsKg: 70,
		peau: "#bc8e69",
		cheveux: "#382c1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"vatiliai tuidraki": {
		peau: "#bf8d72",
		cheveux: "#41403d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"vazha kapanadze": {
		tailleCm: 180,
		poidsKg: 110,
		peau: "#bd866f",
		cheveux: "#42372d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"venter andre hugo": {
		peau: "#a6745d",
		cheveux: "#264135",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"venter francois": {
		peau: "#b07d6a",
		cheveux: "#272726",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"venter james": {
		peau: "#b46d68",
		cheveux: "#392118",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"ventisei johnny": {
		peau: "#a2775f",
		cheveux: "#4b372a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"veresa tuqovu ramototabua": {
		tailleCm: 199,
		poidsKg: 98,
		peau: "#a36253",
		cheveux: "#281f22",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"vermaak ali": {
		peau: "#855538",
		cheveux: "#2e372c",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"vermaak ruan": {
		peau: "#a16d5e",
		cheveux: "#2d231a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"vernon bason": {
		peau: "#c37b5a",
		cheveux: "#342c27",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"vernon matongo": {
		peau: "#7c543b",
		cheveux: "#2f1f10",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"veveni lasaqa": {
		peau: "#c58a63",
		cheveux: "#2d2625",
		yeux: "#587383",
		coiffure: "short",
		barbe: "short_beard"
	},
	"victor dreuille": {
		tailleCm: 181,
		poidsKg: 82,
		peau: "#be8566",
		cheveux: "#1d160f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"victor guillaumond": {
		tailleCm: 194,
		poidsKg: 89,
		peau: "#cea795",
		cheveux: "#342e24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"victor hannoun": {
		tailleCm: 177,
		poidsKg: 73,
		peau: "#ab6f66",
		cheveux: "#3e322c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"victor montgaillard": {
		tailleCm: 184,
		poidsKg: 100,
		peau: "#c09292",
		cheveux: "#342a2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"victor moreaux": {
		tailleCm: 205,
		poidsKg: 122,
		peau: "#d49e7a",
		cheveux: "#946e44",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"victor rayeur": {
		tailleCm: 185,
		poidsKg: 90,
		peau: "#cb8466",
		cheveux: "#452d1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"victor templier": {
		tailleCm: 200,
		poidsKg: 110,
		peau: "#bf8d74",
		cheveux: "#3e2715",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"victory matthew": {
		peau: "#d6937e",
		cheveux: "#2d1b17",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"viliame mata": {
		tailleCm: 195,
		poidsKg: 113,
		peau: "#9f6745",
		cheveux: "#1c1a16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"viliame suwawa": {
		peau: "#c67b61",
		cheveux: "#1f2322",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"viliame takayawa": {
		peau: "#966341",
		cheveux: "#382a22",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"viliame tuidraki": {
		peau: "#865c49",
		cheveux: "#2c2624",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"viliame tutuvuli": {
		tailleCm: 195,
		poidsKg: 88,
		peau: "#7d5747",
		cheveux: "#181312",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"viliami afu kaipouli": {
		peau: "#ba8366",
		cheveux: "#221f1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"viliami amanaki lelei he lotu fine": {
		peau: "#906152",
		cheveux: "#151213",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"viliami helu": {
		peau: "#9a7352",
		cheveux: "#1b1816",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"viliami lutua ahofono": {
		peau: "#896150",
		cheveux: "#231f22",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"viliami taulani": {
		tailleCm: 195,
		poidsKg: 107,
		peau: "#b3714d",
		cheveux: "#5d4935",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"viliami vunipola": {
		peau: "#b78471",
		cheveux: "#261c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"vilikesa nairau": {
		peau: "#58322a",
		cheveux: "#120e0c",
		yeux: "#587383",
		coiffure: "messy",
		barbe: "moustache"
	},
	"vilikesa sela": {
		peau: "#9e674a",
		cheveux: "#100a08",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"vilimoni botitu": {
		tailleCm: 185,
		poidsKg: 87,
		peau: "#a8644f",
		cheveux: "#241e1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"vilive miramira": {
		peau: "#a76e54",
		cheveux: "#342c29",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"vinaya habosi": {
		tailleCm: 189,
		poidsKg: 91,
		peau: "#7e4830",
		cheveux: "#12100c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"vince aso": {
		peau: "#c49075",
		cheveux: "#423730",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"vincent giudicelli": {
		tailleCm: 182,
		poidsKg: 96,
		peau: "#ac8673",
		cheveux: "#2f2b27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"vincent koch": {
		peau: "#c29694",
		cheveux: "#8d6f59",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"vincent pinto": {
		tailleCm: 190,
		poidsKg: 87,
		peau: "#c08067",
		cheveux: "#402e26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"vincent rattez": {
		tailleCm: 185,
		poidsKg: 82,
		peau: "#c68e6f",
		cheveux: "#533e29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"vincent sefo": {
		peau: "#865137",
		cheveux: "#111110",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"vincent tshituka": {
		peau: "#885540",
		cheveux: "#332415",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"vincent vial": {
		tailleCm: 182,
		poidsKg: 122,
		peau: "#b28784",
		cheveux: "#373c47",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "full_beard"
	},
	"virimi vakatawa": {
		peau: "#b07563",
		cheveux: "#202839",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"visesio kite": {
		peau: "#e6b09c",
		cheveux: "#2b1f1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"vladi ashvetia": {
		tailleCm: 187,
		poidsKg: 85,
		peau: "#cc9078",
		cheveux: "#24170d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"vokozela lukhanyo": {
		peau: "#86604f",
		cheveux: "#1c281f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"volpi guido": {
		peau: "#cc8d73",
		cheveux: "#2f3f47",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"vorster harold": {
		peau: "#8f5c4c",
		cheveux: "#1e1a16",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"vuate karawalevu": {
		tailleCm: 191,
		poidsKg: 92,
		peau: "#955848",
		cheveux: "#2b2120",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"vueti tupou": {
		peau: "#92664d",
		cheveux: "#443529",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"wainwright aaron": {
		peau: "#c78b76",
		cheveux: "#524030",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"wainwright sam": {
		peau: "#a97b7a",
		cheveux: "#2f363f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"waisake raratubua": {
		peau: "#ac6a4a",
		cheveux: "#332d26",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "none"
	},
	"walker henry": {
		peau: "#9f6b64",
		cheveux: "#211614",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"walker murphy": {
		peau: "#bb8c77",
		cheveux: "#332d2d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"wallace sititi": {
		peau: "#c98258",
		cheveux: "#2e251f",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"walsh jack": {
		peau: "#ae806b",
		cheveux: "#5a4130",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"walsh sean": {
		peau: "#d4988a",
		cheveux: "#211814",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"walt steenkamp": {
		peau: "#aa7b6b",
		cheveux: "#2d231d",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"wame naituvi": {
		tailleCm: 178,
		poidsKg: 82,
		peau: "#8b563e",
		cheveux: "#151311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"wandisile simelane": {
		peau: "#6c4633",
		cheveux: "#2a1c0e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"wandrille picault": {
		tailleCm: 181,
		poidsKg: 95,
		peau: "#c28e6d",
		cheveux: "#3a2e1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ward bryn": {
		peau: "#d3a197",
		cheveux: "#643d26",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"ward zac": {
		peau: "#d7a592",
		cheveux: "#643d2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"warner dearns": {
		peau: "#cf866d",
		cheveux: "#684630",
		yeux: "#624633",
		coiffure: "short",
		barbe: "moustache"
	},
	"warren ben": {
		peau: "#c88f78",
		cheveux: "#3a2c27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"warrick gelant": {
		peau: "#7f4e32",
		cheveux: "#2e1e0e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"wataru furuya": {
		peau: "#bb7f63",
		cheveux: "#29211b",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"wataru kobayashi": {
		peau: "#bb7e68",
		cheveux: "#1e1c1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"watkin owen": {
		peau: "#92716a",
		cheveux: "#28242a",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"watson fergus": {
		peau: "#ca9682",
		cheveux: "#493b31",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"wayan de benedittis": {
		tailleCm: 181,
		poidsKg: 104,
		peau: "#ba6e5b",
		cheveux: "#140c0a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"weilbach corne": {
		peau: "#bb836b",
		cheveux: "#2c281a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"weimann jonny": {
		peau: "#ae706f",
		cheveux: "#201310",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"weir duncan": {
		peau: "#be836e",
		cheveux: "#432e27",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"wendemi viellard": {
		tailleCm: 199,
		poidsKg: 110,
		peau: "#794a33",
		cheveux: "#2b1d13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"werchon louis": {
		peau: "#c49274",
		cheveux: "#704f35",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"werner kok": {
		tailleCm: 184,
		poidsKg: 86,
		peau: "#c7896b",
		cheveux: "#583e32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"wesley masima": {
		tailleCm: 183,
		poidsKg: 135,
		peau: "#b78f74",
		cheveux: "#535353",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"wessels jan hendrik": {
		peau: "#bb867b",
		cheveux: "#403529",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"west harry": {
		peau: "#cf8370",
		cheveux: "#321d18",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"westwood joe": {
		peau: "#c68b79",
		cheveux: "#684d38",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"whetukamokamo douglas": {
		peau: "#de9f8c",
		cheveux: "#826865",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"whitehead george": {
		peau: "#b27f67",
		cheveux: "#4f3c2f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"whitlock scott": {
		peau: "#b48470",
		cheveux: "#221d18",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "full_beard"
	},
	"wiese cobus": {
		peau: "#b57e6c",
		cheveux: "#3e3229",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"wihongi connor": {
		peau: "#d29e8d",
		cheveux: "#2d2826",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"wilco louw": {
		peau: "#b67e6b",
		cheveux: "#372f28",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"wilde harri": {
		peau: "#a47776",
		cheveux: "#4d3633",
		yeux: "#624633",
		coiffure: "long",
		barbe: "short_beard"
	},
	"wilfrid hounkpatin": {
		tailleCm: 189,
		poidsKg: 123,
		peau: "#98614f",
		cheveux: "#080808",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"wilfried hulleu": {
		tailleCm: 187,
		poidsKg: 87,
		peau: "#ce8e74",
		cheveux: "#683d25",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"will cole": {
		peau: "#d08767",
		cheveux: "#513b30",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"will connors": {
		tailleCm: 200,
		poidsKg: 93,
		peau: "#af6e60",
		cheveux: "#192623",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"will davies king": {
		peau: "#ad7b7a",
		cheveux: "#4a3d37",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"will evans": {
		tailleCm: 196,
		poidsKg: 113,
		peau: "#ad694f",
		cheveux: "#36190a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"will goddard": {
		peau: "#cb8578",
		cheveux: "#513c33",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"will goodrick clarke": {
		tailleCm: 186,
		poidsKg: 121,
		peau: "#d88d7b",
		cheveux: "#312116",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"will greatbanks": {
		peau: "#aa7f73",
		cheveux: "#775f3e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"will harris": {
		peau: "#d29177",
		cheveux: "#43311e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"will harrison": {
		tailleCm: 180,
		poidsKg: 83,
		peau: "#ad6f5f",
		cheveux: "#32261e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"will haydon wood": {
		tailleCm: 182,
		poidsKg: 80,
		peau: "#db8e7b",
		cheveux: "#382115",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"will hobson": {
		tailleCm: 190,
		poidsKg: 117,
		peau: "#c68075",
		cheveux: "#774c33",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "moustache"
	},
	"will hurd": {
		tailleCm: 185,
		poidsKg: 115,
		peau: "#a86558",
		cheveux: "#361919",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"will jordan": {
		peau: "#d2a38e",
		cheveux: "#27211c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"will joseph": {
		tailleCm: 183,
		poidsKg: 86,
		peau: "#925647",
		cheveux: "#261512",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"will mc culloch": {
		peau: "#bd9293",
		cheveux: "#57443d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"will muir": {
		tailleCm: 185,
		poidsKg: 91,
		peau: "#c59076",
		cheveux: "#291e16",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"will porter": {
		tailleCm: 185,
		poidsKg: 81,
		peau: "#bc775f",
		cheveux: "#452212",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"will ross": {
		peau: "#bd928a",
		cheveux: "#1d1818",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"will roue": {
		peau: "#c08669",
		cheveux: "#211810",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"will stodart": {
		peau: "#d39c7a",
		cheveux: "#332a23",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"will stuart": {
		tailleCm: 192,
		poidsKg: 126,
		peau: "#b08575",
		cheveux: "#453023",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"will trenholm": {
		tailleCm: 191,
		poidsKg: 105,
		peau: "#b27773",
		cheveux: "#251612",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "full_beard"
	},
	"will wand": {
		tailleCm: 182,
		poidsKg: 90,
		peau: "#ba7666",
		cheveux: "#231713",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"willemse damian": {
		peau: "#804c39",
		cheveux: "#1e1714",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"william collier": {
		peau: "#c67d76",
		cheveux: "#472e29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"william demotte": {
		tailleCm: 205,
		poidsKg: 112,
		peau: "#c58b6e",
		cheveux: "#254d80",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "short_beard"
	},
	"william skelton": {
		peau: "#b47c60",
		cheveux: "#211410",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"william tupou": {
		peau: "#c99176",
		cheveux: "#333132",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"william van bost": {
		tailleCm: 187,
		poidsKg: 95,
		peau: "#ad6f4a",
		cheveux: "#231d13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"williams ben": {
		peau: "#ad796e",
		cheveux: "#52392f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"williams devon": {
		peau: "#aa7359",
		cheveux: "#201a16",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"williams grant": {
		peau: "#865040",
		cheveux: "#221f1c",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"williams harri": {
		peau: "#b07f6e",
		cheveux: "#44342a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"williams jaco": {
		peau: "#a4755c",
		cheveux: "#242422",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"williams james": {
		peau: "#d39773",
		cheveux: "#5c412e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"williams johnny": {
		peau: "#986a62",
		cheveux: "#3c1c1e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"williams keiran": {
		peau: "#b68574",
		cheveux: "#70533f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"williams osian": {
		peau: "#b07d78",
		cheveux: "#5d1f21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"williams rhodri": {
		peau: "#b7826f",
		cheveux: "#4e382b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"williams teddy": {
		peau: "#c08981",
		cheveux: "#2e272e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"williamson max": {
		peau: "#af7d61",
		cheveux: "#4f3928",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"willie le roux": {
		peau: "#af7c70",
		cheveux: "#3a322d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"willie potgieter": {
		peau: "#c29682",
		cheveux: "#514036",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"wilson scott": {
		peau: "#be8e70",
		cheveux: "#5e432e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"wilson tobi": {
		peau: "#cd8e6d",
		cheveux: "#2e2419",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"winnett cam": {
		peau: "#b5807e",
		cheveux: "#4b3635",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"wolhuter kade": {
		peau: "#bc826b",
		cheveux: "#592a25",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"wood gordon": {
		peau: "#d6907e",
		cheveux: "#7f1e1f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"wood tom": {
		peau: "#d59682",
		cheveux: "#4c3826",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"woodman ryan": {
		peau: "#dba188",
		cheveux: "#463125",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"woolley callum": {
		peau: "#8c5f4f",
		cheveux: "#472e28",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"woolmore jake": {
		peau: "#cd8d71",
		cheveux: "#55412e",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"wright craig": {
		peau: "#c59089",
		cheveux: "#6f5140",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"wycherley fineen": {
		peau: "#cc8873",
		cheveux: "#662721",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"wycherley josh": {
		peau: "#dd9a87",
		cheveux: "#772a24",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"wyn jones": {
		tailleCm: 184,
		poidsKg: 105,
		peau: "#ba8775",
		cheveux: "#564135",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"wynand grassmann": {
		peau: "#c59587",
		cheveux: "#77534a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"xaba nama": {
		peau: "#5e3f30",
		cheveux: "#2f241c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"xan mousques": {
		tailleCm: 179,
		poidsKg: 79,
		peau: "#ad7b6a",
		cheveux: "#362821",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"xander iosefo": {
		tailleCm: 186,
		poidsKg: 101,
		peau: "#ca7f5a",
		cheveux: "#100c0a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"xavier mignot": {
		peau: "#986f62",
		cheveux: "#1f1c1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"xavier numia": {
		peau: "#b16c4c",
		cheveux: "#231f1d",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"xavier roe": {
		tailleCm: 184,
		poidsKg: 77,
		peau: "#d49279",
		cheveux: "#6d4333",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"xavier rubens": {
		peau: "#b58581",
		cheveux: "#382924",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"xavier saifoloi": {
		peau: "#ab765e",
		cheveux: "#131213",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"xavier stowers": {
		peau: "#b57d63",
		cheveux: "#372f2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"xavier tito harris": {
		peau: "#c18760",
		cheveux: "#352921",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"xavier treacy": {
		peau: "#d29a7f",
		cheveux: "#31251a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yacouba camara": {
		tailleCm: 196,
		poidsKg: 107,
		peau: "#6a4f49",
		cheveux: "#191515",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"yahnis el maslouhi": {
		tailleCm: 176,
		poidsKg: 110,
		peau: "#b97c60",
		cheveux: "#281f15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"yamada hibiki": {
		peau: "#cc9f92",
		cheveux: "#262426",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yamato matsuoka": {
		peau: "#a1725d",
		cheveux: "#242021",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yamato tanigawa": {
		peau: "#ce8d72",
		cheveux: "#1f1a15",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yan arnold": {
		tailleCm: 181,
		poidsKg: 104,
		peau: "#c07d5f",
		cheveux: "#402d1f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"yanis boulassel": {
		tailleCm: 192,
		poidsKg: 98,
		peau: "#c08764",
		cheveux: "#120d09",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yanis brillant": {
		tailleCm: 178,
		poidsKg: 91,
		peau: "#b77a5b",
		cheveux: "#2e241b",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"yanis charcosset": {
		tailleCm: 183,
		poidsKg: 94,
		peau: "#be7961",
		cheveux: "#362317",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"yanis lockwood": {
		tailleCm: 178,
		poidsKg: 93,
		peau: "#c68865",
		cheveux: "#261a10",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"yanis lux": {
		tailleCm: 178,
		poidsKg: 91,
		peau: "#92685a",
		cheveux: "#42302e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yann lesgourgues": {
		tailleCm: 180,
		poidsKg: 71,
		peau: "#d59c81",
		cheveux: "#553a2a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yann peysson": {
		tailleCm: 192,
		poidsKg: 93,
		peau: "#c78769",
		cheveux: "#3c291e",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"yannick abeke paul lodjro": {
		peau: "#ad7662",
		cheveux: "#281f20",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yannick arroyo": {
		tailleCm: 184,
		poidsKg: 127,
		peau: "#ab7a52",
		cheveux: "#302417",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"yannick youyoutte": {
		tailleCm: 196,
		poidsKg: 114,
		peau: "#9c7058",
		cheveux: "#1e1c1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yarr mikey": {
		peau: "#d58d7e",
		cheveux: "#402514",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yassin boutemmani": {
		tailleCm: 174,
		poidsKg: 109,
		peau: "#97634f",
		cheveux: "#5c352f",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"yasuaki katakura": {
		peau: "#daa595",
		cheveux: "#151415",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yasue yoshimitsu": {
		peau: "#e1aea1",
		cheveux: "#3b3635",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yasunari isoda": {
		peau: "#cc9679",
		cheveux: "#211b18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yasuo saruwatari": {
		peau: "#ae765d",
		cheveux: "#181513",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yasuyuki yamamoto": {
		peau: "#e0b1a2",
		cheveux: "#323137",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yaw penxe": {
		peau: "#6d4f42",
		cheveux: "#2f2c26",
		yeux: "#657452",
		coiffure: "short",
		barbe: "full_beard"
	},
	"yendle luke": {
		peau: "#c78d78",
		cheveux: "#573f32",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"yerim fall": {
		tailleCm: 178,
		poidsKg: 80,
		peau: "#96634e",
		cheveux: "#3f3935",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"yo sato": {
		peau: "#dcaa81",
		cheveux: "#202222",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yoan tanga mangene": {
		peau: "#88655d",
		cheveux: "#3d2d2b",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"yohan beheregaray": {
		tailleCm: 178,
		poidsKg: 94,
		peau: "#d7ac97",
		cheveux: "#271f1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"yohan orabe": {
		tailleCm: 192,
		poidsKg: 79,
		peau: "#cb7d69",
		cheveux: "#211714",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"yohan tapie": {
		tailleCm: 193,
		poidsKg: 80,
		peau: "#dea389",
		cheveux: "#201814",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yohei kobayashi": {
		peau: "#d8a186",
		cheveux: "#1d1b19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yohei murakami": {
		peau: "#cc9688",
		cheveux: "#342a24",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yoji shiina": {
		peau: "#b58b70",
		cheveux: "#221b17",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yon caperaa": {
		tailleCm: 176,
		poidsKg: 106,
		peau: "#ba7a60",
		cheveux: "#392a23",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "short_beard"
	},
	"yongchol kim": {
		peau: "#d4a38b",
		cheveux: "#413e3d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yonhi kim": {
		peau: "#e2b99c",
		cheveux: "#191615",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yoni tuataane": {
		tailleCm: 191,
		poidsKg: 97,
		peau: "#d39778",
		cheveux: "#221a15",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"yoram falatea moefana": {
		peau: "#7a5140",
		cheveux: "#191311",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yoshiaki takeuchi": {
		peau: "#c18a78",
		cheveux: "#261312",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yoshiaki taniguchi": {
		peau: "#bd8e72",
		cheveux: "#26211f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yoshihiro noguchi": {
		peau: "#daa59e",
		cheveux: "#2a2123",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yoshihiro sononaka": {
		peau: "#d5a182",
		cheveux: "#1b1916",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yoshikatsu hikosaka": {
		peau: "#dab09a",
		cheveux: "#333435",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yoshiki okazaki": {
		peau: "#c3986b",
		cheveux: "#2e2921",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yoshiki omachi": {
		peau: "#be8f6e",
		cheveux: "#13120f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yoshiki yamazaki": {
		peau: "#d8a883",
		cheveux: "#1d1d1c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yoshiki yoshioka": {
		peau: "#d09177",
		cheveux: "#25211d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yoshinobu otake": {
		peau: "#ae7752",
		cheveux: "#242325",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yoshitaka tokunaga": {
		peau: "#d2a187",
		cheveux: "#211f1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yoshiteru hino": {
		peau: "#cd9073",
		cheveux: "#2c1f18",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yoshitsumi shimora": {
		peau: "#a3684c",
		cheveux: "#291d17",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yoshiyuki koga": {
		peau: "#dca57d",
		cheveux: "#181613",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yoshizumi takeda": {
		peau: "#996548",
		cheveux: "#1a1815",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yosuke nishiura": {
		peau: "#d8a686",
		cheveux: "#1c1d1d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yosuke okuma": {
		peau: "#d99f98",
		cheveux: "#1f1b21",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yota kamimori": {
		peau: "#dbab9c",
		cheveux: "#292728",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"young isaac": {
		peau: "#a87867",
		cheveux: "#6d1f29",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"young matty": {
		peau: "#a77a77",
		cheveux: "#3c3034",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"young thomas": {
		peau: "#c18d75",
		cheveux: "#604634",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"youri delhommel": {
		tailleCm: 176,
		poidsKg: 96,
		peau: "#be7c65",
		cheveux: "#2a2421",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"youssouf soucouna": {
		tailleCm: 204,
		poidsKg: 99,
		peau: "#6e574d",
		cheveux: "#1d1d1c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yu chinen": {
		peau: "#c0926e",
		cheveux: "#2a221b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yu kawai": {
		peau: "#e0ab95",
		cheveux: "#352f2f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yu saruta": {
		peau: "#d0aa8b",
		cheveux: "#2a211c",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yu tamura": {
		peau: "#c69974",
		cheveux: "#2b2421",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yu yomogita": {
		peau: "#bf7f69",
		cheveux: "#262423",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"yuchol mun": {
		peau: "#a0674c",
		cheveux: "#13120f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yudai ishii": {
		peau: "#daa3a2",
		cheveux: "#261f25",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuga kawase": {
		peau: "#e0a198",
		cheveux: "#241e25",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuga suzuki": {
		peau: "#c8937e",
		cheveux: "#29211f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yugo oyamada": {
		peau: "#cca58a",
		cheveux: "#272220",
		yeux: "#657452",
		coiffure: "long",
		barbe: "none"
	},
	"yuhei shimada": {
		peau: "#c4907e",
		cheveux: "#262426",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuhei sugiyama": {
		peau: "#d09c85",
		cheveux: "#201d1a",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuichiro hosono": {
		peau: "#d3a681",
		cheveux: "#1c1c1c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuichiro taniguchi": {
		peau: "#d89a79",
		cheveux: "#231f1c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuichiro wada": {
		peau: "#d89480",
		cheveux: "#272326",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuji chae": {
		peau: "#cb8a6c",
		cheveux: "#1b1a17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuji shimogama": {
		peau: "#c79678",
		cheveux: "#2e2927",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuji takahashi": {
		peau: "#de9f7b",
		cheveux: "#261d1c",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yujin ikezawa": {
		peau: "#ba8f73",
		cheveux: "#191614",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yujiro yano": {
		peau: "#bf867a",
		cheveux: "#201613",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuki ando": {
		peau: "#c98d7a",
		cheveux: "#212221",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"yuki aoki": {
		peau: "#c58c7d",
		cheveux: "#242224",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuki asai": {
		peau: "#d19e8b",
		cheveux: "#272629",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuki ikeda": {
		peau: "#d89e7b",
		cheveux: "#23211e",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuki ishii": {
		peau: "#dcac8f",
		cheveux: "#1e1e1d",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuki kagoshima": {
		peau: "#bd8978",
		cheveux: "#160f0d",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"yuki kawai": {
		peau: "#c5957c",
		cheveux: "#271f1a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuki kikuchi": {
		peau: "#cd8f79",
		cheveux: "#2d2e2f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuki miyazato": {
		peau: "#be8367",
		cheveux: "#1e1d1a",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yuki okada": {
		peau: "#c89684",
		cheveux: "#1c2128",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuki tsujioka": {
		peau: "#d9a095",
		cheveux: "#252026",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuki yamada": {
		peau: "#c08a6b",
		cheveux: "#151312",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yukio morikawa": {
		peau: "#b17165",
		cheveux: "#28221f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yukito akasako": {
		peau: "#cd9184",
		cheveux: "#3a2925",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yule kerr": {
		peau: "#d49b84",
		cheveux: "#624730",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yuma fujino": {
		peau: "#d8a17e",
		cheveux: "#252523",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuma kikumoto": {
		peau: "#d79482",
		cheveux: "#302e2d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuma nakagawa": {
		peau: "#b57c5f",
		cheveux: "#191816",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuma sugimoto": {
		peau: "#613e27",
		cheveux: "#3b220e",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"yuma uenobo": {
		peau: "#cf9b8b",
		cheveux: "#2a2628",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"yuo kim": {
		peau: "#dda783",
		cheveux: "#141710",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"yura chinen": {
		peau: "#d4a58e",
		cheveux: "#392c23",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuragi muto": {
		peau: "#b6815c",
		cheveux: "#1b1816",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yusaku kanda": {
		peau: "#ca9174",
		cheveux: "#201917",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yusaku kihara": {
		peau: "#d49d8a",
		cheveux: "#272323",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yusaku miyoshi": {
		peau: "#bf8d65",
		cheveux: "#443929",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yusei tanaka": {
		peau: "#e2aa8a",
		cheveux: "#13150d",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"yushi inoue": {
		peau: "#a16b53",
		cheveux: "#161614",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yushi okuda": {
		peau: "#da9d92",
		cheveux: "#231f26",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yushi takai": {
		peau: "#deac9b",
		cheveux: "#2d2f31",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yusuke aramaki": {
		peau: "#ba7e5a",
		cheveux: "#322720",
		yeux: "#657452",
		coiffure: "bald",
		barbe: "moustache"
	},
	"yusuke kajimura": {
		peau: "#bb875c",
		cheveux: "#2c241f",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yusuke kishi": {
		peau: "#dba98e",
		cheveux: "#252322",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yusuke kitabayashi": {
		peau: "#c49284",
		cheveux: "#1c1b1b",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yusuke kizu": {
		peau: "#dba48a",
		cheveux: "#353331",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yusuke maruo": {
		peau: "#bb7244",
		cheveux: "#391f10",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"yusuke niwai": {
		peau: "#c08e6c",
		cheveux: "#332925",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yusuke sakamoto": {
		peau: "#c68b70",
		cheveux: "#161615",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yusuke yamada": {
		peau: "#cd9275",
		cheveux: "#332d29",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yusyo narita": {
		peau: "#b98061",
		cheveux: "#231f1e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuta akihama": {
		peau: "#c48469",
		cheveux: "#221c18",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuta kawamura": {
		peau: "#dca889",
		cheveux: "#23211e",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuta kojima": {
		peau: "#dda884",
		cheveux: "#2e2719",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yuta kokaji": {
		peau: "#cc9077",
		cheveux: "#1f1b19",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuta kurihara": {
		peau: "#dd9d73",
		cheveux: "#23201d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "short_beard"
	},
	"yuta matsuura": {
		peau: "#da9d84",
		cheveux: "#252526",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuta moriyama": {
		peau: "#d28256",
		cheveux: "#282017",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuta nishihama": {
		peau: "#b58069",
		cheveux: "#161616",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuta okamura": {
		peau: "#d89e85",
		cheveux: "#221f1c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuta shirasaka": {
		peau: "#dba68c",
		cheveux: "#2a2726",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuta sugiyama": {
		peau: "#b1886b",
		cheveux: "#1a1715",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yuta tokunaga": {
		peau: "#a0796b",
		cheveux: "#262123",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yutaka nagare": {
		peau: "#c88d79",
		cheveux: "#292322",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yutaro danno": {
		peau: "#b17c6e",
		cheveux: "#1b1a19",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yutaro shirako": {
		peau: "#d8a898",
		cheveux: "#393539",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yutaro tanaka": {
		peau: "#c68f7c",
		cheveux: "#252221",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yutaro yamaguchi": {
		peau: "#d99e84",
		cheveux: "#302f2f",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuto matsuoka": {
		peau: "#c59279",
		cheveux: "#231f1b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuto mori": {
		peau: "#be8c69",
		cheveux: "#241e1c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuto nakamura": {
		peau: "#cf9c85",
		cheveux: "#171513",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuto takano": {
		peau: "#da9f96",
		cheveux: "#18151a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuto tokuda": {
		peau: "#c08d82",
		cheveux: "#1a1615",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuto usuda": {
		peau: "#d1967e",
		cheveux: "#171614",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuui matsubara": {
		peau: "#cf9069",
		cheveux: "#382626",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"yuuki kouno": {
		peau: "#b7795a",
		cheveux: "#2a201a",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuuki mitamura": {
		peau: "#c5845e",
		cheveux: "#221b17",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuuki uchiyama": {
		peau: "#ba7a5c",
		cheveux: "#1e1713",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yuya hirose": {
		peau: "#c69c93",
		cheveux: "#1f1c1c",
		yeux: "#624633",
		coiffure: "long",
		barbe: "none"
	},
	"yuya odo": {
		peau: "#c59b86",
		cheveux: "#1e1a16",
		yeux: "#624633",
		coiffure: "afro",
		barbe: "none"
	},
	"yuzuki sasaki": {
		peau: "#d5a07a",
		cheveux: "#0e130c",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"yvan david": {
		tailleCm: 180,
		poidsKg: 75,
		peau: "#c89678",
		cheveux: "#674c3a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"yvan reilhac": {
		tailleCm: 179,
		poidsKg: 87,
		peau: "#c5937c",
		cheveux: "#413e37",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"yvann laleve": {
		peau: "#cd8b69",
		cheveux: "#422f21",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"zac finch": {
		tailleCm: 181,
		poidsKg: 80,
		peau: "#af846f",
		cheveux: "#1b1410",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"zac hough": {
		peau: "#9d5f55",
		cheveux: "#1c191a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"zac lomax": {
		tailleCm: 195,
		poidsKg: 98,
		peau: "#b6846e",
		cheveux: "#463122",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"zac porthen": {
		peau: "#905d47",
		cheveux: "#382b19",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "none"
	},
	"zac ward": {
		peau: "#d7a592",
		cheveux: "#643d2c",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"zaccharie affane": {
		tailleCm: 186,
		poidsKg: 122,
		peau: "#c2866a",
		cheveux: "#261f1a",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"zach carr": {
		tailleCm: 202,
		poidsKg: 103,
		peau: "#bc7961",
		cheveux: "#43210e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "none"
	},
	"zach gallagher": {
		peau: "#d2a494",
		cheveux: "#52433d",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"zach yvan mercer": {
		peau: "#ad6c58",
		cheveux: "#2a211d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"zack gauthier": {
		tailleCm: 174,
		poidsKg: 104,
		peau: "#cfab8a",
		cheveux: "#373027",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "none"
	},
	"zack henry": {
		tailleCm: 178,
		poidsKg: 84,
		peau: "#b79b74",
		cheveux: "#2f312c",
		yeux: "#657452",
		coiffure: "buzz",
		barbe: "full_beard"
	},
	"zack wimbush": {
		tailleCm: 199,
		poidsKg: 106,
		peau: "#ca8d72",
		cheveux: "#412815",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"zak burger": {
		peau: "#916150",
		cheveux: "#222725",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"zak price": {
		tailleCm: 189,
		poidsKg: 134,
		peau: "#e5b3a5",
		cheveux: "#493229",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"zakaria el fakir": {
		tailleCm: 182,
		poidsKg: 101,
		peau: "#b1795d",
		cheveux: "#282421",
		yeux: "#624633",
		coiffure: "bald",
		barbe: "none"
	},
	"zalan kade": {
		peau: "#d6a996",
		cheveux: "#7d634f",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"zanandrea federico": {
		peau: "#bf8b71",
		cheveux: "#1d130d",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"zander fagerson": {
		tailleCm: 193,
		poidsKg: 121,
		peau: "#c08d74",
		cheveux: "#302821",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"zane marolt": {
		peau: "#d18a77",
		cheveux: "#23201b",
		yeux: "#624633",
		coiffure: "curly",
		barbe: "none"
	},
	"zane nonggorr": {
		peau: "#906056",
		cheveux: "#131315",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"zanon marco": {
		peau: "#c9897a",
		cheveux: "#3a4143",
		yeux: "#624633",
		coiffure: "short",
		barbe: "full_beard"
	},
	"zas leolin": {
		peau: "#976246",
		cheveux: "#1a1d13",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"zephaniah tuinona": {
		peau: "#c27f56",
		cheveux: "#1d190e",
		yeux: "#624633",
		coiffure: "messy",
		barbe: "moustache"
	},
	"zigiriadis leftheri": {
		peau: "#b27668",
		cheveux: "#191312",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"zilocchi giosue": {
		peau: "#b07365",
		cheveux: "#372c27",
		yeux: "#624633",
		coiffure: "buzz",
		barbe: "short_beard"
	},
	"zinedine aouad": {
		tailleCm: 195,
		poidsKg: 108,
		peau: "#966652",
		cheveux: "#151211",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	},
	"zuliani manuel": {
		peau: "#b5836e",
		cheveux: "#4a3623",
		yeux: "#624633",
		coiffure: "short",
		barbe: "none"
	},
	"zuriel togiatama": {
		tailleCm: 182,
		poidsKg: 98,
		peau: "#c08c6c",
		cheveux: "#171515",
		yeux: "#624633",
		coiffure: "short",
		barbe: "short_beard"
	}
}, E = {
	pilier_gauche: [
		184,
		119,
		"pilier"
	],
	talonneur: [
		181,
		108,
		"pilier"
	],
	pilier_droit: [
		185,
		121,
		"pilier"
	],
	deuxieme_ligne_g: [
		199,
		116,
		"avant"
	],
	deuxieme_ligne_d: [
		199,
		116,
		"avant"
	],
	troisieme_aile_g: [
		191,
		107,
		"avant"
	],
	troisieme_aile_d: [
		191,
		107,
		"avant"
	],
	numero_8: [
		193,
		112,
		"avant"
	],
	demi_melee: [
		176,
		82,
		"arriere"
	],
	demi_ouverture: [
		183,
		88,
		"arriere"
	],
	ailier_gauche: [
		186,
		91,
		"ailier"
	],
	premier_centre: [
		188,
		99,
		"athletique"
	],
	deuxieme_centre: [
		189,
		100,
		"athletique"
	],
	ailier_droit: [
		186,
		91,
		"ailier"
	],
	arriere: [
		187,
		92,
		"arriere"
	]
}, ee = [
	"#efc19d",
	"#d99b72",
	"#b87550",
	"#8f573b",
	"#633d2f",
	"#4a3028"
], D = [
	"#171311",
	"#2c1d17",
	"#4c2f20",
	"#72503a",
	"#b07d4f"
], te = [
	"#49301f",
	"#654530",
	"#3e5361",
	"#4f6247",
	"#6c5435"
], ne = [
	"bald",
	"buzz",
	"short",
	"fade",
	"curly",
	"afro",
	"mullet",
	"mohawk",
	"messy",
	"long",
	"dreadlocks"
], O = [
	"none",
	"none",
	"none",
	"none",
	"moustache",
	"goatee",
	"short_beard",
	"full_beard"
];
function re(e) {
	return e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
}
function ie(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n++) t = Math.imul(t ^ e.charCodeAt(n), 16777619);
	return t >>> 0;
}
function ae(e, t) {
	let n = re(e), r = T[n], i = ie(`${n}:${t}`), [a, o, s] = E[t] ?? E.arriere;
	return {
		tailleCm: r?.tailleCm ?? a + i % 15 - 7,
		poidsKg: r?.poidsKg ?? o + (i >>> 4) % 19 - 9,
		peau: r?.peau ?? ee[(i >>> 8) % ee.length],
		yeux: r?.yeux ?? te[(i >>> 6) % te.length],
		cheveux: r?.cheveux ?? D[(i >>> 12) % D.length],
		coiffure: r?.coiffure ?? ne[(i >>> 16) % ne.length],
		barbe: r?.barbe ?? O[(i >>> 20) % O.length],
		morphologie: s
	};
}
function k(e, t) {
	let n = e.x - t.x, r = e.y - t.y;
	return Math.sqrt(n * n + r * r);
}
function A(e, t) {
	let n = e.x - t.x, r = e.y - t.y;
	return n * n + r * r;
}
function j(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function oe(e, t, n) {
	return e + (t - e) * n;
}
function M(e) {
	return e === "A" ? 1 : -1;
}
function N(e) {
	return e === "A" ? "B" : "A";
}
function se(e) {
	return e === "A" ? 111 : 11;
}
function ce(e) {
	return e === "A" ? 11 : 111;
}
function P(e, t) {
	return (se(t) - e.x) * M(t);
}
function le(e, t) {
	return P(e, t) <= 22;
}
function ue(e, t) {
	return t === "A" ? e.x <= 33 : e.x >= 89;
}
function de(e, t) {
	return t === "A" ? e.x < 61 : e.x > 61;
}
function fe(e, t) {
	return P(e, t) <= 0;
}
function pe(e) {
	return e.y <= 0 || e.y >= 70;
}
function me(e) {
	return e.y < 35 ? 1 : -1;
}
function he(e) {
	return e.y < 35 ? 70 - e.y : e.y;
}
//#endregion
//#region src/lib/moteur/entites.ts
function ge() {
	return {
		metres: 0,
		courses: 0,
		passes: 0,
		passesDecisives: 0,
		passesRatees: 0,
		offloads: 0,
		franchissements: 0,
		plaquages: 0,
		plaquagesManques: 0,
		rucksNettoyes: 0,
		grattages: 0,
		melees: 0,
		touchesGagnees: 0,
		pickAndGo: 0,
		coupsDePied: 0,
		metresAuPied: 0,
		cinquanteVingtDeux: 0,
		essais: 0,
		butsTentes: 0,
		butsReussis: 0,
		cartonsJaunes: 0,
		cartonsRouges: 0,
		distanceParcourue: 0
	};
}
var _e = [
	"pilier_gauche",
	"talonneur",
	"pilier_droit",
	"deuxieme_ligne_g",
	"deuxieme_ligne_d",
	"troisieme_aile_g",
	"troisieme_aile_d",
	"numero_8",
	"demi_melee",
	"demi_ouverture",
	"ailier_gauche",
	"premier_centre",
	"deuxieme_centre",
	"ailier_droit",
	"arriere"
], ve = {
	pilier_gauche: 6.9,
	talonneur: 7.3,
	pilier_droit: 6.9,
	deuxieme_ligne_g: 7.4,
	deuxieme_ligne_d: 7.4,
	troisieme_aile_g: 8.1,
	troisieme_aile_d: 8.1,
	numero_8: 8,
	demi_melee: 8.3,
	demi_ouverture: 8.2,
	ailier_gauche: 9.3,
	premier_centre: 8.6,
	deuxieme_centre: 8.7,
	ailier_droit: 9.3,
	arriere: 9
}, ye = {
	pilier_gauche: 3,
	talonneur: 3.4,
	pilier_droit: 3,
	deuxieme_ligne_g: 3.2,
	deuxieme_ligne_d: 3.2,
	troisieme_aile_g: 4,
	troisieme_aile_d: 4,
	numero_8: 3.9,
	demi_melee: 4.6,
	demi_ouverture: 4.4,
	ailier_gauche: 5,
	premier_centre: 4.3,
	deuxieme_centre: 4.4,
	ailier_droit: 5,
	arriere: 4.6
};
function be(e, t) {
	return typeof e == "number" && Number.isFinite(e) ? e : t;
}
var xe = new Set(_e.slice(0, 8));
function Se(e, t, n, r, i) {
	let a = t < 15 ? _e[t] ?? e.poste : e.poste, o = t < 15 ? t < 8 : xe.has(a), s = j(e.note, 20, 99), c = i ?? {
		...w(e),
		jeuAuPied: e.jeuAuPied ?? w(e).jeuAuPied
	}, l = ae(e.nom, e.poste), u = be(c.vitesse, o ? s - 7 : s + 5), d = be(c.endurance, s);
	return {
		id: `${n}${t}`,
		sourceId: e.id,
		nom: e.nom,
		numero: t + 1,
		poste: a,
		cote: n,
		avant: o,
		moi: r,
		capitaine: !1,
		poidsKg: l.poidsKg,
		tailleCm: l.tailleCm,
		buteur: !1,
		pos: {
			x: 0,
			y: 35
		},
		vitesse: {
			x: 0,
			y: 0
		},
		cible: {
			x: 0,
			y: 35
		},
		vitesseMax: (ve[a] ?? 8) * (.61 + j(u, 5, 99) / 190),
		acceleration: (ye[a] ?? 4) * (.55 + j(u, 5, 99) / 145),
		endurance: 100,
		battu: 0,
		horsJeu: !1,
		surLeTerrain: t < 15,
		sanction: 0,
		minutes: 0,
		role: "ligne",
		plaquage: be(c.plaquage, o ? s + 5 : s - 2),
		evitement: be(c.vitesse, s) * .55 + be(c.mental, s) * .2 + (o ? 0 : 8),
		puissance: be(c.force, o ? s + 6 : s - 2),
		passe: be(c.passe, o ? s - 8 : s + 2),
		pied: be(c.jeuAuPied, a === "demi_ouverture" || a === "arriere" ? s + 6 : a === "demi_melee" ? s : s - 14),
		vision: be(c.vision, s),
		discipline: be(c.mental, s),
		detente: o ? s + (a.startsWith("deuxieme_ligne") ? 10 : 0) : s - 10,
		usure: .03 * (1.55 - d / 135),
		effort: 1,
		stats: ge()
	};
}
function Ce(e) {
	return e.vitesseMax * (.58 + .42 * (e.endurance / 100));
}
var we = 7.5;
function Te(e, t, n = !1) {
	if (e.corps) return 0;
	let r = e.cible.x - e.pos.x, i = e.cible.y - e.pos.y, a = Math.sqrt(r * r + i * i), o = Ce(e) * e.effort, s = [
		"ruck",
		"maul",
		"melee",
		"alignement"
	].includes(e.role) ? .08 : .7, c = a < s ? 0 : n ? Math.min(o, Math.sqrt(2 * we * .8 * Math.max(0, a - s * .5))) : Math.min(o, Math.max(0, a - s * .55) / .35), l = a < 1e-6 ? 0 : r / a * c, u = a < 1e-6 ? 0 : i / a * c, d = l - e.vitesse.x, f = u - e.vitesse.y, p = Math.sqrt(d * d + f * f), m = .65 + .35 * (e.endurance / 100), h = e.acceleration * m * t;
	n && d * e.vitesse.x + f * e.vitesse.y < 0 && (h = Math.max(h, we * t)), p > h && p > 1e-6 && (d = d / p * h, f = f / p * h), e.vitesse.x += d, e.vitesse.y += f;
	let g = Math.hypot(e.vitesse.x, e.vitesse.y) * t;
	if (e.pos.x += e.vitesse.x * t, e.pos.y += e.vitesse.y * t, e.pos.x = j(e.pos.x, -1.5, 123.5), e.pos.y = j(e.pos.y, -1.5, 71.5), e.stats.distanceParcourue += g, g > 0) {
		let n = Math.min(1, g / t / e.vitesseMax);
		e.endurance = Math.max(0, e.endurance - e.usure * t * n ** 1.6 * 10);
	}
	return g;
}
function F(e) {
	e.vitesse.x = 0, e.vitesse.y = 0;
}
//#endregion
//#region src/lib/moteur/phasesArretees.ts
var Ee = 2.5;
function I(e) {
	return j(e, Ee, 70 - Ee);
}
function De(e, t) {
	return e.filter((e) => e.surLeTerrain && e.cote === t && e.sanction <= 0);
}
function Oe(e, t) {
	return e.find((e) => e.numero === t);
}
var ke = {
	1: [.5, -.85],
	2: [.4, 0],
	3: [.5, .85],
	4: [1.6, -.45],
	5: [1.6, .45],
	6: [1.8, -1.55],
	7: [1.8, 1.55],
	8: [2.8, 0]
};
function Ae(e, t, n) {
	let r = {}, i = t.y < 35 ? 1 : -1;
	for (let a of ["A", "B"]) {
		let o = M(a), s = De(e, a), c = a === n;
		for (let e of s.filter((e) => e.avant).slice(0, 8)) {
			let [n, i] = ke[e.numero] ?? [2, 0];
			e.role = "melee", r[e.id] = {
				x: t.x - o * n,
				y: I(t.y + i)
			};
		}
		let l = Oe(s, 9);
		l && (r[l.id] = c ? {
			x: t.x - o * .5,
			y: I(t.y - i * 1.5)
		} : {
			x: t.x - o * 2.6,
			y: I(t.y + i * 1.8)
		});
		let u = c ? 0 : -1.5;
		for (let [e, n, a] of [
			[
				10,
				10,
				9
			],
			[
				12,
				12,
				19
			],
			[
				13,
				13,
				28
			],
			[
				15,
				21,
				4
			]
		]) {
			let l = Oe(s, e);
			l && (r[l.id] = {
				x: t.x - o * (n + u),
				y: I(t.y + i * a * (c ? 1 : .85))
			});
		}
		for (let e of [11, 14]) {
			let n = Oe(s, e);
			n && (r[n.id] = {
				x: t.x - o * (c ? 15 : 13),
				y: e === 11 ? 6 : 64
			});
		}
	}
	return r;
}
function je(e, t, n, r, i) {
	let a = {}, o = t.y < 35 ? 0 : 70, s = o === 0 ? 1 : -1;
	for (let c of ["A", "B"]) {
		let l = M(c), u = De(e, c), d = c === n, f = Oe(u, 2), p = u.filter((e) => e.avant && e !== f), m = d && i ? _(i, p.map((e) => e.numero)) : void 0, h = m ? m.map((e) => p.find((t) => t.numero === e.numero)) : p.slice(0, Math.max(2, r)), g = p.filter((e) => !h.includes(e));
		f && (a[f.id] = d ? {
			x: t.x,
			y: o === 0 ? .7 : 69.3
		} : {
			x: t.x - l * 2.2,
			y: I(o + s * 3)
		}), h.forEach((e, n) => {
			e.role = "alignement", a[e.id] = {
				x: t.x - l * .44,
				y: I(o + s * (m?.[n].distance ?? 5 + n * 1.55))
			};
		}), g.forEach((e, n) => {
			e.role === "alignement" && (e.role = "ligne"), a[e.id] = {
				x: t.x - l * (d ? 9 : 11),
				y: I(o + s * (19 + n * 6))
			};
		});
		let v = Oe(u, 9);
		v && (a[v.id] = {
			x: t.x - l * (d ? 3 : 4),
			y: I(o + s * 8)
		});
		for (let [e, n, r] of [
			[
				10,
				12,
				17
			],
			[
				12,
				13.5,
				26
			],
			[
				13,
				15,
				35
			],
			[
				15,
				23,
				45
			]
		]) {
			let i = Oe(u, e);
			i && (a[i.id] = {
				x: t.x - l * (d ? n : Math.max(10.5, n - 2)),
				y: I(o + s * r)
			});
		}
		for (let e of [11, 14]) {
			let n = Oe(u, e);
			if (!n) continue;
			let r = e === 11 && o === 0 || e === 14 && o === 70;
			a[n.id] = r ? {
				x: t.x - l * (d ? 24 : 20),
				y: I(o + s * 13)
			} : {
				x: t.x - l * (d ? 16 : 12),
				y: e === 11 ? 6 : 64
			};
		}
	}
	return a;
}
function Me(e, t, n) {
	let r = {};
	for (let i of ["A", "B"]) {
		let a = M(i), o = i === n;
		De(e, i).filter((e) => e.avant && e.numero !== 9).sort((e, n) => (e.pos.x - t.x) ** 2 + (e.pos.y - t.y) ** 2 - ((n.pos.x - t.x) ** 2 + (n.pos.y - t.y) ** 2)).slice(0, o ? 3 : 2).forEach((e, n) => {
			e.role = "ruck", r[e.id] = {
				x: t.x - a * (.75 + Math.floor(n / 2) * .9),
				y: I(t.y + (n % 2 - .5) * 1.5)
			};
		});
	}
	let i = De(e, n).find((e) => e.numero === 9);
	if (i) {
		let e = M(n);
		r[i.id] = {
			x: t.x - e * 1.5,
			y: I(t.y - 1.1)
		};
	}
	return r;
}
function Ne(e, t, n, r) {
	let i = {};
	for (let a of ["A", "B"]) {
		let o = M(a), s = De(e, a);
		if (a === n) {
			let e = s.find((e) => e.numero === 10) ?? s[0], n = s.indexOf(e);
			s.forEach((a, s) => {
				if (a === e) {
					i[a.id] = {
						x: t - o * 1.2,
						y: 35
					};
					return;
				}
				let c = s - +(s > n);
				i[a.id] = {
					x: t - o * (1.5 + c % 3 * 1.6),
					y: I(r.y + (c - 6) * 4.6)
				};
			});
		} else for (let e of s) e.avant ? i[e.id] = {
			x: r.x - o * (e.numero % 3 * 3 - 3),
			y: I(r.y + (e.numero % 4 - 1.5) * 6)
		} : e.numero === 15 ? i[e.id] = {
			x: t - o * 34,
			y: 35
		} : e.numero === 11 || e.numero === 14 ? i[e.id] = {
			x: t - o * 26,
			y: e.numero === 11 ? 9 : 61
		} : i[e.id] = {
			x: r.x - o * 11,
			y: I(35 + (e.numero - 11.5) * 9)
		};
	}
	return i;
}
function Pe(e, t, n, r) {
	let i = {};
	for (let a of ["A", "B"]) {
		let o = M(a);
		De(e, a).forEach((e, s) => {
			if (a === n) {
				let n = r ? e.id === r : s === 0;
				i[e.id] = n ? {
					x: t.x,
					y: I(t.y)
				} : {
					x: t.x - o * (6 + s % 4 * 2.5),
					y: I(t.y + (s % 7 - 3) * 5)
				};
			} else {
				let t = a === "A" ? 9 : 113;
				i[e.id] = {
					x: t,
					y: I(35 + (s % 8 - 3.5) * 5.5)
				};
			}
		});
	}
	return i;
}
function Fe(e, t, n) {
	let r = {};
	for (let i of ["A", "B"]) {
		let a = M(i);
		De(e, i).forEach((e, o) => {
			r[e.id] = i === n ? {
				x: t - a * (.8 + o % 4 * 1.4),
				y: I(35 + (o % 8 - 3.5) * 6)
			} : {
				x: t - a * (11 + o % 5 * 4),
				y: I(35 + (o % 9 - 4) * 6.5)
			};
		});
	}
	return r;
}
function Ie(e, t, n) {
	return Ne(e, 61, t, n);
}
//#endregion
//#region src/lib/moteur/combinaisons.ts
function L(e, t, n) {
	return e.pions.find((e) => e.cote === t && e.numero === n && e.surLeTerrain && e.sanction <= 0);
}
function Le(e, t) {
	let n = e.possession, r = v(e.plansCombinaisons?.[n] ?? [], t, n === "A" ? e.ballon.x - 11 : 111 - e.ballon.x, M(n) === 1 ? e.ballon.y : 70 - e.ballon.y);
	if (!r) return;
	let i = r.variantes.filter((r) => L(e, n, t === "touche" ? r.sauteur : r.depart) && (t !== "touche" || L(e, n, 2)) && r.actions.every((t) => t.type !== "passe" || L(e, n, t.destinataire)));
	return i.length ? {
		...r,
		variantes: i
	} : void 0;
}
function Re(e, t) {
	e.combinaisonEnCours = void 0, e.combinaisonPreparee = void 0;
	let n = e.possession, r = M(n), i = Le(e, t);
	if (!i) return;
	let a = y(i, e.rng);
	if (e.combinaisonPreparee = {
		cote: n,
		plan: i,
		variante: a
	}, t === "touche" && e.conquete) {
		if (!L(e, n, 2)) {
			e.combinaisonPreparee = void 0;
			return;
		}
		let t = p(a.touche);
		e.combinaisonPreparee.origineConquete = { ...e.ballon }, e.placement = je(e.pions, e.ballon, n, t.alignes, a);
		for (let t of e.pions) {
			let n = e.placement[t.id];
			!n || !t.surLeTerrain || t.sanction > 0 || (t.pos = { ...n }, t.cible = { ...n }, delete t.corps, F(t));
		}
		let i = L(e, n, a.sauteur);
		e.conquete.combinaison = t.feinte ? "leurreDevant" : t.distance <= 7 ? "premierBloc" : t.distance >= 11 ? "fond" : "milieu", e.conquete.cibleId = i.id, m(a) ? (e.conquete.horsAlignement = !0, e.conquete.reception = h(e.ballon, a, r)) : (delete e.conquete.horsAlignement, delete e.conquete.reception);
	}
}
function ze(e, t, n) {
	let r = e.combinaisonPreparee;
	if (e.combinaisonPreparee = void 0, e.combinaisonEnCours = void 0, !r || r.cote !== e.possession) return !1;
	let i = n ?? L(e, r.cote, r.variante.depart);
	if (!i) return !1;
	let a = r.origineConquete ?? t, o = M(r.cote) === 1 ? a.y : 70 - a.y;
	return e.combinaisonEnCours = {
		...r,
		origine: { ...a },
		miroir: r.plan.couloir === "tous" && o > 35 ? -1 : 1,
		index: 0,
		depuis: e.sim,
		debut: e.sim,
		courses: {},
		etapes: l(r.variante.actions)
	}, e.lancement = {
		type: "large",
		chaine: [i, ...r.variante.actions.flatMap((t) => t.type === "passe" ? [L(e, r.cote, t.destinataire)] : [])],
		index: 0,
		libelle: `${r.plan.nom} · ${r.variante.nom}`
	}, e.porteur = i, !0;
}
function Be(e, t) {
	let n = M(e.cote);
	return {
		x: j(e.origine.x + n * t.x, 9, 113),
		y: j(e.origine.y + n * e.miroir * t.y, 1.5, 68.5)
	};
}
function Ve(e) {
	let t = e.combinaisonEnCours;
	if (!(!t || t.cote !== e.possession || e.phase !== "jeuCourant")) {
		He(e);
		for (let n of g(t.variante)) {
			let r = L(e, t.cote, n.numero);
			if (!r || r === e.porteur || e.vol?.receveur === r) continue;
			let i = Be(t, t.courses[r.numero] ?? n);
			if (!t.courses[r.numero]) {
				let n = M(t.cote);
				(i.x - e.ballon.x) * n > -.7 && (i.x = e.ballon.x - n * .7);
			}
			r.cible = i;
		}
		for (let [n, r] of Object.entries(t.courses)) {
			let i = L(e, t.cote, Number(n));
			i && i !== e.porteur && e.vol?.receveur !== i && (i.cible = Be(t, r));
		}
	}
}
function He(e) {
	let t = e.combinaisonEnCours;
	if (!(!t || t.cote !== e.possession || !(e.phase === "jeuCourant" || e.phase === "ballonEnLAir" && e.vol?.type === "passe"))) {
		if (e.phase === "jeuCourant") for (let { action: e } of t.etapes[t.index]?.actions ?? []) e.type === "leurre" && (t.courses[e.numero] = e.destination);
		for (let [n, r] of Object.entries(t.courses)) {
			let i = L(e, t.cote, Number(n));
			i && i !== e.porteur && i !== e.vol?.receveur && (i.cible = Be(t, r));
		}
	}
}
function Ue(e) {
	let t = e.combinaisonEnCours, n = t?.etapes[t.index]?.actions.find((e) => e.action.type === "course")?.action;
	return t && t.cote === e.porteur?.cote && n?.type === "course" ? Be(t, n.destination) : void 0;
}
//#endregion
//#region src/lib/moteur/etat.ts
var We = /* @__PURE__ */ new Set([
	"coupEnvoi",
	"renvoi22",
	"melee",
	"touche",
	"penalite",
	"tirAuBut",
	"transformation",
	"tmo",
	"apresEssai",
	"miTemps"
]);
function Ge() {
	return {
		provocations: 0,
		bagarres: 0,
		coupsPortes: 0,
		jaunes: 0,
		rouges: 0,
		motif: "",
		citation: null,
		blessure: null
	};
}
function Ke(e, t, n, r, i = 0, a = !1) {
	e.commentaires.push({
		seconde: Math.min(4800, Math.floor(e.t)),
		minute: Math.min(80, Math.floor(e.t / 60)),
		texte: r,
		type: t,
		cote: n,
		points: i,
		scoreA: e.scoreA,
		scoreB: e.scoreB,
		moi: a
	});
}
//#endregion
//#region src/data/commentairesMatch.ts
var qe = {
	en: {
		essai: ["TRY! {nom} grounds the ball {precision}!"],
		precision: [
			"in the corner",
			"under the posts",
			"after breaking two tackles"
		],
		transformation: ["Conversion by {nom}, straight through."],
		transformationRatee: ["{nom} misses the conversion."],
		penaliteBut: ["Penalty by {nom}, three more points from {distance} metres."],
		penaliteRatee: ["{nom} misses the penalty from {distance} metres."],
		drop: ["DROP GOAL BY {nom}! Three points."],
		penalite: ["Penalty to {club} : {motif}."],
		motif: [
			"offside",
			"high tackle",
			"not releasing",
			"tackler not rolling away",
			"side entry at the ruck",
			"scrum infringement",
			"obstruction",
			"punch",
			"mass brawl",
			"foul play",
			"punch spotted on the footage",
			"offside at the ruck",
			"support player diving into the ruck",
			"collapsed scrum",
			"collapsed maul",
			"tackle off the ball"
		],
		plaquage: ["Big tackle by {nom} on {cible}!"],
		franchissement: ["{nom} breaks the defensive line!"],
		grattage: ["Turnover by {nom}! Ball won on the ground."],
		enAvant: ["Knock-on by {nom}, scrum to {club}."],
		passeAvant: ["Forward pass by {nom}, scrum to {club}."],
		degagement: ["{nom} clears to touch and gains fifty metres."],
		occupation: ["{nom} kicks for territory."],
		chandelle: ["High ball from {nom}, the chase is on!"],
		cinquanteVingtDeux: ["50:22 by {nom}! Their lineout!"],
		cinquanteVingtDeuxRate: ["{nom} attempts the 50:22 but misses it."],
		rasant: ["Grubber kick from {nom} behind the defence!"],
		transversale: ["Cross-field kick from {nom} towards the wing!"],
		toucheGagnee: ["Clean lineout ball for {club}, taken by {nom}."],
		touchePerdue: ["Lineout lost! {club} win the ball."],
		meleeGagnee: ["Solid scrum from {club}, clean ball."],
		meleeDominee: ["Dominant scrum! {club} go forward and win the penalty."],
		maul: ["Driving maul from {club}, moving forward!"],
		maulEssai: ["TRY from the driving maul! {nom} grounds it."],
		carton: ["YELLOW CARD for {nom} : {motif}. {club} down to fourteen for ten minutes."],
		remplacement: ["{entrant} replaces {sortant} for {club}."],
		pickAndGo: ["Pick and go by {nom}, another metre gained."],
		percussion: ["{nom} carries hard through the middle."],
		ecartement: ["The ball goes wide… {nom} receives it!"],
		chambrage: [
			"Still standing, are you?",
			"We’re waiting.",
			"Is that it?",
			"Stay with us, it’s a long one.",
			"Have a look at the scoreboard.",
			"Planning on running today?",
			"Another hour of this.",
			"Easy now, grandad.",
			"Are you done?",
			"Back to the changing room."
		]
	},
	es: {
		essai: ["¡ENSAYO! ¡{nom} posa el balón {precision}!"],
		precision: [
			"en la esquina",
			"bajo palos",
			"tras romper dos placajes"
		],
		transformation: ["Transformación de {nom}, entre palos."],
		transformationRatee: ["{nom} falla la transformación."],
		penaliteBut: ["Golpe de castigo de {nom}: tres puntos desde {distance} metros."],
		penaliteRatee: ["{nom} falla el golpe desde {distance} metros."],
		drop: ["¡DROP DE {nom}! Tres puntos."],
		penalite: ["Golpe de castigo para {club}: {motif}."],
		motif: [
			"fuera de juego",
			"placaje alto",
			"balón retenido en el suelo",
			"el placador no se aparta",
			"entrada lateral al ruck",
			"falta técnica en melé",
			"obstrucción",
			"puñetazo",
			"tangana general",
			"juego sucio",
			"puñetazo detectado en las imágenes",
			"fuera de juego en el ruck",
			"apoyo que se lanza al ruck",
			"melé derrumbada",
			"maul derrumbado",
			"placaje sin balón"
		],
		plaquage: ["¡Gran placaje de {nom} sobre {cible}!"],
		franchissement: ["¡{nom} rompe la línea defensiva!"],
		grattage: ["¡Recuperación de {nom}! Balón ganado en el suelo."],
		enAvant: ["Avant de {nom}, melé para {club}."],
		passeAvant: ["Pase adelantado de {nom}, melé para {club}."],
		degagement: ["{nom} despeja a touche y gana cincuenta metros."],
		occupation: ["{nom} juega al pie para ocupar campo."],
		chandelle: ["¡Patada alta de {nom}, comienza la persecución!"],
		cinquanteVingtDeux: ["¡50:22 de {nom}! Touche para su equipo."],
		cinquanteVingtDeuxRate: ["{nom} intenta el 50:22, pero no lo encuentra."],
		rasant: ["¡Patada rasa de {nom} a la espalda de la defensa!"],
		transversale: ["¡Patada cruzada de {nom} hacia el ala!"],
		toucheGagnee: ["Touche limpia para {club}, recibe {nom}."],
		touchePerdue: ["¡Touche perdida! {club} recupera el balón."],
		meleeGagnee: ["Melé sólida de {club}, balón limpio."],
		meleeDominee: ["¡Melé dominante! {club} avanza y obtiene el golpe."],
		maul: ["Maul de {club}, ¡avanza!"],
		maulEssai: ["¡ENSAYO de maul! {nom} posa el balón."],
		carton: ["AMARILLA para {nom}: {motif}. {club} jugará con catorce diez minutos."],
		remplacement: ["{entrant} sustituye a {sortant} en {club}."],
		pickAndGo: ["Pick and go de {nom}, gana otro metro."],
		percussion: ["{nom} carga con fuerza por el centro."],
		ecartement: ["El balón llega al exterior… ¡recibe {nom}!"],
		chambrage: [
			"¿Todavía en pie?",
			"Te estamos esperando.",
			"¿Eso es todo?",
			"Aguanta, queda mucho.",
			"Mira el marcador.",
			"¿Piensas correr hoy?",
			"Una hora más así.",
			"Tranquilo, abuelo.",
			"¿Has terminado?",
			"Vuelve al vestuario."
		]
	},
	it: {
		essai: ["META! {nom} schiaccia {precision}!"],
		precision: [
			"all’angolo",
			"sotto i pali",
			"dopo aver rotto due placcaggi"
		],
		transformation: ["Trasformazione di {nom}, tra i pali."],
		transformationRatee: ["{nom} sbaglia la trasformazione."],
		penaliteBut: ["Calcio di punizione di {nom}: tre punti da {distance} metri."],
		penaliteRatee: ["{nom} sbaglia il calcio da {distance} metri."],
		drop: ["DROP DI {nom}! Tre punti."],
		penalite: ["Punizione per {club}: {motif}."],
		motif: [
			"fuorigioco",
			"placcaggio alto",
			"pallone trattenuto a terra",
			"placcatore che non si sposta",
			"ingresso laterale nel ruck",
			"fallo tecnico in mischia",
			"ostruzione",
			"pugno",
			"rissa generale",
			"gioco scorretto",
			"pugno individuato dalle immagini",
			"fuorigioco nel ruck",
			"sostegno che si tuffa nel ruck",
			"mischia crollata",
			"maul crollato",
			"placcaggio senza palla"
		],
		plaquage: ["Gran placcaggio di {nom} su {cible}!"],
		franchissement: ["{nom} rompe la linea difensiva!"],
		grattage: ["Pallone recuperato da {nom} a terra!"],
		enAvant: ["In avanti di {nom}, mischia per {club}."],
		passeAvant: ["Passaggio in avanti di {nom}, mischia per {club}."],
		degagement: ["{nom} libera in touche e guadagna cinquanta metri."],
		occupation: ["{nom} calcia per guadagnare territorio."],
		chandelle: ["Campanile di {nom}: parte la caccia!"],
		cinquanteVingtDeux: ["50:22 di {nom}! Rimessa per la sua squadra."],
		cinquanteVingtDeuxRate: ["{nom} tenta il 50:22 ma non lo trova."],
		rasant: ["Calcio rasoterra di {nom} dietro la difesa!"],
		transversale: ["Calcio incrociato di {nom} verso l’ala!"],
		toucheGagnee: ["Rimessa pulita per {club}, presa da {nom}."],
		touchePerdue: ["Rimessa persa! {club} recupera il pallone."],
		meleeGagnee: ["Mischia solida di {club}, pallone pulito."],
		meleeDominee: ["Mischia dominante! {club} avanza e ottiene la punizione."],
		maul: ["Maul di {club}, avanza!"],
		maulEssai: ["META da maul! {nom} schiaccia."],
		carton: ["GIALLO per {nom}: {motif}. {club} in quattordici per dieci minuti."],
		remplacement: ["{entrant} sostituisce {sortant} per {club}."],
		pickAndGo: ["Pick and go di {nom}, un altro metro."],
		percussion: ["{nom} carica con forza al centro."],
		ecartement: ["Il pallone va al largo… lo riceve {nom}!"],
		chambrage: [
			"Stai ancora in piedi?",
			"Ti stiamo aspettando.",
			"Tutto qui?",
			"Resta con noi, è lunga.",
			"Guarda il tabellone.",
			"Hai intenzione di correre oggi?",
			"Un’altra ora così.",
			"Piano, nonno.",
			"Hai finito?",
			"Torna negli spogliatoi."
		]
	},
	de: {
		essai: ["VERSUCH! {nom} legt den Ball {precision} ab!"],
		precision: [
			"in der Ecke",
			"unter den Stangen",
			"nach zwei gebrochenen Tackles"
		],
		transformation: ["Erhöhung durch {nom}, sicher verwandelt."],
		transformationRatee: ["{nom} verfehlt die Erhöhung."],
		penaliteBut: ["Straftritt von {nom}: drei Punkte aus {distance} Metern."],
		penaliteRatee: ["{nom} verfehlt den Straftritt aus {distance} Metern."],
		drop: ["DROP GOAL VON {nom}! Drei Punkte."],
		penalite: ["Straftritt für {club}: {motif}."],
		motif: [
			"Abseits",
			"hohes Tackle",
			"Ball am Boden nicht freigegeben",
			"Tackler rollt nicht weg",
			"seitlicher Eintritt ins Ruck",
			"technischer Fehler im Gedränge",
			"Behinderung",
			"Faustschlag",
			"Massenschlägerei",
			"unfaires Spiel",
			"auf dem Video entdeckter Faustschlag",
			"Abseits am Ruck",
			"Unterstützer springt ins Ruck",
			"eingestürztes Gedränge",
			"eingestürztes Maul",
			"Tackle ohne Ball"
		],
		plaquage: ["Hartes Tackle von {nom} gegen {cible}!"],
		franchissement: ["{nom} durchbricht die Verteidigungslinie!"],
		grattage: ["Turnover durch {nom}! Ball am Boden gewonnen."],
		enAvant: ["Vorwurf von {nom}, Gedränge für {club}."],
		passeAvant: ["Vorwärtspass von {nom}, Gedränge für {club}."],
		degagement: ["{nom} klärt ins Aus und gewinnt fünfzig Meter."],
		occupation: ["{nom} kickt auf Raumgewinn."],
		chandelle: ["Hoher Ball von {nom}, die Jagd beginnt!"],
		cinquanteVingtDeux: ["50:22 von {nom}! Eigene Gasse."],
		cinquanteVingtDeuxRate: ["{nom} versucht den 50:22, verfehlt ihn aber."],
		rasant: ["Flacher Kick von {nom} hinter die Abwehr!"],
		transversale: ["Crosskick von {nom} zum Flügel!"],
		toucheGagnee: ["Sauberer Gassenball für {club}, gefangen von {nom}."],
		touchePerdue: ["Gasse verloren! {club} gewinnt den Ball."],
		meleeGagnee: ["Stabiles Gedränge von {club}, sauberer Ball."],
		meleeDominee: ["Dominantes Gedränge! {club} geht vorwärts und erhält den Straftritt."],
		maul: ["Maul von {club}, es geht voran!"],
		maulEssai: ["VERSUCH aus dem Maul! {nom} legt ab."],
		carton: ["GELBE KARTE für {nom}: {motif}. {club} zehn Minuten zu vierzehnt."],
		remplacement: ["{entrant} ersetzt {sortant} bei {club}."],
		pickAndGo: ["Pick and Go von {nom}, noch ein Meter."],
		percussion: ["{nom} trägt hart durch die Mitte."],
		ecartement: ["Der Ball geht nach außen… {nom} bekommt ihn!"],
		chambrage: [
			"Stehst du noch?",
			"Wir warten.",
			"Das war’s?",
			"Bleib dran, es dauert.",
			"Schau auf die Anzeigetafel.",
			"Willst du heute noch laufen?",
			"Noch eine Stunde davon.",
			"Ruhig, Opa.",
			"Bist du fertig?",
			"Ab in die Kabine."
		]
	},
	pt: {
		essai: ["ENSAIO! {nom} apoia a bola {precision}!"],
		precision: [
			"no canto",
			"debaixo dos postes",
			"depois de quebrar duas placagens"
		],
		transformation: ["Transformação de {nom}, entre os postes."],
		transformationRatee: ["{nom} falha a transformação."],
		penaliteBut: ["Penalidade de {nom}: três pontos de {distance} metros."],
		penaliteRatee: ["{nom} falha a penalidade de {distance} metros."],
		drop: ["DROP DE {nom}! Três pontos."],
		penalite: ["Penalidade para {club}: {motif}."],
		motif: [
			"fora de jogo",
			"placagem alta",
			"bola retida no chão",
			"placador não se afasta",
			"entrada lateral no ruck",
			"falta técnica na formação ordenada",
			"obstrução",
			"murro",
			"rixa geral",
			"jogo desleal",
			"murro detetado nas imagens",
			"fora de jogo no ruck",
			"apoio mergulha no ruck",
			"formação ordenada colapsada",
			"maul colapsado",
			"placagem sem bola"
		],
		plaquage: ["Grande placagem de {nom} sobre {cible}!"],
		franchissement: ["{nom} quebra a linha defensiva!"],
		grattage: ["Recuperação de {nom}! Bola ganha no chão."],
		enAvant: ["Avanço de {nom}, formação ordenada para {club}."],
		passeAvant: ["Passe para a frente de {nom}, formação ordenada para {club}."],
		degagement: ["{nom} alivia para fora e ganha cinquenta metros."],
		occupation: ["{nom} chuta para ganhar território."],
		chandelle: ["Bola alta de {nom}, começa a perseguição!"],
		cinquanteVingtDeux: ["50:22 de {nom}! Lançamento para a sua equipa."],
		cinquanteVingtDeuxRate: ["{nom} tenta o 50:22, mas falha."],
		rasant: ["Pontapé rasteiro de {nom} atrás da defesa!"],
		transversale: ["Pontapé cruzado de {nom} para a ponta!"],
		toucheGagnee: ["Lançamento limpo para {club}, recebido por {nom}."],
		touchePerdue: ["Lançamento perdido! {club} recupera a bola."],
		meleeGagnee: ["Formação ordenada sólida de {club}, bola limpa."],
		meleeDominee: ["Formação dominante! {club} avança e ganha a penalidade."],
		maul: ["Maul de {club}, está a avançar!"],
		maulEssai: ["ENSAIO de maul! {nom} apoia a bola."],
		carton: ["AMARELO para {nom}: {motif}. {club} com catorze durante dez minutos."],
		remplacement: ["{entrant} substitui {sortant} em {club}."],
		pickAndGo: ["Pick and go de {nom}, mais um metro."],
		percussion: ["{nom} carrega com força pelo centro."],
		ecartement: ["A bola vai para fora… {nom} recebe!"],
		chambrage: [
			"Ainda de pé?",
			"Estamos à tua espera.",
			"É só isso?",
			"Aguenta, ainda é longo.",
			"Olha para o marcador.",
			"Pensas correr hoje?",
			"Mais uma hora assim.",
			"Calma, avô.",
			"Já acabaste?",
			"Volta ao balneário."
		]
	},
	ja: {
		essai: ["トライ！{nom}が{precision}グラウンディング！"],
		precision: [
			"コーナーで",
			"ポスト下で",
			"2つのタックルを破って"
		],
		transformation: ["{nom}のコンバージョン成功。"],
		transformationRatee: ["{nom}のコンバージョンは失敗。"],
		penaliteBut: ["{nom}が{distance}メートルからペナルティゴール成功。3点。"],
		penaliteRatee: ["{nom}が{distance}メートルからのペナルティを外す。"],
		drop: ["{nom}のドロップゴール！3点。"],
		penalite: ["{club}にペナルティ。理由：{motif}。"],
		motif: [
			"オフサイド",
			"ハイタックル",
			"ノットリリース",
			"タックラーが退かない",
			"ラックへの横入り",
			"スクラムでの反則",
			"オブストラクション",
			"パンチ",
			"乱闘",
			"ラフプレー",
			"映像で確認されたパンチ",
			"ラックでのオフサイド",
			"サポート選手のラックへの飛び込み",
			"スクラム崩壊",
			"モール崩壊",
			"ノーボールタックル"
		],
		plaquage: ["{nom}が{cible}へ強烈なタックル！"],
		franchissement: ["{nom}がディフェンスラインを突破！"],
		grattage: ["{nom}がジャッカル成功！ボールを奪う。"],
		enAvant: ["{nom}がノックオン。{club}のスクラム。"],
		passeAvant: ["{nom}のパスが前に。{club}のスクラム。"],
		degagement: ["{nom}がタッチへ蹴り出し、50メートル前進。"],
		occupation: ["{nom}がエリアを取るキック。"],
		chandelle: ["{nom}のハイパント。チェイスが始まる！"],
		cinquanteVingtDeux: ["{nom}の50:22！自チームボールのラインアウト。"],
		cinquanteVingtDeuxRate: ["{nom}が50:22を狙うが失敗。"],
		rasant: ["{nom}が守備の裏へグラバーキック！"],
		transversale: ["{nom}がウイングへクロスキック！"],
		toucheGagnee: ["{club}がラインアウトを確保。{nom}がキャッチ。"],
		touchePerdue: ["ラインアウトを失う！{club}がボールを獲得。"],
		meleeGagnee: ["{club}の安定したスクラム。クリーンボール。"],
		meleeDominee: ["スクラムを圧倒！{club}が前進してペナルティ獲得。"],
		maul: ["{club}のモールが前進！"],
		maulEssai: ["モールからトライ！{nom}がグラウンディング。"],
		carton: ["{nom}にイエローカード：{motif}。{club}は10分間14人。"],
		remplacement: ["{club}、{sortant}に代わって{entrant}。"],
		pickAndGo: ["{nom}のピック・アンド・ゴー。さらに1メートル。"],
		percussion: ["{nom}が中央を力強くキャリー。"],
		ecartement: ["ボールが外へ…{nom}が受ける！"],
		chambrage: [
			"まだ立ってるのか？",
			"待ってるぞ。",
			"それだけか？",
			"長いぞ、ついてこい。",
			"スコアボードを見ろ。",
			"今日は走る気あるのか？",
			"あと一時間これが続く。",
			"落ち着けよ、じいさん。",
			"終わったか？",
			"ロッカーに戻れ。"
		]
	}
}, Je = {
	fr: {
		coupEnvoiMatch: "Coup d’envoi ! {clubA} reçoit {clubB}.",
		sirenePremiere: "🔔 La sirène retentit. On joue jusqu’à la sortie du ballon.",
		sireneFinale: "🔔 Sirène ! Le temps est écoulé : ballon mort et c’est terminé.",
		coupEnvoiJoueur: "{nom} donne le coup d’envoi.",
		renvoi22Joueur: "Renvoi aux 22 de {nom}.",
		toucheASuivre: "Touche à suivre pour {club}.",
		toucheDirecte: "{nom} trouve la touche directement : pas de gain de terrain.",
		ballonEnBut: "Ballon dans l’en-but, renvoi aux 22.",
		ballonAerien: "{nom} récupère le ballon dans les airs !",
		pousseTouche: "{nom} est poussé en touche.",
		cassePlaquage: "{porteur} se dégage du plaquage de {defenseur} !",
		offload: "Offload de {porteur} pour {receveur} !",
		cartonRouge: "🟥 CARTON ROUGE pour {nom} ({motif}) : {club} finit à quatorze.",
		penaltouche: "{nom} trouve la touche à {distance} mètres de la ligne.",
		penaliteRapide: "Pénalité jouée vite par {club}.",
		tenuEnBut: "{nom} est tenu dans l’en-but ! Renvoi aux 22 pour {club}.",
		dropRate: "Drop manqué de {nom}.",
		miTempsScore: "Mi-temps : {clubA} {scoreA} : {scoreB} {clubB}",
		coupSiffletFinal: "Coup de sifflet final : {clubA} {scoreA} : {scoreB} {clubB}.",
		deuxiemeMiTemps: "Deuxième mi-temps !",
		essaiTransformeFin: "Essai transformé de {nom} dans les arrêts de jeu !",
		essaiFin: "Essai de {nom} au bout du temps additionnel !",
		penaliteFin: "Pénalité de {nom} à la dernière seconde.",
		consigne: "📣 Consigne : « {libelle} »",
		changementDePlan: "📋 {club} change son plan de jeu.",
		actionSprint: "{nom} met un coup d’accélérateur !",
		crochetReussi: "Crochet de {nom} ! {cible} plaque dans le vide.",
		crochetRate: "{nom} tente le crochet, {cible} ne se laisse pas prendre.",
		raffutReussi: "Raffut de {nom} ! Il traverse le plaquage.",
		appelBallon: "{nom} réclame le ballon à la voix.",
		plaquageLance: "{nom} se lance sur {cible} !",
		plaquageRateJoueur: "{nom} se manque, {cible} file dans son dos.",
		grattagePlonge: "{nom} plonge sur le ballon au sol…",
		provocation: "{nom} chambre {cible}. Le ton monte.",
		provocationIgnoree: "{cible} ne relève même pas la tête.",
		bagarreDebut: "💢 Ça dégénère : {nom} et {cible} en viennent aux mains.",
		bagarreGenerale: "Les deux packs s’en mêlent, l’arbitre est débordé.",
		bagarreSeparee: "{nom} sépare tout le monde et fait reculer les siens.",
		bagarreRecul: "{nom} lève les mains et s’écarte du groupe.",
		coupPorte: "{nom} envoie un coup de poing à {cible} !",
		arbitreVideo: "L’arbitre demande les images. Tout le monde attend.",
		choixArme: "{nom} joue son geste.",
		choixTropTard: "Trop tard, l’action est passée.",
		duelContactKo: "{cible} stoppe {nom} net.",
		duelGrattageKo: "{nom} n’arrive pas à s’emparer du ballon.",
		duelPasseOk: "{nom} donne proprement à {cible}.",
		duelPasseKo: "La passe de {nom} part au sol.",
		duelPiedContre: "Le coup de pied de {nom} est CONTRÉ par {cible} !",
		duelAppelKo: "{nom} appelle le ballon, personne ne le voit.",
		duel5022Rate: "La touche est ratée : le ballon reste en jeu.",
		duelChenilleOk: "{nom} protège la sortie derrière son paquet.",
		duelChenilleKo: "La chenille de {nom} s’écroule.",
		duelPercussionOk: "{nom} rentre dedans et avance.",
		duelOffloadKo: "{nom} force l’offload, le ballon est au sol.",
		echappee: "{nom} est dans l’espace, plus personne devant !",
		duelPerceeKo: "L’intervalle se referme sur {nom}.",
		duelChipOk: "{nom} pique par-dessus et reprend son coup de pied !",
		duelChipKo: "Le coup de pied de {nom} file trop loin, ballon rendu.",
		duelPlongeonKo: "{nom} plonge, mais il est tenu à un mètre.",
		duelInterceptionOk: "Interception de {nom} ! Il part seul !",
		duelInterceptionKo: "{nom} sort de sa ligne et ne touche rien.",
		duelContreRuckOk: "Contre-poussée de {nom}, le ballon change de camp !",
		duelContreRuckKo: "La contre-poussée de {nom} ne passe pas."
	},
	en: {
		coupEnvoiMatch: "Kick-off! {clubA} host {clubB}.",
		sirenePremiere: "🔔 The siren sounds. Play continues until the ball is dead.",
		sireneFinale: "🔔 Final siren! Time is up; the next dead ball ends the match.",
		coupEnvoiJoueur: "{nom} takes the kick-off.",
		renvoi22Joueur: "22-metre drop-out by {nom}.",
		toucheASuivre: "Lineout to {club}.",
		toucheDirecte: "{nom} kicks directly into touch: no territorial gain.",
		ballonEnBut: "Ball into in-goal, 22-metre drop-out.",
		ballonAerien: "{nom} wins the ball in the air!",
		pousseTouche: "{nom} is driven into touch.",
		cassePlaquage: "{porteur} breaks out of {defenseur}’s tackle!",
		offload: "{porteur} offloads to {receveur}!",
		cartonRouge: "🟥 RED CARD for {nom} ({motif}) : {club} finish with fourteen.",
		penaltouche: "{nom} finds touch {distance} metres from the line.",
		penaliteRapide: "Quick tap penalty by {club}.",
		tenuEnBut: "{nom} is held up! 22-metre drop-out to {club}.",
		dropRate: "{nom} misses the drop goal.",
		miTempsScore: "Half-time: {clubA} {scoreA} : {scoreB} {clubB}",
		coupSiffletFinal: "Full-time : {clubA} {scoreA} : {scoreB} {clubB}.",
		deuxiemeMiTemps: "Second half!",
		essaiTransformeFin: "Converted try by {nom} in added time!",
		essaiFin: "Try by {nom} at the end of added time!",
		penaliteFin: "Last-second penalty by {nom}.",
		consigne: "📣 Instruction: “{libelle}”",
		changementDePlan: "📋 {club} change their game plan.",
		actionSprint: "{nom} kicks on the afterburners!",
		crochetReussi: "Sidestep from {nom}! {cible} tackles thin air.",
		crochetRate: "{nom} goes for the step, {cible} is not fooled.",
		raffutReussi: "Hand-off from {nom}! He powers through the tackle.",
		appelBallon: "{nom} calls loudly for the ball.",
		plaquageLance: "{nom} launches himself at {cible}!",
		plaquageRateJoueur: "{nom} misses, {cible} slips through behind him.",
		grattagePlonge: "{nom} goes over the ball on the ground…",
		provocation: "{nom} gets in {cible}’s face. The temperature rises.",
		provocationIgnoree: "{cible} does not even look up.",
		bagarreDebut: "💢 It boils over: {nom} and {cible} start throwing punches.",
		bagarreGenerale: "Both packs pile in, the referee is overwhelmed.",
		bagarreSeparee: "{nom} pulls everyone apart and drags his team away.",
		bagarreRecul: "{nom} raises his hands and steps away.",
		coupPorte: "{nom} throws a punch at {cible}!",
		arbitreVideo: "The referee goes to the screen. Everyone waits.",
		choixArme: "{nom} goes for it.",
		choixTropTard: "Too late, the moment is gone.",
		duelContactKo: "{cible} stops {nom} dead.",
		duelGrattageKo: "{nom} cannot get his hands on the ball.",
		duelPasseOk: "{nom} passes cleanly to {cible}.",
		duelPasseKo: "{nom}’s pass goes to ground.",
		duelPiedContre: "{nom}’s kick is CHARGED DOWN by {cible}!",
		duelAppelKo: "{nom} calls for the ball, nobody sees him.",
		duel5022Rate: "The kick misses touch: the ball stays in play.",
		duelChenilleOk: "{nom} shields the ball behind his pack.",
		duelChenilleKo: "{nom}’s caterpillar collapses.",
		duelPercussionOk: "{nom} carries hard and makes ground.",
		duelOffloadKo: "{nom} forces the offload and spills it.",
		echappee: "{nom} is in the clear, nobody in front!",
		duelPerceeKo: "The gap shuts on {nom}.",
		duelChipOk: "{nom} chips over and regathers his own kick!",
		duelChipKo: "{nom}’s kick runs away, possession handed back.",
		duelPlongeonKo: "{nom} dives, but he is held a metre short.",
		duelInterceptionOk: "Intercepted by {nom}! He is away!",
		duelInterceptionKo: "{nom} jumps out of the line and gets nothing.",
		duelContreRuckOk: "Counter-ruck from {nom}, the ball turns over!",
		duelContreRuckKo: "{nom}’s counter-ruck does not get through."
	},
	es: {
		coupEnvoiMatch: "¡Saque inicial! {clubA} recibe a {clubB}.",
		sirenePremiere: "🔔 Suena la sirena. Se juega hasta que el balón quede muerto.",
		sireneFinale: "🔔 ¡Sirena final! El siguiente balón muerto termina el partido.",
		coupEnvoiJoueur: "{nom} realiza el saque inicial.",
		renvoi22Joueur: "Saque de 22 de {nom}.",
		toucheASuivre: "Touche para {club}.",
		toucheDirecte: "{nom} manda el balón directamente a touche: sin ganancia territorial.",
		ballonEnBut: "Balón en la zona de marca, saque de 22.",
		ballonAerien: "¡{nom} gana el balón por alto!",
		pousseTouche: "{nom} es empujado a touche.",
		cassePlaquage: "¡{porteur} rompe el placaje de {defenseur}!",
		offload: "¡Offload de {porteur} para {receveur}!",
		cartonRouge: "🟥 ROJA para {nom} ({motif}): {club} termina con catorce.",
		penaltouche: "{nom} encuentra la touche a {distance} metros de la línea.",
		penaliteRapide: "Golpe jugado rápido por {club}.",
		tenuEnBut: "¡{nom} queda retenido en la zona de marca! Saque de 22 para {club}.",
		dropRate: "{nom} falla el drop.",
		miTempsScore: "Descanso: {clubA} {scoreA} : {scoreB} {clubB}",
		coupSiffletFinal: "Final : {clubA} {scoreA} : {scoreB} {clubB}.",
		deuxiemeMiTemps: "¡Segunda parte!",
		essaiTransformeFin: "¡Ensayo transformado de {nom} en el tiempo añadido!",
		essaiFin: "¡Ensayo de {nom} al final del tiempo añadido!",
		penaliteFin: "Golpe de {nom} en el último segundo.",
		consigne: "📣 Instrucción: «{libelle}»",
		changementDePlan: "📋 {club} cambia su plan de juego.",
		actionSprint: "¡{nom} mete un acelerón!",
		crochetReussi: "¡Quiebro de {nom}! {cible} placa el aire.",
		crochetRate: "{nom} intenta el quiebro, {cible} no se deja engañar.",
		raffutReussi: "¡Palanca de {nom}! Atraviesa el placaje.",
		appelBallon: "{nom} pide el balón a gritos.",
		plaquageLance: "¡{nom} se lanza sobre {cible}!",
		plaquageRateJoueur: "{nom} falla y {cible} se escapa por su espalda.",
		grattagePlonge: "{nom} se lanza sobre el balón en el suelo…",
		provocation: "{nom} se encara con {cible}. Sube la temperatura.",
		provocationIgnoree: "{cible} ni siquiera levanta la cabeza.",
		bagarreDebut: "💢 Se desmadra: {nom} y {cible} llegan a las manos.",
		bagarreGenerale: "Los dos paquetes se meten, el árbitro está desbordado.",
		bagarreSeparee: "{nom} separa a todos y aleja a los suyos.",
		bagarreRecul: "{nom} levanta las manos y se aparta.",
		coupPorte: "¡{nom} le suelta un puñetazo a {cible}!",
		arbitreVideo: "El árbitro pide las imágenes. Todos esperan.",
		choixArme: "{nom} se lanza a por ello.",
		choixTropTard: "Demasiado tarde, la acción ya pasó.",
		duelContactKo: "{cible} para a {nom} en seco.",
		duelGrattageKo: "{nom} no logra hacerse con el balón.",
		duelPasseOk: "{nom} pasa limpio a {cible}.",
		duelPasseKo: "El pase de {nom} se va al suelo.",
		duelPiedContre: "¡La patada de {nom} es BLOQUEADA por {cible}!",
		duelAppelKo: "{nom} pide el balón, nadie lo ve.",
		duel5022Rate: "Falla el toque: el balón sigue en juego.",
		duelChenilleOk: "{nom} protege la salida detrás de su paquete.",
		duelChenilleKo: "La oruga de {nom} se derrumba.",
		duelPercussionOk: "{nom} entra fuerte y gana terreno.",
		duelOffloadKo: "{nom} fuerza el offload y se le cae.",
		echappee: "¡{nom} está en el espacio, nadie por delante!",
		duelPerceeKo: "El hueco se cierra sobre {nom}.",
		duelChipOk: "¡{nom} pica por encima y recupera su propia patada!",
		duelChipKo: "La patada de {nom} se va larga, balón devuelto.",
		duelPlongeonKo: "{nom} se lanza, pero lo sujetan a un metro.",
		duelInterceptionOk: "¡Intercepción de {nom}! ¡Se va solo!",
		duelInterceptionKo: "{nom} sale de su línea y no toca nada.",
		duelContreRuckOk: "¡Contra-ruck de {nom}, el balón cambia de bando!",
		duelContreRuckKo: "El contra-ruck de {nom} no pasa."
	},
	it: {
		coupEnvoiMatch: "Calcio d’inizio! {clubA} ospita {clubB}.",
		sirenePremiere: "🔔 Suona la sirena. Si gioca fino al pallone morto.",
		sireneFinale: "🔔 Sirena finale! Il prossimo pallone morto chiude la partita.",
		coupEnvoiJoueur: "{nom} dà il calcio d’inizio.",
		renvoi22Joueur: "Rinvio dai 22 di {nom}.",
		toucheASuivre: "Rimessa per {club}.",
		toucheDirecte: "{nom} calcia direttamente in touche: nessun guadagno territoriale.",
		ballonEnBut: "Pallone in area di meta, rinvio dai 22.",
		ballonAerien: "{nom} conquista il pallone in aria!",
		pousseTouche: "{nom} viene spinto in touche.",
		cassePlaquage: "{porteur} rompe il placcaggio di {defenseur}!",
		offload: "Offload di {porteur} per {receveur}!",
		cartonRouge: "🟥 ROSSO per {nom} ({motif}): {club} chiude in quattordici.",
		penaltouche: "{nom} trova la touche a {distance} metri dalla linea.",
		penaliteRapide: "Punizione giocata rapidamente da {club}.",
		tenuEnBut: "{nom} è tenuto alto in meta! Rinvio dai 22 per {club}.",
		dropRate: "{nom} sbaglia il drop.",
		miTempsScore: "Intervallo: {clubA} {scoreA} : {scoreB} {clubB}",
		coupSiffletFinal: "Finale : {clubA} {scoreA} : {scoreB} {clubB}.",
		deuxiemeMiTemps: "Secondo tempo!",
		essaiTransformeFin: "Meta trasformata di {nom} nel recupero!",
		essaiFin: "Meta di {nom} alla fine del recupero!",
		penaliteFin: "Punizione di {nom} all’ultimo secondo.",
		consigne: "📣 Indicazione: «{libelle}»",
		changementDePlan: "📋 {club} cambia il proprio piano di gioco.",
		actionSprint: "{nom} dà un’accelerata!",
		crochetReussi: "Finta di {nom}! {cible} placca il vuoto.",
		crochetRate: "{nom} prova la finta, {cible} non ci casca.",
		raffutReussi: "Puntello di {nom}! Attraversa il placcaggio.",
		appelBallon: "{nom} chiama il pallone a gran voce.",
		plaquageLance: "{nom} si lancia su {cible}!",
		plaquageRateJoueur: "{nom} sbaglia, {cible} scappa alle sue spalle.",
		grattagePlonge: "{nom} si tuffa sul pallone a terra…",
		provocation: "{nom} provoca {cible}. La tensione sale.",
		provocationIgnoree: "{cible} non alza nemmeno la testa.",
		bagarreDebut: "💢 Degenera: {nom} e {cible} vengono alle mani.",
		bagarreGenerale: "I due pacchetti si scontrano, l’arbitro è travolto.",
		bagarreSeparee: "{nom} divide tutti e allontana i suoi.",
		bagarreRecul: "{nom} alza le mani e si scosta.",
		coupPorte: "{nom} tira un pugno a {cible}!",
		arbitreVideo: "L’arbitro chiede le immagini. Tutti aspettano.",
		choixArme: "{nom} tenta la giocata.",
		choixTropTard: "Troppo tardi, l’azione è passata.",
		duelContactKo: "{cible} ferma {nom} di netto.",
		duelGrattageKo: "{nom} non riesce a impossessarsi del pallone.",
		duelPasseOk: "{nom} serve pulito {cible}.",
		duelPasseKo: "Il passaggio di {nom} finisce a terra.",
		duelPiedContre: "Il calcio di {nom} è MURATO da {cible}!",
		duelAppelKo: "{nom} chiama il pallone, nessuno lo vede.",
		duel5022Rate: "Il calcio manca la touche: la palla resta in gioco.",
		duelChenilleOk: "{nom} protegge l’uscita dietro il suo pacchetto.",
		duelChenilleKo: "Il bruco di {nom} crolla.",
		duelPercussionOk: "{nom} entra duro e guadagna terreno.",
		duelOffloadKo: "{nom} forza l’offload e perde la palla.",
		echappee: "{nom} è nello spazio, non c’è più nessuno!",
		duelPerceeKo: "Il varco si chiude su {nom}.",
		duelChipOk: "{nom} scavalca e riprende il proprio calcio!",
		duelChipKo: "Il calcio di {nom} scappa via, palla restituita.",
		duelPlongeonKo: "{nom} si tuffa, ma è tenuto a un metro.",
		duelInterceptionOk: "Intercetto di {nom}! Va via da solo!",
		duelInterceptionKo: "{nom} esce dalla linea e non tocca nulla.",
		duelContreRuckOk: "Contro-ruck di {nom}, la palla cambia squadra!",
		duelContreRuckKo: "Il contro-ruck di {nom} non passa."
	},
	de: {
		coupEnvoiMatch: "Ankick! {clubA} empfängt {clubB}.",
		sirenePremiere: "🔔 Die Sirene ertönt. Gespielt wird bis zum nächsten toten Ball.",
		sireneFinale: "🔔 Schlusssirene! Der nächste tote Ball beendet das Spiel.",
		coupEnvoiJoueur: "{nom} führt den Ankick aus.",
		renvoi22Joueur: "22-Meter-Abkick von {nom}.",
		toucheASuivre: "Gasse für {club}.",
		toucheDirecte: "{nom} kickt direkt ins Aus: kein Raumgewinn.",
		ballonEnBut: "Ball im Malfeld, 22-Meter-Abkick.",
		ballonAerien: "{nom} gewinnt den Ball in der Luft!",
		pousseTouche: "{nom} wird ins Aus gedrängt.",
		cassePlaquage: "{porteur} löst sich aus dem Tackle von {defenseur}!",
		offload: "Offload von {porteur} zu {receveur}!",
		cartonRouge: "🟥 ROTE KARTE für {nom} ({motif}) : {club} beendet das Spiel zu vierzehnt.",
		penaltouche: "{nom} findet das Aus {distance} Meter vor der Linie.",
		penaliteRapide: "Schneller Straftritt von {club}.",
		tenuEnBut: "{nom} wird im Malfeld hochgehalten! 22-Meter-Abkick für {club}.",
		dropRate: "{nom} verfehlt das Dropgoal.",
		miTempsScore: "Halbzeit: {clubA} {scoreA} : {scoreB} {clubB}",
		coupSiffletFinal: "Schlusspfiff : {clubA} {scoreA} : {scoreB} {clubB}.",
		deuxiemeMiTemps: "Zweite Halbzeit!",
		essaiTransformeFin: "Erhöhter Versuch von {nom} in der Nachspielzeit!",
		essaiFin: "Versuch von {nom} am Ende der Nachspielzeit!",
		penaliteFin: "Straftritt von {nom} in letzter Sekunde.",
		consigne: "📣 Anweisung: „{libelle}“",
		changementDePlan: "📋 {club} ändert den Spielplan.",
		actionSprint: "{nom} zieht das Tempo an!",
		crochetReussi: "Haken von {nom}! {cible} tackelt ins Leere.",
		crochetRate: "{nom} versucht den Haken, {cible} fällt nicht darauf herein.",
		raffutReussi: "Abwehrstoß von {nom}! Er bricht durch das Tackling.",
		appelBallon: "{nom} fordert den Ball lautstark.",
		plaquageLance: "{nom} wirft sich auf {cible}!",
		plaquageRateJoueur: "{nom} verfehlt ihn, {cible} entwischt in seinem Rücken.",
		grattagePlonge: "{nom} greift den Ball am Boden an …",
		provocation: "{nom} stichelt gegen {cible}. Die Stimmung kippt.",
		provocationIgnoree: "{cible} schaut nicht einmal auf.",
		bagarreDebut: "💢 Es eskaliert: {nom} und {cible} gehen aufeinander los.",
		bagarreGenerale: "Beide Packs mischen mit, der Schiedsrichter ist überfordert.",
		bagarreSeparee: "{nom} trennt alle und zieht seine Leute zurück.",
		bagarreRecul: "{nom} hebt die Hände und geht weg.",
		coupPorte: "{nom} schlägt {cible} mit der Faust!",
		arbitreVideo: "Der Schiedsrichter geht an den Bildschirm. Alle warten.",
		choixArme: "{nom} zieht es durch.",
		choixTropTard: "Zu spät, die Aktion ist vorbei.",
		duelContactKo: "{cible} stoppt {nom} eiskalt.",
		duelGrattageKo: "{nom} bekommt den Ball nicht zu fassen.",
		duelPasseOk: "{nom} spielt sauber zu {cible}.",
		duelPasseKo: "Der Pass von {nom} landet am Boden.",
		duelPiedContre: "Der Kick von {nom} wird von {cible} GEBLOCKT!",
		duelAppelKo: "{nom} fordert den Ball, niemand sieht ihn.",
		duel5022Rate: "Der Kick verfehlt die Seitenlinie: der Ball bleibt im Spiel.",
		duelChenilleOk: "{nom} schirmt den Ball hinter seinem Pack ab.",
		duelChenilleKo: "Die Raupe von {nom} bricht zusammen.",
		duelPercussionOk: "{nom} geht hart rein und gewinnt Meter.",
		duelOffloadKo: "{nom} erzwingt den Offload und verliert ihn.",
		echappee: "{nom} ist durch, niemand mehr davor!",
		duelPerceeKo: "Die Lücke schließt sich um {nom}.",
		duelChipOk: "{nom} hebt ihn drüber und nimmt seinen eigenen Kick auf!",
		duelChipKo: "Der Kick von {nom} läuft zu weit, Ball zurückgegeben.",
		duelPlongeonKo: "{nom} hechtet, wird aber einen Meter davor gehalten.",
		duelInterceptionOk: "Abgefangen von {nom}! Er ist durch!",
		duelInterceptionKo: "{nom} bricht aus der Kette und trifft nichts.",
		duelContreRuckOk: "Konter-Ruck von {nom}, der Ball wechselt die Seite!",
		duelContreRuckKo: "Der Konter-Ruck von {nom} kommt nicht durch."
	},
	pt: {
		coupEnvoiMatch: "Pontapé de saída! {clubA} recebe {clubB}.",
		sirenePremiere: "🔔 Soa a sirene. Joga-se até a bola ficar morta.",
		sireneFinale: "🔔 Sirene final! A próxima bola morta termina o jogo.",
		coupEnvoiJoueur: "{nom} dá o pontapé de saída.",
		renvoi22Joueur: "Pontapé de 22 de {nom}.",
		toucheASuivre: "Lançamento para {club}.",
		toucheDirecte: "{nom} chuta diretamente para fora: sem ganho territorial.",
		ballonEnBut: "Bola na área de ensaio, pontapé de 22.",
		ballonAerien: "{nom} conquista a bola no ar!",
		pousseTouche: "{nom} é empurrado para fora.",
		cassePlaquage: "{porteur} liberta-se da placagem de {defenseur}!",
		offload: "Offload de {porteur} para {receveur}!",
		cartonRouge: "🟥 VERMELHO para {nom} ({motif}) : {club} termina com catorze.",
		penaltouche: "{nom} encontra a linha lateral a {distance} metros da linha.",
		penaliteRapide: "Penalidade jogada rapidamente por {club}.",
		tenuEnBut: "{nom} é travado na área de ensaio! Pontapé de 22 para {club}.",
		dropRate: "{nom} falha o drop.",
		miTempsScore: "Intervalo: {clubA} {scoreA} : {scoreB} {clubB}",
		coupSiffletFinal: "Final : {clubA} {scoreA} : {scoreB} {clubB}.",
		deuxiemeMiTemps: "Segunda parte!",
		essaiTransformeFin: "Ensaio transformado de {nom} nos descontos!",
		essaiFin: "Ensaio de {nom} no fim dos descontos!",
		penaliteFin: "Penalidade de {nom} no último segundo.",
		consigne: "📣 Instrução: «{libelle}»",
		changementDePlan: "📋 {club} muda o seu plano de jogo.",
		actionSprint: "{nom} dá uma acelerada!",
		crochetReussi: "Finta de {nom}! {cible} placa o vazio.",
		crochetRate: "{nom} tenta a finta, {cible} não se deixa enganar.",
		raffutReussi: "Afastamento de {nom}! Atravessa a placagem.",
		appelBallon: "{nom} pede a bola em voz alta.",
		plaquageLance: "{nom} atira-se a {cible}!",
		plaquageRateJoueur: "{nom} falha e {cible} escapa-se pelas costas.",
		grattagePlonge: "{nom} mergulha sobre a bola no chão…",
		provocation: "{nom} provoca {cible}. O ambiente aquece.",
		provocationIgnoree: "{cible} nem levanta a cabeça.",
		bagarreDebut: "💢 Descamba: {nom} e {cible} vão às mãos.",
		bagarreGenerale: "Os dois packs entram na confusão, o árbitro está ultrapassado.",
		bagarreSeparee: "{nom} separa toda a gente e afasta os seus.",
		bagarreRecul: "{nom} levanta as mãos e afasta-se.",
		coupPorte: "{nom} dá um murro em {cible}!",
		arbitreVideo: "O árbitro pede as imagens. Todos esperam.",
		choixArme: "{nom} vai mesmo em frente.",
		choixTropTard: "Tarde demais, a jogada já passou.",
		duelContactKo: "{cible} pára {nom} a seco.",
		duelGrattageKo: "{nom} não consegue agarrar a bola.",
		duelPasseOk: "{nom} passa limpo para {cible}.",
		duelPasseKo: "O passe de {nom} vai ao chão.",
		duelPiedContre: "O pontapé de {nom} é TAPADO por {cible}!",
		duelAppelKo: "{nom} pede a bola, ninguém o vê.",
		duel5022Rate: "O pontapé falha a linha lateral: a bola continua em jogo.",
		duelChenilleOk: "{nom} protege a saída atrás do seu pack.",
		duelChenilleKo: "A lagarta de {nom} desmorona.",
		duelPercussionOk: "{nom} entra forte e ganha terreno.",
		duelOffloadKo: "{nom} força o offload e perde a bola.",
		echappee: "{nom} está no espaço, ninguém à frente!",
		duelPerceeKo: "O intervalo fecha-se sobre {nom}.",
		duelChipOk: "{nom} pica por cima e recupera o seu próprio pontapé!",
		duelChipKo: "O pontapé de {nom} vai longo demais, bola devolvida.",
		duelPlongeonKo: "{nom} mergulha, mas é suspenso a um metro.",
		duelInterceptionOk: "Interceção de {nom}! Vai sozinho!",
		duelInterceptionKo: "{nom} sai da linha e não toca em nada.",
		duelContreRuckOk: "Contra-ruck de {nom}, a bola muda de lado!",
		duelContreRuckKo: "O contra-ruck de {nom} não passa."
	},
	ja: {
		coupEnvoiMatch: "キックオフ！{clubA}対{clubB}。",
		sirenePremiere: "🔔 ホーンが鳴る。ボールデッドまでプレー続行。",
		sireneFinale: "🔔 最終ホーン！次のボールデッドで試合終了。",
		coupEnvoiJoueur: "{nom}がキックオフ。",
		renvoi22Joueur: "{nom}の22メートルドロップアウト。",
		toucheASuivre: "{club}のラインアウト。",
		toucheDirecte: "{nom}がダイレクトタッチ。地域獲得なし。",
		ballonEnBut: "ボールがインゴールへ。22メートルドロップアウト。",
		ballonAerien: "{nom}が空中戦を制する！",
		pousseTouche: "{nom}がタッチへ押し出される。",
		cassePlaquage: "{porteur}が{defenseur}のタックルを外す！",
		offload: "{porteur}から{receveur}へオフロード！",
		cartonRouge: "🟥 {nom}にレッドカード（{motif}）。{club}は14人で終了。",
		penaltouche: "{nom}がゴールライン手前{distance}メートルへタッチキック。",
		penaliteRapide: "{club}がクイックタップ。",
		tenuEnBut: "{nom}がインゴールで保持される！{club}の22メートルドロップアウト。",
		dropRate: "{nom}のドロップゴールは失敗。",
		miTempsScore: "ハーフタイム：{clubA} {scoreA} : {scoreB} {clubB}",
		coupSiffletFinal: "試合終了、{clubA} {scoreA} : {scoreB} {clubB}。",
		deuxiemeMiTemps: "後半開始！",
		essaiTransformeFin: "追加時間に{nom}がコンバージョン付きトライ！",
		essaiFin: "追加時間終了間際に{nom}がトライ！",
		penaliteFin: "最後の1秒で{nom}がペナルティ成功。",
		consigne: "📣 指示：「{libelle}」",
		changementDePlan: "📋 {club}が戦術を変更。",
		actionSprint: "{nom}がギアを上げた！",
		crochetReussi: "{nom}のステップ！{cible}のタックルは空を切る。",
		crochetRate: "{nom}がステップを試みるが、{cible}は釣られない。",
		raffutReussi: "{nom}のハンドオフ！タックルを突き破る。",
		appelBallon: "{nom}が大声でボールを呼ぶ。",
		plaquageLance: "{nom}が{cible}へ飛び込む！",
		plaquageRateJoueur: "{nom}が外し、{cible}が背後を抜けていく。",
		grattagePlonge: "{nom}が地上のボールに絡みにいく…",
		provocation: "{nom}が{cible}を挑発。空気が張りつめる。",
		provocationIgnoree: "{cible}は顔も上げない。",
		bagarreDebut: "💢 荒れた：{nom}と{cible}が殴り合いに。",
		bagarreGenerale: "両フォワードが入り乱れ、レフリーは手に負えない。",
		bagarreSeparee: "{nom}が全員を引き離し、味方を下がらせる。",
		bagarreRecul: "{nom}は両手を上げてその場を離れる。",
		coupPorte: "{nom}が{cible}を殴った！",
		arbitreVideo: "レフリーが映像を確認。全員が待つ。",
		choixArme: "{nom}が仕掛ける。",
		choixTropTard: "遅かった。プレーはもう終わっている。",
		duelContactKo: "{cible}が{nom}を完全に止めた。",
		duelGrattageKo: "{nom}はボールを奪い取れない。",
		duelPasseOk: "{nom}が{cible}へ正確にパス。",
		duelPasseKo: "{nom}のパスが地面に落ちる。",
		duelPiedContre: "{nom}のキックが{cible}にチャージされた！",
		duelAppelKo: "{nom}がボールを呼ぶが、誰も見ていない。",
		duel5022Rate: "タッチを外し、ボールはインプレーのまま。",
		duelChenilleOk: "{nom}がパックの後ろでボールを守る。",
		duelChenilleKo: "{nom}のキャタピラーが崩れる。",
		duelPercussionOk: "{nom}が力強く当たって前に出る。",
		duelOffloadKo: "{nom}がオフロードを無理にねじ込み、こぼす。",
		echappee: "{nom}がスペースへ、前には誰もいない！",
		duelPerceeKo: "ギャップが{nom}の前で閉じる。",
		duelChipOk: "{nom}がチップキックを自ら再獲得！",
		duelChipKo: "{nom}のキックが伸びすぎ、ボールを渡してしまう。",
		duelPlongeonKo: "{nom}が飛び込むが、あと1メートルで止められる。",
		duelInterceptionOk: "{nom}がインターセプト！独走だ！",
		duelInterceptionKo: "{nom}がラインを飛び出すも空を切る。",
		duelContreRuckOk: "{nom}のカウンターラック、ボールが入れ替わる！",
		duelContreRuckKo: "{nom}のカウンターラックは通らない。"
	}
};
//#endregion
//#region src/lib/moteur/commentaire.ts
function R(e, t, n = {}) {
	let r = i(), a = kt.get(t), o = r !== "fr" && a ? qe[r][a] : t, s = o[Math.floor(e() * o.length)] ?? o[0] ?? "";
	for (let e of Object.keys(n)) {
		let t = e === "motif" ? At(String(n[e]), r) : n[e];
		s = s.split(`{${e}}`).join(String(t));
	}
	return s.replace(/\{([^{}]*\|[^{}]*)\}/g, (t, n) => {
		let r = n.split("|");
		return r[Math.floor(e() * r.length)] ?? r[0];
	});
}
var Ye = [
	"ESSAI ! {nom} plonge dans l’en-but {precision} !",
	"ESSAI DE {nom} ! Il aplatit {precision}, {le stade explose|c’est magnifique|quelle fin d’action}.",
	"Il y va… ESSAI ! {nom} {precision}, imparable.",
	"ESSAI ! Personne ne rattrape {nom}, il aplatit {precision}.",
	"{nom} fixe le dernier défenseur et va au bout : ESSAI {precision} !",
	"Le ballon ressort vite, {nom} attaque l’espace et marque {precision} !",
	"Après une longue séquence, {nom} trouve enfin la brèche : ESSAI !",
	"{nom} résiste au retour et tend le bras : cinq points !",
	"Essai en première main ! {nom} conclut le mouvement {precision}.",
	"Turnover, relance, accélération : {nom} termine le travail {precision} !",
	"{nom} ramasse au ras et s’arrache jusqu’à la ligne : ESSAI !",
	"La défense glisse trop tard, {nom} déborde et aplatit {precision}."
], Xe = [
	"à la pointe du ballon",
	"en coin",
	"sous les poteaux",
	"au terme d’une action de cent mètres",
	"après avoir résisté à deux plaquages",
	"d’un plongeon",
	"le long de la ligne de touche",
	"après une passe intérieure",
	"au pied du poteau",
	"sur une passe sautée",
	"après un petit coup de pied à suivre",
	"à la sortie d’un ruck rapide"
], Ze = [
	"Transformation de {nom}, {facile|sans trembler|au bout du pied}.",
	"{nom} ajuste et transforme.",
	"La transformation est bonne, {nom} ne tremble pas."
], Qe = [
	"{nom} manque la transformation, le ballon passe à côté.",
	"Transformation ratée par {nom}, deux points perdus.",
	"{nom} bute contre le poteau ! Elle est manquée."
], $e = [
	"💥 CONTRE ! {contreur} a jailli dès la course d’élan et contre la transformation de {nom} !",
	"Incroyable contre de {contreur} ! La transformation de {nom} est déviée au sol.",
	"{contreur} a surgi à pleine vitesse et contre le tir de {nom} au tee !"
], et = [
	"Pénalité de {nom}, trois points de plus.",
	"{nom} l’ajuste depuis {distance} mètres, c’est bon.",
	"Trois points au pied de {nom}, {distance} mètres.",
	"{nom} prend son temps et récompense la faute : trois points.",
	"Le ballon fend les poteaux depuis {distance} mètres, signé {nom}.",
	"{nom} ne laisse rien passer : pénalité réussie."
], tt = [
	"{nom} manque la pénalité de {distance} mètres.",
	"La pénalité de {nom} passe à côté, {distance} mètres.",
	"Le ballon fuit à droite : échec de {nom}.",
	"{nom} trouve le poteau, pas les trois points.",
	"Tentative trop courte de {nom} depuis {distance} mètres."
], nt = ["DROP DE {nom} ! Trois points d’un geste.", "{nom} arme un drop… c’est passé !"], rt = [
	"Pénalité pour {club} : {motif}.",
	"Coup de sifflet : {motif}. Pénalité pour {club}.",
	"M. l’arbitre siffle {motif}, pénalité {club}.",
	"Avantage terminé : {motif}. {club} récupère une pénalité.",
	"Le capitaine montre les poteaux après cette faute : {motif}.",
	"Le sifflet coupe l’action, {motif} contre la défense.",
	"L’arbitre est formel : {motif}. Ballon à {club}.",
	"La pression paie pour {club} : {motif}."
], it = [
	"hors-jeu",
	"plaquage haut",
	"ballon tenu au sol",
	"plaqueur qui ne se relève pas",
	"entrée par le côté au ruck",
	"faute technique en mêlée",
	"obstruction",
	"coup de poing",
	"bagarre générale",
	"antijeu",
	"coup de poing relevé sur les images",
	"hors-jeu au ruck",
	"soutien qui plonge au ruck",
	"mêlée écroulée",
	"maul écroulé",
	"plaquage sans ballon"
], at = [
	"Gros plaquage de {nom} sur {cible} !",
	"{nom} stoppe {cible} net.",
	"{cible} est cueilli par {nom}.",
	"Plaquage dominateur de {nom}, {cible} recule."
], ot = [
	"{nom} est dans l’intervalle, il est lancé !",
	"Cadrage-débordement de {nom}, la ligne est franchie !",
	"{nom} casse le premier rideau, il y a de l’espace !",
	"Quelle accélération de {nom}, il est passé !"
], st = [
	"Grattage de {nom} ! Ballon récupéré au sol.",
	"{nom} est dans le ruck, il arrache le ballon !",
	"Turnover ! {nom} sort le ballon du regroupement.",
	"{nom} reste sur ses appuis et gagne la pénalité au sol !",
	"Le soutien arrive trop tard : {nom} gratte ce ballon.",
	"{nom} verrouille le ballon, turnover pour son équipe !",
	"Quel contest de {nom} ! Le ruck change de camp."
], ct = [
	"En-avant de {nom}, mêlée pour {club}.",
	"Le ballon échappe à {nom}, en-avant.",
	"Ballon perdu par {nom}, l’arbitre siffle l’en-avant.",
	"{nom} ne maîtrise pas la réception : ballon tombé vers l’avant.",
	"Passe trop dure, {nom} échappe le ballon. Mêlée adverse.",
	"Sous la pression, {nom} commet l’en-avant.",
	"Le ballon rebondit sur les mains de {nom} : mêlée pour {club}."
], lt = [
	"Passe en avant de {nom}, mêlée pour {club}.",
	"Le ballon part devant sur la passe de {nom}, l’arbitre siffle.",
	"{nom} a lâché sa passe en avant, mêlée {club}.",
	"La passe de {nom} flotte vers l’avant : le juge de touche l’a vue.",
	"{nom} force la transmission, son partenaire était devant.",
	"Mouvement stoppé : passe en avant de {nom}."
], ut = [
	"{nom} dégage en touche et rend cinquante mètres.",
	"Chandelle de dégagement de {nom}, l’équipe respire.",
	"{nom} tape par-dessus, le ballon file en touche."
], dt = [
	"{nom} occupe le terrain au pied.",
	"Coup de pied de déplacement de {nom}, on inverse la pression.",
	"{nom} rend le ballon mais gagne trente mètres."
], ft = [
	"Chandelle de {nom}, les avants montent dessus !",
	"{nom} envoie un ballon haut, la course est lancée.",
	"Box kick de {nom}, contestable."
], pt = ["50/22 de {nom} ! La touche est pour eux !", "Quel coup de pied ! {nom} trouve le 50/22."], mt = ["{nom} tente le 50/22, le ballon sort trop tôt.", "Tentative de 50/22 manquée par {nom}."], ht = ["Coup de pied rasant de {nom} derrière la défense !", "{nom} glisse un ballon au sol dans le dos du rideau."], gt = ["Transversale de {nom} pour l’aile !", "{nom} renverse le jeu d’un coup de pied par-dessus."], _t = [
	"Touche de {club}, ballon propre pour {nom}.",
	"{nom} prend l’alignement, ballon assuré.",
	"Lancer précis, {nom} domine dans les airs pour {club}.",
	"{club} varie l’alignement et trouve {nom} au premier bloc.",
	"{nom} capte au fond de la touche, le maul peut se former.",
	"Combinaison propre de {club}, ballon sécurisé par {nom}."
], vt = [
	"Touche ratée ! {club} récupère l’alignement.",
	"Lancer pas droit, le ballon change de camp.",
	"{nom} contre en touche, quel timing !",
	"Le lancer est trop long, {club} hérite du ballon.",
	"Mauvaise coordination dans l’alignement : touche volée par {club}.",
	"{nom} surgit devant le sauteur et subtilise le lancer !"
], yt = [
	"Mêlée solide de {club}, ballon sorti.",
	"Ballon propre en sortie de mêlée pour {club}.",
	"Les huit de {club} restent liés, la mêlée est maîtrisée.",
	"{club} stabilise puis libère vite pour son demi de mêlée.",
	"Introduction nette, talonnage propre : possession {club}.",
	"Le pack de {club} absorbe la poussée et conserve son ballon."
], bt = [
	"La mêlée de {club} recule, pénalité contre elle.",
	"Mêlée dominatrice ! {club} avance et obtient la pénalité.",
	"Le pack de {club} enfonce son vis-à-vis : bras tendu de l’arbitre.",
	"Grosse poussée de {club}, la première ligne adverse se désunit.",
	"{club} tourne la mêlée et gagne le coup de sifflet.",
	"Les crampons labourent la pelouse : {club} prend nettement le dessus."
], xt = [
	"Ballon porté de {club}, ça avance !",
	"Le maul se met en route pour {club}.",
	"Les avants de {club} se lient autour du ballon et avancent.",
	"Ballon caché au cœur du maul, {club} gagne mètre après mètre.",
	"Le paquet de {club} change d’axe et repart vers la ligne.",
	"Maul compact de {club}, la défense recule encore."
], St = [
	"ESSAI au terme du ballon porté ! {nom} pose le ballon.",
	"Le maul enfonce tout : ESSAI de {nom} !",
	"Le ballon porté traverse la ligne, {nom} aplatit derrière ses avants !",
	"La défense s’écroule dans l’en-but : essai collectif conclu par {nom}.",
	"Tout le pack pousse jusqu’au bout, {nom} libère le ballon et marque !"
], Ct = ["CARTON JAUNE pour {nom} : {motif}. {club} à quatorze pour dix minutes.", "L’arbitre sort le jaune : {nom} quitte le terrain dix minutes."], wt = [
	"Tu tiens debout, toi ?",
	"On t’attend, allez.",
	"C’est tout ?",
	"Reste avec nous, ça va être long.",
	"Regarde le tableau.",
	"Tu comptes courir aujourd’hui ?",
	"Encore une heure comme ça.",
	"Doucement, le vieux.",
	"T’as fini ?",
	"Retourne au vestiaire."
], Tt = ["{entrant} remplace {sortant}.", "Changement pour {club} : {entrant} entre à la place de {sortant}."], Et = [
	"{nom} repart au ras, il gagne le premier mètre.",
	"Pick and go de {nom}, ça pilonne.",
	"{nom} plonge sur le ballon et repart dans l’axe.",
	"Une passe courte au ras pour {nom}, encore deux mètres.",
	"{nom} baisse les épaules et attaque le petit côté."
], Dt = [
	"{nom} percute au ras, la défense recule.",
	"Un temps de plus par {nom} dans l’axe.",
	"{nom} arrive lancé sur l’épaule intérieure du défenseur.",
	"Course droite de {nom}, point de fixation créé.",
	"{nom} gagne le duel au centre du terrain et présente vite."
], Ot = [
	"Le ballon voyage… {nom} le reçoit au large !",
	"Ça écarte vite, {nom} est servi à l’aile !",
	"Surnombre au large, le ballon file jusqu’à {nom} !"
], kt = /* @__PURE__ */ new Map([
	[wt, "chambrage"],
	[Ye, "essai"],
	[Xe, "precision"],
	[Ze, "transformation"],
	[Qe, "transformationRatee"],
	[et, "penaliteBut"],
	[tt, "penaliteRatee"],
	[nt, "drop"],
	[rt, "penalite"],
	[it, "motif"],
	[at, "plaquage"],
	[ot, "franchissement"],
	[st, "grattage"],
	[ct, "enAvant"],
	[lt, "passeAvant"],
	[ut, "degagement"],
	[dt, "occupation"],
	[ft, "chandelle"],
	[pt, "cinquanteVingtDeux"],
	[mt, "cinquanteVingtDeuxRate"],
	[ht, "rasant"],
	[gt, "transversale"],
	[_t, "toucheGagnee"],
	[vt, "touchePerdue"],
	[yt, "meleeGagnee"],
	[bt, "meleeDominee"],
	[xt, "maul"],
	[St, "maulEssai"],
	[Ct, "carton"],
	[Tt, "remplacement"],
	[Et, "pickAndGo"],
	[Dt, "percussion"],
	[Ot, "ecartement"]
]);
function At(e, t) {
	if (t === "fr") return e;
	let n = it.indexOf(e);
	return n >= 0 ? qe[t].motif[n] ?? e : e;
}
function z(e, t = {}) {
	let n = i(), r = Je[n][e];
	for (let [e, i] of Object.entries(t)) {
		let t = e === "motif" ? At(String(i), n) : i;
		r = r.split(`{${e}}`).join(String(t));
	}
	return r;
}
//#endregion
//#region src/lib/moteur/dynamique.ts
function B(e, t, n, r = 1.2, i) {
	let a = e.sim;
	e.gestes = (e.gestes ?? []).filter((e) => a - e.debut < 8).slice(-63), e.gestes.push({
		id: `${t.id}:${a.toFixed(3)}:${n}`,
		joueurId: t.id,
		clip: n,
		debut: a,
		duree: r,
		...i ? { variante: i } : {}
	});
}
function jt() {
	return {
		pos: {
			x: 54,
			y: 26
		},
		vitesse: {
			x: 0,
			y: 0
		},
		regard: 0
	};
}
function Mt(e) {
	if (e.porteur) return e.porteur.id;
	if (!e.piedPrepare || e.vol) return;
	let t = e.pions.find((t) => t.id === e.piedPrepare.auteurId && t.surLeTerrain && t.sanction <= 0);
	return t && !t.corps && Math.hypot(t.pos.x - e.piedPrepare.depuis.x, t.pos.y - e.piedPrepare.depuis.y) < 1 ? t.id : void 0;
}
function Nt(e, t) {
	let n = e.arbitre ??= jt(), r = e.porteur?.vitesse ?? {
		x: 0,
		y: 0
	}, i = {
		x: j(e.ballon.x + r.x * .6 - M(e.possession) * 7, 2, 120),
		y: j(e.ballon.y + r.y * .5 + (e.ballon.y > 35 ? -8 : 8), 3, 67)
	};
	for (let t of e.pions) {
		if (!t.surLeTerrain) continue;
		let e = n.pos.x - t.pos.x, r = n.pos.y - t.pos.y, a = Math.hypot(e, r);
		a < 3 && a > .001 && (i.x += e / a * (3 - a) * 2, i.y += r / a * (3 - a) * 2);
	}
	let a = i.x - n.pos.x, o = i.y - n.pos.y, s = Math.max(.001, Math.hypot(a, o)), c = Math.min(7.6, s * 1.4), l = a / s * c - n.vitesse.x, u = o / s * c - n.vitesse.y, d = Math.min(1, 4.8 * t / Math.max(.001, Math.hypot(l, u)));
	n.vitesse.x += l * d, n.vitesse.y += u * d, n.pos.x = j(n.pos.x + n.vitesse.x * t, 1, 121), n.pos.y = j(n.pos.y + n.vitesse.y * t, 1, 69);
	let f = Math.atan2(e.ballon.y - n.pos.y, e.ballon.x - n.pos.x), p = Math.atan2(Math.sin(f - n.regard), Math.cos(f - n.regard));
	n.regard += j(p, -2.8 * t, 2.8 * t);
}
function Pt(e, t, n) {
	let r = e.arbitre ??= jt(), i = t.x - r.pos.x, a = t.y - r.pos.y, o = Math.hypot(i, a);
	if (o > 42) return 0;
	let s = (i * Math.cos(r.regard) + a * Math.sin(r.regard)) / Math.max(.01, o);
	if (s < -.15 && o > 3) return 0;
	let c = 0;
	for (let t of e.pions) {
		if (!t.surLeTerrain || t.id === n) continue;
		let e = ((t.pos.x - r.pos.x) * i + (t.pos.y - r.pos.y) * a) / Math.max(.01, o * o);
		e > .08 && e < .87 && Math.hypot(t.pos.x - r.pos.x - e * i, t.pos.y - r.pos.y - e * a) < .65 && c++;
	}
	return j((1 - o / 55) * (.35 + .65 * Math.max(0, s)) * .64 ** c, 0, .98);
}
function V(e, t, n = 1.5) {
	let r = Math.hypot(t.x, t.y);
	t = r < .01 ? {
		x: M(e.cote) * .01,
		y: 0
	} : {
		x: t.x * Math.min(1, 6 / r),
		y: t.y * Math.min(1, 6 / r)
	};
	let i = Math.max(.01, Math.hypot(t.x, t.y)), a = t.x / i, o = t.y / i;
	e.corps = {
		age: 0,
		duree: n,
		direction: Math.atan2(o, a),
		intensite: Math.min(1, i / 5),
		points: [
			0,
			.48,
			-.35,
			-.35,
			.48,
			.48
		].map((n, r) => ({
			x: e.pos.x + a * n - o * (r === 2 ? .22 : r === 3 ? -.22 : r === 4 ? .42 : r === 5 ? -.42 : 0),
			y: e.pos.y + o * n + a * (r === 2 ? .22 : r === 3 ? -.22 : r === 4 ? .42 : r === 5 ? -.42 : 0),
			vx: t.x * (r === 1 ? 1 : .7),
			vy: t.y * (r === 1 ? 1 : .7)
		}))
	}, e.battu = Math.max(e.battu, n);
}
function Ft(e, t) {
	for (let n of e.pions) {
		let r = n.corps;
		if (!r || !n.surLeTerrain) continue;
		if (r.age += t, r.age >= r.duree) {
			delete n.corps;
			continue;
		}
		let i = { ...n.pos }, a = e.pions.filter((e) => e !== n && e.surLeTerrain && e.sanction <= 0 && Math.abs(e.pos.x - n.pos.x) < 4 && Math.abs(e.pos.y - n.pos.y) < 4), o = t / 5;
		for (let e = 0; e < 5; e++) {
			for (let e of r.points) {
				e.vx *= Math.exp(-2.8 * o), e.vy *= Math.exp(-2.8 * o), e.x = j(e.x + e.vx * o, .2, 121.8), e.y = j(e.y + e.vy * o, .2, 69.8);
				for (let t of a) {
					if (t === n || !t.surLeTerrain || t.sanction > 0) continue;
					let r = e.x - t.pos.x, i = e.y - t.pos.y, a = Math.hypot(r, i);
					if (a > .01 && a < .43) {
						let n = (.43 - a) * .35;
						e.x += r / a * n, e.y += i / a * n, t.vitesse.x -= r / a * n * 2, t.vitesse.y -= i / a * n * 2;
					}
				}
			}
			for (let e = 0; e < 3; e++) for (let [e, t, n] of [
				[
					0,
					1,
					.48
				],
				[
					0,
					2,
					.414
				],
				[
					0,
					3,
					.414
				],
				[
					2,
					3,
					.44
				],
				[
					1,
					4,
					.42
				],
				[
					1,
					5,
					.42
				]
			]) {
				if (!r.points[e] || !r.points[t]) continue;
				let i = r.points[e], a = r.points[t], o = a.x - i.x, s = a.y - i.y, c = Math.max(.001, Math.hypot(o, s)), l = (c - n) / c * .5;
				i.x += o * l, i.y += s * l, a.x -= o * l, a.y -= s * l;
			}
		}
		n.pos = {
			x: r.points[0].x,
			y: r.points[0].y
		}, n.vitesse = {
			x: (n.pos.x - i.x) / t,
			y: (n.pos.y - i.y) / t
		}, r.direction = Math.atan2(r.points[1].y - n.pos.y, r.points[1].x - n.pos.x);
	}
	let n = e.phase === "ruck" ? e.pions.find((t) => t.id === e.ruck?.porteurId) : void 0;
	n?.corps && n.corps.age < 1.35 && (e.ballon = { ...n.pos });
}
function It(e) {
	if (e.phase !== "jeuCourant" || e.tension < 40 || e.sim < (e.incidentApres ?? 0)) return null;
	e.incidentApres = e.sim + 2;
	let t = e.pions.filter((e) => e.surLeTerrain && e.sanction <= 0);
	for (let n of t) {
		if (n.corps || n.discipline > 78 || n === e.porteur) continue;
		let r = t.find((e) => e.cote !== n.cote && Math.hypot(e.pos.x - n.pos.x, e.pos.y - n.pos.y) < 1.35);
		if (!r || e.rng() > .009 * (e.tension / 80) * (1.35 - n.discipline / 100)) continue;
		let i = Math.hypot(r.vitesse.x, r.vitesse.y) > 2.8, a = !!r.corps, o = a && e.rng() < .06 && e.tension > 65 && n.discipline < 40, s = !a && !i && e.rng() < .05 && e.tension > 65 && n.discipline < 40, c = o ? "coup de pied au sol" : a ? "geste dangereux au sol" : s ? "coup de poing" : i ? "croche-pied" : "bousculade sans ballon", l = o && e.rng() < .4 || s && e.rng() < .35;
		B(e, n, a ? "foul_kick" : i ? "foul_trip" : "foul_punch", 1.2, c === "bousculade sans ballon" ? "bousculade" : void 0), B(e, r, !a && i ? "reaction_trip" : "reaction_hit", 1.4), V(r, {
			x: (r.pos.x - n.pos.x) * 2,
			y: (r.pos.y - n.pos.y) * 2
		}, 1.7), e.incidentApres = e.sim + 90;
		let u = e.rng() < Pt(e, r.pos);
		return (e.fautesVues ??= {})[n.id] = u, {
			fautif: n,
			victime: r,
			motif: c,
			rouge: l,
			vu: u
		};
	}
	return null;
}
//#endregion
//#region src/lib/moteur/tactique.ts
function H(e, t) {
	let n = [];
	for (let r of e.pions) r.cote === t && r.surLeTerrain && n.push(r);
	return n;
}
function U(e, t) {
	for (let n of e) if (n.numero === t) return n;
}
var Lt = 3.2;
function W(e) {
	return j(e, Lt, 70 - Lt);
}
var Rt = 1.5;
function G(e) {
	return j(e, 11 + Rt, 111 - Rt);
}
function zt(e, t) {
	let n = e.length;
	if (n < 2) {
		n === 1 && (e[0].cible.y = W(e[0].cible.y));
		return;
	}
	let r = Lt, i = 70 - Lt, a = Math.min(t, (i - r) / (n - 1)), o = [...e].sort((e, t) => e.cible.y - t.cible.y), s = o.map((e) => j(e.cible.y, r, i));
	for (let e = 1; e < n; e++) s[e] < s[e - 1] + a && (s[e] = s[e - 1] + a);
	if (s[n - 1] > i) {
		s[n - 1] = i;
		for (let e = n - 2; e >= 0; e--) s[e] > s[e + 1] - a && (s[e] = s[e + 1] - a);
	}
	for (let e = 0; e < n; e++) o[e].cible.y = j(s[e], r, i);
}
var Bt = {
	9: 1.2,
	10: 5.5,
	12: 6.8,
	13: 8,
	11: 9.2,
	14: 9.2,
	15: 12.5
};
function Vt(e, t, n, r, i, a) {
	let o = M(t), s = oe((e.origine ?? n).y, n.y, .3), c = e.ouvert, l = (c === 1 ? 70 - s : s) < 14 ? -c : c, u = l === 1 ? 70 - s : s, d = 70 - u, f = (e, t) => W(s + l * e * Math.min(t, Math.max(2, (e === 1 ? u : d) - Lt - 1))), p = P(n, t) < 15, m = p ? .6 : ue(n, t) ? 1.25 : 1, h = p ? Math.min(4.5, u * .4) : j(u * .22, 6.5, 12), g = u >= 34 && !p, _ = g ? j(u * .5, h + 9, 27) : j(d * .32, 4.5, 12), v = g ? 1 : -1, y = 1.7, b = [
		{
			cote: 1,
			d: h,
			dx: 2.4,
			role: "podRas"
		},
		{
			cote: 1,
			d: h - y,
			dx: 3.2,
			role: "podRas"
		},
		{
			cote: 1,
			d: h + y,
			dx: 3.2,
			role: "podRas"
		},
		g ? {
			cote: -1,
			d: Math.min(6, d * .3),
			dx: 2,
			role: "aileFerme"
		} : {
			cote: 1,
			d: Math.min(u * .7, 28),
			dx: 5.5,
			role: "podLarge"
		},
		{
			cote: v,
			d: _,
			dx: 3.8,
			role: "podMilieu"
		},
		{
			cote: v,
			d: _ - y,
			dx: 4.6,
			role: "podMilieu"
		},
		{
			cote: v,
			d: _ + y,
			dx: 4.6,
			role: "podMilieu"
		},
		g ? {
			cote: 1,
			d: Math.min(u * .78, 34),
			dx: 6,
			role: "podLarge"
		} : {
			cote: -1,
			d: Math.min(d * .62, 30),
			dx: 5.5,
			role: "aileFerme"
		}
	], x = r.filter((e) => !a.has(e) && e.role !== "ruck"), S = `${t}:${e.phasesDepuisArret ?? 0}:${l}:${+!!g}:${+!!p}:${x.length}`, C = e.structureAttaque;
	if (!C || C.cle !== S || x.some((e) => C.places[e.id] === void 0)) {
		let t = Math.min(x.length, b.length), n = b.slice(0, t).map((e, t) => ({
			i: t,
			lateral: e.cote * e.d
		})).sort((e, t) => e.lateral - t.lateral), r = [...x].sort((e, t) => (e.pos.y - s) * l - (t.pos.y - s) * l).slice(0, t);
		C = {
			cle: S,
			places: {}
		}, r.forEach((e, t) => {
			C.places[e.id] = n[t].i;
		}), e.structureAttaque = C;
	}
	for (let e of r) {
		let t = a.get(e);
		if (t != null) {
			Ut(e, n, o, c, t);
			continue;
		}
		if (e.role === "ruck") continue;
		let r = b[C.places[e.id] ?? b.length - 1];
		e.role = r.role, e.cible = {
			x: G(n.x - o * r.dx * m),
			y: f(r.cote, r.d)
		};
	}
	let w = e.lancement, T = !!w && (w.type === "large" || w.type === "saute"), E = u < 16, ee = [], D = (e, t, r, i, a = !0) => {
		e.cible = {
			x: G(n.x - o * i * m),
			y: f(t, r)
		}, a && t === 1 && ee.push(e);
	};
	for (let e of i) switch (e.numero) {
		case 9:
			e.role = "demi", e.cible = {
				x: G(n.x - o * 1.4),
				y: W(n.y - l * 1.6)
			};
			break;
		case 10:
			e.role = "ouvreur", D(e, 1, E ? u * .5 : h + 2.6, 6.2);
			break;
		case 12:
			e.role = "ligne", E ? D(e, -1, d * .22, 6.8) : D(e, 1, Math.max(h + 9, u * .42), 7.4);
			break;
		case 13:
			e.role = "ligne", u < 30 ? D(e, -1, d * (E ? .45 : .36), 7.6) : D(e, 1, Math.max(h + 16, u * .6), 8.6);
			break;
		case 15:
			e.role = T ? "ligne" : "arriere", T && u >= 30 ? D(e, 1, u * .8, 9.6) : D(e, u >= 22 ? 1 : -1, Math.min((u >= 22 ? u : d) * .3, 16), ue(n, t) ? 20 : 15, !1);
			break;
		default: {
			let t = e.numero === 11 ? 0 : 70, r = (t === 0 ? -1 : 1) === l;
			e.role = r ? "ligne" : "aileFerme", e.cible = {
				x: G(n.x - o * (r ? 9.5 : 12) * m),
				y: W(t + (t === 0 ? 4.5 : -4.5))
			};
		}
	}
	zt(ee, 5);
}
function Ht(e, t, n) {
	let r = M(n), i = e.ouvert, a = e.porteur && e.porteur.cote === n ? e.porteur : null, o = a ? a.pos : e.ballon, s = e.origine ? oe(e.origine.y, o.y, .48) : o.y, c = e.lancement, l = /* @__PURE__ */ new Map();
	if (c && a) for (let e = c.index + 1; e < c.chaine.length; e++) l.has(c.chaine[e]) || l.set(c.chaine[e], e - c.index);
	let u = [], d = [];
	for (let e of t) e !== a && (e.avant ? u : d).push(e);
	let f = j((i === 1 ? 70 - s : s) / 42, .7, 1);
	u.sort((e, t) => A(o, e.pos) - A(o, t.pos));
	let p = u;
	if (a && a.avant) {
		let e = u.filter((e) => !l.has(e)).slice(0, 2);
		e[0] && (e[0].role = "podRas", e[0].cible = {
			x: G(a.pos.x - r * 1.2),
			y: W(a.pos.y - i * 1.8)
		}), e[1] && (e[1].role = "podRas", e[1].cible = {
			x: G(a.pos.x - r * 1.2),
			y: W(a.pos.y + i * 1.8)
		}), p = u.filter((t) => !e.includes(t));
	}
	if (e.cadenceDetaillee) Vt(e, n, o, p, d, l);
	else {
		let e = Math.max(1.4, 1.8 * f), t = 12 * f, n = 24 * f, a = [
			{
				dy: t,
				dx: 2.6,
				role: "podRas"
			},
			{
				dy: t - e,
				dx: 3.4,
				role: "podRas"
			},
			{
				dy: t + e,
				dx: 3.4,
				role: "podRas"
			},
			{
				dy: -10,
				dx: 2.8,
				role: "aileFerme"
			},
			{
				dy: n,
				dx: 4.4,
				role: "podMilieu"
			},
			{
				dy: n - e,
				dx: 5.2,
				role: "podMilieu"
			},
			{
				dy: n + e,
				dx: 5.2,
				role: "podMilieu"
			},
			{
				dy: 36 * f,
				dx: 6.2,
				role: "podLarge"
			}
		];
		for (let e = 0; e < p.length; e++) {
			let t = p[e], n = l.get(t);
			if (n != null) {
				Ut(t, o, r, i, n);
				continue;
			}
			let c = a[e] ?? a[a.length - 1];
			t.role = c.role, t.cible = {
				x: G(o.x - r * c.dx),
				y: W(s + i * c.dy)
			};
		}
		let u = !!c && (c.type === "large" || c.type === "saute"), m = [];
		for (let e of d) {
			let t = Bt[e.numero] ?? 12, n;
			switch (e.numero) {
				case 9:
					e.role = "demi", e.cible = {
						x: G(o.x - r * 1.4),
						y: W(o.y - i * 1.6)
					};
					continue;
				case 10:
					e.role = "ouvreur", n = 11 * f;
					break;
				case 12:
					e.role = "ligne", n = 21 * f;
					break;
				case 13:
					e.role = "ligne", n = 30 * f;
					break;
				case 15:
					e.role = u ? "ligne" : "arriere", n = u ? 40 * f : -4;
					break;
				default: {
					let n = e.numero === 11 ? 0 : 70, a = i === 1 ? 70 : 0;
					n === a ? (e.role = "ligne", e.cible = {
						x: G(o.x - r * t),
						y: W(a + (i === 1 ? -5 : 5))
					}) : (e.role = "aileFerme", e.cible = {
						x: G(o.x - r * (t + 6)),
						y: W(n + (n === 0 ? 9 : -9))
					});
					continue;
				}
			}
			e.cible = {
				x: G(o.x - r * t),
				y: s + i * n
			}, m.push(e);
		}
		zt(m, 5);
	}
	for (let e of t) e !== a && (e.cible.x - o.x) * r > -.6 && (e.cible.x = G(o.x - r * .6));
}
function Ut(e, t, n, r, i) {
	e.role = "ligne", e.cible = {
		x: G(t.x - n * (1.6 + i * 1.5)),
		y: W(t.y + i * 8.5 * r)
	};
}
function Wt(e, t, n) {
	let r = M(N(n)), i = e.ouvert, a = e.porteur, o = a ? a.pos : e.ballon, s = e.systeme, c = t.filter((e) => e.sanction <= 0);
	if (!c.length) return;
	let l = P(o, N(n)), u = l > 55 ? 30 : l > 30 ? 21 : l > 18 ? 15 : 9, d = U(c, 15), f = i === 1 ? U(c, 11) : U(c, 14), p = U(c, 9), m = p && p.battu <= 0 ? p : [...c].filter((e) => e !== d && e !== f && e.battu <= 0).sort((e, t) => A(e.pos, o) - A(t.pos, o))[0], h = /* @__PURE__ */ new Set();
	if (d) {
		d.role = "rideau2";
		let e = l < 55 && Math.abs(o.y - 35) > 12;
		d.cible = {
			x: G(o.x + r * u),
			y: W(oe(o.y, 35, e ? .16 : .55))
		}, h.add(d);
	}
	if (f) {
		f.role = "rideau2";
		let e = f.numero === 11 ? 0 : 70;
		f.cible = {
			x: G(o.x + r * u * .72),
			y: W(e + (e === 0 ? 13 : -13))
		}, h.add(f);
	}
	if (m) {
		let t = a?.numero === 9 && A(a.pos, e.origine) < 225, n = e.phase === "ruck" || t;
		m.role = t ? "chasseur" : "sentinelle", m.cible = t && a ? Gt(m, a) : {
			x: G(o.x + r * (n ? 1.8 : 8.5)),
			y: W(o.y - i * (n ? 1.6 : 4))
		}, h.add(m);
	}
	let g = c.filter((e) => !h.has(e));
	if (!g.length) return;
	let _ = i === 1 ? 70 - o.y : o.y, v = 70 - _, y = Math.round(g.length * v / 70 / 1.7);
	y = j(y, 1, 3);
	let b = Math.max(1, g.length - y), x = [];
	for (let e = y - 1; e >= 0; e--) x.push(o.y - i * (2.2 + e * 5.2));
	let S = Math.max(10, _ - 7), C = Math.min(5.4, S / Math.max(1, b - .5));
	for (let e = 0; e < b; e++) x.push(o.y + i * (2.2 + e * C));
	let w = s === "glissee" ? 3.4 : s === "repli" ? 1.2 : 0, T = [...g].sort((e, t) => (e.pos.y - t.pos.y) * i);
	for (let t = 0; t < T.length; t++) {
		let n = T[t];
		n.role = "rideau1";
		let a = Math.abs(t - (y - .5)), c = j(s === "blitz" ? -r * a * .12 : s === "glissee" ? r * a * .14 : r * a * .08, -.85, .85);
		n.cible = {
			x: G(e.ligneDef + c),
			y: (x[t] ?? o.y) + i * w
		};
	}
	let E = Math.abs(e.ballon.x - ce(n));
	if (zt(T, E < 8 ? 2.3 : E < 16 ? 3.2 : 4.2), !a || a.cote === n) return;
	let ee = g.filter((e) => e.battu <= 0);
	ee.sort((e, t) => A(e.pos, a.pos) - A(t.pos, a.pos));
	let D = e.defenseArcadeCote === n, te = (E < 8 ? 5 : E < 16 ? 4 : 3) + +!!D, ne = ee.filter((e) => (e.pos.x - a.pos.x) * r >= -1.5).slice(0, te);
	for (let e of ne) e.cible = Gt(e, a), e.role = "chasseur";
	let O = 0;
	for (let e of g) (e.pos.x - a.pos.x) * r < -.5 && O++;
	let re = E < 8, ie = !!a && (a.numero === 11 || a.numero === 14) && Math.abs(a.pos.y - 35) > 18;
	if (!(re || O >= Math.ceil(g.length * .35) || ie && d && A(d.pos, a.pos) < 900)) return;
	for (let e of h) e.battu > 0 || e === m && A(e.pos, a.pos) > 900 || (e.cible = Gt(e, a), e.role = "chasseur");
	let ae = g.filter((e) => e.battu <= 0 && !ne.includes(e) && A(e.pos, a.pos) < 625).sort((e, t) => A(e.pos, a.pos) - A(t.pos, a.pos)).slice(0, 4);
	for (let e of ae) e.cible = Gt(e, a), e.role = "chasseur";
}
function Gt(e, t) {
	let n = j(k(e.pos, t.pos) / Math.max(4, e.vitesseMax), 0, 1.6);
	return {
		x: t.pos.x + t.vitesse.x * n,
		y: W(t.pos.y + t.vitesse.y * n)
	};
}
function Kt(e) {
	let t = e.phase === "melee" || e.phase === "touche" ? new Map(e.pions.filter((e) => e.role === "melee" || e.role === "alignement").map((e) => [e.id, e.role])) : null, n = e.phase === "ruck" ? new Set(e.pions.filter((e) => e.role === "ruck").map((e) => e.id)) : null, r = H(e, e.possession), i = H(e, N(e.possession));
	if (Ht(e, r, e.possession), Wt(e, i, N(e.possession)), Ve(e), t) for (let n of e.pions) {
		let e = t.get(n.id);
		e && (n.role = e);
	}
	if (n) for (let t of e.pions) n.has(t.id) && (t.role = "ruck");
	if (e.phase === "ballonEnLAir" && e.vol?.type === "pied") {
		let t = e.vol, n = t.vers, r = t.auteur;
		r && r.surLeTerrain && r.sanction <= 0 && (r.role = "chasseur", r.cible = { ...n }, r.effort = 1.1);
		let i = H(e, r.cote).filter((e) => e !== r && !e.horsJeu && e.sanction <= 0).sort((e, t) => A(e.pos, n) - A(t.pos, n)).slice(0, 2);
		for (let e of i) e.role = "chasseur", e.cible = { ...n }, e.effort = 1.1;
		let a = H(e, N(r.cote)).filter((e) => e.sanction <= 0).sort((e, t) => A(e.pos, n) - A(t.pos, n)).slice(0, 2);
		for (let e of a) e.role = "chasseur", e.cible = { ...n }, e.effort = 1.1;
	}
	Yt(e);
	let a = We.has(e.phase);
	for (let t of e.pions) {
		if (!t.surLeTerrain) continue;
		if (t.role !== "chasseur" && (t.cible.x = G(t.cible.x)), t.horsJeu && e.phase === "ballonEnLAir") {
			let n = e.vol?.type === "pied" ? e.vol.auteur : null;
			n && n.cote === t.cote && (t.cible.x = j(n.pos.x - M(t.cote) * 2, .5, 121.5), t.cible.y = j(t.cible.y, 4, 66)), t.effort = .55;
			continue;
		}
		if (a) {
			t.effort = Math.max(t.effort, 1);
			continue;
		}
		if (t.role === "chasseur") {
			t.effort = e.echappee ? 1.15 : e.defenseArcadeCote === t.cote ? 1.14 : 1.06, t.effort > 1 && t.endurance < 50 && (t.effort = 1 + (t.effort - 1) * (t.endurance / 50));
			continue;
		}
		let n = A(t.pos, e.ballon);
		t.effort = n < 400 ? 1 : n < 1600 ? .8 : .64, A(t.pos, t.cible) > 100 && (t.effort = Math.max(t.effort, .86));
		let r = e.tactiques[t.cote]?.rythme;
		t.effort *= r === "intense" ? 1.08 : r === "gestion" ? .92 : 1, t.effort > 1 && t.endurance < 50 && (t.effort = 1 + (t.effort - 1) * (t.endurance / 50));
	}
	e.porteur && (e.porteur.effort = e.echappee?.pion === e.porteur ? e.porteur.endurance < 30 ? 1.04 : e.porteur.endurance < 50 ? 1.09 : 1.15 : 1), Jt(e, a);
}
var qt = 2.2;
function Jt(e, t) {
	let n = [];
	for (let r of e.pions) !r.surLeTerrain || r.sanction > 0 || e.tir?.buteur === r && !e.tir.volLance || r.role !== "ruck" && r.role !== "melee" && r.role !== "alignement" && r.role !== "maul" && (t && (e.phase === "melee" || e.phase === "touche") || n.push(r));
	let r = e.placementJoue ? n.map((e) => ({
		x: e.pos.x,
		y: e.pos.y
	})) : null;
	for (let e = 0; e < 2; e++) for (let e = 0; e < n.length; e++) {
		let t = n[e];
		for (let r = e + 1; r < n.length; r++) {
			let e = n[r], i = e.pos.x - t.pos.x, a = e.pos.y - t.pos.y, o = i * i + a * a;
			if (o >= qt * qt) continue;
			let s = Math.sqrt(o) || .001, c = (qt - s) * .5, l = i / s, u = a / s;
			t.pos.x -= l * c, t.pos.y -= u * c, e.pos.x += l * c, e.pos.y += u * c, t.pos.y = W(t.pos.y), e.pos.y = W(e.pos.y);
		}
	}
	if (r) {
		let e = .5;
		n.forEach((t, n) => {
			let i = t.pos.x - r[n].x, a = t.pos.y - r[n].y, o = Math.hypot(i, a);
			o > e && (t.pos.x = r[n].x + i / o * e, t.pos.y = r[n].y + a / o * e);
		});
	}
}
function Yt(e) {
	let t = e.consigne;
	if (!t) return;
	let n = e.pions.find((e) => e.moi && e.surLeTerrain);
	if (!n || n === e.porteur) return;
	let r = M(n.cote);
	n.cible = {
		x: n.cible.x + r * t.profondeur,
		y: W(n.cible.y + t.largeur * e.ouvert)
	}, t.agressivite > .65 && e.possession === n.cote && (n.cible = {
		x: oe(n.cible.x, e.ballon.x - r * 2, .5),
		y: W(oe(n.cible.y, e.ballon.y, .5))
	});
}
function Xt(e, t) {
	let n = e.tactiques[t]?.defense;
	if (n) return n;
	let r = e.ballon;
	if (P(r, N(t)) > 78) return "repli";
	if (Math.abs(r.x - ce(t)) < 24 || Math.abs(r.y - 35) > 19) return "glissee";
	let i = t === "A" ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
	return e.minute > 58 && i < 0 || e.rng() < .62 ? "blitz" : "glissee";
}
function Zt(e, t) {
	let n = e.systeme === "blitz" ? 5.2 : e.systeme === "glissee" ? 3.8 : 2.6, r = H(e, t);
	if (!r.length) return n;
	let i = 0;
	for (let e of r) i += e.endurance;
	i /= r.length;
	let a = e.tactiques[t]?.rythme;
	return n * (a === "intense" ? 1.08 : a === "gestion" ? .92 : 1) * (.72 + i / 360);
}
function Qt(e) {
	let t = e.ouvert, n = e.ballon.y + t * 14, r = (e) => (e.pos.y - n) * t > 0, i = 0, a = 0;
	for (let t of e.pions) !t.surLeTerrain || t.sanction > 0 || !r(t) || (t.cote === e.possession ? i++ : a++);
	return i - a;
}
function $t(e) {
	let t = me(e.ballon);
	return e.phasesDepuisArret >= 2 && e.rng() < .3 ? t === 1 ? -1 : 1 : t;
}
//#endregion
//#region src/lib/moteur/bagarre.ts
function en(e) {
	let t = e.pions.find((e) => e.moi);
	return t && t.surLeTerrain && t.sanction <= 0 ? t : void 0;
}
function tn(e, t, n) {
	let r, i = n * n;
	for (let n of H(e, N(t.cote))) {
		if (n.sanction > 0) continue;
		let e = A(n.pos, t.pos);
		e < i && (i = e, r = n);
	}
	return r;
}
function nn(e, t) {
	e.tension = j(e.tension + t, 0, 100);
}
function rn(e, t) {
	e.tension > 0 && (e.tension = Math.max(0, e.tension - t * .42));
}
function an(e, t, n) {
	return (e === "amateur" ? .22 + t / 320 : .012 + t / 2600) / (1 + 2 * n);
}
var on = 3, sn = 4;
function cn(e, t, n, r = 2.8) {
	let i = e.bulles.findIndex((e) => e.pion === t);
	i >= 0 && e.bulles.splice(i, 1), e.bulles.push({
		pion: t,
		texte: n,
		restant: r
	}), e.bulles.length > sn && e.bulles.shift();
}
function ln(e, t) {
	if (e.bulles.length) {
		for (let n of e.bulles) n.restant -= t;
		e.bulles = e.bulles.filter((e) => e.restant > 0 && e.pion.surLeTerrain && e.pion.sanction <= 0);
	}
}
var un = 9;
function dn(e, t) {
	if (e.fini || e.bagarre || (e.prochaineFriction -= t, e.prochaineFriction > 0)) return;
	e.prochaineFriction = un;
	let n = e.tension / 100, r = (e.niveau === "amateur" ? .3 : .16) * (.35 + n);
	if (e.rng() >= r) return;
	let i = en(e), a = i && e.rng() < .55 ? tn(e, i, 12) : fn(e);
	if (!a) return;
	let o = tn(e, a, 10);
	o && pn(e, a, o);
}
function fn(e) {
	let t = e.pions.filter((e) => e.surLeTerrain && e.sanction <= 0);
	return t[Math.floor(e.rng() * t.length)];
}
function pn(e, t, n) {
	cn(e, t, R(e.rng, wt)), nn(e, e.niveau === "amateur" ? 9 : 5), e.rng() < .35 + (100 - n.discipline) / 220 && (cn(e, n, R(e.rng, wt), 2.4), nn(e, 4));
	let r = en(e);
	if (!r || t !== r && n !== r || e.discipline.bagarres >= on) return;
	let i = t === r ? n : t, a = an(e.niveau, e.tension, e.discipline.bagarres) * (1.35 - i.discipline / 150);
	e.rng() < a && gn(e, "adversaire", !1, i);
}
function mn(e, t) {
	let n = 1 - t.endurance / 100, r = (e.niveau === "amateur" ? .011 : .006) * (.5 + n) * (.6 + e.tension / 70) * (1.4 - t.discipline / 150);
	if (e.rng() >= r) return null;
	let i = t.puissance > 75 && e.rng() < .015, a = i || e.rng() < .66;
	return {
		cathedrale: i,
		motif: i ? "plaquage cathédrale" : a ? "plaquage haut" : "plaquage en retard",
		haut: a
	};
}
function hn(e, t, n, r) {
	nn(e, r.haut ? 26 : 16), cn(e, n, R(e.rng, wt), 2.6);
	let i = en(e);
	if (!i || e.bagarre || e.discipline.bagarres >= on) return;
	let a = n === i;
	if (!a && t !== i) return;
	let o = a ? t : n, s = an(e.niveau, e.tension, e.discipline.bagarres) * (r.haut ? 2.4 : 1.2) * (1.35 - o.discipline / 150);
	e.rng() >= s || gn(e, "adversaire", !1, o);
}
function gn(e, t, n, r) {
	let i = en(e);
	if (i) {
		e.discipline.bagarres += 1, n && (e.discipline.coupsPortes += 1), nn(e, 30), Ke(e, "carton", i.cote, z("bagarreDebut", {
			nom: i.nom,
			cible: r.nom
		}), 0, !0), e.bagarre = {
			origine: t,
			adversaire: r,
			coupPorte: n,
			attente: 0,
			ordre: null,
			resume: [z("bagarreGenerale")]
		}, e.phase = "bagarre", e.porteur = null, e.vol = null, e.placement = null;
		for (let t of e.pions) F(t);
	}
}
function _n(e, t) {
	e.bagarre && !e.bagarre.ordre && (e.bagarre.ordre = t);
}
function vn(e) {
	let t = e.bagarre, n = e.pions.find((e) => e.moi), r = {
		x: e.ballon.x,
		y: e.ballon.y
	};
	if (!t || !n) return {
		pour: e.possession,
		lieu: r,
		motif: "antijeu"
	};
	let i = t.ordre ?? "reculer", a = t.origine === "moi" ? 2.4 : 0;
	t.coupPorte && (a += 1), a += yn[i];
	let o = i === "tous";
	o && nn(e, 20);
	let s = e.niveau === "amateur", c = t.coupPorte ? "coup de poing" : o ? "bagarre générale" : "antijeu", l = e.fautesVues?.[n.id] ?? e.rng() < Pt(e, n.pos, n.id), u = (t.origine === "adversaire" || o) && (e.fautesVues?.[t.adversaire.id] ?? e.rng() < Pt(e, t.adversaire.pos, t.adversaire.id)), d = l ? bn(e, a, s) : null;
	d && xn(e, n, d === "rouge", c, t.resume);
	let f = t.origine === "adversaire" ? bn(e, 2.4 + yn.reculer, s) : bn(e, o ? 1.6 : .9, s);
	u && f && xn(e, t.adversaire, f === "rouge", c, t.resume), Cn(e, t, i);
	let p = a >= 2 ? N(n.cote) : t.origine === "adversaire" && a <= .5 ? n.cote : e.possession;
	return e.fautesVues && (delete e.fautesVues[n.id], delete e.fautesVues[t.adversaire.id]), {
		pour: p,
		lieu: r,
		motif: c,
		fauteVue: l || u
	};
}
var yn = {
	tous: 1.2,
	proteger: .4,
	calmer: -1.2,
	reculer: -2.2
};
function bn(e, t, n) {
	if (t <= 0) return null;
	let r = e.rng();
	return t < 1.5 ? n ? r < .52 ? "jaune" : null : r < .3 ? "jaune" : null : t < 2.8 ? n ? r < .04 ? "rouge" : r < .7 ? "jaune" : null : r < .06 ? "rouge" : r < .65 ? "jaune" : null : n ? r < .15 ? "rouge" : "jaune" : r < .2 ? "rouge" : "jaune";
}
function xn(e, t, n, r, i) {
	n ||= t.stats.cartonsJaunes > 0, t.surLeTerrain = !1, t.sanction = n ? 99999 : 600, n ? t.stats.cartonsRouges += 1 : t.stats.cartonsJaunes += 1, t.moi && (n ? e.discipline.rouges += 1 : e.discipline.jaunes += 1, e.discipline.motif = r);
	let a = t.cote === "A" ? e.clubA : e.clubB, o = n ? z("cartonRouge", {
		nom: t.nom,
		motif: r,
		club: a
	}) : R(e.rng, Ct, {
		nom: t.nom,
		motif: r,
		club: a
	});
	Ke(e, "carton", t.cote, o, 0, t.moi), i.push(o);
}
var Sn = [
	{
		nom: "Arcade ouverte",
		min: 1,
		max: 2,
		poids: 40
	},
	{
		nom: "Nez cassé",
		min: 2,
		max: 3,
		poids: 30
	},
	{
		nom: "Main cassée sur un coup de poing",
		min: 6,
		max: 10,
		poids: 22
	},
	{
		nom: "Fracture du plancher orbitaire",
		min: 8,
		max: 14,
		poids: 8
	}
];
function Cn(e, t, n) {
	if (n === "reculer") return;
	let r = (t.coupPorte ? .13 : .05) + (n === "tous" ? .05 : 0);
	if (e.rng() >= r) return;
	let i = e.rng() * Sn.reduce((e, t) => e + t.poids, 0), a = Sn[0];
	for (let e of Sn) if (i -= e.poids, i <= 0) {
		a = e;
		break;
	}
	let o = a.min + Math.floor(e.rng() * (a.max - a.min + 1));
	e.discipline.blessure = {
		nom: a.nom,
		semaines: o
	}, t.resume.push(`🚑 ${a.nom}`);
}
function wn(e) {
	let t = e.discipline, n = e.niveau === "amateur", r = (t, n) => t + Math.floor(e.rng() * (n - t + 1));
	if (t.rouges > 0) {
		let e = t.motif || "antijeu";
		t.citation = {
			semaines: t.coupsPortes > 0 || t.bagarres > 0 ? n ? r(3, 8) : r(12, 34) : n ? r(2, 4) : r(3, 8),
			motif: e
		};
		return;
	}
	t.coupsPortes > 0 && e.rng() < (n ? .22 : .62) && (t.citation = {
		semaines: n ? r(2, 4) : r(6, 16),
		motif: "coup de poing relevé sur les images"
	});
}
//#endregion
//#region src/lib/moteur/controle.ts
var Tn = (e) => !e.avant && e.pied >= 50;
new Map([
	{
		id: "sprint",
		emoji: "🏃",
		cle: "ml.act.sprint",
		aide: "ml.act.sprint.aide",
		famille: "ballon",
		duree: 3.2,
		recharge: 6,
		cout: 3
	},
	{
		id: "crochet",
		emoji: "↩️",
		cle: "ml.act.crochet",
		aide: "ml.act.crochet.aide",
		famille: "ballon",
		duree: 3.4,
		recharge: 5,
		cout: 3
	},
	{
		id: "raffut",
		emoji: "💪",
		cle: "ml.act.raffut",
		aide: "ml.act.raffut.aide",
		famille: "ballon",
		duree: 3.4,
		recharge: 5,
		cout: 3
	},
	{
		id: "passe",
		emoji: "🤝",
		cle: "ml.act.passe",
		aide: "ml.act.passe.aide",
		famille: "ballon",
		duree: 1.4,
		recharge: 2,
		cout: 0
	},
	{
		id: "passeGauche",
		emoji: "⬅️",
		cle: "ml.act.passeGauche",
		aide: "ml.act.passeGauche.aide",
		famille: "ballon",
		duree: 1.4,
		recharge: 2,
		cout: 0
	},
	{
		id: "passeDroite",
		emoji: "➡️",
		cle: "ml.act.passeDroite",
		aide: "ml.act.passeDroite.aide",
		famille: "ballon",
		duree: 1.4,
		recharge: 2,
		cout: 0
	},
	{
		id: "pied",
		emoji: "🦶",
		cle: "ml.act.pied",
		aide: "ml.act.pied.aide",
		famille: "ballon",
		duree: 1.4,
		recharge: 3,
		cout: 1
	},
	{
		id: "cinquanteVingtDeux",
		emoji: "🎯",
		cle: "ml.act.cinquanteVingtDeux",
		aide: "ml.act.cinquanteVingtDeux.aide",
		famille: "ballon",
		duree: 1.4,
		recharge: 40,
		cout: 2,
		pour: Tn
	},
	{
		id: "chandelle",
		emoji: "☂️",
		cle: "ml.act.chandelle",
		aide: "ml.act.chandelle.aide",
		famille: "ballon",
		duree: 1.4,
		recharge: 14,
		cout: 1,
		pour: Tn
	},
	{
		id: "percussion",
		emoji: "🐂",
		cle: "ml.act.percussion",
		aide: "ml.act.percussion.aide",
		famille: "ballon",
		duree: 3.4,
		recharge: 8,
		cout: 4,
		pour: (e) => e.avant
	},
	{
		id: "offload",
		emoji: "🤲",
		cle: "ml.act.offload",
		aide: "ml.act.offload.aide",
		famille: "ballon",
		duree: 3.4,
		recharge: 12,
		cout: 2
	},
	{
		id: "percee",
		emoji: "🕳️",
		cle: "ml.act.percee",
		aide: "ml.act.percee.aide",
		famille: "ballon",
		duree: 3.4,
		recharge: 52,
		cout: 5
	},
	{
		id: "chipEtSuivre",
		emoji: "🪁",
		cle: "ml.act.chipEtSuivre",
		aide: "ml.act.chipEtSuivre.aide",
		famille: "ballon",
		duree: 1.4,
		recharge: 46,
		cout: 3,
		pour: (e) => !e.avant && e.pied >= 42
	},
	{
		id: "plongeon",
		emoji: "🤿",
		cle: "ml.act.plongeon",
		aide: "ml.act.plongeon.aide",
		famille: "ballon",
		duree: 2,
		recharge: 10,
		cout: 3
	},
	{
		id: "interception",
		emoji: "🦅",
		cle: "ml.act.interception",
		aide: "ml.act.interception.aide",
		famille: "defense",
		duree: 2.2,
		recharge: 50,
		cout: 3
	},
	{
		id: "contreRuck",
		emoji: "🐘",
		cle: "ml.act.contreRuck",
		aide: "ml.act.contreRuck.aide",
		famille: "defense",
		duree: 5,
		recharge: 24,
		cout: 5,
		pour: (e) => e.avant
	},
	{
		id: "chenille",
		emoji: "🐛",
		cle: "ml.act.chenille",
		aide: "ml.act.chenille.aide",
		famille: "attaque",
		duree: 4,
		recharge: 26,
		cout: 3,
		pour: (e) => e.numero === 9
	},
	{
		id: "appel",
		emoji: "🙋",
		cle: "ml.act.appel",
		aide: "ml.act.appel.aide",
		famille: "attaque",
		duree: 11,
		recharge: 14,
		cout: 0
	},
	{
		id: "soutien",
		emoji: "🤸",
		cle: "ml.act.soutien",
		aide: "ml.act.soutien.aide",
		famille: "attaque",
		duree: 8,
		recharge: 9,
		cout: 2
	},
	{
		id: "plaquage",
		emoji: "💥",
		cle: "ml.act.plaquage",
		aide: "ml.act.plaquage.aide",
		famille: "defense",
		duree: 4,
		recharge: 6,
		cout: 3
	},
	{
		id: "monter",
		emoji: "⬆️",
		cle: "ml.act.monter",
		aide: "ml.act.monter.aide",
		famille: "defense",
		duree: 6,
		recharge: 7,
		cout: 2
	},
	{
		id: "grattage",
		emoji: "🪝",
		cle: "ml.act.grattage",
		aide: "ml.act.grattage.aide",
		famille: "defense",
		duree: 8,
		recharge: 15,
		cout: 4
	},
	{
		id: "provoquer",
		emoji: "🗯️",
		cle: "ml.act.provoquer",
		aide: "ml.act.provoquer.aide",
		famille: "discipline",
		duree: 6,
		recharge: 45,
		cout: 0
	},
	{
		id: "frapper",
		emoji: "🥊",
		cle: "ml.act.frapper",
		aide: "ml.act.frapper.aide",
		famille: "discipline",
		duree: 6,
		recharge: 45,
		cout: 2
	},
	{
		id: "calmer",
		emoji: "✋",
		cle: "ml.act.calmer",
		aide: "ml.act.calmer.aide",
		famille: "discipline",
		duree: 6,
		recharge: 20,
		cout: 0
	}
].map((e) => [e.id, e]));
function En(e, t) {
	let n = e.lancement, r = n && n.index + 1 < n.chaine.length ? n.chaine[n.index + 1] : null;
	if (r && r.surLeTerrain && r.sanction <= 0 && A(t.pos, r.pos) <= 196) return r;
	let i = t.cote === "A" ? 1 : -1;
	return H(e, t.cote).filter((e) => e !== t && e.sanction <= 0 && (e.pos.x - t.pos.x) * i <= .6 && A(e.pos, t.pos) <= 196).sort((e, n) => A(e.pos, t.pos) - A(n.pos, t.pos))[0];
}
function Dn(e, t, n) {
	let r = t.cote === "A" ? 1 : -1, i = n * r;
	return H(e, t.cote).filter((e) => e !== t && e.sanction <= 0 && (e.pos.x - t.pos.x) * r <= .6 && (e.pos.y - t.pos.y) * i > 1 && A(e.pos, t.pos) <= 196).sort((e, n) => A(e.pos, t.pos) - A(n.pos, t.pos))[0];
}
function On(e, ...t) {
	return e.controle && !!e.intention && t.includes(e.intention.type);
}
function kn(e) {
	e.intention = null;
}
function An(e, t) {
	let n = t.cote === "A" ? 1 : -1, r = H(e, N(t.cote)).filter((e) => e.sanction <= 0 && e.battu <= 0 && (e.pos.x - t.pos.x) * n > -1 && (e.pos.x - t.pos.x) * n < 20).map((e) => e.pos.y).sort((e, t) => e - t);
	if (!r.length) return 70;
	let i = [
		0,
		...r,
		70
	], a = 0;
	for (; a < i.length - 2 && i[a + 1] < t.pos.y;) a++;
	let o = 0;
	for (let e = Math.max(0, a - 1); e <= Math.min(i.length - 2, a + 1); e++) o = Math.max(o, i[e + 1] - i[e]);
	return o < 4 ? 0 : o;
}
function jn(e, t) {
	let n = t.cote === "A" ? 1 : -1, r = Infinity;
	for (let i of H(e, N(t.cote))) i.sanction > 0 || i.battu > 0 || (i.pos.x - t.pos.x) * n < -.2 || (r = Math.min(r, A(i.pos, t.pos)));
	return r === Infinity ? 99 : Math.sqrt(r);
}
//#endregion
//#region src/lib/moteur/elan.ts
var Mn = {
	turnover: .5,
	percee: .26,
	essai: .42,
	plaquageDur: .1,
	enAvant: -.24,
	penalite: -.14
};
function Nn(e, t) {
	return t === "A" ? e.elan : -e.elan;
}
function Pn(e, t, n) {
	let r = (t === "A" ? 1 : -1) * n, i = r > 0 ? 1 - e.elan : 1 + e.elan;
	e.elan = Math.max(-1, Math.min(1, e.elan + r * Math.min(1, i / 1.2)));
}
function Fn(e, t) {
	e.elan *= .5 ** (t / 40), Math.abs(e.elan) < .002 && (e.elan = 0);
}
var In = .06;
function Ln(e, t) {
	return Nn(e, t) * In;
}
//#endregion
//#region src/lib/moteur/plan.ts
var Rn = 6.7, zn = .3;
function Bn(e, t) {
	if (e <= 0) return {
		essaisTransformes: 0,
		essaisSecs: 0,
		penalites: 0
	};
	let n = e / Rn, r = e * zn / 3, i = {
		essaisTransformes: 0,
		essaisSecs: 0,
		penalites: 0
	}, a = Infinity;
	for (let o = 0; o * 7 <= e; o++) for (let s = 0; o * 7 + s * 5 <= e; s++) {
		let c = e - o * 7 - s * 5;
		if (c % 3 != 0) continue;
		let l = c / 3, u = o + s, d = Math.abs(u - n) * 1.15 + Math.abs(l - r) * 1;
		u > 0 && (d += Math.abs(s / u - .22) * 3.6), l > 4 && (d += (l - 4) * 2.2), l > 6 && (d += (l - 6) * 4), u === 0 && e >= 15 && (d += 6), d += t() * .55, d < a && (a = d, i = {
			essaisTransformes: o,
			essaisSecs: s,
			penalites: l
		});
	}
	return i;
}
//#endregion
//#region src/lib/moteur/regroupements.ts
function Vn(e) {
	if (!e.ruck) return;
	let t = !!e.cadenceDetaillee, n = (n) => {
		if (!t) return k(n.pos, e.ballon);
		let r = {
			x: n.pos.x + n.vitesse.x * .45,
			y: n.pos.y + n.vitesse.y * .45
		};
		return k(r, e.ballon) + Math.max(0, (r.x - e.ballon.x) * M(n.cote)) * 1.2;
	}, r = (r) => e.pions.filter((n) => n.surLeTerrain && n.sanction <= 0 && n.avant && (!t || !n.corps) && n.cote === e.possession === r && n.id !== e.ruck?.porteurId && n.id !== e.ruck?.plaqueurId).map((e) => ({
		p: e,
		c: n(e)
	})).sort((e, t) => e.c - t.c).slice(0, r ? 3 : 2).map((e) => e.p.id);
	e.ruck.organisation = {
		debut: e.sim,
		origine: { ...e.ballon },
		attaque: r(!0),
		defense: r(!1),
		contacts: [],
		animations: {}
	};
}
var Hn = 20, Un = 9;
function Wn(e) {
	let t = e.ruck;
	if (!t) return;
	t.organisation || Vn(e);
	let n = t.organisation, r = /* @__PURE__ */ new Set([
		...n.attaque,
		...n.defense,
		t.porteurId,
		t.plaqueurId
	]), i = (t) => t.surLeTerrain && t.sanction <= 0 && !t.corps && t.cote === e.possession && !r.has(t.id), a = n.relayeurId ? e.pions.find((e) => e.id === n.relayeurId) : void 0, o = e.pions.find((t) => t.numero === 9 && t.cote === e.possession);
	if (o && i(o) && k(o.pos, e.ballon) <= (e.cadenceDetaillee ? Un : Hn) && !(a && a !== o && i(a) && k(a.pos, e.ballon) < 2.5)) return n.relayeurId = o.id, o;
	if (a && i(a)) return a;
	let s = M(e.possession), c = e.pions.filter((e) => i(e) && e.numero !== 9), l, u = Infinity;
	for (let t of c) {
		let n = Math.max(0, (t.pos.x - e.ballon.x) * s), r = k(t.pos, e.ballon) + n * .8 - t.passe * .03;
		r < u && (u = r, l = t);
	}
	if (e.cadenceDetaillee && (!l || k(l.pos, e.ballon) > 6)) {
		let r = (e.possession === t.attaque ? n.attaque : n.defense).map((t) => e.pions.find((e) => e.id === t)).filter((e) => !!e && e.surLeTerrain && e.sanction <= 0 && !e.corps), i = r[r.length - 1];
		i && (l = i);
	}
	return n.relayeurId = l?.id, l;
}
function Gn(e, t = 3.2) {
	let n = e.ruck, r, i = t;
	for (let t of e.pions) {
		if (!t.surLeTerrain || t.sanction > 0 || t.corps || t.cote !== e.possession || t.id === n?.porteurId) continue;
		let a = k(t.pos, e.ballon);
		a < i && (i = a, r = t);
	}
	return r && n?.organisation && (n.organisation.relayeurId = r.id), r;
}
function Kn(e, t) {
	if (e.phase !== "ruck" || !e.ruck || t.numero !== 9 || t.cote !== e.possession || (e.ruck.organisation || Vn(e), Wn(e) !== t)) return !1;
	let n = e.ruck.organisation;
	return n.attaque.length < 2 ? !1 : (n.chenille ??= {
		neufId: t.id,
		debut: e.sim
	}, n.chenilleEssayee = !0, e.minuteur = Math.max(e.minuteur, 4.5), e.ballonLent = !0, !0);
}
function qn(e) {
	if (e.phase !== "ruck" || !e.ruck) return;
	e.ruck.organisation || Vn(e);
	let t = e.ruck.organisation, n = M(e.possession), r = t.chenille ? t.origine : e.ballon;
	e.placement ??= {};
	let i = (t, n) => {
		let r = e.pions.find((e) => e.id === t && e.surLeTerrain && e.sanction <= 0);
		r && (r.role = "ruck", r.cible = {
			x: j(n.x, 11.5, 110.5),
			y: j(n.y, 1.2, 68.8)
		}, e.placement[t] = { ...r.cible });
	};
	t.attaque.forEach((e, a) => i(e, t.chenille ? {
		x: r.x - n * (.7 + a * .85),
		y: r.y + (a % 2 ? .12 : -.12)
	} : {
		x: r.x - n * (a < 2 ? .5 : 1.25),
		y: r.y + (a === 0 ? -.42 : a === 1 ? .42 : 0)
	})), t.defense.forEach((e, t) => i(e, {
		x: r.x + n * .5,
		y: r.y + (t === 0 ? -.42 : .42)
	}));
	let a = t.relayeurId, o = Wn(e);
	if (a && a !== o?.id) {
		delete e.placement[a];
		let t = e.pions.find((e) => e.id === a);
		t && t.role === "ruck" && (t.role = "ligne");
	}
	o && (i(o.id, e.cadenceDetaillee && !t.chenille ? {
		x: r.x - n * 2.05,
		y: r.y - .25
	} : {
		x: r.x - n * (t.chenille ? 3.45 : 1.65),
		y: r.y - .35
	}), o.effort = Math.max(o.effort, .95));
}
function Jn(e, t) {
	let n = e.phase === "ruck" ? e.ruck?.organisation : void 0;
	if (!n) return;
	let r = (t) => e.pions.find((e) => e.id === t && e.surLeTerrain && e.sanction <= 0), i = (t, r, i = 1.1) => {
		e.sim < (n.animations[t.id] ?? 0) || (B(e, t, r, i), n.animations[t.id] = e.sim + i);
	}, a = r(e.ruck.porteurId ?? ""), o = r(e.ruck.plaqueurId ?? "");
	a && e.sim - n.debut > 1.2 && e.sim - n.debut < 2.5 && i(a, "present", 1.3), o && e.sim - n.debut > 1.45 && e.sim - n.debut < 2.6 && i(o, "roll_away", 1.1);
	for (let e of [...n.attaque, ...n.defense]) {
		let t = r(e);
		if (!t || t.corps) continue;
		if (k(t.pos, t.cible) > 1) {
			i(t, "support_arrive", .75);
			continue;
		}
		let a = n.attaque.includes(e);
		i(t, n.chenille && a ? "caterpillar_bind" : a ? "ruck_bind" : "counter_ruck");
	}
	if (!n.chenille) for (let t of n.attaque) {
		let i = r(t);
		if (!i || i.corps) continue;
		let a = n.defense.map(r).find((e) => e && !e.corps && k(i.pos, e.pos) < .95);
		if (!a) continue;
		let o = `${i.id}:${a.id}`;
		if (n.contacts.includes(o)) continue;
		n.contacts.push(o);
		let s = Math.hypot(i.vitesse.x - a.vitesse.x, i.vitesse.y - a.vitesse.y), c = a.pos.x - i.pos.x, l = a.pos.y - i.pos.y, u = Math.max(.1, Math.hypot(c, l)), d = j(1.5 + s * .35 + (i.puissance - a.puissance) / 60, 1, 3.8);
		B(e, i, "clearout_drive", 1.25), n.animations[i.id] = e.sim + 1.25, B(e, a, "contact_brace", 1.25), n.animations[a.id] = e.sim + 1.25, a.vitesse.x += c / u * d, a.vitesse.y += l / u * d, i.vitesse.x -= c / u * d * .25, i.vitesse.y -= l / u * d * .25, s > 1.8 && i.puissance > a.puissance + 8 && V(a, {
			x: c / u * d,
			y: l / u * d
		}, 1.65);
	}
	if (n.chenille) {
		let t = r(n.chenille.neufId);
		if (!t || t.corps) {
			delete n.chenille;
			return;
		}
		let a = n.attaque.map(r).filter((e) => !!e), o = a.length >= 2 && a.every((e) => !e.corps && k(e.pos, e.cible) < .95) && k(t.pos, t.cible) < .8;
		o ? n.chenille.pretDepuis === void 0 && (n.chenille.pretDepuis = e.sim) : delete n.chenille.pretDepuis;
		let s = n.chenille.pretDepuis === void 0 ? 0 : j((e.sim - n.chenille.pretDepuis) / 1.2, 0, 1);
		e.ballon = {
			x: n.origine.x + (t.pos.x - n.origine.x) * s,
			y: n.origine.y + (t.pos.y - n.origine.y) * s
		}, o && i(t, "box_setup", 1.2);
	}
}
//#endregion
//#region src/lib/moteur/routinesButeur.ts
var Yn = [
	{
		id: "wilkinson",
		nom: "La Prière de Jonny",
		emoji: "🧘‍♂️",
		categorie: "legendaire",
		description: "Buste fléchi, mains jointes devant la poitrine, coudes rentrés et concentration chirurgicale.",
		clip: "routine_wilkinson",
		reculMetres: 7.5,
		decalageLateral: -2.2,
		commentaires: [
			"{nom} s’accroupit, joint les deux mains devant le buste et lance sa légendaire prière.",
			"Concentration chirurgicale pour {nom} qui adopte la posture mythique de Jonny Wilkinson.",
			"{nom} les mains unies face aux poteaux, le stade retient son souffle."
		]
	},
	{
		id: "farrell",
		nom: "Le Regard du Loup",
		emoji: "🐺",
		categorie: "classique",
		description: "Buste droit, tête pivotant alternativement de gauche à droite pour fixer les poteaux et le ballon.",
		clip: "routine_farrell",
		reculMetres: 7,
		decalageLateral: 0,
		commentaires: [
			"{nom} fixe les perches puis le ballon dans un regard de braise façon Owen Farrell.",
			"Le regard noir de {nom} : les yeux scannent les montants avec une froideur absolue.",
			"{nom} balaie les perches du regard, la cible est verrouillée."
		]
	},
	{
		id: "biggar_macarena",
		nom: "La Macarena de Dan Biggar",
		emoji: "🕺",
		categorie: "drole",
		description: "Touche son épaule gauche, puis droite, tire sur son short, replace sa mèche et recommence.",
		clip: "routine_biggar",
		reculMetres: 6.5,
		decalageLateral: -1,
		commentaires: [
			"{nom} lance sa fameuse « Macarena » : épaule, short, cheveux, tout y passe !",
			"Le rituel frénétique de {nom} régale le public : la Macarena est lancée.",
			"Épaule gauche, épaule droite, réajustement du short… le ballet de {nom} est au point."
		]
	},
	{
		id: "crabe_cook",
		nom: "Le Crabe de Rob Cook",
		emoji: "🦀",
		categorie: "drole",
		description: "Écartement des cuisses démesuré, buste baissé et bras ballants entre les genoux.",
		clip: "routine_crabe",
		reculMetres: 5.5,
		decalageLateral: -.5,
		commentaires: [
			"{nom} écarte les jambes au maximum et prend la position lunaire du crabe !",
			"Posture déroutante pour {nom} : accroupi en crabe, bras ballants entre les cuisses.",
			"Le style unique de {nom} fait sourire les supporters : la posture du crabe est de sortie."
		]
	},
	{
		id: "chaman_vent",
		nom: "L’Appel du Chaman",
		emoji: "🍃",
		categorie: "mystique",
		description: "S’accroupit, arrache quelques brins d’herbe, les lance en l’air et contemple le vent vers le ciel.",
		clip: "routine_chaman",
		reculMetres: 8,
		decalageLateral: 1.2,
		commentaires: [
			"{nom} jette une pincée de pelouse en l’air et consulte les esprits du vent.",
			"Rituel chamanique pour {nom} : les brins d’herbe volent, Éole donne sa bénédiction.",
			"{nom} lève la main au ciel et étudie la moindre brise d’un œil mystique."
		]
	},
	{
		id: "sniper",
		nom: "Le Tireur d’Élite",
		emoji: "🎯",
		categorie: "drole",
		description: "Ferme un œil, pointe les doigts en forme de canon de pistolet vers la barre transversale.",
		clip: "routine_sniper",
		reculMetres: 7.2,
		decalageLateral: -1.5,
		commentaires: [
			"{nom} ferme un œil et vise la transversale avec les doigts en pistolet : cible dans le mille !",
			"Mode sniper activé pour {nom} qui ajuste sa lunette imaginaire avant le tir.",
			"{nom} dégaine l’index droit pour aligner les perches avec une précision de tireur d’élite."
		]
	},
	{
		id: "cyborg_robot",
		nom: "Le Cyborg T-800",
		emoji: "🤖",
		categorie: "drole",
		description: "Mouvements robotiques saccadés à angle droit, calibrage automatique avant la frappe.",
		clip: "routine_robot",
		reculMetres: 6.8,
		decalageLateral: 0,
		commentaires: [
			"{nom} passe en pilotage automatique : gestes robotiques et calcul balistique en cours.",
			"Bip boup ! {nom} calibre ses servomoteurs avant d’armer sa jambe bionique.",
			"{nom} pivote à 90 degrés avec la raideur d’un androïde programmé pour scorer."
		]
	},
	{
		id: "flamant_rose",
		nom: "Le Flamant Rose",
		emoji: "🦩",
		categorie: "drole",
		description: "Se tient en équilibre sur une seule jambe, pied posé contre le genou, bras déployés.",
		clip: "routine_flamant",
		reculMetres: 6.2,
		decalageLateral: .8,
		commentaires: [
			"{nom} se dresse sur une seule jambe comme un flamant rose en pleine séance de yoga.",
			"Équilibre parfait : {nom} teste ses appuis sur un pied avec une grâce inattendue.",
			"{nom} s’étire sur une patte, aile déployée, avant de reposer son crampon d’appui."
		]
	},
	{
		id: "moine_zen",
		nom: "Le Moine Shaolin",
		emoji: "🧘",
		categorie: "mystique",
		description: "Paumes ouvertes vers le ciel, yeux mi-clos, respiration abdominale lente et paix totale.",
		clip: "routine_zen",
		reculMetres: 7.5,
		decalageLateral: -.5,
		commentaires: [
			"{nom} fait le vide total. Silence de cathédrale pour la méditation du maître.",
			"{nom} inspire la paix et expire la pression dans un souffle digne d’un temple Shaolin.",
			"Sérénité absolue : {nom} entre dans sa bulle intérieure, insensible aux sifflets."
		]
	},
	{
		id: "souffle_ramos",
		nom: "Le Souffle Glacial",
		emoji: "💨",
		categorie: "classique",
		description: "Mains sur les hanches, dos cambré, joue gonflée qui souffle longuement vers les poteaux.",
		clip: "routine_respiration",
		reculMetres: 7.8,
		decalageLateral: -1.8,
		commentaires: [
			"{nom} gonfle les joues, souffle un grand coup et défie les poteaux du regard.",
			"Le souffle rituel de {nom} : les épaules redescendent, la trajectoire est déjà tracée.",
			"{nom} expire toute la tension d’un souffle puissant avant de déclencher sa course."
		]
	},
	{
		id: "cowboy_duel",
		nom: "Le Cowboy du Crépuscule",
		emoji: "🤠",
		categorie: "drole",
		description: "Mains qui flottent au niveau de la ceinture prêtes à dégainer, regard plissé face au soleil.",
		clip: "routine_cowboy",
		reculMetres: 6.5,
		decalageLateral: -1,
		commentaires: [
			"{nom} prend la pose du cowboy face au saloon : les doigts frémissent au-dessus de la ceinture.",
			"Duel à midi pétante entre {nom} et la barre transversale : qui dégainera en premier ?",
			"{nom} ajuste son chapeau imaginaire, les mains prêtes à tirer plus vite que son ombre."
		]
	},
	{
		id: "penseur_rodin",
		nom: "Le Penseur de Rodin",
		emoji: "🗿",
		categorie: "drole",
		description: "Accroupi au ras du sol, coude sur le genou, menton posé sur le poing, immobile.",
		clip: "routine_penseur",
		reculMetres: 5.8,
		decalageLateral: 0,
		commentaires: [
			"{nom} se fige dans la posture du Penseur de Rodin : silence, une œuvre d’art se prépare.",
			"{nom} médite accroupi au sol dans une immobilité spectaculaire.",
			"Statue vivante sur le pré : {nom} prend son temps et contemple son chef-d’œuvre à venir."
		]
	},
	{
		id: "horloger_suisse",
		nom: "L’Horloger Suisse",
		emoji: "⏱️",
		categorie: "classique",
		description: "Tape ses crampons l’un contre l’autre, remonte ses chaussettes au millimètre près.",
		clip: "routine_horloger",
		reculMetres: 7,
		decalageLateral: -1.2,
		commentaires: [
			"{nom} tape ses crampons et réajuste ses chaussettes avec la minutie d’un horloger.",
			"Trois pas millimétrés, claquement sec des crampons : {nom} règle son balancier.",
			"La mécanique suisse de {nom} est en marche : tout est calibré à la seconde près."
		]
	},
	{
		id: "taureau_furieux",
		nom: "Le Taureau Furieux",
		emoji: "🐂",
		categorie: "drole",
		description: "Racle énergiquement la pelouse du crampon, tête basse dans les épaules, prêt à foncer.",
		clip: "routine_taureau",
		reculMetres: 8.5,
		decalageLateral: 0,
		commentaires: [
			"{nom} racle l’herbe du crampon comme un taureau prêt à charger dans l’arène.",
			"Le regard noir, {nom} laboure le gazon : la charge s’annonce destructrice.",
			"Tête rentrée dans les épaules, {nom} piétine avec rage avant de foncer sur le tee."
		]
	},
	{
		id: "danseur_etoile",
		nom: "Le Danseur Étoile",
		emoji: "🩰",
		categorie: "drole",
		description: "Demi-pointes, mouvements arrondis et gracieux des bras, pas chassé tout en légèreté.",
		clip: "routine_danseur",
		reculMetres: 6.4,
		decalageLateral: 1.5,
		commentaires: [
			"{nom} esquisse une demi-pointe tout en grâce : le ballet de la pénalité commence.",
			"Légèreté absolue pour {nom} qui se place comme un danseur de l’Opéra Garnier.",
			"{nom} enchaîne une arabesque aérienne avant de s’aligner face aux perches."
		]
	},
	{
		id: "baffes_guerrier",
		nom: "Les Baffes du Guerrier",
		emoji: "💥",
		categorie: "classique",
		description: "Deux grandes claques sonores sur les cuisses puis deux sur les joues pour monter en sève.",
		clip: "routine_claques",
		reculMetres: 7,
		decalageLateral: -1,
		commentaires: [
			"{nom} s’envoie deux énormes baffes sur les joues pour réveiller le fauve !",
			"Clac ! Clac ! {nom} se fouette les cuisses pour faire monter la testostérone.",
			"{nom} se gifle le visage pour chasser le doute : le regard s’embrase instantanément."
		]
	},
	{
		id: "grand_recul_steyn",
		nom: "Le Missile des 15m",
		emoji: "🚀",
		categorie: "legendaire",
		description: "Recul interminable de 11.5 mètres (façon Frans Steyn) pour armer un coup de canon.",
		clip: "routine_grand_recul",
		reculMetres: 11.5,
		decalageLateral: -2.5,
		commentaires: [
			"{nom} recule jusqu’au rond central ! C’est le grand recul façon Frans Steyn.",
			"Onze mètres d’élan pour {nom} : les perches tremblent déjà devant ce missile en approche.",
			"{nom} prend tout le champ nécessaire pour libérer la foudre de son coup de pied."
		]
	},
	{
		id: "hypnotiseur",
		nom: "L’Hypnotiseur",
		emoji: "🌀",
		categorie: "mystique",
		description: "Balancement pendulaire continu du buste de gauche à droite pour magnétiser le ballon.",
		clip: "routine_hypnose",
		reculMetres: 7,
		decalageLateral: .5,
		commentaires: [
			"{nom} oscille d’un côté à l’autre comme un pendule pour hypnotiser le ballon.",
			"Le ballon semble magnétisé par les balancements lents et captivants de {nom}.",
			"{nom} berce la défense et les poteaux dans une transe hypnotique."
		]
	},
	{
		id: "caresse_tee",
		nom: "L’Amoureux du Tee",
		emoji: "🏉",
		categorie: "classique",
		description: "Replace le ballon trois fois au millimètre, caresse l’ogive avec une infinie tendresse.",
		clip: "routine_caresse",
		reculMetres: 6.5,
		decalageLateral: -1.5,
		commentaires: [
			"{nom} dorlote son ballon au tee : la valve inclinée au dixième de degré près.",
			"{nom} bichonne son tee avec un soin maniaque avant de reculer à pas feutrés.",
			"Une petite caresse d’adieu sur le cuir et {nom} se replace avec confiance."
		]
	},
	{
		id: "salut_ninja",
		nom: "Le Salut Martial",
		emoji: "🥋",
		categorie: "drole",
		description: "Salut martial solennel poing contre paume face aux perches puis prise de garde défensive.",
		clip: "routine_ninja",
		reculMetres: 7.2,
		decalageLateral: -.8,
		commentaires: [
			"{nom} salue solennellement les poteaux poing dans la paume : respect et frappe létale.",
			"Posture d’arts martiaux pour {nom} : le ballon n’a aucune chance d’esquiver.",
			"{nom} s’incline respectueusement face à la barre transversale avant le coup décisif."
		]
	}
], Xn = new Map(Yn.map((e) => [e.id, e])), Zn = {
	wilkinson: "wilkinson",
	carter: "wilkinson",
	farrell: "farrell",
	sexton: "farrell",
	biggar: "biggar_macarena",
	ramos: "souffle_ramos",
	parra: "souffle_ramos",
	steyn: "grand_recul_steyn",
	hogg: "grand_recul_steyn",
	barrett: "farrell",
	pollard: "wilkinson",
	ntamack: "moine_zen",
	jaminet: "sniper",
	jalibert: "souffle_ramos",
	carbonel: "souffle_ramos",
	ford: "farrell",
	hastings: "farrell",
	cook: "crabe_cook",
	russell: "danseur_etoile"
};
function Qn(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t = (t << 5) - t + e.charCodeAt(n), t |= 0;
	return Math.abs(t);
}
function $n(e) {
	if (e.routineButeur && Xn.has(e.routineButeur)) return Xn.get(e.routineButeur);
	let t = (e.nom ?? "").toLowerCase();
	for (let [e, n] of Object.entries(Zn)) if (t.includes(e)) {
		let e = Xn.get(n);
		if (e) return e;
	}
	return Yn[Qn(e.sourceId || e.id || e.nom || "buteur") % Yn.length];
}
//#endregion
//#region src/lib/moteur/duels.ts
var er = (e) => e.poidsKg ?? (e.avant ? 108 : 90), tr = (e) => Math.hypot(e.vitesse.x, e.vitesse.y);
function nr(e) {
	let t = tr(e);
	return t > .6 ? {
		x: e.vitesse.x / t,
		y: e.vitesse.y / t
	} : {
		x: M(e.cote),
		y: 0
	};
}
function rr(e, t) {
	return (t.plaquage + t.puissance) / 2 - (e.puissance * .62 + e.evitement * .38) + (er(t) - er(e)) / 6;
}
function ir(e, t, n) {
	let r = nr(e), i = t.pos.x - e.pos.x, a = t.pos.y - e.pos.y, o = Math.max(.01, Math.hypot(i, a)), s = (i * r.x + a * r.y) / o, c = s > .45 ? "face" : s < -.3 ? "dos" : "cote", l = ((e.vitesse.x - t.vitesse.x) * i + (e.vitesse.y - t.vitesse.y) * a) / o, u = rr(e, t), d = tr(e), f = tr(t), p;
	p = c === "dos" ? o > .95 && f > 5.5 ? "poursuite" : "arriere" : c === "cote" ? u < -7 || d > 6.5 && o > .9 ? "jambes" : "cote" : l >= 6.2 && u >= 5.5 && f >= 2.8 ? "dominant" : u >= 9 && d < 4 ? "debout" : u <= -8 ? "jambes" : u <= -3 && d >= 4.5 ? "accroche" : n > 0 ? "taille" : "haut";
	let m = p === "dominant" ? j(.7 + (l - 6.2) * .22 + u / 14, .7, 2.4) : p === "accroche" ? -j(.6 - u / 9 + (d - 4.5) * .2, .6, 1.8) : 0;
	return {
		type: p,
		angle: c,
		fermeture: l,
		rapport: u,
		recul: m
	};
}
function ar(e, t) {
	let n = (e.puissance - t.puissance) / 9 + (er(e) - er(t)) / 13 + (tr(e) - 4.5) / 2.6;
	return n >= 2.1 && tr(e) >= 5.2 ? "tombe" : n >= .7 ? "equilibre" : "repousse";
}
function or(e, t) {
	return e.avant || er(e) >= 104 ? "percussion" : er(t) > er(e) + 6 ? "epaule" : "torse";
}
function sr(e, t) {
	return (e.evitement - t.plaquage) / 12 + (tr(t) - 3) / 2.2 + (e.vitesseMax - t.vitesseMax) / 1.5 >= .9 ? "contrepied" : "elimine";
}
function cr(e, t, n, r) {
	return tr(e) < 3.6 ? "feinte" : e.evitement >= 76 && r > 0 ? "double" : t === n ? "exterieur" : "interieur";
}
function lr(e, t, n, r, i) {
	return j((.008 + e.passe / 2900 + e.vision / 5800 + Math.max(0, e.puissance - 60) / 2400 + (i ? .07 : 0)) * {
		jambes: 1.55,
		poursuite: 1.45,
		accroche: 1.4,
		arriere: 1.15,
		cote: 1.05,
		taille: .95,
		haut: .6,
		debout: .5,
		dominant: .2
	}[t.type] * (n ? 1.3 : .55) * (r >= 2 ? .55 : 1), 0, .3);
}
function ur(e, t, n) {
	return j(.09 + (70 - e.passe) / 260 + (t.type === "dominant" ? .2 : t.type === "haut" || t.type === "debout" ? .08 : 0) + Math.max(0, n - 1) * .06 + Math.max(0, 50 - e.endurance) / 300, .05, .5);
}
function dr(e, t, n) {
	return e.type === "jambes" || e.type === "poursuite" ? "sol" : t && n > 0 ? "dos" : e.type === "accroche" || e.type === "cote" ? "une-main" : "deux-mains";
}
//#endregion
//#region src/lib/moteur/trajectoire.ts
var fr = 9.81;
function pr(e, t = 0) {
	let n = Math.max(0, Math.min(e.duree, e.ecoule + t)), r = n / Math.max(.001, e.duree), i = e.type === "pied", a = i ? (1 - Math.exp(-.18 * n)) / (1 - Math.exp(-.18 * e.duree)) : r, o = e.intention === "rasant", s = i ? .26 : 1.05, c = i ? .12 : 1.05, l = i && !o ? s + ((c - s) / e.duree + .5 * fr * e.duree) * n - .5 * fr * n * n : s + (c - s) * r + 4 * Math.max(.08, e.hauteur) * r * (1 - r);
	return {
		x: e.de.x + (e.vers.x - e.de.x) * a,
		y: e.de.y + (e.vers.y - e.de.y) * a,
		hauteur: l
	};
}
function mr(e, t) {
	return .26 + (-.14 / e + .5 * fr * e) * t - .5 * fr * t * t;
}
function hr(e, t) {
	let n = ((t === "A" ? 111 : 11) - e.de.x) / (e.vers.x - e.de.x);
	if (!Number.isFinite(n) || n <= 0 || n > 1) return null;
	let r = -Math.log(1 - n * (1 - Math.exp(-.18 * e.duree))) / .18;
	return {
		ecart: e.de.y + (e.vers.y - e.de.y) * n - 35,
		hauteur: mr(e.duree, r)
	};
}
function gr(e, t) {
	let n = hr(e, t);
	return !!n && Math.abs(n.ecart) < 2.8 && n.hauteur > 3;
}
var _r = (e) => Math.max(1.65, Math.min(2.55, e));
function vr(e, t, n, r, i, a) {
	let o = M(t), s = t === "A" ? 111 : 11, c = Math.max(1, (s - e.x) * o);
	if (!n && c > 36 && i < .34) {
		let t = {
			x: s - o * (1.5 + a * 5),
			y: 35 + (r - .5) * 9
		};
		return {
			vers: t,
			duree: _r(1.35 + Math.hypot(t.x - e.x, t.y - e.y) / 34),
			issue: "court"
		};
	}
	let l = r < .5 ? -1 : 1, u = n ? (i - .5) * 3.2 : l * (3.9 + i * 3.4), d = Math.min(9.5, 6 + a * 3.5), f = (t) => e.y + (35 + u - e.y) * (c + t) / c;
	for (; d > 1 && (f(d) < 1.5 || f(d) > 68.5);) d -= .5;
	let p = {
		x: s + o * d,
		y: f(d)
	}, m = _r(1.35 + Math.hypot(p.x - e.x, p.y - e.y) / 34);
	if (n) for (; m < 3.6 && (hr({
		de: e,
		vers: p,
		duree: m
	}, t)?.hauteur ?? 0) < 3.8;) m += .08;
	return {
		vers: p,
		duree: m,
		issue: n ? "dedans" : l < 0 ? "gauche" : "droite"
	};
}
//#endregion
//#region src/lib/moteur/moteur.ts
var K = .15, yr = 2400, br = 1.6, xr = {
	melee: {
		visuel: 6.2,
		horloge: 50,
		direct: 9.5
	},
	touche: {
		visuel: 6.5,
		horloge: 35,
		direct: 8.5
	},
	transformation: {
		visuel: 45,
		horloge: 45,
		direct: 45
	},
	tirAuBut: {
		visuel: 45,
		horloge: 45,
		direct: 45
	},
	coupEnvoi: {
		visuel: 4.5,
		horloge: 22,
		direct: 5
	},
	renvoi22: {
		visuel: 7,
		horloge: 20,
		direct: 7
	},
	apresEssai: {
		visuel: 3,
		horloge: 8,
		direct: 3
	},
	penalite: {
		visuel: 2.5,
		horloge: 12,
		direct: 3
	},
	tmo: {
		visuel: 3.6,
		horloge: 0,
		direct: 3.6
	},
	miTemps: {
		visuel: 3,
		horloge: 0,
		direct: 3
	},
	bagarre: {
		visuel: 6,
		horloge: 0,
		direct: 6
	}
};
function Sr(e, t = !1) {
	if (t) return 1;
	let n = xr[e];
	return n ? n.horloge / n.visuel : 1;
}
function Cr(e, t) {
	let n = xr[t], r = n ? e.tempsReel ? n.direct : n.visuel : 3;
	return e.cadenceDetaillee && t === "melee" && (r = wr), e.dureeArret = r, r;
}
var q = {
	liaison: 3.6,
	impact: 1.2,
	introduction: 1.6,
	poussee: 3.6,
	sortie: 1
}, wr = q.liaison + q.impact + q.introduction + q.poussee + q.sortie, Tr = {
	celebration: 6,
	ramassage: 1.5,
	pose: 9.6,
	pret: 1.8,
	elan: 2.25
};
function Er(e) {
	let t = xr[e.phase];
	if (!t) return 8;
	let n = e.phase === "melee" ? wr : t.visuel;
	return Math.min(8, t.horloge / Math.max(1, n));
}
function Dr(e) {
	let t = e.dureeArret ?? 0;
	return t > 0 ? j(1 - e.minuteur / t, 0, 1) : 1;
}
function Or(e) {
	let t = Dr(e);
	if (e.conquete && (e.conquete.progression = t), e.phase === "melee") {
		if (e.conquete?.melee) return;
		let n = Math.max(0, 1 - t / .45) * 1.7, r = (t) => H(e, t).filter((e) => e.avant), i = sa(e, r(e.possession), e.possession) - sa(e, r(N(e.possession)), N(e.possession)), a = e.bonusConqueteArcade?.type === "melee" ? e.bonusConqueteArcade.scores : void 0, o = j((i + ((a?.[e.possession] ?? 0) - (a?.[N(e.possession)] ?? 0)) * 8) / 10, -1, 1), s = Math.abs(o) < .16 ? 0 : Math.abs(o) < .35 ? o < 0 ? -.35 : .35 : o, c = Math.max(0, t - .48) / .52 * s * 4 * M(e.possession);
		e.conquete && (e.conquete.pousseVers = s === 0 ? void 0 : s > 0 ? e.possession : N(e.possession));
		for (let t of e.pions) !t.surLeTerrain || t.role !== "melee" || (t.cible = {
			x: t.cible.x - M(t.cote) * n + c,
			y: t.cible.y
		});
		return;
	}
	if (e.phase === "touche") {
		let n = e.ballon.y < 35 ? 0 : 70, r = n === 0 ? 1 : -1, i = Math.max(0, 1 - t / .6);
		for (let t of e.pions) {
			if (!t.surLeTerrain || t.role !== "alignement") continue;
			let e = Math.abs(t.cible.y - n);
			t.cible = {
				x: t.cible.x - M(t.cote) * i * .8,
				y: j(n + r * (e * (1 + i * .14)), 2.5, 67.5)
			};
		}
		let a = e.conquete;
		if (a?.type === "touche") {
			let i = H(e, e.possession).filter((e) => e.role === "alignement").sort((e, t) => Math.abs(e.cible.y - n) - Math.abs(t.cible.y - n)), o = H(e, e.possession).find((e) => e.id === a.cibleId), s = a.combinaison === "leurreDevant" ? i.find((e) => e !== o) : void 0, c = Math.sin(Math.PI * j((t - .3) / .48, 0, 1));
			if (s && (s.cible.y = j(s.cible.y + r * 2.2 * c, 2.5, 67.5)), o) {
				if (a.horsAlignement && a.reception) {
					let n = e.placement?.[o.id] ?? o.pos, r = j((t - .52) / .43, 0, 1);
					o.cible = {
						x: n.x + (a.reception.x - n.x) * r,
						y: n.y + (a.reception.y - n.y) * r
					};
					return;
				}
				o.cible.y = j(o.cible.y - r * 1.25 * c, 2.5, 67.5), o.cible.x += M(o.cote) * .55 * Math.sin(Math.PI * j((t - .62) / .34, 0, 1));
				let s = i.filter((e) => e !== o).sort((e, t) => Math.abs(e.cible.y - o.cible.y) - Math.abs(t.cible.y - o.cible.y)).slice(0, 2), l = j((t - .48) / .28, 0, 1);
				s.forEach((e, t) => {
					let n = t === 0 ? -1 : 1;
					e.cible.x += (o.cible.x - e.cible.x) * l * .72, e.cible.y += (o.cible.y + r * n * .62 - e.cible.y) * l;
				});
				let u = a.sortie === "peel" ? i.find((e) => e.id === a.peelId) : void 0;
				if (u && u !== o && !s.includes(u)) {
					let e = j((t - .66) / .3, 0, 1), a = Math.max(...i.map((e) => Math.abs(e.cible.y - n)));
					u.cible = {
						x: u.cible.x + (o.cible.x - M(u.cote) * 1.9 - u.cible.x) * e,
						y: u.cible.y + (j(n + r * (a + 2.4), 2.5, 67.5) - u.cible.y) * e
					};
				}
			}
		}
		return;
	}
	if ((e.phase === "tirAuBut" || e.phase === "transformation") && e.tir && !e.tir.volLance) {
		if (e.tir.etape) return;
		let n = e.tir.buteur;
		if (!n.surLeTerrain) return;
		let r = e.tir.routine ?? $n(n), i = r.reculMetres, a = r.decalageLateral, o = t < .25 ? 0 : t < .5 ? (t - .25) / .25 * i : t < .92 ? i : Math.max(0, (1 - t) / .08) * i, s = t < .25 ? 0 : t < .5 ? (t - .25) / .25 * a : t < .92 ? a : Math.max(0, (1 - t) / .08) * a, c = e.tir.lieu ?? e.ballon, l = (n.cote === "A" ? 111 : 11) - c.x, u = 35 - c.y, d = Math.max(.01, Math.hypot(l, u)), f = l / d, p = u / d;
		if (n.cible = {
			x: c.x - f * o - p * s,
			y: j(c.y - p * o + f * s, 2.5, 67.5)
		}, t >= .92 && (n.effort = 1.1), e.phase === "transformation" && t >= .96) {
			let t = H(e, N(n.cote)).filter((e) => e.sanction <= 0).sort((t, n) => A(t.pos, e.ballon) - A(n.pos, e.ballon));
			for (let n of t.slice(0, 3)) n.role = "chasseur", n.cible = {
				x: e.ballon.x,
				y: e.ballon.y
			}, n.effort = 1.05;
			for (let n of t.slice(3, 8)) n.role = "chasseur", n.cible = {
				x: e.ballon.x,
				y: n.pos.y
			}, n.effort = .85;
		}
	}
}
function kr(e, t) {
	let n = Bn(e, t);
	return {
		essaisTransformes: n.essaisTransformes,
		essaisSecs: n.essaisSecs,
		penalites: n.penalites,
		total: e,
		marques: 0
	};
}
var Ar = [
	"talonneur",
	"pilier_gauche",
	"pilier_droit",
	"deuxieme_ligne_d",
	"troisieme_aile_d",
	"demi_melee",
	"demi_ouverture",
	"deuxieme_centre"
];
function jr(e) {
	let t = [...e].sort((e, t) => t.note - e.note), n = /* @__PURE__ */ new Set(), r = (e, r) => {
		let i = o[e]?.famille, a = (o[e]?.categorie ?? "Avant") === "Avant", s = t.find((t) => !n.has(t) && t.poste === e) ?? t.find((e) => !n.has(e) && o[e.poste]?.famille === i) ?? t.find((e) => !n.has(e) && (o[e.poste]?.categorie ?? "Avant") === "Avant" === a) ?? (r ? t.find((e) => !n.has(e)) : void 0);
		return s && n.add(s), s;
	}, i = [];
	for (let e of _e) {
		let t = r(e, !0);
		if (!t) break;
		i.push({
			...t,
			poste: e
		});
	}
	let a = [];
	for (let e of Ar) {
		let t = r(e, !1);
		t && a.push({
			...t,
			poste: e
		});
	}
	return [...i, ...a];
}
function Mr(e, t, n, r, i, a, c, l, u = {}) {
	let d = u.rng ?? s("moteur2#" + c), f = [], p = (e, t, n) => {
		let r = t === "A" ? u.compositionA : u.compositionB, i = r?.length ? r.slice(0, 23) : jr(e);
		if (l && l.club === n) {
			let e;
			if (l.titulaire === !1) {
				let t = o[l.poste]?.famille, n = Ar.findIndex((e) => e === l.poste), r = Ar.findIndex((e) => o[e]?.famille === t);
				e = 15 + j(n >= 0 ? n : r >= 0 ? r : 7, 0, 7);
			} else {
				let t = _e.indexOf(l.poste);
				e = t >= 0 ? t : 9;
			}
			i[e] && (i[e] = {
				...i[e],
				nom: l.nom,
				poste: l.poste
			});
		}
		i.forEach((e, r) => {
			let i = !!l && l.club === n && e.nom === l.nom, a = Se(e, r, t, i, i ? l.attributs : void 0), o = t === "A" ? u.capitaineAId : u.capitaineBId, s = t === "A" ? u.buteurAId : u.buteurBId;
			a.capitaine = !!o && a.sourceId === o, a.buteur = !!s && a.sourceId === s, a.routineButeur = e.routineButeur, a.capitaine && (a.discipline += 4), f.push(a);
		});
	};
	p(n, "A", e), p(r, "B", t);
	for (let e of ["A", "B"]) if (f.some((t) => t.cote === e && t.capitaine)) for (let t of f) t.cote === e && (t.discipline += 1);
	let m = d() < .5 ? "A" : "B", h = {
		clubA: e,
		clubB: t,
		t: 0,
		sim: 0,
		reliquat: 0,
		minute: 0,
		periode: 1,
		sirene: !1,
		phase: "coupEnvoi",
		minuteur: xr.coupEnvoi.visuel,
		pions: f,
		ballon: {
			x: 61,
			y: 35
		},
		porteur: null,
		possession: m,
		vol: null,
		volsRecents: [],
		conquete: null,
		ballonLibre: null,
		ruck: null,
		aplatissage: null,
		lancement: null,
		ouvert: 1,
		phasesDepuisArret: 0,
		ligneAvantage: 61,
		origine: {
			x: 61,
			y: 35
		},
		metresGagnesPhase: 0,
		ballonLent: !1,
		derniereTouche: null,
		dernierPasseur: null,
		perceeSignalee: !1,
		aide: 0,
		systeme: "blitz",
		ligneDef: 61,
		horsJeu: 61,
		gardeRuck: 0,
		scoreA: 0,
		scoreB: 0,
		planA: kr(i, d),
		planB: kr(a, d),
		cibleBaseA: i,
		cibleBaseB: a,
		ajustementTactiqueA: 0,
		ajustementTactiqueB: 0,
		tactiques: {},
		essaisA: 0,
		essaisB: 0,
		sifflet: null,
		compteurs: {
			rucks: 0,
			melees: 0,
			touches: 0,
			percees: 0,
			irregularites: 0,
			enAvants: 0,
			tempsA: 0,
			tempsB: 0
		},
		placement: null,
		cibleRenvoi: null,
		tir: null,
		penalite: null,
		remplacementsA: 0,
		remplacementsB: 0,
		remplacementsDemandes: {},
		prochaineDecision: 1,
		compteur: 0,
		commentaires: [],
		fini: !1,
		rng: d,
		tempsReel: u.tempsReel,
		cadenceDetaillee: u.cadenceDetaillee,
		placementJoue: u.placementJoue,
		resserrement: u.resserrement,
		styles: u.cadenceDetaillee ? {
			A: vi(e),
			B: vi(t)
		} : void 0,
		scoreSurTerrain: u.scoreSurTerrain ?? !0,
		meteoTir: u.meteoTir,
		niveau: u.niveau ?? "pro",
		controle: u.controle ?? !1,
		intention: null,
		recharges: {},
		perceeJoueur: !1,
		echappee: null,
		elan: 0,
		dernierTurnover: null,
		echos: [],
		tension: 0,
		bagarre: null,
		bulles: [],
		prochaineFriction: 12,
		discipline: Ge()
	};
	h.minuteur = Cr(h, "coupEnvoi"), h.cibleRenvoi = {
		x: 61 + M(m) * 30,
		y: j(35 + (d() < .5 ? 1 : -1) * 16, 8, 62)
	}, h.placement = Ie(f, m, h.cibleRenvoi);
	for (let e of f) {
		let t = h.placement[e.id];
		t && (e.pos = {
			x: t.x,
			y: t.y
		}, e.cible = {
			x: t.x,
			y: t.y
		}, F(e));
	}
	return J(h, "jalon", null, z("coupEnvoiMatch", {
		clubA: e,
		clubB: t
	})), (u.cohesionA !== void 0 || u.cohesionB !== void 0) && (h.cohesion = {
		A: u.cohesionA,
		B: u.cohesionB
	}), u.tactiqueA && Ja(h, "A", u.tactiqueA, !1), u.tactiqueB && Ja(h, "B", u.tactiqueB, !1), h;
}
function Nr(e, t) {
	if (e.fini) return;
	e.reliquat += t;
	let n = 0;
	for (; e.reliquat >= .15 && !e.fini && n++ < 4e4;) {
		e.reliquat -= K, Pr(e);
		let t = e.vol;
		if (e.phase === "ballonEnLAir" && t?.type === "pied") for (let n of e.pions) !n.surLeTerrain || !n.horsJeu || n.cote !== t.auteur.cote || (n.cible.x = j(t.auteur.pos.x - M(n.cote) * 2, .5, 121.5), n.cible.y = j(n.cible.y, 4, 66), n.effort = .55);
		e.apresPas?.(e);
	}
}
function Pr(e) {
	let t = K;
	e.sim += t, Nt(e, t), Ft(e, t), e.sifflet && (e.sifflet.restant -= t, e.sifflet.restant <= 0 && (e.sifflet = null)), e.grosImpact && (e.grosImpact.restant -= t, e.grosImpact.restant <= 0 && (e.grosImpact = null)), e.dernierReplayEssai && (e.dernierReplayEssai.restant -= t, e.dernierReplayEssai.restant <= 0 && (e.dernierReplayEssai = null)), Fn(e, t), e.echappee && (e.echappee.restant -= t, (e.echappee.restant <= 0 || e.porteur !== e.echappee.pion) && (e.echappee = null));
	let n = t * (e.dureeReelleArcade ? e.phase === "miTemps" ? 0 : 4800 / e.dureeReelleArcade : e.carriereDixMinutes ? e.cadenceDetaillee ? Er(e) : 8 : Sr(e.phase, e.tempsReel));
	e.t += n, e.minute = Math.min(80, Math.floor(e.t / 60));
	let r = e.periode * yr;
	if (!e.sirene && e.t >= r && (e.sirene = !0, J(e, "jalon", null, z(e.periode === 1 ? "sirenePremiere" : "sireneFinale"))), e.sirene && !e.finSurSortieOuEnAvant && e.t > r + 360) return Ha(e);
	for (let r of e.pions) {
		if (r.surLeTerrain && r.numero > 15 && (r.numeroMaillot ??= r.numero, r.numero = _e.indexOf(r.poste) + 1), r.battu > 0 && (r.battu = Math.max(0, r.battu - t)), r.sanction > 0) {
			r.sanction = Math.max(0, r.sanction - n), r.sanction === 0 && !r.surLeTerrain && (r.surLeTerrain = !0, r.pos = {
				x: e.ballon.x,
				y: r.numero <= 8 ? 4 : 66
			}, F(r));
			continue;
		}
		r.surLeTerrain && (r.minutes += n / 60, We.has(e.phase) && (r.endurance = Math.min(100, r.endurance + n * .055)));
	}
	(e.minute >= 48 || Object.keys(e.remplacementsDemandes).length > 0) && Va(e), e.intention && (e.intention.restant -= t, e.intention.restant <= 0 && (e.intention = null));
	for (let n of Object.keys(e.recharges)) {
		let r = (e.recharges[n] ?? 0) - t;
		r <= 0 ? delete e.recharges[n] : e.recharges[n] = r;
	}
	if (rn(e, t), ln(e, t), dn(e, t), e.compteur++ % 3 == 0) {
		if (Kt(e), e.placement) for (let t of e.pions) {
			let n = e.placement[t.id];
			n && t.surLeTerrain && !(t.horsJeu && e.phase === "ballonEnLAir" && e.vol?.type === "pied") && (t.cible = n);
		}
		e.minuteur > 0 && Or(e);
	}
	if (He(e), e.controle && Fr(e), e.cadenceDetaillee) {
		if (e.phase === "melee" && e.conquete?.melee && ra(e), (e.phase === "tirAuBut" || e.phase === "transformation") && e.tir?.etape && !e.tir.volLance && wa(e), Ni(e), Ei(e), pa(e), e.phase === "coupEnvoi" || e.phase === "renvoi22") for (let t of e.pions) t.surLeTerrain && (t.effort = Math.min(t.effort, .66));
		if (e.phase === "touche" && e.placementJoue && Rr(e), e.tir?.volLance && e.tir.buteur.surLeTerrain && (e.tir.buteur.effort = Math.min(e.tir.buteur.effort, .6)), e.placementJoue && e.attentePlacement && !e.attentePlacement.pret && (e.phase === "melee" || e.phase === "touche")) for (let t of e.pions) t.surLeTerrain && (t.effort = Math.min(t.effort, (A(t.pos, t.cible) > 196 ? 6.2 : 4.8) / Math.max(4, t.vitesseMax)));
	}
	if (e.vol?.type === "passe" && e.vol.receveur?.surLeTerrain) {
		let t = e.vol, n = t.receveur, r = M(n.cote), i = t.duree - t.ecoule;
		if (e.cadenceDetaillee) {
			let e = k(n.pos, t.vers) / Math.max(.12, i), a = e > 1.8 ? 3 : i < .3 ? 1.2 : 0;
			n.cible = {
				x: j(t.vers.x + r * a, .5, 121.5),
				y: t.vers.y
			}, n.effort = j(e / Ce(n) * 1.12, .3, 1.1);
		} else n.cible = { ...t.vers }, n.effort = Math.max(n.effort, 1.04);
		let a = e.cadenceDetaillee && i > .4 ? [] : H(e, N(n.cote)).filter((e) => e.sanction <= 0 && e.battu <= 0 && (e.pos.x - t.vers.x) * r > -2).sort((e, n) => A(e.pos, t.vers) - A(n.pos, t.vers)).slice(0, 2);
		for (let e of a) e.cible = {
			x: t.vers.x + r * 1.1,
			y: t.vers.y
		}, e.role = "chasseur", e.effort = Math.max(e.effort, 1.1);
	}
	if (e.phase === "ballonEnLAir" && e.vol?.type === "pied") {
		let t = e.vol.vers, n = H(e, N(e.vol.auteur.cote)).filter((e) => e.sanction <= 0).sort((e, n) => A(e.pos, t) - e.detente * .035 - (A(n.pos, t) - n.detente * .035)), r = e.vol.receveur?.surLeTerrain && e.vol.receveur.sanction <= 0 ? e.vol.receveur : n[0];
		e.vol.receveur = r ?? null;
		let i = n.filter((e) => e !== r), a = i[0];
		if (r) {
			r.cible = { ...t }, r.role = "chasseur";
			let n = Math.max(.35, e.vol.duree - e.vol.ecoule);
			r.effort = j(k(r.pos, t) / (n * r.vitesseMax) * 1.3, .35, 1.12);
		}
		a && (a.cible = {
			x: j(t.x - M(a.cote) * 3.5, 1, 121),
			y: j(t.y + (a.pos.y < t.y ? -3 : 3), 2, 68)
		}, a.role = "chasseur", a.effort = Math.max(a.effort, 1.04));
		let o = 2.1 + 2.4 * (1 - j(e.vol.ecoule / e.vol.duree, 0, 1));
		i.slice(1, 4).forEach((e, n) => {
			e.cible = {
				x: j(t.x - M(e.cote) * (2 + n * 1.4), 1, 121),
				y: j(t.y + (n % 2 ? -1 : 1) * o, 2, 68)
			}, e.effort = .75;
		});
	}
	if (e.aide = 0, (e.phase === "jeuCourant" || e.phase === "ruck" || e.phase === "maul") && (e.possession === "A" ? e.compteurs.tempsA += t : e.compteurs.tempsB += t), e.phase === "jeuCourant" && e.porteur) if (e.gardeRuck > 0) e.gardeRuck -= t;
	else {
		let n = M(e.possession);
		e.ligneDef -= n * Zt(e, N(e.possession)) * t;
		let r = e.porteur.pos.x + n * .6;
		(e.ligneDef - r) * n < 0 && (e.ligneDef = r);
	}
	if (e.vol) {
		e.vol.type === "pied" && $r(e, e.vol.auteur), e.vol.ecoule += t;
		let n = pr(e.vol);
		e.ballon = {
			x: n.x,
			y: n.y
		};
	}
	qn(e);
	for (let n of e.pions) if (!(!n.surLeTerrain || n.sanction > 0) && n !== e.porteur) {
		if (e.tir?.buteur === n && e.tir.frappeDepuis !== void 0 && !e.tir.volLance) {
			F(n);
			continue;
		}
		e.cellule?.accroches?.includes(n.id) || Te(n, t, !!e.cadenceDetaillee && (n.role === "ruck" || e.vol?.type === "passe" && e.vol.receveur === n));
	}
	(e.phase !== "jeuCourant" || !e.porteur) && Wr(e), Jn(e, t);
	let i = It(e);
	if (i) {
		if (e.compteurs.irregularites += 1, nn(e, 14), i.motif.includes("coup de") || i.rouge || e.rng() < .2) {
			xa(e, i.fautif, i.victime, i.motif, i.rouge ? "carton_rouge" : "carton_jaune");
			return;
		}
		if (i.vu) return da(e, i.victime.cote, i.victime.pos, i.motif, i.fautif, i.rouge ? "rouge" : "jaune");
		J(e, "jeu", null, `Un ${i.motif} échappe au regard de l’arbitre, le jeu continue.`);
	}
	if (e.piedPrepare) {
		let n = e.piedPrepare, r = e.pions.find((e) => e.id === n.auteurId && e.surLeTerrain && e.sanction <= 0);
		if (!r || r.battu > 0) {
			e.placement && delete e.placement[n.auteurId], delete e.piedPrepare;
			return;
		}
		n.debut ??= e.sim;
		let i = e.sim - n.debut >= (n.rapideArcade ? .55 : e.cadenceDetaillee && r !== e.porteur ? 12 : 1.2);
		if (r.cible = { ...n.depuis }, r === e.porteur && (Te(r, t), e.ballon = { ...r.pos }), !i && (k(r.pos, n.depuis) > .75 || r.corps)) {
			delete n.pretDepuis;
			return;
		}
		n.pretDepuis === void 0 && (n.pretDepuis = e.sim, B(e, r, n.intention === "renvoi" ? "restart" : n.intention === "rasant" ? "grubber" : n.intention === "drop" ? "drop" : r.numero === 9 ? "box_kick" : n.intention === "chandelle" ? "chip" : "punt", 1.4));
		let a = n.rapideArcade ? .28 : n.intention === "drop" ? 1.12 : n.intention === "renvoi" ? 1.05 : r.numero === 9 ? .84 : .7;
		if ((!i || e.cadenceDetaillee) && e.sim - n.pretDepuis < a) return;
		delete e.piedPrepare, e.placement && (delete e.placement[r.id], Object.keys(e.placement).length === 0 && (e.placement = null)), X(e, r, n.arrivee, n.intention, n.duree, n.hauteur, r.pos, !0);
		return;
	}
	switch (Br(e) || (e.minuteur -= t), e.phase) {
		case "coupEnvoi": return Yr(e);
		case "renvoi22": return Xr(e);
		case "jeuCourant": return ai(e, t);
		case "ballonEnLAir": return ni(e);
		case "ballonLibre": return ii(e, t);
		case "ruck": return Qi(e);
		case "maul": return $i(e, t);
		case "melee": return aa(e);
		case "touche": return ca(e);
		case "penalite": return ga(e);
		case "tirAuBut": return va(e);
		case "transformation": return ya(e);
		case "aplatissage": return Ea(e);
		case "tmo": return Ta(e);
		case "apresEssai": return Da(e);
		case "miTemps": return Ua(e);
		case "bagarre": return Ir(e);
		default: return;
	}
}
function Fr(e) {
	let t = e.pions.find((e) => e.moi);
	if (!t || !t.surLeTerrain || t.sanction > 0) return;
	let n = M(t.cote), r = e.porteur;
	if (e.intention) switch (e.intention.type) {
		case "sprint":
			t.effort = t.endurance < 25 ? 1.02 : t.endurance < 45 ? 1.07 : 1.12, t.endurance = Math.max(0, t.endurance - K * 1.4);
			break;
		case "plaquage":
		case "monter": {
			let n = r && r.cote !== t.cote ? r.pos : e.ballon;
			t.cible = {
				x: n.x,
				y: n.y
			}, t.effort = e.intention.type === "plaquage" ? 1.12 : 1.06;
			break;
		}
		case "soutien":
			r && r.cote === t.cote && r !== t && (t.cible = {
				x: r.pos.x - n * 2.2,
				y: j(r.pos.y + 1.4 * e.ouvert, 2.5, 67.5)
			}, t.effort = 1.08);
			break;
		case "grattage":
			if (e.phase === "ruck" || r && r.cote !== t.cote) {
				let n = e.phase === "ruck" ? e.ballon : r.pos;
				t.cible = {
					x: n.x,
					y: n.y
				}, t.effort = 1.1;
			}
			break;
		case "appel": e.possession === t.cote && r && r !== t && (t.cible = {
			x: r.pos.x - n * 3.5,
			y: j(r.pos.y + 7 * e.ouvert, 2.5, 67.5)
		}, t.effort = 1.05);
	}
}
function Ir(e) {
	let t = e.bagarre;
	if (!t) {
		e.phase = "jeuCourant";
		return;
	}
	if (!t.ordre) {
		t.attente += K, t.attente > 90 && _n(e, "reculer");
		return;
	}
	let n = vn(e);
	if (e.bagarre = null, e.intention = null, n.fauteVue === !1) {
		$(e, n.lieu);
		return;
	}
	Q(e, "penalite", n.pour, n.lieu), e.penalite = {
		pour: n.pour,
		lieu: {
			x: n.lieu.x,
			y: n.lieu.y
		},
		motif: n.motif
	};
}
function J(e, t, n, r, i = 0, a = !1) {
	Ke(e, t, n, r, i, a);
}
function Lr(e, t, n = 20) {
	if (e.placement = t, e.placementJoue) {
		for (let n of e.pions) {
			let e = t[n.id];
			e && n.surLeTerrain && n.sanction <= 0 && (n.cible = e);
		}
		e.attentePlacement = {
			phase: e.phase,
			depuis: e.sim
		};
		return;
	}
	let r = e.phase === "melee" || e.phase === "touche";
	!r && e.phase !== "coupEnvoi" && (n = Infinity), e.cadenceDetaillee && e.phase === "coupEnvoi" && (n = Infinity);
	for (let i of e.pions) {
		if (!i.surLeTerrain || i.sanction > 0) continue;
		let e = t[i.id];
		e && (i.cible = e, (r || k(i.pos, e) > n) && (delete i.corps, i.pos = {
			x: e.x,
			y: e.y
		}, F(i)));
	}
}
function Rr(e) {
	let t = e.conquete;
	if (!t || t.type !== "touche" || !t.ramassage || t.ramassage === "tenu" || !t.ballonAuSol) return;
	let n = e.pions.find((e) => e.id === t.lanceurId && e.surLeTerrain && e.sanction <= 0);
	if (!n) {
		t.ramassage = "tenu";
		return;
	}
	if (t.ramassage === "aller") {
		let r = t.ballonAuSol.y < 35 ? 1 : -1;
		n.cible = {
			x: t.ballonAuSol.x,
			y: t.ballonAuSol.y + r * .45
		}, !n.corps && k(n.pos, n.cible) < .5 && (t.ramassage = "ramasse", t.ramassageDepuis = e.sim, F(n), B(e, n, "pickup", 1.15));
		return;
	}
	n.cible = { ...n.pos }, e.sim - (t.ramassageDepuis ?? e.sim) >= 1.1 && (t.ramassage = "tenu");
}
var zr = 24;
function Br(e) {
	let t = e.attentePlacement;
	if (!e.placementJoue || !t) return !1;
	if (t.phase !== e.phase) return e.attentePlacement = null, !1;
	if (t.pret || e.phase !== "melee" && e.phase !== "touche" && e.phase !== "renvoi22") return !1;
	if (e.sim - t.depuis > zr) return t.pret = !0, e.conquete?.ramassage && (e.conquete.ramassage = "tenu"), !1;
	if (e.phase === "touche" && e.conquete?.ramassage && e.conquete.ramassage !== "tenu") return !0;
	for (let t of e.pions) {
		if (!t.surLeTerrain || t.sanction > 0) continue;
		let n = t.role === "melee" || t.role === "alignement";
		if (!(e.phase === "melee" ? n || t.numero === 9 : e.phase !== "touche" || n || t.numero === 9 || t.numero === 2 && t.cote === e.possession)) continue;
		let r = e.phase === "renvoi22" ? e.placement?.[t.id] : t.cible;
		if (!r) continue;
		let i = e.phase === "renvoi22" ? 2 : t.role === "melee" ? .8 : t.role === "alignement" ? 1.3 : 1.8;
		if (t.corps || k(t.pos, r) > i) return !0;
	}
	return t.pret = !0, !1;
}
function Y(e, t) {
	return t === "A" ? e.clubA : e.clubB;
}
function Vr(e, t) {
	return t === "A" ? e.planA : e.planB;
}
function Hr(e, t) {
	return t === "A" ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
}
function Ur(e, t) {
	let n = Vr(e, t);
	if (n.total <= 0) return -.5;
	let r = (n.total * Math.min(1, e.t / (2 * yr) * 1.03) - n.marques) / Math.max(8, n.total);
	return e.minute >= 60 && (r *= 2), j(r, -.6, 1);
}
function Wr(e, t = !0, n = 3) {
	if (![
		"jeuCourant",
		"ballonEnLAir",
		"ballonLibre",
		"ruck",
		"maul",
		"melee",
		"touche"
	].includes(e.phase)) return;
	let r = e.pions.filter((e) => e.surLeTerrain && e.sanction <= 0 && !e.corps), i = e.phase === "touche" && e.conquete?.horsAlignement ? e.conquete.cibleId : void 0, a = e.cadenceDetaillee && e.phase === "ruck" ? e.ruck : null, o = e.cadenceDetaillee && e.cellule?.accroches?.length ? [e.cellule.porteurId, ...e.cellule.accroches] : null, s = !!e.cadenceDetaillee && (e.phase === "ruck" || e.phase === "maul" || e.phase === "melee" || e.phase === "touche"), c = !!e.cadenceDetaillee && e.phase === "melee", l = !!e.placementJoue && !!e.attentePlacement && !e.attentePlacement.pret && e.attentePlacement.phase === e.phase;
	l && (t = !1);
	let u = e.placementJoue ? r.map((e) => ({
		x: e.pos.x,
		y: e.pos.y
	})) : null;
	for (let e = 0; e < n; e++) for (let n = 0; n < r.length; n++) {
		let u = r[n];
		for (let d = n + 1; d < r.length; d++) {
			let n = r[d];
			if (i && (u.id === i || n.id === i) || a && (u.role === "ruck" && n.role === "ruck" || u.id === a.porteurId || n.id === a.porteurId || u.id === a.plaqueurId || n.id === a.plaqueurId) || o && o.includes(u.id) && o.includes(n.id) || c && (u.numero === 9 && n.role === "melee" || n.numero === 9 && u.role === "melee")) continue;
			let f = u.cote !== n.cote, p = [
				"ruck",
				"maul",
				"melee",
				"alignement"
			].includes(u.role) && u.role === n.role ? .62 : l ? .78 : f ? 1.18 : .94, m = n.pos.x - u.pos.x, h = n.pos.y - u.pos.y, g = m * m + h * h;
			if (e === 0 && t && f && g >= p * p) {
				let e = m - (n.vitesse.x - u.vitesse.x) * K, t = h - (n.vitesse.y - u.vitesse.y) * K, r = m - e, i = h - t, a = r * r + i * i;
				if (a > .25) {
					let o = j(-(e * r + t * i) / a, 0, 1), s = e + r * o, c = t + i * o;
					o > 0 && o < 1 && s * s + c * c < p * p && (u.pos.x -= u.vitesse.x * K * (1 - o), u.pos.y -= u.vitesse.y * K * (1 - o), n.pos.x -= n.vitesse.x * K * (1 - o), n.pos.y -= n.vitesse.y * K * (1 - o), m = n.pos.x - u.pos.x, h = n.pos.y - u.pos.y, g = m * m + h * h);
				}
			}
			if (g >= p * p) continue;
			g < 1e-6 && (m = u.numero * 17 + n.numero * 11 & 1 ? .01 : -.01, h = u.numero * 7 + n.numero * 19 & 1 ? .01 : -.01, g = m * m + h * h);
			let _ = Math.sqrt(g), v = m / _, y = h / _, b = s && [
				"ruck",
				"maul",
				"melee",
				"alignement"
			].includes(u.role), x = s && [
				"ruck",
				"maul",
				"melee",
				"alignement"
			].includes(n.role), S = !f && b !== x, C = S && b ? 1e6 : (u.poidsKg ?? 95) * (.8 + u.puissance / 250), w = S && x ? 1e6 : (n.poidsKg ?? 95) * (.8 + n.puissance / 250), T = C + w, E = p - _;
			if (u.pos.x -= v * E * (w / T), u.pos.y -= y * E * (w / T), n.pos.x += v * E * (C / T), n.pos.y += y * E * (C / T), e === 0) {
				let e = (n.vitesse.x - u.vitesse.x) * v + (n.vitesse.y - u.vitesse.y) * y;
				if (e < 0) {
					let t = -e * .38;
					u.vitesse.x -= v * t * (w / T), u.vitesse.y -= y * t * (w / T), n.vitesse.x += v * t * (C / T), n.vitesse.y += y * t * (C / T);
				}
			}
		}
	}
	if (u) {
		let e = .42;
		r.forEach((t, n) => {
			let r = t.pos.x - u[n].x, i = t.pos.y - u[n].y, a = Math.hypot(r, i);
			a > e && (t.pos.x = u[n].x + r / a * e, t.pos.y = u[n].y + i / a * e);
		});
	}
}
function Gr(e, t) {
	let n = e.pos.x - t.pos.x, r = e.pos.y - t.pos.y, i = Math.max(.01, Math.hypot(n, r));
	if (i <= 1.02) return;
	let a = i - 1.02;
	t.pos.x += n / i * a * .78, t.pos.y += r / i * a * .78, e.pos.x -= n / i * a * .22, e.pos.y -= r / i * a * .22;
}
function Kr(e, t, n = !1) {
	let r = e.pos.x - t.pos.x, i = e.pos.y - t.pos.y, a = Math.max(.01, Math.hypot(r, i)), o = Math.max(.01, Math.hypot(e.vitesse.x, e.vitesse.y)), s = n ? .2 : .47, c = r / a * (1 - s) + e.vitesse.x / o * s, l = i / a * (1 - s) + e.vitesse.y / o * s, u = Math.max(.01, Math.hypot(c, l)), d = j((n ? 3.1 : 1.7) + (t.puissance - e.puissance) / 24 + ((t.poidsKg ?? 95) - (e.poidsKg ?? 95)) / 45 + Math.hypot(t.vitesse.x - e.vitesse.x, t.vitesse.y - e.vitesse.y) * .35, .8, n ? 7.2 : 6), f = {
		x: c / u * d,
		y: l / u * d
	};
	V(e, f, n ? 2.4 : 2.1), V(t, {
		x: f.x * .7,
		y: f.y * .7
	}, n ? 1.8 : 1.6);
}
function qr(e, t) {
	for (let t of e.pions) t.surLeTerrain && delete t.corps;
	e.possession = t, e.porteur = null, e.vol = null, e.lancement = null, e.conquete = null, e.phasesDepuisArret = 0, e.ballon = {
		x: 61,
		y: 35
	}, e.phase = "coupEnvoi", e.minuteur = Cr(e, "coupEnvoi"), e.ouvert = e.rng() < .5 ? 1 : -1, e.cibleRenvoi || Jr(e, t), Lr(e, Ne(e.pions, 61, t, e.cibleRenvoi), 18);
}
function Jr(e, t) {
	e.cibleRenvoi = {
		x: 61 + M(t) * (27 + e.rng() * 11),
		y: j(35 + (e.rng() < .5 ? 1 : -1) * (14 + e.rng() * 10), 8, 62)
	};
}
function Yr(e) {
	if (e.minuteur > 0) return;
	if (e.placement) {
		let t = e.attenteCoupEnvoi ?? 0;
		if (t < (e.cadenceDetaillee ? 110 : 4) && e.pions.some((t) => t.surLeTerrain && t.sanction <= 0 && e.placement?.[t.id] && k(t.pos, e.placement[t.id]) > 2)) {
			e.attenteCoupEnvoi = t + 1, e.minuteur = .25;
			return;
		}
		delete e.attenteCoupEnvoi;
	}
	let t = e.possession, n = H(e, t), r = n.find((e) => e.buteur) ?? U(n, 10) ?? n[0];
	if (!r) return Ha(e);
	e.cadenceDetaillee || (r.pos = {
		x: 61,
		y: 35
	}, r.vitesse = {
		x: 0,
		y: 0
	});
	let i = e.cibleRenvoi ?? {
		x: 61 + M(t) * 30,
		y: 35
	};
	r.stats.coupsDePied += 1;
	let a = e.placement;
	e.placement = {};
	for (let n of H(e, N(t))) {
		let t = a?.[n.id];
		t && (e.placement[n.id] = { ...t });
	}
	X(e, r, i, "renvoi", 3, 11 + r.pied * .025, {
		x: 61,
		y: 35
	}), J(e, "pied", t, z("coupEnvoiJoueur", { nom: r.nom }), 0, r.moi);
}
function Xr(e) {
	if (e.minuteur > 0) return;
	let t = e.possession, n = M(t), r = H(e, t), i = r.find((e) => e.buteur) ?? [...r].sort((e, t) => t.pied - e.pied)[0] ?? r[0];
	if (!i) return Ha(e);
	let a = t === "A" ? 33 : 89, o = {
		x: a + n * (28 + i.pied / 4 + e.rng() * 10),
		y: j(35 + (e.rng() * 30 - 15), 6, 64)
	};
	i.stats.coupsDePied += 1, e.placement = null, X(e, i, o, "renvoi", 2.8, 10 + i.pied * .02, {
		x: a,
		y: 35
	}), J(e, "pied", t, z("renvoi22Joueur", { nom: i.nom }), 0, i.moi);
}
function Zr(e, t) {
	let n = (e.volsRecents ?? []).filter((t) => e.t - t.debut <= 8).slice(-23);
	n.push({
		de: { ...t.de },
		vers: { ...t.vers },
		duree: t.duree,
		hauteur: t.hauteur,
		type: t.type,
		intention: t.intention,
		auteur: t.auteur,
		receveur: t.receveur,
		debut: e.t
	}), e.volsRecents = n;
}
function Qr(e, t) {
	t.type === "pied" && t.intention !== "rasant" && (t.duree = Math.max(t.duree, Math.sqrt(8 * t.hauteur / fr)), t.hauteur = .19 + fr * t.duree * t.duree / 8), t.type === "passe" && (B(e, t.auteur, t.intention === "offload" ? "offload" : t.vers.y < t.de.y ? "pass_left" : "pass", Math.max(.65, t.duree), t.variante), t.receveur && B(e, t.receveur, "catch", Math.max(.65, t.duree))), e.vol = t, Zr(e, t);
}
function X(e, t, n, r, i, a, o, s = !1) {
	if (!s) {
		o ??= { ...t.pos }, e.piedPrepare = {
			auteurId: t.id,
			arrivee: { ...n },
			intention: r,
			duree: i,
			hauteur: a,
			depuis: { ...o },
			debut: e.sim,
			rapideArcade: !!t.moi && !!e.controleArcadeCamps?.includes(t.cote)
		}, t.cible = { ...o }, (e.placement ??= {})[t.id] = { ...o };
		return;
	}
	let c = o ? {
		x: o.x,
		y: o.y
	} : {
		x: t.pos.x,
		y: t.pos.y
	}, l = M(t.cote);
	for (let n of H(e, t.cote)) n.horsJeu = n !== t && (n.pos.x - c.x) * l > .5;
	for (let n of H(e, N(t.cote))) n.horsJeu = !1;
	Qr(e, {
		de: c,
		vers: n,
		duree: i,
		ecoule: 0,
		hauteur: a,
		type: "pied",
		intention: r,
		auteur: t,
		receveur: null
	}), t.stats.metresAuPied += Math.abs(n.x - c.x), e.porteur = null, e.phase = "ballonEnLAir", e.minuteur = i + .5, e.derniereTouche = t;
}
function $r(e, t) {
	let n = M(t.cote), r = H(e, t.cote).filter((e) => !e.horsJeu && e.sanction <= 0);
	for (let i of H(e, t.cote)) i.horsJeu && r.some((e) => (e.pos.x - i.pos.x) * n >= 0) && (i.horsJeu = !1);
}
function ei(e) {
	for (let t of e.pions) t.horsJeu = !1;
}
function ti(e, t) {
	let n = t.y <= 0 ? 0 : 70, r = t.y - e.y;
	if (Math.abs(r) < 1e-6 || pe(e)) return {
		x: t.x,
		y: n
	};
	let i = j((n - e.y) / r, 0, 1);
	return {
		x: e.x + (t.x - e.x) * i,
		y: n
	};
}
function ni(e) {
	let t = e.vol;
	if (!t) return $(e, e.ballon);
	if (t.auteur && t.auteur.surLeTerrain && $r(e, t.auteur), t.ecoule < t.duree) return;
	e.vol = null, t.intention === "renvoi" && (e.placement = null);
	let n = t.auteur.cote, r = e.ballon;
	if (t.intention === "drop") {
		let r = e.dropEnCours?.auteurId === t.auteur.id && e.dropEnCours.reussi;
		if (delete e.dropEnCours, r) {
			let r = Vr(e, n);
			return r.penalites = Math.max(0, r.penalites - 1), t.auteur.stats.butsReussis += 1, t.auteur.stats.pointsAuPied = (t.auteur.stats.pointsAuPied ?? 0) + 3, Oa(e, n, 3), J(e, "but", n, R(e.rng, nt, { nom: t.auteur.nom }), 3, t.auteur.moi), e.sirene && !e.finSurSortieOuEnAvant ? Ha(e) : qr(e, N(n));
		}
		return J(e, "butRate", n, z("dropRate", { nom: t.auteur.nom }), 0, t.auteur.moi), Q(e, "renvoi22", N(n), {
			x: N(n) === "A" ? 33 : 89,
			y: 35
		});
	}
	if (pe(r)) {
		let i = ti(t.de, r);
		if (t.intention === "penaltouche") return J(e, "touche", n, z("toucheASuivre", { club: Y(e, n) })), Q(e, "touche", n, i);
		let a = de(t.de, n) || Math.abs(t.de.x - 61) < .5, o = le(i, n) && !fe(i, n);
		if (t.intention === "cinquanteVingtDeux" && a && o) return J(e, "pied", n, R(e.rng, pt, { nom: t.auteur.nom }), 0, t.auteur.moi), t.auteur.stats.cinquanteVingtDeux += 1, Q(e, "touche", n, i);
		t.intention === "cinquanteVingtDeux" && J(e, "pied", n, R(e.rng, mt, { nom: t.auteur.nom }), 0, t.auteur.moi);
		let s = !ue(t.de, n), c = s ? {
			x: t.de.x,
			y: i.y
		} : i;
		return s && J(e, "touche", N(n), z("toucheDirecte", { nom: t.auteur.nom }), 0, t.auteur.moi), Q(e, "touche", N(n), c);
	}
	if (r.x <= 1 || r.x >= 121) {
		let i = r.x <= 11 ? "A" : "B";
		return (t.intention === "cinquanteVingtDeux" || t.intention === "occupation") && J(e, "pied", n, z("ballonEnBut")), Q(e, "renvoi22", i, {
			x: i === "A" ? 33 : 89,
			y: 35
		});
	}
	let i = e.pions.filter((e) => e.surLeTerrain && e.sanction <= 0 && A(e.pos, r) < 400), a = i.filter((e) => e.cote === n), o = i.filter((e) => e.cote !== n), s = (e) => {
		let t = null, n = -Infinity;
		for (let i of e) {
			let e = i.detente * .5 + i.vision * .3 - k(i.pos, r) * 3.2;
			e > n && (n = e, t = i);
		}
		return t;
	}, c = s(a.filter((e) => !e.horsJeu)), l = s(o), u = c ? A(c.pos, r) : Infinity, d = a.find((e) => e.horsJeu && A(e.pos, r) < Math.min(u, 100));
	if (d) return ei(e), da(e, N(n), {
		x: r.x,
		y: r.y
	}, "hors-jeu", d);
	let f = t.intention === "chandelle" || t.intention === "rasant" || t.intention === "transversale" || t.intention === "renvoi", p = f ? .42 : .12, m = t.hauteur > .7 ? 3.5 : t.intention === "rasant" ? 2.2 : 2.8, h = c && k(c.pos, r) <= m ? c : null, g = l && k(l.pos, r) <= m ? l : null, _ = null;
	if (_ = h && (!g || e.rng() < p || k(h.pos, r) < k(g.pos, r) - .8) ? h : g ?? h, !_) return ri(e, t);
	if (_.cote === n && f && J(e, "pied", n, z("ballonAerien", { nom: _.nom }), 0, _.moi), t.hauteur > .7 && e.rng() < .07) return e.ballon = {
		x: _.pos.x,
		y: _.pos.y
	}, li(e, _);
	e.possession = _.cote, $(e, _.pos, _);
}
function ri(e, t, n = t.type === "pied" ? t.intention : "touche") {
	ei(e);
	let r = t.vers.x - t.de.x, i = t.vers.y - t.de.y, a = Math.max(.01, Math.hypot(r, i)), o = t.hauteur > .72, s = t.intention === "rasant", c = s ? 10.5 : o ? 3.8 : 7.2;
	e.porteur = null, e.vol = null, e.ballonLibre = null, e.ruck = null, e.aplatissage = null, e.phase = "ballonLibre", e.minuteur = 10, e.ballonLibre = {
		vitesse: {
			x: r / a * c,
			y: i / a * c
		},
		hauteur: o ? .7 : s ? .12 : .28,
		vitesseVerticale: o ? 4.8 : s ? 1.1 : 2.4,
		orientation: Math.atan2(i, r) + (e.rng() - .5) * .8,
		vitesseRotation: (e.rng() < .5 ? -1 : 1) * (3.5 + c * .55),
		dernierRebondSim: -10,
		intention: n,
		auteurCote: t.auteur.cote,
		auteur: t.auteur,
		age: 0,
		rebonds: 0
	}, J(e, "pied", null, s ? "Le ballon fuse au ras du sol : la course à la récupération est lancée." : o ? "Le ballon retombe sans receveur et prend un rebond imprévisible." : "Le ballon rebondit puis roule dans l’espace.");
}
function ii(e, t) {
	let n = e.ballonLibre;
	if (!n) return $(e, e.ballon);
	n.age += t, n.auteur && n.auteur.surLeTerrain && n.auteur.sanction <= 0 && $r(e, n.auteur), n.age > 4.5 && ei(e), e.ballon.x += n.vitesse.x * t, e.ballon.y += n.vitesse.y * t, n.orientation = (n.orientation ?? Math.atan2(n.vitesse.y, n.vitesse.x)) + (n.vitesseRotation ?? 0) * t;
	let r = n.hauteur > 0 || n.vitesseVerticale > 0;
	if (r && (n.hauteur += n.vitesseVerticale * t, n.vitesseVerticale -= 9.81 * t), r && n.hauteur <= 0 && n.vitesseVerticale < 0) {
		n.hauteur = 0;
		let t = Math.atan2(n.vitesse.y, n.vitesse.x), r = Math.sin((n.orientation ?? 0) - t), i = Math.abs(Math.cos((n.orientation ?? 0) - t)), a = n.intention === "rasant" ? .24 : n.rebonds === 0 ? .42 + i * .18 : .23 + i * .12;
		n.vitesseVerticale = -n.vitesseVerticale * a;
		let o = r * (n.rebonds === 0 ? .44 : .26) + (e.rng() - .5) * (n.intention === "rasant" ? .15 : .23), s = n.vitesse.x, c = n.vitesse.y, l = n.rebonds === 0 ? .81 : .68;
		n.vitesse.x = (s * Math.cos(o) - c * Math.sin(o)) * l, n.vitesse.y = (c * Math.cos(o) + s * Math.sin(o)) * l, n.vitesseRotation = -(n.vitesseRotation ?? 0) * (.48 + i * .16) + r * 2.2, n.rebonds += 1, n.dernierRebondSim = e.sim, Math.abs(n.vitesseVerticale) < .82 && (n.vitesseVerticale = 0);
	}
	let i = Math.exp(-(n.hauteur > .03 ? .16 : 1.15) * t);
	if (n.vitesse.x *= i, n.vitesse.y *= i, n.vitesseRotation = (n.vitesseRotation ?? 0) * Math.exp(-(n.hauteur > .03 ? .28 : 1.6) * t), n.hauteur === 0 && Math.hypot(n.vitesse.x, n.vitesse.y) < .18 && (n.vitesse = {
		x: 0,
		y: 0
	}, n.vitesseRotation = 0), e.ballon.y <= 0 || e.ballon.y >= 70) {
		let t = {
			x: e.ballon.x,
			y: e.ballon.y <= 0 ? 0 : 70
		};
		return e.ballonLibre = null, Q(e, "touche", N(n.auteurCote), t);
	}
	if (e.ballon.x <= 0 || e.ballon.x >= 122) {
		let t = e.ballon.x <= 11 ? "A" : "B";
		return e.ballonLibre = null, Q(e, "renvoi22", t, {
			x: t === "A" ? 33 : 89,
			y: 35
		});
	}
	if (e.minuteur <= 0 || n.age >= 8) {
		e.ballonLibre = null, ei(e);
		let t = e.pions.filter((e) => e.surLeTerrain && e.sanction <= 0).sort((t, n) => A(t.pos, e.ballon) - A(n.pos, e.ballon))[0];
		return t && k(t.pos, e.ballon) < 5 ? (e.possession = t.cote, J(e, "pied", t.cote, `Le ballon vivant est récupéré par ${t.nom}.`, 0, t.moi), $(e, t.pos, t)) : Q(e, "melee", N(n.auteurCote), e.ballon);
	}
	let a = e.pions.filter((e) => e.surLeTerrain && e.sanction <= 0 && !e.horsJeu).sort((t, n) => A(t.pos, e.ballon) - A(n.pos, e.ballon));
	for (let t of a.slice(0, 6)) t.role = "chasseur", t.effort = 1.1, t.cible = {
		x: j(e.ballon.x + n.vitesse.x * .16, .5, 121.5),
		y: j(e.ballon.y + n.vitesse.y * .16, .5, 69.5)
	};
	let o = a[0], s = Math.hypot(n.vitesse.x, n.vitesse.y) < .25 && n.hauteur <= .15, c = n.hauteur > 1.5 ? 1.2 : n.hauteur > .45 ? 1.8 : s ? 3.2 : 2.4;
	if (!o || k(o.pos, e.ballon) > c) return;
	let l = n.hauteur * 7 + Math.hypot(n.vitesse.x, n.vitesse.y) * .55, u = o.vision * .45 + o.detente * .35 + o.passe * .2;
	if (n.age < .2 || e.rng() < j((l + 10 - u) / 180, .01, .12)) {
		let t = M(o.cote);
		n.vitesse.x += t * 1.5, n.vitesse.y += (e.rng() - .5) * 1.8, n.vitesseVerticale = Math.max(n.vitesseVerticale, 1.2), n.hauteur = Math.max(n.hauteur, .12), o.battu = Math.max(o.battu, .25);
		return;
	}
	if (e.ballonLibre = null, e.possession = o.cote, ei(e), e.ballon.x <= 11 && o.cote === "A" || e.ballon.x >= 111 && o.cote === "B") return Q(e, "renvoi22", o.cote, {
		x: o.cote === "A" ? 33 : 89,
		y: 35
	});
	J(e, "pied", o.cote, `Le ballon vivant est récupéré par ${o.nom}.`, 0, o.moi), $(e, o.pos, o);
}
function ai(e, t) {
	if (e.vol && e.vol.type === "passe") {
		if (e.vol.ecoule < e.vol.duree) return;
		let t = e.vol, n = e.vol.receveur, r = e.vol.intention === "offload", i = k(e.vol.de, e.vol.vers), a = { ...e.vol.vers };
		if (e.vol = null, !n || !n.surLeTerrain || n.sanction > 0) return Zi(e, e.ballon);
		if (k(n.pos, a) > (e.cadenceDetaillee ? 2.3 : 1.8)) return e.ballon = a, ri(e, t, "touche");
		if (e.cadenceDetaillee ? n.vitesse.x * M(n.cote) < 0 && (n.vitesse.x = 0) : (n.pos = a, n.cible = { ...a }, F(n)), fi(e, n, i, r)) return e.ballon = e.cadenceDetaillee ? { ...n.pos } : a, li(e, n);
		pi(e, n, r ? .5 : .35);
		return;
	}
	let n = e.porteur;
	if (!n) return Zi(e, e.ballon);
	let r = M(n.cote);
	if (e.cellule?.pousse && e.cellule.porteurId === n.id) return Li(e, n);
	let i = e.echappee?.pion === n, a = e.controleArcadeCamps?.includes(n.cote) ?? !1;
	a || (n.cible = i ? {
		x: n.cote === "A" ? 113 : 9,
		y: j(n.pos.y, 3, 67)
	} : Ue(e) ?? Oi(e, n) ?? oi(e, n));
	let o = n.pos.x;
	a || Te(n, t), Fi(e), Wr(e);
	let s = (t) => Math.max(0, (t - e.ligneAvantage) * r), c = s(n.pos.x) - s(o);
	c > 0 && (n.stats.metres += c, e.metresGagnesPhase = Math.max(e.metresGagnesPhase, s(n.pos.x))), e.ballon = {
		x: n.pos.x,
		y: n.pos.y
	};
	let l = 99, u = null, d = Infinity, f = 0;
	for (let t of H(e, N(n.cote))) {
		if (t.sanction > 0) continue;
		let e = (t.pos.x - n.pos.x) * r;
		if (e < -.5 && f++, t.battu <= 0) {
			let r = k(t.pos, n.pos);
			r <= br && r < d && (u = t, d = r), r < l && e > -.2 && (l = r);
		}
	}
	if (e.gardeRuck > 0 && A(n.pos, e.origine) < 6.25 && (u = null), fe(n.pos, n.cote)) return u && n.battu <= 0 ? Ji(e, n, u) : ba(e, n);
	if (pe(n.pos)) return J(e, "touche", N(n.cote), z("pousseTouche", { nom: n.nom }), 0, n.moi), Q(e, "touche", N(n.cote), n.pos);
	let p = P(n.pos, n.cote) < 3.5 && l > 2.1;
	if (p && (n.cible = {
		x: n.cote === "A" ? 112.2 : 9.8,
		y: j(n.pos.y, 2, 68)
	}), !e.perceeSignalee && f >= 13 && l > 11 && e.metresGagnesPhase > 16 && n.battu <= 0 && (e.perceeSignalee = !0, e.compteurs.percees += 1, n.stats.franchissements += 1, J(e, "franchissement", n.cote, R(e.rng, ot, { nom: n.nom }), 0, n.moi)), !p && n.moi && e.controle && e.intention) {
		let t = e.intention.type === "passeGauche" ? -1 : +(e.intention.type === "passeDroite");
		if (e.intention.type === "passe" || t !== 0) {
			let r = t === 0 ? En(e, n) : Dn(e, n, t) ?? En(e, n);
			if (r) {
				kn(e), gi(e, n, r, l);
				return;
			}
		}
		if (e.intention.type === "pied") return kn(e), Ra(e, n, Ia(e, n));
	}
	if (a) return u && n.battu <= 0 ? Ji(e, n, u) : void 0;
	if (mi(e, n, l)) {
		u && n.battu <= 0 && e.porteur === n && e.phase === "jeuCourant" && Ji(e, n, u);
		return;
	}
	let m = e.lancement, h = m && m.index + 1 < m.chaine.length ? m.chaine[m.index + 1] : null, g = jn(e, n), _ = An(e, n), v = h ? k(n.pos, h.pos) : 99, y = h ? (h.pos.x - n.pos.x) * r <= .4 : !1, b = g > 7 && f >= 9 || _ >= 8.5 && g > 6, x = A(n.pos, e.origine) > 49;
	!i && x && (f >= 9 && g > 7.5 || _ >= 8.5 && g > 7) && Qa(e, n);
	let S = e.gardeRuck > 0 && (n.numero === 9 || n.numero === 10 || n.role === "demi"), C = S ? 20 : n.avant ? 12 : 18, w = S ? 99 : n.avant ? 3.2 : 3.6, T = h ? (n.pos.x - h.pos.x) * r : 0, E = h && e.cadenceDetaillee ? Bi(v, n) : 0, ee = h ? Math.max(0, h.vitesse.x * r) * E + .5 * h.acceleration * .85 * E * E : 0, D = !!e.cadenceDetaillee && S && e.gardeRuck > .15 && !!h && T - ee > 1.8 || !!e.cadenceDetaillee && !!h && ki(e, n, h) && l > 2.4;
	if (!p && !i && (S || !b) && h && h.surLeTerrain && y && !D && v <= C && l <= w) {
		gi(e, n, h, l);
		return;
	}
	if (u && n.battu <= 0) return Ji(e, n, u);
	e.prochaineDecision -= t, !(e.prochaineDecision > 0) && (e.prochaineDecision = .25, !i && !p && hi(e, n, l));
}
function oi(e, t) {
	let n = M(t.cote), r = e.ouvert, i = H(e, N(t.cote)), a = null, o = Infinity;
	for (let e of i) {
		if (e.battu > 0 || e.sanction > 0 || (e.pos.x - t.pos.x) * n < -1.5) continue;
		let r = A(e.pos, t.pos);
		r < o && (o = r, a = e);
	}
	let s = a ? Math.sqrt(o) : 99, c = P(t.pos, t.cote);
	if (!a || s > 13) {
		let e = c < 22 ? j((22 - c) / 22, 0, 1) * .55 : 0;
		return {
			x: t.pos.x + n * 22,
			y: j(oe(t.pos.y, 35, e), 2.5, 67.5)
		};
	}
	if (e.lancement && e.lancement.index + 1 < e.lancement.chaine.length) return {
		x: t.pos.x + n * 14,
		y: j(a.pos.y + r * .6, 2.5, 67.5)
	};
	if (e.cadenceDetaillee && t.avant) {
		let e = null, r = Infinity;
		for (let o of i) {
			if (o === a || o.battu > 0 || o.sanction > 0 || o.corps || (o.pos.x - t.pos.x) * n < -1.5) continue;
			let i = A(o.pos, a.pos);
			i < r && (r = i, e = o);
		}
		let o = t.vision >= 52;
		if (e && o) {
			let i = Math.abs(e.pos.y - a.pos.y);
			if (i > 3.2 && i < 9) return {
				x: t.pos.x + n * 12,
				y: j((a.pos.y + e.pos.y) / 2, 2.5, 67.5)
			};
			let o = e.puissance + (e.poidsKg ?? 95) * .25 < a.puissance + (a.poidsKg ?? 95) * .25 && Math.sqrt(r) < 4 ? e : a, s = Math.sign((o === a ? e.pos.y : a.pos.y) - o.pos.y) || 1;
			return {
				x: t.pos.x + n * 12,
				y: j(o.pos.y - s * .55, 2.5, 67.5)
			};
		}
		return {
			x: t.pos.x + n * 12,
			y: j(a.pos.y + (t.pos.y < a.pos.y ? -.5 : .5), 2.5, 67.5)
		};
	}
	return {
		x: t.pos.x + n * 15,
		y: j(a.pos.y + r * 5.5, 2.5, 67.5)
	};
}
var si = 4.5;
function ci(e, t, n, r) {
	e.sifflet = {
		cle: t,
		club: Y(e, n),
		fautif: r?.nom ?? "",
		maFaute: !!r?.moi,
		restant: si
	};
}
function li(e, t) {
	B(e, t, "foul_knockon", 1.9), t.stats.passesRatees += 1, e.compteurs.enAvants += 1, J(e, "faute", t.cote, R(e.rng, ct, {
		nom: t.nom,
		club: Y(e, N(t.cote))
	}), 0, t.moi), ci(e, "ml.sifflet.enAvant", N(t.cote), t), Pn(e, t.cote, Mn.enAvant), Q(e, "melee", N(t.cote), t.pos, !0);
}
function ui(e, t) {
	B(e, t, "foul_forwardpass", 1.2), --t.stats.passes, t.stats.passesRatees += 1, e.compteurs.enAvants += 1, J(e, "faute", t.cote, R(e.rng, lt, {
		nom: t.nom,
		club: Y(e, N(t.cote))
	}), 0, t.moi), ci(e, "ml.sifflet.passeAvant", N(t.cote), t), Q(e, "melee", N(t.cote), t.pos, !0);
}
function di(e, t) {
	let n = e.cohesion?.[t];
	return n === void 0 ? 1 : j(1 + (50 - n) / 100 * .6, .7, 1.3);
}
function fi(e, t, n, r) {
	let i = 99;
	for (let n of H(e, N(t.cote))) n.sanction > 0 || n.battu > 0 || (i = Math.min(i, k(n.pos, t.pos)));
	let a = .6 + t.passe / 220, o = Math.max(0, (55 - t.endurance) / 150), s = ((r ? .03 : .01) + o * .032 + Math.max(0, 4 - i) * .007 + Math.max(0, n - 9) / 500) * di(e, t.cote);
	return e.rng() < Math.max(0, s / a);
}
function pi(e, t, n) {
	e.porteur = t, e.possession = t.cote, e.ballon = {
		x: t.pos.x,
		y: t.pos.y
	}, t.stats.courses += 1, e.lancement?.type === "pickAndGo" && t.avant && (t.stats.pickAndGo += 1), e.prochaineDecision = n, e.vol = null;
}
function mi(e, t, n) {
	let r = e.combinaisonEnCours;
	if (!r) return !1;
	if (r.cote !== t.cote || e.sim - r.debut > 45) return e.combinaisonEnCours = void 0, e.lancement = null, !1;
	He(e);
	let i = r.etapes[r.index], a = i?.actions.find((e) => e.action.type !== "leurre")?.action ?? i?.actions[0]?.action;
	if (!a) return e.combinaisonEnCours = void 0, e.lancement = null, !1;
	let o = () => {
		r.index++, r.depuis = e.sim;
	};
	if (a.type === "leurre") return r.courses[a.numero] = a.destination, o(), !0;
	if (a.type === "course") return (k(t.pos, Be(r, a.destination)) < 1.5 || e.sim - r.depuis > 4) && o(), !0;
	if (a.type === "pied") return n > 1.6 && e.sim - r.depuis >= .25 && (e.combinaisonEnCours = void 0, Ra(e, t, a.intention)), !0;
	let s = L(e, r.cote, a.destinataire);
	return !s || s === t || e.sim - r.depuis > 4 ? (e.combinaisonEnCours = void 0, e.lancement = null, !1) : ((s.pos.x - t.pos.x) * M(t.cote) <= .4 && k(t.pos, s.pos) <= 28 && e.sim - r.depuis >= .3 && (o(), gi(e, t, s, n)), !0);
}
function hi(e, t, n) {
	let r = e.lancement, i = r && r.index + 1 < r.chaine.length;
	if (e.sirene && Hr(e, t.cote) > 0 && n > 1.8) return Ra(e, t, "degagement");
	if (r && r.type === "pied" && r.botteur === t && n > 2.4) return Ra(e, t, r.intention ?? "occupation");
	if (!i) {
		if (t.numero === 10 && P(t.pos, t.cote) < 32 && Math.abs(t.pos.y - 35) < 14 && t.pied > 55 && n > 4.5 && e.rng() < (e.minute >= 65 ? .04 : .015)) return Ra(e, t, "drop");
		if (!t.avant && P(t.pos, t.cote) < 26 && n < 6 && t.pied > 55 && e.rng() < .032) return Ra(e, t, "rasant");
	}
}
function gi(e, t, n, r) {
	let i = M(t.cote), a = {
		x: n.pos.x,
		y: n.pos.y
	}, o = k(t.pos, a);
	t.stats.passes += 1;
	let s = di(e, t.cote), c = (a.x - t.pos.x) * i;
	if (c > .4) {
		if (c > 1.8) return ui(e, t), !1;
		let n = Math.min(.22, Math.max(0, c - 1.4) * .038) * (1.3 - t.vision / 200) * s;
		if (e.rng() < n) return ui(e, t), !1;
		a.x = t.pos.x - i * .4;
	}
	let l = (.01 + Math.max(0, 3 - r) * .007 + o / 1800) * s;
	if (e.rng() < l * (1.35 - t.passe / 220)) return --t.stats.passes, li(e, t), !1;
	e.dernierPasseur = t, e.cadenceDetaillee && e.lancement?.structure && !e.lancement.fixe && Ai(e, e.lancement, t, n);
	let u = H(e, N(t.cote)), d = 0;
	for (let e of u) e.battu > 0 || e.role === "chasseur" && A(e.pos, t.pos) < 2.3 * 2.3 && (e.battu = .25, d++);
	let f = 99;
	for (let e of u) {
		if (e.battu > 0 || e.sanction > 0 || (e.pos.x - n.pos.x) * i < -.5) continue;
		let t = k(n.pos, e.pos);
		t < f && (f = t);
	}
	if (e.lancement && (e.lancement.index += 1), e.gardeRuck = 0, e.porteur = null, e.cadenceDetaillee) {
		let { vers: i, duree: s } = zi(t, n, a, (e) => Bi(e, t));
		Qr(e, {
			variante: Ri(e, t, o, r, i),
			de: {
				x: t.pos.x,
				y: t.pos.y
			},
			vers: i,
			duree: s,
			ecoule: 0,
			hauteur: j(fr * s * s / 8 * .6, .08, 1.1),
			type: "passe",
			intention: "passe",
			auteur: t,
			receveur: n
		});
	} else Qr(e, {
		de: {
			x: t.pos.x,
			y: t.pos.y
		},
		vers: a,
		duree: j(.08 + o / (12 + t.passe * .32), .18, .95),
		ecoule: 0,
		hauteur: Math.min(.28, .08 + o * .008),
		type: "passe",
		intention: "passe",
		auteur: t,
		receveur: n
	});
	if (f > 13 && d > 0) for (let e of u) e.numero !== 15 && A(e.pos, n.pos) < 180 && (e.battu = Math.max(e.battu, 1.5));
	else e.lancement && e.lancement.type !== "ras" && e.lancement.index === e.lancement.chaine.length - 1 && !n.avant && n.numero >= 11 && e.rng() < .45 && J(e, "jeu", t.cote, R(e.rng, Ot, { nom: n.nom }), 0, n.moi);
	return !0;
}
var _i = [
	"equilibre",
	"avants",
	"large",
	"equilibre",
	"pied",
	"leurres"
];
function vi(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n++) t = Math.imul(t ^ e.charCodeAt(n), 16777619);
	return _i[(t >>> 0) % _i.length];
}
function yi(e) {
	return e === "avants" ? { attaque: "avants" } : e === "large" || e === "leurres" ? { attaque: "large" } : e === "pied" ? { attaque: "occupation" } : void 0;
}
function bi(e) {
	let t = me(e.ballon), n = 70 - he(e.ballon), r = e.serieCote, i = t;
	return r && r.n >= 3 && (r.cote !== t || n > 14) && e.rng() < .6 ? i = r.cote === 1 ? -1 : 1 : n > 19 && e.rng() < .2 && (i = t === 1 ? -1 : 1), r && i !== r.cote && r.n >= 3 && J(e, "jeu", e.possession, `${Y(e, e.possession)} renverse le jeu : tout le monde se replace de l’autre côté du ruck.`), e.serieCote = r && r.cote === i ? {
		cote: i,
		n: r.n + 1
	} : {
		cote: i,
		n: 1
	}, i;
}
var xi = {
	lateral: 4.8,
	attente: 5.2,
	lance: .9,
	epaule: 1.2,
	soutien: .9
};
function Si(e, t, n) {
	let r = e.ruck?.organisation, i = M(t), a = {
		x: e.ballon.x - i * xi.attente,
		y: j(e.ballon.y + e.ouvert * xi.lateral, 2.5, 67.5)
	}, o = /* @__PURE__ */ new Set([...r?.attaque ?? [], n]), s = H(e, t).filter((e) => e.avant && e.sanction <= 0 && !e.corps && !o.has(e.id)).sort((e, t) => A(e.pos, a) - A(t.pos, a)).slice(0, 4);
	if (s.length < 3) {
		e.blocPrepare = null;
		return;
	}
	let c = [...s].sort((e, t) => e.stats.courses - t.stats.courses)[0], l = s.filter((e) => e !== c).slice(0, 2);
	e.blocPrepare = {
		cote: t,
		ids: [
			c.id,
			l[0].id,
			l[1].id
		]
	};
}
function Ci(e) {
	let t = e.blocPrepare;
	if (!t) return;
	let n = e.phase === "ruck" && e.possession === t.cote, r = e.lancement, i = e.phase === "jeuCourant" && e.possession === t.cote && !!r && r.index === 0 && !e.vol && (r.chaine.slice(1).some((e) => t.ids.includes(e.id)) || r.structure === "ecran");
	if (!n && !i) {
		e.phase !== "ruck" && (e.blocPrepare = null);
		return;
	}
	if (i && r.structure === "ecran") return;
	let a = M(t.cote), o = n ? e.ballon : e.origine, s = i && e.gardeRuck < .85 || n && e.minuteur < .6;
	t.ids.forEach((t, n) => {
		let r = e.pions.find((e) => e.id === t);
		if (!r || !r.surLeTerrain || r.sanction > 0 || r.corps || r.role === "ruck" || r === e.porteur) return;
		let i = n === 0 ? 0 : n === 1 ? -1 : 1;
		r.role = "podRas", r.cible = {
			x: Z(o.x - a * ((s ? xi.lance : xi.attente) + (n === 0 ? 0 : xi.soutien))),
			y: j(o.y + e.ouvert * xi.lateral + i * xi.epaule, 2, 68)
		}, r.effort = s ? .96 : .9;
	});
}
function wi(e, t, n, r, i, a, o, s, c) {
	if (!r || !i || !a || i === r || r.avant || P(e.ballon, t) < 12) return null;
	let l = e.styles?.[t] ?? "equilibre", u = l === "leurres" ? 1.7 : l === "large" ? 1.15 : l === "avants" ? .65 : l === "pied" ? .75 : 1, d = e.rng(), f = (e) => !!e && e.surLeTerrain && e.sanction <= 0 && !e.corps && e.role !== "ruck";
	if (!f(i) || !f(a)) return null;
	let p = e.blocPrepare?.cote === t ? e.blocPrepare.ids.map((e) => n.find((t) => t.id === e)).filter((e) => f(e)) : [], m = p.length === 3 ? p : n.filter((t) => t.avant && f(t) && (t.pos.y - e.ballon.y) * e.ouvert > -3 && A(t.pos, e.ballon) < 576).sort((t, n) => A(t.pos, e.ballon) - A(n.pos, e.ballon)).slice(0, 3), h = [
		r,
		i,
		a,
		o,
		s
	].filter((e) => !!e);
	return d < .16 * u && m.length === 3 ? {
		type: "large",
		structure: "ecran",
		leurres: m,
		chaine: h,
		index: 0,
		libelle: "passe derrière le bloc d’avants"
	} : d < .25 * u && c <= 4 ? {
		type: "large",
		structure: "croisee",
		chaine: [
			r,
			i,
			a
		],
		index: 0,
		libelle: "croisée ouvreur – centre"
	} : d < .31 * u && o && f(o) ? {
		type: "large",
		structure: "redoublee",
		index: 0,
		libelle: "redoublée de l’ouvreur",
		chaine: [
			r,
			i,
			a,
			i,
			o,
			s
		].filter((e) => !!e)
	} : null;
}
function Ti(e, t, n) {
	let r = t.chaine[1], i = t.chaine[2];
	if (!r) return;
	let a = t.structure === "ecran" ? `Le bloc d’avants de ${Y(e, n)} se lance au ras : ${r.nom} attend le ballon derrière eux.` : t.structure === "croisee" && i ? `${r.nom} et ${i.nom} préparent une croisée.` : t.structure === "redoublee" ? `${r.nom} annonce la redoublée.` : "";
	a && e.rng() < .7 && J(e, "jeu", n, a, 0, r.moi);
}
function Ei(e) {
	Ci(e), Di(e);
	let t = e.lancement;
	if (!t?.structure || e.phase !== "jeuCourant") return;
	let n = e.possession, r = M(n), i = e.porteur ?? (e.vol?.type === "passe" ? e.vol.receveur : null);
	if (!i || i.cote !== n) return;
	if (t.structure === "ecran" && t.leurres && t.index <= 1) {
		let n = t.index >= 1 || e.gardeRuck < .9;
		t.leurres.forEach((t, i) => {
			!t.surLeTerrain || t.sanction > 0 || t.corps || t === e.porteur || (t.role = "podRas", t.cible = {
				x: Z(e.ligneAvantage + r * (n ? 6.5 : -1)),
				y: j(t.pos.y + (i - 1) * .02, 2, 68)
			}, t.effort = n ? 1.1 : .8);
		});
		return;
	}
	let a = t.chaine[1], o = t.chaine[2];
	if (t.structure === "croisee" && t.index === 1 && a && o && !o.corps) {
		o.role = "ligne", o.cible = {
			x: Z(a.pos.x - r * 1.3 + a.vitesse.x * .35),
			y: j(a.pos.y - e.ouvert * 2.6 + a.vitesse.y * .35, 2, 68)
		}, o.effort = 1.12;
		return;
	}
	t.structure === "redoublee" && t.index === 2 && e.porteur === o && a && !a.corps && (a.role = "ligne", a.cible = {
		x: Z(o.pos.x - r * 2.1),
		y: j(o.pos.y + e.ouvert * 3.4, 2, 68)
	}, a.effort = 1.15);
}
function Di(e) {
	let t = e.lancement, n = e.porteur;
	if (e.phase !== "jeuCourant" || !t || !n || n.cote !== e.possession || e.echappee || t.structure === "croisee" && t.index === 1 || t.structure === "redoublee" && t.index === 2) return;
	let r = M(n.cote), i = Math.max(0, n.vitesse.x * r);
	for (let a = 1; a <= 2; a++) {
		let o = t.chaine[t.index + a];
		if (!o || o === n || !o.surLeTerrain || o.sanction > 0 || o.corps || e.blocPrepare?.ids.includes(o.id) || t.leurres?.includes(o)) continue;
		let s = (n.pos.x - o.pos.x) * r, c = Bi(k(n.pos, o.pos), n), l = Math.max(0, o.vitesse.x * r) * c * .9 + 1, u = a === 1 ? s > l ? 1 : -l : -l - 1.8;
		o.cible = {
			x: Z(n.pos.x + r * (i * .5 + u)),
			y: o.cible.y
		}, o.effort = a === 1 ? 1 : .85;
	}
}
function Oi(e, t) {
	let n = e.lancement;
	if (!e.cadenceDetaillee || !n) return null;
	let r = M(t.cote);
	return n.couloir !== void 0 && n.index === 0 && t === n.chaine[0] && Math.abs(t.pos.x - e.origine.x) < 6 ? {
		x: Z(t.pos.x + r * 7),
		y: j(e.origine.y + n.couloir, 2.5, 67.5)
	} : n.structure ? n.structure === "croisee" && n.index === 1 && t === n.chaine[1] ? {
		x: Z(t.pos.x + r * 8),
		y: j(t.pos.y + e.ouvert * 7, 2.5, 67.5)
	} : n.structure === "redoublee" && n.index === 2 && t === n.chaine[2] ? {
		x: Z(t.pos.x + r * 10),
		y: t.pos.y
	} : null : null;
}
function ki(e, t, n) {
	let r = e.lancement;
	return n.vitesse.x * M(t.cote) < -2.6 ? !0 : r && r.index === 0 && e.blocPrepare?.ids[0] === n.id && e.gardeRuck > .12 ? (t.pos.x - n.pos.x) * M(t.cote) > 1.1 : r?.structure ? r.structure === "ecran" && r.index === 0 && r.leurres?.[0] && e.gardeRuck > .12 ? (t.pos.x - r.leurres[0].pos.x) * M(t.cote) > .9 : r.structure === "croisee" && r.index === 1 && t === r.chaine[1] ? (n.pos.y - t.pos.y) * e.ouvert > -.8 : r.structure === "redoublee" && r.index === 2 && t === r.chaine[2] && (n.pos.y - t.pos.y) * e.ouvert < 1.6 : !1;
}
function Ai(e, t, n, r) {
	let i = n.cote, a = H(e, N(i)).filter((e) => e.sanction <= 0 && !e.corps && e.battu <= 0), o = (t, n, r) => {
		let i = a.filter((e) => A(e.pos, t.pos) < n * n).sort((e, n) => A(e.pos, t.pos) - A(n.pos, t.pos))[0];
		if (!i) return !1;
		let o = j(r + (t.vitesseMax * 7 + t.puissance * .25 - i.vision) / 170, .25, .85);
		return e.rng() >= o ? !1 : (i.battu = Math.max(i.battu, .65 + e.rng() * .45), i.cible = { ...t.pos }, !0);
	};
	t.structure === "ecran" && t.index === 0 && t.leurres ? (t.fixe = !0, t.leurres.filter((e) => e.surLeTerrain && !e.corps && o(e, 8, .6)).length >= 2 && J(e, "jeu", i, `La défense mord sur le bloc d’avants : le ballon est passé derrière, pour ${r.nom}.`, 0, r.moi)) : t.structure === "croisee" && t.index === 1 ? (t.fixe = !0, o(n, 7, .66) && J(e, "jeu", i, `Croisée ! ${r.nom} rentre dans le dos de ${n.nom}, la défense est à contre-pied.`, 0, r.moi)) : t.structure === "redoublee" && t.index === 2 && (t.fixe = !0, o(n, 6, .6) && J(e, "jeu", i, `Redoublée : ${r.nom} ressort à l’extérieur et retrouve le ballon lancé.`, 0, r.moi));
}
var ji = 2.6, Mi = {
	recul: .5,
	ecart: .62,
	portee: 8,
	accroche: 2.2
};
function Ni(e) {
	let t = e.cellule;
	if (t?.pousse && e.phase === "jeuCourant" && e.porteur?.id === t.porteurId) return;
	if (e.phase !== "jeuCourant") {
		e.cellule = null;
		return;
	}
	let n = e.porteur, r = n && n.avant && n.sanction <= 0 && e.echappee?.pion !== n ? n : null, i = !1;
	if (!r) {
		let t = n && e.lancement ? e.lancement.chaine.slice(e.lancement.index + 1) : [], a = e.vol?.type === "passe" && e.vol.receveur?.avant ? e.vol.receveur : t.find((e) => e.avant) ?? null;
		a && a.avant && a.surLeTerrain && a.sanction <= 0 && !a.corps && (r = a, i = !0);
	}
	if (!r) {
		e.cellule = null;
		return;
	}
	let a = r;
	a.cote;
	let o = new Set((e.lancement?.chaine ?? []).slice((e.lancement?.index ?? 0) + 1)), s = (e) => e.surLeTerrain && e.sanction <= 0 && !e.corps && e.avant && e !== a && e !== n && e.role !== "ruck" && !o.has(e), c = t?.porteurId === a.id ? t.soutiens.map((t) => e.pions.find((e) => e.id === t)).filter((e) => !!e && s(e) && A(e.pos, a.pos) < 144) : [];
	if (c.length < 2) {
		let t = c, n = H(e, a.cote).filter((e) => s(e) && !t.includes(e) && A(e.pos, a.pos) < Mi.portee ** 2).sort((e, t) => A(e.pos, a.pos) - A(t.pos, a.pos));
		c = [...t, ...n].slice(0, 2);
	}
	if (!c.length) {
		e.cellule = null;
		return;
	}
	c.sort((e, t) => e.pos.y - t.pos.y);
	let l = [];
	c.forEach((e, t) => {
		let n = c.length === 1 ? e.pos.y < a.pos.y ? -1 : 1 : t === 0 ? -1 : 1, r = Pi(a, n, i);
		if (e.role = "podRas", !i && k(e.pos, r) < Mi.accroche) {
			l.push(e.id);
			return;
		}
		e.cible = {
			x: Z(r.x + a.vitesse.x * .5),
			y: j(r.y + a.vitesse.y * .5, 1, 69)
		}, e.effort = 1.12;
	});
	let u = t?.porteurId === a.id;
	e.cellule = {
		porteurId: a.id,
		soutiens: c.map((e) => e.id),
		accroches: l,
		lie: u ? t.lie : !1,
		depuis: u ? t.depuis : e.sim,
		pousseFaite: u ? t.pousseFaite : !1,
		approche: i
	}, !i && l.length && (a.effort = Math.min(a.effort, .92));
}
function Z(e) {
	return j(e, .5, 121.5);
}
function Pi(e, t, n) {
	let r = M(e.cote);
	return {
		x: Z(e.pos.x - r * (n ? .9 : Mi.recul)),
		y: j(e.pos.y + t * (n ? 1 : Mi.ecart), 1, 69)
	};
}
function Fi(e) {
	let t = e.cellule;
	if (!t || !t.accroches?.length) return;
	let n = e.pions.find((e) => e.id === t.porteurId);
	if (!n) return;
	let r = 0, i = t.soutiens.map((t) => e.pions.find((e) => e.id === t)).filter((e) => !!e);
	i.forEach((e, a) => {
		if (!t.accroches.includes(e.id)) return;
		let o = i.length === 1 ? e.pos.y < n.pos.y ? -1 : 1 : a === 0 ? -1 : 1, s = Pi(n, o, !1), c = k(e.pos, s), l = Ce(e) * 1.15 * K, u = c > l ? l / c : 1, d = e.pos.x + (s.x - e.pos.x) * u, f = e.pos.y + (s.y - e.pos.y) * u;
		e.vitesse = {
			x: (d - e.pos.x) / K,
			y: (f - e.pos.y) / K
		}, e.stats.distanceParcourue += Math.hypot(d - e.pos.x, f - e.pos.y), e.pos.x = d, e.pos.y = f, e.cible = {
			x: s.x,
			y: s.y
		}, k(e.pos, s) < .45 && r++;
	}), t.lie = r >= 2;
}
function Ii(e, t, n) {
	let r = e.cellule;
	if (!e.cadenceDetaillee || !r || r.porteurId !== t.id || !r.lie || r.pousseFaite || r.pousse) return !1;
	let i = r.soutiens.map((t) => e.pions.find((e) => e.id === t)).filter((e) => !!e), a = j(1.5 + (t.puissance * .5 + oa(i, (e) => e.puissance) * .5 - n.puissance) / 45, .9, 2.4), o = .9 + e.rng() * .5;
	return r.pousse = {
		defenseurId: n.id,
		jusqua: e.sim + o,
		vitesse: a,
		debut: e.sim
	}, F(n), H(e, n.cote).filter((e) => e !== n && e.sanction <= 0 && !e.corps && e.battu <= 0 && A(e.pos, t.pos) < 20.25).sort((e, n) => A(e.pos, t.pos) - A(n.pos, t.pos)).slice(0, 2).forEach((e) => {
		e.battu = Math.max(e.battu, o + .6), e.cible = { ...t.pos };
	}), !0;
}
function Li(e, t) {
	let n = e.cellule, r = n.pousse, i = M(t.cote), a = e.pions.find((e) => e.id === r.defenseurId), o = (r) => {
		if (n.pousse = void 0, n.pousseFaite = !0, r && r.surLeTerrain && r.sanction <= 0) return Ji(e, t, r, !0);
	};
	if (!a || !a.surLeTerrain || a.sanction > 0) return o(void 0);
	let s = H(e, a.cote).filter((e) => e !== a && e.sanction <= 0 && !e.corps && A(e.pos, t.pos) < 2.25).length, c = r.vitesse * .6 ** s, l = t.pos.x;
	t.vitesse = {
		x: i * c,
		y: 0
	}, t.pos.x = j(t.pos.x + i * c * K, -1.5, 123.5), a.pos = {
		x: t.pos.x + i * .8,
		y: t.pos.y + j(a.pos.y - t.pos.y, -.3, .3)
	}, a.vitesse = {
		x: i * c,
		y: 0
	}, a.cible = { ...a.pos }, Fi(e);
	let u = (t) => Math.max(0, (t - e.ligneAvantage) * i), d = u(t.pos.x) - u(l);
	if (d > 0 && (t.stats.metres += d, e.metresGagnesPhase = Math.max(e.metresGagnesPhase, u(t.pos.x))), e.ballon = {
		x: t.pos.x,
		y: t.pos.y
	}, fe(t.pos, t.cote)) return n.pousse = void 0, n.pousseFaite = !0, ba(e, t);
	if (e.sim >= r.jusqua || s >= 2) return o(a);
}
function Ri(e, t, n, r, i) {
	let a = M(t.cote), o = Math.hypot(t.vitesse.x, t.vitesse.y), s = H(e, N(t.cote)).filter((e) => e.sanction <= 0 && !e.corps && e.battu <= 0 && (e.pos.x - t.pos.x) * a > -.4 && A(e.pos, t.pos) < 1.55 * 1.55).sort((e, n) => A(e.pos, t.pos) - A(n.pos, t.pos))[0];
	if (s && o > 1.5) {
		B(e, s, "tackle_low", 1.2, "apres-passe");
		let n = t.pos.x - s.pos.x, r = t.pos.y - s.pos.y, i = Math.max(.01, Math.hypot(n, r));
		return V(t, {
			x: n / i * 1.6 + t.vitesse.x * .3,
			y: r / i * 1.6 + t.vitesse.y * .3
		}, 1.5), s.battu = Math.max(s.battu, 1.2), F(s), e.rng() < .3 && J(e, "jeu", t.cote, `${t.nom} fixe ${s.nom} et donne au contact.`, 0, t.moi), "contact";
	}
	if (n < 6.5 && r < 2.6 && o > 3.2 && t.passe >= 66 && t.numero !== 9 && e.rng() < (t.avant ? .05 : .16)) return e.rng() < .1 && (i.x -= a * .9, i.y += (e.rng() < .5 ? -1 : 1) * 1.4), e.rng() < .5 && J(e, "jeu", t.cote, `Chistera de ${t.nom} !`, 0, t.moi), "chistera";
}
function zi(e, t, n, r) {
	let i = M(t.cote), a = Math.max(0, (e.pos.x - n.x) * i - .5), o = t.vitesse.x * i, s = Math.max(1, t.acceleration * .85), c = Ce(t) * 1.05, l = o < 0 ? -o / s : 0, u = r(k(e.pos, n)), d = n;
	for (let f = 0; f < 3; f++) {
		let f = o < 0 && u > l ? -o * o / (2 * s) + .5 * s * (u - l) ** 2 : o * u + .5 * s * u * u, p = Math.min(a, f), m = j(t.vitesse.y * u * .9, -6.5, 6.5), h = Math.hypot(p, m), g = c * u;
		h > g && (p *= g / h, m *= g / h), d = {
			x: Z(n.x + i * p),
			y: j(n.y + m, 1, 69)
		}, u = r(k(e.pos, d));
	}
	return {
		vers: d,
		duree: u
	};
}
function Bi(e, t) {
	return j(.14 + e / (j(8.2 + e * .52, 9, 18) * (.92 + t.passe / 1e3)), .34, 1.25);
}
function Vi(e, t) {
	let n = M(t.cote);
	return H(e, t.cote).some((e) => e !== t && !e.corps && e.sanction <= 0 && (e.pos.x - t.pos.x) * n <= .8 && A(e.pos, t.pos) < 49 && e.vitesse.x * n > 2);
}
function Hi(e, t) {
	return H(e, N(t.cote)).filter((e) => e.sanction <= 0 && !e.corps && A(e.pos, t.pos) < 5.76).length;
}
function Ui(e, t, n, r) {
	let i = M(t.cote), a = H(e, t.cote).filter((e) => e !== t && (e.pos.x - t.pos.x) * i <= .8 && A(e.pos, t.pos) < 90);
	if (!a.length) return !1;
	let o = a.sort((e, n) => A(t.pos, e.pos) - A(t.pos, n.pos))[0], s = !1;
	if (n && r && (Kr(t, r), e.rng() < ur(t, n, Hi(e, t)))) {
		let n = e.rng();
		if (B(e, t, "offload", .9, "rate"), n < .4) return J(e, "plaquage", r.cote, `${t.nom} veut faire vivre le ballon après contact : il part en avant.`, 0, t.moi), li(e, t), !0;
		if (n < .72) return J(e, "plaquage", r.cote, `Offload manqué de ${t.nom} : le ballon lui échappe et roule au sol.`, 0, t.moi), e.lancement = null, e.ballon = {
			x: t.pos.x,
			y: t.pos.y
		}, ri(e, {
			de: { ...e.ballon },
			vers: {
				x: e.ballon.x - i * (.8 + e.rng() * 1.6),
				y: j(e.ballon.y + (e.rng() - .5) * 3, 1, 69)
			},
			duree: .35,
			ecoule: .35,
			hauteur: .4,
			type: "pied",
			intention: "renvoi",
			auteur: t,
			receveur: null
		}, "touche"), !0;
		s = !0;
	}
	J(e, "jeu", t.cote, z("offload", {
		porteur: t.nom,
		receveur: o.nom
	}), 0, t.moi || o.moi), t.stats.passes += 1, t.stats.offloads += 1, e.dernierPasseur = t, e.lancement && (e.lancement.chaine = [], e.lancement.index = 0), e.porteur = null;
	let c = e.cadenceDetaillee ? zi(t, o, {
		x: o.pos.x,
		y: o.pos.y
	}, (e) => j(.16 + e / 8.5, .3, .7)) : {
		vers: {
			x: o.pos.x,
			y: o.pos.y
		},
		duree: .28
	};
	s && (c.vers.x = Z(c.vers.x - i * (.8 + e.rng() * .8)), c.vers.y = j(c.vers.y + (e.rng() < .5 ? -1 : 1) * (1.2 + e.rng()), 1, 69));
	let l = t.numero + o.numero + Math.floor(e.t) & 1 ? -1 : 1;
	return Qr(e, {
		variante: n ? s ? "rate" : dr(n, (o.pos.x - t.pos.x) * i < -1.5, l) : void 0,
		de: {
			x: t.pos.x,
			y: t.pos.y
		},
		vers: c.vers,
		duree: c.duree,
		ecoule: 0,
		hauteur: 0,
		type: "passe",
		intention: "offload",
		auteur: t,
		receveur: o
	}), !0;
}
function Wi(e, t, n, r, i, a = 1) {
	let o = .72 + n.endurance / 360, s = n.plaquage * o * (i ? 1.16 : 1), c = .76 + t.endurance / 420, l = (t.evitement * .55 + t.puissance * .45) * c, u = P(t.pos, t.cote), d = u < 6 ? .09 : u < 12 ? .05 : 0, f = Ln(e, n.cote), p = e.defenseArcadeCote === n.cote ? .055 : 0, m = j(.93 + (s - l) / 380 + f + d + p - Gi(t, r) * a, .45, .99);
	return e.resserrement ? 1 - (1 - m) * (1 - .6 * j(e.resserrement, 0, 1)) : m;
}
function Gi(e, t) {
	let n = (e, t) => j((e - t) * .006, 0, .26);
	switch (t) {
		case "crochet": return n(e.evitement, 43);
		case "raffut": return n(e.puissance, 58);
		case "sprint": return j((e.vitesseMax - 7.6) * .11, 0, .2);
		default: return 0;
	}
}
function Ki(e, t, n) {
	let r = An(e, t), i = Math.abs(n.pos.y - t.pos.y) < .9, a = t.puissance - t.evitement;
	return i && t.puissance >= 70 && a >= 7 ? "raffut" : t.evitement >= 66 && r > 2 && t.pos.y > 3 && t.pos.y < 67 ? "crochet" : !i && r > 4 && t.vitesseMax > n.vitesseMax ? "sprint" : t.puissance > n.puissance + 5 ? "raffut" : null;
}
function qi(e, t, n, r) {
	let i = t.numero + n.numero + Math.floor(e.t) & 1 ? -1 : 1, a = t.pos.y < 4 ? 1 : t.pos.y > 66 ? -1 : i;
	if (r === "raffut") {
		let r = or(t, n);
		B(e, t, r === "percussion" ? "bump" : "handoff", 1.1, r);
	} else r === "crochet" ? B(e, t, "dodge", 1.1, `${cr(t, a, e.ouvert, i)}:${a}`) : r && B(e, t, "sprint_ball", 1.1);
	if (r === "crochet") {
		let e = a;
		return t.cible.y = j(t.pos.y + e * 2.6, 1, 69), t.vitesse.y += e * 1.5, e;
	}
	return r === "sprint" && (t.effort = 1, t.vitesse.x += M(t.cote) * 1.1), i;
}
function Ji(e, t, n, r) {
	if (A(t.pos, n.pos) > br ** 2) {
		n.cible = { ...t.pos };
		return;
	}
	let i = e.cadenceDetaillee ? ir(t, n, t.numero + n.numero + Math.floor(e.t) & 1 ? -1 : 1) : null;
	Gr(t, n), e.ballon = { ...t.pos };
	let a = mn(e, n);
	if (a) {
		B(e, n, a.cathedrale ? "foul_tip" : a.haut ? "foul_high" : "foul_late", a.cathedrale ? 2 : 1.3), B(e, t, a.cathedrale ? "reaction_tip" : a.haut ? "reaction_high" : "reaction_hit", a.cathedrale ? 2 : 1.4), a.cathedrale && V(t, {
			x: M(n.cote) * 3.4,
			y: 0
		}, 2.3), e.compteurs.irregularites += 1, n.stats.plaquagesManques += 1, t.battu = .6, e.rng() < Pt(e, t.pos) && da(e, t.cote, {
			x: t.pos.x,
			y: t.pos.y
		}, a.motif, n, a.cathedrale ? e.rng() < .35 ? "rouge" : "jaune" : a.haut && e.rng() < .22 ? "jaune" : void 0), hn(e, n, t, a);
		return;
	}
	let o = t.moi && e.controle && e.intention ? e.intention.type : null, s = o ? null : Ki(e, t, n), c = o ?? s, l = qi(e, t, n, c), u = n.moi && On(e, "plaquage"), d = Wi(e, t, n, c, u, o ? 1 : .3);
	if (r === void 0 ? e.rng() >= d : !r) {
		if (n.stats.plaquagesManques += 1, t.stats.franchissements += 1, B(e, n, "tackle_low", e.cadenceDetaillee ? 2.3 : 1.05, "manque"), n.battu = u ? 3 : 2, t.battu = .4, e.cadenceDetaillee) Yi(e, t, n, c, l);
		else if (c === "raffut") {
			let r = j(2.8 + (t.puissance - n.puissance) / 20 + ((t.poidsKg ?? 95) - (n.poidsKg ?? 95)) / 50, 2, 5.8);
			r > 3.6 || t.puissance - n.puissance > 6 || e.rng() < .42 ? (B(e, n, "fall_back", 1.8), V(n, {
				x: M(t.cote) * (r + 1.2),
				y: l * .6
			}, 2.2), e.grosImpact = {
				lieu: { ...n.pos },
				type: "raffut",
				restant: 2.2
			}, J(e, "franchissement", t.cote, `GROS IMPACT ! ${t.nom} envoie ${n.nom} sur les fesses d’un raffut destructeur !`, 0, t.moi || n.moi)) : (V(n, {
				x: M(t.cote) * r,
				y: l * 1.2
			}, 1.85), B(e, n, "reaction_hit", 1.2)), B(e, t, "bump", 1.1), n.vitesse.x += M(t.cote) * 2.8, n.vitesse.y += l * .8, n.cible.y = j(n.pos.y + l * 1.6, 0, 70);
		} else c === "crochet" && (n.vitesse.y -= l * 1.7);
		if (!e.cadenceDetaillee && !n.corps) {
			let e = t.vitesse;
			V(n, {
				x: e.x * .55 + M(t.cote) * .8,
				y: e.y * .55 - l * 1.3
			}, 1.15);
		}
		t.moi && (e.perceeJoueur = !0), jn(e, t) >= 7.5 && An(e, t) >= 7 ? Qa(e, t) : Pn(e, t.cote, Mn.percee * .5), c === "crochet" || c === "raffut" ? (o && kn(e), J(e, "franchissement", t.cote, z(c === "crochet" ? "crochetReussi" : "raffutReussi", {
			nom: t.nom,
			cible: n.nom
		}), 0, !!o)) : u ? (kn(e), J(e, "plaquage", t.cote, z("plaquageRateJoueur", {
			nom: n.nom,
			cible: t.nom
		}), 0, !0)) : e.rng() < .22 && J(e, "plaquage", t.cote, z("cassePlaquage", {
			porteur: t.nom,
			defenseur: n.nom
		}), 0, t.moi || n.moi);
		return;
	}
	if (!(r === void 0 && Ii(e, t, n))) {
		n.stats.plaquages += 1, u && (kn(e), J(e, "plaquage", n.cote, z("plaquageLance", {
			nom: n.nom,
			cible: t.nom
		}), 0, !0), nn(e, 4));
		for (let r of H(e, n.cote)) if (!(r === n || r.battu > 0) && A(r.pos, t.pos) < 5.3) {
			r.stats.plaquages += 1;
			break;
		}
		if (e.rng() < .08 && J(e, "plaquage", n.cote, R(e.rng, at, {
			nom: n.nom,
			cible: t.nom
		}), 0, n.moi || t.moi), e.rng() < .02 * (1.6 - n.discipline / 130) * (u ? 2.2 : 1) && (u && nn(e, 8), B(e, n, "foul_high", 1.3), B(e, t, "reaction_high", 1.4), e.rng() < Pt(e, t.pos, n.id))) return da(e, t.cote, t.pos, "plaquage haut", n);
		if (o === "crochet" && (kn(e), J(e, "plaquage", n.cote, z("crochetRate", {
			nom: t.nom,
			cible: n.nom
		}), 0, !0), e.rng() < .13)) return li(e, t);
		if (i) {
			if (e.rng() < lr(t, i, Vi(e, t), Hi(e, t), c === "raffut") && Ui(e, t, i, n)) return;
		} else if (e.rng() < .055 + t.vision / 1600 + (o === "raffut" ? .22 : 0) && Ui(e, t)) return;
		if (t.endurance < 30 && e.rng() < j((30 - t.endurance) / 250, .02, .08)) return J(e, "plaquage", n.cote, `Sous le choc et la fatigue, ${t.nom} commet un en-avant au contact !`, 0, t.moi || n.moi), li(e, t);
		if (i) return Xi(e, t, n, i, u);
		n.plaquage + n.puissance - (t.evitement + t.puissance) > 6 || u && e.rng() < .45 || e.rng() < .2 ? (B(e, t, "fall_back", 1.8), B(e, n, "tackle_drive", 1.6), Kr(t, n, !0), e.grosImpact = {
			lieu: { ...t.pos },
			type: "tampon",
			restant: 2.2
		}, nn(e, 8), J(e, "plaquage", n.cote, `ÉNORME TAMPON de ${n.nom} ! ${t.nom} est séché net et envoyé sur les fesses !`, 0, n.moi || t.moi)) : (Kr(t, n), B(e, t, Math.abs(t.corps?.direction ?? 0) < Math.PI / 2 ? "fall_forward" : "fall_back", 1.4), B(e, n, (t.corps?.intensite ?? 0) > .75 ? "tackle_drive" : "tackle_low", 1.35)), Zi(e, {
			x: t.pos.x,
			y: t.pos.y
		}, {
			porteur: t,
			defenseur: n
		});
	}
}
function Yi(e, t, n, r, i) {
	let a = M(t.cote), o = () => V(n, {
		x: t.vitesse.x * .55 + a * .8,
		y: t.vitesse.y * .55 - i * 1.3
	}, 2.3);
	if (r === "raffut") {
		let r = or(t, n), o = ar(t, n), s = j(2.8 + (t.puissance - n.puissance) / 20 + ((t.poidsKg ?? 95) - (n.poidsKg ?? 95)) / 50, 2, 5.8);
		o === "tombe" ? (B(e, n, "fall_back", 2.4, r === "percussion" ? "assis" : "raffute"), V(n, {
			x: a * (s + 1.2),
			y: i * .6
		}, 2.4), e.grosImpact = {
			lieu: { ...n.pos },
			type: "raffut",
			restant: 2.2
		}, J(e, "franchissement", t.cote, r === "percussion" ? `${t.nom} baisse l’épaule et met ${n.nom} sur les fesses !` : `GROS IMPACT ! ${t.nom} envoie ${n.nom} sur les fesses d’un raffut destructeur !`, 0, t.moi || n.moi)) : o === "equilibre" ? (B(e, n, "reaction_hit", 1.8, "equilibre"), V(n, {
			x: a * s * .8,
			y: i * 1.2
		}, 1.8)) : (B(e, n, "reaction_hit", 1, "repousse"), n.battu = Math.max(1, Math.min(n.battu, 1.2))), n.vitesse.x += a * 2.8, n.vitesse.y += i * .8, n.cible.y = j(n.pos.y + i * 1.6, 0, 70);
		return;
	}
	if (r === "crochet") {
		if (n.vitesse.y -= i * 1.7, sr(t, n) === "contrepied") {
			o();
			return;
		}
		B(e, n, "reaction_hit", 1.1, "elimine"), n.battu = Math.max(1.1, Math.min(n.battu, 1.3));
		return;
	}
	r !== "sprint" && B(e, t, "bump", .9, "casse"), o();
}
function Xi(e, t, n, r, i) {
	let a = M(t.cote), o = r.type !== "dominant" && i && e.rng() < .45 ? {
		...r,
		type: "dominant",
		recul: Math.max(.8, r.recul)
	} : r, s = Math.max(.01, Math.hypot(t.vitesse.x, t.vitesse.y)), c = s > .6 ? {
		x: t.vitesse.x / s,
		y: t.vitesse.y / s
	} : {
		x: a,
		y: 0
	};
	if (o.type === "dominant") B(e, t, "fall_back", 1.8, "dominant"), B(e, n, "tackle_drive", 1.6, "dominant"), Kr(t, n, !0), e.grosImpact = {
		lieu: { ...t.pos },
		type: "tampon",
		restant: 2.2
	}, nn(e, 8), J(e, "plaquage", n.cote, `ÉNORME TAMPON de ${n.nom} ! ${t.nom} est stoppé net et repoussé de ${o.recul.toFixed(0)} m.`, 0, n.moi || t.moi);
	else if (o.type === "accroche") {
		let r = 2.2 - o.recul;
		V(t, {
			x: c.x * r,
			y: c.y * r
		}, 2.1), V(n, {
			x: c.x * r * .85,
			y: c.y * r * .85
		}, 1.7), B(e, t, "fall_forward", 1.5, "accroche"), B(e, n, "tackle_low", 1.4, "accroche"), t.stats.metres += -o.recul;
	} else o.type === "debout" ? (V(t, {
		x: -c.x * .5,
		y: -c.y * .5
	}, 2.3), V(n, {
		x: -c.x * .35,
		y: -c.y * .35
	}, 1.7), B(e, t, "fall_back", 1.9, "debout"), B(e, n, "tackle_drive", 1.8, "debout")) : (Kr(t, n), B(e, t, Math.abs(t.corps?.direction ?? 0) < Math.PI / 2 ? "fall_forward" : "fall_back", 1.4, o.type), B(e, n, o.type === "jambes" || o.type === "poursuite" ? "tackle_low" : "tackle_drive", 1.35, o.type));
	Zi(e, {
		x: Z(t.pos.x - a * o.recul),
		y: t.pos.y
	}, {
		porteur: t,
		defenseur: n
	}), e.ruck && (e.ruck.plaquage = {
		type: o.type,
		angle: o.angle
	});
}
function Zi(e, t, n) {
	e.combinaisonEnCours = void 0, e.combinaisonPreparee = void 0, e.dernierPasseur = null, e.ballon = {
		x: j(t.x, 11.5, 110.5),
		y: j(t.y, 1.2, 68.8)
	}, e.porteur = null, e.vol = null, e.ballonLibre = null, e.phase = "ruck", e.phasesDepuisArret += 1, e.compteurs.rucks += 1, e.perceeSignalee = !1;
	let r = e.possession, i = N(r), a = (t) => (t.plaquage * .34 + t.puissance * .3 + t.vision * .2 + t.discipline * .16 + (t.numero === 6 || t.numero === 7 || t.numero === 2 ? 7 : 0)) * (.72 + t.endurance / 360) - k(t.pos, e.ballon) * 4.2, o = (t) => H(e, t).filter((e) => e.avant && e !== n?.porteur).map(a).sort((e, t) => t - e).slice(0, 3).reduce((e, t, n, r) => e + t / Math.max(1, r.length), 0), s = o(r) + (e.cohesion?.[r] ?? 50) * .12, c = o(i) + (e.cohesion?.[i] ?? 50) * .12 + (n?.defenseur ? 4 : 0);
	e.ruck = {
		porteurId: n?.porteur.id,
		plaqueurId: n?.defenseur.id,
		attaque: r,
		vitesseAttaque: s,
		vitesseDefense: c,
		debut: n ? e.t : void 0
	};
	let l = 0;
	if (e.cadenceDetaillee) {
		let t = (e.ballon.x - e.ligneAvantage) * M(r), n = e.avantage ?? 0;
		l = t >= 1.5 ? Math.min(3, Math.max(0, n) + 1) : t <= -1 ? Math.max(-3, Math.min(0, n) - 1) : 0, e.avantage = l;
	}
	let u = c + (e.rng() - .5) * 12 > s - 3 + l * 2.2;
	if (e.ballonLent = u, e.minuteur = ((u ? 4 : 2.25) + e.rng() * (u ? 1.5 : .9)) * (1 - .07 * l), e.placement = Me(e.pions, e.ballon, e.possession), n) {
		F(n.porteur), F(n.defenseur), n.porteur.role = "ruck", n.defenseur.role = "ruck";
		let t = M(n.porteur.cote);
		e.placement[n.porteur.id] = {
			x: e.ballon.x - t * .25,
			y: j(e.ballon.y - .35, 1.2, 68.8)
		}, e.placement[n.defenseur.id] = {
			x: e.ballon.x + t * .45,
			y: j(e.ballon.y + .35, 1.2, 68.8)
		};
	}
	let d = M(e.possession);
	if (e.horsJeu = t.x + d * 1.3, e.ligneDef = e.horsJeu, Vn(e), e.cadenceDetaillee && (e.ouvert = bi(e), e.coteDecidePour = r, Si(e, r, n?.porteur.id)), e.cadenceDetaillee && e.ruck.organisation) {
		let t = e.ruck.organisation;
		for (let n of [...t.attaque, ...t.defense]) {
			let t = e.pions.find((e) => e.id === n);
			if (!t) continue;
			let r = k(t.pos, e.ballon), i = Math.hypot(t.vitesse.x, t.vitesse.y), a = 1.2 + r * 1.6;
			r < 2.4 && i > a && (t.vitesse.x *= a / i, t.vitesse.y *= a / i);
		}
	}
}
function Qi(e) {
	let t = e.ruck?.organisation, n = Le(e, "ruck");
	n && t && delete t.chenille;
	let r = t?.chenille;
	if (r) {
		let n = e.pions.find((e) => e.id === r.neufId && e.surLeTerrain && e.sanction <= 0 && !e.corps), i = r.pretDepuis !== void 0 && e.sim - r.pretDepuis >= 1.5;
		if (n && i) {
			e.ruck = null, e.placement = null;
			let t = H(e, N(n.cote)).filter((e) => e.sanction <= 0).sort((e, t) => A(e.pos, n.pos) - A(t.pos, n.pos))[0];
			if (t && e.rng() < 1 / 12) {
				B(e, t, "charge_down", 1.4), B(e, n, "kick", .8), t.effort = 1.15, t.cible = { ...n.pos }, n.stats.coupsDePied += 1;
				let r = M(t.cote), i = {
					x: j(n.pos.x + r * (3 + e.rng() * 4), 2, 120),
					y: j(n.pos.y + (e.rng() - .5) * 5, 2, 68)
				};
				J(e, "franchissement", t.cote, `💥 CONTRE SUR LA CHENILLE ! ${t.nom} monte en flèche et contre la boîte de ${n.nom} ! Ballon libre !`, 0, t.moi || n.moi), Qr(e, {
					de: { ...n.pos },
					vers: i,
					duree: .7,
					ecoule: 0,
					hauteur: .35,
					type: "pied",
					intention: "chandelle",
					auteur: n,
					receveur: null
				}), e.porteur = null, e.phase = "ballonEnLAir", e.minuteur = .9, e.derniereTouche = t;
				return;
			}
			Ra(e, n, ue(n.pos, n.cote) ? "degagement" : "chandelle");
			return;
		}
		if (n && e.sim - r.debut < 10) {
			e.minuteur = Math.max(e.minuteur, .15);
			return;
		}
		delete t.chenille;
	}
	if (!n && t && !t.chenilleEssayee && !r && e.minuteur <= 0 && e.ballonLent && (e.ballon.x - 61) * M(e.possession) < -5) {
		let t = Wn(e);
		if (t && t.numero === 9 && Kn(e, t)) return;
	}
	if (e.minuteur > 0) return;
	if (e.cadenceDetaillee && t) {
		let n = Wn(e), r = t.attenteSortie ?? 0;
		if (n && k(n.pos, e.ballon) > ji && k(n.pos, e.ballon) < 7 && r < 1.2) {
			t.attenteSortie = r + K;
			return;
		}
	}
	let i = e.possession, a = N(i), o = e.ruck, s = (t) => (t.plaquage * .38 + t.puissance * .28 + t.vision * .19 + t.discipline * .15 + (t.numero === 7 ? 9 : t.numero === 6 || t.numero === 2 ? 6 : 0)) * (.7 + t.endurance / 335) - k(t.pos, e.ballon) * 5, c = H(e, a).filter((t) => t.avant && A(t.pos, e.ballon) < 72).sort((e, t) => s(t) - s(e)), l = H(e, i).filter((t) => t.avant && t.id !== o?.porteurId && A(t.pos, e.ballon) < 72).sort((e, t) => s(t) - s(e)), u = c[0], d = l.slice(0, 3), f = (o?.vitesseDefense ?? 45) * .42 + (u ? s(u) : 0) * .58 - ((o?.vitesseAttaque ?? 45) * .45 + d.reduce((e, t) => e + s(t), 0) / Math.max(1, d.length) * .55) + (e.ballonLent ? 6 : -4), p = Math.abs(e.ballon.x - ce(a));
	p < 8 ? f += 6.5 : p < 15 && (f += 3);
	let m = e.pions.find((e) => e.moi), h = On(e, "grattage") && !!m && m.cote === a && m.surLeTerrain && m.sanction <= 0 && A(m.pos, e.ballon) < 64;
	h && m && (kn(e), u = m, f += 12, J(e, "ruck", a, z("grattagePlonge", { nom: m.nom }), 0, !0));
	let g = f + (e.rng() - .5) * 26, _ = u?.discipline ?? 50, v = !u || k(u.pos, e.ballon) > 3.4;
	if (u && e.rng() < j(.018 + (62 - _) / 900 + (v ? .055 : 0), .012, .11)) return e.ruck = null, da(e, i, e.ballon, v ? "défenseur qui plonge au ruck" : "entrée par le côté au ruck", u);
	if (u && !v && g > 13 && e.rng() < j(.1 + g / 180, .1, .27)) return e.ruck = null, da(e, a, e.ballon, "ballon gardé au sol");
	let y = j(.065 + g / 170 + (h ? .06 : 0), .015, .34);
	if (u && !v && e.rng() < y) u.stats.grattages += 1, B(e, u, "jackal", 2.2), J(e, "ruck", a, R(e.rng, st, { nom: u.nom }), 0, u.moi), e.possession = a, e.phasesDepuisArret = 0, e.dernierTurnover = {
		pion: u,
		t: e.t
	}, Pn(e, a, Mn.turnover);
	else if (g > 9 && c.length >= 2 && e.rng() < .15) {
		let t = c[0];
		e.possession = a, e.phasesDepuisArret = 0, e.dernierTurnover = {
			pion: t,
			t: e.t
		}, J(e, "ruck", a, `Contre-ruck puissant : ${Y(e, a)} passe au-dessus du ballon.`), Pn(e, a, Mn.turnover);
	} else g < -9 ? (e.ballonLent = !1, J(e, "ruck", i, `Sortie rapide pour ${Y(e, i)} : les soutiens ont nettoyé juste à temps.`)) : g > 2 && (e.ballonLent = !0, J(e, "ruck", i, `Ballon ralenti, la défense de ${Y(e, a)} a le temps de se replacer.`));
	for (let t of d) A(t.pos, e.ballon) < 16 && (t.stats.rucksNettoyes += 1);
	e.gardeRuck = (e.ballonLent ? .45 : .6) + (e.cadenceDetaillee ? .45 + .12 * (e.avantage ?? 0) : 0);
	let b = e.ruck?.porteurId, x = Wn(e);
	e.cadenceDetaillee && (!x || k(x.pos, e.ballon) > ji) && (x = Gn(e) ?? x);
	for (let t of e.pions) t.role === "ruck" && t.surLeTerrain && t.sanction <= 0 && (t.battu = Math.max(t.battu, .9), t.role = "ligne");
	x && x.numero !== 9 && H(e, x.cote).some((e) => e.numero === 9) && J(e, "ruck", x.cote, `Demi de mêlée pris dans le jeu : ${x.nom} assure le relais derrière le ruck.`, 0, x.moi), e.ruck = null, e.placement = null, $(e, e.ballon, void 0, 3, b, x);
}
function $i(e, t) {
	let n = e.possession, r = M(n), i = H(e, n).filter((e) => e.avant), a = H(e, N(n)).filter((e) => e.avant), o = (e) => e.length ? e.reduce((e, t) => e + t.puissance, 0) / e.length : 50, s = j(.75 + (o(i) - o(a)) / 45, .1, 1.9);
	if (e.ballon.x += r * s * t, i.forEach((t, n) => {
		t.role = "maul", t.cible = {
			x: e.ballon.x - r * (.42 + Math.floor(n / 3) * .72),
			y: j(e.ballon.y + (n % 3 - 1) * .76, 3, 67)
		};
	}), a.forEach((t, n) => {
		t.role = "maul", t.cible = {
			x: e.ballon.x + r * (.42 + Math.floor(n / 3) * .72),
			y: j(e.ballon.y + (n % 3 - 1) * .76, 3, 67)
		};
	}), fe(e.ballon, n)) {
		let t = e.placementJoue ? [...i].sort((t, n) => A(t.pos, e.ballon) - A(n.pos, e.ballon))[0] : i.find((e) => e.numero === 2) ?? i[0];
		if (t) return t.pos = {
			x: e.ballon.x,
			y: e.ballon.y
		}, ba(e, t, "maul");
	}
	if (e.minuteur <= 0) {
		if (e.rng() < .07) return da(e, n, e.ballon, "maul écroulé");
		Zi(e, e.ballon);
	}
}
function Q(e, t, n, r, i = !1) {
	if (e.sirene && (e.finSurSortieOuEnAvant ? t === "touche" || i : t !== "penalite")) return Ha(e);
	if (e.possession = n, e.porteur = null, e.vol = null, e.ballonLibre = null, e.ruck = null, e.aplatissage = null, e.lancement = null, e.conquete = null, e.combinaisonPreparee = void 0, e.combinaisonEnCours = void 0, ei(e), e.dernierPasseur = null, e.phasesDepuisArret = 0, e.metresGagnesPhase = 0, e.perceeSignalee = !1, e.ballon = {
		x: j(r.x, 12, 110),
		y: r.y
	}, e.phase = t, e.minuteur = Cr(e, t), e.ouvert = $t(e), t === "touche") {
		e.ballon.y = e.ballon.y < 35 ? .6 : 69.4, e.ballon.x = j(e.ballon.x, 16, 106);
		let t = e.rng() < .32 ? 4 : e.rng() < .6 ? 5 : 7;
		Lr(e, je(e.pions, e.ballon, n, t), 34);
		let r = H(e, n).filter((e) => e.role === "alignement").sort((t, n) => Math.abs(t.cible.y - e.ballon.y) - Math.abs(n.cible.y - e.ballon.y)), i = [
			"premierBloc",
			"milieu",
			"fond",
			"leurreDevant"
		], a = i[Math.abs(Math.round(e.t / K) + Math.round(e.ballon.x)) % i.length], o = a === "premierBloc" ? 0 : a === "fond" ? r.length - 1 : a === "leurreDevant" ? Math.min(r.length - 1, Math.max(1, Math.floor(r.length * .68))) : Math.floor(r.length / 2);
		if (e.conquete = {
			type: "touche",
			progression: 0,
			combinaison: a,
			cibleId: r[Math.max(0, o)]?.id
		}, e.cadenceDetaillee && Object.assign(e.conquete, la(e, n, a, r, e.conquete.cibleId)), e.placementJoue) {
			let t = e.ballon.y < 35 ? -1 : 1, r = t < 0 ? 0 : 70, i = H(e, n).find((e) => e.numero === 2);
			i && (e.conquete.lanceurId = i.id, e.conquete.ballonAuSol = {
				x: e.ballon.x,
				y: r + t * .9
			}, e.conquete.ramassage = "aller", e.placement && (e.placement[i.id] = {
				x: e.ballon.x,
				y: r + t * .55
			}));
		}
		e.compteurs.touches += 1;
	} else t === "melee" ? (e.ballon.y = j(e.ballon.y, 12, 58), e.ballon.x = j(e.ballon.x, 17, 105), Lr(e, Ae(e.pions, e.ballon, n), 22), e.conquete = {
		type: "melee",
		progression: 0,
		pousseVers: n
	}, e.cadenceDetaillee && (e.conquete.melee = {
		etape: "placement",
		etapeDepuis: e.sim,
		debut: e.sim,
		centre: { ...e.ballon },
		introducteur: n,
		dureePoussee: q.poussee,
		avanceFinale: 0,
		angleFinal: 0
	}), e.compteurs.melees += 1) : t === "renvoi22" ? Lr(e, Fe(e.pions, n === "A" ? 33 : 89, n)) : e.placement = null;
	let a = M(n);
	e.ligneDef = e.ballon.x + a * (t === "touche" ? 10 : t === "melee" ? 5 : 10), e.horsJeu = e.ligneDef, (t === "melee" || t === "touche") && Re(e, t);
}
function ea(e) {
	let t = j(e, 0, 1);
	return t * t * (3 - 2 * t);
}
function ta(e, t) {
	let n = t - e.etapeDepuis, r = e.etape === "sortie" ? 1 : e.etape === "poussee" ? ea(n / Math.max(.1, e.ruptureApres ?? e.dureePoussee)) : 0, i = e.etape === "placement" ? 1.4 : e.etape === "liaison" ? 1.4 - .55 * ea((n - q.liaison * .45) / (q.liaison * .5)) : e.etape === "impact" ? .85 * (1 - ea(n / .55)) : 0;
	return {
		avance: e.avanceFinale * r,
		angle: e.angleFinal * r,
		ecart: i
	};
}
function na(e, t) {
	let n = t.introducteur, r = N(n), i = H(e, n).filter((e) => e.avant), a = H(e, r).filter((e) => e.avant), o = e.bonusConqueteArcade?.type === "melee" ? e.bonusConqueteArcade.scores : void 0, s = ((o?.[n] ?? 0) - (o?.[r] ?? 0)) * 8;
	e.bonusConqueteArcade = null;
	let c = sa(e, i, n) - sa(e, a, r) + s + (e.rng() - .5) * 18, l = c >= 0 ? n : r;
	t.duel = c, t.perdant = N(l), t.talonneur = n, t.dureePoussee = q.poussee, t.avanceFinale = j(c * .2, -2.6, 2.6);
	let u = (e, t) => e.find((e) => e.numero === t)?.puissance ?? 60, d = (u(i, 1) - u(a, 3) - (u(i, 3) - u(a, 1))) / 160;
	t.angleFinal = j(d, -.14, .14);
	let f = oa(l === n ? a : i, (e) => e.discipline), p = j((Math.abs(c) - 5) / 105 + (58 - f) / 700, .015, .24);
	if (Math.abs(c) > 6 && e.rng() < p) {
		let n = e.rng() >= .5;
		t.penalite = {
			pour: l,
			motif: n ? "mêlée écroulée" : "liaison perdue en mêlée"
		}, t.issue = n ? "ecroulee" : "relevee", t.ruptureApres = 1.5, t.dureePoussee = 3.5, t.avanceFinale = j(c * .12, -1.4, 1.4);
	} else Math.abs(c) < 3.2 && e.rng() < .16 ? (t.issue = "tourne", t.angleFinal = (d >= 0 ? 1 : -1) * .62, t.avanceFinale *= .4) : c < -7 && e.rng() < j(.2 + Math.abs(c) / 90, .2, .48) ? (t.contre = !0, t.talonneur = r, t.issue = "recule") : Math.abs(t.avanceFinale) < .45 ? (t.issue = "stable", t.avanceFinale *= .5) : t.issue = t.avanceFinale > 0 ? "avance" : "recule";
	!t.penalite && !t.contre && !e.combinaisonPreparee && c > 5 && e.rng() < .32 && (t.depart8 = !0), e.conquete && (e.conquete.pousseVers = Math.abs(t.avanceFinale) < .2 ? void 0 : t.avanceFinale > 0 ? n : r);
}
function ra(e) {
	let t = e.conquete.melee, n = (e.dureeArret ?? wr) - e.minuteur, r = (n) => {
		t.etape = n, t.etapeDepuis = e.sim;
	}, i = e.sim - t.etapeDepuis;
	t.etape === "placement" ? n > .2 && r("liaison") : t.etape === "liaison" ? i >= q.liaison && r("impact") : t.etape === "impact" ? i >= q.impact && r("introduction") : t.etape === "introduction" ? i >= q.introduction && (na(e, t), r("poussee"), e.minuteur = t.dureePoussee + (t.penalite ? .3 : q.sortie), e.dureeArret = n + e.minuteur) : t.etape === "poussee" && i >= t.dureePoussee && r("sortie"), t.etape !== "poussee" && t.etape !== "sortie" && (e.minuteur = Math.max(e.minuteur, .6));
	let a = ta(t, e.sim), o = M(t.introducteur), s = {
		x: t.centre.x + o * a.avance,
		y: t.centre.y
	}, c = Math.cos(a.angle), l = Math.sin(a.angle), u = (e, t) => ({
		x: j(s.x + e * c - t * l, 12, 110),
		y: j(s.y + e * l + t * c, 2, 68)
	}), d = t.centre.y < 35 ? 1 : -1, f = t.talonneur ?? t.introducteur, p = t.etape === "sortie" || t.etape === "poussee" && e.sim - t.etapeDepuis > t.dureePoussee * .25;
	for (let n of e.pions) {
		if (!n.surLeTerrain || n.sanction > 0) continue;
		let r = e.placement?.[n.id];
		if (r) {
			if (n.role === "melee") n.cible = u(r.x - t.centre.x - M(n.cote) * a.ecart, r.y - t.centre.y);
			else if (n.numero === 9) {
				let e = M(n.cote);
				if (p && n.cote === f && !t.penalite) {
					let t = n.pos.x - s.x, r = n.pos.y - s.y, i = -(t * c + r * l) * e, a = -t * l + r * c;
					n.cible = i < 2.3 ? u(-e * 2.95, (a < 0 ? -1 : 1) * Math.max(1.5, Math.min(1.9, Math.abs(a)))) : u(-e * 3.05, -d * .5), n.effort = Math.max(n.effort, .9);
				} else n.cible = u(r.x - t.centre.x, r.y - t.centre.y);
			}
		}
	}
	let m = M(f), h = t.etape === "sortie" ? 1 : t.etape === "poussee" ? ea((e.sim - t.etapeDepuis) / Math.max(.1, t.dureePoussee * .85)) : 0;
	e.ballon = u(-m * 2.3 * h, 0);
}
function ia(e, t) {
	t.duel === void 0 && na(e, t), e.conquete = null;
	let n = t.introducteur, r = N(n), i = t.duel ?? 0, a = i >= 0 ? n : r, o = H(e, a).filter((e) => e.avant);
	if (t.penalite) return J(e, "melee", a, R(e.rng, bt, { club: Y(e, a) })), e.placement = null, da(e, t.penalite.pour, e.ballon, t.penalite.motif);
	t.issue === "tourne" ? (J(e, "melee", n, "La mêlée tourne, le demi de mêlée doit sortir un ballon difficile."), e.ballonLent = !0) : t.contre ? (e.possession = r, J(e, "melee", r, `Ballon talonné contre l’introduction : ${Y(e, r)} renverse la mêlée.`), Pn(e, r, Mn.turnover), e.ballonLent = Math.abs(i) < 13) : i > 8 ? (J(e, "melee", n, `Pack dominant : ${Y(e, n)} avance avant de libérer.`), e.ballonLent = !1) : (J(e, "melee", n, R(e.rng, yt, { club: Y(e, n) })), e.ballonLent = i < -2);
	for (let e of o) e.stats.melees += 1;
	e.placement = null, e.gardeRuck = .4;
	let s = H(e, e.possession).find((e) => e.numero === 8);
	if (t.depart8 && s && e.possession === n) {
		let t = H(e, n).find((e) => e.numero === 9 && e.sanction <= 0 && !e.corps), r = !!e.cadenceDetaillee && !!t && e.rng() < .5;
		if ($(e, e.ballon, s, 5), e.porteur !== s) return;
		let i = -e.ouvert, a = i > 0 ? 70 - e.origine.y : e.origine.y, o = e.rng(), c = o < .4 && a > 9 ? i * 6 : o < .8 ? e.ouvert * 6 : 0;
		e.lancement = {
			type: "pickAndGo",
			chaine: r ? [s, t] : [s],
			index: 0,
			libelle: r ? "départ du 8, relais du 9" : "départ du 8",
			couloir: c
		}, s.stats.pickAndGo += 1;
		let l = c === 0 ? "dans l’axe" : c * e.ouvert > 0 ? "côté ouvert" : "petit côté";
		J(e, "melee", n, r ? `${s.nom} se détache de la mêlée, ballon en main, ${l}, ${t.nom} dans sa roue.` : `${s.nom} ramasse au talon et part lui-même, ${l}.`, 0, s.moi);
		return;
	}
	$(e, e.ballon, void 0, 5);
}
function aa(e) {
	if (e.minuteur > 0) return;
	if (e.conquete?.melee) return ia(e, e.conquete.melee);
	e.conquete = null;
	let t = e.possession, n = H(e, t).filter((e) => e.avant), r = H(e, N(t)).filter((e) => e.avant), i = N(t), a = e.bonusConqueteArcade?.type === "melee" ? e.bonusConqueteArcade.scores : void 0, o = ((a?.[t] ?? 0) - (a?.[i] ?? 0)) * 8;
	e.bonusConqueteArcade = null;
	let s = sa(e, n, t) - sa(e, r, i) + o + (e.rng() - .5) * 18, c = s >= 0 ? t : i, l = c === t ? n : r, u = oa(c === t ? r : n, (e) => e.discipline), d = j((Math.abs(s) - 5) / 105 + (58 - u) / 700, .015, .24);
	if (Math.abs(s) > 6 && e.rng() < d) return J(e, "melee", c, R(e.rng, bt, { club: Y(e, c) })), e.placement = null, da(e, c, e.ballon, e.rng() < .5 ? "liaison perdue en mêlée" : "mêlée écroulée");
	Math.abs(s) < 3.2 && e.rng() < .16 ? (J(e, "melee", t, "La mêlée tourne, le demi de mêlée doit sortir un ballon difficile."), e.ballonLent = !0) : s < -7 && e.rng() < j(.2 + Math.abs(s) / 90, .2, .48) ? (e.possession = i, J(e, "melee", i, `Ballon talonné contre l’introduction : ${Y(e, i)} renverse la mêlée.`), Pn(e, i, Mn.turnover), e.ballonLent = Math.abs(s) < 13) : s > 8 ? (J(e, "melee", t, `Pack dominant : ${Y(e, t)} avance avant de libérer.`), e.ballonLent = !1) : (J(e, "melee", t, R(e.rng, yt, { club: Y(e, t) })), e.ballonLent = s < -2);
	for (let e of l) e.stats.melees += 1;
	e.placement = null, e.gardeRuck = .4;
	let f = H(e, e.possession).find((e) => e.numero === 8);
	if (!e.combinaisonPreparee && f && e.possession === t && s > 5 && e.rng() < .32) return e.lancement = {
		type: "pickAndGo",
		chaine: [f],
		index: 0,
		libelle: "départ du 8"
	}, pi(e, f, .3);
	$(e, e.ballon, void 0, 5);
}
function oa(e, t) {
	return e.length ? e.reduce((e, n) => e + t(n), 0) / e.length : 50;
}
function sa(e, t, n) {
	let r = oa(t.filter((e) => e.numero <= 3), (e) => (e.puissance * .48 + e.plaquage * .18 + e.discipline * .17 + e.vision * .17) * (.72 + e.endurance / 360)), i = oa(t, (e) => e.puissance * .72 + e.plaquage * .12 + e.endurance * .16);
	return r * .62 + i * .32 + (e.cohesion?.[n] ?? 50) * .06;
}
function ca(e) {
	if (e.minuteur > 0) return;
	let t = e.possession, n = H(e, t), r = n.filter((e) => e.avant), i = n.find((e) => e.numero === 2) ?? r[0], a = e.conquete?.cibleId, o = n.find((e) => e.id === a) ?? [...r].sort((e, t) => t.detente - e.detente)[0] ?? n[0];
	if (!o) return Ha(e);
	let s = e.conquete?.horsAlignement, c = e.conquete?.reception;
	if (s && c && A(o.pos, c) > .64) {
		o.cible = { ...c }, e.placement && (e.placement[o.id] = { ...c }), e.minuteur = .15;
		return;
	}
	let l = e.conquete?.combinaison, u = e.conquete?.sortie, d = e.conquete?.peelId;
	e.conquete = null;
	let f = e.cadenceDetaillee && !s ? l : void 0, p = H(e, N(t)), m = [...s ? p : p.filter((e) => e.avant)].sort((e, t) => t.detente * .62 + t.vision * .38 - k(t.pos, o.pos) * 1.8 - (e.detente * .62 + e.vision * .38 - k(e.pos, o.pos) * 1.8))[0] ?? p[0], h = s ? [] : r.filter((e) => e !== o && e !== i).sort((e, t) => A(e.pos, o.pos) - A(t.pos, o.pos)).slice(0, 2), g = (e) => .74 + e.endurance / 385, _ = i ? (i.passe * .55 + i.vision * .3 + i.discipline * .15) * g(i) : 45, v = oa(h, (e) => (e.puissance * .58 + e.detente * .24 + e.vision * .18) * g(e)), y = e.bonusConqueteArcade?.type === "touche" ? e.bonusConqueteArcade.scores : void 0, b = (y?.[t] ?? 0) * 7, x = (y?.[N(t)] ?? 0) * 7;
	e.bonusConqueteArcade = null;
	let S = s ? o.passe * .55 + o.vision * .45 : o.detente, C = _ * .38 + S * g(o) * (s ? .54 : .34) + v * (s ? 0 : .2) + (e.cohesion?.[t] ?? 50) * .08 + (l === "leurreDevant" ? 2.5 : 0) + b + (f ? 4 : 0) + (f === "premierBloc" ? 3 : f === "fond" ? -2 : 0), w = m ? (m.detente * .5 + m.vision * .3 + m.puissance * .12 + (e.cohesion?.[m.cote] ?? 50) * .08) * g(m) + x : 45, T = _ + (e.cohesion?.[t] ?? 50) * .08, E = e.rng(), ee = j(.048 - (T - 55) / 950, .01, .075), D = j(.065 - (T - 55) / 800, .018, .105) * (f === "premierBloc" ? .55 : f === "fond" ? 1.6 : 1);
	if (E < ee) return J(e, "touche", N(t), `${i?.nom ?? "Le lanceur"} n’est pas droit : mêlée pour ${Y(e, N(t))}.`), Q(e, "melee", N(t), e.ballon);
	if (E < ee + D) {
		let n = e.rng() < .5;
		return J(e, "touche", null, n ? "Lancer trop court : le ballon ricoche au premier bloc." : "Lancer trop long : le ballon dépasse le sauteur annoncé."), e.placement = null, e.ballon = {
			x: o.pos.x + (e.rng() - .5) * 1.5,
			y: j(o.pos.y + (n ? -1 : 1) * (1.5 + e.rng() * 2), 1, 69)
		}, ri(e, {
			de: { ...e.ballon },
			vers: {
				x: e.ballon.x + M(t) * 2.5,
				y: e.ballon.y + .4
			},
			duree: .4,
			ecoule: .4,
			hauteur: .45,
			type: "pied",
			intention: "renvoi",
			auteur: i ?? o,
			receveur: null
		}, "touche");
	}
	let te = C - w + (e.rng() - .5) * 22;
	if (te < -5.5 && m) return J(e, "touche", N(t), R(e.rng, vt, {
		club: Y(e, N(t)),
		nom: m?.nom ?? ""
	}), 0, m?.moi), e.possession = N(t), e.placement = null, $(e, s ? o.pos : e.ballon);
	if (te < 2 && m && e.rng() < (f ? .22 : .38)) return J(e, "touche", null, `${m.nom} dévie le lancer : ballon libre dans le couloir.`), e.placement = null, e.ballon = {
		x: (o.pos.x + m.pos.x) / 2,
		y: (o.pos.y + m.pos.y) / 2
	}, ri(e, {
		de: { ...e.ballon },
		vers: {
			x: e.ballon.x + M(t) * 3,
			y: e.ballon.y + (e.rng() - .5) * 2
		},
		duree: .35,
		ecoule: .35,
		hauteur: .55,
		type: "pied",
		intention: "renvoi",
		auteur: i ?? o,
		receveur: null
	}, "touche");
	J(e, "touche", t, R(e.rng, _t, {
		club: Y(e, t),
		nom: o.nom
	}), 0, o.moi), o.stats.touchesGagnees += 1, e.placement = null;
	let ne = P(e.ballon, t) < 25, O = e.cadenceDetaillee ? e.styles?.[t] : void 0, re = O === "avants" ? 1.35 : O === "large" || O === "leurres" ? .7 : 1;
	if (!e.combinaisonPreparee && e.rng() < (ne ? .62 : .18) * re) {
		e.phase = "maul", e.minuteur = 6 + e.rng() * 3, e.porteur = null, e.ballon = {
			x: o.pos.x,
			y: o.pos.y
		}, e.maul = {
			receveurId: o.id,
			debut: e.sim
		}, J(e, "maul", t, R(e.rng, xt, { club: Y(e, t) }));
		return;
	}
	e.gardeRuck = .5, f === "premierBloc" && (e.ballonLent = !0), $(e, o.pos, o, 10), f && u && e.porteur === o && !e.combinaisonEnCours && ua(e, o, u, d);
}
function la(e, t, n, r, i) {
	let a = e.styles?.[t] ?? "equilibre", o = e.rng(), s = (n === "fond" ? .4 : n === "premierBloc" ? .12 : .3) * (a === "large" || a === "leurres" ? 1.3 : a === "avants" ? .6 : 1);
	if (o < s) return { sortie: "deviation" };
	if (o >= s + (a === "avants" ? .24 : a === "large" ? .08 : .14)) return {};
	let c = r.find((e) => e.id === i);
	if (!c) return {};
	let l = r.filter((e) => e !== c).sort((e, t) => Math.abs(e.cible.y - c.cible.y) - Math.abs(t.cible.y - c.cible.y)).slice(0, 2), u = r.filter((e) => e !== c && !l.includes(e)).sort((e, t) => t.puissance - e.puissance)[0];
	return u ? {
		sortie: "peel",
		peelId: u.id
	} : {};
}
function ua(e, t, n, r) {
	let i = t.cote, a = M(i), o = e.lancement;
	if (!o) return;
	let s = H(e, i), c = (e) => !!e && e !== t && e.sanction <= 0 && !e.corps && (e.pos.x - t.pos.x) * a <= .4 && k(e.pos, t.pos) < 14;
	if (n === "deviation") {
		let n = s.find((e) => e.numero === 9);
		if (!c(n)) return;
		o.chaine = ja([
			t,
			n,
			...o.chaine.filter((e) => e !== t && e !== n)
		]).slice(0, 6), o.index = 0, e.ballonLent = !1, J(e, "touche", i, `${t.nom} dévie du bout des doigts pour ${n.nom} : ballon rapide.`, 0, t.moi || n.moi), gi(e, t, n, 9);
		return;
	}
	let l = s.find((e) => e.id === r);
	c(l) && (e.lancement = {
		type: "ras",
		chaine: [t, l],
		index: 0,
		libelle: "peel en fond d’alignement"
	}, J(e, "touche", i, `${l.nom} contourne l’alignement : ${t.nom} lui redonne en fond de touche.`, 0, l.moi), gi(e, t, l, 9));
}
function da(e, t, n, r, i, a) {
	J(e, "penalite", t, R(e.rng, rt, {
		club: Y(e, t),
		motif: r
	})), ci(e, "ml.sifflet.penalite", t, i), Pn(e, N(t), Mn.penalite);
	let o = i ?? (() => {
		let r = H(e, N(t)).filter((e) => e.sanction <= 0);
		if (r.length) return r.reduce((e, t) => A(t.pos, n) < A(e.pos, n) ? t : e);
	})(), s = P(n, t) < 22, c = e.niveau === "amateur" ? 1.7 : 1, l = r.toLowerCase(), u = l.includes("coup de poing") || l.includes("brutalité"), d = l.includes("cathédrale"), f = l.includes("plaquage haut"), p = l.includes("volontaire") || l.includes("antijeu"), m = a || u ? 1 : d ? .8 : f ? .25 : p && s ? .35 * c : 0;
	if (o && !(e.gestes ?? []).some((t) => t.joueurId === o.id && e.sim - t.debut < 1.6 && t.clip.startsWith("foul_"))) {
		let t = fa.find(([e]) => l.includes(e))?.[1];
		t && B(e, o, t, 2.6);
	}
	if (e.cadenceDetaillee && o && (u || l.includes("bousculade") || l.includes("coup de pied au sol"))) {
		let t = (t) => H(e, t).filter((e) => e !== o && e.sanction <= 0 && !e.corps && A(e.pos, n) < 196).sort((e, t) => A(e.pos, n) - A(t.pos, n)).slice(0, 2).map((e) => e.id);
		e.attroupement = {
			lieu: {
				x: n.x,
				y: n.y
			},
			jusqua: e.sim + 5,
			ids: [...t(o.cote), ...t(N(o.cote))],
			arrives: []
		};
	}
	if (o && (a || e.rng() < m)) {
		let t = o, n = t.stats.cartonsJaunes > 0, i = a === "rouge" || n && a !== "jaune" || u && e.rng() < .4 || d && e.rng() < .35 || !a && f && e.rng() < .05;
		t.surLeTerrain = !1, t.sanction = i ? 99999 : 600, i ? t.stats.cartonsRouges += 1 : t.stats.cartonsJaunes += 1, t.moi && (i ? e.discipline.rouges += 1 : e.discipline.jaunes += 1, e.discipline.motif = r), i && nn(e, 14), J(e, "carton", t.cote, i ? z("cartonRouge", {
			nom: t.nom,
			motif: r,
			club: Y(e, t.cote)
		}) : R(e.rng, Ct, {
			nom: t.nom,
			motif: r,
			club: Y(e, t.cote)
		}), 0, t.moi), e.sifflet && (e.sifflet.cle = i ? "ml.sifflet.cartonRouge" : "ml.sifflet.cartonJaune");
	}
	Q(e, "penalite", t, n), e.penalite = {
		pour: t,
		lieu: {
			x: n.x,
			y: n.y
		},
		motif: r
	};
}
var fa = [
	["ballon gardé", "foul_holding_ball"],
	["ne se relève pas", "foul_not_rolling"],
	["plonge au ruck", "foul_off_feet"],
	["entrée par le côté", "foul_side_entry"],
	["hors-jeu", "foul_offside"],
	["maul écroulé", "foul_collapse"],
	["jeu déloyal", "foul_obstruction"],
	["obstruction", "foul_obstruction"]
];
function pa(e) {
	let t = e.attroupement;
	if (t) {
		if (e.sim > t.jusqua || e.phase === "jeuCourant") {
			e.attroupement = null;
			return;
		}
		t.ids.forEach((n, r) => {
			let i = e.pions.find((e) => e.id === n);
			if (!i || !i.surLeTerrain || i.sanction > 0 || i.corps) return;
			let a = r / t.ids.length * Math.PI * 2 + .6;
			i.cible = {
				x: j(t.lieu.x + Math.cos(a) * 1.5, 1, 121),
				y: j(t.lieu.y + Math.sin(a) * 1.5, 1, 69)
			}, i.effort = Math.max(i.effort, .85), !t.arrives.includes(n) && k(i.pos, i.cible) < .9 && (t.arrives.push(n), B(e, i, t.arrives.length === 2 ? "foul_punch" : "scuffle_separate", t.arrives.length === 2 ? 1.3 : 2.6, t.arrives.length === 2 ? "bousculade" : void 0));
		});
	}
}
function ma(e, t, n) {
	return j(.97 - Math.max(0, e - 20) / 62 - t / 35 * .22 + (n - 60) / 420, .25, .97);
}
function ha(e, t, n, r) {
	let i = e.minute >= 65 && Math.abs(e.scoreA - e.scoreB) <= 7 ? .06 : 0, a = e.meteoTir === "pluie" ? .08 : e.meteoTir === "vent" ? .13 : 0;
	return j(ma(n, r, t.pied) - (100 - t.endurance) * .0018 - a - i + (t.pied - 60) / 350, .04, .97);
}
function ga(e) {
	if (e.minuteur > 0) return;
	let t = e.penalite;
	e.penalite = null;
	let n = e.choixPenalite;
	if (delete e.choixPenalite, !t) return $(e, e.ballon);
	let r = t.pour, i = H(e, r);
	if (!i.length) return Ha(e);
	let a = i.find((e) => e.buteur) ?? [...i].sort((e, t) => t.pied - e.pied)[0], o = Math.max(0, P(t.lieu, r)), s = Math.abs(t.lieu.y - 35), c = 80 - e.minute, l = Hr(e, r), u = o < 50 && s < 26, d = l < -7 && c < 10, f = e.tactiques[r]?.penalites ?? "mixte", p = f === "points" ? .95 : f === "touche" ? l < 0 && c < 5 ? .35 : .08 : o < 40 && s < 18 ? .82 : .4;
	if (n ? n === "points" : u && !d && e.rng() < p) {
		let n = $n(a);
		if (e.tir = {
			buteur: a,
			distance: o,
			angle: s,
			valeur: 3,
			suite: "coupEnvoi",
			lieu: { ...t.lieu },
			routine: n
		}, e.phase = "tirAuBut", e.minuteur = Cr(e, "tirAuBut"), e.ballon = { ...t.lieu }, e.placement = Pe(e.pions, t.lieu, r, a.id), e.cadenceDetaillee) {
			e.tir.etape = "approche", e.tir.etapeDepuis = e.sim, e.tir.ballonAuSol = { ...t.lieu }, delete e.placement[a.id];
			return;
		}
		a.pos = { ...t.lieu }, a.vitesse = {
			x: 0,
			y: 0
		}, a.cible = { ...t.lieu };
		return;
	}
	let m = M(r);
	if (n === "melee") {
		Q(e, "melee", r, t.lieu);
		return;
	}
	let h = f === "touche" ? .97 : f === "points" ? .42 : .72;
	if (n === "touche" || !n && P(t.lieu, r) > 8 && e.rng() < h) {
		let n = j(28 + a.pied / 3, 20, 48), i = {
			x: j(t.lieu.x + m * n, 16, 106),
			y: t.lieu.y < 35 ? -1 : 71
		}, o = !0, s = 2.4;
		if (e.cadenceDetaillee) {
			let r = { ...a.pos };
			a.pos = { ...t.lieu };
			let c = La(e, a, n + 6, !0);
			a.pos = r, o = c.trouve, s = c.duree, i = {
				x: j(c.arrivee.x, 16, 106),
				y: c.arrivee.y
			};
		}
		a.stats.coupsDePied += 1, e.placement = null, X(e, a, i, o ? "penaltouche" : "occupation", s, .4, t.lieu), J(e, "pied", r, z("penaltouche", {
			nom: a.nom,
			distance: Math.round(P(i, r))
		}), 0, a.moi);
		return;
	}
	e.placement = null, e.gardeRuck = .7, J(e, "jeu", r, z("penaliteRapide", { club: Y(e, r) })), $(e, t.lieu), e.porteur && B(e, e.porteur, "tap", 1.1);
}
function _a(e, t, n) {
	t.departSim = e.sim;
	let { buteur: r } = t;
	B(e, r, t.valeur === 2 ? "conversion" : "penalty", 1.5), e.gestes.at(-1).debut -= .8, r.cote;
	let i = t.lieu ?? { ...e.ballon };
	if (t.contre) {
		let n = M(t.contre.cote), a = {
			x: j(i.x + n * (2.5 + e.rng() * 3), 1, 121),
			y: j(i.y + (e.rng() - .5) * 4, 1, 69)
		};
		t.reussi = !1, t.volLance = !0, r.stats.coupsDePied += 1, Qr(e, {
			de: { ...i },
			vers: a,
			duree: .8,
			ecoule: 0,
			hauteur: .6,
			type: "pied",
			intention: "drop",
			auteur: r,
			receveur: null
		}), e.porteur = null, e.minuteur = 1;
		return;
	}
	let { vers: a, duree: o } = vr(i, r.cote, n, e.rng(), e.rng(), e.rng()), s = j(5.8 + Math.hypot(a.x - i.x, a.y - i.y) * .08, 6.8, 9.5);
	t.reussi = n, t.volLance = !0, r.stats.coupsDePied += 1, Qr(e, {
		de: { ...i },
		vers: a,
		duree: o,
		ecoule: 0,
		hauteur: s,
		type: "pied",
		intention: "drop",
		auteur: r,
		receveur: null
	}), e.porteur = null, e.minuteur = o;
}
function va(e) {
	if (e.minuteur > 0) return;
	let t = e.tir;
	if (!t) return qr(e, e.possession);
	let { buteur: n, distance: r, angle: i } = t, a = n.cote, o = Vr(e, a);
	if (!t.volLance) {
		if (t.frappeDepuis === void 0 && k(n.pos, t.lieu ?? e.ballon) > .8) {
			n.cible = { ...t.lieu ?? e.ballon }, e.minuteur = .15;
			return;
		}
		if (t.frappeDepuis ??= e.sim, e.sim - t.frappeDepuis < .36) {
			F(n), e.minuteur = .15;
			return;
		}
		n.stats.butsTentes += 1, _a(e, t, t.reussi ?? e.rng() < ha(e, n, r, i));
		return;
	}
	if (!t.retombe) {
		if (e.vol && e.vol.ecoule < e.vol.duree) return;
		t.retombe = !0, e.vol && (e.ballon = { ...e.vol.vers }), e.vol = null, t.reussi ? (o.penalites = Math.max(0, o.penalites - 1), n.stats.butsReussis += 1, Oa(e, a, 3), n.stats.pointsAuPied = (n.stats.pointsAuPied ?? 0) + 3, J(e, "but", a, R(e.rng, et, {
			nom: n.nom,
			distance: Math.round(r)
		}), 3, n.moi)) : J(e, "butRate", a, R(e.rng, tt, {
			nom: n.nom,
			distance: Math.round(r)
		}), 0, n.moi), e.minuteur = 1.4;
		return;
	}
	let s = !!t.reussi;
	return e.tir = null, e.placement = null, s ? e.sirene && !e.finSurSortieOuEnAvant ? Ha(e) : qr(e, N(a)) : e.sirene && !e.finSurSortieOuEnAvant ? Ha(e) : Q(e, "renvoi22", N(a), {
		x: N(a) === "A" ? 33 : 89,
		y: 35
	});
}
function ya(e) {
	if (e.minuteur > 0) return;
	let t = e.tir;
	if (!t) return qr(e, N(e.possession));
	let n = t.buteur.cote;
	if (!t.volLance) {
		if (t.frappeDepuis === void 0 && k(t.buteur.pos, t.lieu ?? e.ballon) > .8) {
			t.buteur.cible = { ...t.lieu ?? e.ballon }, e.minuteur = .15;
			return;
		}
		if (t.frappeDepuis ??= e.sim, e.sim - t.frappeDepuis < .36) {
			F(t.buteur), e.minuteur = .15;
			return;
		}
		let r = H(e, N(n)).filter((e) => e.sanction <= 0).map((n) => ({
			pion: n,
			d: k(n.pos, t.lieu ?? e.ballon)
		})).filter(({ d: e }) => e <= 1.8).sort((e, t) => e.d - t.d)[0];
		if (r) {
			let n = r.d <= .9 ? .75 : r.d <= 1.4 ? .4 : .15;
			e.rng() < n && (t.reussi = !1, t.contre = r.pion, B(e, r.pion, "charge_down", 1.4), J(e, "franchissement", r.pion.cote, R(e.rng, $e, {
				nom: t.buteur.nom,
				contreur: r.pion.nom
			}), 0, r.pion.moi || t.buteur.moi));
		}
		_a(e, t, !!t.reussi);
		return;
	}
	if (!t.retombe) {
		if (e.vol && e.vol.ecoule < e.vol.duree) return;
		t.retombe = !0, e.vol && (e.ballon = { ...e.vol.vers }), e.vol = null;
		let r = Vr(e, n);
		t.reussi ? (r.essaisTransformes = Math.max(0, r.essaisTransformes - 1), t.buteur.stats.butsReussis += 1, Oa(e, n, 2), t.buteur.stats.pointsAuPied = (t.buteur.stats.pointsAuPied ?? 0) + 2, J(e, "but", n, R(e.rng, Ze, { nom: t.buteur.nom }), 2, t.buteur.moi)) : (r.essaisSecs = Math.max(0, r.essaisSecs - 1), t.contre ? J(e, "butRate", n, `Transformation contrée par ${t.contre.nom} ! Pas de points pour ${Y(e, n)}.`, 0, t.buteur.moi || t.contre.moi) : J(e, "butRate", n, R(e.rng, Qe, { nom: t.buteur.nom }), 0, t.buteur.moi)), e.minuteur = 1.4;
		return;
	}
	if (e.tir = null, e.placement = null, e.sirene && !e.finSurSortieOuEnAvant) return Ha(e);
	qr(e, N(n));
}
function ba(e, t, n = "jeu") {
	let r = t.cote;
	if (!e.aplatissage) {
		let i = {
			x: r === "A" ? Math.max(t.pos.x, 111.55) : Math.min(t.pos.x, 10.45),
			y: j(t.pos.y, 1.5, 68.5)
		};
		t.cible = { ...i };
		let a = H(e, N(r)).find((e) => k(e.pos, t.pos) < 2.1 && e.battu <= 0), o = !!a || Math.hypot(t.vitesse.x, t.vitesse.y) > 4;
		if (B(e, t, o ? "dive_try" : "try", 1.35), o) {
			let n = t.pos.y < 5 ? 1 : t.pos.y > 65 ? -1 : 0;
			V(t, {
				x: M(r) * 2.6,
				y: n * 1.4
			}, 1.35), a && (V(a, {
				x: M(r) * 2,
				y: n
			}, 1.35), B(e, a, "tackle_low", 1.35));
		} else F(t);
		e.ballon = { ...t.pos }, e.porteur = t, e.vol = null, e.ballonLibre = null, e.lancement = null, e.aplatissage = {
			marqueur: t,
			origine: n,
			lieu: i
		}, e.phase = "aplatissage", e.minuteur = 1.35;
		return;
	}
	let i = e.aplatissage;
	e.aplatissage = null;
	let a = H(e, N(r)).filter((e) => k(e.pos, t.pos) < 2 && e.battu <= 0);
	if (!e.carriereDixMinutes && a.length > 0) {
		let n = j(.28 + (a.reduce((e, t) => e + t.plaquage * .55 + t.puissance * .45, 0) / a.length - (t.puissance * .55 + t.evitement * .45) * (.75 + t.endurance / 400)) / 240 + (a.length > 1 ? .15 : 0), .08, .55);
		if (e.rng() < n) {
			let t = a[0];
			return J(e, "jalon", N(r), `🛑 SAUVETAGE HÉROÏQUE SUR LA LIGNE ! ${t.nom} et la défense se glissent sous le ballon : BALLON TENU EN-BUT !`, 0, !0), Pn(e, N(r), Mn.turnover), Q(e, "renvoi22", N(r), {
				x: N(r) === "A" ? 33 : 89,
				y: 35
			});
		}
	}
	if (i && (e.rng() < .18 || Math.abs(i.lieu.y - 35) > 70 / 2 - 4) && i) {
		Sa(e, i);
		return;
	}
	Ca(e, t, n);
}
function xa(e, t, n, r, i) {
	let a = { ...n.pos };
	e.ballon = { ...a }, F(t), F(n), e.tmo = {
		actif: !0,
		type: "faute_grave",
		motif: r.includes("coup de") || r.includes("brutalité") ? "coup_de_poing" : r.includes("plaquage haut") ? "plaquage_haut" : r.includes("en avant") ? "en_avant" : "jeu_deloyal",
		libelleMotif: r,
		cible: a,
		duree: 3.6,
		restant: 3.6,
		etape: "visionnage",
		decision: "en_cours",
		auteur: t,
		fautif: {
			id: t.id,
			nom: t.nom,
			cote: t.cote
		},
		victime: n,
		carton: i === "carton_rouge" ? "rouge" : "jaune"
	}, e.phase = "tmo", e.minuteur = Cr(e, "tmo"), J(e, "jalon", null, `📺 ARBITRAGE VIDÉO : L'arbitre fait appel au TMO pour un soupçon de ${r} de ${t.nom} !`);
}
function Sa(e, t) {
	let n = t.marqueur, r = { ...t.lieu };
	e.ballon = { ...r }, F(n);
	let i = e.rng(), a = i < .35 ? "aplatissage" : i < .65 ? "en_avant" : i < .85 ? "pied_en_touche" : "jeu_deloyal", o = a === "aplatissage" ? "le contrôle du ballon sur l'aplatissage" : a === "en_avant" ? "un possible en-avant de passe dans la construction" : a === "pied_en_touche" ? "un éventuel pied en touche avant l'en-but" : "un plaquage haut ou obstruction préalable";
	e.tmo = {
		actif: !0,
		type: "essai",
		motif: a,
		libelleMotif: o,
		cible: r,
		duree: 3.8,
		restant: 3.8,
		etape: "visionnage",
		decision: "en_cours",
		auteur: n,
		origineEssai: t,
		essaiEnJeu: {
			marqueur: n,
			origine: t.origine,
			lieu: r
		}
	}, e.phase = "tmo", e.minuteur = Cr(e, "tmo"), J(e, "jalon", null, `📺 TMO DEMANDÉ ! L'arbitre interrompt la validation pour vérifier à la vidéo : ${o}.`);
}
function Ca(e, t, n) {
	let r = t.cote;
	t.stats.essais += 1, e.dernierPasseur && e.dernierPasseur !== t && e.dernierPasseur.cote === r && (e.dernierPasseur.stats.passesDecisives += 1, e.dernierPasseur.moi && e.echos.push({
		cle: "ml.echo.passeDecisive",
		nom: e.dernierPasseur.nom,
		cible: t.nom
	})), e.dernierPasseur = null;
	let i = e.dernierTurnover;
	i && i.pion.moi && i.pion.cote === r && e.t - i.t < 40 && (e.echos.push({
		cle: "ml.echo.turnoverEssai",
		nom: i.pion.nom,
		cible: t.nom
	}), e.dernierTurnover = null), Pn(e, r, Mn.essai), Oa(e, r, 5), r === "A" ? e.essaisA += 1 : e.essaisB += 1;
	let a = n === "maul" ? "au terme du ballon porté" : R(e.rng, Xe, {});
	J(e, "essai", r, n === "maul" ? R(e.rng, St, { nom: t.nom }) : R(e.rng, Ye, {
		nom: t.nom,
		precision: a
	}), 5, t.moi), e.dernierReplayEssai = {
		marqueurNom: t.nom,
		lieu: { ...t.pos },
		restant: 4.2
	};
	let o = H(e, r), s = o.find((e) => e.buteur) ?? [...o].sort((e, t) => t.pied - e.pied)[0] ?? t, c = Math.abs(t.pos.y - 35), l = ma(22 + c * .55, c, s.pied), u = e.rng() < l;
	F(t), e.porteur = null, e.vol = null, e.ballonLibre = null, e.ruck = null, e.aplatissage = null;
	let d = {
		x: (r === "A" ? 111 : 11) - M(r) * 22,
		y: j(t.pos.y, 2.5, 67.5)
	}, f = $n(s);
	if (e.cadenceDetaillee) {
		let n = { ...t.pos };
		e.ballon = { ...n }, s.stats.butsTentes += 1;
		let i = o.filter((e) => e !== t && e !== s && e.sanction <= 0 && !e.corps).sort((e, t) => A(e.pos, n) - A(t.pos, n)).slice(0, 5).map((e) => e.id);
		e.tir = {
			buteur: s,
			distance: 22 + c * .55,
			angle: c,
			valeur: 2,
			suite: "coupEnvoi",
			lieu: d,
			reussi: u,
			routine: f,
			etape: "celebration",
			etapeDepuis: e.sim,
			ballonAuSol: n,
			marqueurId: t.id,
			celebrationJusqua: e.sim + Tr.celebration,
			feteurs: i
		}, e.phase = "transformation", e.minuteur = Cr(e, "transformation"), e.possession = r, e.placement = Pe(e.pions, d, r, s.id), delete e.placement[s.id];
		return;
	}
	e.ballon = { ...d }, s.pos = { ...d }, s.vitesse = {
		x: 0,
		y: 0
	}, s.cible = { ...d }, s.stats.butsTentes += 1, e.tir = {
		buteur: s,
		distance: 22 + c * .55,
		angle: c,
		valeur: 2,
		suite: "coupEnvoi",
		lieu: d,
		reussi: u,
		routine: f
	}, e.phase = "transformation", e.minuteur = Cr(e, "transformation"), e.possession = r, e.placement = Pe(e.pions, d, r, s.id);
}
function wa(e) {
	let t = e.tir, n = t.buteur, r = t.lieu ?? e.ballon, i = n.cote, a = (n) => {
		t.etape = n, t.etapeDepuis = e.sim;
	}, o = e.sim - (t.etapeDepuis ?? e.sim), s = (i === "A" ? 111 : 11) - r.x, c = 35 - r.y, l = Math.max(.01, Math.hypot(s, c)), u = {
		x: r.x - s / l * .72,
		y: j(r.y - c / l * .72, 1.5, 68.5)
	};
	e.minuteur = Math.max(e.minuteur, 1);
	for (let t of e.pions) t.surLeTerrain && t !== n && (t.effort = Math.min(t.effort, .5));
	if (t.etape === "celebration") {
		let o = t.ballonAuSol ?? r, s = e.pions.find((e) => e.id === t.marqueurId);
		if (s && e.placement && (e.placement[s.id] = { ...s.pos }), (t.feteurs ?? []).forEach((t, n, r) => {
			let a = e.pions.find((e) => e.id === t);
			if (!a || !e.placement) return;
			let s = n / Math.max(1, r.length) * Math.PI * 1.3 - Math.PI * .65, c = M(i);
			e.placement[t] = {
				x: j(o.x - c * Math.cos(s) * 1.9, 1, 121),
				y: j(o.y + Math.sin(s) * 1.9, 1.5, 68.5)
			}, a.effort = .72;
		}), n.cible = { ...o }, n.effort = k(n.pos, o) > 12 ? .5 : .3, k(n.pos, o) < 3 && (n.cible = { ...n.pos }), e.ballon = { ...o }, e.sim >= (t.celebrationJusqua ?? 0)) {
			let t = Pe(e.pions, r, i, n.id);
			delete t[n.id], e.placement = t, a("approche");
		}
		return;
	}
	if (t.etape === "approche") {
		let i = t.ballonAuSol ?? r;
		n.cible = { ...i }, n.effort = .6, e.ballon = { ...i }, (k(n.pos, i) < .95 || o > 16) && (F(n), a("ramassage"));
		return;
	}
	if (t.etape === "ramassage") {
		F(n), n.cible = { ...n.pos }, o >= Tr.ramassage && (delete t.ballonAuSol, a("transport"));
		return;
	}
	if (t.etape === "transport") {
		n.cible = { ...u }, n.effort = .55, e.ballon = { ...n.pos }, (k(n.pos, u) < .45 || o > 18) && (F(n), n.cible = { ...n.pos }, a("pose"));
		return;
	}
	if (e.ballon = { ...r }, F(n), n.cible = { ...n.pos }, t.etape === "pose") {
		o >= Tr.pose && a("pret");
		return;
	}
	if (t.etape === "pret") {
		o >= Tr.pret && a("elan");
		return;
	}
	if (e.phase === "transformation") {
		let t = H(e, N(i)).filter((e) => e.sanction <= 0).sort((e, t) => A(e.pos, r) - A(t.pos, r));
		for (let n of t.slice(0, 3)) n.role = "chasseur", n.cible = {
			x: r.x,
			y: r.y
		}, n.effort = 1.05, e.placement && delete e.placement[n.id];
	}
	o >= Tr.elan && (t.frappeDepuis = e.sim - 1, e.minuteur = 0);
}
function Ta(e) {
	if (e.minuteur > 0) return;
	let t = e.tmo;
	if (!t) {
		e.phase = "jeuCourant";
		return;
	}
	if (t.origineEssai) {
		let n = t.origineEssai, r = n.marqueur.cote, i = N(r);
		if (e.rng() < .28 && !(e.carriereDixMinutes && t.motif === "aplatissage")) return t.decision = "essai_refuse", e.tmo = null, t.motif === "en_avant" ? (J(e, "jalon", null, `❌ TMO DÉCISION : En-avant confirmé à la vidéo sur la passe ! L’essai de ${n.marqueur.nom} est REFUSÉ.`), Q(e, "melee", i, {
			x: j(n.lieu.x - M(r) * 5, 16, 106),
			y: j(n.lieu.y, 5, 65)
		}, !0)) : t.motif === "pied_en_touche" ? (J(e, "jalon", null, `❌ TMO DÉCISION : Pied en touche sur le plongeon ! L’essai de ${n.marqueur.nom} est REFUSÉ.`), Q(e, "touche", i, {
			x: j(n.lieu.x - M(r) * 5, 16, 106),
			y: n.lieu.y < 35 ? 0 : 70
		})) : t.motif === "jeu_deloyal" || t.motif === "plaquage_haut" ? (J(e, "jalon", null, "❌ TMO DÉCISION : Faute préalable de l'attaque constatée au ralenti ! L'essai est REFUSÉ."), da(e, i, n.lieu, "jeu déloyal au départ de l'action")) : (J(e, "jalon", null, "❌ TMO DÉCISION : Ballon non aplati et tenu en-but ! L’essai est REFUSÉ."), Q(e, "renvoi22", i, {
			x: i === "A" ? 33 : 89,
			y: 35
		}));
		t.decision = "essai_accorde", J(e, "jalon", null, "✅ TMO DÉCISION : Aucune irrégularité constatée après visionnage des angles vidéo ! ESSAI ACCORDÉ !"), e.tmo = null, Ca(e, n.marqueur, n.origine);
		return;
	}
	let n = t.auteur;
	if (!n) {
		e.tmo = null, e.phase = "jeuCourant";
		return;
	}
	let r = t.victime, i = t.motif === "coup_de_poing" ? "coup de poing caractérisé" : t.motif === "plaquage_haut" ? "plaquage haut avec contact à la tête" : "brutalité / jeu déloyal flagrant", a = t.motif === "coup_de_poing" && e.rng() < .4 || t.carton === "rouge" && e.rng() < .4 || t.motif === "plaquage_haut" && e.rng() < .1;
	if (!(a || t.carton === "jaune" && e.rng() < .8 || e.rng() < .65)) {
		t.decision = "essai_refuse", J(e, "jalon", null, `📺 TMO DÉCISION : L'arbitre visionne les ralentis : contact non dangereux constaté. Simple pénalité contre ${n.nom}, aucun carton décerné.`);
		let a = t.cible;
		e.tmo = null, da(e, r ? r.cote : N(n.cote), a, i, n);
		return;
	}
	let o = a ? "rouge" : "jaune";
	t.decision = o === "rouge" ? "carton_rouge" : "carton_jaune", J(e, "jalon", null, `📺 TMO DÉCISION : Le ralenti confirme l'agression ! ${o === "rouge" ? "Carton ROUGE direct" : "Carton JAUNE"} pour ${n.nom}.`);
	let s = t.cible;
	e.tmo = null, da(e, r ? r.cote : N(n.cote), s, i, n, o);
}
function Ea(e) {
	if (e.aplatissage && (e.ballon = { ...e.aplatissage.marqueur.pos }), e.minuteur > 0) return;
	let t = e.aplatissage;
	if (!t) return Q(e, "renvoi22", N(e.possession), {
		x: N(e.possession) === "A" ? 33 : 89,
		y: 35
	});
	ba(e, t.marqueur, t.origine);
}
function Da(e) {
	if (!(e.minuteur > 0)) {
		if (e.placement = null, e.sirene && !e.finSurSortieOuEnAvant) return Ha(e);
		qr(e, e.possession);
	}
}
function Oa(e, t, n) {
	t === "A" ? e.scoreA += n : e.scoreB += n, Vr(e, t).marques += n;
}
function $(e, t, n, r, i, a) {
	e.phase === "ruck" && Re(e, "ruck"), ei(e);
	let o = e.possession, s = H(e, o);
	if (!s.length) return Ha(e);
	e.cadenceDetaillee && e.coteDecidePour === o || (e.ouvert = $t(e)), e.coteDecidePour = void 0, e.systeme = Xt(e, N(o)), e.phase = "jeuCourant", e.conquete = null, e.ballonLibre = null, e.ruck = null, e.placement = null, e.perceeSignalee = !1, e.cibleRenvoi = null, e.ligneAvantage = t.x, e.origine = {
		x: t.x,
		y: t.y
	}, e.metresGagnesPhase = 0;
	let c = M(o);
	if (r != null) e.ligneDef = t.x + c * r;
	else {
		let n = [];
		for (let r of H(e, N(o))) n.push((r.pos.x - t.x) * c);
		n.sort((e, t) => e - t);
		let r = n[Math.min(3, n.length - 1)] ?? 10;
		e.ligneDef = t.x + c * j(r, .6, 32);
	}
	if (e.horsJeu = e.ligneDef, e.combinaisonPreparee && L(e, o, e.combinaisonPreparee.variante.depart)?.id === i && (e.combinaisonPreparee = void 0), ze(e, t, n)) {
		let t = e.porteur;
		pi(e, t, .3), J(e, "jeu", o, `Combinaison : ${e.lancement.libelle}.`);
		return;
	}
	let l = Ma(e, o, s, n, i, a?.cote === o ? a : void 0);
	if (e.cadenceDetaillee && a && a.cote === o && a.id !== i && !n) {
		let n = l.chaine[0];
		a.avant && l.type !== "pied" && e.rng() < .55 ? (l = {
			type: "pickAndGo",
			chaine: [a],
			index: 0,
			libelle: "pick and go"
		}, J(e, "jeu", o, `${a.nom} ramasse au pied du ruck et repart au ras.`, 0, a.moi)) : n !== a && (!n || k(n.pos, t) > ji) && (l.chaine = [a, ...l.chaine.filter((e) => e !== a)]);
	}
	let u = l.chaine;
	i && u[0]?.id === i && (u = u.filter((e) => e.id !== i));
	let d = (n && n.id !== i ? n : null) ?? u[0] ?? s.find((e) => e.id !== i && e.surLeTerrain && e.sanction <= 0) ?? s[0];
	l.chaine = l.structure === "redoublee" ? [d, ...l.chaine].filter((e, t, n) => e && e !== n[t - 1] && e.surLeTerrain && e.sanction <= 0).slice(0, 6) : Aa(ja([d, ...l.chaine]), 5), l.index = 0, l.structure && Ti(e, l, o), ka(e, l, o), e.lancement = l, e.ballon = {
		x: t.x,
		y: t.y
	}, pi(e, d, .3), e.cadenceDetaillee && a === d && d.vitesse.x * c < 0 && (d.vitesse.x = 0), Wr(e, !1, 4), e.ballon = { ...d.pos };
}
function ka(e, t, n) {
	if (!On(e, "appel")) return;
	let r = e.pions.find((e) => e.moi);
	!r || !r.surLeTerrain || r.sanction > 0 || r.cote !== n || t.chaine.includes(r) || A(r.pos, e.ballon) > 625 || (kn(e), !(e.rng() < .45) && (t.chaine.splice(Math.min(1, t.chaine.length), 0, r), J(e, "jeu", n, z("appelBallon", { nom: r.nom }), 0, !0)));
}
function Aa(e, t) {
	let n = [...e];
	for (; n.length > t;) n.splice(Math.max(1, Math.floor(n.length / 2) - 1), 1);
	return n;
}
function ja(e) {
	let t = /* @__PURE__ */ new Set(), n = [];
	for (let r of e) !r || t.has(r) || !r.surLeTerrain || r.sanction > 0 || (t.add(r), n.push(r));
	return n;
}
function Ma(e, t, n, r, i, a) {
	let o = U(n, 9), s = (o && o.id !== i && o.role !== "ruck" && (!a || a === o) ? o : void 0) ?? (a && a.id !== i ? a : void 0) ?? U(n, 10) ?? U(n, 8) ?? n.find((e) => e.id !== i && e.surLeTerrain && e.sanction <= 0) ?? n[0], c = U(n, 10), l = (s === c ? U(n, 12) : c) ?? n[0], u = U(n, 12), d = U(n, 13), f = U(n, 15), p = e.ouvert === 1 ? U(n, 14) ?? U(n, 11) : U(n, 11) ?? U(n, 14), m = Pa(e, n, i), h = P(e.ballon, t), g = ue(e.ballon, t), _ = de(e.ballon, t), v = Qt(e), y = e.phasesDepuisArret, b = 80 - e.minute, x = Hr(e, t), S = Ur(e, t), C = e.tactiques[t] ?? (e.cadenceDetaillee ? yi(e.styles?.[t]) : void 0), w = e.rng(), T = [
		s,
		l,
		u,
		d,
		p
	].filter(Boolean), E = [
		s,
		l,
		d,
		p
	].filter(Boolean), ee = [
		s,
		l,
		u,
		f,
		p
	].filter(Boolean), D = [
		s,
		l,
		u
	].filter(Boolean), te = () => {
		let t = e.rng();
		return t < .26 && d ? {
			type: "saute",
			chaine: E,
			libelle: "passe sautée vers l’aile"
		} : t < .52 && f ? {
			type: "large",
			chaine: ee,
			libelle: "l’arrière s’intercale"
		} : {
			type: "large",
			chaine: T,
			libelle: "jeu déployé jusqu’à l’aile"
		};
	};
	if (g && !(x < -7 && b < 10)) {
		let e = (l && l.pied > 55 ? l : s) ?? n[0];
		if (w < (C?.attaque === "occupation" ? .92 : C?.attaque === "large" ? .55 : C?.attaque === "avants" ? .65 : .74)) return {
			type: "pied",
			chaine: [s, e].filter(Boolean),
			index: 0,
			intention: e === s ? "chandelle" : "degagement",
			botteur: e,
			libelle: "sortir de ses 22"
		};
	}
	if (_ && !g) {
		let r = l ?? s ?? n[0];
		if (r && r.pied > 65 && y >= 1 && Fa(e, N(t)) && w < .014) return {
			type: "pied",
			chaine: [s, r].filter(Boolean),
			index: 0,
			intention: "cinquanteVingtDeux",
			botteur: r,
			libelle: "50/22"
		};
		let i = C?.attaque === "occupation" ? .42 : C?.attaque === "large" ? .14 : .26;
		if (y >= 2 && w < i) return {
			type: "pied",
			chaine: [s, r].filter(Boolean),
			index: 0,
			intention: e.ballonLent ? "chandelle" : "occupation",
			botteur: r,
			libelle: "occupation au pied"
		};
	}
	if (h < 22) {
		let e = C?.attaque === "large" ? .82 : C?.attaque === "avants" ? .28 : .55;
		if (v >= 1 && w < e) return {
			...te(),
			index: 0
		};
		let t = C?.attaque === "avants" ? .78 : C?.attaque === "large" ? .34 : .55;
		return h < 8 && w < t ? {
			type: "pickAndGo",
			chaine: [s, m].filter(Boolean),
			index: 0,
			libelle: "pick and go"
		} : {
			type: "pod",
			chaine: [
				s,
				l,
				m
			].filter(Boolean),
			index: 0,
			libelle: "bloc d’avants"
		};
	}
	if (v >= 2 || v >= 1 && y >= 1) return {
		...te(),
		index: 0
	};
	if (e.sirene) {
		if (x > 0) {
			let e = l ?? s ?? n[0];
			return {
				type: "pied",
				chaine: [s, e].filter(Boolean),
				index: 0,
				intention: "degagement",
				botteur: e,
				libelle: "botter en touche pour clore le match"
			};
		}
		return v >= 1 ? {
			...te(),
			index: 0
		} : {
			type: "pod",
			chaine: [
				s,
				l,
				m
			].filter(Boolean),
			index: 0,
			libelle: "dernière charge désespérée"
		};
	}
	if (b <= 6 && x > 7) return {
		type: "ras",
		chaine: [s, m].filter(Boolean),
		index: 0,
		libelle: "garder le ballon"
	};
	let ne = C?.attaque === "large" ? .18 : C?.attaque === "avants" ? -.18 : C?.attaque === "occupation" ? -.05 : 0, O = w + S * .3 + ne;
	if (e.cadenceDetaillee && !r) {
		let r = wi(e, t, n, s, l, u, d, p, y);
		if (r) return r;
	}
	if (y === 0) return O < .34 ? {
		type: "pod",
		chaine: [
			s,
			l,
			m
		].filter(Boolean),
		index: 0,
		libelle: "premier temps"
	} : O < .62 ? {
		type: "large",
		chaine: D,
		index: 0,
		libelle: "lancement sur la ligne"
	} : {
		...te(),
		index: 0
	};
	if (O < .52) {
		let t = e.rng() < .34;
		return {
			type: t ? "pickAndGo" : "ras",
			chaine: Na(e, t ? [m] : [s, m], n),
			index: 0,
			libelle: t ? "le ballon repart au ras" : "percussion au ras"
		};
	}
	return O < .72 ? {
		type: "pod",
		chaine: Na(e, [
			s,
			l,
			m
		], n),
		index: 0,
		libelle: "bloc d’avants"
	} : O < .85 ? {
		type: "large",
		chaine: D,
		index: 0,
		libelle: "un temps sur les centres"
	} : O > .92 && f && d ? {
		...te(),
		index: 0
	} : r && r.avant && O < .8 ? {
		type: "ras",
		chaine: [r],
		index: 0,
		libelle: "percussion"
	} : {
		...te(),
		index: 0
	};
}
function Na(e, t, n) {
	let r = t.filter(Boolean), i = r[r.length - 1];
	if (!i || !i.avant || e.rng() > .55) return r;
	let a = n.filter((e) => e.avant && e !== i && !r.includes(e) && e.role !== "ruck").sort((e, t) => A(e.pos, i.pos) - A(t.pos, i.pos))[0];
	return a ? [...r, a] : r;
}
function Pa(e, t, n) {
	let r = e.cadenceDetaillee ? e.blocPrepare : null;
	if (r && t[0]?.cote === r.cote) {
		let e = t.find((e) => e.id === r.ids[0] && e.id !== n && e.surLeTerrain && e.sanction <= 0 && !e.corps && e.role !== "ruck");
		if (e) return e;
	}
	let i = t.filter((e) => e.avant && e.role !== "ruck" && e.id !== n), a = i.length ? i : t.filter((e) => e.avant && e.id !== n);
	if (a.length) return [...a].sort((t, n) => A(t.pos, e.ballon) - A(n.pos, e.ballon)).slice(0, 4).sort((e, t) => e.stats.courses - t.stats.courses)[0];
}
function Fa(e, t) {
	let n = H(e, t).filter((e) => e.numero === 11 || e.numero === 14 || e.numero === 15);
	if (n.length < 2) return !1;
	let r = 0;
	for (let t of n) Math.abs(t.pos.x - e.ballon.x) < 22 && r++;
	return r >= 2;
}
function Ia(e, t) {
	let n = P(t.pos, t.cote);
	return ue(t.pos, t.cote) ? "degagement" : n < 28 ? t.pied > 60 && e.rng() < .35 ? "transversale" : "rasant" : de(t.pos, t.cote) ? t.pied > 62 && Fa(e, N(t.cote)) ? "cinquanteVingtDeux" : "occupation" : t.numero === 9 ? "chandelle" : "occupation";
}
function La(e, t, n, r = !1) {
	let i = M(t.cote), a = t.pos.y < 35 ? 0 : 70, o = a === 0 ? 1 : -1, s = Math.abs(t.pos.y - a), c = r ? 99 : Xa(e, t), l = j((t.pied - 40) / 50, 0, 1), u = .82 + .18 * t.endurance / 100, d = c < 2.2 ? .26 : c < 4 ? .13 : c < 7 ? .05 : 0, f = (e.rng() + e.rng() + e.rng()) / 3, p = j((.38 + .47 * l) * u + (f - .5) * (1.05 - .35 * l) - d + (r ? .14 : 0), 0, 1), m = !r && c < 2.2 && e.rng() < .1 + (.5 - p) * .12, h = (t.numero === 9 && !r ? Math.min(n, 20 + t.pied / 5) : n) * (.32 + .72 * p), g = j(1.3 + h / 24, 1.5, 3.1), _ = .25 + .4 * p;
	if (m) return {
		arrivee: {
			x: j(t.pos.x + i * (2 + e.rng() * 4), 12, 110),
			y: j(t.pos.y + (e.rng() * 6 - 3), 2, 68)
		},
		trouve: !1,
		duree: .55,
		hauteur: .1,
		contre: !0,
		longueur: h
	};
	let v = j((r ? .05 : .3) - .2 * l + d * .9 + (1 - t.endurance / 100) * .12, r ? .02 : .06, .6), y = e.rng();
	if (y < v * .4) {
		let n = s * (.3 + .4 * e.rng());
		return {
			arrivee: {
				x: j(t.pos.x + i * h * .85, 13, 109),
				y: j(a + o * Math.max(5, n), 3, 67)
			},
			trouve: !1,
			duree: g,
			hauteur: _,
			contre: !1,
			longueur: h
		};
	}
	if (y < v || s > h * .92) {
		let n = Math.max(0, s - 1 - e.rng() * 3), r = Math.sqrt(Math.max(h * h - n * n, (h * .35) ** 2));
		return {
			arrivee: {
				x: j(t.pos.x + i * r, 13, 109),
				y: j(t.pos.y + (a === 0 ? -1 : 1) * n, 1, 69)
			},
			trouve: !1,
			duree: g,
			hauteur: _,
			contre: !1,
			longueur: h
		};
	}
	let b = Math.sqrt(Math.max(h * h - s * s, (h * .25) ** 2));
	return {
		arrivee: {
			x: j(t.pos.x + i * b, 8, 114),
			y: a === 0 ? -1 : 71
		},
		trouve: !0,
		duree: g,
		hauteur: _,
		contre: !1,
		longueur: h
	};
}
function Ra(e, t, n) {
	let r = M(t.cote);
	t.stats.coupsDePied += 1, e.dernierPasseur = null;
	let i = 24 + t.pied / 3.2;
	switch (n) {
		case "drop": {
			let n = Vr(e, t.cote);
			t.stats.butsTentes += 1;
			let r = P(t.pos, t.cote) + 11, i = !!(e.scoreSurTerrain || n.penalites > 0) && e.rng() < ma(r, Math.abs(t.pos.y - 35), t.pied);
			e.dropEnCours = {
				auteurId: t.id,
				reussi: i
			};
			let a = i ? .5 : e.rng(), o = vr(t.pos, t.cote, i, a, a * 7.31 % 1, a * 13.7 % 1);
			return X(e, t, o.vers, "drop", o.duree, .7);
		}
		case "degagement": {
			if (e.cadenceDetaillee) {
				let n = La(e, t, i);
				return J(e, "pied", t.cote, n.contre ? `Le coup de pied de ${t.nom} est contré !` : R(e.rng, ut, { nom: t.nom }), 0, t.moi), X(e, t, n.arrivee, n.contre ? "rasant" : n.trouve ? "degagement" : "occupation", n.duree, n.hauteur);
			}
			let n = e.rng() < .85 + t.pied / 500, a = n ? {
				x: j(t.pos.x + r * i, 8, 114),
				y: t.pos.y < 35 ? -1 : 71
			} : {
				x: j(t.pos.x + r * (i + 6), 13, 109),
				y: j(t.pos.y + (e.rng() * 18 - 9), 4, 66)
			};
			return J(e, "pied", t.cote, R(e.rng, ut, { nom: t.nom }), 0, t.moi), X(e, t, a, n ? "degagement" : "occupation", 2.6, .5);
		}
		case "cinquanteVingtDeux": {
			let n = t.cote === "A" ? 97 : 25, a = e.rng() < .3 + t.pied / 320, o = a ? {
				x: n,
				y: t.pos.y < 35 ? -1 : 71
			} : {
				x: j(t.pos.x + r * (i - 6), 15, 107),
				y: j(t.pos.y + (e.rng() * 16 - 8), 4, 66)
			};
			return a || J(e, "pied", t.cote, R(e.rng, mt, { nom: t.nom }), 0, t.moi), X(e, t, o, a ? "cinquanteVingtDeux" : "occupation", 2.8, .6);
		}
		case "chandelle": {
			let n = {
				x: j(t.pos.x + r * (19 + e.rng() * 7), 14, 108),
				y: j(t.pos.y + e.ouvert * (4 + e.rng() * 9), 4, 66)
			};
			return J(e, "pied", t.cote, R(e.rng, ft, { nom: t.nom }), 0, t.moi), X(e, t, n, "chandelle", 3.4, 1);
		}
		case "rasant": {
			let n = {
				x: j(t.pos.x + r * (13 + e.rng() * 8), 12, 110),
				y: j(t.pos.y + e.ouvert * (e.rng() * 10 - 2), 3, 67)
			};
			return J(e, "pied", t.cote, R(e.rng, ht, { nom: t.nom }), 0, t.moi), X(e, t, n, "rasant", 1.5, .1);
		}
		case "transversale": {
			let n = H(e, t.cote).filter((e) => e.numero === 11 || e.numero === 14).sort((e, n) => Math.abs(n.pos.y - t.pos.y) - Math.abs(e.pos.y - t.pos.y))[0], i = {
				x: j(t.pos.x + r * 20, 15, 107),
				y: n ? n.pos.y : j(35 + e.ouvert * 26, 5, 65)
			};
			return J(e, "pied", t.cote, R(e.rng, gt, { nom: t.nom }), 0, t.moi), X(e, t, i, "transversale", 2.6, .9);
		}
		default: {
			let n = e.rng() < .65;
			if (n && e.cadenceDetaillee) {
				let n = La(e, t, i);
				return J(e, "pied", t.cote, n.contre ? `Le coup de pied de ${t.nom} est contré !` : R(e.rng, dt, { nom: t.nom }), 0, t.moi), X(e, t, n.arrivee, n.contre ? "rasant" : n.trouve ? "degagement" : "occupation", n.duree, n.hauteur);
			}
			let a = {
				x: j(t.pos.x + r * i, 13, 109),
				y: n ? t.pos.y < 35 ? -1 : 71 : j(t.pos.y + (e.rng() * 22 - 11), 3, 67)
			};
			return J(e, "pied", t.cote, R(e.rng, dt, { nom: t.nom }), 0, t.moi), X(e, t, a, n ? "degagement" : "occupation", 3, .8);
		}
	}
}
var za = {
	16: 52,
	17: 50,
	18: 50,
	19: 58,
	20: 56,
	21: 63,
	22: 66,
	23: 62
};
function Ba(e, t, n, r) {
	return n.cote !== t || r.cote !== t || n.surLeTerrain || !r.surLeTerrain ? !1 : (r.surLeTerrain = !1, n.surLeTerrain = !0, n.poste = r.poste, n.avant = r.avant, n.numeroMaillot ??= n.numero, n.numero = r.numero, r.remplace = !0, n.role = r.role, n.buteur = r.buteur, n.capitaine = r.capitaine, n.battu = 0, n.horsJeu = !1, e.placement?.[r.id] && (e.placement[n.id] = { ...e.placement[r.id] }, delete e.placement[r.id]), e.conquete?.cibleId === r.id && (e.conquete.cibleId = n.id), e.tir?.buteur === r && (e.tir.buteur = n, e.tir.routine = $n(n)), e.piedPrepare?.auteurId === r.id && (e.piedPrepare.auteurId = n.id), e.lancement && (e.lancement.chaine = e.lancement.chaine.map((e) => e === r ? n : e)), e.porteur === r && (e.porteur = n), B(e, n, "substitution", 1.8), n.pos = {
		x: r.pos.x,
		y: r.pos.y
	}, n.cible = { ...r.cible }, F(n), t === "A" ? e.remplacementsA += 1 : e.remplacementsB += 1, J(e, "remplacement", t, R(e.rng, Tt, {
		entrant: n.nom,
		sortant: r.nom,
		club: Y(e, t)
	}), 0, n.moi || r.moi), !0);
}
function Va(e) {
	if (!We.has(e.phase)) return;
	let t = (e) => o[e.poste]?.famille;
	for (let n of ["A", "B"]) {
		if ((n === "A" ? e.remplacementsA : e.remplacementsB) >= 8) continue;
		let r = H(e, n), i = e.pions.filter((e) => e.cote === n && !e.surLeTerrain && !e.remplace && e.sanction <= 0 && e.minutes === 0);
		if (!i.length) continue;
		let a = e.remplacementsDemandes[n];
		if (a) {
			let t = i.find((e) => e.sourceId === a.entrantId), o = r.find((e) => e.sourceId === a.sortantId && e.numero <= 15);
			if (delete e.remplacementsDemandes[n], t && o && Ba(e, n, t, o)) continue;
		}
		let o = (t) => !t.numeroMaillot && (!t.moi || e.minute >= 62), s = (e) => {
			let n = r.filter((t) => o(t) && t.poste === e.poste), i = r.filter((n) => o(n) && t(n) === t(e)), a = r.filter((t) => o(t) && t.avant === e.avant);
			return (n.length ? n : i.length ? i : a).sort((e, t) => e.endurance - t.endurance)[0];
		}, c = i.map((t) => {
			let r = e.tactiques[n]?.remplacements ?? "standard", i = r === "precoces" ? -8 : r === "tardifs" ? 8 : 0;
			return {
				p: t,
				cible: s(t),
				heure: (za[t.numero] ?? 60) + i
			};
		}).filter((t) => {
			if (!t.cible) return !1;
			let n = t.cible.endurance < (t.cible.avant ? 42 : 34);
			return e.minute >= (n ? t.heure - 10 : t.heure);
		}).sort((e, t) => e.heure - t.heure || e.p.numero - t.p.numero);
		if (!c.length) continue;
		let l = c[0].p, u = c[0].cible;
		!u || !l || Ba(e, n, l, u);
	}
}
function Ha(e) {
	if (delete e.piedPrepare, e.cadenceDetaillee && (e.tir = null), e.periode === 1) {
		e.periode = 2, e.sirene = !1, e.t = yr, e.phase = "miTemps", e.minuteur = Cr(e, "miTemps"), e.porteur = null, e.vol = null, e.placement = null, J(e, "jalon", null, z("miTempsScore", {
			clubA: e.clubA,
			scoreA: e.scoreA,
			scoreB: e.scoreB,
			clubB: e.clubB
		}));
		return;
	}
	e.scoreSurTerrain || Wa(e), wn(e), e.phase = "fini", e.fini = !0, e.porteur = null, e.vol = null, e.bagarre = null, e.intention = null, e.reliquat = 0, J(e, "jalon", null, z("coupSiffletFinal", {
		clubA: e.clubA,
		scoreA: e.scoreA,
		scoreB: e.scoreB,
		clubB: e.clubB
	}));
}
function Ua(e) {
	e.minuteur > 0 || (J(e, "jalon", null, z("deuxiemeMiTemps")), qr(e, N(e.possession)));
}
function Wa(e) {
	for (let t of ["A", "B"]) {
		let n = Vr(e, t), r = H(e, t), i = r.find((e) => e.buteur) ?? [...r].sort((e, t) => t.pied - e.pied)[0], a = 0;
		for (; (n.essaisTransformes > 0 || n.essaisSecs > 0 || n.penalites > 0) && a++ < 12;) if (n.essaisTransformes > 0) {
			--n.essaisTransformes;
			let r = Ga(e, t);
			r && (r.stats.essais += 1), i && (i.stats.butsTentes += 1, i.stats.butsReussis += 1), Oa(e, t, 7), i && (i.stats.pointsAuPied = (i.stats.pointsAuPied ?? 0) + 2), t === "A" ? e.essaisA += 1 : e.essaisB += 1, J(e, "essai", t, z("essaiTransformeFin", { nom: r?.nom ?? Y(e, t) }), 7, r?.moi);
		} else if (n.essaisSecs > 0) {
			--n.essaisSecs;
			let r = Ga(e, t);
			r && (r.stats.essais += 1), i && (i.stats.butsTentes += 1), Oa(e, t, 5), t === "A" ? e.essaisA += 1 : e.essaisB += 1, J(e, "essai", t, z("essaiFin", { nom: r?.nom ?? Y(e, t) }), 5, r?.moi);
		} else --n.penalites, i && (i.stats.butsTentes += 1, i.stats.butsReussis += 1), Oa(e, t, 3), i && (i.stats.pointsAuPied = (i.stats.pointsAuPied ?? 0) + 3), J(e, "but", t, z("penaliteFin", { nom: i?.nom ?? Y(e, t) }), 3, i?.moi);
	}
}
function Ga(e, t) {
	let n = H(e, t);
	if (!n.length) return;
	let r = n.filter((e) => !e.avant), i = r.length && e.rng() < .68 ? r : n;
	return i[Math.floor(e.rng() * i.length)];
}
function Ka(e, t) {
	let n = e.tactiques[t];
	if (!n) return 0;
	let r = e.tactiques[N(t)], i = (n.rythme === "intense" ? 3 : n.rythme === "gestion" ? -2 : 0) + (e.impactBanc?.[t] ?? 0);
	return i += n.attaque === "large" ? 1 : n.attaque === "occupation" ? -1 : 0, r && (n.attaque === "large" && r.defense === "blitz" && (i += 2), n.attaque === "large" && r.defense === "glissee" && --i, n.attaque === "avants" && r.defense === "repli" && (i += 1), n.attaque === "occupation" && r.defense === "repli" && --i), i;
}
function qa(e, t, n) {
	let r = Vr(e, t), i = Math.max(r.marques, c(n)), a = Bn(Math.max(0, i - r.marques), e.rng);
	r.essaisTransformes = a.essaisTransformes, r.essaisSecs = a.essaisSecs, r.penalites = a.penalites, r.total = r.marques + a.essaisTransformes * 7 + a.essaisSecs * 5 + a.penalites * 3;
}
function Ja(e, t, n, r = !0, i) {
	let a = Ka(e, "A"), o = Ka(e, "B");
	i !== void 0 && (e.impactBanc ??= {}, e.impactBanc[t] = i), e.tactiques[t] = { ...n };
	let s = Ka(e, "A"), c = Ka(e, "B"), l = Math.max(0, 1 - e.t / (2 * yr)), u = Math.round((s - a) * l), d = Math.round((c - o) * l);
	u && qa(e, "A", e.planA.total + u), d && qa(e, "B", e.planB.total + d), e.ajustementTactiqueA = s, e.ajustementTactiqueB = c, r && J(e, "jeu", t, z("changementDePlan", { club: Y(e, t) }));
}
function Ya(e, t) {
	if (e.porteur === t) {
		let n = null, r = 400;
		for (let i of H(e, N(t.cote))) {
			if (i.sanction > 0 || i.battu > 0) continue;
			let e = A(i.pos, t.pos);
			e < r && (r = e, n = i);
		}
		return n;
	}
	return e.porteur && e.porteur.cote !== t.cote ? e.porteur : null;
}
function Xa(e, t) {
	let n = Ya(e, t);
	return n ? Math.sqrt(A(n.pos, t.pos)) : 99;
}
var Za = 4.5;
function Qa(e, t) {
	e.echappee = {
		pion: t,
		restant: Za
	}, e.lancement = null, t.moi && (e.perceeJoueur = !0), Pn(e, t.cote, Mn.percee), J(e, "franchissement", t.cote, z("echappee", { nom: t.nom }), 0, t.moi);
}
//#endregion
//#region src/lib/moteur/passerelle3D.ts
var $a = {
	France: [
		"Rémi Garnier",
		"Loïc Lacombe",
		"Hugo Roussel",
		"Bastien Marchand",
		"Théo Besson",
		"Enzo Delmas",
		"Paul Peyrat",
		"Yanis Castaing",
		"Léo Lafitte",
		"Matéo Ducasse",
		"Nolan Barthe",
		"Jules Soulier",
		"Simon Moreau",
		"Noa Vidal",
		"Tom Carrère"
	],
	Angleterre: [
		"Jack Hartley",
		"Owen Bennett",
		"Harry Cole",
		"Luke Whitmore",
		"Sam Ashby",
		"Ben Fenwick",
		"Will Radcliffe",
		"Joe Thorne",
		"Alex Mercer",
		"George Lang",
		"Max Pryce",
		"Dan Holloway",
		"Tom Sutton",
		"Jamie Kerr",
		"Ollie Blake"
	]
};
function eo(e = "rn26-destiny-26", t = !0) {
	let n = (e) => _e.map((t, n) => ({
		id: `${e}-${n}`,
		nom: ($a[e] ?? [])[n] ?? `${e} ${n + 1}`,
		poste: t,
		age: 26,
		note: 76 + n % 4,
		potentiel: 82,
		nation: e,
		regen: !1,
		jeuAuPied: n === 9 || n === 14 ? 86 : 65
	}));
	return Mr("France", "Angleterre", n("France"), n("Angleterre"), 0, 0, e, void 0, {
		scoreSurTerrain: !0,
		tempsReel: !1,
		niveau: "pro",
		cadenceDetaillee: t,
		placementJoue: t
	});
}
//#endregion
export { Tr as RITUEL_TIR, q as TEMPS_MELEE, Nr as avancer, eo as creerApercuDestiny, Wn as designerRelayeur, ta as geometrieMelee, hr as passageAuxPoteaux, Mt as porteurPourAffichage, pr as positionVol, Kn as preparerChenille, gr as tirPasseEntreLesPoteaux };
