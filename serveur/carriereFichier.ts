// Serveur de développement uniquement. Jamais importé par la fonction Vercel.
// Les écritures sont synchrones et remplacent atomiquement le fichier : aucun
// await entre la comparaison de version et le commit dans ce processus unique.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CompteStocke, LigueStockee, StockageCarriere } from './carriereStockage';

interface BaseLocale {
  comptes: CompteStocke[];
  sessions: Record<string, { compte: string; expiration: number }>;
  ligues: LigueStockee[];
  recus: Record<string, boolean>;
  debits: Record<string, { debut: number; nombre: number }>;
}
export function stockageFichier(fichier: string): StockageCarriere {
  mkdirSync(dirname(fichier), { recursive: true });
  const base: BaseLocale = existsSync(fichier) ? JSON.parse(readFileSync(fichier, 'utf8')) : {
    comptes: [], sessions: {}, ligues: [], recus: {}, debits: {},
  };
  const sauver = () => {
    writeFileSync(`${fichier}.tmp`, JSON.stringify(base), { mode: 0o600 });
    renameSync(`${fichier}.tmp`, fichier);
  };
  const copie = <T>(v: T): T => structuredClone(v);
  const cleRecu = (l: string, c: string, r: string) => JSON.stringify([l, c, r]);
  return {
    async compteParIdentifiant(i) { return copie(base.comptes.find(c => c.identifiant === i) ?? null); },
    async creerCompte(c) {
      if (base.comptes.some(x => x.identifiant === c.identifiant)) return false;
      base.comptes.push(copie(c)); sauver(); return true;
    },
    async session(e, maintenant) {
      const s = base.sessions[e];
      return copie(s && s.expiration > maintenant ? base.comptes.find(c => c.id === s.compte) ?? null : null);
    },
    async ouvrirSession(e, compte, expiration) { base.sessions[e] = { compte, expiration }; sauver(); },
    async fermerSession(e) { delete base.sessions[e]; sauver(); },
    async limiter(cle, maximum, fenetre, maintenant) {
      const debut = Math.floor(maintenant / fenetre) * fenetre;
      const ancien = base.debits[cle];
      base.debits[cle] = { debut, nombre: ancien?.debut === debut ? ancien.nombre + 1 : 1 };
      // Le quota est un frein opérationnel local ; les données du jeu sont persistées.
      return base.debits[cle].nombre <= maximum;
    },
    async ligues(compte) { return copie(base.ligues.filter(l => l.comptes.includes(compte))); },
    async ligue(id) { return copie(base.ligues.find(l => l.id === id) ?? null); },
    async ligueParCode(code) { return copie(base.ligues.find(l => l.code === code) ?? null); },
    async creerLigue(l) {
      if (base.ligues.some(x => x.id === l.id || x.code === l.code)) return false;
      base.ligues.push(copie(l)); sauver(); return true;
    },
    async dejaTraitee(l, c, r) { return Boolean(base.recus[cleRecu(l, c, r)]); },
    async comparerEtEcrire(l, version, compte, requete) {
      const index = base.ligues.findIndex(x => x.id === l.id);
      const cle = cleRecu(l.id, compte, requete);
      if (index < 0 || base.ligues[index].version !== version || base.recus[cle]) return false;
      base.ligues[index] = copie({ ...l, version: version + 1 });
      base.recus[cle] = true; sauver(); return true;
    },
    async actives() { return base.ligues.filter(l => l.etat.phase === 'saison').map(l => l.id); },
  };
}
