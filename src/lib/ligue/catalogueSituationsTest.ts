// CATALOGUE DES SITUATIONS DE MATCH — LABORATOIRE KIRI
//
// Permet à l'administrateur Kiri de tester et visualiser TOUTES les situations
// possibles de match de rugby (TMO, essais, conquêtes, lancements, jeu au pied,
// gros impacts "sur les fesses", cartons).

import type { TerrainDirect, VueMatchEnLigne, CoteEnLigne } from './matchCarriere.js';
import type { TypeScenarioDirect } from './scenarioDirect.js';
import type { Phase } from '../moteur/etat.js';
import type { GesteMatch } from '../moteur/dynamique.js';
import type { NomIcone } from '../../components/Icone.js';
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

function pionsStandard(decalageX = 0, decalageY = 0) {
  const pions = [];
  // 15 joueurs Domicile (Toulouse - Rouge et Noir)
  const postesDom = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'];
  for (let i = 1; i <= 15; i++) {
    const x = 50 + (i <= 8 ? (i - 1) * 1.5 : (i - 8) * 3) + decalageX;
    const y = 20 + (i % 5) * 6 + decalageY;
    pions.push({
      id: `dom_${i}`,
      numero: i,
      numeroRole: i,
      nom: `Toulousain ${i}`,
      poste: (postesDom[i - 1] ?? '15') as any,
      cote: 'domicile' as CoteEnLigne,
      x, y,
      vx: 0, vy: 0,
      force: 85, tailleCm: 188, poidsKg: 98,
    });
  }
  // 15 joueurs Extérieur (La Rochelle - Jaune et Noir)
  for (let i = 1; i <= 15; i++) {
    const x = 65 + (i <= 8 ? (i - 1) * 1.5 : (i - 8) * 3) + decalageX;
    const y = 20 + (i % 5) * 6 + decalageY;
    pions.push({
      id: `ext_${i}`,
      numero: i,
      numeroRole: i,
      nom: `Rochelais ${i}`,
      poste: (postesDom[i - 1] ?? '15') as any,
      cote: 'exterieur' as CoteEnLigne,
      x, y,
      vx: 0, vy: 0,
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
  // ── 1. ARBITRAGE VIDÉO TMO ──────────────────────────────────────────
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(10, -5);
      pions[13]!.x = LIGNE_B + 1.2;
      pions[13]!.y = 12;
      const terrain: TerrainDirect = {
        phase: 'tmo',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 4,
        cadence: 1,
        horloge: 34.2,
        pions,
        ballon: { x: LIGNE_B + 1.2, y: 12, hauteur: 0 },
        porteurId: pions[13]!.id,
        arbitre: { x: LIGNE_B - 2, y: 14, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'ml.sifflet.tmo', club: 'Toulouse', fautif: '', restant: 3.5 },
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(8, 0);
      pions[11]!.x = LIGNE_B + 2;
      pions[11]!.y = AXE;
      const terrain: TerrainDirect = {
        phase: 'tmo',
        systeme: '1-3-3-1',
        possession: 'exterieur',
        sequence: 6,
        cadence: 1,
        horloge: 22.4,
        pions,
        ballon: { x: LIGNE_B - 5, y: AXE - 2, hauteur: 0 },
        arbitre: { x: LIGNE_B - 4, y: AXE + 1, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.enAvant', club: 'La Rochelle', fautif: '', restant: 3.5 },
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(12, -18);
      pions[13]!.x = LIGNE_B + 0.5;
      pions[13]!.y = 1.2;
      const terrain: TerrainDirect = {
        phase: 'tmo',
        systeme: '1-3-3-1',
        possession: 'exterieur',
        sequence: 8,
        cadence: 1,
        horloge: 58.1,
        pions,
        ballon: { x: LIGNE_B + 0.5, y: 0.8, hauteur: 0 },
        arbitre: { x: LIGNE_B - 3, y: 3.5, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.touche', club: 'La Rochelle', fautif: '', restant: 3.5 },
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      const fautif = pions[17]!;
      fautif.x = MILIEU; fautif.y = AXE;
      const terrain: TerrainDirect = {
        phase: 'tmo',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 2,
        cadence: 1,
        horloge: 45.0,
        pions,
        ballon: { x: MILIEU, y: AXE, hauteur: 0 },
        arbitre: { x: MILIEU - 2, y: AXE - 1, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.cartonRouge', club: 'Toulouse', fautif: fautif.nom, restant: 4.0 },
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
    regle: 'Cadre de sanction des contacts à la tête : contact à la tête ou au cou sans coup direct délibéré. Carton jaune de 10 minutes.',
    phase: 'tmo',
    scenarioType: 'tmo',
    cadrage: 'tmo',
    gesteArbitre: 'ref_yellow',
    badge: 'CARTON JAUNE (10 MIN)',
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      const fautif = pions[19]!;
      const terrain: TerrainDirect = {
        phase: 'tmo',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 3,
        cadence: 1,
        horloge: 62.1,
        pions,
        ballon: { x: MILIEU + 5, y: AXE + 2, hauteur: 0 },
        arbitre: { x: MILIEU + 3, y: AXE, vx: 0, vy: 0, regard: 0 },
        sifflet: { cle: 'sifflet.cartonJaune', club: 'Toulouse', fautif: fautif.nom, restant: 4.0 },
      };
      return matchDeBase('tmo_carton_jaune', `TMO : Plaquage haut confirmé ! Carton JAUNE pour ${fautif.nom} (10 minutes d’exclusion).`, terrain);
    },
  },

  // ── 2. ESSAIS, MARQUE & REPLAYS ─────────────────────────────────────
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(12, -15);
      const marqueur = pions[13]!;
      marqueur.x = LIGNE_B + 1.5; marqueur.y = 8;
      const gestes: GesteMatch[] = [
        { id: 'g_try', joueurId: marqueur.id, clip: 'dive_try', debut: 100, duree: 2.0 },
      ];
      const terrain: TerrainDirect = {
        phase: 'aplatissage',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 5,
        cadence: 1,
        horloge: 12.3,
        pions,
        ballon: { x: LIGNE_B + 1.5, y: 8, hauteur: 0 },
        porteurId: marqueur.id,
        gestes,
        arbitre: { x: LIGNE_B - 2, y: 10, vx: 0, vy: 0, regard: 0 },
        aplatissage: { marqueurId: marqueur.id, progression: 0.8 },
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      const buteur = pions[9]!;
      buteur.x = LIGNE_B - 22; buteur.y = AXE;
      const terrain: TerrainDirect = {
        phase: 'transformation',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 6,
        cadence: 1,
        horloge: 14.1,
        pions,
        ballon: { x: LIGNE_B - 22, y: AXE, hauteur: 0 },
        preparationTir: { buteurId: buteur.id, progression: 0.4, transformation: true },
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      const buteur = pions[9]!;
      buteur.x = LIGNE_B - 28; buteur.y = AXE;
      const terrain: TerrainDirect = {
        phase: 'jeuCourant',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 7,
        cadence: 1,
        horloge: 78.5,
        pions,
        ballon: { x: LIGNE_B - 14, y: AXE, hauteur: 4.8 },
        vol: {
          id: 'v_drop',
          type: 'pied',
          intention: 'drop',
          de: { x: LIGNE_B - 28, y: AXE },
          vers: { x: LIGNE_B, y: AXE },
          hauteur: 6.2,
          duree: 1.8,
          ecoule: 0.9,
        },
        arbitre: { x: LIGNE_B - 20, y: AXE - 5, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('drop_goal', 'DROP RÉUSSI ! Le ballon passe entre les perches à la sirène !', terrain);
    },
  },

  // ── 3. CONQUÊTE & PHASES ARRÊTÉES ───────────────────────────────────
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      const terrain: TerrainDirect = {
        phase: 'melee',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 1,
        cadence: 1,
        horloge: 18.0,
        pions,
        ballon: { x: MILIEU, y: AXE, hauteur: 0 },
        conquete: { type: 'melee', progression: 0.5, combinaison: 'premierBloc', pousseVers: 'domicile' },
        arbitre: { x: MILIEU - 3, y: AXE - 4, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('melee_fermee', 'Mêlée ordonnée ! Grosse poussée du pack toulousain.', terrain);
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(-10, -18);
      const sauteur = pions[3]!;
      sauteur.y = 5;
      const terrain: TerrainDirect = {
        phase: 'touche',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 1,
        cadence: 1,
        horloge: 25.4,
        pions,
        ballon: { x: M22_A + 10, y: 5, hauteur: 3.2 },
        conquete: { type: 'touche', progression: 0.6, combinaison: 'milieu' },
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(5, -12);
      const terrain: TerrainDirect = {
        phase: 'maul',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 3,
        cadence: 1,
        horloge: 48.2,
        pions,
        ballon: { x: LIGNE_B - 8, y: 15, hauteur: 1.1 },
        porteurId: pions[1]!.id,
        metresGagnes: 6.4,
        arbitre: { x: LIGNE_B - 10, y: 18, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('maul_porte', 'Ballon porté destructeur ! Le paquet d’avants avance sur 8 mètres.', terrain);
    },
  },

  // ── 4. LANCEMENTS & ATTAQUE AU LARGE ────────────────────────────────
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      const ouvreur = pions[9]!;
      const ailier = pions[13]!;
      const terrain: TerrainDirect = {
        phase: 'jeuCourant',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 4,
        cadence: 1,
        horloge: 52.0,
        pions,
        ballon: { x: MILIEU + 5, y: AXE - 10, hauteur: 1.8 },
        vol: {
          id: 'v_saute',
          type: 'passe',
          intention: 'passe',
          de: { x: ouvreur.x, y: ouvreur.y },
          vers: { x: ailier.x, y: ailier.y },
          hauteur: 2.2,
          duree: 0.8,
          ecoule: 0.4,
        },
        arbitre: { x: MILIEU - 4, y: AXE, vx: 0, vy: 0, regard: 0 },
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      const porteur = pions[11]!;
      porteur.x = MILIEU + 18; porteur.y = AXE + 4;
      const terrain: TerrainDirect = {
        phase: 'jeuCourant',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 3,
        cadence: 1,
        horloge: 67.3,
        pions,
        ballon: { x: porteur.x, y: porteur.y, hauteur: 0 },
        porteurId: porteur.id,
        metresGagnes: 18.5,
        arbitre: { x: MILIEU + 10, y: AXE, vx: 4, vy: 0, regard: 0 },
      };
      return matchDeBase('franchissement', 'FRANCHISSEMENT ÉCLATANT ! Le rideau adverse est déchiré en deux !', terrain);
    },
  },

  // ── 5. JEU AU PIED & DUELS ──────────────────────────────────────────
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      const chassant = pions[13]!;
      const defenseur = pions[29]!;
      chassant.x = MILIEU + 10; chassant.y = AXE - 2;
      defenseur.x = MILIEU + 11; defenseur.y = AXE;
      const terrain: TerrainDirect = {
        phase: 'ballonEnLAir',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 2,
        cadence: 1,
        horloge: 41.2,
        pions,
        ballon: { x: MILIEU + 10.5, y: AXE - 1, hauteur: 8.5 },
        vol: {
          id: 'v_chandelle',
          type: 'pied',
          intention: 'chandelle',
          de: { x: MILIEU - 15, y: AXE - 4 },
          vers: { x: MILIEU + 12, y: AXE },
          hauteur: 9.5,
          duree: 3.2,
          ecoule: 1.6,
        },
        arbitre: { x: MILIEU, y: AXE - 6, vx: 0, vy: 0, regard: 0 },
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      const terrain: TerrainDirect = {
        phase: 'jeuCourant',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 2,
        cadence: 1,
        horloge: 28.3,
        pions,
        ballon: { x: LIGNE_B - 15, y: 1.5, hauteur: 0.3 },
        arbitre: { x: LIGNE_B - 20, y: 10, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('cinquante_vingt_deux', '50:22 MAGISTRAL ! Lancer en touche obtenu dans les 22 mètres adverses !', terrain);
    },
  },

  // ── 6. IMPACTS PHYSIQUES & DISCIPLINE ───────────────────────────────
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      const porteur = pions[9]!;
      const plaqueur = pions[21]!;
      porteur.x = MILIEU + 2; porteur.y = AXE;
      plaqueur.x = MILIEU + 2.5; plaqueur.y = AXE;
      const gestes: GesteMatch[] = [
        { id: 'g_tampon', joueurId: porteur.id, clip: 'fall_back', debut: 100, duree: 2.2 },
        { id: 'g_drive', joueurId: plaqueur.id, clip: 'tackle_drive', debut: 100, duree: 1.8 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 3,
        cadence: 1,
        horloge: 54.2,
        pions,
        ballon: { x: porteur.x, y: porteur.y, hauteur: 0 },
        porteurId: porteur.id,
        gestes,
        arbitre: { x: MILIEU - 3, y: AXE - 2, vx: 0, vy: 0, regard: 0 },
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(5, -10);
      const porteur = pions[13]!;
      const plaqueur = pions[28]!;
      porteur.x = LIGNE_B - 14; porteur.y = 12;
      plaqueur.x = LIGNE_B - 12; plaqueur.y = 12.5;
      const gestes: GesteMatch[] = [
        { id: 'g_raffut', joueurId: porteur.id, clip: 'bump', debut: 100, duree: 1.4 },
        { id: 'g_chute', joueurId: plaqueur.id, clip: 'fall_back', debut: 100, duree: 2.2 },
      ];
      const terrain: TerrainDirect = {
        phase: 'jeuCourant',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 4,
        cadence: 1,
        horloge: 68.9,
        pions,
        ballon: { x: porteur.x, y: porteur.y, hauteur: 0 },
        porteurId: porteur.id,
        gestes,
        arbitre: { x: LIGNE_B - 18, y: 16, vx: 0, vy: 0, regard: 0 },
      };
      return matchDeBase('raffut_fesses', 'RAFFUT MONSTRUEUX ! Le défenseur est balayé et finit sur les fesses !', terrain);
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
    fabriquer: (_t = 0) => {
      const pions = pionsStandard(0, 0);
      for (let i = 0; i < 6; i++) {
        pions[i]!.x = MILIEU + (i % 2) * 1.5;
        pions[i]!.y = AXE + (i % 3) * 1.2;
        pions[i + 15]!.x = MILIEU + 1 - (i % 2) * 1.5;
        pions[i + 15]!.y = AXE + (i % 3) * 1.2;
      }
      const terrain: TerrainDirect = {
        phase: 'bagarre',
        systeme: '1-3-3-1',
        possession: 'domicile',
        sequence: 5,
        cadence: 0,
        horloge: 71.0,
        pions,
        ballon: { x: MILIEU, y: AXE, hauteur: 0 },
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

