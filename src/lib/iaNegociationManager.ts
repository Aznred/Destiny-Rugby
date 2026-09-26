import { appelIAJSON } from './groq';

export interface ContexteNegociationIA {
  role: 'joueur' | 'club';
  nom: string;
  sujet: string;
  proposition: string;
  verdict: 'ouverte' | 'accord' | 'rompue' | 'signee';
  messageManager: string;
  historique: string[];
}

/** Le modèle incarne l'interlocuteur ; les règles de transfert gardent le verdict. */
export async function reponseNegociationManagerIA(contexte: ContexteNegociationIA): Promise<string> {
  const { role, nom, sujet, proposition, verdict, messageManager, historique } = contexte;
  const brut = await appelIAJSON([
    { role: 'system', content: `Tu incarnes ${role === 'club' ? 'la direction du club' : 'le joueur et son agent'} ${nom} dans une négociation de rugby. Réponds en français, à la première personne, en deux phrases courtes. Sois crédible, humain et précis. Le moteur du jeu a déjà fixé le verdict : ${verdict}. Tu ne peux ni le modifier ni promettre une signature si le verdict est ouverte ou rompue. Tu ne changes aucun montant, aucune clause ni la patience. Ne révèle jamais de seuil caché. Format JSON exact : {"reponse":"..."}.` },
    { role: 'user', content: `Sujet : ${sujet}\nOffre actuelle : ${proposition}\nDerniers échanges : ${historique.slice(-4).join(' | ')}\nMessage du manager : ${messageManager}\nRéponds en tant que ${nom}.` },
  ], { temperature: .75, maxTokens: 140, timeout: 6500 });
  const debut = brut.indexOf('{');
  const fin = brut.lastIndexOf('}');
  const objet = JSON.parse(debut >= 0 && fin > debut ? brut.slice(debut, fin + 1) : brut) as { reponse?: unknown };
  return typeof objet.reponse === 'string' ? objet.reponse.trim().replace(/\s+/g, ' ').slice(0, 320) : '';
}
