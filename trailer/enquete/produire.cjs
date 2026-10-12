// PRODUIRE LA PUB « ENQUÊTE » — la même chaîne que la première pub (../catastrophe/produire.cjs), sur ce dossier.
//
//   node trailer/enquete/produire.cjs            # fr puis en : voix déposée → chronologie → bande-son → image → montage
//   node trailer/enquete/produire.cjs en --flou 10
process.env.PUB = 'enquete';
require('../catastrophe/produire.cjs');
