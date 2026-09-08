# Les portraits que le détourage automatique refuse

**68 fichiers**, extraits le 2026-09-08.

Ils ne se réparent pas en remontant un seuil : `detourerPhotos.cjs` sépare le
joueur du mur par la COULEUR. Quand les deux partagent la même — un lettrage
blanc sur fond blanc — la propagation traverse le joueur et le vide. Quand le
fond n'en est pas un — un drapeau tenu à bout de bras — il n'y a rien à
retirer. Le script refuse, et il a raison : un portrait refusé garde son fond
et se corrige plus tard, un portrait troué est écrit sur le disque.

## Comment les rendre

Détoure-les à la main (ou avec un outil de segmentation), **garde exactement
le même nom de fichier et le même sous-dossier**, puis :

```bash
node scripts/photosNonDetourees.cjs --retour
```

Le script ne reprend que les fichiers **réellement détourés** (coins du HAUT
transparents) : un fichier non retouché est ignoré, pas recopié pour rien.

⚠️ `maj/` et `new maj/` contiennent les MÊMES joueurs. `lib/avatars.ts` lit
`new maj` en premier — c'est celui-là qui s'affiche sur la carte — mais
`maj` sert de repli pour les noms absents de l'autre. Détoure les deux.

## Inventaire

- **public/photos** — 4 sur 1407 :
  - `boris_goutard.webp`
  - `charles_henri_berguet.webp`
  - `gabriel_ngandebe.webp`
  - `leo_chauvin.webp`
- **public/photos/maj** — 6 sur 934 :
  - `urc_dan_sheehan.webp`
  - `urc_eddie_swart.webp`
  - `urc_jamison_gibson_park.webp`
  - `urc_joe_mccarthy.webp`
  - `urc_rieko_ioane.webp`
  - `urc_thomas_clarkson.webp`
- **public/photos/new maj** — 6 sur 1147 :
  - `urc_dan_sheehan.webp`
  - `urc_eddie_swart.webp`
  - `urc_jamison_gibson_park.webp`
  - `urc_joe_mccarthy.webp`
  - `urc_rieko_ioane.webp`
  - `urc_thomas_clarkson.webp`
- **public/photos/monde** — 52 sur 1836 :
  - `jpn_david_van_zeeland.webp`
  - `jpn_keijiro_tamefusa.webp`
  - `jpn_mifiposeti_paea.webp`
  - `jpn_riku_tomita.webp`
  - `srp_angus_scott_young.webp`
  - `srp_antonio_shalfoon.webp`
  - `srp_apolosi_ranawai.webp`
  - `srp_archie_saunders.webp`
  - `srp_austin_durbidge.webp`
  - `srp_codie_taylor.webp`
  - `srp_cooper_grant.webp`
  - `srp_cooper_roberts.webp`
  - `srp_corey_kellow.webp`
  - `srp_dallas_mc_leod.webp`
  - `srp_daniel_botha.webp`
  - `srp_david_havili.webp`
  - `srp_eamon_doyle.webp`
  - `srp_ethan_dobbins.webp`
  - `srp_fletcher_newell.webp`
  - `srp_folau_fainga_a.webp`
  - `srp_george_poolman.webp`
  - `srp_harry_potter.webp`
  - `srp_jack_sexton.webp`
  - `srp_jae_broomfield.webp`
  - `srp_james_white.webp`
  - `srp_johnny_lee.webp`
  - `srp_johnny_mc_nicholl.webp`
  - `srp_kershawl_sykes_martin.webp`
  - `srp_kurtis_mac_donald.webp`
  - `srp_kyle_preston.webp`
  - `srp_lachlan_hooper.webp`
  - `srp_liam_jack.webp`
  - `srp_luke_aiken.webp`
  - `srp_macca_springer.webp`
  - `srp_matt_philip.webp`
  - `srp_miles_amatosero.webp`
  - `srp_mitchell_drummond.webp`
  - `srp_nathan_hastie.webp`
  - `srp_nick_champion_de_crespigny.webp`
  - `srp_nic_dolly.webp`
  - `srp_noah_hotham.webp`
  - `srp_rivez_reihana.webp`
  - `srp_ronan_leahy.webp`
  - `srp_seb_calder.webp`
  - `srp_sef_fa_agase.webp`
  - `srp_taha_kemara.webp`
  - `srp_teddy_wilson.webp`
  - `srp_toby_bell.webp`
  - `srp_tomasi_maka.webp`
  - `srp_tom_robertson.webp`
  - `srp_will_harris.webp`
  - `srp_will_jordan.webp`
