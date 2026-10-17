import {HEROES,storedHero,chooseHero} from './heroes.js';
const select=document.getElementById('soloHero');
for(const hero of HEROES){const option=document.createElement('option');option.value=hero.id;option.textContent=hero.name;select.append(option);}
select.value=storedHero();
select.addEventListener('change',()=>{chooseHero(select.value);window.dispatchEvent(new CustomEvent('stormwake:hero',{detail:select.value}));document.getElementById('heroChoiceNote').textContent='Champion appearance updated. Weapons, controls and saved progress are unchanged.';});
