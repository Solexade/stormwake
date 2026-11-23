import {voyageRank} from './voyage-data.js';
import {SOLO_HEROES,storedSoloHero,chooseSoloHero} from './heroes.js';
const select=document.getElementById('soloHero');
for(const hero of SOLO_HEROES){const option=document.createElement('option');option.value=hero.id;option.textContent=hero.name;select.append(option);}
select.value=storedSoloHero();
for(const hero of SOLO_HEROES.filter(h=>h.unlock))select.querySelector('option[value="'+hero.id+'"]').disabled=true;
document.addEventListener('stormwake:profile',e=>{const rank=voyageRank(e.detail.gear);for(const hero of SOLO_HEROES.filter(h=>h.unlock)){const option=select.querySelector('option[value="'+hero.id+'"]');option.disabled=rank.xp<hero.unlock;option.textContent=hero.name+(option.disabled?' · '+hero.unlock+' XP':' · unlocked');}document.getElementById('heroChoiceNote').textContent=rank.name+' · '+rank.xp+' legacy voyage XP. Existing cosmetic unlocks are preserved. Survival bests save separately; discover weapons in caches.';if(select.selectedOptions[0]?.disabled){select.value='azure';chooseSoloHero('azure');window.dispatchEvent(new CustomEvent('stormwake:hero',{detail:'azure'}));}});
select.addEventListener('change',()=>{chooseSoloHero(select.value);window.dispatchEvent(new CustomEvent('stormwake:hero',{detail:select.value}));document.getElementById('heroChoiceNote').textContent='Champion appearance selected.';});
