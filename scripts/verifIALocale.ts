import {
  ModelType,
  postInitAndCheckFieldsChatCompletion,
} from '@mlc-ai/web-llm';
import {
  MODELE_DEFAUT,
  detailErreurIALocale,
  messageErreurIALocale,
  normaliserMessagesIA,
  type MessageIA,
} from '../src/lib/iaLocale';
import { TEXTES } from '../src/data/textes';
import { chargerTextes } from '../src/lib/i18n';

chargerTextes(TEXTES);

let echecs = 0;

function verifier(libelle: string, condition: boolean): void {
  console.log(`${condition ? '✅' : '❌'} ${libelle}`);
  if (!condition) echecs += 1;
}

const messages: MessageIA[] = [
  { role: 'system', content: 'Règles du jeu' },
  { role: 'system', content: 'Fiche du joueur' },
  { role: 'user', content: 'Je m’entraîne.' },
  { role: 'assistant', content: '{"recit":"Bien."}' },
  { role: 'system', content: 'Contexte de la scène' },
  { role: 'user', content: 'Je continue.' },
];
const normalises = normaliserMessagesIA(messages);

verifier('un seul message système subsiste', normalises.filter((m) => m.role === 'system').length === 1);
verifier('le message système reste en première position', normalises[0]?.role === 'system');
verifier('tous les contextes système sont conservés',
  ['Règles du jeu', 'Fiche du joueur', 'Contexte de la scène']
    .every((texte) => normalises[0]?.content.includes(texte)));

let accepteParWebLLM = true;
try {
  postInitAndCheckFieldsChatCompletion(
    { messages: normalises },
    MODELE_DEFAUT,
    ModelType.LLM,
  );
} catch {
  accepteParWebLLM = false;
}
verifier('WebLLM accepte l’ordre normalisé', accepteParWebLLM);

verifier('une erreur texte du Worker est conservée',
  detailErreurIALocale('SystemMessageOrderError: test') === 'SystemMessageOrderError: test');
verifier('une erreur sérialisée est lisible',
  detailErreurIALocale({ message: 'GPU device lost' }) === 'GPU device lost');
verifier('une erreur déjà expliquée n’est pas emballée deux fois',
  messageErreurIALocale(new Error('L’IA locale n’a pas pu répondre : test'))
    === 'L’IA locale n’a pas pu répondre : test');

if (echecs) process.exitCode = 1;
