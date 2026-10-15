// Retraits explicites : indépendant des catalogues générés et de leurs réimports.
const normaliser = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function personneRetiree(nom: unknown): boolean {
  if (typeof nom !== 'string') return false;
  const cle = normaliser(nom).split(' ').sort().join(' ');
  return cle === 'gauthier metais';
}
export function sourcePersonneRetiree(id: unknown): boolean {
  if (id === 191423) return true;
  return typeof id === 'string' && (['191423', 'ffr_191423', 'ffr-191423'].includes(id)
    || /^reel:/.test(id) && personneRetiree(id.slice(5)));
}
const nomDansTexte = /\b(?:Gauthier[\s_-]+M[eéè]tais|M[eéè]tais[\s_-]+Gauthier)\b/gi;
const photoRetiree = (v: string) => /(?:191423[_/]|gauthier[_-]metais)/i.test(v);
const references = /^(?:id|sourceId|carteId|joueurId|capitaineId|buteurId|viceCapitaineId|buteur2Id|engagementId|droppeurId|lanceurId|lanceur2Id|cartes|titulaires|remplacants|cartesDonnees|cartesDemandees)$/;
/** Anonymise les anciens récits et profils sans casser scores, contrats ou références.
 * Copie uniquement les branches modifiées ; ne touche pas aux objets de l'appelant. */
export function anonymiserPersonnesRetirees<T>(valeur: T): T {
  const nettoyer = (v: unknown, cle = ''): unknown => {
    if (typeof v === 'string') {
      if (references.test(cle)) return v;
      if (photoRetiree(v)) return undefined;
      return v.replace(nomDansTexte, 'Joueur retiré');
    }
    if (!v || typeof v !== 'object' || v instanceof Date) return v;
    if (Array.isArray(v)) {
      const suite = v.map(x => nettoyer(x, cle));
      return suite.some((x, i) => x !== v[i]) ? suite : v;
    }
    const objet = v as Record<string, unknown>;
    const retire = personneRetiree(objet.nom) || personneRetiree(objet.name)
      || sourcePersonneRetiree(objet.sourceId) || sourcePersonneRetiree(objet.ffrId);
    let copie: Record<string, unknown> | undefined;
    for (const [k, x] of Object.entries(objet)) {
      const suite = retire && /^(photo|portrait|image|avatar)$/.test(k) ? undefined : nettoyer(x, k);
      if (suite !== x) { copie ??= { ...objet }; copie[k] = suite; }
    }
    return copie ?? v;
  };
  return nettoyer(valeur) as T;
}
