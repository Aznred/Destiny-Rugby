import type { CarteCarriere } from './typesCarriere.js';
const key=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const countries:Record<string,string>={france:'FR',angleterre:'GB-ENG','nouvelle zelande':'NZ',irlande:'IE',ecosse:'GB-SCT','pays de galles':'GB-WLS',galles:'GB-WLS',australie:'AU',argentine:'AR','afrique du sud':'ZA',italie:'IT',fidji:'FJ',samoa:'WS',tonga:'TO',japon:'JP'};
export const clubCollectif=(c:Pick<CarteCarriere,'clubReel'|'clubId'>)=>c.clubId??(c.clubReel?`club:${key(c.clubReel)}`:undefined);
export const nationCollectif=(c:Pick<CarteCarriere,'nation'|'countryId'>)=>c.countryId??(c.nation?countries[key(c.nation)]??key(c.nation):undefined);
export function calculateChemistry(a:CarteCarriere,b:CarteCarriere){
  return {sameClub:!!clubCollectif(a)&&clubCollectif(a)===clubCollectif(b),sameNation:!!nationCollectif(a)&&nationCollectif(a)===nationCollectif(b),
    eventLinks:!!a.speciale?.evenement&&a.speciale.evenement===b.speciale?.evenement,specialLinks:Math.max(a.speciale?.collectif??0,b.speciale?.collectif??0)};
}
