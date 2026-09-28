import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/actor.js';
import { CombatSystem } from '../src/combat.js';

const effects={sound(){},burst(){}};
function duel({distance=1.35,direction='left',weapon='longsword',blocking=false,parry=false}={}){
  const scene=new THREE.Scene();
  const player=new Character(scene,{name:'Player',position:[0,0,0]}),enemy=new Character(scene,{name:'Enemy',position:[0,0,-distance]});
  enemy.root.rotation.y=Math.PI;player.equip(weapon);const events=[];const combat=new CombatSystem(effects,event=>events.push(event));
  combat.time=1;combat.setBlock(enemy,blocking);if(blocking&&!parry)enemy.blockStarted=-1;
  combat.startAttack(player,direction);
  for(let step=0;step<120;step++){
    combat.time+=1/60;combat.tick(player,1/60);combat.tick(enemy,1/60);
    player.animate(1/60,step/60);enemy.animate(1/60,step/60);
    if(parry&&player.attack&&player.attack.time/player.attack.duration>.25)enemy.blockStarted=combat.time;
    combat.resolve(player,[enemy],1/60);
  }
  return {player,enemy,events};
}
test('Animated left and right weapon swings produce one anatomical hit',()=>{
  for(const direction of ['left','right']){const {events}=duel({direction});assert.equal(events.filter(e=>e.type==='hit').length,1,direction);assert.ok(events[0].result.bodyPart);}
});
test('Animated low strike actually collides with a leg',()=>{
  const {events}=duel({direction:'low'});assert.equal(events[0]?.type,'hit');assert.match(events[0].result.bodyPart,/Leg|Foot|Thigh/);
});
test('Thrust and overhead collide through their animated blade paths',()=>{
  for(const direction of ['thrust','overhead']){const {events}=duel({direction});assert.equal(events[0]?.type,'hit',direction);}
});
test('Out of reach swings cause no injuries',()=>{const {events,enemy}=duel({distance:4});assert.equal(events.length,0);assert.equal(enemy.anatomy.condition,100);});
test('Held guard stops damage and consumes guard',()=>{const {events,enemy}=duel({blocking:true});assert.equal(events[0]?.type,'block');assert.equal(enemy.anatomy.condition,100);assert.ok(enemy.guard<100);});
test('Timed guard parries a real blade contact',()=>{const {events,enemy}=duel({blocking:true,parry:true});assert.equal(events[0]?.type,'parry');assert.equal(enemy.anatomy.condition,100);});
test('Spear connects at a distance at which the dagger misses',()=>{const spear=duel({weapon:'spear',direction:'thrust',distance:2.1}),dagger=duel({weapon:'dagger',direction:'thrust',distance:2.1});assert.ok(spear.events.some(e=>e.type==='hit'));assert.equal(dagger.events.length,0);});
