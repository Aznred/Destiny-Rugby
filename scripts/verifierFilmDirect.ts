// LE FILM DU DIRECT — ce que l'écran rejoue est-il bien ce que le serveur a joué ?
//
// Ce banc fait tourner la chaîne entière, sans navigateur ni réseau :
//   1. un « serveur » joue un match de ligue (règles 2) à la vitesse réelle et,
//      toutes les deux secondes, répond au sondage par les pas du moteur que
//      l'écran ne connaît pas encore (`extraireFilm`) — passés par JSON, comme
//      sur le fil ;
//   2. un « client » les range et les rejoue (`LecteurFilm`), avec des réponses
//      plus ou moins lentes, une coupure de cinq secondes et un rechargement ;
//   3. à chaque pas rejoué, l'état de l'écran est comparé à celui que le moteur
//      avait réellement à ce pas.
//
// On vérifie : aucune différence d'état, une lecture qui ne recule jamais et ne
// dépasse jamais la dernière image reçue, aucun joueur déplacé d'un coup, et un
// transfert plus léger que le relevé qu'il remplace.
//
// Lancer : npm run verify:film-direct

import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { avancer, creerMatch, DT } from '../src/lib/moteur/moteur';
import type { EtatMatch } from '../src/lib/moteur/etat';
import { effectifDuClub } from '../src/lib/effectif';
import { extraireTerrain } from '../src/lib/ligue/matchCarriere';
import { cadrerFilm, extraireFilm, filmer, LecteurFilm, PAS_FILM, type FilmDirect } from '../src/lib/ligue/filmDirect';

assert.equal(PAS_FILM, DT, 'Le film avance au pas du moteur');

interface Verite {
  phase: string; possession: string; porteur?: string; score: string; minuteur: number;
  pos: Map<string, { x: number; y: number }>; ballon: { x: number; y: number };
  vol?: string; ruck?: string; conquete?: string; tir?: string; sifflet?: string; roles: string; corps: string;
  objets: Record<string, object | null>;
}
const SUIVIS = ['vol', 'ruck', 'conquete', 'tir', 'sifflet', 'aplatissage'] as const;

function photographier(e: EtatMatch): Verite {
  const sur = e.pions.filter((p) => p.surLeTerrain);
  return {
    phase: e.phase, possession: e.possession, porteur: e.porteur?.id, score: `${e.scoreA}-${e.scoreB}`, minuteur: e.minuteur,
    pos: new Map(sur.map((p) => [p.id, { x: p.pos.x, y: p.pos.y }])), ballon: { ...e.ballon },
    vol: e.vol ? `${e.vol.type}:${e.vol.intention}:${e.vol.auteur.id}:${e.vol.receveur?.id ?? '-'}:${e.vol.ecoule.toFixed(2)}` : undefined,
    ruck: e.ruck ? `${e.ruck.porteurId ?? '-'}:${e.ruck.plaqueurId ?? '-'}:${e.ruck.plaquage?.type ?? '-'}:${(e.ruck.organisation?.attaque ?? []).join(',')}` : undefined,
    conquete: e.conquete ? `${e.conquete.type}:${e.conquete.cibleId ?? '-'}:${e.conquete.melee?.etape ?? '-'}:${e.conquete.sortie ?? '-'}` : undefined,
    tir: e.tir ? `${e.tir.buteur.id}:${e.tir.etape ?? '-'}:${e.tir.volLance ? 1 : 0}:${e.tir.reussi ?? '-'}` : undefined,
    sifflet: e.sifflet?.cle,
    roles: sur.map((p) => `${p.id}=${p.role}${p.numero}`).join(' '),
    corps: sur.filter((p) => p.corps).map((p) => p.id).join(' '),
    objets: Object.fromEntries(SUIVIS.map((k) => [k, (e[k] as object | null) ?? null])),
  };
}

function lire(e: LecteurFilm['etat']): Omit<Verite, 'pos' | 'ballon' | 'objets' | 'minuteur'> {
  const m = e as unknown as EtatMatch;
  const sur = m.pions.filter((p) => p.surLeTerrain);
  return {
    phase: m.phase, possession: m.possession, porteur: m.porteur?.id, score: `${m.scoreA}-${m.scoreB}`,
    vol: m.vol ? `${m.vol.type}:${m.vol.intention}:${m.vol.auteur.id}:${m.vol.receveur?.id ?? '-'}:${m.vol.ecoule.toFixed(2)}` : undefined,
    ruck: m.ruck ? `${m.ruck.porteurId ?? '-'}:${m.ruck.plaqueurId ?? '-'}:${m.ruck.plaquage?.type ?? '-'}:${(m.ruck.organisation?.attaque ?? []).join(',')}` : undefined,
    conquete: m.conquete ? `${m.conquete.type}:${m.conquete.cibleId ?? '-'}:${m.conquete.melee?.etape ?? '-'}:${m.conquete.sortie ?? '-'}` : undefined,
    tir: m.tir ? `${m.tir.buteur.id}:${m.tir.etape ?? '-'}:${m.tir.volLance ? 1 : 0}:${m.tir.reussi ?? '-'}` : undefined,
    sifflet: m.sifflet?.cle,
    roles: sur.map((p) => `${p.id}=${p.role}${p.numero}`).join(' '),
    corps: sur.filter((p) => p.corps).map((p) => p.id).join(' '),
  };
}

function jouer(cle: string, minutes: number) {
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1),
    24, 20, cle, undefined, { tempsReel: true, niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, resserrement: 1 });
  filmer(e);
  const camera = e.apresPas!;
  const verites = new Map<number, Verite>();
  e.apresPas = (m) => { camera(m); verites.set(Math.round(m.sim / DT), photographier(m)); };

  let lecteur = new LecteurFilm();
  const enRoute: { arrive: number; film: FilmDirect | undefined }[] = [];
  const bilan = {
    envois: 0, octets: 0, octetsGz: 0, octetsReleve: 0, octetsReleveGz: 0, cles: 0, pas: 0, compares: 0,
    reculs: 0, depassements: 0, sautMax: 0, attente: 0, images: 0, coupes: 0, avanceMin: Infinity, avanceMoy: 0,
    generations: Object.fromEntries(SUIVIS.map((k) => [k, { moteur: 0, ecran: 0 }])) as Record<string, { moteur: number; ecran: number }>,
    vitesseMin: Infinity, vitesseMax: 0, normales: 0, ralenties: 0,
  };
  const IMAGE = 1 / 30, SONDAGE = 2;
  let prochain = 0, dernierApplique = -1, lecturePrec = -Infinity;
  const vusMoteur = Object.fromEntries(SUIVIS.map((k) => [k, null as object | null]));
  const vusEcran = Object.fromEntries(SUIVIS.map((k) => [k, null as object | null]));
  const affiche = new Map<string, { x: number; y: number }>();
  let graine = 12345;
  const hasard = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff; };

  for (let temps = 0; temps < minutes * 60 && !e.fini; temps += IMAGE) {
    // ── Le serveur : un sondage toutes les deux secondes ─────────────────────
    if (temps >= prochain) {
      prochain += SONDAGE;
      // Une coupure de cinq secondes à la troisième minute, et un rechargement de page à la cinquième.
      const coupure = temps > 180 && temps < 185;
      if (temps > 300 && temps < 302.1) { lecteur = new LecteurFilm(); dernierApplique = -1; lecturePrec = -Infinity; affiche.clear(); for (const k of SUIVIS) vusEcran[k] = null; }
      if (!coupure) {
        cadrerFilm(e, temps);
        let garde = 0;
        while (!e.fini && e.t < temps && garde++ < 400) avancer(e, 0.6);
        const film = extraireFilm(e, lecteur.dernier);
        // Avant le premier pas du moteur, la caméra n'a rien : le serveur envoie alors le relevé.
        if (!film) continue;
        const fil = JSON.stringify(film);
        bilan.envois++; bilan.octets += fil.length; bilan.octetsGz += gzipSync(fil).length;
        const releve = JSON.stringify(extraireTerrain(e, 0));
        bilan.octetsReleve += releve.length; bilan.octetsReleveGz += gzipSync(releve).length;
        if (film?.cle) bilan.cles++;
        bilan.pas += film?.pas.length ?? 0;
        // Réponses lentes : de 80 ms à 1,3 s, sans ordre garanti.
        enRoute.push({ arrive: temps + 0.08 + hasard() * hasard() * 1.2, film: JSON.parse(fil) as FilmDirect | undefined });
      }
    }
    for (let i = enRoute.length - 1; i >= 0; i--) {
      if (enRoute[i].arrive <= temps) { lecteur.recevoir(enRoute[i].film); enRoute.splice(i, 1); }
    }
    // ── Le client : une image d'écran ────────────────────────────────────────
    const coupesAvant = lecteur.coupes;
    lecteur.avancer(IMAGE);
    if (!lecteur.pret) continue;
    bilan.images++;
    if (lecteur.enAttente) bilan.attente++;
    const etat = lecteur.etat;
    const lecture = etat.sim - DT + etat.reliquat;
    if (lecteur.coupes !== coupesAvant) { bilan.coupes++; affiche.clear(); lecturePrec = -Infinity; }
    if (lecture < lecturePrec - 1e-9) bilan.reculs++;
    if (lecture > (lecteur.dernier ?? 0) * DT + 1e-9) bilan.depassements++;
    if (lecturePrec > -Infinity) {
      const v = (lecture - lecturePrec) / IMAGE;
      // Hors des accidents provoqués (démarrage, coupure, rechargement), la lecture reste à vitesse normale.
      const accident = temps < 8 || (temps > 180 && temps < 194) || (temps > 300 && temps < 310);
      if (!accident) {
        bilan.normales++;
        if (v < 0.85) bilan.ralenties++;
        bilan.vitesseMin = Math.min(bilan.vitesseMin, v); bilan.vitesseMax = Math.max(bilan.vitesseMax, v);
      }
    }
    lecturePrec = lecture;
    bilan.avanceMin = Math.min(bilan.avanceMin, lecteur.avance);
    bilan.avanceMoy += lecteur.avance;

    // Ce que le terrain vu de haut dessine : la place interpolée entre deux pas.
    const alpha = lecteur.alpha;
    for (const p of etat.pions) {
      if (!p.surLeTerrain) { affiche.delete(p.id); continue; }
      const avant = lecteur.avant(p.id) ?? p.pos;
      const x = avant.x + (p.pos.x - avant.x) * alpha, y = avant.y + (p.pos.y - avant.y) * alpha;
      const prec = affiche.get(p.id);
      if (prec) bilan.sautMax = Math.max(bilan.sautMax, Math.hypot(x - prec.x, y - prec.y));
      affiche.set(p.id, { x, y });
    }

    // ── À chaque nouveau pas rejoué : l'écran et le moteur disent-ils la même chose ? ──
    const n = Math.round(etat.sim / DT);
    if (n === dernierApplique) continue;
    dernierApplique = n;
    const vrai = verites.get(n);
    assert.ok(vrai, `Pas ${n} rejoué mais jamais joué`);
    const lu = lire(etat);
    for (const champ of Object.keys(lu) as (keyof typeof lu)[]) {
      assert.equal(lu[champ], vrai[champ], `Pas ${n} (${(n * DT / 60).toFixed(2)} min) : « ${champ} » diffère`);
    }
    assert.ok(Math.abs(etat.minuteur - vrai.minuteur) < 0.011, `Pas ${n} : minuteur ${etat.minuteur} au lieu de ${vrai.minuteur}`);
    assert.ok(Math.hypot(etat.ballon.x - vrai.ballon.x, etat.ballon.y - vrai.ballon.y) < 0.02, `Pas ${n} : ballon déplacé`);
    for (const p of etat.pions) {
      if (!p.surLeTerrain) continue;
      const v = vrai.pos.get(p.id);
      assert.ok(v && Math.hypot(p.pos.x - v.x, p.pos.y - v.y) < 0.011, `Pas ${n} : ${p.id} n'est pas à sa place`);
    }
    // Un objet neuf côté moteur doit être un objet neuf à l'écran, et seulement alors.
    for (const k of SUIVIS) {
      if (vrai.objets[k] !== vusMoteur[k]) { vusMoteur[k] = vrai.objets[k]; if (vrai.objets[k]) bilan.generations[k].moteur++; }
      const ecran = (etat[k] as object | null) ?? null;
      if (ecran !== vusEcran[k]) { vusEcran[k] = ecran; if (ecran) bilan.generations[k].ecran++; }
    }
    bilan.compares++;
    for (const ancien of verites.keys()) { if (ancien < n - 400) verites.delete(ancien); else break; }
  }
  bilan.avanceMoy /= Math.max(1, bilan.images);
  return bilan;
}

const b = jouer('film-direct', 14);
assert.ok(b.compares > 4000, `Trop peu de pas comparés : ${b.compares}`);
assert.equal(b.reculs, 0, 'La lecture a reculé');
assert.equal(b.depassements, 0, 'La lecture a dépassé la dernière image reçue');
// Une image complète au premier chargement, une après le rechargement de page ; la coupure de cinq secondes se raccorde.
assert.ok(b.cles <= 3, `Trop d'images complètes : ${b.cles}`);
// À trente images par seconde, un sprint couvre 35 cm par image.
assert.ok(b.sautMax < 0.75, `Joueur déplacé d'un coup à l'écran : ${b.sautMax.toFixed(2)} m en une image`);
for (const [k, g] of Object.entries(b.generations)) {
  // Le rechargement de page peut faire « renaître » un objet déjà en place : une unité de marge.
  assert.ok(Math.abs(g.ecran - g.moteur) <= 2, `« ${k} » : ${g.ecran} objets à l'écran pour ${g.moteur} dans le moteur`);
}
// Réponses de 80 ms à 1,3 s : le film ne doit presque jamais avoir à freiner, et jamais à s'arrêter.
assert.ok(b.vitesseMin > 0.5 && b.vitesseMax < 1.25, `Vitesse de lecture hors bornes : ${b.vitesseMin.toFixed(2)} à ${b.vitesseMax.toFixed(2)}`);
assert.ok(b.ralenties / b.normales < 0.01, `Lecture freinée trop souvent : ${(b.ralenties / b.normales * 100).toFixed(1)} % des images`);
const parEnvoi = b.octets / b.envois, parEnvoiGz = b.octetsGz / b.envois;
const parReleve = b.octetsReleve / b.envois, parReleveGz = b.octetsReleveGz / b.envois;
assert.ok(parEnvoiGz < parReleveGz * 1.6, `Le film pèse trop : ${parEnvoiGz.toFixed(0)} octets compressés contre ${parReleveGz.toFixed(0)} pour le relevé`);
console.log(`OK — ${b.compares} pas rejoués identiques au moteur (${b.pas} pas envoyés en ${b.envois} réponses, ${b.cles} images complètes) ;`
  + ` lecture sans recul ni dépassement, vitesse ${b.vitesseMin.toFixed(2)} à ${b.vitesseMax.toFixed(2)} hors accidents provoqués (${(b.ralenties / b.normales * 100).toFixed(2)} % d'images freinées),`
  + ` avance moyenne ${b.avanceMoy.toFixed(1)} s (minimum ${b.avanceMin.toFixed(2)} s), ${b.coupes} reprise(s) ;`
  + ` déplacement maximal d'un joueur ${b.sautMax.toFixed(2)} m par image ;`
  + ` transfert ${(parEnvoi / 1024).toFixed(1)} Ko par réponse (${(parEnvoiGz / 1024).toFixed(1)} Ko compressés) contre ${(parReleve / 1024).toFixed(1)} Ko (${(parReleveGz / 1024).toFixed(1)} Ko) pour le relevé ;`
  + ` objets : ${Object.entries(b.generations).map(([k, g]) => `${k} ${g.ecran}/${g.moteur}`).join(', ')}.`);
