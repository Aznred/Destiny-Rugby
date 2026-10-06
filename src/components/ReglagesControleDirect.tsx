// LES RÉGLAGES DU CONTRÔLE DIRECT (Correctif 16) — la section « carrière joueur » du panneau des réglages.
//
// Tout y est une PRÉFÉRENCE D'APPAREIL (`lib/controleDirect/prefs.ts`, dans `localStorage`) : une disposition de touches ou
// une taille de joystick suit la machine, pas la sauvegarde. Comme le reste du panneau, rien ne se « valide » : un
// réglage s'applique à l'instant où on y touche.
//
// ⚠️ LES TOUCHES SE STOCKENT EN CODES PHYSIQUES (`KeyW`), PAS EN LETTRES. Le pavé ZQSD d'un AZERTY et le pavé WASD d'un
// QWERTY sont les mêmes touches : rien à configurer pour passer de l'un à l'autre. Ce qui s'affiche est la lettre gravée
// sur la touche (`libelleDeTouche`).
//
// ⚠️ ÉCHAP N'EST PAS RÉASSIGNABLE : il appartient à la fenêtre du match (pause en jeu, sortie sinon). Pendant qu'on écoute
// une touche, Échap ANNULE l'écoute — et ne ferme pas le panneau : l'écouteur le retient avant `useModalDialog`.

import { useEffect, useState } from 'react';
import { Icone } from './Icone';
import { t } from '../lib/i18n';
import {
  ecrirePreferencesControle, reinitialiserTouchesDirectes, usePreferencesControle,
} from '../lib/controleDirect/prefs';
import {
  DEFINITIONS_TOUCHES, copierTouches, libelleDeTouche, toucheRisquee, touchePermise, type ActionClavier,
} from '../lib/controleDirect/touches';
import { typeDeManette, type TypeManette } from '../lib/controleDirect/manette';
import './ReglagesControleDirect.css';

interface Retour { cle: string; vars?: Record<string, string>; ton: 'info' | 'alerte' }

/** La première manette que le navigateur voit : il ne la montre qu'après un appui sur l'un de ses boutons. */
function lireManette(): { nom: string; type: TypeManette } | null {
  try {
    for (const g of navigator.getGamepads?.() ?? []) {
      if (g && g.connected && g.buttons.length >= 8) {
        // « Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6) » → « Wireless Controller »
        return { nom: g.id.split(' (')[0].trim() || g.id, type: typeDeManette(g.id) };
      }
    }
  } catch {
    // Hors page sécurisée : pas de manette à montrer.
  }
  return null;
}

function useManetteDetectee(): { nom: string; type: TypeManette } | null {
  const [pad, setPad] = useState(lireManette);
  useEffect(() => {
    const maj = () => setPad(lireManette());
    window.addEventListener('gamepadconnected', maj);
    window.addEventListener('gamepaddisconnected', maj);
    const sonde = window.setInterval(maj, 1500);
    return () => {
      window.removeEventListener('gamepadconnected', maj);
      window.removeEventListener('gamepaddisconnected', maj);
      window.clearInterval(sonde);
    };
  }, []);
  return pad;
}

export function ReglagesControleDirect() {
  const prefs = usePreferencesControle();
  const manette = useManetteDetectee();
  const [ecoute, setEcoute] = useState<ActionClavier | null>(null);
  const [retour, setRetour] = useState<Retour | null>(null);

  // Une touche à réassigner : on l'écoute AVANT la fenêtre (capture sur `window`), pour qu'Échap annule l'écoute sans fermer le panneau.
  useEffect(() => {
    if (!ecoute) return;
    const surTouche = (ev: KeyboardEvent) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      if (ev.repeat) return;
      if (ev.code === 'Escape') { setEcoute(null); setRetour(null); return; }
      if (!touchePermise(ev.code)) { setRetour({ cle: 'cd.reg.reserve', ton: 'alerte' }); return; }
      const table = copierTouches(prefs.touches);
      let retiree: ActionClavier | null = null;
      for (const d of DEFINITIONS_TOUCHES) {
        if (d.id === ecoute || !table[d.id].includes(ev.code)) continue;
        const reste = table[d.id].filter((c) => c !== ev.code);
        // Une action ne reste jamais sans touche : on refuse plutôt que de la désarmer en silence.
        if (!reste.length) { setRetour({ cle: 'cd.reg.dernier', vars: { action: t(d.cle) }, ton: 'alerte' }); return; }
        table[d.id] = reste;
        retiree = d.id;
      }
      table[ecoute] = [ev.code];
      ecrirePreferencesControle({ touches: table });
      setEcoute(null);
      if (retiree) {
        const nom = DEFINITIONS_TOUCHES.find((d) => d.id === retiree)!.cle;
        setRetour({ cle: 'cd.reg.deja', vars: { touche: libelleDeTouche(ev.code), action: t(nom) }, ton: 'info' });
      } else if (toucheRisquee(ev.code)) setRetour({ cle: 'cd.reg.risque', ton: 'alerte' });
      else setRetour(null);
    };
    window.addEventListener('keydown', surTouche, true);
    return () => window.removeEventListener('keydown', surTouche, true);
  }, [ecoute, prefs.touches]);

  const commutateur = (cle: 'aidePlacement' | 'indications' | 'vibrations' | 'gaucher' | 'sprintAuBord' | 'souris' | 'aideTir' | 'conseilCapitaine', libelle: string, aide?: string) => (
    <div className="champ rcd-ligne">
      <label>
        <input type="checkbox" checked={prefs[cle]} onChange={(ev) => ecrirePreferencesControle({ [cle]: ev.target.checked })} />
        {libelle}
      </label>
      {aide && <p className="aide">{aide}</p>}
    </div>
  );

  return (
    <section className="rcd" aria-labelledby="rcd-titre">
      <h3 id="rcd-titre" className="rcd-titre"><Icone nom="manette" taille={18} /> {t('cd.reg.titre')}</h3>
      <p className="aide">{t('cd.reg.intro')}</p>

      <div className="champ">
        <label>{t('cd.reg.mode')}</label>
        <div className="choix-langue rcd-choix">
          {(['direct', 'cartes'] as const).map((m) => (
            <button
              key={m} type="button" className={prefs.mode === m ? 'actif' : ''} aria-pressed={prefs.mode === m}
              onClick={() => ecrirePreferencesControle({ mode: m })}
            >
              {t(m === 'direct' ? 'cd.reg.mode.direct' : 'cd.reg.mode.cartes')}
            </button>
          ))}
        </div>
        <p className="aide">{t('cd.reg.mode.aide')}</p>
      </div>

      {commutateur('aidePlacement', t('cd.reg.aide'), t('cd.reg.aide.aide'))}
      {commutateur('indications', t('cd.reg.indications'), t('cd.reg.indications.aide'))}
      {commutateur('vibrations', t('cd.reg.vibrations'), t('cd.reg.vibrations.aide'))}

      {/* ── Les responsabilités (Correctif 17) : capitaine, tir, engagement, touche ───────────────── */}
      <h4 className="rcd-sous-titre">{t('cd.reg.resp')}</h4>
      {commutateur('conseilCapitaine', t('cd.reg.conseil'), t('cd.reg.conseil.aide'))}
      {commutateur('aideTir', t('cd.reg.aideTir'), t('cd.reg.aideTir.aide'))}
      <div className="champ">
        <label>{t('cd.reg.tirManette')}</label>
        <div className="choix-langue rcd-choix">
          {(['direct', 'charge'] as const).map((m) => (
            <button
              key={m} type="button" className={prefs.tirManette === m ? 'actif' : ''} aria-pressed={prefs.tirManette === m}
              onClick={() => ecrirePreferencesControle({ tirManette: m })}
            >
              {t(m === 'direct' ? 'cd.reg.tirManette.direct' : 'cd.reg.tirManette.charge')}
            </button>
          ))}
        </div>
        <p className="aide">{t('cd.reg.tirManette.aide')}</p>
      </div>

      {/* ── Le pouce ───────────────────────────────────────────────────────────── */}
      <h4 className="rcd-sous-titre">{t('cd.reg.mobile')}</h4>
      <div className="champ rcd-curseur">
        <label htmlFor="rcd-taille">{t('cd.reg.taille')} <b>{Math.round(prefs.tailleHud * 100)} %</b></label>
        <input
          id="rcd-taille" type="range" min={75} max={150} step={5} value={Math.round(prefs.tailleHud * 100)}
          onChange={(ev) => ecrirePreferencesControle({ tailleHud: Number(ev.target.value) / 100 })}
        />
      </div>
      <div className="champ rcd-curseur">
        <label htmlFor="rcd-opacite">{t('cd.reg.opacite')} <b>{Math.round(prefs.opaciteHud * 100)} %</b></label>
        <input
          id="rcd-opacite" type="range" min={30} max={100} step={5} value={Math.round(prefs.opaciteHud * 100)}
          onChange={(ev) => ecrirePreferencesControle({ opaciteHud: Number(ev.target.value) / 100 })}
        />
      </div>
      {commutateur('gaucher', t('cd.reg.gaucher'), t('cd.reg.gaucher.aide'))}
      <div className="champ">
        <label>{t('cd.reg.joystick')}</label>
        <div className="choix-langue rcd-choix">
          {(['flottant', 'fixe'] as const).map((j) => (
            <button
              key={j} type="button" className={prefs.joystick === j ? 'actif' : ''} aria-pressed={prefs.joystick === j}
              onClick={() => ecrirePreferencesControle({ joystick: j })}
            >
              {t(j === 'flottant' ? 'cd.reg.joystick.flottant' : 'cd.reg.joystick.fixe')}
            </button>
          ))}
        </div>
      </div>
      {commutateur('sprintAuBord', t('cd.reg.sprintBord'))}

      {/* ── Le clavier et la souris ───────────────────────────────────────────── */}
      <h4 className="rcd-sous-titre">{t('cd.reg.pc')}</h4>
      {commutateur('souris', t('cd.reg.souris'), t('cd.reg.souris.aide'))}
      <div className="champ">
        <label>{t('cd.reg.touches')}</label>
        <p className="aide">{t('cd.reg.touches.aide')}</p>
        <ul className="rcd-touches">
          {DEFINITIONS_TOUCHES.map((d) => (
            <li key={d.id} data-ecoute={ecoute === d.id ? 'oui' : undefined}>
              <span className="rcd-action" title={t(d.aide)}>{t(d.cle)}</span>
              <span className="rcd-cles">
                {ecoute === d.id
                  ? <em>{t('cd.reg.appuie')}</em>
                  : [...new Set(prefs.touches[d.id].map(libelleDeTouche))].map((nom) => <kbd key={nom} className="rcd-touche">{nom}</kbd>)}
                {d.id === 'pause' && ecoute !== d.id && <kbd className="rcd-touche rcd-fixe">{libelleDeTouche('Escape')}</kbd>}
              </span>
              <button
                type="button" className="btn fantome mini"
                onClick={() => { setRetour(null); setEcoute(ecoute === d.id ? null : d.id); }}
              >
                {ecoute === d.id ? t('cd.reg.annuler') : t('cd.reg.modifier')}
              </button>
            </li>
          ))}
        </ul>
        {retour && <p className="rcd-retour" data-ton={retour.ton} role="status">{t(retour.cle, retour.vars)}</p>}
        <p className="aide">{t('cd.reg.echap')}</p>
        <button
          type="button" className="btn fantome mini"
          onClick={() => { setEcoute(null); setRetour(null); reinitialiserTouchesDirectes(); }}
        >
          {t('cd.reg.reinitialiser')}
        </button>
      </div>

      {/* ── La manette ────────────────────────────────────────────────────────── */}
      <h4 className="rcd-sous-titre">{t('cd.reg.manette')}</h4>
      <p className="rcd-manette" data-detectee={manette ? 'oui' : undefined}>
        <Icone nom="manette" taille={16} />
        {manette ? t('cd.reg.manette.detectee', { nom: manette.nom }) : t('cd.reg.manette.aucune')}
      </p>
      <p className="aide">{t('cd.reg.manette.aide')}</p>

      {/* ⚠️ « Rejouer le tutoriel » a quitté cette section : les Réglages ont désormais un bloc « Tutoriels » (Correctif 18) qui rejoue chaque guide. */}
    </section>
  );
}
