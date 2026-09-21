// CATALOGUE DES 30 SITUATIONS DE MATCH — LABORATOIRE KIRI
//
// Permet à l'administrateur Kiri de tester et visualiser TOUTES les situations
// possibles de match de rugby (TMO, essais, conquêtes, lancements, jeu au pied,
// gros impacts "sur les fesses", discipline et cartons).

import type { TerrainDirect, VueMatchEnLigne, CoteEnLigne } from './matchCarriere.js';
import type { TypeScenarioDirect } from './scenarioDirect.js';
import type { Phase } from '../moteur/etat.js';
import type { GesteMatch } from '../moteur/dynamique.js';
import type { NomIcone } from '../../components/Icone.js';
import type { PosteId } from '../../types.js';
import { AXE, LIGNE_B, MILIEU, M22_A } from '../moteur/terrain.js';

export interface CategorieSituation {
  id: string;
  nom: string;
  icone: NomIcone;
  description: string;
}

export interface SituationTestInfo {
  id: string;
  categorie: string;
  titre: string;
  sousTitre: string;
  description: string;
  regle: string;
  phase: Phase;
  scenarioType: TypeScenarioDirect;
  cadrage: 'tmo' | 'proche' | 'suivi' | 'large';
  gesteArbitre?: string;
  badge?: string;
  fabriquer: (tempsSim?: number) => VueMatchEnLigne;
}

export const CATEGORIES_SITUATIONS: CategorieSituation[] = [
  { id: 'tmo', nom: 'Arbitrage Vidéo (TMO)', icone: 'video', description: 'Vérifications vidéo en direct, angles de caméra et décisions arbitrales' },
  { id: 'essais', nom: 'Essais & Marque', icone: 'trophee', description: 'Plongeons, mauls d’avants, transformations et replays télé' },
  { id: 'conquete', nom: 'Conquête & Arrêts', icone: 'pousse', description: 'Mêlées fermées, touches, mauls structurés et rucks contestés' },
  { id: 'lancements', nom: 'Lancements & Large', icone: 'eclair', description: 'Attaques au ras, blocs d’avants, passes sautées et franchissements' },
  { id: 'pied', nom: 'Jeu au pied & Duels', icone: 'cible', description: 'Chandelles aériennes, 50:22, drops et rasants dans l’en-but' },
  { id: 'impacts', nom: 'Impacts & Discipline', icone: 'flamme', description: 'Gros tampons dominants, raffuts dévastateurs et cartons' },
];

const POSTES_XV: PosteId[] = [
  'pilier_gauche', 'talonneur', 'pilier_droit',
  'deuxieme_ligne_g', 'deuxieme_ligne_d',
  'troisieme_aile_g', 'troisieme_aile_d', 'numero_8',
  'demi_melee', 'demi_ouverture',
  'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere',
];

function pionsStandard(decalageX = 0, decalageY = 0) {
  const pions = [];
  // 15 joueurs Domicile (Stade Toulousain - Rouge et Noir)
  for (let i = 1; i <= 15; i++) {
    const x = 50 + (i <= 8 ? (i - 1) * 1.5 : (i - 8) * 3) + decalageX;
    const y = 20 + (i % 5) * 6 + decalageY;
    pions.push({
      id: `dom_${i}`,
      numero: i,
      numeroRole: i,
      nom: `Toulousain ${i}`,
      poste: POSTES_XV[i - 1] ?? 'arriere',
      cote: 'domicile' as CoteEnLigne,
      x, y,
      vx: 0.8, vy: 0,
      force: 85, tailleCm: 188, poidsKg: 98,
    });
  }
  // 15 joueurs Extérieur (Stade Rochelais - Jaune et Noir)
  for (let i = 1; i <= 15; i++) {
    const x = 65 + (i <= 8 ? (i - 1) * 1.5 : (i - 8) * 3) + decalageX;
    const y = 20 + (i % 5) * 6 + decalageY;
    pions.push({
      id: `ext_${i}`,
      numero: i,
      numeroRole: i,
      nom: `Rochelais ${i}`,
      poste: POSTES_XV[i - 1] ?? 'arriere',
      cote: 'exterieur' as CoteEnLigne,
      x, y,
      vx: -0.6, vy: 0,
      force: 85, tailleCm: 188, poidsKg: 98,
    });
  }
  return pions;
}

function matchDeBase(id: string, titre: string, terrain: TerrainDirect): VueMatchEnLigne {
  return {
    id: `test_${id}`,
    minute: Math.floor(terrain.horloge),
    horloge: terrain.horloge,
    termine: false,
    score: { domicile: 19, exterieur: 14 },
    essais: { domicile: 2, exterieur: 2 },
    penalites: { domicile: 3, exterieur: 1 },
    stats: {
      domicile: { possession: 55, metres: 340, plaquages: 52, essais: 2, penalitesTentees: 3, penalitesReussies: 3, turnovers: 4, cartons: 0 },
      exterieur: { possession: 45, metres: 280, plaquages: 58, essais: 2, penalitesTentees: 1, penalitesReussies: 1, turnovers: 5, cartons: 1 },
    },
    fil: [
      { id: '1', minute: Math.floor(terrain.horloge), seconde: Math.floor(terrain.horloge * 60), type: 'action', texte: titre },
    ],
    moments: [
      { id: 'm1', seconde: 1080, type: 'essai', cote: 'domicile', texte: 'Essai de Thomas Ramos', points: 5, score: { domicile: 7, exterieur: 0 } },
      { id: 'm2', seconde: 1560, type: 'essai', cote: 'exterieur', texte: 'Essai de Grégory Alldritt', points: 5, score: { domicile: 7, exterieur: 7 } },
      { id: 'm3', seconde: Math.floor(terrain.horloge * 60), type: 'carton', cote: 'exterieur', texte: titre, points: 0, score: { domicile: 19, exterieur: 14 } },
    ],
    monCote: 'domicile',
    remplacementsFaits: 2,
    surLeTerrain: [],
    surLeBanc: [],
    terrain,
  };
}

export const SITUATIONS_LABORATOIRE: SituationTestInfo[] = [
  // ────────────────────────────────────────────────────────────────────
  // ── 1. ARBITRAGE VIDÉO TMO (5 situations)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'tmo_essai_valide',
    categorie: 'tmo',
    titre: 'TMO — Essai litigieux accordé',
    sousTitre: 'Contrôle du ballon vérifié à la vidéo',
    description: 'L’ailier plonge en coin sous la pression du dernier défenseur. L’arbitre interrompt et demande au TMO de vérifier si le ballon a bien été aplati avant la ligne de touche.',
    regle: 'Règle 21 : L’arbitre vidéo confirme qu’il y a contrôle et pression vers le bas du ballon sans perte préalable. Essai validé.',
    phase: 'tmo',
    scenarioType: 'tmo',
    cadrage: 'tmo',
    gesteArbitre: 'ref_try',
    badge: 'DÉCISION : VALIDÉ',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(10, -5);
      const marqueur = pions[13]!;
      marqueur.x = LIGNE_B + 1.2; marqueur.y = 12; marqueur.vx = 2.4;
      const gestes: GesteMatch[] = [
        { id: 'g_try_tmo', joueurId: marqueur.id, clip: 'dive_try', debut: 0.2, duree: 2.5 },
      ];
      const terrain: TerrainDirect = {
        phase: 'tmo', systeme: '1-3-3-1', possession: 'domicile', sequence: 4, cadence: 1, horloge: 34.2,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B + 1.2, y: 12, hauteur: 0 },
        porteurId: marqueur.id, gestes,
        arbitre: { x: LIGNE_B - 2, y: 14, vx: 0.5, vy: 0, regard: 0 },
        sifflet: { cle: 'ml.sifflet.tmo', club: 'Toulouse', fautif: '', restant: 3.5 },
        tmo: { actif: true, tempsRestant: 4.0, action: 'Essai potentiel au drapeau', decision: 'Essai accordé (contrôle avéré)', cadreCamera: 'Plein plan ligne d’en-but', explication: 'Le ballon est sous contrôle et aplati sur la ligne avant tout contact avec la craie.' },
      };
      return matchDeBase('tmo_essai_valide', 'TMO : Vérification de l’aplatissage en coin. Aucune faute : ESSAI ACCORDÉ !', terrain);
    },
  },
  {
    id: 'tmo_essai_en_avant',
    categorie: 'tmo',
    titre: 'TMO — Essai refusé (En-avant)',
    sousTitre: 'Passe en avant dans la construction de l’action',
    description: 'Suite à une passe limite à hauteur des 5 mètres, le centre file entre les poteaux. Le TMO intervient pour signaler une passe vers l’avant.',
    regle: 'Règle 11 : Une passe ne peut être dirigée vers l’en-but adverse par rapport aux mains du passeur. Essai refusé, mêlée ordonnée.',
    phase: 'tmo',
    scenarioType: 'tmo',
    cadrage: 'tmo',
    gesteArbitre: 'ref_knockon',
    badge: 'DÉCISION : REFUSÉ',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(8, 0);
      const centre = pions[11]!;
      centre.x = LIGNE_B + 2; centre.y = AXE; centre.vx = 2.0;
      const gestes: GesteMatch[] = [
        { id: 'g_foul_fwd', joueurId: pions[9]!.id, clip: 'foul_forwardpass', debut: 0.2, duree: 2.0 },
      ];
      const terrain: TerrainDirect = {
        phase: 'tmo', systeme: '1-3-3-1', possession: 'exterieur', sequence: 6, cadence: 1, horloge: 22.4,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B - 5, y: AXE - 2, hauteur: 0 }, gestes,
        arbitre: { x: LIGNE_B - 4, y: AXE + 1, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.enAvant', club: 'La Rochelle', fautif: '', restant: 3.5 },
        tmo: { actif: true, tempsRestant: 4.0, action: 'Passe suspecte sur les 5m', decision: 'Essai refusé (en-avant confirmé)', cadreCamera: 'Caméra travelling 50fps', explication: 'Les mains projettent le ballon vers l’en-but adverse.' },
      };
      return matchDeBase('tmo_essai_en_avant', '❌ TMO : En-avant confirmé à la vidéo. Essai refusé, mêlée pour la défense !', terrain);
    },
  },
  {
    id: 'tmo_essai_touche',
    categorie: 'tmo',
    titre: 'TMO — Essai refusé (Pied en touche)',
    sousTitre: 'Glissade sur la ligne de touche avant l’aplatissage',
    description: 'L’ailier est poussé vers la touche lors de son plongeon. La vidéo révèle que son pied a effleuré la ligne de craie avant de poser le ballon.',
    regle: 'Règle 18 : Si le porteur touche la ligne de touche avant d’avoir aplati, le ballon est en touche. Pas d’essai, touche pour la défense.',
    phase: 'tmo',
    scenarioType: 'tmo',
    cadrage: 'tmo',
    gesteArbitre: 'ref_timeoff',
    badge: 'DÉCISION : REFUSÉ',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(12, -18);
      const ailier = pions[13]!;
      ailier.x = LIGNE_B + 0.5; ailier.y = 1.2; ailier.vx = 3.0;
      const gestes: GesteMatch[] = [
        { id: 'g_dive_out', joueurId: ailier.id, clip: 'dive_try', debut: 0.2, duree: 2.2 },
      ];
      const terrain: TerrainDirect = {
        phase: 'tmo', systeme: '1-3-3-1', possession: 'exterieur', sequence: 8, cadence: 1, horloge: 58.1,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B + 0.5, y: 0.8, hauteur: 0 }, gestes,
        arbitre: { x: LIGNE_B - 3, y: 3.5, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.touche', club: 'La Rochelle', fautif: '', restant: 3.5 },
        tmo: { actif: true, tempsRestant: 4.0, action: 'Pied sur la ligne de touche', decision: 'Touche avant aplatissage', cadreCamera: 'Zoom gros plan crampon', explication: 'La pointe du pied gauche touche la ligne blanche 0.1s avant la pose du cuir.' },
      };
      return matchDeBase('tmo_essai_touche', '❌ TMO : Pied en touche sur le plongeon. Essai refusé, touche pour la défense !', terrain);
    },
  },
  {
    id: 'tmo_carton_rouge',
    categorie: 'tmo',
    titre: 'TMO — Carton Rouge direct (Coup de poing)',
    sousTitre: 'Brutalité caractérisée repérée au ralenti',
    description: 'Une altercation éclate au ruck. L’arbitre fait appel au TMO : les ralentis montrent un coup de poing direct au visage. Carton rouge immédiat.',
    regle: 'Règle 9 (Jeu déloyal) : Tout acte de brutalité délibéré (coup de poing, tête, coude) est sanctionné d’un carton rouge direct sans circonstance atténuante.',
    phase: 'tmo',
    scenarioType: 'tmo',
    cadrage: 'tmo',
    gesteArbitre: 'ref_red',
    badge: 'CARTON ROUGE DIRECT',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const fautif = pions[17]!;
      const victime = pions[6]!;
      fautif.x = MILIEU + 0.6; fautif.y = AXE; fautif.vx = 0;
      victime.x = MILIEU - 0.6; victime.y = AXE; victime.vx = 0;
      const gestes: GesteMatch[] = [
        { id: 'g_punch', joueurId: fautif.id, clip: 'foul_punch', debut: 0.2, duree: 1.4 },
        { id: 'g_hit', joueurId: victime.id, clip: 'reaction_hit', debut: 0.35, duree: 1.8 },
      ];
      const terrain: TerrainDirect = {
        phase: 'tmo', systeme: '1-3-3-1', possession: 'domicile', sequence: 2, cadence: 1, horloge: 45.0,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU, y: AXE, hauteur: 0 }, gestes,
        arbitre: { x: MILIEU - 2.5, y: AXE - 1.5, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.cartonRouge', club: 'Toulouse', fautif: fautif.nom, restant: 4.0 },
        tmo: { actif: true, tempsRestant: 4.0, action: 'Brutalité caractérisée dans le regroupement', decision: 'Carton rouge direct', cadreCamera: 'Caméra loupe super-ralenti', explication: 'Coup de poing fermé porté délibérément au visage.' },
      };
      return matchDeBase('tmo_carton_rouge', `TMO : Geste de brutalité flagrant confirmé ! Carton ROUGE direct pour ${fautif.nom}.`, terrain);
    },
  },
  {
    id: 'tmo_carton_jaune',
    categorie: 'tmo',
    titre: 'TMO — Carton Jaune (Plaquage haut)',
    sousTitre: 'Contact au cou avec force modérée',
    description: 'Sur une relance, le plaqueur monte trop haut et attrape le cou du porteur. Le TMO aide à déterminer le degré de dangerosité.',
    regle: 'Cadre de sanction des contacts à la tête : contact au cou sans coup direct délibéré mais illicite. Carton jaune de 10 minutes.',
    phase: 'tmo',
    scenarioType: 'tmo',
    cadrage: 'tmo',
    gesteArbitre: 'ref_yellow',
    badge: 'CARTON JAUNE (10 MIN)',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const fautif = pions[19]!;
      const porteur = pions[9]!;
      fautif.x = MILIEU + 1.2; fautif.y = AXE; fautif.vx = -1.2;
      porteur.x = MILIEU - 0.5; porteur.y = AXE; porteur.vx = 2.0;
      const gestes: GesteMatch[] = [
        { id: 'g_high_tmo', joueurId: fautif.id, clip: 'foul_high', debut: 0.25, duree: 1.5 },
        { id: 'g_reac_tmo', joueurId: porteur.id, clip: 'reaction_high', debut: 0.35, duree: 2.0 },
      ];
      const terrain: TerrainDirect = {
        phase: 'tmo', systeme: '1-3-3-1', possession: 'domicile', sequence: 3, cadence: 1, horloge: 62.1,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU + 5, y: AXE + 2, hauteur: 0 }, gestes,
        arbitre: { x: MILIEU + 3, y: AXE, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.cartonJaune', club: 'Toulouse', fautif: fautif.nom, restant: 4.0 },
        tmo: { actif: true, tempsRestant: 4.0, action: 'Contact tête/cou sur le porteur', decision: 'Carton jaune (degré de force moyen)', cadreCamera: 'Angle latéral 3/4', explication: 'Départ sur l’épaule qui glisse au cou, degré de danger moyen justifiant l’exclusion temporaire.' },
      };
      return matchDeBase('tmo_carton_jaune', `TMO : Plaquage haut confirmé ! Carton JAUNE pour ${fautif.nom} (10 minutes d’exclusion).`, terrain);
    },
  },

  // ────────────────────────────────────────────────────────────────────
  // ── 2. ESSAIS, MARQUE & REPLAYS (5 situations)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'essai_plongeon',
    categorie: 'essais',
    titre: 'Essai avec plongeon en coin',
    sousTitre: 'Finisseur lancé le long de la ligne de touche',
    description: 'Percée sur l’aile droite, l’ailier accélère, plonge au drapeau et aplatit le ballon dans l’en-but tout en résistant au retour du plaqueur.',
    regle: 'Aplatissage réglementaire dans l’en-but adverse. L’essai vaut 5 points et donne droit à une tentative de transformation.',
    phase: 'aplatissage',
    scenarioType: 'aplatissage',
    cadrage: 'proche',
    gesteArbitre: 'ref_try',
    badge: '5 POINTS',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(12, -15);
      const marqueur = pions[13]!;
      const plaqueur = pions[29]!;
      marqueur.x = LIGNE_B - 2.5; marqueur.y = 8; marqueur.vx = 4.2; marqueur.vy = 0;
      plaqueur.x = LIGNE_B - 1.5; plaqueur.y = 11; plaqueur.vx = 3.0; plaqueur.vy = -1.8;
      const gestes: GesteMatch[] = [
        { id: 'g_try', joueurId: marqueur.id, clip: 'dive_try', debut: 0.25, duree: 2.4 },
        { id: 'g_tackle_low', joueurId: plaqueur.id, clip: 'tackle_low', debut: 0.35, duree: 2.0 },
      ];
      const terrain: TerrainDirect = {
        phase: 'aplatissage', systeme: '1-3-3-1', possession: 'domicile', sequence: 5, cadence: 1, horloge: 12.3,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B + 1.2, y: 8, hauteur: 0 },
        porteurId: marqueur.id, gestes,
        arbitre: { x: LIGNE_B - 2, y: 10, vx: 1.5, vy: 0, regard: 0 },
        aplatissage: { marqueurId: marqueur.id, progression: 0.75 },
      };
      return matchDeBase('essai_plongeon', 'ESSAI spectaculaire en coin ! Finition parfaite de l’ailier au drapeau !', terrain);
    },
  },
  {
    id: 'transformation_replay',
    categorie: 'essais',
    titre: 'Transformation & Replay TV de l’essai',
    sousTitre: 'Botteur au tee et ralenti de l’action du match',
    description: 'Pendant que le buteur place son tee et prend son recul à 22 mètres, la réalisation télévisée diffuse le ralenti zoomé de l’essai avec le bandeau officiel.',
    regle: 'Transformation : tir au pied placé sur l’alignement de l’essai pour ajouter 2 points au score.',
    phase: 'transformation',
    scenarioType: 'transformation',
    cadrage: 'proche',
    gesteArbitre: 'ref_timeoff',
    badge: 'REPLAY BROADCAST TV',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const buteur = pions[9]!;
      buteur.x = LIGNE_B - 22; buteur.y = AXE; buteur.vx = 0; buteur.vy = 0;
      const terrain: TerrainDirect = {
        phase: 'transformation', systeme: '1-3-3-1', possession: 'domicile', sequence: 6, cadence: 1, horloge: 14.1,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B - 22, y: AXE, hauteur: 0 },
        preparationTir: { buteurId: buteur.id, progression: 0.45, transformation: true },
        arbitre: { x: LIGNE_B - 18, y: AXE - 6, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('transformation_replay', 'REPLAY ESSAI · Thomas Ramos installe son tee à 22 mètres.', terrain);
    },
  },
  {
    id: 'drop_goal',
    categorie: 'essais',
    titre: 'Drop-goal en pleine course',
    sousTitre: 'Frappe tombée entre les poteaux',
    description: 'En position favorable dans l’axe à 28 mètres des perches, le numéro 10 claque un drop précis qui franchit la barre transversale.',
    regle: 'Le drop-goal peut être tenté à tout moment dans le jeu courant en laissant d’abord rebondir le ballon au sol. Il rapporte 3 points.',
    phase: 'jeuCourant',
    scenarioType: 'drop',
    cadrage: 'suivi',
    gesteArbitre: 'ref_try',
    badge: '3 POINTS',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const buteur = pions[9]!;
      buteur.x = LIGNE_B - 28; buteur.y = AXE; buteur.vx = 1.2; buteur.vy = 0;
      const gestes: GesteMatch[] = [
        { id: 'g_drop', joueurId: buteur.id, clip: 'drop', debut: 0.2, duree: 2.2 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 7, cadence: 1, horloge: 78.5,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B - 14, y: AXE, hauteur: 4.8 }, gestes,
        vol: {
          id: 'v_drop', type: 'pied', intention: 'drop',
          de: { x: LIGNE_B - 28, y: AXE }, vers: { x: LIGNE_B + 5, y: AXE },
          hauteur: 6.8, duree: 2.2, ecoule: 0.6,
        },
        arbitre: { x: LIGNE_B - 20, y: AXE - 5, vx: 0.8, vy: 0, regard: 0 },
      };
      return matchDeBase('drop_goal', 'DROP RÉUSSI ! Le ballon passe entre les perches à la sirène !', terrain);
    },
  },
  {
    id: 'essai_en_force',
    categorie: 'essais',
    titre: 'Essai en force sur la ligne',
    sousTitre: 'Pilonnage victorieux du paquet d’avants',
    description: 'À 1 mètre de l’en-but adverse, le pilier ramasse le ballon au ras du ruck et s’effondre victorieusement sur la ligne blanche.',
    regle: 'Si un joueur est au sol dans l’en-but ou sur la ligne de but, il lui suffit de poser le ballon pour valider l’essai.',
    phase: 'aplatissage',
    scenarioType: 'aplatissage',
    cadrage: 'proche',
    gesteArbitre: 'ref_try',
    badge: 'ESSAI D’AVANTS',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(18, 0);
      const pilier = pions[0]!;
      pilier.x = LIGNE_B - 0.4; pilier.y = AXE; pilier.vx = 1.5;
      const gestes: GesteMatch[] = [
        { id: 'g_force_try', joueurId: pilier.id, clip: 'try', debut: 0.2, duree: 2.4 },
      ];
      const terrain: TerrainDirect = {
        phase: 'aplatissage', systeme: '1-3-3-1', possession: 'domicile', sequence: 8, cadence: 1, horloge: 39.4,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B + 0.5, y: AXE, hauteur: 0 },
        porteurId: pilier.id, gestes,
        arbitre: { x: LIGNE_B - 3, y: AXE + 2, vx: 0, vy: 0, regard: 0 },
        aplatissage: { marqueurId: pilier.id, progression: 0.85 },
      };
      return matchDeBase('essai_en_force', 'ESSAI EN FORCE ! Le pilier toulousain franchit la ligne au ras !', terrain);
    },
  },
  {
    id: 'celebration_essai',
    categorie: 'essais',
    titre: 'Célébration d’essai collective',
    sousTitre: 'Joie des marqueurs et communion avec le public',
    description: 'L’essai décisif vient d’être accordé. L’ailier lève les bras au ciel tandis que ses coéquipiers accourent pour célébrer ensemble.',
    regle: 'Après l’essai accordé par l’arbitre, le chronomètre est arrêté pendant les célébrations et la préparation du tir au but.',
    phase: 'apresEssai',
    scenarioType: 'apresEssai',
    cadrage: 'proche',
    badge: 'EXPLOSION DE JOIE',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(15, -6);
      const heros = pions[13]!;
      heros.x = LIGNE_B + 4; heros.y = AXE - 4; heros.vx = 0;
      pions[11]!.vx = 3.5; pions[11]!.vy = -1.2;
      pions[14]!.vx = 3.0; pions[14]!.vy = 1.0;
      const gestes: GesteMatch[] = [
        { id: 'g_cel', joueurId: heros.id, clip: 'celebrate', debut: 0.1, duree: 3.5 },
      ];
      const terrain: TerrainDirect = {
        phase: 'apresEssai', systeme: '1-3-3-1', possession: 'domicile', sequence: 9, cadence: 1, horloge: 79.9,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B + 4, y: AXE - 4, hauteur: 0 }, gestes,
        arbitre: { x: LIGNE_B - 4, y: AXE, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('celebration_essai', 'CÉLÉBRATION ! Communion totale avec les supporters dans l’en-but !', terrain);
    },
  },

  // ────────────────────────────────────────────────────────────────────
  // ── 3. CONQUÊTE & PHASES ARRÊTÉES (5 situations)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'melee_fermee',
    categorie: 'conquete',
    titre: 'Mêlée fermée ordonnée',
    sousTitre: 'Liaison et poussée des deux packs de 8',
    description: 'Les seize avants sont liés en formation 3-4-1. Le demi de mêlée introduit le ballon au centre du tunnel et la poussée s’enclenche.',
    regle: 'Épreuve de force collective sanctionnant les petites fautes techniques (en-avant, passe en avant).',
    phase: 'melee',
    scenarioType: 'melee',
    cadrage: 'proche',
    gesteArbitre: 'ref_scrum',
    badge: 'ÉPREUVE DE FORCE',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const gestes: GesteMatch[] = [
        { id: 'g_scrum_1', joueurId: pions[0]!.id, clip: 'scrum', debut: 0.1, duree: 3.8 },
        { id: 'g_scrum_2', joueurId: pions[1]!.id, clip: 'scrum_hook', debut: 0.2, duree: 3.5 },
        { id: 'g_scrum_3', joueurId: pions[2]!.id, clip: 'scrum', debut: 0.1, duree: 3.8 },
      ];
      const terrain: TerrainDirect = {
        phase: 'melee', systeme: '1-3-3-1', possession: 'domicile', sequence: 1, cadence: 1, horloge: 18.0,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU, y: AXE, hauteur: 0 }, gestes,
        conquete: { type: 'melee', progression: 0.55, combinaison: 'premierBloc', pousseVers: 'domicile' },
        arbitre: { x: MILIEU - 3, y: AXE - 4, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('melee_fermee', 'Mêlée ordonnée ! Grosse poussée du pack toulousain.', terrain);
    },
  },
  {
    id: 'melee_talonnage',
    categorie: 'conquete',
    titre: 'Mêlée — Sortie & Talonnage rapide',
    sousTitre: 'Le talonneur gagne le ballon et libère le 8',
    description: 'Le talonneur accroche le cuir d’un coup de talon millimétré. Le ballon glisse sous les pieds du numéro 8 qui part au ras.',
    regle: 'Le talonneur doit ramener le ballon d’un seul mouvement sans utiliser les mains.',
    phase: 'melee',
    scenarioType: 'melee',
    cadrage: 'proche',
    badge: 'TALONNAGE RAPIDE',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const gestes: GesteMatch[] = [
        { id: 'g_hooker', joueurId: pions[1]!.id, clip: 'scrum_hook', debut: 0.2, duree: 2.8 },
        { id: 'g_n8_ready', joueurId: pions[7]!.id, clip: 'ready', debut: 1.5, duree: 2.0 },
      ];
      const terrain: TerrainDirect = {
        phase: 'melee', systeme: '1-3-3-1', possession: 'domicile', sequence: 2, cadence: 1, horloge: 31.0,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU - 2, y: AXE, hauteur: 0 }, gestes,
        conquete: { type: 'melee', progression: 0.8, combinaison: 'fond', pousseVers: 'domicile' },
        arbitre: { x: MILIEU - 2, y: AXE - 3, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('melee_talonnage', 'Talonnage ultra-rapide ! Sortie de balle propre pour le demi de mêlée.', terrain);
    },
  },
  {
    id: 'touche_alignement',
    categorie: 'conquete',
    titre: 'Alignement en touche à 7',
    sousTitre: 'Lancer droit et prise de balle à deux mains',
    description: 'Le talonneur lance sur la ligne des 5 mètres. Le deuxième ligne est lifté dans les airs au deuxième bloc et sécurise le ballon.',
    regle: 'Remise en jeu après sortie du ballon en touche. Les sauteurs peuvent être soutenus légalement à partir du moment où le ballon a quitté les mains du lanceur.',
    phase: 'touche',
    scenarioType: 'touche',
    cadrage: 'proche',
    gesteArbitre: 'ref_timeoff',
    badge: 'ALIGNEMENT 7 AVANTS',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(-10, -18);
      const lanceur = pions[1]!;
      const sauteur = pions[3]!;
      const lifteur1 = pions[0]!;
      const lifteur2 = pions[2]!;
      lanceur.x = M22_A + 10; lanceur.y = 0.6;
      sauteur.x = M22_A + 10; sauteur.y = 5.0;
      lifteur1.x = M22_A + 10; lifteur1.y = 4.2;
      lifteur2.x = M22_A + 10; lifteur2.y = 5.8;
      const gestes: GesteMatch[] = [
        { id: 'g_throw', joueurId: lanceur.id, clip: 'lineout_throw', debut: 0.2, duree: 1.8 },
        { id: 'g_jump', joueurId: sauteur.id, clip: 'lineout_jump', debut: 0.4, duree: 2.2 },
        { id: 'g_lift1', joueurId: lifteur1.id, clip: 'lineout_lift', debut: 0.4, duree: 2.2 },
        { id: 'g_lift2', joueurId: lifteur2.id, clip: 'lineout_lift', debut: 0.4, duree: 2.2 },
      ];
      const terrain: TerrainDirect = {
        phase: 'touche', systeme: '1-3-3-1', possession: 'domicile', sequence: 1, cadence: 1, horloge: 25.4,
        simulation: t, instantJeu: t, pions, ballon: { x: M22_A + 10, y: 5, hauteur: 3.2 }, gestes,
        conquete: { type: 'touche', progression: 0.65, combinaison: 'milieu', cibleId: sauteur.id },
        arbitre: { x: M22_A + 8, y: 8, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('touche_alignement', 'Touche trouvée aux 40 mètres. Prise de balle impériale au milieu d’alignement.', terrain);
    },
  },
  {
    id: 'maul_porte',
    categorie: 'conquete',
    titre: 'Ballon porté structuré (Maul)',
    sousTitre: 'Avancée collective puissante des avants',
    description: 'Après la prise de balle en touche, les avants forment une cocotte compacte. Le ballon est protégé en queue de maul par le talonneur qui pilote.',
    regle: 'Un maul se forme quand le porteur est lié à au moins un partenaire et un adversaire sur leurs appuis.',
    phase: 'maul',
    scenarioType: 'maul',
    cadrage: 'proche',
    badge: 'BALLON PORTÉ',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(5, -12);
      for (let i = 0; i < 6; i++) {
        pions[i]!.vx = 2.2;
      }
      const gestes: GesteMatch[] = [
        { id: 'g_maul_1', joueurId: pions[0]!.id, clip: 'maul', debut: 0.1, duree: 3.8 },
        { id: 'g_maul_2', joueurId: pions[1]!.id, clip: 'maul', debut: 0.1, duree: 3.8 },
        { id: 'g_maul_3', joueurId: pions[2]!.id, clip: 'maul', debut: 0.1, duree: 3.8 },
      ];
      const terrain: TerrainDirect = {
        phase: 'maul', systeme: '1-3-3-1', possession: 'domicile', sequence: 3, cadence: 1, horloge: 48.2,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B - 8, y: 15, hauteur: 1.1 },
        porteurId: pions[1]!.id, metresGagnes: 6.4, gestes,
        conquete: { type: 'melee', progression: 0.6, combinaison: 'premierBloc', pousseVers: 'domicile' },
        arbitre: { x: LIGNE_B - 10, y: 18, vx: 1.8, vy: 0, regard: 0 },
      };
      return matchDeBase('maul_porte', 'Ballon porté destructeur ! Le paquet d’avants avance sur 8 mètres.', terrain);
    },
  },
  {
    id: 'ruck_conteste',
    categorie: 'conquete',
    titre: 'Ruck contesté & Déblayage',
    sousTitre: 'Combat féroce pour la possession au sol',
    description: 'Le porteur est plaqué au sol. Le troisième ligne arrive à pleine charge pour déblayer le gratteur adverse avant que le demi de mêlée n’éjecte.',
    regle: 'Règle 15 : Tout joueur rejoignant le ruck doit le faire par la porte d’entrée en restant sur ses appuis.',
    phase: 'ruck',
    scenarioType: 'ruck',
    cadrage: 'proche',
    badge: 'CONTEST AU SOL',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const porteurAuSol = pions[8]!;
      const deblayeur = pions[6]!;
      const contreur = pions[21]!;
      porteurAuSol.x = MILIEU; porteurAuSol.y = AXE;
      deblayeur.x = MILIEU - 1.5; deblayeur.y = AXE; deblayeur.vx = 3.0;
      contreur.x = MILIEU + 1.2; contreur.y = AXE; contreur.vx = -1.5;
      const gestes: GesteMatch[] = [
        { id: 'g_present', joueurId: porteurAuSol.id, clip: 'present', debut: 0.1, duree: 3.0 },
        { id: 'g_clear', joueurId: deblayeur.id, clip: 'clearout_drive', debut: 0.3, duree: 2.2 },
        { id: 'g_cruck', joueurId: contreur.id, clip: 'counter_ruck', debut: 0.2, duree: 2.5 },
      ];
      const terrain: TerrainDirect = {
        phase: 'ruck', systeme: '1-3-3-1', possession: 'domicile', sequence: 4, cadence: 1, horloge: 50.5,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU, y: AXE, hauteur: 0 }, gestes,
        arbitre: { x: MILIEU - 3, y: AXE - 2, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('ruck_conteste', 'Ruck violent ! Le déblayage toulousain permet de sécuriser la balle.', terrain);
    },
  },

  // ────────────────────────────────────────────────────────────────────
  // ── 4. LANCEMENTS & ATTAQUE AU LARGE (5 situations)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'passe_sautee',
    categorie: 'lancements',
    titre: 'Passe sautée pour l’ailier',
    sousTitre: 'Décalage express au large',
    description: 'Le demi d’ouverture arme une longue passe sautée qui survole le premier centre et atterrit directement dans les bras de l’ailier lancé en bout d’aile.',
    regle: 'Permet de créer un surnombre rapide sur le couloir extérieur en éliminant un défenseur intérieur sans le fixer.',
    phase: 'jeuCourant',
    scenarioType: 'passeSautee',
    cadrage: 'suivi',
    badge: 'COMBINAISON AU LARGE',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const ouvreur = pions[9]!;
      const ailier = pions[13]!;
      ouvreur.x = MILIEU - 5; ouvreur.y = AXE - 4; ouvreur.vx = 1.8;
      ailier.x = MILIEU + 12; ailier.y = AXE - 18; ailier.vx = 5.2; ailier.vy = -0.5;
      const gestes: GesteMatch[] = [
        { id: 'g_pass', joueurId: ouvreur.id, clip: 'pass', debut: 0.1, duree: 1.4 },
        { id: 'g_catch', joueurId: ailier.id, clip: 'catch', debut: 1.1, duree: 1.5 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 4, cadence: 1, horloge: 52.0,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU + 5, y: AXE - 10, hauteur: 1.8 }, gestes,
        vol: {
          id: 'v_saute', type: 'passe', intention: 'passe',
          de: { x: ouvreur.x, y: ouvreur.y }, vers: { x: ailier.x, y: ailier.y },
          hauteur: 2.4, duree: 1.4, ecoule: 0.3,
        },
        arbitre: { x: MILIEU - 4, y: AXE, vx: 1.0, vy: 0, regard: 0 },
      };
      return matchDeBase('passe_sautee', 'Superbe passe sautée d’Antoine Dupont qui offre le décalage sur l’aile !', terrain);
    },
  },
  {
    id: 'franchissement',
    categorie: 'lancements',
    titre: 'Percée nette & Franchissement',
    sousTitre: 'Intervalle pris à pleine vitesse',
    description: 'Le centre feinte la passe extérieure, prend l’intervalle intérieur et transperce le premier rideau défensif pour une échappée de 30 mètres.',
    regle: 'Le franchissement casse la ligne de gain et force le second rideau défensif à battre en retraite d’urgence.',
    phase: 'jeuCourant',
    scenarioType: 'franchissement',
    cadrage: 'suivi',
    badge: 'FRANCHISSEMENT +30M',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const porteur = pions[11]!;
      porteur.x = MILIEU + 4; porteur.y = AXE + 2; porteur.vx = 6.8; porteur.vy = 0.3;
      pions[29]!.vx = -4.5; pions[29]!.vy = -0.5;
      const gestes: GesteMatch[] = [
        { id: 'g_break', joueurId: porteur.id, clip: 'sprint_ball', debut: 0.1, duree: 3.8 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 3, cadence: 1, horloge: 67.3,
        simulation: t, instantJeu: t, pions, ballon: { x: porteur.x, y: porteur.y, hauteur: 0 },
        porteurId: porteur.id, metresGagnes: 28.5, gestes,
        arbitre: { x: MILIEU + 2, y: AXE, vx: 5.2, vy: 0, regard: 0 },
      };
      return matchDeBase('franchissement', 'FRANCHISSEMENT ÉCLATANT ! Le rideau adverse est déchiré en deux !', terrain);
    },
  },
  {
    id: 'pick_and_go',
    categorie: 'lancements',
    titre: 'Pick-and-go chirurgical au ras',
    sousTitre: 'Attaque directe des avants au ras du ruck',
    description: 'Le troisième ligne ramasse le cuir directement au sol et percute le rideau défensif à 1 mètre de la ligne pour franchir la ligne d’avantage.',
    regle: 'Le ramasseur doit être en arrière de la ligne du dernier pied du ruck avant de saisir la balle.',
    phase: 'jeuCourant',
    scenarioType: 'pickAndGo',
    cadrage: 'proche',
    badge: 'JEU AU RAS',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(8, 0);
      const n8 = pions[7]!;
      n8.x = MILIEU + 2; n8.y = AXE; n8.vx = 3.5;
      const gestes: GesteMatch[] = [
        { id: 'g_pick', joueurId: n8.id, clip: 'pickup', debut: 0.1, duree: 1.5 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 5, cadence: 1, horloge: 43.1,
        simulation: t, instantJeu: t, pions, ballon: { x: n8.x, y: n8.y, hauteur: 0 },
        porteurId: n8.id, metresGagnes: 3.8, gestes,
        arbitre: { x: MILIEU - 1, y: AXE - 2, vx: 1.5, vy: 0, regard: 0 },
      };
      return matchDeBase('pick_and_go', 'Pick-and-go destructeur de Gregory Alldritt au ras du regroupement !', terrain);
    },
  },
  {
    id: 'offload_chistera',
    categorie: 'lancements',
    titre: 'Passe après contact (Offload)',
    sousTitre: 'Geste technique acrobatique dans la défense',
    description: 'Ceinturé par deux plaqueurs, le centre libère une sublime passe chistera à une main pour son ailier lancé à pleine vitesse.',
    regle: 'Une passe après contact est légale tant que le joueur n’a pas un genou au sol et que le ballon part vers l’arrière.',
    phase: 'jeuCourant',
    scenarioType: 'offload',
    cadrage: 'proche',
    badge: 'GESTE TECHNIQUE ÉLITE',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const centre = pions[12]!;
      const ailier = pions[13]!;
      centre.x = MILIEU + 8; centre.y = AXE; centre.vx = 2.0;
      ailier.x = MILIEU + 12; ailier.y = AXE - 5; ailier.vx = 6.2;
      const gestes: GesteMatch[] = [
        { id: 'g_offload', joueurId: centre.id, clip: 'offload', debut: 0.2, duree: 1.8 },
        { id: 'g_off_catch', joueurId: ailier.id, clip: 'catch', debut: 1.1, duree: 1.4 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 6, cadence: 1, horloge: 55.4,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU + 10, y: AXE - 2, hauteur: 1.2 }, gestes,
        vol: {
          id: 'v_offload', type: 'passe', intention: 'offload',
          de: { x: centre.x, y: centre.y }, vers: { x: ailier.x, y: ailier.y },
          hauteur: 1.4, duree: 1.0, ecoule: 0.2,
        },
        arbitre: { x: MILIEU + 4, y: AXE + 3, vx: 2.0, vy: 0, regard: 0 },
      };
      return matchDeBase('offload_chistera', 'OFFLOAD MAGIQUE ! Passe après contact d’école qui crée le surnombre décisif.', terrain);
    },
  },
  {
    id: 'crochet_interieur',
    categorie: 'lancements',
    titre: 'Crochet intérieur foudroyant',
    sousTitre: 'Feinte d’appui qui couche le défenseur',
    description: 'À 10 mètres de l’en-but, l’arrière plante son appui extérieur droit et repique intérieur avec un changement de vitesse destructeur.',
    regle: 'Le changement d’appui permet d’exploiter le contre-pied défensif sans commettre d’obstruction.',
    phase: 'jeuCourant',
    scenarioType: 'jeuCourant',
    cadrage: 'proche',
    badge: 'APPUI DÉVASTATEUR',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(12, 0);
      const porteur = pions[14]!;
      const defenseur = pions[29]!;
      porteur.x = LIGNE_B - 12; porteur.y = AXE + 2; porteur.vx = 5.0; porteur.vy = -1.5;
      defenseur.x = LIGNE_B - 8; defenseur.y = AXE + 3; defenseur.vx = -2.0; defenseur.vy = 2.5;
      const gestes: GesteMatch[] = [
        { id: 'g_dodge', joueurId: porteur.id, clip: 'dodge', debut: 0.2, duree: 1.8 },
        { id: 'g_step', joueurId: defenseur.id, clip: 'sidestep', debut: 0.3, duree: 1.6 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 7, cadence: 1, horloge: 73.2,
        simulation: t, instantJeu: t, pions, ballon: { x: porteur.x, y: porteur.y, hauteur: 0 },
        porteurId: porteur.id, metresGagnes: 12.0, gestes,
        arbitre: { x: LIGNE_B - 18, y: AXE, vx: 3.5, vy: 0, regard: 0 },
      };
      return matchDeBase('crochet_interieur', 'CROCHET DÉVASTATEUR ! Le défenseur est pris à contre-pied complet.', terrain);
    },
  },

  // ────────────────────────────────────────────────────────────────────
  // ── 5. JEU AU PIED & DUELS (5 situations)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'chandelle_duel',
    categorie: 'pied',
    titre: 'Chandelle haute & Duel en l’air',
    sousTitre: 'Ballon sous les nuages et contest aérien',
    description: 'Le 9 tape une boîte haute à 30 mètres de hauteur. L’ailier toulousain et l’arrière rochelais montent ensemble au contest aérien sous les sifflets.',
    regle: 'Règle 9.17 : Les joueurs doivent disputer le ballon loyalement en l’air sans plaquer ni faire basculer le sauteur tant qu’il n’est pas retombé sur ses appuis.',
    phase: 'ballonEnLAir',
    scenarioType: 'chandelle',
    cadrage: 'suivi',
    badge: 'DUEL AÉRIEN',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const chassant = pions[13]!;
      const defenseur = pions[29]!;
      chassant.x = MILIEU + 2; chassant.y = AXE - 2; chassant.vx = 4.8;
      defenseur.x = MILIEU + 16; defenseur.y = AXE; defenseur.vx = -3.8;
      const gestes: GesteMatch[] = [
        { id: 'g_jump_chase', joueurId: chassant.id, clip: 'lineout_jump', debut: 1.2, duree: 2.0 },
        { id: 'g_catch_def', joueurId: defenseur.id, clip: 'catch', debut: 1.2, duree: 2.0 },
      ];
      const terrain: TerrainDirect = {
        phase: 'ballonEnLAir', systeme: '1-3-3-1', possession: 'domicile', sequence: 2, cadence: 1, horloge: 41.2,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU + 10.5, y: AXE - 1, hauteur: 8.5 }, gestes,
        vol: {
          id: 'v_chandelle', type: 'pied', intention: 'chandelle',
          de: { x: MILIEU - 15, y: AXE - 4 }, vers: { x: MILIEU + 12, y: AXE },
          hauteur: 10.5, duree: 3.4, ecoule: 1.0,
        },
        arbitre: { x: MILIEU, y: AXE - 6, vx: 2.0, vy: 0, regard: 0 },
      };
      return matchDeBase('chandelle_duel', 'Chandelle très haute disputée ! Duel aérien spectaculaire à la retombée.', terrain);
    },
  },
  {
    id: 'cinquante_vingt_deux',
    categorie: 'pied',
    titre: 'Coup de pied 50:22 d’école',
    sousTitre: 'Touche offensive trouvée dans les 22 mètres',
    description: 'Depuis son propre camp, l’arrière trouve une merveille de coup de pied avec rebond dans les 22 mètres adverses avant de sortir en touche.',
    regle: 'Règle 50:22 : Un coup de pied tapé depuis son camp qui rebondit dans les 22 adverses avant de sortir en touche donne le lancer à l’équipe qui a botté.',
    phase: 'jeuCourant',
    scenarioType: 'cinquanteVingtDeux',
    cadrage: 'large',
    badge: 'RÈGLE 50:22 VALIDÉE',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const botteur = pions[14]!;
      botteur.x = MILIEU - 12; botteur.y = 10; botteur.vx = 1.0;
      const gestes: GesteMatch[] = [
        { id: 'g_5022', joueurId: botteur.id, clip: 'punt', debut: 0.2, duree: 2.0 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 2, cadence: 1, horloge: 28.3,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B - 15, y: 1.5, hauteur: 0.3 }, gestes,
        vol: {
          id: 'v_5022', type: 'pied', intention: 'degagement',
          de: { x: botteur.x, y: botteur.y }, vers: { x: LIGNE_B - 14, y: 0.5 },
          hauteur: 5.5, duree: 2.8, ecoule: 0.8,
        },
        arbitre: { x: LIGNE_B - 20, y: 10, vx: 2.2, vy: 0, regard: 0 },
      };
      return matchDeBase('cinquante_vingt_deux', '50:22 MAGISTRAL ! Lancer en touche obtenu dans les 22 mètres adverses !', terrain);
    },
  },
  {
    id: 'coup_envoi',
    categorie: 'pied',
    titre: 'Coup d’envoi de mi-temps',
    sousTitre: 'Drop de renvoi sur les 10 mètres adverses',
    description: 'L’ouvreur prend de l’élan, lâche le cuir au pied et frappe un long coup d’envoi haut qui dépasse la ligne des 10 mètres avec la charge des avants.',
    regle: 'Le ballon doit parcourir au moins 10 mètres dans le camp adverse sans sortir directement en touche.',
    phase: 'coupEnvoi',
    scenarioType: 'coupEnvoi',
    cadrage: 'large',
    badge: 'ENGAGEMENT OFFICIEL',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const ouvreur = pions[9]!;
      ouvreur.x = MILIEU; ouvreur.y = AXE; ouvreur.vx = 1.0;
      for (let i = 0; i < 8; i++) pions[i]!.vx = 4.2;
      const gestes: GesteMatch[] = [
        { id: 'g_restart', joueurId: ouvreur.id, clip: 'restart', debut: 0.2, duree: 2.2 },
      ];
      const terrain: TerrainDirect = {
        phase: 'coupEnvoi', systeme: '1-3-3-1', possession: 'domicile', sequence: 1, cadence: 1, horloge: 40.0,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU + 18, y: AXE - 4, hauteur: 6.2 }, gestes,
        vol: {
          id: 'v_envoi', type: 'pied', intention: 'renvoi',
          de: { x: MILIEU, y: AXE }, vers: { x: MILIEU + 32, y: AXE - 6 },
          hauteur: 8.5, duree: 3.2, ecoule: 0.8,
        },
        arbitre: { x: MILIEU - 4, y: AXE - 6, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('coup_envoi', 'Coup d’envoi tapé par Romain Ntamack ! Les avants montent en ligne.', terrain);
    },
  },
  {
    id: 'rasant_en_but',
    categorie: 'pied',
    titre: 'Coup de pied rasant dans l’en-but',
    sousTitre: 'Course folle à l’aplatissage',
    description: 'Le demi d’ouverture glisse un petit rasant millimétré dans le dos du rideau défensif. L’ailier sprinte pour aplatir avant le défenseur.',
    regle: 'Le premier joueur qui exerce une pression vers le bas sur le ballon dans l’en-but marque l’essai ou annule.',
    phase: 'jeuCourant',
    scenarioType: 'rasant',
    cadrage: 'proche',
    badge: 'COURSE À L’EN-BUT',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(12, -8);
      const ailier = pions[13]!;
      const def = pions[29]!;
      ailier.x = LIGNE_B - 6; ailier.y = 8; ailier.vx = 6.2;
      def.x = LIGNE_B - 4; def.y = 12; def.vx = 5.0; def.vy = -1.5;
      const gestes: GesteMatch[] = [
        { id: 'g_grubber_chase', joueurId: ailier.id, clip: 'dive_try', debut: 1.0, duree: 2.2 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 4, cadence: 1, horloge: 64.8,
        simulation: t, instantJeu: t, pions, ballon: { x: LIGNE_B + 1.5, y: 7.5, hauteur: 0.2 }, gestes,
        vol: {
          id: 'v_grubber', type: 'pied', intention: 'rasant',
          de: { x: LIGNE_B - 16, y: 10 }, vers: { x: LIGNE_B + 3, y: 7 },
          hauteur: 0.8, duree: 2.2, ecoule: 0.9,
        },
        arbitre: { x: LIGNE_B - 8, y: 15, vx: 3.0, vy: 0, regard: 0 },
      };
      return matchDeBase('rasant_en_but', 'Rasant parfait dans l’en-but ! Course féroce entre l’ailier et l’arrière.', terrain);
    },
  },
  {
    id: 'degagement_en_but',
    categorie: 'pied',
    titre: 'Dégagement sous pression de l’en-but',
    sousTitre: 'Sauvetage in extremis au pied',
    description: 'Acculé dans son propre en-but sous la charge de trois adversaires, l’ouvreur réussit un dégagement puissant qui trouve la touche aux 40 mètres.',
    regle: 'Si le ballon est botté depuis son propre en-but directement en touche, le lancer est accordé à l’endroit où le ballon est sorti.',
    phase: 'jeuCourant',
    scenarioType: 'degagement',
    cadrage: 'large',
    badge: 'SAUVETAGE SOUS PRESSION',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(-40, 0);
      const ouvreur = pions[9]!;
      const chargeur = pions[21]!;
      ouvreur.x = 4.0; ouvreur.y = AXE; ouvreur.vx = 0.5;
      chargeur.x = 8.5; chargeur.y = AXE; chargeur.vx = -4.5;
      const gestes: GesteMatch[] = [
        { id: 'g_punt_in_goal', joueurId: ouvreur.id, clip: 'punt', debut: 0.2, duree: 2.0 },
        { id: 'g_charge', joueurId: chargeur.id, clip: 'charge_down', debut: 0.3, duree: 1.8 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 2, cadence: 1, horloge: 16.5,
        simulation: t, instantJeu: t, pions, ballon: { x: 22, y: 8, hauteur: 5.2 }, gestes,
        vol: {
          id: 'v_degagement', type: 'pied', intention: 'degagement',
          de: { x: 4.0, y: AXE }, vers: { x: 44, y: 1.0 },
          hauteur: 7.2, duree: 2.6, ecoule: 0.7,
        },
        arbitre: { x: 12, y: AXE - 6, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('degagement_en_but', 'Dégagement exceptionnel trouvé sous pression maximale depuis l’en-but !', terrain);
    },
  },

  // ────────────────────────────────────────────────────────────────────
  // ── 6. IMPACTS PHYSIQUES & DISCIPLINE (5 situations)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'gros_tampon_fesses',
    categorie: 'impacts',
    titre: 'Gros tampon dominant ("sur les fesses")',
    sousTitre: 'Collision physique dévastatrice au centre du terrain',
    description: 'Le troisième ligne monte en pointe à pleine charge et sèche le porteur adverse avec un impact dominant monumental : le porteur retombe directement sur les fesses.',
    regle: 'Plaquage dominant légal au buste. Entraîne une perte de dynamique immédiate pour l’attaque et un contest au ruck.',
    phase: 'jeuCourant',
    scenarioType: 'jeuCourant',
    cadrage: 'proche',
    gesteArbitre: 'ref_whistle',
    badge: 'GROS IMPACT PHYSIQUE',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const porteur = pions[9]!;
      const plaqueur = pions[21]!;
      porteur.x = MILIEU + 1.0; porteur.y = AXE; porteur.vx = 2.2; porteur.vy = 0;
      plaqueur.x = MILIEU + 3.8; plaqueur.y = AXE; plaqueur.vx = -2.8; plaqueur.vy = 0;
      pions[10]!.vx = 2.5; pions[10]!.vy = 0.4;
      pions[22]!.vx = -2.0; pions[22]!.vy = -0.3;
      const gestes: GesteMatch[] = [
        { id: 'g_tampon', joueurId: porteur.id, clip: 'fall_back', debut: 0.25, duree: 2.6 },
        { id: 'g_drive', joueurId: plaqueur.id, clip: 'tackle_drive', debut: 0.25, duree: 2.0 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 3, cadence: 1, horloge: 54.2,
        simulation: t, instantJeu: t, pions, ballon: { x: porteur.x, y: porteur.y, hauteur: 0 },
        porteurId: porteur.id, gestes,
        arbitre: { x: MILIEU - 3, y: AXE - 2, vx: 1.2, vy: 0.2, regard: 0 },
      };
      return matchDeBase('gros_tampon_fesses', 'ÉNORME TAMPON ! Le défenseur explose le porteur et l’envoie sur les fesses !', terrain);
    },
  },
  {
    id: 'raffut_fesses',
    categorie: 'impacts',
    titre: 'Raffut destructeur ("sur les fesses")',
    sousTitre: 'Le porteur repousse violemment le plaqueur',
    description: 'En bout de ligne, le puissant ailier arme son bras gauche et décoche un raffut dévastateur qui envoie le défenseur valdinguer sur les fesses à 2 mètres.',
    regle: 'Le raffut à la poitrine ou à l’épaule bras tendu est une arme offensive légale redoutable.',
    phase: 'jeuCourant',
    scenarioType: 'jeuCourant',
    cadrage: 'proche',
    badge: 'RAFFUT DÉVASTATEUR',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(5, -10);
      const porteur = pions[13]!;
      const plaqueur = pions[28]!;
      porteur.x = LIGNE_B - 14; porteur.y = 12; porteur.vx = 4.2; porteur.vy = 0.2;
      plaqueur.x = LIGNE_B - 10; plaqueur.y = 12.5; plaqueur.vx = -3.0; plaqueur.vy = -0.2;
      const gestes: GesteMatch[] = [
        { id: 'g_raffut', joueurId: porteur.id, clip: 'bump', debut: 0.2, duree: 1.6 },
        { id: 'g_chute', joueurId: plaqueur.id, clip: 'fall_back', debut: 0.2, duree: 2.6 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant', systeme: '1-3-3-1', possession: 'domicile', sequence: 4, cadence: 1, horloge: 68.9,
        simulation: t, instantJeu: t, pions, ballon: { x: porteur.x, y: porteur.y, hauteur: 0 },
        porteurId: porteur.id, gestes,
        arbitre: { x: LIGNE_B - 18, y: 16, vx: 2.2, vy: 0, regard: 0 },
      };
      return matchDeBase('raffut_fesses', 'RAFFUT MONSTRUEUX ! Le défenseur est balayé et finit sur les fesses !', terrain);
    },
  },
  {
    id: 'plaquage_cathedrale',
    categorie: 'impacts',
    titre: 'Plaquage cathédrale illicite',
    sousTitre: 'Bascule dangereuse au-delà de l’horizontale',
    description: 'Le plaqueur soulève le porteur de balle et le fait basculer au-delà de l’horizontale. L’arbitre siffle instantanément et sort le carton rouge direct.',
    regle: 'Règle 9.18 : Un joueur ne doit pas soulever un adversaire et le laisser tomber ou le projeter au sol sur la tête ou le haut du corps. Carton rouge direct.',
    phase: 'tmo',
    scenarioType: 'jeuCourant',
    cadrage: 'proche',
    gesteArbitre: 'ref_red',
    badge: 'CARTON ROUGE IMMÉDIAT',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const plaqueur = pions[21]!;
      const porteur = pions[9]!;
      plaqueur.x = MILIEU + 1.0; plaqueur.y = AXE; plaqueur.vx = -1.5;
      porteur.x = MILIEU - 0.5; porteur.y = AXE; porteur.vx = 2.0;
      const gestes: GesteMatch[] = [
        { id: 'g_foul_tip', joueurId: plaqueur.id, clip: 'foul_tip', debut: 0.2, duree: 2.2 },
        { id: 'g_reac_tip', joueurId: porteur.id, clip: 'reaction_tip', debut: 0.3, duree: 2.4 },
      ];
      const terrain: TerrainDirect = {
        phase: 'tmo', systeme: '1-3-3-1', possession: 'domicile', sequence: 3, cadence: 1, horloge: 49.0,
        simulation: t, instantJeu: t, pions, ballon: { x: porteur.x, y: porteur.y, hauteur: 0 }, gestes,
        arbitre: { x: MILIEU - 2.5, y: AXE - 2, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.cartonRouge', club: 'Toulouse', fautif: plaqueur.nom, restant: 4.5 },
      };
      return matchDeBase('plaquage_cathedrale', `Plaquage cathédrale gravissime ! Carton ROUGE direct pour ${plaqueur.nom}.`, terrain);
    },
  },
  {
    id: 'grattage_jackal',
    categorie: 'impacts',
    titre: 'Grattage au sol (Jackal) & Pénalité',
    sousTitre: 'Récupération héroïque sur les appuis',
    description: 'À peine le porteur plaqué, le troisième ligne aile adverse plonge ses mains sur le ballon en restant parfaitement équilibré sur ses appuis. Pénalité sifflée en sa faveur.',
    regle: 'Le gratteur doit être sur ses appuis et avoir les mains sur le ballon avant la formation du ruck.',
    phase: 'penalite',
    scenarioType: 'penalite',
    cadrage: 'proche',
    gesteArbitre: 'ref_penalty',
    badge: 'TURNOVER DÉFENSIF',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      const porteurAuSol = pions[9]!;
      const gratteur = pions[21]!;
      porteurAuSol.x = MILIEU + 2; porteurAuSol.y = AXE;
      gratteur.x = MILIEU + 2.5; gratteur.y = AXE;
      const gestes: GesteMatch[] = [
        { id: 'g_jackal', joueurId: gratteur.id, clip: 'jackal', debut: 0.2, duree: 3.0 },
        { id: 'g_pres', joueurId: porteurAuSol.id, clip: 'present', debut: 0.1, duree: 3.0 },
      ];
      const terrain: TerrainDirect = {
        phase: 'penalite', systeme: '1-3-3-1', possession: 'exterieur', sequence: 2, cadence: 1, horloge: 36.8,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU + 2.2, y: AXE, hauteur: 0 }, gestes,
        arbitre: { x: MILIEU - 1, y: AXE - 3, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.penalite', club: 'La Rochelle', fautif: porteurAuSol.nom, restant: 4.0 },
      };
      return matchDeBase('grattage_jackal', 'Grattage magistral au sol ! Pénalité sifflée pour La Rochelle.', terrain);
    },
  },
  {
    id: 'bagarre_generale',
    categorie: 'impacts',
    titre: 'Échauffourée & Bagarre générale',
    sousTitre: 'Tension maximale et regroupement houleux',
    description: 'Une friction au sol dégénère : les deux paquets d’avants et les lignes arrières s’agglutinent dans une bousculade houleuse. L’arbitre siffle l’arrêt de jeu pour calmer les esprits.',
    regle: 'Règle 9 : L’arbitre arrête le chronomètre de match et sépare les protagonistes avant de distribuer les sanctions disciplinaires.',
    phase: 'bagarre',
    scenarioType: 'ballonLibre',
    cadrage: 'proche',
    gesteArbitre: 'ref_whistle',
    badge: 'ARRÊT DU CHRONOMÈTRE',
    fabriquer: (t = 0) => {
      const pions = pionsStandard(0, 0);
      for (let i = 0; i < 6; i++) {
        pions[i]!.x = MILIEU + (i % 2) * 1.5;
        pions[i]!.y = AXE + (i % 3) * 1.2;
        pions[i]!.vx = (i % 2 === 0 ? 0.8 : -0.8);
        pions[i + 15]!.x = MILIEU + 1 - (i % 2) * 1.5;
        pions[i + 15]!.y = AXE + (i % 3) * 1.2;
        pions[i + 15]!.vx = (i % 2 === 0 ? -0.8 : 0.8);
      }
      const gestes: GesteMatch[] = [
        { id: 'g_brawl_1', joueurId: pions[0]!.id, clip: 'bump', debut: 0.1, duree: 3.5 },
        { id: 'g_brawl_2', joueurId: pions[15]!.id, clip: 'contact_brace', debut: 0.1, duree: 3.5 },
      ];
      const terrain: TerrainDirect = {
        phase: 'bagarre', systeme: '1-3-3-1', possession: 'domicile', sequence: 5, cadence: 0, horloge: 71.0,
        simulation: t, instantJeu: t, pions, ballon: { x: MILIEU, y: AXE, hauteur: 0 }, gestes,
        arbitre: { x: MILIEU - 3, y: AXE - 1, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.penalite', club: 'Toulouse', fautif: '', restant: 5.0 },
      };
      return matchDeBase('bagarre_generale', 'Échauffourée générale au centre du terrain ! L’arbitre interrompt la rencontre.', terrain);
    },
  },
];

export function trouverSituation(id: string): SituationTestInfo | undefined {
  return SITUATIONS_LABORATOIRE.find(s => s.id === id);
}
