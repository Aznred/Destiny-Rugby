// L'isolement de l'arrière-plan se COMPTE : deux modales fermées dans le désordre ne laissent rien d'inerte.
// (Le blocage « plus rien ne répond » après un match : #root restait `inert` quand la fenêtre du match se fermait avant la carte posée dessus.)
import { isoler, rendre } from '../src/lib/useModalDialog';

let faux = 0, total = 0;
const ok = (c: boolean, m: string) => { total++; if (!c) { faux++; console.log('✗', m); } };
const faux_element = () => {
  const attrs = new Map<string, string>();
  return { inert: false, setAttribute: (k: string, v: string) => attrs.set(k, v), getAttribute: (k: string) => attrs.get(k) ?? null, removeAttribute: (k: string) => attrs.delete(k), attrs } as unknown as HTMLElement & { attrs: Map<string, string> };
};

// Ordre « pile » : A ouvre, B ouvre, B ferme, A ferme.
{ const racine = faux_element(); isoler(racine); isoler(racine); rendre(racine); ok(racine.inert, 'B fermée, A tient encore'); rendre(racine); ok(!racine.inert && !racine.attrs.has('aria-hidden'), 'pile : tout est rendu'); }
// Ordre inverse : A ouvre, B ouvre, A ferme (la fenêtre du match), B ferme (la carte) — c'était le blocage.
{ const racine = faux_element(); isoler(racine); isoler(racine); rendre(racine); ok(racine.inert, 'A fermée, B tient encore'); rendre(racine); ok(!racine.inert && !racine.attrs.has('aria-hidden'), 'désordre : #root est rendu, rien ne reste inerte'); }
// Un élément déjà inerte à l'origine le redevient.
{ const e = faux_element(); e.inert = true; isoler(e); rendre(e); ok(e.inert, 'un élément inerte au départ le reste'); }
// Trois modales, ordre quelconque.
{ const e = faux_element(); isoler(e); isoler(e); isoler(e); rendre(e); rendre(e); ok(e.inert, 'encore une prise'); rendre(e); ok(!e.inert, 'trois prises rendues'); rendre(e); ok(!e.inert, 'un rendu de trop ne casse rien'); }
console.log(faux ? `${faux} échec(s) sur ${total}` : `OK — ${total} contrôles`);
process.exit(faux ? 1 : 0);
