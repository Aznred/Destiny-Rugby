import { CATALOGUE_ADMIN_VIDE, type CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
// Serveur de développement uniquement. Jamais importé par la fonction Vercel.
// Les écritures sont synchrones et remplacent atomiquement le fichier : aucun
// await entre la comparaison de version et le commit dans ce processus unique.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { pushLocal, type BasePush } from './pushStockage.js';
import { dirname } from 'node:path';
import type { CompteStocke, LigueStockee, StockageCarriere } from './carriereStockage.js';
import { echeanceLigue, prochaineEcheanceMatch } from '../src/lib/ligue/echeanceCarriere.js';
import { vueCarriere } from '../src/lib/ligue/carriere.js';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte.js';

interface BaseLocale {
  achatsStripe?: Record<string, string>;
  atelier?: CatalogueAdmin;
  push?: BasePush;
  comptes: CompteStocke[];
  sessions: Record<string, { compte: string; expiration: number }>;
  ligues: LigueStockee[];
  recus: Record<string, boolean>;
  debits: Record<string, { debut: number; nombre: number }>;
  boutiques?: Record<string, EtatBoutiqueCompte>;
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
  base.boutiques ??= {};
  base.achatsStripe ??= {};
  // L'échéance ne vaut que pour ce processus : le serveur de développement
  // redémarre souvent, et une échéance perdue coûte une relecture, rien de plus.
  const echeances: Record<string, number> = {};
  const reveilsMatch: Record<string, number | null> = {};
  const presences = new Map<string, { match: string; compte: string; vu: number }>();
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
    async compteParGoogle(sujet) { return copie(base.comptes.find(c => c.fournisseur === 'google' && c.sujetExterne === sujet) ?? null); },
    async lierCompteGoogle(id, sujet, courriel) {
      if (base.comptes.some(c => c.sujetExterne === sujet || c.courriel === courriel)) return false;
      const compte = base.comptes.find(c => c.id === id); if (!compte || compte.sujetExterne) return false;
      compte.fournisseur = 'google'; compte.sujetExterne = sujet; compte.courriel = courriel; sauver(); return true;
    },
    async creerCompte(c) {
      if (base.comptes.some(x => x.identifiant === c.identifiant || (c.sujetExterne && x.sujetExterne === c.sujetExterne) || (c.courriel && x.courriel === c.courriel))) return false;
      const maintenant = new Date().toISOString();
      base.comptes.push({ ...copie(c), creeLe: maintenant, vuLe: maintenant }); sauver(); return true;
    },
    async session(e, maintenant) {
      const s = base.sessions[e];
      const compte = s && s.expiration > maintenant ? base.comptes.find(c => c.id === s.compte) ?? null : null;
      if (compte) { compte.vuLe = new Date(maintenant).toISOString(); sauver(); }
      return copie(compte);
    },
    async ouvrirSession(e, compte, expiration) {
      base.sessions[e] = { compte, expiration };
      const cible = base.comptes.find(c => c.id === compte);
      if (cible) cible.vuLe = new Date().toISOString();
      sauver();
    },
    async fermerSession(e) { delete base.sessions[e]; sauver(); },
    async achatCredite(session, compte) { return base.achatsStripe![session] === compte; },
    async crediterAchat(session, compte, ovas) {
      if (base.achatsStripe![session]) return;
      const boutique = base.boutiques![compte];
      if (!boutique) throw new Error('Boutique introuvable.');
      boutique.ovas += ovas; boutique.achatsOvas = (boutique.achatsOvas ?? 0) + ovas;
      base.achatsStripe![session] = compte; sauver();
    },
    async boutique(compte) { return base.boutiques?.[compte] ? copie(base.boutiques[compte]) : null; },
    async sauvegarderBoutique(compte, boutique) { const acquis = base.boutiques![compte]?.achatsOvas ?? 0;
      base.boutiques![compte] = { ...copie(boutique), achatsOvas: acquis, ovas: boutique.ovas + Math.max(0, acquis - (boutique.achatsOvas ?? 0)) }; sauver(); },
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
          laboratoire: l.etat.laboratoire === true,
          createurId: l.etat.createurId,
        };
      });
    },
    async nombreLigues(compte) { return base.ligues.filter(l => l.comptes.includes(compte) && !l.etat.laboratoire).length; },
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
    async administration() {
      const limite = 500;
      return {
        comptes: base.comptes.slice(-limite).reverse().map(c => ({
          id: c.id, pseudo: c.pseudo, creeLe: c.creeLe, vuLe: c.vuLe,
          ligues: base.ligues.filter(l => l.comptes.includes(c.id)).length,
        })),
        ligues: base.ligues.slice(-limite).reverse().map(l => ({
          id: l.id, code: l.code, nom: l.etat.nom, phase: l.etat.phase, saison: l.etat.saison,
          clubs: l.etat.clubs.length,
          createur: base.comptes.find(c => c.id === l.etat.createurId)?.pseudo ?? 'Compte supprime',
        })),
        limite, comptesTronques: base.comptes.length > limite, liguesTronquees: base.ligues.length > limite,
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
    async supprimerLigue(id, createur) {
      const index = base.ligues.findIndex(l => l.id === id && l.etat.createurId === createur);
      if (index < 0) return false;
      base.ligues.splice(index, 1);
      for (const cle of Object.keys(base.recus)) if (JSON.parse(cle)[0] === id) delete base.recus[cle];
      sauver(); return true;
    },
    async supprimerLiguesInactives(avant) {
      const ids = base.ligues.filter(l => !l.etat.laboratoire && l.comptes.every(id => {
        const vu = Date.parse(base.comptes.find(c => c.id === id)?.vuLe ?? '');
        return !Number.isFinite(vu) || vu < avant;
      })).map(l => l.id);
      if (!ids.length) return [];
      base.ligues = base.ligues.filter(l => !ids.includes(l.id));
      for (const cle of Object.keys(base.recus)) if (ids.includes(JSON.parse(cle)[0])) delete base.recus[cle];
      sauver(); return ids;
    },
    async dejaTraitee(l, c, r) { return Boolean(base.recus[cleRecu(l, c, r)]); },
    async comparerEtEcrire(l, version, recu) {
      const index = base.ligues.findIndex(x => x.id === l.id);
      const cle = recu ? cleRecu(l.id, recu.compte, recu.requete) : '';
      if (index < 0 || base.ligues[index].version !== version || (recu && base.recus[cle])) return false;
      base.ligues[index] = copie({ ...l, version: version + 1 });
      echeances[l.id] = echeanceLigue(l.etat, Date.now());
      reveilsMatch[l.id] = prochaineEcheanceMatch(l.etat, Date.now());
      if (recu) base.recus[cle] = true;
      sauver(); return true;
    },
    async marquerPresence(ligue, match, compte, maintenant) {
      presences.set(JSON.stringify([ligue, match, compte]), { match, compte, vu: maintenant });
      return true;
    },
    async presencesActives(ligue, depuis) {
      return [...presences.entries()].flatMap(([cle, p]) => {
        if (p.vu < depuis) { presences.delete(cle); return []; }
        return JSON.parse(cle)[0] === ligue ? [copie(p)] : [];
      });
    },
    async nettoyerPresences(avant) {
      for (const [cle, p] of presences) if (p.vu < avant) presences.delete(cle);
      for (const [cle, s] of Object.entries(base.sessions)) if (s.expiration < Date.now()) delete base.sessions[cle];
      for (const [cle, d] of Object.entries(base.debits)) if (d.debut < avant) delete base.debits[cle];
    },
    async actives() {
      const maintenant = Date.now();
      return base.ligues.filter(l => {
        const reveil = reveilsMatch[l.id] ?? prochaineEcheanceMatch(l.etat, maintenant);
        const lancement = l.etat.phase === 'salon' ? Date.parse(l.etat.creeLe) + 2 * 24 * 60 * 60_000 : Infinity;
        return (reveil !== null && reveil <= maintenant) || lancement <= maintenant;
      }).map(l => l.id);
    },
  };
}
