import type { Traduction } from '../lib/i18n.js';

// LES TEXTES DES RESPONSABILITÉS (Correctif 17) — capitaine, buteur, engagement, lanceur, drop.
//
// ⚠️ SEPT LANGUES POUR CHAQUE CLÉ, ET LES MÊMES VARIABLES PARTOUT : `npm run verify:traductions` refuse une
// langue manquante ou une variable qui change d'une langue à l'autre.
//
// ⚠️ CE QUI EST DYNAMIQUE N'EST PAS VÉRIFIÉ PAR LE BANC : `rv.raison.<raison>`, `rv.choix.<choix>`,
// `rv.fil.capitaine.<choix>`, `rv.role.<rôle>` et `rv.touche.<combinaison>` se construisent à l'exécution —
// ils s'écrivent donc ici TOUS, même si aucun `t('…')` littéral ne les nomme.
//
// ⚠️ LE MOTEUR ÉCRIT LES LIGNES DU FIL (`rv.fil.*`) AVEC `t()` : la langue du joueur, pas du français traduit.

const tr = (fr: string, en: string, es: string, it: string, de: string, pt: string, ja: string): Traduction => (
  { fr, en, es, it, de, pt, ja }
);

export const TEXTES_RESPONSABILITES: Record<string, Traduction> = {
  // ═══ LES CHOIX DU CAPITAINE APRÈS UNE PÉNALITÉ ═════════════════════════════
  'rv.choix.points': tr('Poteaux', 'Posts', 'Palos', 'Pali', 'Stangen', 'Postes', 'ゴール'),
  'rv.choix.touche': tr('Touche', 'Touch', 'Touche', 'Touche', 'Gasse', 'Lateral', 'タッチ'),
  'rv.choix.melee': tr('Mêlée', 'Scrum', 'Melé', 'Mischia', 'Gedränge', 'Formação', 'スクラム'),
  'rv.choix.rapide': tr('Jouer vite', 'Quick tap', 'Jugar rápido', 'Gioca veloce', 'Schnell spielen', 'Jogar rápido', 'クイック'),

  'rv.fil.capitaine.points': tr(
    '{nom} choisit les poteaux : {raison}.', '{nom} goes for the posts: {raison}.', '{nom} opta por los palos: {raison}.',
    '{nom} sceglie i pali: {raison}.', '{nom} entscheidet sich für die Stangen: {raison}.', '{nom} opta pelos postes: {raison}.',
    '{nom}がゴールを選択：{raison}。'),
  'rv.fil.capitaine.touche': tr(
    '{nom} choisit la touche : {raison}.', '{nom} kicks to touch: {raison}.', '{nom} elige la touche: {raison}.',
    '{nom} sceglie la touche: {raison}.', '{nom} geht in die Gasse: {raison}.', '{nom} escolhe a lateral: {raison}.',
    '{nom}がタッチキックを選択：{raison}。'),
  'rv.fil.capitaine.melee': tr(
    '{nom} demande la mêlée : {raison}.', '{nom} asks for the scrum: {raison}.', '{nom} pide melé: {raison}.',
    '{nom} chiede la mischia: {raison}.', '{nom} verlangt das Gedränge: {raison}.', '{nom} pede formação ordenada: {raison}.',
    '{nom}がスクラムを選択：{raison}。'),
  'rv.fil.capitaine.rapide': tr(
    '{nom} joue vite : {raison}.', '{nom} taps and goes: {raison}.', '{nom} juega rápido: {raison}.',
    '{nom} gioca veloce: {raison}.', '{nom} spielt schnell: {raison}.', '{nom} joga rápido: {raison}.',
    '{nom}がクイックタップ：{raison}。'),

  // Pourquoi : la raison dite à voix haute, au bout de la phrase.
  'rv.raison.egaliser': tr('trois points pour égaliser', 'three points to level the score', 'tres puntos para empatar', 'tre punti per pareggiare', 'drei Punkte zum Ausgleich', 'três pontos para empatar', '同点にするための3点'),
  'rv.raison.passerDevant': tr('trois points pour passer devant', 'three points to go ahead', 'tres puntos para ponerse por delante', 'tre punti per passare in vantaggio', 'drei Punkte zur Führung', 'três pontos para passar à frente', '逆転するための3点'),
  'rv.raison.seMettreALAbri': tr('se mettre à l’abri', 'to get out of reach', 'para ponerse a salvo', 'per mettersi al sicuro', 'um sich abzusetzen', 'para se pôr a salvo', '点差を安全圏にするため'),
  'rv.raison.allongerLAvance': tr('creuser l’écart', 'to stretch the lead', 'para ampliar la ventaja', 'per allungare il vantaggio', 'um die Führung auszubauen', 'para alargar a vantagem', 'リードを広げるため'),
  'rv.raison.chercherLEssai': tr('il faut un essai', 'a try is needed', 'hace falta un ensayo', 'serve una meta', 'es braucht einen Versuch', 'é preciso um ensaio', 'トライが必要'),
  'rv.raison.vaincreLaMontre': tr('garder le ballon et user le temps', 'to keep the ball and run the clock', 'para conservar el balón y gastar tiempo', 'per tenere palla e consumare il tempo', 'um den Ball zu halten und Zeit zu verbrauchen', 'para manter a bola e gastar tempo', 'ボールを保持して時間を使うため'),
  'rv.raison.tropLoin': tr('c’est trop loin des poteaux', 'it is too far from the posts', 'está demasiado lejos de los palos', 'è troppo lontano dai pali', 'es ist zu weit von den Stangen', 'está longe demais dos postes', 'ゴールポストから遠すぎる'),
  'rv.raison.buteurSur': tr('le buteur est dans ses distances', 'the kicker is in range', 'el pateador está en su distancia', 'il calciatore è nella sua distanza', 'der Kicker ist in Reichweite', 'o chutador está dentro da sua distância', 'キッカーの射程内'),
  'rv.raison.buteurHesitant': tr('le tir est trop incertain', 'the kick is too uncertain', 'el tiro es demasiado incierto', 'il tiro è troppo incerto', 'der Kick ist zu unsicher', 'o chute é incerto demais', 'キックが不確実すぎる'),
  'rv.raison.meleeDominante': tr('la mêlée domine', 'the scrum is dominant', 'la melé domina', 'la mischia domina', 'das Gedränge dominiert', 'a formação domina', 'スクラムが優勢'),
  'rv.raison.defenseDesorganisee': tr('la défense n’est pas replacée', 'the defence is not set', 'la defensa no está colocada', 'la difesa non è schierata', 'die Abwehr steht nicht', 'a defesa não está posicionada', 'ディフェンスが整っていない'),
  'rv.raison.consignePoints': tr('consigne de l’entraîneur : les points', 'coach’s instruction: take the points', 'instrucción del entrenador: los puntos', 'indicazione dell’allenatore: i punti', 'Anweisung des Trainers: die Punkte', 'instrução do treinador: os pontos', 'コーチの指示：ゴールを狙う'),
  'rv.raison.consigneTouche': tr('consigne de l’entraîneur : la touche', 'coach’s instruction: go to touch', 'instrucción del entrenador: la touche', 'indicazione dell’allenatore: la touche', 'Anweisung des Trainers: die Gasse', 'instrução do treinador: a lateral', 'コーチの指示：タッチへ'),
  'rv.raison.gagnerDuTerrain': tr('gagner du terrain', 'to gain territory', 'para ganar terreno', 'per guadagnare terreno', 'um Raum zu gewinnen', 'para ganhar terreno', '陣地を稼ぐため'),
  'rv.raison.tenirLeBallon': tr('tenir le ballon près de la ligne', 'to keep the ball near the line', 'para mantener el balón cerca de la línea', 'per tenere palla vicino alla linea', 'um den Ball nahe der Linie zu halten', 'para manter a bola perto da linha', 'ラインの近くでボールを保つため'),
  'rv.raison.choixDuJoueur': tr('la décision du capitaine', 'the captain’s call', 'decisión del capitán', 'scelta del capitano', 'Entscheidung des Kapitäns', 'decisão do capitão', 'キャプテンの判断'),

  // ═══ « RÔLES DANS L'ÉQUIPE » : le bloc compact de l'interface carrière (seulement les rôles tenus) ═══
  'rv.roles.auto': tr('Automatique', 'Automatic', 'Automático', 'Automatico', 'Automatisch', 'Automático', '自動'),
  'rv.roles.autoAide': tr('Le staff choisit : le meilleur pied, le talonneur…', 'The staff picks: the best kicker, the hooker…', 'El cuerpo técnico elige: el mejor pie, el talonador…', 'Lo staff sceglie: il miglior piede, il tallonatore…', 'Das Trainerteam wählt: der beste Fuß, der Hakler…', 'A equipa técnica escolhe: o melhor pé, o talonador…', 'スタッフが選ぶ：最も足の良い選手、フッカーなど'),
  'rv.roles.titre': tr('Rôles dans l’équipe', 'Roles in the team', 'Funciones en el equipo', 'Ruoli in squadra', 'Rollen im Team', 'Funções na equipa', 'チーム内の役割'),
  'rv.role.capitaine': tr('Capitaine', 'Captain', 'Capitán', 'Capitano', 'Kapitän', 'Capitão', 'キャプテン'),
  'rv.role.capitaine.aide': tr('Tu portes le brassard : après une pénalité, c’est toi qui décides.', 'You wear the armband: after a penalty, you make the call.', 'Llevas el brazalete: tras un golpe de castigo, decides tú.', 'Porti la fascia: dopo una punizione decidi tu.', 'Du trägst die Binde: nach einem Straftritt entscheidest du.', 'Usas a braçadeira: depois de uma penalidade, decides tu.', '腕章を巻く君が、ペナルティ後の判断を下す。'),
  'rv.role.viceCapitaine': tr('Vice-capitaine', 'Vice-captain', 'Vicecapitán', 'Vice capitano', 'Vizekapitän', 'Vice-capitão', '副キャプテン'),
  'rv.role.viceCapitaine.aide': tr('Tu prends le brassard — et les décisions — quand le capitaine sort.', 'You take the armband — and the decisions — when the captain goes off.', 'Asumes el brazalete —y las decisiones— cuando sale el capitán.', 'Prendi la fascia — e le decisioni — quando il capitano esce.', 'Du übernimmst Binde und Entscheidungen, wenn der Kapitän vom Platz geht.', 'Assumes a braçadeira — e as decisões — quando o capitão sai.', 'キャプテンが退くと、腕章と判断を引き継ぐ。'),
  'rv.role.buteur': tr('Buteur', 'Kicker', 'Pateador', 'Calciatore', 'Kicker', 'Chutador', 'キッカー'),
  'rv.role.buteur.aide': tr('Tu tapes les transformations et les pénalités.', 'You take the conversions and the penalties.', 'Tú pateas las transformaciones y los golpes de castigo.', 'Calci tu trasformazioni e punizioni.', 'Du trittst Erhöhungen und Straftritte.', 'Chutas tu as transformações e as penalidades.', 'コンバージョンとペナルティを蹴る。'),
  'rv.role.buteur2': tr('Buteur secondaire', 'Back-up kicker', 'Pateador suplente', 'Calciatore di riserva', 'Ersatz-Kicker', 'Chutador suplente', '控えキッカー'),
  'rv.role.buteur2.aide': tr('Tu tapes quand le buteur n’est pas là.', 'You kick when the kicker is not on the pitch.', 'Pateas cuando el pateador no está.', 'Calci quando il calciatore non c’è.', 'Du trittst, wenn der Kicker nicht auf dem Platz ist.', 'Chutas quando o chutador não está em campo.', 'キッカー不在のときに蹴る。'),
  'rv.role.engagement': tr('Engagements', 'Kick-offs', 'Saques', 'Calci d’inizio', 'Ankicks', 'Pontapés de saída', 'キックオフ'),
  'rv.role.engagement.aide': tr('Tu fais les coups d’envoi et les engagements après les points.', 'You take the kick-offs and the restarts after scores.', 'Haces los saques iniciales y los reinicios tras los puntos.', 'Fai i calci d’inizio e le riprese dopo i punti.', 'Du führst die Ankicks und die Neustarts nach Punkten aus.', 'Fazes os pontapés de saída e os reinícios depois dos pontos.', 'キックオフと得点後の再開を担当。'),
  'rv.role.droppeur': tr('Droppeur', 'Drop-goal kicker', 'Pateador de drop', 'Specialista del drop', 'Dropgoal-Schütze', 'Chutador de drop', 'ドロップ担当'),
  'rv.role.droppeur.aide': tr('À portée des poteaux, tu peux tenter un drop.', 'In range of the posts, you can try a drop goal.', 'A tiro de palos, puedes intentar un drop.', 'A tiro dei pali, puoi tentare un drop.', 'In Reichweite der Stangen kannst du ein Dropgoal versuchen.', 'Ao alcance dos postes, podes tentar um drop.', 'ポストの射程内でドロップゴールを狙える。'),
  'rv.role.lanceur': tr('Lanceur de touche', 'Lineout thrower', 'Lanzador de touche', 'Lanciatore di touche', 'Gassen-Werfer', 'Lançador de lateral', 'ラインアウトのスロワー'),
  'rv.role.lanceur.aide': tr('Tu annonces et tu lances les touches.', 'You call and throw the lineouts.', 'Anuncias y lanzas las touches.', 'Annunci e lanci le touche.', 'Du sagst die Gassen an und wirfst ein.', 'Anuncias e lanças os laterais.', 'ラインアウトをコールして投げる。'),
  'rv.role.lanceur2': tr('Lanceur secondaire', 'Back-up thrower', 'Lanzador suplente', 'Lanciatore di riserva', 'Ersatz-Werfer', 'Lançador suplente', '控えスロワー'),
  'rv.role.lanceur2.aide': tr('Tu lances quand le premier lanceur est sorti.', 'You throw when the first thrower is off.', 'Lanzas cuando el primer lanzador no está.', 'Lanci quando il primo lanciatore è uscito.', 'Du wirfst ein, wenn der erste Werfer draußen ist.', 'Lanças quando o primeiro lançador saiu.', '一人目のスロワーが退いたら投げる。'),
};
