// LA RÉPONSE COMPACTE D'UNE COMMANDE (Correctif 25, points 43 à 46)
//
// Demande : « Entre client et serveur, envoyer uniquement ce qui change. Par exemple : +1 card, −2500 credits — et non
// l'intégralité de l'inventaire à chaque action. »
//
// ═══ CE QUI SE PASSAIT ══════════════════════════════════════════════════════
//
// Chaque commande d'une ligue (ouvrir un pack, vendre, composer, enchérir…) répondait par la VUE ENTIÈRE de la ligue :
// tous les clubs, toutes les cartes, tout le calendrier. Seize clubs, c'est 300 à 400 Ko pour apprendre qu'on a gagné
// trois cartes et perdu 2 500 Ovas — et c'est ce poids-là qu'on attend entre le clic et l'animation.
//
// ═══ CE QUE FAIT CE MODULE ══════════════════════════════════════════════════
//
// Le serveur compare la vue d'AVANT la commande à celle d'APRÈS et n'envoie que la différence ; l'écran l'applique à la
// vue qu'il tient déjà. La comparaison est générique — elle ne connaît aucune commande :
//
//   · une liste d'objets identifiés (`cartes`, `clubs`, `ventes`, `transactions`…) : les éléments nouveaux ou modifiés,
//     les identifiants retirés, et l'ordre seulement s'il a changé autrement que par un ajout en fin de liste ;
//   · tout autre champ : sa nouvelle valeur s'il a changé.
//
// ⚠️ UN DELTA NE VAUT QUE POUR SA VERSION DE DÉPART (`de`). L'écran qui tient une autre version redemande la vue
// entière : appliquer une différence sur la mauvaise base donnerait une ligue qui n'existe nulle part.
// ⚠️ L'ÉCRAN D'AVANT NE DEMANDE RIEN ET REÇOIT TOUT, COMME AVANT : c'est lui qui annonce qu'il sait lire un delta.
import type { VueCarriereEnLigne } from './typesCarriere.js';

interface DeltaListe {
  /** Éléments nouveaux ou modifiés (l'élément entier : ils sont petits, et l'écran n'a rien à recoller). */
  maj?: unknown[];
  retraits?: string[];
  /** L'ordre complet des identifiants, seulement s'il ne se déduit pas (anciens dans leur ordre, nouveaux à la fin). */
  ordre?: string[];
}
export interface DeltaVue {
  /** La version de la vue sur laquelle ce delta s'applique, et celle qu'il produit. */
  de: number;
  vers: number;
  champs?: Record<string, unknown>;
  retires?: string[];
  listes?: Record<string, DeltaListe>;
}
/** Ce que le serveur répond à une commande d'un écran qui sait lire un delta. */
export interface ReponseDelta { delta: DeltaVue }

type Identifie = { id: string };
const listeIdentifiee = (v: unknown): v is Identifie[] => {
  if (!Array.isArray(v)) return false;
  const vus = new Set<string>();
  for (const x of v) {
    if (!x || typeof x !== 'object' || typeof (x as Identifie).id !== 'string' || vus.has((x as Identifie).id)) return false;
    vus.add((x as Identifie).id);
  }
  return true;
};

/** La différence entre deux vues de la MÊME ligue pour le MÊME club. */
export function differenceVue(avant: VueCarriereEnLigne, apres: VueCarriereEnLigne): DeltaVue {
  const delta: DeltaVue = { de: avant.version, vers: apres.version };
  const a = avant as unknown as Record<string, unknown>, b = apres as unknown as Record<string, unknown>;
  for (const cle of Object.keys(b)) {
    const x = a[cle], y = b[cle];
    if (y === undefined) continue;
    if (listeIdentifiee(x) && listeIdentifiee(y) && x.length > 0) {
      const anciens = new Map(x.map((e) => [e.id, JSON.stringify(e)]));
      const maj: unknown[] = [], presents = new Set<string>();
      for (const e of y) {
        presents.add(e.id);
        if (anciens.get(e.id) !== JSON.stringify(e)) maj.push(e);
      }
      const retraits = x.filter((e) => !presents.has(e.id)).map((e) => e.id);
      // L'ordre attendu sans rien dire : les anciens restés, dans leur ordre, puis les nouveaux dans celui d'arrivée.
      const attendu = [...x.filter((e) => presents.has(e.id)).map((e) => e.id), ...y.filter((e) => !anciens.has(e.id)).map((e) => e.id)];
      const ordre = attendu.some((id, i) => id !== y[i].id) ? y.map((e) => e.id) : undefined;
      if (maj.length || retraits.length || ordre) {
        (delta.listes ??= {})[cle] = { ...(maj.length ? { maj } : {}), ...(retraits.length ? { retraits } : {}), ...(ordre ? { ordre } : {}) };
      }
    } else if (JSON.stringify(x) !== JSON.stringify(y)) (delta.champs ??= {})[cle] = y;
  }
  const retires = Object.keys(a).filter((cle) => a[cle] !== undefined && b[cle] === undefined);
  if (retires.length) delta.retires = retires;
  return delta;
}

/** Applique un delta à la vue tenue. `null` : ce delta ne part pas de cette vue — il faut redemander la vue entière. */
export function appliquerDeltaVue(vue: VueCarriereEnLigne | null, delta: DeltaVue): VueCarriereEnLigne | null {
  if (!vue || vue.version !== delta.de) return null;
  const suivante = { ...vue } as unknown as Record<string, unknown>;
  for (const cle of delta.retires ?? []) delete suivante[cle];
  for (const [cle, valeur] of Object.entries(delta.champs ?? {})) suivante[cle] = valeur;
  for (const [cle, d] of Object.entries(delta.listes ?? {})) {
    const actuelle = (suivante[cle] as Identifie[] | undefined) ?? [];
    const maj = new Map((d.maj as Identifie[] | undefined ?? []).map((e) => [e.id, e]));
    const retraits = new Set(d.retraits ?? []);
    const connus = new Set(actuelle.map((e) => e.id));
    let liste = [...actuelle.filter((e) => !retraits.has(e.id)).map((e) => maj.get(e.id) ?? e), ...[...maj.values()].filter((e) => !connus.has(e.id))];
    if (d.ordre) {
      const parId = new Map(liste.map((e) => [e.id, e]));
      // Un identifiant de l'ordre qu'on ne tient pas : la vue de départ n'était pas la bonne.
      if (d.ordre.some((id) => !parId.has(id))) return null;
      liste = d.ordre.map((id) => parId.get(id)!);
    }
    suivante[cle] = liste;
  }
  suivante.version = delta.vers;
  return suivante as unknown as VueCarriereEnLigne;
}

export const estReponseDelta = (r: unknown): r is ReponseDelta => Boolean(r && typeof r === 'object' && 'delta' in (r as object));
