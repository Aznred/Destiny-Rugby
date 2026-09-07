import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {PHOTOS_NEW_MAJ, JOUEURS_NEW_MAJ} from '../src/data/photosNewMaj';
import {photoReelle} from '../src/lib/avatars';
import {catalogueMondialCarriere} from '../src/lib/ligue/catalogueCarriere';
for (const url of Object.values(PHOTOS_NEW_MAJ)) assert.ok(existsSync('public'+decodeURIComponent(url)),url);
assert.ok(photoReelle('Adam Radwan')?.includes('removebg'));
assert.equal(photoReelle('George Ford'),PHOTOS_NEW_MAJ['george ford']);
const catalogue=catalogueMondialCarriere();
const normaliser=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
let clubs=0,photos=0;
for(const c of catalogue){const k=normaliser(c.nom);if(JOUEURS_NEW_MAJ[k]){assert.equal(c.clubReel,JOUEURS_NEW_MAJ[k].club);clubs++;}if(PHOTOS_NEW_MAJ[k]){assert.equal(photoReelle(c.nom),PHOTOS_NEW_MAJ[k]);photos++;}}
console.log(JSON.stringify({liensVerifies:Object.keys(PHOTOS_NEW_MAJ).length,clubsActualises:clubs,photosAssocieesAuCatalogue:photos}));
