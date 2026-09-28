import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/actor.js';
import { CombatSystem } from '../src/combat.js';
import { AnatomySystem } from '../src/anatomy.js';
import { DEFAULT_CONTROLS, WEAPONS } from '../src/config.js';

function setup(direction='left',weapon='longsword'){
  const scene=new THREE.Scene(),events=[],sounds=[],bursts=[];
  const player=new Character(scene,{name:'Player',player:true}),enemy=new Character(scene,{name:'Opponent',position:[0,0,-1.35]});
  enemy.root.rotation.y=Math.PI;player.equip(weapon);
  const combat=new CombatSystem({sound:(...args)=>sounds.push(args),burst:(...args)=>bursts.push(args)},e=>events.push(e));
  const step=()=>{combat.time+=1/60;for(const a of [player,enemy]){combat.tick(a,1/60);a.animate(1/60,combat.time);}combat.resolve(player,[enemy],1/60);};
  const contact=()=>{for(let i=0;i<120&&!events.length;i++)step();};
  combat.startAttack(player,direction);
  return {player,enemy,combat,events,sounds,bursts,step,contact};
}

test('Attack, movement and utility bindings have no conflicts',()=>{
  assert.equal(new Set(Object.values(DEFAULT_CONTROLS)).size,Object.keys(DEFAULT_CONTROLS).length);
  assert.equal(DEFAULT_CONTROLS.leftSlash,'KeyQ');assert.equal(DEFAULT_CONTROLS.rightSlash,'KeyE');
  assert.equal(DEFAULT_CONTROLS.overhead,'KeyR');assert.equal(DEFAULT_CONTROLS.low,'KeyF');
  assert.equal(DEFAULT_CONTROLS.freeLook,undefined);
});

test('Both fighters remain unarmored after reset with cloth only on the legs',()=>{
  const {player,enemy}=setup();
  for(const a of [player,enemy]){
    a.reset();
    assert.equal(a.shield,undefined);assert.equal(a.cape,undefined);assert.equal(a.weaponMotion,undefined);
    for(const p of Object.values(a.anatomy.parts))assert.equal(p.armor,/Thigh|LowerLeg/.test(p.id)?'trousers':'none');
    assert.equal(a.parts.torso.material.metalness,0);assert.equal(a.parts.head.material.metalness,0);
  }
});

test('Bare skin does not retain invisible plate protection or armor damage',()=>{
  const bare=new AnatomySystem({unarmored:true}),plate=new AnatomySystem();
  const hit={weapon:WEAPONS.longsword,bodyPart:'torso',attackType:'left',relativeVelocity:5.5};
  const exposed=bare.receiveHit(hit),protectedHit=plate.receiveHit(hit);
  assert.equal(exposed.protection,0);assert.ok(exposed.magnitude>protectedHit.magnitude);
  assert.equal(bare.parts.torso.armorCondition,100);
  assert.ok(!bare.parts.torso.injuries.some(i=>i.type==='armorDamage'));
});

test('Left and right cuts travel in the direction named by the key',()=>{
  for(const direction of ['left','right']){
    const {player}=setup(direction);player.attack.time=player.attack.duration*.34;player.animate(0,0);
    const first=player.bladeWorld().tip.x;
    player.attack.time=player.attack.duration*.6;player.animate(0,0);
    const delta=player.bladeWorld().tip.x-first;
    assert.ok(direction==='left'?delta<-.5:delta>.5);
  }
});

test('A real hit briefly arrests the swing, pushes the body and reacts at the contact region',()=>{
  const d=setup();d.contact();const hit=d.events[0];
  assert.equal(hit?.type,'hit');assert.ok(d.player.attack.hitPause>0);
  assert.ok(d.enemy.impactVelocity.length()>0);assert.equal(d.enemy.reaction.part,hit.result.bodyPart);
  const time=d.player.attack.time;d.step();assert.equal(d.player.attack.time,time);
  assert.ok(d.sounds.some(([sound])=>sound==='flesh'));
  assert.ok(!d.sounds.some(([sound])=>sound==='armor'));
  for(let i=0;i<120;i++)d.step();assert.equal(d.events.filter(e=>e.type==='hit').length,1);
});

test('Weapon guard stops a strike with recoil and zero skin injury',()=>{
  const d=setup();d.combat.time=1;d.combat.setBlock(d.enemy,true);d.enemy.blockStarted=-100;d.contact();
  assert.equal(d.events[0]?.type,'block');assert.ok(d.player.attack.recovery);
  assert.equal(d.enemy.anatomy.condition,100);assert.equal(d.enemy.wounds.length,0);
  for(let i=0;i<90;i++)d.step();assert.equal(d.player.attack,null);
});

test('Cuts leave oriented skin marks; blunt hits leave bruises without blood or sparks',()=>{
  const cut=setup();cut.contact();
  assert.ok(cut.enemy.wounds.length>0);
  const mark=cut.enemy.wounds[0];assert.ok(mark.scale.y>mark.scale.x*2);
  assert.ok(['cut','deepCut','hemorrhage'].includes(mark.userData.injuryType));
  const blunt=setup('left','mace');blunt.contact();
  assert.equal(blunt.events[0]?.result.damageType,'blunt');
  assert.equal(blunt.bursts.length,0);
  assert.ok(blunt.enemy.wounds[0].scale.x>.5);
});

test('Reset clears directional recoil and knockback as well as wounds',()=>{
  const d=setup();d.contact();d.enemy.reset();
  assert.equal(d.enemy.reaction,null);assert.equal(d.enemy.impactVelocity.length(),0);assert.equal(d.enemy.wounds.length,0);
});
