import { CATALOGUE_ADMIN_VIDE, type CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
// Serveur de développement uniquement. Jamais importé par la fonction Vercel.
// Les écritures sont synchrones et remplacent atomiquement le fichier : aucun
// await entre la comparaison de version et le commit dans ce processus unique.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { pushLocal, type BasePush } from './pushStockage.js';
import { dirname } from 'node:path';
import type { CompteStocke, LigueStockee, StockageCarriere } from './carriereStockage.js';
import { echeanceLigue } from '../src/lib/ligue/echeanceCarriere.js';
import { vueCarriere } from '../src/lib/ligue/carriere.js';

interface BaseLocale {
  atelier?: CatalogueAdmin;
  push?: BasePush;
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
  base.push ??= { abonnements: [], envois: {} };
  // L'échéance ne vaut que pour ce processus : le serveur de développement
  // redémarre souvent, et une échéance perdue coûte une relecture, rien de plus.
  const echeances: Record<string, number> = {};
  const cleRecu = (l: string, c: string, r: string) => JSON.stringify([l, c, r]);
  return {
    atelier: {
      async lire() { return copie(base.atelier ?? CATALOGUE_ADMIN_VIDE); },
      async ecrire(configuration, revision) {
        if ((base.atelier?.revision ?? 0) !== revision) return false;
        base.atelier = copie(configuration); sauver(); return true;
      },
    },
    push: pushLocal(base.push, sauver),
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
    // Le serveur de développement rend le MÊME résumé que Neon : sans ça, un
    // champ manquant ne se verrait qu'en production.
    async ligues(compte) {
      return base.ligues.filter(l => l.comptes.includes(compte)).map(l => {
        const club = l.etat.clubs.find(c => c.compteId === compte);
        return {
          id: l.etat.id, nom: l.etat.nom, phase: l.etat.phase, logo: l.etat.logo,
          clubNom: club?.nom ?? '', ovas: club?.ovas ?? 0, clubEmbleme: club?.embleme,
        };
      });
    },
    async nombreLigues(compte) { return base.ligues.filter(l => l.comptes.includes(compte)).length; },
    async statistiquesGlobales() {
      const vues = base.ligues.flatMap(l => l.etat.clubs[0] ? [{ ligue: l.etat.nom, etat: l.etat, stats: vueCarriere(l.etat, l.etat.clubs[0].compteId).statistiques }] : []);
      const ouvreurs = vues.flatMap(v => v.stats.parClub.map(c => ({ pseudo: c.pseudo, packs: c.packs, ligue: v.ligue }))).sort((a, b) => b.packs - a.packs);
      const meilleurs = vues.flatMap(v => v.stats.meilleurPack ? [{ ...v.stats.meilleurPack, ligue: v.ligue }] : []).sort((a, b) => b.note - a.note);
      const achats = vues.flatMap(v => v.stats.plusGrosAchat ? [{ ...v.stats.plusGrosAchat, ligue: v.ligue }] : []).sort((a, b) => b.montant - a.montant);
      const transactions = base.ligues.flatMap(l => l.etat.transactions);
      return {
        ligues: base.ligues.length, comptes: base.comptes.length,
        clubs: base.ligues.reduce((n, l) => n + l.etat.clubs.length, 0),
        packsOuverts: transactions.filter(t => t.nature === 'pack').length,
        matchsJoues: base.ligues.reduce((n, l) => n + l.etat.rencontres.filter(m => m.resultat).length, 0),
        ovasDepensesPacks: transactions.filter(t => t.nature === 'pack' && t.ovas < 0).reduce((n, t) => n - t.ovas, 0),
        volumeMarche: base.ligues.flatMap(l => l.etat.ventes).filter(v => v.etat === 'vendue').reduce((n, v) => n + (v.type === 'enchere' ? v.enchere?.montant ?? v.prix : v.prix), 0),
        meilleurOuvreur: ouvreurs[0], meilleurPack: meilleurs[0], plusGrosAchat: achats[0],
      };
    },
    async ligue(id) {
      const l = base.ligues.find(x => x.id === id);
      return l ? { ...copie(l), echeance: echeances[id] ?? null } : null;
    },
    async entete(id) {
      const l = base.ligues.find(x => x.id === id);
      // La version de l'ÉTAT, comme Neon : c'est celle que l'écran connaît.
      return l ? { version: l.etat.version, comptes: [...l.comptes], echeance: echeances[id] ?? null } : null;
    },
    async rafraichirEcheance(id, echeance) { echeances[id] = echeance; },
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
      echeances[l.id] = echeanceLigue(l.etat, Date.now());
      base.recus[cle] = true; sauver(); return true;
    },
    async actives() { return base.ligues.filter(l => l.etat.phase === 'saison' && (echeances[l.id] ?? 0) <= Date.now()).map(l => l.id); },
  };
}
