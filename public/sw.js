// ⚠️⚠️ CE FICHIER N'EST PAS UN FICHIER DE VALIDATION. C'EST UN SERVICE WORKER.
//
// Il a été fourni par une régie (Monetag / PropellerAds, zone 11553232) sous
// l'intitulé « Verification — uploading file method ». L'intitulé est trompeur,
// et il faut savoir ce qu'on héberge :
//
//   • un fichier servi à `/sw.js` a la **portée racine** du site : une fois
//     enregistré par le navigateur, il s'interpose devant TOUTES les requêtes
//     de destiny-rugby.fr, y compris celles du jeu ;
//   • `importScripts(...)` exécute du **code distant**, chargé chez la régie à
//     chaque démarrage du worker. Ce code peut changer à tout moment, sans
//     redéploiement de notre part et sans qu'on en soit informé ;
//   • c'est le mécanisme des **notifications push publicitaires** : elles
//     continuent d'arriver sur l'appareil du joueur même quand le site est
//     fermé.
//
// Comparé à `ads.txt`, qui est un fichier texte inerte, ce fichier-ci est du
// code exécutable tiers avec les pleins pouvoirs sur l'origine.
//
// ⚠️ CE QUE LE JEU FAIT, LUI : RIEN. Aucun code de `src/` n'appelle
// `navigator.serviceWorker.register()`. Déposer le fichier ne l'active pas :
// c'est le tag de la régie, s'il est un jour posé dans la page, qui
// l'enregistrera. Tant qu'aucun tag Monetag n'est intégré, ce fichier n'est
// qu'un fichier statique de plus, et le site se comporte exactement comme
// avant. C'est ce qui permet de valider le domaine sans rien changer au jeu.
//
// ⚠️ ET ÇA ENTRE EN TENSION AVEC LES RÈGLES DE `src/lib/pub.ts` :
// « rien ne se charge sans consentement », « jamais d'interstitiel, jamais de
// pop-up », « la pub ne doit pas être chiante ». Une notification push est
// exactement ce que ces règles écartent — et elle échappe à notre bandeau de
// consentement, puisque c'est la régie qui la déclenche. À garder en tête avant
// d'ajouter le tag Monetag dans la page.
//
// ⚠️ CONFLIT DE NOM À SURVEILLER : si le jeu se dote un jour d'un service
// worker (PWA, mode hors ligne), il ne pourra pas s'appeler `/sw.js` — celui-ci
// occupe déjà l'emplacement et la portée racine.
//
// Contenu livré par la régie, tel quel et sans modification :
self.options = {
    "domain": "3nbf4.com",
    "zoneId": 11553232
}
self.lary = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')
