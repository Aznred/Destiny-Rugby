// ⚠️ FICHIER GÉNÉRÉ — NE PAS ÉDITER À LA MAIN.
//
// Produit par `npx vite-node scripts/traduire.ts`, qui remplit automatiquement
// les langues manquantes du dictionnaire à partir du français.
//
// ⚠️ IL EST FUSIONNÉ AVEC LA PRIORITÉ LA PLUS BASSE dans `data/textes.ts` :
// toute traduction écrite à la main gagne sur celle-ci. C'est ce qui permet de
// relancer le script sans jamais rien écraser, et de corriger une tournure
// simplement en l'écrivant dans le fichier normal.
//
// ⚠️ LES CLÉS N'ONT PAS DE `fr` : le français est la source, il vit dans les
// fichiers écrits à la main. Ici on ne fournit que les compléments, d'où le
// type partiel.
//
// Il est VIDE aujourd'hui, et c'est normal : les 599 clés du dictionnaire sont
// déjà traduites à la main dans les sept langues. Le script sert à partir de la
// prochaine clé ajoutée — on écrit la ligne avec le seul `fr:`, on le relance,
// et les six autres arrivent.

import type { Langue } from '../lib/i18n';

export const TEXTES_AUTO: Record<string, Partial<Record<Langue, string>>> = {
};
