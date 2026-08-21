// BANC D'ESSAI DU GUIDE DE CARRIÈRE
//
// Retour de joueurs : « au début on ne comprend pas trop comment ça marche, les
// transferts notamment ». Le guide (`data/guide.ts` + `components/Guide.tsx`)
// répond à ça, et il a une propriété qu'il faut protéger : **il ne scripte
// rien**. Chaque étape est un prédicat sur l'état de la partie, donc elle doit
// se cocher que le joueur soit passé par le guide ou non.
//
// Ce que ce banc vérifie :
//   1. une carrière neuve démarre sur la bonne étape, et rien n'est coché
//      d'avance ;
//   2. CHAQUE étape est réellement atteignable : on fabrique l'état qui la
//      valide et on vérifie qu'elle bascule. Une étape qu'aucun état ne coche
//      bloquerait le guide pour toujours ;
//   3. les étapes se cochent dans l'ordre où le jeu les propose ;
//   4. chaque étape a bien ses deux textes, dans les sept langues.
//
//   npx vite-node scripts/verifGuide.ts

import {
  CHAPITRES, ETAPES_GUIDE, avancement, etapeCourante, type ContexteGuide,
} from '../src/data/guide';
import { LANGUES, chargerTextes, definirLangue, t } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import type { Joueur } from '../src/types';

// ⚠️ LE DICTIONNAIRE N’EST PAS CHARGÉ TOUT SEUL. C’est main.tsx qui appelle
//    `chargerTextes(TEXTES)` au démarrage du navigateur : hors de React, `t()`
//    rend la clé elle-même et TOUS les contrôles de texte passeraient au vert
//    sur du vide. On le charge donc explicitement.
chargerTextes(TEXTES);

let echecs = 0;
function ligne(nom: string, valeur: string | number, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(52)} ${valeur}`);
}

/** Un joueur tout juste créé, tel que `creerJoueur` le produit. */
const NEUF = {
  nom: 'Guide Témoin', saison: 1, semaine: 1, club: 'Pierrefeucain',
  division: 'reg3', clubs: ['Pierrefeucain'],
  contrat: { club: 'Pierrefeucain', division: 'reg3', saisons: 3, salaire: 1500 },
  saisonEnCours: { matchs: 0, titularisations: 0, essais: 0, notes: [], capes: 0 },
} as unknown as Joueur;

const vide: ContexteGuide = {
  joueur: NEUF, ecransVus: ['carriere'], approches: 0, scenesVues: 0,
};

// ---------------------------------------------------------------------------
// 1. UNE CARRIÈRE NEUVE
// ---------------------------------------------------------------------------
console.log('=== 1. AU DÉMARRAGE ===');
{
  const { faites, total } = avancement(vide);
  console.log(`     ${CHAPITRES.length} chapitres · ${total} étapes`);
  ligne('seule « lis ta fiche » est cochée', `${faites}/${total}`, faites === 1);
  ligne('l’étape courante est la bonne', etapeCourante(vide)?.id ?? 'aucune',
    etapeCourante(vide)?.id === 'entrainement');
}

// ---------------------------------------------------------------------------
// 2. ⚠️ CHAQUE ÉTAPE EST ATTEIGNABLE
// ---------------------------------------------------------------------------
// C'est LE contrôle qui compte. Une étape dont le prédicat ne peut jamais
// devenir vrai bloquerait le guide sur elle jusqu'à la fin de la carrière, et
// personne ne s'en apercevrait avant un retour de joueur.
console.log('\n=== 2. AUCUNE ÉTAPE INFRANCHISSABLE ===');
{
  const avecJoueur = (patch: Partial<Joueur>): Joueur => ({ ...NEUF, ...patch } as Joueur);
  const ETATS: Record<string, ContexteGuide> = {
    fiche: { ...vide, ecransVus: ['carriere'] },
    entrainement: { ...vide, joueur: avecJoueur({ entrainementFocus: 'plaquage' }) },
    match: {
      ...vide,
      joueur: avecJoueur({ saisonEnCours: { ...NEUF.saisonEnCours!, matchs: 1 } }),
    },
    scene: { ...vide, scenesVues: 1 },
    resultats: { ...vide, ecransVus: ['carriere', 'tableau'] },
    effectif: { ...vide, ecransVus: ['carriere', 'effectif'] },
    ovale: { ...vide, ecransVus: ['carriere', 'social'] },
    bilan: { ...vide, joueur: avecJoueur({ saison: 2 }) },
    contrat: {
      ...vide,
      joueur: avecJoueur({ contrat: { ...NEUF.contrat!, saisons: 1 } }),
    },
    approche: { ...vide, approches: 1 },
    preaccord: {
      ...vide,
      joueur: avecJoueur({
        preAccord: { club: 'Loudun', division: 'reg2', saisons: 2, salaire: 3000 } as never,
      }),
    },
    demenagement: { ...vide, joueur: avecJoueur({ clubs: ['Pierrefeucain', 'Loudun'] }) },
  };

  const orphelines = ETAPES_GUIDE.filter((e) => !ETATS[e.id]);
  ligne('chaque étape est couverte par le banc',
    orphelines.length ? orphelines.map((e) => e.id).join(', ') : `${ETAPES_GUIDE.length} étapes`,
    orphelines.length === 0);

  const bloquees = ETAPES_GUIDE.filter((e) => ETATS[e.id] && !e.fait(ETATS[e.id]));
  ligne('chaque étape bascule sur son état',
    bloquees.length ? bloquees.map((e) => e.id).join(', ') : 'toutes',
    bloquees.length === 0);

  // Et l'inverse : une étape qui serait DÉJÀ vraie sur une partie neuve ne
  // servirait à rien (à part « lis ta fiche », cochée par construction).
  const gratuites = ETAPES_GUIDE.filter((e) => e.id !== 'fiche' && e.fait(vide));
  ligne('aucune étape n’est cochée d’avance',
    gratuites.length ? gratuites.map((e) => e.id).join(', ') : 'aucune',
    gratuites.length === 0);
}

// ---------------------------------------------------------------------------
// 3. L'ORDRE SUIT LE JEU
// ---------------------------------------------------------------------------
console.log('\n=== 3. L’ORDRE DES CHAPITRES ===');
{
  const ordre = ETAPES_GUIDE.map((e) => e.chapitre);
  const attendu = ['debuts', 'saison', 'transferts'];
  let rang = 0;
  let ok = true;
  for (const ch of ordre) {
    const i = attendu.indexOf(ch);
    if (i < rang) ok = false;
    rang = Math.max(rang, i);
  }
  ligne('les chapitres ne s’entrelacent pas', attendu.join(' → '), ok);

  // ⚠️ LE CHAPITRE DES TRANSFERTS ARRIVE EN DERNIER MAIS SE LIT TOUT DE SUITE :
  // c'est le cœur du retour de joueurs. On vérifie donc que ses textes existent
  // indépendamment de tout état.
  const transferts = ETAPES_GUIDE.filter((e) => e.chapitre === 'transferts');
  ligne('le chapitre des transferts existe', `${transferts.length} étapes`, transferts.length >= 3);
}

// ---------------------------------------------------------------------------
// 4. LES TEXTES, DANS LES SEPT LANGUES
// ---------------------------------------------------------------------------
console.log('\n=== 4. CHAQUE ÉTAPE A SES TEXTES ===');
{
  const manquants: string[] = [];
  for (const langue of LANGUES) {
    definirLangue(langue.id);
    for (const e of ETAPES_GUIDE) {
      for (const suffixe of ['titre', 'texte']) {
        const cle = `guide.${e.id}.${suffixe}`;
        const valeur = t(cle);
        if (!valeur || valeur === cle) manquants.push(`${langue.id}:${cle}`);
      }
    }
    for (const ch of CHAPITRES) {
      const cle = `guide.ch.${ch.id}`;
      if (t(cle) === cle) manquants.push(`${langue.id}:${cle}`);
    }
  }
  definirLangue('fr');
  ligne('tous les textes existent dans les 7 langues',
    manquants.length ? manquants.slice(0, 3).join(' · ') : `${ETAPES_GUIDE.length * 2 + CHAPITRES.length} clés × ${LANGUES.length}`,
    manquants.length === 0);

  // Un texte d'étape doit EXPLIQUER, pas seulement nommer : on refuse les
  // phrases plus courtes que le titre.
  const creux = ETAPES_GUIDE.filter((e) => t(`guide.${e.id}.texte`).length < 60);
  ligne('aucun texte creux',
    creux.length ? creux.map((e) => e.id).join(', ') : 'tous ≥ 60 caractères',
    creux.length === 0);
}

console.log(echecs === 0
  ? '\n✅ Le guide couvre la carrière, de la création au transfert, sans rien scripter.'
  : `\n❌ ${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
